import axios from 'axios';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { SocialProvider } from './socialProvider.js';
import { config } from '../../config/index.js';
import { storageService } from '../storageService.js';

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
      console.warn('[TIKTOK_CREATOR_QUERY_WARN] Using default privacy level SELF_ONLY:', creatorErr.message);
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
        const localFilePath = storageService.getLocalFilePath(imgUrl);
        if (localFilePath && fs.existsSync(localFilePath)) {
          const stats = await fs.promises.stat(localFilePath);
          if (stats.size > 20 * 1024 * 1024) {
            throw new Error(`TikTok photo upload failed: Image size (${Math.round(stats.size / (1024 * 1024))}MB) exceeds 20MB limit.`);
          }
          const ext = path.extname(localFilePath).toLowerCase();
          if (!['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
            throw new Error(`TikTok photo upload failed: Unsupported format "${ext}". Allowed: JPEG, PNG, WebP.`);
          }
        }

        const fullUrl = imgUrl.startsWith('http://') || imgUrl.startsWith('https://')
          ? imgUrl
          : `${config.backendUrl}${imgUrl.startsWith('/') ? '' : '/'}${imgUrl}`;
        publicImageUrls.push(fullUrl);
      }

      const photoPayload = {
        post_info: {
          title: caption ? caption.substring(0, 90) : 'Photo Post',
          description: caption ? caption.substring(0, 2200) : '',
          privacy_level: privacyLevel,
          disable_comment: false,
          auto_add_music: true
        },
        source_info: {
          source: 'PULL_FROM_URL',
          photo_cover_index: 1,
          photo_images: publicImageUrls
        },
        post_mode: 'DIRECT_POST',
        media_type: 'PHOTO'
      };

      const initRes = await axios.post(
        `${this.apiBase}/post/publish/content/init/`,
        photoPayload,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json; charset=UTF-8'
          }
        }
      );

      const initData = initRes.data?.data;
      const publishId = initData?.publish_id;

      if (!publishId) {
        const errMsg = initRes.data?.error?.message || initRes.data?.message || 'TikTok failed to initialize photo post';
        throw new Error(`TikTok photo init failed: ${errMsg}`);
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

    const initRes = await axios.post(
      `${this.apiBase}/post/publish/video/init/`,
      initPayload,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json; charset=UTF-8'
        }
      }
    );

    const initData = initRes.data?.data;
    const publishId = initData?.publish_id;
    const uploadUrl = initData?.upload_url;

    if (!publishId || !uploadUrl) {
      const errMsg = initRes.data?.error?.message || 'TikTok failed to initialize video upload session';
      throw new Error(`TikTok video init failed: ${errMsg}`);
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

        const status = statusRes.data?.data?.status;
        if (status === 'PUBLISH_COMPLETE') {
          isComplete = true;
        } else if (status === 'FAILED') {
          const reason = statusRes.data?.data?.fail_reason || statusRes.data?.error?.message || 'Unknown processing error';
          throw new Error(`TikTok ${type} publishing failed: ${reason}`);
        }
      } catch (pollErr) {
        if (pollErr.message.includes(`TikTok ${type} publishing failed`)) {
          throw pollErr;
        }
      }
    }

    if (!isComplete) {
      console.warn(`[TIKTOK_POLL_TIMEOUT] TikTok ${type} ${publishId} still processing after ${attempts} attempts`);
    }

    return { platformPostId: publishId };
  }
}

export const tiktokProvider = new TikTokProvider();
