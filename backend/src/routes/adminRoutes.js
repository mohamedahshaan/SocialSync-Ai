import { Router } from 'express';
import { authenticateToken, requireAdmin, requireSuperAdmin, requirePermission } from '../middleware/auth.js';
import {
  getDashboardStats,
  getUsers,
  getUserDetails,
  createUser,
  deleteUser,
  updateUserPlan,
  updateUserStatus,
  adjustUserCredits,
  initiateUserPasswordReset,
  getPlans,
  updatePlan,
  getPlanImpactStats,
  togglePromotion,
  migrateUsersToFree,
  getSubscriptions,
  triggerBillingCheck,
  getPayments,
  getPaymentDetails,
  recordPayment,
  verifyPayment,
  getTransactions,
  getAuditLogs,
  getAdministrators,
  createAdministrator,
  resetAdminPassword,
  inviteAdministrator,
  resendAdminInvitation,
  revokeAdminInvitation,
  updateAdminRole,
  updateAdminPermissions,
  updateAdminStatus,
  revokeAdminAccess,
  getAdminActivityLogs,
  getPromotions,
  updatePlanPromotionController,
  getPlatformRatesController,
  updatePlatformRateController,
  getPlatformRateAuditLogsController,
  updatePlatformRatesBulkController,
  getFeatureMatrixController,
  updateGlobalFeatureController,
  updatePlanFeatureController,
  getPublishingOperationsController,
  getSystemHealthController,
  getAdminAnalytics
} from '../controllers/adminController.js';

const router = Router();

// Enforce both authentication and administrator authorization on ALL routes
router.use(authenticateToken);
router.use(requireAdmin);

// Dashboard & Analytics stats
router.get('/dashboard', getDashboardStats);
router.get('/stats', getDashboardStats);
router.get('/analytics', getAdminAnalytics);

// Administrator Management & RBAC (Super Admin restricted actions)
router.get('/administrators', requirePermission('admins:manage'), getAdministrators);
router.post('/administrators', requireSuperAdmin, createAdministrator);
router.post('/administrators/:id/password', requireSuperAdmin, resetAdminPassword);
router.post('/administrators/invite', requireSuperAdmin, inviteAdministrator);
router.post('/administrators/resend-invite/:id', requireSuperAdmin, resendAdminInvitation);
router.delete('/administrators/invite/:id', requireSuperAdmin, revokeAdminInvitation);
router.patch('/administrators/:id/role', requireSuperAdmin, updateAdminRole);
router.patch('/administrators/:id/permissions', requireSuperAdmin, updateAdminPermissions);
router.patch('/administrators/:id/status', requireSuperAdmin, updateAdminStatus);
router.post('/administrators/:id/revoke', requireSuperAdmin, revokeAdminAccess);
router.get('/administrators/audit-logs', requirePermission('admins:manage'), getAdminActivityLogs);

// Promotions & "1 Month Free" Plan Offers Management
router.get('/promotions', requirePermission('promotions:manage'), getPromotions);
router.put('/promotions/:planType', requirePermission('promotions:manage'), updatePlanPromotionController);

// User Management
router.get('/users', requirePermission('users:read'), getUsers);
router.post('/users', requirePermission('users:write'), createUser);
router.get('/users/:id', requirePermission('users:read'), getUserDetails);
router.delete('/users/:id', requirePermission('users:write'), deleteUser);
router.patch('/users/:id/plan', requirePermission('users:write'), updateUserPlan);
router.patch('/users/:id/status', requirePermission('users:write'), updateUserStatus);
router.post('/users/:id/credits', requirePermission('credits:manage'), adjustUserCredits);
router.post('/users/:id/initiate-password-reset', requirePermission('users:write'), initiateUserPasswordReset);

// Package Plans & Dynamic Pricing
router.get('/plans', requirePermission('plans:manage'), getPlans);
router.put('/plans/:planType', requirePermission('plans:manage'), updatePlan);
router.get('/plans/:planType/stats', requirePermission('plans:manage'), getPlanImpactStats);
router.post('/plans/:planType/promotion', requireSuperAdmin, togglePromotion);
router.post('/plans/:planType/migrate-free', requirePermission('plans:manage'), migrateUsersToFree);

// Centralized Feature Entitlements & Switches
router.get('/features', requirePermission('plans:manage'), getFeatureMatrixController);
router.put('/features/global/:featureKey', requirePermission('plans:manage'), updateGlobalFeatureController);
router.put('/features/plan/:planType/:featureKey', requirePermission('plans:manage'), updatePlanFeatureController);

// Platform Credit Rates & Audit
router.get('/platform-rates', requirePermission('plans:manage'), getPlatformRatesController);
router.put('/platform-rates', requirePermission('plans:manage'), updatePlatformRatesBulkController);
router.put('/platform-rates/:platform', requirePermission('plans:manage'), updatePlatformRateController);
router.get('/platform-rates/audit-logs', requirePermission('plans:manage'), getPlatformRateAuditLogsController);

// Subscriptions & Automated Card Billing
router.get('/subscriptions', requirePermission('payments:manage'), getSubscriptions);
router.post('/subscriptions/process-billing', requirePermission('payments:manage'), triggerBillingCheck);

// Payments
router.get('/payments', requirePermission('payments:manage'), getPayments);
router.get('/payments/:id', requirePermission('payments:manage'), getPaymentDetails);
router.post('/payments', requirePermission('payments:manage'), recordPayment);
router.patch('/payments/:id/verify', requirePermission('payments:manage'), verifyPayment);

// Publishing Operations Diagnostics (Privacy-Safe, Metadata-Only)
router.get('/operations/publishing', requirePermission('users:read'), getPublishingOperationsController);

// System Health & Diagnostics
router.get('/health/status', getSystemHealthController);

// Credit Transactions Audit Trail
router.get('/transactions', requirePermission('credits:manage'), getTransactions);

// Security Audit Logs
router.get('/audit-logs', getAuditLogs);

export default router;
