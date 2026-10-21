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
 * Authenticated user subscribing to a plan (with optional card details for 1-month free trial or paid renewal)
 */
router.post('/subscribe', authenticateToken, async (req, res, next) => {
  try {
    const { plan, cardData } = req.body;
    const subscription = await createOrUpdateSubscription({
      userId: req.user.id,
      planType: plan,
      cardData
    });

    res.json({
      success: true,
      message: subscription.isFreeTrial
        ? `Successfully activated 1-Month Free Trial for ${subscription.plan}! Next billing after 30 days.`
        : `Successfully subscribed to ${subscription.plan}!`,
      data: { subscription }
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
