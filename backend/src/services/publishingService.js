import { prisma } from '../utils/prisma.js';
import { getProvider } from './social/index.js';

class PublishingService {
  /**
   * Compute composite Post status from platform results
   * @param {Array<{ status: string }>} platforms 
   * @returns {string} DRAFT | SCHEDULED | PUBLISHING | PUBLISHED | PARTIALLY_PUBLISHED | FAILED
   */
  computePostStatus(platforms) {
    if (!platforms || platforms.length === 0) return 'DRAFT';

    const published = platforms.filter(p => p.status === 'PUBLISHED').length;
    const failed = platforms.filter(p => p.status === 'FAILED').length;
    const publishing = platforms.filter(p => p.status === 'PUBLISHING' || p.status === 'PENDING').length;

    if (publishing > 0) return 'PUBLISHING';
    if (published === platforms.length) return 'PUBLISHED';
    if (failed === platforms.length) return 'FAILED';
    if (published > 0 && failed > 0) return 'PARTIALLY_PUBLISHED';

    return 'DRAFT';
  }

  /**
   * Publish a single post platform target independently
   * @param {Object} post 
   * @param {Object} postPlatform 
   */
  async publishSinglePlatform(post, postPlatform) {
    const platformName = postPlatform.platform;
    const socialAccount = postPlatform.socialAccount;

    // Update target status to PUBLISHING
    await prisma.postPlatform.update({
      where: { id: postPlatform.id },
      data: { status: 'PUBLISHING', errorMessage: null }
    });

    try {
      if (!socialAccount || !socialAccount.accessToken) {
        throw new Error(`Account not connected or missing access token for ${platformName}`);
      }

      const provider = getProvider(platformName);
      if (!provider.isConfigured()) {
        throw new Error(`CONFIGURATION_REQUIRED: Official credentials for ${platformName} are not configured in backend.`);
      }

      const mediaUrlsList = (post.mediaUrl || '').split(',').map(s => s.trim()).filter(Boolean);
      const primaryMediaUrl = mediaUrlsList[0] || null;

      // Call official API
      const result = await provider.publishPost({
        accessToken: socialAccount.accessToken,
        caption: post.caption,
        mediaUrl: primaryMediaUrl,
        mediaUrls: mediaUrlsList,
        mediaType: post.mediaType,
        platformUserId: socialAccount.platformUserId
      });

      // Update success
      const updatedPlatform = await prisma.postPlatform.update({
        where: { id: postPlatform.id },
        data: {
          status: 'PUBLISHED',
          platformPostId: String(result.platformPostId),
          publishedAt: new Date(),
          errorMessage: null
        }
      });

      console.log(`[PUBLISH_SUCCESS] Platform: ${platformName}, Post: ${post.id}, PlatformPostId: ${result.platformPostId}`);
      return updatedPlatform;
    } catch (error) {
      const rawMsg = error.response?.data?.error?.message || error.response?.data?.message || error.message || 'Publishing failed';
      // Sanitize error details to redact OAuth tokens, client secrets, or authorization keys
      const errorMsg = String(rawMsg)
        .replace(/(access_token|bearer|token|secret|client_secret)[=:]\s*([a-zA-Z0-9_\-\.]+)/gi, '$1=***')
        .slice(0, 500);

      console.error(`[PUBLISH_FAILURE] Platform: ${platformName}, Post: ${post.id}, Error: ${errorMsg}`);

      const updatedPlatform = await prisma.postPlatform.update({
        where: { id: postPlatform.id },
        data: {
          status: 'FAILED',
          errorMessage: errorMsg
        }
      });

      return updatedPlatform;
    }
  }

  /**
   * Orchestrate post publishing across all or specified targets
   * @param {string} postId 
   * @param {string} userId 
   * @param {Array<string>} [targetPlatformIds] - optional specific platform IDs (e.g. for retry)
   */
  async executePublishing(postId, userId, targetPlatformIds = null) {
    // 1. Fetch Post with strict userId validation
    const post = await prisma.post.findFirst({
      where: { id: postId, userId },
      include: {
        platforms: {
          include: { socialAccount: true }
        }
      }
    });

    if (!post) {
      throw new Error('Post not found or unauthorized');
    }

    // Filter platforms to run (all or specifically targeted for retry)
    const targetsToExecute = targetPlatformIds
      ? post.platforms.filter(p => targetPlatformIds.includes(p.id))
      : post.platforms;

    if (targetsToExecute.length === 0) {
      return post;
    }

    // Set post status to PUBLISHING
    await prisma.post.update({
      where: { id: post.id },
      data: { status: 'PUBLISHING' }
    });

    // Execute each platform concurrently and independently via direct platform providers
    const promises = targetsToExecute.map(tp => this.publishSinglePlatform(post, tp));
    await Promise.allSettled(promises);

    // 2. Critical Independent Credit Settlement:
    // Only charge for confirmed successfully published destinations.
    // Release/refund reservations immediately for any destination that failed or could not be delivered.
    await prisma.$transaction(async (tx) => {
      const freshPlatforms = await tx.postPlatform.findMany({
        where: { postId: post.id }
      });

      for (const plat of freshPlatforms) {
        if (plat.status === 'PUBLISHED' && !plat.creditCharged) {
          // Delivery confirmed: mark destination as charged
          await tx.postPlatform.update({
            where: { id: plat.id },
            data: { creditCharged: true }
          });
        } else if (plat.status === 'FAILED' && !plat.creditRefunded && !plat.creditCharged) {
          // Delivery failed: release/refund the reserved cost for this destination
          const refundAmount = plat.creditCost || 0;
          await tx.postPlatform.update({
            where: { id: plat.id },
            data: { creditRefunded: true }
          });

          if (refundAmount > 0) {
            const uUser = await tx.user.update({
              where: { id: userId },
              data: { credits: { increment: refundAmount } },
              select: { credits: true }
            });

            await tx.creditTransaction.create({
              data: {
                userId,
                amount: refundAmount,
                balanceAfter: uUser.credits,
                type: 'REFUND',
                reason: `Credit refund for failed delivery on post #${post.id.slice(-6)} (${plat.platform})`
              }
            });

            console.log(`[CREDIT_REFUND] Released ${refundAmount} credits to user ${userId} for failed ${plat.platform} on post ${post.id}`);
          }
        }
      }
    });

    // 3. Fetch all fresh platforms to compute composite status
    const allPlatforms = await prisma.postPlatform.findMany({
      where: { postId: post.id }
    });

    const newPostStatus = this.computePostStatus(allPlatforms);

    const updatedPost = await prisma.post.update({
      where: { id: post.id },
      data: { status: newPostStatus },
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

    return updatedPost;
  }

  /**
   * Retry ONLY failed platforms for a post
   * @param {string} postId 
   * @param {string} userId 
   */
  async retryFailedPlatforms(postId, userId) {
    const post = await prisma.post.findFirst({
      where: { id: postId, userId },
      include: { platforms: true }
    });

    if (!post) {
      throw new Error('Post not found or unauthorized');
    }

    // Select ONLY FAILED platforms. Never touch PUBLISHED platforms!
    const failedPlatforms = post.platforms.filter(p => p.status === 'FAILED');

    if (failedPlatforms.length === 0) {
      throw new Error('No failed platforms to retry for this post');
    }

    // Check if any of these failed platforms were refunded:
    const refundedPlatforms = failedPlatforms.filter(p => p.creditRefunded);
    const retryCost = refundedPlatforms.reduce((sum, p) => sum + (p.creditCost || 0), 0);

    if (retryCost > 0) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { credits: true }
      });

      if (!user || user.credits < retryCost) {
        throw new Error(`Insufficient credits to retry broadcast. Requires ${retryCost} credits.`);
      }

      // Reserve credits for retry attempt
      await prisma.$transaction(async (tx) => {
        const uUser = await tx.user.update({
          where: { id: userId },
          data: { credits: { decrement: retryCost } },
          select: { credits: true }
        });

        await tx.creditTransaction.create({
          data: {
            userId,
            amount: -retryCost,
            balanceAfter: uUser.credits,
            type: 'USAGE_DEDUCT',
            reason: `Credit hold for retry of failed platforms on post #${post.id.slice(-6)}`
          }
        });

        // Reset credit flags so they can be settled again upon execution
        await tx.postPlatform.updateMany({
          where: { id: { in: refundedPlatforms.map(p => p.id) } },
          data: { creditRefunded: false, creditCharged: false }
        });
      });
    }

    const failedIds = failedPlatforms.map(p => p.id);
    return this.executePublishing(postId, userId, failedIds);
  }
}

export const publishingService = new PublishingService();
