import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import { OAuth2Client } from 'google-auth-library';
import { app } from '../src/app.js';
import { prisma } from '../src/utils/prisma.js';
import { config } from '../src/config/index.js';
import { getLatestResetLinkForEmail, clearSentEmailsStore } from '../src/services/emailService.js';

describe('Google Authentication & Password Reset Link Suite', () => {
  const timestamp = Date.now();
  const googleEmail = `google_user_${timestamp}@example.com`;
  const googleSub = `google_sub_${timestamp}`;
  const redirectUserEmail = `redirect_user_${timestamp}@example.com`;
  const redirectUserSub = `redirect_sub_${timestamp}`;
  const localEmail = `local_user_${timestamp}@example.com`;
  const localPassword = 'OriginalPassword123!';
  const newPassword = 'NewSecretPassword456!';

  let localAuthToken = '';
  let googleAuthToken = '';

  beforeAll(async () => {
    clearSentEmailsStore();

    // Create a local email/password user
    const passwordHash = await bcrypt.hash(localPassword, 12);
    const localUser = await prisma.user.create({
      data: {
        name: 'Local User',
        email: localEmail,
        passwordHash,
        role: 'USER',
        status: 'ACTIVE',
        plan: 'FREE',
        credits: 200,
        registrationSource: 'SELF_REGISTRATION',
        isEmailVerified: false,
        tokenVersion: 0
      }
    });

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: localEmail, password: localPassword });
    localAuthToken = loginRes.body.data.token;
  });

  afterAll(async () => {
    // Cleanup test users and tokens
    const emails = [googleEmail.toLowerCase(), localEmail.toLowerCase(), `link_${googleEmail}`.toLowerCase(), redirectUserEmail.toLowerCase()];
    await prisma.passwordResetToken.deleteMany({
      where: { user: { email: { in: emails } } }
    });
    await prisma.passwordResetOtp.deleteMany({
      where: { email: { in: emails } }
    });
    await prisma.creditTransaction.deleteMany({
      where: { user: { email: { in: emails } } }
    });
    await prisma.planHistory.deleteMany({
      where: { user: { email: { in: emails } } }
    });
    await prisma.user.deleteMany({
      where: { email: { in: emails } }
    });
  });

  describe('1. Google Authentication & Registration Flow', () => {
    it('POST /api/auth/google should reject requests without idToken', async () => {
      const res = await request(app)
        .post('/api/auth/google')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('POST /api/auth/google should register new user on first sign-in', async () => {
      const spy = vi.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockResolvedValueOnce({
        getPayload: () => ({
          sub: googleSub,
          email: googleEmail,
          email_verified: true,
          name: 'Google Pioneer',
          picture: 'https://lh3.googleusercontent.com/avatar_test',
          iss: 'https://accounts.google.com'
        })
      });

      const res = await request(app)
        .post('/api/auth/google')
        .send({ idToken: 'valid_mock_google_id_token' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(googleEmail.toLowerCase());
      expect(res.body.data.user.plan).toBe('FREE');
      expect(res.body.data.user.credits).toBe(200);
      expect(res.body.data.user.registrationSource).toBe('GOOGLE_OAUTH');
      expect(res.body.data.token).toBeDefined();

      googleAuthToken = res.body.data.token;

      // Verify DB record
      const dbUser = await prisma.user.findUnique({
        where: { email: googleEmail.toLowerCase() }
      });
      expect(dbUser).toBeDefined();
      expect(dbUser.googleId).toBe(googleSub);
      expect(dbUser.passwordHash).toBeNull();
      expect(dbUser.isEmailVerified).toBe(true);

      spy.mockRestore();
    });

    it('POST /api/auth/google should sign in existing Google user on subsequent visits', async () => {
      const spy = vi.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockResolvedValueOnce({
        getPayload: () => ({
          sub: googleSub,
          email: googleEmail,
          email_verified: true,
          name: 'Google Pioneer',
          iss: 'https://accounts.google.com'
        })
      });

      const res = await request(app)
        .post('/api/auth/google')
        .send({ idToken: 'valid_mock_google_id_token_subsequent' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(googleEmail.toLowerCase());
      expect(res.body.data.token).toBeDefined();

      spy.mockRestore();
    });

    it('POST /api/auth/login rejects password login for Google-only users without password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: googleEmail,
          password: 'SomeRandomPassword999!'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('GOOGLE_ACCOUNT_NO_PASSWORD');
      expect(res.body.message).toContain('Continue with Google');
    });

    it('POST /api/auth/forgot-password handles Google-only users with notice and guidance', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: googleEmail });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.isGoogleOnly).toBe(true);
      expect(res.body.error).toBe('GOOGLE_ACCOUNT_NO_PASSWORD');
    });

    it('POST /api/auth/google requires password verification when linking existing password account', async () => {
      const spy = vi.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockResolvedValueOnce({
        getPayload: () => ({
          sub: `link_sub_${timestamp}`,
          email: localEmail,
          email_verified: true,
          name: 'Local User',
          iss: 'https://accounts.google.com'
        })
      });

      const res = await request(app)
        .post('/api/auth/google')
        .send({ idToken: 'mock_link_token_no_password' });

      expect(res.status).toBe(200);
      expect(res.body.requiresLinking).toBe(true);
      expect(res.body.error).toBe('ACCOUNT_LINKING_REQUIRED');

      spy.mockRestore();
    });

    it('POST /api/auth/google successfully links account when correct password is provided', async () => {
      const linkSub = `link_sub_${timestamp}`;
      const spy = vi.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockResolvedValueOnce({
        getPayload: () => ({
          sub: linkSub,
          email: localEmail,
          email_verified: true,
          name: 'Local User',
          iss: 'https://accounts.google.com'
        })
      });

      const res = await request(app)
        .post('/api/auth/google')
        .send({
          idToken: 'mock_link_token_with_password',
          linkPassword: localPassword
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();

      const updated = await prisma.user.findUnique({
        where: { email: localEmail.toLowerCase() }
      });
      expect(updated.googleId).toBe(linkSub);

      spy.mockRestore();
    });
  });

  describe('2. Single-Use Cryptographic Password Reset Link Flow', () => {
    let extractedResetToken = '';

    it('POST /api/auth/forgot-password generates secure reset link for password account', async () => {
      clearSentEmailsStore();
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: localEmail });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const resetLink = getLatestResetLinkForEmail(localEmail);
      expect(resetLink).toBeDefined();
      expect(resetLink).toContain('/reset-password?token=');

      // Extract raw token from URL query string
      const url = new URL(resetLink);
      extractedResetToken = url.searchParams.get('token');
      expect(extractedResetToken).toBeDefined();
      expect(extractedResetToken.length).toBe(64); // 32 bytes in hex

      // Verify token in database is hashed (SHA-256)
      const dbTokens = await prisma.passwordResetToken.findMany({
        where: { user: { email: localEmail.toLowerCase() } }
      });
      expect(dbTokens.length).toBeGreaterThanOrEqual(1);
      // Plaintext token must NEVER be in DB
      expect(dbTokens.some(t => t.tokenHash === extractedResetToken)).toBe(false);
    });

    it('GET /api/auth/verify-reset-token validates a valid token', async () => {
      const res = await request(app)
        .get(`/api/auth/verify-reset-token?token=${extractedResetToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe(localEmail.toLowerCase());
    });

    it('GET /api/auth/verify-reset-token rejects an invalid token', async () => {
      const res = await request(app)
        .get('/api/auth/verify-reset-token?token=invalid_random_token_123456');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('INVALID_TOKEN');
    });

    it('POST /api/auth/reset-password rejects mismatched or short passwords', async () => {
      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: extractedResetToken,
          newPassword: 'short',
          confirmPassword: 'short'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('POST /api/auth/reset-password completes reset and invalidates existing sessions', async () => {
      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: extractedResetToken,
          newPassword: newPassword,
          confirmPassword: newPassword
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('Password reset successful');

      // Old session token should now be rejected due to incremented tokenVersion
      const oldSessionRes = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${localAuthToken}`);

      expect(oldSessionRes.status).toBe(401);
      expect(oldSessionRes.body.error).toBe('SESSION_INVALIDATED');

      // Token should now be single-use (marked used)
      const reuseRes = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: extractedResetToken,
          newPassword: 'AnotherPassword789!',
          confirmPassword: 'AnotherPassword789!'
        });

      expect(reuseRes.status).toBe(400);
      expect(reuseRes.body.error).toBe('TOKEN_ALREADY_USED');
    });

    it('POST /api/auth/login authenticates with new password and rejects old password', async () => {
      // Old password fails
      const failRes = await request(app)
        .post('/api/auth/login')
        .send({ email: localEmail, password: localPassword });
      expect(failRes.status).toBe(401);

      // New password succeeds
      const successRes = await request(app)
        .post('/api/auth/login')
        .send({ email: localEmail, password: newPassword });
      expect(successRes.status).toBe(200);
      expect(successRes.body.success).toBe(true);
      expect(successRes.body.data.token).toBeDefined();
    });
  });

  describe('3. Google OAuth 2.0 Authorization Code Flow & Callback Routes', () => {
    it('GET /api/auth/google/config returns public clientId and configured status', async () => {
      const res = await request(app).get('/api/auth/google/config');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.clientId).toBe(config.oauth.google.clientId);
      expect(res.body.data.redirectUri).toBe('http://localhost:5001/api/auth/google/callback');
      expect(res.body.data.isConfigured).toBe(true);
    });

    it('GET /api/auth/google initiates 302 redirect with exact redirect_uri and CSRF state', async () => {
      const res = await request(app).get('/api/auth/google');

      expect(res.status).toBe(302);
      expect(res.headers.location).toContain('https://accounts.google.com/o/oauth2/v2/auth');

      const url = new URL(res.headers.location);
      expect(url.searchParams.get('client_id')).toBe(config.oauth.google.clientId);
      expect(url.searchParams.get('redirect_uri')).toBe('http://localhost:5001/api/auth/google/callback');
      expect(url.searchParams.get('response_type')).toBe('code');
      expect(url.searchParams.get('scope')).toContain('openid');
      expect(url.searchParams.get('scope')).toContain('email');
      expect(url.searchParams.get('scope')).toContain('profile');

      const stateParam = url.searchParams.get('state');
      expect(stateParam).toBeDefined();
      const decodedState = jwt.verify(stateParam, config.jwtSecret);
      expect(decodedState.nonce).toBeDefined();
    });

    it('GET /api/auth/google?json=true returns authorization URL and redirect_uri', async () => {
      const res = await request(app).get('/api/auth/google?json=true');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.redirect_uri).toBe('http://localhost:5001/api/auth/google/callback');
      expect(res.body.data.url).toContain('redirect_uri=http%3A%2F%2Flocalhost%3A5001%2Fapi%2Fauth%2Fgoogle%2Fcallback');
    });

    it('GET /api/auth/google/callback redirects with error when user cancels or Google rejects', async () => {
      const res = await request(app).get('/api/auth/google/callback?error=access_denied');

      expect(res.status).toBe(302);
      expect(res.headers.location).toContain('/login?error=google_cancelled');
    });

    it('GET /api/auth/google/callback redirects with error when params are missing', async () => {
      const res = await request(app).get('/api/auth/google/callback');

      expect(res.status).toBe(302);
      expect(res.headers.location).toContain('/login?error=missing_oauth_params');
    });

    it('GET /api/auth/google/callback rejects invalid or tampered CSRF state', async () => {
      const res = await request(app).get('/api/auth/google/callback?code=mock_code&state=tampered_invalid_state');

      expect(res.status).toBe(302);
      expect(res.headers.location).toContain('/login?error=invalid_oauth_state');
    });

    it('GET /api/auth/google/callback exchanges code using exact redirect_uri, creates user and redirects to login with googleToken', async () => {
      const validState = jwt.sign(
        { nonce: 'callback_test_nonce', timestamp: Date.now() },
        config.jwtSecret,
        { expiresIn: '10m' }
      );

      let requestedRedirectUri = '';
      const axiosPostSpy = vi.spyOn(axios, 'post').mockImplementation(async (url, data) => {
        if (url === 'https://oauth2.googleapis.com/token') {
          const params = new URLSearchParams(data);
          requestedRedirectUri = params.get('redirect_uri');
          return {
            data: {
              id_token: 'mock_google_id_token_for_callback',
              access_token: 'mock_access_token'
            }
          };
        }
        return { data: {} };
      });

      const verifyTokenSpy = vi.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockResolvedValueOnce({
        getPayload: () => ({
          sub: redirectUserSub,
          email: redirectUserEmail,
          email_verified: true,
          name: 'Redirect Callback User',
          picture: 'https://lh3.googleusercontent.com/avatar_callback_test',
          iss: 'https://accounts.google.com'
        })
      });

      const res = await request(app).get(
        `/api/auth/google/callback?code=valid_auth_code_123&state=${encodeURIComponent(validState)}`
      );

      expect(res.status).toBe(302);
      expect(res.headers.location).toContain('/login?googleToken=');
      expect(requestedRedirectUri).toBe('http://localhost:5001/api/auth/google/callback');

      // Verify the new user is created in database
      const dbUser = await prisma.user.findUnique({
        where: { email: redirectUserEmail.toLowerCase() }
      });
      expect(dbUser).toBeDefined();
      expect(dbUser.googleId).toBe(redirectUserSub);
      expect(dbUser.credits).toBe(200);
      expect(dbUser.plan).toBe('FREE');
      expect(dbUser.registrationSource).toBe('GOOGLE_OAUTH');

      axiosPostSpy.mockRestore();
      verifyTokenSpy.mockRestore();
    });
  });
});
