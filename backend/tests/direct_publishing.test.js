import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import axios from 'axios';
import { app } from '../src/app.js';
import { prisma } from '../src/utils/prisma.js';

describe('Direct Node.js Multi-Platform Publishing & Partial Failure Suite', () => {
  let userToken = '';
  let userId = '';
  let fbAccountId = '';
  let liAccountId = '';

  const FB_PAGE_ID = 'fb_page_direct_101';
  const FB_TOKEN = 'EAAB_direct_fb_token';
  const LI_MEMBER_ID = 'li_member_direct_202';
  const LI_TOKEN = 'AQX_direct_li_token';

  beforeAll(async () => {
    // 1. Register test user
    const res = await request(app).post('/api/auth/register').send({
      name: 'Direct Publishing Tester',
      email: `direct_pub_${Date.now()}@socialflow.ai`,
      password: 'Password123!',
      confirmPassword: 'Password123!'
    });
    userToken = res.body.data.token;
    userId = res.body.data.user.id;

    // 2. Connect Facebook account
    const fb = await prisma.socialAccount.create({
      data: {
        userId,
        platform: 'FACEBOOK',
        platformUserId: FB_PAGE_ID,
        accountName: 'Direct FB Page',
        accountUsername: 'direct_fb_page',
        accessToken: FB_TOKEN,
        status: 'CONNECTED'
      }
    });
    fbAccountId = fb.id;

    // 3. Connect LinkedIn account
    const li = await prisma.socialAccount.create({
      data: {
        userId,
        platform: 'LINKEDIN',
        platformUserId: LI_MEMBER_ID,
        accountName: 'Direct LinkedIn Member',
        accountUsername: 'direct_li_member',
        accessToken: LI_TOKEN,
        status: 'CONNECTED'
      }
    });
    liAccountId = li.id;
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.postPlatform.deleteMany({
      where: { post: { userId } }
    });
    await prisma.post.deleteMany({
      where: { userId }
    });
    await prisma.socialAccount.deleteMany({
      where: { userId }
    });
    await prisma.user.deleteMany({
      where: { id: userId }
    });
  });

  // =========================================================================
  // 1. DIRECT MULTI-PLATFORM SUCCESS (React -> Express -> publishingService -> Providers)
  // =========================================================================
  it('Direct publishing invokes Facebook and LinkedIn providers directly and sets status to PUBLISHED', async () => {
    const apiCalls = { facebook: 0, linkedin: 0 };

    const postSpy = vi.spyOn(axios, 'post').mockImplementation(async (url, data, conf) => {
      if (url.includes('graph.facebook.com')) {
        apiCalls.facebook++;
        return { data: { id: 'fb_live_post_12345' } };
      }
      if (url.includes('api.linkedin.com/rest/posts')) {
        apiCalls.linkedin++;
        return {
          headers: { 'x-restli-id': 'urn:li:share:987654321' },
          data: { id: 'urn:li:share:987654321' }
        };
      }
      throw new Error(`Unexpected URL called: ${url}`);
    });

    const res = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        caption: 'Hello from direct publishing!',
        platforms: [
          { platform: 'FACEBOOK', socialAccountId: fbAccountId },
          { platform: 'LINKEDIN', socialAccountId: liAccountId }
        ]
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('PUBLISHED');

    const postId = res.body.data.id;

    // Verify both providers were called directly via Node.js
    expect(apiCalls.facebook).toBe(1);
    expect(apiCalls.linkedin).toBe(1);

    // Verify platform delivery records in database
    const platforms = await prisma.postPlatform.findMany({
      where: { postId }
    });
    expect(platforms).toHaveLength(2);

    const fbTarget = platforms.find(p => p.platform === 'FACEBOOK');
    expect(fbTarget.status).toBe('PUBLISHED');
    expect(fbTarget.platformPostId).toBe('fb_live_post_12345');

    const liTarget = platforms.find(p => p.platform === 'LINKEDIN');
    expect(liTarget.status).toBe('PUBLISHED');
    expect(liTarget.platformPostId).toBe('urn:li:share:987654321');

    postSpy.mockRestore();
  });

  // =========================================================================
  // 2. PARTIAL FAILURE: Facebook SUCCEEDS, LinkedIn FAILS
  // =========================================================================
  it('When Facebook succeeds and LinkedIn fails, Facebook remains PUBLISHED and LinkedIn is marked FAILED', async () => {
    const postSpy = vi.spyOn(axios, 'post').mockImplementation(async (url, data, conf) => {
      if (url.includes('graph.facebook.com')) {
        return { data: { id: 'fb_success_post_777' } };
      }
      if (url.includes('api.linkedin.com')) {
        const error = new Error('LinkedIn API rate limit exceeded');
        error.response = {
          data: { message: 'Throttle limit reached on /rest/posts' }
        };
        throw error;
      }
      throw new Error(`Unexpected URL: ${url}`);
    });

    const res = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        caption: 'Testing partial failure isolation',
        platforms: [
          { platform: 'FACEBOOK', socialAccountId: fbAccountId },
          { platform: 'LINKEDIN', socialAccountId: liAccountId }
        ]
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('PARTIALLY_PUBLISHED');

    const postId = res.body.data.id;

    // Verify Facebook is PUBLISHED and LinkedIn is FAILED in database
    const platforms = await prisma.postPlatform.findMany({
      where: { postId }
    });

    const fbTarget = platforms.find(p => p.platform === 'FACEBOOK');
    expect(fbTarget.status).toBe('PUBLISHED');
    expect(fbTarget.platformPostId).toBe('fb_success_post_777');

    const liTarget = platforms.find(p => p.platform === 'LINKEDIN');
    expect(liTarget.status).toBe('FAILED');
    expect(liTarget.errorMessage).toContain('Throttle limit reached');

    postSpy.mockRestore();
  });

  // =========================================================================
  // 3. RETRY FLOW: Retrying does NOT re-publish already succeeded platforms
  // =========================================================================
  it('Retrying a failed platform retries ONLY the failed platform and never duplicates succeeded platforms', async () => {
    // 1. Create a partially published post
    const post = await prisma.post.create({
      data: {
        userId,
        caption: 'Post to test retry isolation',
        status: 'PARTIALLY_PUBLISHED',
        platforms: {
          create: [
            {
              platform: 'FACEBOOK',
              socialAccountId: fbAccountId,
              status: 'PUBLISHED',
              platformPostId: 'fb_original_successful_id',
              publishedAt: new Date()
            },
            {
              platform: 'LINKEDIN',
              socialAccountId: liAccountId,
              status: 'FAILED',
              errorMessage: 'Temporary network disconnect'
            }
          ]
        }
      },
      include: { platforms: true }
    });

    const fbPlatformBefore = post.platforms.find(p => p.platform === 'FACEBOOK');
    const liPlatformBefore = post.platforms.find(p => p.platform === 'LINKEDIN');

    // 2. Mock axios: LinkedIn succeeds on retry, Facebook MUST NOT BE CALLED
    let fbCalledOnRetry = false;
    let liCalledOnRetry = false;

    const postSpy = vi.spyOn(axios, 'post').mockImplementation(async (url, data, conf) => {
      if (url.includes('graph.facebook.com')) {
        fbCalledOnRetry = true;
        return { data: { id: 'fb_duplicate_should_not_happen' } };
      }
      if (url.includes('api.linkedin.com')) {
        liCalledOnRetry = true;
        return {
          headers: { 'x-restli-id': 'urn:li:share:retry_recovered_123' },
          data: { id: 'urn:li:share:retry_recovered_123' }
        };
      }
      throw new Error(`Unexpected URL: ${url}`);
    });

    // 3. Trigger Retry endpoint
    const retryRes = await request(app)
      .post(`/api/posts/${post.id}/retry`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(retryRes.status).toBe(200);
    expect(retryRes.body.success).toBe(true);

    // Verify Facebook was NEVER called during retry
    expect(fbCalledOnRetry).toBe(false);
    expect(liCalledOnRetry).toBe(true);

    // Verify Facebook remains untouched with original ID
    const fbAfter = await prisma.postPlatform.findUnique({
      where: { id: fbPlatformBefore.id }
    });
    expect(fbAfter.status).toBe('PUBLISHED');
    expect(fbAfter.platformPostId).toBe('fb_original_successful_id');

    // Verify LinkedIn is now PUBLISHED with new recovered ID
    const liAfter = await prisma.postPlatform.findUnique({
      where: { id: liPlatformBefore.id }
    });
    expect(liAfter.status).toBe('PUBLISHED');
    expect(liAfter.platformPostId).toBe('urn:li:share:retry_recovered_123');

    // Verify composite post status transitioned to PUBLISHED
    const updatedPost = await prisma.post.findUnique({
      where: { id: post.id }
    });
    expect(updatedPost.status).toBe('PUBLISHED');

    postSpy.mockRestore();
  });
});
