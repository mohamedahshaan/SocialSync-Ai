import { prisma } from '../utils/prisma.js';
import { publishingService } from './publishingService.js';
import { entitlementService } from './entitlementService.js';
import { formatSriLankaTime, APP_TIMEZONE, TIMEZONE_CODE } from '../utils/timezone.js';

class SchedulerService {
  constructor() {
    this.intervalId = null;
    this.isRunning = false;
    this.isProcessing = false;
    this.defaultIntervalMs = 15000; // 15 seconds
  }

  /**
   * Start the background scheduler polling loop
   * @param {number} [intervalMs]
   */
  start(intervalMs = this.defaultIntervalMs) {
    if (this.isRunning) {
      console.log('[SCHEDULER] Background worker already running.');
      return;
    }

    this.isRunning = true;
    console.log(`[SCHEDULER] Starting background scheduled post worker (interval: ${intervalMs}ms)...`);

    // Run immediately once on startup
    this.processDuePosts().catch(err => {
      console.error('[SCHEDULER] Initial execution error:', err.message);
    });

    // Schedule regular polling
    this.intervalId = setInterval(() => {
      this.processDuePosts().catch(err => {
        console.error('[SCHEDULER] Recurring tick error:', err.message);
      });
    }, intervalMs);

    // Also run recovery for zombie PUBLISHING posts periodically (e.g. every 5 minutes)
    this.recoveryIntervalId = setInterval(() => {
      this.recoverStuckPublishingPosts().catch(err => {
        console.error('[SCHEDULER] Stuck posts recovery error:', err.message);
      });
    }, 5 * 60 * 1000);
  }

  /**
   * Stop the background scheduler
   */
  stop() {
    if (!this.isRunning) return;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.recoveryIntervalId) {
      clearInterval(this.recoveryIntervalId);
      this.recoveryIntervalId = null;
    }
    this.isRunning = false;
    console.log('[SCHEDULER] Background scheduled post worker stopped.');
  }

  /**
   * Find and process all posts whose scheduledAt <= new Date() and status is 'SCHEDULED'
   * @returns {Promise<number>} Number of posts processed
   */
  async processDuePosts() {
    if (this.isProcessing) {
      return 0;
    }

    this.isProcessing = true;
    let processedCount = 0;

    try {
      const now = new Date();

      // Query posts ready for publication
      const duePosts = await prisma.post.findMany({
        where: {
          status: 'SCHEDULED',
          scheduledAt: {
            lte: now
          }
        },
        orderBy: {
          scheduledAt: 'asc'
        },
        take: 50 // Process up to 50 due posts per cycle
      });

      if (duePosts.length === 0) {
        return 0;
      }

      console.log(`[SCHEDULER] Found ${duePosts.length} scheduled post(s) ready for execution at ${formatSriLankaTime(now)} (${now.toISOString()} UTC)`);

      for (const post of duePosts) {
        try {
          // 1. Revalidate user's subscription and effective scheduling entitlement
          const entitlement = await entitlementService.isFeatureEntitled(post.userId, 'scheduling');
          if (!entitlement.allowed) {
            console.warn(`[SCHEDULER] User ${post.userId} no longer has scheduling entitlement for post ${post.id}. Refunding credits and marking FAILED.`);

            await prisma.$transaction(async (tx) => {
              const platforms = await tx.postPlatform.findMany({ where: { postId: post.id } });
              const uncharged = platforms.filter(p => !p.creditCharged && !p.creditRefunded);
              const refundAmount = uncharged.reduce((sum, p) => sum + (p.creditCost || 0), 0);

              if (refundAmount > 0) {
                const uUser = await tx.user.update({
                  where: { id: post.userId },
                  data: { credits: { increment: refundAmount } },
                  select: { credits: true }
                });

                await tx.creditTransaction.create({
                  data: {
                    userId: post.userId,
                    amount: refundAmount,
                    balanceAfter: uUser.credits,
                    type: 'REFUND',
                    reason: `Credit refund for unentitled scheduled post #${post.id.slice(-6)}: ${entitlement.message || 'Scheduling entitlement expired'}`
                  }
                });
              }

              await tx.postPlatform.updateMany({
                where: { postId: post.id },
                data: {
                  status: 'FAILED',
                  errorMessage: entitlement.message || 'Scheduled publishing entitlement is no longer active for your plan. Credits refunded.',
                  creditRefunded: true
                }
              });

              await tx.post.update({
                where: { id: post.id },
                data: { status: 'FAILED' }
              });
            });
            continue;
          }

          // 2. Atomically lock the post to PUBLISHING status to prevent double-execution
          const claimResult = await prisma.post.updateMany({
            where: {
              id: post.id,
              status: 'SCHEDULED'
            },
            data: {
              status: 'PUBLISHING'
            }
          });

          if (claimResult.count === 0) {
            // Already claimed by another worker instance or cancelled
            continue;
          }

          console.log(`[SCHEDULER] Executing scheduled post ${post.id} (scheduled for ${formatSriLankaTime(post.scheduledAt)} / ${post.scheduledAt?.toISOString()} UTC) for user ${post.userId}`);

          // Execute publishing across all selected platforms
          const publishedPost = await publishingService.executePublishing(post.id, post.userId);
          console.log(`[SCHEDULER] Successfully dispatched post ${post.id}. Final status: ${publishedPost.status}`);
          processedCount++;
        } catch (postError) {
          console.error(`[SCHEDULER] Failed to execute scheduled post ${post.id}:`, postError.message);

          // Ensure post does not remain permanently stuck in PUBLISHING
          try {
            const currentPost = await prisma.post.findUnique({
              where: { id: post.id },
              include: { platforms: true }
            });

            if (currentPost && currentPost.status === 'PUBLISHING') {
              // Update any platforms still in PENDING or PUBLISHING to FAILED
              await prisma.postPlatform.updateMany({
                where: {
                  postId: post.id,
                  status: { in: ['PENDING', 'PUBLISHING'] }
                },
                data: {
                  status: 'FAILED',
                  errorMessage: postError.message || 'Scheduled publishing execution failure'
                }
              });

              // Re-check platforms to compute final status
              const updatedPlatforms = await prisma.postPlatform.findMany({
                where: { postId: post.id }
              });

              const compositeStatus = publishingService.computePostStatus(updatedPlatforms);
              await prisma.post.update({
                where: { id: post.id },
                data: { status: compositeStatus === 'PUBLISHING' ? 'FAILED' : compositeStatus }
              });
            }
          } catch (cleanupError) {
            console.error(`[SCHEDULER] Cleanup error for post ${post.id}:`, cleanupError.message);
          }
        }
      }
    } catch (cycleError) {
      console.error('[SCHEDULER] Unexpected error in scheduled posts cycle:', cycleError.message);
    } finally {
      this.isProcessing = false;
    }

    return processedCount;
  }

  /**
   * Resiliency safeguard: Recover posts stuck in 'PUBLISHING' for longer than 15 minutes
   * (e.g. if the Node.js server crashed or restarted mid-execution)
   */
  async recoverStuckPublishingPosts() {
    try {
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

      const stuckPosts = await prisma.post.findMany({
        where: {
          status: 'PUBLISHING',
          updatedAt: {
            lte: fifteenMinutesAgo
          }
        },
        include: { platforms: true }
      });

      if (stuckPosts.length > 0) {
        console.warn(`[SCHEDULER] Found ${stuckPosts.length} stuck PUBLISHING post(s). Recovering status...`);

        for (const post of stuckPosts) {
          const platforms = post.platforms || [];
          const newStatus = publishingService.computePostStatus(platforms);
          await prisma.post.update({
            where: { id: post.id },
            data: { status: newStatus === 'PUBLISHING' ? 'FAILED' : newStatus }
          });
          console.log(`[SCHEDULER] Recovered stuck post ${post.id} -> ${newStatus}`);
        }
      }
    } catch (err) {
      console.error('[SCHEDULER] Error during stuck posts recovery:', err.message);
    }
  }
}

export const schedulerService = new SchedulerService();
