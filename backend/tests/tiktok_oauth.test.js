import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { app } from '../src/app.js';
import { prisma } from '../src/utils/prisma.js';
import { generateOAuthState } from '../src/utils/oauthState.js';
import { tiktokProvider } from '../src/services/social/tiktok.js';

describe('TikTok OAuth & Content Posting API v2 Suite', () => {
  let userTokenA = '';
  let userIdA = '';
  let userTokenB = '';
  let userIdB = '';

  beforeAll(async () => {
    // 1. Create User A
    const resA = await request(app).post('/api/auth/register').send({
      name: 'TikTok User Alpha',
      email: `tiktok_a_${Date.now()}@socialflow.ai`,
      password: 'Password123!',
      confirmPassword: 'Password123!'
    });
    userTokenA = resA.body.data.token;
    userIdA = resA.body.data.user.id;

    // 2. Create User B
    const resB = await request(app).post('/api/auth/register').send({
      name: 'TikTok User Beta',
      email: `tiktok_b_${Date.now()}@socialflow.ai`,
      password: 'Password123!',
      confirmPassword: 'Password123!'
    });
    userTokenB = resB.body.data.token;
    userIdB = resB.body.data.user.id;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { id: { in: [userIdA, userIdB] } }
    });
  });

  it('1. GET /api/oauth/tiktok should generate valid TikTok URL with PKCE and scopes', async () => {
    // Ensure credentials present in provider for test
    tiktokProvider.clientKey = 'test_tiktok_key_123';
    tiktokProvider.clientSecret = 'test_tiktok_secret_456';

    const res = await request(app)
      .get('/api/oauth/tiktok?json=true')
      .set('Authorization', `Bearer ${userTokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const authUrl = res.body.data.url;
    expect(authUrl).toContain('https://www.tiktok.com/v2/auth/authorize/');

    const url = new URL(authUrl);
    expect(url.searchParams.get('client_key')).toBe('test_tiktok_key_123');
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('redirect_uri')).toBe(tiktokProvider.redirectUri);
    expect(url.searchParams.get('code_challenge')).toBeDefined();
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('scope')).toContain('video.publish');
  });

  it('2. Multi-User Isolation: User A and User B connect separate TikTok accounts without leakage', async () => {
    const stateA = generateOAuthState(userIdA, 'TIKTOK');
    const stateB = generateOAuthState(userIdB, 'TIKTOK');

    const postSpy = vi.spyOn(axios, 'post')
      .mockResolvedValueOnce({
        data: {
          data: {
            access_token: 'tt_token_A',
            refresh_token: 'tt_refresh_A',
            expires_in: 86400,
            open_id: 'tiktok_open_id_A'
          }
        }
      })
      .mockResolvedValueOnce({
        data: {
          data: {
            access_token: 'tt_token_B',
            refresh_token: 'tt_refresh_B',
            expires_in: 86400,
            open_id: 'tiktok_open_id_B'
          }
        }
      });

    const getSpy = vi.spyOn(axios, 'get')
      .mockResolvedValueOnce({
        data: {
          data: {
            user: { display_name: 'Creator Alpha', username: 'alpha_creator' }
          }
        }
      })
      .mockResolvedValueOnce({
        data: {
          data: {
            user: { display_name: 'Creator Beta', username: 'beta_creator' }
          }
        }
      });

    // Callback for User A
    const resA = await request(app).get(`/api/oauth/tiktok/callback?code=mock_code_a&state=${encodeURIComponent(stateA)}`);
    expect(resA.status).toBe(302);
    expect(resA.headers.location).toContain('/accounts?connected=TIKTOK');

    // Callback for User B
    const resB = await request(app).get(`/api/oauth/tiktok/callback?code=mock_code_b&state=${encodeURIComponent(stateB)}`);
    expect(resB.status).toBe(302);
    expect(resB.headers.location).toContain('/accounts?connected=TIKTOK');

    // Verify User A accounts
    const accResA = await request(app)
      .get('/api/social-accounts')
      .set('Authorization', `Bearer ${userTokenA}`);
    const ttAccA = accResA.body.data.find(a => a.platform === 'TIKTOK');
    expect(ttAccA).toBeDefined();
    expect(ttAccA.platformUserId).toBe('tiktok_open_id_A');
    expect(ttAccA.accountName).toBe('Creator Alpha');

    // Verify User B accounts (strict isolation)
    const accResB = await request(app)
      .get('/api/social-accounts')
      .set('Authorization', `Bearer ${userTokenB}`);
    const ttAccB = accResB.body.data.find(a => a.platform === 'TIKTOK');
    expect(ttAccB).toBeDefined();
    expect(ttAccB.platformUserId).toBe('tiktok_open_id_B');
    expect(ttAccB.accountName).toBe('Creator Beta');

    postSpy.mockRestore();
    getSpy.mockRestore();
  });

  it('3. publishPost should reject text-only posts without media', async () => {
    await expect(
      tiktokProvider.publishPost({
        accessToken: 'tt_valid_tok',
        caption: 'Pure text',
        mediaUrl: null,
        mediaType: 'NONE',
        platformUserId: 'tt_user_123'
      })
    ).rejects.toThrow('TikTok requires a photo or video file');
  });

  it('4. publishPost should execute video init, chunk upload, and status polling until PUBLISH_COMPLETE', async () => {
    // Mock creator_info query, video/init, and status/fetch
    const postSpy = vi.spyOn(axios, 'post')
      .mockResolvedValueOnce({
        // creator_info
        data: {
          data: {
            privacy_level_options: ['PUBLIC_TO_EVERYONE', 'SELF_ONLY'],
            creator_nickname: 'Top Creator'
          }
        }
      })
      .mockResolvedValueOnce({
        // video/init
        data: {
          data: {
            publish_id: 'v_pub_tiktok_998877',
            upload_url: 'https://open-upload.tiktokapis.com/video/upload/chunk1'
          }
        }
      })
      .mockResolvedValueOnce({
        // status/fetch
        data: {
          data: {
            status: 'PUBLISH_COMPLETE'
          }
        }
      });

    const putSpy = vi.spyOn(axios, 'put').mockResolvedValueOnce({
      data: {}
    });

    const testVidName = `tiktok-test-${Date.now()}.mp4`;
    const testVidPath = path.resolve('uploads', testVidName);
    fs.writeFileSync(testVidPath, 'fake tiktok video bytes 123456');

    try {
      const result = await tiktokProvider.publishPost({
        accessToken: 'tt_valid_token_xyz',
        caption: 'Trending TikTok Post! #viral',
        mediaUrl: `/uploads/${testVidName}`,
        mediaType: 'VIDEO',
        platformUserId: 'tiktok_user_alpha'
      });

      expect(result.platformPostId).toBe('v_pub_tiktok_998877');

      // Verify init payload
      expect(postSpy).toHaveBeenCalledTimes(3);
      const [initUrl, initPayload] = postSpy.mock.calls[1];
      expect(initUrl).toContain('/post/publish/video/init/');
      expect(initPayload.post_info.title).toBe('Trending TikTok Post! #viral');
      expect(initPayload.source_info.source).toBe('FILE_UPLOAD');

      // Verify binary video upload PUT
      expect(putSpy).toHaveBeenCalledTimes(1);
      const [uploadUrl, , config] = putSpy.mock.calls[0];
      expect(uploadUrl).toBe('https://open-upload.tiktokapis.com/video/upload/chunk1');
      expect(config.headers['Content-Type']).toBe('video/mp4');

      // Verify status fetch polling
      const [statusUrl, statusPayload] = postSpy.mock.calls[2];
      expect(statusUrl).toContain('/post/publish/status/fetch/');
      expect(statusPayload.publish_id).toBe('v_pub_tiktok_998877');
    } finally {
      if (fs.existsSync(testVidPath)) fs.unlinkSync(testVidPath);
      postSpy.mockRestore();
      putSpy.mockRestore();
    }
  });

  it('5. publishPost should execute photo init via Content Posting API v2 and status polling until PUBLISH_COMPLETE', async () => {
    const postSpy = vi.spyOn(axios, 'post')
      .mockResolvedValueOnce({
        // creator_info
        data: {
          data: {
            privacy_level_options: ['PUBLIC_TO_EVERYONE', 'SELF_ONLY'],
            creator_nickname: 'Top Creator'
          }
        }
      })
      .mockResolvedValueOnce({
        // content/init (Photo)
        data: {
          data: {
            publish_id: 'v_pub_tiktok_photo_112233'
          }
        }
      })
      .mockResolvedValueOnce({
        // status/fetch
        data: {
          data: {
            status: 'PUBLISH_COMPLETE'
          }
        }
      });

    const testImgName = `tiktok-test-photo-${Date.now()}.jpg`;
    const testImgPath = path.resolve('uploads', testImgName);
    fs.writeFileSync(testImgPath, 'fake tiktok photo bytes');

    try {
      const result = await tiktokProvider.publishPost({
        accessToken: 'tt_valid_token_xyz',
        caption: 'Beautiful sunset photo! #photography',
        mediaUrl: `/uploads/${testImgName}`,
        mediaType: 'IMAGE',
        platformUserId: 'tiktok_user_alpha'
      });

      expect(result.platformPostId).toBe('v_pub_tiktok_photo_112233');

      // Verify photo init call
      expect(postSpy).toHaveBeenCalledTimes(3);
      const [initUrl, initPayload] = postSpy.mock.calls[1];
      expect(initUrl).toContain('/post/publish/content/init/');
      expect(initPayload.media_type).toBe('PHOTO');
      expect(initPayload.post_mode).toBe('DIRECT_POST');
      expect(initPayload.source_info.source).toBe('PULL_FROM_URL');
      expect(initPayload.source_info.photo_cover_index).toBe(0);
      expect(initPayload.post_info.brand_content_toggle).toBe(false);
      expect(initPayload.post_info.brand_organic_toggle).toBe(false);
      expect(initPayload.source_info.photo_images[0]).toContain(testImgName);
      expect(initPayload.source_info.photo_images[0]).toMatch(/^https:\/\//);

      // Verify status fetch polling
      const [statusUrl, statusPayload] = postSpy.mock.calls[2];
      expect(statusUrl).toContain('/post/publish/status/fetch/');
      expect(statusPayload.publish_id).toBe('v_pub_tiktok_photo_112233');
    } finally {
      if (fs.existsSync(testImgPath)) fs.unlinkSync(testImgPath);
      postSpy.mockRestore();
    }
  });

  it('6. publishPost should report clear failure when TikTok returns FAILED status during photo publishing', async () => {
    const postSpy = vi.spyOn(axios, 'post')
      .mockResolvedValueOnce({
        // creator_info
        data: {
          data: {
            privacy_level_options: ['PUBLIC_TO_EVERYONE'],
            creator_nickname: 'Top Creator'
          }
        }
      })
      .mockResolvedValueOnce({
        // content/init
        data: {
          data: {
            publish_id: 'v_pub_failed_photo_4455'
          }
        }
      })
      .mockResolvedValueOnce({
        // status/fetch with FAILED
        data: {
          data: {
            status: 'FAILED',
            fail_reason: 'Image dimensions outside allowable range'
          }
        }
      });

    const testImgName = `tiktok-fail-${Date.now()}.jpg`;
    const testImgPath = path.resolve('uploads', testImgName);
    fs.writeFileSync(testImgPath, 'fake image data');

    try {
      await expect(
        tiktokProvider.publishPost({
          accessToken: 'tt_valid_token_xyz',
          caption: 'Failing photo test',
          mediaUrl: `/uploads/${testImgName}`,
          mediaType: 'IMAGE',
          platformUserId: 'tiktok_user_alpha'
        })
      ).rejects.toThrow(/TikTok photo publishing failed: Image dimensions outside allowable range/);
    } finally {
      if (fs.existsSync(testImgPath)) fs.unlinkSync(testImgPath);
      postSpy.mockRestore();
    }
  });

  it('7. publishPost should safely extract and report HTTP status, code, and log_id on API 400 error', async () => {
    const postSpy = vi.spyOn(axios, 'post')
      .mockResolvedValueOnce({
        data: {
          data: {
            privacy_level_options: ['PUBLIC_TO_EVERYONE']
          }
        }
      })
      .mockRejectedValueOnce({
        response: {
          status: 400,
          data: {
            error: {
              code: 'invalid_param',
              message: 'The request source info is empty or incorrect',
              log_id: '20261028_TEST_LOG_ID_ABC123'
            }
          }
        }
      });

    const testImgName = `tiktok-err-${Date.now()}.jpg`;
    const testImgPath = path.resolve('uploads', testImgName);
    fs.writeFileSync(testImgPath, 'fake test bytes');

    try {
      await expect(
        tiktokProvider.publishPost({
          accessToken: 'tt_token_secret_123',
          caption: 'Testing 400 error diagnostics',
          mediaUrl: `/uploads/${testImgName}`,
          mediaType: 'IMAGE',
          platformUserId: 'tiktok_user_alpha'
        })
      ).rejects.toThrow(/invalid_param.*20261028_TEST_LOG_ID_ABC123.*The request source info is empty or incorrect/);
    } finally {
      if (fs.existsSync(testImgPath)) fs.unlinkSync(testImgPath);
      postSpy.mockRestore();
    }
  });

  it('8. resolvePublicImageUrl should convert relative/localhost paths to verified HTTPS domain', () => {
    const relativeUrl = '/uploads/my-sample.jpg';
    const resolvedRel = tiktokProvider.resolvePublicImageUrl(relativeUrl);
    expect(resolvedRel).toBe('https://socialsync.raccoon-ai.io/uploads/my-sample.jpg');

    const localhostUrl = 'http://localhost:5002/uploads/my-sample.jpg';
    const resolvedLocal = tiktokProvider.resolvePublicImageUrl(localhostUrl);
    expect(resolvedLocal).toBe('https://socialsync.raccoon-ai.io/uploads/my-sample.jpg');

    const mdUrl = '[https://socialsync.raccoon-ai.io](https://socialsync.raccoon-ai.io)/uploads/my-sample.jpg';
    const resolvedMd = tiktokProvider.resolvePublicImageUrl(mdUrl);
    expect(resolvedMd).toBe('https://socialsync.raccoon-ai.io/uploads/my-sample.jpg');
  });
});
