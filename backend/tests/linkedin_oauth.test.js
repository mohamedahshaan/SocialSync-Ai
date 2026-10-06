import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import axios from 'axios';
import { app } from '../src/app.js';
import { prisma } from '../src/utils/prisma.js';
import { generateOAuthState } from '../src/utils/oauthState.js';
import { linkedinProvider } from '../src/services/social/linkedin.js';
import { config } from '../src/config/index.js';

describe('LinkedIn OAuth & Publishing Suite', () => {
  let userToken = '';
  let userId = '';

  beforeAll(async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'LinkedIn Tester',
      email: `linkedin_tester_${Date.now()}@socialflow.ai`,
      password: 'Password123!',
      confirmPassword: 'Password123!'
    });
    userToken = res.body.data.token;
    userId = res.body.data.user.id;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { id: userId }
    });
  });

  it('1. GET /api/oauth/linkedin should generate valid authorization URL with required scopes', async () => {
    const res = await request(app)
      .get('/api/oauth/linkedin?json=true')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const authUrl = res.body.data.url;
    expect(authUrl).toContain('https://www.linkedin.com/oauth/v2/authorization');

    const url = new URL(authUrl);
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('client_id')).toBe('86lt8y0s2lopkj');
    expect(url.searchParams.get('redirect_uri')).toBe('http://localhost:5001/api/oauth/linkedin/callback');
    expect(url.searchParams.get('scope')).toBe('openid profile email w_member_social');
    expect(url.searchParams.get('state')).toBeDefined();
  });

  it('2. GET /api/oauth/linkedin/callback should exchange code and save member account', async () => {
    const state = generateOAuthState(userId, 'LINKEDIN');

    // Spy on token exchange and userinfo calls
    const postSpy = vi.spyOn(axios, 'post').mockResolvedValueOnce({
      data: {
        access_token: 'AQ_fake_linkedin_access_token_123',
        expires_in: 5184000,
        refresh_token: 'AQ_fake_refresh_token_456'
      }
    });

    const getSpy = vi.spyOn(axios, 'get').mockResolvedValueOnce({
      data: {
        sub: '782abc999',
        name: 'LinkedIn Professional User',
        given_name: 'LinkedIn',
        family_name: 'Professional',
        email: 'pro@linkedin.com',
        picture: 'https://media.licdn.com/photo.jpg'
      }
    });

    const res = await request(app)
      .get(`/api/oauth/linkedin/callback?code=mock_linkedin_code_123&state=${encodeURIComponent(state)}`);

    // Callback redirects to frontend with success query
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('/accounts?connected=LINKEDIN');

    // Verify token was exchanged at https://www.linkedin.com/oauth/v2/accessToken
    expect(postSpy).toHaveBeenCalledTimes(1);
    const [tokenUrl, tokenBody] = postSpy.mock.calls[0];
    expect(tokenUrl).toBe('https://www.linkedin.com/oauth/v2/accessToken');
    expect(tokenBody).toContain('grant_type=authorization_code');
    expect(tokenBody).toContain('code=mock_linkedin_code_123');

    // Verify member identity was fetched from https://api.linkedin.com/v2/userinfo
    expect(getSpy).toHaveBeenCalledTimes(1);
    const [userinfoUrl, userinfoConfig] = getSpy.mock.calls[0];
    expect(userinfoUrl).toBe('https://api.linkedin.com/v2/userinfo');
    expect(userinfoConfig.headers.Authorization).toBe('Bearer AQ_fake_linkedin_access_token_123');

    // Verify account is saved in PostgreSQL for this user
    const dbAccount = await prisma.socialAccount.findUnique({
      where: { userId_platform: { userId, platform: 'LINKEDIN' } }
    });
    expect(dbAccount).toBeDefined();
    expect(dbAccount.platformUserId).toBe('782abc999');
    expect(dbAccount.accountName).toBe('LinkedIn Professional User');
    expect(dbAccount.accountUsername).toBe('pro@linkedin.com');
    expect(dbAccount.accessToken).toBe('AQ_fake_linkedin_access_token_123');
    expect(dbAccount.status).toBe('CONNECTED');

    // Verify token is NOT exposed in GET /api/social-accounts
    const accountsRes = await request(app)
      .get('/api/social-accounts')
      .set('Authorization', `Bearer ${userToken}`);

    const liAcc = accountsRes.body.data.find(a => a.platform === 'LINKEDIN');
    expect(liAcc).toBeDefined();
    expect(liAcc.accessToken).toBeUndefined();

    postSpy.mockRestore();
    getSpy.mockRestore();
  });

  it('3. publishPost should invoke official /rest/posts with w_member_social and urn:li:person', async () => {
    const postSpy = vi.spyOn(axios, 'post').mockResolvedValueOnce({
      headers: { 'x-restli-id': 'urn:li:share:987654321' },
      data: { id: 'urn:li:share:987654321' }
    });

    const result = await linkedinProvider.publishPost({
      accessToken: 'AQ_valid_token_xyz',
      caption: 'Announcing SocialFlow AI LinkedIn Integration!',
      mediaUrl: null,
      mediaType: 'NONE',
      platformUserId: '782abc999'
    });

    expect(result.platformPostId).toBe('urn:li:share:987654321');
    expect(postSpy).toHaveBeenCalledTimes(1);

    const [publishUrl, publishPayload, publishConfig] = postSpy.mock.calls[0];
    const currentVersion = linkedinProvider.getApiVersion();
    expect(publishConfig.headers['LinkedIn-Version']).toBe(currentVersion);
    expect(publishConfig.headers.Authorization).toBe('Bearer AQ_valid_token_xyz');

    postSpy.mockRestore();
  });

  it('4. publishPost should handle full chunked video pipeline on LinkedIn (initialize, put, finalize, poll, and publish)', async () => {
    const postSpy = vi.spyOn(axios, 'post')
      // 1. initializeUpload
      .mockResolvedValueOnce({
        data: {
          value: {
            video: 'urn:li:video:test_vid_123',
            uploadToken: 'urn:li:token:abc',
            uploadInstructions: [
              {
                uploadUrl: 'https://media.licdn.com/upload-chunk-1',
                firstByte: 0,
                lastByte: 9
              }
            ]
          }
        }
      })
      // 2. finalizeUpload
      .mockResolvedValueOnce({
        data: { value: {} }
      })
      // 3. /rest/posts
      .mockResolvedValueOnce({
        headers: { 'x-restli-id': 'urn:li:share:video_post_789' },
        data: { id: 'urn:li:share:video_post_789' }
      });

    const putSpy = vi.spyOn(axios, 'put').mockResolvedValueOnce({
      headers: { etag: '"mock_part_etag_123"' },
      data: {}
    });

    const getSpy = vi.spyOn(axios, 'get')
      // mock downloading remote video if needed, or polling
      .mockResolvedValueOnce({
        data: { status: 'AVAILABLE' }
      });

    // Provide a small mock video in uploads
    const fs = await import('fs');
    const path = await import('path');
    const mockVidPath = path.resolve('uploads', 'test-li-vid.mp4');
    fs.writeFileSync(mockVidPath, '0123456789');

    try {
      const result = await linkedinProvider.publishPost({
        accessToken: 'AQ_valid_token_xyz',
        caption: 'Watch our video update!',
        mediaUrl: '/uploads/test-li-vid.mp4',
        mediaType: 'VIDEO',
        platformUserId: '782abc999'
      });

      expect(result.platformPostId).toBe('urn:li:share:video_post_789');

      // Verify initializeUpload call
      const [initUrl, initPayload] = postSpy.mock.calls[0];
      expect(initUrl).toContain('/rest/videos?action=initializeUpload');
      expect(initPayload.initializeUploadRequest.owner).toBe('urn:li:person:782abc999');
      expect(initPayload.initializeUploadRequest.fileSizeBytes).toBe(10);

      // Verify PUT call with ETag
      expect(putSpy).toHaveBeenCalledTimes(1);
      const [chunkUrl, chunkBody, chunkConfig] = putSpy.mock.calls[0];
      expect(chunkUrl).toBe('https://media.licdn.com/upload-chunk-1');
      expect(chunkBody.length).toBe(10);
      expect(chunkConfig.headers['Content-Type']).toBe('application/octet-stream');

      // Verify finalizeUpload call
      const [finalUrl, finalPayload] = postSpy.mock.calls[1];
      expect(finalUrl).toContain('/rest/videos?action=finalizeUpload');
      expect(finalPayload.finalizeUploadRequest.video).toBe('urn:li:video:test_vid_123');
      expect(finalPayload.finalizeUploadRequest.uploadedPartIds).toEqual(['"mock_part_etag_123"']);

      // Verify /rest/posts has video attached
      const [postUrl, postPayload] = postSpy.mock.calls[2];
      expect(postUrl).toContain('/rest/posts');
      expect(postPayload.content.media.id).toBe('urn:li:video:test_vid_123');
    } finally {
      if (fs.existsSync(mockVidPath)) fs.unlinkSync(mockVidPath);
      postSpy.mockRestore();
      putSpy.mockRestore();
      getSpy.mockRestore();
    }
  });

  it('5. publishPost should throw error if LinkedIn video processing fails', async () => {
    const postSpy = vi.spyOn(axios, 'post')
      .mockResolvedValueOnce({
        data: {
          value: {
            video: 'urn:li:video:fail_vid',
            uploadToken: 'tok',
            uploadInstructions: [{ uploadUrl: 'https://media.licdn.com/chunk', firstByte: 0, lastByte: 4 }]
          }
        }
      })
      .mockResolvedValueOnce({ data: {} });

    const putSpy = vi.spyOn(axios, 'put').mockResolvedValueOnce({
      headers: { etag: '"etag1"' },
      data: {}
    });

    const getSpy = vi.spyOn(axios, 'get').mockResolvedValueOnce({
      data: { status: 'PROCESSING_FAILED' }
    });

    const fs = await import('fs');
    const path = await import('path');
    const mockVidPath = path.resolve('uploads', 'test-fail-vid.mp4');
    fs.writeFileSync(mockVidPath, 'hello');

    try {
      await expect(
        linkedinProvider.publishPost({
          accessToken: 'AQ_valid_token_xyz',
          caption: 'Will fail processing',
          mediaUrl: '/uploads/test-fail-vid.mp4',
          mediaType: 'VIDEO',
          platformUserId: '782abc999'
        })
      ).rejects.toThrow('LinkedIn video processing failed');
    } finally {
      if (fs.existsSync(mockVidPath)) fs.unlinkSync(mockVidPath);
      postSpy.mockRestore();
      putSpy.mockRestore();
      getSpy.mockRestore();
    }
  });

  it('6. getApiVersion should strictly enforce 6-digit YYYYMM format and normalize 8-digit or dashed strings', () => {
    // 1. Default should be 6 digits (202601)
    const defaultVer = linkedinProvider.getApiVersion();
    expect(defaultVer).toBe('202601');
    expect(defaultVer).toHaveLength(6);

    // 2. Normalization of 8-digit YYYYMMDD string (e.g. '20260101' -> '202601')
    config.oauth.linkedin.apiVersion = '20260101';
    expect(linkedinProvider.getApiVersion()).toBe('202601');

    // 3. Normalization of YYYY-MM string (e.g. '2026-09' -> '202609')
    config.oauth.linkedin.apiVersion = '2026-09';
    expect(linkedinProvider.getApiVersion()).toBe('202609');

    // Restore to default
    config.oauth.linkedin.apiVersion = '202601';
  });
});
