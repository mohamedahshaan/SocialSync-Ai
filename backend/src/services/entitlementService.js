import { prisma } from '../utils/prisma.js';

export const SYSTEM_FEATURES = [
  {
    key: 'history',
    planField: 'hasHistory',
    name: 'Publishing history and logs',
    description: 'Track, view, and audit post delivery logs across all connected platforms',
    defaultGlobal: true,
    defaultPlanEntitlements: {
      FREE: true,
      CREATOR: true,
      PROFESSIONAL: true
    }
  },
  {
    key: 'scheduling',
    planField: 'hasScheduling',
    name: 'Smart post scheduling and calendar',
    description: 'Automated post scheduling and calendar-based content queueing',
    defaultGlobal: true,
    defaultPlanEntitlements: {
      FREE: false,
      CREATOR: true,
      PROFESSIONAL: true
    }
  },
  {
    key: 'collageStudio',
    planField: 'hasCollageStudio',
    name: 'Photo Collage Studio',
    description: 'Multi-image grid collage studio layouts and design canvas',
    defaultGlobal: true,
    defaultPlanEntitlements: {
      FREE: false,
      CREATOR: true,
      PROFESSIONAL: true
    }
  },
  {
    key: 'priorityDispatch',
    planField: 'hasPriorityDispatch',
    name: 'Priority publishing dispatch',
    description: 'Dedicated high-speed queue dispatch and real-time social distribution',
    defaultGlobal: true,
    defaultPlanEntitlements: {
      FREE: false,
      CREATOR: true,
      PROFESSIONAL: true
    }
  },
  {
    key: 'aiCaptions',
    planField: 'hasAiCaptions',
    name: 'AI Caption Generator and Vision Studio',
    description: 'Intelligent visual multimodal AI captions, hashtags, and tone styling',
    defaultGlobal: true,
    defaultPlanEntitlements: {
      FREE: false,
      CREATOR: false,
      PROFESSIONAL: true
    }
  }
];

class EntitlementService {
  constructor() {
    this._cachedGlobals = null;
    this._cacheTimestamp = 0;
    this._ttlMs = 4000; // 4 seconds short cache, auto-invalidated on admin updates
  }

  /**
   * Seed default global feature switches if they do not exist
   */
  async seedGlobalFeaturesIfEmpty() {
    try {
      for (const feat of SYSTEM_FEATURES) {
        await prisma.globalFeatureConfig.upsert({
          where: { featureKey: feat.key },
          update: {},
          create: {
            featureKey: feat.key,
            name: feat.name,
            description: feat.description,
            isEnabled: feat.defaultGlobal
          }
        });
      }
    } catch (err) {
      console.error('[ENTITLEMENTS] Error seeding global feature toggles:', err.message);
    }
  }

  /**
   * Invalidate in-memory cache
   */
  invalidateCache() {
    this._cachedGlobals = null;
    this._cacheTimestamp = 0;
  }

  /**
   * Fetch all global feature switches
   */
  async getGlobalFeatures() {
    const now = Date.now();
    if (this._cachedGlobals && now - this._cacheTimestamp < this._ttlMs) {
      return this._cachedGlobals;
    }

    await this.seedGlobalFeaturesIfEmpty();
    const records = await prisma.globalFeatureConfig.findMany({
      include: {
        updatedBy: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    const map = {};
    for (const r of records) {
      map[r.featureKey] = r;
    }
    this._cachedGlobals = map;
    this._cacheTimestamp = now;
    return map;
  }

  /**
   * Generate comprehensive feature matrix across all plans and global toggles
   */
  async getFeatureMatrix() {
    await this.seedGlobalFeaturesIfEmpty();
    const [globalsMap, packagePlans] = await Promise.all([
      this.getGlobalFeatures(),
      prisma.packagePlan.findMany({
        orderBy: { priceLkr: 'asc' }
      })
    ]);

    const planMap = {};
    for (const p of packagePlans) {
      planMap[p.planType] = p;
    }

    return SYSTEM_FEATURES.map((feat) => {
      const globalConfig = globalsMap[feat.key] || {
        isEnabled: feat.defaultGlobal,
        updatedAt: null,
        updatedBy: null
      };
      const isGlobalOn = Boolean(globalConfig.isEnabled);

      const freePlan = planMap['FREE'];
      const creatorPlan = planMap['CREATOR'];
      const proPlan = planMap['PROFESSIONAL'];

      const freePlanOn = freePlan ? Boolean(freePlan[feat.planField]) : feat.defaultPlanEntitlements.FREE;
      const creatorPlanOn = creatorPlan ? Boolean(creatorPlan[feat.planField]) : feat.defaultPlanEntitlements.CREATOR;
      const proPlanOn = proPlan ? Boolean(proPlan[feat.planField]) : feat.defaultPlanEntitlements.PROFESSIONAL;

      return {
        key: feat.key,
        planField: feat.planField,
        name: feat.name,
        description: feat.description,
        isGloballyEnabled: isGlobalOn,
        planEntitlements: {
          FREE: freePlanOn,
          CREATOR: creatorPlanOn,
          PROFESSIONAL: proPlanOn
        },
        // Effective access = globalOn && planOn
        effectiveAccess: {
          FREE: isGlobalOn && freePlanOn,
          CREATOR: isGlobalOn && creatorPlanOn,
          PROFESSIONAL: isGlobalOn && proPlanOn
        },
        updatedAt: globalConfig.updatedAt || null,
        updatedBy: globalConfig.updatedBy || null
      };
    });
  }

  /**
   * Update global feature toggle
   */
  async updateGlobalFeature(featureKey, isEnabled, adminUser = null) {
    const featDef = SYSTEM_FEATURES.find((f) => f.key === featureKey);
    if (!featDef) {
      throw new Error(`Unknown feature key: ${featureKey}`);
    }

    const previousConfig = await prisma.globalFeatureConfig.findUnique({
      where: { featureKey }
    });

    const updated = await prisma.globalFeatureConfig.upsert({
      where: { featureKey },
      update: {
        isEnabled: Boolean(isEnabled),
        updatedById: adminUser?.id || null
      },
      create: {
        featureKey,
        name: featDef.name,
        description: featDef.description,
        isEnabled: Boolean(isEnabled),
        updatedById: adminUser?.id || null
      },
      include: {
        updatedBy: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    this.invalidateCache();

    // Audit log
    if (adminUser?.id) {
      await prisma.adminAuditLog.create({
        data: {
          adminId: adminUser.id,
          action: 'GLOBAL_FEATURE_TOGGLE',
          details: JSON.stringify({
            featureKey,
            featureName: featDef.name,
            previousState: previousConfig ? previousConfig.isEnabled : true,
            newState: Boolean(isEnabled),
            adminEmail: adminUser.email
          })
        }
      });
    }

    return updated;
  }

  /**
   * Update plan-specific feature toggle
   */
  async updatePlanFeature(planType, featureKey, isEnabled, adminUser = null) {
    const featDef = SYSTEM_FEATURES.find((f) => f.key === featureKey);
    if (!featDef) {
      throw new Error(`Unknown feature key: ${featureKey}`);
    }
    const upperPlan = String(planType).toUpperCase();
    if (!['FREE', 'CREATOR', 'PROFESSIONAL'].includes(upperPlan)) {
      throw new Error(`Invalid plan type: ${planType}`);
    }

    const previousPlan = await prisma.packagePlan.findUnique({
      where: { planType: upperPlan }
    });

    const updateData = {};
    updateData[featDef.planField] = Boolean(isEnabled);

    const updatedPlan = await prisma.packagePlan.update({
      where: { planType: upperPlan },
      data: updateData
    });

    // Audit log
    if (adminUser?.id) {
      await prisma.adminAuditLog.create({
        data: {
          adminId: adminUser.id,
          action: 'PLAN_FEATURE_TOGGLE',
          details: JSON.stringify({
            planType: upperPlan,
            featureKey,
            field: featDef.planField,
            previousState: previousPlan ? previousPlan[featDef.planField] : false,
            newState: Boolean(isEnabled),
            adminEmail: adminUser.email
          })
        }
      });
    }

    return updatedPlan;
  }

  /**
   * Check whether a user is entitled to a specific feature
   * Enforces global OFF override, plan entitlement, and subscription health
   * @param {string|object} userOrId
   * @param {string} featureKey - 'history' | 'scheduling' | 'collageStudio' | 'priorityDispatch' | 'aiCaptions'
   */
  async isFeatureEntitled(userOrId, featureKey) {
    const featDef = SYSTEM_FEATURES.find((f) => f.key === featureKey);
    if (!featDef) {
      return {
        allowed: false,
        error: 'UNKNOWN_FEATURE',
        code: 'UNKNOWN_FEATURE',
        message: `Requested feature '${featureKey}' is not recognized.`
      };
    }

    // 1. Check Global Switch First (Global OFF overrides all plan ON settings!)
    const globals = await this.getGlobalFeatures();
    const globalConfig = globals[featureKey];
    if (globalConfig && !globalConfig.isEnabled) {
      return {
        allowed: false,
        status: 403,
        error: 'FEATURE_GLOBALLY_DISABLED',
        code: 'FEATURE_GLOBALLY_DISABLED',
        message: `${featDef.name} is currently disabled across the entire platform by the system administrator.`,
        globalDisabled: true,
        featureName: featDef.name
      };
    }

    // 2. Fetch Fresh User with Subscription
    const userId = typeof userOrId === 'string' ? userOrId : userOrId?.id;
    if (!userId) {
      return {
        allowed: false,
        status: 401,
        error: 'UNAUTHORIZED',
        code: 'UNAUTHORIZED',
        message: 'Authentication required. Please log in.'
      };
    }

    const freshUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { subscription: true }
    });

    if (!freshUser) {
      return {
        allowed: false,
        status: 401,
        error: 'USER_NOT_FOUND',
        code: 'USER_NOT_FOUND',
        message: 'User account not found.'
      };
    }

    if (freshUser.status === 'SUSPENDED') {
      return {
        allowed: false,
        status: 403,
        error: 'ACCOUNT_SUSPENDED',
        code: 'ACCOUNT_SUSPENDED',
        message: 'Your account has been suspended by an administrator.'
      };
    }

    // Administrators have full unrestricted access to system features
    if (['SUPER_ADMIN', 'ADMIN'].includes(freshUser.role)) {
      return {
        allowed: true,
        user: freshUser,
        packagePlan: null,
        adminBypass: true,
        featureName: featDef.name
      };
    }

    // 3. Dynamic Plan Configuration Lookup
    const packagePlan = await prisma.packagePlan.findUnique({
      where: { planType: freshUser.plan }
    });

    const planHasFeature = packagePlan
      ? Boolean(packagePlan[featDef.planField])
      : Boolean(featDef.defaultPlanEntitlements[freshUser.plan]);

    if (!planHasFeature) {
      const requiredPlan = featDef.defaultPlanEntitlements.CREATOR ? 'CREATOR' : 'PROFESSIONAL';
      let message = `${featDef.name} is not included in your current ${freshUser.plan} plan. Upgrade your plan to unlock this feature.`;
      if (featureKey === 'scheduling') {
        message = 'Scheduled publishing is not available on your current plan. Upgrade to unlock post scheduling and advance social media management.';
      } else if (featureKey === 'aiCaptions') {
        message = 'AI Caption Generator is exclusive to the Professional Plan. Upgrade your plan to unlock these premium features.';
      } else if (featureKey === 'collageStudio') {
        message = 'Collage Studio is available on Creator and Professional plans. Upgrade your plan to unlock this feature.';
      }
      return {
        allowed: false,
        status: 403,
        error: 'PLAN_UPGRADE_REQUIRED',
        code: 'PLAN_UPGRADE_REQUIRED',
        message,
        requiredPlan,
        currentPlan: freshUser.plan,
        featureName: featDef.name
      };
    }

    // 4. Validate Subscription Status for paid features
    if (freshUser.plan !== 'FREE' && freshUser.subscription) {
      const sub = freshUser.subscription;
      const inactiveStatuses = ['EXPIRED', 'CANCELLED', 'PAYMENT_FAILED', 'PAST_DUE'];
      if (inactiveStatuses.includes(sub.status)) {
        return {
          allowed: false,
          status: 403,
          error: 'PLAN_UPGRADE_REQUIRED',
          code: 'PLAN_UPGRADE_REQUIRED',
          subscriptionStatus: sub.status,
          message: `Your subscription is ${sub.status.toLowerCase()}. Please renew or upgrade your plan to access this feature.`,
          requiredPlan: featDef.defaultPlanEntitlements.CREATOR ? 'CREATOR' : 'PROFESSIONAL',
          currentPlan: freshUser.plan
        };
      }

      if (sub.currentPeriodEnd && new Date(sub.currentPeriodEnd) < new Date() && !sub.autoRenew && sub.status !== 'ACTIVE') {
        return {
          allowed: false,
          status: 403,
          error: 'PLAN_UPGRADE_REQUIRED',
          code: 'PLAN_UPGRADE_REQUIRED',
          subscriptionStatus: 'EXPIRED',
          message: 'Your paid subscription billing period has concluded. Upgrade or reactivate to continue using this feature.',
          requiredPlan: featDef.defaultPlanEntitlements.CREATOR ? 'CREATOR' : 'PROFESSIONAL',
          currentPlan: freshUser.plan
        };
      }
    }

    return {
      allowed: true,
      featureKey,
      plan: freshUser.plan,
      user: freshUser
    };
  }
}

export const entitlementService = new EntitlementService();
