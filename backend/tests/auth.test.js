import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/utils/prisma.js';

describe('Authentication & Authorization Suite', () => {
  const testEmail = `testuser_${Date.now()}@socialflow.ai`;
  const testPassword = 'StrongPassword123!';
  let authToken = '';

  afterAll(async () => {
    // Cleanup created test user
    await prisma.user.deleteMany({
      where: { email: { contains: 'testuser_' } }
    });
  });

  it('GET /api/health should return 200 and running message', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('SocialFlow AI API is running');
  });

  it('POST /api/auth/register should reject missing or invalid fields', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'A', // too short
        email: 'invalid-email',
        password: '123', // too short
        confirmPassword: '456' // mismatch
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });

  it('POST /api/auth/register should successfully register a new user', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'SocialFlow Tester',
        email: testEmail,
        password: testPassword,
        confirmPassword: testPassword
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(testEmail.toLowerCase());
    expect(res.body.data.user).not.toHaveProperty('passwordHash');
    expect(res.body.data.token).toBeDefined();

    authToken = res.body.data.token;
  });

  it('POST /api/auth/register should reject duplicate email', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Duplicate Tester',
        email: testEmail,
        password: testPassword,
        confirmPassword: testPassword
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('EMAIL_ALREADY_EXISTS');
  });

  it('POST /api/auth/login should authenticate valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testEmail,
        password: testPassword
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user).not.toHaveProperty('passwordHash');
  });

  it('POST /api/auth/login should reject incorrect password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testEmail,
        password: 'WrongPassword999'
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('INVALID_CREDENTIALS');
  });

  it('GET /api/auth/me should reject request without token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('UNAUTHORIZED');
  });

  it('GET /api/auth/me should return authenticated user profile with valid token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(testEmail.toLowerCase());
  });
});
