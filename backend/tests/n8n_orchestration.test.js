import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import axios from 'axios';
import { app } from '../src/app.js';
import { prisma } from '../src/utils/prisma.js';
import { config } from '../src/config/index.js';

describe('n8n Cloud Orchestration & Publishing Job Lifecycle Suite', () => {
  let userToken = '';
  let userId = '';
  let fbAccountId = '';
  let liAccountId = '';
  let userBToken = '';
  let userBId = '';

  const INTERNAL_SECRET = config.n8nApiKey;

  beforeAll(async () => {
    // 1. Create User A
    const resA = await request(app).post('/api/auth/register').send({
      name: 'Orchestration User A',
      email: `orch_user_a_${Date.now()}@socialflow.ai`,
      password: 'Password123!',
      confirmPassword: 'Password123!'
    });
    userToken = resA.body.data.token;
    userId = resA.body.data.user.id;

    // 2. Create User B (for isolation test)
    const resB = await request(app).post('/api/auth/register').send({
      name: 'Orchestration User B',
      email: `orch_user_b_${Date.now()}@socialflow.ai`,
      password: 'Password123!',
      confirmPassword: 'Password123!'
    });
    userBToken = resB.body.data.token;
    userBId = resB.body.data.user.id;

    // 3. Create Facebook and LinkedIn accounts for User A
    const fb = await prisma.socialAccount.create({
      data: {
        userId,
        platform: 'FACEBOOK',
        platformUserId: 'fb_orch_111',
        accountName: 'Orchestration FB Page',
        accessToken: 'EAAB_orch_fb_token',
        status: 'CONNECTED',
        rawProfileData: JSON.stringify({ pageId: 'fb_orch_111', pageAccessToken: 'EAAB_orch_fb_token' })
      }
    });
    fbAccountId = fb.id;

    const li = await prisma.socialAccount.create({
      data: {
        userId,
        platform: 'LINKEDIN',
        platformUserId: 'li_orch_222',
        accountName: 'Orchestration LinkedIn Member',
        accessToken: 'li_orch_access_token',
        status: 'CONNECTED'
      }
    });
    liAccountId = li.id;
  });

  afterAll(async () => {
    await prisma.publishingJob.deleteMany({
      where: { post: { userId: { in: [userId, userBId] } } }
    });
    await prisma.postPlatform.deleteMany({
      where: { post: { userId: { in: [userId, userBId] } } }
    });
    await prisma.post.deleteMany({
      where: { userId: { in: [userId, userBId] } }
    });
    await prisma.socialAccount.deleteMany({
      where: { userId: { in: [userId, userBId] } }
    });
    await prisma.user.deleteMany({
      where: { id: { in: [userId, userBId] } }
    });
  });

  // =========================================================================
  // 1. NO SILENT DIRECT FALLBACK (n8n UNREACHABLE HANDLING)
  // =========================================================================
  it('When n8n webhook is unreachable, sets PublishingJob and Post to FAILED with actionable error without silent direct publish', async () => {
    const prevMode = config.orchestrationMode;
    config.orchestrationMode = 'n8n';

    // Mock axios.post to simulate n8n network timeout/refusal
    const postSpy = vi.spyOn(axios, 'post').mockImplementation(async (url) => {
      if (url.includes('webhook') || url.includes('5678') || url === config.n8nWebhookUrl) {
        const err = new Error('ECONNREFUSED: Unable to reach n8n Cloud webhook');
        err.code = 'ECONNREFUSED';
        throw err;
      }
      return { data: {} };
    });

    const res = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        caption: 'Testing n8n outage resilience',
        platforms: [{ platform: 'FACEBOOK', socialAccountId: fbAccountId }]
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);

    const postId = res.body.data.id;
    // Status must be FAILED, NOT PUBLISHED!
    expect(res.body.data.status).toBe('FAILED');

    // Verify PublishingJob in database
    const job = await prisma.publishingJob.findFirst({
      where: { postId }
    });
    expect(job).not.toBeNull();
    expect(job.status).toBe('FAILED');
    expect(job.errorMessage).toContain('n8n webhook error');

    // Verify postPlatform in database has actionable error
    const postPlatform = await prisma.postPlatform.findFirst({
      where: { postId }
    });
    expect(postPlatform.status).toBe('FAILED');
    expect(postPlatform.errorMessage).toContain('Verify n8n webhook and click Retry');

    postSpy.mockRestore();
    config.orchestrationMode = prevMode;
  });

  // =========================================================================
  // 2. SUCCESSFUL n8n WEBHOOK DISPATCH & JOB TRACKING
  // =========================================================================
  it('Dispatches job to n8n Cloud webhook with security headers and creates QUEUED/PROCESSING PublishingJob', async () => {
    let capturedWebhookCall = null;
    const postSpy = vi.spyOn(axios, 'post').mockImplementation(async (url, data, conf) => {
      if (url.includes('webhook') || url.includes('5678') || url === config.n8nWebhookUrl) {
        capturedWebhookCall = { url, data, conf };
        return {
          status: 200,
          data: { executionId: 'n8n_exec_998877', status: 'RECEIVED' }
        };
      }
      return { data: {} };
    });

    const res = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        caption: 'Post orchestrating via n8n',
        platforms: [
          { platform: 'FACEBOOK', socialAccountId: fbAccountId },
          { platform: 'LINKEDIN', socialAccountId: liAccountId }
        ]
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('PUBLISHING');

    const postId = res.body.data.id;

    // Verify webhook was called with proper headers and payload
    expect(capturedWebhookCall).not.toBeNull();
    expect(capturedWebhookCall.conf.headers['x-socialflow-secret']).toBe(INTERNAL_SECRET);
    expect(capturedWebhookCall.conf.headers['x-job-id']).toBeDefined();
    expect(capturedWebhookCall.conf.headers['x-idempotency-key']).toBeDefined();
    expect(capturedWebhookCall.data.postId).toBe(postId);
    expect(capturedWebhookCall.data.platforms).toHaveLength(2);

    // Verify PublishingJob in database
    const job = await prisma.publishingJob.findFirst({
      where: { postId }
    });
    expect(job).not.toBeNull();
    expect(job.status).toBe('PROCESSING');
    expect(job.executionId).toBe('n8n_exec_998877');

    postSpy.mockRestore();
  });

  // =========================================================================
  // 3. INTERNAL ENDPOINT: GET /api/posts/internal/:id
  // =========================================================================
  describe('Internal Endpoint: GET /api/posts/internal/:id', () => {
    let testPostId = '';

    beforeAll(async () => {
      const post = await prisma.post.create({
        data: {
          userId,
          caption: 'Authoritative data for n8n execution',
          status: 'PUBLISHING',
          platforms: {
            create: [
              { platform: 'FACEBOOK', socialAccountId: fbAccountId, status: 'PUBLISHING' }
            ]
          }
        }
      });
      testPostId = post.id;
    });

    it('Rejects requests missing or having invalid x-socialflow-secret', async () => {
      // Missing header
      const resNoAuth = await request(app)
        .get(`/api/posts/internal/${testPostId}`);
      expect(resNoAuth.status).toBe(401);
      expect(resNoAuth.body.error).toBe('INVALID_CALLBACK_SECRET');

      // Invalid header
      const resBadAuth = await request(app)
        .get(`/api/posts/internal/${testPostId}`)
        .set('x-socialflow-secret', 'wrong-secret');
      expect(resBadAuth.status).toBe(401);
      expect(resBadAuth.body.error).toBe('INVALID_CALLBACK_SECRET');
    });

    it('Returns complete post with accounts and ensures raw tokens are not leaked to n8n logs', async () => {
      const res = await request(app)
        .get(`/api/posts/internal/${testPostId}`)
        .set('x-socialflow-secret', INTERNAL_SECRET);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(testPostId);
      expect(res.body.data.caption).toBe('Authoritative data for n8n execution');
      expect(res.body.data.platforms).toHaveLength(1);
      expect(res.body.data.platforms[0].socialAccount.id).toBe(fbAccountId);
      // Access tokens must NOT be exposed in n8n execution logs
      expect(res.body.data.platforms[0].socialAccount.accessToken).toBeUndefined();
    });
  });

  // =========================================================================
  // 4. INTERNAL ENDPOINT: POST /api/posts/internal/:id/publish-platform
  // =========================================================================
  describe('Internal Endpoint: POST /api/posts/internal/:id/publish-platform', () => {
    let testPostId = '';

    beforeAll(async () => {
      const post = await prisma.post.create({
        data: {
          userId,
          caption: 'Targeted single platform publish via n8n router',
          status: 'PUBLISHING',
          platforms: {
            create: [
              { platform: 'FACEBOOK', socialAccountId: fbAccountId, status: 'PUBLISHING' }
            ]
          }
        }
      });
      testPostId = post.id;
    });

    it('Rejects unauthenticated internal calls', async () => {
      const res = await request(app)
        .post(`/api/posts/internal/${testPostId}/publish-platform`)
        .send({ platform: 'FACEBOOK' });
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('INVALID_CALLBACK_SECRET');
    });

    it('Executes platform publishing and updates platform record', async () => {
      const postSpy = vi.spyOn(axios, 'post').mockImplementation(async (url) => {
        if (url.includes('graph.facebook.com')) {
          return { data: { id: 'fb_real_platform_post_777' } };
        }
        return { data: {} };
      });

      const res = await request(app)
        .post(`/api/posts/internal/${testPostId}/publish-platform`)
        .set('x-socialflow-secret', INTERNAL_SECRET)
        .send({ platform: 'FACEBOOK' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('PUBLISHED');
      expect(res.body.data.platformPostId).toBe('fb_real_platform_post_777');

      // Verify postPlatform in database
      const pp = await prisma.postPlatform.findFirst({
        where: { postId: testPostId, platform: 'FACEBOOK' }
      });
      expect(pp.status).toBe('PUBLISHED');
      expect(pp.platformPostId).toBe('fb_real_platform_post_777');

      postSpy.mockRestore();
    });
  });

  // =========================================================================
  // 5. CALLBACK ENDPOINT & IDEMPOTENCY: POST /api/posts/:id/publish-result
  // =========================================================================
  describe('Publishing Callback Endpoint: POST /api/posts/:id/publish-result', () => {
    let callbackPostId = '';
    let fbPlatformId = '';
    let liPlatformId = '';

    beforeAll(async () => {
      const post = await prisma.post.create({
        data: {
          userId,
          caption: 'Callback verification post',
          status: 'PUBLISHING',
          platforms: {
            create: [
              { platform: 'FACEBOOK', socialAccountId: fbAccountId, status: 'PUBLISHING' },
              { platform: 'LINKEDIN', socialAccountId: liAccountId, status: 'PUBLISHING' }
            ]
          }
        },
        include: { platforms: true }
      });
      callbackPostId = post.id;
      fbPlatformId = post.platforms.find(p => p.platform === 'FACEBOOK').id;
      liPlatformId = post.platforms.find(p => p.platform === 'LINKEDIN').id;

      await prisma.publishingJob.create({
        data: {
          jobId: `job_${callbackPostId}`,
          idempotencyKey: `idem_${callbackPostId}`,
          postId: callbackPostId,
          status: 'PROCESSING'
        }
      });
    });

    it('Rejects callback without valid x-socialflow-secret', async () => {
      const res = await request(app)
        .post(`/api/posts/${callbackPostId}/publish-result`)
        .send({
          executionId: 'exec_callback_test',
          results: []
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('INVALID_CALLBACK_SECRET');
    });

    it('Processes callback, records executionId and updates multi-platform results', async () => {
      const res = await request(app)
        .post(`/api/posts/${callbackPostId}/publish-result`)
        .set('x-socialflow-secret', INTERNAL_SECRET)
        .send({
          executionId: 'exec_callback_success_123',
          results: [
            {
              platform: 'FACEBOOK',
              status: 'PUBLISHED',
              platformPostId: 'fb_callback_id_555'
            },
            {
              platform: 'LINKEDIN',
              status: 'FAILED',
              errorMessage: 'LinkedIn API: Rate limit exceeded'
            }
          ]
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('PARTIALLY_PUBLISHED');

      // Verify overall post status
      const updatedPost = await prisma.post.findUnique({
        where: { id: callbackPostId },
        include: { platforms: true }
      });
      expect(updatedPost.status).toBe('PARTIALLY_PUBLISHED');

      // Verify individual platforms
      const fb = updatedPost.platforms.find(p => p.platform === 'FACEBOOK');
      expect(fb.status).toBe('PUBLISHED');
      expect(fb.platformPostId).toBe('fb_callback_id_555');

      const li = updatedPost.platforms.find(p => p.platform === 'LINKEDIN');
      expect(li.status).toBe('FAILED');
      expect(li.errorMessage).toBe('LinkedIn API: Rate limit exceeded');

      // Verify PublishingJob updated
      const job = await prisma.publishingJob.findFirst({
        where: { postId: callbackPostId }
      });
      expect(job.status).toBe('PARTIALLY_PUBLISHED');
      expect(job.executionId).toBe('exec_callback_success_123');
    });

    it('Is idempotent on duplicate callback deliveries', async () => {
      const resDuplicate = await request(app)
        .post(`/api/posts/${callbackPostId}/publish-result`)
        .set('x-socialflow-secret', INTERNAL_SECRET)
        .send({
          executionId: 'exec_callback_success_123',
          results: [
            {
              platform: 'FACEBOOK',
              status: 'PUBLISHED',
              platformPostId: 'fb_callback_id_555'
            },
            {
              platform: 'LINKEDIN',
              status: 'FAILED',
              errorMessage: 'LinkedIn API: Rate limit exceeded'
            }
          ]
        });

      expect(resDuplicate.status).toBe(200);
      expect(resDuplicate.body.success).toBe(true);
      expect(resDuplicate.body.data.status).toBe('PARTIALLY_PUBLISHED');
    });
  });
});
