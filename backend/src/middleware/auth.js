import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { prisma } from '../utils/prisma.js';
import { entitlementService } from '../services/entitlementService.js';

export async function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.substring(7)
      : null;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication token required. Please log in.',
        error: 'UNAUTHORIZED'
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, config.jwtSecret);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired authentication token.',
        error: 'INVALID_TOKEN'
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId || decoded.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        plan: true,
        credits: true,
        profileImage: true,
        phone: true,
        address: true,
        city: true,
        country: true,
        tokenVersion: true,
        permissions: true,
        createdAt: true,
        subscription: {
          select: {
            id: true,
            plan: true,
            status: true,
            currentPeriodStart: true,
            currentPeriodEnd: true,
            autoRenew: true,
            cancelAtPeriodEnd: true
          }
        }
      }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Authenticated user no longer exists.',
        error: 'USER_NOT_FOUND'
      });
    }

    if (user.status === 'SUSPENDED') {
      return res.status(403).json({
        success: false,
        message: 'Your account has been suspended by an administrator. Please contact support.',
        error: 'ACCOUNT_SUSPENDED'
      });
    }

    // Invalidate session if tokenVersion does not match database (after password reset or permission revocation)
    const tokenVersion = decoded.tokenVersion !== undefined ? decoded.tokenVersion : 0;
    if (user.tokenVersion !== tokenVersion) {
      return res.status(401).json({
        success: false,
        message: 'Your session has been invalidated following a password reset, role change, or security update. Please log in again.',
        error: 'SESSION_INVALIDATED'
      });
    }

    // Super Admin privilege guarantee: always grant PROFESSIONAL tier and minimum 1,500 credits
    const isSuperAdmin = user.role === 'SUPER_ADMIN';
    const effectivePlan = isSuperAdmin ? 'PROFESSIONAL' : user.plan;

    // Fetch active package plan to supply dynamic allowance & plan name
    let packagePlan = null;
    try {
      packagePlan = await prisma.packagePlan.findUnique({
        where: { planType: effectivePlan }
      });
    } catch (err) {
      console.warn('Warning: could not fetch packagePlan in auth middleware:', err.message);
    }

    // Attach verified user to request with dynamic plan metadata
    req.user = {
      ...user,
      plan: effectivePlan,
      credits: isSuperAdmin && (user.credits ?? 0) < (packagePlan?.credits || 1500)
        ? (packagePlan?.credits || 1500)
        : (user.credits ?? 0),
      planAllowance: packagePlan?.credits ?? (isSuperAdmin ? 1500 : null),
      planName: packagePlan?.name ?? (isSuperAdmin ? 'Professional' : null)
    };
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Enforce administrator authorization for protected administrative endpoints
 * Permits SUPER_ADMIN, ADMIN, and SUPPORT_ADMIN
 */
export function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. Please log in.',
      error: 'UNAUTHORIZED'
    });
  }

  const allowedRoles = ['SUPER_ADMIN', 'ADMIN', 'SUPPORT_ADMIN'];
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Administrator authorization required. Access denied.',
      error: 'FORBIDDEN_NOT_ADMIN'
    });
  }

  next();
}

/**
 * Restricts sensitive administrative operations strictly to Super Administrators
 * (e.g. inviting admins, managing roles, modifying permissions, revoking admin privileges)
 */
export function requireSuperAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. Please log in.',
      error: 'UNAUTHORIZED'
    });
  }

  if (req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Super Administrator authorization required. Access denied.',
      error: 'FORBIDDEN_NOT_SUPER_ADMIN'
    });
  }

  next();
}

/**
 * Enforces granular permission checking (e.g. 'users:write', 'plans:manage', 'promotions:manage')
 * Super Admins automatically pass all permission checks
 */
export function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please log in.',
        error: 'UNAUTHORIZED'
      });
    }

    // Super Admin has unrestricted authority across all administrative domains
    if (req.user.role === 'SUPER_ADMIN') {
      return next();
    }

    let perms = [];
    try {
      if (Array.isArray(req.user.permissions)) {
        perms = req.user.permissions;
      } else if (typeof req.user.permissions === 'string') {
        perms = JSON.parse(req.user.permissions || '[]');
      }
    } catch {
      perms = [];
    }

    // If permissions array is empty or null, fall back to default permissions for the role
    if ((!perms || perms.length === 0) && req.user.role === 'ADMIN') {
      perms = [
        'users:read',
        'users:write',
        'plans:manage',
        'promotions:manage',
        'credits:manage',
        'payments:manage',
        'publishing:read',
        'analytics:read',
        'admins:manage'
      ];
    } else if ((!perms || perms.length === 0) && req.user.role === 'SUPPORT_ADMIN') {
      perms = ['users:read', 'publishing:read', 'analytics:read'];
    }

    if (perms.includes('*') || perms.includes(permission)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: `Access denied. Your administrative account lacks the '${permission}' permission.`,
      error: 'FORBIDDEN_PERMISSION_DENIED',
      requiredPermission: permission
    });
  };
}

/**
 * Enforce active Professional Plan requirement for premium features
 * (Collage Studio and AI Caption Generator / Vision)
 * Validates real-time plan and subscription status from PostgreSQL
 */
export async function requireProfessionalPlan(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please log in.',
        error: 'UNAUTHORIZED'
      });
    }

    const check = await entitlementService.isFeatureEntitled(req.user.id, 'aiCaptions');
    if (!check.allowed) {
      return res.status(check.status || 403).json({
        success: false,
        error: check.error || 'PLAN_UPGRADE_REQUIRED',
        code: check.code || 'PLAN_UPGRADE_REQUIRED',
        message: check.message || 'AI Caption Generator is exclusive to the Professional Plan. Upgrade your plan to unlock these premium features.',
        requiredPlan: check.requiredPlan || 'PROFESSIONAL',
        currentPlan: check.currentPlan,
        subscriptionStatus: check.subscriptionStatus,
        globalDisabled: check.globalDisabled
      });
    }

    req.user = check.user || req.user;
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Enforce Creator / Professional Plan requirement (or plan configured with hasCollageStudio=true)
 * for Collage Studio photo template render upload and post composition.
 */
export async function requireCollageStudioPlan(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please log in.',
        error: 'UNAUTHORIZED'
      });
    }

    const check = await entitlementService.isFeatureEntitled(req.user.id, 'collageStudio');
    if (!check.allowed) {
      return res.status(check.status || 403).json({
        success: false,
        error: check.error || 'PLAN_UPGRADE_REQUIRED',
        code: check.code || 'PLAN_UPGRADE_REQUIRED',
        message: check.message || 'Collage Studio is available on Creator and Professional plans. Upgrade your plan to unlock this feature.',
        requiredPlan: check.requiredPlan || 'CREATOR',
        currentPlan: check.currentPlan,
        subscriptionStatus: check.subscriptionStatus,
        globalDisabled: check.globalDisabled
      });
    }

    req.user = check.user || req.user;
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Check whether a user is entitled to use Scheduled Publishing.
 * Evaluates fresh user status, dynamic package plan hasScheduling entitlement from DB,
 * and subscription validity (active, not expired, not cancelled/past-due).
 */
export async function checkSchedulingEntitlement(userOrId) {
  return entitlementService.isFeatureEntitled(userOrId, 'scheduling');
}

/**
 * Enforce scheduling entitlement middleware for dedicated scheduling routes
 */
export async function requireSchedulingPlan(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please log in.',
        error: 'UNAUTHORIZED'
      });
    }

    const check = await checkSchedulingEntitlement(req.user.id);
    if (!check.allowed) {
      return res.status(check.status).json({
        success: false,
        error: check.error,
        code: check.code,
        message: check.message,
        requiredPlan: check.requiredPlan,
        currentPlan: check.currentPlan,
        subscriptionStatus: check.subscriptionStatus
      });
    }

    req.user = check.user;
    next();
  } catch (error) {
    next(error);
  }
}


