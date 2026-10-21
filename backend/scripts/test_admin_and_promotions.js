import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { prisma } from '../src/utils/prisma.js';
import { config } from '../src/config/index.js';
import {
  getPlanPromotions,
  updatePlanPromotion,
  checkUserPromotionEligibility,
  getAllPlans
} from '../src/services/planService.js';
import {
  changeUserPlan,
  createOrUpdateSubscription
} from '../src/services/subscriptionService.js';
import {
  inviteAdministrator,
  updateAdminRole,
  updateAdminPermissions,
  updateAdminStatus,
  revokeAdminAccess
} from '../src/controllers/adminController.js';
import {
  validateAdminInvitation,
  acceptAdminInvitation
} from '../src/controllers/authController.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log('========================================================');
  console.log('🧪 RUNNING COMPREHENSIVE ADMIN MANAGEMENT & PROMOTIONS TEST SUITE');
  console.log('========================================================\n');

  try {
    // 1. Verify Super Admin Bootstrapped in Database
    console.log('--- Test Group 1: Super Admin Bootstrapping ---');
    const superAdmin = await prisma.user.findUnique({
      where: { email: 'admin@socialsync.ai' }
    });
    assert(Boolean(superAdmin), 'Super Admin admin@socialsync.ai exists in database');
    assert(superAdmin?.role === 'SUPER_ADMIN', `Super Admin role is SUPER_ADMIN (current: ${superAdmin?.role})`);
    assert(superAdmin?.permissions?.includes('*'), 'Super Admin has full permissions wildcard "*"');

    // 2. Test Admin Invitation Creation Flow
    console.log('\n--- Test Group 2: Secure Admin Invitation Creation ---');
    const testInviteEmail = `test.admin.${Date.now()}@socialsync.ai`;
    const mockReqInvite = {
      user: { id: superAdmin.id, name: superAdmin.name, role: 'SUPER_ADMIN' },
      body: {
        email: testInviteEmail,
        role: 'ADMIN',
        permissions: ['users:read', 'users:write', 'plans:manage']
      },
      ip: '127.0.0.1'
    };

    let inviteResponseData = null;
    const mockResInvite = {
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        inviteResponseData = data;
        return this;
      }
    };

    await inviteAdministrator(mockReqInvite, mockResInvite, (err) => { throw err; });
    assert(inviteResponseData?.success === true, 'Admin invitation created successfully');
    assert(Boolean(inviteResponseData?.data?.id), 'Invitation ID returned');
    assert(!inviteResponseData?.data?.rawToken, 'Raw invitation token is NOT exposed in response payload');

    const invitationInDb = await prisma.adminInvitation.findUnique({
      where: { id: inviteResponseData.data.id }
    });
    assert(invitationInDb?.status === 'PENDING', 'Invitation record status is PENDING in PostgreSQL');
    assert(Boolean(invitationInDb?.tokenHash), 'Cryptographic tokenHash stored securely in PostgreSQL');

    // 3. Test Acceptance Flow (New Admin User Provisioning)
    console.log('\n--- Test Group 3: Token Acceptance & Provisioning ---');
    // Retrieve raw invitation from email mock or simulate tokenHash match
    // To test acceptance with the exact tokenHash in DB, we generate a known token
    const testRawToken = crypto.randomBytes(32).toString('hex');
    const testTokenHash = crypto.createHash('sha256').update(testRawToken).digest('hex');
    const newAdminEmail = `invitee.${Date.now()}@socialsync.ai`;

    const knownInvite = await prisma.adminInvitation.create({
      data: {
        email: newAdminEmail,
        role: 'ADMIN',
        permissions: JSON.stringify(['users:read', 'plans:manage']),
        tokenHash: testTokenHash,
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
        invitedById: superAdmin.id
      }
    });

    // Test token validation endpoint
    let validateResult = null;
    await validateAdminInvitation(
      { params: { token: testRawToken } },
      {
        status(code) { this.statusCode = code; return this; },
        json(data) { validateResult = data; return this; }
      },
      (err) => { throw err; }
    );
    assert(validateResult?.success === true, 'Public invitation validation endpoint verified raw token');
    assert(validateResult?.data?.email === newAdminEmail, 'Validation returned correct target email');
    assert(validateResult?.data?.role === 'ADMIN', 'Validation returned designated role');

    // Test accept invitation
    let acceptResult = null;
    await acceptAdminInvitation(
      {
        body: {
          token: testRawToken,
          name: 'Sarah Connor',
          password: 'AdminPassword2026!',
          confirmPassword: 'AdminPassword2026!'
        },
        ip: '127.0.0.1'
      },
      {
        status(code) { this.statusCode = code; return this; },
        json(data) { acceptResult = data; return this; }
      },
      (err) => { throw err; }
    );

    assert(acceptResult?.success === true, 'Invitation accepted and admin account provisioned');
    assert(Boolean(acceptResult?.data?.token), 'Session JWT issued upon acceptance');

    const createdAdmin = await prisma.user.findUnique({
      where: { email: newAdminEmail }
    });
    assert(createdAdmin?.role === 'ADMIN', `Provisioned user role is ADMIN (actual: ${createdAdmin?.role})`);
    assert(createdAdmin?.plan === 'PROFESSIONAL', 'Admin provisioned with PROFESSIONAL tier access');
    assert(createdAdmin?.credits >= 1000, `Admin granted 1000 initial credits (actual: ${createdAdmin?.credits})`);

    const updatedInvitation = await prisma.adminInvitation.findUnique({
      where: { id: knownInvite.id }
    });
    assert(updatedInvitation?.status === 'ACCEPTED', 'AdminInvitation status marked ACCEPTED in database');

    // Test replay protection (token cannot be accepted a second time)
    let replayResult = null;
    let replayStatusCode = 200;
    await acceptAdminInvitation(
      {
        body: {
          token: testRawToken,
          name: 'Attacker',
          password: 'HackedPassword2026!',
          confirmPassword: 'HackedPassword2026!'
        },
        ip: '127.0.0.1'
      },
      {
        status(code) { replayStatusCode = code; return this; },
        json(data) { replayResult = data; return this; }
      },
      (err) => { throw err; }
    );
    assert(replayStatusCode === 400, 'Replay protection: second attempt to accept token is rejected with 400');

    // 4. Test Last Super Admin Protection
    console.log('\n--- Test Group 4: Last Super Admin Protection Safeguards ---');
    let demoteStatusCode = 200;
    let demoteResult = null;
    await updateAdminRole(
      {
        params: { id: superAdmin.id },
        user: { id: superAdmin.id, role: 'SUPER_ADMIN' },
        body: {
          newRole: 'ADMIN',
          adminPassword: 'AdminSecureSync2026!'
        },
        ip: '127.0.0.1'
      },
      {
        status(code) { demoteStatusCode = code; return this; },
        json(data) { demoteResult = data; return this; }
      },
      (err) => { throw err; }
    );
    assert(demoteStatusCode === 400, 'Last Super Admin cannot be demoted (rejected with 400)');
    assert(demoteResult?.error === 'CANNOT_DEMOTE_LAST_SUPER_ADMIN', 'Demote error code is CANNOT_DEMOTE_LAST_SUPER_ADMIN');

    // Test suspend last super admin
    let suspendStatusCode = 200;
    let suspendResult = null;
    await updateAdminStatus(
      {
        params: { id: superAdmin.id },
        user: { id: superAdmin.id, role: 'SUPER_ADMIN' },
        body: { status: 'SUSPENDED' },
        ip: '127.0.0.1'
      },
      {
        status(code) { suspendStatusCode = code; return this; },
        json(data) { suspendResult = data; return this; }
      },
      (err) => { throw err; }
    );
    assert(suspendStatusCode === 400, 'Last Super Admin cannot be suspended (rejected with 400)');
    assert(suspendResult?.error === 'CANNOT_SUSPEND_LAST_SUPER_ADMIN', 'Suspend error code is CANNOT_SUSPEND_LAST_SUPER_ADMIN');

    // 5. Test Session Invalidation on Privilege Revocation
    console.log('\n--- Test Group 5: Active Session Invalidation (tokenVersion) ---');
    const initialTokenVersion = createdAdmin.tokenVersion || 0;
    let revokeResult = null;
    await revokeAdminAccess(
      {
        params: { id: createdAdmin.id },
        user: { id: superAdmin.id, role: 'SUPER_ADMIN' },
        body: { adminPassword: 'AdminSecureSync2026!', reason: 'Testing revocation' },
        ip: '127.0.0.1'
      },
      {
        status(code) { return this; },
        json(data) { revokeResult = data; return this; }
      },
      (err) => { throw err; }
    );
    assert(revokeResult?.success === true, 'Admin access revoked and account demoted to USER');

    const demotedUser = await prisma.user.findUnique({ where: { id: createdAdmin.id } });
    assert(demotedUser?.role === 'USER', 'Role in PostgreSQL changed to USER');
    assert(demotedUser?.permissions === null, 'Administrative permissions purged from record');
    assert(demotedUser?.tokenVersion > initialTokenVersion, `tokenVersion incremented (${initialTokenVersion} -> ${demotedUser?.tokenVersion}) to invalidate all active JWTs`);

    // 6. Test Plan Promotion Settings & Independence
    console.log('\n--- Test Group 6: Plan Promotions & Independent Control ---');
    // Configure Creator Plan promotion: 1 Month Free
    const creatorPromo = await updatePlanPromotion('CREATOR', {
      promoEnabled: true,
      promoPriceLkr: 0.0,
      promoStartDate: new Date(Date.now() - 1000 * 60).toISOString(),
      promoEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      promoEligibility: 'ONCE_PER_USER',
      promoMaxRedemptions: 100,
      promoTitle: '1 Month Free',
      promoDescription: 'Creator Plan first month completely free.'
    }, superAdmin.id);

    assert(creatorPromo.promoEnabled === true, 'Creator plan promoEnabled set to true');
    assert(creatorPromo.promoPriceLkr === 0, 'Creator promotional price set to LKR 0.00');

    // Verify Professional plan was unaffected (independence requirement)
    const proPlan = await prisma.packagePlan.findUnique({ where: { planType: 'PROFESSIONAL' } });
    assert(proPlan.promoEnabled === false, 'Professional plan promoEnabled remains independently false');

    const promotionsList = await getPlanPromotions();
    const creatorInList = promotionsList.find(p => p.planType === 'CREATOR');
    const proInList = promotionsList.find(p => p.planType === 'PROFESSIONAL');
    assert(creatorInList?.status === 'ACTIVE', 'Creator promotion status is ACTIVE');
    assert(proInList?.status === 'DISABLED', 'Professional promotion status is DISABLED');

    // 7. Test Public Plans API Response (Pricing Display)
    console.log('\n--- Test Group 7: Public Plans Display & Promotional Pricing ---');
    const publicPlans = await getAllPlans();
    const publicCreator = publicPlans.find(p => p.planType === 'CREATOR');
    assert(publicCreator?.isPromoActive === true, 'Public Creator plan has isPromoActive: true');
    assert(publicCreator?.promotionalPriceLkr === 0, 'Public Creator plan promotionalPriceLkr is 0');
    assert(publicCreator?.originalMonthlyPriceLkr === 1000, 'Public Creator plan preserves original price of 1000 LKR');
    assert(publicCreator?.promoTitle === '1 Month Free', 'Public Creator plan displays "1 Month Free" title');

    // 8. Test Checkout with Promotion (0.00 LKR First Month & PromotionRedemption)
    console.log('\n--- Test Group 8: Actual Subscription Checkout with Promotion ---');
    // Create a fresh test user
    const subscriberEmail = `subscriber.${Date.now()}@socialsync.ai`;
    const testUser = await prisma.user.create({
      data: {
        name: 'Alex Subscriber',
        email: subscriberEmail,
        passwordHash: await bcrypt.hash('TestSubscriber123!', 10),
        plan: 'FREE',
        credits: 200,
        status: 'ACTIVE'
      }
    });

    // Check user eligibility
    const eligibility = await checkUserPromotionEligibility(testUser.id, 'CREATOR');
    assert(eligibility.isEligible === true, 'User is eligible for 1 Month Free on Creator plan');

    // Execute plan upgrade checkout to CREATOR
    const checkoutResult = await changeUserPlan({
      userId: testUser.id,
      targetPlan: 'CREATOR',
      cardData: {
        cardNumber: '4242 4242 4242 4242',
        cardholderName: 'Alex Subscriber',
        expMonth: '12',
        expYear: '2028'
      }
    });

    assert(checkoutResult.type === 'UPGRADE_COMPLETED', 'Subscription upgrade completed');
    assert(checkoutResult.isPromotionApplied === true, 'Promotion marked applied in checkout result');
    assert(checkoutResult.payment?.amount === 0, 'Initial charge amount is exactly LKR 0.00');

    // Verify PromotionRedemption record in PostgreSQL
    const redemption = await prisma.promotionRedemption.findFirst({
      where: { userId: testUser.id, planType: 'CREATOR' }
    });
    assert(Boolean(redemption), 'PromotionRedemption record saved in PostgreSQL');
    assert(redemption?.promoPriceLkr === 0, 'PromotionRedemption promoPriceLkr is 0.00');
    assert(redemption?.regularPriceLkr === 1000, 'PromotionRedemption records regular price 1000 LKR');

    // Verify user credits granted immediately
    const updatedSubscriber = await prisma.user.findUnique({ where: { id: testUser.id } });
    assert(updatedSubscriber?.plan === 'CREATOR', 'Subscriber plan updated to CREATOR');
    assert(updatedSubscriber?.credits >= 500, `Subscriber granted Creator plan credits (credits: ${updatedSubscriber?.credits})`);

    // Verify duplicate redemption prevention
    const secondEligibility = await checkUserPromotionEligibility(testUser.id, 'CREATOR');
    assert(secondEligibility.isEligible === false, 'Duplicate redemption prevented: user is no longer eligible for same promo');

    // 9. Clean up test users created during test run
    console.log('\n--- Test Cleanup ---');
    await prisma.promotionRedemption.deleteMany({ where: { userId: testUser.id } });
    await prisma.payment.deleteMany({ where: { userId: testUser.id } });
    await prisma.planHistory.deleteMany({ where: { userId: testUser.id } });
    await prisma.creditTransaction.deleteMany({ where: { userId: testUser.id } });
    await prisma.userSubscription.deleteMany({ where: { userId: testUser.id } });
    await prisma.user.delete({ where: { id: testUser.id } });

    await prisma.adminInvitation.deleteMany({ where: { email: { in: [testInviteEmail, newAdminEmail] } } });
    await prisma.adminAuditLog.deleteMany({ where: { targetUserId: createdAdmin.id } });
    await prisma.user.delete({ where: { id: createdAdmin.id } });

    // Restore Creator plan promo to normal configuration
    await updatePlanPromotion('CREATOR', {
      promoEnabled: false,
      promoPriceLkr: 0.0
    }, superAdmin.id);

    console.log('Cleanup completed successfully.');

  } catch (err) {
    console.error('Test error:', err);
    failed++;
  }

  console.log('\n========================================================');
  console.log(`📊 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
