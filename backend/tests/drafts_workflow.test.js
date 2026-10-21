import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import axios from 'axios';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { app } from '../src/app.js';
import { prisma } from '../src/utils/prisma.js';
import { config } from '../src/config/index.js';
import { platformRateService, DEFAULT_PLATFORM_RATES } from '../src/services/platformRateService.js';
import { getProvider } from '../src/services/social/index.js';

describe('Drafts System & Workflow Verification Suite', () => {
  let userA;
  let tokenA;
  let userB;
  let tokenB;

  let fbAccountUserA;
  let liAccountUserA;
  let fbAccountUserB;

  beforeAll(async () => {
    // 1. Ensure platform rates are seeded and reset to default
    await platformRateService.seedPlatformRatesIfEmpty();
    for (const [platform, defaultCost] of Object.entries(DEFAULT_PLATFORM_RATES)) {
      await prisma.platformCreditConfig.upsert({
        where: { platform },
        update: { costCredits: defaultCost },
        create: { platform, costCredits: defaultCost }
      });
    }

    const passwordHash = await bcrypt.hash('SecureDraftPass2026!', 10);

    // 2. Setup User A
    userA = await prisma.user.create({
      data: {
        name: 'User A Draft Tester',
        email: `draft_user_a_${Date.now()}@socialsync.ai`,
        passwordHash,
        role: 'USER',
        status: 'ACTIVE',
        plan: 'CREATOR',
        credits: 100
      }
    });

    tokenA = jwt.sign(
      { userId: userA.id, email: userA.email, role: 'USER', name: userA.name, tokenVersion: userA.tokenVersion || 0 },
      config.jwtSecret,
      { expiresIn: '2h' }
    );

    // 3. Setup User B
    userB = await prisma.user.create({
      data: {
        name: 'User B Draft Tester',
        email: `draft_user_b_${Date.now()}@socialsync.ai`,
        passwordHash,
        role: 'USER',
        status: 'ACTIVE',
        plan: 'FREE',
        credits: 50
      }
    });

    tokenB = jwt.sign(
      { userId: userB.id, email: userB.email, role: 'USER', name: userB.name, tokenVersion: userB.tokenVersion || 0 },
      config.jwtSecret,
      { expiresIn: '2h' }
    );

    // 4. Create connected social accounts for User A
    fbAccountUserA = await prisma.socialAccount.create({
      data: {
        userId: userA.id,
        platform: 'FACEBOOK',
        platformUserId: 'fb_user_a_123',
        accountName: 'User A Facebook Page',
        accountUsername: 'usera_fb',
        accessToken: 'EAAB_mock_user_a_token'
      }
    });

    liAccountUserA = await prisma.socialAccount.create({
      data: {
        userId: userA.id,
        platform: 'LINKEDIN',
        platformUserId: 'li_user_a_123',
        accountName: 'User A LinkedIn Profile',
        accountUsername: 'usera_li',
        accessToken: 'li_mock_user_a_token'
      }
    });

    // 5. Create connected social account for User B
    fbAccountUserB = await prisma.socialAccount.create({
      data: {
        userId: userB.id,
        platform: 'FACEBOOK',
        platformUserId: 'fb_user_b_456',
        accountName: 'User B Facebook Page',
        accountUsername: 'userb_fb',
        accessToken: 'EAAB_mock_user_b_token'
      }
    });
  });

  afterAll(async () => {
    // Cleanup created test records
    await prisma.postPlatform.deleteMany({
      where: { post: { userId: { in: [userA?.id, userB?.id].filter(Boolean) } } }
    });
    await prisma.post.deleteMany({
      where: { userId: { in: [userA?.id, userB?.id].filter(Boolean) } }
    });
    await prisma.creditTransaction.deleteMany({
      where: { userId: { in: [userA?.id, userB?.id].filter(Boolean) } }
    });
    await prisma.socialAccount.deleteMany({
      where: { userId: { in: [userA?.id, userB?.id].filter(Boolean) } }
    });
    if (userA) await prisma.user.delete({ where: { id: userA.id } });
    if (userB) await prisma.user.delete({ where: { id: userB.id } });
  });

  // =========================================================================
  // SCENARIO 1: Saving Incomplete Draft (Caption only, 0 platforms)
  // =========================================================================
  it('1. Can save an incomplete draft with caption only and 0 platforms, without deducting credits', async () => {
    const userBefore = await prisma.user.findUnique({ where: { id: userA.id } });
    const creditsBefore = userBefore.credits;

    const res = await request(app)
      .post('/api/posts/draft')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        caption: 'Incomplete draft with thoughts on AI...',
        platforms: []
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.status).toBe('DRAFT');
    expect(res.body.data.caption).toBe('Incomplete draft with thoughts on AI...');
    expect(res.body.data.platforms.length).toBe(0);

    // Verify 0 credits deducted
    const userAfter = await prisma.user.findUnique({ where: { id: userA.id } });
    expect(userAfter.credits).toBe(creditsBefore);

    // Verify database record
    const dbPost = await prisma.post.findUnique({ where: { id: res.body.data.id } });
    expect(dbPost.status).toBe('DRAFT');
    expect(dbPost.userId).toBe(userA.id);
  });

  // =========================================================================
  // SCENARIO 2: Saving Incomplete Draft (Platforms only, empty caption)
  // =========================================================================
  it('2. Can save an incomplete draft with selected platforms but empty caption, without deducting credits', async () => {
    const userBefore = await prisma.user.findUnique({ where: { id: userA.id } });
    const creditsBefore = userBefore.credits;

    const res = await request(app)
      .post('/api/posts/draft')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        caption: '',
        platforms: [
          { platform: 'FACEBOOK', socialAccountId: fbAccountUserA.id }
        ]
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('DRAFT');
    expect(res.body.data.caption).toBe('');
    expect(res.body.data.platforms.length).toBe(1);

    // Verify credits remained untouched
    const userAfter = await prisma.user.findUnique({ where: { id: userA.id } });
    expect(userAfter.credits).toBe(creditsBefore);
  });

  // =========================================================================
  // SCENARIO 3: Saving Draft with Media References (Collage/Multiple media)
  // =========================================================================
  it('3. Saves draft with multiple media references and target platforms', async () => {
    const mediaUrls = [
      'https://example.com/uploads/photo1.jpg',
      'https://example.com/uploads/photo2.jpg'
    ];

    const res = await request(app)
      .post('/api/posts/draft')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        caption: 'Draft with multi-image collage assets',
        mediaUrls,
        mediaType: 'IMAGE',
        platforms: [
          { platform: 'FACEBOOK', socialAccountId: fbAccountUserA.id },
          { platform: 'LINKEDIN', socialAccountId: liAccountUserA.id }
        ]
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('DRAFT');
    expect(res.body.data.mediaUrls).toEqual(mediaUrls);
    expect(res.body.data.mediaType).toBe('IMAGE');
    expect(res.body.data.platforms.length).toBe(2);

    // Verify stored in PostgreSQL
    const dbPost = await prisma.post.findUnique({
      where: { id: res.body.data.id },
      include: { platforms: true }
    });
    expect(dbPost.mediaUrl).toBe(mediaUrls.join(','));
    expect(dbPost.platforms.length).toBe(2);
  });

  // =========================================================================
  // SCENARIO 4: Updating an Existing Draft without Creating Duplicates
  // =========================================================================
  it('4. Updating an existing draft modifies that draft without creating duplicate records', async () => {
    // 1. Create initial draft
    const initialRes = await request(app)
      .post('/api/posts/draft')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        caption: 'Version 1 of draft',
        platforms: [{ platform: 'FACEBOOK', socialAccountId: fbAccountUserA.id }]
      });

    const draftId = initialRes.body.data.id;

    const countBefore = await prisma.post.count({ where: { userId: userA.id } });

    // 2. Update the draft using draftId
    const updateRes = await request(app)
      .post('/api/posts/draft')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        draftId,
        caption: 'Version 2 updated draft caption with new ideas!',
        platforms: [
          { platform: 'FACEBOOK', socialAccountId: fbAccountUserA.id },
          { platform: 'LINKEDIN', socialAccountId: liAccountUserA.id }
        ]
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.success).toBe(true);
    expect(updateRes.body.data.id).toBe(draftId); // Must be the EXACT same ID!
    expect(updateRes.body.data.caption).toBe('Version 2 updated draft caption with new ideas!');
    expect(updateRes.body.data.platforms.length).toBe(2);

    // Verify post count did NOT increase (no duplicate created!)
    const countAfter = await prisma.post.count({ where: { userId: userA.id } });
    expect(countAfter).toBe(countBefore);
  });

  // =========================================================================
  // SCENARIO 5: Strict User Ownership Enforcement
  // =========================================================================
  it('5. User B cannot access, modify, publish, or delete User A draft', async () => {
    // Create draft owned by User A
    const draftRes = await request(app)
      .post('/api/posts/draft')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ caption: 'User A secret draft' });

    const draftId = draftRes.body.data.id;

    // 1. User B tries to view User A's draft
    const getRes = await request(app)
      .get(`/api/posts/${draftId}`)
      .set('Authorization', `Bearer ${tokenB}`);
    expect(getRes.status).toBe(404);

    // 2. User B tries to update User A's draft
    const updateRes = await request(app)
      .post('/api/posts/draft')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({
        draftId,
        caption: 'Hacked by User B'
      });
    expect(updateRes.status).toBe(404);

    // 3. User B tries to delete User A's draft
    const delRes = await request(app)
      .delete(`/api/posts/${draftId}`)
      .set('Authorization', `Bearer ${tokenB}`);
    expect(delRes.status).toBe(404);

    // Verify User A's draft is intact
    const checkDb = await prisma.post.findUnique({ where: { id: draftId } });
    expect(checkDb.caption).toBe('User A secret draft');
    expect(checkDb.userId).toBe(userA.id);
  });

  // =========================================================================
  // SCENARIO 6: Reopening a Draft Restores Content and Media References
  // =========================================================================
  it('6. Reopening draft via GET /api/posts/:id returns full content, mediaUrls, and platforms for restoration', async () => {
    const mediaUrls = ['https://cdn.socialsync.ai/sample1.png', 'https://cdn.socialsync.ai/sample2.png'];

    const draft = await prisma.post.create({
      data: {
        userId: userA.id,
        caption: 'Draft ready to be reopened with all details',
        mediaUrl: mediaUrls.join(','),
        mediaType: 'IMAGE',
        status: 'DRAFT',
        platforms: {
          create: [{ platform: 'FACEBOOK', socialAccountId: fbAccountUserA.id, status: 'PENDING' }]
        }
      }
    });

    const res = await request(app)
      .get(`/api/posts/${draft.id}`)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(draft.id);
    expect(res.body.data.caption).toBe('Draft ready to be reopened with all details');
    expect(res.body.data.mediaUrls).toEqual(mediaUrls);
    expect(res.body.data.mediaType).toBe('IMAGE');
    expect(res.body.data.platforms.length).toBe(1);
    expect(res.body.data.platforms[0].socialAccount).toBeDefined();
  });

  // =========================================================================
  // SCENARIO 7: Listing Saved Drafts via GET /api/posts/drafts or GET /api/posts?status=DRAFT
  // =========================================================================
  it('7. Listing drafts returns only user drafts ordered by most recently updated', async () => {
    const listRes = await request(app)
      .get('/api/posts/drafts')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.success).toBe(true);
    expect(Array.isArray(listRes.body.data.posts)).toBe(true);

    // All returned posts must have status DRAFT and belong to User A
    for (const p of listRes.body.data.posts) {
      expect(p.status).toBe('DRAFT');
    }
  });

  // =========================================================================
  // SCENARIO 8: Deleting a Draft Permanently
  // =========================================================================
  it('8. Deleting a draft permanently removes it with zero credit refund side-effects', async () => {
    const draft = await prisma.post.create({
      data: {
        userId: userA.id,
        caption: 'Temporary draft to delete',
        status: 'DRAFT'
      }
    });

    const userBefore = await prisma.user.findUnique({ where: { id: userA.id } });

    const delRes = await request(app)
      .delete(`/api/posts/${draft.id}`)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(delRes.status).toBe(200);
    expect(delRes.body.success).toBe(true);

    const check = await prisma.post.findUnique({ where: { id: draft.id } });
    expect(check).toBeNull();

    // User credits remain unchanged
    const userAfter = await prisma.user.findUnique({ where: { id: userA.id } });
    expect(userAfter.credits).toBe(userBefore.credits);
  });

  // =========================================================================
  // SCENARIO 9: Publishing an Existing Draft (Deducts credits & Avoids Duplicates)
  // =========================================================================
  it('9. Publishing an existing draft converts the draft post without creating a duplicate and deducts credits', async () => {
    // Ensure User A has 100 credits
    await prisma.user.update({ where: { id: userA.id }, data: { credits: 100 } });

    // 1. Create a draft with FB (5) + LI (5) = 10 credits
    const draftRes = await request(app)
      .post('/api/posts/draft')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        caption: 'Draft about to be published directly',
        platforms: [
          { platform: 'FACEBOOK', socialAccountId: fbAccountUserA.id },
          { platform: 'LINKEDIN', socialAccountId: liAccountUserA.id }
        ]
      });

    const draftId = draftRes.body.data.id;
    const countBeforePublish = await prisma.post.count({ where: { userId: userA.id } });

    const liProvider = getProvider('LINKEDIN');
    const liConfigSpy = vi.spyOn(liProvider, 'isConfigured').mockReturnValue(true);

    // Mock social platform APIs to succeed
    const postSpy = vi.spyOn(axios, 'post').mockImplementation(async (url) => {
      if (url.includes('graph.facebook.com')) {
        return { data: { id: 'fb_succ_123' } };
      }
      if (url.includes('api.linkedin.com')) {
        return {
          data: { id: 'urn:li:share:12345' },
          headers: { 'x-restli-id': 'urn:li:share:12345' }
        };
      }
      return { data: { id: 'succ_generic' }, headers: {} };
    });

    // 2. Publish the draft via POST /api/posts with draftId
    const publishRes = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        draftId,
        caption: 'Draft about to be published directly (final review)',
        platforms: [
          { platform: 'FACEBOOK', socialAccountId: fbAccountUserA.id },
          { platform: 'LINKEDIN', socialAccountId: liAccountUserA.id }
        ]
      });

    postSpy.mockRestore();
    liConfigSpy.mockRestore();

    expect(publishRes.status).toBe(201);
    expect(publishRes.body.success).toBe(true);
    expect(publishRes.body.data.id).toBe(draftId); // Reused the same post record!
    expect(publishRes.body.data.status).toBe('PUBLISHED');

    // Verify NO duplicate post record was created
    const countAfterPublish = await prisma.post.count({ where: { userId: userA.id } });
    expect(countAfterPublish).toBe(countBeforePublish);

    // Verify credits were deducted accurately: 100 - (5 + 5) = 90
    const userAfter = await prisma.user.findUnique({ where: { id: userA.id } });
    expect(userAfter.credits).toBe(90);

    // Verify credit ledger transaction
    const tx = await prisma.creditTransaction.findFirst({
      where: { userId: userA.id, type: 'USAGE_DEDUCT' },
      orderBy: { createdAt: 'desc' }
    });
    expect(tx.amount).toBe(-10);
  });

  // =========================================================================
  // SCENARIO 10: Insufficient Credits when Publishing a Draft
  // =========================================================================
  it('10. Rejects publishing a draft if user has insufficient credits, preserving draft state', async () => {
    // Set User A credits to 2 (below FB 5 credits cost)
    await prisma.user.update({ where: { id: userA.id }, data: { credits: 2 } });

    // Create draft
    const draftRes = await request(app)
      .post('/api/posts/draft')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        caption: 'Draft trying to publish without enough credits',
        platforms: [{ platform: 'FACEBOOK', socialAccountId: fbAccountUserA.id }]
      });

    const draftId = draftRes.body.data.id;

    // Try to publish
    const publishRes = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        draftId,
        caption: 'Draft trying to publish without enough credits',
        platforms: [{ platform: 'FACEBOOK', socialAccountId: fbAccountUserA.id }]
      });

    expect(publishRes.status).toBe(400);
    expect(publishRes.body.error).toBe('INSUFFICIENT_CREDITS');

    // Post remains in DRAFT status
    const postCheck = await prisma.post.findUnique({ where: { id: draftId } });
    expect(postCheck.status).toBe('DRAFT');

    // User balance untouched at 2
    const userCheck = await prisma.user.findUnique({ where: { id: userA.id } });
    expect(userCheck.credits).toBe(2);
  });

  // =========================================================================
  // SCENARIO 11: Quick Publish a Draft via POST /api/posts/:id/publish
  // =========================================================================
  it('11. Direct publish of complete draft via /api/posts/:id/publish reserves credits and executes publishing', async () => {
    // Set User A credits to 50
    await prisma.user.update({ where: { id: userA.id }, data: { credits: 50 } });

    // Create draft with FB platform (5 credits)
    const draftRes = await request(app)
      .post('/api/posts/draft')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        caption: 'Draft for direct publish endpoint',
        platforms: [{ platform: 'FACEBOOK', socialAccountId: fbAccountUserA.id }]
      });

    const draftId = draftRes.body.data.id;

    const postSpy = vi.spyOn(axios, 'post').mockResolvedValue({ data: { id: 'fb_succ_direct' } });

    const publishRes = await request(app)
      .post(`/api/posts/${draftId}/publish`)
      .set('Authorization', `Bearer ${tokenA}`);

    postSpy.mockRestore();

    expect(publishRes.status).toBe(200);
    expect(publishRes.body.success).toBe(true);
    expect(publishRes.body.data.status).toBe('PUBLISHED');

    // 50 - 5 = 45 credits
    const userAfter = await prisma.user.findUnique({ where: { id: userA.id } });
    expect(userAfter.credits).toBe(45);
  });
});
