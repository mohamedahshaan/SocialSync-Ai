import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/utils/prisma.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../src/config/index.js';
import { calculateOneCalendarMonthAhead } from '../src/utils/timezone.js';
import { processDueSubscriptions } from '../src/services/subscriptionService.js';

describe('Admin-Controlled 1-Month Free Trial & Subscription Lifecycle Suite', () => {
  let superAdminUser;
  let superAdminToken;
  let regularAdminUser;
  let regularAdminToken;
  let regularCustomerUser;
  let regularCustomerToken;

  beforeAll(async () => {
    const passwordHash = await bcrypt.hash('TestPass2026!', 10);

    // 1. Super Admin
    superAdminUser = await prisma.user.upsert({
      where: { email: 'super_admin_test_ft@socialsync.ai' },
      update: { role: 'SUPER_ADMIN', status: 'ACTIVE' },
      create: {
        name: 'Super Admin Test',
        email: 'super_admin_test_ft@socialsync.ai',
        passwordHash,
        role: 'SUPER_ADMIN',
        status: 'ACTIVE',
        plan: 'PROFESSIONAL',
        credits: 5000
      }
    });
    superAdminToken = jwt.sign(
      { userId: superAdminUser.id, email: superAdminUser.email, role: 'SUPER_ADMIN', name: superAdminUser.name, tokenVersion: superAdminUser.tokenVersion },
      config.jwtSecret,
      { expiresIn: '1h' }
    );

    // 2. Regular Admin (not Super Admin)
    regularAdminUser = await prisma.user.upsert({
      where: { email: 'regular_admin_test_ft@socialsync.ai' },
      update: { role: 'ADMIN', status: 'ACTIVE' },
      create: {
        name: 'Regular Admin Test',
        email: 'regular_admin_test_ft@socialsync.ai',
        passwordHash,
        role: 'ADMIN',
        status: 'ACTIVE',
        plan: 'CREATOR',
        credits: 1000
      }
    });
    regularAdminToken = jwt.sign(
      { userId: regularAdminUser.id, email: regularAdminUser.email, role: 'ADMIN', name: regularAdminUser.name, tokenVersion: regularAdminUser.tokenVersion },
      config.jwtSecret,
      { expiresIn: '1h' }
    );

    // 3. Regular Customer
    const customerEmail = `customer_ft_${Date.now()}@example.com`;
    regularCustomerUser = await prisma.user.create({
      data: {
        name: 'Regular Customer',
        email: customerEmail,
        passwordHash,
        role: 'USER',
        status: 'ACTIVE',
        plan: 'FREE',
        credits: 200
      }
    });
    regularCustomerToken = jwt.sign(
      { userId: regularCustomerUser.id, email: regularCustomerUser.email, role: 'USER', name: regularCustomerUser.name, tokenVersion: regularCustomerUser.tokenVersion },
      config.jwtSecret,
      { expiresIn: '1h' }
    );

    // Ensure Creator & Professional PackagePlans exist with authentic base prices
    await prisma.packagePlan.upsert({
      where: { planType: 'CREATOR' },
      update: {
        priceLkr: 1000,
        originalPriceLkr: 1000,
        credits: 500,
        isFreePromotion: false,
        promoEnabled: false
      },
      create: {
        planType: 'CREATOR',
        name: 'Creator',
        priceLkr: 1000,
        originalPriceLkr: 1000,
        credits: 500,
        maxConnectedAccounts: 4,
        hasScheduling: true,
        hasAiCaptions: false,
        hasHistory: true,
        hasFreeTrial: false,
        isFreePromotion: false,
        promoEnabled: false,
        trialPeriodDays: 30
      }
    });

    await prisma.packagePlan.upsert({
      where: { planType: 'PROFESSIONAL' },
      update: {
        priceLkr: 2500,
        originalPriceLkr: 2500,
        credits: 1500,
        isFreePromotion: false,
        promoEnabled: false
      },
      create: {
        planType: 'PROFESSIONAL',
        name: 'Professional',
        priceLkr: 2500,
        originalPriceLkr: 2500,
        credits: 1500,
        maxConnectedAccounts: 6,
        hasScheduling: true,
        hasAiCaptions: true,
        hasHistory: true,
        hasFreeTrial: false,
        isFreePromotion: false,
        promoEnabled: false,
        trialPeriodDays: 30
      }
    });
  });

  afterAll(async () => {
    // Cleanup created test records
    await prisma.promotionRedemption.deleteMany({
      where: { userId: regularCustomerUser.id }
    });
    await prisma.userSubscription.deleteMany({
      where: { userId: regularCustomerUser.id }
    });
    await prisma.payment.deleteMany({
      where: { userId: regularCustomerUser.id }
    });
    await prisma.creditTransaction.deleteMany({
      where: { userId: regularCustomerUser.id }
    });
    await prisma.user.deleteMany({
      where: { id: regularCustomerUser.id }
    });
  });

  it('1. Authorization: Only SUPER_ADMIN can toggle free trial promotions', async () => {
    // Regular customer should be 401/403
    const customerRes = await request(app)
      .post('/api/admin/plans/CREATOR/promotion')
      .set('Authorization', `Bearer ${regularCustomerToken}`)
      .send({ enabled: true });
    expect(customerRes.status).toBe(403);

    // Regular ADMIN (not Super Admin) should be 403
    const adminRes = await request(app)
      .post('/api/admin/plans/CREATOR/promotion')
      .set('Authorization', `Bearer ${regularAdminToken}`)
      .send({ enabled: true });
    expect(adminRes.status).toBe(403);
    expect(adminRes.body.error).toContain('FORBIDDEN');
  });

  it('2. Super Admin enables Creator promotion: updates DB without destroying base price (LKR 1,000)', async () => {
    const res = await request(app)
      .post('/api/admin/plans/CREATOR/promotion')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ enabled: true });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.plan.isFreePromotion).toBe(true);
    expect(res.body.data.plan.priceLkr).toBe(1000); // Preserved!
    expect(res.body.data.plan.promoPriceLkr).toBe(0);

    // Verify in PostgreSQL directly
    const creatorPlan = await prisma.packagePlan.findUnique({ where: { planType: 'CREATOR' } });
    expect(creatorPlan.priceLkr).toBe(1000);
    expect(creatorPlan.isFreePromotion).toBe(true);
    expect(creatorPlan.promoEnabled).toBe(true);
    expect(creatorPlan.hasFreeTrial).toBe(true);
  });

  it('3. Professional promotion operates independently', async () => {
    // Check Professional is still inactive
    let proPlan = await prisma.packagePlan.findUnique({ where: { planType: 'PROFESSIONAL' } });
    expect(proPlan.isFreePromotion).toBe(false);

    // Super Admin enables Professional promotion
    const res = await request(app)
      .post('/api/admin/plans/PROFESSIONAL/promotion')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ enabled: true });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.plan.isFreePromotion).toBe(true);
    expect(res.body.data.plan.priceLkr).toBe(2500); // Preserved!

    proPlan = await prisma.packagePlan.findUnique({ where: { planType: 'PROFESSIONAL' } });
    expect(proPlan.isFreePromotion).toBe(true);
    expect(proPlan.priceLkr).toBe(2500);

    // Disable Pro promotion again to test independent state
    const disableProRes = await request(app)
      .post('/api/admin/plans/PROFESSIONAL/promotion')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ enabled: false });
    expect(disableProRes.status).toBe(200);
    expect(disableProRes.body.data.plan.isFreePromotion).toBe(false);

    // Verify Creator remains active
    const creatorPlan = await prisma.packagePlan.findUnique({ where: { planType: 'CREATOR' } });
    expect(creatorPlan.isFreePromotion).toBe(true);
  });

  it('4. Public /api/plans returns promotion metadata to regular users and accurately identifies active promo', async () => {
    const res = await request(app).get('/api/plans');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const creator = res.body.data.plans.find(p => p.planType === 'CREATOR');
    expect(creator.isFreePromotion).toBe(true);
    expect(creator.priceLkr).toBe(1000);
    expect(creator.promoPriceLkr).toBe(0);

    const pro = res.body.data.plans.find(p => p.planType === 'PROFESSIONAL');
    expect(pro.isFreePromotion).toBe(false);
    expect(pro.priceLkr).toBe(2500);
  });

  it('5. Super Admin and Admin are excluded from customer promotion eligibility', async () => {
    // Super Admin checking eligibility
    const saRes = await request(app)
      .get('/api/plans/CREATOR/eligibility')
      .set('Authorization', `Bearer ${superAdminToken}`);
    expect(saRes.status).toBe(200);
    expect(saRes.body.data.eligible).toBe(false);
    expect(saRes.body.data.reason).toContain('Administrator accounts');

    // Super Admin attempting to activate trial gets rejected
    const saActivate = await request(app)
      .post('/api/subscriptions/activate-trial')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ planType: 'CREATOR', consentAgreed: true });
    expect(saActivate.status).toBe(403);
    expect(saActivate.body.error).toContain('ADMIN_NOT_ELIGIBLE');
  });

  it('6. Regular user cannot activate trial without explicit consentAgreed: true', async () => {
    const res = await request(app)
      .post('/api/subscriptions/activate-trial')
      .set('Authorization', `Bearer ${regularCustomerToken}`)
      .send({ planType: 'CREATOR', consentAgreed: false });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('CONSENT_REQUIRED');
  });

  it('7. Regular user activates 1-Month Free Trial: grants 500 credits, sets TRIALING status, calculates exact 1-month timestamp in SLST', async () => {
    const beforeActivation = new Date();
    const res = await request(app)
      .post('/api/subscriptions/activate-trial')
      .set('Authorization', `Bearer ${regularCustomerToken}`)
      .send({ planType: 'CREATOR', consentAgreed: true });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.plan).toBe('CREATOR');
    expect(res.body.data.user.credits).toBe(500);

    const subscription = res.body.data.subscription;
    expect(subscription.status).toBe('TRIALING');
    expect(subscription.isFreeTrial).toBe(true);
    expect(subscription.plan).toBe('CREATOR');

    // Verify trial dates
    const trialStart = new Date(subscription.trialStartsAt);
    const trialEnd = new Date(subscription.trialEndsAt);
    expect(trialStart.getTime()).toBeGreaterThanOrEqual(beforeActivation.getTime() - 5000);
    expect(trialEnd.getTime()).toBeGreaterThan(trialStart.getTime());

    // Expected exact 1 calendar month ahead via timezone utility
    const expectedMonthAhead = calculateOneCalendarMonthAhead(trialStart);
    expect(Math.abs(trialEnd.getTime() - expectedMonthAhead.getTime())).toBeLessThan(5000);

    // Verify DB user record
    const updatedUser = await prisma.user.findUnique({ where: { id: regularCustomerUser.id } });
    expect(updatedUser.plan).toBe('CREATOR');
    expect(updatedUser.credits).toBe(500);

    // Verify Redemption record created
    const redemption = await prisma.promotionRedemption.findFirst({
      where: { userId: regularCustomerUser.id, planType: 'CREATOR' }
    });
    expect(redemption).toBeDefined();
    expect(redemption.promoPriceLkr).toBe(0);
    expect(redemption.regularPriceLkr).toBe(1000);
    expect(redemption.periodEnd).toBeDefined();
  });

  it('8. Duplicate trial activation is strictly prevented', async () => {
    const res = await request(app)
      .post('/api/subscriptions/activate-trial')
      .set('Authorization', `Bearer ${regularCustomerToken}`)
      .send({ planType: 'CREATOR', consentAgreed: true });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('ALREADY_REDEEMED');
  });

  it('9. Inactive promotion cannot be activated', async () => {
    // Create another clean regular customer
    const anotherCustomer = await prisma.user.create({
      data: {
        name: 'Another Customer',
        email: `another_cust_${Date.now()}@example.com`,
        passwordHash: 'dummy',
        role: 'USER',
        status: 'ACTIVE',
        plan: 'FREE',
        credits: 200
      }
    });
    const anotherToken = jwt.sign(
      { userId: anotherCustomer.id, email: anotherCustomer.email, role: 'USER', name: anotherCustomer.name, tokenVersion: anotherCustomer.tokenVersion },
      config.jwtSecret,
      { expiresIn: '1h' }
    );

    // Attempting to activate PROFESSIONAL (which is currently disabled)
    const res = await request(app)
      .post('/api/subscriptions/activate-trial')
      .set('Authorization', `Bearer ${anotherToken}`)
      .send({ planType: 'PROFESSIONAL', consentAgreed: true });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('PROMOTION_NOT_ACTIVE');

    await prisma.user.delete({ where: { id: anotherCustomer.id } });
  });

  it('10. User cancels during free trial: preserves full Creator access and credits until trial end date', async () => {
    const cancelRes = await request(app)
      .post('/api/subscriptions/cancel')
      .set('Authorization', `Bearer ${regularCustomerToken}`)
      .send({ reason: 'Found another solution' });

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.success).toBe(true);

    // Check user record: still CREATOR and still 500 credits! NOT immediately downgraded!
    const user = await prisma.user.findUnique({ where: { id: regularCustomerUser.id } });
    expect(user.plan).toBe('CREATOR');
    expect(user.credits).toBe(500);

    // Check subscription: cancelAtPeriodEnd is true, status is CANCELLATION_SCHEDULED
    const sub = await prisma.userSubscription.findFirst({ where: { userId: regularCustomerUser.id } });
    expect(sub.cancelAtPeriodEnd).toBe(true);
    expect(sub.status).toBe('CANCELLATION_SCHEDULED');
    expect(new Date(sub.canceledAt)).toBeDefined();
  });

  it('11. Automated Expiry: At trial end, scheduled cancellation transitions account to Free with 200 credits entitlement', async () => {
    // Fast-forward trialEndsAt into the past to simulate trial period having completed
    const pastDate = new Date(Date.now() - 3600 * 1000 * 24); // 1 day ago
    await prisma.userSubscription.updateMany({
      where: { userId: regularCustomerUser.id },
      data: {
        trialEndsAt: pastDate,
        nextBillingDate: pastDate,
        status: 'CANCELLATION_SCHEDULED',
        cancelAtPeriodEnd: true
      }
    });

    // Run scheduled subscription processor
    const result = await processDueSubscriptions();
    expect(result.processed).toBeGreaterThanOrEqual(1);

    // Verify account transitioned to FREE and credits reset to standard Free allowance (200)
    const userAfterExpiry = await prisma.user.findUnique({ where: { id: regularCustomerUser.id } });
    expect(userAfterExpiry.plan).toBe('FREE');
    expect(userAfterExpiry.credits).toBe(200);

    // Verify subscription status is EXPIRED
    const subAfterExpiry = await prisma.userSubscription.findFirst({ where: { userId: regularCustomerUser.id } });
    expect(subAfterExpiry.status).toBe('EXPIRED');
  });
});
