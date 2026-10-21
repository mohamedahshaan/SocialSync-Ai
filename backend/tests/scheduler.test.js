import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/utils/prisma.js';
import { schedulerService } from '../src/services/schedulerService.js';
import { publishingService } from '../src/services/publishingService.js';

describe('Scheduled Posting & Background Worker Suite', () => {
  let userToken = '';
  let userId = '';
  let fbAccountId = '';

  beforeAll(async () => {
    // Create test user
    const res = await request(app).post('/api/auth/register').send({
      name: 'Scheduler Tester',
      email: `scheduler_${Date.now()}@socialflow.ai`,
      password: 'Password123!',
      confirmPassword: 'Password123!'
    });
    userToken = res.body.data.token;
    userId = res.body.data.user.id;

    // Grant user CREATOR plan with active subscription so scheduled post worker tests are authorized
    await prisma.user.update({
      where: { id: userId },
      data: { plan: 'CREATOR', credits: 500 }
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

    // Create a connected social account
    const fb = await prisma.socialAccount.create({
      data: {
        userId,
        platform: 'FACEBOOK',
        platformUserId: 'fb_scheduled_123',
        accountName: 'Scheduler Test FB',
        accessToken: 'fb_token_mock',
        status: 'CONNECTED'
      }
    });
    fbAccountId = fb.id;
  });

  afterAll(async () => {
    schedulerService.stop();
    await prisma.user.deleteMany({
      where: { id: userId }
    });
  });

  it('1. POST /api/posts should successfully schedule a post for a future time', async () => {
    const futureTime = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour ahead

    const res = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        caption: 'Future scheduled post test',
        scheduledAt: futureTime,
        platforms: [{ platform: 'FACEBOOK', socialAccountId: fbAccountId }]
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('SCHEDULED');
    expect(res.body.data.scheduledAt).toBeDefined();

    const postInDb = await prisma.post.findUnique({
      where: { id: res.body.data.id },
      include: { platforms: true }
    });
    expect(postInDb.status).toBe('SCHEDULED');
    expect(postInDb.platforms[0].status).toBe('PENDING');
  });

  it('2. Scheduler should NOT process posts scheduled in the future', async () => {
    // Post scheduled 2 hours in the future
    const futurePost = await prisma.post.create({
      data: {
        userId,
        caption: 'Far future post',
        status: 'SCHEDULED',
        scheduledAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
        platforms: {
          create: [{ platform: 'FACEBOOK', socialAccountId: fbAccountId, status: 'PENDING' }]
        }
      }
    });

    // Trigger scheduler cycle
    const processed = await schedulerService.processDuePosts();

    // Check post in db - must still be SCHEDULED
    const postAfter = await prisma.post.findUnique({ where: { id: futurePost.id } });
    expect(postAfter.status).toBe('SCHEDULED');

    // Clean up
    await prisma.postPlatform.deleteMany({ where: { postId: futurePost.id } });
    await prisma.post.delete({ where: { id: futurePost.id } });
  });

  it('3. Scheduler should automatically find and process due posts (scheduledAt <= now)', async () => {
    // Create a post whose scheduled time is in the past (due now)
    const duePost = await prisma.post.create({
      data: {
        userId,
        caption: 'Due scheduled post',
        status: 'SCHEDULED',
        scheduledAt: new Date(Date.now() - 5000), // 5 seconds ago
        platforms: {
          create: [{ platform: 'FACEBOOK', socialAccountId: fbAccountId, status: 'PENDING' }]
        }
      }
    });

    // Mock publishingService.executePublishing to return PUBLISHED
    const executeSpy = vi.spyOn(publishingService, 'executePublishing').mockImplementation(async (postId) => {
      return prisma.post.update({
        where: { id: postId },
        data: { status: 'PUBLISHED' }
      });
    });

    const processedCount = await schedulerService.processDuePosts();
    expect(processedCount).toBeGreaterThanOrEqual(1);

    const postAfter = await prisma.post.findUnique({ where: { id: duePost.id } });
    expect(postAfter.status).toBe('PUBLISHED');

    executeSpy.mockRestore();

    // Clean up
    await prisma.postPlatform.deleteMany({ where: { postId: duePost.id } });
    await prisma.post.delete({ where: { id: duePost.id } });
  });

  it('4. POST /api/posts/:id/publish should immediately publish a scheduled post', async () => {
    const scheduledPost = await prisma.post.create({
      data: {
        userId,
        caption: 'Publish now test post',
        status: 'SCHEDULED',
        scheduledAt: new Date(Date.now() + 3600000),
        platforms: {
          create: [{ platform: 'FACEBOOK', socialAccountId: fbAccountId, status: 'PENDING' }]
        }
      }
    });

    const executeSpy = vi.spyOn(publishingService, 'executePublishing').mockImplementation(async (postId) => {
      return prisma.post.update({
        where: { id: postId },
        data: { status: 'PUBLISHED' }
      });
    });

    const res = await request(app)
      .post(`/api/posts/${scheduledPost.id}/publish`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const postAfter = await prisma.post.findUnique({ where: { id: scheduledPost.id } });
    expect(postAfter.status).toBe('PUBLISHED');
    expect(postAfter.scheduledAt).toBeNull(); // Reset schedule

    executeSpy.mockRestore();

    // Clean up
    await prisma.postPlatform.deleteMany({ where: { postId: scheduledPost.id } });
    await prisma.post.delete({ where: { id: scheduledPost.id } });
  });

  it('5. POST /api/posts/:id/cancel should cancel schedule and refund credits', async () => {
    const userBefore = await prisma.user.findUnique({ where: { id: userId } });

    // Schedule post via API (costs 12 credits for FACEBOOK)
    const createRes = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        caption: 'To be cancelled post',
        scheduledAt: new Date(Date.now() + 7200000).toISOString(),
        platforms: [{ platform: 'FACEBOOK', socialAccountId: fbAccountId }]
      });

    expect(createRes.status).toBe(201);
    const postId = createRes.body.data.id;

    // Verify credits were deducted
    const userAfterDeduct = await prisma.user.findUnique({ where: { id: userId } });
    const deductedAmount = userBefore.credits - userAfterDeduct.credits;
    expect(deductedAmount).toBeGreaterThan(0);

    // Cancel schedule
    const cancelRes = await request(app)
      .post(`/api/posts/${postId}/cancel`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.success).toBe(true);
    expect(cancelRes.body.refundedPoints).toBe(deductedAmount);

    // Verify credits were refunded back
    const userAfterRefund = await prisma.user.findUnique({ where: { id: userId } });
    expect(userAfterRefund.credits).toBe(userBefore.credits);

    // Verify post is now DRAFT
    const postAfter = await prisma.post.findUnique({ where: { id: postId } });
    expect(postAfter.status).toBe('DRAFT');
    expect(postAfter.scheduledAt).toBeNull();

    // Clean up
    await prisma.postPlatform.deleteMany({ where: { postId } });
    await prisma.post.delete({ where: { id: postId } });
  });

  it('6. SchedulerService lifecycle start() and stop() should be safe and idempotent', () => {
    schedulerService.start();
    expect(schedulerService.isRunning).toBe(true);

    // Idempotent start
    schedulerService.start();
    expect(schedulerService.isRunning).toBe(true);

    schedulerService.stop();
    expect(schedulerService.isRunning).toBe(false);

    // Idempotent stop
    schedulerService.stop();
    expect(schedulerService.isRunning).toBe(false);
  });
});
