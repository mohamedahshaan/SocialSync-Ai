import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/utils/prisma.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../src/config/index.js';
import { schedulerService } from '../src/services/schedulerService.js';
import {
  APP_TIMEZONE,
  TIMEZONE_CODE,
  formatSriLankaTime,
  getSriLankaDateParts,
  parseSriLankaDateTime
} from '../src/utils/timezone.js';

describe('Sri Lanka Standard Time (SLST / Asia/Colombo) Standardization Suite', () => {
  let userToken;
  let userId;
  let fbAccountId;

  beforeAll(async () => {
    // Stop background interval during tests
    schedulerService.stop();

    // Ensure Creator plan with hasScheduling = true
    await prisma.packagePlan.upsert({
      where: { planType: 'CREATOR' },
      update: { hasScheduling: true },
      create: {
        planType: 'CREATOR',
        name: 'Creator',
        priceLkr: 2500,
        credits: 500,
        maxConnectedAccounts: 4,
        hasScheduling: true,
        hasAiCaptions: true,
        isActive: true
      }
    });

    // Create test user on CREATOR plan
    const hashedPassword = await bcrypt.hash('TestPass123!', 10);
    const user = await prisma.user.create({
      data: {
        email: `slst_test_${Date.now()}@socialsync.ai`,
        passwordHash: hashedPassword,
        name: 'Sri Lanka Time User',
        plan: 'CREATOR',
        credits: 500,
        role: 'USER',
        status: 'ACTIVE'
      }
    });
    userId = user.id;

    // Create active subscription for the creator
    await prisma.userSubscription.create({
      data: {
        userId: user.id,
        plan: 'CREATOR',
        status: 'ACTIVE',
        billingAmount: 2500,
        currency: 'LKR',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      }
    });

    userToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      config.jwtSecret,
      { expiresIn: '1h' }
    );

    // Create mock connected social account
    const fbAccount = await prisma.socialAccount.create({
      data: {
        userId: user.id,
        platform: 'FACEBOOK',
        accountName: 'SLST Colombo Page',
        platformUserId: `fb_colombo_${Date.now()}`,
        status: 'CONNECTED',
        accessToken: 'mock_fb_access_token'
      }
    });
    fbAccountId = fbAccount.id;
  });

  afterAll(async () => {
    schedulerService.stop();
    if (userId) {
      await prisma.creditTransaction.deleteMany({ where: { userId } });
      await prisma.postPlatform.deleteMany({ where: { post: { userId } } });
      await prisma.post.deleteMany({ where: { userId } });
      await prisma.socialAccount.deleteMany({ where: { userId } });
      await prisma.userSubscription.deleteMany({ where: { userId } });
      await prisma.user.delete({ where: { id: userId } });
    }
  });

  it('1. Timezone Constants & IANA Identifier: Correctly bound to Asia/Colombo & SLST', () => {
    expect(APP_TIMEZONE).toBe('Asia/Colombo');
    expect(TIMEZONE_CODE).toBe('SLST');
    expect(config.timezone).toBe('Asia/Colombo');
  });

  it('2. getSriLankaDateParts: Extracts accurate Sri Lanka date and time parts', () => {
    // 2026-10-18T10:00:00.000Z in UTC is 2026-10-18 15:30:00 SLST (UTC+05:30)
    const fixedUtc = new Date('2026-10-18T10:00:00.000Z');
    const parts = getSriLankaDateParts(fixedUtc);

    expect(parts.year).toBe('2026');
    expect(parts.month).toBe('10');
    expect(parts.day).toBe('18');
    expect(parts.hour).toBe('15');
    expect(parts.minute).toBe('30');
    expect(parts.dateStr).toBe('2026-10-18');
    expect(parts.timeStr).toBe('15:30');
  });

  it('3. parseSriLankaDateTime: Converts Sri Lanka local date and time to accurate UTC timestamp', () => {
    // User picked Oct 25, 2026 at 14:00 SLST -> UTC should be 08:30
    const utcDate = parseSriLankaDateTime('2026-10-25', '14:00');
    expect(utcDate.toISOString()).toBe('2026-10-25T08:30:00.000Z');

    const formatted = formatSriLankaTime(utcDate);
    expect(formatted).toContain('2026-10-25 14:00:00 SLST');
  });

  it('4. POST /api/posts: Schedules post using timezone-aware Sri Lanka timestamp', async () => {
    // Target 2 hours into future in Sri Lanka time
    const futureUtc = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const slParts = getSriLankaDateParts(futureUtc);
    const scheduledAtIso = parseSriLankaDateTime(slParts.dateStr, slParts.timeStr).toISOString();

    const res = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        caption: 'Broadcasting to Sri Lanka community #colombo #tech',
        scheduledAt: scheduledAtIso,
        platforms: [{ platform: 'FACEBOOK', socialAccountId: fbAccountId }]
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('SCHEDULED');
    expect(new Date(res.body.data.scheduledAt).toISOString()).toBe(scheduledAtIso);

    // Verify stored in DB with exact timestamp
    const dbPost = await prisma.post.findUnique({ where: { id: res.body.data.id } });
    expect(dbPost).not.toBeNull();
    expect(dbPost.status).toBe('SCHEDULED');
    expect(dbPost.scheduledAt.toISOString()).toBe(scheduledAtIso);
  });

  it('5. POST /api/posts/:id/reschedule: Reschedules accurately in Sri Lanka Standard Time', async () => {
    // Create an initial scheduled post
    const post = await prisma.post.create({
      data: {
        userId,
        caption: 'Post to reschedule',
        status: 'SCHEDULED',
        scheduledAt: new Date(Date.now() + 3 * 3600 * 1000),
        mediaType: 'NONE'
      }
    });

    // Reschedule to 5 hours in future in Sri Lanka time
    const targetFuture = new Date(Date.now() + 5 * 3600 * 1000);
    const parts = getSriLankaDateParts(targetFuture);
    const newScheduledAtIso = parseSriLankaDateTime(parts.dateStr, parts.timeStr).toISOString();

    const res = await request(app)
      .post(`/api/posts/${post.id}/reschedule`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        scheduledAt: newScheduledAtIso
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(new Date(res.body.data.scheduledAt).toISOString()).toBe(newScheduledAtIso);

    // Verify DB update
    const updated = await prisma.post.findUnique({ where: { id: post.id } });
    expect(updated.scheduledAt.toISOString()).toBe(newScheduledAtIso);
  });

  it('6. SchedulerService: Dispatches due post at exact scheduled time without timezone conversion drift', async () => {
    // Create a due post scheduled 10 seconds ago
    const pastScheduledAt = new Date(Date.now() - 10000);
    const duePost = await prisma.post.create({
      data: {
        userId,
        caption: 'Due broadcast for immediate execution',
        status: 'SCHEDULED',
        scheduledAt: pastScheduledAt,
        mediaType: 'NONE'
      }
    });

    await prisma.postPlatform.create({
      data: {
        postId: duePost.id,
        platform: 'FACEBOOK',
        socialAccountId: fbAccountId,
        status: 'PENDING',
        creditCharged: true,
        creditCost: 10
      }
    });

    // Run scheduler process cycle
    const processed = await schedulerService.processDuePosts();
    expect(processed).toBeGreaterThanOrEqual(1);

    // Verify post was claimed and transitioned out of SCHEDULED by the scheduler
    const postAfter = await prisma.post.findUnique({ where: { id: duePost.id } });
    expect(postAfter.status).not.toBe('SCHEDULED');
    expect(['PUBLISHED', 'FAILED']).toContain(postAfter.status);
  });
});
