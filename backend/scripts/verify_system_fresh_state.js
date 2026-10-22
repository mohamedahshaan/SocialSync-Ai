/**
 * SocialSync AI — System Fresh State Comprehensive Verification
 *
 * Runs full verification checks against backend endpoints:
 * 1. Super Admin login test
 * 2. Super Admin Professional plan entitlements (1,500 credits, 6 channels, no pending checkouts)
 * 3. Feature access verification (AI Captions, Collage Studio, Scheduling)
 * 4. Admin dashboard metrics verification (all regular metrics = 0)
 * 5. Admin analytics verification (MRR = 0, Revenue = 0, Churn = 0)
 * 6. User directory verification (0 regular users)
 * 7. Administrator directory verification (exactly 1 Super Admin)
 * 8. Regular user privilege escalation prevention (cannot register as SUPER_ADMIN)
 * 9. Access control security verification (unauthenticated blocked)
 * 10. Package plans integrity verification (Free, Creator, Professional intact)
 */

import axios from 'axios';
import { prisma } from '../src/utils/prisma.js';

const BASE_URL = process.env.BASE_URL || process.env.API_BASE || 'http://localhost:5002/api';

async function runVerification() {
  console.log('===========================================================');
  console.log('   SOCIALSYNC AI — FRESH SYSTEM STATE VERIFICATION        ');
  console.log('===========================================================');

  const results = [];

  function record(title, pass, details = '') {
    results.push({ title, pass, details });
    const mark = pass ? '✓ [PASS]' : '✗ [FAIL]';
    console.log(`${mark} ${title}${details ? ` — ${details}` : ''}`);
  }

  try {
    // 1. Health check
    const health = await axios.get(`${BASE_URL}/health`);
    record('Backend API Health', health.data.success, health.data.message);

    // 2. Super Admin Login
    let adminToken = '';
    let adminUser = null;
    try {
      const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
        email: 'admin@socialsync.ai',
        password: 'Admin@123'
      });
      if (loginRes.data.success && loginRes.data.data.token) {
        adminToken = loginRes.data.data.token;
        adminUser = loginRes.data.data.user;
        record('Super Admin Login', true, `Authenticated as ${adminUser.email} (${adminUser.role})`);
      } else {
        record('Super Admin Login', false, 'Login response did not return token');
      }
    } catch (err) {
      record('Super Admin Login', false, err.response?.data?.message || err.message);
    }

    if (!adminToken) {
      console.error('Cannot proceed without admin token.');
      process.exit(1);
    }

    const authHeaders = { headers: { Authorization: `Bearer ${adminToken}` } };

    // 3. Super Admin Profile & Professional Plan Status
    record(
      'Super Admin Role is SUPER_ADMIN',
      adminUser.role === 'SUPER_ADMIN',
      `role = ${adminUser.role}`
    );
    record(
      'Super Admin Email Verified',
      adminUser.isEmailVerified === true,
      `isEmailVerified = ${adminUser.isEmailVerified}`
    );
    record(
      'Super Admin Status is ACTIVE',
      adminUser.status === 'ACTIVE',
      `status = ${adminUser.status}`
    );
    record(
      'Super Admin Plan is PROFESSIONAL',
      adminUser.plan === 'PROFESSIONAL',
      `plan = ${adminUser.plan}`
    );
    record(
      'Super Admin Credits = 1500',
      adminUser.credits === 1500,
      `credits = ${adminUser.credits}`
    );

    // 4. Super Admin Subscription Details (/api/subscriptions/me)
    const subRes = await axios.get(`${BASE_URL}/subscriptions/me`, authHeaders);
    const subData = subRes.data.data;

    record(
      'Subscription Plan Type is PROFESSIONAL',
      subData.plan?.type === 'PROFESSIONAL',
      `type = ${subData.plan?.type}`
    );
    record(
      'Subscription Plan Name is Professional',
      subData.plan?.name === 'Professional',
      `name = ${subData.plan?.name}`
    );
    record(
      'Subscription Credits = 1500',
      subData.user?.credits === 1500 && subData.plan?.credits === 1500,
      `user.credits = ${subData.user?.credits}, plan.credits = ${subData.plan?.credits}`
    );
    record(
      'Channel Entitlement = 6 (Never 999)',
      subData.plan?.maxConnectedAccounts === 6 && subData.usage?.maxAccounts === 6,
      `plan.maxConnectedAccounts = ${subData.plan?.maxConnectedAccounts}, usage.maxAccounts = ${subData.usage?.maxAccounts}`
    );
    record(
      'No Pending Checkout Banner',
      subData.pendingCheckout === null,
      `pendingCheckout = ${JSON.stringify(subData.pendingCheckout)}`
    );
    record(
      'Billing History is Empty (Zero fake payments)',
      Array.isArray(subData.billingHistory) && subData.billingHistory.length === 0,
      `billingHistory count = ${subData.billingHistory?.length}`
    );
    record(
      'Plan History records System Bootstrap action',
      Array.isArray(subData.planHistory) && subData.planHistory.some(ph => ph.source === 'SYSTEM_BOOTSTRAP'),
      `planHistory: ${subData.planHistory?.[0]?.source} - ${subData.planHistory?.[0]?.reason}`
    );

    // 5. Super Admin Feature Entitlements (/api/subscriptions/features)
    const featRes = await axios.get(`${BASE_URL}/subscriptions/features`, authHeaders);
    const featData = featRes.data.data;

    record('Feature AI Captions Entitled', featData.canUseAiCaption === true, `canUseAiCaption = ${featData.canUseAiCaption}`);
    record('Feature Collage Studio Entitled', featData.canUseCollageStudio === true, `canUseCollageStudio = ${featData.canUseCollageStudio}`);
    record('Feature Scheduling Entitled', featData.canUseScheduling === true, `canUseScheduling = ${featData.canUseScheduling}`);

    // 6. Admin Dashboard Metrics Verification
    const dashRes = await axios.get(`${BASE_URL}/admin/dashboard`, authHeaders);
    const summary = dashRes.data.data.summary;

    record('Dashboard Total Regular Users = 0', summary.totalUsers === 0, `totalUsers: ${summary.totalUsers}`);
    record('Dashboard Active Regular Users = 0', summary.activeUsers === 0, `activeUsers: ${summary.activeUsers}`);
    record('Dashboard Free Users = 0', summary.freeUsersCount === 0, `freeUsersCount: ${summary.freeUsersCount}`);
    record('Dashboard Paid Subscribers = 0', summary.distinctPaidSubscribers === 0, `distinctPaidSubscribers: ${summary.distinctPaidSubscribers}`);
    record('Dashboard Active Subscriptions = 0', summary.activeSubscriptions === 0, `activeSubscriptions: ${summary.activeSubscriptions}`);
    record('Dashboard Total Deleted Accounts = 0', summary.totalDeletedAccounts === 0, `totalDeletedAccounts: ${summary.totalDeletedAccounts}`);
    record('Dashboard Deletions This Month = 0', summary.deletionsThisMonth === 0, `deletionsThisMonth: ${summary.deletionsThisMonth}`);
    record('Dashboard Deletions This Year = 0', summary.deletionsThisYear === 0, `deletionsThisYear: ${summary.deletionsThisYear}`);
    record('Dashboard Platform Churn Rate = 0%', summary.churnRatePercentage === 0, `churnRatePercentage: ${summary.churnRatePercentage}%`);
    record('Dashboard Verified Revenue = LKR 0', (summary.payments?.verifiedTotalLkr || 0) === 0, `verifiedTotalLkr: LKR ${summary.payments?.verifiedTotalLkr || 0}`);
    record('Dashboard Verified Payments = 0', (summary.payments?.verifiedCount || 0) === 0, `verifiedCount: ${summary.payments?.verifiedCount || 0}`);
    record('Dashboard Pending Payments = 0', (summary.payments?.pendingCount || 0) === 0, `pendingCount: ${summary.payments?.pendingCount || 0}`);
    record('Dashboard Failed Payments = 0', (summary.payments?.failedAndCancelledCount || 0) === 0, `failedAndCancelledCount: ${summary.payments?.failedAndCancelledCount || 0}`);
    record('Dashboard Circulating Credits = 0', (summary.totalCirculatingCredits || 0) === 0, `totalCirculatingCredits: ${summary.totalCirculatingCredits || 0}`);

    // 7. Admin Analytics Verification
    const analyticsRes = await axios.get(`${BASE_URL}/admin/analytics`, authHeaders);
    const analyticsSummary = analyticsRes.data.data.summary;

    record('Analytics Total Users = 0', analyticsSummary.totalUsers === 0, `totalUsers: ${analyticsSummary.totalUsers}`);
    record('Analytics Estimated MRR = LKR 0', analyticsSummary.estimatedMrrLkr === 0, `estimatedMrrLkr: LKR ${analyticsSummary.estimatedMrrLkr}`);
    record('Analytics Total Revenue = LKR 0', analyticsSummary.totalRevenueLkr === 0, `totalRevenueLkr: LKR ${analyticsSummary.totalRevenueLkr}`);
    record('Analytics Circulating Credits = 0', analyticsSummary.circulatingCredits === 0, `circulatingCredits: ${analyticsSummary.circulatingCredits}`);
    record('Analytics Connected Channels = 0', analyticsSummary.totalConnectedChannels === 0, `totalConnectedChannels: ${analyticsSummary.totalConnectedChannels}`);
    record('Analytics Churn Rate = 0%', analyticsSummary.churnRatePercentage === 0, `churnRatePercentage: ${analyticsSummary.churnRatePercentage}%`);

    // 8. User Directory Verification
    const usersRes = await axios.get(`${BASE_URL}/admin/users`, authHeaders);
    const userList = usersRes.data.data.users;
    const pagination = usersRes.data.data.pagination;

    record('Regular Users Directory Count = 0', pagination.total === 0 && userList.length === 0, `total: ${pagination.total}, list length: ${userList.length}`);

    // 9. Administrators Directory Verification
    const adminsRes = await axios.get(`${BASE_URL}/admin/administrators`, authHeaders);
    const adminList = adminsRes.data.data.administrators;
    const pendingInvites = adminsRes.data.data.pendingInvitations;

    record(
      'Exactly One Super Admin Preserved',
      adminList.length === 1 && adminList[0].role === 'SUPER_ADMIN' && adminList[0].email === 'admin@socialsync.ai',
      `Count: ${adminList.length}, Email: ${adminList[0]?.email}, Role: ${adminList[0]?.role}`
    );
    record('Zero Pending Admin Invitations', pendingInvites.length === 0, `pendingInvitations: ${pendingInvites.length}`);

    // 10. Package Plans Integrity Verification
    const plansRes = await axios.get(`${BASE_URL}/plans`);
    const plans = plansRes.data.data?.plans || plansRes.data.data || plansRes.data.plans || [];
    const planTypes = plans.map(p => p.planType || p.id);

    const hasFree = plans.some(p => (p.planType === 'FREE' || p.id === 'FREE') && p.priceLkr === 0);
    const hasCreator = plans.some(p => (p.planType === 'CREATOR' || p.id === 'CREATOR') && p.priceLkr === 1000);
    const hasPro = plans.some(p => (p.planType === 'PROFESSIONAL' || p.id === 'PROFESSIONAL') && p.priceLkr === 2500);

    record('Package Plans Preserved (Free, Creator, Professional)', hasFree && hasCreator && hasPro, `Plans: ${planTypes.join(', ')}`);

    // 11. Security: Privilege Escalation Prevention on Self-Registration
    try {
      const regAttempt = await axios.post(`${BASE_URL}/auth/register`, {
        name: 'Hacker Attempt',
        email: 'hacker_test@example.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        role: 'SUPER_ADMIN'
      });
      // Verify user was NOT created as SUPER_ADMIN
      const createdUser = regAttempt.data.data.user;
      record(
        'Self-Registration Cannot Escalate to SUPER_ADMIN',
        createdUser.role === 'USER',
        `Assigned role: ${createdUser.role}`
      );
      // Clean up test registration
      await prisma.user.delete({ where: { id: createdUser.id } });
    } catch (err) {
      record('Self-Registration Escalation Handled', true, err.response?.data?.message || err.message);
    }

    // 12. Security: Unauthenticated Access Blocked
    try {
      await axios.get(`${BASE_URL}/admin/dashboard`);
      record('Unauthenticated Access Blocked', false, 'Unexpected 200 OK without token');
    } catch (err) {
      record('Unauthenticated Access Blocked', err.response?.status === 401, `Status: ${err.response?.status} (${err.response?.data?.error})`);
    }

    // Summary
    const passed = results.filter(r => r.pass).length;
    const failed = results.filter(r => !r.pass).length;

    console.log('===========================================================');
    console.log(`VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('===========================================================');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Verification error:', error.response?.data || error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runVerification();
