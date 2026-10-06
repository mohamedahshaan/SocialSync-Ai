import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { app } from '../src/app.js';
import { prisma } from '../src/utils/prisma.js';
import { facebookProvider } from '../src/services/social/facebook.js';
import { publishingService } from '../src/services/publishingService.js';

describe('Media Upload & Media Publishing Pipeline Suite', () => {
  let userToken = '';
  let userId = '';
  let fbAccountId = '';
  let createdFiles = [];

  beforeAll(async () => {
    // 1. Register test user
    const res = await request(app).post('/api/auth/register').send({
      name: 'Media Pipeline Tester',
      email: `mediatester_${Date.now()}@socialflow.ai`,
      password: 'Password123!',
      confirmPassword: 'Password123!'
    });
    userToken = res.body.data.token;
    userId = res.body.data.user.id;

    // 2. Create connected Facebook account
    const fb = await prisma.socialAccount.create({
      data: {
        userId,
        platform: 'FACEBOOK',
        platformUserId: '100012345678',
        accountName: 'Test Brand Page',
        accessToken: 'EAAB_test_page_access_token_123',
        status: 'CONNECTED'
      }
    });
    fbAccountId = fb.id;
  });

  afterAll(async () => {
    // Clean up created upload files
    for (const filePath of createdFiles) {
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch (e) {}
      }
    }

    // Clean up database
    await prisma.user.deleteMany({
      where: { id: userId }
    });
  });

  // ==========================================
  // SECTION 2 & 3: BACKEND MEDIA UPLOAD & STATIC SERVING
  // ==========================================
  describe('Media Upload Endpoints', () => {
    it('should reject unauthenticated upload requests', async () => {
      const res = await request(app)
        .post('/api/uploads/media')
        .attach('media', Buffer.from('fake image data'), 'test.png');

      expect(res.status).toBe(401);
    });

    it('should reject upload when no media file is attached', async () => {
      const res = await request(app)
        .post('/api/uploads/media')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('FILE_REQUIRED');
    });

    it('should reject unsupported file types (.txt, .exe)', async () => {
      const res = await request(app)
        .post('/api/uploads/media')
        .set('Authorization', `Bearer ${userToken}`)
        .attach('media', Buffer.from('console.log("hello");'), 'script.js');

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('UNSUPPORTED_MEDIA_TYPE');
      expect(res.body.message).toContain('Unsupported file type');
    });

    it('POST /api/uploads/media should upload an IMAGE and return required schema', async () => {
      const dummyPng = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
        'base64'
      );

      const res = await request(app)
        .post('/api/uploads/media')
        .set('Authorization', `Bearer ${userToken}`)
        .attach('media', dummyPng, 'poster.png');

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.mediaUrl).toMatch(/^\/uploads\/media-.*\.png$/);
      expect(res.body.mediaType).toBe('image');
      expect(res.body.mimeType).toBe('image/png');
      expect(res.body.originalName).toBe('poster.png');

      const localPath = path.resolve('uploads', path.basename(res.body.mediaUrl));
      createdFiles.push(localPath);
      expect(fs.existsSync(localPath)).toBe(true);

      // Verify static serving
      const staticRes = await request(app).get(res.body.mediaUrl);
      expect(staticRes.status).toBe(200);
      expect(staticRes.headers['content-type']).toBe('image/png');
    });

    it('POST /api/uploads/media should upload a VIDEO and return required schema', async () => {
      const dummyMp4 = Buffer.from('fake mp4 video bytes');

      const res = await request(app)
        .post('/api/uploads/media')
        .set('Authorization', `Bearer ${userToken}`)
        .attach('media', dummyMp4, { filename: 'promo.mp4', contentType: 'video/mp4' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.mediaUrl).toMatch(/^\/uploads\/media-.*\.mp4$/);
      expect(res.body.mediaType).toBe('video');
      expect(res.body.mimeType).toBe('video/mp4');
      expect(res.body.originalName).toBe('promo.mp4');

      const localPath = path.resolve('uploads', path.basename(res.body.mediaUrl));
      createdFiles.push(localPath);
      expect(fs.existsSync(localPath)).toBe(true);
    });

    it('POST /api/uploads should also work for backward compatibility', async () => {
      const dummyJpg = Buffer.from('fake jpg image bytes');

      const res = await request(app)
        .post('/api/uploads')
        .set('Authorization', `Bearer ${userToken}`)
        .attach('media', dummyJpg, { filename: 'photo.jpg', contentType: 'image/jpeg' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.mediaUrl).toBeDefined();

      const localPath = path.resolve('uploads', path.basename(res.body.mediaUrl));
      createdFiles.push(localPath);
    });
  });

  // ==========================================
  // SECTION 4 & 5: CREATE POST API & DATABASE PERSISTENCE
  // ==========================================
  describe('Post Creation with Media', () => {
    it('should create a TEXT-ONLY post correctly without media', async () => {
      const res = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          caption: 'Pure text announcement for Facebook',
          platforms: [{ platform: 'FACEBOOK', socialAccountId: fbAccountId }]
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.caption).toBe('Pure text announcement for Facebook');
      expect(res.body.data.mediaUrl).toBeNull();
      expect(res.body.data.mediaType).toBe('NONE');
    });

    it('should create an IMAGE post with relative mediaUrl and normalized mediaType', async () => {
      const res = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          caption: 'Exciting announcement with poster!',
          mediaUrl: '/uploads/poster.png',
          mediaType: 'image',
          platforms: [{ platform: 'FACEBOOK', socialAccountId: fbAccountId }]
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.caption).toBe('Exciting announcement with poster!');
      expect(res.body.data.mediaUrl).toBe('/uploads/poster.png');
      expect(res.body.data.mediaType).toBe('IMAGE');

      // Verify Prisma database record
      const dbPost = await prisma.post.findUnique({
        where: { id: res.body.data.id }
      });
      expect(dbPost.mediaUrl).toBe('/uploads/poster.png');
      expect(dbPost.mediaType).toBe('IMAGE');
    });

    it('should create a VIDEO post and auto-infer mediaType if omitted', async () => {
      const res = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          caption: 'Demo video showing features',
          mediaUrl: '/uploads/demo.mp4',
          platforms: [{ platform: 'FACEBOOK', socialAccountId: fbAccountId }]
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.mediaUrl).toBe('/uploads/demo.mp4');
      expect(res.body.data.mediaType).toBe('VIDEO');
    });
  });

  // ==========================================
  // SECTION 8, 9, 10: FACEBOOK MEDIA PUBLISHING ROUTING
  // ==========================================
  describe('Facebook Publishing Routing (Mocked Official API)', () => {
    it('TEST 1: Text-only flow calls official /{page-id}/feed endpoint and remains intact', async () => {
      const postSpy = vi.spyOn(axios, 'post').mockResolvedValueOnce({
        data: { id: 'fb_feed_post_99999' }
      });

      const result = await facebookProvider.publishPost({
        accessToken: 'page_token_abc',
        caption: 'Working text-only test message',
        mediaUrl: null,
        mediaType: 'NONE',
        platformUserId: '100012345678'
      });

      expect(result.platformPostId).toBe('fb_feed_post_99999');
      expect(postSpy).toHaveBeenCalledTimes(1);

      // Verify exact URL called is /{page-id}/feed
      const [calledUrl, , config] = postSpy.mock.calls[0];
      expect(calledUrl).toBe('https://graph.facebook.com/v20.0/100012345678/feed');
      expect(config.params.message).toBe('Working text-only test message');
      expect(config.params.access_token).toBe('page_token_abc');

      postSpy.mockRestore();
    });

    it('TEST 2: Image flow calls official /{page-id}/photos with FormData binary source', async () => {
      // Create a real temporary test image in uploads
      const testImageName = `test-img-${Date.now()}.png`;
      const testImagePath = path.resolve('uploads', testImageName);
      fs.writeFileSync(testImagePath, 'fake image binary content');
      createdFiles.push(testImagePath);

      const postSpy = vi.spyOn(axios, 'post').mockResolvedValueOnce({
        data: { id: 'photo_id_111', post_id: '100012345678_post_222' }
      });

      const result = await facebookProvider.publishPost({
        accessToken: 'page_token_abc',
        caption: 'Check out this awesome photo!',
        mediaUrl: `/uploads/${testImageName}`,
        mediaType: 'IMAGE',
        platformUserId: '100012345678'
      });

      expect(result.platformPostId).toBe('100012345678_post_222');
      expect(postSpy).toHaveBeenCalledTimes(1);

      const [calledUrl, formData] = postSpy.mock.calls[0];
      expect(calledUrl).toBe('https://graph.facebook.com/v20.0/100012345678/photos');
      // FormData contains source, message, caption, access_token
      expect(formData).toBeDefined();

      postSpy.mockRestore();
    });

    it('TEST 3: Video flow calls official /{page-id}/videos with FormData binary source', async () => {
      // Create a real temporary test video in uploads
      const testVideoName = `test-vid-${Date.now()}.mp4`;
      const testVideoPath = path.resolve('uploads', testVideoName);
      fs.writeFileSync(testVideoPath, 'fake video binary content');
      createdFiles.push(testVideoPath);

      const postSpy = vi.spyOn(axios, 'post').mockResolvedValueOnce({
        data: { id: 'video_id_333444' }
      });

      const result = await facebookProvider.publishPost({
        accessToken: 'page_token_abc',
        caption: 'Watch our promo video!',
        mediaUrl: `/uploads/${testVideoName}`,
        mediaType: 'VIDEO',
        platformUserId: '100012345678'
      });

      expect(result.platformPostId).toBe('video_id_333444');
      expect(postSpy).toHaveBeenCalledTimes(1);

      const [calledUrl, formData] = postSpy.mock.calls[0];
      expect(calledUrl).toBe('https://graph.facebook.com/v20.0/100012345678/videos');
      expect(formData).toBeDefined();

      postSpy.mockRestore();
    });

    it('SECTION 11: Error handling — handles official Facebook Graph API error gracefully', async () => {
      const postSpy = vi.spyOn(axios, 'post').mockRejectedValueOnce({
        response: {
          data: {
            error: {
              message: 'Permissions error: (#200) Requires pages_manage_posts permission to publish.',
              type: 'OAuthException',
              code: 200
            }
          }
        }
      });

      await expect(
        facebookProvider.publishPost({
          accessToken: 'page_token_abc',
          caption: 'Will fail due to permissions',
          mediaUrl: null,
          mediaType: 'NONE',
          platformUserId: '100012345678'
        })
      ).rejects.toBeDefined();

      postSpy.mockRestore();
    });
  });
});
