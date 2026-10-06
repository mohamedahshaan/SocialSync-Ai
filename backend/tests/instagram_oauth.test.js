import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import axios from 'axios';
import { app } from '../src/app.js';
import { prisma } from '../src/utils/prisma.js';
import { generateOAuthState } from '../src/utils/oauthState.js';
import { instagramProvider } from '../src/services/social/instagram.js';

describe('Instagram Dedicated OAuth & Publishing Suite', () => {
  let userAToken = '';
  let userAId = '';
  let userBToken = '';
  let userBId = '';

  beforeAll(async () => {
    // Register User A
    const resA = await request(app).post('/api/auth/register').send({
      name: 'Instagram User A',
      email: `ig_user_a_${Date.now()}@socialflow.ai`,
      password: 'Password123!',
      confirmPassword: 'Password123!'
    });
    userAToken = resA.body.data.token;
    userAId = resA.body.data.user.id;

    // Register User B
    const resB = await request(app).post('/api/auth/register').send({
      name: 'Instagram User B',
      email: `ig_user_b_${Date.now()}@socialflow.ai`,
      password: 'Password123!',
      confirmPassword: 'Password123!'
    });
    userBToken = resB.body.data.token;
    userBId = resB.body.data.user.id;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { id: { in: [userAId, userBId] } }
    });
  });

  it('1. GET /api/oauth/instagram MUST return dedicated Instagram URL, NOT Facebook OAuth', async () => {
    const res = await request(app)
      .get('/api/oauth/instagram?json=true')
      .set('Authorization', `Bearer ${userAToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const authUrl = res.body.data.url;

    // Critical assertion: MUST be instagram.com, NEVER facebook.com
    expect(authUrl).toContain('https://www.instagram.com/oauth/authorize');
    expect(authUrl).not.toContain('facebook.com');

    const url = new URL(authUrl);
    expect(url.hostname).toBe('www.instagram.com');
    expect(url.pathname).toBe('/oauth/authorize');
    expect(url.searchParams.get('enable_fb_login')).toBe('0');
    expect(url.searchParams.get('force_authentication')).toBe('1');
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('redirect_uri')).toBe('http://localhost:5001/api/oauth/instagram/callback');

    const scope = url.searchParams.get('scope') || '';
    const scopesArray = scope.split(',');
    expect(scopesArray).toEqual([
      'instagram_business_basic',
      'instagram_business_content_publish'
    ]);

    // Strictly ensure Facebook scopes are NOT sent to Instagram authorization
    expect(scopesArray).not.toContain('pages_show_list');
    expect(scopesArray).not.toContain('pages_read_engagement');
    expect(scopesArray).not.toContain('pages_manage_posts');
    expect(scopesArray).not.toContain('public_profile');
  });

  it('2. Multi-User Isolation: User A and User B connect separate Instagram accounts without leakage', async () => {
    const stateA = generateOAuthState(userAId, 'INSTAGRAM');
    const stateB = generateOAuthState(userBId, 'INSTAGRAM');

    // Spy on token exchange and user info for User A
    const postSpy = vi.spyOn(axios, 'post').mockResolvedValueOnce({
      data: {
        access_token: 'IG_short_lived_token_user_a',
        user_id: 1784140001
      }
    });

    const getSpy = vi.spyOn(axios, 'get')
      // Long-lived token exchange
      .mockResolvedValueOnce({
        data: {
          access_token: 'IG_long_lived_token_user_a',
          expires_in: 5184000
        }
      })
      // User profile fetch
      .mockResolvedValueOnce({
        data: {
          id: '1784140001',
          username: 'brand_a_official',
          name: 'Brand A Official',
          account_type: 'BUSINESS'
        }
      });

    // Callback for User A
    const resA = await request(app)
      .get(`/api/oauth/instagram/callback?code=mock_ig_code_a%23_&state=${encodeURIComponent(stateA)}`);

    expect(resA.status).toBe(302);
    expect(resA.headers.location).toContain('/accounts?connected=INSTAGRAM');

    // Verify token was exchanged at https://api.instagram.com/oauth/access_token
    expect(postSpy).toHaveBeenCalledTimes(1);
    const [tokenUrl, tokenBody] = postSpy.mock.calls[0];
    expect(tokenUrl).toBe('https://api.instagram.com/oauth/access_token');
    expect(tokenBody).toContain('grant_type=authorization_code');
    expect(tokenBody).toContain('code=mock_ig_code_a');

    // Verify User A record in DB
    const accountA = await prisma.socialAccount.findFirst({
      where: { userId: userAId, platform: 'INSTAGRAM' }
    });
    expect(accountA).toBeDefined();
    expect(accountA.platformUserId).toBe('1784140001');
    expect(accountA.accountName).toBe('Brand A Official');
    expect(accountA.accountUsername).toBe('@brand_a_official');
    expect(accountA.accessToken).toBe('IG_long_lived_token_user_a');

    // Setup mocks for User B
    postSpy.mockResolvedValueOnce({
      data: {
        access_token: 'IG_short_lived_token_user_b',
        user_id: 1784140002
      }
    });

    getSpy
      .mockResolvedValueOnce({
        data: {
          access_token: 'IG_long_lived_token_user_b',
          expires_in: 5184000
        }
      })
      .mockResolvedValueOnce({
        data: {
          id: '1784140002',
          username: 'creator_b_daily',
          name: 'Creator B Daily',
          account_type: 'CREATOR'
        }
      });

    // Callback for User B
    const resB = await request(app)
      .get(`/api/oauth/instagram/callback?code=mock_ig_code_b&state=${encodeURIComponent(stateB)}`);

    expect(resB.status).toBe(302);
    expect(resB.headers.location).toContain('/accounts?connected=INSTAGRAM');

    // Verify User B record in DB
    const accountB = await prisma.socialAccount.findFirst({
      where: { userId: userBId, platform: 'INSTAGRAM' }
    });
    expect(accountB).toBeDefined();
    expect(accountB.platformUserId).toBe('1784140002');
    expect(accountB.accountName).toBe('Creator B Daily');
    expect(accountB.accountUsername).toBe('@creator_b_daily');

    // Verify User A cannot see User B's account
    const accountsResA = await request(app)
      .get('/api/social-accounts')
      .set('Authorization', `Bearer ${userAToken}`);

    expect(accountsResA.body.data.length).toBe(1);
    expect(accountsResA.body.data[0].platformUserId).toBe('1784140001');
    expect(accountsResA.body.data[0].accountUsername).toBe('@brand_a_official');
    expect(accountsResA.body.data[0].accessToken).toBeUndefined(); // Never exposed

    // Verify User B cannot see User A's account
    const accountsResB = await request(app)
      .get('/api/social-accounts')
      .set('Authorization', `Bearer ${userBToken}`);

    expect(accountsResB.body.data.length).toBe(1);
    expect(accountsResB.body.data[0].platformUserId).toBe('1784140002');
    expect(accountsResB.body.data[0].accountUsername).toBe('@creator_b_daily');
    expect(accountsResB.body.data[0].accessToken).toBeUndefined(); // Never exposed

    postSpy.mockRestore();
    getSpy.mockRestore();
  });

  it('3. publishPost should handle image container creation and publishing on graph.instagram.com', async () => {
    const postSpy = vi.spyOn(axios, 'post')
      .mockResolvedValueOnce({
        data: { id: 'ig_container_img_123' }
      })
      .mockResolvedValueOnce({
        data: { id: 'ig_post_id_success_999' }
      });

    const result = await instagramProvider.publishPost({
      accessToken: 'IG_valid_access_token',
      caption: 'Announcing our new feature!',
      mediaUrl: 'https://example.com/photo.jpg',
      mediaType: 'IMAGE',
      platformUserId: '1784140001'
    });

    expect(result.platformPostId).toBe('ig_post_id_success_999');
    expect(postSpy).toHaveBeenCalledTimes(2);

    const [containerUrl, containerBody, containerConfig] = postSpy.mock.calls[0];
    expect(containerUrl).toBe('https://graph.instagram.com/v20.0/1784140001/media');
    expect(containerConfig.params.image_url).toBe('https://example.com/photo.jpg');
    expect(containerConfig.params.caption).toBe('Announcing our new feature!');

    const [publishUrl, publishBody, publishConfig] = postSpy.mock.calls[1];
    expect(publishUrl).toBe('https://graph.instagram.com/v20.0/1784140001/media_publish');
    expect(publishConfig.params.creation_id).toBe('ig_container_img_123');

    postSpy.mockRestore();
  });

  it('4. publishPost should poll video containers until FINISHED before publishing', async () => {
    const postSpy = vi.spyOn(axios, 'post')
      .mockResolvedValueOnce({
        data: { id: 'ig_container_vid_456' }
      })
      .mockResolvedValueOnce({
        data: { id: 'ig_video_post_id_888' }
      });

    const getSpy = vi.spyOn(axios, 'get')
      .mockResolvedValueOnce({
        data: { status_code: 'IN_PROGRESS' }
      })
      .mockResolvedValueOnce({
        data: { status_code: 'FINISHED' }
      });

    const result = await instagramProvider.publishPost({
      accessToken: 'IG_valid_access_token',
      caption: 'Watch our reel!',
      mediaUrl: '/uploads/reel.mp4',
      mediaType: 'VIDEO',
      platformUserId: '1784140001'
    });

    expect(result.platformPostId).toBe('ig_video_post_id_888');
    expect(postSpy).toHaveBeenCalledTimes(2);
    expect(getSpy).toHaveBeenCalledTimes(2);

    const [containerUrl, containerBody, containerConfig] = postSpy.mock.calls[0];
    expect(containerUrl).toBe('https://graph.instagram.com/v20.0/1784140001/media');
    expect(containerConfig.params.media_type).toBe('VIDEO');
    expect(containerConfig.params.video_url).toBe('http://localhost:5001/uploads/reel.mp4');

    postSpy.mockRestore();
    getSpy.mockRestore();
  });
});
