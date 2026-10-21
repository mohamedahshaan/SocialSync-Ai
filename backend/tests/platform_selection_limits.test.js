import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/utils/prisma.js';
import { publishingService } from '../src/services/publishingService.js';
import { getMaxTargetPlatformsForPlan, PLAN_TARGET_PLATFORM_LIMITS } from '../src/services/planService.js';

describe('Plan-Based Target Platform Selection Limits Suite', () => {
  let freeUserToken = '';
  let freeUserId = '';
  let creatorUserToken = '';
  let creatorUserId = '';
  let proUserToken = '';
  let proUserId = '';

  // 6 Social Accounts created for the Free user
  const freeAccounts = {};
  // 6 Social Accounts created for Creator user
  const creatorAccounts = {};
  // 6 Social Accounts created for Professional user
  const proAccounts = {};

  const ALL_PLATFORMS = ['FACEBOOK', 'LINKEDIN', 'YOUTUBE', 'INSTAGRAM', 'THREADS', 'TIKTOK'];

  beforeAll(async () => {
    // Mock publishingService.executePublishing so immediate publishes succeed instantly without external APIs
    vi.spyOn(publishingService, 'executePublishing').mockImplementation(async (postId, userId) => {
      await prisma.post.update({
        where: { id: postId },
        data: { status: 'PUBLISHED' }
      });
      await prisma.postPlatform.updateMany({
        where: { postId },
        data: { status: 'PUBLISHED', platformPostId: `mock_post_${Date.now()}` }
      });
      return prisma.post.findUnique({
        where: { id: postId },
        include: { platforms: true }
      });
    });

    // 1. Create Free User
    const freeRes = await request(app).post('/api/auth/register').send({
      name: 'Free Tier User',
      email: `free_user_${Date.now()}@socialflow.ai`,
      password: 'Password123!',
      confirmPassword: 'Password123!'
    });
    freeUserToken = freeRes.body.data.token;
    freeUserId = freeRes.body.data.user.id;
    // Set 10,000 credits to avoid credit blockage during tests
    await prisma.user.update({
      where: { id: freeUserId },
      data: { credits: 10000, plan: 'FREE' }
    });

    // Connect all 6 platforms for Free user (verifies account connections are independent)
    for (const platform of ALL_PLATFORMS) {
      const acc = await prisma.socialAccount.create({
        data: {
          userId: freeUserId,
          platform,
          platformUserId: `free_${platform.toLowerCase()}_101`,
          accountName: `Free ${platform} Account`,
          accessToken: `mock_token_${platform.toLowerCase()}`,
          status: 'CONNECTED'
        }
      });
      freeAccounts[platform] = acc.id;
    }

    // 2. Create Creator User
    const creatorRes = await request(app).post('/api/auth/register').send({
      name: 'Creator Tier User',
      email: `creator_user_${Date.now()}@socialflow.ai`,
      password: 'Password123!',
      confirmPassword: 'Password123!'
    });
    creatorUserToken = creatorRes.body.data.token;
    creatorUserId = creatorRes.body.data.user.id;
    await prisma.user.update({
      where: { id: creatorUserId },
      data: { credits: 10000, plan: 'CREATOR' }
    });

    // Connect all 6 platforms for Creator user
    for (const platform of ALL_PLATFORMS) {
      const acc = await prisma.socialAccount.create({
        data: {
          userId: creatorUserId,
          platform,
          platformUserId: `creator_${platform.toLowerCase()}_202`,
          accountName: `Creator ${platform} Account`,
          accessToken: `mock_token_${platform.toLowerCase()}`,
          status: 'CONNECTED'
        }
      });
      creatorAccounts[platform] = acc.id;
    }

    // 3. Create Professional User
    const proRes = await request(app).post('/api/auth/register').send({
      name: 'Pro Tier User',
      email: `pro_user_${Date.now()}@socialflow.ai`,
      password: 'Password123!',
      confirmPassword: 'Password123!'
    });
    proUserToken = proRes.body.data.token;
    proUserId = proRes.body.data.user.id;
    await prisma.user.update({
      where: { id: proUserId },
      data: { credits: 10000, plan: 'PROFESSIONAL' }
    });

    // Connect all 6 platforms for Pro user
    for (const platform of ALL_PLATFORMS) {
      const acc = await prisma.socialAccount.create({
        data: {
          userId: proUserId,
          platform,
          platformUserId: `pro_${platform.toLowerCase()}_303`,
          accountName: `Pro ${platform} Account`,
          accessToken: `mock_token_${platform.toLowerCase()}`,
          status: 'CONNECTED'
        }
      });
      proAccounts[platform] = acc.id;
    }
  });

  afterAll(async () => {
    vi.restoreAllMocks();
    // Cleanup users and associated accounts & posts
    const userIds = [freeUserId, creatorUserId, proUserId].filter(Boolean);
    if (userIds.length > 0) {
      await prisma.postPlatform.deleteMany({
        where: { post: { userId: { in: userIds } } }
      });
      await prisma.post.deleteMany({
        where: { userId: { in: userIds } }
      });
      await prisma.socialAccount.deleteMany({
        where: { userId: { in: userIds } }
      });
      await prisma.creditTransaction.deleteMany({
        where: { userId: { in: userIds } }
      });
      await prisma.user.deleteMany({
        where: { id: { in: userIds } }
      });
    }
  });

  describe('1. Plan Limit Configuration Constants', () => {
    it('getMaxTargetPlatformsForPlan returns 2 for FREE, 4 for CREATOR, 6 for PROFESSIONAL', () => {
      expect(getMaxTargetPlatformsForPlan('FREE')).toBe(2);
      expect(getMaxTargetPlatformsForPlan('CREATOR')).toBe(4);
      expect(getMaxTargetPlatformsForPlan('PROFESSIONAL')).toBe(6);
      expect(getMaxTargetPlatformsForPlan(null)).toBe(2);
      expect(getMaxTargetPlatformsForPlan(undefined)).toBe(2);
      expect(getMaxTargetPlatformsForPlan('unknown')).toBe(2);
    });

    it('PLAN_TARGET_PLATFORM_LIMITS exports explicit limits matching requirements', () => {
      expect(PLAN_TARGET_PLATFORM_LIMITS.FREE).toBe(2);
      expect(PLAN_TARGET_PLATFORM_LIMITS.CREATOR).toBe(4);
      expect(PLAN_TARGET_PLATFORM_LIMITS.PROFESSIONAL).toBe(6);
    });
  });

  describe('2. Account Connections Remain Separate and Independent', () => {
    it('Free user retains all 6 connected social accounts independently of target platform limits', async () => {
      const res = await request(app)
        .get('/api/social-accounts')
        .set('Authorization', `Bearer ${freeUserToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(6);
      const platforms = res.body.data.map(a => a.platform);
      expect(platforms).toEqual(expect.arrayContaining(ALL_PLATFORMS));
    });
  });

  describe('3. Free Plan Limits (Max 2 platforms per post)', () => {
    it('Accepts publishing with 2 target platforms on Free plan', async () => {
      const res = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${freeUserToken}`)
        .send({
          caption: 'Free user valid 2-platform post',
          platforms: [
            { platform: 'FACEBOOK', socialAccountId: freeAccounts.FACEBOOK },
            { platform: 'LINKEDIN', socialAccountId: freeAccounts.LINKEDIN }
          ]
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('PUBLISHED');
      expect(res.body.data.platforms.length).toBe(2);
    });

    it('Rejects publishing with 3 target platforms on Free plan with HTTP 403', async () => {
      const res = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${freeUserToken}`)
        .send({
          caption: 'Free user exceeding limit with 3 platforms',
          platforms: [
            { platform: 'FACEBOOK', socialAccountId: freeAccounts.FACEBOOK },
            { platform: 'LINKEDIN', socialAccountId: freeAccounts.LINKEDIN },
            { platform: 'YOUTUBE', socialAccountId: freeAccounts.YOUTUBE }
          ]
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('PLAN_PLATFORM_LIMIT_EXCEEDED');
      expect(res.body.limit).toBe(2);
      expect(res.body.message).toContain('allows selecting a maximum of 2 target platforms');
    });

    it('Rejects scheduling post on Free plan with HTTP 403 PLAN_UPGRADE_REQUIRED', async () => {
      const futureDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
      const res = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${freeUserToken}`)
        .send({
          caption: 'Free user scheduled 2-platform post',
          scheduledAt: futureDate,
          platforms: [
            { platform: 'FACEBOOK', socialAccountId: freeAccounts.FACEBOOK },
            { platform: 'YOUTUBE', socialAccountId: freeAccounts.YOUTUBE }
          ]
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('PLAN_UPGRADE_REQUIRED');
      expect(res.body.code).toBe('PLAN_UPGRADE_REQUIRED');
      expect(res.body.message).toContain('Scheduled publishing is not available on your current plan');
    });

    it('Rejects scheduling post with 3 target platforms on Free plan with HTTP 403', async () => {
      const futureDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
      const res = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${freeUserToken}`)
        .send({
          caption: 'Free user scheduling with 3 platforms',
          scheduledAt: futureDate,
          platforms: [
            { platform: 'FACEBOOK', socialAccountId: freeAccounts.FACEBOOK },
            { platform: 'LINKEDIN', socialAccountId: freeAccounts.LINKEDIN },
            { platform: 'YOUTUBE', socialAccountId: freeAccounts.YOUTUBE }
          ]
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('PLAN_PLATFORM_LIMIT_EXCEEDED');
      expect(res.body.limit).toBe(2);
    });

    it('Rejects direct saveDraft request exceeding 2 platforms with HTTP 403', async () => {
      const res = await request(app)
        .post('/api/posts/draft')
        .set('Authorization', `Bearer ${freeUserToken}`)
        .send({
          caption: 'Draft exceeding free limit',
          platforms: [
            { platform: 'FACEBOOK', socialAccountId: freeAccounts.FACEBOOK },
            { platform: 'LINKEDIN', socialAccountId: freeAccounts.LINKEDIN },
            { platform: 'YOUTUBE', socialAccountId: freeAccounts.YOUTUBE }
          ]
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('PLAN_PLATFORM_LIMIT_EXCEEDED');
      expect(res.body.limit).toBe(2);
    });

    it('Rejects publishNow on draft with 3 platforms with HTTP 403', async () => {
      // Manually create a draft with 3 platforms in DB to simulate bypass attempt
      const bypassedDraft = await prisma.post.create({
        data: {
          userId: freeUserId,
          caption: 'Bypassed draft with 3 platforms',
          status: 'DRAFT',
          platforms: {
            create: [
              { platform: 'FACEBOOK', socialAccountId: freeAccounts.FACEBOOK },
              { platform: 'LINKEDIN', socialAccountId: freeAccounts.LINKEDIN },
              { platform: 'YOUTUBE', socialAccountId: freeAccounts.YOUTUBE }
            ]
          }
        }
      });

      const res = await request(app)
        .post(`/api/posts/${bypassedDraft.id}/publish`)
        .set('Authorization', `Bearer ${freeUserToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('PLAN_PLATFORM_LIMIT_EXCEEDED');
      expect(res.body.limit).toBe(2);
    });
  });

  describe('4. Creator Plan Limits (Max 4 platforms per post)', () => {
    it('Accepts publishing with 4 target platforms on Creator plan', async () => {
      const res = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${creatorUserToken}`)
        .send({
          caption: 'Creator valid 4-platform broadcast',
          platforms: [
            { platform: 'FACEBOOK', socialAccountId: creatorAccounts.FACEBOOK },
            { platform: 'LINKEDIN', socialAccountId: creatorAccounts.LINKEDIN },
            { platform: 'YOUTUBE', socialAccountId: creatorAccounts.YOUTUBE },
            { platform: 'INSTAGRAM', socialAccountId: creatorAccounts.INSTAGRAM }
          ]
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.platforms.length).toBe(4);
    });

    it('Rejects publishing with 5 target platforms on Creator plan with HTTP 403', async () => {
      const res = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${creatorUserToken}`)
        .send({
          caption: 'Creator exceeding limit with 5 platforms',
          platforms: [
            { platform: 'FACEBOOK', socialAccountId: creatorAccounts.FACEBOOK },
            { platform: 'LINKEDIN', socialAccountId: creatorAccounts.LINKEDIN },
            { platform: 'YOUTUBE', socialAccountId: creatorAccounts.YOUTUBE },
            { platform: 'INSTAGRAM', socialAccountId: creatorAccounts.INSTAGRAM },
            { platform: 'THREADS', socialAccountId: creatorAccounts.THREADS }
          ]
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('PLAN_PLATFORM_LIMIT_EXCEEDED');
      expect(res.body.limit).toBe(4);
      expect(res.body.message).toContain('allows selecting a maximum of 4 target platforms');
    });

    it('Accepts scheduling post with 4 target platforms on Creator plan', async () => {
      const futureDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
      const res = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${creatorUserToken}`)
        .send({
          caption: 'Creator scheduled 4-platform post',
          scheduledAt: futureDate,
          platforms: [
            { platform: 'FACEBOOK', socialAccountId: creatorAccounts.FACEBOOK },
            { platform: 'LINKEDIN', socialAccountId: creatorAccounts.LINKEDIN },
            { platform: 'YOUTUBE', socialAccountId: creatorAccounts.YOUTUBE },
            { platform: 'INSTAGRAM', socialAccountId: creatorAccounts.INSTAGRAM }
          ]
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('SCHEDULED');
      expect(res.body.data.platforms.length).toBe(4);
    });

    it('Rejects scheduling post with 5 target platforms on Creator plan with HTTP 403', async () => {
      const futureDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
      const res = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${creatorUserToken}`)
        .send({
          caption: 'Creator scheduled 5 platforms',
          scheduledAt: futureDate,
          platforms: [
            { platform: 'FACEBOOK', socialAccountId: creatorAccounts.FACEBOOK },
            { platform: 'LINKEDIN', socialAccountId: creatorAccounts.LINKEDIN },
            { platform: 'YOUTUBE', socialAccountId: creatorAccounts.YOUTUBE },
            { platform: 'INSTAGRAM', socialAccountId: creatorAccounts.INSTAGRAM },
            { platform: 'THREADS', socialAccountId: creatorAccounts.THREADS }
          ]
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('PLAN_PLATFORM_LIMIT_EXCEEDED');
      expect(res.body.limit).toBe(4);
    });
  });

  describe('5. Professional Plan Limits (Max 6 platforms per post)', () => {
    it('Accepts publishing with all 6 target platforms on Professional plan', async () => {
      const res = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${proUserToken}`)
        .send({
          caption: 'Pro user 6-platform full broadcast',
          platforms: ALL_PLATFORMS.map(p => ({
            platform: p,
            socialAccountId: proAccounts[p]
          }))
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.platforms.length).toBe(6);
    });

    it('Accepts scheduling post with all 6 target platforms on Professional plan', async () => {
      const futureDate = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString();
      const res = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${proUserToken}`)
        .send({
          caption: 'Pro user scheduled 6 platforms',
          scheduledAt: futureDate,
          platforms: ALL_PLATFORMS.map(p => ({
            platform: p,
            socialAccountId: proAccounts[p]
          }))
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('SCHEDULED');
      expect(res.body.data.platforms.length).toBe(6);
    });

    it('Rejects request exceeding 6 platforms with 7 entries', async () => {
      const res = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${proUserToken}`)
        .send({
          caption: 'Pro user sending 7 platforms',
          platforms: [
            ...ALL_PLATFORMS.map(p => ({ platform: p, socialAccountId: proAccounts[p] })),
            { platform: 'FACEBOOK', socialAccountId: proAccounts.FACEBOOK }
          ]
        });

      // Duplicate platform rejected with 400 or limit exceeded 403
      expect([400, 403]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });
  });

  describe('6. Anti-Bypass Security: Duplicate Platform Entries & Client Spoofing', () => {
    it('Rejects duplicate platform entries with HTTP 400', async () => {
      const res = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${freeUserToken}`)
        .send({
          caption: 'Bypass test: Duplicate platform entries',
          platforms: [
            { platform: 'FACEBOOK', socialAccountId: freeAccounts.FACEBOOK },
            { platform: 'FACEBOOK', socialAccountId: freeAccounts.FACEBOOK }
          ]
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('DUPLICATE_PLATFORM_SELECTION');
    });

    it('Never trusts client-supplied plan name in request body', async () => {
      // Free user attempts to pass plan: "PROFESSIONAL" or limit: 6 in request body
      const res = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${freeUserToken}`)
        .send({
          caption: 'Malicious spoof attempt',
          plan: 'PROFESSIONAL',
          limit: 6,
          platforms: [
            { platform: 'FACEBOOK', socialAccountId: freeAccounts.FACEBOOK },
            { platform: 'LINKEDIN', socialAccountId: freeAccounts.LINKEDIN },
            { platform: 'YOUTUBE', socialAccountId: freeAccounts.YOUTUBE }
          ]
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('PLAN_PLATFORM_LIMIT_EXCEEDED');
      expect(res.body.limit).toBe(2);
    });
  });

  describe('7. Subscription Details & Public Plans Return Platform Limit Metadata', () => {
    it('GET /api/subscriptions/me returns maxTargetPlatformsPerPost for authenticated user', async () => {
      const res = await request(app)
        .get('/api/subscriptions/me')
        .set('Authorization', `Bearer ${freeUserToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.plan.maxTargetPlatformsPerPost).toBe(2);
    });

    it('GET /api/plans returns maxTargetPlatformsPerPost for each plan tier', async () => {
      const res = await request(app).get('/api/plans');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const plansList = res.body.data.plans || res.body.data;
      const freePlan = plansList.find(p => p.planType === 'FREE');
      const creatorPlan = plansList.find(p => p.planType === 'CREATOR');
      const proPlan = plansList.find(p => p.planType === 'PROFESSIONAL');

      expect(freePlan.maxTargetPlatformsPerPost).toBe(2);
      expect(creatorPlan.maxTargetPlatformsPerPost).toBe(4);
      expect(proPlan.maxTargetPlatformsPerPost).toBe(6);
    });
  });
});
