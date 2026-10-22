import { Router } from 'express';
import { getAllPlans, checkUserPromotionEligibility } from '../services/planService.js';
import { authenticateToken } from '../middleware/auth.js';
import { createOrUpdateSubscription } from '../services/subscriptionService.js';
import { entitlementService } from '../services/entitlementService.js';

const router = Router();

/**
 * GET /api/plans/features
 * Authoritative feature matrix (global & per-plan entitlements) for pricing & dashboards
 */
router.get('/features', async (req, res, next) => {
  try {
    const matrix = await entitlementService.getFeatureMatrix();
    res.json({
      success: true,
      data: matrix
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/plans
 * Public endpoint to fetch all active plans with dynamic prices, credits, and free trial flags
 */
router.get('/', async (req, res, next) => {
  try {
    const plans = await getAllPlans();
    res.json({
      success: true,
      data: { plans }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/plans/subscribe
 * Authenticated user subscribing to Free plan (paid plans require verified PayHere checkout flow)
 */
router.post('/subscribe', authenticateToken, async (req, res, next) => {
  try {
    const { plan } = req.body;
    const planUpper = (plan || 'FREE').toUpperCase();
    if (planUpper !== 'FREE') {
      return res.status(402).json({
        success: false,
        message: `Paid subscription activation for ${planUpper} requires verified payment checkout through PayHere.`,
        error: 'PAYMENT_REQUIRED',
        code: 'PAYMENT_REQUIRED'
      });
    }

    const result = await createOrUpdateSubscription({
      userId: req.user.id,
      planType: 'FREE'
    });

    res.json({
      success: true,
      message: 'Successfully switched to Free plan.',
      data: {
        subscription: result,
        user: result.user
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/plans/:planType/eligibility
 * Check if the authenticated user is eligible for promotional trial
 */
router.get('/:planType/eligibility', authenticateToken, async (req, res, next) => {
  try {
    const { planType } = req.params;
    const result = await checkUserPromotionEligibility(req.user.id, planType);
    res.json({
      success: true,
      data: {
        eligible: result.isEligible,
        ...result
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
