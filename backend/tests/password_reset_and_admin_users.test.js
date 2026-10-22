import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { app } from '../src/app.js';
import { prisma } from '../src/utils/prisma.js';
import { getLatestOtpForEmail, clearSentEmailsStore } from '../src/services/emailService.js';

describe('Password Reset & Admin User Management Suite', () => {
  const testEmail = `pwdreset_${Date.now()}@socialflow.ai`;
  const initialPassword = 'InitialPassword123!';
  const newPassword = 'BrandNewSecurePassword456!';

  const adminEmail = `admin_${Date.now()}@socialflow.ai`;
  const adminPassword = 'AdminSecretPassword123!';

  let userId = '';
  let initialAuthToken = '';
  let adminId = '';
  let adminToken = '';
  let issuedResetToken = '';

  beforeAll(async () => {
    clearSentEmailsStore();

    // Create an Admin user for testing administrative features
    const adminHash = await bcrypt.hash(adminPassword, 12);
    const admin = await prisma.user.create({
      data: {
        name: 'Master Administrator',
        email: adminEmail,
        passwordHash: adminHash,
        role: 'ADMIN',
        status: 'ACTIVE',
        plan: 'PROFESSIONAL',
        credits: 5000,
        registrationSource: 'SYSTEM_BOOTSTRAP',
        isEmailVerified: true,
        emailVerifiedAt: new Date()
      }
    });
    adminId = admin.id;

    // Login as admin
    const adminLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: adminEmail, password: adminPassword });
    adminToken = adminLoginRes.body.data.token;
  });

  afterAll(async () => {
    // Clean up created test records
    await prisma.passwordResetOtp.deleteMany({
      where: { email: { in: [testEmail.toLowerCase(), adminEmail.toLowerCase()] } }
    });
    await prisma.adminAuditLog.deleteMany({
      where: {
        OR: [
          { adminId: adminId },
          { targetUserId: userId }
        ]
      }
    });
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            testEmail.toLowerCase(),
            adminEmail.toLowerCase(),
            `admincreated_${testEmail}`.toLowerCase()
          ]
        }
      }
    });
  });

  describe('1. Registration, Email Verification & Session Defaults', () => {
    it('POST /api/auth/register records registrationSource and initializes tokenVersion', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Reset Flow User',
          email: testEmail,
          password: initialPassword,
          confirmPassword: initialPassword
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(testEmail.toLowerCase());
      expect(res.body.data.user.registrationSource).toBe('SELF_REGISTRATION');
      expect(res.body.data.user.isEmailVerified).toBe(false);
      expect(res.body.data.user).not.toHaveProperty('passwordHash');

      userId = res.body.data.user.id;
      initialAuthToken = res.body.data.token;
    });

    it('POST /api/auth/login updates lastLoginAt timestamp', async () => {
      const beforeLogin = new Date();
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: initialPassword
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.lastLoginAt).toBeDefined();
      const lastLogin = new Date(res.body.data.user.lastLoginAt);
      expect(lastLogin.getTime()).toBeGreaterThanOrEqual(beforeLogin.getTime() - 2000);

      // Re-capture fresh auth token
      initialAuthToken = res.body.data.token;
    });
  });

  describe('2. Forgot Password OTP Request Flow & Security', () => {
    it('POST /api/auth/forgot-password does not reveal nonexistent email (account enumeration defense)', async () => {
      const nonexistentEmail = `nobody_${Date.now()}@example.org`;
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: nonexistentEmail });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('If an account exists with this email address');
      // No email was actually dispatched for the non-existent account
      expect(getLatestOtpForEmail(nonexistentEmail)).toBeNull();
    });

    it('POST /api/auth/forgot-password generates random 6-digit OTP and hashes it in database', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: testEmail });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.cooldownSeconds).toBe(60);

      // Verify OTP was stored hashed, NOT in plaintext
      const dbOtp = await prisma.passwordResetOtp.findFirst({
        where: { email: testEmail.toLowerCase(), used: false },
        orderBy: { createdAt: 'desc' }
      });

      expect(dbOtp).toBeDefined();
      expect(dbOtp.otpHash).toBeDefined();
      // Verify bcrypt hash format ($2a$ or $2b$)
      expect(dbOtp.otpHash).toMatch(/^\$2[ab]\$/);
      // Plaintext 6-digit OTP should NEVER match the hash directly
      expect(dbOtp.otpHash.length).toBeGreaterThan(30);

      // Retrieve sent OTP from in-memory test store
      const sentOtp = getLatestOtpForEmail(testEmail);
      expect(sentOtp).toBeDefined();
      expect(sentOtp).toMatch(/^\d{6}$/);

      // Verify hash corresponds to sent OTP
      const isMatch = await bcrypt.compare(sentOtp, dbOtp.otpHash);
      expect(isMatch).toBe(true);
    });

    it('POST /api/auth/forgot-password enforces 60-second resend cooldown', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: testEmail });

      expect(res.status).toBe(429);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('RATE_LIMIT_EXCEEDED');
      expect(res.body.message).toContain('Please wait');
      expect(res.body.cooldownSeconds).toBeGreaterThan(0);
    });
  });

  describe('3. OTP Verification & Attempt Limits', () => {
    it('POST /api/auth/verify-reset-otp rejects invalid 6-digit code and increments attempts', async () => {
      const res = await request(app)
        .post('/api/auth/verify-reset-otp')
        .send({
          email: testEmail,
          otp: '000000' // wrong OTP
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('INVALID_OTP');
      expect(res.body.remainingAttempts).toBe(4);

      const dbOtp = await prisma.passwordResetOtp.findFirst({
        where: { email: testEmail.toLowerCase() },
        orderBy: { createdAt: 'desc' }
      });
      expect(dbOtp.attempts).toBe(1);
    });

    it('POST /api/auth/verify-reset-otp rejects expired OTP', async () => {
      // Artificially expire the current OTP
      await prisma.passwordResetOtp.updateMany({
        where: { email: testEmail.toLowerCase(), used: false },
        data: { expiresAt: new Date(Date.now() - 10000) }
      });

      const sentOtp = getLatestOtpForEmail(testEmail);
      const res = await request(app)
        .post('/api/auth/verify-reset-otp')
        .send({
          email: testEmail,
          otp: sentOtp
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('OTP_EXPIRED');
    });

    it('POST /api/auth/verify-reset-otp verifies valid OTP and issues temporary reset token', async () => {
      // Clear past cooldown to generate a fresh OTP
      await prisma.passwordResetOtp.updateMany({
        where: { email: testEmail.toLowerCase() },
        data: { used: true, resendAvailableAt: new Date(Date.now() - 10000) }
      });

      // Request fresh OTP
      await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: testEmail });

      const freshOtp = getLatestOtpForEmail(testEmail);
      expect(freshOtp).toBeDefined();

      const res = await request(app)
        .post('/api/auth/verify-reset-otp')
        .send({
          email: testEmail,
          otp: freshOtp
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.resetToken).toBeDefined();
      expect(res.body.data.email).toBe(testEmail.toLowerCase());

      issuedResetToken = res.body.data.resetToken;
    });
  });

  describe('4. Password Reset Execution & Session Invalidation', () => {
    it('POST /api/auth/reset-password validates minimum password length (>=8 chars)', async () => {
      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({
          email: testEmail,
          resetToken: issuedResetToken,
          newPassword: 'short',
          confirmPassword: 'short'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('POST /api/auth/reset-password successfully resets password, marks email verified and invalidates sessions', async () => {
      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({
          email: testEmail,
          resetToken: issuedResetToken,
          newPassword: newPassword,
          confirmPassword: newPassword
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('Password reset successful');

      // Verify database record updates
      const updatedUser = await prisma.user.findUnique({
        where: { id: userId }
      });

      expect(updatedUser.lastPasswordResetAt).toBeDefined();
      expect(updatedUser.isEmailVerified).toBe(true);
      expect(updatedUser.emailVerifiedAt).toBeDefined();
      expect(updatedUser.tokenVersion).toBeGreaterThan(0);

      // Verify new password bcrypt hash (rounds = 12)
      const isNewMatch = await bcrypt.compare(newPassword, updatedUser.passwordHash);
      expect(isNewMatch).toBe(true);

      // Verify OTP is marked as used and cannot be reused
      const otps = await prisma.passwordResetOtp.findMany({
        where: { email: testEmail.toLowerCase() }
      });
      otps.forEach(otp => expect(otp.used).toBe(true));
    });

    it('Previous session token is immediately invalidated (tokenVersion mismatch)', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${initialAuthToken}`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('SESSION_INVALIDATED');
      expect(res.body.message).toContain('invalidated following a password reset');
    });

    it('Old password is rejected during login', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: initialPassword
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('INVALID_CREDENTIALS');
    });

    it('New password successfully logs in and generates active valid session', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: newPassword
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();

      const freshToken = res.body.data.token;
      const meRes = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${freshToken}`);

      expect(meRes.status).toBe(200);
      expect(meRes.body.success).toBe(true);
      expect(meRes.body.data.user.id).toBe(userId);
    });
  });

  describe('5. Admin User Management & Complete Details Audit', () => {
    it('GET /api/admin/users rejects unauthorized access by standard user', async () => {
      const userLogin = await request(app)
        .post('/api/auth/login')
        .send({ email: testEmail, password: newPassword });

      const res = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${userLogin.body.data.token}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('FORBIDDEN_NOT_ADMIN');
    });

    it('GET /api/admin/users returns complete user details, social platform names, and audit fields', async () => {
      const res = await request(app)
        .get('/api/admin/users?limit=50')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.users)).toBe(true);

      const target = res.body.data.users.find(u => u.id === userId);
      expect(target).toBeDefined();
      expect(target.id).toBe(userId);
      expect(target.name).toBe('Reset Flow User');
      expect(target.email).toBe(testEmail.toLowerCase());
      expect(target.status).toBe('ACTIVE');
      expect(target.plan).toBe('FREE');
      expect(target.credits).toBeDefined();
      expect(target.isEmailVerified).toBe(true);
      expect(target.emailVerifiedAt).toBeDefined();
      expect(target.lastLoginAt).toBeDefined();
      expect(target.lastPasswordResetAt).toBeDefined();
      expect(target.registrationSource).toBe('SELF_REGISTRATION');
      expect(Array.isArray(target.socialAccounts)).toBe(true);

      // Security check: passwords and hashes are strictly omitted
      expect(target).not.toHaveProperty('passwordHash');
      expect(target).not.toHaveProperty('password');
    });

    it('GET /api/admin/users supports filtering by registrationSource and isEmailVerified', async () => {
      const resSource = await request(app)
        .get('/api/admin/users?registrationSource=SELF_REGISTRATION')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(resSource.status).toBe(200);
      resSource.body.data.users.forEach(u => {
        expect(u.registrationSource).toBe('SELF_REGISTRATION');
      });

      const resVerified = await request(app)
        .get('/api/admin/users?isEmailVerified=true')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(resVerified.status).toBe(200);
      resVerified.body.data.users.forEach(u => {
        expect(u.isEmailVerified).toBe(true);
      });
    });

    it('GET /api/admin/users/:id returns user details and password reset request history without secrets', async () => {
      const res = await request(app)
        .get(`/api/admin/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const userDetails = res.body.data.user;
      expect(userDetails.id).toBe(userId);
      expect(userDetails.isEmailVerified).toBe(true);
      expect(userDetails.lastPasswordResetAt).toBeDefined();
      expect(Array.isArray(userDetails.passwordResetOtps)).toBe(true);
      expect(userDetails.passwordResetOtps.length).toBeGreaterThan(0);

      // Check OTP audit metadata: timestamp, expiry, used, attempts (NEVER otp or otpHash)
      const otpEntry = userDetails.passwordResetOtps[0];
      expect(otpEntry).toHaveProperty('id');
      expect(otpEntry).toHaveProperty('createdAt');
      expect(otpEntry).toHaveProperty('expiresAt');
      expect(otpEntry).toHaveProperty('used');
      expect(otpEntry).toHaveProperty('attempts');
      expect(otpEntry).not.toHaveProperty('otp');
      expect(otpEntry).not.toHaveProperty('otpHash');
    });

    it('POST /api/admin/users records creator admin and registrationSource ADMIN_CREATED', async () => {
      const adminCreatedEmail = `admincreated_${Date.now()}@socialflow.ai`;
      const res = await request(app)
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Admin Provisioned User',
          email: adminCreatedEmail,
          password: 'AdminUserPass123!',
          plan: 'CREATOR',
          credits: 150,
          role: 'USER'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.registrationSource).toBe('ADMIN_CREATED');
      expect(res.body.data.user.isEmailVerified).toBe(true);
      expect(res.body.data.user.createdByAdmin.id).toBe(adminId);
      expect(res.body.data.user.createdByAdmin.email).toBe(adminEmail.toLowerCase());

      // Verify audit log entry
      const auditLog = await prisma.adminAuditLog.findFirst({
        where: { action: 'USER_CREATED', targetUserId: res.body.data.user.id }
      });
      expect(auditLog).toBeDefined();
      expect(auditLog.adminId).toBe(adminId);
    });

    it('POST /api/admin/users/:id/initiate-password-reset sends reset OTP to user and logs audit action', async () => {
      // Clear past emails in memory store
      clearSentEmailsStore();

      const res = await request(app)
        .post(`/api/admin/users/${userId}/initiate-password-reset`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          reason: 'Customer requested password reset via support ticket #1024'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('verification code has been dispatched');

      // Admin response NEVER displays the raw OTP or password
      expect(res.body).not.toHaveProperty('otp');
      expect(res.body).not.toHaveProperty('password');

      // Verify email was received by user
      const emailedOtp = getLatestOtpForEmail(testEmail);
      expect(emailedOtp).toBeDefined();
      expect(emailedOtp).toMatch(/^\d{6}$/);

      // Verify audit event
      const auditLog = await prisma.adminAuditLog.findFirst({
        where: { action: 'PASSWORD_RESET_INITIATED', targetUserId: userId },
        orderBy: { createdAt: 'desc' }
      });
      expect(auditLog).toBeDefined();
      expect(auditLog.adminId).toBe(adminId);
      expect(auditLog.details).toContain('ticket #1024');
    });
  });
});
