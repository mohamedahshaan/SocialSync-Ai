import { prisma } from '../utils/prisma.js';
import crypto from 'crypto';

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
  const [user, packagePlans, payments, recentEvents] = await Promise.all([
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
      take: 10
    }),
    prisma.subscriptionEvent.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5
    })
  ]);

  if (!user) throw new Error('User not found');

  const currentPlanMeta = packagePlans.find(p => p.planType === user.plan) || {
    planType: user.plan,
    name: user.plan === 'CREATOR' ? 'Creator' : user.plan === 'PROFESSIONAL' ? 'Professional' : 'Free',
    priceLkr: user.plan === 'CREATOR' ? 1000 : user.plan === 'PROFESSIONAL' ? 2500 : 0,
    credits: user.plan === 'CREATOR' ? 500 : user.plan === 'PROFESSIONAL' ? 1000 : 200,
    maxConnectedAccounts: user.plan === 'CREATOR' ? 4 : user.plan === 'PROFESSIONAL' ? 6 : 2,
    hasScheduling: user.plan !== 'FREE',
    hasAiCaptions: user.plan === 'PROFESSIONAL'
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

  // Calculate account limit overflow (e.g. if downgraded)
  const connectedCount = user._count.socialAccounts;
  const maxAllowed = currentPlanMeta.maxConnectedAccounts;
  const isOverLimit = connectedCount > maxAllowed;

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      credits: user.credits,
      role: user.role
    },
    plan: {
      type: user.plan,
      name: currentPlanMeta.name,
      priceLkr: currentPlanMeta.priceLkr,
      priceUsd: currentPlanMeta.priceUsd,
      credits: currentPlanMeta.credits,
      maxConnectedAccounts: currentPlanMeta.maxConnectedAccounts,
      hasScheduling: currentPlanMeta.hasScheduling,
      hasAiCaptions: currentPlanMeta.hasAiCaptions
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
      rawStatus: sub.status,
      isFreeTrial: sub.isFreeTrial,
      trialEndsAt: sub.trialEndsAt,
      currentPeriodStart: sub.currentPeriodStart,
      currentPeriodEnd: sub.currentPeriodEnd,
      nextBillingDate: sub.nextBillingDate,
      billingAmount: sub.billingAmount,
      currency: sub.currency,
      autoRenew: sub.autoRenew,
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
      cancellationEffectiveDate: sub.cancellationEffectiveDate,
      cancellationReason: sub.cancellationReason,
      scheduledPlan: sub.scheduledPlan,
      scheduledChangeDate: sub.scheduledChangeDate,
      paymentMethod: sub.cardBrand ? {
        brand: sub.cardBrand,
        last4: sub.cardLast4,
        cardholderName: sub.cardholderName,
        expMonth: sub.cardExpMonth,
        expYear: sub.cardExpYear
      } : null
    } : null,
    billingHistory: payments.map(p => ({
      id: p.id,
      reference: p.reference,
      amount: p.amount,
      currency: p.currency,
      plan: p.plan,
      status: p.status,
      date: p.verifiedAt || p.createdAt,
      gateway: p.gateway || 'MANUAL',
      notes: p.notes,
      invoiceUrl: p.invoiceUrl || null
    })),
    recentEvents
  };
}

/**
 * Cancel Subscription
 * Keeps paid features active until the end of the paid billing period
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
  const effectiveDate = sub && sub.currentPeriodEnd > now ? sub.currentPeriodEnd : now;

  // Update subscription to CANCELLATION_SCHEDULED
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
        paidPeriodEndsAt: effectiveDate
      })
    }
  });

  return {
    subscription: updatedSub,
    effectiveDate,
    message: `Your subscription cancellation is confirmed. You will retain full access to ${user.plan} features until ${effectiveDate.toLocaleDateString('en-US')}. You will not be charged again.`
  };
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

  if (!user) throw new Error('User not found');
  if (user.plan === targetPlanUpper) {
    throw new Error(`You are already on the ${targetPlanUpper} plan`);
  }

  const currentPlan = user.plan;
  const now = new Date();
  const nextCycle = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const [currentPackage, targetPackage] = await Promise.all([
    prisma.packagePlan.findUnique({ where: { planType: currentPlan } }),
    prisma.packagePlan.findUnique({ where: { planType: targetPlanUpper } })
  ]);

  const targetCredits = targetPackage ? targetPackage.credits : (targetPlanUpper === 'CREATOR' ? 500 : targetPlanUpper === 'PROFESSIONAL' ? 1000 : 200);
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

  // 3. UPGRADE OR IMMEDIATE CHANGE (Free -> Creator/Pro, Creator -> Pro, Immediate Pro -> Creator)
  let cardFields = {};
  if (cardData && cardData.cardNumber) {
    cardFields = sanitizeCardInfo(
      cardData.cardNumber,
      cardData.cardholderName,
      cardData.expMonth,
      cardData.expYear
    );
  } else if (user.subscription && user.subscription.cardLast4) {
    // Reuse existing card on file
    cardFields = {
      cardBrand: user.subscription.cardBrand,
      cardLast4: user.subscription.cardLast4,
      cardholderName: user.subscription.cardholderName,
      cardExpMonth: user.subscription.cardExpMonth,
      cardExpYear: user.subscription.cardExpYear,
      paymentMethodToken: user.subscription.paymentMethodToken
    };
  } else {
    // Masked default for sandbox
    cardFields = {
      cardBrand: 'Visa',
      cardLast4: '4242',
      cardholderName: user.name,
      cardExpMonth: 12,
      cardExpYear: 2028,
      paymentMethodToken: `pm_vault_${Date.now()}`
    };
  }

  // Execute upgrade transaction
  return await prisma.$transaction(async (tx) => {
    // a. Record verified payment for the upgrade
    const payment = await tx.payment.create({
      data: {
        userId,
        amount: targetPrice,
        currency: 'LKR',
        plan: targetPlanUpper,
        status: 'VERIFIED',
        reference: `plan_chg_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
        notes: `Plan changed from ${currentPlan} to ${targetPlanUpper}. Payment charged to card ${cardFields.cardBrand} ****${cardFields.cardLast4}`,
        verifiedAt: now
      }
    });

    // b. Calculate credit allocation difference to prevent duplicate credit abuse
    const currentAllowance = currentPackage ? currentPackage.credits : (currentPlan === 'CREATOR' ? 500 : currentPlan === 'PROFESSIONAL' ? 1000 : 200);
    const creditDifference = Math.max(0, targetCredits - currentAllowance);
    const addedCredits = creditDifference > 0 ? creditDifference : targetCredits;

    // c. Update user
    const updatedUser = await tx.user.update({
      where: { id: userId },
      data: {
        plan: targetPlanUpper,
        credits: { increment: addedCredits }
      }
    });

    // d. Credit transaction
    await tx.creditTransaction.create({
      data: {
        userId,
        amount: addedCredits,
        balanceAfter: updatedUser.credits,
        type: 'ADMIN_GRANT',
        reason: `Credit allocation for plan upgrade (${currentPlan} → ${targetPlanUpper})`
      }
    });

    // e. Close previous plan history & create new
    await tx.planHistory.updateMany({
      where: { userId, endedAt: null },
      data: { endedAt: now }
    });

    await tx.planHistory.create({
      data: {
        userId,
        plan: targetPlanUpper,
        reason: `Upgraded from ${currentPlan} to ${targetPlanUpper}`
      }
    });

    // f. Update subscription
    const updatedSub = await tx.userSubscription.upsert({
      where: { userId },
      create: {
        userId,
        plan: targetPlanUpper,
        status: 'ACTIVE',
        isFreeTrial: false,
        currentPeriodStart: now,
        currentPeriodEnd: nextCycle,
        nextBillingDate: nextCycle,
        billingAmount: targetPrice,
        currency: 'LKR',
        ...cardFields,
        autoRenew: true,
        lastPaymentAt: now,
        lastPaymentId: payment.id,
        cancelAtPeriodEnd: false
      },
      update: {
        plan: targetPlanUpper,
        status: 'ACTIVE',
        isFreeTrial: false,
        currentPeriodStart: now,
        currentPeriodEnd: nextCycle,
        nextBillingDate: nextCycle,
        billingAmount: targetPrice,
        ...cardFields,
        autoRenew: true,
        lastPaymentAt: now,
        lastPaymentId: payment.id,
        cancelAtPeriodEnd: false,
        scheduledPlan: null,
        scheduledChangeDate: null
      }
    });

    // g. Record subscription event
    await tx.subscriptionEvent.create({
      data: {
        userId,
        fromPlan: currentPlan,
        toPlan: targetPlanUpper,
        eventType: isDowngrade ? 'DOWNGRADE' : 'UPGRADE',
        effectiveAt: now,
        details: JSON.stringify({
          from: currentPlan,
          to: targetPlanUpper,
          amountPaid: targetPrice,
          creditsAdded: addedCredits
        })
      }
    });

    return {
      type: isDowngrade ? 'DOWNGRADE_COMPLETED' : 'UPGRADE_COMPLETED',
      user: updatedUser,
      subscription: updatedSub,
      payment,
      message: `Successfully upgraded to ${targetPlanUpper}! Your limits and credits have been updated.`
    };
  });
}

/**
 * Subscribe user to a plan with card on file (supports 1-month free trial)
 */
export async function createOrUpdateSubscription({
  userId,
  planType,
  cardData = null
}) {
  const planTypeUpper = (planType || 'FREE').toUpperCase();

  let packagePlan = await prisma.packagePlan.findUnique({
    where: { planType: planTypeUpper }
  });

  if (!packagePlan) {
    packagePlan = {
      planType: planTypeUpper,
      priceLkr: planTypeUpper === 'CREATOR' ? 1000 : planTypeUpper === 'PROFESSIONAL' ? 2500 : 0,
      credits: planTypeUpper === 'CREATOR' ? 500 : planTypeUpper === 'PROFESSIONAL' ? 1000 : 200,
      hasFreeTrial: false,
      trialPeriodDays: 30
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!user) throw new Error('User not found');

  const now = new Date();
  const isPaidPlan = planTypeUpper !== 'FREE';
  const hasTrial = isPaidPlan && Boolean(packagePlan.hasFreeTrial);
  const trialDays = packagePlan.trialPeriodDays || 30;

  let cardFields = {};
  if (cardData && cardData.cardNumber) {
    cardFields = sanitizeCardInfo(
      cardData.cardNumber,
      cardData.cardholderName,
      cardData.expMonth,
      cardData.expYear
    );
  } else {
    cardFields = {
      cardBrand: 'Visa',
      cardLast4: '4242',
      cardholderName: user.name,
      cardExpMonth: 12,
      cardExpYear: 2028,
      paymentMethodToken: `pm_card_vault_${Date.now()}`
    };
  }

  let subscriptionStatus = 'ACTIVE';
  let isFreeTrial = false;
  let trialStartsAt = null;
  let trialEndsAt = null;
  let nextBillingDate = null;
  let currentPeriodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  if (hasTrial) {
    isFreeTrial = true;
    subscriptionStatus = 'TRIALING';
    trialStartsAt = now;
    trialEndsAt = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000);
    nextBillingDate = trialEndsAt;
    currentPeriodEnd = trialEndsAt;
  } else if (isPaidPlan) {
    subscriptionStatus = 'ACTIVE';
    nextBillingDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    currentPeriodEnd = nextBillingDate;
  }

  const subscription = await prisma.userSubscription.upsert({
    where: { userId },
    create: {
      userId,
      plan: planTypeUpper,
      status: subscriptionStatus,
      isFreeTrial,
      trialStartsAt,
      trialEndsAt,
      currentPeriodStart: now,
      currentPeriodEnd,
      nextBillingDate,
      billingAmount: packagePlan.priceLkr,
      currency: 'LKR',
      ...cardFields,
      autoRenew: true
    },
    update: {
      plan: planTypeUpper,
      status: subscriptionStatus,
      isFreeTrial,
      trialStartsAt,
      trialEndsAt,
      currentPeriodStart: now,
      currentPeriodEnd,
      nextBillingDate,
      billingAmount: packagePlan.priceLkr,
      ...cardFields,
      autoRenew: true,
      cancelAtPeriodEnd: false
    }
  });

  const creditBonus = packagePlan.credits;

  await prisma.user.update({
    where: { id: userId },
    data: {
      plan: planTypeUpper,
      credits: { increment: creditBonus }
    }
  });

  await prisma.planHistory.updateMany({
    where: { userId, endedAt: null },
    data: { endedAt: now }
  });

  await prisma.planHistory.create({
    data: {
      userId,
      plan: planTypeUpper,
      reason: isFreeTrial
        ? `Started 1-Month Free Trial for ${planTypeUpper}`
        : `Subscribed to ${planTypeUpper}`
    }
  });

  await prisma.creditTransaction.create({
    data: {
      userId,
      amount: creditBonus,
      balanceAfter: user.credits + creditBonus,
      type: isFreeTrial ? 'INITIAL_GRANT' : 'ADMIN_GRANT',
      reason: isFreeTrial
        ? `Initial 1-Month Free Trial credit allocation (${planTypeUpper})`
        : `Subscription activation credits (${planTypeUpper})`
    }
  });

  if (isPaidPlan && !hasTrial) {
    await prisma.payment.create({
      data: {
        userId,
        amount: packagePlan.priceLkr,
        currency: 'LKR',
        plan: planTypeUpper,
        status: 'VERIFIED',
        reference: `sub_pay_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
        notes: `Initial subscription charge on card ${cardFields.cardBrand} ****${cardFields.cardLast4}`,
        verifiedAt: now
      }
    });
  }

  return subscription;
}

/**
 * Automated Billing & Lifecycle Runner
 * 1. Checks expired cancellations (switches accounts to Free when paid period ends)
 * 2. Checks scheduled plan downgrades
 * 3. Charges recurring subscriptions / expired trials due for billing
 */
export async function processDueSubscriptions(triggeredByAdminId = null) {
  const now = new Date();

  // 1. Process scheduled cancellations whose paid billing period has ended
  const expiredCancellations = await prisma.userSubscription.findMany({
    where: {
      cancelAtPeriodEnd: true,
      cancellationEffectiveDate: { lte: now }
    }
  });

  for (const exp of expiredCancellations) {
    try {
      await prisma.user.update({
        where: { id: exp.userId },
        data: { plan: 'FREE' }
      });

      await prisma.userSubscription.update({
        where: { id: exp.id },
        data: {
          plan: 'FREE',
          status: 'FREE',
          cancelAtPeriodEnd: false,
          autoRenew: false
        }
      });

      await prisma.subscriptionEvent.create({
        data: {
          userId: exp.userId,
          fromPlan: exp.plan,
          toPlan: 'FREE',
          eventType: 'SWITCH_FREE',
          effectiveAt: now,
          details: 'Paid billing period ended; transitioned to Free tier automatically.'
        }
      });
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

  const results = {
    processedCount: 0,
    renewedTrialsCount: 0,
    renewedStandardCount: 0,
    totalAmountChargedLkr: 0,
    subscriptions: []
  };

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
      const monthlyCredits = packagePlan ? packagePlan.credits : (sub.plan === 'CREATOR' ? 500 : sub.plan === 'PROFESSIONAL' ? 1000 : 200);

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

      // Advance next period
      const nextCycle = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
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
