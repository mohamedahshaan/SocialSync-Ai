import { prisma } from '../utils/prisma.js';

export const PLAN_TARGET_PLATFORM_LIMITS = {
  FREE: 2,
  CREATOR: 4,
  PROFESSIONAL: 6
};

/**
 * Get maximum allowed target platforms for a single post based on user plan
 * @param {string} planType - 'FREE', 'CREATOR', 'PROFESSIONAL'
 * @returns {number}
 */
export function getMaxTargetPlatformsForPlan(planType) {
  if (!planType) return PLAN_TARGET_PLATFORM_LIMITS.FREE;
  const upper = String(planType).toUpperCase();
  return PLAN_TARGET_PLATFORM_LIMITS[upper] ?? PLAN_TARGET_PLATFORM_LIMITS.FREE;
}

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
    hasCollageStudio: false,
    hasHistory: true,
    hasPriorityDispatch: false,
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
    hasCollageStudio: true,
    hasHistory: true,
    hasPriorityDispatch: true,
    hasFreeTrial: false,
    trialPeriodDays: 30,
    description: 'For active content creators and influencers growing their reach.',
    features: JSON.stringify([
      '500 credits',
      '4 connected accounts',
      'All 6 social media platforms',
      'Publishing history',
      'Post scheduling',
      'Photo Collage Studio',
      'Priority publishing delivery'
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
    credits: 1500,
    maxConnectedAccounts: 6,
    hasScheduling: true,
    hasAiCaptions: true,
    hasCollageStudio: true,
    hasHistory: true,
    hasPriorityDispatch: true,
    hasFreeTrial: false,
    trialPeriodDays: 30,
    description: 'For businesses and agencies needing AI captions and maximum connections.',
    features: JSON.stringify([
      '1500 credits',
      '6 connected accounts',
      'All 6 social media platforms',
      'Publishing history',
      'Post scheduling',
      'Photo Collage Studio',
      'AI caption suggestions',
      'Priority publishing delivery'
    ]),
    isActive: true
  }
];

/**
 * Ensure default plans exist in PostgreSQL database and keep credits/features updated
 */
export async function seedPlansIfEmpty() {
  try {
    const count = await prisma.packagePlan.count();
    if (count === 0) {
      for (const p of DEFAULT_PLANS) {
        await prisma.packagePlan.create({ data: p });
      }
    } else {
      // Ensure existing CREATOR and PROFESSIONAL plans have hasCollageStudio defaulted properly if not explicitly altered
      const creator = await prisma.packagePlan.findUnique({ where: { planType: 'CREATOR' } });
      if (creator && creator.hasCollageStudio === false) {
        let features = [];
        try {
          features = typeof creator.features === 'string' ? JSON.parse(creator.features) : (creator.features || []);
        } catch {
          features = [];
        }
        if (!features.includes('Photo Collage Studio')) {
          features.push('Photo Collage Studio');
        }
        await prisma.packagePlan.update({
          where: { planType: 'CREATOR' },
          data: {
            hasCollageStudio: true,
            features: JSON.stringify(features)
          }
        });
      }

      const pro = await prisma.packagePlan.findUnique({ where: { planType: 'PROFESSIONAL' } });
      if (pro && pro.hasCollageStudio === false) {
        let features = [];
        try {
          features = typeof pro.features === 'string' ? JSON.parse(pro.features) : (pro.features || []);
        } catch {
          features = [];
        }
        if (!features.includes('Photo Collage Studio')) {
          features.push('Photo Collage Studio');
        }
        await prisma.packagePlan.update({
          where: { planType: 'PROFESSIONAL' },
          data: {
            hasCollageStudio: true,
            features: JSON.stringify(features)
          }
        });
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

  const now = new Date();

  return plans.map(p => {
    const isPaid = p.planType !== 'FREE';
    const isEnabled = Boolean(p.promoEnabled || p.isFreePromotion);
    let isPromoActive = false;
    let promoStatus = 'DISABLED';

    if (!isEnabled) {
      promoStatus = 'DISABLED';
    } else if (p.promoStartDate && now < new Date(p.promoStartDate)) {
      promoStatus = 'SCHEDULED';
    } else if (p.promoEndDate && now > new Date(p.promoEndDate)) {
      promoStatus = 'EXPIRED';
    } else if (p.promoMaxRedemptions > 0 && p.promoCurrentRedemptions >= p.promoMaxRedemptions) {
      promoStatus = 'LIMIT_REACHED';
    } else {
      promoStatus = 'ACTIVE';
      isPromoActive = isPaid;
    }

    return {
      ...p,
      maxTargetPlatformsPerPost: getMaxTargetPlatformsForPlan(p.planType),
      isPromoActive,
      promoStatus,
      promotionalPriceLkr: isPromoActive ? (p.promoPriceLkr ?? 0.0) : p.priceLkr,
      originalMonthlyPriceLkr: p.originalPriceLkr || p.priceLkr,
      promoTitle: p.promoTitle || '1 Month Free',
      promoDescription: p.promoDescription || 'First month completely free for eligible subscribers.'
    };
  });
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
  if (updates.hasCollageStudio !== undefined) dataToUpdate.hasCollageStudio = Boolean(updates.hasCollageStudio);
  if (updates.hasHistory !== undefined) dataToUpdate.hasHistory = Boolean(updates.hasHistory);
  if (updates.hasPriorityDispatch !== undefined) dataToUpdate.hasPriorityDispatch = Boolean(updates.hasPriorityDispatch);
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

  const standardPrice = plan.originalPriceLkr || (plan.priceLkr > 0 ? plan.priceLkr : (planTypeUpper === 'CREATOR' ? 1000 : 2500));
  const standardPriceUsd = plan.originalPriceUsd || (plan.priceUsd > 0 ? plan.priceUsd : (planTypeUpper === 'CREATOR' ? 9.99 : 19.99));

  let updateData = {};
  if (isFreePromotion) {
    updateData = {
      isFreePromotion: true,
      promoEnabled: true,
      hasFreeTrial: true,
      trialPeriodDays: 30,
      originalPriceLkr: standardPrice,
      originalPriceUsd: standardPriceUsd,
      priceLkr: standardPrice,
      priceUsd: standardPriceUsd,
      promoPriceLkr: 0.0,
      promotionNote: promotionNote || '1 Month Free Trial Promotion'
    };
  } else {
    updateData = {
      isFreePromotion: false,
      promoEnabled: false,
      hasFreeTrial: false,
      originalPriceLkr: standardPrice,
      originalPriceUsd: standardPriceUsd,
      priceLkr: standardPrice,
      priceUsd: standardPriceUsd,
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
        isFreePromotion: updatedPlan.isFreePromotion,
        promoEnabled: updatedPlan.promoEnabled,
        priceLkr: updatedPlan.priceLkr,
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
      // 1. Immediately update user plan to FREE and reset credit allowance to 200
      await prisma.user.update({
        where: { id: user.id },
        data: { plan: 'FREE', credits: 200 }
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
          previousPlan: planTypeUpper,
          creditsBefore: user.credits ?? 0,
          creditsAfter: 200,
          source: 'SYSTEM_MIGRATION',
          changedById: adminId,
          status: 'SUCCESS',
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

/**
 * Get comprehensive promotions status for all plans (Admin Panel)
 */
export async function getPlanPromotions() {
  await seedPlansIfEmpty();
  const plans = await prisma.packagePlan.findMany({
    orderBy: { priceLkr: 'asc' }
  });

  const now = new Date();

  const promotions = await Promise.all(
    plans.map(async (p) => {
      const isPaid = p.planType !== 'FREE';
      const isEnabled = Boolean(p.promoEnabled);
      let status = 'INACTIVE';
      if (!isEnabled) {
        status = 'DISABLED';
      } else if (p.promoStartDate && now < new Date(p.promoStartDate)) {
        status = 'SCHEDULED';
      } else if (p.promoEndDate && now > new Date(p.promoEndDate)) {
        status = 'EXPIRED';
      } else if (p.promoMaxRedemptions > 0 && p.promoCurrentRedemptions >= p.promoMaxRedemptions) {
        status = 'LIMIT_REACHED';
      } else {
        status = 'ACTIVE';
      }

      const totalRedemptions = await prisma.promotionRedemption.count({
        where: { planType: p.planType }
      });

      return {
        planType: p.planType,
        name: p.name,
        priceLkr: p.priceLkr,
        priceUsd: p.priceUsd,
        originalPriceLkr: p.originalPriceLkr || p.priceLkr,
        credits: p.credits,
        promoEnabled: isEnabled,
        promoPriceLkr: p.promoPriceLkr ?? 0.0,
        promoStartDate: p.promoStartDate,
        promoEndDate: p.promoEndDate,
        promoEligibility: p.promoEligibility || 'ONCE_PER_USER',
        promoMaxRedemptions: p.promoMaxRedemptions || 0,
        promoCurrentRedemptions: totalRedemptions,
        promoTitle: p.promoTitle || '1 Month Free',
        promoDescription: p.promoDescription || 'Enjoy your first month completely free.',
        status,
        isPaid
      };
    })
  );

  return promotions;
}

/**
 * Update plan promotion settings (Admin Panel)
 */
export async function updatePlanPromotion(planType, updates, adminId = null) {
  await seedPlansIfEmpty();
  const planTypeUpper = planType.toUpperCase();

  const existing = await prisma.packagePlan.findUnique({
    where: { planType: planTypeUpper }
  });

  if (!existing) {
    throw new Error(`Plan ${planTypeUpper} not found`);
  }

  if (planTypeUpper === 'FREE') {
    throw new Error('Promotions can only be applied to paid subscription plans (Creator, Professional)');
  }

  const dataToUpdate = {};
  if (updates.promoEnabled !== undefined) {
    dataToUpdate.promoEnabled = Boolean(updates.promoEnabled);
  }
  if (updates.promoPriceLkr !== undefined) {
    dataToUpdate.promoPriceLkr = parseFloat(updates.promoPriceLkr);
  } else if (updates.promoEnabled) {
    dataToUpdate.promoPriceLkr = 0.0;
  }
  if (updates.promoStartDate !== undefined) {
    dataToUpdate.promoStartDate = updates.promoStartDate ? new Date(updates.promoStartDate) : null;
  }
  if (updates.promoEndDate !== undefined) {
    dataToUpdate.promoEndDate = updates.promoEndDate ? new Date(updates.promoEndDate) : null;
  }
  if (updates.promoEligibility !== undefined) {
    dataToUpdate.promoEligibility = updates.promoEligibility;
  }
  if (updates.promoMaxRedemptions !== undefined) {
    dataToUpdate.promoMaxRedemptions = parseInt(updates.promoMaxRedemptions, 10);
  }
  if (updates.promoTitle !== undefined) {
    dataToUpdate.promoTitle = updates.promoTitle;
  }
  if (updates.promoDescription !== undefined) {
    dataToUpdate.promoDescription = updates.promoDescription;
  }

  // Validate start date <= end date
  const start = dataToUpdate.promoStartDate !== undefined ? dataToUpdate.promoStartDate : existing.promoStartDate;
  const end = dataToUpdate.promoEndDate !== undefined ? dataToUpdate.promoEndDate : existing.promoEndDate;
  if (start && end && start > end) {
    throw new Error('Promotion start date must be before or equal to the end date.');
  }

  const updated = await prisma.packagePlan.update({
    where: { planType: planTypeUpper },
    data: dataToUpdate
  });

  if (adminId) {
    await prisma.adminAuditLog.create({
      data: {
        adminId,
        action: dataToUpdate.promoEnabled ? 'PROMOTION_OFFER_ENABLED' : 'PROMOTION_OFFER_UPDATED',
        details: JSON.stringify({
          planType: planTypeUpper,
          changes: dataToUpdate,
          previousState: {
            promoEnabled: existing.promoEnabled,
            promoStartDate: existing.promoStartDate,
            promoEndDate: existing.promoEndDate
          }
        })
      }
    });
  }

  return updated;
}

/**
 * Server-side check for user promotion eligibility
 */
export async function checkUserPromotionEligibility(userId, planType) {
  const planTypeUpper = planType.toUpperCase();
  const plan = await prisma.packagePlan.findUnique({
    where: { planType: planTypeUpper }
  });

  if (!plan || (!plan.promoEnabled && !plan.isFreePromotion)) {
    return { isEligible: false, code: 'PROMOTION_NOT_ACTIVE', reason: 'No active promotion available for this plan.' };
  }

  const now = new Date();
  if (plan.promoStartDate && now < new Date(plan.promoStartDate)) {
    return { isEligible: false, code: 'PROMOTION_NOT_STARTED', reason: 'This promotional offer has not started yet.' };
  }
  if (plan.promoEndDate && now > new Date(plan.promoEndDate)) {
    return { isEligible: false, code: 'PROMOTION_EXPIRED', reason: 'This promotional offer has expired.' };
  }

  // Check total redemption limit
  const totalRedemptions = await prisma.promotionRedemption.count({
    where: { planType: planTypeUpper }
  });

  if (plan.promoMaxRedemptions > 0 && totalRedemptions >= plan.promoMaxRedemptions) {
    return { isEligible: false, code: 'MAX_REDEMPTIONS_REACHED', reason: 'The maximum redemption limit for this promotion has been reached.' };
  }

  // Check user-specific eligibility
  if (userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, plan: true }
    });

    if (user) {
      if (['SUPER_ADMIN', 'ADMIN'].includes(user.role)) {
        return {
          isEligible: false,
          code: 'ADMIN_NOT_ELIGIBLE',
          reason: 'Administrator accounts cannot activate customer promotional trials.'
        };
      }
    }

    const priorUserRedemption = await prisma.promotionRedemption.findFirst({
      where: { userId, planType: planTypeUpper }
    });

    if (priorUserRedemption) {
      return {
        isEligible: false,
        code: 'ALREADY_REDEEMED',
        reason: 'You have already redeemed the 1 Month Free offer for this plan.'
      };
    }

    if (user && user.plan === planTypeUpper) {
      return {
        isEligible: false,
        code: 'ALREADY_SUBSCRIBED',
        reason: `You are already on the ${planTypeUpper} plan.`
      };
    }

    const rule = plan.promoEligibility || 'ONCE_PER_USER';
    if (rule === 'NEW_USERS_ONLY') {
      const priorPaidPayment = await prisma.payment.findFirst({
        where: { userId, status: 'VERIFIED', amount: { gt: 0 } }
      });
      const userSub = await prisma.userSubscription.findUnique({
        where: { userId }
      });
      if (priorPaidPayment || (userSub && userSub.plan !== 'FREE')) {
        return {
          isEligible: false,
          code: 'NEW_USERS_ONLY',
          reason: 'This promotion is reserved for new subscribers only.'
        };
      }
    }
  }

  return {
    isEligible: true,
    planType: planTypeUpper,
    promoPriceLkr: 0.0,
    regularPriceLkr: plan.priceLkr,
    promoTitle: plan.promoTitle || '1 Month Free',
    promoDescription: plan.promoDescription || 'Enjoy your first month completely free.',
    renewalPriceLkr: plan.priceLkr
  };
}
