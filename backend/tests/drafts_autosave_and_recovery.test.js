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

describe('Automatic Draft Saving & Recovery System Test Suite', () => {
  let userA;
  let tokenA;
  let userB;
  let tokenB;

  let fbAccountUserA;
  let liAccountUserA;
  let fbAccountUserB;

  beforeAll(async () => {
    await platformRateService.seedPlatformRatesIfEmpty();
    for (const [platform, defaultCost] of Object.entries(DEFAULT_PLATFORM_RATES)) {
      await prisma.platformCreditConfig.upsert({
        where: { platform },
        update: { costCredits: defaultCost },
        create: { platform, costCredits: defaultCost }
      });
    }

    const passwordHash = await bcrypt.hash('AutoSavePass2026!', 10);

    // Setup User A
    userA = await prisma.user.create({
      data: {
        name: 'AutoSave User A',
        email: `autosave_user_a_${Date.now()}@socialsync.ai`,
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

    // Setup User B (for user isolation checks)
    userB = await prisma.user.create({
      data: {
        name: 'AutoSave User B',
        email: `autosave_user_b_${Date.now()}@socialsync.ai`,
        passwordHash,
        role: 'USER',
        status: 'ACTIVE',
        plan: 'CREATOR',
        credits: 100
      }
    });

    tokenB = jwt.sign(
      { userId: userB.id, email: userB.email, role: 'USER', name: userB.name, tokenVersion: userB.tokenVersion || 0 },
      config.jwtSecret,
      { expiresIn: '2h' }
    );

    // Connect Social Accounts
    fbAccountUserA = await prisma.socialAccount.create({
      data: {
        userId: userA.id,
        platform: 'FACEBOOK',
        platformUserId: `fb_as_${Date.now()}`,
        accountName: 'User A Brand FB',
        accountUsername: 'user_a_fb',
        accessToken: 'EAAB_test_mock_token_a',
        status: 'CONNECTED'
      }
    });

    liAccountUserA = await prisma.socialAccount.create({
      data: {
        userId: userA.id,
        platform: 'LINKEDIN',
        platformUserId: `li_as_${Date.now()}`,
        accountName: 'User A Brand LinkedIn',
        accountUsername: 'user_a_li',
        accessToken: 'AQU_test_mock_token_a',
        status: 'CONNECTED'
      }
    });

    fbAccountUserB = await prisma.socialAccount.create({
      data: {
        userId: userB.id,
        platform: 'FACEBOOK',
        platformUserId: `fb_as_b_${Date.now()}`,
        accountName: 'User B FB',
        accountUsername: 'user_b_fb',
        accessToken: 'EAAB_test_mock_token_b',
        status: 'CONNECTED'
      }
    });
  });

  afterAll(async () => {
    await prisma.postPlatform.deleteMany({
      where: {
        socialAccountId: { in: [fbAccountUserA.id, liAccountUserA.id, fbAccountUserB.id] }
      }
    });
    await prisma.creditTransaction.deleteMany({
      where: { userId: { in: [userA.id, userB.id] } }
    });
    await prisma.post.deleteMany({
      where: { userId: { in: [userA.id, userB.id] } }
    });
    await prisma.socialAccount.deleteMany({
      where: { id: { in: [fbAccountUserA.id, liAccountUserA.id, fbAccountUserB.id] } }
    });
    await prisma.user.deleteMany({
      where: { id: { in: [userA.id, userB.id] } }
    });
  });

  // =========================================================================
  // 1. Automatic Save & Continuous Updates (Stable Draft ID)
  // =========================================================================
  it('1. Initial auto-save creates draft; subsequent keystroke saves update the same draft ID', async () => {
    const creditsBefore = (await prisma.user.findUnique({ where: { id: userA.id } })).credits;

    // First auto-save: User types "H"
    const save1 = await request(app)
      .post('/api/posts/draft')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        caption: 'H',
        platforms: [{ platform: 'FACEBOOK', socialAccountId: fbAccountUserA.id }],
        clientTimestamp: Date.now(),
        version: 1
      });

    expect(save1.status).toBe(201);
    expect(save1.body.success).toBe(true);
    const draftId = save1.body.data.id;
    expect(draftId).toBeDefined();
    expect(save1.body.data.status).toBe('DRAFT');
    expect(save1.body.data.caption).toBe('H');

    const countAfterFirst = await prisma.post.count({ where: { userId: userA.id } });

    // Second auto-save: User continues typing "Hello world!" (using draftId)
    const save2 = await request(app)
      .post('/api/posts/draft')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        draftId,
        caption: 'Hello world!',
        platforms: [{ platform: 'FACEBOOK', socialAccountId: fbAccountUserA.id }],
        clientTimestamp: Date.now(),
        version: 2
      });

    expect(save2.status).toBe(200);
    expect(save2.body.success).toBe(true);
    expect(save2.body.data.id).toBe(draftId); // Must be the same stable ID
    expect(save2.body.data.caption).toBe('Hello world!');

    // Post count must NOT increase (no duplicate created!)
    const countAfterSecond = await prisma.post.count({ where: { userId: userA.id } });
    expect(countAfterSecond).toBe(countAfterFirst);

    // Verify 0 credits deducted
    const creditsAfter = (await prisma.user.findUnique({ where: { id: userA.id } })).credits;
    expect(creditsAfter).toBe(creditsBefore);
  });

  // =========================================================================
  // 2. Recovery: GET /api/posts/drafts/latest restores unfinished post
  // =========================================================================
  it('2. GET /api/posts/drafts/latest retrieves the unfinished draft with all media, caption and platforms', async () => {
    const mediaUrls = [
      '/uploads/media/test_photo_1.png',
      '/uploads/media/test_photo_2.png'
    ];

    // User updates draft with media & LinkedIn platform
    const draft = await prisma.post.findFirst({
      where: { userId: userA.id, status: 'DRAFT' }
    });

    const updateRes = await request(app)
      .post('/api/posts/draft')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        draftId: draft.id,
        caption: 'Restorable announcement draft with multi-media assets',
        mediaUrls,
        mediaType: 'IMAGE',
        platforms: [
          { platform: 'FACEBOOK', socialAccountId: fbAccountUserA.id },
          { platform: 'LINKEDIN', socialAccountId: liAccountUserA.id }
        ]
      });

    expect(updateRes.status).toBe(200);

    // Now simulate returning to Create Post page: Call GET /api/posts/drafts/latest
    const latestRes = await request(app)
      .get('/api/posts/drafts/latest')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(latestRes.status).toBe(200);
    expect(latestRes.body.success).toBe(true);
    expect(latestRes.body.data).toBeDefined();
    expect(latestRes.body.data.id).toBe(draft.id);
    expect(latestRes.body.data.caption).toBe('Restorable announcement draft with multi-media assets');
    expect(latestRes.body.data.mediaUrls).toEqual(mediaUrls);
    expect(latestRes.body.data.mediaType).toBe('IMAGE');
    expect(latestRes.body.data.platforms.length).toBe(2);
  });

  // =========================================================================
  // 3. User Isolation: Drafts are strictly isolated per authenticated user
  // =========================================================================
  it('3. User B cannot see or restore User A draft via GET /api/posts/drafts/latest', async () => {
    // User B currently has NO drafts
    const latestResB = await request(app)
      .get('/api/posts/drafts/latest')
      .set('Authorization', `Bearer ${tokenB}`);

    expect(latestResB.status).toBe(200);
    expect(latestResB.body.success).toBe(true);
    expect(latestResB.body.data).toBeNull(); // User B has no unfinished drafts

    // User B tries to update User A's draft
    const draftUserA = await prisma.post.findFirst({
      where: { userId: userA.id, status: 'DRAFT' }
    });

    const maliciousUpdate = await request(app)
      .post('/api/posts/draft')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({
        draftId: draftUserA.id,
        caption: 'Hacked by User B'
      });

    expect(maliciousUpdate.status).toBe(404);
  });

  // =========================================================================
  // 4. Multiple Drafts Ordering: Latest updated draft is restored
  // =========================================================================
  it('4. When multiple drafts exist, GET /api/posts/drafts/latest returns the most recently updated draft', async () => {
    // 1. Create Draft 1
    const draft1Res = await request(app)
      .post('/api/posts/draft')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        caption: 'Draft 1 - older content',
        platforms: [{ platform: 'FACEBOOK', socialAccountId: fbAccountUserA.id }]
      });
    const draft1Id = draft1Res.body.data.id;

    // Small delay to ensure timestamp difference
    await new Promise(r => setTimeout(r, 50));

    // 2. Create Draft 2
    const draft2Res = await request(app)
      .post('/api/posts/draft')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        caption: 'Draft 2 - newer content',
        platforms: [{ platform: 'FACEBOOK', socialAccountId: fbAccountUserA.id }]
      });
    const draft2Id = draft2Res.body.data.id;

    // Initially, latest must be Draft 2
    const check1 = await request(app)
      .get('/api/posts/drafts/latest')
      .set('Authorization', `Bearer ${tokenA}`);
    expect(check1.body.data.id).toBe(draft2Id);

    // Small delay
    await new Promise(r => setTimeout(r, 50));

    // 3. User edits Draft 1 again
    await request(app)
      .post('/api/posts/draft')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        draftId: draft1Id,
        caption: 'Draft 1 - now the freshest updated content!'
      });

    // Now latest must be Draft 1!
    const check2 = await request(app)
      .get('/api/posts/drafts/latest')
      .set('Authorization', `Bearer ${tokenA}`);
    expect(check2.body.data.id).toBe(draft1Id);
    expect(check2.body.data.caption).toBe('Draft 1 - now the freshest updated content!');
  });

  // =========================================================================
  // 5. Incomplete Drafts: Can auto-save incomplete drafts at any stage
  // =========================================================================
  it('5. Incomplete drafts with only media or only platforms can be saved without validation errors', async () => {
    // Empty caption, media only
    const mediaOnly = await request(app)
      .post('/api/posts/draft')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        caption: '',
        mediaUrl: '/uploads/media/pending_render.png',
        mediaType: 'IMAGE',
        platforms: []
      });

    expect(mediaOnly.status).toBe(201);
    expect(mediaOnly.body.success).toBe(true);
    expect(mediaOnly.body.data.caption).toBe('');
    expect(mediaOnly.body.data.mediaUrls).toEqual(['/uploads/media/pending_render.png']);
    expect(mediaOnly.body.data.platforms.length).toBe(0);
  });

  // =========================================================================
  // 6. Publishing converts draft and clears it from latest unfinished drafts
  // =========================================================================
  it('6. Publishing an auto-saved draft converts it to PUBLISHED and removes it from unfinished drafts', async () => {
    // Create draft to publish
    const draftRes = await request(app)
      .post('/api/posts/draft')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        caption: 'Draft ready for final publishing',
        platforms: [{ platform: 'FACEBOOK', socialAccountId: fbAccountUserA.id }]
      });
    const draftId = draftRes.body.data.id;

    const countBeforePublish = await prisma.post.count({ where: { userId: userA.id } });
    const userBefore = await prisma.user.findUnique({ where: { id: userA.id } });

    // Mock social platform API
    const postSpy = vi.spyOn(axios, 'post').mockResolvedValue({ data: { id: 'fb_succ_as_1' } });

    // Publish the draft via POST /api/posts with draftId
    const publishRes = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        draftId,
        caption: 'Draft ready for final publishing (published!)',
        platforms: [{ platform: 'FACEBOOK', socialAccountId: fbAccountUserA.id }]
      });

    postSpy.mockRestore();

    expect(publishRes.status).toBe(201);
    expect(publishRes.body.data.id).toBe(draftId); // Reused the same post record!
    expect(publishRes.body.data.status).toBe('PUBLISHED');

    // No duplicate post was created
    const countAfterPublish = await prisma.post.count({ where: { userId: userA.id } });
    expect(countAfterPublish).toBe(countBeforePublish);

    // Verified credits deducted (5 for Facebook)
    const userAfter = await prisma.user.findUnique({ where: { id: userA.id } });
    expect(userAfter.credits).toBe(userBefore.credits - 5);

    // Draft is no longer in DRAFT status in PostgreSQL
    const checkPost = await prisma.post.findUnique({ where: { id: draftId } });
    expect(checkPost.status).toBe('PUBLISHED');

    // Verify GET /api/posts/drafts/latest does NOT return this published post!
    const latestRes = await request(app)
      .get('/api/posts/drafts/latest')
      .set('Authorization', `Bearer ${tokenA}`);

    if (latestRes.body.data) {
      expect(latestRes.body.data.id).not.toBe(draftId);
      expect(latestRes.body.data.status).toBe('DRAFT');
    }
  });

  // =========================================================================
  // 7. Deleting draft removes it permanently
  // =========================================================================
  it('7. Deleting a draft permanently removes it from PostgreSQL without credit side-effects', async () => {
    const draftRes = await request(app)
      .post('/api/posts/draft')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        caption: 'Draft to be deleted'
      });
    const draftId = draftRes.body.data.id;

    const delRes = await request(app)
      .delete(`/api/posts/${draftId}`)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(delRes.status).toBe(200);
    expect(delRes.body.success).toBe(true);

    const inDb = await prisma.post.findUnique({ where: { id: draftId } });
    expect(inDb).toBeNull();
  });

  // =========================================================================
  // 8. Stale or Already Published draftId Fallback in POST /api/posts
  // =========================================================================
  it('8. Publishing with a stale or already-published draftId does not block user with 404, creating a new post', async () => {
    const postSpy = vi.spyOn(axios, 'post').mockResolvedValue({ data: { id: 'fb_succ_stale_1' } });

    // Scenario A: Non-existent draftId
    const resA = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        draftId: 'non_existent_stale_draft_id',
        caption: 'Post with non-existent draft ID',
        platforms: [{ platform: 'FACEBOOK', socialAccountId: fbAccountUserA.id }]
      });

    expect(resA.status).toBe(201);
    expect(resA.body.success).toBe(true);
    expect(resA.body.data.id).not.toBe('non_existent_stale_draft_id');
    expect(resA.body.data.status).toBe('PUBLISHED');

    // Scenario B: draftId pointing to an already PUBLISHED post
    const publishedId = resA.body.data.id;
    const resB = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        draftId: publishedId, // This post is already published!
        caption: 'Another post created after previous one published',
        platforms: [{ platform: 'FACEBOOK', socialAccountId: fbAccountUserA.id }]
      });

    postSpy.mockRestore();

    expect(resB.status).toBe(201);
    expect(resB.body.success).toBe(true);
    expect(resB.body.data.id).not.toBe(publishedId); // Fresh new post created!
    expect(resB.body.data.status).toBe('PUBLISHED');
  });

  // =========================================================================
  // 9. Stale or Already Published draftId Fallback in POST /api/posts/draft
  // =========================================================================
  it('9. Auto-saving with a stale or already-published draftId does not return 400/404, self-healing with a new draft', async () => {
    // Save draft with non-existent draftId
    const resA = await request(app)
      .post('/api/posts/draft')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        draftId: 'deleted_draft_id_999',
        caption: 'Auto-saved after draft was deleted'
      });

    expect(resA.status).toBe(200);
    expect(resA.body.success).toBe(true);
    expect(resA.body.data.id).not.toBe('deleted_draft_id_999');
    expect(resA.body.data.status).toBe('DRAFT');
  });
});
