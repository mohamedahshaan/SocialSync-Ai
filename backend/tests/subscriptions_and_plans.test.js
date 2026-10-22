import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/utils/prisma.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../src/config/index.js';

describe('Dynamic Plans, Admin Updates & Automated 1-Month Free Trial Billing', () => {
  let adminToken;
  let adminUser;

  beforeAll(async () => {
    // Ensure test admin exists
    const passwordHash = await bcrypt.hash('AdminSecure2026!', 10);
    adminUser = await prisma.user.upsert({
      where: { email: 'plan_admin_test@socialsync.ai' },
      update: { role: 'ADMIN', status: 'ACTIVE' },
      create: {
        name: 'Plan Admin Tester',
        email: 'plan_admin_test@socialsync.ai',
        passwordHash,
        role: 'ADMIN',
        status: 'ACTIVE',
        plan: 'PROFESSIONAL',
        credits: 1000
      }
    });

    adminToken = jwt.sign(
      { userId: adminUser.id, email: adminUser.email, role: 'ADMIN', name: adminUser.name },
      config.jwtSecret,
      { expiresIn: '1h' }
    );

    // Reset Creator plan to clean state
    await prisma.packagePlan.upsert({
      where: { planType: 'CREATOR' },
      update: { priceLkr: 1000, credits: 500, hasFreeTrial: false, trialPeriodDays: 30 },
      create: {
        planType: 'CREATOR',
        name: 'Creator',
        priceLkr: 1000,
        credits: 500,
        maxConnectedAccounts: 4,
        hasScheduling: true,
        hasAiCaptions: false,
        hasHistory: true,
        hasFreeTrial: false,
        trialPeriodDays: 30
      }
    });
  });

  it('1. GET /api/plans: Returns seeded dynamic package plans', async () => {
    const res = await request(app).get('/api/plans');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.plans)).toBe(true);
    expect(res.body.data.plans.length).toBeGreaterThanOrEqual(3);

    const creator = res.body.data.plans.find(p => p.planType === 'CREATOR');
    expect(creator).toBeDefined();
    expect(creator.priceLkr).toBe(1000);
    expect(creator.credits).toBe(500);
  });

  it('2. PUT /api/admin/plans/CREATOR: Admin updates price, credits, and toggles 1-Month Free Trial option', async () => {
    const res = await request(app)
      .put('/api/admin/plans/CREATOR')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        priceLkr: 1200,
        credits: 300,
        hasFreeTrial: true,
        trialPeriodDays: 30,
        badge: 'Special 1-Mo Free Offer'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.plan.priceLkr).toBe(1200);
    expect(res.body.data.plan.credits).toBe(300);
    expect(res.body.data.plan.hasFreeTrial).toBe(true);
    expect(res.body.data.plan.trialPeriodDays).toBe(30);

    // Verify change is persisted in public /api/plans
    const publicRes = await request(app).get('/api/plans');
    const updatedCreator = publicRes.body.data.plans.find(p => p.planType === 'CREATOR');
    expect(updatedCreator.priceLkr).toBe(1200);
    expect(updatedCreator.hasFreeTrial).toBe(true);
  });

  it('3. User registers with Creator plan (1-Month Free Option) and card details', async () => {
    const testEmail = `trial_user_${Date.now()}@example.com`;
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Trial User',
        email: testEmail,
        password: 'Password123!',
        confirmPassword: 'Password123!',
        plan: 'CREATOR',
        cardData: {
          cardNumber: '4242424242424242',
          cardholderName: 'Trial User Cardholder',
          expMonth: '10',
          expYear: '2028'
        }
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.plan).toBe('CREATOR');
    expect(res.body.data.subscription).toBeDefined();
    expect(res.body.data.subscription.status).toBe('TRIALING');
    expect(res.body.data.subscription.isFreeTrial).toBe(true);
    expect(res.body.data.subscription.cardLast4).toBe('4242');
    expect(res.body.data.subscription.cardBrand).toBe('Visa');

    // User gets immediate credits for their trial period
    expect(res.body.data.user.credits).toBeGreaterThanOrEqual(300);
  });

  it('4. POST /api/admin/subscriptions/process-billing: Automatically detects expired trial and charges user card', async () => {
    // Create a trial user whose trial expired yesterday
    const expiredUserEmail = `expired_trial_${Date.now()}@example.com`;
    const passwordHash = await bcrypt.hash('Password123!', 10);
    const expiredUser = await prisma.user.create({
      data: {
        name: 'Expired Trial User',
        email: expiredUserEmail,
        passwordHash,
        plan: 'CREATOR',
        credits: 50
      }
    });

    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    await prisma.userSubscription.create({
      data: {
        userId: expiredUser.id,
        plan: 'CREATOR',
        status: 'TRIALING',
        isFreeTrial: true,
        trialStartsAt: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000),
        trialEndsAt: yesterday,
        currentPeriodStart: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000),
        currentPeriodEnd: yesterday,
        nextBillingDate: yesterday, // Due for billing!
        billingAmount: 1200,
        currency: 'LKR',
        cardBrand: 'Mastercard',
        cardLast4: '8888',
        cardholderName: 'Expired Trial User',
        autoRenew: true
      }
    });

    // Admin triggers automated billing runner
    const res = await request(app)
      .post('/api/admin/subscriptions/process-billing')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.processedCount).toBeGreaterThanOrEqual(1);

    // Verify subscription status is now ACTIVE (trial ended & card charged)
    const updatedSub = await prisma.userSubscription.findUnique({
      where: { userId: expiredUser.id }
    });
    expect(updatedSub.status).toBe('ACTIVE');
    expect(updatedSub.isFreeTrial).toBe(false);

    // Verify verified Payment was automatically created
    const payment = await prisma.payment.findFirst({
      where: { userId: expiredUser.id, status: 'VERIFIED' }
    });
    expect(payment).toBeDefined();
    expect(payment.amount).toBe(1200);
    expect(payment.notes).toContain('8888');

    // Verify renewal credits were granted
    const updatedUser = await prisma.user.findUnique({
      where: { id: expiredUser.id }
    });
    expect(updatedUser.credits).toBeGreaterThan(50);
  });

  it('5. GET /api/admin/subscriptions: Admin can view all active and trialing subscriptions', async () => {
    const res = await request(app)
      .get('/api/admin/subscriptions')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.subscriptions)).toBe(true);
  });

  afterAll(async () => {
    // Reset Creator plan back to standard defaults to avoid polluting database
    await prisma.packagePlan.updateMany({
      where: { planType: 'CREATOR' },
      data: {
        badge: 'Most Popular',
        priceLkr: 1000,
        originalPriceLkr: 1000,
        credits: 250,
        hasFreeTrial: false,
        isFreePromotion: false
      }
    });
  });
});
