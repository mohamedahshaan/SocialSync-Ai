import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../utils/prisma.js';
import {
  getAllPlans,
  updatePackagePlan,
  getPlanStats,
  toggleFreePromotion,
  migratePlanUsersToFree
} from '../services/planService.js';
import { processDueSubscriptions } from '../services/subscriptionService.js';
import { sendPasswordResetOtpEmail } from '../services/emailService.js';

/**
 * Proposed plans master configuration
 */
export const PLANS_CONFIG = [
  {
    id: 'FREE',
    name: 'Free',
    priceLkr: 0,
    credits: 50,
    maxAccounts: 2,
    scheduling: false,
    aiCaptions: false,
    description: 'Essential multi-platform publishing for individuals.'
  },
  {
    id: 'CREATOR',
    name: 'Creator',
    priceLkr: 1000,
    credits: 250,
    maxAccounts: 4,
    scheduling: true,
    aiCaptions: false,
    description: 'Automated post scheduling and extended channel connections.'
  },
  {
    id: 'PROFESSIONAL',
    name: 'Professional',
    priceLkr: 2500,
    credits: 1000,
    maxAccounts: 6,
    scheduling: true,
    aiCaptions: true,
    description: 'Full AI caption suggestions and maximum social reach.'
  }
];

/**
 * GET /api/admin/dashboard
 * Aggregated statistics from real database records
 */
export async function getDashboardStats(req, res, next) {
  try {
    const [
      totalUsers,
      freeCount,
      creatorCount,
      proCount,
      activeCount,
      suspendedCount,
      verifiedPaymentsData,
      totalCreditsData,
      recentUsers,
      recentPayments,
      recentLogs
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { plan: 'FREE' } }),
      prisma.user.count({ where: { plan: 'CREATOR' } }),
      prisma.user.count({ where: { plan: 'PROFESSIONAL' } }),
      prisma.user.count({ where: { status: 'ACTIVE' } }),
      prisma.user.count({ where: { status: 'SUSPENDED' } }),
      prisma.payment.aggregate({
        where: { status: 'VERIFIED' },
        _count: true,
        _sum: { amount: true }
      }),
      prisma.user.aggregate({
        _sum: { credits: true }
      }),
      prisma.user.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          plan: true,
          credits: true,
          createdAt: true,
          _count: {
            select: {
              socialAccounts: true,
              posts: true
            }
          }
        }
      }),
      prisma.payment.findMany({
        take: 6,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, name: true, email: true }
          }
        }
      }),
      prisma.adminAuditLog.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
        include: {
          admin: { select: { id: true, name: true, email: true } },
          targetUser: { select: { id: true, name: true, email: true } }
        }
      })
    ]);

    res.json({
      success: true,
      data: {
        summary: {
          totalUsers,
          activeUsers: activeCount,
          suspendedUsers: suspendedCount,
          planDistribution: {
            FREE: freeCount,
            CREATOR: creatorCount,
            PROFESSIONAL: proCount
          },
          payments: {
            verifiedCount: verifiedPaymentsData._count || 0,
            verifiedTotalLkr: verifiedPaymentsData._sum.amount || 0
          },
          totalCirculatingCredits: totalCreditsData._sum.credits || 0
        },
        recentRegistrations: recentUsers,
        recentPayments,
        recentAuditLogs: recentLogs
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/admin/users
 * Paginated and searchable user directory with complete profile, audit, and platform details
 */
export async function getUsers(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const { search, plan, status, role, registrationSource, isEmailVerified } = req.query;

    const where = {};

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } }
      ];
    }

    if (plan && ['FREE', 'CREATOR', 'PROFESSIONAL'].includes(plan.toUpperCase())) {
      where.plan = plan.toUpperCase();
    }

    if (status && ['ACTIVE', 'SUSPENDED'].includes(status.toUpperCase())) {
      where.status = status.toUpperCase();
    }

    if (role && ['USER', 'ADMIN'].includes(role.toUpperCase())) {
      where.role = role.toUpperCase();
    }

    if (registrationSource && ['SELF_REGISTRATION', 'ADMIN_CREATED'].includes(registrationSource.toUpperCase())) {
      where.registrationSource = registrationSource.toUpperCase();
    }

    if (isEmailVerified !== undefined && isEmailVerified !== '') {
      where.isEmailVerified = isEmailVerified === 'true' || isEmailVerified === true;
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          plan: true,
          credits: true,
          isEmailVerified: true,
          emailVerifiedAt: true,
          lastLoginAt: true,
          lastPasswordResetAt: true,
          registrationSource: true,
          createdById: true,
          createdByAdmin: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          socialAccounts: {
            select: {
              id: true,
              platform: true,
              accountName: true,
              status: true
            }
          },
          suspendedAt: true,
          suspendReason: true,
          createdAt: true,
          _count: {
            select: {
              socialAccounts: true,
              posts: true
            }
          }
        }
      })
    ]);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/admin/users/:id
 * In-depth individual user inspection with strict token and password security
 */
export async function getUserDetails(req, res, next) {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        plan: true,
        credits: true,
        isEmailVerified: true,
        emailVerifiedAt: true,
        lastLoginAt: true,
        lastPasswordResetAt: true,
        registrationSource: true,
        createdById: true,
        createdByAdmin: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        passwordResetOtps: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            createdAt: true,
            expiresAt: true,
            used: true,
            attempts: true
          }
        },
        suspendedAt: true,
        suspendReason: true,
        profileImage: true,
        createdAt: true,
        updatedAt: true,
        // Connected platforms metadata ONLY — tokens strictly excluded!
        socialAccounts: {
          select: {
            id: true,
            platform: true,
            platformUserId: true,
            accountName: true,
            accountUsername: true,
            status: true,
            createdAt: true,
            updatedAt: true
          }
        },
        planHistory: {
          orderBy: { createdAt: 'desc' }
        },
        creditTransactions: {
          orderBy: { createdAt: 'desc' },
          take: 50
        },
        payments: {
          orderBy: { createdAt: 'desc' }
        },
        _count: {
          select: {
            posts: true,
            socialAccounts: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        error: 'USER_NOT_FOUND'
      });
    }

    // Retrieve recent posts without heavy binary payloads
    const recentPosts = await prisma.post.findMany({
      where: { userId: id },
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        caption: true,
        mediaType: true,
        status: true,
        scheduledAt: true,
        createdAt: true,
        platforms: {
          select: {
            platform: true,
            status: true,
            platformPostId: true,
            errorMessage: true,
            publishedAt: true
          }
        }
      }
    });

    // Retrieve audit events regarding this user
    const auditLogs = await prisma.adminAuditLog.findMany({
      where: { targetUserId: id },
      orderBy: { createdAt: 'desc' },
      include: {
        admin: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    res.json({
      success: true,
      data: {
        user,
        recentPosts,
        auditLogs
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/admin/users
 * Provision a user account directly by an administrator
 */
export async function createUser(req, res, next) {
  try {
    const { name, email, password, plan, credits, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required',
        error: 'MISSING_FIELDS'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long',
        error: 'PASSWORD_TOO_SHORT'
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const existing = await prisma.user.findUnique({
      where: { email: cleanEmail }
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'A user with this email already exists',
        error: 'EMAIL_ALREADY_EXISTS'
      });
    }

    const targetPlan = ['FREE', 'CREATOR', 'PROFESSIONAL'].includes((plan || '').toUpperCase())
      ? plan.toUpperCase()
      : 'FREE';

    const targetRole = role === 'ADMIN' ? 'ADMIN' : 'USER';
    const targetCredits = Number.isInteger(Number(credits)) && Number(credits) >= 0 ? Number(credits) : 50;

    const passwordHash = await bcrypt.hash(password, 12);
    const now = new Date();

    const newUser = await prisma.user.create({
      data: {
        name: name.trim(),
        email: cleanEmail,
        passwordHash,
        role: targetRole,
        status: 'ACTIVE',
        plan: targetPlan,
        credits: targetCredits,
        registrationSource: 'ADMIN_CREATED',
        createdById: req.user.id,
        isEmailVerified: true,
        emailVerifiedAt: now
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        plan: true,
        credits: true,
        registrationSource: true,
        isEmailVerified: true,
        emailVerifiedAt: true,
        createdAt: true,
        createdByAdmin: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    await prisma.planHistory.create({
      data: {
        userId: newUser.id,
        plan: targetPlan,
        changedById: req.user.id,
        reason: 'Account provisioned by administrator'
      }
    });

    await prisma.creditTransaction.create({
      data: {
        userId: newUser.id,
        amount: targetCredits,
        balanceAfter: targetCredits,
        type: 'ADMIN_GRANT',
        reason: 'Initial credit grant upon administrator account creation',
        adminId: req.user.id
      }
    });

    await prisma.adminAuditLog.create({
      data: {
        adminId: req.user.id,
        action: 'USER_CREATED',
        targetUserId: newUser.id,
        details: JSON.stringify({
          email: newUser.email,
          plan: targetPlan,
          role: targetRole,
          credits: targetCredits
        }),
        ipAddress: req.ip
      }
    });

    res.status(201).json({
      success: true,
      message: `User ${newUser.email} created successfully`,
      data: { user: newUser }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/admin/users/:id/plan
 * Change a user's subscription tier with plan history and audit logging
 */
export async function updateUserPlan(req, res, next) {
  try {
    const { id } = req.params;
    const { plan, reason } = req.body;

    const targetPlan = (plan || '').toUpperCase();
    if (!['FREE', 'CREATOR', 'PROFESSIONAL'].includes(targetPlan)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid plan. Supported plans: FREE, CREATOR, PROFESSIONAL',
        error: 'INVALID_PLAN'
      });
    }

    const user = await prisma.user.findUnique({
      where: { id }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        error: 'USER_NOT_FOUND'
      });
    }

    const previousPlan = user.plan;

    // Close previous active plan history entry
    await prisma.planHistory.updateMany({
      where: { userId: id, endedAt: null },
      data: { endedAt: new Date() }
    });

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { plan: targetPlan },
      select: {
        id: true,
        name: true,
        email: true,
        plan: true,
        credits: true,
        status: true
      }
    });

    // Create new plan history record
    await prisma.planHistory.create({
      data: {
        userId: id,
        plan: targetPlan,
        changedById: req.user.id,
        reason: reason || `Plan changed from ${previousPlan} to ${targetPlan} by administrator`
      }
    });

    // Log admin action
    await prisma.adminAuditLog.create({
      data: {
        adminId: req.user.id,
        action: 'USER_PLAN_CHANGED',
        targetUserId: id,
        details: JSON.stringify({
          from: previousPlan,
          to: targetPlan,
          reason: reason || 'Administrator action'
        }),
        ipAddress: req.ip
      }
    });

    res.json({
      success: true,
      message: `User plan updated to ${targetPlan}`,
      data: { user: updatedUser }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/admin/users/:id/status
 * Suspend or reactivate user account
 */
export async function updateUserStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;

    const targetStatus = (status || '').toUpperCase();
    if (!['ACTIVE', 'SUSPENDED'].includes(targetStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Supported values: ACTIVE, SUSPENDED',
        error: 'INVALID_STATUS'
      });
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        error: 'USER_NOT_FOUND'
      });
    }

    // Prevent administrator from suspending themselves
    if (user.id === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot suspend your own administrator account',
        error: 'SELF_SUSPENSION_PROHIBITED'
      });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        status: targetStatus,
        suspendedAt: targetStatus === 'SUSPENDED' ? new Date() : null,
        suspendReason: targetStatus === 'SUSPENDED' ? (reason || 'Administrative suspension') : null
      },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        suspendedAt: true,
        suspendReason: true
      }
    });

    await prisma.adminAuditLog.create({
      data: {
        adminId: req.user.id,
        action: targetStatus === 'SUSPENDED' ? 'USER_SUSPENDED' : 'USER_REACTIVATED',
        targetUserId: id,
        details: JSON.stringify({
          status: targetStatus,
          reason: reason || (targetStatus === 'SUSPENDED' ? 'Administrative suspension' : 'Reactivated by admin')
        }),
        ipAddress: req.ip
      }
    });

    res.json({
      success: true,
      message: `Account status updated to ${targetStatus}`,
      data: { user: updatedUser }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/admin/users/:id/credits
 * Grant or deduct credits with strict validation and immutable audit ledger
 */
export async function adjustUserCredits(req, res, next) {
  try {
    const { id } = req.params;
    const { amount, reason } = req.body;

    const numericAmount = parseInt(amount, 10);
    if (isNaN(numericAmount) || numericAmount === 0) {
      return res.status(400).json({
        success: false,
        message: 'Adjustment amount must be a non-zero integer',
        error: 'INVALID_AMOUNT'
      });
    }

    if (!reason || !reason.trim()) {
      return res.status(400).json({
        success: false,
        message: 'A reason must be provided for credit adjustments',
        error: 'REASON_REQUIRED'
      });
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        error: 'USER_NOT_FOUND'
      });
    }

    const newBalance = user.credits + numericAmount;
    if (newBalance < 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot deduct ${Math.abs(numericAmount)} credits. Current balance is only ${user.credits}`,
        error: 'INSUFFICIENT_CREDITS'
      });
    }

    const [updatedUser, transaction] = await prisma.$transaction([
      prisma.user.update({
        where: { id },
        data: { credits: newBalance },
        select: {
          id: true,
          name: true,
          email: true,
          credits: true
        }
      }),
      prisma.creditTransaction.create({
        data: {
          userId: id,
          amount: numericAmount,
          balanceAfter: newBalance,
          type: numericAmount > 0 ? 'ADMIN_GRANT' : 'ADMIN_ADJUSTMENT',
          reason: reason.trim(),
          adminId: req.user.id
        }
      })
    ]);

    await prisma.adminAuditLog.create({
      data: {
        adminId: req.user.id,
        action: 'CREDITS_ADJUSTED',
        targetUserId: id,
        details: JSON.stringify({
          amount: numericAmount,
          previousBalance: user.credits,
          newBalance,
          reason: reason.trim(),
          transactionId: transaction.id
        }),
        ipAddress: req.ip
      }
    });

    res.json({
      success: true,
      message: `Credits successfully ${numericAmount > 0 ? 'granted' : 'deducted'}. New balance: ${newBalance}`,
      data: {
        user: updatedUser,
        transaction
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/admin/plans
 * Configured plan tiers from database
 */
export async function getPlans(req, res, next) {
  try {
    const plans = await getAllPlans();
    res.json({
      success: true,
      data: {
        plans
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/admin/plans/:planType
 * Update package plan details (price, credits, accounts, 1-month free trial option)
 */
export async function updatePlan(req, res, next) {
  try {
    const { planType } = req.params;
    const updates = req.body;
    const updatedPlan = await updatePackagePlan(planType, updates, req.user.id);
    res.json({
      success: true,
      message: `Plan ${planType} updated successfully`,
      data: {
        plan: updatedPlan
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/admin/plans/:planType/stats
 * View affected user counts before applying changes
 */
export async function getPlanImpactStats(req, res, next) {
  try {
    const { planType } = req.params;
    const stats = await getPlanStats(planType);
    res.json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/admin/plans/:planType/promotion
 * Toggle promotional pricing (LKR 0 with strikethrough for new signups)
 */
export async function togglePromotion(req, res, next) {
  try {
    const { planType } = req.params;
    const { isFreePromotion, promotionNote } = req.body;
    const updatedPlan = await toggleFreePromotion(planType, { isFreePromotion, promotionNote }, req.user.id);
    res.json({
      success: true,
      message: isFreePromotion
        ? `Free promotion activated for ${planType}. Price displayed as LKR 0 with strikethrough.`
        : `Free promotion deactivated for ${planType}. Configured price restored.`,
      data: { plan: updatedPlan }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/admin/plans/:planType/migrate-free
 * Explicit global action: migrate all existing users on Creator/Professional to Free
 */
export async function migrateUsersToFree(req, res, next) {
  try {
    const { planType } = req.params;
    const { migrationPolicy, reason, confirmationText } = req.body;

    if (confirmationText !== `CONFIRM-${planType.toUpperCase()}`) {
      return res.status(400).json({
        success: false,
        message: `Explicit confirmation required. Please type CONFIRM-${planType.toUpperCase()}`,
        error: 'CONFIRMATION_REQUIRED'
      });
    }

    const result = await migratePlanUsersToFree(planType, { migrationPolicy, reason }, req.user.id);
    res.json({
      success: true,
      message: `Successfully migrated ${result.migratedCount} user(s) on ${planType} to Free using policy ${result.migrationPolicy}.`,
      data: result
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/admin/subscriptions
 * View all user subscriptions, cards on file, and trial expiration dates
 */
export async function getSubscriptions(req, res, next) {
  try {
    const subscriptions = await prisma.userSubscription.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, name: true, email: true, plan: true, credits: true, status: true }
        }
      }
    });
    res.json({
      success: true,
      data: { subscriptions }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/admin/subscriptions/process-billing
 * Triggers automated billing detection on any expired trials or due renewal periods
 */
export async function triggerBillingCheck(req, res, next) {
  try {
    const results = await processDueSubscriptions(req.user.id);
    res.json({
      success: true,
      message: `Automated card detection and billing check finished. Processed ${results.processedCount} subscription(s).`,
      data: results
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/admin/payments
 * Real verified and pending payments directory
 */
export async function getPayments(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const { status, plan } = req.query;
    const where = {};
    if (status && ['PENDING', 'VERIFIED', 'FAILED'].includes(status.toUpperCase())) {
      where.status = status.toUpperCase();
    }
    if (plan && ['FREE', 'CREATOR', 'PROFESSIONAL'].includes(plan.toUpperCase())) {
      where.plan = plan.toUpperCase();
    }

    const [total, payments] = await Promise.all([
      prisma.payment.count({ where }),
      prisma.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              plan: true
            }
          }
        }
      })
    ]);

    res.json({
      success: true,
      data: {
        payments,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/admin/payments
 * Record a manual or verified payment transaction
 */
export async function recordPayment(req, res, next) {
  try {
    const { userId, amount, currency = 'LKR', plan, reference, notes, verified = false } = req.body;

    if (!userId || !amount || !plan) {
      return res.status(400).json({
        success: false,
        message: 'userId, amount, and plan are required',
        error: 'MISSING_FIELDS'
      });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Target user not found',
        error: 'USER_NOT_FOUND'
      });
    }

    const paymentRef = reference && reference.trim()
      ? reference.trim()
      : `PAY-MANUAL-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    const paymentStatus = verified ? 'VERIFIED' : 'PENDING';

    const payment = await prisma.payment.create({
      data: {
        userId,
        amount: Number(amount),
        currency,
        plan: plan.toUpperCase(),
        status: paymentStatus,
        reference: paymentRef,
        notes: notes || 'Recorded by administrator',
        verifiedAt: verified ? new Date() : null,
        verifiedById: verified ? req.user.id : null
      },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    // If payment is recorded as verified, optionally promote user plan
    if (verified) {
      await prisma.user.update({
        where: { id: userId },
        data: { plan: plan.toUpperCase() }
      });

      await prisma.planHistory.create({
        data: {
          userId,
          plan: plan.toUpperCase(),
          changedById: req.user.id,
          reason: `Verified payment ${paymentRef}`
        }
      });
    }

    await prisma.adminAuditLog.create({
      data: {
        adminId: req.user.id,
        action: 'PAYMENT_RECORDED',
        targetUserId: userId,
        details: JSON.stringify({
          paymentId: payment.id,
          reference: paymentRef,
          amount: Number(amount),
          status: paymentStatus,
          plan
        }),
        ipAddress: req.ip
      }
    });

    res.status(201).json({
      success: true,
      message: 'Payment recorded successfully',
      data: { payment }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/admin/payments/:id/verify
 * Mark a pending payment as verified
 */
export async function verifyPayment(req, res, next) {
  try {
    const { id } = req.params;
    const { upgradeUserPlan = true } = req.body;

    const payment = await prisma.payment.findUnique({
      where: { id },
      include: { user: true }
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment record not found',
        error: 'PAYMENT_NOT_FOUND'
      });
    }

    if (payment.status === 'VERIFIED') {
      return res.status(400).json({
        success: false,
        message: 'Payment is already verified',
        error: 'ALREADY_VERIFIED'
      });
    }

    const updatedPayment = await prisma.payment.update({
      where: { id },
      data: {
        status: 'VERIFIED',
        verifiedAt: new Date(),
        verifiedById: req.user.id
      }
    });

    if (upgradeUserPlan && payment.user) {
      await prisma.user.update({
        where: { id: payment.userId },
        data: { plan: payment.plan }
      });

      await prisma.planHistory.create({
        data: {
          userId: payment.userId,
          plan: payment.plan,
          changedById: req.user.id,
          reason: `Verified payment reference ${payment.reference}`
        }
      });
    }

    await prisma.adminAuditLog.create({
      data: {
        adminId: req.user.id,
        action: 'PAYMENT_VERIFIED',
        targetUserId: payment.userId,
        details: JSON.stringify({
          paymentId: id,
          reference: payment.reference,
          amount: payment.amount,
          plan: payment.plan
        }),
        ipAddress: req.ip
      }
    });

    res.json({
      success: true,
      message: 'Payment verified successfully',
      data: { payment: updatedPayment }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/admin/transactions
 * Global credit transaction audit trail
 */
export async function getTransactions(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 25));
    const skip = (page - 1) * limit;

    const [total, transactions] = await Promise.all([
      prisma.creditTransaction.count(),
      prisma.creditTransaction.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              plan: true
            }
          }
        }
      })
    ]);

    res.json({
      success: true,
      data: {
        transactions,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/admin/audit-logs
 * Security audit events log
 */
export async function getAuditLogs(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 30));
    const skip = (page - 1) * limit;

    const [total, logs] = await Promise.all([
      prisma.adminAuditLog.count(),
      prisma.adminAuditLog.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          admin: {
            select: { id: true, name: true, email: true }
          },
          targetUser: {
            select: { id: true, name: true, email: true }
          }
        }
      })
    ]);

    res.json({
      success: true,
      data: {
        logs,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/admin/users/:id/initiate-password-reset
 * Initiates a secure password-reset OTP email to the user.
 * Admin never sees the plaintext password or OTP code, maintaining strict confidentiality.
 */
export async function initiateUserPasswordReset(req, res, next) {
  try {
    const { id } = req.params;
    const { reason } = req.body || {};

    const targetUser = await prisma.user.findUnique({
      where: { id }
    });

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        error: 'USER_NOT_FOUND'
      });
    }

    if (targetUser.status === 'SUSPENDED') {
      return res.status(400).json({
        success: false,
        message: 'Cannot initiate password reset for a suspended user. Please reactivate the account first.',
        error: 'USER_SUSPENDED'
      });
    }

    // Invalidate previous unexpired unused OTPs
    await prisma.passwordResetOtp.updateMany({
      where: {
        userId: targetUser.id,
        used: false
      },
      data: {
        used: true
      }
    });

    // Generate random 6-digit OTP and hash it
    const otp = String(crypto.randomInt(100000, 1000000));
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    const resendAvailableAt = new Date(Date.now() + 60 * 1000); // 60 seconds cooldown

    await prisma.passwordResetOtp.create({
      data: {
        userId: targetUser.id,
        email: targetUser.email,
        otpHash,
        expiresAt,
        resendAvailableAt,
        attempts: 0,
        used: false
      }
    });

    // Dispatch email to user's registered email
    await sendPasswordResetOtpEmail({
      email: targetUser.email,
      name: targetUser.name,
      otp,
      expiresMinutes: 5
    });

    // Audit log
    await prisma.adminAuditLog.create({
      data: {
        adminId: req.user.id,
        action: 'PASSWORD_RESET_INITIATED',
        targetUserId: targetUser.id,
        details: JSON.stringify({
          targetEmail: targetUser.email,
          reason: reason || 'Administrator initiated secure password reset'
        }),
        ipAddress: req.ip
      }
    });

    return res.json({
      success: true,
      message: `A secure 6-digit password reset verification code has been dispatched to ${targetUser.email}.`
    });
  } catch (error) {
    next(error);
  }
}

