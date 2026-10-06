import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/utils/prisma.js';

describe('Multi-Account Per Platform & User Isolation Suite', () => {
  let userToken = '';
  let userId = '';
  let userBToken = '';
  let userBId = '';

  const FB_PAGE_1_ID = 'fb_multi_page_111';
  const FB_PAGE_2_ID = 'fb_multi_page_222';
  const FB_PAGE_3_ID = 'fb_multi_page_333';

  beforeAll(async () => {
    // 1. Create User A
    const resA = await request(app).post('/api/auth/register').send({
      name: 'Multi Account User A',
      email: `multi_user_a_${Date.now()}@socialflow.ai`,
      password: 'Password123!',
      confirmPassword: 'Password123!'
    });
    userToken = resA.body.data.token;
    userId = resA.body.data.user.id;

    // 2. Create User B
    const resB = await request(app).post('/api/auth/register').send({
      name: 'Multi Account User B',
      email: `multi_user_b_${Date.now()}@socialflow.ai`,
      password: 'Password123!',
      confirmPassword: 'Password123!'
    });
    userBToken = resB.body.data.token;
    userBId = resB.body.data.user.id;
  });

  afterAll(async () => {
    await prisma.postPlatform.deleteMany({
      where: { post: { userId: { in: [userId, userBId] } } }
    });
    await prisma.post.deleteMany({
      where: { userId: { in: [userId, userBId] } }
    });
    await prisma.socialAccount.deleteMany({
      where: { userId: { in: [userId, userBId] } }
    });
    await prisma.user.deleteMany({
      where: { id: { in: [userId, userBId] } }
    });
  });

  it('Allows the same user to connect multiple accounts/pages on the same platform', async () => {
    // 1. User A connects Facebook Page 1
    const page1 = await prisma.socialAccount.create({
      data: {
        userId,
        platform: 'FACEBOOK',
        platformUserId: FB_PAGE_1_ID,
        accountName: 'Tech News Daily (Page 1)',
        accountUsername: 'technewsdaily',
        accessToken: 'token_page_1',
        status: 'CONNECTED'
      }
    });

    // 2. User A connects Facebook Page 2
    const page2 = await prisma.socialAccount.create({
      data: {
        userId,
        platform: 'FACEBOOK',
        platformUserId: FB_PAGE_2_ID,
        accountName: 'Design Trends Weekly (Page 2)',
        accountUsername: 'designtrends',
        accessToken: 'token_page_2',
        status: 'CONNECTED'
      }
    });

    // 3. User A connects Facebook Page 3
    const page3 = await prisma.socialAccount.create({
      data: {
        userId,
        platform: 'FACEBOOK',
        platformUserId: FB_PAGE_3_ID,
        accountName: 'Cooking Recipes Official (Page 3)',
        accountUsername: 'cookingrecipes',
        accessToken: 'token_page_3',
        status: 'CONNECTED'
      }
    });

    // Verify all 3 pages are in the database for User A
    const accounts = await prisma.socialAccount.findMany({
      where: { userId, platform: 'FACEBOOK' }
    });
    expect(accounts).toHaveLength(3);

    // Fetch via GET /api/social-accounts
    const getRes = await request(app)
      .get('/api/social-accounts')
      .set('Authorization', `Bearer ${userToken}`);

    expect(getRes.status).toBe(200);
    expect(getRes.body.success).toBe(true);
    expect(getRes.body.data).toHaveLength(3);

    const names = getRes.body.data.map(a => a.accountName);
    expect(names).toContain('Tech News Daily (Page 1)');
    expect(names).toContain('Design Trends Weekly (Page 2)');
    expect(names).toContain('Cooking Recipes Official (Page 3)');

    // Ensure access tokens are NOT exposed
    getRes.body.data.forEach(acc => {
      expect(acc.accessToken).toBeUndefined();
      expect(acc.refreshToken).toBeUndefined();
    });
  });

  it('User B cannot see User A multiple Facebook pages', async () => {
    const getResB = await request(app)
      .get('/api/social-accounts')
      .set('Authorization', `Bearer ${userBToken}`);

    expect(getResB.status).toBe(200);
    expect(getResB.body.success).toBe(true);
    expect(getResB.body.data).toHaveLength(0);
  });

  it('Disconnecting Page 1 leaves Page 2 and Page 3 connected for User A', async () => {
    const page1 = await prisma.socialAccount.findFirst({
      where: { userId, platformUserId: FB_PAGE_1_ID }
    });

    const delRes = await request(app)
      .delete(`/api/social-accounts/${page1.id}`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(delRes.status).toBe(200);
    expect(delRes.body.success).toBe(true);

    // Verify remaining accounts for User A
    const remaining = await prisma.socialAccount.findMany({
      where: { userId, platform: 'FACEBOOK' }
    });
    expect(remaining).toHaveLength(2);
    const remainingIds = remaining.map(a => a.platformUserId);
    expect(remainingIds).not.toContain(FB_PAGE_1_ID);
    expect(remainingIds).toContain(FB_PAGE_2_ID);
    expect(remainingIds).toContain(FB_PAGE_3_ID);
  });

  it('Allows publishing post targeting multiple pages of the same platform concurrently', async () => {
    const remaining = await prisma.socialAccount.findMany({
      where: { userId, platform: 'FACEBOOK' }
    });

    const post = await prisma.post.create({
      data: {
        userId,
        caption: 'Cross-page broadcast post',
        status: 'DRAFT',
        platforms: {
          create: remaining.map(acc => ({
            platform: 'FACEBOOK',
            socialAccountId: acc.id,
            status: 'PENDING'
          }))
        }
      },
      include: { platforms: true }
    });

    expect(post.platforms).toHaveLength(2);
    expect(post.platforms[0].socialAccountId).not.toBe(post.platforms[1].socialAccountId);
  });
});
