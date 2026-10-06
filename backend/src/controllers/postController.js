import { z } from 'zod';
import { prisma } from '../utils/prisma.js';
import { publishingService } from '../services/publishingService.js';
import { config } from '../config/index.js';

export const createPostSchema = z.object({
  caption: z.string().min(1, 'Caption is required').max(5000, 'Caption is too long'),
  mediaUrl: z.string().optional().nullable(),
  mediaType: z.string().optional().nullable(),
  scheduledAt: z.string().datetime().optional().nullable(),
  platforms: z.array(
    z.object({
      platform: z.enum(['FACEBOOK', 'INSTAGRAM', 'LINKEDIN', 'X', 'THREADS', 'TIKTOK']),
      socialAccountId: z.string().min(1, 'Social account ID is required')
    })
  ).min(1, 'At least one platform must be selected')
});

/**
 * Create and publish or schedule a new post
 */
export async function createPost(req, res, next) {
  try {
    const { caption, mediaUrl, mediaType, scheduledAt, platforms } = req.body;
    const userId = req.user.id;

    // Normalize mediaType to uppercase 'IMAGE', 'VIDEO', or 'NONE'
    let normalizedMediaType = 'NONE';
    if (mediaType) {
      const upper = String(mediaType).toUpperCase();
      if (upper === 'IMAGE' || upper === 'VIDEO') {
        normalizedMediaType = upper;
      }
    }
    // Auto-infer from mediaUrl extension if mediaType was not explicitly provided or NONE
    if (normalizedMediaType === 'NONE' && mediaUrl) {
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

    // Determine initial status: SCHEDULED if scheduled in future, else DRAFT / PUBLISHING
    const isScheduled = scheduledAt && new Date(scheduledAt) > new Date();
    const initialPostStatus = isScheduled ? 'SCHEDULED' : 'DRAFT';

    // Create Post and PostPlatform records in database
    const post = await prisma.post.create({
      data: {
        userId,
        caption,
        mediaUrl: mediaUrl || null,
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

    // If immediate publication, trigger publishing workflow
    if (!isScheduled) {
      // Execute asynchronously or synchronously
      const publishedPost = await publishingService.executePublishing(post.id, userId);
      return res.status(201).json({
        success: true,
        message: 'Post created and publishing initiated',
        data: publishedPost
      });
    }

    res.status(201).json({
      success: true,
      message: 'Post scheduled successfully',
      data: post
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
      where: { id, userId, status: 'SCHEDULED' }
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Scheduled post not found or cannot be cancelled',
        error: 'POST_NOT_CANCELABLE'
      });
    }

    const updated = await prisma.post.update({
      where: { id },
      data: {
        status: 'DRAFT',
        scheduledAt: null
      }
    });

    res.json({
      success: true,
      message: 'Scheduled post cancelled and reverted to draft',
      data: updated
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

/**
 * Internal endpoint for n8n to fetch authoritative post & platforms data
 * Secured by x-socialflow-secret
 */
export async function getInternalPostById(req, res, next) {
  try {
    const secret = req.headers['x-socialflow-secret'];
    if (secret !== config.n8nApiKey) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized automation access',
        error: 'INVALID_CALLBACK_SECRET'
      });
    }

    const { id } = req.params;
    const post = await prisma.post.findUnique({
      where: { id },
      include: {
        platforms: {
          include: {
            socialAccount: {
              select: {
                id: true,
                platform: true,
                accountName: true,
                accountUsername: true,
                platformUserId: true
              }
            }
          }
        }
      }
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found',
        error: 'POST_NOT_FOUND'
      });
    }

    let fullMediaUrl = post.mediaUrl;
    if (fullMediaUrl && fullMediaUrl.startsWith('/')) {
      fullMediaUrl = `${config.backendUrl}${fullMediaUrl}`;
    }

    res.json({
      success: true,
      data: {
        ...post,
        mediaUrl: fullMediaUrl
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Internal endpoint for n8n to trigger publishing a single platform via official backend provider
 * Secured by x-socialflow-secret
 */
export async function publishInternalPlatform(req, res, next) {
  try {
    const secret = req.headers['x-socialflow-secret'];
    if (secret !== config.n8nApiKey) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized automation access',
        error: 'INVALID_CALLBACK_SECRET'
      });
    }

    const { id: postId } = req.params;
    const { platform, socialAccountId } = req.body;

    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        platforms: {
          include: { socialAccount: true }
        }
      }
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found',
        error: 'POST_NOT_FOUND'
      });
    }

    const targetPlatform = post.platforms.find(
      p => p.platform === (platform || '').toUpperCase() && (!socialAccountId || p.socialAccountId === socialAccountId)
    );

    if (!targetPlatform) {
      return res.status(404).json({
        success: false,
        message: `Target platform ${platform} not found for post`,
        error: 'TARGET_NOT_FOUND'
      });
    }

    const updatedPlatform = await publishingService.publishSinglePlatform(post, targetPlatform);

    // Recompute composite status
    const allPlatforms = await prisma.postPlatform.findMany({ where: { postId } });
    const newStatus = publishingService.computePostStatus(allPlatforms);

    await prisma.post.update({
      where: { id: postId },
      data: { status: newStatus }
    });

    res.json({
      success: updatedPlatform.status === 'PUBLISHED',
      data: {
        platform: updatedPlatform.platform,
        status: updatedPlatform.status,
        platformPostId: updatedPlatform.platformPostId,
        errorMessage: updatedPlatform.errorMessage
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Internal callback endpoint for n8n or worker to update platform publishing result
 */
export async function handlePublishResultCallback(req, res, next) {
  try {
    const secret = req.headers['x-socialflow-secret'];
    if (secret !== config.n8nApiKey) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized automation callback',
        error: 'INVALID_CALLBACK_SECRET'
      });
    }

    const { id: postId } = req.params;
    const { executionId, results, platform, status, platformPostId, errorMessage } = req.body;

    const itemsToUpdate = Array.isArray(results) && results.length > 0 
      ? results 
      : [{ platform, status, platformPostId, errorMessage }];

    for (const item of itemsToUpdate) {
      if (!item.platform) continue;
      const targetPlatform = item.platform.toUpperCase();
      const postPlatform = await prisma.postPlatform.findFirst({
        where: {
          postId,
          platform: targetPlatform
        }
      });

      if (postPlatform) {
        const itemStatus = (item.status || 'PUBLISHED').toUpperCase();
        await prisma.postPlatform.update({
          where: { id: postPlatform.id },
          data: {
            status: itemStatus,
            platformPostId: item.platformPostId || null,
            errorMessage: item.errorMessage || null,
            publishedAt: itemStatus === 'PUBLISHED' ? new Date() : null
          }
        });
      }
    }

    // Recompute composite status
    const allPlatforms = await prisma.postPlatform.findMany({ where: { postId } });
    const newStatus = publishingService.computePostStatus(allPlatforms);

    // If executionId provided, update latest PublishingJob
    if (executionId) {
      const latestJob = await prisma.publishingJob.findFirst({
        where: { postId },
        orderBy: { createdAt: 'desc' }
      });
      if (latestJob) {
        const jobStatus = newStatus === 'PUBLISHED' ? 'COMPLETED' : (newStatus === 'PARTIALLY_PUBLISHED' ? 'PARTIALLY_PUBLISHED' : 'FAILED');
        await prisma.publishingJob.update({
          where: { id: latestJob.id },
          data: {
            executionId,
            status: jobStatus,
            n8nResponse: JSON.stringify(req.body)
          }
        });
      }
    }

    const updatedPost = await prisma.post.update({
      where: { id: postId },
      data: { status: newStatus }
    });

    res.json({
      success: true,
      message: 'Status updated successfully',
      data: {
        id: postId,
        status: newStatus,
        post: updatedPost
      }
    });
  } catch (error) {
    next(error);
  }
}
