import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  getUserSubscriptionDetails,
  cancelUserSubscription,
  changeUserPlan
} from '../services/subscriptionService.js';
import { initializeCheckoutSession, getGatewayConfig } from '../services/paymentGatewayService.js';

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
 * POST /api/subscriptions/checkout-session
 * Initialize checkout session for paid plan subscription
 */
router.post('/checkout-session', async (req, res, next) => {
  try {
    const { plan, amount, currency } = req.body;
    const session = await initializeCheckoutSession({
      userId: req.user.id,
      planType: plan,
      billingAmount: amount || (plan === 'CREATOR' ? 1000 : 2500),
      currency: currency || 'LKR'
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
    next(error);
  }
});

export default router;
