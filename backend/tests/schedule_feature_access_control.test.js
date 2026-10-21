import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/utils/prisma.js';

describe.sequential('Schedule Feature Subscription-Based Access Control Suite', () => {
  let freeUser = null;
  let freeUserToken = '';
  let freeSocialAccount = null;

  let creatorUser = null;
  let creatorUserToken = '';
  let creatorSocialAccount = null;

  let proUser = null;
  let proUserToken = '';
  let proSocialAccount = null;

  let expiredUser = null;
  let expiredUserToken = '';
  let expiredSocialAccount = null;

  let cancelledUser = null;
  let cancelledUserToken = '';
  let cancelledSocialAccount = null;

  beforeAll(async () => {
    const timestamp = Date.now();

    // Ensure package plans exist in DB
    await prisma.packagePlan.upsert({
      where: { planType: 'FREE' },
      update: { hasScheduling: false },
      create: {
        planType: 'FREE',
        name: 'Free',
        priceLkr: 0,
        credits: 200,
        maxConnectedAccounts: 2,
        hasScheduling: false
      }
    });

    await prisma.packagePlan.upsert({
      where: { planType: 'CREATOR' },
      update: { hasScheduling: true },
      create: {
        planType: 'CREATOR',
        name: 'Creator',
        priceLkr: 1000,
        credits: 500,
        maxConnectedAccounts: 4,
        hasScheduling: true
      }
    });

    await prisma.packagePlan.upsert({
      where: { planType: 'PROFESSIONAL' },
      update: { hasScheduling: true },
      create: {
        planType: 'PROFESSIONAL',
        name: 'Professional',
        priceLkr: 2500,
        credits: 1500,
        maxConnectedAccounts: 6,
        hasScheduling: true
      }
    });

    // 1. Create Free User
    const freeRes = await request(app).post('/api/auth/register').send({
      name: 'Free User',
      email: `free_schedule_${timestamp}@socialsync.ai`,
      password: 'Password123!',
      confirmPassword: 'Password123!'
    });
    freeUserToken = freeRes.body.data.token;
    freeUser = freeRes.body.data.user;

    freeSocialAccount = await prisma.socialAccount.create({
      data: {
        userId: freeUser.id,
        platform: 'FACEBOOK',
        platformUserId: `fb_free_${timestamp}`,
        accountName: 'Free FB Page',
        status: 'CONNECTED',
        accessToken: 'fake_fb_token'
      }
    });

    // 2. Create Active Creator User
    const creatorRes = await request(app).post('/api/auth/register').send({
      name: 'Creator User',
      email: `creator_schedule_${timestamp}@socialsync.ai`,
      password: 'Password123!',
      confirmPassword: 'Password123!'
    });
    creatorUserToken = creatorRes.body.data.token;
    creatorUser = creatorRes.body.data.user;

    await prisma.user.update({
      where: { id: creatorUser.id },
      data: { plan: 'CREATOR', credits: 500 }
    });

    await prisma.userSubscription.create({
      data: {
        userId: creatorUser.id,
        plan: 'CREATOR',
        status: 'ACTIVE',
        billingAmount: 1000,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        autoRenew: true
      }
    });

    creatorSocialAccount = await prisma.socialAccount.create({
      data: {
        userId: creatorUser.id,
        platform: 'FACEBOOK',
        platformUserId: `fb_creator_${timestamp}`,
        accountName: 'Creator FB Page',
        status: 'CONNECTED',
        accessToken: 'fake_fb_token'
      }
    });

    // 3. Create Active Professional User
    const proRes = await request(app).post('/api/auth/register').send({
      name: 'Pro User',
      email: `pro_schedule_${timestamp}@socialsync.ai`,
      password: 'Password123!',
      confirmPassword: 'Password123!'
    });
    proUserToken = proRes.body.data.token;
    proUser = proRes.body.data.user;

    await prisma.user.update({
      where: { id: proUser.id },
      data: { plan: 'PROFESSIONAL', credits: 1500 }
    });

    await prisma.userSubscription.create({
      data: {
        userId: proUser.id,
        plan: 'PROFESSIONAL',
        status: 'ACTIVE',
        billingAmount: 2500,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        autoRenew: true
      }
    });

    proSocialAccount = await prisma.socialAccount.create({
      data: {
        userId: proUser.id,
        platform: 'FACEBOOK',
        platformUserId: `fb_pro_${timestamp}`,
        accountName: 'Pro FB Page',
        status: 'CONNECTED',
        accessToken: 'fake_fb_token'
      }
    });

    // 4. Create Expired Paid User
    const expRes = await request(app).post('/api/auth/register').send({
      name: 'Expired Paid User',
      email: `expired_schedule_${timestamp}@socialsync.ai`,
      password: 'Password123!',
      confirmPassword: 'Password123!'
    });
    expiredUserToken = expRes.body.data.token;
    expiredUser = expRes.body.data.user;

    await prisma.user.update({
      where: { id: expiredUser.id },
      data: { plan: 'CREATOR', credits: 500 }
    });

    await prisma.userSubscription.create({
      data: {
        userId: expiredUser.id,
        plan: 'CREATOR',
        status: 'EXPIRED',
        billingAmount: 1000,
        currentPeriodStart: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
        currentPeriodEnd: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        autoRenew: false
      }
    });

    expiredSocialAccount = await prisma.socialAccount.create({
      data: {
        userId: expiredUser.id,
        platform: 'FACEBOOK',
        platformUserId: `fb_exp_${timestamp}`,
        accountName: 'Expired FB Page',
        status: 'CONNECTED',
        accessToken: 'fake_fb_token'
      }
    });

    // 5. Create Cancelled Paid User
    const canRes = await request(app).post('/api/auth/register').send({
      name: 'Cancelled User',
      email: `cancelled_schedule_${timestamp}@socialsync.ai`,
      password: 'Password123!',
      confirmPassword: 'Password123!'
    });
    cancelledUserToken = canRes.body.data.token;
    cancelledUser = canRes.body.data.user;

    await prisma.user.update({
      where: { id: cancelledUser.id },
      data: { plan: 'PROFESSIONAL', credits: 1500 }
    });

    await prisma.userSubscription.create({
      data: {
        userId: cancelledUser.id,
        plan: 'PROFESSIONAL',
        status: 'CANCELLED',
        billingAmount: 2500,
        currentPeriodStart: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        currentPeriodEnd: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        autoRenew: false
      }
    });

    cancelledSocialAccount = await prisma.socialAccount.create({
      data: {
        userId: cancelledUser.id,
        platform: 'FACEBOOK',
        platformUserId: `fb_can_${timestamp}`,
        accountName: 'Cancelled FB Page',
        status: 'CONNECTED',
        accessToken: 'fake_fb_token'
      }
    });
  });

  afterAll(async () => {
    const userIds = [freeUser?.id, creatorUser?.id, proUser?.id, expiredUser?.id, cancelledUser?.id].filter(Boolean);
    if (userIds.length > 0) {
      await prisma.postPlatform.deleteMany({ where: { post: { userId: { in: userIds } } } });
      await prisma.post.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.socialAccount.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.userSubscription.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }
  });

  describe('Feature Entitlement Endpoint (GET /api/subscriptions/features)', () => {
    it('1. Free plan user receives canUseScheduling = false', async () => {
      const res = await request(app)
        .get('/api/subscriptions/features')
        .set('Authorization', `Bearer ${freeUserToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.plan).toBe('FREE');
      expect(res.body.data.canUseScheduling).toBe(false);
    });

    it('2. Active Creator user receives canUseScheduling = true', async () => {
      const res = await request(app)
        .get('/api/subscriptions/features')
        .set('Authorization', `Bearer ${creatorUserToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.plan).toBe('CREATOR');
      expect(res.body.data.canUseScheduling).toBe(true);
    });

    it('3. Active Professional user receives canUseScheduling = true', async () => {
      const res = await request(app)
        .get('/api/subscriptions/features')
        .set('Authorization', `Bearer ${proUserToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.plan).toBe('PROFESSIONAL');
      expect(res.body.data.canUseScheduling).toBe(true);
    });

    it('4. Expired user receives canUseScheduling = false', async () => {
      const res = await request(app)
        .get('/api/subscriptions/features')
        .set('Authorization', `Bearer ${expiredUserToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.canUseScheduling).toBe(false);
    });

    it('5. Cancelled user receives canUseScheduling = false', async () => {
      const res = await request(app)
        .get('/api/subscriptions/features')
        .set('Authorization', `Bearer ${cancelledUserToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.canUseScheduling).toBe(false);
    });
  });

  describe('Post Creation with Scheduling (POST /api/posts)', () => {
    const futureDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();

    it('6. Free user attempting to schedule a post is rejected with 403 PLAN_UPGRADE_REQUIRED', async () => {
      const initialUser = await prisma.user.findUnique({ where: { id: freeUser.id } });

      const res = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${freeUserToken}`)
        .send({
          caption: 'Test scheduling by Free User',
          scheduledAt: futureDate,
          platforms: [{ platform: 'FACEBOOK', socialAccountId: freeSocialAccount.id }]
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('PLAN_UPGRADE_REQUIRED');
      expect(res.body.code).toBe('PLAN_UPGRADE_REQUIRED');
      expect(res.body.message).toContain('Scheduled publishing is not available on your current plan');

      // Verify no credits were deducted
      const afterUser = await prisma.user.findUnique({ where: { id: freeUser.id } });
      expect(afterUser.credits).toBe(initialUser.credits);

      // Verify no scheduled post was created in database
      const postCount = await prisma.post.count({ where: { userId: freeUser.id, status: 'SCHEDULED' } });
      expect(postCount).toBe(0);
    });

    it('7. Free user CAN publish immediately (without scheduledAt)', async () => {
      const res = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${freeUserToken}`)
        .send({
          caption: 'Instant publish by Free User',
          scheduledAt: null,
          platforms: [{ platform: 'FACEBOOK', socialAccountId: freeSocialAccount.id }]
        });

      // Status should succeed (201 Created)
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).not.toBe('SCHEDULED');
    });

    it('8. Expired paid user attempting to schedule is rejected with 403 PLAN_UPGRADE_REQUIRED', async () => {
      const res = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${expiredUserToken}`)
        .send({
          caption: 'Test scheduling by Expired User',
          scheduledAt: futureDate,
          platforms: [{ platform: 'FACEBOOK', socialAccountId: expiredSocialAccount.id }]
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('PLAN_UPGRADE_REQUIRED');
      expect(res.body.code).toBe('PLAN_UPGRADE_REQUIRED');
    });

    it('9. Cancelled paid user attempting to schedule is rejected with 403 PLAN_UPGRADE_REQUIRED', async () => {
      const res = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${cancelledUserToken}`)
        .send({
          caption: 'Test scheduling by Cancelled User',
          scheduledAt: futureDate,
          platforms: [{ platform: 'FACEBOOK', socialAccountId: cancelledSocialAccount.id }]
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('PLAN_UPGRADE_REQUIRED');
      expect(res.body.code).toBe('PLAN_UPGRADE_REQUIRED');
    });

    it('10. Active Creator user CAN schedule post successfully', async () => {
      const res = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${creatorUserToken}`)
        .send({
          caption: 'Scheduled post by Creator User',
          scheduledAt: futureDate,
          platforms: [{ platform: 'FACEBOOK', socialAccountId: creatorSocialAccount.id }]
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('SCHEDULED');
      expect(res.body.data.scheduledAt).toBeTruthy();
    });

    it('11. Active Professional user CAN schedule post successfully', async () => {
      const res = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${proUserToken}`)
        .send({
          caption: 'Scheduled post by Professional User',
          scheduledAt: futureDate,
          platforms: [{ platform: 'FACEBOOK', socialAccountId: proSocialAccount.id }]
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('SCHEDULED');
      expect(res.body.data.scheduledAt).toBeTruthy();
    });
  });

  describe('Post Rescheduling (POST /api/posts/:id/reschedule)', () => {
    let creatorPost = null;
    let freePost = null;
    const futureDate1 = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    const futureDate2 = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();

    beforeAll(async () => {
      // Create a scheduled post for Creator
      creatorPost = await prisma.post.create({
        data: {
          userId: creatorUser.id,
          caption: 'Reschedule test post',
          status: 'SCHEDULED',
          scheduledAt: new Date(futureDate1)
        }
      });

      // Create a draft post for Free user
      freePost = await prisma.post.create({
        data: {
          userId: freeUser.id,
          caption: 'Free user post',
          status: 'DRAFT'
        }
      });
    });

    it('12. Free user attempting to reschedule is rejected with 403 PLAN_UPGRADE_REQUIRED', async () => {
      const res = await request(app)
        .post(`/api/posts/${freePost.id}/reschedule`)
        .set('Authorization', `Bearer ${freeUserToken}`)
        .send({ scheduledAt: futureDate2 });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('PLAN_UPGRADE_REQUIRED');
      expect(res.body.code).toBe('PLAN_UPGRADE_REQUIRED');
    });

    it('13. Expired user attempting to reschedule is rejected with 403 PLAN_UPGRADE_REQUIRED', async () => {
      const res = await request(app)
        .post(`/api/posts/${creatorPost.id}/reschedule`)
        .set('Authorization', `Bearer ${expiredUserToken}`)
        .send({ scheduledAt: futureDate2 });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('PLAN_UPGRADE_REQUIRED');
      expect(res.body.code).toBe('PLAN_UPGRADE_REQUIRED');
    });

    it('14. Active Creator user CAN reschedule post successfully', async () => {
      const res = await request(app)
        .post(`/api/posts/${creatorPost.id}/reschedule`)
        .set('Authorization', `Bearer ${creatorUserToken}`)
        .send({ scheduledAt: futureDate2 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('SCHEDULED');

      const updated = await prisma.post.findUnique({ where: { id: creatorPost.id } });
      expect(new Date(updated.scheduledAt).toISOString()).toBe(new Date(futureDate2).toISOString());
    });
  });

  describe('Dynamic Package Plan Entitlement via packagePlan.hasScheduling', () => {
    const futureDate = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString();

    it('15. Disabling hasScheduling in DB on Creator plan immediately blocks scheduling for Creator users', async () => {
      // Temporarily set hasScheduling = false on Creator plan in PostgreSQL
      await prisma.packagePlan.update({
        where: { planType: 'CREATOR' },
        data: { hasScheduling: false }
      });

      try {
        // Entitlements endpoint should now report canUseScheduling = false
        const featRes = await request(app)
          .get('/api/subscriptions/features')
          .set('Authorization', `Bearer ${creatorUserToken}`);

        expect(featRes.body.data.canUseScheduling).toBe(false);

        // Post creation should now be blocked
        const postRes = await request(app)
          .post('/api/posts')
          .set('Authorization', `Bearer ${creatorUserToken}`)
          .send({
            caption: 'Should be blocked dynamically',
            scheduledAt: futureDate,
            platforms: [{ platform: 'FACEBOOK', socialAccountId: creatorSocialAccount.id }]
          });

        expect(postRes.status).toBe(403);
        expect(postRes.body.error).toBe('PLAN_UPGRADE_REQUIRED');
      } finally {
        // Restore hasScheduling = true on Creator plan
        await prisma.packagePlan.update({
          where: { planType: 'CREATOR' },
          data: { hasScheduling: true }
        });
      }
    });

    it('16. Restoring hasScheduling in DB on Creator plan immediately re-allows scheduling', async () => {
      const featRes = await request(app)
        .get('/api/subscriptions/features')
        .set('Authorization', `Bearer ${creatorUserToken}`);

      expect(featRes.body.data.canUseScheduling).toBe(true);

      const postRes = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${creatorUserToken}`)
        .send({
          caption: 'Creator post after restoration',
          scheduledAt: futureDate,
          platforms: [{ platform: 'FACEBOOK', socialAccountId: creatorSocialAccount.id }]
        });

      expect(postRes.status).toBe(201);
      expect(postRes.body.data.status).toBe('SCHEDULED');
    });
  });
});
