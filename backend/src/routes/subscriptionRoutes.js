import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  getUserSubscriptionDetails,
  cancelUserSubscription,
  changeUserPlan,
  activateFreeTrialSubscription
} from '../services/subscriptionService.js';
import { checkUserPromotionEligibility } from '../services/planService.js';
import {
  initializeCheckoutSession,
  getGatewayConfig,
  processVerifiedGatewayPayment
} from '../services/paymentGatewayService.js';

import { prisma } from '../utils/prisma.js';
import { entitlementService } from '../services/entitlementService.js';

const router = Router();

// All user subscription routes require authentication
router.use(authenticateToken);

/**
 * GET /api/subscriptions/me
 * Comprehensive subscription details for logged-in user ("My Plan" page)
 */
router.get('/me', async (req, res, next) => {
  try {
    const details = await getUserSubscriptionDetails(req.user.id);
    const gateway = getGatewayConfig();
    res.json({
      success: true,
      data: {
        ...details,
        gateway
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/subscriptions/features
 * Real-time check of user eligibility for premium features (Collage Studio, AI Caption)
 */
router.get('/features', async (req, res, next) => {
  try {
    const isSuperAdmin = req.user?.role === 'SUPER_ADMIN';

    const [freshUser, aiCheck, collageCheck, schedCheck] = await Promise.all([
      prisma.user.findUnique({
        where: { id: req.user.id },
        include: { subscription: true }
      }),
      entitlementService.isFeatureEntitled(req.user.id, 'aiCaptions'),
      entitlementService.isFeatureEntitled(req.user.id, 'collageStudio'),
      entitlementService.isFeatureEntitled(req.user.id, 'scheduling')
    ]);

    const isProfessional = isSuperAdmin || Boolean(aiCheck.allowed);
    const canUseAiCaption = isSuperAdmin || Boolean(aiCheck.allowed);
    const canUseCollageStudio = isSuperAdmin || Boolean(collageCheck.allowed);
    const canUseScheduling = isSuperAdmin || Boolean(schedCheck.allowed);

    res.json({
      success: true,
      data: {
        plan: isSuperAdmin ? 'PROFESSIONAL' : (freshUser ? freshUser.plan : 'FREE'),
        isProfessional,
        canUseCollageStudio,
        canUseAiCaption,
        canUseScheduling,
        entitlements: {
          aiCaptions: isSuperAdmin ? { allowed: true, adminBypass: true } : aiCheck,
          collageStudio: isSuperAdmin ? { allowed: true, adminBypass: true } : collageCheck,
          scheduling: isSuperAdmin ? { allowed: true, adminBypass: true } : schedCheck
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/subscriptions/promo-check/:planType
 * Verify if logged-in user is eligible for 1 Month Free promotional offer
 */
router.get('/promo-check/:planType', async (req, res, next) => {
  try {
    const { planType } = req.params;
    const result = await checkUserPromotionEligibility(req.user.id, planType);
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/subscriptions/checkout-session
 * Initialize checkout session for paid plan subscription
 */
router.post('/checkout-session', async (req, res, next) => {
  try {
    const { plan, amount, currency, billingCycle = 'ONE_TIME', customer, returnUrl, cancelUrl } = req.body;
    const session = await initializeCheckoutSession({
      userId: req.user.id,
      planType: plan,
      billingAmount: amount,
      currency: currency || 'LKR',
      billingCycle,
      customer,
      returnUrl,
      cancelUrl
    });

    res.json({
      success: true,
      message: 'Checkout session initialized',
      data: session
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/subscriptions/confirm-payment & GET /api/subscriptions/confirm-payment
 * Confirm and verify a completed checkout payment (handles PayHere return_url, GET redirect, & JS onCompleted callback)
 * Automatically fulfills user plan upgrade, sets credit points allocation, and records plan history
 */
const handlePaymentConfirmation = async (req, res, next) => {
  try {
    const rawOrderId = req.body?.orderId || req.body?.order_id || req.query?.order_id || req.query?.orderId;
    const cleanOrderId = rawOrderId ? String(rawOrderId).trim() : null;
    const transactionId = req.body?.transactionId || req.body?.payment_id || req.query?.payment_id || req.query?.transactionId;
    let payment = null;

    if (cleanOrderId) {
      payment = await prisma.payment.findFirst({
        where: {
          reference: cleanOrderId,
          userId: req.user.id
        }
      });

      // Flexible fallback lookup by orderId match
      if (!payment) {
        payment = await prisma.payment.findFirst({
          where: {
            OR: [
              { reference: { contains: cleanOrderId } },
              { id: cleanOrderId }
            ],
            userId: req.user.id
          }
        });
      }
    }

    // If orderId was not found or not supplied, find user's latest PENDING payment
    if (!payment) {
      payment = await prisma.payment.findFirst({
        where: {
          userId: req.user.id,
          status: 'PENDING'
        },
        orderBy: { createdAt: 'desc' }
      });
    }

    if (!payment) {
      // Check if user's latest payment is already VERIFIED
      const latestVerified = await prisma.payment.findFirst({
        where: {
          userId: req.user.id,
          status: 'VERIFIED'
        },
        orderBy: { verifiedAt: 'desc' }
      });

      if (latestVerified) {
        const freshUser = await prisma.user.findUnique({
          where: { id: req.user.id },
          select: { id: true, email: true, name: true, plan: true, credits: true, role: true }
        });
        const packagePlan = await prisma.packagePlan.findUnique({
          where: { planType: freshUser.plan }
        });
        const enrichedUser = {
          ...freshUser,
          planAllowance: packagePlan?.credits ?? (freshUser.plan === 'CREATOR' ? 500 : freshUser.plan === 'PROFESSIONAL' ? 1500 : 200),
          planName: packagePlan?.name ?? (freshUser.plan === 'CREATOR' ? 'Creator' : freshUser.plan === 'PROFESSIONAL' ? 'Professional' : 'Free')
        };
        const details = await getUserSubscriptionDetails(req.user.id);
        const planTitle = enrichedUser.planName;
        return res.json({
          success: true,
          verified: true,
          alreadyProcessed: true,
          message: `Payment Successful — ${planTitle} Plan Activated (${freshUser.credits} credits assigned)`,
          data: {
            user: enrichedUser,
            payment: latestVerified,
            subscriptionDetails: details
          }
        });
      }

      return res.status(404).json({
        success: false,
        message: 'No pending payment found to confirm.',
        error: 'PAYMENT_NOT_FOUND'
      });
    }

    // If payment is VERIFIED by gateway webhook
    if (payment.status === 'VERIFIED') {
      const freshUser = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { id: true, email: true, name: true, plan: true, credits: true, role: true }
      });
      const packagePlan = await prisma.packagePlan.findUnique({
        where: { planType: freshUser.plan }
      });
      const enrichedUser = {
        ...freshUser,
        planAllowance: packagePlan?.credits ?? (freshUser.plan === 'CREATOR' ? 500 : freshUser.plan === 'PROFESSIONAL' ? 1500 : 200),
        planName: packagePlan?.name ?? (freshUser.plan === 'CREATOR' ? 'Creator' : freshUser.plan === 'PROFESSIONAL' ? 'Professional' : 'Free')
      };
      const details = await getUserSubscriptionDetails(req.user.id);
      const planTitle = enrichedUser.planName;
      return res.json({
        success: true,
        verified: true,
        alreadyProcessed: true,
        message: `Payment Successful — ${planTitle} Plan Activated (${freshUser.credits} credits assigned)`,
        data: {
          user: enrichedUser,
          payment,
          subscriptionDetails: details
        }
      });
    }

    // If payment was CANCELLED
    if (payment.status === 'CANCELLED') {
      const isExpired = Boolean(payment.failureReason && payment.failureReason.toLowerCase().includes('expired'));
      const details = await getUserSubscriptionDetails(req.user.id);
      return res.json({
        success: false,
        verified: false,
        status: 'CANCELLED',
        expired: isExpired,
        message: isExpired
          ? 'Checkout session expired after 30 minutes without payment confirmation. No charges were made.'
          : 'Payment checkout was cancelled. No charges were made.',
        data: { payment, subscriptionDetails: details }
      });
    }

    // If payment FAILED
    if (payment.status === 'FAILED') {
      const details = await getUserSubscriptionDetails(req.user.id);
      return res.json({
        success: false,
        verified: false,
        status: 'FAILED',
        message: payment.failureReason || 'Payment transaction failed or was declined by the issuer.',
        data: { payment, subscriptionDetails: details }
      });
    }

    // Check if pending payment is stale (older than 30 minutes)
    const STALE_PENDING_THRESHOLD_MS = 30 * 60 * 1000;
    const isStale = payment.createdAt && (Date.now() - new Date(payment.createdAt).getTime()) > STALE_PENDING_THRESHOLD_MS;
    if (isStale) {
      const updatedPayment = await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'CANCELLED',
          failureReason: 'Checkout session expired after 30 minutes without payment confirmation'
        }
      });
      const details = await getUserSubscriptionDetails(req.user.id);
      return res.json({
        success: false,
        verified: false,
        status: 'CANCELLED',
        expired: true,
        message: 'Checkout session expired after 30 minutes without payment confirmation. No charges were made.',
        data: { payment: updatedPayment, subscriptionDetails: details }
      });
    }

    // Payment is genuinely PENDING server-side IPN verification (< 30 minutes)
    return res.status(202).json({
      success: false,
      verified: false,
      status: 'PENDING',
      message: 'Payment is awaiting server-side IPN verification from PayHere. Your plan activates automatically once confirmed.',
      data: { payment }
    });
  } catch (error) {
    next(error);
  }
};

router.post('/confirm-payment', handlePaymentConfirmation);
router.get('/confirm-payment', handlePaymentConfirmation);
router.post('/auto-verify', handlePaymentConfirmation);

/**
 * POST /api/subscriptions/cancel-checkout
 * Marks a pending checkout payment as CANCELLED when customer cancels on PayHere
 */
router.post('/cancel-checkout', async (req, res, next) => {
  try {
    const rawOrderId = req.body?.orderId || req.body?.order_id;
    const cleanOrderId = rawOrderId ? String(rawOrderId).trim() : null;

    let payment = null;
    if (cleanOrderId) {
      payment = await prisma.payment.findFirst({
        where: { reference: cleanOrderId, userId: req.user.id }
      });
    }
    if (!payment) {
      payment = await prisma.payment.findFirst({
        where: { userId: req.user.id, status: 'PENDING' },
        orderBy: { createdAt: 'desc' }
      });
    }

    if (payment && payment.status === 'PENDING') {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'CANCELLED',
          failureReason: 'Checkout cancelled by customer on PayHere'
        }
      });
    }

    const details = await getUserSubscriptionDetails(req.user.id);

    res.json({
      success: true,
      message: 'Checkout marked as cancelled.',
      data: { subscriptionDetails: details }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/subscriptions/activate-trial
 * Regular user explicitly chooses to activate an admin-controlled 1-Month Free Trial
 */
router.post('/activate-trial', async (req, res, next) => {
  try {
    const { planType, consentAgreed } = req.body;
    if (!planType) {
      return res.status(400).json({
        success: false,
        message: 'Plan type is required (CREATOR or PROFESSIONAL)',
        error: 'INVALID_PLAN_TYPE'
      });
    }

    if (!consentAgreed) {
      return res.status(400).json({
        success: false,
        message: 'Explicit consent to recurring subscription terms is required.',
        error: 'CONSENT_REQUIRED'
      });
    }

    const result = await activateFreeTrialSubscription({
      userId: req.user.id,
      planType,
      consentAgreed
    });

    res.json({
      success: true,
      message: result.message,
      data: result
    });
  } catch (error) {
    const status = error.status || error.statusCode || 400;
    res.status(status).json({
      success: false,
      message: error.message || 'Failed to activate promotional free trial',
      error: error.code || 'ACTIVATION_FAILED'
    });
  }
});

/**
 * POST /api/subscriptions/change-plan
 * User changing plan: Upgrades, Downgrades, Switch to Free
 */
router.post('/change-plan', async (req, res, next) => {
  try {
    const { targetPlan, timing, cardData } = req.body;
    if (!targetPlan) {
      return res.status(400).json({
        success: false,
        message: 'Target plan is required (FREE, CREATOR, PROFESSIONAL)',
        error: 'INVALID_TARGET_PLAN'
      });
    }

    const result = await changeUserPlan({
      userId: req.user.id,
      targetPlan,
      timing: timing || 'IMMEDIATE',
      cardData
    });

    res.json({
      success: true,
      message: result.message,
      data: result
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/subscriptions/cancel
 * User cancels their paid subscription (remains active until current period ends)
 */
router.post('/cancel', async (req, res, next) => {
  try {
    const { reason } = req.body;
    const result = await cancelUserSubscription(req.user.id, { reason });
    res.json({
      success: true,
      message: result.message,
      data: result
    });
  } catch (error) {
    const status = error.status || error.statusCode || 400;
    res.status(status).json({
      success: false,
      message: error.message || 'Failed to cancel subscription',
      error: error.code || 'CANCELLATION_FAILED'
    });
  }
});

/**
 * GET /api/subscriptions/credit-history
 * Returns the authenticated user's credit transactions ledger
 * Shows total charged, refunds, package allocations, and adjustments without exposing internal per-platform rates
 */
router.get('/credit-history', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      prisma.creditTransaction.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          amount: true,
          balanceAfter: true,
          type: true,
          reason: true,
          createdAt: true
        }
      }),
      prisma.creditTransaction.count({ where: { userId: req.user.id } })
    ]);

    // Strip internal per-platform rate disclosures from description strings if present
    const sanitizedTransactions = transactions.map(tx => {
      let safeReason = tx.reason;
      if (safeReason && typeof safeReason === 'string') {
        safeReason = safeReason
          .replace(/at \d+ credits per platform/gi, '')
          .replace(/at \d+ credits/gi, '')
          .replace(/\(\d+ credits\)/gi, '')
          .trim();
      }
      return {
        ...tx,
        reason: safeReason
      };
    });

    res.json({
      success: true,
      data: {
        transactions: sanitizedTransactions,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
