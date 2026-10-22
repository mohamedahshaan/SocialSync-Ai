import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/utils/prisma.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../src/config/index.js';

describe('Production-Ready Subscription Management & Admin Plan Controls Suite', () => {
  let adminToken;
  let adminUser;
  let subscriberUser;
  let subscriberToken;

  beforeAll(async () => {
    // 1. Setup Admin user (SUPER_ADMIN required for plan/promotion management)
    const passwordHash = await bcrypt.hash('AdminSecure2026!', 10);
    adminUser = await prisma.user.upsert({
      where: { email: 'admin_billing_suite@socialsync.ai' },
      update: { role: 'SUPER_ADMIN', status: 'ACTIVE' },
      create: {
        name: 'Admin Billing Suite',
        email: 'admin_billing_suite@socialsync.ai',
        passwordHash,
        role: 'SUPER_ADMIN',
        status: 'ACTIVE',
        plan: 'PROFESSIONAL',
        credits: 1000
      }
    });

    adminToken = jwt.sign(
      { userId: adminUser.id, email: adminUser.email, role: 'SUPER_ADMIN', name: adminUser.name, tokenVersion: adminUser.tokenVersion },
      config.jwtSecret,
      { expiresIn: '1h' }
    );

    // 2. Setup Subscriber user
    const subscriberEmail = `subscriber_${Date.now()}@example.com`;
    subscriberUser = await prisma.user.create({
      data: {
        name: 'Jane Subscriber',
        email: subscriberEmail,
        passwordHash,
        role: 'USER',
        status: 'ACTIVE',
        plan: 'FREE',
        credits: 50
      }
    });

    subscriberToken = jwt.sign(
      { userId: subscriberUser.id, email: subscriberUser.email, role: 'USER', name: subscriberUser.name },
      config.jwtSecret,
      { expiresIn: '1h' }
    );
  });

  it('1. GET /api/admin/plans/CREATOR/stats: Retrieves affected user count before changes', async () => {
    const res = await request(app)
      .get('/api/admin/plans/CREATOR/stats')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(typeof res.body.data.totalAffected).toBe('number');
    expect(res.body.data.planType).toBe('CREATOR');
  });

  it('2. POST /api/admin/plans/CREATOR/promotion: Toggles promotional free pricing with strikethrough', async () => {
    // Activate promotion
    const res = await request(app)
      .post('/api/admin/plans/CREATOR/promotion')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        isFreePromotion: true,
        promotionNote: 'Currently Free — Limited Time Promo'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.plan.isFreePromotion).toBe(true);
    expect(res.body.data.plan.promoPriceLkr ?? res.body.data.plan.priceLkr).toBe(0);
    expect(res.body.data.plan.originalPriceLkr || res.body.data.plan.priceLkr).toBeGreaterThan(0);

    // Verify public /api/plans returns the strikethrough & promotion note
    const publicRes = await request(app).get('/api/plans');
    const creator = publicRes.body.data.plans.find(p => p.planType === 'CREATOR');
    expect(creator.isFreePromotion).toBe(true);
    expect(creator.promotionalPriceLkr ?? creator.promoPriceLkr ?? creator.priceLkr).toBe(0);
    expect(creator.originalPriceLkr || creator.priceLkr).toBeGreaterThan(0);
    expect(creator.promotionNote).toBe('Currently Free — Limited Time Promo');

    // Restore standard pricing
    const deactRes = await request(app)
      .post('/api/admin/plans/CREATOR/promotion')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isFreePromotion: false });

    expect(deactRes.status).toBe(200);
    expect(deactRes.body.data.plan.isFreePromotion).toBe(false);
    expect(deactRes.body.data.plan.priceLkr).toBeGreaterThan(0);
  });

  it('3. POST /api/admin/plans/CREATOR/migrate-free: Rejects without explicit confirmation string', async () => {
    const res = await request(app)
      .post('/api/admin/plans/CREATOR/migrate-free')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        migrationPolicy: 'END_OF_PERIOD',
        reason: 'Testing migration validation',
        confirmationText: 'WRONG_CONFIRM'
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('CONFIRMATION_REQUIRED');
  });

  it('4. User Upgrade: Free → Creator blocks direct change-plan (402) and requires verified payment', async () => {
    // Attempt direct upgrade without payment -> 402 PAYMENT_REQUIRED
    const directRes = await request(app)
      .post('/api/subscriptions/change-plan')
      .set('Authorization', `Bearer ${subscriberToken}`)
      .send({
        targetPlan: 'CREATOR',
        timing: 'IMMEDIATE',
        cardData: {
          cardNumber: '4242424242421234',
          cardholderName: 'Jane Subscriber',
          expMonth: '11',
          expYear: '2028'
        }
      });

    expect(directRes.status).toBe(402);
    expect(directRes.body.code).toBe('PAYMENT_REQUIRED');

    // Process upgrade via verified payment flow
    const orderId = `creator_order_${Date.now()}`;
    await prisma.payment.create({
      data: {
        userId: subscriberUser.id,
        amount: 1000,
        currency: 'LKR',
        plan: 'CREATOR',
        status: 'PENDING',
        reference: orderId,
        idempotencyKey: `idemp_${orderId}`
      }
    });

    const webhookRes = await request(app)
      .post('/api/webhooks/payment')
      .send({
        orderId,
        transactionId: `tx_${Date.now()}`,
        amount: 1000,
        currency: 'LKR',
        status: 'SUCCESS'
      });

    expect(webhookRes.status).toBe(200);
    expect(webhookRes.body.processed).toBe(true);

    // Verify user is now on CREATOR plan
    const updatedUser = await prisma.user.findUnique({
      where: { id: subscriberUser.id },
      include: { subscription: true }
    });
    expect(updatedUser.plan).toBe('CREATOR');
    expect(updatedUser.subscription.status).toBe('ACTIVE');
  });

  it('5. User Upgrade: Creator → Professional blocks direct change-plan (402) and upgrades via verified payment', async () => {
    // Direct upgrade blocked -> 402 PAYMENT_REQUIRED
    const directRes = await request(app)
      .post('/api/subscriptions/change-plan')
      .set('Authorization', `Bearer ${subscriberToken}`)
      .send({
        targetPlan: 'PROFESSIONAL',
        timing: 'IMMEDIATE'
      });

    expect(directRes.status).toBe(402);
    expect(directRes.body.code).toBe('PAYMENT_REQUIRED');

    // Process upgrade via verified payment flow
    const proOrderId = `pro_order_${Date.now()}`;
    await prisma.payment.create({
      data: {
        userId: subscriberUser.id,
        amount: 2500,
        currency: 'LKR',
        plan: 'PROFESSIONAL',
        status: 'PENDING',
        reference: proOrderId,
        idempotencyKey: `idemp_${proOrderId}`
      }
    });

    const webhookRes = await request(app)
      .post('/api/webhooks/payment')
      .send({
        orderId: proOrderId,
        transactionId: `tx_${Date.now()}`,
        amount: 2500,
        currency: 'LKR',
        status: 'SUCCESS'
      });

    expect(webhookRes.status).toBe(200);
    expect(webhookRes.body.processed).toBe(true);

    const proUser = await prisma.user.findUnique({
      where: { id: subscriberUser.id },
      include: { subscription: true }
    });
    expect(proUser.plan).toBe('PROFESSIONAL');
    expect(proUser.subscription.billingAmount).toBe(2500);
  });

  it('6. User Downgrade: Professional → Creator', async () => {
    const res = await request(app)
      .post('/api/subscriptions/change-plan')
      .set('Authorization', `Bearer ${subscriberToken}`)
      .send({
        targetPlan: 'CREATOR',
        timing: 'NEXT_BILLING_CYCLE'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.type).toBe('DOWNGRADE_SCHEDULED');
  });

  it('7. GET /api/subscriptions/me: Returns comprehensive details for "My Plan" dashboard', async () => {
    const res = await request(app)
      .get('/api/subscriptions/me')
      .set('Authorization', `Bearer ${subscriberToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.plan.type).toBe('PROFESSIONAL');
    expect(res.body.data.subscription.scheduledPlan).toBe('CREATOR');
    expect(res.body.data.subscription.paymentMethod.last4).toBeDefined();
    expect(Array.isArray(res.body.data.billingHistory)).toBe(true);
    expect(res.body.data.billingHistory.length).toBeGreaterThanOrEqual(1);
  });

  it('8. Cancel Subscription: Keeps access until current period ends and schedules cancellation', async () => {
    const res = await request(app)
      .post('/api/subscriptions/cancel')
      .set('Authorization', `Bearer ${subscriberToken}`)
      .send({ reason: 'Temporarily pausing content production' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.subscription.status).toBe('CANCELLATION_SCHEDULED');
    expect(res.body.data.subscription.autoRenew).toBe(false);
    expect(res.body.data.subscription.cancelAtPeriodEnd).toBe(true);

    // Verify GET /me reflects "Cancellation Scheduled"
    const meRes = await request(app)
      .get('/api/subscriptions/me')
      .set('Authorization', `Bearer ${subscriberToken}`);

    expect(meRes.body.data.subscription.status).toBe('Cancellation Scheduled');
    expect(meRes.body.data.subscription.cancellationEffectiveDate).toBeDefined();
  });

  it('9. POST /api/webhooks/payment: Idempotent webhook verification and duplicate prevention', async () => {
    const testOrderId = `test_order_${Date.now()}`;

    // Create a pending payment
    await prisma.payment.create({
      data: {
        userId: subscriberUser.id,
        amount: 1000,
        currency: 'LKR',
        plan: 'CREATOR',
        status: 'PENDING',
        reference: testOrderId,
        idempotencyKey: `idemp_${testOrderId}`
      }
    });

    // 1st webhook call: succeeds and processes
    const res1 = await request(app)
      .post('/api/webhooks/payment')
      .send({
        orderId: testOrderId,
        transactionId: `tx_${Date.now()}`,
        amount: 1000,
        currency: 'LKR',
        status: 'SUCCESS'
      });

    expect(res1.status).toBe(200);
    expect(res1.body.processed).toBe(true);

    // 2nd duplicate webhook call: detected as already processed (idempotent duplicate prevention)
    const res2 = await request(app)
      .post('/api/webhooks/payment')
      .send({
        orderId: testOrderId,
        transactionId: `tx_${Date.now()}`,
        amount: 1000,
        currency: 'LKR',
        status: 'SUCCESS'
      });

    expect(res2.status).toBe(200);
    expect(res2.body.processed).toBe(false);
  });
});
