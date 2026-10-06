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

      // Call official API
      const result = await provider.publishPost({
        accessToken: socialAccount.accessToken,
        caption: post.caption,
        mediaUrl: post.mediaUrl,
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
      const errorMsg = error.response?.data?.error?.message || error.response?.data?.message || error.message;
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

    // 2. Fetch all fresh platforms to compute composite status
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

    const failedIds = failedPlatforms.map(p => p.id);
    return this.executePublishing(postId, userId, failedIds);
  }
}

export const publishingService = new PublishingService();
