import { Router } from 'express';
import { getAllPlans } from '../services/planService.js';
import { authenticateToken } from '../middleware/auth.js';
import { createOrUpdateSubscription } from '../services/subscriptionService.js';

const router = Router();

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

export default router;
