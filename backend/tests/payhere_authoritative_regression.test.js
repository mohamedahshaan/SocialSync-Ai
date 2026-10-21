import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { app } from '../src/app.js';
import { prisma } from '../src/utils/prisma.js';
import { config } from '../src/config/index.js';

describe('PayHere Authoritative Payment Confirmation Regression Suite', () => {
  const testMerchantId = '1238763';
  const testMerchantSecret = 'TEST_SANDBOX_SECRET_REGRESSION_2026';
  let testUser;
  let userToken;
  let createdPaymentIds = [];

  const generateSignature = (orderId, amount, currency, statusCode, secret = testMerchantSecret) => {
    const hashedSecret = crypto.createHash('md5').update(secret).digest('hex').toUpperCase();
    const raw = `${testMerchantId}${orderId}${amount}${currency}${statusCode}${hashedSecret}`;
    return crypto.createHash('md5').update(raw).digest('hex').toUpperCase();
  };

  beforeAll(async () => {
    process.env.PAYHERE_MERCHANT_ID = testMerchantId;
    process.env.PAYHERE_MERCHANT_SECRET = testMerchantSecret;
    process.env.PAYHERE_SECRET = testMerchantSecret;
    process.env.PAYHERE_SANDBOX = 'true';

    const passwordHash = await bcrypt.hash('RegPass2026!', 10);
    testUser = await prisma.user.upsert({
      where: { email: 'authoritative_reg_user@socialsync.ai' },
      update: { plan: 'FREE', credits: 200 },
      create: {
        name: 'Authoritative Tester',
        email: 'authoritative_reg_user@socialsync.ai',
        passwordHash,
        role: 'USER',
        status: 'ACTIVE',
        plan: 'FREE',
        credits: 200
      }
    });

    userToken = jwt.sign(
      { userId: testUser.id, email: testUser.email, role: 'USER', name: testUser.name },
      config.jwtSecret,
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    // Clean up created payments, credit transactions, subscriptions, and test user
    if (testUser) {
      await prisma.creditTransaction.deleteMany({ where: { userId: testUser.id } });
      await prisma.planHistory.deleteMany({ where: { userId: testUser.id } });
      await prisma.subscriptionEvent.deleteMany({ where: { userId: testUser.id } });
      await prisma.userSubscription.deleteMany({ where: { userId: testUser.id } });
      await prisma.payment.deleteMany({ where: { userId: testUser.id } });
      await prisma.user.delete({ where: { id: testUser.id } }).catch(() => {});
    }
  });

  it('1. Pending Notification: checkout-session creates PENDING payment; confirm-payment does not activate plan prematurely', async () => {
    const initRes = await request(app)
      .post('/api/subscriptions/checkout-session')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        plan: 'CREATOR',
        amount: 1000,
        currency: 'LKR',
        billingCycle: 'ONE_TIME',
        customer: {
          firstName: 'Authoritative',
          lastName: 'Tester',
          phone: '0771234567',
          city: 'Colombo',
          address: 'No. 1, Galle Road'
        }
      });

    expect(initRes.status).toBe(200);
    const orderId = initRes.body.data.orderId;
    createdPaymentIds.push(orderId);

    // Verify payment in database is PENDING
    const payment = await prisma.payment.findUnique({ where: { reference: orderId } });
    expect(payment.status).toBe('PENDING');

    // Polling confirm-payment endpoint returns 202 Pending and does not activate plan
    const confirmRes = await request(app)
      .post('/api/subscriptions/confirm-payment')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ orderId });

    expect(confirmRes.status).toBe(202);
    expect(confirmRes.body.verified).toBe(false);

    // Verify user is still FREE in DB
    const freshUser = await prisma.user.findUnique({ where: { id: testUser.id } });
    expect(freshUser.plan).toBe('FREE');
    expect(freshUser.credits).toBe(200);
  });

  it('2. Invalid Signature Rejection: missing or forged md5sig returns HTTP 400', async () => {
    const orderId = `reg_invalid_sig_${Date.now()}`;
    await prisma.payment.create({
      data: {
        userId: testUser.id,
        reference: orderId,
        amount: 1000,
        currency: 'LKR',
        plan: 'CREATOR',
        status: 'PENDING'
      }
    });

    // A. Missing md5sig
    const missingSigRes = await request(app)
      .post('/api/webhooks/payment')
      .send({
        merchant_id: testMerchantId,
        order_id: orderId,
        payhere_amount: '1000.00',
        payhere_currency: 'LKR',
        status_code: '2'
      });
    expect(missingSigRes.status).toBe(400);
    expect(missingSigRes.text).toContain('Missing signature');

    // B. Forged md5sig
    const forgedSigRes = await request(app)
      .post('/api/webhooks/payment')
      .send({
        merchant_id: testMerchantId,
        order_id: orderId,
        payhere_amount: '1000.00',
        payhere_currency: 'LKR',
        status_code: '2',
        md5sig: 'FORGED_INVALID_MD5_SIGNATURE_HEX32'
      });
    expect(forgedSigRes.status).toBe(400);
    expect(forgedSigRes.text).toContain('Invalid signature');
  });

  it('3. Mismatched Amount & Currency Rejection: returns HTTP 400', async () => {
    const orderId = `reg_mismatch_${Date.now()}`;
    await prisma.payment.create({
      data: {
        userId: testUser.id,
        reference: orderId,
        amount: 1000,
        currency: 'LKR',
        plan: 'CREATOR',
        status: 'PENDING'
      }
    });

    // Amount mismatch (sent 500 instead of 1000)
    const sigAmount = generateSignature(orderId, '500.00', 'LKR', '2');
    const amountRes = await request(app)
      .post('/api/webhooks/payment')
      .send({
        merchant_id: testMerchantId,
        order_id: orderId,
        payhere_amount: '500.00',
        payhere_currency: 'LKR',
        status_code: '2',
        md5sig: sigAmount
      });
    expect(amountRes.status).toBe(400);
    expect(amountRes.text).toContain('Amount mismatch');

    // Currency mismatch (sent USD instead of LKR)
    const sigCurrency = generateSignature(orderId, '1000.00', 'USD', '2');
    const currRes = await request(app)
      .post('/api/webhooks/payment')
      .send({
        merchant_id: testMerchantId,
        order_id: orderId,
        payhere_amount: '1000.00',
        payhere_currency: 'USD',
        status_code: '2',
        md5sig: sigCurrency
      });
    expect(currRes.status).toBe(400);
    expect(currRes.text).toContain('Currency mismatch');
  });

  it('4. User & Plan Mismatch Rejection: returns HTTP 400', async () => {
    const orderId = `reg_userplan_${Date.now()}`;
    await prisma.payment.create({
      data: {
        userId: testUser.id,
        reference: orderId,
        amount: 1000,
        currency: 'LKR',
        plan: 'CREATOR',
        status: 'PENDING'
      }
    });

    const sig = generateSignature(orderId, '1000.00', 'LKR', '2');

    // User mismatch
    const userMismatchRes = await request(app)
      .post('/api/webhooks/payment')
      .send({
        merchant_id: testMerchantId,
        order_id: orderId,
        payhere_amount: '1000.00',
        payhere_currency: 'LKR',
        status_code: '2',
        md5sig: sig,
        custom_1: 'wrong_user_id',
        custom_2: 'CREATOR'
      });
    expect(userMismatchRes.status).toBe(400);
    expect(userMismatchRes.text).toContain('User mismatch');

    // Plan mismatch
    const planMismatchRes = await request(app)
      .post('/api/webhooks/payment')
      .send({
        merchant_id: testMerchantId,
        order_id: orderId,
        payhere_amount: '1000.00',
        payhere_currency: 'LKR',
        status_code: '2',
        md5sig: sig,
        custom_1: testUser.id,
        custom_2: 'PROFESSIONAL'
      });
    expect(planMismatchRes.status).toBe(400);
    expect(planMismatchRes.text).toContain('Plan mismatch');
  });

  it('5. Inappropriate Status Transition: cannot confirm already REFUNDED order', async () => {
    const orderId = `reg_refunded_${Date.now()}`;
    await prisma.payment.create({
      data: {
        userId: testUser.id,
        reference: orderId,
        amount: 1000,
        currency: 'LKR',
        plan: 'CREATOR',
        status: 'REFUNDED'
      }
    });

    const sig = generateSignature(orderId, '1000.00', 'LKR', '2');
    const res = await request(app)
      .post('/api/webhooks/payment')
      .send({
        merchant_id: testMerchantId,
        order_id: orderId,
        payhere_amount: '1000.00',
        payhere_currency: 'LKR',
        status_code: '2',
        md5sig: sig
      });
    expect(res.status).toBe(400);
    expect(res.text).toContain('Inappropriate status transition');
  });

  it('6. Valid Successful Payment Activation: upgrades user, grants 500 credits for Creator, updates subscription and plan history', async () => {
    const orderId = `reg_success_${Date.now()}`;
    await prisma.payment.create({
      data: {
        userId: testUser.id,
        reference: orderId,
        amount: 1000,
        currency: 'LKR',
        plan: 'CREATOR',
        status: 'PENDING'
      }
    });

    const sig = generateSignature(orderId, '1000.00', 'LKR', '2');
    const webhookRes = await request(app)
      .post('/api/webhooks/payment')
      .send({
        merchant_id: testMerchantId,
        order_id: orderId,
        payment_id: `pay_${Date.now()}`,
        payhere_amount: '1000.00',
        payhere_currency: 'LKR',
        status_code: '2',
        method: 'VISA',
        card_holder_name: 'Authoritative Tester',
        card_no: '************4242',
        custom_1: testUser.id,
        custom_2: 'CREATOR',
        md5sig: sig
      });

    expect(webhookRes.status).toBe(200);

    // Verify user in PostgreSQL
    const freshUser = await prisma.user.findUnique({ where: { id: testUser.id } });
    expect(freshUser.plan).toBe('CREATOR');
    expect(freshUser.credits).toBe(500);

    // Verify payment in PostgreSQL
    const verifiedPayment = await prisma.payment.findUnique({ where: { reference: orderId } });
    expect(verifiedPayment.status).toBe('VERIFIED');
    expect(verifiedPayment.verifiedAt).not.toBeNull();

    // Verify subscription
    const sub = await prisma.userSubscription.findUnique({ where: { userId: testUser.id } });
    expect(sub).not.toBeNull();
    expect(sub.status).toBe('ACTIVE');
    expect(sub.plan).toBe('CREATOR');

    // Verify plan history
    const planHistory = await prisma.planHistory.findFirst({
      where: { userId: testUser.id, paymentId: verifiedPayment.id }
    });
    expect(planHistory).not.toBeNull();
    expect(planHistory.plan).toBe('CREATOR');
    expect(planHistory.creditsAfter).toBe(500);

    // Polling confirm-payment now returns confirmed success
    const confirmRes = await request(app)
      .post('/api/subscriptions/confirm-payment')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ orderId });

    expect(confirmRes.status).toBe(200);
    expect(confirmRes.body.success).toBe(true);
    expect(confirmRes.body.data.user.plan).toBe('CREATOR');
  });

  it('7. Duplicate Notification Idempotency: re-sending identical webhook returns 200 without duplicate credit grants', async () => {
    const latestPayment = await prisma.payment.findFirst({
      where: { userId: testUser.id, status: 'VERIFIED' }
    });
    expect(latestPayment).not.toBeNull();

    const initialUser = await prisma.user.findUnique({ where: { id: testUser.id } });
    const initialCredits = initialUser.credits;

    const initialCreditTxCount = await prisma.creditTransaction.count({ where: { userId: testUser.id } });
    const initialHistoryCount = await prisma.planHistory.count({ where: { userId: testUser.id } });

    const sig = generateSignature(latestPayment.reference, '1000.00', 'LKR', '2');
    const duplicateRes = await request(app)
      .post('/api/webhooks/payment')
      .send({
        merchant_id: testMerchantId,
        order_id: latestPayment.reference,
        payment_id: `pay_${Date.now()}`,
        payhere_amount: '1000.00',
        payhere_currency: 'LKR',
        status_code: '2',
        custom_1: testUser.id,
        custom_2: 'CREATOR',
        md5sig: sig
      });

    expect(duplicateRes.status).toBe(200);
    expect(duplicateRes.body.alreadyProcessed).toBe(true);

    // Credits should NOT be granted again
    const postUser = await prisma.user.findUnique({ where: { id: testUser.id } });
    expect(postUser.credits).toBe(initialCredits);

    // No duplicate transactions or plan history
    const postCreditTxCount = await prisma.creditTransaction.count({ where: { userId: testUser.id } });
    expect(postCreditTxCount).toBe(initialCreditTxCount);

    const postHistoryCount = await prisma.planHistory.count({ where: { userId: testUser.id } });
    expect(postHistoryCount).toBe(initialHistoryCount);
  });

  it('8. Cancelled Checkout Handling: cancel-checkout marks payment as CANCELLED', async () => {
    const orderId = `reg_cancelled_${Date.now()}`;
    await prisma.payment.create({
      data: {
        userId: testUser.id,
        reference: orderId,
        amount: 1000,
        currency: 'LKR',
        plan: 'CREATOR',
        status: 'PENDING'
      }
    });

    const cancelRes = await request(app)
      .post('/api/subscriptions/cancel-checkout')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ orderId });

    expect(cancelRes.status).toBe(200);

    const updatedPayment = await prisma.payment.findUnique({ where: { reference: orderId } });
    expect(updatedPayment.status).toBe('CANCELLED');
  });
});
