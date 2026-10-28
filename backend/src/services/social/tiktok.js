import axios from 'axios';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { execFile } from 'child_process';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import { SocialProvider } from './socialProvider.js';
import { config, cleanUrl } from '../../config/index.js';
import { storageService } from '../storageService.js';

const execFileAsync = promisify(execFile);

// Cache for PKCE verifiers keyed by state (expires in 15 min)
const pkceStore = new Map();

export class TikTokProvider extends SocialProvider {
  constructor() {
    super('TIKTOK');
    this.clientKey = config.oauth.tiktok.clientKey;
    this.clientSecret = config.oauth.tiktok.clientSecret;
    this.redirectUri = config.oauth.tiktok.redirectUri;
    this.scopes = config.oauth.tiktok.scopes || 'user.info.basic,video.publish,video.upload';
    this.authUrl = 'https://www.tiktok.com/v2/auth/authorize/';
    this.tokenUrl = 'https://open.tiktokapis.com/v2/oauth/token/';
    this.apiBase = 'https://open.tiktokapis.com/v2';
  }

  isConfigured() {
    return Boolean(this.clientKey && this.clientSecret);
  }

  /**
   * Generate official TikTok OAuth 2.0 authorization URL with PKCE
   * @param {string} state - CSRF state token bound to user
   */
  getAuthorizationUrl(state) {
    if (!this.isConfigured()) {
      throw new Error('CONFIGURATION_REQUIRED: TikTok Client Key and Client Secret are not configured.');
    }

    // Generate PKCE code verifier and challenge
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');

    pkceStore.set(state, codeVerifier);
    setTimeout(() => pkceStore.delete(state), 15 * 60 * 1000);

    const params = new URLSearchParams({
      client_key: this.clientKey,
      scope: this.scopes,
      response_type: 'code',
      redirect_uri: this.redirectUri,
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256'
    });

    return `${this.authUrl}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for TikTok user access token
   * @param {string} code
   * @param {string} state
   */
  async handleCallback(code, state) {
    if (!this.isConfigured()) {
      throw new Error('CONFIGURATION_REQUIRED: TikTok Client Key and Client Secret are not configured.');
    }

    const codeVerifier = pkceStore.get(state) || 'challenge_fallback';
    pkceStore.delete(state);

    const tokenRes = await axios.post(
      this.tokenUrl,
      new URLSearchParams({
        client_key: this.clientKey,
        client_secret: this.clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: this.redirectUri,
        code_verifier: codeVerifier
      }).toString(),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );

    const data = tokenRes.data?.data || tokenRes.data;
    const { access_token, refresh_token, expires_in, open_id } = data;

    if (!access_token) {
      const err = tokenRes.data?.error_description || tokenRes.data?.message || 'Failed to exchange TikTok authorization code';
      throw new Error(`TikTok authorization failed: ${err}`);
    }

    // Fetch user basic profile info
    let accountName = 'TikTok Creator';
    let accountUsername = `@user_${(open_id || '').substring(0, 8)}`;
    let accountImage = null;

    try {
      const userRes = await axios.get(`${this.apiBase}/user/info/?fields=open_id,union_id,avatar_url,display_name,username`, {
        headers: { Authorization: `Bearer ${access_token}` }
      });
      const userData = userRes.data?.data?.user;
      if (userData) {
        accountName = userData.display_name || userData.username || accountName;
        accountUsername = userData.username ? `@${userData.username}` : (userData.display_name || accountUsername);
        accountImage = userData.avatar_url || null;
      }
    } catch (profileErr) {
      console.warn('[TIKTOK_PROFILE_WARN] Could not retrieve display name, using open_id fallback:', profileErr.message);
    }

    return {
      accessToken: access_token,
      refreshToken: refresh_token || null,
      tokenExpiresAt: new Date(Date.now() + (expires_in || 86400) * 1000),
      platformUserId: open_id || 'tiktok_user',
      accountName,
      accountUsername,
      accountImage
    };
  }

  /**
   * Safely formats and sanitizes errors returned from TikTok API endpoints.
   * Extracts HTTP status, error code, human-readable message, and log_id.
   * Strips any access tokens, client secrets, or private credentials before logging.
   */
  handleTikTokApiError(err, actionContext = 'TikTok API operation') {
    if (err.response) {
      const status = err.response.status;
      const data = err.response.data || {};
      const ttError = data.error || {};
      const errCode = ttError.code || data.code || `HTTP_${status}`;
      const errMsg = ttError.message || data.message || err.message;
      const logId = ttError.log_id || data.log_id || err.response.headers?.['x-tt-logid'] || 'N/A';

      // Redact sensitive tokens that might appear in URLs or error responses
      const sanitizedMsg = String(errMsg)
        .replace(/act\.[a-zA-Z0-9_\-]+/g, '[REDACTED_ACCESS_TOKEN]')
        .replace(/client_secret=[^&\s]+/gi, 'client_secret=[REDACTED]');

      console.error(`[TIKTOK_API_ERROR] ${actionContext} failed | HTTP Status: ${status} | TikTok Code: ${errCode} | LogID: ${logId} | Message: ${sanitizedMsg}`);

      const enhancedErr = new Error(`${actionContext} failed [${errCode}] (Status ${status}, LogID ${logId}): ${sanitizedMsg}`);
      enhancedErr.statusCode = status;
      enhancedErr.tiktokCode = errCode;
      enhancedErr.tiktokLogId = logId;
      return enhancedErr;
    }

    console.error(`[TIKTOK_NETWORK_ERROR] ${actionContext} failed: ${err.message}`);
    return err;
  }

  /**
   * Normalize an image URL to ensure it is a valid, absolute HTTPS URL accessible by TikTok PULL_FROM_URL.
   * Replaces localhost/127.0.0.1 or relative paths with the configured public BACKEND_URL.
   */
  resolvePublicImageUrl(rawUrl) {
    if (!rawUrl) return '';

    let urlStr = cleanUrl(String(rawUrl).trim());

    // If URL points to localhost or private IP, strip host and keep relative path
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(urlStr)) {
      try {
        const parsed = new URL(urlStr);
        urlStr = parsed.pathname;
      } catch {}
    }

    // Resolve relative path to absolute URL
    let fullUrl;
    if (urlStr.startsWith('http://') || urlStr.startsWith('https://')) {
      fullUrl = urlStr;
    } else {
      const base = (config.backendUrl || 'https://socialsync.raccoon-ai.io').replace(/\/+$/, '');
      const pathPart = urlStr.startsWith('/') ? urlStr : `/${urlStr}`;
      fullUrl = `${base}${pathPart}`;
    }

    // TikTok strictly requires HTTPS for PULL_FROM_URL (no plain http allowed)
    if (fullUrl.startsWith('http://socialsync.raccoon-ai.io')) {
      fullUrl = fullUrl.replace('http://socialsync.raccoon-ai.io', 'https://socialsync.raccoon-ai.io');
    } else if (fullUrl.startsWith('http://') && !fullUrl.includes('localhost') && !fullUrl.includes('127.0.0.1')) {
      fullUrl = fullUrl.replace(/^http:\/\//i, 'https://');
    }

    return fullUrl;
  }

  /**
   * Pre-processes an image file for TikTok Content Posting API.
   * TikTok photo posts strictly accept JPEG and WebP formats (PNG is rejected with source info errors).
   * If an image on disk is a PNG, transcode it to JPEG using FFmpeg and return the converted URL.
   */
  async prepareImageForTikTok(imgUrl) {
    const localFilePath = storageService.getLocalFilePath(imgUrl);
    if (!localFilePath || !fs.existsSync(localFilePath)) {
      return this.resolvePublicImageUrl(imgUrl);
    }

    const stats = await fs.promises.stat(localFilePath);
    if (stats.size > 20 * 1024 * 1024) {
      throw new Error(`TikTok photo upload failed: Image size (${Math.round(stats.size / (1024 * 1024))}MB) exceeds 20MB limit.`);
    }

    const ext = path.extname(localFilePath).toLowerCase();
    if (ext === '.png') {
      const ffmpegPath = process.env.FFMPEG_PATH || ffmpegInstaller?.path || 'ffmpeg';
      const parsedPath = path.parse(localFilePath);
      const convertedFilename = `${parsedPath.name}-tiktok.jpg`;
      const convertedPath = path.join(parsedPath.dir, convertedFilename);

      if (!fs.existsSync(convertedPath)) {
        try {
          await execFileAsync(ffmpegPath, ['-y', '-i', localFilePath, '-q:v', '2', convertedPath]);
        } catch (convErr) {
          console.warn('[TIKTOK_CONVERT_WARN] Could not transcode PNG to JPEG via FFmpeg:', convErr.message);
          return this.resolvePublicImageUrl(imgUrl);
        }
      }
      return this.resolvePublicImageUrl(`/uploads/${convertedFilename}`);
    }

    if (!['.jpg', '.jpeg', '.webp'].includes(ext)) {
      throw new Error(`TikTok photo upload failed: Unsupported format "${ext}". Allowed: JPEG, WebP.`);
    }

    return this.resolvePublicImageUrl(imgUrl);
  }

  /**
   * Publish Photo or Video to TikTok via Content Posting API v2
   */
  async publishPost({ accessToken, caption, mediaUrl, mediaUrls, mediaType, platformUserId }) {
    if (!this.isConfigured()) {
      throw new Error('CONFIGURATION_REQUIRED: TikTok Client Key and Client Secret are not configured.');
    }

    const allUrls = (Array.isArray(mediaUrls) && mediaUrls.length > 0)
      ? mediaUrls
      : (mediaUrl ? [mediaUrl] : []);

    if (allUrls.length === 0) {
      throw new Error('TikTok requires a photo or video file to publish content. Text-only posts are not supported.');
    }

    const primaryUrl = allUrls[0];
    const isVideo = mediaType === 'VIDEO' || /\.(mp4|mov|webm)$/i.test(primaryUrl.split('?')[0]);
    const isImage = mediaType === 'IMAGE' || /\.(jpg|jpeg|png|webp)$/i.test(primaryUrl.split('?')[0]);

    if (!isVideo && !isImage) {
      throw new Error('Unsupported media format for TikTok. Allowed formats: MP4, MOV videos or JPEG, PNG, WebP photos.');
    }

    // Step 1: Query Creator Info to verify account readiness and allowed privacy settings
    let privacyLevel = 'SELF_ONLY';
    try {
      const creatorRes = await axios.post(
        `${this.apiBase}/post/publish/creator_info/query/`,
        {},
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      const creatorData = creatorRes.data?.data;
      if (creatorData?.privacy_level_options?.includes('PUBLIC_TO_EVERYONE')) {
        privacyLevel = 'PUBLIC_TO_EVERYONE';
      } else if (creatorData?.privacy_level_options?.length > 0) {
        privacyLevel = creatorData.privacy_level_options[0];
      }
    } catch (creatorErr) {
      const ttErr = creatorErr.response?.data?.error || {};
      const logId = ttErr.log_id || 'N/A';
      console.warn(`[TIKTOK_CREATOR_QUERY_WARN] Query failed (LogID: ${logId}), defaulting to SELF_ONLY:`, creatorErr.message);
    }

    // -------------------------------------------------------------
    // PHOTO PUBLISHING WORKFLOW (Content Posting API v2 Direct Post)
    // -------------------------------------------------------------
    if (isImage) {
      if (allUrls.length > 35) {
        throw new Error('TikTok supports a maximum of 35 photos per photo post.');
      }

      const publicImageUrls = [];
      for (const imgUrl of allUrls) {
        const publicUrl = await this.prepareImageForTikTok(imgUrl);
        publicImageUrls.push(publicUrl);
      }

      // TikTok Content Posting API specifications:
      // - source: "PULL_FROM_URL" (only supported source for photo posts)
      // - photo_cover_index: 0-based integer pointing to the cover image in photo_images
      // - post_mode: "DIRECT_POST"
      // - media_type: "PHOTO"
      // - brand_content_toggle & brand_organic_toggle: required booleans for DIRECT_POST
      const photoPayload = {
        post_info: {
          title: caption ? caption.substring(0, 90) : 'Photo Post',
          description: caption ? caption.substring(0, 4000) : '',
          privacy_level: privacyLevel,
          disable_comment: false,
          auto_add_music: true,
          brand_content_toggle: false,
          brand_organic_toggle: false
        },
        source_info: {
          source: 'PULL_FROM_URL',
          photo_cover_index: 0,
          photo_images: publicImageUrls
        },
        post_mode: 'DIRECT_POST',
        media_type: 'PHOTO'
      };

      let initRes;
      try {
        initRes = await axios.post(
          `${this.apiBase}/post/publish/content/init/`,
          photoPayload,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json; charset=UTF-8'
            }
          }
        );
      } catch (postErr) {
        throw this.handleTikTokApiError(postErr, 'TikTok photo publish initialization');
      }

      const initData = initRes.data?.data;
      const publishId = initData?.publish_id;

      if (!publishId) {
        const ttErr = initRes.data?.error || {};
        const errMsg = ttErr.message || initRes.data?.message || 'TikTok failed to initialize photo post';
        const errCode = ttErr.code || 'UNKNOWN_ERROR';
        const logId = ttErr.log_id || 'N/A';
        console.error(`[TIKTOK_PHOTO_INIT_ERROR] Code: ${errCode} | LogID: ${logId} | Message: ${errMsg}`);
        throw new Error(`TikTok photo init failed [${errCode}] (LogID: ${logId}): ${errMsg}`);
      }

      return await this.pollPublishStatus(accessToken, publishId, 'photo');
    }

    // -------------------------------------------------------------
    // VIDEO PUBLISHING WORKFLOW (Chunked File Upload)
    // -------------------------------------------------------------
    // Resolve local video file on disk or remote URL
    const localFilePath = storageService.getLocalFilePath(primaryUrl);
    let fileSizeBytes = 0;
    let buffer = null;

    if (localFilePath && fs.existsSync(localFilePath)) {
      const stats = await fs.promises.stat(localFilePath);
      fileSizeBytes = stats.size;
      buffer = await fs.promises.readFile(localFilePath);
    } else if (primaryUrl.startsWith('http://') || primaryUrl.startsWith('https://')) {
      const mediaRes = await axios.get(primaryUrl, {
        responseType: 'arraybuffer',
        maxBodyLength: Infinity,
        maxContentLength: Infinity
      });
      buffer = Buffer.from(mediaRes.data);
      fileSizeBytes = buffer.length;
    }

    if (!buffer || fileSizeBytes === 0) {
      throw new Error('Failed to resolve video binary content for TikTok upload.');
    }

    // Initialize Direct Post upload session
    const initPayload = {
      post_info: {
        title: caption ? caption.substring(0, 150) : 'SocialFlow Video',
        privacy_level: privacyLevel,
        disable_duet: false,
        disable_comment: false,
        disable_stitch: false,
        video_cover_timestamp_ms: 1000
      },
      source_info: {
        source: 'FILE_UPLOAD',
        video_size: fileSizeBytes,
        chunk_size: fileSizeBytes,
        total_chunk_count: 1
      }
    };

    let initRes;
    try {
      initRes = await axios.post(
        `${this.apiBase}/post/publish/video/init/`,
        initPayload,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json; charset=UTF-8'
          }
        }
      );
    } catch (videoInitErr) {
      throw this.handleTikTokApiError(videoInitErr, 'TikTok video publish initialization');
    }

    const initData = initRes.data?.data;
    const publishId = initData?.publish_id;
    const uploadUrl = initData?.upload_url;

    if (!publishId || !uploadUrl) {
      const ttErr = initRes.data?.error || {};
      const errMsg = ttErr.message || 'TikTok failed to initialize video upload session';
      const errCode = ttErr.code || 'UNKNOWN_ERROR';
      const logId = ttErr.log_id || 'N/A';
      throw new Error(`TikTok video init failed [${errCode}] (LogID: ${logId}): ${errMsg}`);
    }

    // Upload binary video chunk to upload_url
    await axios.put(uploadUrl, buffer, {
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Range': `bytes 0-${fileSizeBytes - 1}/${fileSizeBytes}`,
        'Content-Length': String(fileSizeBytes)
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
      timeout: 300000 // 5 min timeout
    });

    // Poll status until PUBLISH_COMPLETE
    return await this.pollPublishStatus(accessToken, publishId, 'video');
  }

  /**
   * Poll status of a TikTok post publish session until complete or failed
   */
  async pollPublishStatus(accessToken, publishId, type = 'media') {
    let isComplete = false;
    let attempts = 0;
    const maxAttempts = 30; // 30 * 2.5s = ~75s
    while (!isComplete && attempts < maxAttempts) {
      attempts++;
      await new Promise(r => setTimeout(r, 2500));

      try {
        const statusRes = await axios.post(
          `${this.apiBase}/post/publish/status/fetch/`,
          { publish_id: publishId },
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            timeout: 10000
          }
        );

        const statusData = statusRes.data?.data || {};
        const status = statusData.status;
        const ttErr = statusRes.data?.error || {};
        const logId = ttErr.log_id || 'N/A';

        if (status === 'PUBLISH_COMPLETE') {
          isComplete = true;
        } else if (status === 'FAILED') {
          const reason = statusData.fail_reason || ttErr.message || 'Unknown processing error';
          console.error(`[TIKTOK_PUBLISH_FAILED] Type: ${type} | PublishID: ${publishId} | LogID: ${logId} | Fail Reason: ${reason}`);
          throw new Error(`TikTok ${type} publishing failed: ${reason} (LogID: ${logId})`);
        }
      } catch (pollErr) {
        if (pollErr.message.includes(`TikTok ${type} publishing failed`)) {
          throw pollErr;
        }
        console.warn(`[TIKTOK_POLL_RETRY] Attempt ${attempts}/${maxAttempts} error:`, pollErr.message);
      }
    }

    if (!isComplete) {
      console.warn(`[TIKTOK_POLL_TIMEOUT] TikTok ${type} ${publishId} still processing after ${attempts} attempts`);
    }

    return { platformPostId: publishId };
  }
}

export const tiktokProvider = new TikTokProvider();
