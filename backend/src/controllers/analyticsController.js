import { prisma } from '../utils/prisma.js';

/**
 * Compute real user-isolated analytics from database records
 */
export async function getAnalytics(req, res, next) {
  try {
    const userId = req.user.id;

    // Run parallel counts for this user
    const [
      totalPosts,
      publishedPosts,
      failedPosts,
      scheduledPosts,
      partiallyPublishedPosts,
      draftPosts,
      platformCounts,
      connectedAccounts
    ] = await Promise.all([
      prisma.post.count({ where: { userId } }),
      prisma.post.count({ where: { userId, status: 'PUBLISHED' } }),
      prisma.post.count({ where: { userId, status: 'FAILED' } }),
      prisma.post.count({ where: { userId, status: 'SCHEDULED' } }),
      prisma.post.count({ where: { userId, status: 'PARTIALLY_PUBLISHED' } }),
      prisma.post.count({ where: { userId, status: 'DRAFT' } }),
      // Group post platforms by platform and status for this user
      prisma.postPlatform.groupBy({
        by: ['platform', 'status'],
        where: {
          post: { userId }
        },
        _count: { _all: true }
      }),
      prisma.socialAccount.findMany({
        where: { userId },
        select: {
          platform: true,
          status: true,
          accountName: true,
          accountUsername: true
        }
      })
    ]);

    // Format platform publishing statistics
    const platforms = ['FACEBOOK', 'INSTAGRAM', 'LINKEDIN', 'THREADS', 'TIKTOK', 'YOUTUBE'];
    const perPlatformStats = {};

    platforms.forEach(p => {
      const published = platformCounts.find(pc => pc.platform === p && pc.status === 'PUBLISHED')?._count._all || 0;
      const failed = platformCounts.find(pc => pc.platform === p && pc.status === 'FAILED')?._count._all || 0;
      const publishing = platformCounts.find(pc => pc.platform === p && pc.status === 'PUBLISHING')?._count._all || 0;
      const pending = platformCounts.find(pc => pc.platform === p && pc.status === 'PENDING')?._count._all || 0;

      perPlatformStats[p] = {
        total: published + failed + publishing + pending,
        published,
        failed,
        publishing,
        pending
      };
    });

    res.json({
      success: true,
      data: {
        summary: {
          totalPosts,
          publishedPosts,
          failedPosts,
          scheduledPosts,
          partiallyPublishedPosts,
          draftPosts,
          successRate: totalPosts > 0 ? Math.round((publishedPosts / totalPosts) * 100) : 0,
          connectedAccountsCount: connectedAccounts.length
        },
        perPlatformStats,
        connectedAccounts,
        externalMetricsNotice: {
          status: 'CONFIGURATION_REQUIRED',
          message: 'Official platform engagement metrics (impressions, clicks, reach) require approved Meta, LinkedIn, and X Developer Business App reviews.'
        }
      }
    });
  } catch (error) {
    next(error);
  }
}
