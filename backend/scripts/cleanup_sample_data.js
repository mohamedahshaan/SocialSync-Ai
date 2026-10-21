/**
 * SocialSync AI — Database Sample & Test Data Cleanup Script
 *
 * Safely removes confirmed test fixtures and sample records created during development/testing
 * while strictly preserving genuine user accounts, password hashes, real subscriptions,
 * real payments, and real publishing records.
 */

import { prisma } from '../src/utils/prisma.js';

const PRESERVED_EMAILS = new Set([
  'admin@socialsync.ai'
]);

async function main() {
  console.log('=====================================================');
  console.log('  SOCIALSYNC AI — DATABASE CLEANUP OF TEST FIXTURES  ');
  console.log('=====================================================');

  const beforeCounts = {
    users: await prisma.user.count(),
    posts: await prisma.post.count(),
    payments: await prisma.payment.count(),
    userSubscriptions: await prisma.userSubscription.count(),
    subscriptionEvents: await prisma.subscriptionEvent.count(),
    creditTransactions: await prisma.creditTransaction.count(),
    planHistories: await prisma.planHistory.count(),
    adminAuditLogs: await prisma.adminAuditLog.count()
  };

  console.log('\n[INFO] Current Database Counts Before Cleanup:');
  console.table(beforeCounts);

  const allUsers = await prisma.user.findMany({
    select: { id: true, email: true, name: true }
  });

  const testUsers = allUsers.filter(u => !PRESERVED_EMAILS.has(u.email.toLowerCase().trim()));
  const testUserIds = testUsers.map(u => u.id);

  console.log(`\n[INFO] Identified ${testUsers.length} test fixture accounts to remove.`);
  console.log(`[INFO] Preserving ${allUsers.length - testUsers.length} genuine user accounts:`);
  allUsers
    .filter(u => PRESERVED_EMAILS.has(u.email.toLowerCase().trim()))
    .forEach(u => console.log(`   ✓ ${u.name} (${u.email}) [ID: ${u.id}]`));

  if (testUsers.length === 0) {
    console.log('\n[INFO] No test users to clean up. Database is already clean.');
    return;
  }

  console.log('\n[START] Executing cascading deletion of test fixtures...');

  // Chunk processing to avoid large SQL IN clauses
  const chunkSize = 50;
  for (let i = 0; i < testUserIds.length; i += chunkSize) {
    const chunkIds = testUserIds.slice(i, i + chunkSize);

    await prisma.$transaction(async (tx) => {
      // 1. Find all posts belonging to these users
      const posts = await tx.post.findMany({
        where: { userId: { in: chunkIds } },
        select: { id: true }
      });
      const postIds = posts.map(p => p.id);

      if (postIds.length > 0) {
        await tx.publishingJob.deleteMany({
          where: { postId: { in: postIds } }
        });
        await tx.postPlatform.deleteMany({
          where: { postId: { in: postIds } }
        });
        await tx.post.deleteMany({
          where: { id: { in: postIds } }
        });
      }

      // 2. Delete social accounts
      await tx.socialAccount.deleteMany({
        where: { userId: { in: chunkIds } }
      });

      // 3. Delete password reset tokens & OTPs
      await tx.passwordResetOtp.deleteMany({
        where: { userId: { in: chunkIds } }
      });
      await tx.passwordResetToken.deleteMany({
        where: { userId: { in: chunkIds } }
      });

      // 4. Delete subscriptions & subscription events
      await tx.subscriptionEvent.deleteMany({
        where: { userId: { in: chunkIds } }
      });
      await tx.userSubscription.deleteMany({
        where: { userId: { in: chunkIds } }
      });

      // 5. Delete plan history & credit transactions
      await tx.planHistory.deleteMany({
        where: { userId: { in: chunkIds } }
      });
      await tx.creditTransaction.deleteMany({
        where: { userId: { in: chunkIds } }
      });

      // 6. Delete payments
      await tx.payment.deleteMany({
        where: { userId: { in: chunkIds } }
      });

      // 7. Delete audit logs where test user is target or actor
      await tx.adminAuditLog.deleteMany({
        where: {
          OR: [
            { targetUserId: { in: chunkIds } },
            { adminId: { in: chunkIds } }
          ]
        }
      });

      // 8. Clear createdById references
      await tx.user.updateMany({
        where: { createdById: { in: chunkIds } },
        data: { createdById: null }
      });

      // 9. Finally delete the users
      await tx.user.deleteMany({
        where: { id: { in: chunkIds } }
      });
    });

    console.log(`[PROGRESS] Cleaned chunk ${Math.min(i + chunkSize, testUserIds.length)}/${testUserIds.length} users.`);
  }

  const afterCounts = {
    users: await prisma.user.count(),
    posts: await prisma.post.count(),
    payments: await prisma.payment.count(),
    userSubscriptions: await prisma.userSubscription.count(),
    subscriptionEvents: await prisma.subscriptionEvent.count(),
    creditTransactions: await prisma.creditTransaction.count(),
    planHistories: await prisma.planHistory.count(),
    adminAuditLogs: await prisma.adminAuditLog.count()
  };

  console.log('\n[SUCCESS] Database Cleanup Completed Successfully!');
  console.log('\n[INFO] Database Counts After Cleanup:');
  console.table(afterCounts);
}

main()
  .catch((err) => {
    console.error('\n[ERROR] Cleanup failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
