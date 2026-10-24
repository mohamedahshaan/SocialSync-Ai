import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { app } from '../src/app.js';
import { prisma } from '../src/utils/prisma.js';

describe('Account Deletion, Data Privacy & User Churn Analytics Suite', () => {
  let superAdminUser;
  let superAdminToken;
  let adminUser;
  let adminToken;
  let regularUser;
  let regularToken;
  let deletionTestUser;
  let deletionTestToken;
  let deletionTestUserPassword = 'TestPassword123!';
  let associatedPaymentId;

  beforeAll(async () => {
    // 1. Create Super Admin
    superAdminUser = await prisma.user.create({
      data: {
        email: `superadmin_churn_${Date.now()}@socialsync.ai`,
        passwordHash: await bcrypt.hash('AdminPassword123!', 10),
        name: 'Super Administrator',
        role: 'SUPER_ADMIN',
        status: 'ACTIVE',
        plan: 'PROFESSIONAL'
      }
    });

    superAdminToken = jwt.sign(
      { userId: superAdminUser.id, role: 'SUPER_ADMIN' },
      process.env.JWT_SECRET || 'test_jwt_secret',
      { expiresIn: '1h' }
    );

    // 2. Create Regular Admin
    adminUser = await prisma.user.create({
      data: {
        email: `admin_churn_${Date.now()}@socialsync.ai`,
        passwordHash: await bcrypt.hash('AdminPassword123!', 10),
        name: 'Staff Administrator',
        role: 'ADMIN',
        status: 'ACTIVE',
        plan: 'PROFESSIONAL'
      }
    });

    adminToken = jwt.sign(
      { userId: adminUser.id, role: 'ADMIN' },
      process.env.JWT_SECRET || 'test_jwt_secret',
      { expiresIn: '1h' }
    );

    // 3. Create Regular User
    regularUser = await prisma.user.create({
      data: {
        email: `user_churn_${Date.now()}@example.com`,
        passwordHash: await bcrypt.hash('UserPassword123!', 10),
        name: 'Regular Customer',
        role: 'USER',
        status: 'ACTIVE',
        plan: 'FREE'
      }
    });

    regularToken = jwt.sign(
      { userId: regularUser.id, role: 'USER' },
      process.env.JWT_SECRET || 'test_jwt_secret',
      { expiresIn: '1h' }
    );

    // 4. Create User specifically for permanent account deletion test
    deletionTestUser = await prisma.user.create({
      data: {
        email: `delete_me_${Date.now()}@example.com`,
        passwordHash: await bcrypt.hash(deletionTestUserPassword, 10),
        name: 'Departing User',
        role: 'USER',
        status: 'ACTIVE',
        plan: 'CREATOR',
        credits: 50
      }
    });

    deletionTestToken = jwt.sign(
      { userId: deletionTestUser.id, role: 'USER' },
      process.env.JWT_SECRET || 'test_jwt_secret',
      { expiresIn: '1h' }
    );

    // 5. Attach a Payment record to deletionTestUser to test payment preservation
    const payment = await prisma.payment.create({
      data: {
        userId: deletionTestUser.id,
        reference: `REF-DEL-TEST-${Date.now()}`,
        amount: 1000,
        currency: 'LKR',
        plan: 'CREATOR',
        status: 'VERIFIED'
      }
    });
    associatedPaymentId = payment.id;
  });

  afterAll(async () => {
    // Cleanup users created during test
    const userIds = [superAdminUser?.id, adminUser?.id, regularUser?.id].filter(Boolean);
    if (userIds.length > 0) {
      await prisma.user.deleteMany({
        where: { id: { in: userIds } }
      });
    }

    if (associatedPaymentId) {
      await prisma.payment.deleteMany({
        where: { id: associatedPaymentId }
      });
    }

    // Clean up deletion test events created during this test
    if (deletionTestUser?.id) {
      const hash = crypto.createHash('sha256').update(deletionTestUser.id).digest('hex');
      await prisma.accountDeletionEvent.deleteMany({
        where: { userIdHash: hash }
      });
    }
  });

  describe('1. Security & Super Admin Deletion Protection', () => {
    it('should prohibit Super Admin self-service deletion', async () => {
      const res = await request(app)
        .delete('/api/auth/delete-account')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ password: 'AdminPassword123!' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('SUPER_ADMIN_DELETION_PROHIBITED');
    });

    it('should reject deletion when password is wrong', async () => {
      const res = await request(app)
        .delete('/api/auth/delete-account')
        .set('Authorization', `Bearer ${deletionTestToken}`)
        .send({ password: 'WrongPassword999!' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/incorrect password/i);

      // Verify user still exists in database
      const userStillExists = await prisma.user.findUnique({
        where: { id: deletionTestUser.id }
      });
      expect(userStillExists).not.toBeNull();
    });

    it('should reject unauthenticated deletion request', async () => {
      const res = await request(app)
        .delete('/api/auth/delete-account')
        .send({ password: deletionTestUserPassword });

      expect(res.status).toBe(401);
    });
  });

  describe('2. Permanent Account Deletion & Data Privacy', () => {
    it('should permanently delete user, disassociate payment records, and record zero-PII deletion event', async () => {
      const expectedHash = crypto.createHash('sha256').update(deletionTestUser.id).digest('hex');

      const res = await request(app)
        .delete('/api/auth/delete-account')
        .set('Authorization', `Bearer ${deletionTestToken}`)
        .send({
          password: deletionTestUserPassword,
          reason: 'Switching to another platform'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toMatch(/permanently deleted/i);

      // 1. User record must be completely gone from PostgreSQL
      const userInDb = await prisma.user.findUnique({
        where: { id: deletionTestUser.id }
      });
      expect(userInDb).toBeNull();

      // 2. Financial payment record MUST NOT be deleted (legal/tax retention requirement)
      const paymentInDb = await prisma.payment.findUnique({
        where: { id: associatedPaymentId }
      });
      expect(paymentInDb).not.toBeNull();
      // But personal user ID must be disassociated
      expect(paymentInDb.userId).toBeNull();

      // 3. Privacy-conscious AccountDeletionEvent must exist
      const deletionEvent = await prisma.accountDeletionEvent.findUnique({
        where: { userIdHash: expectedHash }
      });
      expect(deletionEvent).not.toBeNull();
      expect(deletionEvent.userIdHash).toBe(expectedHash);
      expect(deletionEvent.deletedAt).toBeInstanceOf(Date);
      expect(deletionEvent.reason).toBe('Switching to another platform');

      // 4. Verify ZERO PII in deletion event
      expect(deletionEvent).not.toHaveProperty('email');
      expect(deletionEvent).not.toHaveProperty('name');
      expect(deletionEvent).not.toHaveProperty('passwordHash');
    });

    it('should enforce idempotency and not double-count retried or duplicate deletions', async () => {
      const expectedHash = crypto.createHash('sha256').update(deletionTestUser.id).digest('hex');

      // Attempt upsert with the same hash
      const upserted = await prisma.accountDeletionEvent.upsert({
        where: { userIdHash: expectedHash },
        update: {},
        create: {
          userIdHash: expectedHash,
          reason: 'Duplicate retry attempt'
        }
      });

      expect(upserted).not.toBeNull();
      expect(upserted.userIdHash).toBe(expectedHash);

      // Total count of deletion events for this hash must strictly be 1
      const count = await prisma.accountDeletionEvent.count({
        where: { userIdHash: expectedHash }
      });
      expect(count).toBe(1);
    });
  });

  describe('3. Admin Dashboard Metrics & Period Filters', () => {
    it('should return all required metrics in GET /api/admin/dashboard', async () => {
      const res = await request(app)
        .get('/api/admin/dashboard?period=all')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const summary = res.body.data.summary;
      // 1. Total Registered Users
      expect(typeof summary.totalUsers).toBe('number');
      // 2. Currently Active Accounts
      expect(typeof summary.activeUsers).toBe('number');
      // 3. Permanently Deleted Accounts
      expect(typeof summary.totalDeletedAccounts).toBe('number');
      expect(summary.totalDeletedAccounts).toBeGreaterThanOrEqual(1);
      // 4. Account Deletions This Month
      expect(typeof summary.deletionsThisMonth).toBe('number');
      expect(summary.deletionsThisMonth).toBeGreaterThanOrEqual(1);
      // 5. Account Deletions This Year
      expect(typeof summary.deletionsThisYear).toBe('number');
      expect(summary.deletionsThisYear).toBeGreaterThanOrEqual(1);

      // 6. Explicit Churn Rate
      expect(typeof summary.churnRatePercentage).toBe('number');
      expect(summary.churnRatePercentage).toBeGreaterThan(0);

      // 7. Nested deletions metadata
      expect(summary.deletions).toBeDefined();
      expect(summary.deletions.totalDeletedAccounts).toBe(summary.totalDeletedAccounts);
      expect(summary.deletions.formula).toMatch(/Permanently Deleted Accounts \/ \(Total Current Registered Users \+ Permanently Deleted Accounts\)/);
    });

    it('should respond correctly to date filters (today, 7d, 30d, all)', async () => {
      const periods = ['today', '7d', '30d', 'all'];

      for (const p of periods) {
        const res = await request(app)
          .get(`/api/admin/dashboard?period=${p}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.summary.period).toBe(p);
        expect(typeof res.body.data.summary.deletionsInPeriod).toBe('number');
      }
    });

    it('should reject non-admin users from accessing dashboard metrics', async () => {
      const res = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${regularToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('4. Admin Analytics Endpoint & User Churn Intelligence', () => {
    it('should return deletion metrics and churn rate in GET /api/admin/analytics', async () => {
      const res = await request(app)
        .get('/api/admin/analytics')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const summary = res.body.data.summary;
      expect(typeof summary.totalUsers).toBe('number');
      expect(typeof summary.activeUsers).toBe('number');
      expect(typeof summary.totalDeletedAccounts).toBe('number');
      expect(typeof summary.deletionsThisMonth).toBe('number');
      expect(typeof summary.deletionsThisYear).toBe('number');
      expect(typeof summary.churnRatePercentage).toBe('number');
      expect(summary.deletions).toBeDefined();
    });

    it('should reject non-admin users from accessing analytics', async () => {
      const res = await request(app)
        .get('/api/admin/analytics')
        .set('Authorization', `Bearer ${regularToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('5. Persistence After Server Restart Simulation', () => {
    it('should retrieve accurate deletion counts directly from PostgreSQL without frontend state', async () => {
      // Direct database query simulating fresh server process startup
      const dbDeletedCount = await prisma.accountDeletionEvent.count();
      const dbUsersCount = await prisma.user.count({ where: { role: 'USER' } });
      const totalEver = dbUsersCount + dbDeletedCount;
      const expectedDbChurn = totalEver > 0 ? Math.round((dbDeletedCount / totalEver) * 1000) / 10 : 0;

      const res = await request(app)
        .get('/api/admin/dashboard?period=all')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.summary.totalDeletedAccounts).toBe(dbDeletedCount);
      expect(res.body.data.summary.churnRatePercentage).toBe(expectedDbChurn);
    });
  });
});
