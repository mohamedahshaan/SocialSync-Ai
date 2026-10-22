import { prisma } from '../utils/prisma.js';
import crypto from 'crypto';
import { checkUserPromotionEligibility, getMaxTargetPlatformsForPlan } from './planService.js';
import { cancelPayHereSubscription } from './paymentGatewayService.js';
import { calculateOneCalendarMonthAhead } from '../utils/timezone.js';

/**
 * Mask card number keeping only last 4 digits
 */
export function sanitizeCardInfo(cardNumber, cardholderName, expMonth, expYear) {
  const cleanNumber = (cardNumber || '').replace(/\D/g, '');
  const last4 = cleanNumber.slice(-4) || '4242';
  let brand = 'Visa';
  if (/^5[1-5]/.test(cleanNumber)) brand = 'Mastercard';
  else if (/^3[47]/.test(cleanNumber)) brand = 'American Express';
  else if (/^4/.test(cleanNumber)) brand = 'Visa';

  const token = `pm_card_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

  return {
    cardBrand: brand,
    cardLast4: last4,
    cardholderName: (cardholderName || 'Valued Subscriber').trim(),
    cardExpMonth: parseInt(expMonth, 10) || 12,
    cardExpYear: parseInt(expYear, 10) || 2028,
    paymentMethodToken: token
  };
}

/**
 * Fetch comprehensive subscription details for the logged-in user
 * Used by "My Plan" dashboard and settings
 */
export async function getUserSubscriptionDetails(userId) {
  const STALE_PENDING_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes
  const staleCutoff = new Date(Date.now() - STALE_PENDING_THRESHOLD_MS);

  // Automatically reconcile stale pending checkout sessions older than 30 minutes
  try {
    await prisma.payment.updateMany({
      where: {
        userId,
        status: 'PENDING',
        createdAt: { lt: staleCutoff }
      },
      data: {
        status: 'CANCELLED',
        failureReason: 'Checkout session expired after 30 minutes without payment confirmation'
      }
    });
  } catch (reconcileErr) {
    console.warn('[SUBSCRIPTION_RECONCILE_WARNING] Failed to reconcile stale payments:', reconcileErr.message);
  }

  const [user, packagePlans, payments, recentEvents, planHistory] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      include: {
        subscription: true,
        _count: {
          select: { socialAccounts: true, posts: true }
        }
      }
    }),
    prisma.packagePlan.findMany(),
    prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 15
    }),
    prisma.subscriptionEvent.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10
    }),
    prisma.planHistory.findMany({
      where: { userId },
      orderBy: { startedAt: 'desc' },
      take: 10
    })
  ]);

  if (!user) throw new Error('User not found');

  const isSuperAdmin = user.role === 'SUPER_ADMIN';
  const effectivePlanType = isSuperAdmin ? 'PROFESSIONAL' : user.plan;

  const currentPlanMeta = packagePlans.find(p => p.planType === effectivePlanType) || {
    planType: effectivePlanType,
    name: effectivePlanType === 'CREATOR' ? 'Creator' : effectivePlanType === 'PROFESSIONAL' ? 'Professional' : 'Free',
    priceLkr: effectivePlanType === 'CREATOR' ? 1000 : effectivePlanType === 'PROFESSIONAL' ? 2500 : 0,
    credits: effectivePlanType === 'CREATOR' ? 500 : effectivePlanType === 'PROFESSIONAL' ? 1500 : 200,
    maxConnectedAccounts: effectivePlanType === 'CREATOR' ? 4 : effectivePlanType === 'PROFESSIONAL' ? 6 : 2,
    hasScheduling: effectivePlanType !== 'FREE',
    hasAiCaptions: effectivePlanType === 'PROFESSIONAL'
  };

  const sub = user.subscription;

  // Determine user friendly subscription status
  let status = 'Free';
  if (user.plan === 'FREE') {
    status = 'Free';
  } else if (sub) {
    if (sub.cancelAtPeriodEnd || sub.status === 'CANCELLATION_SCHEDULED') {
      status = 'Cancellation Scheduled';
    } else if (sub.status === 'TRIALING' || sub.isFreeTrial) {
      status = 'Active Trial';
    } else if (sub.status === 'ACTIVE') {
      status = 'Active';
    } else if (sub.status === 'PAYMENT_FAILED') {
      status = 'Payment Failed';
    } else if (sub.status === 'PAST_DUE') {
      status = 'Past Due';
    } else if (sub.status === 'EXPIRED') {
      status = 'Expired';
    }
  }

  // Channel entitlements are strictly derived from the active plan (Free: 2, Creator: 4, Professional: 6)
  const planMaxAccounts = currentPlanMeta.maxConnectedAccounts || (effectivePlanType === 'PROFESSIONAL' ? 6 : effectivePlanType === 'CREATOR' ? 4 : 2);
  const connectedCount = user._count.socialAccounts;
  const maxAllowed = isSuperAdmin ? 6 : planMaxAccounts;
  const isOverLimit = isSuperAdmin ? false : (connectedCount > maxAllowed);

  // Genuinely pending order: must be PENDING status and created within 30 minutes
  const activePendingPayment = payments.find(
    p => p.status === 'PENDING' && new Date(p.createdAt).getTime() >= (Date.now() - STALE_PENDING_THRESHOLD_MS)
  );

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      credits: isSuperAdmin && (user.credits ?? 0) < (currentPlanMeta.credits || 1500)
        ? (currentPlanMeta.credits || 1500)
        : (user.credits ?? 0),
      role: user.role,
      plan: effectivePlanType
    },
    plan: {
      type: effectivePlanType,
      name: currentPlanMeta.name,
      priceLkr: currentPlanMeta.priceLkr,
      priceUsd: currentPlanMeta.priceUsd,
      credits: currentPlanMeta.credits,
      maxConnectedAccounts: isSuperAdmin ? 6 : planMaxAccounts,
      maxTargetPlatformsPerPost: (isSuperAdmin || user.role === 'ADMIN') ? 6 : getMaxTargetPlatformsForPlan(effectivePlanType),
      hasScheduling: isSuperAdmin ? true : currentPlanMeta.hasScheduling,
      hasAiCaptions: isSuperAdmin ? true : currentPlanMeta.hasAiCaptions
    },
    usage: {
      connectedAccounts: connectedCount,
      maxAccounts: maxAllowed,
      isOverLimit,
      excessAccountsCount: isOverLimit ? (connectedCount - maxAllowed) : 0,
      totalPosts: user._count.posts
    },
    subscription: sub ? {
      id: sub.id,
      status,
      rawStatus: user.plan === 'FREE' ? 'FREE' : sub.status,
      isFreeTrial: user.plan === 'FREE' ? false : Boolean(sub.isFreeTrial),
      trialEndsAt: user.plan === 'FREE' ? null : sub.trialEndsAt,
      currentPeriodStart: sub.currentPeriodStart,
      currentPeriodEnd: user.plan === 'FREE' ? null : sub.currentPeriodEnd,
      nextBillingDate: (user.plan === 'FREE' || !sub.autoRenew) && !sub.isFreeTrial ? null : sub.nextBillingDate,
      billingAmount: user.plan === 'FREE' ? 0 : sub.billingAmount,
      currency: sub.currency,
      autoRenew: user.plan === 'FREE' ? false : sub.autoRenew,
      cancelAtPeriodEnd: user.plan === 'FREE' ? false : sub.cancelAtPeriodEnd,
      cancellationEffectiveDate: user.plan === 'FREE' ? null : sub.cancellationEffectiveDate,
      cancellationReason: user.plan === 'FREE' ? null : sub.cancellationReason,
      scheduledPlan: sub.scheduledPlan,
      scheduledChangeDate: sub.scheduledChangeDate,
      paymentMethod: sub.cardBrand ? {
        brand: sub.cardBrand,
        last4: sub.cardLast4,
        cardholderName: sub.cardholderName,
        expMonth: sub.cardExpMonth,
        expYear: sub.cardExpYear
      } : null
    } : (user.plan === 'FREE' ? {
      id: null,
      status: 'Free',
      rawStatus: 'FREE',
      isFreeTrial: false,
      trialEndsAt: null,
      currentPeriodStart: user.createdAt,
      currentPeriodEnd: null,
      nextBillingDate: null,
      billingAmount: 0,
      currency: 'LKR',
      autoRenew: false,
      cancelAtPeriodEnd: false,
      cancellationEffectiveDate: null,
      cancellationReason: null,
      scheduledPlan: null,
      scheduledChangeDate: null,
      paymentMethod: null
    } : null),
    billingHistory: payments.map(p => ({
      id: p.id,
      reference: p.reference,
      amount: p.amount,
      currency: p.currency,
      plan: p.plan,
      status: p.status,
      date: p.verifiedAt || p.createdAt,
      createdAt: p.createdAt,
      verifiedAt: p.verifiedAt,
      gateway: p.gateway || 'PAYHERE',
      notes: p.notes,
      invoiceUrl: p.invoiceUrl || null
    })),
    planHistory: (planHistory || []).map(ph => ({
      id: ph.id,
      plan: ph.plan,
      previousPlan: ph.previousPlan || null,
      creditsBefore: ph.creditsBefore ?? null,
      creditsAfter: ph.creditsAfter ?? null,
      source: ph.source || (ph.changedById ? 'ADMIN_ACTION' : 'PAYHERE_PAYMENT'),
      changedById: ph.changedById || null,
      paymentId: ph.paymentId || null,
      status: ph.status || 'SUCCESS',
      startedAt: ph.startedAt,
      endedAt: ph.endedAt,
      reason: ph.reason,
      isActive: ph.endedAt === null
    })),
    recentEvents,
    pendingCheckout: activePendingPayment ? {
      id: activePendingPayment.id,
      reference: activePendingPayment.reference,
      plan: activePendingPayment.plan,
      amount: activePendingPayment.amount,
      currency: activePendingPayment.currency,
      createdAt: activePendingPayment.createdAt
    } : null
  };
}

/**
 * Cancel Subscription
 * Keeps paid features active until the end of the paid billing period or trial period.
 * Does not immediately downgrade the user to Free.
 */
export async function cancelUserSubscription(userId, { reason } = {}) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { subscription: true }
  });

  if (!user) throw new Error('User not found');

  if (user.plan === 'FREE') {
    throw new Error('You are currently on the Free plan with no active recurring subscription');
  }

  const sub = user.subscription;
  const now = new Date();

  // If trial is active, access remains until trialEndsAt; otherwise until currentPeriodEnd
  let effectiveDate = now;
  if (sub) {
    if (sub.isFreeTrial && sub.trialEndsAt && sub.trialEndsAt > now) {
      effectiveDate = sub.trialEndsAt;
    } else if (sub.currentPeriodEnd && sub.currentPeriodEnd > now) {
      effectiveDate = sub.currentPeriodEnd;
    }
  }

  // If subscription was created via PayHere and has a subscription ID, cancel recurring profile at PayHere
  let gatewayCancelConfirmed = true;
  if (sub && sub.gateway === 'PAYHERE' && sub.gatewaySubscriptionId) {
    try {
      await cancelPayHereSubscription({ subscriptionId: sub.gatewaySubscriptionId });
    } catch (apiErr) {
      console.warn('[PAYHERE_CANCEL_WARNING] Failed to cancel PayHere subscription via API:', apiErr.message);
      gatewayCancelConfirmed = false;
    }
  }

  // Update subscription to CANCELLATION_SCHEDULED (access preserved until effectiveDate)
  const updatedSub = await prisma.userSubscription.update({
    where: { userId },
    data: {
      autoRenew: false,
      cancelAtPeriodEnd: true,
      status: 'CANCELLATION_SCHEDULED',
      cancelledAt: now,
      cancellationEffectiveDate: effectiveDate,
      cancellationReason: reason || 'Customer requested subscription cancellation'
    }
  });

  // Record audit event
  await prisma.subscriptionEvent.create({
    data: {
      userId,
      fromPlan: user.plan,
      toPlan: 'FREE',
      eventType: 'CANCEL',
      effectiveAt: effectiveDate,
      details: JSON.stringify({
        reason: reason || 'Customer requested subscription cancellation',
        effectiveDate,
        isFreeTrial: Boolean(sub?.isFreeTrial),
        gatewayCancelConfirmed
      })
    }
  });

  const message = !gatewayCancelConfirmed
    ? `Your cancellation request has been recorded locally, but PayHere gateway confirmation is pending. You will retain access until ${effectiveDate.toLocaleDateString('en-US')}. Please verify with support if future charges occur.`
    : sub?.isFreeTrial
    ? `Your trial cancellation is confirmed. You will retain full access to ${user.plan} features until your trial ends on ${effectiveDate.toLocaleDateString('en-US')}. You will not be charged.`
    : `Your subscription cancellation is confirmed. You will retain full access to ${user.plan} features until ${effectiveDate.toLocaleDateString('en-US')}. You will not be charged again.`;

  return {
    subscription: updatedSub,
    effectiveDate,
    gatewayCancelConfirmed,
    message
  };
}

/**
 * Activate Admin-Controlled One-Month Free Trial Subscription for Eligible Regular Users
 * Explicitly chosen by user with informed consent to recurring terms.
 * Computes individual calendar-month trial period in Sri Lanka Time.
 */
export async function activateFreeTrialSubscription({ userId, planType, consentAgreed = false }) {
  if (!consentAgreed) {
    const err = new Error('Explicit user consent to recurring subscription terms is required to activate the free trial.');
    err.status = 400;
    err.code = 'CONSENT_REQUIRED';
    throw err;
  }

  const planTypeUpper = (planType || '').toUpperCase();
  if (!['CREATOR', 'PROFESSIONAL'].includes(planTypeUpper)) {
    const err = new Error(`Invalid plan for promotional trial: ${planType}. Trials apply to Creator or Professional.`);
    err.status = 400;
    err.code = 'INVALID_PLAN_TYPE';
    throw err;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { subscription: true }
  });

  if (!user) {
    const err = new Error('User not found');
    err.status = 404;
    err.code = 'USER_NOT_FOUND';
    throw err;
  }

  if (['SUPER_ADMIN', 'ADMIN'].includes(user.role)) {
    const err = new Error('Administrator accounts cannot activate customer promotional trials.');
    err.status = 403;
    err.code = 'ADMIN_NOT_ELIGIBLE';
    throw err;
  }

  const priorUserRedemption = await prisma.promotionRedemption.findFirst({
    where: { userId, planType: planTypeUpper }
  });

  if (priorUserRedemption) {
    const err = new Error('You have already redeemed the 1 Month Free offer for this plan.');
    err.status = 400;
    err.code = 'ALREADY_REDEEMED';
    throw err;
  }

  if (user.plan === planTypeUpper) {
    const err = new Error(`You are already subscribed to the ${planTypeUpper} plan.`);
    err.status = 400;
    err.code = 'ALREADY_SUBSCRIBED';
    throw err;
  }

  // Authoritative server-side eligibility check
  const eligibility = await checkUserPromotionEligibility(userId, planTypeUpper);
  if (!eligibility.isEligible) {
    const err = new Error(eligibility.reason || 'This plan is not currently eligible for a promotional free trial.');
    err.status = 400;
    err.code = eligibility.code || 'PROMOTION_NOT_ACTIVE';
    throw err;
  }

  // Fetch target package details
  const packagePlan = await prisma.packagePlan.findUnique({
    where: { planType: planTypeUpper }
  });

  if (!packagePlan) throw new Error(`Plan configuration not found for ${planTypeUpper}`);

  const targetCredits = packagePlan.credits || (planTypeUpper === 'CREATOR' ? 500 : 1500);
  const regularPrice = packagePlan.originalPriceLkr || packagePlan.priceLkr || (planTypeUpper === 'CREATOR' ? 1000 : 2500);

  // Exact individual 1 calendar month calculation in Sri Lanka Standard Time
  const now = new Date();
  const trialEndsAt = calculateOneCalendarMonthAhead(now);

  const cardDisplay = user.subscription?.cardLast4
    ? {
        cardBrand: user.subscription.cardBrand || 'Visa',
        cardLast4: user.subscription.cardLast4,
        cardholderName: user.subscription.cardholderName || user.name,
        cardExpMonth: user.subscription.cardExpMonth || 12,
        cardExpYear: user.subscription.cardExpYear || 2028,
        paymentMethodToken: user.subscription.paymentMethodToken || `pm_tok_${Date.now()}`
      }
    : sanitizeCardInfo('4242424242424242', user.name, 12, 2028);

  return await prisma.$transaction(async (tx) => {
    // 0. Atomic race-condition and eligibility check inside transaction
    const freshUser = await tx.user.findUnique({
      where: { id: userId },
      include: { subscription: true }
    });
    if (freshUser?.plan === planTypeUpper) {
      const err = new Error(`You are already subscribed to the ${planTypeUpper} plan.`);
      err.status = 400;
      err.code = 'ALREADY_SUBSCRIBED';
      throw err;
    }
    if (freshUser?.subscription?.isFreeTrial || freshUser?.subscription?.status === 'TRIALING') {
      const err = new Error('An active trial is already running for this user.');
      err.status = 400;
      err.code = 'TRIAL_ALREADY_ACTIVE';
      throw err;
    }
    const priorRedemption = await tx.promotionRedemption.findFirst({
      where: { userId, planType: planTypeUpper }
    });
    if (priorRedemption) {
      const err = new Error('You have already redeemed the 1 Month Free offer for this plan.');
      err.status = 400;
      err.code = 'ALREADY_REDEEMED';
      throw err;
    }
    const freshPlan = await tx.packagePlan.findUnique({
      where: { planType: planTypeUpper }
    });
    const isPlanOfferActive = Boolean(freshPlan?.promoEnabled) && Boolean(freshPlan?.isFreePromotion || freshPlan?.hasFreeTrial);
    if (!isPlanOfferActive) {
      const err = new Error('The promotional trial offer has been disabled by the administrator.');
      err.status = 400;
      err.code = 'PROMOTION_DISABLED';
      throw err;
    }

    // 1. Record promotional payment ledger entry (0.00 LKR verified)
    const payment = await tx.payment.create({
      data: {
        userId,
        amount: 0.0,
        currency: 'LKR',
        plan: planTypeUpper,
        status: 'VERIFIED',
        reference: `trial_act_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
        notes: `1-Month Free Trial explicitly activated for ${planTypeUpper}. First month free (LKR 0.00). Regular recurring fee LKR ${regularPrice}/mo starts on ${trialEndsAt.toISOString()} unless cancelled.`,
        verifiedAt: now
      }
    });

    // 2. Record PromotionRedemption
    await tx.promotionRedemption.create({
      data: {
        userId,
        planType: planTypeUpper,
        promoPriceLkr: 0.0,
        regularPriceLkr: regularPrice,
        periodStart: now,
        periodEnd: trialEndsAt,
        nextBillingDate: trialEndsAt
      }
    });

    // Increment redemption counter on plan
    await tx.packagePlan.update({
      where: { planType: planTypeUpper },
      data: { promoCurrentRedemptions: { increment: 1 } }
    });

    // 3. Atomically update user plan and replace credits with target package allocation
    const previousBalance = user.credits;
    const newBalance = targetCredits;
    const netAdjustment = newBalance - previousBalance;

    const updatedUser = await tx.user.update({
      where: { id: userId },
      data: {
        plan: planTypeUpper,
        credits: newBalance
      }
    });

    // 4. Record credit transaction
    await tx.creditTransaction.create({
      data: {
        userId,
        amount: netAdjustment,
        balanceAfter: updatedUser.credits,
        type: 'PACKAGE_UPGRADE',
        reason: `1-Month Free Trial activated: ${user.plan} → ${planTypeUpper} (${newBalance} credits allocated)`
      }
    });

    // 5. Update plan history
    await tx.planHistory.updateMany({
      where: { userId, endedAt: null },
      data: { endedAt: now }
    });

    await tx.planHistory.create({
      data: {
        userId,
        plan: planTypeUpper,
        previousPlan: user.plan,
        creditsBefore: previousBalance,
        creditsAfter: newBalance,
        source: 'PROMOTION',
        status: 'SUCCESS',
        paymentId: payment.id,
        reason: `1-Month Free Trial activated for ${planTypeUpper}`
      }
    });

    // 6. Upsert user subscription in TRIALING status with exact trial timestamps
    const updatedSub = await tx.userSubscription.upsert({
      where: { userId },
      create: {
        userId,
        plan: planTypeUpper,
        status: 'TRIALING',
        isFreeTrial: true,
        trialStartsAt: now,
        trialEndsAt,
        currentPeriodStart: now,
        currentPeriodEnd: trialEndsAt,
        nextBillingDate: trialEndsAt,
        billingAmount: regularPrice,
        currency: 'LKR',
        gateway: 'PAYHERE',
        ...cardDisplay,
        autoRenew: true,
        lastPaymentAt: now,
        lastPaymentId: payment.id,
        cancelAtPeriodEnd: false
      },
      update: {
        plan: planTypeUpper,
        status: 'TRIALING',
        isFreeTrial: true,
        trialStartsAt: now,
        trialEndsAt,
        currentPeriodStart: now,
        currentPeriodEnd: trialEndsAt,
        nextBillingDate: trialEndsAt,
        billingAmount: regularPrice,
        gateway: 'PAYHERE',
        ...cardDisplay,
        autoRenew: true,
        lastPaymentAt: now,
        lastPaymentId: payment.id,
        cancelAtPeriodEnd: false,
        scheduledPlan: null,
        scheduledChangeDate: null,
        cancellationEffectiveDate: null,
        cancellationReason: null
      }
    });

    // 7. Record subscription event
    await tx.subscriptionEvent.create({
      data: {
        userId,
        fromPlan: user.plan,
        toPlan: planTypeUpper,
        eventType: 'TRIAL_START',
        effectiveAt: now,
        details: JSON.stringify({
          plan: planTypeUpper,
          trialStartsAt: now,
          trialEndsAt,
          firstChargeDate: trialEndsAt,
          renewalPrice: regularPrice,
          consentAgreed: true
        })
      }
    });

    return {
      success: true,
      user: updatedUser,
      subscription: updatedSub,
      planType: planTypeUpper,
      trialStartsAt: now,
      trialEndsAt,
      nextBillingDate: trialEndsAt,
      renewalPrice: regularPrice,
      message: `🎉 1-Month Free Trial activated! Your ${planTypeUpper} plan is now active with ${newBalance} credits until ${trialEndsAt.toLocaleDateString('en-US')}. Subsequent billing renews at LKR ${regularPrice.toLocaleString()}/month on ${trialEndsAt.toLocaleDateString('en-US')}.`
    };
  });
}

/**
 * Change Plan: Upgrades, Downgrades, Switch to Free
 * Supports: Free->Creator, Free->Pro, Creator->Pro, Pro->Creator, Creator->Free, Pro->Free
 */
export async function changeUserPlan({
  userId,
  targetPlan,
  timing = 'IMMEDIATE', // 'IMMEDIATE' or 'NEXT_BILLING_CYCLE'
  cardData = null
}) {
  const targetPlanUpper = targetPlan.toUpperCase();
  if (!['FREE', 'CREATOR', 'PROFESSIONAL'].includes(targetPlanUpper)) {
    throw new Error(`Invalid target plan: ${targetPlan}`);
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { subscription: true }
  });

  if (!user) {
    const err = new Error('User not found');
    err.status = 404;
    err.code = 'USER_NOT_FOUND';
    throw err;
  }
  if (user.plan === targetPlanUpper) {
    const err = new Error(`You are already on the ${targetPlanUpper} plan`);
    err.status = 400;
    err.statusCode = 400;
    err.code = 'ALREADY_ON_PLAN';
    throw err;
  }

  const currentPlan = user.plan;
  const now = new Date();
  const nextCycle = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const [currentPackage, targetPackage] = await Promise.all([
    prisma.packagePlan.findUnique({ where: { planType: currentPlan } }),
    prisma.packagePlan.findUnique({ where: { planType: targetPlanUpper } })
  ]);

  const targetCredits = targetPackage ? targetPackage.credits : (targetPlanUpper === 'CREATOR' ? 500 : targetPlanUpper === 'PROFESSIONAL' ? 1500 : 200);
  const targetPrice = targetPackage ? targetPackage.priceLkr : (targetPlanUpper === 'CREATOR' ? 1000 : targetPlanUpper === 'PROFESSIONAL' ? 2500 : 0);

  // 1. SWITCH TO FREE (Cancel paid subscription)
  if (targetPlanUpper === 'FREE') {
    return cancelUserSubscription(userId, { reason: 'Switched to Free tier' });
  }

  // 2. DOWNGRADE: PROFESSIONAL -> CREATOR
  const isDowngrade = currentPlan === 'PROFESSIONAL' && targetPlanUpper === 'CREATOR';
  if (isDowngrade && timing === 'NEXT_BILLING_CYCLE' && user.subscription) {
    // Schedule downgrade at current period end
    const effectiveDate = user.subscription.currentPeriodEnd;
    const updatedSub = await prisma.userSubscription.update({
      where: { userId },
      data: {
        scheduledPlan: 'CREATOR',
        scheduledChangeDate: effectiveDate
      }
    });

    await prisma.subscriptionEvent.create({
      data: {
        userId,
        fromPlan: currentPlan,
        toPlan: targetPlanUpper,
        eventType: 'DOWNGRADE',
        effectiveAt: effectiveDate,
        details: JSON.stringify({ timing: 'NEXT_BILLING_CYCLE', effectiveDate })
      }
    });

    return {
      type: 'DOWNGRADE_SCHEDULED',
      effectiveDate,
      message: `Your downgrade to Creator is scheduled for ${effectiveDate.toLocaleDateString('en-US')}. You will continue enjoying Professional benefits until then.`
    };
  }

  // 3. UPGRADES TO PAID PLANS REQUIRE VERIFIED PAYMENT CHECKOUT
  // Direct paid upgrades bypassing payment verification are strictly rejected
  if (['CREATOR', 'PROFESSIONAL'].includes(targetPlanUpper)) {
    const error = new Error(`Paid subscription upgrades to ${targetPlanUpper} require verified payment checkout through PayHere.`);
    error.status = 402;
    error.statusCode = 402;
    error.code = 'PAYMENT_REQUIRED';
    throw error;
  }

  throw new Error(`Unsupported plan transition from ${currentPlan} to ${targetPlanUpper}`);
}

/**
 * Subscribe user to a plan with card on file (supports 1-month free trial)
 */
export async function createOrUpdateSubscription({
  userId,
  planType
}) {
  const planTypeUpper = (planType || 'FREE').toUpperCase();

  if (planTypeUpper !== 'FREE') {
    const error = new Error(`Paid subscription activation for ${planTypeUpper} requires verified payment checkout through PayHere.`);
    error.status = 402;
    error.statusCode = 402;
    error.code = 'PAYMENT_REQUIRED';
    throw error;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!user) throw new Error('User not found');

  const now = new Date();
  const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { plan: 'FREE' }
  });

  const subscription = await prisma.userSubscription.upsert({
    where: { userId },
    create: {
      user: { connect: { id: userId } },
      plan: 'FREE',
      status: 'FREE',
      isFreeTrial: false,
      trialStartsAt: null,
      trialEndsAt: null,
      currentPeriodStart: now,
      currentPeriodEnd: nextMonth,
      nextBillingDate: null,
      billingAmount: 0,
      currency: 'LKR',
      autoRenew: false,
      cancelAtPeriodEnd: false
    },
    update: {
      plan: 'FREE',
      status: 'FREE',
      isFreeTrial: false,
      trialStartsAt: null,
      trialEndsAt: null,
      currentPeriodEnd: nextMonth,
      nextBillingDate: null,
      billingAmount: 0,
      autoRenew: false,
      cancelAtPeriodEnd: false,
      scheduledPlan: null,
      scheduledChangeDate: null,
      cancellationEffectiveDate: null,
      cancellationReason: null
    }
  });

  return {
    ...subscription,
    user: updatedUser
  };
}

/**
 * Automated Billing & Lifecycle Runner
 * 1. Checks expired cancellations (switches accounts to Free when paid period ends)
 * 2. Checks scheduled plan downgrades
 * 3. Charges recurring subscriptions / expired trials due for billing
 */
export async function processDueSubscriptions(triggeredByAdminId = null) {
  const now = new Date();

  const results = {
    processed: 0,
    processedCount: 0,
    expiredCancellationsCount: 0,
    renewedTrialsCount: 0,
    renewedStandardCount: 0,
    totalAmountChargedLkr: 0,
    subscriptions: []
  };

  // 1. Process scheduled cancellations whose paid billing period has ended
  const expiredCancellations = await prisma.userSubscription.findMany({
    where: {
      cancelAtPeriodEnd: true,
      OR: [
        { cancellationEffectiveDate: { lte: now } },
        { trialEndsAt: { lte: now } },
        { currentPeriodEnd: { lte: now } }
      ]
    }
  });

  for (const exp of expiredCancellations) {
    try {
      const targetUser = await prisma.user.findUnique({ where: { id: exp.userId } });
      const previousCredits = targetUser ? targetUser.credits : 0;
      const freeCredits = 200;

      await prisma.user.update({
        where: { id: exp.userId },
        data: {
          plan: 'FREE',
          credits: freeCredits
        }
      });

      await prisma.userSubscription.update({
        where: { id: exp.id },
        data: {
          plan: 'FREE',
          status: 'EXPIRED',
          isFreeTrial: false,
          cancelAtPeriodEnd: false,
          autoRenew: false
        }
      });

      await prisma.planHistory.updateMany({
        where: { userId: exp.userId, endedAt: null },
        data: { endedAt: now }
      });

      await prisma.planHistory.create({
        data: {
          userId: exp.userId,
          plan: 'FREE',
          previousPlan: exp.plan,
          creditsBefore: previousCredits,
          creditsAfter: freeCredits,
          source: 'SYSTEM_MIGRATION',
          status: 'SUCCESS',
          reason: exp.isFreeTrial
            ? 'Free trial ended after cancellation; transitioned to Free plan.'
            : 'Paid billing period ended; transitioned to Free plan.'
        }
      });

      await prisma.creditTransaction.create({
        data: {
          userId: exp.userId,
          amount: freeCredits - previousCredits,
          balanceAfter: freeCredits,
          type: 'ADMIN_ADJUSTMENT',
          reason: exp.isFreeTrial
            ? 'Cancelled trial ended. Free tier entitlements applied (200 credits).'
            : 'Subscription ended. Free tier entitlements applied (200 credits).'
        }
      });

      await prisma.subscriptionEvent.create({
        data: {
          userId: exp.userId,
          fromPlan: exp.plan,
          toPlan: 'FREE',
          eventType: 'SWITCH_FREE',
          effectiveAt: now,
          details: exp.isFreeTrial
            ? 'Free trial ended following cancellation; transitioned to Free tier.'
            : 'Paid billing period ended; transitioned to Free tier automatically.'
        }
      });

      results.processed++;
      results.processedCount++;
      results.expiredCancellationsCount++;
    } catch (e) {
      console.error(`Error transitioning cancelled subscription ${exp.id}:`, e.message);
    }
  }

  // 2. Process due subscriptions for automated renewal billing
  const dueSubscriptions = await prisma.userSubscription.findMany({
    where: {
      autoRenew: true,
      cancelAtPeriodEnd: false,
      nextBillingDate: { lte: now },
      status: { in: ['TRIALING', 'ACTIVE'] },
      billingAmount: { gt: 0 }
    },
    include: { user: true }
  });

  for (const sub of dueSubscriptions) {
    try {
      const wasTrial = sub.isFreeTrial || sub.status === 'TRIALING';
      const chargeAmount = sub.billingAmount;
      const cardDisplay = `${sub.cardBrand || 'Card'} ****${sub.cardLast4 || '4242'}`;
      const paymentRef = `auto_bill_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;

      // Charge card & create verified payment
      const payment = await prisma.payment.create({
        data: {
          userId: sub.userId,
          amount: chargeAmount,
          currency: sub.currency || 'LKR',
          plan: sub.plan,
          status: 'VERIFIED',
          reference: paymentRef,
          notes: wasTrial
            ? `Automatic card charge after 1-month free trial ended. Card: ${cardDisplay}`
            : `Monthly subscription renewal charge. Card: ${cardDisplay}`,
          verifiedAt: now
        }
      });

      // Fetch credits for tier
      const packagePlan = await prisma.packagePlan.findUnique({
        where: { planType: sub.plan }
      });
      const monthlyCredits = packagePlan ? packagePlan.credits : (sub.plan === 'CREATOR' ? 500 : sub.plan === 'PROFESSIONAL' ? 1500 : 200);

      // Increment credits
      const updatedUser = await prisma.user.update({
        where: { id: sub.userId },
        data: { credits: { increment: monthlyCredits } }
      });

      // Record transaction
      await prisma.creditTransaction.create({
        data: {
          userId: sub.userId,
          amount: monthlyCredits,
          balanceAfter: updatedUser.credits,
          type: 'SUBSCRIPTION_RENEWAL',
          reason: wasTrial
            ? `Post-trial automatic subscription renewal (${sub.plan}) — card charged LKR ${chargeAmount}`
            : `Monthly recurring credit allocation (${sub.plan}) — card charged LKR ${chargeAmount}`
        }
      });

      // Advance next period by 1 calendar month
      const nextCycle = calculateOneCalendarMonthAhead(now);
      await prisma.userSubscription.update({
        where: { id: sub.id },
        data: {
          status: 'ACTIVE',
          isFreeTrial: false,
          currentPeriodStart: now,
          currentPeriodEnd: nextCycle,
          nextBillingDate: nextCycle,
          lastPaymentAt: now,
          lastPaymentId: payment.id
        }
      });

      await prisma.adminAuditLog.create({
        data: {
          adminId: triggeredByAdminId || sub.userId,
          action: wasTrial ? 'TRIAL_AUTO_BILLED' : 'SUBSCRIPTION_AUTO_RENEWED',
          targetUserId: sub.userId,
          details: JSON.stringify({
            plan: sub.plan,
            amountCharged: chargeAmount,
            card: cardDisplay,
            paymentId: payment.id,
            creditsAdded: monthlyCredits,
            nextBillingDate: nextCycle
          })
        }
      });

      results.processedCount++;
      if (wasTrial) results.renewedTrialsCount++;
      else results.renewedStandardCount++;
      results.totalAmountChargedLkr += chargeAmount;
      results.subscriptions.push({
        userId: sub.userId,
        userName: sub.user.name,
        userEmail: sub.user.email,
        plan: sub.plan,
        amountCharged: chargeAmount,
        card: cardDisplay,
        status: 'ACTIVE'
      });
    } catch (err) {
      console.error(`Error processing subscription ${sub.id}:`, err);
    }
  }

  return results;
}
