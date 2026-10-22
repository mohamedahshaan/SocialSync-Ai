import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { app } from '../src/app.js';
import { prisma } from '../src/utils/prisma.js';
import { youtubeProvider } from '../src/services/social/youtube.js';
import { facebookProvider } from '../src/services/social/facebook.js';
import { linkedinProvider } from '../src/services/social/linkedin.js';
import { videoConversionService } from '../src/services/videoConversionService.js';
import { publishingService } from '../src/services/publishingService.js';

describe('YouTube Automatic Image-to-Video Conversion & Publishing Suite', () => {
  let userToken = '';
  let userId = '';
  let ytAccountId = '';
  let fbAccountId = '';
  let liAccountId = '';
  const testFilesToClean = [];

  beforeAll(async () => {
    // 1. Register test user
    const userRes = await request(app).post('/api/auth/register').send({
      name: 'YouTube Conversion Tester',
      email: `yt_conv_${Date.now()}@socialflow.ai`,
      password: 'Password123!',
      confirmPassword: 'Password123!'
    });
    userToken = userRes.body.data.token;
    userId = userRes.body.data.user.id;

    // 2. Create connected accounts for YouTube, Facebook, and LinkedIn
    const ytAcc = await prisma.socialAccount.create({
      data: {
        userId,
        platform: 'YOUTUBE',
        platformUserId: 'yt_chan_101',
        accountName: 'Creator Channel',
        accessToken: 'ya29.mock_token_youtube',
        status: 'CONNECTED'
      }
    });
    ytAccountId = ytAcc.id;

    const fbAcc = await prisma.socialAccount.create({
      data: {
        userId,
        platform: 'FACEBOOK',
        platformUserId: 'fb_page_202',
        accountName: 'Creator FB Page',
        accessToken: 'EAAB_mock_token_facebook',
        status: 'CONNECTED'
      }
    });
    fbAccountId = fbAcc.id;

    const liAcc = await prisma.socialAccount.create({
      data: {
        userId,
        platform: 'LINKEDIN',
        platformUserId: 'urn:li:person:303',
        accountName: 'Creator LinkedIn',
        accessToken: 'AQ_mock_token_linkedin',
        status: 'CONNECTED'
      }
    });
    liAccountId = liAcc.id;
  });

  afterAll(async () => {
    // Clean up created files on disk
    for (const f of testFilesToClean) {
      try {
        if (fs.existsSync(f)) fs.unlinkSync(f);
      } catch {}
    }

    // Clean up test database records
    await prisma.socialAccount.deleteMany({ where: { userId } });
    await prisma.post.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
  });

  // Helper to create sample media in uploads/
  const createSampleUpload = (filename, content = 'mock media content') => {
    const uploadDir = path.resolve('uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    const fullPath = path.join(uploadDir, filename);
    fs.writeFileSync(fullPath, content);
    testFilesToClean.push(fullPath);
    return `/uploads/${filename}`;
  };

  it('1. JPG → YouTube MP4 conversion: Converts JPG image into 5s MP4, uploads to YouTube, and cleans temp file', async () => {
    // Generate a real sample JPG image
    const uploadDir = path.resolve('uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    const jpgFilename = `test_yt_${Date.now()}.jpg`;
    const jpgFullPath = path.join(uploadDir, jpgFilename);
    
    // Create valid 100x100 JPG with ffmpeg or buffer
    const { execFileSync } = await import('child_process');
    execFileSync(videoConversionService.ffmpegPath, [
      '-y', '-f', 'lavfi', '-i', 'color=c=purple:s=400x300', '-frames:v', '1', jpgFullPath
    ]);
    testFilesToClean.push(jpgFullPath);
    const mediaUrl = `/uploads/${jpgFilename}`;

    // Spy on videoConversionService to track temporary file cleanup
    let createdTempVideo = null;
    const originalConvert = videoConversionService.convertImageToVideo.bind(videoConversionService);
    const convSpy = vi.spyOn(videoConversionService, 'convertImageToVideo').mockImplementation(async (url, opts) => {
      const res = await originalConvert(url, opts);
      createdTempVideo = res.videoPath;
      return res;
    });

    // Mock YouTube Google API responses
    const axiosPostSpy = vi.spyOn(axios, 'post').mockResolvedValueOnce({
      headers: { location: 'https://www.googleapis.com/upload/youtube/v3/videos?session_id=upload_jpg_123' },
      data: {}
    });
    const axiosPutSpy = vi.spyOn(axios, 'put').mockResolvedValueOnce({
      data: { id: 'yt_video_from_jpg_111' }
    });

    const res = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        caption: 'Look at this awesome artwork!',
        mediaUrl,
        mediaType: 'IMAGE',
        platforms: [{ platform: 'YOUTUBE', socialAccountId: ytAccountId }]
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(convSpy).toHaveBeenCalledTimes(1);
    expect(axiosPostSpy).toHaveBeenCalledTimes(1);
    expect(axiosPutSpy).toHaveBeenCalledTimes(1);

    const platformResult = res.body.data.platforms[0];
    expect(platformResult.platform).toBe('YOUTUBE');
    expect(platformResult.status).toBe('PUBLISHED');
    expect(platformResult.platformPostId).toBe('yt_video_from_jpg_111');

    // Confirm that the temporary MP4 was cleaned up
    expect(createdTempVideo).toBeDefined();
    expect(fs.existsSync(createdTempVideo)).toBe(false);

    // Confirm original JPG remains intact
    expect(fs.existsSync(jpgFullPath)).toBe(true);

    convSpy.mockRestore();
    axiosPostSpy.mockRestore();
    axiosPutSpy.mockRestore();
  });

  it('2. PNG → YouTube MP4 conversion: Converts PNG image into 5s MP4, uploads to YouTube, and cleans temp file', async () => {
    const uploadDir = path.resolve('uploads');
    const pngFilename = `test_yt_${Date.now()}.png`;
    const pngFullPath = path.join(uploadDir, pngFilename);

    const { execFileSync } = await import('child_process');
    execFileSync(videoConversionService.ffmpegPath, [
      '-y', '-f', 'lavfi', '-i', 'color=c=orange:s=300x500', '-frames:v', '1', pngFullPath
    ]);
    testFilesToClean.push(pngFullPath);
    const mediaUrl = `/uploads/${pngFilename}`;

    let createdTempVideo = null;
    const originalConvert = videoConversionService.convertImageToVideo.bind(videoConversionService);
    const convSpy = vi.spyOn(videoConversionService, 'convertImageToVideo').mockImplementation(async (url, opts) => {
      const res = await originalConvert(url, opts);
      createdTempVideo = res.videoPath;
      expect(res.canvas.isPortrait).toBe(true); // 300x500 is vertical!
      expect(res.canvas.width).toBe(1080);
      expect(res.canvas.height).toBe(1920);
      return res;
    });

    const axiosPostSpy = vi.spyOn(axios, 'post').mockResolvedValueOnce({
      headers: { location: 'https://www.googleapis.com/upload/youtube/v3/videos?session_id=upload_png_222' },
      data: {}
    });
    const axiosPutSpy = vi.spyOn(axios, 'put').mockResolvedValueOnce({
      data: { id: 'yt_video_from_png_222' }
    });

    const res = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        caption: 'Vertical graphic update',
        mediaUrl,
        mediaType: 'IMAGE',
        platforms: [{ platform: 'YOUTUBE', socialAccountId: ytAccountId }]
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(convSpy).toHaveBeenCalledTimes(1);

    const platformResult = res.body.data.platforms[0];
    expect(platformResult.status).toBe('PUBLISHED');
    expect(platformResult.platformPostId).toBe('yt_video_from_png_222');

    // Guaranteed temp file deletion
    expect(createdTempVideo).toBeDefined();
    expect(fs.existsSync(createdTempVideo)).toBe(false);

    convSpy.mockRestore();
    axiosPostSpy.mockRestore();
    axiosPutSpy.mockRestore();
  });

  it('3. Existing MP4 → YouTube: Uses original MP4 without conversion', async () => {
    const mp4Url = createSampleUpload(`original_clip_${Date.now()}.mp4`, 'fake mp4 binary buffer');

    const convSpy = vi.spyOn(videoConversionService, 'convertImageToVideo');
    const axiosPostSpy = vi.spyOn(axios, 'post').mockResolvedValueOnce({
      headers: { location: 'https://www.googleapis.com/upload/youtube/v3/videos?session_id=upload_mp4_333' },
      data: {}
    });
    const axiosPutSpy = vi.spyOn(axios, 'put').mockResolvedValueOnce({
      data: { id: 'yt_native_mp4_333' }
    });

    const res = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        caption: 'Native MP4 video release',
        mediaUrl: mp4Url,
        mediaType: 'VIDEO',
        platforms: [{ platform: 'YOUTUBE', socialAccountId: ytAccountId }]
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    // CRITICAL: Must NOT call image-to-video conversion!
    expect(convSpy).not.toHaveBeenCalled();

    const platformResult = res.body.data.platforms[0];
    expect(platformResult.status).toBe('PUBLISHED');
    expect(platformResult.platformPostId).toBe('yt_native_mp4_333');

    convSpy.mockRestore();
    axiosPostSpy.mockRestore();
    axiosPutSpy.mockRestore();
  });

  it('4. Existing MOV → YouTube: Uses original MOV without conversion', async () => {
    const movUrl = createSampleUpload(`original_quicktime_${Date.now()}.mov`, 'fake mov binary buffer');

    const convSpy = vi.spyOn(videoConversionService, 'convertImageToVideo');
    const axiosPostSpy = vi.spyOn(axios, 'post').mockResolvedValueOnce({
      headers: { location: 'https://www.googleapis.com/upload/youtube/v3/videos?session_id=upload_mov_444' },
      data: {}
    });
    const axiosPutSpy = vi.spyOn(axios, 'put').mockResolvedValueOnce({
      data: { id: 'yt_native_mov_444' }
    });

    const res = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        caption: 'Native MOV video release',
        mediaUrl: movUrl,
        mediaType: 'VIDEO',
        platforms: [{ platform: 'YOUTUBE', socialAccountId: ytAccountId }]
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    // CRITICAL: Must NOT call image-to-video conversion!
    expect(convSpy).not.toHaveBeenCalled();

    const platformResult = res.body.data.platforms[0];
    expect(platformResult.status).toBe('PUBLISHED');
    expect(platformResult.platformPostId).toBe('yt_native_mov_444');

    convSpy.mockRestore();
    axiosPostSpy.mockRestore();
    axiosPutSpy.mockRestore();
  });

  it('5. Image + Facebook + YouTube: Facebook gets original image, YouTube gets converted MP4 without modifying original image', async () => {
    const uploadDir = path.resolve('uploads');
    const imgFilename = `multi_fb_yt_${Date.now()}.jpg`;
    const imgFullPath = path.join(uploadDir, imgFilename);

    const { execFileSync } = await import('child_process');
    execFileSync(videoConversionService.ffmpegPath, [
      '-y', '-f', 'lavfi', '-i', 'color=c=cyan:s=500x500', '-frames:v', '1', imgFullPath
    ]);
    testFilesToClean.push(imgFullPath);
    const originalMediaUrl = `/uploads/${imgFilename}`;

    // Mock Facebook publishing (expects original image)
    const fbPublishSpy = vi.spyOn(facebookProvider, 'publishPost').mockImplementation(async (params) => {
      expect(params.mediaUrl).toBe(originalMediaUrl);
      expect(params.mediaType).toBe('IMAGE');
      return { platformPostId: 'fb_post_multi_555' };
    });

    // Mock YouTube upload
    const axiosPostSpy = vi.spyOn(axios, 'post').mockResolvedValueOnce({
      headers: { location: 'https://www.googleapis.com/upload/youtube/v3/videos?session_id=multi_fb_yt' },
      data: {}
    });
    const axiosPutSpy = vi.spyOn(axios, 'put').mockResolvedValueOnce({
      data: { id: 'yt_video_multi_555' }
    });

    const res = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        caption: 'Simultaneous cross-post to Facebook and YouTube',
        mediaUrl: originalMediaUrl,
        mediaType: 'IMAGE',
        platforms: [
          { platform: 'FACEBOOK', socialAccountId: fbAccountId },
          { platform: 'YOUTUBE', socialAccountId: ytAccountId }
        ]
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);

    const postRecord = res.body.data;
    // Composite status must be PUBLISHED
    expect(postRecord.status).toBe('PUBLISHED');
    // Original mediaUrl on the Post must remain strictly unchanged!
    expect(postRecord.mediaUrl).toBe(originalMediaUrl);
    expect(postRecord.mediaType).toBe('IMAGE');

    const fbTarget = postRecord.platforms.find(p => p.platform === 'FACEBOOK');
    const ytTarget = postRecord.platforms.find(p => p.platform === 'YOUTUBE');

    expect(fbTarget.status).toBe('PUBLISHED');
    expect(fbTarget.platformPostId).toBe('fb_post_multi_555');

    expect(ytTarget.status).toBe('PUBLISHED');
    expect(ytTarget.platformPostId).toBe('yt_video_multi_555');

    // Confirm original file still exists
    expect(fs.existsSync(imgFullPath)).toBe(true);

    fbPublishSpy.mockRestore();
    axiosPostSpy.mockRestore();
    axiosPutSpy.mockRestore();
  });

  it('6. Image + LinkedIn + YouTube: LinkedIn gets original image, YouTube gets converted MP4', async () => {
    const uploadDir = path.resolve('uploads');
    const imgFilename = `multi_li_yt_${Date.now()}.png`;
    const imgFullPath = path.join(uploadDir, imgFilename);

    const { execFileSync } = await import('child_process');
    execFileSync(videoConversionService.ffmpegPath, [
      '-y', '-f', 'lavfi', '-i', 'color=c=magenta:s=600x400', '-frames:v', '1', imgFullPath
    ]);
    testFilesToClean.push(imgFullPath);
    const originalMediaUrl = `/uploads/${imgFilename}`;

    // Mock LinkedIn publishing
    const liPublishSpy = vi.spyOn(linkedinProvider, 'publishPost').mockImplementation(async (params) => {
      expect(params.mediaUrl).toBe(originalMediaUrl);
      expect(params.mediaType).toBe('IMAGE');
      return { platformPostId: 'urn:li:share:multi_li_666' };
    });

    // Mock YouTube upload
    const axiosPostSpy = vi.spyOn(axios, 'post').mockResolvedValueOnce({
      headers: { location: 'https://www.googleapis.com/upload/youtube/v3/videos?session_id=multi_li_yt' },
      data: {}
    });
    const axiosPutSpy = vi.spyOn(axios, 'put').mockResolvedValueOnce({
      data: { id: 'yt_video_multi_666' }
    });

    const res = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        caption: 'Simultaneous cross-post to LinkedIn and YouTube',
        mediaUrl: originalMediaUrl,
        mediaType: 'IMAGE',
        platforms: [
          { platform: 'LINKEDIN', socialAccountId: liAccountId },
          { platform: 'YOUTUBE', socialAccountId: ytAccountId }
        ]
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);

    const postRecord = res.body.data;
    expect(postRecord.status).toBe('PUBLISHED');
    expect(postRecord.mediaUrl).toBe(originalMediaUrl);

    const liTarget = postRecord.platforms.find(p => p.platform === 'LINKEDIN');
    const ytTarget = postRecord.platforms.find(p => p.platform === 'YOUTUBE');

    expect(liTarget.status).toBe('PUBLISHED');
    expect(liTarget.platformPostId).toBe('urn:li:share:multi_li_666');

    expect(ytTarget.status).toBe('PUBLISHED');
    expect(ytTarget.platformPostId).toBe('yt_video_multi_666');

    liPublishSpy.mockRestore();
    axiosPostSpy.mockRestore();
    axiosPutSpy.mockRestore();
  });

  it('7. Text-only + YouTube rejection: Rejects text-only posts targeting YouTube with a clear error and preserves partial isolation', async () => {
    // Post to both Facebook (text works!) and YouTube (requires video!)
    const fbPublishSpy = vi.spyOn(facebookProvider, 'publishPost').mockResolvedValueOnce({
      platformPostId: 'fb_text_post_777'
    });

    const res = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        caption: 'Text-only post without any media attachment',
        mediaUrl: null,
        mediaType: 'NONE',
        platforms: [
          { platform: 'FACEBOOK', socialAccountId: fbAccountId },
          { platform: 'YOUTUBE', socialAccountId: ytAccountId }
        ]
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);

    const postRecord = res.body.data;
    // Composite status must be PARTIALLY_PUBLISHED (Facebook succeeded, YouTube failed)
    expect(postRecord.status).toBe('PARTIALLY_PUBLISHED');

    const fbTarget = postRecord.platforms.find(p => p.platform === 'FACEBOOK');
    const ytTarget = postRecord.platforms.find(p => p.platform === 'YOUTUBE');

    expect(fbTarget.status).toBe('PUBLISHED');
    expect(fbTarget.platformPostId).toBe('fb_text_post_777');

    expect(ytTarget.status).toBe('FAILED');
    expect(ytTarget.errorMessage).toContain('YouTube publishing requires video media');

    fbPublishSpy.mockRestore();
  });
});
