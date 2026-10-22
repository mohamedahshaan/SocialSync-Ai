import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { app } from '../src/app.js';
import { prisma } from '../src/utils/prisma.js';
import { config } from '../src/config/index.js';
import {
  generatePayHereCheckoutHash,
  verifyPayHereSignature,
  initializeCheckoutSession
} from '../src/services/paymentGatewayService.js';

describe('PayHere Sandbox Payment Immediate Confirmation & Subscription Suite', () => {
  const testMerchantId = '1238763';
  const testMerchantSecret = 'TEST_SANDBOX_SECRET_PAYHERE_CONFIRM_2026';
  let testUser;
  let userToken;

  beforeAll(async () => {
    process.env.PAYHERE_MERCHANT_ID = testMerchantId;
    process.env.PAYHERE_MERCHANT_SECRET = testMerchantSecret;
    process.env.PAYHERE_SECRET = testMerchantSecret;
    process.env.PAYHERE_SANDBOX = 'true';
    process.env.PAYHERE_NOTIFY_URL = 'http://localhost:5001/api/webhooks/payment';
    process.env.FRONTEND_URL = 'http://localhost:5173';

    const passwordHash = await bcrypt.hash('TestPass2026!', 10);
    testUser = await prisma.user.upsert({
      where: { email: 'payhere_immediate_test@socialsync.ai' },
      update: {
        plan: 'FREE',
        credits: 200,
        phone: '0771234567',
        city: 'Colombo',
        address: 'No. 1, Galle Road'
      },
      create: {
        name: 'Immediate PayHere Tester',
        email: 'payhere_immediate_test@socialsync.ai',
        passwordHash,
        role: 'USER',
        status: 'ACTIVE',
        plan: 'FREE',
        credits: 200,
        phone: '0771234567',
        city: 'Colombo',
        address: 'No. 1, Galle Road'
      }
    });

    userToken = jwt.sign(
      { userId: testUser.id, email: testUser.email, role: 'USER', name: testUser.name },
      config.jwtSecret,
      { expiresIn: '1h' }
    );
  });

  function makePayHereSig({ orderId, amount, currency = 'LKR', statusCode = '2' }) {
    const formattedAmount = parseFloat(amount).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      useGrouping: false
    });
    const hashedSecret = crypto.createHash('md5').update(testMerchantSecret).digest('hex').toUpperCase();
    const raw = `${testMerchantId}${orderId}${formattedAmount}${currency}${statusCode}${hashedSecret}`;
    return crypto.createHash('md5').update(raw).digest('hex').toUpperCase();
  }

  it('1. Valid successful PayHere notification activates the correct plan and clears prior trial status', async () => {
    // Setup: User was on Creator trial with 495 credits remaining (after spending 5 credits)
    const now = new Date();
    const trialEnd = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);

    await prisma.user.update({
      where: { id: testUser.id },
      data: { plan: 'CREATOR', credits: 495 }
    });

    await prisma.userSubscription.upsert({
      where: { userId: testUser.id },
      create: {
        userId: testUser.id,
        plan: 'CREATOR',
        status: 'TRIALING',
        isFreeTrial: true,
        trialStartsAt: now,
        trialEndsAt: trialEnd,
        currentPeriodStart: now,
        currentPeriodEnd: trialEnd,
        billingAmount: 1000,
        currency: 'LKR'
      },
      update: {
        plan: 'CREATOR',
        status: 'TRIALING',
        isFreeTrial: true,
        trialStartsAt: now,
        trialEndsAt: trialEnd,
        currentPeriodStart: now,
        currentPeriodEnd: trialEnd,
        billingAmount: 1000,
        currency: 'LKR'
      }
    });

    // 1. Initialize checkout session for paid Creator plan
    const sessionRes = await request(app)
      .post('/api/subscriptions/checkout-session')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        plan: 'CREATOR',
        amount: 1000,
        currency: 'LKR'
      });

    expect(sessionRes.status).toBe(200);
    const orderId = sessionRes.body.data.orderId;

    // 2. Simulate PayHere server-to-server webhook callback
    const md5sig = makePayHereSig({ orderId, amount: '1000.00', currency: 'LKR', statusCode: '2' });
    const webhookRes = await request(app)
      .post('/api/webhooks/payment')
      .send({
        merchant_id: testMerchantId,
        order_id: orderId,
        payment_id: `ph_tx_${Date.now()}`,
        payhere_amount: '1000.00',
        payhere_currency: 'LKR',
        status_code: '2',
        custom_1: testUser.id,
        custom_2: 'CREATOR',
        method: 'VISA',
        card_no: '4242xxxxxxxx4242',
        card_holder_name: 'Test Customer',
        md5sig
      });

    expect(webhookRes.status).toBe(200);
    expect(webhookRes.body.success).toBe(true);

    // 3. Verify user and subscription are fully active paid status, NOT trial
    const updatedUser = await prisma.user.findUnique({
      where: { id: testUser.id },
      include: { subscription: true }
    });

    expect(updatedUser.plan).toBe('CREATOR');
    expect(updatedUser.credits).toBe(500); // Reset to full package allocation
    expect(updatedUser.subscription.status).toBe('ACTIVE');
    expect(updatedUser.subscription.isFreeTrial).toBe(false);
    expect(updatedUser.subscription.trialEndsAt).toBeNull();
    expect(updatedUser.subscription.trialStartsAt).toBeNull();

    // Verify payment record
    const payment = await prisma.payment.findUnique({ where: { reference: orderId } });
    expect(payment.status).toBe('VERIFIED');
  });

  it('2. Invalid signature does not activate the plan', async () => {
    // Reset user to FREE
    await prisma.user.update({
      where: { id: testUser.id },
      data: { plan: 'FREE', credits: 200 }
    });

    const sessionRes = await request(app)
      .post('/api/subscriptions/checkout-session')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        plan: 'PROFESSIONAL',
        amount: 2500,
        currency: 'LKR'
      });

    expect(sessionRes.status).toBe(200);
    const orderId = sessionRes.body.data.orderId;

    // Send forged signature
    const webhookRes = await request(app)
      .post('/api/webhooks/payment')
      .send({
        merchant_id: testMerchantId,
        order_id: orderId,
        payment_id: `ph_fake_${Date.now()}`,
        payhere_amount: '2500.00',
        payhere_currency: 'LKR',
        status_code: '2',
        md5sig: 'FORGED_INVALID_MD5_SIGNATURE_99999'
      });

    expect(webhookRes.status).toBe(400);

    // Plan must remain FREE, credits 200
    const user = await prisma.user.findUnique({ where: { id: testUser.id } });
    expect(user.plan).toBe('FREE');
    expect(user.credits).toBe(200);

    const payment = await prisma.payment.findUnique({ where: { reference: orderId } });
    expect(payment.status).toBe('PENDING');
  });

  it('3. Failed or cancelled payment does not activate the paid plan', async () => {
    // 1. Cancelled payment (status_code -1)
    const session1 = await request(app)
      .post('/api/subscriptions/checkout-session')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ plan: 'CREATOR', amount: 1000 });

    const orderId1 = session1.body.data.orderId;
    const sig1 = makePayHereSig({ orderId: orderId1, amount: '1000.00', statusCode: '-1' });

    const cancelRes = await request(app)
      .post('/api/webhooks/payment')
      .send({
        merchant_id: testMerchantId,
        order_id: orderId1,
        payhere_amount: '1000.00',
        status_code: '-1',
        status_message: 'User cancelled on PayHere checkout page',
        md5sig: sig1
      });

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.success).toBe(false);

    const p1 = await prisma.payment.findUnique({ where: { reference: orderId1 } });
    expect(p1.status).toBe('CANCELLED');

    const u1 = await prisma.user.findUnique({ where: { id: testUser.id } });
    expect(u1.plan).toBe('FREE');

    // 2. Failed payment (status_code -2)
    const session2 = await request(app)
      .post('/api/subscriptions/checkout-session')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ plan: 'PROFESSIONAL', amount: 2500 });

    const orderId2 = session2.body.data.orderId;
    const sig2 = makePayHereSig({ orderId: orderId2, amount: '2500.00', statusCode: '-2' });

    const failRes = await request(app)
      .post('/api/webhooks/payment')
      .send({
        merchant_id: testMerchantId,
        order_id: orderId2,
        payhere_amount: '2500.00',
        status_code: '-2',
        status_message: 'Card declined by issuer',
        md5sig: sig2
      });

    expect(failRes.status).toBe(200);
    expect(failRes.body.success).toBe(false);

    const p2 = await prisma.payment.findUnique({ where: { reference: orderId2 } });
    expect(p2.status).toBe('FAILED');

    const u2 = await prisma.user.findUnique({ where: { id: testUser.id } });
    expect(u2.plan).toBe('FREE');
  });

  it('4. Duplicate notification does not grant credits twice (idempotent)', async () => {
    // Initialize session for Professional (1500 credits)
    const session = await request(app)
      .post('/api/subscriptions/checkout-session')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ plan: 'PROFESSIONAL', amount: 2500 });

    const orderId = session.body.data.orderId;
    const paymentId = `ph_tx_dup_${Date.now()}`;
    const md5sig = makePayHereSig({ orderId, amount: '2500.00', statusCode: '2' });

    const payload = {
      merchant_id: testMerchantId,
      order_id: orderId,
      payment_id: paymentId,
      payhere_amount: '2500.00',
      payhere_currency: 'LKR',
      status_code: '2',
      custom_1: testUser.id,
      custom_2: 'PROFESSIONAL',
      md5sig
    };

    // First delivery
    const firstDelivery = await request(app).post('/api/webhooks/payment').send(payload);
    expect(firstDelivery.status).toBe(200);
    expect(firstDelivery.body.success).toBe(true);

    const userAfterFirst = await prisma.user.findUnique({ where: { id: testUser.id } });
    expect(userAfterFirst.plan).toBe('PROFESSIONAL');
    expect(userAfterFirst.credits).toBe(1500);

    // Second delivery (duplicate retry from PayHere)
    const secondDelivery = await request(app).post('/api/webhooks/payment').send(payload);
    expect(secondDelivery.status).toBe(200);
    expect(secondDelivery.body.alreadyProcessed).toBe(true);

    // Verify credits were NOT doubled
    const userAfterSecond = await prisma.user.findUnique({ where: { id: testUser.id } });
    expect(userAfterSecond.credits).toBe(1500);

    // Verify only 1 credit transaction for this payment
    const creditTxs = await prisma.creditTransaction.findMany({
      where: {
        userId: testUser.id,
        reason: { contains: orderId }
      }
    });
    expect(creditTxs.length).toBe(1);
  });

  it('5. Payment-status endpoint returns the correct status (PENDING -> VERIFIED)', async () => {
    // 1. Create a fresh checkout session
    const session = await request(app)
      .post('/api/subscriptions/checkout-session')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ plan: 'CREATOR', amount: 1000 });

    const orderId = session.body.data.orderId;

    // 2. Poll payment status while still PENDING (before webhook)
    const pendingStatusRes = await request(app)
      .post('/api/subscriptions/confirm-payment')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ orderId });

    expect(pendingStatusRes.status).toBe(202);
    expect(pendingStatusRes.body.status).toBe('PENDING');
    expect(pendingStatusRes.body.verified).toBe(false);

    // 3. Webhook arrives and confirms payment
    const md5sig = makePayHereSig({ orderId, amount: '1000.00', statusCode: '2' });
    await request(app)
      .post('/api/webhooks/payment')
      .send({
        merchant_id: testMerchantId,
        order_id: orderId,
        payment_id: `ph_status_tx_${Date.now()}`,
        payhere_amount: '1000.00',
        payhere_currency: 'LKR',
        status_code: '2',
        custom_1: testUser.id,
        custom_2: 'CREATOR',
        md5sig
      });

    // 4. Poll payment status after confirmation
    const verifiedStatusRes = await request(app)
      .post('/api/subscriptions/confirm-payment')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ orderId });

    expect(verifiedStatusRes.status).toBe(200);
    expect(verifiedStatusRes.body.verified).toBe(true);
    expect(verifiedStatusRes.body.data.user.plan).toBe('CREATOR');
    expect(verifiedStatusRes.body.data.user.credits).toBe(500);
    expect(verifiedStatusRes.body.data.subscriptionDetails).toBeDefined();
  });

  it('6. Subscription details API confirms plan, credits, and channel allowance update after backend verification', async () => {
    const meRes = await request(app)
      .get('/api/subscriptions/me')
      .set('Authorization', `Bearer ${userToken}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.data.plan.type).toBe('CREATOR');
    expect(meRes.body.data.user.credits).toBe(500);
    expect(meRes.body.data.subscription.isFreeTrial).toBe(false);
    expect(meRes.body.data.subscription.status.toUpperCase()).toBe('ACTIVE');
  });

  it('7. Missing or unreachable callback is handled without falsely reporting success', async () => {
    // Initialize session
    const session = await request(app)
      .post('/api/subscriptions/checkout-session')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ plan: 'PROFESSIONAL', amount: 2500 });

    expect(session.status).toBe(200);
    const orderId = session.body.data.orderId;

    // Simulate user returning to packages page when callback NEVER arrived (dead tunnel or network failure)
    const checkRes = await request(app)
      .post('/api/subscriptions/confirm-payment')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ orderId });

    // Must return 202 PENDING, NOT success
    expect(checkRes.status).toBe(202);
    expect(checkRes.body.verified).toBe(false);
    expect(checkRes.body.status).toBe('PENDING');

    // User's active plan must not be changed to Professional prematurely
    const user = await prisma.user.findUnique({ where: { id: testUser.id } });
    expect(user.plan).toBe('CREATOR'); // Still Creator from previous test, not Professional
  });

  it('8. Active PayHere Search API verification activates plan immediately when webhook is delayed', async () => {
    // Initialize session for Professional
    const session = await request(app)
      .post('/api/subscriptions/checkout-session')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ plan: 'PROFESSIONAL', amount: 2500 });

    expect(session.status).toBe(200);
    const orderId = session.body.data.orderId;

    // Mock global fetch for PayHere OAuth and Search API
    const originalFetch = global.fetch;
    process.env.PAYHERE_APP_ID = 'test_app_id_sandbox';
    process.env.PAYHERE_APP_SECRET = 'test_app_secret_sandbox';

    try {
      global.fetch = async (url, opts) => {
        const urlStr = String(url);
        if (urlStr.includes('/oauth/token')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              access_token: 'mock_payhere_access_token_123',
              token_type: 'bearer',
              expires_in: 599
            })
          };
        }
        if (urlStr.includes('/payment/search')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              status: 1,
              msg: `Found 1 payments for order_id:${orderId}`,
              data: [
                {
                  payment_id: 320099887766,
                  order_id: orderId,
                  status: 'RECEIVED',
                  status_code: 2,
                  amount: '2500.00',
                  currency: 'LKR',
                  payment_method: {
                    method: 'VISA',
                    card_customer_name: 'Immediate Tester',
                    card_no: '4242xxxxxxxx4242'
                  }
                }
              ]
            })
          };
        }
        return originalFetch(url, opts);
      };

      // User calls confirm-payment (e.g. from frontend polling or "Check Status Now")
      const confirmRes = await request(app)
        .post('/api/subscriptions/confirm-payment')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ orderId });

      expect(confirmRes.status).toBe(200);
      expect(confirmRes.body.success).toBe(true);
      expect(confirmRes.body.verified).toBe(true);
      expect(confirmRes.body.data.user.plan).toBe('PROFESSIONAL');
      expect(confirmRes.body.data.user.credits).toBe(1500);

      // Verify DB state
      const user = await prisma.user.findUnique({
        where: { id: testUser.id },
        include: { subscription: true }
      });
      expect(user.plan).toBe('PROFESSIONAL');
      expect(user.credits).toBe(1500);
      expect(user.subscription.status).toBe('ACTIVE');
      expect(user.subscription.isFreeTrial).toBe(false);
    } finally {
      global.fetch = originalFetch;
      delete process.env.PAYHERE_APP_ID;
      delete process.env.PAYHERE_APP_SECRET;
    }
  });
});
