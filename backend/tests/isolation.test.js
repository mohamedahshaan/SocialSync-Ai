import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/utils/prisma.js';

describe('User Data Isolation & Multi-Tenant Security Suite', () => {
  let userAToken = '';
  let userBToken = '';
  let userAId = '';
  let userBId = '';
  let userASocialAccountId = '';
  let userAPostId = '';

  beforeAll(async () => {
    // 1. Create User A
    const resA = await request(app).post('/api/auth/register').send({
      name: 'User Alpha',
      email: `alpha_${Date.now()}@socialflow.ai`,
      password: 'Password123!',
      confirmPassword: 'Password123!'
    });
    userAToken = resA.body.data.token;
    userAId = resA.body.data.user.id;

    // 2. Create User B
    const resB = await request(app).post('/api/auth/register').send({
      name: 'User Beta',
      email: `beta_${Date.now()}@socialflow.ai`,
      password: 'Password123!',
      confirmPassword: 'Password123!'
    });
    userBToken = resB.body.data.token;
    userBId = resB.body.data.user.id;

    // 3. Directly create a SocialAccount for User A
    const accountA = await prisma.socialAccount.create({
      data: {
        userId: userAId,
        platform: 'FACEBOOK',
        platformUserId: 'fb_123456',
        accountName: 'Alpha Facebook Page',
        accountUsername: 'alpha_page',
        accessToken: 'dummy_alpha_token',
        status: 'CONNECTED'
      }
    });
    userASocialAccountId = accountA.id;

    // 4. Create a Post for User A
    const postA = await prisma.post.create({
      data: {
        userId: userAId,
        caption: 'Alpha secret post',
        status: 'FAILED',
        platforms: {
          create: {
            socialAccountId: userASocialAccountId,
            platform: 'FACEBOOK',
            status: 'FAILED',
            errorMessage: 'Token expired'
          }
        }
      }
    });
    userAPostId = postA.id;
  });

  afterAll(async () => {
    // Cleanup users (cascades to posts and social accounts)
    await prisma.user.deleteMany({
      where: {
        id: { in: [userAId, userBId] }
      }
    });
  });

  it("CRITICAL: User B CANNOT view User A's social accounts", async () => {
    const res = await request(app)
      .get('/api/social-accounts')
      .set('Authorization', `Bearer ${userBToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // User B must have 0 accounts
    expect(res.body.data).toHaveLength(0);
    // User A's account must not be present
    const containsA = res.body.data.some(acc => acc.id === userASocialAccountId);
    expect(containsA).toBe(false);
  });

  it("CRITICAL: User B CANNOT delete User A's social account", async () => {
    const res = await request(app)
      .delete(`/api/social-accounts/${userASocialAccountId}`)
      .set('Authorization', `Bearer ${userBToken}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('ACCOUNT_NOT_FOUND');

    // Verify account still exists for User A
    const accountStillExists = await prisma.socialAccount.findUnique({
      where: { id: userASocialAccountId }
    });
    expect(accountStillExists).not.toBeNull();
  });

  it("CRITICAL: User B CANNOT view User A's post by ID", async () => {
    const res = await request(app)
      .get(`/api/posts/${userAPostId}`)
      .set('Authorization', `Bearer ${userBToken}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('POST_NOT_FOUND');
  });

  it("CRITICAL: User B CANNOT see User A's posts in post listing", async () => {
    const res = await request(app)
      .get('/api/posts')
      .set('Authorization', `Bearer ${userBToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.posts).toHaveLength(0);
  });

  it("CRITICAL: User B CANNOT retry User A's post", async () => {
    const res = await request(app)
      .post(`/api/posts/${userAPostId}/retry`)
      .set('Authorization', `Bearer ${userBToken}`);

    // Must be rejected with 404 or 403 or error
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.body.success).toBe(false);
  });

  it("CRITICAL: User B CANNOT create a post hijacking User A's social account", async () => {
    const res = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${userBToken}`)
      .send({
        caption: "Trying to post to User A's Facebook",
        platforms: [
          {
            platform: 'FACEBOOK',
            socialAccountId: userASocialAccountId
          }
        ]
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('FORBIDDEN_ACCOUNT_ACCESS');
  });
});
