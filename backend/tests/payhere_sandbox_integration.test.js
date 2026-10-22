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

describe('PayHere Sandbox Integration & Webhook Security Suite', () => {
  const testMerchantId = '1238763';
  const testMerchantSecret = 'TEST_SANDBOX_SECRET_987654321';
  let testUser;
  let userToken;

  beforeAll(async () => {
    // Set test sandbox environment variables for tests
    process.env.PAYHERE_MERCHANT_ID = testMerchantId;
    process.env.PAYHERE_MERCHANT_SECRET = testMerchantSecret;
    process.env.PAYHERE_SECRET = testMerchantSecret;
    process.env.PAYHERE_SANDBOX = 'true';
    process.env.PAYHERE_NOTIFY_URL = 'https://socialflow-tunnel.loca.lt/api/webhooks/payment';
    process.env.FRONTEND_URL = 'http://localhost:5180';

    const passwordHash = await bcrypt.hash('TestPass2026!', 10);
    testUser = await prisma.user.upsert({
      where: { email: 'payhere_test_user@socialsync.ai' },
      update: { plan: 'FREE', credits: 200 },
      create: {
        name: 'PayHere Tester',
        email: 'payhere_test_user@socialsync.ai',
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

  it('1. generatePayHereCheckoutHash: Correctly generates MD5 uppercase hash with 2-decimal amount', () => {
    const orderId = 'order_test_1001';
    const amount = 1000;
    const currency = 'LKR';

    const calculatedHash = generatePayHereCheckoutHash({
      merchantId: testMerchantId,
      orderId,
      amount,
      currency,
      merchantSecret: testMerchantSecret
    });

    // Verification formula according to official PayHere documentation:
    const formattedAmount = '1000.00';
    const hashedSecret = crypto.createHash('md5').update(testMerchantSecret).digest('hex').toUpperCase();
    const expectedRaw = `${testMerchantId}${orderId}${formattedAmount}${currency}${hashedSecret}`;
    const expectedHash = crypto.createHash('md5').update(expectedRaw).digest('hex').toUpperCase();

    expect(calculatedHash).toBe(expectedHash);
    expect(calculatedHash).toMatch(/^[A-F0-9]{32}$/);
  });

  it('2. verifyPayHereSignature: Verifies authentic signatures and rejects forged signatures', () => {
    const orderId = 'order_verify_1002';
    const amount = '1000.00';
    const currency = 'LKR';
    const statusCode = '2';

    const hashedSecret = crypto.createHash('md5').update(testMerchantSecret).digest('hex').toUpperCase();
    const validRaw = `${testMerchantId}${orderId}${amount}${currency}${statusCode}${hashedSecret}`;
    const validMd5sig = crypto.createHash('md5').update(validRaw).digest('hex').toUpperCase();

    // Authentic signature passes
    const isValid = verifyPayHereSignature({
      merchantId: testMerchantId,
      orderId,
      amount,
      currency,
      statusCode,
      receivedMd5sig: validMd5sig
    });
    expect(isValid).toBe(true);

    // Tampered orderId is rejected
    const isTamperedOrder = verifyPayHereSignature({
      merchantId: testMerchantId,
      orderId: 'tampered_order',
      amount,
      currency,
      statusCode,
      receivedMd5sig: validMd5sig
    });
    expect(isTamperedOrder).toBe(false);

    // Tampered amount is rejected
    const isTamperedAmount = verifyPayHereSignature({
      merchantId: testMerchantId,
      orderId,
      amount: '500.00',
      currency,
      statusCode,
      receivedMd5sig: validMd5sig
    });
    expect(isTamperedAmount).toBe(false);

    // Tampered status code is rejected
    const isTamperedStatus = verifyPayHereSignature({
      merchantId: testMerchantId,
      orderId,
      amount,
      currency,
      statusCode: '0',
      receivedMd5sig: validMd5sig
    });
    expect(isTamperedStatus).toBe(false);
  });

  it('3. POST /api/subscriptions/checkout-session: Initializes checkout without leaking Merchant Secret', async () => {
    const res = await request(app)
      .post('/api/subscriptions/checkout-session')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        plan: 'CREATOR',
        amount: 1000,
        currency: 'LKR'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const session = res.body.data;
    expect(session.orderId).toBeDefined();
    expect(session.paymentId).toBeDefined();
    expect(session.notifyUrl).toBe('https://socialflow-tunnel.loca.lt/api/webhooks/payment');
    expect(session.returnUrl).toContain('payment=success');
    expect(session.cancelUrl).toContain('payment=cancelled');

    // PayHere payload validation
    expect(session.payhere).toBeDefined();
    expect(session.payhere.merchant_id).toBe(testMerchantId);
    expect(session.payhere.amount).toBe('1000.00');
    expect(session.payhere.currency).toBe('LKR');
    expect(session.payhere.hash).toBeDefined();
    expect(session.payhere.sandbox).toBe(true);

    // CRITICAL SECURITY REQUIREMENT: Merchant Secret must NEVER be returned to client
    const responseString = JSON.stringify(res.body);
    expect(responseString).not.toContain(testMerchantSecret);
  });

  it('4. POST /api/webhooks/payment: Rejects forged/unverified PayHere notifications with HTTP 400', async () => {
    const orderId = `ss_sub_fake_${Date.now()}`;

    // Create a pending payment
    await prisma.payment.create({
      data: {
        userId: testUser.id,
        amount: 1000,
        currency: 'LKR',
        plan: 'CREATOR',
        status: 'PENDING',
        reference: orderId,
        idempotencyKey: `idemp_${orderId}`
      }
    });

    const res = await request(app)
      .post('/api/webhooks/payment')
      .send({
        merchant_id: testMerchantId,
        order_id: orderId,
        payhere_amount: '1000.00',
        payhere_currency: 'LKR',
        status_code: '2',
        md5sig: 'FORGED_INVALID_SIGNATURE_12345'
      });

    expect(res.status).toBe(400);

    // Verify payment was NOT updated
    const payment = await prisma.payment.findUnique({ where: { reference: orderId } });
    expect(payment.status).toBe('PENDING');
  });

  it('5. POST /api/webhooks/payment: Verifies valid notification, upgrades plan, allocates credits, and enforces idempotency', async () => {
    // Reset user to FREE with 200 credits
    await prisma.user.update({
      where: { id: testUser.id },
      data: { plan: 'FREE', credits: 200 }
    });

    // 1. Initialize checkout session
    const sessionRes = await request(app)
      .post('/api/subscriptions/checkout-session')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        plan: 'CREATOR',
        amount: 1000,
        currency: 'LKR'
      });

    const orderId = sessionRes.body.data.orderId;
    const paymentId = `payhere_tx_${Date.now()}`;
    const amount = '1000.00';
    const currency = 'LKR';
    const statusCode = '2';

    // 2. Generate authentic PayHere MD5 signature
    const hashedSecret = crypto.createHash('md5').update(testMerchantSecret).digest('hex').toUpperCase();
    const rawSig = `${testMerchantId}${orderId}${amount}${currency}${statusCode}${hashedSecret}`;
    const authenticMd5sig = crypto.createHash('md5').update(rawSig).digest('hex').toUpperCase();

    // 3. Send Webhook Notification
    const webhookRes = await request(app)
      .post('/api/webhooks/payment')
      .send({
        merchant_id: testMerchantId,
        order_id: orderId,
        payment_id: paymentId,
        payhere_amount: amount,
        payhere_currency: currency,
        status_code: statusCode,
        md5sig: authenticMd5sig
      });

    expect(webhookRes.status).toBe(200);
    expect(webhookRes.body.success).toBe(true);
    expect(webhookRes.body.processed).toBe(true);

    // 4. Verify Database Updates
    const updatedUser = await prisma.user.findUnique({
      where: { id: testUser.id },
      include: { subscription: true }
    });

    // Plan upgraded to CREATOR
    expect(updatedUser.plan).toBe('CREATOR');
    // Credits updated to Creator allocation (500)
    expect(updatedUser.credits).toBe(500);

    // Subscription created & ACTIVE
    expect(updatedUser.subscription).toBeDefined();
    expect(updatedUser.subscription.status).toBe('ACTIVE');
    expect(updatedUser.subscription.plan).toBe('CREATOR');
    expect(updatedUser.subscription.gateway).toBe('PAYHERE');

    // Payment marked VERIFIED
    const verifiedPayment = await prisma.payment.findUnique({ where: { reference: orderId } });
    expect(verifiedPayment.status).toBe('VERIFIED');
    expect(verifiedPayment.gatewayTransactionId).toBe(paymentId);

    // Credit transaction created
    const creditTx = await prisma.creditTransaction.findFirst({
      where: { userId: testUser.id, type: 'PACKAGE_UPGRADE' },
      orderBy: { createdAt: 'desc' }
    });
    expect(creditTx).toBeDefined();
    expect(creditTx.balanceAfter).toBe(500);

    // 5. Enforce Idempotency: Duplicate webhook callback does not double-allocate credits
    const duplicateWebhookRes = await request(app)
      .post('/api/webhooks/payment')
      .send({
        merchant_id: testMerchantId,
        order_id: orderId,
        payment_id: paymentId,
        payhere_amount: amount,
        payhere_currency: currency,
        status_code: statusCode,
        md5sig: authenticMd5sig
      });

    expect(duplicateWebhookRes.status).toBe(200);
    expect(duplicateWebhookRes.body.processed).toBe(false);

    // User balance remains 500 (not duplicated)
    const userAfterDuplicate = await prisma.user.findUnique({ where: { id: testUser.id } });
    expect(userAfterDuplicate.credits).toBe(500);
  });

  it('6. Recurring Checkout Session: Includes recurrence (1 Month) and duration (Forever) for paid plans', async () => {
    const res = await request(app)
      .post('/api/subscriptions/checkout-session')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        plan: 'CREATOR',
        amount: 1000,
        currency: 'LKR',
        billingCycle: 'RECURRING'
      });

    expect(res.status).toBe(200);
    const session = res.body.data;
    expect(session.recurrence).toBe('1 Month');
    expect(session.duration).toBe('Forever');
    expect(session.payhere.recurrence).toBe('1 Month');
    expect(session.payhere.duration).toBe('Forever');
    expect(session.payhere.amount).toBe('1000.00');
    expect(session.payhere.currency).toBe('LKR');
    expect(session.payhere.actionUrl).toContain('payhere.lk/pay/checkout');
  });

  it('7. AUTHORIZATION_SUCCESS: Stores subscription_id, masked card info, and activates subscription', async () => {
    const sessionRes = await request(app)
      .post('/api/subscriptions/checkout-session')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        plan: 'PROFESSIONAL',
        amount: 2500,
        currency: 'LKR'
      });

    const orderId = sessionRes.body.data.orderId;
    const paymentId = `auth_tx_${Date.now()}`;
    const subscriptionId = `sub_ph_${Date.now()}`;
    const amount = '2500.00';
    const currency = 'LKR';
    const statusCode = '2';

    const hashedSecret = crypto.createHash('md5').update(testMerchantSecret).digest('hex').toUpperCase();
    const rawSig = `${testMerchantId}${orderId}${amount}${currency}${statusCode}${hashedSecret}`;
    const md5sig = crypto.createHash('md5').update(rawSig).digest('hex').toUpperCase();

    const webhookRes = await request(app)
      .post('/api/webhooks/payment')
      .send({
        merchant_id: testMerchantId,
        order_id: orderId,
        payment_id: paymentId,
        subscription_id: subscriptionId,
        payhere_amount: amount,
        payhere_currency: currency,
        status_code: statusCode,
        message_type: 'AUTHORIZATION_SUCCESS',
        method: 'VISA',
        card_holder_name: 'Jane Doe',
        card_no: '************4242',
        md5sig
      });

    expect(webhookRes.status).toBe(200);
    expect(webhookRes.body.success).toBe(true);
    expect(webhookRes.body.event).toBe('AUTHORIZATION_SUCCESS');

    // Verify UserSubscription was created with subscription_id and masked card details
    const sub = await prisma.userSubscription.findUnique({
      where: { userId: testUser.id }
    });
    expect(sub).toBeDefined();
    expect(sub.status).toBe('ACTIVE');
    expect(sub.plan).toBe('PROFESSIONAL');
    expect(sub.gatewaySubscriptionId).toBe(subscriptionId);
    expect(sub.cardBrand).toBe('VISA');
    expect(sub.cardLast4).toBe('4242');
    expect(sub.cardholderName).toBe('Jane Doe');
    expect(sub.autoRenew).toBe(true);

    // Verify credits were set to Professional plan (1500)
    const user = await prisma.user.findUnique({ where: { id: testUser.id } });
    expect(user.plan).toBe('PROFESSIONAL');
    expect(user.credits).toBe(1500);
  });

  it('8. RECURRING_INSTALLMENT_SUCCESS: Allocates monthly credits, advances renewal date, and enforces idempotency', async () => {
    // Current user subscription from previous test
    const subBefore = await prisma.userSubscription.findUnique({
      where: { userId: testUser.id }
    });
    expect(subBefore).toBeDefined();
    const subId = subBefore.gatewaySubscriptionId;
    const currentCredits = (await prisma.user.findUnique({ where: { id: testUser.id } })).credits;

    const installmentOrderId = `inst_ord_${Date.now()}`;
    const installmentPaymentId = `inst_tx_${Date.now()}`;
    const amount = '2500.00';
    const currency = 'LKR';
    const statusCode = '2';

    const hashedSecret = crypto.createHash('md5').update(testMerchantSecret).digest('hex').toUpperCase();
    const rawSig = `${testMerchantId}${installmentOrderId}${amount}${currency}${statusCode}${hashedSecret}`;
    const md5sig = crypto.createHash('md5').update(rawSig).digest('hex').toUpperCase();

    // 1. Process 1st Installment Webhook
    const installmentRes = await request(app)
      .post('/api/webhooks/payment')
      .send({
        merchant_id: testMerchantId,
        order_id: installmentOrderId,
        payment_id: installmentPaymentId,
        subscription_id: subId,
        payhere_amount: amount,
        payhere_currency: currency,
        status_code: statusCode,
        message_type: 'RECURRING_INSTALLMENT_SUCCESS',
        method: 'VISA',
        md5sig
      });

    expect(installmentRes.status).toBe(200);
    expect(installmentRes.body.success).toBe(true);
    expect(installmentRes.body.event).toBe('RECURRING_INSTALLMENT_SUCCESS');
    expect(installmentRes.body.processed).toBe(true);

    // Verify user received monthly credits (+1500)
    const userAfterInstallment = await prisma.user.findUnique({ where: { id: testUser.id } });
    expect(userAfterInstallment.credits).toBe(currentCredits + 1500);

    // Verify next billing date advanced
    const subAfter = await prisma.userSubscription.findUnique({ where: { userId: testUser.id } });
    expect(subAfter.status).toBe('ACTIVE');
    expect(subAfter.nextBillingDate.getTime()).toBeGreaterThan(subBefore.nextBillingDate.getTime());

    // 2. Enforce Idempotency: Duplicate callback with same payment_id does NOT grant duplicate credits
    const duplicateRes = await request(app)
      .post('/api/webhooks/payment')
      .send({
        merchant_id: testMerchantId,
        order_id: installmentOrderId,
        payment_id: installmentPaymentId,
        subscription_id: subId,
        payhere_amount: amount,
        payhere_currency: currency,
        status_code: statusCode,
        message_type: 'RECURRING_INSTALLMENT_SUCCESS',
        md5sig
      });

    expect(duplicateRes.status).toBe(200);
    expect(duplicateRes.body.processed).toBe(false);
    expect(duplicateRes.body.alreadyProcessed).toBe(true);

    // Credits remain exactly the same, no duplicate points
    const userAfterDuplicate = await prisma.user.findUnique({ where: { id: testUser.id } });
    expect(userAfterDuplicate.credits).toBe(userAfterInstallment.credits);
  });

  it('9. RECURRING_INSTALLMENT_FAILED: Increments failed attempts and marks subscription PAST_DUE', async () => {
    const subBefore = await prisma.userSubscription.findUnique({ where: { userId: testUser.id } });
    const subId = subBefore.gatewaySubscriptionId;
    const orderId = `failed_ord_${Date.now()}`;
    const amount = '2500.00';
    const currency = 'LKR';
    const statusCode = '-2';

    const hashedSecret = crypto.createHash('md5').update(testMerchantSecret).digest('hex').toUpperCase();
    const rawSig = `${testMerchantId}${orderId}${amount}${currency}${statusCode}${hashedSecret}`;
    const md5sig = crypto.createHash('md5').update(rawSig).digest('hex').toUpperCase();

    const res = await request(app)
      .post('/api/webhooks/payment')
      .send({
        merchant_id: testMerchantId,
        order_id: orderId,
        payment_id: `declined_tx_${Date.now()}`,
        subscription_id: subId,
        payhere_amount: amount,
        payhere_currency: currency,
        status_code: statusCode,
        message_type: 'RECURRING_INSTALLMENT_FAILED',
        status_message: 'Card declined - Insufficient funds',
        md5sig
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(false);
    expect(res.body.event).toBe('RECURRING_INSTALLMENT_FAILED');

    const subAfter = await prisma.userSubscription.findUnique({ where: { userId: testUser.id } });
    expect(subAfter.status).toBe('PAST_DUE');
    expect(subAfter.failedAttempts).toBeGreaterThan(0);
  });

  it('10. RECURRING_STOPPED: Updates subscription status to CANCELLED and stops auto-renew', async () => {
    const subBefore = await prisma.userSubscription.findUnique({ where: { userId: testUser.id } });
    const subId = subBefore.gatewaySubscriptionId;
    const orderId = `stop_ord_${Date.now()}`;
    const amount = '2500.00';
    const currency = 'LKR';
    const statusCode = '-2';

    const hashedSecret = crypto.createHash('md5').update(testMerchantSecret).digest('hex').toUpperCase();
    const rawSig = `${testMerchantId}${orderId}${amount}${currency}${statusCode}${hashedSecret}`;
    const md5sig = crypto.createHash('md5').update(rawSig).digest('hex').toUpperCase();

    const res = await request(app)
      .post('/api/webhooks/payment')
      .send({
        merchant_id: testMerchantId,
        order_id: orderId,
        subscription_id: subId,
        payhere_amount: amount,
        payhere_currency: currency,
        status_code: statusCode,
        message_type: 'RECURRING_STOPPED',
        item_rec_status: '-1',
        status_message: 'Recurring profile canceled after max retries',
        md5sig
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.event).toBe('RECURRING_STOPPED');

    const subAfter = await prisma.userSubscription.findUnique({ where: { userId: testUser.id } });
    expect(subAfter.status).toBe('CANCELLED');
    expect(subAfter.autoRenew).toBe(false);
  });

  it('11. POST /api/subscriptions/cancel: User can cancel auto-renew and access continues until period end', async () => {
    // Reactivate subscription for user
    const futureDate = new Date(Date.now() + 20 * 24 * 60 * 60 * 1000);
    await prisma.userSubscription.update({
      where: { userId: testUser.id },
      data: {
        status: 'ACTIVE',
        autoRenew: true,
        cancelAtPeriodEnd: false,
        currentPeriodEnd: futureDate
      }
    });

    const res = await request(app)
      .post('/api/subscriptions/cancel')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ reason: 'Testing user self-serve cancel auto-renew' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const sub = await prisma.userSubscription.findUnique({ where: { userId: testUser.id } });
    expect(sub.autoRenew).toBe(false);
    expect(sub.cancelAtPeriodEnd).toBe(true);
    expect(sub.status).toBe('CANCELLATION_SCHEDULED');
    expect(new Date(sub.cancellationEffectiveDate).getTime()).toBe(futureDate.getTime());
  });

  it('12. Hybrid Checkout: Supports both ONE_TIME (All PayHere options) and RECURRING (Card auto-renew)', async () => {
    // Test ONE_TIME session (unlocks all payment methods: eZ Cash, FriMi, Genie, Vishwa, Cards)
    const oneTimeRes = await request(app)
      .post('/api/subscriptions/checkout-session')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        plan: 'CREATOR',
        amount: 1000,
        currency: 'LKR',
        billingCycle: 'ONE_TIME'
      });

    expect(oneTimeRes.status).toBe(200);
    expect(oneTimeRes.body.success).toBe(true);
    expect(oneTimeRes.body.data.billingCycle).toBe('ONE_TIME');
    expect(oneTimeRes.body.data.recurrence).toBeUndefined();
    expect(oneTimeRes.body.data.duration).toBeUndefined();
    expect(oneTimeRes.body.data.payhere.recurrence).toBeUndefined();
    expect(oneTimeRes.body.data.payhere.duration).toBeUndefined();
    expect(oneTimeRes.body.data.payhere.items).toContain('1-Month');

    // Test RECURRING session (card-on-file auto-renew)
    const recurringRes = await request(app)
      .post('/api/subscriptions/checkout-session')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        plan: 'CREATOR',
        amount: 1000,
        currency: 'LKR',
        billingCycle: 'RECURRING'
      });

    expect(recurringRes.status).toBe(200);
    expect(recurringRes.body.success).toBe(true);
    expect(recurringRes.body.data.billingCycle).toBe('RECURRING');
    expect(recurringRes.body.data.recurrence).toBe('1 Month');
    expect(recurringRes.body.data.duration).toBe('Forever');
    expect(recurringRes.body.data.payhere.recurrence).toBe('1 Month');
    expect(recurringRes.body.data.payhere.duration).toBe('Forever');
    expect(recurringRes.body.data.payhere.items).toContain('Monthly Recurring');
  });

  it('13. Backend Authoritative Pricing: Rejects tampered amounts and enforces configured plan prices', async () => {
    // Creator: attempted amount 50 LKR -> backend forces 1000.00 LKR
    const creatorRes = await request(app)
      .post('/api/subscriptions/checkout-session')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        plan: 'CREATOR',
        amount: 50, // Tampered amount
        currency: 'LKR',
        customer: {
          firstName: 'Security',
          lastName: 'Tester',
          phone: '0712345678',
          city: 'Colombo',
          address: '42 Lotus Road'
        }
      });

    expect(creatorRes.status).toBe(200);
    expect(creatorRes.body.data.amount).toBe(1000);
    expect(creatorRes.body.data.payhere.amount).toBe('1000.00');

    // Professional: attempted amount 100 LKR -> backend forces 2500.00 LKR
    const proRes = await request(app)
      .post('/api/subscriptions/checkout-session')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        plan: 'PROFESSIONAL',
        amount: 100, // Tampered amount
        currency: 'LKR',
        customer: {
          firstName: 'Security',
          lastName: 'Tester',
          phone: '0712345678',
          city: 'Colombo',
          address: '42 Lotus Road'
        }
      });

    expect(proRes.status).toBe(200);
    expect(proRes.body.data.amount).toBe(2500);
    expect(proRes.body.data.payhere.amount).toBe('2500.00');
  });

  it('14. Billing Validation: Rejects missing or invalid phone, city, or address', async () => {
    // Missing phone
    const missingPhoneRes = await request(app)
      .post('/api/subscriptions/checkout-session')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        plan: 'CREATOR',
        customer: {
          firstName: 'Jane',
          phone: '',
          city: 'Kandy',
          address: '10 Temple Road'
        }
      });
    expect(missingPhoneRes.status).toBe(400);
    expect(missingPhoneRes.body.error || missingPhoneRes.body.message).toMatch(/phone/i);

    // Short phone
    const shortPhoneRes = await request(app)
      .post('/api/subscriptions/checkout-session')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        plan: 'CREATOR',
        customer: {
          firstName: 'Jane',
          phone: '123',
          city: 'Kandy',
          address: '10 Temple Road'
        }
      });
    expect(shortPhoneRes.status).toBe(400);
    expect(shortPhoneRes.body.error || shortPhoneRes.body.message).toMatch(/phone/i);

    // Missing city
    const missingCityRes = await request(app)
      .post('/api/subscriptions/checkout-session')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        plan: 'CREATOR',
        customer: {
          firstName: 'Jane',
          phone: '0779998888',
          city: '',
          address: '10 Temple Road'
        }
      });
    expect(missingCityRes.status).toBe(400);
    expect(missingCityRes.body.error || missingCityRes.body.message).toMatch(/city/i);

    // Missing address
    const missingAddressRes = await request(app)
      .post('/api/subscriptions/checkout-session')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        plan: 'CREATOR',
        customer: {
          firstName: 'Jane',
          phone: '0779998888',
          city: 'Galle',
          address: ''
        }
      });
    expect(missingAddressRes.status).toBe(400);
    expect(missingAddressRes.body.error || missingAddressRes.body.message).toMatch(/address/i);
  });

  it('15. Profile Persistence: Persists updated billing contact to user profile for future checkouts', async () => {
    const updatedPhone = '0775551234';
    const updatedCity = 'Negombo';
    const updatedAddress = '15 Beach Road';

    const sessionRes = await request(app)
      .post('/api/subscriptions/checkout-session')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        plan: 'CREATOR',
        customer: {
          firstName: 'Auto',
          lastName: 'Persist',
          phone: updatedPhone,
          city: updatedCity,
          address: updatedAddress
        }
      });

    expect(sessionRes.status).toBe(200);

    // Verify database record for user now contains these billing details
    const dbUser = await prisma.user.findUnique({
      where: { id: testUser.id },
      select: { phone: true, city: true, address: true, country: true }
    });

    expect(dbUser.phone).toBe(updatedPhone);
    expect(dbUser.city).toBe(updatedCity);
    expect(dbUser.address).toBe(updatedAddress);
  });

  it('16. Return Experience: Embedded orderId in return URL and pending state verification', async () => {
    const sessionRes = await request(app)
      .post('/api/subscriptions/checkout-session')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        plan: 'PROFESSIONAL',
        returnUrl: 'http://localhost:5180/packages?payment=success',
        customer: {
          phone: '0775551234',
          city: 'Colombo',
          address: '100 Galle Face'
        }
      });

    expect(sessionRes.status).toBe(200);
    const orderId = sessionRes.body.data.orderId;
    expect(sessionRes.body.data.returnUrl).toContain(`order_id=${orderId}`);

    // Call confirm-payment before webhook notification has arrived: should report pending without activating
    const confirmRes = await request(app)
      .post('/api/subscriptions/confirm-payment')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ orderId });

    expect([200, 202]).toContain(confirmRes.status);
    expect(confirmRes.body.status || confirmRes.body.data?.payment?.status).toBe('PENDING');
  });
});
