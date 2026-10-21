/**
 * SocialSync AI — System User Purge Utility
 *
 * Removes all user accounts and their associated relational records from the database,
 * preserving exclusively the single Super Admin account (admin@socialsync.ai).
 *
 * Usage:
 *   node scripts/remove_all_users_except_superadmin.js
 */

import { prisma } from '../src/utils/prisma.js';

async function removeAllUsersExceptSuperAdmin() {
  console.log('===========================================================');
  console.log('  SOCIALSYNC AI — REMOVE ALL USERS EXCEPT SUPER ADMIN     ');
  console.log('===========================================================');

  try {
    // 1. Locate the Super Admin account
    const superAdmin = await prisma.user.findFirst({
      where: { role: 'SUPER_ADMIN' }
    });

    if (!superAdmin) {
      console.error('[CRITICAL] No user with role SUPER_ADMIN found in the database. Aborting to avoid data loss.');
      process.exit(1);
    }

    console.log(`[PRESERVE] Verified Super Admin Account:`);
    console.log(`   ID:    ${superAdmin.id}`);
    console.log(`   Email: ${superAdmin.email}`);
    console.log(`   Name:  ${superAdmin.name}`);
    console.log(`   Role:  ${superAdmin.role}`);
    console.log('-----------------------------------------------------------');

    // 2. Query all users to delete (all users except Super Admin)
    const targetUsers = await prisma.user.findMany({
      where: {
        id: { not: superAdmin.id }
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true
      }
    });

    console.log(`[INFO] Found ${targetUsers.length} user account(s) to remove.`);

    if (targetUsers.length === 0) {
      console.log('[INFO] No non-super-admin users found. The database already contains only the Super Admin.');
      return;
    }

    console.log('[INFO] Accounts queued for removal:');
    targetUsers.forEach((u, idx) => {
      console.log(`   ${idx + 1}. [${u.role}] ${u.name} (${u.email}) — ID: ${u.id}`);
    });

    const targetUserIds = targetUsers.map(u => u.id);

    console.log('\n[START] Executing relational deletion in database transaction...');

    await prisma.$transaction(async (tx) => {
      // 1. Posts & Publishing Jobs & PostPlatforms
      const posts = await tx.post.findMany({
        where: { userId: { in: targetUserIds } },
        select: { id: true }
      });
      const postIds = posts.map(p => p.id);

      if (postIds.length > 0) {
        const deletedJobs = await tx.publishingJob.deleteMany({
          where: { postId: { in: postIds } }
        });
        const deletedPostPlatforms = await tx.postPlatform.deleteMany({
          where: { postId: { in: postIds } }
        });
        const deletedPosts = await tx.post.deleteMany({
          where: { id: { in: postIds } }
        });
        console.log(`   ✓ Deleted ${deletedJobs.count} publishing jobs, ${deletedPostPlatforms.count} post platforms, ${deletedPosts.count} posts.`);
      }

      // 2. Social Accounts & any remaining PostPlatforms linked to them
      const socialAccounts = await tx.socialAccount.findMany({
        where: { userId: { in: targetUserIds } },
        select: { id: true }
      });
      const socialAccountIds = socialAccounts.map(s => s.id);

      if (socialAccountIds.length > 0) {
        await tx.postPlatform.deleteMany({
          where: { socialAccountId: { in: socialAccountIds } }
        });
        const deletedSocial = await tx.socialAccount.deleteMany({
          where: { id: { in: socialAccountIds } }
        });
        console.log(`   ✓ Deleted ${deletedSocial.count} social accounts.`);
      }

      // 3. Password Reset OTPs & Tokens
      const deletedOtps = await tx.passwordResetOtp.deleteMany({
        where: { userId: { in: targetUserIds } }
      });
      const deletedTokens = await tx.passwordResetToken.deleteMany({
        where: { userId: { in: targetUserIds } }
      });
      if (deletedOtps.count > 0 || deletedTokens.count > 0) {
        console.log(`   ✓ Deleted ${deletedOtps.count} password reset OTPs and ${deletedTokens.count} reset tokens.`);
      }

      // 4. Subscriptions & Subscription Events
      const deletedSubEvents = await tx.subscriptionEvent.deleteMany({
        where: { userId: { in: targetUserIds } }
      });
      const deletedSubs = await tx.userSubscription.deleteMany({
        where: { userId: { in: targetUserIds } }
      });
      console.log(`   ✓ Deleted ${deletedSubs.count} user subscriptions and ${deletedSubEvents.count} subscription events.`);

      // 5. Plan History & Credit Transactions
      const deletedPlanHistory = await tx.planHistory.deleteMany({
        where: { userId: { in: targetUserIds } }
      });
      const deletedCreditTx = await tx.creditTransaction.deleteMany({
        where: { userId: { in: targetUserIds } }
      });
      console.log(`   ✓ Deleted ${deletedPlanHistory.count} plan history records and ${deletedCreditTx.count} credit transactions.`);

      // 6. Payments
      const deletedPayments = await tx.payment.deleteMany({
        where: { userId: { in: targetUserIds } }
      });
      console.log(`   ✓ Deleted ${deletedPayments.count} payment records.`);

      // 7. Promotion Redemptions
      const deletedPromos = await tx.promotionRedemption.deleteMany({
        where: { userId: { in: targetUserIds } }
      });
      if (deletedPromos.count > 0) {
        console.log(`   ✓ Deleted ${deletedPromos.count} promotion redemptions.`);
      }

      // 8. Admin Invitations
      const deletedInvites = await tx.adminInvitation.deleteMany({
        where: {
          OR: [
            { invitedById: { in: targetUserIds } },
            { acceptedById: { in: targetUserIds } }
          ]
        }
      });
      if (deletedInvites.count > 0) {
        console.log(`   ✓ Deleted ${deletedInvites.count} admin invitations.`);
      }

      // 9. Platform Credit Configs & Global Feature Configs (reassign updater to Super Admin)
      await tx.platformCreditConfig.updateMany({
        where: { updatedById: { in: targetUserIds } },
        data: { updatedById: superAdmin.id }
      });
      await tx.globalFeatureConfig.updateMany({
        where: { updatedById: { in: targetUserIds } },
        data: { updatedById: superAdmin.id }
      });

      // 10. Platform Rate Audit Logs
      const deletedPlatformAudits = await tx.platformRateAuditLog.deleteMany({
        where: { adminId: { in: targetUserIds } }
      });
      if (deletedPlatformAudits.count > 0) {
        console.log(`   ✓ Deleted ${deletedPlatformAudits.count} platform rate audit logs from non-super-admin users.`);
      }

      // 11. Admin Audit Logs
      // Delete logs performed by removed users
      const deletedAdminLogs = await tx.adminAuditLog.deleteMany({
        where: { adminId: { in: targetUserIds } }
      });
      // Nullify targetUserId in audit logs performed by Super Admin so the action audit trail is preserved
      await tx.adminAuditLog.updateMany({
        where: { targetUserId: { in: targetUserIds } },
        data: { targetUserId: null }
      });
      console.log(`   ✓ Deleted ${deletedAdminLogs.count} audit logs performed by non-super-admin users; unlinked target user references in super-admin audit logs.`);

      // 12. Clear createdById references
      await tx.user.updateMany({
        where: { createdById: { in: targetUserIds } },
        data: { createdById: null }
      });

      // 13. Finally, delete the non-super-admin users
      const deletedUsersResult = await tx.user.deleteMany({
        where: { id: { in: targetUserIds } }
      });

      console.log(`   ✓ Successfully deleted ${deletedUsersResult.count} user accounts.`);
    });

    // 4. Log the purge event under the Super Admin's audit log
    await prisma.adminAuditLog.create({
      data: {
        adminId: superAdmin.id,
        action: 'SUPER_ADMIN_SYSTEM_PURGE',
        targetUserId: superAdmin.id,
        details: JSON.stringify({
          purgedUserCount: targetUserIds.length,
          purgedEmails: targetUsers.map(u => u.email),
          timestamp: new Date().toISOString()
        })
      }
    });

    // 5. Final Verification of the database state
    const remainingUsers = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        plan: true,
        credits: true
      }
    });

    console.log('\n===========================================================');
    console.log('                 VERIFICATION & FINAL STATE               ');
    console.log('===========================================================');
    console.log(`Total users remaining in system: ${remainingUsers.length}`);
    console.table(remainingUsers);

    if (remainingUsers.length === 1 && remainingUsers[0].id === superAdmin.id) {
      console.log('[SUCCESS] All non-super-admin users removed. Exactly one user (Super Admin) remains in the system.');
    } else {
      console.warn('[WARNING] Unexpected user count after deletion:', remainingUsers);
    }
  } catch (error) {
    console.error('[ERROR] Failed to purge users:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

removeAllUsersExceptSuperAdmin();
