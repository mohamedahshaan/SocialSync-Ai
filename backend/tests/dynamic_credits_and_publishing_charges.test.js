import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import axios from 'axios';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { app } from '../src/app.js';
import { prisma } from '../src/utils/prisma.js';
import { config } from '../src/config/index.js';
import { platformRateService, DEFAULT_PLATFORM_RATES } from '../src/services/platformRateService.js';
import { publishingService } from '../src/services/publishingService.js';
import { changeUserPlan } from '../src/services/subscriptionService.js';
import { getProvider } from '../src/services/social/index.js';

describe('Dynamic Credit System, Successful Publishing Charges & Package Upgrade Rules Suite', () => {
  let adminUser;
  let adminToken;
  let regularUser;
  let userToken;

  let fbAccountId;
  let tiktokAccountId;
  let igAccountId;
  let liAccountId;

  beforeAll(async () => {
    // 1. Ensure platform rates are seeded and explicitly reset to baseline default
    await platformRateService.seedPlatformRatesIfEmpty();
    for (const [platform, defaultCost] of Object.entries(DEFAULT_PLATFORM_RATES)) {
      await prisma.platformCreditConfig.upsert({
        where: { platform },
        update: { costCredits: defaultCost },
        create: { platform, costCredits: defaultCost }
      });
    }

    // Ensure package plan credits are standardized
    await prisma.packagePlan.upsert({
      where: { planType: 'CREATOR' },
      update: { credits: 500, priceLkr: 1000 },
      create: { planType: 'CREATOR', name: 'Creator', credits: 500, priceLkr: 1000, maxConnectedAccounts: 4 }
    });
    await prisma.packagePlan.upsert({
      where: { planType: 'PROFESSIONAL' },
      update: { credits: 1500, priceLkr: 2500 },
      create: { planType: 'PROFESSIONAL', name: 'Professional', credits: 1500, priceLkr: 2500, maxConnectedAccounts: 6 }
    });

    const passwordHash = await bcrypt.hash('TestSecurePass2026!', 10);

    // 2. Setup Admin User
    adminUser = await prisma.user.create({
      data: {
        name: 'Admin Credit Suite',
        email: `admin_credit_suite_${Date.now()}@socialsync.ai`,
        passwordHash,
        role: 'ADMIN',
        status: 'ACTIVE',
        plan: 'PROFESSIONAL',
        credits: 5000,
        tokenVersion: 0
      }
    });

    adminToken = jwt.sign(
      { userId: adminUser.id, email: adminUser.email, role: 'ADMIN', name: adminUser.name, tokenVersion: adminUser.tokenVersion || 0 },
      config.jwtSecret,
      { expiresIn: '2h' }
    );

    // 3. Setup Regular User
    regularUser = await prisma.user.create({
      data: {
        name: 'Tester Credit Rules',
        email: `tester_credit_${Date.now()}@socialsync.ai`,
        passwordHash,
        role: 'USER',
        status: 'ACTIVE',
        plan: 'FREE',
        credits: 100
      }
    });

    userToken = jwt.sign(
      { userId: regularUser.id, email: regularUser.email, role: 'USER', name: regularUser.name },
      config.jwtSecret,
      { expiresIn: '2h' }
    );

    // 4. Create connected social accounts for the user
    const [fb, tiktok, ig, li] = await Promise.all([
      prisma.socialAccount.create({
        data: {
          userId: regularUser.id,
          platform: 'FACEBOOK',
          platformUserId: 'fb_page_rule_1',
          accountName: 'Test FB Page',
          accountUsername: 'test_fb_page',
          accessToken: 'EAAB_token_fb',
          status: 'CONNECTED'
        }
      }),
      prisma.socialAccount.create({
        data: {
          userId: regularUser.id,
          platform: 'TIKTOK',
          platformUserId: 'tiktok_rule_1',
          accountName: 'Test TikTok Profile',
          accountUsername: 'test_tiktok',
          accessToken: 'tiktok_access_token',
          status: 'CONNECTED'
        }
      }),
      prisma.socialAccount.create({
        data: {
          userId: regularUser.id,
          platform: 'INSTAGRAM',
          platformUserId: 'ig_rule_1',
          accountName: 'Test IG Account',
          accountUsername: 'test_ig',
          accessToken: 'ig_access_token',
          status: 'CONNECTED'
        }
      }),
      prisma.socialAccount.create({
        data: {
          userId: regularUser.id,
          platform: 'LINKEDIN',
          platformUserId: 'li_rule_1',
          accountName: 'Test LinkedIn Profile',
          accountUsername: 'test_linkedin',
          accessToken: 'li_access_token',
          status: 'CONNECTED'
        }
      })
    ]);

    fbAccountId = fb.id;
    tiktokAccountId = tiktok.id;
    igAccountId = ig.id;
    liAccountId = li.id;
  });

  afterAll(async () => {
    // Clean up created records
    if (regularUser?.id) {
      await prisma.creditTransaction.deleteMany({ where: { userId: regularUser.id } });
      await prisma.postPlatform.deleteMany({ where: { post: { userId: regularUser.id } } });
      await prisma.post.deleteMany({ where: { userId: regularUser.id } });
      await prisma.socialAccount.deleteMany({ where: { userId: regularUser.id } });
      await prisma.subscriptionEvent.deleteMany({ where: { userId: regularUser.id } });
      await prisma.planHistory.deleteMany({ where: { userId: regularUser.id } });
      await prisma.userSubscription.deleteMany({ where: { userId: regularUser.id } });
      await prisma.payment.deleteMany({ where: { userId: regularUser.id } });
      await prisma.user.deleteMany({ where: { id: regularUser.id } });
    }
  });

  // =========================================================================
  // SCENARIO 1: Facebook succeeds and TikTok fails: deduct only Facebook charge
  // =========================================================================
  it('1. Facebook succeeds and TikTok fails: deduct only the Facebook charge (5 credits, TikTok 12 refunded)', async () => {
    // Reset user balance to 100
    await prisma.user.update({
      where: { id: regularUser.id },
      data: { credits: 100 }
    });

    const tiktokProvider = getProvider('TIKTOK');
    const ttConfigSpy = vi.spyOn(tiktokProvider, 'isConfigured').mockReturnValue(true);

    // Mock axios: FB succeeds, TikTok fails
    const postSpy = vi.spyOn(axios, 'post').mockImplementation(async (url) => {
      if (url.includes('graph.facebook.com')) {
        return { data: { id: 'fb_post_succ_101' } };
      }
      if (url.includes('tiktok.com') || url.includes('open.tiktokapis.com')) {
        const err = new Error('TikTok video publish rejected by platform');
        err.response = { data: { message: 'Video format or duration rejected' } };
        throw err;
      }
      throw new Error(`Unexpected mock url: ${url}`);
    });

    const res = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        caption: 'Testing independent billing: FB succeeds, TikTok fails',
        platforms: [
          { platform: 'FACEBOOK', socialAccountId: fbAccountId },
          { platform: 'TIKTOK', socialAccountId: tiktokAccountId }
        ]
      });

    postSpy.mockRestore();
    ttConfigSpy.mockRestore();

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);

    // FB = 5, TikTok = 12. Total upfront hold was 17.
    // FB succeeded, TikTok failed -> 12 refunded.
    // Net deduction must be exactly 5 credits!
    const updatedUser = await prisma.user.findUnique({
      where: { id: regularUser.id }
    });
    expect(updatedUser.credits).toBe(95);

    // Verify database platform records
    const platforms = await prisma.postPlatform.findMany({
      where: { postId: res.body.data.id }
    });
    const fbPlatform = platforms.find(p => p.platform === 'FACEBOOK');
    const tiktokPlatform = platforms.find(p => p.platform === 'TIKTOK');

    expect(fbPlatform.status).toBe('PUBLISHED');
    expect(fbPlatform.creditCharged).toBe(true);
    expect(fbPlatform.creditRefunded).toBe(false);

    expect(tiktokPlatform.status).toBe('FAILED');
    expect(tiktokPlatform.creditCharged).toBe(false);
    expect(tiktokPlatform.creditRefunded).toBe(true);

    // Verify credit ledger contains the refund entry
    const refundTx = await prisma.creditTransaction.findFirst({
      where: {
        userId: regularUser.id,
        type: 'REFUND',
        amount: 12
      }
    });
    expect(refundTx).toBeDefined();
    expect(refundTx.balanceAfter).toBe(95);
  });

  // =========================================================================
  // SCENARIO 2: All destinations fail: no final publishing charge
  // =========================================================================
  it('2. All destinations fail: zero final publishing charge (full reservation refunded)', async () => {
    await prisma.user.update({
      where: { id: regularUser.id },
      data: { credits: 100 }
    });

    const postSpy = vi.spyOn(axios, 'post').mockImplementation(async () => {
      const err = new Error('Destination outage');
      err.response = { data: { message: 'Network connection reset by peer' } };
      throw err;
    });

    const res = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        caption: 'Testing all destinations failing',
        platforms: [
          { platform: 'FACEBOOK', socialAccountId: fbAccountId },
          { platform: 'LINKEDIN', socialAccountId: liAccountId }
        ]
      });

    postSpy.mockRestore();

    expect(res.status).toBe(201);
    const updatedUser = await prisma.user.findUnique({
      where: { id: regularUser.id }
    });

    // Both FB (5) and LI (5) failed -> 10 held then 10 refunded -> balance remains 100!
    expect(updatedUser.credits).toBe(100);

    const platforms = await prisma.postPlatform.findMany({
      where: { postId: res.body.data.id }
    });
    expect(platforms.every(p => p.status === 'FAILED')).toBe(true);
    expect(platforms.every(p => p.creditCharged === false)).toBe(true);
    expect(platforms.every(p => p.creditRefunded === true)).toBe(true);
  });

  // =========================================================================
  // SCENARIO 3: All selected destinations succeed: charge sum of configured costs
  // =========================================================================
  it('3. All selected destinations succeed: charge the sum of configured costs (FB 5 + IG 8 + LI 5 = 18)', async () => {
    await prisma.user.update({
      where: { id: regularUser.id },
      data: { credits: 100, plan: 'CREATOR' }
    });

    const igProvider = getProvider('INSTAGRAM');
    const igConfigSpy = vi.spyOn(igProvider, 'isConfigured').mockReturnValue(true);
    const igPublishSpy = vi.spyOn(igProvider, 'publishPost').mockResolvedValue({ platformPostId: 'ig_post_succ_301' });

    const postSpy = vi.spyOn(axios, 'post').mockImplementation(async (url) => {
      if (url.includes('graph.facebook.com')) {
        return { data: { id: 'fb_post_succ_301' } };
      }
      if (url.includes('api.linkedin.com')) {
        return { headers: { 'x-restli-id': 'urn:li:share:301' }, data: { id: 'urn:li:share:301' } };
      }
      return { data: { id: 'platform_ok' } };
    });

    const res = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        caption: 'Testing triple destination broadcast',
        platforms: [
          { platform: 'FACEBOOK', socialAccountId: fbAccountId },
          { platform: 'INSTAGRAM', socialAccountId: igAccountId },
          { platform: 'LINKEDIN', socialAccountId: liAccountId }
        ]
      });

    postSpy.mockRestore();
    igConfigSpy.mockRestore();
    igPublishSpy.mockRestore();

    expect(res.status).toBe(201);
    const updatedUser = await prisma.user.findUnique({
      where: { id: regularUser.id }
    });

    // 100 - (5 + 8 + 5) = 82
    expect(updatedUser.credits).toBe(82);

    const platforms = await prisma.postPlatform.findMany({
      where: { postId: res.body.data.id }
    });
    expect(platforms.every(p => p.status === 'PUBLISHED')).toBe(true);
    expect(platforms.every(p => p.creditCharged === true)).toBe(true);
    expect(platforms.every(p => p.creditRefunded === false)).toBe(true);
  });

  // =========================================================================
  // SCENARIO 4: Partial asynchronous success and ambiguous API responses
  // =========================================================================
  it('4. Partial asynchronous success and ambiguous responses handle settlement safely', async () => {
    await prisma.user.update({
      where: { id: regularUser.id },
      data: { credits: 100 }
    });

    const postSpy = vi.spyOn(axios, 'post').mockImplementation(async (url) => {
      if (url.includes('graph.facebook.com')) {
        return { data: { id: 'fb_succ_async_401' } };
      }
      if (url.includes('api.linkedin.com')) {
        const timeoutErr = new Error('ECONNABORTED: LinkedIn connection timed out');
        timeoutErr.code = 'ECONNABORTED';
        throw timeoutErr;
      }
      return { data: { id: 'ok' } };
    });

    const res = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        caption: 'Testing ambiguous API timeout response',
        platforms: [
          { platform: 'FACEBOOK', socialAccountId: fbAccountId },
          { platform: 'LINKEDIN', socialAccountId: liAccountId }
        ]
      });

    postSpy.mockRestore();

    expect(res.status).toBe(201);
    // FB (5) succeeded, LinkedIn (5) timed out and was safely marked FAILED and refunded 5 credits.
    const userAfter = await prisma.user.findUnique({ where: { id: regularUser.id } });
    expect(userAfter.credits).toBe(95);

    const platforms = await prisma.postPlatform.findMany({ where: { postId: res.body.data.id } });
    const li = platforms.find(p => p.platform === 'LINKEDIN');
    expect(li.status).toBe('FAILED');
    expect(li.creditRefunded).toBe(true);
  });

  // =========================================================================
  // SCENARIO 5: Repeated webhooks, retries, and duplicate publishing callbacks
  // =========================================================================
  it('5. Retrying failed platforms retries ONLY failed targets without re-publishing or re-charging succeeded ones', async () => {
    await prisma.user.update({
      where: { id: regularUser.id },
      data: { credits: 100 }
    });

    // Create a post with FB PUBLISHED (5 charged) and LI FAILED (5 refunded)
    const post = await prisma.post.create({
      data: {
        userId: regularUser.id,
        caption: 'Testing idempotency during retries',
        status: 'PARTIALLY_PUBLISHED',
        platforms: {
          create: [
            {
              platform: 'FACEBOOK',
              socialAccountId: fbAccountId,
              status: 'PUBLISHED',
              creditCost: 5,
              creditCharged: true,
              creditRefunded: false,
              platformPostId: 'fb_existing_501'
            },
            {
              platform: 'LINKEDIN',
              socialAccountId: liAccountId,
              status: 'FAILED',
              creditCost: 5,
              creditCharged: false,
              creditRefunded: true,
              errorMessage: 'Temporary rate limit'
            }
          ]
        }
      }
    });

    // Balance is currently 95 (only FB was charged)
    await prisma.user.update({ where: { id: regularUser.id }, data: { credits: 95 } });

    let fbCalls = 0;
    let liCalls = 0;

    const postSpy = vi.spyOn(axios, 'post').mockImplementation(async (url) => {
      if (url.includes('graph.facebook.com')) {
        fbCalls++;
        return { data: { id: 'fb_duplicate_should_not_happen' } };
      }
      if (url.includes('api.linkedin.com')) {
        liCalls++;
        return { headers: { 'x-restli-id': 'urn:li:share:retried_502' }, data: { id: 'urn:li:share:retried_502' } };
      }
      return { data: { id: 'ok' } };
    });

    const retryRes = await request(app)
      .post(`/api/posts/${post.id}/retry`)
      .set('Authorization', `Bearer ${userToken}`);

    postSpy.mockRestore();

    expect(retryRes.status).toBe(200);
    // FB must NOT have been called again!
    expect(fbCalls).toBe(0);
    // LI must have been called exactly once
    expect(liCalls).toBe(1);

    // Final balance: 95 - 5 (LI now succeeded) = 90
    const userFinal = await prisma.user.findUnique({ where: { id: regularUser.id } });
    expect(userFinal.credits).toBe(90);

    const postPlatforms = await prisma.postPlatform.findMany({ where: { postId: post.id } });
    expect(postPlatforms.find(p => p.platform === 'FACEBOOK').platformPostId).toBe('fb_existing_501');
    expect(postPlatforms.find(p => p.platform === 'LINKEDIN').status).toBe('PUBLISHED');
  });

  // =========================================================================
  // SCENARIO 6: Concurrent publishing requests and insufficient credit balances
  // =========================================================================
  it('6. Rejects publishing request upfront when user has insufficient credit balance', async () => {
    // Set user balance to 3 credits (below FB cost 5 and TikTok cost 12)
    await prisma.user.update({
      where: { id: regularUser.id },
      data: { credits: 3 }
    });

    const res = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        caption: 'Insufficient balance test',
        platforms: [
          { platform: 'TIKTOK', socialAccountId: tiktokAccountId }
        ]
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('INSUFFICIENT_CREDITS');

    // Balance untouched
    const userCheck = await prisma.user.findUnique({ where: { id: regularUser.id } });
    expect(userCheck.credits).toBe(3);
  });

  // =========================================================================
  // SCENARIO 7: Platform rate changes without altering completed transactions
  // =========================================================================
  it('7. Admin changes platform rate: historical records preserved, new posts use new rate', async () => {
    // Ensure base Facebook rate is 5 before starting test
    await platformRateService.updatePlatformRate('FACEBOOK', 5, adminUser.id, 'Reset baseline');

    // 1. User publishes post with Facebook @ 5 credits
    await prisma.user.update({ where: { id: regularUser.id }, data: { credits: 100 } });

    const postSpy = vi.spyOn(axios, 'post').mockResolvedValue({ data: { id: 'fb_hist_701' } });

    const post1Res = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        caption: 'Historical post before rate increase',
        platforms: [{ platform: 'FACEBOOK', socialAccountId: fbAccountId }]
      });

    postSpy.mockRestore();

    expect(post1Res.status).toBe(201);
    const post1Id = post1Res.body.data.id;

    // Verify historical snapshot cost on PostPlatform is 5
    const histPlatform = await prisma.postPlatform.findFirst({
      where: { postId: post1Id, platform: 'FACEBOOK' }
    });
    expect(histPlatform.creditCost).toBe(5);

    try {
      // 2. Admin changes Facebook rate from 5 to 10
      const adminRateRes = await request(app)
        .put('/api/admin/platform-rates/FACEBOOK')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          creditCost: 10,
          reason: 'Meta API capacity rebalancing'
        });

      expect(adminRateRes.status).toBe(200);
      expect(adminRateRes.body.success).toBe(true);
      expect(adminRateRes.body.data.config.creditCost).toBe(10);

      // Verify rate audit log was created
      const auditLogs = await platformRateService.getRateAuditLogs('FACEBOOK');
      expect(auditLogs.length).toBeGreaterThan(0);
      expect(auditLogs[0].previousCost).toBe(5);
      expect(auditLogs[0].newCost).toBe(10);

      // 3. Verify historical post record was NOT retroactively altered!
      const histCheck = await prisma.postPlatform.findUnique({
        where: { id: histPlatform.id }
      });
      expect(histCheck.creditCost).toBe(5);

      // 4. Verify new post now uses the updated 10 credits rate
      const postSpy2 = vi.spyOn(axios, 'post').mockResolvedValue({ data: { id: 'fb_new_702' } });

      const post2Res = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          caption: 'New post after rate increase',
          platforms: [{ platform: 'FACEBOOK', socialAccountId: fbAccountId }]
        });

      postSpy2.mockRestore();

      expect(post2Res.status).toBe(201);
      const newPlatform = await prisma.postPlatform.findFirst({
        where: { postId: post2Res.body.data.id, platform: 'FACEBOOK' }
      });
      expect(newPlatform.creditCost).toBe(10);
    } finally {
      // Revert Facebook rate back to 5 for subsequent tests
      await platformRateService.updatePlatformRate('FACEBOOK', 5, adminUser.id, 'Reset for testing');
    }
  });

  // =========================================================================
  // SCENARIO 8: Upgrade from 200 allocated with 168 remaining to 500-credit package
  // =========================================================================
  it('8. Package Upgrade Scenario A: 168 remaining upgraded to 500 package -> final balance is exactly 500', async () => {
    // Set user to initial state: remaining balance 168
    await prisma.user.update({
      where: { id: regularUser.id },
      data: {
        plan: 'FREE',
        credits: 168
      }
    });

    // Execute package upgrade to CREATOR (500 credits)
    const result = await changeUserPlan({
      userId: regularUser.id,
      targetPlan: 'CREATOR',
      timing: 'IMMEDIATE'
    });

    expect(result.type).toBe('UPGRADE_COMPLETED');

    // CRITICAL BILLING RULE:
    // The new package credit allocation (500) REPLACES previous balance (168).
    // Final balance must be exactly 500, NOT 168 + 500 = 668!
    const updatedUser = await prisma.user.findUnique({ where: { id: regularUser.id } });
    expect(updatedUser.credits).toBe(500);

    // Verify PACKAGE_UPGRADE transaction was recorded in ledger
    const upgradeTx = await prisma.creditTransaction.findFirst({
      where: {
        userId: regularUser.id,
        type: 'PACKAGE_UPGRADE'
      },
      orderBy: { createdAt: 'desc' }
    });
    expect(upgradeTx).toBeDefined();
    expect(upgradeTx.balanceAfter).toBe(500);
    expect(upgradeTx.reason).toContain('CREATOR');
  });

  // =========================================================================
  // SCENARIO 9: Upgrade to a 1,500-credit package: final balance exactly 1,500
  // =========================================================================
  it('9. Package Upgrade Scenario B: 50 remaining upgraded to 1,500 package -> final balance is exactly 1,500', async () => {
    // Set user balance to 50
    await prisma.user.update({
      where: { id: regularUser.id },
      data: {
        plan: 'CREATOR',
        credits: 50
      }
    });

    // Upgrade to PROFESSIONAL (1,500 credits)
    const result = await changeUserPlan({
      userId: regularUser.id,
      targetPlan: 'PROFESSIONAL',
      timing: 'IMMEDIATE'
    });

    expect(result.type).toBe('UPGRADE_COMPLETED');

    // Final balance must be exactly 1,500
    const updatedUser = await prisma.user.findUnique({ where: { id: regularUser.id } });
    expect(updatedUser.credits).toBe(1500);

    const upgradeTx = await prisma.creditTransaction.findFirst({
      where: {
        userId: regularUser.id,
        type: 'PACKAGE_UPGRADE'
      },
      orderBy: { createdAt: 'desc' }
    });
    expect(upgradeTx.balanceAfter).toBe(1500);
    expect(upgradeTx.reason).toContain('PROFESSIONAL');
  });

  // =========================================================================
  // SCENARIO 10: Failed or cancelled payment: old plan and balance remain unchanged
  // =========================================================================
  it('10. Failed or cancelled payment webhook: plan and balance remain strictly unchanged', async () => {
    // User has 50 credits on CREATOR
    await prisma.user.update({
      where: { id: regularUser.id },
      data: {
        plan: 'CREATOR',
        credits: 50
      }
    });

    const pendingPayment = await prisma.payment.create({
      data: {
        userId: regularUser.id,
        plan: 'PROFESSIONAL',
        amount: 2500,
        currency: 'LKR',
        reference: `order_fail_${Date.now()}`,
        status: 'PENDING'
      }
    });

    // Send failed payment webhook (PayHere status -1)
    const webhookRes = await request(app)
      .post('/api/webhooks/payment')
      .send({
        merchant_id: 'test_merchant',
        order_id: pendingPayment.reference,
        status_code: '-1',
        payhere_amount: '2500.00',
        status_message: 'Card declined by issuing bank'
      });

    expect(webhookRes.status).toBe(200);
    expect(webhookRes.body.success).toBe(false);

    // Verify user plan and balance are completely untouched
    const userCheck = await prisma.user.findUnique({ where: { id: regularUser.id } });
    expect(userCheck.plan).toBe('CREATOR');
    expect(userCheck.credits).toBe(50);
  });

  // =========================================================================
  // SCENARIO 11: Duplicate successful payment webhook: package credits not allocated twice
  // =========================================================================
  it('11. Duplicate successful payment webhook: idempotency prevents duplicate credit allocation', async () => {
    await prisma.user.update({
      where: { id: regularUser.id },
      data: {
        plan: 'CREATOR',
        credits: 50
      }
    });

    const pendingPayment = await prisma.payment.create({
      data: {
        userId: regularUser.id,
        plan: 'PROFESSIONAL',
        amount: 2500,
        currency: 'LKR',
        reference: `order_idem_${Date.now()}`,
        status: 'PENDING'
      }
    });

    // First arrival of webhook: successful upgrade
    const firstCall = await request(app)
      .post('/api/webhooks/payment')
      .send({
        merchant_id: 'test_merchant',
        order_id: pendingPayment.reference,
        payment_id: `tx_idem_${Date.now()}`,
        status_code: '2', // PayHere code 2 = SUCCESS
        payhere_amount: '2500.00',
        payhere_currency: 'LKR'
      });

    expect(firstCall.status).toBe(200);
    expect(firstCall.body.processed).toBe(true);

    const userAfterFirst = await prisma.user.findUnique({ where: { id: regularUser.id } });
    expect(userAfterFirst.credits).toBe(1500);

    // Duplicate webhook arrives with identical reference
    const secondCall = await request(app)
      .post('/api/webhooks/payment')
      .send({
        merchant_id: 'test_merchant',
        order_id: pendingPayment.reference,
        payment_id: `tx_idem_${Date.now()}`,
        status_code: '2',
        payhere_amount: '2500.00',
        payhere_currency: 'LKR'
      });

    expect(secondCall.status).toBe(200);
    expect(secondCall.body.processed).toBe(false);

    // Balance remains exactly 1,500, NOT double-allocated to 3,000!
    const userAfterSecond = await prisma.user.findUnique({ where: { id: regularUser.id } });
    expect(userAfterSecond.credits).toBe(1500);
  });

  // =========================================================================
  // SCENARIO 12: User API responses do not reveal individual platform rates
  // =========================================================================
  it('12. User API responses do not reveal individual platform rates; rate endpoints require admin auth', async () => {
    // 1. Regular user trying to access admin platform rates endpoint -> 403 Forbidden
    const adminRouteAttempt = await request(app)
      .get('/api/admin/platform-rates')
      .set('Authorization', `Bearer ${userToken}`);

    expect(adminRouteAttempt.status).toBe(403);

    // 2. Regular user creating post
    const postSpy = vi.spyOn(axios, 'post').mockResolvedValue({ data: { id: 'fb_secrecy_12' } });

    const createRes = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        caption: 'Testing rate secrecy in user responses',
        platforms: [{ platform: 'FACEBOOK', socialAccountId: fbAccountId }]
      });

    postSpy.mockRestore();

    expect(createRes.status).toBe(201);
    const createdPost = createRes.body.data;

    // Verify create response platforms array does NOT expose creditCost
    for (const p of createdPost.platforms) {
      expect(p.creditCost).toBeUndefined();
    }
    // But shows overall total credits deducted
    expect(createdPost.totalCreditsDeducted).toBe(5);

    // 3. User fetching single post by ID
    const getRes = await request(app)
      .get(`/api/posts/${createdPost.id}`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(getRes.status).toBe(200);
    for (const p of getRes.body.data.platforms) {
      expect(p.creditCost).toBeUndefined();
    }
    expect(getRes.body.data.totalCreditsDeducted).toBe(5);

    // 4. User fetching list of posts
    const listRes = await request(app)
      .get('/api/posts')
      .set('Authorization', `Bearer ${userToken}`);

    expect(listRes.status).toBe(200);
    const foundPost = listRes.body.data.posts.find(p => p.id === createdPost.id);
    for (const p of foundPost.platforms) {
      expect(p.creditCost).toBeUndefined();
    }
  });

  // =========================================================================
  // SCENARIO 13: Credit ledger, spendable balance, and publishing consistency
  // =========================================================================
  it('13. Credit ledger, spendable balance, and publishing outcomes remain strictly consistent', async () => {
    // Fetch all transactions for the user
    const transactions = await prisma.creditTransaction.findMany({
      where: { userId: regularUser.id },
      orderBy: { createdAt: 'desc' }
    });

    const user = await prisma.user.findUnique({
      where: { id: regularUser.id }
    });

    // The latest transaction's balanceAfter MUST match the user's current spendable balance
    if (transactions.length > 0) {
      expect(transactions[0].balanceAfter).toBe(user.credits);
    }

    // Verify user balance is a non-negative integer
    expect(user.credits).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(user.credits)).toBe(true);

    // Verify credit-history user endpoint returns clean history without leaking internal rates
    const historyRes = await request(app)
      .get('/api/subscriptions/credit-history')
      .set('Authorization', `Bearer ${userToken}`);

    expect(historyRes.status).toBe(200);
    expect(historyRes.body.success).toBe(true);
    expect(Array.isArray(historyRes.body.data.transactions)).toBe(true);

    for (const tx of historyRes.body.data.transactions) {
      expect(tx.reason).not.toMatch(/at \d+ credits per platform/i);
    }
  });
});
