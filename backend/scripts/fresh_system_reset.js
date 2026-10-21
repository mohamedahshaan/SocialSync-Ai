/**
 * SocialSync AI — Fresh System Reset & Super Admin Setup
 *
 * Resets the local development database into a clean initial state:
 * - Exactly one Super Admin account preserved (admin@socialsync.ai)
 * - Assigned Professional plan with 1,500 credits & 6 channels
 * - Zero regular users
 * - Zero test payments, subscriptions, credit transactions, deletion events, and posts
 * - Preserves PackagePlan definitions (FREE, CREATOR, PROFESSIONAL)
 * - Preserves PlatformCreditConfig and GlobalFeatureConfig
 * - Sets Super Admin email as verified
 * - Enforces safety guards (local dev confirmation, pre-flight checks, backup)
 */

import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { prisma } from '../src/utils/prisma.js';

async function performFreshSystemReset() {
  console.log('===========================================================');
  console.log('  SOCIALSYNC AI — FRESH SYSTEM RESET & SUPER ADMIN SETUP   ');
  console.log('===========================================================');

  try {
    // Safety Guard 1: Verify environment is local development
    const dbUrl = process.env.DATABASE_URL || '';
    const isLocalhost = dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1');
    const isDevelopment = (process.env.NODE_ENV || 'development') !== 'production';

    if (!isLocalhost || !isDevelopment) {
      console.error('[SAFETY ABORT] Database is not confirmed as a local development database.');
      console.error(`   DATABASE_URL host check: ${isLocalhost ? 'LOCAL' : 'NON-LOCAL'}`);
      console.error(`   NODE_ENV: ${process.env.NODE_ENV}`);
      process.exit(1);
    }

    console.log('[SAFETY CHECK PASSED] Local development database confirmed.');

    // Safety Guard 2: Locate the authoritative Super Admin account
    const superAdmin = await prisma.user.findFirst({
      where: {
        email: 'admin@socialsync.ai'
      }
    });

    if (!superAdmin) {
      console.error('[SAFETY ABORT] Configured Super Admin account (admin@socialsync.ai) not found in database. Cannot proceed.');
      process.exit(1);
    }

    // Safety Guard 3: Verify Super Admin has a password hash and can authenticate
    if (!superAdmin.passwordHash) {
      console.error('[SAFETY ABORT] Super Admin account has no passwordHash.');
      process.exit(1);
    }

    const passwordMatches = await bcrypt.compare('Admin@123', superAdmin.passwordHash);
    console.log(`[IDENTIFIED SUPER ADMIN]`);
    console.log(`   ID:              ${superAdmin.id}`);
    console.log(`   Email:           ${superAdmin.email}`);
    console.log(`   Name:            ${superAdmin.name}`);
    console.log(`   Role:            ${superAdmin.role}`);
    console.log(`   Password Valid:  ${passwordMatches}`);
    console.log('-----------------------------------------------------------');

    // Count records before reset
    const [
      preTotalUsers,
      preRegularUsers,
      prePayments,
      preSubs,
      preSubEvents,
      preCreditTx,
      preDeletions,
      prePosts,
      preAccounts,
      prePlans
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'USER' } }),
      prisma.payment.count(),
      prisma.userSubscription.count(),
      prisma.subscriptionEvent.count(),
      prisma.creditTransaction.count(),
      prisma.accountDeletionEvent.count(),
      prisma.post.count(),
      prisma.socialAccount.count(),
      prisma.packagePlan.count()
    ]);

    console.log('[PRE-RESET DATABASE AUDIT]');
    console.log(`   Total Users in DB:             ${preTotalUsers} (Regular users: ${preRegularUsers})`);
    console.log(`   Payments:                      ${prePayments}`);
    console.log(`   User Subscriptions:            ${preSubs}`);
    console.log(`   Subscription Events:           ${preSubEvents}`);
    console.log(`   Credit Transactions:           ${preCreditTx}`);
    console.log(`   Account Deletion Events:       ${preDeletions}`);
    console.log(`   Posts:                         ${prePosts}`);
    console.log(`   Social Accounts:               ${preAccounts}`);
    console.log(`   Package Plans Preserved:       ${prePlans}`);
    console.log('-----------------------------------------------------------');

    // Create recoverable backup before deletion
    const backupDir = path.resolve(process.cwd(), 'backups');
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
    const backupFile = path.join(backupDir, `socialflow_db_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`);

    const backupData = {
      timestamp: new Date().toISOString(),
      users: await prisma.user.findMany(),
      packagePlans: await prisma.packagePlan.findMany(),
      userSubscriptions: await prisma.userSubscription.findMany(),
      subscriptionEvents: await prisma.subscriptionEvent.findMany(),
      planHistories: await prisma.planHistory.findMany(),
      creditTransactions: await prisma.creditTransaction.findMany(),
      payments: await prisma.payment.findMany(),
      accountDeletionEvents: await prisma.accountDeletionEvent.findMany(),
      adminAuditLogs: await prisma.adminAuditLog.findMany(),
      socialAccounts: await prisma.socialAccount.findMany(),
      posts: await prisma.post.findMany(),
      postPlatforms: await prisma.postPlatform.findMany(),
      publishingJobs: await prisma.publishingJob.findMany(),
      passwordResetOtps: await prisma.passwordResetOtp.findMany(),
      passwordResetTokens: await prisma.passwordResetToken.findMany(),
      adminInvitations: await prisma.adminInvitation.findMany(),
      promotionRedemptions: await prisma.promotionRedemption.findMany(),
      platformCreditConfigs: await prisma.platformCreditConfig.findMany(),
      platformRateAuditLogs: await prisma.platformRateAuditLog.findMany(),
      globalFeatureConfigs: await prisma.globalFeatureConfig.findMany()
    };
    fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
    console.log(`[BACKUP] Full recoverable database backup created: ${backupFile}`);
    console.log('-----------------------------------------------------------');

    console.log('[EXECUTION] Resetting development data in transaction...');

    await prisma.$transaction(async (tx) => {
      // 1. Delete all Publishing Jobs
      await tx.publishingJob.deleteMany({});

      // 2. Delete all Post Platforms
      await tx.postPlatform.deleteMany({});

      // 3. Delete all Posts
      await tx.post.deleteMany({});

      // 4. Delete all Social Accounts
      await tx.socialAccount.deleteMany({});

      // 5. Delete all Password Reset OTPs & Tokens
      await tx.passwordResetOtp.deleteMany({});
      await tx.passwordResetToken.deleteMany({});

      // 6. Delete all Subscription Events & User Subscriptions
      await tx.subscriptionEvent.deleteMany({});
      await tx.userSubscription.deleteMany({});

      // 7. Delete all Plan History & Credit Transactions
      await tx.planHistory.deleteMany({});
      await tx.creditTransaction.deleteMany({});

      // 8. Delete all Payments (removes all test payments & pending checkouts)
      await tx.payment.deleteMany({});

      // 9. Delete all Promotion Redemptions
      await tx.promotionRedemption.deleteMany({});

      // 10. Delete all Account Deletion Events (resets churn metrics to 0)
      await tx.accountDeletionEvent.deleteMany({});

      // 11. Delete all Admin Invitations
      await tx.adminInvitation.deleteMany({});

      // 12. Delete all Platform Rate Audit Logs
      await tx.platformRateAuditLog.deleteMany({});

      // 13. Reassign PlatformCreditConfig & GlobalFeatureConfig updatedById to Super Admin
      await tx.platformCreditConfig.updateMany({
        data: { updatedById: superAdmin.id }
      });
      await tx.globalFeatureConfig.updateMany({
        data: { updatedById: superAdmin.id }
      });

      // 14. Clear createdById on all users to avoid FK cycle before deleting
      await tx.user.updateMany({
        data: { createdById: null }
      });

      // 15. Delete all users except the single Super Admin
      await tx.user.deleteMany({
        where: {
          id: { not: superAdmin.id }
        }
      });

      // 16. Update Super Admin account state:
      // - Email verified with timestamp
      // - Role confirmed as SUPER_ADMIN
      // - Status ACTIVE
      // - Plan PROFESSIONAL
      // - Credits set to 1,500 (standard Professional entitlement)
      // - Clear transient auth fields
      await tx.user.update({
        where: { id: superAdmin.id },
        data: {
          role: 'SUPER_ADMIN',
          status: 'ACTIVE',
          plan: 'PROFESSIONAL',
          credits: 1500,
          isEmailVerified: true,
          emailVerifiedAt: new Date(),
          createdById: null,
          suspendedAt: null,
          suspendReason: null,
          tokenVersion: 0,
          permissions: JSON.stringify(['*'])
        }
      });

      // 17. Create Super Admin clean system-assigned subscription
      const now = new Date();
      const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      await tx.userSubscription.create({
        data: {
          userId: superAdmin.id,
          plan: 'PROFESSIONAL',
          status: 'ACTIVE',
          isFreeTrial: false,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          nextBillingDate: periodEnd,
          billingAmount: 2500,
          currency: 'LKR',
          gateway: 'SYSTEM',
          gatewaySubscriptionId: 'sys_admin_bootstrap',
          autoRenew: false
        }
      });

      // 18. Record clearly labelled system/bootstrap plan assignment in PlanHistory
      await tx.planHistory.create({
        data: {
          userId: superAdmin.id,
          plan: 'PROFESSIONAL',
          previousPlan: null,
          creditsBefore: 0,
          creditsAfter: 1500,
          source: 'SYSTEM_BOOTSTRAP',
          changedById: superAdmin.id,
          paymentId: null,
          status: 'SUCCESS',
          reason: 'Super Admin initial Professional plan configuration & system bootstrap'
        }
      });

      // 19. Clear historical AdminAuditLogs and write fresh system initialization log
      await tx.adminAuditLog.deleteMany({});
      await tx.adminAuditLog.create({
        data: {
          adminId: superAdmin.id,
          action: 'SYSTEM_FRESH_INITIALIZATION',
          targetUserId: superAdmin.id,
          details: JSON.stringify({
            event: 'FRESH_SYSTEM_RESET_COMPLETED',
            superAdminId: superAdmin.id,
            superAdminEmail: superAdmin.email,
            plan: 'PROFESSIONAL',
            credits: 1500,
            channels: 6,
            regularUsersRemaining: 0,
            timestamp: now.toISOString()
          })
        }
      });
    });

    console.log('[SUCCESS] Transaction committed successfully.');
    console.log('-----------------------------------------------------------');

    // Post-reset verification
    const [
      postTotalUsers,
      postRegularUsers,
      postSuperAdmins,
      postPayments,
      postSubs,
      postCreditTx,
      postDeletions,
      postPosts,
      postAccounts,
      postAuditLogs,
      verifiedAdmin
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'USER' } }),
      prisma.user.count({ where: { role: 'SUPER_ADMIN' } }),
      prisma.payment.count(),
      prisma.userSubscription.count(),
      prisma.creditTransaction.count(),
      prisma.accountDeletionEvent.count(),
      prisma.post.count(),
      prisma.socialAccount.count(),
      prisma.adminAuditLog.count(),
      prisma.user.findUnique({
        where: { id: superAdmin.id },
        select: { id: true, email: true, name: true, role: true, plan: true, credits: true, status: true, isEmailVerified: true }
      })
    ]);

    console.log('[POST-RESET DATABASE AUDIT]');
    console.log(`   Total Users:                  ${postTotalUsers} (Expected: 1)`);
    console.log(`   Regular Users:                ${postRegularUsers} (Expected: 0)`);
    console.log(`   Super Admins:                 ${postSuperAdmins} (Expected: 1)`);
    console.log(`   Payments:                     ${postPayments} (Expected: 0)`);
    console.log(`   User Subscriptions:           ${postSubs} (Expected: 1 - Super Admin)`);
    console.log(`   Credit Transactions:          ${postCreditTx} (Expected: 0)`);
    console.log(`   Account Deletion Events:      ${postDeletions} (Expected: 0)`);
    console.log(`   Posts:                        ${postPosts} (Expected: 0)`);
    console.log(`   Social Accounts:              ${postAccounts} (Expected: 0)`);
    console.log(`   Admin Audit Logs:             ${postAuditLogs} (Expected: 1 bootstrap)`);
    console.log('-----------------------------------------------------------');
    console.log('[PRESERVED SUPER ADMIN DETAILS]');
    console.log(`   ID:             ${verifiedAdmin.id}`);
    console.log(`   Email:          ${verifiedAdmin.email}`);
    console.log(`   Name:           ${verifiedAdmin.name}`);
    console.log(`   Role:           ${verifiedAdmin.role}`);
    console.log(`   Plan:           ${verifiedAdmin.plan}`);
    console.log(`   Credits:        ${verifiedAdmin.credits}`);
    console.log(`   Status:         ${verifiedAdmin.status}`);
    console.log(`   Email Verified: ${verifiedAdmin.isEmailVerified}`);
    console.log('===========================================================');
    console.log('  FRESH SYSTEM RESET & SUPER ADMIN SETUP COMPLETE!          ');
    console.log('===========================================================');

  } catch (err) {
    console.error('[ERROR] Failed to perform fresh system reset:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

performFreshSystemReset();
