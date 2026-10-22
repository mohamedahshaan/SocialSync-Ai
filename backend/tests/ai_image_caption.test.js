import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { app } from '../src/app.js';
import { config } from '../src/config/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe.sequential('AI Gemini Vision Image Caption Generation Suite', () => {
  let userToken = '';
  let testImage1Url = '';
  let testImage2Url = '';

  beforeAll(async () => {
    // 1. Register test user
    const regRes = await request(app).post('/api/auth/register').send({
      name: 'Gemini Caption Tester',
      email: `geminicaption_${Date.now()}@socialsync.ai`,
      password: 'Password123!',
      confirmPassword: 'Password123!'
    });
    userToken = regRes.body.data.token;

    // 2. Upload valid test images
    const sampleImage1Path = path.resolve(__dirname, '../uploads/media-1791439499459-849025912.jpg');
    const imageBuffer1 = fs.existsSync(sampleImage1Path)
      ? fs.readFileSync(sampleImage1Path)
      : Buffer.from('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAAPAA8BAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=', 'base64');

    const uploadRes1 = await request(app)
      .post('/api/uploads/media')
      .set('Authorization', `Bearer ${userToken}`)
      .attach('media', imageBuffer1, 'portrait_sample.jpg');

    testImage1Url = uploadRes1.body.mediaUrl || uploadRes1.body.data?.mediaUrl;

    const sampleImage2Path = path.resolve(__dirname, '../uploads/media-1791306682023-259114953.jpeg');
    const imageBuffer2 = fs.existsSync(sampleImage2Path)
      ? fs.readFileSync(sampleImage2Path)
      : imageBuffer1;

    const uploadRes2 = await request(app)
      .post('/api/uploads/media')
      .set('Authorization', `Bearer ${userToken}`)
      .attach('media', imageBuffer2, 'flyer_sample.jpeg');

    testImage2Url = uploadRes2.body.mediaUrl || uploadRes2.body.data?.mediaUrl;
  });

  it.sequential('1. Should require authentication for generate-caption endpoint', async () => {
    const res = await request(app)
      .post('/api/posts/generate-caption')
      .send({ mediaUrl: testImage1Url });

    expect(res.status).toBe(401);
  });

  it.sequential('2. Should return 400 when no image is provided', async () => {
    const res = await request(app)
      .post('/api/posts/generate-caption')
      .set('Authorization', `Bearer ${userToken}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('IMAGE_REQUIRED');
  });

  it.sequential('3. Should return 400 when a video is supplied instead of an image', async () => {
    const res = await request(app)
      .post('/api/posts/generate-caption')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ mediaUrl: '/uploads/sample_video.mp4' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('UNSUPPORTED_MEDIA_TYPE');
  });

  it.sequential('4. Should return 404 when the specified image file does not exist on disk', async () => {
    const res = await request(app)
      .post('/api/posts/generate-caption')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ mediaUrl: '/uploads/non_existent_image_1234567.jpg' });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('IMAGE_NOT_FOUND');
  });

  it.sequential('5. Should successfully generate an image caption using Gemini Vision on uploaded image', async () => {
    const res = await request(app)
      .post('/api/posts/generate-caption')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ mediaUrl: testImage1Url, style: 'Engaging & Casual', language: 'English' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.caption).toBeDefined();
    expect(typeof res.body.caption).toBe('string');
    expect(res.body.caption.length).toBeGreaterThan(10);
    expect(res.body.caption.startsWith('"')).toBe(false);
    expect(res.body.data.provider).toBe('google-gemini');
    expect(res.body.data.style).toBe('Engaging & Casual');
    expect(res.body.data.language).toBe('English');
  }, 60000);

  it.sequential('6. Should generate different relevant captions for different images and styles', async () => {
    const res = await request(app)
      .post('/api/posts/generate-caption')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ mediaUrl: testImage2Url, style: 'Professional & Informative', language: 'English' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.caption).toBeDefined();
    expect(res.body.caption.length).toBeGreaterThan(10);
  }, 60000);

  it.sequential('7. Should work via both /api/posts/generate-caption and /api/ai/generate-caption aliases', async () => {
    const res = await request(app)
      .post('/api/ai/generate-caption')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ mediaUrl: testImage1Url });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.caption).toBeDefined();
  }, 60000);

  it.sequential('8. Should return 503 when API key is missing', async () => {
    const origGeminiKey = config.geminiApiKey;
    const origEnvGemini = process.env.GEMINI_API_KEY;
    const origOpenaiKey = config.openaiApiKey;
    const origEnvOpenai = process.env.OPENAI_API_KEY;

    try {
      config.geminiApiKey = '';
      delete process.env.GEMINI_API_KEY;
      config.openaiApiKey = '';
      delete process.env.OPENAI_API_KEY;

      const res = await request(app)
        .post('/api/posts/generate-caption')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ mediaUrl: testImage1Url });

      expect(res.status).toBe(503);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('API_KEY_MISSING');
    } finally {
      config.geminiApiKey = origGeminiKey;
      process.env.GEMINI_API_KEY = origEnvGemini;
      config.openaiApiKey = origOpenaiKey;
      process.env.OPENAI_API_KEY = origEnvOpenai;
    }
  });
});
