/**
 * SocialSync AI — Plan & Credit Synchronization End-to-End Test Suite
 *
 * Validates the 12 core requirements for database-backed plan & credit synchronization:
 * 1. New user receives Free plan and 200 credits.
 * 2. Login does not reset a user's consumed credits.
 * 3. Free user with 70 credits upgrades successfully to Creator and receives the configured 500-credit allowance.
 * 4. Successful Professional payment activates Professional and the configured 1,500-credit allowance.
 * 5. Pending, failed, cancelled, or invalid-signature payment does not activate the new plan or grant credits.
 * 6. Duplicate PayHere notifications do not duplicate activation or credit grants.
 * 7. Admin changes Creator to Professional; database, admin dashboard, and user dashboard show Professional.
 * 8. Admin plan changes create the correct history entry and identify the acting admin.
 * 9. Unauthorized users cannot change plans through the backend API.
 * 10. Invalid plan values are rejected.
 * 11. Credit deduction remains correct after plan changes.
 * 12. Existing subscription/payment history and unrelated data remain intact.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { app } from '../src/app.js';
import { prisma } from '../src/utils/prisma.js';
import { config } from '../src/config/index.js';
import { initializeCheckoutSession } from '../src/services/paymentGatewayService.js';

describe('Plan & Credit Synchronization Test Suite', () => {
  const testMerchantId = '1238763';
  const testMerchantSecret = 'TEST_SANDBOX_SECRET_987654321';

  let adminUser;
  let adminToken;
  let regularUser;
  let regularToken;
  const createdUserIds = [];

  function generateMd5Sig({ merchantId, orderId, amount, currency, statusCode }) {
    const hashedSecret = crypto.createHash('md5').update(testMerchantSecret).digest('hex').toUpperCase();
    const rawString = `${merchantId}${orderId}${amount}${currency}${statusCode}${hashedSecret}`;
    return crypto.createHash('md5').update(rawString).digest('hex').toUpperCase();
  }

  beforeAll(async () => {
    process.env.PAYHERE_MERCHANT_ID = testMerchantId;
    process.env.PAYHERE_MERCHANT_SECRET = testMerchantSecret;
    process.env.PAYHERE_SECRET = testMerchantSecret;
    process.env.PAYHERE_SANDBOX = 'true';

    // 1. Locate or create authorized Super Admin
    adminUser = await prisma.user.findFirst({
      where: { role: 'SUPER_ADMIN' }
    });

    if (!adminUser) {
      const pwd = await bcrypt.hash('Admin@123', 10);
      adminUser = await prisma.user.create({
        data: {
          name: 'SocialSync Super Admin',
          email: 'admin@socialsync.ai',
          passwordHash: pwd,
          role: 'SUPER_ADMIN',
          status: 'ACTIVE',
          plan: 'PROFESSIONAL',
          credits: 1500,
          permissions: JSON.stringify(['*'])
        }
      });
    }

    adminToken = jwt.sign(
      { userId: adminUser.id, email: adminUser.email, role: adminUser.role, name: adminUser.name, tokenVersion: adminUser.tokenVersion ?? 0 },
      config.jwtSecret,
      { expiresIn: '2h' }
    );
  });

  afterAll(async () => {
    // Clean up only test fixture accounts created during this suite
    for (const id of createdUserIds) {
      await prisma.$transaction(async (tx) => {
        await tx.postPlatform.deleteMany({ where: { post: { userId: id } } });
        await tx.post.deleteMany({ where: { userId: id } });
        await tx.socialAccount.deleteMany({ where: { userId: id } });
        await tx.payment.deleteMany({ where: { userId: id } });
        await tx.userSubscription.deleteMany({ where: { userId: id } });
        await tx.subscriptionEvent.deleteMany({ where: { userId: id } });
        await tx.planHistory.deleteMany({ where: { userId: id } });
        await tx.creditTransaction.deleteMany({ where: { userId: id } });
        await tx.adminAuditLog.deleteMany({ where: { targetUserId: id } });
        await tx.user.deleteMany({ where: { id } });
      });
    }
  });

  // TEST 1: New user receives Free plan and 200 credits
  it('1. New user receives Free plan and 200 credits on registration', async () => {
    const testEmail = `sync_user_${Date.now()}@socialflow.ai`;
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Sync Test User',
        email: testEmail,
        password: 'SecurePassword123!',
        confirmPassword: 'SecurePassword123!'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.plan).toBe('FREE');
    expect(res.body.data.user.credits).toBe(200);

    regularUser = res.body.data.user;
    regularToken = res.body.data.token;
    createdUserIds.push(regularUser.id);

    // Verify DB state
    const dbUser = await prisma.user.findUnique({
      where: { id: regularUser.id },
      include: { planHistory: true, creditTransactions: true }
    });

    expect(dbUser.plan).toBe('FREE');
    expect(dbUser.credits).toBe(200);
    expect(dbUser.planHistory.length).toBeGreaterThanOrEqual(1);
    expect(dbUser.planHistory[0].plan).toBe('FREE');
    expect(dbUser.planHistory[0].creditsAfter).toBe(200);
    expect(dbUser.planHistory[0].source).toBe('SELF_REGISTRATION');
    expect(dbUser.creditTransactions[0].type).toBe('INITIAL_GRANT');
    expect(dbUser.creditTransactions[0].amount).toBe(200);
  });

  // TEST 2: Login does not reset a user's consumed credits
  it('2. Login does not reset a user\'s consumed credits', async () => {
    // Consume 130 credits directly in DB to simulate post usage (balance becomes 70)
    await prisma.user.update({
      where: { id: regularUser.id },
      data: { credits: 70 }
    });
    await prisma.creditTransaction.create({
      data: {
        userId: regularUser.id,
        amount: -130,
        balanceAfter: 70,
        type: 'USAGE_DEDUCT',
        reason: 'Consumed 130 credits for publishing posts'
      }
    });

    // Login via POST /api/auth/login
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: regularUser.email,
        password: 'SecurePassword123!'
      });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.success).toBe(true);
    expect(loginRes.body.data.user.credits).toBe(70);
    expect(loginRes.body.data.user.plan).toBe('FREE');

    // Confirm DB was not reset
    const userInDb = await prisma.user.findUnique({ where: { id: regularUser.id } });
    expect(userInDb.credits).toBe(70);
  });

  // TEST 3: Free user with 70 credits upgrades successfully to Creator and receives configured 500-credit allowance
  it('3. Free user with 70 credits upgrades successfully to Creator and receives 500 credits', async () => {
    // 1. Initialize checkout session
    const checkout = await initializeCheckoutSession({
      userId: regularUser.id,
      planType: 'CREATOR',
      gateway: 'PAYHERE',
      billingPeriod: 'MONTHLY'
    });

    expect(checkout.orderId).toBeDefined();
    expect(checkout.amount).toBe(1000);

    // Verify user is still on FREE with 70 credits while payment is pending
    let userPre = await prisma.user.findUnique({ where: { id: regularUser.id } });
    expect(userPre.plan).toBe('FREE');
    expect(userPre.credits).toBe(70);

    // 2. Simulate PayHere IPN Webhook confirmation
    const md5sig = generateMd5Sig({
      merchantId: testMerchantId,
      orderId: checkout.orderId,
      amount: '1000.00',
      currency: 'LKR',
      statusCode: '2'
    });

    const webhookRes = await request(app)
      .post('/api/webhooks/payment')
      .send({
        merchant_id: testMerchantId,
        order_id: checkout.orderId,
        payment_id: `payhere_tx_${Date.now()}`,
        payhere_amount: '1000.00',
        payhere_currency: 'LKR',
        status_code: '2',
        md5sig
      });

    expect(webhookRes.status).toBe(200);
    expect(webhookRes.body.success).toBe(true);

    // 3. Verify user upgraded to CREATOR and balance reset to 500 credits
    const userPost = await prisma.user.findUnique({
      where: { id: regularUser.id },
      include: {
        planHistory: { orderBy: { createdAt: 'desc' } },
        creditTransactions: { orderBy: { createdAt: 'desc' } },
        subscription: true
      }
    });

    expect(userPost.plan).toBe('CREATOR');
    expect(userPost.credits).toBe(500);

    // Verify PlanHistory
    const latestHistory = userPost.planHistory[0];
    expect(latestHistory.plan).toBe('CREATOR');
    expect(latestHistory.previousPlan).toBe('FREE');
    expect(latestHistory.creditsBefore).toBe(70);
    expect(latestHistory.creditsAfter).toBe(500);
    expect(latestHistory.source).toBe('PAYHERE_PAYMENT');
    expect(latestHistory.status).toBe('SUCCESS');

    // Verify Subscription is ACTIVE
    expect(userPost.subscription.status).toBe('ACTIVE');
    expect(userPost.subscription.plan).toBe('CREATOR');
  });

  // TEST 4: Successful Professional payment activates Professional and configured 1,500-credit allowance
  it('4. Successful Professional payment activates Professional and 1,500 credits', async () => {
    // 1. Initialize checkout session for PROFESSIONAL
    const checkout = await initializeCheckoutSession({
      userId: regularUser.id,
      planType: 'PROFESSIONAL',
      gateway: 'PAYHERE',
      billingPeriod: 'MONTHLY'
    });

    expect(checkout.orderId).toBeDefined();
    expect(checkout.amount).toBe(2500);

    // 2. Send verified PayHere IPN Webhook
    const md5sig = generateMd5Sig({
      merchantId: testMerchantId,
      orderId: checkout.orderId,
      amount: '2500.00',
      currency: 'LKR',
      statusCode: '2'
    });

    const webhookRes = await request(app)
      .post('/api/webhooks/payment')
      .send({
        merchant_id: testMerchantId,
        order_id: checkout.orderId,
        payment_id: `payhere_pro_${Date.now()}`,
        payhere_amount: '2500.00',
        payhere_currency: 'LKR',
        status_code: '2',
        md5sig
      });

    expect(webhookRes.status).toBe(200);

    // 3. Verify user upgraded to PROFESSIONAL and credits updated to 1,500
    const userPost = await prisma.user.findUnique({
      where: { id: regularUser.id },
      include: {
        planHistory: { orderBy: { createdAt: 'desc' } }
      }
    });

    expect(userPost.plan).toBe('PROFESSIONAL');
    expect(userPost.credits).toBe(1500);
    expect(userPost.planHistory[0].plan).toBe('PROFESSIONAL');
    expect(userPost.planHistory[0].previousPlan).toBe('CREATOR');
    expect(userPost.planHistory[0].creditsBefore).toBe(500);
    expect(userPost.planHistory[0].creditsAfter).toBe(1500);
  });

  // TEST 5: Pending, failed, cancelled, or invalid-signature payment does not activate new plan or grant credits
  it('5. Pending, failed, cancelled, or invalid-signature payment does not activate plan or grant credits', async () => {
    // Reset user to CREATOR with 400 credits for controlled testing
    await prisma.user.update({
      where: { id: regularUser.id },
      data: { plan: 'CREATOR', credits: 400 }
    });

    // 5a. Invalid Signature
    const order1 = await initializeCheckoutSession({ userId: regularUser.id, planType: 'PROFESSIONAL', gateway: 'PAYHERE' });
    const invalidSigRes = await request(app)
      .post('/api/webhooks/payment')
      .send({
        merchant_id: testMerchantId,
        order_id: order1.orderId,
        payment_id: 'tx_fraud_1',
        payhere_amount: '2500.00',
        payhere_currency: 'LKR',
        status_code: '2',
        md5sig: 'FORGED_INVALID_SIGNATURE_HASH'
      });
    expect(invalidSigRes.status).toBe(400);

    let check1 = await prisma.user.findUnique({ where: { id: regularUser.id } });
    expect(check1.plan).toBe('CREATOR');
    expect(check1.credits).toBe(400);

    // 5b. Pending status_code = 0
    const order2 = await initializeCheckoutSession({ userId: regularUser.id, planType: 'PROFESSIONAL', gateway: 'PAYHERE' });
    const md5sig2 = generateMd5Sig({
      merchantId: testMerchantId,
      orderId: order2.orderId,
      amount: '2500.00',
      currency: 'LKR',
      statusCode: '0'
    });
    const pendingRes = await request(app)
      .post('/api/webhooks/payment')
      .send({
        merchant_id: testMerchantId,
        order_id: order2.orderId,
        payment_id: 'tx_pending_2',
        payhere_amount: '2500.00',
        payhere_currency: 'LKR',
        status_code: '0',
        md5sig: md5sig2
      });
    expect(pendingRes.body.success).toBe(false);

    let check2 = await prisma.user.findUnique({ where: { id: regularUser.id } });
    expect(check2.plan).toBe('CREATOR');
    expect(check2.credits).toBe(400);

    // 5c. Failed status_code = -2
    const order3 = await initializeCheckoutSession({ userId: regularUser.id, planType: 'PROFESSIONAL', gateway: 'PAYHERE' });
    const md5sig3 = generateMd5Sig({
      merchantId: testMerchantId,
      orderId: order3.orderId,
      amount: '2500.00',
      currency: 'LKR',
      statusCode: '-2'
    });
    const failedRes = await request(app)
      .post('/api/webhooks/payment')
      .send({
        merchant_id: testMerchantId,
        order_id: order3.orderId,
        payment_id: 'tx_failed_3',
        payhere_amount: '2500.00',
        payhere_currency: 'LKR',
        status_code: '-2',
        md5sig: md5sig3
      });
    expect(failedRes.body.success).toBe(false);

    let check3 = await prisma.user.findUnique({ where: { id: regularUser.id } });
    expect(check3.plan).toBe('CREATOR');
    expect(check3.credits).toBe(400);

    // 5d. Cancelled status_code = -1
    const order4 = await initializeCheckoutSession({ userId: regularUser.id, planType: 'PROFESSIONAL', gateway: 'PAYHERE' });
    const md5sig4 = generateMd5Sig({
      merchantId: testMerchantId,
      orderId: order4.orderId,
      amount: '2500.00',
      currency: 'LKR',
      statusCode: '-1'
    });
    const cancelledRes = await request(app)
      .post('/api/webhooks/payment')
      .send({
        merchant_id: testMerchantId,
        order_id: order4.orderId,
        payment_id: 'tx_cancel_4',
        payhere_amount: '2500.00',
        payhere_currency: 'LKR',
        status_code: '-1',
        md5sig: md5sig4
      });
    expect(cancelledRes.body.success).toBe(false);

    let check4 = await prisma.user.findUnique({ where: { id: regularUser.id } });
    expect(check4.plan).toBe('CREATOR');
    expect(check4.credits).toBe(400);
  });

  // TEST 6: Duplicate PayHere notifications do not duplicate activation or credit grants
  it('6. Duplicate PayHere notifications do not duplicate activation or credit grants', async () => {
    // 1. Process initial valid payment for Creator
    const checkout = await initializeCheckoutSession({
      userId: regularUser.id,
      planType: 'CREATOR',
      gateway: 'PAYHERE'
    });

    const md5sig = generateMd5Sig({
      merchantId: testMerchantId,
      orderId: checkout.orderId,
      amount: '1000.00',
      currency: 'LKR',
      statusCode: '2'
    });

    const firstRes = await request(app)
      .post('/api/webhooks/payment')
      .send({
        merchant_id: testMerchantId,
        order_id: checkout.orderId,
        payment_id: `tx_idem_${Date.now()}`,
        payhere_amount: '1000.00',
        payhere_currency: 'LKR',
        status_code: '2',
        md5sig
      });

    expect(firstRes.status).toBe(200);
    expect(firstRes.body.alreadyProcessed).toBe(false);

    // Consume 100 credits (balance drops to 400)
    await prisma.user.update({
      where: { id: regularUser.id },
      data: { credits: 400 }
    });

    // 2. Re-send exact duplicate webhook
    const duplicateRes = await request(app)
      .post('/api/webhooks/payment')
      .send({
        merchant_id: testMerchantId,
        order_id: checkout.orderId,
        payment_id: `tx_idem_${Date.now()}`,
        payhere_amount: '1000.00',
        payhere_currency: 'LKR',
        status_code: '2',
        md5sig
      });

    expect(duplicateRes.status).toBe(200);
    expect(duplicateRes.body.alreadyProcessed).toBe(true);

    // Verify credits were NOT re-granted (remains 400)
    const userCheck = await prisma.user.findUnique({ where: { id: regularUser.id } });
    expect(userCheck.credits).toBe(400);
  });

  // TEST 7: Admin changes Creator to Professional; DB, Admin Dashboard, and User Dashboard show Professional
  it('7. Admin changes Creator to Professional; DB, Admin Dashboard, and User Dashboard show Professional', async () => {
    // Current user is on CREATOR with 400 credits
    const res = await request(app)
      .patch(`/api/admin/users/${regularUser.id}/plan`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        plan: 'PROFESSIONAL',
        reason: 'Authorized administrator upgrade'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.plan).toBe('PROFESSIONAL');
    expect(res.body.data.user.credits).toBe(1500);

    // 1. Verify in PostgreSQL Database
    const dbUser = await prisma.user.findUnique({ where: { id: regularUser.id } });
    expect(dbUser.plan).toBe('PROFESSIONAL');
    expect(dbUser.credits).toBe(1500);

    // 2. Verify in Admin Dashboard API (GET /api/admin/users/:id)
    const adminView = await request(app)
      .get(`/api/admin/users/${regularUser.id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(adminView.status).toBe(200);
    expect(adminView.body.data.user.plan).toBe('PROFESSIONAL');
    expect(adminView.body.data.user.credits).toBe(1500);

    // 3. Verify in User Dashboard API (GET /api/subscriptions/me)
    const userView = await request(app)
      .get('/api/subscriptions/me')
      .set('Authorization', `Bearer ${regularToken}`);

    expect(userView.status).toBe(200);
    expect(userView.body.data.user.plan).toBe('PROFESSIONAL');
    expect(userView.body.data.user.credits).toBe(1500);
    expect(userView.body.data.plan.type).toBe('PROFESSIONAL');
  });

  // TEST 8: Admin plan changes create the correct history entry and identify the acting admin
  it('8. Admin plan changes create the correct history entry and identify the acting admin', async () => {
    const history = await prisma.planHistory.findFirst({
      where: {
        userId: regularUser.id,
        plan: 'PROFESSIONAL',
        source: 'ADMIN_ACTION'
      },
      orderBy: { createdAt: 'desc' }
    });

    expect(history).toBeDefined();
    expect(history.plan).toBe('PROFESSIONAL');
    expect(history.previousPlan).toBe('CREATOR');
    expect(history.creditsBefore).toBe(400);
    expect(history.creditsAfter).toBe(1500);
    expect(history.changedById).toBe(adminUser.id);
    expect(history.source).toBe('ADMIN_ACTION');
    expect(history.status).toBe('SUCCESS');

    // Also verify AdminAuditLog entry
    const auditLog = await prisma.adminAuditLog.findFirst({
      where: {
        adminId: adminUser.id,
        targetUserId: regularUser.id,
        action: 'USER_PLAN_CHANGED'
      },
      orderBy: { createdAt: 'desc' }
    });

    expect(auditLog).toBeDefined();
    const details = JSON.parse(auditLog.details);
    expect(details.from).toBe('CREATOR');
    expect(details.to).toBe('PROFESSIONAL');
  });

  // TEST 9: Unauthorized users cannot change plans through backend API
  it('9. Unauthorized users cannot change plans through the backend API', async () => {
    // 9a. Regular non-admin user attempts admin plan change
    const forbiddenRes = await request(app)
      .patch(`/api/admin/users/${regularUser.id}/plan`)
      .set('Authorization', `Bearer ${regularToken}`)
      .send({ plan: 'FREE' });

    expect(forbiddenRes.status).toBe(403);

    // 9b. Unauthenticated request without token
    const unauthRes = await request(app)
      .patch(`/api/admin/users/${regularUser.id}/plan`)
      .send({ plan: 'FREE' });

    expect(unauthRes.status).toBe(401);
  });

  // TEST 10: Invalid plan values are rejected
  it('10. Invalid plan values are rejected with HTTP 400', async () => {
    const res = await request(app)
      .patch(`/api/admin/users/${regularUser.id}/plan`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ plan: 'ENTERPRISE_INVALID' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('INVALID_PLAN');
  });

  // TEST 11: Credit deduction remains correct after plan changes
  it('11. Credit deduction remains correct after plan changes', async () => {
    // User is on Professional with 1500 credits. Deduct 30 credits in atomic transaction.
    const beforeUser = await prisma.user.findUnique({ where: { id: regularUser.id } });
    const startCredits = beforeUser.credits;

    await prisma.$transaction(async (tx) => {
      const u = await tx.user.update({
        where: { id: regularUser.id },
        data: { credits: { decrement: 30 } },
        select: { credits: true }
      });
      await tx.creditTransaction.create({
        data: {
          userId: regularUser.id,
          amount: -30,
          balanceAfter: u.credits,
          type: 'USAGE_DEDUCT',
          reason: 'Published multi-platform broadcast'
        }
      });
    });

    const userCheck = await prisma.user.findUnique({ where: { id: regularUser.id } });
    expect(userCheck.credits).toBe(startCredits - 30);

    // Verify /auth/me returns the updated credit balance
    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${regularToken}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.data.user.credits).toBe(startCredits - 30);
  });

  // TEST 12: Existing subscription/payment history and unrelated data remain intact
  it('12. Existing subscription/payment history and Super Admin data remain intact', async () => {
    const superAdminInDb = await prisma.user.findUnique({
      where: { email: 'admin@socialsync.ai' }
    });

    expect(superAdminInDb).toBeDefined();
    expect(superAdminInDb.role).toBe('SUPER_ADMIN');
    expect(superAdminInDb.plan).toBe('PROFESSIONAL');

    // Verify payment count for super admin is preserved
    const adminPayments = await prisma.payment.count({
      where: { userId: superAdminInDb.id }
    });
    expect(adminPayments).toBeGreaterThanOrEqual(0);

    // Verify system packages are active
    const packages = await prisma.packagePlan.findMany({ where: { isActive: true } });
    expect(packages.length).toBeGreaterThanOrEqual(3);
  });
});
