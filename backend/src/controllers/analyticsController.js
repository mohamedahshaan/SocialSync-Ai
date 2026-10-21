import { prisma } from '../utils/prisma.js';

/**
 * Compute real user-isolated analytics from database records
 * Supports optional ?range=7d | 30d | 90d | all
 */
export async function getAnalytics(req, res, next) {
  try {
    const userId = req.user.id;
    const range = (req.query.range || '30d').toLowerCase();

    // Determine date boundary
    const now = new Date();
    let startDate = null;
    let daysCount = 30;

    if (range === '7d') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      daysCount = 7;
    } else if (range === '90d') {
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      daysCount = 90;
    } else if (range === 'all') {
      startDate = null;
      daysCount = 30; // generate 30 days for visual chart timeline
    } else {
      // default 30d
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      daysCount = 30;
    }

    const dateFilter = startDate ? { createdAt: { gte: startDate } } : {};

    // Run parallel queries for this user
    const [
      totalPosts,
      publishedPosts,
      failedPosts,
      scheduledPosts,
      partiallyPublishedPosts,
      draftPosts,
      platformCounts,
      connectedAccounts,
      creditsAgg,
      rangePosts,
      recentPosts
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
          id: true,
          platform: true,
          status: true,
          accountName: true,
          accountUsername: true
        }
      }),
      // Credit consumption sum
      prisma.postPlatform.aggregate({
        where: {
          post: { userId },
          creditCharged: true
        },
        _sum: {
          creditCost: true
        }
      }),
      // Posts for timeline and content type analysis (up to 500)
      prisma.post.findMany({
        where: {
          userId,
          ...dateFilter
        },
        select: {
          id: true,
          status: true,
          mediaType: true,
          mediaUrl: true,
          createdAt: true,
          scheduledAt: true
        },
        orderBy: { createdAt: 'asc' },
        take: 500
      }),
      // Recent posts for live performance feed
      prisma.post.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 6,
        select: {
          id: true,
          caption: true,
          mediaUrl: true,
          mediaType: true,
          status: true,
          createdAt: true,
          scheduledAt: true,
          platforms: {
            select: {
              platform: true,
              status: true,
              publishedAt: true,
              errorMessage: true,
              creditCost: true
            }
          }
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
      const connected = connectedAccounts.some(acc => acc.platform === p && acc.status === 'CONNECTED');
      const account = connectedAccounts.find(acc => acc.platform === p);

      perPlatformStats[p] = {
        total: published + failed + publishing + pending,
        published,
        failed,
        publishing,
        pending,
        isConnected: connected,
        accountName: account?.accountName || null,
        accountUsername: account?.accountUsername || null
      };
    });

    // Content types analysis
    let textOnlyCount = 0;
    let imageCount = 0;
    let videoCount = 0;

    rangePosts.forEach(post => {
      if (post.mediaType === 'VIDEO') {
        videoCount++;
      } else if (post.mediaType === 'IMAGE' || (post.mediaUrl && !post.mediaType)) {
        imageCount++;
      } else {
        textOnlyCount++;
      }
    });

    const totalRangePosts = rangePosts.length;
    const contentTypes = {
      text: {
        count: textOnlyCount,
        percentage: totalRangePosts > 0 ? Math.round((textOnlyCount / totalRangePosts) * 100) : 0
      },
      image: {
        count: imageCount,
        percentage: totalRangePosts > 0 ? Math.round((imageCount / totalRangePosts) * 100) : 0
      },
      video: {
        count: videoCount,
        percentage: totalRangePosts > 0 ? Math.round((videoCount / totalRangePosts) * 100) : 0
      }
    };

    // Build timeline buckets
    const timelineBuckets = {};
    const timelineDays = Math.min(daysCount, 30); // show up to 30 intervals on charts
    const dayMs = 24 * 60 * 60 * 1000;

    for (let i = timelineDays - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * dayMs);
      const dateKey = d.toISOString().split('T')[0];
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const label = `${monthNames[d.getMonth()]} ${d.getDate()}`;

      timelineBuckets[dateKey] = {
        date: dateKey,
        label,
        published: 0,
        failed: 0,
        scheduled: 0,
        total: 0
      };
    }

    rangePosts.forEach(post => {
      const dateKey = post.createdAt ? new Date(post.createdAt).toISOString().split('T')[0] : null;
      if (dateKey && timelineBuckets[dateKey]) {
        timelineBuckets[dateKey].total += 1;
        if (post.status === 'PUBLISHED') {
          timelineBuckets[dateKey].published += 1;
        } else if (post.status === 'FAILED') {
          timelineBuckets[dateKey].failed += 1;
        } else if (post.status === 'SCHEDULED') {
          timelineBuckets[dateKey].scheduled += 1;
        }
      }
    });

    const timeline = Object.values(timelineBuckets);

    res.json({
      success: true,
      data: {
        range,
        summary: {
          totalPosts,
          publishedPosts,
          failedPosts,
          scheduledPosts,
          partiallyPublishedPosts,
          draftPosts,
          successRate: totalPosts > 0 ? Math.round((publishedPosts / totalPosts) * 100) : 0,
          connectedAccountsCount: connectedAccounts.length,
          creditsConsumed: creditsAgg._sum.creditCost || 0
        },
        timeline,
        contentTypes,
        recentDeliveries: recentPosts,
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
