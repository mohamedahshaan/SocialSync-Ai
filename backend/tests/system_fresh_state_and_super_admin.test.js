import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { app } from '../src/app.js';
import { prisma } from '../src/utils/prisma.js';
import { config } from '../src/config/index.js';
import {
  generatePayHereCheckoutHash,
  verifyPayHereSignature
} from '../src/services/paymentGatewayService.js';

describe('System Fresh State & Super Admin Professional Plan Suite', () => {
  let superAdminToken = '';
  let superAdminUser = null;

  beforeAll(async () => {
    // 1. Locate the single Super Admin
    superAdminUser = await prisma.user.findFirst({
      where: { role: 'SUPER_ADMIN' }
    });

    expect(superAdminUser).not.toBeNull();
    expect(superAdminUser.email).toBe('admin@socialsync.ai');

    superAdminToken = jwt.sign(
      { userId: superAdminUser.id, email: superAdminUser.email, role: 'SUPER_ADMIN', name: superAdminUser.name },
      config.jwtSecret,
      { expiresIn: '2h' }
    );
  });

  it('1. Exactly one Super Admin exists in the database and is admin@socialsync.ai', async () => {
    const totalUsers = await prisma.user.count();
    const regularUsers = await prisma.user.count({ where: { role: 'USER' } });
    const superAdmins = await prisma.user.count({ where: { role: 'SUPER_ADMIN' } });

    expect(totalUsers).toBe(1);
    expect(regularUsers).toBe(0);
    expect(superAdmins).toBe(1);
  });

  it('2. Super Admin is on the PROFESSIONAL plan with 1,500 credits and 6 channel connections', async () => {
    const admin = await prisma.user.findUnique({
      where: { email: 'admin@socialsync.ai' }
    });

    expect(admin.role).toBe('SUPER_ADMIN');
    expect(admin.plan).toBe('PROFESSIONAL');
    expect(admin.credits).toBe(1500);
    expect(admin.status).toBe('ACTIVE');
    expect(admin.isEmailVerified).toBe(true);
  });

  it('3. GET /api/subscriptions/me: Super Admin has Professional entitlement (6 channels, 1500 credits, no pending checkout)', async () => {
    const res = await request(app)
      .get('/api/subscriptions/me')
      .set('Authorization', `Bearer ${superAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.plan.type).toBe('PROFESSIONAL');
    expect(res.body.data.plan.name).toBe('Professional');
    expect(res.body.data.plan.credits).toBe(1500);
    // CRITICAL: Channel count must be exactly 6, NEVER 999
    expect(res.body.data.plan.maxConnectedAccounts).toBe(6);
    expect(res.body.data.usage.maxAccounts).toBe(6);
    expect(res.body.data.user.credits).toBe(1500);
    expect(res.body.data.pendingCheckout).toBeNull();
    expect(res.body.data.billingHistory).toHaveLength(0);
    expect(res.body.data.planHistory).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: 'SYSTEM_BOOTSTRAP',
          status: 'SUCCESS'
        })
      ])
    );
  });

  it('4. GET /api/subscriptions/features: Super Admin has full Professional feature access', async () => {
    const res = await request(app)
      .get('/api/subscriptions/features')
      .set('Authorization', `Bearer ${superAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.isProfessional).toBe(true);
    expect(res.body.data.canUseAiCaption).toBe(true);
    expect(res.body.data.canUseCollageStudio).toBe(true);
    expect(res.body.data.canUseScheduling).toBe(true);
  });

  it('5. GET /api/admin/dashboard: Metrics start at zero for regular customers and historical test data', async () => {
    const res = await request(app)
      .get('/api/admin/dashboard')
      .set('Authorization', `Bearer ${superAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const summary = res.body.data.summary;

    expect(summary.totalUsers).toBe(0);
    expect(summary.activeUsers).toBe(0);
    expect(summary.freeUsersCount).toBe(0);
    expect(summary.distinctPaidSubscribers).toBe(0);
    expect(summary.activeSubscriptions).toBe(0);
    expect(summary.totalDeletedAccounts).toBe(0);
    expect(summary.churnRatePercentage).toBe(0);
    expect(summary.payments.verifiedTotalLkr).toBe(0);
    expect(summary.payments.verifiedCount).toBe(0);
    expect(summary.payments.pendingCount).toBe(0);
    expect(summary.payments.failedAndCancelledCount).toBe(0);
    expect(summary.totalCirculatingCredits).toBe(0);
  });

  it('6. POST /api/auth/register: Regular user cannot escalate privileges to SUPER_ADMIN', async () => {
    const testEmail = `test_customer_${Date.now()}@example.com`;
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Normal Customer',
        email: testEmail,
        password: 'Password123!',
        confirmPassword: 'Password123!',
        role: 'SUPER_ADMIN' // Attempt privilege escalation
      });

    expect(regRes.status).toBe(201);
    expect(regRes.body.success).toBe(true);
    expect(regRes.body.data.user.role).toBe('USER'); // Forced to USER
    expect(regRes.body.data.user.plan).toBe('FREE');
    expect(regRes.body.data.user.credits).toBe(200);

    // Clean up created test customer to maintain fresh state
    await prisma.user.delete({ where: { id: regRes.body.data.user.id } });
  });

  it('7. Checkout & Plan Activation Flow: Creator -> Professional upgrade activates immediately and clears pending banner', async () => {
    // Create temporary Creator customer
    const tempUser = await prisma.user.create({
      data: {
        name: 'Creator Tester',
        email: `creator_tester_${Date.now()}@example.com`,
        role: 'USER',
        status: 'ACTIVE',
        plan: 'CREATOR',
        credits: 500,
        phone: '0771234567',
        address: 'No 12, Galle Road',
        city: 'Colombo',
        country: 'Sri Lanka'
      }
    });

    const tempToken = jwt.sign(
      { userId: tempUser.id, email: tempUser.email, role: 'USER', name: tempUser.name },
      config.jwtSecret,
      { expiresIn: '1h' }
    );

    try {
      // Step A: Verify initial Creator status (4 channels, 500 credits, no pending checkout)
      let detailsRes = await request(app)
        .get('/api/subscriptions/me')
        .set('Authorization', `Bearer ${tempToken}`);

      expect(detailsRes.body.data.plan.type).toBe('CREATOR');
      expect(detailsRes.body.data.plan.maxConnectedAccounts).toBe(4);
      expect(detailsRes.body.data.user.credits).toBe(500);
      expect(detailsRes.body.data.pendingCheckout).toBeNull();

      // Step B: Initialize Professional checkout session
      const checkoutRes = await request(app)
        .post('/api/subscriptions/checkout-session')
        .set('Authorization', `Bearer ${tempToken}`)
        .send({
          plan: 'PROFESSIONAL',
          amount: 2500,
          currency: 'LKR',
          billingCycle: 'ONE_TIME',
          customer: {
            phone: '0771234567',
            address: 'No 12, Galle Road',
            city: 'Colombo'
          }
        });

      expect(checkoutRes.status).toBe(200);
      const orderId = checkoutRes.body.data.orderId;
      expect(orderId).toBeDefined();

      // Step C: While pending, Creator plan remains active and concise pendingCheckout banner is provided
      detailsRes = await request(app)
        .get('/api/subscriptions/me')
        .set('Authorization', `Bearer ${tempToken}`);

      expect(detailsRes.body.data.user.plan).toBe('CREATOR');
      expect(detailsRes.body.data.plan.maxConnectedAccounts).toBe(4); // NOT overridden!
      expect(detailsRes.body.data.pendingCheckout).not.toBeNull();
      expect(detailsRes.body.data.pendingCheckout.reference).toBe(orderId);
      expect(detailsRes.body.data.pendingCheckout.plan).toBe('PROFESSIONAL');
      expect(detailsRes.body.data.pendingCheckout.amount).toBe(2500);

      // Step D: Simulate delayed notification check (still pending, returns 202 without prematurely activating)
      const pendingCheckRes = await request(app)
        .post('/api/subscriptions/confirm-payment')
        .set('Authorization', `Bearer ${tempToken}`)
        .send({ orderId });

      expect(pendingCheckRes.status).toBe(202);
      expect(pendingCheckRes.body.status).toBe('PENDING');

      // User in DB is still CREATOR
      let dbUser = await prisma.user.findUnique({ where: { id: tempUser.id } });
      expect(dbUser.plan).toBe('CREATOR');
      expect(dbUser.credits).toBe(500);

      // Step E: Send verified PayHere webhook notification
      const merchantId = (process.env.PAYHERE_MERCHANT_ID || '1238763').trim();
      const secret = process.env.PAYHERE_MERCHANT_SECRET || process.env.PAYHERE_SECRET;
      const hashedSecret = crypto.createHash('md5').update(secret).digest('hex').toUpperCase();
      const amountStr = '2500.00';
      const rawSig = `${merchantId}${orderId}${amountStr}LKR2${hashedSecret}`;
      const md5sig = crypto.createHash('md5').update(rawSig).digest('hex').toUpperCase();

      const webhookRes = await request(app)
        .post('/api/webhooks/payment')
        .send({
          merchant_id: merchantId,
          order_id: orderId,
          payment_id: `pay_${Date.now()}`,
          payhere_amount: amountStr,
          payhere_currency: 'LKR',
          status_code: '2',
          md5sig,
          custom_1: tempUser.id,
          custom_2: 'PROFESSIONAL'
        });

      expect(webhookRes.status).toBe(200);

      // Step F: Verify in PostgreSQL that plan, credits, subscription, plan history are updated atomically
      dbUser = await prisma.user.findUnique({ where: { id: tempUser.id } });
      expect(dbUser.plan).toBe('PROFESSIONAL');
      expect(dbUser.credits).toBe(1500);

      const dbPayment = await prisma.payment.findUnique({ where: { reference: orderId } });
      expect(dbPayment.status).toBe('VERIFIED');

      const dbSub = await prisma.userSubscription.findUnique({ where: { userId: tempUser.id } });
      expect(dbSub.status).toBe('ACTIVE');
      expect(dbSub.plan).toBe('PROFESSIONAL');

      // Step G: confirm-payment now returns verified = true with refreshed user
      const confirmRes = await request(app)
        .post('/api/subscriptions/confirm-payment')
        .set('Authorization', `Bearer ${tempToken}`)
        .send({ orderId });

      expect(confirmRes.status).toBe(200);
      expect(confirmRes.body.verified).toBe(true);
      expect(confirmRes.body.data.user.plan).toBe('PROFESSIONAL');
      expect(confirmRes.body.data.user.credits).toBe(1500);

      // Step H: pending banner is removed immediately
      detailsRes = await request(app)
        .get('/api/subscriptions/me')
        .set('Authorization', `Bearer ${tempToken}`);

      expect(detailsRes.body.data.pendingCheckout).toBeNull();
      expect(detailsRes.body.data.plan.type).toBe('PROFESSIONAL');
      expect(detailsRes.body.data.plan.maxConnectedAccounts).toBe(6);

      // Step I: Duplicate webhook arrives -> idempotent HTTP 200 without double-granting credits
      const dupWebhookRes = await request(app)
        .post('/api/webhooks/payment')
        .send({
          merchant_id: merchantId,
          order_id: orderId,
          payment_id: `pay_${Date.now()}`,
          payhere_amount: amountStr,
          payhere_currency: 'LKR',
          status_code: '2',
          md5sig,
          custom_1: tempUser.id,
          custom_2: 'PROFESSIONAL'
        });

      expect(dupWebhookRes.status).toBe(200);
      expect(dupWebhookRes.body.alreadyProcessed).toBe(true);

      const dbUserAfterDup = await prisma.user.findUnique({ where: { id: tempUser.id } });
      expect(dbUserAfterDup.credits).toBe(1500); // Credits unchanged

    } finally {
      // Clean up temp test user & relational records to preserve fresh system state
      await prisma.userSubscription.deleteMany({ where: { userId: tempUser.id } });
      await prisma.subscriptionEvent.deleteMany({ where: { userId: tempUser.id } });
      await prisma.planHistory.deleteMany({ where: { userId: tempUser.id } });
      await prisma.creditTransaction.deleteMany({ where: { userId: tempUser.id } });
      await prisma.payment.deleteMany({ where: { userId: tempUser.id } });
      await prisma.user.delete({ where: { id: tempUser.id } });
    }
  });

  it('8. Stale pending checkout auto-reconciliation: pending checkout > 30 mins is safely marked CANCELLED without deleting record', async () => {
    // Create temporary user with an order created 45 minutes ago
    const tempUser = await prisma.user.create({
      data: {
        name: 'Stale Order Tester',
        email: `stale_tester_${Date.now()}@example.com`,
        role: 'USER',
        status: 'ACTIVE',
        plan: 'CREATOR',
        credits: 500
      }
    });

    const tempToken = jwt.sign(
      { userId: tempUser.id, email: tempUser.email, role: 'USER', name: tempUser.name },
      config.jwtSecret,
      { expiresIn: '1h' }
    );

    const oldDate = new Date(Date.now() - 45 * 60 * 1000); // 45 minutes ago
    const stalePayment = await prisma.payment.create({
      data: {
        userId: tempUser.id,
        amount: 2500,
        currency: 'LKR',
        plan: 'PROFESSIONAL',
        status: 'PENDING',
        reference: `stale_order_${Date.now()}`,
        idempotencyKey: `idemp_stale_${Date.now()}`,
        createdAt: oldDate
      }
    });

    try {
      // Fetch subscription details: stale payment should be auto-reconciled
      const res = await request(app)
        .get('/api/subscriptions/me')
        .set('Authorization', `Bearer ${tempToken}`);

      expect(res.status).toBe(200);
      // pendingCheckout MUST be null
      expect(res.body.data.pendingCheckout).toBeNull();

      // Check payment record in database: still exists, safely transitioned to CANCELLED
      const dbPayment = await prisma.payment.findUnique({ where: { id: stalePayment.id } });
      expect(dbPayment.status).toBe('CANCELLED');
      expect(dbPayment.failureReason).toContain('expired after 30 minutes');

      // Calling confirm-payment on stale payment returns 200 with CANCELLED/expired
      const confirmRes = await request(app)
        .post('/api/subscriptions/confirm-payment')
        .set('Authorization', `Bearer ${tempToken}`)
        .send({ orderId: stalePayment.reference });

      expect(confirmRes.status).toBe(200);
      expect(confirmRes.body.status).toBe('CANCELLED');
      expect(confirmRes.body.expired).toBe(true);

    } finally {
      await prisma.payment.deleteMany({ where: { userId: tempUser.id } });
      await prisma.user.delete({ where: { id: tempUser.id } });
    }
  });

  it('9. Cancel checkout endpoint: user can explicitly cancel pending checkout, removing banner immediately', async () => {
    const tempUser = await prisma.user.create({
      data: {
        name: 'Cancel Order Tester',
        email: `cancel_tester_${Date.now()}@example.com`,
        role: 'USER',
        status: 'ACTIVE',
        plan: 'CREATOR',
        credits: 500
      }
    });

    const tempToken = jwt.sign(
      { userId: tempUser.id, email: tempUser.email, role: 'USER', name: tempUser.name },
      config.jwtSecret,
      { expiresIn: '1h' }
    );

    const pendingPayment = await prisma.payment.create({
      data: {
        userId: tempUser.id,
        amount: 2500,
        currency: 'LKR',
        plan: 'PROFESSIONAL',
        status: 'PENDING',
        reference: `cancel_order_${Date.now()}`,
        idempotencyKey: `idemp_cancel_${Date.now()}`
      }
    });

    try {
      // Before cancelling: pendingCheckout is present
      let res = await request(app)
        .get('/api/subscriptions/me')
        .set('Authorization', `Bearer ${tempToken}`);

      expect(res.body.data.pendingCheckout).not.toBeNull();
      expect(res.body.data.pendingCheckout.reference).toBe(pendingPayment.reference);

      // Cancel checkout
      const cancelRes = await request(app)
        .post('/api/subscriptions/cancel-checkout')
        .set('Authorization', `Bearer ${tempToken}`)
        .send({ orderId: pendingPayment.reference });

      expect(cancelRes.status).toBe(200);
      expect(cancelRes.body.success).toBe(true);

      // In database, payment is CANCELLED
      const dbPayment = await prisma.payment.findUnique({ where: { id: pendingPayment.id } });
      expect(dbPayment.status).toBe('CANCELLED');

      // Now pendingCheckout is immediately null
      res = await request(app)
        .get('/api/subscriptions/me')
        .set('Authorization', `Bearer ${tempToken}`);

      expect(res.body.data.pendingCheckout).toBeNull();
      // User remains on CREATOR with 500 credits
      expect(res.body.data.user.plan).toBe('CREATOR');
      expect(res.body.data.user.credits).toBe(500);

    } finally {
      await prisma.payment.deleteMany({ where: { userId: tempUser.id } });
      await prisma.user.delete({ where: { id: tempUser.id } });
    }
  });
});
