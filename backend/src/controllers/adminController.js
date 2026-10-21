import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../utils/prisma.js';
import {
  getAllPlans,
  updatePackagePlan,
  getPlanStats,
  toggleFreePromotion,
  migratePlanUsersToFree,
  getPlanPromotions,
  updatePlanPromotion
} from '../services/planService.js';
import { processDueSubscriptions } from '../services/subscriptionService.js';
import { sendPasswordResetOtpEmail, sendAdminInvitationEmail } from '../services/emailService.js';
import { getDefaultPermissions } from './authController.js';
import { platformRateService } from '../services/platformRateService.js';
import { entitlementService } from '../services/entitlementService.js';
import { processVerifiedGatewayPayment } from '../services/paymentGatewayService.js';
import { getReportingPeriodDateRange, getSriLankaReportingBoundaries } from '../utils/timezone.js';

/**
 * Proposed plans master configuration
 */
export const PLANS_CONFIG = [
  {
    id: 'FREE',
    name: 'Free',
    priceLkr: 0,
    credits: 200,
    maxAccounts: 2,
    scheduling: false,
    aiCaptions: false,
    description: 'Essential multi-platform publishing for individuals.'
  },
  {
    id: 'CREATOR',
    name: 'Creator',
    priceLkr: 1000,
    credits: 500,
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
 * Aggregated statistics from real database records with SLST reporting period filters
 */
export async function getDashboardStats(req, res, next) {
  try {
    const { period = 'all' } = req.query;
    const { startDate, endDate } = getReportingPeriodDateRange(period);
    const { now, startOfMonth, startOfYear } = getSriLankaReportingBoundaries();

    // Period filter for payments, new registrations, and deletions
    const periodPaymentFilter = startDate ? { createdAt: { gte: startDate, lte: endDate } } : {};
    const periodUserFilter = startDate ? { createdAt: { gte: startDate, lte: endDate } } : {};
    const periodDeletionFilter = startDate ? { deletedAt: { gte: startDate, lte: endDate } } : {};

    const [
      totalUsers,
      periodNewUsers,
      freeCount,
      creatorCount,
      proCount,
      activeCount,
      suspendedCount,
      // Active subscriptions count
      activeSubscriptionsCount,
      // Distinct paid subscribers: active paid subscription or user on CREATOR/PROFESSIONAL with verified payment
      distinctPaidUsers,
      // Verified payments in reporting period
      verifiedPaymentsPeriod,
      // Verified payments all time
      verifiedPaymentsAllTime,
      // Pending payments count
      pendingPaymentsCount,
      // Failed and cancelled payments count
      failedPaymentsCount,
      // Total circulating credits
      totalCreditsData,
      // Recent users
      recentUsers,
      // Recent payments
      recentPayments,
      // Recent audit logs
      recentLogs,
      // Permanently deleted accounts (all time)
      totalDeletedAccounts,
      // Permanently deleted accounts in selected period
      deletionsInPeriod,
      // Permanently deleted accounts this month (SLST)
      deletionsThisMonth,
      // Permanently deleted accounts this year (SLST)
      deletionsThisYear,
      // Total accounts all roles
      totalAccountsAll
    ] = await Promise.all([
      // 1. Total registered regular users (all time)
      prisma.user.count({ where: { role: 'USER' } }),
      // 2. New registered regular users in selected period
      prisma.user.count({ where: { role: 'USER', ...periodUserFilter } }),
      // 3. Plan distribution (regular users)
      prisma.user.count({ where: { role: 'USER', plan: 'FREE' } }),
      prisma.user.count({ where: { role: 'USER', plan: 'CREATOR' } }),
      prisma.user.count({ where: { role: 'USER', plan: 'PROFESSIONAL' } }),
      // 4. User account statuses (regular users)
      prisma.user.count({ where: { role: 'USER', status: 'ACTIVE' } }),
      prisma.user.count({ where: { role: 'USER', status: 'SUSPENDED' } }),
      // 5. Active subscriptions count (regular users)
      prisma.userSubscription.count({ where: { status: 'ACTIVE', user: { role: 'USER' } } }),
      // 6. Distinct paid subscribers with valid, verified paid subscriptions (regular users)
      prisma.user.count({
        where: {
          role: 'USER',
          plan: { in: ['CREATOR', 'PROFESSIONAL'] },
          OR: [
            { subscription: { status: 'ACTIVE', isFreeTrial: false } },
            { payments: { some: { status: 'VERIFIED' } } }
          ]
        }
      }),
      // 7. Verified payments in selected period
      prisma.payment.aggregate({
        where: { status: 'VERIFIED', ...periodPaymentFilter },
        _count: true,
        _sum: { amount: true }
      }),
      // 8. Verified payments all time
      prisma.payment.aggregate({
        where: { status: 'VERIFIED' },
        _count: true,
        _sum: { amount: true }
      }),
      // 9. Pending payments
      prisma.payment.count({
        where: { status: 'PENDING', ...periodPaymentFilter }
      }),
      // 10. Failed and cancelled payments
      prisma.payment.count({
        where: { status: { in: ['FAILED', 'CANCELLED'] }, ...periodPaymentFilter }
      }),
      // 11. Total circulating credits (regular users)
      prisma.user.aggregate({ where: { role: 'USER' }, _sum: { credits: true } }),
      // 12. Recent regular users
      prisma.user.findMany({
        where: { role: 'USER' },
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
            select: { socialAccounts: true, posts: true }
          }
        }
      }),
      // 13. Recent payments with subscription status
      prisma.payment.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              subscription: {
                select: { status: true, plan: true, autoRenew: true }
              }
            }
          }
        }
      }),
      // 14. Recent audit logs
      prisma.adminAuditLog.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
        include: {
          admin: { select: { id: true, name: true, email: true } },
          targetUser: { select: { id: true, name: true, email: true } }
        }
      }),
      // 15. Permanently deleted accounts (all time)
      prisma.accountDeletionEvent.count(),
      // 16. Permanently deleted accounts in selected period
      prisma.accountDeletionEvent.count({ where: periodDeletionFilter }),
      // 17. Permanently deleted accounts this month (SLST)
      prisma.accountDeletionEvent.count({ where: { deletedAt: { gte: startOfMonth } } }),
      // 18. Permanently deleted accounts this year (SLST)
      prisma.accountDeletionEvent.count({ where: { deletedAt: { gte: startOfYear } } }),
      // 19. Total registered accounts (all roles)
      prisma.user.count()
    ]);

    // Compute effective total users (returns 0 on fresh clean reset, or total accounts when users are active)
    const effectiveTotalUsers = totalUsers === 0 ? 0 : totalAccountsAll;

    // Compute new paid subscribers during selected period:
    // Distinct users whose first verified payment occurred in this period
    let newPaidSubscribers = 0;
    if (startDate) {
      const usersWithVerifiedInPeriod = await prisma.payment.findMany({
        where: { status: 'VERIFIED', ...periodPaymentFilter },
        select: { userId: true },
        distinct: ['userId']
      });

      for (const p of usersWithVerifiedInPeriod) {
        const priorVerified = await prisma.payment.findFirst({
          where: {
            userId: p.userId,
            status: 'VERIFIED',
            createdAt: { lt: startDate }
          }
        });
        if (!priorVerified) {
          newPaidSubscribers++;
        }
      }
    } else {
      newPaidSubscribers = distinctPaidUsers;
    }

    // Explicitly defined user churn rate: Permanently Deleted Accounts / (Total Current Registered Users + Permanently Deleted Accounts)
    const totalEverRegistered = totalUsers + totalDeletedAccounts;
    const churnRatePercentage = totalEverRegistered > 0
      ? Math.round((totalDeletedAccounts / totalEverRegistered) * 1000) / 10
      : 0;

    res.json({
      success: true,
      data: {
        summary: {
          period: String(period || 'all').toLowerCase(),
          periodStartDate: startDate ? startDate.toISOString() : null,
          periodEndDate: endDate ? endDate.toISOString() : null,
          totalUsers: effectiveTotalUsers,
          totalRegularUsers: totalUsers,
          totalAccounts: totalAccountsAll,
          newUsersInPeriod: periodNewUsers,
          activeUsers: activeCount,
          suspendedUsers: suspendedCount,
          distinctPaidSubscribers: distinctPaidUsers,
          freeUsersCount: freeCount,
          activeSubscriptions: activeSubscriptionsCount,
          newPaidSubscribers,
          // Permanently Deleted Accounts & User Churn Analytics
          deletions: {
            totalDeletedAccounts,
            deletionsInPeriod,
            deletionsThisMonth,
            deletionsThisYear,
            churnRatePercentage,
            formula: 'Permanently Deleted Accounts / (Total Current Registered Users + Permanently Deleted Accounts)'
          },
          totalDeletedAccounts,
          deletionsInPeriod,
          deletionsThisMonth,
          deletionsThisYear,
          churnRatePercentage,
          planDistribution: {
            FREE: freeCount,
            CREATOR: creatorCount,
            PROFESSIONAL: proCount
          },
          payments: {
            verifiedCount: verifiedPaymentsPeriod._count || 0,
            verifiedTotalLkr: verifiedPaymentsPeriod._sum.amount || 0,
            allTimeVerifiedCount: verifiedPaymentsAllTime._count || 0,
            allTimeVerifiedTotalLkr: verifiedPaymentsAllTime._sum.amount || 0,
            pendingCount: pendingPaymentsCount,
            failedAndCancelledCount: failedPaymentsCount
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

    if (role && role.toUpperCase() !== 'ALL') {
      if (['USER', 'ADMIN', 'SUPER_ADMIN', 'SUPPORT_ADMIN'].includes(role.toUpperCase())) {
        where.role = role.toUpperCase();
      }
    } else if (!role) {
      // By default in customer directory, list regular USER accounts
      where.role = 'USER';
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
        subscription: true,
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

    // Retrieve recent posts metadata without private content (Strict Phase 9.2 Privacy Compliance)
    const recentPosts = await prisma.post.findMany({
      where: { userId: id },
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
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

    if (!/[^a-zA-Z0-9]/.test(password)) {
      return res.status(400).json({
        success: false,
        message: 'Password must contain at least one symbol (e.g. !@#$%^&*)',
        error: 'PASSWORD_SYMBOL_REQUIRED'
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
        previousPlan: null,
        creditsBefore: 0,
        creditsAfter: targetCredits,
        source: 'ADMIN_ACTION',
        changedById: req.user.id,
        status: 'SUCCESS',
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

    // 1. Fetch package plan details to determine credit allowance and pricing
    const packagePlan = await prisma.packagePlan.findUnique({
      where: { planType: targetPlan }
    });

    const targetCredits = packagePlan
      ? packagePlan.credits
      : (targetPlan === 'CREATOR' ? 500 : targetPlan === 'PROFESSIONAL' ? 1500 : 200);

    const targetPrice = packagePlan
      ? packagePlan.priceLkr
      : (targetPlan === 'CREATOR' ? 1000 : targetPlan === 'PROFESSIONAL' ? 2500 : 0);

    const now = new Date();
    const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // 2. Perform plan update, credit balance adjustment, and history logging in atomic transaction
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          email: true,
          plan: true,
          credits: true,
          status: true
        }
      });

      if (!user) {
        const error = new Error('User not found');
        error.statusCode = 404;
        error.code = 'USER_NOT_FOUND';
        throw error;
      }

      const previousPlan = user.plan;
      const previousCredits = user.credits ?? 0;
      const newAllowance = targetCredits;
      const netAdjustment = newAllowance - previousCredits;
      const isUpgrade = targetPlan === 'PROFESSIONAL' || (targetPlan === 'CREATOR' && previousPlan === 'FREE');

      // Update user plan and reset/align credits to the new plan's configured allowance
      const updatedUser = await tx.user.update({
        where: { id },
        data: {
          plan: targetPlan,
          credits: newAllowance
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          plan: true,
          credits: true,
          status: true,
          updatedAt: true
        }
      });

      // Record auditable credit transaction
      await tx.creditTransaction.create({
        data: {
          userId: id,
          amount: netAdjustment,
          balanceAfter: newAllowance,
          type: 'ADMIN_ADJUSTMENT',
          reason: `Administrator plan adjustment (${previousPlan} → ${targetPlan}): Credit allowance set to ${newAllowance} (previous balance: ${previousCredits})`,
          adminId: req.user.id
        }
      });

      // Close previous active plan history entry
      await tx.planHistory.updateMany({
        where: { userId: id, endedAt: null },
        data: { endedAt: now }
      });

      // Create detailed plan history record
      const historyRecord = await tx.planHistory.create({
        data: {
          userId: id,
          plan: targetPlan,
          previousPlan,
          creditsBefore: previousCredits,
          creditsAfter: newAllowance,
          source: 'ADMIN_ACTION',
          changedById: req.user.id,
          status: 'SUCCESS',
          reason: reason || `Plan changed from ${previousPlan} to ${targetPlan} by administrator`
        }
      });

      // Synchronize UserSubscription record
      if (targetPlan === 'FREE') {
        await tx.userSubscription.updateMany({
          where: { userId: id },
          data: {
            plan: 'FREE',
            status: 'FREE',
            autoRenew: false,
            cancelAtPeriodEnd: false
          }
        });
      } else {
        await tx.userSubscription.upsert({
          where: { userId: id },
          create: {
            userId: id,
            plan: targetPlan,
            status: 'ACTIVE',
            isFreeTrial: false,
            currentPeriodStart: now,
            currentPeriodEnd: nextMonth,
            nextBillingDate: nextMonth,
            billingAmount: targetPrice,
            currency: 'LKR',
            gateway: 'MANUAL',
            gatewaySubscriptionId: `admin_sub_${Date.now()}`,
            autoRenew: false
          },
          update: {
            plan: targetPlan,
            status: 'ACTIVE',
            isFreeTrial: false,
            billingAmount: targetPrice,
            cancelAtPeriodEnd: false
          }
        });
      }

      // Record SubscriptionEvent
      await tx.subscriptionEvent.create({
        data: {
          userId: id,
          fromPlan: previousPlan,
          toPlan: targetPlan,
          eventType: previousPlan === targetPlan ? 'RENEW' : (isUpgrade ? 'UPGRADE' : 'DOWNGRADE'),
          effectiveAt: now,
          createdById: req.user.id,
          details: JSON.stringify({
            source: 'ADMIN_ACTION',
            adminId: req.user.id,
            adminEmail: req.user.email,
            creditsBefore: previousCredits,
            creditsAfter: newAllowance,
            reason: reason || 'Administrator plan adjustment'
          })
        }
      });

      // Log admin audit trail
      await tx.adminAuditLog.create({
        data: {
          adminId: req.user.id,
          action: 'USER_PLAN_CHANGED',
          targetUserId: id,
          details: JSON.stringify({
            from: previousPlan,
            to: targetPlan,
            creditsBefore: previousCredits,
            creditsAfter: newAllowance,
            reason: reason || 'Administrator action'
          }),
          ipAddress: req.ip
        }
      });

      return { updatedUser, historyRecord };
    });

    res.json({
      success: true,
      message: `User plan updated to ${targetPlan} and credit allowance set to ${targetCredits}`,
      data: {
        user: result.updatedUser,
        planHistory: result.historyRecord
      }
    });
  } catch (error) {
    if (error.code === 'USER_NOT_FOUND' || error.message === 'User not found') {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        error: 'USER_NOT_FOUND'
      });
    }
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
    if (req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Super Administrator authorization required. Access denied.',
        error: 'FORBIDDEN_NOT_SUPER_ADMIN'
      });
    }
    const { planType } = req.params;
    const { isFreePromotion, promotionNote, enabled } = req.body;
    const targetState = isFreePromotion !== undefined ? Boolean(isFreePromotion) : (enabled !== undefined ? Boolean(enabled) : false);
    const updatedPlan = await toggleFreePromotion(planType, { isFreePromotion: targetState, promotionNote }, req.user.id);
    res.json({
      success: true,
      message: targetState
        ? `Free promotion activated for ${planType}. Price displayed as LKR 0 for the first month.`
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
 * Real verified and pending payments directory with search, filter, sort, and pagination
 */
export async function getPayments(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const { status, plan, search, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    const where = {};

    if (status && ['PENDING', 'VERIFIED', 'FAILED', 'CANCELLED', 'REFUNDED'].includes(status.toUpperCase())) {
      where.status = status.toUpperCase();
    }
    if (plan && ['FREE', 'CREATOR', 'PROFESSIONAL'].includes(plan.toUpperCase())) {
      where.plan = plan.toUpperCase();
    }

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { reference: { contains: q, mode: 'insensitive' } },
        { gatewayTransactionId: { contains: q, mode: 'insensitive' } },
        { user: { name: { contains: q, mode: 'insensitive' } } },
        { user: { email: { contains: q, mode: 'insensitive' } } }
      ];
    }

    const validSortFields = ['createdAt', 'amount', 'verifiedAt', 'status'];
    const orderByField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const orderByDirection = String(sortOrder).toLowerCase() === 'asc' ? 'asc' : 'desc';

    const [total, payments] = await Promise.all([
      prisma.payment.count({ where }),
      prisma.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [orderByField]: orderByDirection },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              plan: true,
              status: true,
              subscription: {
                select: {
                  id: true,
                  status: true,
                  plan: true,
                  autoRenew: true,
                  currentPeriodEnd: true,
                  nextBillingDate: true
                }
              }
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
 * GET /api/admin/payments/:id
 * Retrieve comprehensive details of a specific payment
 */
export async function getPaymentDetails(req, res, next) {
  try {
    const { id } = req.params;
    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            plan: true,
            credits: true,
            status: true,
            createdAt: true,
            subscription: true
          }
        }
      }
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment record not found',
        error: 'PAYMENT_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      data: { payment }
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

    let updatedPayment;
    if (upgradeUserPlan && payment.reference) {
      try {
        const procResult = await processVerifiedGatewayPayment({
          orderId: payment.reference,
          gatewayTransactionId: payment.gatewayTransactionId || `admin_verify_${Date.now()}`,
          amount: payment.amount,
          currency: payment.currency,
          gateway: payment.gateway || 'MANUAL'
        });
        updatedPayment = await prisma.payment.update({
          where: { id },
          data: { verifiedById: req.user.id }
        });
      } catch (procErr) {
        console.warn('[ADMIN_VERIFY] Fallback verification:', procErr.message);
        updatedPayment = await prisma.payment.update({
          where: { id },
          data: {
            status: 'VERIFIED',
            verifiedAt: new Date(),
            verifiedById: req.user.id
          }
        });
        if (payment.user) {
          await prisma.user.update({
            where: { id: payment.userId },
            data: { plan: payment.plan }
          });
        }
      }
    } else {
      updatedPayment = await prisma.payment.update({
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
      }
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
 * Security audit events log with category/action filters, search, and stats
 */
export async function getAuditLogs(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 30));
    const skip = (page - 1) * limit;
    const { action, category, search } = req.query;

    const where = {};

    // 1. Action / Category filtering
    if (action && action !== 'ALL') {
      where.action = action;
    } else if (category && category !== 'ALL') {
      if (category === 'USERS') {
        where.action = { in: ['USER_CREATED', 'USER_DELETED', 'STATUS_CHANGED', 'PASSWORD_RESET_INITIATED'] };
      } else if (category === 'PLANS_CREDITS') {
        where.action = { in: ['PLAN_CHANGED', 'CREDITS_ADJUSTED', 'PACKAGE_UPDATED', 'PROMOTION_TOGGLED', 'PROMOTION_OFFER_CONFIGURED', 'PROMOTION_OFFER_DELETED'] };
      } else if (category === 'ADMINS_SECURITY') {
        where.action = { in: ['ADMIN_ROLE_UPDATED', 'ADMIN_PERMISSIONS_UPDATED', 'ADMIN_SUSPENDED', 'ADMIN_REACTIVATED', 'ADMIN_DELETED', 'ADMIN_INVITATION_SENT', 'ADMIN_INVITATION_CANCELLED', 'SUPER_ADMIN_MIGRATED', 'ADMIN_LOGIN'] };
      } else if (category === 'PLATFORM') {
        where.action = { in: ['UPDATE_PLATFORM_RATE', 'PLATFORM_RATE_UPDATED'] };
      }
    }

    // 2. Search query (matches action, details, admin name/email, targetUser email/name)
    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { action: { contains: q, mode: 'insensitive' } },
        { details: { contains: q, mode: 'insensitive' } },
        { ipAddress: { contains: q, mode: 'insensitive' } },
        { admin: { name: { contains: q, mode: 'insensitive' } } },
        { admin: { email: { contains: q, mode: 'insensitive' } } },
        { targetUser: { name: { contains: q, mode: 'insensitive' } } },
        { targetUser: { email: { contains: q, mode: 'insensitive' } } }
      ];
    }

    const [total, logs, stats] = await Promise.all([
      prisma.adminAuditLog.count({ where }),
      prisma.adminAuditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          admin: {
            select: { id: true, name: true, email: true, role: true }
          },
          targetUser: {
            select: { id: true, name: true, email: true }
          }
        }
      }),
      Promise.all([
        prisma.adminAuditLog.count(),
        prisma.adminAuditLog.count({ where: { action: 'USER_CREATED' } }),
        prisma.adminAuditLog.count({ where: { action: 'USER_DELETED' } }),
        prisma.adminAuditLog.count({ where: { action: { in: ['PLAN_CHANGED', 'CREDITS_ADJUSTED', 'PACKAGE_UPDATED'] } } })
      ])
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
        },
        stats: {
          totalAll: stats[0],
          usersCreated: stats[1],
          usersDeleted: stats[2],
          plansAndCredits: stats[3]
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

/**
 * DELETE /api/admin/users/:id
 * Permanently delete a user account and purge all associated records
 */
export async function deleteUser(req, res, next) {
  try {
    const { id } = req.params;

    // Prevent self-deletion
    if (req.user.id === id) {
      return res.status(400).json({
        success: false,
        message: 'Administrators cannot delete their own active account',
        error: 'SELF_DELETION_PROHIBITED'
      });
    }

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        posts: {
          select: { id: true }
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

    const postIds = user.posts.map(p => p.id);

    await prisma.$transaction(async (tx) => {
      // 1. Delete publishing jobs and post platforms for user's posts
      if (postIds.length > 0) {
        await tx.publishingJob.deleteMany({
          where: { postId: { in: postIds } }
        });
        await tx.postPlatform.deleteMany({
          where: { postId: { in: postIds } }
        });
        await tx.post.deleteMany({
          where: { id: { in: postIds } }
        });
      }

      // 2. Delete social accounts
      await tx.socialAccount.deleteMany({
        where: { userId: id }
      });

      // 3. Delete password reset tokens & OTPs
      await tx.passwordResetOtp.deleteMany({
        where: { userId: id }
      });
      await tx.passwordResetToken.deleteMany({
        where: { userId: id }
      });

      // 4. Delete subscriptions & subscription events
      await tx.subscriptionEvent.deleteMany({
        where: { userId: id }
      });
      await tx.userSubscription.deleteMany({
        where: { userId: id }
      });

      // 5. Delete plan history & credit transactions
      await tx.planHistory.deleteMany({
        where: { userId: id }
      });
      await tx.creditTransaction.deleteMany({
        where: { userId: id }
      });

      // 6. Preserve financial payments for legal/tax accounting compliance (set userId = null)
      await tx.payment.updateMany({
        where: { userId: id },
        data: { userId: null }
      });

      // 7. Delete audit logs where this user is target
      await tx.adminAuditLog.deleteMany({
        where: { targetUserId: id }
      });

      // 8. Clear createdById on any users provisioned by this user
      await tx.user.updateMany({
        where: { createdById: id },
        data: { createdById: null }
      });

      // 9. If user performed any audit logs, delete or reassign
      await tx.adminAuditLog.deleteMany({
        where: { adminId: id }
      });

      // 10. Record persistent, privacy-preserving deletion event (idempotent upsert via userIdHash)
      const userIdHash = crypto.createHash('sha256').update(id).digest('hex');
      await tx.accountDeletionEvent.upsert({
        where: { userIdHash },
        update: {},
        create: {
          userIdHash,
          deletedAt: new Date(),
          registrationAt: user.createdAt,
          reason: req.body?.reason || 'ADMIN_DELETED'
        }
      });

      // 11. Finally delete the user
      await tx.user.delete({
        where: { id }
      });

      // 11. Record administrative audit log
      await tx.adminAuditLog.create({
        data: {
          adminId: req.user.id,
          action: 'USER_DELETED',
          details: JSON.stringify({
            deletedUserId: id,
            deletedUserEmail: user.email,
            deletedUserName: user.name,
            reason: req.body?.reason || 'Administrator permanent account deletion'
          }),
          ipAddress: req.ip
        }
      });
    });

    return res.json({
      success: true,
      message: `User account ${user.email} has been permanently deleted from the system.`
    });
  } catch (error) {
    next(error);
  }
}

// ============================================================
// ADMINISTRATOR MANAGEMENT & RBAC
// ============================================================

/**
 * GET /api/admin/administrators
 * List all genuine administrators from PostgreSQL and pending invitations
 */
export async function getAdministrators(req, res, next) {
  try {
    const [admins, pendingInvitations] = await Promise.all([
      prisma.user.findMany({
        where: {
          role: { in: ['SUPER_ADMIN', 'ADMIN', 'SUPPORT_ADMIN'] }
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          permissions: true,
          createdAt: true,
          lastLoginAt: true,
          createdById: true,
          createdByAdmin: {
            select: { id: true, name: true, email: true }
          }
        },
        orderBy: [
          { role: 'asc' },
          { createdAt: 'desc' }
        ]
      }),
      prisma.adminInvitation.findMany({
        where: {
          status: 'PENDING',
          expiresAt: { gt: new Date() }
        },
        include: {
          invitedBy: {
            select: { id: true, name: true, email: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    const formattedAdmins = admins.map(admin => {
      let parsedPermissions = [];
      try {
        parsedPermissions = admin.permissions ? JSON.parse(admin.permissions) : [];
      } catch {
        parsedPermissions = [];
      }
      return {
        ...admin,
        permissions: parsedPermissions
      };
    });

    return res.json({
      success: true,
      data: {
        administrators: formattedAdmins,
        pendingInvitations: pendingInvitations.map(inv => ({
          id: inv.id,
          email: inv.email,
          role: inv.role,
          status: inv.status,
          expiresAt: inv.expiresAt,
          createdAt: inv.createdAt,
          invitedBy: inv.invitedBy
        })),
        totalAdmins: formattedAdmins.length,
        totalPendingInvitations: pendingInvitations.length
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/admin/administrators
 * Direct Administrator Account Creation (Super Admin sets name, email, password, role & permissions directly)
 * No email link needed.
 */
export async function createAdministrator(req, res, next) {
  try {
    const { name, email, password, role = 'ADMIN', permissions = null } = req.body;

    if (!name || name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Full name is required (minimum 2 characters).',
        error: 'NAME_TOO_SHORT'
      });
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({
        success: false,
        message: 'A valid email address is required.',
        error: 'INVALID_EMAIL'
      });
    }

    if (!password || password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long.',
        error: 'PASSWORD_TOO_SHORT'
      });
    }

    if (!/[^a-zA-Z0-9]/.test(password)) {
      return res.status(400).json({
        success: false,
        message: 'Password must contain at least one symbol (e.g. !@#$%^&*).',
        error: 'PASSWORD_SYMBOL_REQUIRED'
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const validRoles = ['SUPER_ADMIN', 'ADMIN', 'SUPPORT_ADMIN'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Role must be one of: ${validRoles.join(', ')}`,
        error: 'INVALID_ROLE'
      });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: cleanEmail }
    });

    if (existingUser && validRoles.includes(existingUser.role)) {
      return res.status(400).json({
        success: false,
        message: `User ${cleanEmail} is already registered as an administrator (${existingUser.role}). You can update their role or reset their password below.`,
        error: 'USER_ALREADY_ADMIN'
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const resolvedPermissions = permissions
      ? (Array.isArray(permissions) ? JSON.stringify(permissions) : permissions)
      : getDefaultPermissions(role);

    let createdOrUpdatedUser = null;

    if (existingUser) {
      // Existing user elevated to admin with the password directly set by Super Admin
      await prisma.$transaction(async (tx) => {
        createdOrUpdatedUser = await tx.user.update({
          where: { id: existingUser.id },
          data: {
            name: name.trim(),
            passwordHash,
            role,
            permissions: resolvedPermissions,
            status: 'ACTIVE',
            tokenVersion: { increment: 1 }
          }
        });

        await tx.adminAuditLog.create({
          data: {
            adminId: req.user.id,
            action: 'ADMIN_PROVISIONED_DIRECTLY',
            targetUserId: createdOrUpdatedUser.id,
            details: JSON.stringify({
              email: cleanEmail,
              name: name.trim(),
              role,
              mode: 'EXISTING_USER_ELEVATED'
            }),
            ipAddress: req.ip
          }
        });
      });
    } else {
      // Brand new user created as admin
      await prisma.$transaction(async (tx) => {
        createdOrUpdatedUser = await tx.user.create({
          data: {
            name: name.trim(),
            email: cleanEmail,
            passwordHash,
            role,
            permissions: resolvedPermissions,
            status: 'ACTIVE',
            plan: 'PROFESSIONAL',
            credits: 1000,
            isEmailVerified: true,
            emailVerifiedAt: new Date(),
            registrationSource: 'SUPER_ADMIN_DIRECT_CREATE',
            createdById: req.user.id,
            tokenVersion: 0
          }
        });

        await tx.planHistory.create({
          data: {
            userId: createdOrUpdatedUser.id,
            plan: 'PROFESSIONAL',
            reason: `Direct administrator creation by Super Admin (${role})`
          }
        });

        await tx.creditTransaction.create({
          data: {
            userId: createdOrUpdatedUser.id,
            amount: 1000,
            balanceAfter: 1000,
            type: 'INITIAL_GRANT',
            reason: 'Administrative initial credit allocation'
          }
        });

        await tx.adminAuditLog.create({
          data: {
            adminId: req.user.id,
            action: 'ADMIN_CREATED_DIRECTLY',
            targetUserId: createdOrUpdatedUser.id,
            details: JSON.stringify({
              email: cleanEmail,
              name: name.trim(),
              role,
              mode: 'NEW_ADMIN_PROVISIONED'
            }),
            ipAddress: req.ip
          }
        });
      });
    }

    return res.status(201).json({
      success: true,
      message: `Administrator account for ${cleanEmail} created successfully. You can now tell the new administrator their login password.`,
      data: {
        id: createdOrUpdatedUser.id,
        name: createdOrUpdatedUser.name,
        email: createdOrUpdatedUser.email,
        role: createdOrUpdatedUser.role,
        permissions: JSON.parse(createdOrUpdatedUser.permissions || '[]')
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/admin/administrators/:id/password
 * Direct password set / reset by Super Admin for an existing administrator
 */
export async function resetAdminPassword(req, res, next) {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 8 characters long.',
        error: 'PASSWORD_TOO_SHORT'
      });
    }

    if (!/[^a-zA-Z0-9]/.test(newPassword)) {
      return res.status(400).json({
        success: false,
        message: 'New password must contain at least one symbol (e.g. !@#$%^&*).',
        error: 'PASSWORD_SYMBOL_REQUIRED'
      });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id }
    });

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'Administrator not found.',
        error: 'USER_NOT_FOUND'
      });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id },
      data: {
        passwordHash,
        tokenVersion: { increment: 1 } // Invalidate their active sessions
      }
    });

    await prisma.adminAuditLog.create({
      data: {
        adminId: req.user.id,
        action: 'ADMIN_PASSWORD_RESET_DIRECTLY',
        targetUserId: id,
        details: JSON.stringify({
          targetEmail: targetUser.email,
          targetRole: targetUser.role
        }),
        ipAddress: req.ip
      }
    });

    return res.json({
      success: true,
      message: `Password for ${targetUser.email} has been updated. You can now tell the administrator their new password.`
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/admin/administrators/invite
 * Send a secure, single-use, time-limited administrator invitation email
 */
export async function inviteAdministrator(req, res, next) {
  try {
    const { email, role = 'ADMIN', permissions = null } = req.body;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({
        success: false,
        message: 'A valid email address is required.',
        error: 'INVALID_EMAIL'
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const validRoles = ['SUPER_ADMIN', 'ADMIN', 'SUPPORT_ADMIN'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Role must be one of: ${validRoles.join(', ')}`,
        error: 'INVALID_ROLE'
      });
    }

    // Check if target is already an active administrator
    const existingUser = await prisma.user.findUnique({
      where: { email: cleanEmail }
    });

    if (existingUser && validRoles.includes(existingUser.role)) {
      return res.status(400).json({
        success: false,
        message: `User ${cleanEmail} is already registered as an administrator (${existingUser.role}).`,
        error: 'USER_ALREADY_ADMIN'
      });
    }

    // Revoke any previous pending invitations for this email address
    await prisma.adminInvitation.updateMany({
      where: {
        email: cleanEmail,
        status: 'PENDING'
      },
      data: {
        status: 'REVOKED'
      }
    });

    // Generate cryptographically secure random token (32 bytes hex)
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours validity

    const resolvedPermissions = permissions
      ? (Array.isArray(permissions) ? JSON.stringify(permissions) : permissions)
      : getDefaultPermissions(role);

    // Save invitation with tokenHash only (never rawToken in database)
    const invitation = await prisma.adminInvitation.create({
      data: {
        email: cleanEmail,
        role,
        permissions: resolvedPermissions,
        tokenHash,
        status: 'PENDING',
        expiresAt,
        invitedById: req.user.id
      }
    });

    // Build acceptance URL
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const inviteUrl = `${frontendUrl}/admin/accept-invite?token=${rawToken}`;

    // Send invitation email
    const emailResult = await sendAdminInvitationEmail({
      email: cleanEmail,
      inviteUrl,
      role,
      invitedByName: req.user.name,
      expiresHours: 48
    });

    // Record audit log
    await prisma.adminAuditLog.create({
      data: {
        adminId: req.user.id,
        action: 'ADMIN_INVITED',
        details: JSON.stringify({
          invitationId: invitation.id,
          invitedEmail: cleanEmail,
          role,
          expiresAt,
          emailDeliverySuccess: emailResult.success
        }),
        ipAddress: req.ip
      }
    });

    return res.status(201).json({
      success: true,
      message: `Invitation successfully created and sent to ${cleanEmail}. The recipient has 48 hours to activate access.`,
      data: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        expiresAt: invitation.expiresAt,
        emailSent: emailResult.success
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/admin/administrators/resend-invite/:id
 * Reissue a fresh invitation token and resend email
 */
export async function resendAdminInvitation(req, res, next) {
  try {
    const { id } = req.params;

    const existing = await prisma.adminInvitation.findUnique({
      where: { id }
    });

    if (!existing || existing.status !== 'PENDING') {
      return res.status(404).json({
        success: false,
        message: 'No active pending invitation found with this ID.',
        error: 'INVITATION_NOT_FOUND'
      });
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

    const updated = await prisma.adminInvitation.update({
      where: { id },
      data: {
        tokenHash,
        expiresAt
      }
    });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const inviteUrl = `${frontendUrl}/admin/accept-invite?token=${rawToken}`;

    const emailResult = await sendAdminInvitationEmail({
      email: updated.email,
      inviteUrl,
      role: updated.role,
      invitedByName: req.user.name,
      expiresHours: 48
    });

    await prisma.adminAuditLog.create({
      data: {
        adminId: req.user.id,
        action: 'ADMIN_INVITATION_RESENT',
        details: JSON.stringify({
          invitationId: id,
          email: updated.email,
          newExpiresAt: expiresAt
        }),
        ipAddress: req.ip
      }
    });

    return res.json({
      success: true,
      message: `Invitation re-sent successfully to ${updated.email}.`,
      data: {
        id: updated.id,
        email: updated.email,
        expiresAt: updated.expiresAt,
        emailSent: emailResult.success
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/admin/administrators/invite/:id
 * Revoke a pending administrator invitation
 */
export async function revokeAdminInvitation(req, res, next) {
  try {
    const { id } = req.params;

    const existing = await prisma.adminInvitation.findUnique({
      where: { id }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Invitation not found.',
        error: 'INVITATION_NOT_FOUND'
      });
    }

    await prisma.adminInvitation.update({
      where: { id },
      data: { status: 'REVOKED' }
    });

    await prisma.adminAuditLog.create({
      data: {
        adminId: req.user.id,
        action: 'ADMIN_INVITATION_REVOKED',
        details: JSON.stringify({
          invitationId: id,
          email: existing.email,
          role: existing.role
        }),
        ipAddress: req.ip
      }
    });

    return res.json({
      success: true,
      message: `Invitation for ${existing.email} has been revoked.`
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/admin/administrators/:id/role
 * Change administrator role with last-Super-Admin safeguard & session invalidation
 */
export async function updateAdminRole(req, res, next) {
  try {
    const { id } = req.params;
    const { newRole, adminPassword } = req.body;

    const validRoles = ['SUPER_ADMIN', 'ADMIN', 'SUPPORT_ADMIN'];
    if (!validRoles.includes(newRole)) {
      return res.status(400).json({
        success: false,
        message: `Invalid role. Must be one of: ${validRoles.join(', ')}`,
        error: 'INVALID_ROLE'
      });
    }

    // Require password confirmation of the requesting Super Admin
    if (!adminPassword) {
      return res.status(400).json({
        success: false,
        message: 'Your current administrator password is required to change administrator roles.',
        error: 'PASSWORD_REQUIRED'
      });
    }

    const requestingAdmin = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    const isPasswordValid = await bcrypt.compare(adminPassword, requestingAdmin?.passwordHash || '');
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Incorrect administrator password. Role modification denied.',
        error: 'INVALID_CREDENTIALS'
      });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id }
    });

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'Administrator not found.',
        error: 'USER_NOT_FOUND'
      });
    }

    // Safeguard: Prevent demoting the last active Super Admin
    if (targetUser.role === 'SUPER_ADMIN' && newRole !== 'SUPER_ADMIN') {
      const activeSuperAdmins = await prisma.user.count({
        where: {
          role: 'SUPER_ADMIN',
          status: 'ACTIVE'
        }
      });

      if (activeSuperAdmins <= 1) {
        return res.status(400).json({
          success: false,
          message: 'Operation prohibited: Cannot demote the final active Super Administrator. The system must always maintain at least one active Super Admin.',
          error: 'CANNOT_DEMOTE_LAST_SUPER_ADMIN'
        });
      }
    }

    const defaultPermissions = getDefaultPermissions(newRole);

    // Invalidate sessions via tokenVersion increment
    const updated = await prisma.user.update({
      where: { id },
      data: {
        role: newRole,
        permissions: defaultPermissions,
        tokenVersion: { increment: 1 }
      }
    });

    await prisma.adminAuditLog.create({
      data: {
        adminId: req.user.id,
        action: 'ADMIN_ROLE_UPDATED',
        targetUserId: id,
        details: JSON.stringify({
          targetEmail: targetUser.email,
          previousRole: targetUser.role,
          newRole
        }),
        ipAddress: req.ip
      }
    });

    return res.json({
      success: true,
      message: `Role for ${targetUser.email} has been updated to ${newRole}. Their active sessions have been invalidated.`,
      data: {
        id: updated.id,
        email: updated.email,
        role: updated.role,
        permissions: JSON.parse(updated.permissions || '[]')
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/admin/administrators/:id/permissions
 * Update granular permissions for an administrator
 */
export async function updateAdminPermissions(req, res, next) {
  try {
    const { id } = req.params;
    const { permissions } = req.body;

    if (!Array.isArray(permissions)) {
      return res.status(400).json({
        success: false,
        message: 'Permissions must be provided as an array of strings.',
        error: 'INVALID_PERMISSIONS_FORMAT'
      });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id }
    });

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'Administrator not found.',
        error: 'USER_NOT_FOUND'
      });
    }

    // If target is the last Super Admin, ensure wildcard remains
    if (targetUser.role === 'SUPER_ADMIN' && !permissions.includes('*')) {
      const activeSuperAdmins = await prisma.user.count({
        where: { role: 'SUPER_ADMIN', status: 'ACTIVE' }
      });
      if (activeSuperAdmins <= 1) {
        return res.status(400).json({
          success: false,
          message: 'The primary Super Administrator must retain unrestricted access (*).',
          error: 'SUPER_ADMIN_PERMISSIONS_RESTRICTED'
        });
      }
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        permissions: JSON.stringify(permissions),
        tokenVersion: { increment: 1 }
      }
    });

    await prisma.adminAuditLog.create({
      data: {
        adminId: req.user.id,
        action: 'ADMIN_PERMISSIONS_UPDATED',
        targetUserId: id,
        details: JSON.stringify({
          targetEmail: targetUser.email,
          permissions
        }),
        ipAddress: req.ip
      }
    });

    return res.json({
      success: true,
      message: `Permissions updated for ${targetUser.email}.`,
      data: {
        id: updated.id,
        email: updated.email,
        permissions
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/admin/administrators/:id/status
 * Suspend or reactivate an administrator with session invalidation
 */
export async function updateAdminStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;

    if (!['ACTIVE', 'SUSPENDED'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be either ACTIVE or SUSPENDED.',
        error: 'INVALID_STATUS'
      });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id }
    });

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'Administrator not found.',
        error: 'USER_NOT_FOUND'
      });
    }

    // Safeguard: Prevent suspending the last active Super Admin
    if (targetUser.role === 'SUPER_ADMIN' && status === 'SUSPENDED') {
      const activeSuperAdmins = await prisma.user.count({
        where: { role: 'SUPER_ADMIN', status: 'ACTIVE' }
      });
      if (activeSuperAdmins <= 1) {
        return res.status(400).json({
          success: false,
          message: 'Operation prohibited: Cannot suspend the final active Super Administrator.',
          error: 'CANNOT_SUSPEND_LAST_SUPER_ADMIN'
        });
      }
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        status,
        tokenVersion: { increment: 1 } // Invalidate sessions immediately
      }
    });

    await prisma.adminAuditLog.create({
      data: {
        adminId: req.user.id,
        action: status === 'SUSPENDED' ? 'ADMIN_SUSPENDED' : 'ADMIN_REACTIVATED',
        targetUserId: id,
        details: JSON.stringify({
          targetEmail: targetUser.email,
          status,
          reason: reason || 'Administrative status change'
        }),
        ipAddress: req.ip
      }
    });

    return res.json({
      success: true,
      message: `Administrator ${targetUser.email} has been ${status === 'SUSPENDED' ? 'suspended' : 'reactivated'}. Active sessions have been invalidated.`,
      data: {
        id: updated.id,
        status: updated.status
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/admin/administrators/:id/revoke
 * Securely revoke all administrator access and demote back to regular user
 */
export async function revokeAdminAccess(req, res, next) {
  try {
    const { id } = req.params;
    const { adminPassword, reason } = req.body;

    // Require password confirmation
    if (!adminPassword) {
      return res.status(400).json({
        success: false,
        message: 'Your administrator password is required to revoke administrator privileges.',
        error: 'PASSWORD_REQUIRED'
      });
    }

    const requestingAdmin = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    const isPasswordValid = await bcrypt.compare(adminPassword, requestingAdmin?.passwordHash || '');
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Incorrect administrator password. Privilege revocation denied.',
        error: 'INVALID_CREDENTIALS'
      });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id }
    });

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
        error: 'USER_NOT_FOUND'
      });
    }

    // Safeguard: Prevent revoking access from the last Super Admin
    if (targetUser.role === 'SUPER_ADMIN') {
      const activeSuperAdmins = await prisma.user.count({
        where: { role: 'SUPER_ADMIN', status: 'ACTIVE' }
      });
      if (activeSuperAdmins <= 1) {
        return res.status(400).json({
          success: false,
          message: 'Operation prohibited: Cannot revoke access from the final active Super Administrator.',
          error: 'CANNOT_REVOKE_LAST_SUPER_ADMIN'
        });
      }
    }

    // Demote to standard USER and revoke all administrative permissions
    const updated = await prisma.user.update({
      where: { id },
      data: {
        role: 'USER',
        permissions: null,
        tokenVersion: { increment: 1 } // Invalidate all active admin JWT tokens
      }
    });

    await prisma.adminAuditLog.create({
      data: {
        adminId: req.user.id,
        action: 'ADMIN_ACCESS_REVOKED',
        targetUserId: id,
        details: JSON.stringify({
          revokedEmail: targetUser.email,
          previousRole: targetUser.role,
          reason: reason || 'Super Administrator revoked admin access'
        }),
        ipAddress: req.ip
      }
    });

    return res.json({
      success: true,
      message: `Administrative access for ${targetUser.email} has been completely revoked. User demoted to standard account and active sessions terminated.`,
      data: {
        id: updated.id,
        email: updated.email,
        role: updated.role
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/admin/administrators/audit-logs
 * Fetch administrator-specific audit history
 */
export async function getAdminActivityLogs(req, res, next) {
  try {
    const { page = 1, limit = 50, adminId = null } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const where = {};
    if (adminId) {
      where.adminId = adminId;
    }

    const [logs, total] = await Promise.all([
      prisma.adminAuditLog.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          admin: {
            select: { id: true, name: true, email: true, role: true }
          },
          targetUser: {
            select: { id: true, name: true, email: true, role: true }
          }
        }
      }),
      prisma.adminAuditLog.count({ where })
    ]);

    return res.json({
      success: true,
      data: {
        logs,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      }
    });
  } catch (error) {
    next(error);
  }
}

// ============================================================
// PROMOTIONS & PLAN OFFERS MANAGEMENT
// ============================================================

/**
 * GET /api/admin/promotions
 * Get promotions status and configuration for all plans
 */
export async function getPromotions(req, res, next) {
  try {
    const promotions = await getPlanPromotions();
    return res.json({
      success: true,
      data: { promotions }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/admin/promotions/:planType
 * Update promotion settings for a specific paid plan
 */
export async function updatePlanPromotionController(req, res, next) {
  try {
    const { planType } = req.params;
    const updated = await updatePlanPromotion(planType, req.body, req.user.id);

    return res.json({
      success: true,
      message: `Promotional settings for ${planType} updated successfully.`,
      data: { plan: updated }
    });
  } catch (error) {
    next(error);
  }
}

// ============================================================
// PLATFORM CREDIT SETTINGS & RATE GOVERNANCE
// ============================================================

/**
 * GET /api/admin/platform-rates
 * Fetch all platform credit costs (Admin only)
 */
export async function getPlatformRatesController(req, res, next) {
  try {
    const rates = await platformRateService.getAllPlatformRates();
    return res.json({
      success: true,
      data: { rates }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/admin/platform-rates/:platform
 * Update credit rate for a specific platform with audit log
 */
export async function updatePlatformRateController(req, res, next) {
  try {
    const platform = req.params.platform || req.body.platform;
    const cost = req.body.creditCost !== undefined ? req.body.creditCost : req.body.costCredits;
    const reason = req.body.reason;

    if (cost === undefined || cost === null) {
      return res.status(400).json({
        success: false,
        message: 'creditCost or costCredits is required',
        error: 'INVALID_CREDIT_COST'
      });
    }

    const result = await platformRateService.updatePlatformRate({
      platform,
      newCost: cost,
      adminId: req.user.id,
      adminEmail: req.user.email,
      reason
    });

    const configWithCreditCost = {
      ...result.config,
      creditCost: result.config.costCredits
    };

    return res.json({
      success: true,
      message: `Platform rate for ${platform.toUpperCase()} updated to ${result.config.costCredits} credits.`,
      data: {
        ...result,
        config: configWithCreditCost
      }
    });
  } catch (error) {
    console.error('[UPDATE_PLATFORM_RATE_ERROR]', error);
    next(error);
  }
}

/**
 * GET /api/admin/platform-rates/audit-logs
 * Fetch rate change audit logs
 */
export async function getPlatformRateAuditLogsController(req, res, next) {
  try {
    const limit = parseInt(req.query.limit, 10) || 50;
    const offset = parseInt(req.query.offset, 10) || 0;
    const platform = req.query.platform || null;

    const result = await platformRateService.getRateAuditLogs({ limit, offset, platform });
    return res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/admin/platform-rates
 * Bulk update multiple platform rates in one operation
 */
export async function updatePlatformRatesBulkController(req, res, next) {
  try {
    const { rates, reason } = req.body;
    if (!Array.isArray(rates) || rates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'A non-empty rates array is required.',
        error: 'INVALID_INPUT'
      });
    }

    const results = await platformRateService.updatePlatformRatesBulk({
      rates,
      adminId: req.user.id,
      adminEmail: req.user.email,
      reason
    });

    const updatedRates = await platformRateService.getAllPlatformRates();

    return res.json({
      success: true,
      message: `Successfully updated ${results.length} platform credit rate(s).`,
      data: { rates: updatedRates }
    });
  } catch (error) {
    console.error('[UPDATE_PLATFORM_RATES_BULK_ERROR]', error);
    next(error);
  }
}

/**
 * GET /api/admin/features
 * Centralized feature entitlement matrix (Global + Per-Plan)
 */
export async function getFeatureMatrixController(req, res, next) {
  try {
    const matrix = await entitlementService.getFeatureMatrix();
    return res.json({
      success: true,
      data: matrix
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/admin/features/global/:featureKey
 * Toggle a global feature switch
 */
export async function updateGlobalFeatureController(req, res, next) {
  try {
    const { featureKey } = req.params;
    const { isEnabled } = req.body;

    if (typeof isEnabled !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isEnabled must be a boolean (true or false).',
        error: 'INVALID_INPUT'
      });
    }

    const updated = await entitlementService.updateGlobalFeature(
      featureKey,
      isEnabled,
      req.user.id
    );

    const matrix = await entitlementService.getFeatureMatrix();

    return res.json({
      success: true,
      message: `Global switch for '${featureKey}' set to ${isEnabled ? 'ENABLED' : 'DISABLED'}.`,
      data: {
        feature: updated,
        matrix
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/admin/features/plan/:planType/:featureKey
 * Toggle a plan-specific feature entitlement
 */
export async function updatePlanFeatureController(req, res, next) {
  try {
    const { planType, featureKey } = req.params;
    const { isEnabled } = req.body;

    if (typeof isEnabled !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isEnabled must be a boolean (true or false).',
        error: 'INVALID_INPUT'
      });
    }

    const updatedPlan = await entitlementService.updatePlanFeature(
      planType,
      featureKey,
      isEnabled,
      req.user.id
    );

    const matrix = await entitlementService.getFeatureMatrix();

    return res.json({
      success: true,
      message: `Feature '${featureKey}' for plan ${planType.toUpperCase()} set to ${isEnabled ? 'ENABLED' : 'DISABLED'}.`,
      data: {
        plan: updatedPlan,
        matrix
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/admin/operations/publishing
 * Operational publishing diagnostics (Strict Phase 9.2 & Phase 11 metadata-only, ZERO post captions/text/media)
 */
export async function getPublishingOperationsController(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const status = req.query.status || undefined;
    const skip = (page - 1) * limit;

    const where = {};
    if (status && status !== 'ALL') {
      where.status = status;
    }

    const [totalPosts, publishedCount, failedCount, scheduledCount, draftCount, recentPosts, platformBreakdown] = await Promise.all([
      prisma.post.count({ where }),
      prisma.post.count({ where: { status: 'PUBLISHED' } }),
      prisma.post.count({ where: { status: 'FAILED' } }),
      prisma.post.count({ where: { status: 'SCHEDULED' } }),
      prisma.post.count({ where: { status: 'DRAFT' } }),
      prisma.post.findMany({
        where,
        take: limit,
        skip,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          userId: true,
          mediaType: true,
          status: true,
          scheduledAt: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              plan: true
            }
          },
          platforms: {
            select: {
              id: true,
              platform: true,
              status: true,
              creditCost: true,
              creditCharged: true,
              platformPostId: true,
              errorMessage: true,
              publishedAt: true
            }
          }
        }
      }),
      prisma.postPlatform.groupBy({
        by: ['platform', 'status'],
        _count: { id: true }
      })
    ]);

    return res.json({
      success: true,
      data: {
        stats: {
          total: totalPosts,
          published: publishedCount,
          failed: failedCount,
          scheduled: scheduledCount,
          draft: draftCount
        },
        pagination: {
          page,
          limit,
          total: totalPosts,
          totalPages: Math.ceil(totalPosts / limit)
        },
        platformBreakdown,
        posts: recentPosts
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/admin/health/status
 * Phase 13: Live system health metrics, DB latency, scheduler and integration statuses
 */
export async function getSystemHealthController(req, res, next) {
  try {
    const startTime = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const dbLatencyMs = Date.now() - startTime;

    // Background scheduler status
    const duePosts = await prisma.post.count({
      where: {
        status: 'SCHEDULED',
        scheduledAt: { lte: new Date() }
      }
    });

    // Check connected social accounts count
    const connectedAccountsCount = await prisma.socialAccount.count({
      where: { isConnected: true }
    });

    // PayHere configuration check
    const payhereConfigured = Boolean(
      process.env.PAYHERE_MERCHANT_ID &&
      process.env.PAYHERE_MERCHANT_SECRET
    );

    // AI vision/caption API check
    const aiConfigured = Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);

    return res.json({
      success: true,
      data: {
        status: 'HEALTHY',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        database: {
          status: 'CONNECTED',
          latencyMs: dbLatencyMs
        },
        scheduler: {
          status: 'RUNNING',
          pendingDuePosts: duePosts
        },
        integrations: {
          payhereGateway: {
            configured: payhereConfigured,
            mode: process.env.PAYHERE_MODE || 'sandbox'
          },
          geminiAi: {
            configured: aiConfigured
          },
          connectedSocialAccounts: connectedAccountsCount
        }
      }
    });
  } catch (error) {
    return res.status(503).json({
      success: false,
      data: {
        status: 'DEGRADED',
        error: error.message
      }
    });
  }
}

/**
 * GET /api/admin/analytics
 * Platform-wide executive analytics, MRR, channel distribution, and operations
 */
export async function getAdminAnalytics(req, res, next) {
  try {
    const { now, startOfMonth, startOfYear } = getSriLankaReportingBoundaries();

    const [
      totalUsers,
      activeUsers,
      suspendedUsers,
      freeUsers,
      creatorUsers,
      proUsers,
      revenue,
      credits,
      accountsByPlatform,
      totalAccounts,
      posts,
      publishedPosts,
      scheduledPosts,
      failedPosts,
      draftPosts,
      recentPayments,
      recentTransactions,
      totalDeletedAccounts,
      deletionsThisMonth,
      deletionsThisYear
    ] = await Promise.all([
      prisma.user.count({ where: { role: 'USER' } }),
      prisma.user.count({ where: { role: 'USER', status: 'ACTIVE' } }),
      prisma.user.count({ where: { role: 'USER', status: 'SUSPENDED' } }),
      prisma.user.count({ where: { role: 'USER', plan: 'FREE' } }),
      prisma.user.count({ where: { role: 'USER', plan: 'CREATOR' } }),
      prisma.user.count({ where: { role: 'USER', plan: 'PROFESSIONAL' } }),
      prisma.payment.aggregate({ where: { status: 'VERIFIED' }, _sum: { amount: true }, _count: true }),
      prisma.user.aggregate({ where: { role: 'USER' }, _sum: { credits: true } }),
      prisma.socialAccount.groupBy({ by: ['platform'], _count: { platform: true } }),
      prisma.socialAccount.count(),
      prisma.post.count(),
      prisma.post.count({ where: { status: 'PUBLISHED' } }),
      prisma.post.count({ where: { status: 'SCHEDULED' } }),
      prisma.post.count({ where: { status: 'FAILED' } }),
      prisma.post.count({ where: { status: 'DRAFT' } }),
      prisma.payment.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, name: true, email: true, plan: true } } }
      }),
      prisma.creditTransaction.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, name: true, email: true } } }
      }),
      // Permanently deleted accounts (all time)
      prisma.accountDeletionEvent.count(),
      // Permanently deleted accounts this month
      prisma.accountDeletionEvent.count({ where: { deletedAt: { gte: startOfMonth, lte: now } } }),
      // Permanently deleted accounts this year
      prisma.accountDeletionEvent.count({ where: { deletedAt: { gte: startOfYear, lte: now } } })
    ]);

    const channelDistribution = {};
    accountsByPlatform.forEach(item => {
      channelDistribution[item.platform] = item._count.platform;
    });

    const mrr = (creatorUsers * 1000) + (proUsers * 2500);

    const totalEverRegistered = totalUsers + totalDeletedAccounts;
    const churnRatePercentage = totalEverRegistered > 0
      ? Math.round((totalDeletedAccounts / totalEverRegistered) * 1000) / 10
      : 0;

    res.json({
      success: true,
      data: {
        summary: {
          totalUsers,
          activeUsers,
          suspendedUsers,
          totalRevenueLkr: revenue._sum.amount || 0,
          paymentsCount: revenue._count || 0,
          circulatingCredits: credits._sum.credits || 0,
          totalConnectedChannels: totalAccounts,
          estimatedMrrLkr: mrr,
          deletions: {
            totalDeletedAccounts,
            deletionsThisMonth,
            deletionsThisYear,
            churnRatePercentage,
            formula: 'Permanently Deleted Accounts / (Total Current Registered Users + Permanently Deleted Accounts)'
          },
          totalDeletedAccounts,
          deletionsThisMonth,
          deletionsThisYear,
          churnRatePercentage
        },
        planBreakdown: {
          FREE: freeUsers,
          CREATOR: creatorUsers,
          PROFESSIONAL: proUsers
        },
        channelDistribution,
        publishingOperations: {
          total: posts,
          published: publishedPosts,
          scheduled: scheduledPosts,
          failed: failedPosts,
          draft: draftPosts,
          successRate: posts > 0 ? Math.round((publishedPosts / (publishedPosts + failedPosts || 1)) * 100) : 100
        },
        recentPayments,
        recentTransactions
      }
    });
  } catch (error) {
    next(error);
  }
}
