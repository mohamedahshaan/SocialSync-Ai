import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/utils/prisma.js';

describe('Admin Panel Security & Governance Suite', () => {
  let adminToken = '';
  let userToken = '';
  let adminUserId = '';
  let regularUserId = '';

  const adminEmail = `test_admin_${Date.now()}@socialsync.ai`;
  const regularEmail = `test_user_${Date.now()}@socialsync.ai`;
  const password = 'StrongPassword123!';

  beforeAll(async () => {
    // 1. Create a regular user
    const userRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Regular Tester',
        email: regularEmail,
        password,
        confirmPassword: password
      });
    expect(userRes.status).toBe(201);
    userToken = userRes.body.data.token;
    regularUserId = userRes.body.data.user.id;

    // 2. Create an administrator directly
    const adminUser = await prisma.user.create({
      data: {
        name: 'Admin Tester',
        email: adminEmail,
        passwordHash: userRes.body.data.user ? 'mock' : 'mock', // Will login via /api/auth/register then update to ADMIN
        role: 'ADMIN',
        status: 'ACTIVE',
        plan: 'PROFESSIONAL',
        credits: 1000
      }
    });
    adminUserId = adminUser.id;

    // Register proper admin credentials
    const adminRegRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Real Admin',
        email: `real_admin_${Date.now()}@socialsync.ai`,
        password,
        confirmPassword: password
      });
    
    // Promote to ADMIN
    await prisma.user.update({
      where: { id: adminRegRes.body.data.user.id },
      data: { role: 'ADMIN' }
    });

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: adminRegRes.body.data.user.email,
        password
      });

    adminToken = loginRes.body.data.token;
    adminUserId = adminRegRes.body.data.user.id;
  });

  afterAll(async () => {
    // Cleanup test users and cascade relations
    await prisma.user.deleteMany({
      where: {
        OR: [
          { email: { contains: 'test_admin_' } },
          { email: { contains: 'test_user_' } },
          { email: { contains: 'real_admin_' } }
        ]
      }
    });
  });

  it('1. GET /api/admin/dashboard rejects unauthenticated requests with 401', async () => {
    const res = await request(app).get('/api/admin/dashboard');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('UNAUTHORIZED');
  });

  it('2. GET /api/admin/dashboard rejects ordinary user with 403 Forbidden', async () => {
    const res = await request(app)
      .get('/api/admin/dashboard')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('FORBIDDEN_NOT_ADMIN');
  });

  it('3. GET /api/admin/dashboard allows authorized admin and returns real metrics', async () => {
    const res = await request(app)
      .get('/api/admin/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.summary).toBeDefined();
    expect(res.body.data.summary.totalUsers).toBeGreaterThanOrEqual(2);
    expect(res.body.data.summary.planDistribution).toHaveProperty('FREE');
    expect(res.body.data.summary.planDistribution).toHaveProperty('CREATOR');
    expect(res.body.data.summary.planDistribution).toHaveProperty('PROFESSIONAL');
  });

  it('4. GET /api/admin/users lists users without exposing passwords or OAuth tokens', async () => {
    const res = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.users)).toBe(true);

    // Verify security: no password hashes or tokens
    res.body.data.users.forEach((u) => {
      expect(u).not.toHaveProperty('passwordHash');
      expect(u).not.toHaveProperty('accessToken');
      expect(u).not.toHaveProperty('refreshToken');
    });
  });

  it('5. GET /api/admin/users/:id returns user details and associated histories', async () => {
    const res = await request(app)
      .get(`/api/admin/users/${regularUserId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(regularEmail.toLowerCase());
    expect(res.body.data.user.planHistory).toBeDefined();
    expect(res.body.data.user.creditTransactions).toBeDefined();
  });

  it('6. PATCH /api/admin/users/:id/plan changes user plan and creates audit entry', async () => {
    const res = await request(app)
      .patch(`/api/admin/users/${regularUserId}/plan`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        plan: 'CREATOR',
        reason: 'Upgraded for evaluation by admin'
      });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.plan).toBe('CREATOR');

    // Verify plan history was recorded
    const history = await prisma.planHistory.findFirst({
      where: { userId: regularUserId, plan: 'CREATOR' }
    });
    expect(history).toBeDefined();
    expect(history.reason).toContain('Upgraded for evaluation');
  });

  it('7. POST /api/admin/users/:id/credits grants credits and records transaction', async () => {
    const res = await request(app)
      .post(`/api/admin/users/${regularUserId}/credits`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        amount: 100,
        reason: 'Bonus promotional credits'
      });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.credits).toBe(300); // 200 initial + 100 granted
  });

  it('8. POST /api/admin/users/:id/credits rejects excessive deductions leading to negative balance', async () => {
    const res = await request(app)
      .post(`/api/admin/users/${regularUserId}/credits`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        amount: -9999,
        reason: 'Deduction test'
      });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('INSUFFICIENT_CREDITS');
  });

  it('9. PATCH /api/admin/users/:id/status suspends user and prevents login', async () => {
    const suspendRes = await request(app)
      .patch(`/api/admin/users/${regularUserId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'SUSPENDED',
        reason: 'Suspension verification test'
      });
    expect(suspendRes.status).toBe(200);
    expect(suspendRes.body.data.user.status).toBe('SUSPENDED');

    // Attempt login with suspended user
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: regularEmail,
        password
      });
    expect(loginRes.status).toBe(403);
    expect(loginRes.body.error).toBe('ACCOUNT_SUSPENDED');

    // Reactivate user
    const reactivateRes = await request(app)
      .patch(`/api/admin/users/${regularUserId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'ACTIVE',
        reason: 'Test reactivation'
      });
    expect(reactivateRes.status).toBe(200);
    expect(reactivateRes.body.data.user.status).toBe('ACTIVE');
  });

  it('10. POST /api/admin/payments records a verified payment and upgrades user tier', async () => {
    const payRes = await request(app)
      .post('/api/admin/payments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        userId: regularUserId,
        amount: 2500,
        currency: 'LKR',
        plan: 'PROFESSIONAL',
        reference: `INV-TEST-${Date.now()}`,
        verified: true,
        notes: 'Bank transfer verified'
      });
    expect(payRes.status).toBe(201);
    expect(payRes.body.success).toBe(true);
    expect(payRes.body.data.payment.status).toBe('VERIFIED');

    // Verify user plan upgraded
    const user = await prisma.user.findUnique({ where: { id: regularUserId } });
    expect(user.plan).toBe('PROFESSIONAL');
  });

  it('11. GET /api/admin/audit-logs returns recorded administrator audit trail', async () => {
    const res = await request(app)
      .get('/api/admin/audit-logs')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.logs.length).toBeGreaterThanOrEqual(1);
  });
});
