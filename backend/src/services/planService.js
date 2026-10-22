import { prisma } from '../utils/prisma.js';

export const DEFAULT_PLANS = [
  {
    planType: 'FREE',
    name: 'Free',
    badge: null,
    priceLkr: 0,
    priceUsd: 0,
    originalPriceLkr: null,
    originalPriceUsd: null,
    isFreePromotion: false,
    promotionNote: null,
    credits: 200,
    maxConnectedAccounts: 2,
    hasScheduling: false,
    hasAiCaptions: false,
    hasHistory: true,
    hasFreeTrial: false,
    trialPeriodDays: 0,
    description: 'Perfect for getting started with multi-channel social management.',
    features: JSON.stringify([
      '200 credits',
      '2 connected accounts',
      'All 6 social media platforms',
      'Publishing history'
    ]),
    isActive: true
  },
  {
    planType: 'CREATOR',
    name: 'Creator',
    badge: 'Most Popular',
    priceLkr: 1000,
    priceUsd: 9.99,
    originalPriceLkr: 1000,
    originalPriceUsd: 9.99,
    isFreePromotion: false,
    promotionNote: null,
    credits: 500,
    maxConnectedAccounts: 4,
    hasScheduling: true,
    hasAiCaptions: false,
    hasHistory: true,
    hasFreeTrial: false,
    trialPeriodDays: 30,
    description: 'For active content creators and influencers growing their reach.',
    features: JSON.stringify([
      '500 credits',
      '4 connected accounts',
      'All 6 social media platforms',
      'Publishing history',
      'Post scheduling'
    ]),
    isActive: true
  },
  {
    planType: 'PROFESSIONAL',
    name: 'Professional',
    badge: null,
    priceLkr: 2500,
    priceUsd: 19.99,
    originalPriceLkr: 2500,
    originalPriceUsd: 19.99,
    isFreePromotion: false,
    promotionNote: null,
    credits: 1000,
    maxConnectedAccounts: 6,
    hasScheduling: true,
    hasAiCaptions: true,
    hasHistory: true,
    hasFreeTrial: false,
    trialPeriodDays: 30,
    description: 'For businesses and agencies needing AI captions and maximum connections.',
    features: JSON.stringify([
      '1,000 credits',
      '6 connected accounts',
      'All 6 social media platforms',
      'Publishing history',
      'Post scheduling',
      'AI caption suggestions'
    ]),
    isActive: true
  }
];

/**
 * Ensure default plans exist in PostgreSQL database and keep credits updated
 */
export async function seedPlansIfEmpty() {
  try {
    const count = await prisma.packagePlan.count();
    if (count === 0) {
      for (const p of DEFAULT_PLANS) {
        await prisma.packagePlan.create({ data: p });
      }
    }
  } catch (err) {
    console.error('Error seeding package plans:', err.message);
  }
}

/**
 * Get all active package plans for public consumption
 */
export async function getAllPlans(includeInactive = false) {
  await seedPlansIfEmpty();
  const where = includeInactive ? {} : { isActive: true };
  const plans = await prisma.packagePlan.findMany({
    where,
    orderBy: { priceLkr: 'asc' }
  });
  return plans;
}

/**
 * Get user and subscriber stats for a specific plan
 */
export async function getPlanStats(planType) {
  const planTypeUpper = planType.toUpperCase();
  const [userCount, activeSubscriptionsCount, trialingCount] = await Promise.all([
    prisma.user.count({ where: { plan: planTypeUpper } }),
    prisma.userSubscription.count({ where: { plan: planTypeUpper, status: 'ACTIVE' } }),
    prisma.userSubscription.count({ where: { plan: planTypeUpper, status: 'TRIALING' } })
  ]);

  const plan = await prisma.packagePlan.findUnique({
    where: { planType: planTypeUpper }
  });

  return {
    planType: planTypeUpper,
    userCount,
    activeSubscriptionsCount,
    trialingCount,
    totalAffected: userCount,
    currentPriceLkr: plan ? plan.priceLkr : 0,
    isFreePromotion: plan ? Boolean(plan.isFreePromotion) : false
  };
}

/**
 * Update an existing package plan
 */
export async function updatePackagePlan(planType, updates, adminId = null) {
  await seedPlansIfEmpty();
  const planTypeUpper = planType.toUpperCase();

  const existing = await prisma.packagePlan.findUnique({
    where: { planType: planTypeUpper }
  });

  if (!existing) {
    throw new Error(`Plan ${planTypeUpper} not found`);
  }

  const dataToUpdate = {};
  if (updates.name !== undefined) dataToUpdate.name = updates.name;
  if (updates.badge !== undefined) dataToUpdate.badge = updates.badge;
  if (updates.priceLkr !== undefined) dataToUpdate.priceLkr = parseFloat(updates.priceLkr);
  if (updates.priceUsd !== undefined) dataToUpdate.priceUsd = parseFloat(updates.priceUsd);
  if (updates.originalPriceLkr !== undefined) dataToUpdate.originalPriceLkr = parseFloat(updates.originalPriceLkr);
  if (updates.originalPriceUsd !== undefined) dataToUpdate.originalPriceUsd = parseFloat(updates.originalPriceUsd);
  if (updates.credits !== undefined) dataToUpdate.credits = parseInt(updates.credits, 10);
  if (updates.maxConnectedAccounts !== undefined) {
    dataToUpdate.maxConnectedAccounts = parseInt(updates.maxConnectedAccounts, 10);
  }
  if (updates.hasScheduling !== undefined) dataToUpdate.hasScheduling = Boolean(updates.hasScheduling);
  if (updates.hasAiCaptions !== undefined) dataToUpdate.hasAiCaptions = Boolean(updates.hasAiCaptions);
  if (updates.hasHistory !== undefined) dataToUpdate.hasHistory = Boolean(updates.hasHistory);
  if (updates.hasFreeTrial !== undefined) dataToUpdate.hasFreeTrial = Boolean(updates.hasFreeTrial);
  if (updates.trialPeriodDays !== undefined) {
    dataToUpdate.trialPeriodDays = parseInt(updates.trialPeriodDays, 10);
  }
  if (updates.description !== undefined) dataToUpdate.description = updates.description;
  if (updates.isActive !== undefined) dataToUpdate.isActive = Boolean(updates.isActive);
  if (updates.isFreePromotion !== undefined) dataToUpdate.isFreePromotion = Boolean(updates.isFreePromotion);
  if (updates.promotionNote !== undefined) dataToUpdate.promotionNote = updates.promotionNote;
  if (updates.features !== undefined) {
    dataToUpdate.features = typeof updates.features === 'string' ? updates.features : JSON.stringify(updates.features);
  }

  const updated = await prisma.packagePlan.update({
    where: { planType: planTypeUpper },
    data: dataToUpdate
  });

  if (adminId) {
    await prisma.adminAuditLog.create({
      data: {
        adminId,
        action: 'PACKAGE_PLAN_UPDATED',
        details: JSON.stringify({
          planType: planTypeUpper,
          changes: dataToUpdate
        })
      }
    });
  }

  return updated;
}

/**
 * Toggle Promotional Pricing (Promotional Free mode)
 * Sets displayed price to LKR 0 for new signups while visually striking through previous price
 */
export async function toggleFreePromotion(planType, { isFreePromotion, promotionNote }, adminId) {
  await seedPlansIfEmpty();
  const planTypeUpper = planType.toUpperCase();

  const plan = await prisma.packagePlan.findUnique({
    where: { planType: planTypeUpper }
  });

  if (!plan) throw new Error(`Plan ${planTypeUpper} not found`);

  const prevPriceLkr = plan.priceLkr;
  const prevPriceUsd = plan.priceUsd;

  let updateData = {};
  if (isFreePromotion) {
    updateData = {
      isFreePromotion: true,
      originalPriceLkr: plan.originalPriceLkr || (plan.priceLkr > 0 ? plan.priceLkr : 1000),
      originalPriceUsd: plan.originalPriceUsd || (plan.priceUsd > 0 ? plan.priceUsd : 9.99),
      priceLkr: 0,
      priceUsd: 0,
      promotionNote: promotionNote || 'Currently Free — Limited Time Promotional Offer'
    };
  } else {
    // Restore configured price
    updateData = {
      isFreePromotion: false,
      priceLkr: plan.originalPriceLkr || (planTypeUpper === 'CREATOR' ? 1000 : 2500),
      priceUsd: plan.originalPriceUsd || (planTypeUpper === 'CREATOR' ? 9.99 : 19.99),
      promotionNote: null
    };
  }

  const updatedPlan = await prisma.packagePlan.update({
    where: { planType: planTypeUpper },
    data: updateData
  });

  await prisma.adminAuditLog.create({
    data: {
      adminId,
      action: isFreePromotion ? 'PROMOTION_FREE_ACTIVATED' : 'PROMOTION_FREE_DEACTIVATED',
      details: JSON.stringify({
        planType: planTypeUpper,
        previousPriceLkr: prevPriceLkr,
        newPriceLkr: updatedPlan.priceLkr,
        originalPriceLkr: updatedPlan.originalPriceLkr,
        promotionNote: updatedPlan.promotionNote
      })
    }
  });

  return updatedPlan;
}

/**
 * Global Change to Free (Migrate All Existing Users)
 * Moves all existing users assigned to Creator or Professional to Free,
 * respecting explicit migration policy and audit logging.
 */
export async function migratePlanUsersToFree(planType, { migrationPolicy = 'END_OF_PERIOD', reason }, adminId) {
  const planTypeUpper = planType.toUpperCase();
  if (!['CREATOR', 'PROFESSIONAL'].includes(planTypeUpper)) {
    throw new Error('Only Creator and Professional plans can be globally changed to Free');
  }

  const now = new Date();
  const affectedUsers = await prisma.user.findMany({
    where: { plan: planTypeUpper },
    select: { id: true, name: true, email: true, plan: true }
  });

  let migratedCount = 0;

  for (const user of affectedUsers) {
    if (migrationPolicy === 'IMMEDIATE') {
      // 1. Immediately update user plan to FREE
      await prisma.user.update({
        where: { id: user.id },
        data: { plan: 'FREE' }
      });

      // 2. Close active plan history
      await prisma.planHistory.updateMany({
        where: { userId: user.id, endedAt: null },
        data: { endedAt: now }
      });

      await prisma.planHistory.create({
        data: {
          userId: user.id,
          plan: 'FREE',
          changedById: adminId,
          reason: reason || `Admin global migration from ${planTypeUpper} to Free (Immediate)`
        }
      });

      // 3. Update subscription status
      await prisma.userSubscription.updateMany({
        where: { userId: user.id },
        data: {
          plan: 'FREE',
          status: 'FREE',
          autoRenew: false,
          cancelAtPeriodEnd: false
        }
      });

      // 4. Record subscription event
      await prisma.subscriptionEvent.create({
        data: {
          userId: user.id,
          fromPlan: planTypeUpper,
          toPlan: 'FREE',
          eventType: 'GLOBAL_FREE_MIGRATION',
          effectiveAt: now,
          createdById: adminId,
          details: JSON.stringify({ policy: 'IMMEDIATE', reason })
        }
      });
      migratedCount++;
    } else {
      // END_OF_PERIOD: preserve paid benefits until current period end, then switch
      const sub = await prisma.userSubscription.findUnique({
        where: { userId: user.id }
      });

      const effectiveDate = sub ? sub.currentPeriodEnd : now;

      await prisma.userSubscription.updateMany({
        where: { userId: user.id },
        data: {
          cancelAtPeriodEnd: true,
          scheduledPlan: 'FREE',
          status: 'CANCELLATION_SCHEDULED',
          cancellationEffectiveDate: effectiveDate,
          cancellationReason: reason || `Admin global migration to Free at end of paid billing cycle`,
          autoRenew: false
        }
      });

      await prisma.subscriptionEvent.create({
        data: {
          userId: user.id,
          fromPlan: planTypeUpper,
          toPlan: 'FREE',
          eventType: 'SCHEDULED_SWITCH_TO_FREE',
          effectiveAt: effectiveDate,
          createdById: adminId,
          details: JSON.stringify({ policy: 'END_OF_PERIOD', reason, effectiveDate })
        }
      });
      migratedCount++;
    }
  }

  // Record Admin Audit Log
  await prisma.adminAuditLog.create({
    data: {
      adminId,
      action: 'GLOBAL_PLAN_MIGRATED_TO_FREE',
      details: JSON.stringify({
        targetPlan: planTypeUpper,
        affectedCount: affectedUsers.length,
        migratedCount,
        migrationPolicy,
        reason: reason || 'Administrator explicit global action'
      })
    }
  });

  return {
    targetPlan: planTypeUpper,
    totalAffected: affectedUsers.length,
    migratedCount,
    migrationPolicy
  };
}
