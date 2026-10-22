import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/utils/prisma.js';
import { publishingService } from '../src/services/publishingService.js';
import { youtubeProvider } from '../src/services/social/youtube.js';

describe('Posts, Publishing, Partial Failure & Retries Suite', () => {
  let userToken = '';
  let userId = '';
  let fbAccountId = '';
  let liAccountId = '';
  let ytAccountId = '';

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

    // Elevate user to CREATOR plan with active subscription so scheduled post tests have feature entitlement
    await prisma.user.update({
      where: { id: userId },
      data: { plan: 'CREATOR', credits: 1000 }
    });
    await prisma.userSubscription.create({
      data: {
        userId,
        plan: 'CREATOR',
        status: 'ACTIVE',
        billingAmount: 1000,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        autoRenew: true
      }
    });

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

    const yt = await prisma.socialAccount.create({
      data: {
        userId,
        platform: 'YOUTUBE',
        platformUserId: 'yt_777',
        accountName: 'Tester YouTube Channel',
        accessToken: 'yt_token',
        status: 'CONNECTED'
      }
    });
    ytAccountId = yt.id;
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
    expect(res.body.data.summary.connectedAccountsCount).toBe(3);
    expect(res.body.data.perPlatformStats.FACEBOOK).toBeDefined();
    expect(res.body.data.perPlatformStats.YOUTUBE).toBeDefined();
    expect(res.body.data.externalMetricsNotice.status).toBe('CONFIGURATION_REQUIRED');
  });

  it('POST /api/posts accepts YOUTUBE platform and routes to YouTube provider', async () => {
    const publishSpy = vi.spyOn(youtubeProvider, 'publishPost').mockResolvedValueOnce({
      platformPostId: 'yt_mock_video_123'
    });

    const res = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        caption: 'Exciting YouTube Video announcement',
        mediaUrl: 'https://example.com/demo.mp4',
        mediaType: 'VIDEO',
        platforms: [
          { platform: 'YOUTUBE', socialAccountId: ytAccountId }
        ]
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.platforms[0].platform).toBe('YOUTUBE');
    expect(res.body.data.platforms[0].status).toBe('PUBLISHED');
    expect(res.body.data.platforms[0].platformPostId).toBe('yt_mock_video_123');
    expect(publishSpy).toHaveBeenCalledTimes(1);

    publishSpy.mockRestore();
  });

  it('POST /api/posts accepts YOUTUBE platform for scheduled posts', async () => {
    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const res = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        caption: 'Scheduled YouTube premiere',
        scheduledAt: futureDate,
        platforms: [
          { platform: 'YOUTUBE', socialAccountId: ytAccountId }
        ]
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('SCHEDULED');
    expect(res.body.data.platforms[0].platform).toBe('YOUTUBE');
    expect(res.body.data.platforms[0].status).toBe('PENDING');
  });

  it('POST /api/posts deducts exact points per platform (FB: 5, LI: 5 = 10 pts) and creates transaction record', async () => {
    const userBefore = await prisma.user.findUnique({ where: { id: userId } });
    const initialCredits = userBefore.credits;

    const futureDate = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    const res = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        caption: 'Multi-platform broadcast deduction test',
        scheduledAt: futureDate,
        platforms: [
          { platform: 'FACEBOOK', socialAccountId: fbAccountId },
          { platform: 'LINKEDIN', socialAccountId: liAccountId }
        ]
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.pointsDeducted).toBe(10); // 5 + 5

    const userAfter = await prisma.user.findUnique({ where: { id: userId } });
    expect(userAfter.credits).toBe(initialCredits - 10);

    const deductionTx = await prisma.creditTransaction.findFirst({
      where: { userId, type: 'USAGE_DEDUCT' },
      orderBy: { createdAt: 'desc' }
    });
    expect(deductionTx).toBeDefined();
    expect(deductionTx.amount).toBe(-10);
    expect(deductionTx.balanceAfter).toBe(userAfter.credits);

    // Cancel post and verify refund of 10 points
    const cancelRes = await request(app)
      .post(`/api/posts/${res.body.data.id}/cancel`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.refundedPoints).toBe(10);

    const userAfterRefund = await prisma.user.findUnique({ where: { id: userId } });
    expect(userAfterRefund.credits).toBe(initialCredits);
  });

  it('POST /api/posts rejects broadcast when user has insufficient credits', async () => {
    // Set user credits to 2 temporarily (below Facebook 5 credits cost)
    await prisma.user.update({
      where: { id: userId },
      data: { credits: 2 }
    });

    // Try posting to Facebook (requires 5 points)
    const res = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        caption: 'Should fail due to insufficient points',
        platforms: [
          { platform: 'FACEBOOK', socialAccountId: fbAccountId }
        ]
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('INSUFFICIENT_CREDITS');
    expect(res.body.message).toContain('Insufficient credits to complete this broadcast');

    // Restore credits
    await prisma.user.update({
      where: { id: userId },
      data: { credits: 200 }
    });
  });

  it('DELETE /api/posts/:id deletes post record permanently', async () => {
    // Create a dummy draft post
    const post = await prisma.post.create({
      data: {
        userId,
        caption: 'Post to be deleted from history',
        status: 'PUBLISHED'
      }
    });

    const delRes = await request(app)
      .delete(`/api/posts/${post.id}`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(delRes.status).toBe(200);
    expect(delRes.body.success).toBe(true);
    expect(delRes.body.message).toContain('deleted successfully');

    // Confirm it no longer exists
    const checkPost = await prisma.post.findUnique({ where: { id: post.id } });
    expect(checkPost).toBeNull();
  });

  it('DELETE /api/posts/:id refunds points if post was scheduled', async () => {
    const userBefore = await prisma.user.findUnique({ where: { id: userId } });
    const initialCredits = userBefore.credits;

    // Schedule post to Facebook (5 pts)
    const scheduleRes = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        caption: 'Scheduled post to be deleted with refund',
        scheduledAt: new Date(Date.now() + 86400000).toISOString(),
        platforms: [{ platform: 'FACEBOOK', socialAccountId: fbAccountId }]
      });

    expect(scheduleRes.status).toBe(201);
    const scheduledPostId = scheduleRes.body.data.id;

    const userDeducted = await prisma.user.findUnique({ where: { id: userId } });
    expect(userDeducted.credits).toBe(initialCredits - 5);

    // Delete the scheduled post
    const delRes = await request(app)
      .delete(`/api/posts/${scheduledPostId}`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(delRes.status).toBe(200);
    expect(delRes.body.success).toBe(true);
    expect(delRes.body.refundedPoints).toBe(5);

    const userRefunded = await prisma.user.findUnique({ where: { id: userId } });
    expect(userRefunded.credits).toBe(initialCredits);
  });

  it('POST /api/posts/batch-delete deletes multiple selected posts', async () => {
    const p1 = await prisma.post.create({
      data: { userId, caption: 'Batch delete post 1', status: 'DRAFT' }
    });
    const p2 = await prisma.post.create({
      data: { userId, caption: 'Batch delete post 2', status: 'DRAFT' }
    });

    const batchRes = await request(app)
      .post('/api/posts/batch-delete')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ postIds: [p1.id, p2.id] });

    expect(batchRes.status).toBe(200);
    expect(batchRes.body.success).toBe(true);
    expect(batchRes.body.deletedCount).toBe(2);

    const countRemaining = await prisma.post.count({
      where: { id: { in: [p1.id, p2.id] } }
    });
    expect(countRemaining).toBe(0);
  });
});
