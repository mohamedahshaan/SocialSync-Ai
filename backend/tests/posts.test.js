import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/utils/prisma.js';
import { publishingService } from '../src/services/publishingService.js';

describe('Posts, Publishing, Partial Failure & Retries Suite', () => {
  let userToken = '';
  let userId = '';
  let fbAccountId = '';
  let liAccountId = '';

  beforeAll(async () => {
    // Create test user
    const res = await request(app).post('/api/auth/register').send({
      name: 'Post Publisher',
      email: `publisher_${Date.now()}@socialflow.ai`,
      password: 'Password123!',
      confirmPassword: 'Password123!'
    });
    userToken = res.body.data.token;
    userId = res.body.data.user.id;

    // Create 2 social accounts for this user (Facebook & LinkedIn)
    const fb = await prisma.socialAccount.create({
      data: {
        userId,
        platform: 'FACEBOOK',
        platformUserId: 'fb_999',
        accountName: 'Tester FB Page',
        accessToken: 'fb_token',
        status: 'CONNECTED'
      }
    });
    fbAccountId = fb.id;

    const li = await prisma.socialAccount.create({
      data: {
        userId,
        platform: 'LINKEDIN',
        platformUserId: 'li_888',
        accountName: 'Tester LinkedIn',
        accessToken: 'li_token',
        status: 'CONNECTED'
      }
    });
    liAccountId = li.id;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { id: userId }
    });
  });

  it('computePostStatus should correctly classify overall statuses', () => {
    // All published
    expect(publishingService.computePostStatus([
      { status: 'PUBLISHED' },
      { status: 'PUBLISHED' }
    ])).toBe('PUBLISHED');

    // Partial failure
    expect(publishingService.computePostStatus([
      { status: 'PUBLISHED' },
      { status: 'FAILED' }
    ])).toBe('PARTIALLY_PUBLISHED');

    // All failed
    expect(publishingService.computePostStatus([
      { status: 'FAILED' },
      { status: 'FAILED' }
    ])).toBe('FAILED');

    // Publishing in flight
    expect(publishingService.computePostStatus([
      { status: 'PUBLISHED' },
      { status: 'PUBLISHING' }
    ])).toBe('PUBLISHING');
  });

  it('POST /api/posts should schedule a post if scheduledAt is in the future', async () => {
    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const res = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        caption: 'Scheduled social media post',
        scheduledAt: futureDate,
        platforms: [
          { platform: 'FACEBOOK', socialAccountId: fbAccountId }
        ]
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('SCHEDULED');
    expect(res.body.data.scheduledAt).toBeDefined();

    const postId = res.body.data.id;

    // Test cancelling scheduled post
    const cancelRes = await request(app)
      .post(`/api/posts/${postId}/cancel`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.data.status).toBe('DRAFT');
  });

  it('Retry flow should ONLY retry FAILED platforms and never touch PUBLISHED platforms', async () => {
    // 1. Manually create a post with 1 PUBLISHED and 1 FAILED platform (PARTIALLY_PUBLISHED)
    const post = await prisma.post.create({
      data: {
        userId,
        caption: 'Partial publish test post',
        status: 'PARTIALLY_PUBLISHED',
        platforms: {
          create: [
            {
              platform: 'FACEBOOK',
              socialAccountId: fbAccountId,
              status: 'PUBLISHED',
              platformPostId: 'fb_real_post_111',
              publishedAt: new Date()
            },
            {
              platform: 'LINKEDIN',
              socialAccountId: liAccountId,
              status: 'FAILED',
              errorMessage: 'Network timeout on initial publish'
            }
          ]
        }
      },
      include: { platforms: true }
    });

    const fbPlatformBefore = post.platforms.find(p => p.platform === 'FACEBOOK');
    expect(fbPlatformBefore.status).toBe('PUBLISHED');

    // 2. Call Retry endpoint
    const retryRes = await request(app)
      .post(`/api/posts/${post.id}/retry`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(retryRes.status).toBe(200);
    expect(retryRes.body.success).toBe(true);

    // 3. Verify that Facebook target was NEVER touched (still PUBLISHED with same platformPostId)
    const fbPlatformAfter = await prisma.postPlatform.findUnique({
      where: { id: fbPlatformBefore.id }
    });

    expect(fbPlatformAfter.status).toBe('PUBLISHED');
    expect(fbPlatformAfter.platformPostId).toBe('fb_real_post_111');
  });

  it('GET /api/analytics should return real user-scoped metrics', async () => {
    const res = await request(app)
      .get('/api/analytics')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.summary.totalPosts).toBeGreaterThanOrEqual(1);
    expect(res.body.data.summary.connectedAccountsCount).toBe(2);
    expect(res.body.data.perPlatformStats.FACEBOOK).toBeDefined();
    expect(res.body.data.externalMetricsNotice.status).toBe('CONFIGURATION_REQUIRED');
  });
});
