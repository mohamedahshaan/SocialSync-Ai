import axios from 'axios';
import { prisma } from '../utils/prisma.js';
import { getProvider } from './social/index.js';
import { config } from '../config/index.js';

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

    // Construct full absolute media URL for n8n or external services
    let fullMediaUrl = post.mediaUrl;
    if (fullMediaUrl && fullMediaUrl.startsWith('/')) {
      fullMediaUrl = `${config.backendUrl}${fullMediaUrl}`;
    }

    // Determine whether n8n orchestration should be used
    const useN8N = config.orchestrationMode === 'n8n' && Boolean(config.n8nWebhookUrl) && !targetPlatformIds;

    let handledByN8N = false;
    if (useN8N) {
      const jobId = `job_${post.id}_${Date.now()}`;
      const idempotencyKey = `idemp_${post.id}_${Date.now()}`;

      const n8nPayload = {
        jobId,
        idempotencyKey,
        postId: post.id,
        userId: post.userId,
        timestamp: new Date().toISOString(),
        caption: post.caption,
        mediaUrl: fullMediaUrl,
        mediaType: (post.mediaType || 'NONE').toLowerCase(),
        platforms: targetsToExecute.map(p => ({
          id: p.id,
          platform: p.platform,
          status: p.status,
          socialAccountId: p.socialAccountId,
          accountName: p.socialAccount?.accountName,
          accountUsername: p.socialAccount?.accountUsername,
          platformUserId: p.socialAccount?.platformUserId
        }))
      };

      try {
        // 1. Create persistent PublishingJob record
        await prisma.publishingJob.create({
          data: {
            postId: post.id,
            jobId,
            idempotencyKey,
            status: 'DISPATCHED',
            payload: JSON.stringify(n8nPayload)
          }
        });

        // 2. Dispatch to n8n Webhook
        const n8nRes = await axios.post(
          config.n8nWebhookUrl,
          n8nPayload,
          {
            headers: {
              'x-socialflow-secret': config.n8nApiKey,
              'x-job-id': jobId,
              'x-idempotency-key': idempotencyKey
            },
            timeout: 10000
          }
        );

        handledByN8N = true;
        console.log(`[N8N_DISPATCH_SUCCESS] Publishing job ${jobId} dispatched to n8n for post: ${post.id}`);

        await prisma.publishingJob.update({
          where: { jobId },
          data: {
            status: 'PROCESSING',
            executionId: n8nRes.data?.executionId || null,
            n8nResponse: JSON.stringify(n8nRes.data || { ok: true })
          }
        }).catch(() => {});
      } catch (n8nErr) {
        // NO SILENT FALLBACK: Record actionable error and allow retry
        console.error(`[N8N_DISPATCH_ERROR] Failed to reach n8n webhook: ${n8nErr.message}`);

        await prisma.publishingJob.update({
          where: { jobId },
          data: {
            status: 'FAILED',
            errorMessage: `n8n webhook error: ${n8nErr.message}`
          }
        }).catch(() => {});

        const failureMsg = `Automation orchestrator (n8n) unreachable: ${n8nErr.message}. Verify n8n webhook and click Retry.`;
        for (const tp of targetsToExecute) {
          await prisma.postPlatform.update({
            where: { id: tp.id },
            data: {
              status: 'FAILED',
              errorMessage: failureMsg
            }
          });
        }

        handledByN8N = true; // Mark as handled by n8n failure branch; do NOT silently publish directly!
      }
    }

    // If in direct orchestration mode or executing target retries, run direct platform workers
    if (!handledByN8N) {
      // Execute each platform concurrently and independently
      const promises = targetsToExecute.map(tp => this.publishSinglePlatform(post, tp));
      await Promise.allSettled(promises);
    }

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
