import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import { app } from '../src/app.js';
import { prisma } from '../src/utils/prisma.js';
import { config } from '../src/config/index.js';

describe('Multi-User Facebook OAuth & Multi-Tenant Isolation Suite', () => {
  let userAToken = '';
  let userAId = '';
  let userBToken = '';
  let userBId = '';

  let userAFbAccountId = '';
  let userBFbAccountId = '';

  const PAGE_A_ID = 'page_aaa_111111';
  const PAGE_A_TOKEN = 'EAAB_token_page_A_secret';
  const PAGE_A_NAME = 'Alpha Marketing Page (Page)';

  const PAGE_B_ID = 'page_bbb_222222';
  const PAGE_B_TOKEN = 'EAAB_token_page_B_secret';
  const PAGE_B_NAME = 'Beta Tech Page (Page)';

  beforeAll(async () => {
    // 1. Create User A (testA@example.com)
    const resA = await request(app).post('/api/auth/register').send({
      name: 'User Alpha',
      email: `testA_${Date.now()}@example.com`,
      password: 'Password123!',
      confirmPassword: 'Password123!'
    });
    userAToken = resA.body.data.token;
    userAId = resA.body.data.user.id;

    // 2. Create User B (testB@example.com)
    const resB = await request(app).post('/api/auth/register').send({
      name: 'User Beta',
      email: `testB_${Date.now()}@example.com`,
      password: 'Password123!',
      confirmPassword: 'Password123!'
    });
    userBToken = resB.body.data.token;
    userBId = resB.body.data.user.id;

    // 3. Connect Facebook Page A to User A
    const fbA = await prisma.socialAccount.create({
      data: {
        userId: userAId,
        platform: 'FACEBOOK',
        platformUserId: PAGE_A_ID,
        accountName: PAGE_A_NAME,
        accountUsername: 'Facebook Account A',
        accessToken: PAGE_A_TOKEN,
        status: 'CONNECTED'
      }
    });
    userAFbAccountId = fbA.id;

    // 4. Connect Facebook Page B to User B
    const fbB = await prisma.socialAccount.create({
      data: {
        userId: userBId,
        platform: 'FACEBOOK',
        platformUserId: PAGE_B_ID,
        accountName: PAGE_B_NAME,
        accountUsername: 'Facebook Account B',
        accessToken: PAGE_B_TOKEN,
        status: 'CONNECTED'
      }
    });
    userBFbAccountId = fbB.id;
  });

  afterAll(async () => {
    // Clean up created test users
    await prisma.user.deleteMany({
      where: { id: { in: [userAId, userBId] } }
    });
  });

  // ========================================================
  // 1. OAUTH AUTHORIZATION URL & STATE ISOLATION
  // ========================================================
  describe('OAuth Authorization URL & State Isolation', () => {
    it('should generate distinct OAuth state tokens bound to initiating user', async () => {
      const resA = await request(app)
        .get('/api/oauth/facebook?json=true')
        .set('Authorization', `Bearer ${userAToken}`);

      const resB = await request(app)
        .get('/api/oauth/facebook?json=true')
        .set('Authorization', `Bearer ${userBToken}`);

      expect(resA.status).toBe(200);
      expect(resB.status).toBe(200);

      const urlA = new URL(resA.body.data.url);
      const urlB = new URL(resB.body.data.url);

      // Verify clean URL parameters
      expect(urlA.searchParams.get('client_id')).toBeDefined();
      expect(urlB.searchParams.get('client_id')).toBeDefined();

      const stateA = urlA.searchParams.get('state');
      const stateB = urlB.searchParams.get('state');

      // States must be different
      expect(stateA).not.toBe(stateB);

      // Verify JWT sub in state corresponds to the exact user
      const decodedA = jwt.verify(stateA, config.jwtSecret);
      const decodedB = jwt.verify(stateB, config.jwtSecret);

      expect(decodedA.sub).toBe(userAId);
      expect(decodedB.sub).toBe(userBId);
      expect(decodedA.platform).toBe('FACEBOOK');
      expect(decodedB.platform).toBe('FACEBOOK');
    });
  });

  // ========================================================
  // 2. DASHBOARD / ACCOUNT RETRIEVAL ISOLATION
  // ========================================================
  describe('Social Account Retrieval & Token Security', () => {
    it('User A dashboard shows ONLY Page A and never Page B', async () => {
      const res = await request(app)
        .get('/api/social-accounts')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const accounts = res.body.data;
      expect(accounts.length).toBe(1);
      expect(accounts[0].platformUserId).toBe(PAGE_A_ID);
      expect(accounts[0].accountName).toBe(PAGE_A_NAME);
      // Ensure access token is never leaked to client!
      expect(accounts[0].accessToken).toBeUndefined();
    });

    it('User B dashboard shows ONLY Page B and never Page A', async () => {
      const res = await request(app)
        .get('/api/social-accounts')
        .set('Authorization', `Bearer ${userBToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const accounts = res.body.data;
      expect(accounts.length).toBe(1);
      expect(accounts[0].platformUserId).toBe(PAGE_B_ID);
      expect(accounts[0].accountName).toBe(PAGE_B_NAME);
      // Ensure access token is never leaked to client!
      expect(accounts[0].accessToken).toBeUndefined();
    });
  });

  // ========================================================
  // 3. CROSS-ACCOUNT HIJACKING PREVENTION
  // ========================================================
  describe('Cross-Account Hijacking Prevention', () => {
    it('User A CANNOT post using User B socialAccountId', async () => {
      const res = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          caption: 'Attempt to hijack User B channel',
          platforms: [{ platform: 'FACEBOOK', socialAccountId: userBFbAccountId }]
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('FORBIDDEN_ACCOUNT_ACCESS');
    });

    it('User B CANNOT post using User A socialAccountId', async () => {
      const res = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${userBToken}`)
        .send({
          caption: 'Attempt to hijack User A channel',
          platforms: [{ platform: 'FACEBOOK', socialAccountId: userAFbAccountId }]
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('FORBIDDEN_ACCOUNT_ACCESS');
    });
  });

  // ========================================================
  // 4. PUBLISHING ROUTING & TOKEN ISOLATION
  // ========================================================
  describe('Independent Publishing Execution & Page Targeting', () => {
    let prevMode;
    beforeAll(() => {
      prevMode = config.orchestrationMode;
      config.orchestrationMode = 'direct';
    });
    afterAll(() => {
      config.orchestrationMode = prevMode;
    });

    it('User A post publishes exclusively to Page A using Token A', async () => {
      const fbCalls = [];
      const postSpy = vi.spyOn(axios, 'post').mockImplementation(async (url, data, conf) => {
        if (url.includes('graph.facebook.com')) {
          fbCalls.push({ url, conf });
          return { data: { id: 'fb_post_id_alpha_999' } };
        }
        throw new Error('n8n offline in test environment');
      });

      const res = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          caption: 'Official update for Page A from User A',
          platforms: [{ platform: 'FACEBOOK', socialAccountId: userAFbAccountId }]
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('PUBLISHED');

      // Verify Facebook Graph API was called with Page A's endpoint and Page A's token
      expect(fbCalls.length).toBe(1);
      expect(fbCalls[0].url).toBe(`https://graph.facebook.com/v20.0/${PAGE_A_ID}/feed`);
      expect(fbCalls[0].conf.params.access_token).toBe(PAGE_A_TOKEN);
      expect(fbCalls[0].conf.params.message).toBe('Official update for Page A from User A');

      postSpy.mockRestore();
    });

    it('User B post publishes exclusively to Page B using Token B', async () => {
      const fbCalls = [];
      const postSpy = vi.spyOn(axios, 'post').mockImplementation(async (url, data, conf) => {
        if (url.includes('graph.facebook.com')) {
          fbCalls.push({ url, conf });
          return { data: { id: 'fb_post_id_beta_888' } };
        }
        throw new Error('n8n offline in test environment');
      });

      const res = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${userBToken}`)
        .send({
          caption: 'Official update for Page B from User B',
          platforms: [{ platform: 'FACEBOOK', socialAccountId: userBFbAccountId }]
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('PUBLISHED');

      // Verify Facebook Graph API was called with Page B's endpoint and Page B's token
      expect(fbCalls.length).toBe(1);
      expect(fbCalls[0].url).toBe(`https://graph.facebook.com/v20.0/${PAGE_B_ID}/feed`);
      expect(fbCalls[0].conf.params.access_token).toBe(PAGE_B_TOKEN);
      expect(fbCalls[0].conf.params.message).toBe('Official update for Page B from User B');

      postSpy.mockRestore();
    });
  });

  // ========================================================
  // 5. FACEBOOK MULTI-PAGE SELECTION ENDPOINTS
  // ========================================================
  describe('Facebook Multi-Page Selection Endpoints', () => {
    it('GET /api/oauth/facebook/pages should return sanitized page list without access tokens', async () => {
      const testToken = jwt.sign(
        {
          userId: userAId,
          platform: 'FACEBOOK',
          purpose: 'facebook_page_selection',
          facebookUserName: 'Multi Page Manager',
          pages: [
            { id: 'page_111', name: 'Sports Page', category: 'Sports', accessToken: 'secret_111' },
            { id: 'page_222', name: 'Tech Page', category: 'Technology', accessToken: 'secret_222' }
          ]
        },
        config.jwtSecret,
        { expiresIn: '15m' }
      );

      const res = await request(app)
        .get(`/api/oauth/facebook/pages?selection_token=${encodeURIComponent(testToken)}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.facebookUserName).toBe('Multi Page Manager');
      expect(res.body.data.pages.length).toBe(2);

      // Verify page details
      expect(res.body.data.pages[0]).toEqual({
        id: 'page_111',
        name: 'Sports Page',
        category: 'Sports'
      });
      // CRITICAL: Ensure access tokens are NEVER exposed to the frontend!
      expect(res.body.data.pages[0].accessToken).toBeUndefined();
      expect(res.body.data.pages[1].accessToken).toBeUndefined();
    });

    it('POST /api/oauth/facebook/select-page should link the chosen page and reject cross-user requests', async () => {
      const selectionToken = jwt.sign(
        {
          userId: userAId,
          platform: 'FACEBOOK',
          purpose: 'facebook_page_selection',
          facebookUserName: 'User Alpha Facebook',
          pages: [
            { id: 'page_chosen_333', name: 'Chosen Store Page', category: 'Retail', accessToken: 'token_chosen_333' }
          ]
        },
        config.jwtSecret,
        { expiresIn: '15m' }
      );

      // 1. Cross-user attempt: User B attempts to use User A's selection token
      const crossRes = await request(app)
        .post('/api/oauth/facebook/select-page')
        .set('Authorization', `Bearer ${userBToken}`)
        .send({
          selectionToken,
          selectedPageId: 'page_chosen_333'
        });

      expect(crossRes.status).toBe(403);
      expect(crossRes.body.error).toBe('FORBIDDEN_USER_MISMATCH');

      // 2. Legitimate attempt: User A selects the page
      const legitRes = await request(app)
        .post('/api/oauth/facebook/select-page')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          selectionToken,
          selectedPageId: 'page_chosen_333'
        });

      expect(legitRes.status).toBe(200);
      expect(legitRes.body.success).toBe(true);
      expect(legitRes.body.data.platformUserId).toBe('page_chosen_333');
      expect(legitRes.body.data.accountName).toBe('Chosen Store Page (Page)');

      // Verify in DB that User A's social account was updated to the chosen page
      const updatedAccountA = await prisma.socialAccount.findFirst({
        where: { userId: userAId, platform: 'FACEBOOK', platformUserId: 'page_chosen_333' }
      });
      expect(updatedAccountA.platformUserId).toBe('page_chosen_333');
      expect(updatedAccountA.accessToken).toBe('token_chosen_333');

      // Verify User B's account is still completely intact (Page B)
      const accountB = await prisma.socialAccount.findFirst({
        where: { userId: userBId, platform: 'FACEBOOK' }
      });
      expect(accountB.platformUserId).toBe(PAGE_B_ID);
      expect(accountB.accessToken).toBe(PAGE_B_TOKEN);
    });
  });

  // ========================================================
  // 6. DISCONNECT ISOLATION
  // ========================================================
  describe('Account Disconnect Isolation', () => {
    it('Disconnecting User A Facebook account leaves User B Facebook account completely unaffected', async () => {
      // User A disconnects their connected accounts
      const userAAccounts = await prisma.socialAccount.findMany({
        where: { userId: userAId }
      });
      for (const acc of userAAccounts) {
        const res = await request(app)
          .delete(`/api/social-accounts/${acc.id}`)
          .set('Authorization', `Bearer ${userAToken}`);
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      }

      // Verify User A now has 0 connected accounts
      const accountsA = await prisma.socialAccount.findMany({
        where: { userId: userAId }
      });
      expect(accountsA.length).toBe(0);

      // Verify User B STILL has their connected Facebook account
      const accountsB = await prisma.socialAccount.findMany({
        where: { userId: userBId }
      });
      expect(accountsB.length).toBe(1);
      expect(accountsB[0].platformUserId).toBe(PAGE_B_ID);
      expect(accountsB[0].status).toBe('CONNECTED');
    });
  });
});
