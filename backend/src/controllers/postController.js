import { z } from 'zod';
import { prisma } from '../utils/prisma.js';
import { publishingService } from '../services/publishingService.js';

export const PLATFORM_POINT_COSTS = {
  FACEBOOK: 12,
  INSTAGRAM: 15,
  LINKEDIN: 7,
  YOUTUBE: 7,
  TIKTOK: 8,
  THREADS: 5
};

export const createPostSchema = z.object({
  caption: z.string().min(1, 'Caption is required').max(5000, 'Caption is too long'),
  mediaUrl: z.string().optional().nullable(),
  mediaUrls: z.array(z.string()).optional().nullable(),
  mediaType: z.string().optional().nullable(),
  scheduledAt: z.string().datetime().optional().nullable(),
  platforms: z.array(
    z.object({
      platform: z.enum(['FACEBOOK', 'INSTAGRAM', 'LINKEDIN', 'THREADS', 'TIKTOK', 'YOUTUBE']),
      socialAccountId: z.string().min(1, 'Social account ID is required')
    })
  ).min(1, 'At least one platform must be selected')
});

/**
 * Create and publish or schedule a new post with automatic points deduction
 */
export async function createPost(req, res, next) {
  try {
    const { caption, mediaUrl, mediaUrls, mediaType, scheduledAt, platforms } = req.body;
    const userId = req.user.id;

    // Support multiple images or single mediaUrl
    let finalMediaUrl = mediaUrl || null;
    if (Array.isArray(mediaUrls) && mediaUrls.length > 0) {
      finalMediaUrl = mediaUrls.join(',');
    }

    // Normalize mediaType to uppercase 'IMAGE', 'VIDEO', or 'NONE'
    let normalizedMediaType = 'NONE';
    if (mediaType) {
      const upper = String(mediaType).toUpperCase();
      if (upper === 'IMAGE' || upper === 'VIDEO') {
        normalizedMediaType = upper;
      }
    }
    // Auto-infer from mediaUrl extension if mediaType was not explicitly provided or NONE
    if (normalizedMediaType === 'NONE' && finalMediaUrl) {
      const cleanPath = mediaUrl.split('?')[0].toLowerCase();
      if (cleanPath.endsWith('.mp4') || cleanPath.endsWith('.mov')) {
        normalizedMediaType = 'VIDEO';
      } else if (cleanPath.endsWith('.jpg') || cleanPath.endsWith('.jpeg') || cleanPath.endsWith('.png') || cleanPath.endsWith('.webp')) {
        normalizedMediaType = 'IMAGE';
      }
    }

    // CRITICAL USER DATA ISOLATION:
    // Validate that every requested socialAccountId strictly belongs to the authenticated user!
    const requestedAccountIds = platforms.map(p => p.socialAccountId);
    const userAccounts = await prisma.socialAccount.findMany({
      where: {
        id: { in: requestedAccountIds },
        userId: userId
      }
    });

    if (userAccounts.length !== requestedAccountIds.length) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized: One or more selected social accounts do not belong to you.',
        error: 'FORBIDDEN_ACCOUNT_ACCESS'
      });
    }

    // Calculate total points required across selected platforms
    const totalPointsRequired = platforms.reduce((acc, p) => {
      const norm = String(p.platform).toUpperCase();
      return acc + (PLATFORM_POINT_COSTS[norm] || 0);
    }, 0);

    // Verify user has sufficient credit points
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, credits: true, email: true }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User account not found.',
        error: 'USER_NOT_FOUND'
      });
    }

    if (user.credits < totalPointsRequired) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient credits to complete this broadcast. Please upgrade your package tier or top up credits.',
        error: 'INSUFFICIENT_CREDITS'
      });
    }

    // Determine initial status: SCHEDULED if scheduled in future, else DRAFT / PUBLISHING
    const isScheduled = scheduledAt && new Date(scheduledAt) > new Date();
    const initialPostStatus = isScheduled ? 'SCHEDULED' : 'DRAFT';

    // Transactionally deduct points, record ledger transaction, and create post
    const { post, updatedUser } = await prisma.$transaction(async (tx) => {
      // 1. Deduct points from user balance
      const uUser = await tx.user.update({
        where: { id: userId },
        data: {
          credits: { decrement: totalPointsRequired }
        },
        select: { id: true, credits: true }
      });

      // 2. Log credit deduction audit transaction
      const platformNames = platforms.map(p => p.platform).join(', ');
      await tx.creditTransaction.create({
        data: {
          userId,
          amount: -totalPointsRequired,
          balanceAfter: uUser.credits,
          type: 'USAGE_DEDUCT',
          reason: `Post publication across ${platformNames} (${totalPointsRequired} points deducted)`
        }
      });

      // 3. Create Post and PostPlatform records in database
      const newPost = await tx.post.create({
        data: {
          userId,
          caption,
          mediaUrl: finalMediaUrl || null,
          mediaType: normalizedMediaType,
          status: initialPostStatus,
          scheduledAt: isScheduled ? new Date(scheduledAt) : null,
          platforms: {
            create: platforms.map(p => ({
              platform: p.platform,
              socialAccountId: p.socialAccountId,
              status: 'PENDING'
            }))
          }
        },
        include: {
          platforms: {
            include: {
              socialAccount: {
                select: {
                  id: true,
                  platform: true,
                  accountName: true,
                  accountUsername: true
                }
              }
            }
          }
        }
      });

      return { post: newPost, updatedUser: uUser };
    });

    // If immediate publication, trigger publishing workflow
    if (!isScheduled) {
      // Execute asynchronously or synchronously
      const publishedPost = await publishingService.executePublishing(post.id, userId);
      return res.status(201).json({
        success: true,
        message: 'Post created and publishing initiated',
        data: {
          ...publishedPost,
          pointsDeducted: totalPointsRequired,
          remainingCredits: updatedUser.credits
        }
      });
    }

    res.status(201).json({
      success: true,
      message: 'Post scheduled successfully',
      data: {
        ...post,
        pointsDeducted: totalPointsRequired,
        remainingCredits: updatedUser.credits
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * List all posts for the authenticated user (strict user isolation!)
 */
export async function getPosts(req, res, next) {
  try {
    const { status, platform, search, page = '1', limit = '20' } = req.query;
    const userId = req.user.id;

    const where = {
      userId
    };

    if (status) {
      where.status = status;
    }

    if (platform) {
      where.platforms = {
        some: { platform: platform.toUpperCase() }
      };
    }

    if (search) {
      where.caption = {
        contains: search,
        mode: 'insensitive'
      };
    }

    const take = parseInt(limit, 10) || 20;
    const skip = (parseInt(page, 10) - 1) * take;

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        take,
        skip,
        orderBy: { createdAt: 'desc' },
        include: {
          platforms: {
            include: {
              socialAccount: {
                select: {
                  id: true,
                  platform: true,
                  accountName: true,
                  accountUsername: true
                }
              }
            }
          }
        }
      }),
      prisma.post.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        posts,
        pagination: {
          total,
          page: parseInt(page, 10),
          limit: take,
          totalPages: Math.ceil(total / take)
        }
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get a single post by ID (strict user isolation!)
 */
export async function getPostById(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const post = await prisma.post.findFirst({
      where: {
        id,
        userId // Enforce ownership!
      },
      include: {
        platforms: {
          include: {
            socialAccount: {
              select: {
                id: true,
                platform: true,
                accountName: true,
                accountUsername: true
              }
            }
          }
        }
      }
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found or access denied',
        error: 'POST_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      data: post
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Retry failed platforms for a post (only retries FAILED targets!)
 */
export async function retryPost(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const updatedPost = await publishingService.retryFailedPlatforms(id, userId);

    res.json({
      success: true,
      message: 'Retrying failed platforms',
      data: updatedPost
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Cancel a scheduled post
 */
export async function cancelScheduledPost(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const post = await prisma.post.findFirst({
      where: { id, userId, status: 'SCHEDULED' },
      include: { platforms: true }
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Scheduled post not found or cannot be cancelled',
        error: 'POST_NOT_CANCELABLE'
      });
    }

    // Calculate points to refund based on scheduled platforms
    const refundPoints = (post.platforms || []).reduce((acc, p) => {
      const norm = String(p.platform).toUpperCase();
      return acc + (PLATFORM_POINT_COSTS[norm] || 0);
    }, 0);

    const { updatedPost, updatedUser } = await prisma.$transaction(async (tx) => {
      let uUser = null;
      if (refundPoints > 0) {
        uUser = await tx.user.update({
          where: { id: userId },
          data: { credits: { increment: refundPoints } },
          select: { id: true, credits: true }
        });

        await tx.creditTransaction.create({
          data: {
            userId,
            amount: refundPoints,
            balanceAfter: uUser.credits,
            type: 'REFUND',
            reason: `Credit refund for cancelled scheduled post #${id.slice(-6)} (${refundPoints} points refunded)`
          }
        });
      }

      const updated = await tx.post.update({
        where: { id },
        data: {
          status: 'DRAFT',
          scheduledAt: null
        }
      });

      return { updatedPost: updated, updatedUser: uUser };
    });

    res.json({
      success: true,
      message: `Scheduled post cancelled and reverted to draft.${refundPoints > 0 ? ` ${refundPoints} points refunded.` : ''}`,
      data: updatedPost,
      refundedPoints: refundPoints,
      remainingCredits: updatedUser ? updatedUser.credits : undefined
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Reschedule a post
 */
export async function reschedulePost(req, res, next) {
  try {
    const { id } = req.params;
    const { scheduledAt } = req.body;
    const userId = req.user.id;

    if (!scheduledAt || new Date(scheduledAt) <= new Date()) {
      return res.status(400).json({
        success: false,
        message: 'A valid future date and time is required for rescheduling',
        error: 'INVALID_SCHEDULE_DATE'
      });
    }

    const post = await prisma.post.findFirst({
      where: { id, userId }
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found or access denied',
        error: 'POST_NOT_FOUND'
      });
    }

    const updated = await prisma.post.update({
      where: { id },
      data: {
        scheduledAt: new Date(scheduledAt),
        status: 'SCHEDULED'
      }
    });

    res.json({
      success: true,
      message: 'Post rescheduled successfully',
      data: updated
    });
  } catch (error) {
    next(error);
  }
}
