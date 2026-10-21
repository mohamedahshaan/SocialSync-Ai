import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../src/app.js';
import { prisma } from '../src/utils/prisma.js';
import { config } from '../src/config/index.js';
import { verifyOAuthState } from '../src/utils/oauthState.js';

describe('Accounts Page & Social Account Clean State Suite', () => {
  let superAdminUser = null;
  let superAdminToken = '';
  let regularUser = null;
  let regularUserToken = '';

  beforeAll(async () => {
    // 1. Fetch Super Admin
    superAdminUser = await prisma.user.findFirst({
      where: { email: 'admin@socialsync.ai' }
    });
    expect(superAdminUser).not.toBeNull();
    expect(superAdminUser.email).toBe('admin@socialsync.ai');

    superAdminToken = jwt.sign(
      { userId: superAdminUser.id, email: superAdminUser.email, role: 'SUPER_ADMIN', name: superAdminUser.name },
      config.jwtSecret,
      { expiresIn: '2h' }
    );

    // 2. Create isolated test user for security/isolation checks
    regularUser = await prisma.user.create({
      data: {
        name: 'Accounts Test Regular User',
        email: `accounts_test_${Date.now()}@socialsync.ai`,
        passwordHash: 'dummyhash',
        role: 'USER',
        plan: 'CREATOR',
        credits: 500,
        isEmailVerified: true
      }
    });

    regularUserToken = jwt.sign(
      { userId: regularUser.id, email: regularUser.email, role: 'USER', name: regularUser.name },
      config.jwtSecret,
      { expiresIn: '2h' }
    );
  });

  afterAll(async () => {
    if (regularUser) {
      await prisma.socialAccount.deleteMany({ where: { userId: regularUser.id } });
      await prisma.user.deleteMany({ where: { id: regularUser.id } });
    }
  });

  it('1. GET /api/social-accounts returns 0 accounts initially for Super Admin (all platforms Not Connected)', async () => {
    const res = await request(app)
      .get('/api/social-accounts')
      .set('Authorization', `Bearer ${superAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(0);
  });

  it('2. GET /api/social-accounts/status reports readiness for all 6 official platforms', async () => {
    const res = await request(app)
      .get('/api/social-accounts/status')
      .set('Authorization', `Bearer ${superAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const data = res.body.data;
    const requiredPlatforms = ['FACEBOOK', 'INSTAGRAM', 'LINKEDIN', 'THREADS', 'TIKTOK', 'YOUTUBE'];

    for (const p of requiredPlatforms) {
      expect(data).toHaveProperty(p);
      expect(data[p].name).toBeTruthy();
      expect(typeof data[p].isConfigured).toBe('boolean');
    }
  });

  it('3. Fabricated demo endpoints are disabled and reject requests with error', async () => {
    const resAll = await request(app)
      .post('/api/social-accounts/admin/link-all')
      .set('Authorization', `Bearer ${superAdminToken}`);

    expect(resAll.status).toBe(400);
    expect(resAll.body.success).toBe(false);
    expect(resAll.body.error).toBe('DEMO_CONNECTIONS_DISABLED');

    const resSingle = await request(app)
      .post('/api/social-accounts/admin/link-platform')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ platform: 'FACEBOOK' });

    expect(resSingle.status).toBe(400);
    expect(resSingle.body.success).toBe(false);
    expect(resSingle.body.error).toBe('DEMO_CONNECTIONS_DISABLED');
  });

  it('4. Real OAuth initiation generates authentic provider URL with CSRF state bound to Super Admin', async () => {
    const res = await request(app)
      .get('/api/oauth/facebook?json=true')
      .set('Authorization', `Bearer ${superAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.url).toMatch(/^https:\/\/www\.facebook\.com\//);

    // Extract state parameter
    const url = new URL(res.body.data.url);
    const state = url.searchParams.get('state');
    expect(state).toBeTruthy();

    // Verify state belongs strictly to the super admin
    const stateData = verifyOAuthState(state, 'FACEBOOK');
    expect(stateData.userId).toBe(superAdminUser.id);
    expect(stateData.platform).toBe('FACEBOOK');
  });

  it('5. Storing an authentic connection reflects in GET /api/social-accounts without exposing tokens', async () => {
    // Simulate a verified connection for Super Admin
    const created = await prisma.socialAccount.create({
      data: {
        userId: superAdminUser.id,
        platform: 'LINKEDIN',
        platformUserId: 'urn:li:person:auth_test_123',
        accountName: 'Super Admin LinkedIn Official',
        accountUsername: 'admin-linkedin',
        accountImage: 'https://cdn.example.com/admin_avatar.jpg',
        accessToken: 'secure_auth_token_never_expose_456',
        refreshToken: 'secure_refresh_token_789',
        status: 'CONNECTED'
      }
    });

    const res = await request(app)
      .get('/api/social-accounts')
      .set('Authorization', `Bearer ${superAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);

    const item = res.body.data[0];
    expect(item.id).toBe(created.id);
    expect(item.platform).toBe('LINKEDIN');
    expect(item.accountName).toBe('Super Admin LinkedIn Official');
    expect(item.accountImage).toBe('https://cdn.example.com/admin_avatar.jpg');
    expect(item.status).toBe('CONNECTED');

    // SECURITY: access token and refresh token must NEVER be returned in response
    expect(item.accessToken).toBeUndefined();
    expect(item.refreshToken).toBeUndefined();

    // Cleanup the test connection
    await prisma.socialAccount.delete({ where: { id: created.id } });
  });

  it('6. Strict account ownership: Regular user cannot see or delete Super Admin account', async () => {
    const superAdminAcc = await prisma.socialAccount.create({
      data: {
        userId: superAdminUser.id,
        platform: 'YOUTUBE',
        platformUserId: 'yt_channel_superadmin_001',
        accountName: 'SocialSync Official YouTube',
        accessToken: 'yt_secret_token_111',
        status: 'CONNECTED'
      }
    });

    // Regular user lists accounts -> must be 0
    const listRes = await request(app)
      .get('/api/social-accounts')
      .set('Authorization', `Bearer ${regularUserToken}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.data.length).toBe(0);

    // Regular user attempts to delete Super Admin's account -> 404 forbidden/not found
    const delRes = await request(app)
      .delete(`/api/social-accounts/${superAdminAcc.id}`)
      .set('Authorization', `Bearer ${regularUserToken}`);

    expect(delRes.status).toBe(404);

    // Disconnect by Super Admin succeeds and deletes the record
    const adminDelRes = await request(app)
      .delete(`/api/social-accounts/${superAdminAcc.id}`)
      .set('Authorization', `Bearer ${superAdminToken}`);

    expect(adminDelRes.status).toBe(200);
    expect(adminDelRes.body.success).toBe(true);

    const check = await prisma.socialAccount.findUnique({
      where: { id: superAdminAcc.id }
    });
    expect(check).toBeNull();
  });

  it('7. Super Admin user and Professional tier remain intact', async () => {
    const admin = await prisma.user.findUnique({
      where: { email: 'admin@socialsync.ai' }
    });

    expect(admin).not.toBeNull();
    expect(admin.role).toBe('SUPER_ADMIN');
    expect(admin.plan).toBe('PROFESSIONAL');
    expect(admin.credits).toBe(1500);
    expect(admin.status).toBe('ACTIVE');
  });
});
