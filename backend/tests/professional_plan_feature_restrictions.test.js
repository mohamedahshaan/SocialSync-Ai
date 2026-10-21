import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/utils/prisma.js';

describe.sequential('Professional Plan Feature Restrictions (Collage Studio & AI Caption Generator)', () => {
  let freeUserToken = '';
  let freeUser = null;
  let creatorUserToken = '';
  let creatorUser = null;
  let proUserToken = '';
  let proUser = null;
  let expiredProUserToken = '';
  let expiredProUser = null;
  let cancelledProUserToken = '';
  let cancelledProUser = null;
  let scheduledPastDueProToken = '';
  let scheduledPastDueProUser = null;

  beforeAll(async () => {
    // 1. Create Free User
    const freeRes = await request(app).post('/api/auth/register').send({
      name: 'Free Plan User',
      email: `free_user_${Date.now()}@socialsync.ai`,
      password: 'Password123!',
      confirmPassword: 'Password123!'
    });
    freeUserToken = freeRes.body.data.token;
    freeUser = freeRes.body.data.user;

    // 2. Create Creator User
    const creatorRes = await request(app).post('/api/auth/register').send({
      name: 'Creator Plan User',
      email: `creator_user_${Date.now()}@socialsync.ai`,
      password: 'Password123!',
      confirmPassword: 'Password123!'
    });
    creatorUserToken = creatorRes.body.data.token;
    creatorUser = creatorRes.body.data.user;
    await prisma.user.update({
      where: { id: creatorUser.id },
      data: { plan: 'CREATOR' }
    });

    // 3. Create Active Professional User
    const proRes = await request(app).post('/api/auth/register').send({
      name: 'Professional Plan User',
      email: `pro_user_${Date.now()}@socialsync.ai`,
      password: 'Password123!',
      confirmPassword: 'Password123!'
    });
    proUserToken = proRes.body.data.token;
    proUser = proRes.body.data.user;
    await prisma.user.update({
      where: { id: proUser.id },
      data: { plan: 'PROFESSIONAL' }
    });
    await prisma.userSubscription.create({
      data: {
        userId: proUser.id,
        plan: 'PROFESSIONAL',
        status: 'ACTIVE',
        billingAmount: 5000,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        autoRenew: true
      }
    });

    // 4. Create Expired Professional User
    const expRes = await request(app).post('/api/auth/register').send({
      name: 'Expired Pro User',
      email: `expired_pro_${Date.now()}@socialsync.ai`,
      password: 'Password123!',
      confirmPassword: 'Password123!'
    });
    expiredProUserToken = expRes.body.data.token;
    expiredProUser = expRes.body.data.user;
    await prisma.user.update({
      where: { id: expiredProUser.id },
      data: { plan: 'PROFESSIONAL' }
    });
    await prisma.userSubscription.create({
      data: {
        userId: expiredProUser.id,
        plan: 'PROFESSIONAL',
        status: 'EXPIRED',
        billingAmount: 5000,
        currentPeriodStart: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
        currentPeriodEnd: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        autoRenew: false
      }
    });

    // 5. Create Cancelled Professional User
    const canRes = await request(app).post('/api/auth/register').send({
      name: 'Cancelled Pro User',
      email: `cancelled_pro_${Date.now()}@socialsync.ai`,
      password: 'Password123!',
      confirmPassword: 'Password123!'
    });
    cancelledProUserToken = canRes.body.data.token;
    cancelledProUser = canRes.body.data.user;
    await prisma.user.update({
      where: { id: cancelledProUser.id },
      data: { plan: 'PROFESSIONAL' }
    });
    await prisma.userSubscription.create({
      data: {
        userId: cancelledProUser.id,
        plan: 'PROFESSIONAL',
        status: 'CANCELLED',
        billingAmount: 5000,
        currentPeriodStart: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        currentPeriodEnd: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        autoRenew: false
      }
    });

    // 6. Create Pro User with Scheduled Cancellation whose period expired
    const pastRes = await request(app).post('/api/auth/register').send({
      name: 'Scheduled Past Due Pro User',
      email: `pastdue_pro_${Date.now()}@socialsync.ai`,
      password: 'Password123!',
      confirmPassword: 'Password123!'
    });
    scheduledPastDueProToken = pastRes.body.data.token;
    scheduledPastDueProUser = pastRes.body.data.user;
    await prisma.user.update({
      where: { id: scheduledPastDueProUser.id },
      data: { plan: 'PROFESSIONAL' }
    });
    await prisma.userSubscription.create({
      data: {
        userId: scheduledPastDueProUser.id,
        plan: 'PROFESSIONAL',
        status: 'CANCELLATION_SCHEDULED',
        billingAmount: 5000,
        cancelAtPeriodEnd: true,
        currentPeriodStart: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000),
        currentPeriodEnd: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        autoRenew: false
      }
    });
  });

  afterAll(async () => {
    // Clean up test subscriptions and users
    const userIds = [
      freeUser?.id,
      creatorUser?.id,
      proUser?.id,
      expiredProUser?.id,
      cancelledProUser?.id,
      scheduledPastDueProUser?.id
    ].filter(Boolean);

    await prisma.userSubscription.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.post.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  });

  // ==========================================
  // SCENARIO 1: FREE USER RESTRICTIONS
  // ==========================================
  describe('Free User Restrictions', () => {
    it('1.1 Should reject Free user calling /api/posts/generate-caption with HTTP 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/posts/generate-caption')
        .set('Authorization', `Bearer ${freeUserToken}`)
        .send({ mediaUrl: '/uploads/sample.jpg' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('PLAN_UPGRADE_REQUIRED');
      expect(res.body.code).toBe('PLAN_UPGRADE_REQUIRED');
      expect(res.body.requiredPlan).toBe('PROFESSIONAL');
      expect(res.body.currentPlan).toBe('FREE');
      expect(res.body.message).toContain('exclusive to the Professional Plan');
    });

    it('1.2 Should reject Free user calling /api/ai/generate-caption with HTTP 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/ai/generate-caption')
        .set('Authorization', `Bearer ${freeUserToken}`)
        .send({ mediaUrl: '/uploads/sample.jpg' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('PLAN_UPGRADE_REQUIRED');
      expect(res.body.code).toBe('PLAN_UPGRADE_REQUIRED');
    });

    it('1.3 Should reject Free user calling /api/uploads/collage with HTTP 403 Forbidden', async () => {
      const dummyBuffer = Buffer.from('fake-image-content');
      const res = await request(app)
        .post('/api/uploads/collage')
        .set('Authorization', `Bearer ${freeUserToken}`)
        .attach('media', dummyBuffer, 'test-collage.jpg');

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('PLAN_UPGRADE_REQUIRED');
      expect(res.body.code).toBe('PLAN_UPGRADE_REQUIRED');
      expect(res.body.requiredPlan).toBe('CREATOR');
    });

    it('1.4 Should reject Free user calling /api/posts/collage with HTTP 403 Forbidden', async () => {
      const dummyBuffer = Buffer.from('fake-image-content');
      const res = await request(app)
        .post('/api/posts/collage')
        .set('Authorization', `Bearer ${freeUserToken}`)
        .attach('media', dummyBuffer, 'test-collage.jpg');

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('PLAN_UPGRADE_REQUIRED');
      expect(res.body.code).toBe('PLAN_UPGRADE_REQUIRED');
    });

    it('1.5 Should report feature flags as false in /api/subscriptions/features for Free user', async () => {
      const res = await request(app)
        .get('/api/subscriptions/features')
        .set('Authorization', `Bearer ${freeUserToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.plan).toBe('FREE');
      expect(res.body.data.isProfessional).toBe(false);
      expect(res.body.data.canUseCollageStudio).toBe(false);
      expect(res.body.data.canUseAiCaption).toBe(false);
    });
  });

  // ==========================================
  // SCENARIO 2: CREATOR USER RESTRICTIONS
  // ==========================================
  describe('Creator User Restrictions & Collage Access', () => {
    it('2.1 Should reject Creator user calling /api/posts/generate-caption with HTTP 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/posts/generate-caption')
        .set('Authorization', `Bearer ${creatorUserToken}`)
        .send({ mediaUrl: '/uploads/sample.jpg' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('PLAN_UPGRADE_REQUIRED');
      expect(res.body.code).toBe('PLAN_UPGRADE_REQUIRED');
      expect(res.body.currentPlan).toBe('CREATOR');
    });

    it('2.2 Should allow Creator user calling /api/uploads/collage', async () => {
      const pngBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
      const res = await request(app)
        .post('/api/uploads/collage')
        .set('Authorization', `Bearer ${creatorUserToken}`)
        .attach('media', pngBuffer, 'creator-collage.png');

      expect([200, 201]).toContain(res.status);
      expect(res.body.success).toBe(true);
      expect(res.body.mediaUrl).toBeDefined();
    });

    it('2.3 Should report canUseCollageStudio=true and canUseAiCaption=false in /api/subscriptions/features for Creator user', async () => {
      const res = await request(app)
        .get('/api/subscriptions/features')
        .set('Authorization', `Bearer ${creatorUserToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.plan).toBe('CREATOR');
      expect(res.body.data.isProfessional).toBe(false);
      expect(res.body.data.canUseCollageStudio).toBe(true);
      expect(res.body.data.canUseAiCaption).toBe(false);
    });
  });

  // ==========================================
  // SCENARIO 3: INACTIVE / EXPIRED / CANCELLED SUBSCRIPTIONS
  // ==========================================
  describe('Inactive & Expired Professional Subscriptions', () => {
    it('3.1 Should reject user with EXPIRED subscription status with HTTP 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/posts/generate-caption')
        .set('Authorization', `Bearer ${expiredProUserToken}`)
        .send({ mediaUrl: '/uploads/sample.jpg' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('PLAN_UPGRADE_REQUIRED');
      expect(res.body.code).toBe('PLAN_UPGRADE_REQUIRED');
      expect(res.body.subscriptionStatus).toBe('EXPIRED');
    });

    it('3.2 Should reject user with CANCELLED subscription status with HTTP 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/uploads/collage')
        .set('Authorization', `Bearer ${cancelledProUserToken}`)
        .attach('media', Buffer.from('fake'), 'collage.jpg');

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('PLAN_UPGRADE_REQUIRED');
      expect(res.body.code).toBe('PLAN_UPGRADE_REQUIRED');
      expect(res.body.subscriptionStatus).toBe('CANCELLED');
    });

    it('3.3 Should reject user whose scheduled cancellation period has expired with HTTP 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/posts/generate-caption')
        .set('Authorization', `Bearer ${scheduledPastDueProToken}`)
        .send({ mediaUrl: '/uploads/sample.jpg' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('PLAN_UPGRADE_REQUIRED');
      expect(res.body.code).toBe('PLAN_UPGRADE_REQUIRED');
      expect(res.body.subscriptionStatus).toBe('EXPIRED');
    });

    it('3.4 Should report isProfessional=false in /api/subscriptions/features for expired subscription', async () => {
      const res = await request(app)
        .get('/api/subscriptions/features')
        .set('Authorization', `Bearer ${expiredProUserToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.isProfessional).toBe(false);
      expect(res.body.data.canUseCollageStudio).toBe(false);
      expect(res.body.data.canUseAiCaption).toBe(false);
    });
  });

  // ==========================================
  // SCENARIO 4: ACTIVE PROFESSIONAL PLAN USER ACCESS
  // ==========================================
  describe('Active Professional User Access', () => {
    it('4.1 Should report feature flags as true in /api/subscriptions/features for active Professional user', async () => {
      const res = await request(app)
        .get('/api/subscriptions/features')
        .set('Authorization', `Bearer ${proUserToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.plan).toBe('PROFESSIONAL');
      expect(res.body.data.isProfessional).toBe(true);
      expect(res.body.data.canUseCollageStudio).toBe(true);
      expect(res.body.data.canUseAiCaption).toBe(true);
    });

    it('4.2 Should allow active Professional user to pass plan authorization for /api/posts/generate-caption', async () => {
      // Passes plan middleware; returns 400 IMAGE_REQUIRED because no body was sent, proving 403 was bypassed
      const res = await request(app)
        .post('/api/posts/generate-caption')
        .set('Authorization', `Bearer ${proUserToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('IMAGE_REQUIRED');
    });

    it('4.3 Should allow active Professional user to upload collage via /api/uploads/collage', async () => {
      // 1x1 transparent PNG buffer
      const pngBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
      const res = await request(app)
        .post('/api/uploads/collage')
        .set('Authorization', `Bearer ${proUserToken}`)
        .attach('media', pngBuffer, 'collage-render.png');

      expect([200, 201]).toContain(res.status);
      expect(res.body.success).toBe(true);
      expect(res.body.mediaUrl).toBeDefined();
    });

    it('4.4 Should allow user in valid CANCELLATION_SCHEDULED state before period end', async () => {
      // Temporarily give a user CANCELLATION_SCHEDULED with future currentPeriodEnd
      const gracePeriodUserRes = await request(app).post('/api/auth/register').send({
        name: 'Grace Period Pro User',
        email: `grace_pro_${Date.now()}@socialsync.ai`,
        password: 'Password123!',
        confirmPassword: 'Password123!'
      });
      const graceToken = gracePeriodUserRes.body.data.token;
      const graceUserId = gracePeriodUserRes.body.data.user.id;

      await prisma.user.update({
        where: { id: graceUserId },
        data: { plan: 'PROFESSIONAL' }
      });
      await prisma.userSubscription.create({
        data: {
          userId: graceUserId,
          plan: 'PROFESSIONAL',
          status: 'CANCELLATION_SCHEDULED',
          billingAmount: 5000,
          cancelAtPeriodEnd: true,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days in future
          autoRenew: false
        }
      });

      const res = await request(app)
        .post('/api/posts/generate-caption')
        .set('Authorization', `Bearer ${graceToken}`)
        .send({});

      // Should not be 403 Forbidden!
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('IMAGE_REQUIRED');

      // Cleanup
      await prisma.userSubscription.deleteMany({ where: { userId: graceUserId } });
      await prisma.user.delete({ where: { id: graceUserId } });
    });
  });

  // ==========================================
  // SCENARIO 5: UPGRADE TRANSITION
  // ==========================================
  describe('Plan Upgrade Transition', () => {
    it('5.1 Upgrading Free user to Professional immediately unlocks features without token re-issuance', async () => {
      // 1. Verify Free user is currently rejected
      const rejectRes = await request(app)
        .post('/api/posts/generate-caption')
        .set('Authorization', `Bearer ${freeUserToken}`)
        .send({ mediaUrl: '/uploads/sample.jpg' });

      expect(rejectRes.status).toBe(403);
      expect(rejectRes.body.code).toBe('PLAN_UPGRADE_REQUIRED');

      // 2. Perform backend plan upgrade to PROFESSIONAL
      await prisma.user.update({
        where: { id: freeUser.id },
        data: { plan: 'PROFESSIONAL' }
      });
      await prisma.userSubscription.create({
        data: {
          userId: freeUser.id,
          plan: 'PROFESSIONAL',
          status: 'ACTIVE',
          billingAmount: 5000,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          autoRenew: true
        }
      });

      // 3. Immediately re-attempt using the SAME JWT token - database lookup confirms upgrade
      const allowedRes = await request(app)
        .post('/api/posts/generate-caption')
        .set('Authorization', `Bearer ${freeUserToken}`)
        .send({});

      expect(allowedRes.status).toBe(400); // 400 IMAGE_REQUIRED confirms requireProfessionalPlan passed!
      expect(allowedRes.body.error).toBe('IMAGE_REQUIRED');

      // 4. Feature check confirms access
      const featureRes = await request(app)
        .get('/api/subscriptions/features')
        .set('Authorization', `Bearer ${freeUserToken}`);

      expect(featureRes.status).toBe(200);
      expect(featureRes.body.data.isProfessional).toBe(true);
      expect(featureRes.body.data.canUseCollageStudio).toBe(true);
      expect(featureRes.body.data.canUseAiCaption).toBe(true);
    });
  });

  // ==========================================
  // SCENARIO 6: ADMIN PLAN CONFIGURATION OF COLLAGE STUDIO
  // ==========================================
  describe('Admin Plan Configuration of Collage Studio', () => {
    it('6.1 Should allow Admin to toggle hasCollageStudio on plan and immediately change user access', async () => {
      // Toggle Creator plan hasCollageStudio to false
      await prisma.packagePlan.update({
        where: { planType: 'CREATOR' },
        data: { hasCollageStudio: false }
      });

      const blockedRes = await request(app)
        .get('/api/subscriptions/features')
        .set('Authorization', `Bearer ${creatorUserToken}`);

      expect(blockedRes.body.data.canUseCollageStudio).toBe(false);

      // Restore Creator plan hasCollageStudio to true
      await prisma.packagePlan.update({
        where: { planType: 'CREATOR' },
        data: { hasCollageStudio: true }
      });

      const unblockedRes = await request(app)
        .get('/api/subscriptions/features')
        .set('Authorization', `Bearer ${creatorUserToken}`);

      expect(unblockedRes.body.data.canUseCollageStudio).toBe(true);
    });
  });
});
