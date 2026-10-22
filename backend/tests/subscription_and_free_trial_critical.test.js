import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { app } from '../src/app.js';
import { prisma } from '../src/utils/prisma.js';
import { config } from '../src/config/index.js';
import { getPayHereSecret } from '../src/services/paymentGatewayService.js';

describe('SocialSync AI — Critical Subscription & Free-Trial Bug Fix Suite', () => {
  let superAdminUser;
  let superAdminToken;
  let regularCustomerUser;
  let regularCustomerToken;
  let testMerchantId;
  let testMerchantSecret;

  beforeAll(async () => {
    // 1. Super Admin Setup
    const passwordHash = await bcrypt.hash('AdminSecure2026!', 10);
    superAdminUser = await prisma.user.upsert({
      where: { email: 'superadmin_critical_suite@socialsync.ai' },
      update: { role: 'SUPER_ADMIN', status: 'ACTIVE' },
      create: {
        name: 'Super Admin Suite',
        email: 'superadmin_critical_suite@socialsync.ai',
        passwordHash,
        role: 'SUPER_ADMIN',
        status: 'ACTIVE',
        plan: 'PROFESSIONAL',
        credits: 2000
      }
    });

    superAdminToken = jwt.sign(
      {
        userId: superAdminUser.id,
        email: superAdminUser.email,
        role: 'SUPER_ADMIN',
        name: superAdminUser.name,
        tokenVersion: superAdminUser.tokenVersion
      },
      config.jwtSecret,
      { expiresIn: '1h' }
    );

    // 2. Regular Customer Setup
    const customerEmail = `customer_suite_${Date.now()}@example.com`;
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
      {
        userId: regularCustomerUser.id,
        email: regularCustomerUser.email,
        role: 'USER',
        name: regularCustomerUser.name,
        tokenVersion: regularCustomerUser.tokenVersion
      },
      config.jwtSecret,
      { expiresIn: '1h' }
    );

    // PayHere test secrets
    testMerchantId = process.env.PAYHERE_MERCHANT_ID || '1220000';
    testMerchantSecret = getPayHereSecret() || 'testMerchantSecret12345';
  });

  afterAll(async () => {
    // Cleanup created test records
    try {
      await prisma.user.deleteMany({
        where: {
          email: {
            in: [superAdminUser?.email, regularCustomerUser?.email]
          }
        }
      });
    } catch (e) {}
  });

  // Scenario 1: Creator trial enabled and eligible
  it('1. Creator trial enabled and eligible: Super Admin enables offer, eligible customer activates trial with informed consent', async () => {
    // Enable Creator promotion
    const enableRes = await request(app)
      .post('/api/admin/plans/CREATOR/promotion')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ enabled: true, promotionNote: '1 Month Free Trial' });

    expect(enableRes.status).toBe(200);
    expect(enableRes.body.success).toBe(true);
    expect(enableRes.body.data.plan.isFreePromotion).toBe(true);

    // Regular customer activates the trial with informed consent
    const activateRes = await request(app)
      .post('/api/subscriptions/activate-trial')
      .set('Authorization', `Bearer ${regularCustomerToken}`)
      .send({ planType: 'CREATOR', consentAgreed: true });

    expect(activateRes.status).toBe(200);
    expect(activateRes.body.success).toBe(true);
    expect(activateRes.body.data.planType).toBe('CREATOR');
    expect(activateRes.body.data.trialStartsAt).toBeDefined();
    expect(activateRes.body.data.trialEndsAt).toBeDefined();
    expect(activateRes.body.data.renewalPrice).toBe(1000);

    // Verify DB state: user is CREATOR, credits updated to 500, subscription status is TRIALING
    const updatedUser = await prisma.user.findUnique({
      where: { id: regularCustomerUser.id },
      include: { subscription: true }
    });
    expect(updatedUser.plan).toBe('CREATOR');
    expect(updatedUser.credits).toBe(500);
    expect(updatedUser.subscription.status).toBe('TRIALING');
    expect(updatedUser.subscription.isFreeTrial).toBe(true);
  });

  // Scenario 2: Creator trial disabled by admin
  it('2. Creator trial disabled by admin: public /api/plans removes free trial badge and displays standard LKR 1,000 price', async () => {
    const disableRes = await request(app)
      .post('/api/admin/plans/CREATOR/promotion')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ enabled: false });

    expect(disableRes.status).toBe(200);
    expect(disableRes.body.data.plan.isFreePromotion).toBe(false);

    // Verify public /api/plans returns normal price without free promotion
    const plansRes = await request(app).get('/api/plans');
    expect(plansRes.status).toBe(200);
    const creatorPlan = plansRes.body.data.plans.find(p => p.planType === 'CREATOR');
    expect(creatorPlan.isPromoActive).toBe(false);
    expect(creatorPlan.isFreePromotion).toBe(false);
    expect(creatorPlan.hasFreeTrial).toBe(false);
    expect(creatorPlan.priceLkr).toBe(1000);
    expect(creatorPlan.promotionalPriceLkr).toBe(1000);
  });

  // Scenario 3: Direct API request attempting to activate a disabled trial
  it('3. Direct API request attempting to activate a disabled trial: rejected with HTTP 400', async () => {
    // Fresh user attempting to activate Creator trial while offer is disabled
    const freshUser = await prisma.user.create({
      data: {
        name: 'Trial Attempter',
        email: `attempter_${Date.now()}@example.com`,
        passwordHash: 'dummy_hash',
        role: 'USER',
        status: 'ACTIVE',
        plan: 'FREE',
        credits: 200
      }
    });

    const token = jwt.sign(
      { userId: freshUser.id, email: freshUser.email, role: 'USER', name: freshUser.name },
      config.jwtSecret,
      { expiresIn: '1h' }
    );

    const res = await request(app)
      .post('/api/subscriptions/activate-trial')
      .set('Authorization', `Bearer ${token}`)
      .send({ planType: 'CREATOR', consentAgreed: true });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(['PROMOTION_NOT_ACTIVE', 'PROMOTION_DISABLED']).toContain(res.body.error);

    // Verify user remains on FREE plan
    const checkUser = await prisma.user.findUnique({ where: { id: freshUser.id } });
    expect(checkUser.plan).toBe('FREE');
    expect(checkUser.credits).toBe(200);

    await prisma.user.delete({ where: { id: freshUser.id } });
  });

  // Scenario 4: Paid-plan activation without verified payment
  it('4. Paid-plan activation without verified payment: directly calling /change-plan or /plans/subscribe is blocked with HTTP 402', async () => {
    const freshUser = await prisma.user.create({
      data: {
        name: 'Bypass Attempter',
        email: `bypass_${Date.now()}@example.com`,
        passwordHash: 'dummy_hash',
        role: 'USER',
        status: 'ACTIVE',
        plan: 'FREE',
        credits: 200
      }
    });

    const token = jwt.sign(
      { userId: freshUser.id, email: freshUser.email, role: 'USER', name: freshUser.name },
      config.jwtSecret,
      { expiresIn: '1h' }
    );

    // Attempt 1: POST /api/subscriptions/change-plan with card data directly
    const changeRes = await request(app)
      .post('/api/subscriptions/change-plan')
      .set('Authorization', `Bearer ${token}`)
      .send({
        targetPlan: 'CREATOR',
        timing: 'IMMEDIATE',
        cardData: { cardNumber: '4242424242424242', expMonth: '12', expYear: '2028' }
      });

    expect(changeRes.status).toBe(402);
    expect(changeRes.body.code).toBe('PAYMENT_REQUIRED');

    // Attempt 2: POST /api/plans/subscribe with plan: CREATOR directly
    const subscribeRes = await request(app)
      .post('/api/plans/subscribe')
      .set('Authorization', `Bearer ${token}`)
      .send({ plan: 'CREATOR' });

    expect(subscribeRes.status).toBe(402);
    expect(subscribeRes.body.code).toBe('PAYMENT_REQUIRED');

    // Verify user plan is STILL FREE
    const userCheck = await prisma.user.findUnique({ where: { id: freshUser.id } });
    expect(userCheck.plan).toBe('FREE');

    await prisma.user.delete({ where: { id: freshUser.id } });
  });

  // Scenario 5: Invalid or forged payment success callback
  it('5. Invalid or forged payment success callback: rejected with HTTP 400 and does NOT upgrade plan', async () => {
    const orderId = `fake_order_${Date.now()}`;
    const payerUser = await prisma.user.create({
      data: {
        name: 'Payer Victim',
        email: `payer_${Date.now()}@example.com`,
        passwordHash: 'dummy_hash',
        role: 'USER',
        status: 'ACTIVE',
        plan: 'FREE',
        credits: 200
      }
    });

    // Create a pending payment record
    await prisma.payment.create({
      data: {
        userId: payerUser.id,
        amount: 1000,
        currency: 'LKR',
        plan: 'CREATOR',
        status: 'PENDING',
        reference: orderId,
        idempotencyKey: `idemp_${orderId}`
      }
    });

    // Send webhook with forged md5sig
    const forgedRes = await request(app)
      .post('/api/webhooks/payment')
      .send({
        merchant_id: testMerchantId,
        order_id: orderId,
        payhere_amount: '1000.00',
        payhere_currency: 'LKR',
        status_code: '2',
        md5sig: 'FORGED_INVALID_HASH_99999'
      });

    expect(forgedRes.status).toBe(400);

    // Verify payment remains PENDING and user remains FREE
    const payment = await prisma.payment.findUnique({ where: { reference: orderId } });
    expect(payment.status).toBe('PENDING');

    const checkUser = await prisma.user.findUnique({ where: { id: payerUser.id } });
    expect(checkUser.plan).toBe('FREE');

    await prisma.payment.delete({ where: { reference: orderId } });
    await prisma.user.delete({ where: { id: payerUser.id } });
  });

  // Scenario 6: Valid verified payment activation
  it('6. Valid verified payment activation: authentic PayHere MD5 signature upgrades plan and allocates credits', async () => {
    const orderId = `valid_order_${Date.now()}`;
    const validUser = await prisma.user.create({
      data: {
        name: 'Valid Subscriber',
        email: `valid_sub_${Date.now()}@example.com`,
        passwordHash: 'dummy_hash',
        role: 'USER',
        status: 'ACTIVE',
        plan: 'FREE',
        credits: 200
      }
    });

    await prisma.payment.create({
      data: {
        userId: validUser.id,
        amount: 1000,
        currency: 'LKR',
        plan: 'CREATOR',
        status: 'PENDING',
        reference: orderId,
        idempotencyKey: `idemp_${orderId}`
      }
    });

    // Calculate authentic PayHere MD5 signature
    const amountStr = '1000.00';
    const currencyStr = 'LKR';
    const statusCodeStr = '2';
    const hashedSecret = crypto.createHash('md5').update(testMerchantSecret).digest('hex').toUpperCase();
    const rawSignature = `${testMerchantId}${orderId}${amountStr}${currencyStr}${statusCodeStr}${hashedSecret}`;
    const authenticMd5sig = crypto.createHash('md5').update(rawSignature).digest('hex').toUpperCase();

    const webhookRes = await request(app)
      .post('/api/webhooks/payment')
      .send({
        merchant_id: testMerchantId,
        order_id: orderId,
        payment_id: `payhere_tx_${Date.now()}`,
        payhere_amount: amountStr,
        payhere_currency: currencyStr,
        status_code: statusCodeStr,
        md5sig: authenticMd5sig
      });

    expect(webhookRes.status).toBe(200);
    expect(webhookRes.body.success).toBe(true);
    expect(webhookRes.body.processed).toBe(true);

    // Verify user plan upgraded to CREATOR and credits allocated to 500
    const upgradedUser = await prisma.user.findUnique({
      where: { id: validUser.id },
      include: { subscription: true }
    });
    expect(upgradedUser.plan).toBe('CREATOR');
    expect(upgradedUser.credits).toBe(500);
    expect(upgradedUser.subscription.status).toBe('ACTIVE');
  });

  // Scenario 7: Repeated trial activation and duplicate payment webhook
  it('7. Repeated trial activation and duplicate payment webhook: enforces single-redemption and payment idempotency', async () => {
    // 7A: Repeated trial activation blocked
    const trialRes = await request(app)
      .post('/api/subscriptions/activate-trial')
      .set('Authorization', `Bearer ${regularCustomerToken}`)
      .send({ planType: 'CREATOR', consentAgreed: true });

    expect(trialRes.status).toBe(400);
    expect(['ALREADY_REDEEMED', 'TRIAL_ALREADY_ACTIVE', 'ALREADY_SUBSCRIBED']).toContain(trialRes.body.error);

    // 7B: Duplicate payment webhook is idempotent
    const orderId = `idemp_order_${Date.now()}`;
    const payer = await prisma.user.create({
      data: {
        name: 'Idempotent User',
        email: `idemp_${Date.now()}@example.com`,
        passwordHash: 'dummy',
        role: 'USER',
        status: 'ACTIVE',
        plan: 'FREE',
        credits: 200
      }
    });

    await prisma.payment.create({
      data: {
        userId: payer.id,
        amount: 1000,
        currency: 'LKR',
        plan: 'CREATOR',
        status: 'PENDING',
        reference: orderId,
        idempotencyKey: `idemp_${orderId}`
      }
    });

    const amountStr = '1000.00';
    const currencyStr = 'LKR';
    const statusCodeStr = '2';
    const hashedSecret = crypto.createHash('md5').update(testMerchantSecret).digest('hex').toUpperCase();
    const rawSignature = `${testMerchantId}${orderId}${amountStr}${currencyStr}${statusCodeStr}${hashedSecret}`;
    const authenticMd5sig = crypto.createHash('md5').update(rawSignature).digest('hex').toUpperCase();

    // 1st webhook call
    const res1 = await request(app)
      .post('/api/webhooks/payment')
      .send({
        merchant_id: testMerchantId,
        order_id: orderId,
        payment_id: `tx_${Date.now()}`,
        payhere_amount: amountStr,
        payhere_currency: currencyStr,
        status_code: statusCodeStr,
        md5sig: authenticMd5sig
      });
    expect(res1.status).toBe(200);
    expect(res1.body.processed).toBe(true);

    // 2nd duplicate webhook call
    const res2 = await request(app)
      .post('/api/webhooks/payment')
      .send({
        merchant_id: testMerchantId,
        order_id: orderId,
        payment_id: `tx_${Date.now()}`,
        payhere_amount: amountStr,
        payhere_currency: currencyStr,
        status_code: statusCodeStr,
        md5sig: authenticMd5sig
      });
    expect(res2.status).toBe(200);
    expect(res2.body.processed).toBe(false);
    expect(res2.body.alreadyProcessed).toBe(true);

    // Verify credits were NOT duplicate added
    const userAfterDup = await prisma.user.findUnique({ where: { id: payer.id } });
    expect(userAfterDup.credits).toBe(500);

    // Cleanup
    await prisma.payment.deleteMany({ where: { userId: payer.id } });
    await prisma.userSubscription.deleteMany({ where: { userId: payer.id } });
    await prisma.creditTransaction.deleteMany({ where: { userId: payer.id } });
    await prisma.planHistory.deleteMany({ where: { userId: payer.id } });
    await prisma.subscriptionEvent.deleteMany({ where: { userId: payer.id } });
    await prisma.user.delete({ where: { id: payer.id } });
  });

  // Scenario 8: Newly registered account receiving the correct package/offer information
  it('8. Newly registered account receiving the correct package/offer information: starts on FREE with 200 credits and clean subscription status', async () => {
    const newAccountEmail = `newuser_${Date.now()}@example.com`;
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        firstName: 'New',
        lastName: 'Account',
        email: newAccountEmail,
        password: 'Password123!',
        confirmPassword: 'Password123!'
      });

    expect(regRes.status).toBe(201);
    expect(regRes.body.success).toBe(true);
    expect(regRes.body.data.user.plan).toBe('FREE');
    expect(regRes.body.data.user.credits).toBe(200);

    const token = regRes.body.data.token;

    // Check GET /api/subscriptions/me for this new account
    const subMeRes = await request(app)
      .get('/api/subscriptions/me')
      .set('Authorization', `Bearer ${token}`);

    expect(subMeRes.status).toBe(200);
    expect(subMeRes.body.data.plan.type).toBe('FREE');
    expect(subMeRes.body.data.subscription.status).toBe('Free');
    expect(subMeRes.body.data.subscription.isFreeTrial).toBe(false);
    expect(subMeRes.body.data.subscription.trialEndsAt).toBeNull();
    expect(subMeRes.body.data.subscription.nextBillingDate).toBeNull();
    expect(subMeRes.body.data.subscription.billingAmount).toBe(0);

    // Cleanup
    await prisma.user.delete({ where: { email: newAccountEmail } });
  });

  // Scenario 9: Admin changes offer status and the Packages page reflects it
  it('9. Admin changes offer status and the Packages page reflects it: toggling promo updates public /api/plans instantaneously', async () => {
    // 1. Admin turns offer ON
    const onRes = await request(app)
      .post('/api/admin/plans/CREATOR/promotion')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ enabled: true, promotionNote: 'Limited Creator Offer' });
    expect(onRes.status).toBe(200);

    let publicPlans = await request(app).get('/api/plans');
    let creator = publicPlans.body.data.plans.find(p => p.planType === 'CREATOR');
    expect(creator.isPromoActive).toBe(true);
    expect(creator.isFreePromotion).toBe(true);
    expect(creator.promotionalPriceLkr).toBe(0);
    expect(creator.originalMonthlyPriceLkr).toBe(1000);

    // 2. Admin turns offer OFF
    const offRes = await request(app)
      .post('/api/admin/plans/CREATOR/promotion')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ enabled: false });
    expect(offRes.status).toBe(200);

    publicPlans = await request(app).get('/api/plans');
    creator = publicPlans.body.data.plans.find(p => p.planType === 'CREATOR');
    expect(creator.isPromoActive).toBe(false);
    expect(creator.isFreePromotion).toBe(false);
    expect(creator.hasFreeTrial).toBe(false);
    expect(creator.priceLkr).toBe(1000);
    expect(creator.promotionalPriceLkr).toBe(1000);
  });

  // Scenario 10: Existing Free plan remains functional
  it('10. Existing Free plan remains functional: selecting FREE plan is supported and cancels recurring charges', async () => {
    // Calling POST /api/plans/subscribe with plan: FREE is accepted
    const subFreeRes = await request(app)
      .post('/api/plans/subscribe')
      .set('Authorization', `Bearer ${regularCustomerToken}`)
      .send({ plan: 'FREE' });

    expect(subFreeRes.status).toBe(200);
    expect(subFreeRes.body.success).toBe(true);
    expect(subFreeRes.body.data.user.plan).toBe('FREE');

    // Customer on FREE can safely switch to FREE via change-plan
    const changeFreeRes = await request(app)
      .post('/api/subscriptions/change-plan')
      .set('Authorization', `Bearer ${regularCustomerToken}`)
      .send({ targetPlan: 'FREE' });

    // Since customer is already on FREE, it cleanly returns appropriate message or already on plan
    expect([200, 400]).toContain(changeFreeRes.status);
    if (changeFreeRes.status === 400) {
      expect(changeFreeRes.body.message).toContain('already on the FREE plan');
    }
  });
});
