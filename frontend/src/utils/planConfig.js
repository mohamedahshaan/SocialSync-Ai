/**
 * SocialSync AI — Plan & Subscription Configuration
 * Proposed plan tiers with transparent credit allocations and feature limits.
 */

export const PLAN_TARGET_PLATFORM_LIMITS = {
  FREE: 2,
  CREATOR: 4,
  PROFESSIONAL: 6
};

export function getMaxTargetPlatformsForPlan(planType) {
  if (!planType) return PLAN_TARGET_PLATFORM_LIMITS.FREE;
  const upper = String(planType).toUpperCase();
  return PLAN_TARGET_PLATFORM_LIMITS[upper] ?? PLAN_TARGET_PLATFORM_LIMITS.FREE;
}

export const PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    tagline: 'Ideal for individuals and hobby creators getting started.',
    price: 'LKR 0',
    priceNum: 0,
    period: 'forever',
    credits: 200,
    maxAccounts: 2,
    maxTargetPlatforms: 2,
    features: [
      { text: '200 credits allocation', included: true },
      { text: 'Choose any 2 accounts to share', included: true },
      { text: 'Maximum 2 connected accounts', included: true },
      { text: 'All 6 supported platforms', included: true },
      { text: 'Full publishing history & logs', included: true },
      { text: 'Direct single-click publishing', included: true },
      { text: 'Post scheduling', included: false },
      { text: 'Photo Collage Studio', included: false },
      { text: 'AI caption suggestions', included: false },
    ],
    scheduling: false,
    collageStudio: false,
    aiCaptions: false,
    recommended: false,
    ctaText: 'Get Started for Free',
  },
  creator: {
    id: 'creator',
    name: 'Creator',
    tagline: 'For active creators growing their multi-channel audience.',
    price: 'LKR 1,000',
    priceNum: 1000,
    period: 'proposed',
    credits: 500,
    maxAccounts: 4,
    maxTargetPlatforms: 4,
    features: [
      { text: '500 credits allocation', included: true },
      { text: 'Choose any 4 accounts to share', included: true },
      { text: 'Maximum 4 connected accounts', included: true },
      { text: 'All 6 supported platforms', included: true },
      { text: 'Post scheduling with calendar', included: true },
      { text: 'Full publishing history & logs', included: true },
      { text: 'Photo Collage Studio', included: true },
      { text: 'Priority queue processing', included: true },
      { text: 'AI caption suggestions', included: false },
    ],
    scheduling: true,
    collageStudio: true,
    aiCaptions: false,
    recommended: true,
    ctaText: 'Choose Creator',
  },
  professional: {
    id: 'professional',
    name: 'Professional',
    tagline: 'For agencies and brands requiring full automation and AI power.',
    price: 'LKR 2,500',
    priceNum: 2500,
    period: 'proposed',
    credits: 1500,
    maxAccounts: 6,
    maxTargetPlatforms: 6,
    features: [
      { text: '1500 credits allocation', included: true },
      { text: 'Choose all 6 accounts to share', included: true },
      { text: 'Maximum 6 connected accounts', included: true },
      { text: 'All 6 supported platforms', included: true },
      { text: 'Post scheduling with calendar', included: true },
      { text: 'Full publishing history & logs', included: true },
      { text: 'Photo Collage Studio', included: true },
      { text: 'Priority publishing delivery', included: true },
      { text: 'AI caption suggestions & hashtags', included: true },
    ],
    scheduling: true,
    collageStudio: true,
    aiCaptions: true,
    recommended: false,
    ctaText: 'Choose Professional',
  },
};

/**
 * Retrieve user's currently stored plan preference
 */
export function getUserPlan() {
  const planKey = (localStorage.getItem('socialsync_plan') || 'free').toLowerCase();
  return PLANS[planKey] || PLANS.free;
}

/**
 * Retrieve the status of paid plan selection (pending payment verification)
 */
export function getUserPlanStatus() {
  const planKey = (localStorage.getItem('socialsync_plan') || 'free').toLowerCase();
  if (planKey === 'creator' || planKey === 'professional') {
    return {
      selectedPlan: PLANS[planKey],
      isPendingPayment: true,
      activeTier: PLANS.free, // Free tier benefits active until billing activation
    };
  }
  return {
    selectedPlan: PLANS.free,
    isPendingPayment: false,
    activeTier: PLANS.free,
  };
}

/**
 * Store user's selected plan
 */
export function setUserPlan(planKey) {
  const key = (planKey || 'free').toLowerCase();
  if (PLANS[key]) {
    localStorage.setItem('socialsync_plan', key);
  }
}
