import { Router } from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import {
  getDashboardStats,
  getUsers,
  getUserDetails,
  createUser,
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
  recordPayment,
  verifyPayment,
  getTransactions,
  getAuditLogs
} from '../controllers/adminController.js';

const router = Router();

// Enforce both authentication and administrator authorization on ALL routes
router.use(authenticateToken);
router.use(requireAdmin);

// Dashboard stats
router.get('/dashboard', getDashboardStats);
router.get('/stats', getDashboardStats);

// User Management
router.get('/users', getUsers);
router.post('/users', createUser);
router.get('/users/:id', getUserDetails);
router.patch('/users/:id/plan', updateUserPlan);
router.patch('/users/:id/status', updateUserStatus);
router.post('/users/:id/credits', adjustUserCredits);
router.post('/users/:id/initiate-password-reset', initiateUserPasswordReset);

// Package Plans & Dynamic Pricing
router.get('/plans', getPlans);
router.put('/plans/:planType', updatePlan);
router.get('/plans/:planType/stats', getPlanImpactStats);
router.post('/plans/:planType/promotion', togglePromotion);
router.post('/plans/:planType/migrate-free', migrateUsersToFree);

// Subscriptions & Automated Card Billing
router.get('/subscriptions', getSubscriptions);
router.post('/subscriptions/process-billing', triggerBillingCheck);

// Payments
router.get('/payments', getPayments);
router.post('/payments', recordPayment);
router.patch('/payments/:id/verify', verifyPayment);

// Credit Transactions Audit Trail
router.get('/transactions', getTransactions);

// Security Audit Logs
router.get('/audit-logs', getAuditLogs);

export default router;
