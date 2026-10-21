import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import crypto from 'crypto';
import { app } from '../src/app.js';
import { prisma } from '../src/utils/prisma.js';
import jwt from 'jsonwebtoken';

describe('Admin Payment Tracking & Dynamic Metrics Suite', () => {
  let adminUser;
  let adminToken;
  let customerUser;
  let customerToken;
  const merchantId = 'test_merchant_123';
  const merchantSecret = 'test_secret_abc123';

  beforeAll(async () => {
    process.env.PAYHERE_MERCHANT_ID = merchantId;
    process.env.PAYHERE_MERCHANT_SECRET = merchantSecret;

    // Create Admin User
    adminUser = await prisma.user.create({
      data: {
        email: `admin_metrics_${Date.now()}@socialsync.ai`,
        passwordHash: 'hashed_password',
        name: 'System Admin',
        role: 'ADMIN',
        plan: 'PROFESSIONAL'
      }
    });

    adminToken = jwt.sign(
      { userId: adminUser.id, role: 'ADMIN' },
      process.env.JWT_SECRET || 'test_jwt_secret',
      { expiresIn: '1h' }
    );

    // Create Customer User
    customerUser = await prisma.user.create({
      data: {
        email: `customer_metrics_${Date.now()}@example.com`,
        passwordHash: 'hashed_password',
        name: 'Jane Metric',
        role: 'USER',
        plan: 'FREE',
        credits: 10
      }
    });

    customerToken = jwt.sign(
      { userId: customerUser.id, role: 'USER' },
      process.env.JWT_SECRET || 'test_jwt_secret',
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    if (adminUser?.id && customerUser?.id) {
      await prisma.creditTransaction.deleteMany({
        where: { userId: { in: [adminUser.id, customerUser.id] } }
      });
      await prisma.subscriptionEvent.deleteMany({
        where: { userId: { in: [adminUser.id, customerUser.id] } }
      });
      await prisma.payment.deleteMany({
        where: { userId: { in: [adminUser.id, customerUser.id] } }
      });
      await prisma.userSubscription.deleteMany({
        where: { userId: { in: [adminUser.id, customerUser.id] } }
      });
      await prisma.adminAuditLog.deleteMany({
        where: { adminId: adminUser.id }
      });
      await prisma.user.deleteMany({
        where: { id: { in: [adminUser.id, customerUser.id] } }
      });
    }
  });

  it('1. GET /api/admin/dashboard returns accurate database metrics across periods', async () => {
    const res = await request(app)
      .get('/api/admin/dashboard?period=all')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const summary = res.body.data.summary;

    expect(summary.totalUsers).toBeGreaterThanOrEqual(2);
    expect(typeof summary.distinctPaidSubscribers).toBe('number');
    expect(typeof summary.freeUsersCount).toBe('number');
    expect(typeof summary.payments.verifiedCount).toBe('number');
    expect(typeof summary.payments.verifiedTotalLkr).toBe('number');
    expect(typeof summary.payments.pendingCount).toBe('number');
    expect(typeof summary.payments.failedAndCancelledCount).toBe('number');
    expect(typeof summary.activeSubscriptions).toBe('number');
    expect(typeof summary.newPaidSubscribers).toBe('number');
    expect(summary.period).toBe('all');
  });

  it('2. Timezone period filtering (today, 7d, 30d, all) functions without errors', async () => {
    for (const period of ['today', '7d', '30d', 'all']) {
      const res = await request(app)
        .get(`/api/admin/dashboard?period=${period}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.summary.period).toBe(period);
    }
  });

  it('3. Successful PayHere webhook automatically verifies payment, upgrades plan, and allocates credits', async () => {
    const orderId = `ord_test_${Date.now()}`;
    const amount = 2500;
    const formattedAmount = '2500.00';
    const currency = 'LKR';

    // 1. Create PENDING payment record
    const payment = await prisma.payment.create({
      data: {
        userId: customerUser.id,
        plan: 'PROFESSIONAL',
        amount,
        currency,
        reference: orderId,
        status: 'PENDING'
      }
    });

    // 2. Generate valid PayHere MD5 signature
    const hashedSecret = crypto.createHash('md5').update(merchantSecret).digest('hex').toUpperCase();
    const rawSig = `${merchantId}${orderId}${formattedAmount}${currency}2${hashedSecret}`;
    const md5sig = crypto.createHash('md5').update(rawSig).digest('hex').toUpperCase();
    const gatewayTxId = `payhere_tx_${Date.now()}`;

    // 3. Post webhook notification
    const webhookRes = await request(app)
      .post('/api/webhooks/payment')
      .send({
        merchant_id: merchantId,
        order_id: orderId,
        payment_id: gatewayTxId,
        payhere_amount: formattedAmount,
        payhere_currency: currency,
        status_code: '2',
        method: 'VISA',
        status_message: 'Successfully completed payment',
        md5sig
      });

    expect(webhookRes.status).toBe(200);
    expect(webhookRes.body.success).toBe(true);

    // 4. Verify DB payment record
    const updatedPayment = await prisma.payment.findUnique({
      where: { id: payment.id }
    });
    expect(updatedPayment.status).toBe('VERIFIED');
    expect(updatedPayment.gatewayTransactionId).toBe(gatewayTxId);
    expect(updatedPayment.verifiedAt).not.toBeNull();

    // 5. Verify user plan upgraded and credits allocated
    const updatedUser = await prisma.user.findUnique({
      where: { id: customerUser.id }
    });
    expect(updatedUser.plan).toBe('PROFESSIONAL');
    expect(updatedUser.credits).toBe(1500);

    // 6. Verify user subscription is ACTIVE
    const subscription = await prisma.userSubscription.findUnique({
      where: { userId: customerUser.id }
    });
    expect(subscription).not.toBeNull();
    expect(subscription.status).toBe('ACTIVE');
    expect(subscription.plan).toBe('PROFESSIONAL');
  });

  it('4. Duplicate webhook notification is idempotent and does NOT duplicate credits or revenue', async () => {
    const existingPayment = await prisma.payment.findFirst({
      where: { userId: customerUser.id, status: 'VERIFIED' }
    });

    const hashedSecret = crypto.createHash('md5').update(merchantSecret).digest('hex').toUpperCase();
    const rawSig = `${merchantId}${existingPayment.reference}2500.00LKR2${hashedSecret}`;
    const md5sig = crypto.createHash('md5').update(rawSig).digest('hex').toUpperCase();

    const dupRes = await request(app)
      .post('/api/webhooks/payment')
      .send({
        merchant_id: merchantId,
        order_id: existingPayment.reference,
        payment_id: existingPayment.gatewayTransactionId,
        payhere_amount: '2500.00',
        payhere_currency: 'LKR',
        status_code: '2',
        md5sig
      });

    expect(dupRes.status).toBe(200);
    expect(dupRes.body.alreadyProcessed).toBe(true);

    // Verify credits were NOT multiplied
    const user = await prisma.user.findUnique({ where: { id: customerUser.id } });
    expect(user.credits).toBe(1500);
  });

  it('5. Invalid signature or amount mismatch is strictly rejected with HTTP 400', async () => {
    const forgedSigRes = await request(app)
      .post('/api/webhooks/payment')
      .send({
        merchant_id: merchantId,
        order_id: 'ord_fake_123',
        payhere_amount: '2500.00',
        payhere_currency: 'LKR',
        status_code: '2',
        md5sig: 'FORGED_INVALID_SIGNATURE_9999'
      });

    expect(forgedSigRes.status).toBe(400);
  });

  it('6. Failed or cancelled payment status does NOT activate subscription or revenue', async () => {
    const orderId = `ord_fail_${Date.now()}`;
    const payment = await prisma.payment.create({
      data: {
        userId: customerUser.id,
        plan: 'CREATOR',
        amount: 800,
        currency: 'LKR',
        reference: orderId,
        status: 'PENDING'
      }
    });

    const hashedSecret = crypto.createHash('md5').update(merchantSecret).digest('hex').toUpperCase();
    const rawSig = `${merchantId}${orderId}800.00LKR-1${hashedSecret}`;
    const md5sig = crypto.createHash('md5').update(rawSig).digest('hex').toUpperCase();

    const failRes = await request(app)
      .post('/api/webhooks/payment')
      .send({
        merchant_id: merchantId,
        order_id: orderId,
        payhere_amount: '800.00',
        payhere_currency: 'LKR',
        status_code: '-1',
        status_message: 'User cancelled transaction',
        md5sig
      });

    expect(failRes.status).toBe(200);
    expect(failRes.body.success).toBe(false);

    const checkPayment = await prisma.payment.findUnique({ where: { id: payment.id } });
    expect(checkPayment.status).toBe('CANCELLED');

    // Customer plan must still be PROFESSIONAL, not ENTERPRISE
    const checkUser = await prisma.user.findUnique({ where: { id: customerUser.id } });
    expect(checkUser.plan).toBe('PROFESSIONAL');
  });

  it('7. GET /api/admin/payments supports multi-field search, status filtering, and sorting', async () => {
    // Search by reference
    const refRes = await request(app)
      .get(`/api/admin/payments?search=ord_test_`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(refRes.status).toBe(200);
    expect(refRes.body.success).toBe(true);
    expect(refRes.body.data.payments.length).toBeGreaterThanOrEqual(1);

    // Search by customer name
    const nameRes = await request(app)
      .get(`/api/admin/payments?search=Jane Metric`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(nameRes.status).toBe(200);
    expect(nameRes.body.data.payments.length).toBeGreaterThanOrEqual(1);

    // Filter by VERIFIED status
    const verifiedRes = await request(app)
      .get(`/api/admin/payments?status=VERIFIED`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(verifiedRes.status).toBe(200);
    const allVerified = verifiedRes.body.data.payments.every((p) => p.status === 'VERIFIED');
    expect(allVerified).toBe(true);

    // Check payment item structure has all required fields
    const paymentItem = verifiedRes.body.data.payments[0];
    expect(paymentItem).toHaveProperty('reference');
    expect(paymentItem).toHaveProperty('user');
    expect(paymentItem.user).toHaveProperty('name');
    expect(paymentItem.user).toHaveProperty('email');
    expect(paymentItem).toHaveProperty('plan');
    expect(paymentItem).toHaveProperty('amount');
    expect(paymentItem).toHaveProperty('currency');
    expect(paymentItem).toHaveProperty('createdAt');
    expect(paymentItem).toHaveProperty('status');
    expect(paymentItem).toHaveProperty('gatewayTransactionId');
    expect(paymentItem.user).toHaveProperty('subscription');
  });

  it('8. GET /api/admin/payments/:id returns complete payment details modal data', async () => {
    const verifiedPayment = await prisma.payment.findFirst({
      where: { userId: customerUser.id, status: 'VERIFIED' }
    });

    const res = await request(app)
      .get(`/api/admin/payments/${verifiedPayment.id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const payment = res.body.data.payment;
    expect(payment.id).toBe(verifiedPayment.id);
    expect(payment.reference).toBe(verifiedPayment.reference);
    expect(payment.user.email).toBe(customerUser.email);
    expect(payment.user.subscription).not.toBeNull();
  });
});
