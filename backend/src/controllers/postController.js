import { z } from 'zod';
import { prisma } from '../utils/prisma.js';
import { publishingService } from '../services/publishingService.js';
import { storageService } from '../services/storageService.js';
import { platformRateService, DEFAULT_PLATFORM_RATES } from '../services/platformRateService.js';
import { getMaxTargetPlatformsForPlan } from '../services/planService.js';
import { checkSchedulingEntitlement } from '../middleware/auth.js';

export const PLATFORM_POINT_COSTS = DEFAULT_PLATFORM_RATES;

export const createPostSchema = z.object({
  caption: z.string().min(1, 'Caption is required').max(5000, 'Caption is too long'),
  mediaUrl: z.string().optional().nullable(),
  mediaUrls: z.array(z.string()).optional().nullable(),
  mediaType: z.string().optional().nullable(),
  scheduledAt: z.string().datetime().optional().nullable(),
  draftId: z.string().optional().nullable(),
  platforms: z.array(
    z.object({
      platform: z.enum(['FACEBOOK', 'INSTAGRAM', 'LINKEDIN', 'THREADS', 'TIKTOK', 'YOUTUBE', 'X']),
      socialAccountId: z.string().min(1, 'Social account ID is required')
    })
  ).min(1, 'At least one platform must be selected')
});

export const saveDraftSchema = z.object({
  id: z.string().optional().nullable(),
  draftId: z.string().optional().nullable(),
  caption: z.string().max(5000, 'Caption is too long').optional().nullable(),
  mediaUrl: z.string().optional().nullable(),
  mediaUrls: z.array(z.string()).optional().nullable(),
  mediaType: z.string().optional().nullable(),
  scheduledAt: z.string().optional().nullable(),
  clientTimestamp: z.number().optional().nullable(),
  version: z.number().optional().nullable(),
  platforms: z.array(
    z.object({
      platform: z.enum(['FACEBOOK', 'INSTAGRAM', 'LINKEDIN', 'THREADS', 'TIKTOK', 'YOUTUBE', 'X']),
      socialAccountId: z.string().optional().nullable()
    })
  ).optional().nullable()
});

/**
 * Strips internal per-platform rates to preserve rate confidentiality (Requirement 3),
 * while accurately computing and presenting totalCreditsDeducted and totalCreditsReserved.
 */
export function sanitizePostForUser(post, explicitCreditsDeducted, explicitRemainingCredits) {
  if (!post) return post;
  const postObj = typeof post.toJSON === 'function' ? post.toJSON() : JSON.parse(JSON.stringify(post));

  const chargedPlatforms = (postObj.platforms || []).filter(p => p.creditCharged);
  const totalCharged = chargedPlatforms.reduce((sum, p) => sum + (p.creditCost || 0), 0);
  const totalReserved = (postObj.platforms || []).reduce((sum, p) => sum + (p.creditCost || 0), 0);

  postObj.totalCreditsDeducted = explicitCreditsDeducted !== undefined ? explicitCreditsDeducted : totalCharged;
  postObj.pointsDeducted = postObj.totalCreditsDeducted;
  if (postObj.status === 'SCHEDULED') {
    postObj.totalCreditsReserved = totalReserved;
  }
  if (explicitRemainingCredits !== undefined) {
    postObj.remainingCredits = explicitRemainingCredits;
  }

  // Ensure mediaUrls is easily accessible as an array for frontend restoration
  if (postObj.mediaUrl) {
    postObj.mediaUrls = postObj.mediaUrl.split(',').map(s => s.trim()).filter(Boolean);
  } else {
    postObj.mediaUrls = [];
  }

  // Strip confidential per-platform rates to strictly enforce rate confidentiality on the backend
  if (Array.isArray(postObj.platforms)) {
    postObj.platforms = postObj.platforms.map(p => {
      const { creditCost, ...safePlatform } = p;
      return safePlatform;
    });
  }

  return postObj;
}

/**
 * Create and publish or schedule a new post with automatic points deduction
 */
export async function createPost(req, res, next) {
  try {
    const { caption, mediaUrl, mediaUrls, mediaType, scheduledAt, platforms, draftId } = req.body;
    const userId = req.user.id;

    // Check if updating an existing draft post
    let existingDraft = null;
    if (draftId) {
      const candidatePost = await prisma.post.findUnique({
        where: { id: draftId },
        select: { id: true, userId: true, status: true }
      });

      if (candidatePost) {
        // Enforce strict tenant isolation: draft cannot belong to another user
        if (candidatePost.userId !== userId) {
          return res.status(403).json({
            success: false,
            message: 'Unauthorized: Access to draft denied.',
            error: 'FORBIDDEN_DRAFT_ACCESS'
          });
        }
        // Only reuse this record if it is genuinely still in DRAFT status
        if (candidatePost.status === 'DRAFT') {
          existingDraft = candidatePost;
        }
      }
      // If candidatePost does not exist or has already been published/scheduled,
      // existingDraft remains null so we proceed creating and broadcasting a fresh post without blocking the user!
    }

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

    // Verify user exists and fetch current subscription plan & balance
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, credits: true, email: true, plan: true }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User account not found.',
        error: 'USER_NOT_FOUND'
      });
    }

    // 1. Prevent duplicate platform entries or accounts from bypassing limits
    const requestedAccountIds = platforms.map(p => p.socialAccountId);
    const distinctAccountIds = new Set(requestedAccountIds);
    if (distinctAccountIds.size !== requestedAccountIds.length) {
      return res.status(400).json({
        success: false,
        message: 'Duplicate target platforms or accounts cannot be selected for the same post.',
        error: 'DUPLICATE_PLATFORM_SELECTION'
      });
    }

    const distinctPlatforms = new Set(platforms.map(p => String(p.platform).toUpperCase()));
    if (distinctPlatforms.size !== platforms.length) {
      return res.status(400).json({
        success: false,
        message: 'Duplicate platform types cannot be selected for the same post.',
        error: 'DUPLICATE_PLATFORM_SELECTION'
      });
    }

    // 2. CRITICAL USER DATA ISOLATION:
    // Validate that every requested socialAccountId strictly belongs to the authenticated user!
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

    // 3. ENFORCE PLAN-BASED TARGET PLATFORM SELECTION LIMIT (Bypassed for Admins):
    const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(user.role);
    const userPlan = user.plan || 'FREE';
    const maxAllowedPlatforms = isAdmin ? 100 : getMaxTargetPlatformsForPlan(userPlan);

    if (!isAdmin && (distinctPlatforms.size > maxAllowedPlatforms || platforms.length > maxAllowedPlatforms)) {
      const planName = userPlan.charAt(0) + userPlan.slice(1).toLowerCase();
      return res.status(403).json({
        success: false,
        message: `Your current ${planName} plan allows selecting a maximum of ${maxAllowedPlatforms} target platform${maxAllowedPlatforms === 1 ? '' : 's'} per post. Upgrade to unlock more platforms.`,
        error: 'PLAN_PLATFORM_LIMIT_EXCEEDED',
        plan: userPlan,
        limit: maxAllowedPlatforms,
        selected: platforms.length
      });
    }

    // 4. Calculate total dynamic credits required across selected platforms from PostgreSQL
    const { totalCredits: totalPointsRequired, platformCosts } = await platformRateService.calculateTotalCost(platforms);

    if (!isAdmin && user.credits < totalPointsRequired) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient credits to complete this broadcast. Please upgrade your package tier or top up credits.',
        error: 'INSUFFICIENT_CREDITS'
      });
    }

    // Determine initial status: validate future scheduledAt if provided
    const isScheduled = Boolean(scheduledAt);
    if (isScheduled) {
      const entitlement = await checkSchedulingEntitlement(userId);
      if (!entitlement.allowed) {
        return res.status(entitlement.status).json({
          success: false,
          error: entitlement.error,
          code: entitlement.code,
          message: entitlement.message,
          requiredPlan: entitlement.requiredPlan,
          currentPlan: entitlement.currentPlan,
          subscriptionStatus: entitlement.subscriptionStatus
        });
      }

      const scheduleTime = new Date(scheduledAt);
      if (isNaN(scheduleTime.getTime()) || scheduleTime <= new Date()) {
        return res.status(400).json({
          success: false,
          message: 'Scheduled publication date and time must be in the future.',
          error: 'INVALID_SCHEDULE_DATE'
        });
      }
    }
    const initialPostStatus = isScheduled ? 'SCHEDULED' : 'DRAFT';

    // Transactionally reserve credits, record ledger transaction, and create or update post with snapshot creditCost
    const { post, updatedUser } = await prisma.$transaction(async (tx) => {
      let uUser = user;
      const pointsToDeduct = isAdmin ? 0 : totalPointsRequired;

      if (pointsToDeduct > 0) {
        // 1. Hold reserved credits from user balance to prevent double-spending
        uUser = await tx.user.update({
          where: { id: userId },
          data: {
            credits: { decrement: pointsToDeduct }
          },
          select: { id: true, credits: true }
        });

        // 2. Log credit reservation audit transaction
        await tx.creditTransaction.create({
          data: {
            userId,
            amount: -pointsToDeduct,
            balanceAfter: uUser.credits,
            type: 'USAGE_DEDUCT',
            reason: isScheduled
              ? `Credit hold for scheduled post across ${platforms.length} channel(s)`
              : `Credit hold for broadcast across ${platforms.length} channel(s)`
          }
        });
      }

      let postRecord;

      if (existingDraft) {
        // If converting an existing draft, delete previous draft platforms to replace with current selection
        await tx.postPlatform.deleteMany({ where: { postId: existingDraft.id } });

        postRecord = await tx.post.update({
          where: { id: existingDraft.id },
          data: {
            caption,
            mediaUrl: finalMediaUrl || null,
            mediaType: normalizedMediaType,
            status: initialPostStatus,
            scheduledAt: isScheduled ? new Date(scheduledAt) : null,
            platforms: {
              create: platforms.map(p => {
                const costItem = platformCosts.find(c => c.platform === String(p.platform).toUpperCase());
                return {
                  platform: p.platform,
                  socialAccountId: p.socialAccountId,
                  status: 'PENDING',
                  creditCost: costItem ? costItem.costCredits : 5,
                  creditCharged: false,
                  creditRefunded: false
                };
              })
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
      } else {
        // 3. Create Post and PostPlatform records in database with snapshot credit costs
        postRecord = await tx.post.create({
          data: {
            userId,
            caption,
            mediaUrl: finalMediaUrl || null,
            mediaType: normalizedMediaType,
            status: initialPostStatus,
            scheduledAt: isScheduled ? new Date(scheduledAt) : null,
            platforms: {
              create: platforms.map(p => {
                const costItem = platformCosts.find(c => c.platform === String(p.platform).toUpperCase());
                return {
                  platform: p.platform,
                  socialAccountId: p.socialAccountId,
                  status: 'PENDING',
                  creditCost: costItem ? costItem.costCredits : 5,
                  creditCharged: false,
                  creditRefunded: false
                };
              })
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
      }

      return { post: postRecord, updatedUser: uUser };
    });

    // If immediate publication, trigger publishing workflow with independent destination settlement
    if (!isScheduled) {
      const publishedPost = await publishingService.executePublishing(post.id, userId);

      const finalUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { credits: true }
      });

      const actualCharged = (publishedPost.platforms || [])
        .filter(p => p.status === 'PUBLISHED')
        .reduce((sum, p) => sum + (p.creditCost || 0), 0);

      return res.status(201).json({
        success: true,
        message: 'Post created and publishing initiated',
        data: sanitizePostForUser(publishedPost, actualCharged, finalUser ? finalUser.credits : updatedUser.credits)
      });
    }

    res.status(201).json({
      success: true,
      message: 'Post scheduled successfully',
      data: sanitizePostForUser(post, totalPointsRequired, updatedUser.credits)
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Save or update a draft post without publishing or deducting credits
 */
export async function saveDraft(req, res, next) {
  try {
    const userId = req.user.id;
    const draftId = req.params.id || req.body.id || req.body.draftId || null;
    const { caption, mediaUrl, mediaUrls, mediaType, scheduledAt, platforms } = req.body;

    // Support multiple images or single mediaUrl
    let finalMediaUrl = mediaUrl || null;
    if (Array.isArray(mediaUrls) && mediaUrls.length > 0) {
      finalMediaUrl = mediaUrls.filter(Boolean).join(',');
    }

    // Normalize mediaType to uppercase 'IMAGE', 'VIDEO', or 'NONE'
    let normalizedMediaType = 'NONE';
    if (mediaType) {
      const upper = String(mediaType).toUpperCase();
      if (upper === 'IMAGE' || upper === 'VIDEO') {
        normalizedMediaType = upper;
      }
    }
    if (normalizedMediaType === 'NONE' && finalMediaUrl) {
      const cleanPath = finalMediaUrl.split(',')[0].split('?')[0].toLowerCase();
      if (cleanPath.endsWith('.mp4') || cleanPath.endsWith('.mov')) {
        normalizedMediaType = 'VIDEO';
      } else if (cleanPath.endsWith('.jpg') || cleanPath.endsWith('.jpeg') || cleanPath.endsWith('.png') || cleanPath.endsWith('.webp')) {
        normalizedMediaType = 'IMAGE';
      }
    }

    let parsedScheduledAt = null;
    if (scheduledAt) {
      const d = new Date(scheduledAt);
      if (!isNaN(d.getTime())) {
        parsedScheduledAt = d;
      }
    }

    // Filter valid platforms that have a socialAccountId belonging to this user
    let validPlatforms = [];
    if (Array.isArray(platforms) && platforms.length > 0) {
      const candidateAccounts = platforms.filter(p => p && p.socialAccountId);
      if (candidateAccounts.length > 0) {
        const accountIds = candidateAccounts.map(p => p.socialAccountId);
        const userAccounts = await prisma.socialAccount.findMany({
          where: {
            id: { in: accountIds },
            userId: userId
          }
        });
        const userAccountMap = new Map(userAccounts.map(a => [a.id, a]));
        validPlatforms = candidateAccounts.filter(p => userAccountMap.has(p.socialAccountId));

        // Deduplicate platforms for draft
        const seenPlatforms = new Set();
        validPlatforms = validPlatforms.filter(p => {
          const key = String(p.platform).toUpperCase();
          if (seenPlatforms.has(key)) return false;
          seenPlatforms.add(key);
          return true;
        });

        // Enforce user plan target platform selection limit (bypassed for admins)
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { plan: true, role: true }
        });
        const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(user?.role);
        const maxAllowedPlatforms = isAdmin ? 100 : getMaxTargetPlatformsForPlan(user?.plan);
        if (!isAdmin && validPlatforms.length > maxAllowedPlatforms) {
          const userPlan = user?.plan || 'FREE';
          const planName = userPlan.charAt(0) + userPlan.slice(1).toLowerCase();
          return res.status(403).json({
            success: false,
            message: `Your current ${planName} plan allows selecting a maximum of ${maxAllowedPlatforms} target platform${maxAllowedPlatforms === 1 ? '' : 's'} per post. Upgrade to unlock more platforms.`,
            error: 'PLAN_PLATFORM_LIMIT_EXCEEDED',
            plan: userPlan,
            limit: maxAllowedPlatforms,
            selected: validPlatforms.length
          });
        }
      }
    }

    let savedDraft;

    if (draftId) {
      // 1. Updating an existing draft: verify user ownership and DRAFT status
      const existing = await prisma.post.findUnique({
        where: { id: draftId },
        select: { id: true, userId: true, status: true, caption: true, mediaUrl: true }
      });

      if (existing) {
        if (existing.userId !== userId) {
          return res.status(404).json({
            success: false,
            message: 'Draft post not found or access denied',
            error: 'DRAFT_NOT_FOUND'
          });
        }

        if (existing.status === 'DRAFT') {
          savedDraft = await prisma.$transaction(async (tx) => {
            // Remove previous post platforms and re-create current ones
            await tx.postPlatform.deleteMany({ where: { postId: draftId } });

            const updated = await tx.post.update({
              where: { id: draftId },
              data: {
                caption: caption !== undefined ? String(caption) : existing.caption,
                mediaUrl: finalMediaUrl !== undefined ? finalMediaUrl : existing.mediaUrl,
                mediaType: normalizedMediaType,
                scheduledAt: parsedScheduledAt,
                status: 'DRAFT',
                platforms: validPlatforms.length > 0 ? {
                  create: validPlatforms.map(p => ({
                    socialAccountId: p.socialAccountId,
                    platform: p.platform,
                    status: 'PENDING',
                    creditCost: 0,
                    creditCharged: false,
                    creditRefunded: false
                  }))
                } : undefined
              },
              include: {
                platforms: {
                  include: {
                    socialAccount: {
                      select: { id: true, platform: true, accountName: true, accountUsername: true }
                    }
                  }
                }
              }
            });

            return updated;
          });
        }
      }
      // If existing draft is not found or already published/scheduled, fall through to create a new draft
    }

    if (!savedDraft) {
      // 2. Creating a new draft: 0 credits deducted, incomplete drafts allowed
      savedDraft = await prisma.post.create({
        data: {
          userId,
          caption: caption !== undefined ? String(caption) : '',
          mediaUrl: finalMediaUrl,
          mediaType: normalizedMediaType,
          scheduledAt: parsedScheduledAt,
          status: 'DRAFT',
          platforms: validPlatforms.length > 0 ? {
            create: validPlatforms.map(p => ({
              socialAccountId: p.socialAccountId,
              platform: p.platform,
              status: 'PENDING',
              creditCost: 0,
              creditCharged: false,
              creditRefunded: false
            }))
          } : undefined
        },
        include: {
          platforms: {
            include: {
              socialAccount: {
                select: { id: true, platform: true, accountName: true, accountUsername: true }
              }
            }
          }
        }
      });
    }

    return res.status(draftId ? 200 : 201).json({
      success: true,
      message: 'Draft saved successfully',
      data: sanitizePostForUser(savedDraft, 0)
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get the most recent unfinished draft for the authenticated user
 */
export async function getLatestDraft(req, res, next) {
  try {
    const userId = req.user.id;
    const latestDraft = await prisma.post.findFirst({
      where: {
        userId,
        status: 'DRAFT'
      },
      orderBy: {
        updatedAt: 'desc'
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

    return res.json({
      success: true,
      data: latestDraft ? sanitizePostForUser(latestDraft, 0) : null
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

    const orderBy = status === 'DRAFT'
      ? { updatedAt: 'desc' }
      : { createdAt: 'desc' };

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        take,
        skip,
        orderBy,
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
        posts: posts.map(p => sanitizePostForUser(p)),
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
      data: sanitizePostForUser(post)
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
      data: sanitizePostForUser(updatedPost)
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

    // Calculate points to refund based on uncharged platforms
    const unchargedPlatforms = (post.platforms || []).filter(p => !p.creditCharged && !p.creditRefunded);
    const refundPoints = unchargedPlatforms.reduce((acc, p) => {
      const norm = String(p.platform).toUpperCase();
      return acc + (p.creditCost || PLATFORM_POINT_COSTS[norm] || 0);
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
            reason: `Credit refund for cancelled scheduled post #${id.slice(-6)} (${refundPoints} credits refunded)`
          }
        });

        await tx.postPlatform.updateMany({
          where: { id: { in: unchargedPlatforms.map(p => p.id) } },
          data: { creditRefunded: true }
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
      data: sanitizePostForUser(updatedPost),
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

    const entitlement = await checkSchedulingEntitlement(userId);
    if (!entitlement.allowed) {
      return res.status(entitlement.status).json({
        success: false,
        error: entitlement.error,
        code: entitlement.code,
        message: entitlement.message,
        requiredPlan: entitlement.requiredPlan,
        currentPlan: entitlement.currentPlan,
        subscriptionStatus: entitlement.subscriptionStatus
      });
    }

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

    if (post.status === 'PUBLISHING' || post.status === 'PUBLISHED') {
      return res.status(400).json({
        success: false,
        message: `Cannot reschedule a post that is already ${post.status.toLowerCase()}.`,
        error: 'INVALID_POST_STATE'
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
      data: sanitizePostForUser(updated)
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update an existing scheduled post (caption, media, platforms, or scheduledAt)
 */
export async function updateScheduledPost(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { caption, mediaUrl, mediaUrls, mediaType, scheduledAt, platforms } = req.body;

    const entitlement = await checkSchedulingEntitlement(userId);
    if (!entitlement.allowed) {
      return res.status(entitlement.status).json({
        success: false,
        error: entitlement.error,
        code: entitlement.code,
        message: entitlement.message,
        requiredPlan: entitlement.requiredPlan,
        currentPlan: entitlement.currentPlan,
        subscriptionStatus: entitlement.subscriptionStatus
      });
    }

    const post = await prisma.post.findFirst({
      where: { id, userId, status: 'SCHEDULED' },
      include: { platforms: true }
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Scheduled post not found or cannot be modified in its current state.',
        error: 'POST_NOT_FOUND'
      });
    }

    // Validate scheduledAt if provided
    let newScheduledAt = post.scheduledAt;
    if (scheduledAt) {
      const parsedDate = new Date(scheduledAt);
      if (isNaN(parsedDate.getTime()) || parsedDate <= new Date()) {
        return res.status(400).json({
          success: false,
          message: 'Scheduled publication date and time must be in the future.',
          error: 'INVALID_SCHEDULE_DATE'
        });
      }
      newScheduledAt = parsedDate;
    }

    // Media normalization
    let finalMediaUrl = mediaUrl !== undefined ? mediaUrl : post.mediaUrl;
    if (Array.isArray(mediaUrls) && mediaUrls.length > 0) {
      finalMediaUrl = mediaUrls.filter(Boolean).join(',');
    }

    let finalMediaType = mediaType || post.mediaType;

    let updatedPost;
    let finalUserCredits;

    // If platforms array is provided and not empty, update platforms and settle credit difference
    if (Array.isArray(platforms) && platforms.length > 0) {
      const requestedAccountIds = platforms.map(p => p.socialAccountId);
      const userAccounts = await prisma.socialAccount.findMany({
        where: { id: { in: requestedAccountIds }, userId }
      });

      if (userAccounts.length !== requestedAccountIds.length) {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized: One or more selected accounts do not belong to you.',
          error: 'FORBIDDEN_ACCOUNT_ACCESS'
        });
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, credits: true, plan: true, role: true }
      });

      const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(user?.role);
      const maxAllowed = isAdmin ? 100 : getMaxTargetPlatformsForPlan(user?.plan);
      if (!isAdmin && platforms.length > maxAllowed) {
        return res.status(403).json({
          success: false,
          message: `Your current plan allows a maximum of ${maxAllowed} target platforms.`,
          error: 'PLAN_PLATFORM_LIMIT_EXCEEDED'
        });
      }

      const { totalCredits: newTotalCost, platformCosts } = await platformRateService.calculateTotalCost(platforms);
      const previouslyReserved = post.platforms
        .filter(p => !p.creditCharged && !p.creditRefunded)
        .reduce((sum, p) => sum + (p.creditCost || 0), 0);

      const netDelta = isAdmin ? 0 : (newTotalCost - previouslyReserved);

      if (!isAdmin && netDelta > 0 && user.credits < netDelta) {
        return res.status(400).json({
          success: false,
          message: `Insufficient credits to adjust platforms. Requires ${netDelta} additional credits.`,
          error: 'INSUFFICIENT_CREDITS'
        });
      }

      const result = await prisma.$transaction(async (tx) => {
        let uUser = user;
        if (netDelta > 0) {
          uUser = await tx.user.update({
            where: { id: userId },
            data: { credits: { decrement: netDelta } },
            select: { id: true, credits: true }
          });
          await tx.creditTransaction.create({
            data: {
              userId,
              amount: -netDelta,
              balanceAfter: uUser.credits,
              type: 'USAGE_DEDUCT',
              reason: `Credit hold adjustment for updated channels on scheduled post #${id.slice(-6)}`
            }
          });
        } else if (netDelta < 0) {
          const refundAmount = Math.abs(netDelta);
          uUser = await tx.user.update({
            where: { id: userId },
            data: { credits: { increment: refundAmount } },
            select: { id: true, credits: true }
          });
          await tx.creditTransaction.create({
            data: {
              userId,
              amount: refundAmount,
              balanceAfter: uUser.credits,
              type: 'REFUND',
              reason: `Credit refund for reduced channels on scheduled post #${id.slice(-6)}`
            }
          });
        }

        await tx.postPlatform.deleteMany({ where: { postId: id } });

        const up = await tx.post.update({
          where: { id },
          data: {
            caption: caption !== undefined ? caption : post.caption,
            mediaUrl: finalMediaUrl,
            mediaType: finalMediaType,
            scheduledAt: newScheduledAt,
            platforms: {
              create: platforms.map(p => {
                const costItem = platformCosts.find(c => c.platform === String(p.platform).toUpperCase());
                return {
                  platform: p.platform,
                  socialAccountId: p.socialAccountId,
                  status: 'PENDING',
                  creditCost: costItem ? costItem.costCredits : 5,
                  creditCharged: false,
                  creditRefunded: false
                };
              })
            }
          },
          include: {
            platforms: {
              include: {
                socialAccount: {
                  select: { id: true, platform: true, accountName: true, accountUsername: true }
                }
              }
            }
          }
        });

        return { up, credits: uUser.credits };
      });

      updatedPost = result.up;
      finalUserCredits = result.credits;
    } else {
      updatedPost = await prisma.post.update({
        where: { id },
        data: {
          caption: caption !== undefined ? caption : post.caption,
          mediaUrl: finalMediaUrl,
          mediaType: finalMediaType,
          scheduledAt: newScheduledAt
        },
        include: {
          platforms: {
            include: {
              socialAccount: {
                select: { id: true, platform: true, accountName: true, accountUsername: true }
              }
            }
          }
        }
      });
    }

    res.json({
      success: true,
      message: 'Scheduled post updated successfully',
      data: sanitizePostForUser(updatedPost),
      remainingCredits: finalUserCredits
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Publish a scheduled or draft post immediately without waiting for scheduled time
 */
export async function publishNow(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const post = await prisma.post.findFirst({
      where: { id, userId },
      include: {
        platforms: {
          include: { socialAccount: true }
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

    if (post.status === 'PUBLISHING') {
      return res.status(400).json({
        success: false,
        message: 'Post is currently publishing',
        error: 'ALREADY_PUBLISHING'
      });
    }

    // Verify user plan and enforce plan-based target platform selection limit
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, credits: true, plan: true }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User account not found',
        error: 'USER_NOT_FOUND'
      });
    }

    const userPlan = user.plan || 'FREE';
    const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(user.role);
    const maxAllowedPlatforms = isAdmin ? 100 : getMaxTargetPlatformsForPlan(userPlan);
    const distinctPlatforms = new Set((post.platforms || []).map(p => String(p.platform).toUpperCase()));
    if (!isAdmin && (distinctPlatforms.size > maxAllowedPlatforms || (post.platforms || []).length > maxAllowedPlatforms)) {
      const planName = userPlan.charAt(0) + userPlan.slice(1).toLowerCase();
      return res.status(403).json({
        success: false,
        message: `Your current ${planName} plan allows selecting a maximum of ${maxAllowedPlatforms} target platform${maxAllowedPlatforms === 1 ? '' : 's'} per post. Upgrade to unlock more platforms.`,
        error: 'PLAN_PLATFORM_LIMIT_EXCEEDED',
        plan: userPlan,
        limit: maxAllowedPlatforms,
        selected: (post.platforms || []).length
      });
    }

    if (post.status === 'DRAFT') {
      if (!post.caption || !post.caption.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Draft must have a caption before publishing. Please edit the draft.',
          error: 'DRAFT_INCOMPLETE'
        });
      }
      if (!post.platforms || post.platforms.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Draft must have at least one target platform selected before publishing. Please edit the draft.',
          error: 'DRAFT_INCOMPLETE'
        });
      }

      // Check required credits
      const { totalCredits: requiredCredits, platformCosts } = await platformRateService.calculateTotalCost(
        post.platforms.map(p => ({ platform: p.platform, socialAccountId: p.socialAccountId }))
      );

      if (!isAdmin && user.credits < requiredCredits) {
        return res.status(400).json({
          success: false,
          message: 'Insufficient credits to publish this draft. Please upgrade your package tier or top up credits.',
          error: 'INSUFFICIENT_CREDITS'
        });
      }

      const pointsToDeduct = isAdmin ? 0 : requiredCredits;

      // Reserve credits and set platform creditCosts
      await prisma.$transaction(async (tx) => {
        let uUser = user;
        if (pointsToDeduct > 0) {
          uUser = await tx.user.update({
            where: { id: userId },
            data: { credits: { decrement: pointsToDeduct } },
            select: { credits: true }
          });

          await tx.creditTransaction.create({
            data: {
              userId,
              amount: -pointsToDeduct,
              balanceAfter: uUser.credits,
              type: 'USAGE_DEDUCT',
              reason: `Credit hold for broadcasting draft #${id.slice(-6)} across ${post.platforms.length} channel(s)`
            }
          });
        }

        for (const p of post.platforms) {
          const costItem = platformCosts.find(c => c.platform === String(p.platform).toUpperCase());
          await tx.postPlatform.update({
            where: { id: p.id },
            data: {
              creditCost: costItem ? costItem.costCredits : 5,
              creditCharged: false,
              creditRefunded: false,
              status: 'PENDING'
            }
          });
        }

        await tx.post.update({
          where: { id },
          data: { status: 'PUBLISHING', scheduledAt: null }
        });
      });
    } else {
      // Atomically transition status to PUBLISHING for scheduled or failed posts
      const lockResult = await prisma.post.updateMany({
        where: { id, userId, status: { in: ['SCHEDULED', 'FAILED'] } },
        data: {
          status: 'PUBLISHING',
          scheduledAt: null
        }
      });

      if (lockResult.count === 0) {
        return res.status(400).json({
          success: false,
          message: 'Post cannot be published in its current state',
          error: 'INVALID_STATE'
        });
      }
    }

    const publishedPost = await publishingService.executePublishing(id, userId);

    const actualCharged = (publishedPost.platforms || [])
      .filter(p => p.status === 'PUBLISHED')
      .reduce((sum, p) => sum + (p.creditCost || 0), 0);

    const finalUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { credits: true }
    });

    res.json({
      success: true,
      message: 'Post published successfully',
      data: sanitizePostForUser(publishedPost, actualCharged, finalUser?.credits)
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Delete a single post by ID (with strict user isolation and optional credit refund if scheduled)
 */
export async function deletePost(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const post = await prisma.post.findFirst({
      where: { id, userId },
      include: { platforms: true }
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found or access denied',
        error: 'POST_NOT_FOUND'
      });
    }

    // If deleting a scheduled post that hasn't published yet, refund uncharged credits
    let refundPoints = 0;
    if (post.status === 'SCHEDULED') {
      const unchargedPlatforms = (post.platforms || []).filter(p => !p.creditCharged && !p.creditRefunded);
      refundPoints = unchargedPlatforms.reduce((acc, p) => {
        const norm = String(p.platform).toUpperCase();
        return acc + (p.creditCost || PLATFORM_POINT_COSTS[norm] || 0);
      }, 0);
    }

    await prisma.$transaction(async (tx) => {
      if (refundPoints > 0) {
        const uUser = await tx.user.update({
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
            reason: `Credit refund for deleted scheduled post #${id.slice(-6)} (${refundPoints} credits refunded)`
          }
        });
      }

      // Delete publishing jobs & platforms if any (cascades, but explicit for safety)
      await tx.publishingJob.deleteMany({ where: { postId: id } });
      await tx.postPlatform.deleteMany({ where: { postId: id } });
      await tx.post.delete({ where: { id } });
    });

    // Clean up local media file if applicable
    if (post.mediaUrl && !post.mediaUrl.startsWith('http://') && !post.mediaUrl.startsWith('https://')) {
      try {
        const filename = post.mediaUrl.split('/').pop();
        if (filename) await storageService.deleteFile(filename);
      } catch (err) {
        console.warn('Could not clean up media file:', err.message);
      }
    }

    res.json({
      success: true,
      message: `Post deleted successfully.${refundPoints > 0 ? ` ${refundPoints} credits refunded.` : ''}`,
      refundedPoints: refundPoints
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Bulk delete posts by IDs (with strict user isolation)
 */
export async function batchDeletePosts(req, res, next) {
  try {
    const { postIds } = req.body;
    const userId = req.user.id;

    if (!Array.isArray(postIds) || postIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'postIds array is required and must not be empty',
        error: 'INVALID_POST_IDS'
      });
    }

    const posts = await prisma.post.findMany({
      where: {
        id: { in: postIds },
        userId
      },
      include: { platforms: true }
    });

    if (posts.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No matching posts found to delete',
        error: 'POSTS_NOT_FOUND'
      });
    }

    const validIds = posts.map((p) => p.id);

    // Calculate total refund points for any uncharged scheduled posts in the batch
    let totalRefund = 0;
    posts.forEach((p) => {
      if (p.status === 'SCHEDULED') {
        const unchargedPlatforms = (p.platforms || []).filter(plat => !plat.creditCharged && !plat.creditRefunded);
        const refund = unchargedPlatforms.reduce((acc, plat) => {
          const norm = String(plat.platform).toUpperCase();
          return acc + (plat.creditCost || PLATFORM_POINT_COSTS[norm] || 0);
        }, 0);
        totalRefund += refund;
      }
    });

    await prisma.$transaction(async (tx) => {
      if (totalRefund > 0) {
        const uUser = await tx.user.update({
          where: { id: userId },
          data: { credits: { increment: totalRefund } },
          select: { id: true, credits: true }
        });

        await tx.creditTransaction.create({
          data: {
            userId,
            amount: totalRefund,
            balanceAfter: uUser.credits,
            type: 'REFUND',
            reason: `Credit refund for ${validIds.length} batch deleted posts (${totalRefund} credits refunded)`
          }
        });
      }

      await tx.publishingJob.deleteMany({ where: { postId: { in: validIds } } });
      await tx.postPlatform.deleteMany({ where: { postId: { in: validIds } } });
      await tx.post.deleteMany({ where: { id: { in: validIds } } });
    });

    res.json({
      success: true,
      message: `Successfully deleted ${validIds.length} post${validIds.length > 1 ? 's' : ''}.${totalRefund > 0 ? ` ${totalRefund} credits refunded.` : ''}`,
      deletedCount: validIds.length,
      refundedPoints: totalRefund
    });
  } catch (error) {
    next(error);
  }
}

