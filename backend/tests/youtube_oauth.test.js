import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import axios from 'axios';
import { app } from '../src/app.js';
import { prisma } from '../src/utils/prisma.js';
import { generateOAuthState } from '../src/utils/oauthState.js';
import { youtubeProvider } from '../src/services/social/youtube.js';
import { config } from '../src/config/index.js';

describe('YouTube OAuth & Integration Suite', () => {
  let userTokenA = '';
  let userIdA = '';
  let userTokenB = '';
  let userIdB = '';
  let originalClientId = '';
  let originalClientSecret = '';
  let originalIsConfigured = false;

  beforeAll(async () => {
    // Preserve original config
    originalClientId = config.oauth.youtube.clientId;
    originalClientSecret = config.oauth.youtube.clientSecret;
    originalIsConfigured = config.oauth.youtube.isConfigured;

    // Ensure YouTube is configured for testing
    config.oauth.youtube.clientId = 'mock-google-client-id.apps.googleusercontent.com';
    config.oauth.youtube.clientSecret = 'mock-google-client-secret';
    config.oauth.youtube.redirectUri = 'http://localhost:5001/api/oauth/youtube/callback';
    config.oauth.youtube.isConfigured = true;

    // Register User A
    const resA = await request(app).post('/api/auth/register').send({
      name: 'YouTube Tester A',
      email: `yt_tester_a_${Date.now()}@socialflow.ai`,
      password: 'Password123!',
      confirmPassword: 'Password123!'
    });
    userTokenA = resA.body.data.token;
    userIdA = resA.body.data.user.id;

    // Register User B
    const resB = await request(app).post('/api/auth/register').send({
      name: 'YouTube Tester B',
      email: `yt_tester_b_${Date.now()}@socialflow.ai`,
      password: 'Password123!',
      confirmPassword: 'Password123!'
    });
    userTokenB = resB.body.data.token;
    userIdB = resB.body.data.user.id;
  });

  afterAll(async () => {
    // Restore original config
    config.oauth.youtube.clientId = originalClientId;
    config.oauth.youtube.clientSecret = originalClientSecret;
    config.oauth.youtube.isConfigured = originalIsConfigured;

    // Clean up test users
    await prisma.socialAccount.deleteMany({
      where: { userId: { in: [userIdA, userIdB] } }
    });
    await prisma.user.deleteMany({
      where: { id: { in: [userIdA, userIdB] } }
    });
  });

  it('1. GET /api/oauth/youtube should generate valid official Google authorization URL with required scopes', async () => {
    const res = await request(app)
      .get('/api/oauth/youtube?json=true')
      .set('Authorization', `Bearer ${userTokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const authUrl = res.body.data.url;
    expect(authUrl).toContain('https://accounts.google.com/o/oauth2/v2/auth');

    const url = new URL(authUrl);
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('client_id')).toBe('mock-google-client-id.apps.googleusercontent.com');
    expect(url.searchParams.get('redirect_uri')).toBe('http://localhost:5001/api/oauth/youtube/callback');
    expect(url.searchParams.get('access_type')).toBe('offline');
    expect(url.searchParams.get('prompt')).toBe('consent');

    const scope = url.searchParams.get('scope');
    expect(scope).toContain('https://www.googleapis.com/auth/youtube.upload');
    expect(scope).toContain('https://www.googleapis.com/auth/youtube.readonly');
    expect(scope).toContain('openid');
    expect(url.searchParams.get('state')).toBeDefined();
  });

  it('2. GET /api/oauth/youtube/callback should reject invalid or tampered CSRF state', async () => {
    const res = await request(app)
      .get('/api/oauth/youtube/callback?code=fake_code&state=invalid_tampered_state');

    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('/accounts?error=');
    expect(res.headers.location).toContain('platform=YOUTUBE');
  });

  it('3. GET /api/oauth/youtube/callback should exchange code, query YouTube Data API v3, and save channel account', async () => {
    const state = generateOAuthState(userIdA, 'YOUTUBE');

    // Spy on token exchange
    const postSpy = vi.spyOn(axios, 'post').mockResolvedValueOnce({
      data: {
        access_token: 'ya29.mock_google_access_token_123',
        expires_in: 3599,
        refresh_token: '1//mock_google_refresh_token_456',
        token_type: 'Bearer'
      }
    });

    // Spy on YouTube Data API channels endpoint
    const getSpy = vi.spyOn(axios, 'get').mockResolvedValueOnce({
      data: {
        kind: 'youtube#channelListResponse',
        items: [
          {
            id: 'UC_test_channel_789xyz',
            snippet: {
              title: 'SocialFlow Tech Official',
              description: 'Official test channel',
              customUrl: '@socialflowtech',
              thumbnails: { default: { url: 'https://yt3.ggpht.com/photo.jpg' } }
            }
          }
        ]
      }
    });

    const res = await request(app)
      .get(`/api/oauth/youtube/callback?code=mock_google_auth_code_123&state=${encodeURIComponent(state)}`);

    // Callback redirects to frontend with success query
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('/accounts?connected=YOUTUBE');

    // Verify token was exchanged at Google token endpoint
    expect(postSpy).toHaveBeenCalledTimes(1);
    const [tokenUrl, tokenBody] = postSpy.mock.calls[0];
    expect(tokenUrl).toBe('https://oauth2.googleapis.com/token');
    expect(tokenBody).toContain('grant_type=authorization_code');
    expect(tokenBody).toContain('code=mock_google_auth_code_123');

    // Verify YouTube Data API v3 was queried for channels
    expect(getSpy).toHaveBeenCalledTimes(1);
    const [channelsUrl, channelsConfig] = getSpy.mock.calls[0];
    expect(channelsUrl).toBe('https://www.googleapis.com/youtube/v3/channels');
    expect(channelsConfig.params.mine).toBe('true');
    expect(channelsConfig.params.part).toBe('snippet,contentDetails');
    expect(channelsConfig.headers.Authorization).toBe('Bearer ya29.mock_google_access_token_123');

    // Verify account is saved in PostgreSQL for User A
    const dbAccount = await prisma.socialAccount.findFirst({
      where: { userId: userIdA, platform: 'YOUTUBE' }
    });
    expect(dbAccount).toBeDefined();
    expect(dbAccount.platformUserId).toBe('UC_test_channel_789xyz');
    expect(dbAccount.accountName).toBe('SocialFlow Tech Official');
    expect(dbAccount.accountUsername).toBe('@socialflowtech');
    expect(dbAccount.accessToken).toBe('ya29.mock_google_access_token_123');
    expect(dbAccount.refreshToken).toBe('1//mock_google_refresh_token_456');
    expect(dbAccount.status).toBe('CONNECTED');

    // Verify token is NEVER returned in GET /api/social-accounts
    const accountsRes = await request(app)
      .get('/api/social-accounts')
      .set('Authorization', `Bearer ${userTokenA}`);

    expect(accountsRes.status).toBe(200);
    const ytAcc = accountsRes.body.data.find(a => a.platform === 'YOUTUBE');
    expect(ytAcc).toBeDefined();
    expect(ytAcc.accessToken).toBeUndefined();
    expect(ytAcc.refreshToken).toBeUndefined();
    expect(ytAcc.accountName).toBe('SocialFlow Tech Official');

    postSpy.mockRestore();
    getSpy.mockRestore();
  });

  it('4. Multi-User Isolation: User B cannot view or disconnect User A\'s YouTube account', async () => {
    // 1. User B lists their accounts -> should NOT see User A's YouTube account
    const accountsResB = await request(app)
      .get('/api/social-accounts')
      .set('Authorization', `Bearer ${userTokenB}`);

    expect(accountsResB.status).toBe(200);
    const ytAccForB = accountsResB.body.data.find(a => a.platform === 'YOUTUBE');
    expect(ytAccForB).toBeUndefined();

    // 2. Locate User A's YouTube account ID
    const userAYt = await prisma.socialAccount.findFirst({
      where: { userId: userIdA, platform: 'YOUTUBE' }
    });
    expect(userAYt).toBeDefined();

    // 3. User B attempts to disconnect User A's account
    const deleteRes = await request(app)
      .delete(`/api/social-accounts/${userAYt.id}`)
      .set('Authorization', `Bearer ${userTokenB}`);

    expect(deleteRes.status).toBe(404);
    expect(deleteRes.body.error).toBe('ACCOUNT_NOT_FOUND');

    // Confirm record is still present in database
    const stillExists = await prisma.socialAccount.findUnique({
      where: { id: userAYt.id }
    });
    expect(stillExists).toBeDefined();
  });

  it('5. User A can successfully disconnect their YouTube account', async () => {
    const userAYt = await prisma.socialAccount.findFirst({
      where: { userId: userIdA, platform: 'YOUTUBE' }
    });
    expect(userAYt).toBeDefined();

    const deleteRes = await request(app)
      .delete(`/api/social-accounts/${userAYt.id}`)
      .set('Authorization', `Bearer ${userTokenA}`);

    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.success).toBe(true);
    expect(deleteRes.body.message).toContain('YOUTUBE account disconnected successfully');

    // Confirm record is deleted
    const deleted = await prisma.socialAccount.findUnique({
      where: { id: userAYt.id }
    });
    expect(deleted).toBeNull();
  });

  it('6. Fallback: GET /api/oauth/youtube/callback handles Google account without an existing YouTube channel', async () => {
    const state = generateOAuthState(userIdA, 'YOUTUBE');

    // Token exchange
    const postSpy = vi.spyOn(axios, 'post').mockResolvedValueOnce({
      data: {
        access_token: 'ya29.fallback_token_456',
        expires_in: 3599,
        refresh_token: '1//fallback_refresh_789'
      }
    });

    // YouTube channels returns empty items
    const getSpy = vi.spyOn(axios, 'get')
      .mockResolvedValueOnce({
        data: { items: [] }
      })
      // Userinfo returns Google profile
      .mockResolvedValueOnce({
        data: {
          sub: '10987654321',
          name: 'Jane Creator',
          email: 'jane@gmail.com'
        }
      });

    const res = await request(app)
      .get(`/api/oauth/youtube/callback?code=fallback_code_xyz&state=${encodeURIComponent(state)}`);

    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('/accounts?connected=YOUTUBE');

    const dbAccount = await prisma.socialAccount.findFirst({
      where: { userId: userIdA, platform: 'YOUTUBE' }
    });
    expect(dbAccount).toBeDefined();
    expect(dbAccount.platformUserId).toBe('10987654321');
    expect(dbAccount.accountName).toContain('Jane Creator');
    expect(dbAccount.accountUsername).toBe('jane@gmail.com');

    postSpy.mockRestore();
    getSpy.mockRestore();
  });
});
