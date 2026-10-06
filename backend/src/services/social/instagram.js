import axios from 'axios';
import { SocialProvider } from './socialProvider.js';
import { config } from '../../config/index.js';

export class InstagramProvider extends SocialProvider {
  constructor() {
    super('INSTAGRAM');
    this.clientId = config.oauth.instagram.clientId;
    this.clientSecret = config.oauth.instagram.clientSecret;
    this.redirectUri = config.oauth.instagram.redirectUri;
    this.graphVersion = 'v20.0';
    this.authUrl = 'https://www.instagram.com/oauth/authorize';
    this.tokenUrl = 'https://api.instagram.com/oauth/access_token';
    this.graphBase = `https://graph.instagram.com/${this.graphVersion}`;
  }

  isConfigured() {
    return Boolean(this.clientId && this.clientSecret);
  }

  /**
   * Generate dedicated Instagram OAuth Authorization URL
   * Opens Instagram login (instagram.com/oauth/authorize), NEVER Facebook dialog
   * Uses enable_fb_login=0 to prevent redirection to Facebook OAuth
   */
  getAuthorizationUrl(state) {
    if (!this.isConfigured()) {
      throw new Error('CONFIGURATION_REQUIRED: Instagram App ID and App Secret are not configured.');
    }

    const scopes = config.oauth.instagram.scopes || 'instagram_business_basic,instagram_business_content_publish';

    const params = new URLSearchParams({
      enable_fb_login: '0',
      force_authentication: '1',
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: scopes,
      state
    });

    return `${this.authUrl}?${params.toString()}`;
  }

  /**
   * Handle Instagram OAuth Callback:
   * 1. Exchange authorization code at api.instagram.com/oauth/access_token
   * 2. Exchange short-lived token for 60-day long-lived token via graph.instagram.com/access_token
   * 3. Fetch authenticated Instagram profile at graph.instagram.com/v20.0/me
   */
  async handleCallback(code) {
    if (!this.isConfigured()) {
      throw new Error('CONFIGURATION_REQUIRED: Instagram App ID and App Secret are not configured.');
    }

    // Instagram sometimes appends #_ to the redirect URI
    const cleanCode = code ? String(code).replace(/#_$/, '') : '';

    // 1. Exchange code for short-lived access token
    const tokenRes = await axios.post(
      this.tokenUrl,
      new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: 'authorization_code',
        redirect_uri: this.redirectUri,
        code: cleanCode
      }).toString(),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );

    const { access_token: shortLivedToken, user_id } = tokenRes.data;

    // 2. Exchange for 60-day long-lived token via graph.instagram.com
    let finalToken = shortLivedToken;
    let tokenExpiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);

    try {
      const longLivedRes = await axios.get('https://graph.instagram.com/access_token', {
        params: {
          grant_type: 'ig_exchange_token',
          client_secret: this.clientSecret,
          access_token: shortLivedToken
        }
      });

      if (longLivedRes.data?.access_token) {
        finalToken = longLivedRes.data.access_token;
        const expiresIn = longLivedRes.data.expires_in || 5184000;
        tokenExpiresAt = new Date(Date.now() + expiresIn * 1000);
      }
    } catch (exchangeErr) {
      console.warn('[INSTAGRAM_LONG_LIVED_TOKEN_WARNING]', exchangeErr.response?.data || exchangeErr.message);
    }

    // 3. Fetch authenticated Instagram account details
    const userRes = await axios.get(`${this.graphBase}/me`, {
      params: {
        fields: 'id,username,name,account_type',
        access_token: finalToken
      }
    });

    const igAccount = userRes.data;
    const platformUserId = String(igAccount.id || user_id);
    const accountName = igAccount.name || igAccount.username || 'Instagram Professional';
    const accountUsername = igAccount.username ? `@${igAccount.username}` : undefined;

    return {
      accessToken: finalToken,
      tokenExpiresAt,
      platformUserId,
      accountName,
      accountUsername
    };
  }

  /**
   * Publish Photo or Video / Reel to Instagram Feed
   */
  async publishPost({ accessToken, caption, mediaUrl, mediaType, platformUserId }) {
    if (!this.isConfigured()) {
      throw new Error('CONFIGURATION_REQUIRED: Instagram App ID and App Secret are not configured.');
    }

    if (!mediaUrl) {
      throw new Error('Instagram requires an image or video to publish a post.');
    }

    const fullMediaUrl = mediaUrl.startsWith('http://') || mediaUrl.startsWith('https://')
      ? mediaUrl
      : `${config.backendUrl}${mediaUrl.startsWith('/') ? '' : '/'}${mediaUrl}`;

    // Step 1: Create media container
    const containerParams = {
      access_token: accessToken,
      caption: caption || ''
    };

    const isVideo = mediaType === 'VIDEO' || /\.(mp4|mov|avi|webm)$/i.test(mediaUrl);

    if (isVideo) {
      containerParams.media_type = 'VIDEO';
      containerParams.video_url = fullMediaUrl;
    } else {
      containerParams.image_url = fullMediaUrl;
    }

    const containerRes = await axios.post(
      `${this.graphBase}/${platformUserId}/media`,
      null,
      { params: containerParams }
    );

    const creationId = containerRes.data.id;

    // For videos, poll until container status is FINISHED before publishing
    if (isVideo) {
      let isReady = false;
      let attempts = 0;
      const maxAttempts = 30; // 30 * 2s = 60s max
      while (!isReady && attempts < maxAttempts) {
        attempts++;
        await new Promise(r => setTimeout(r, 2000));
        try {
          const statusRes = await axios.get(`${this.graphBase}/${creationId}`, {
            params: {
              fields: 'status_code',
              access_token: accessToken
            }
          });
          const statusCode = statusRes.data.status_code;
          if (statusCode === 'FINISHED') {
            isReady = true;
          } else if (statusCode === 'ERROR' || statusCode === 'EXPIRED') {
            throw new Error(`Instagram video processing failed with status: ${statusCode}`);
          }
        } catch (pollErr) {
          if (pollErr.message.includes('Instagram video processing failed')) {
            throw pollErr;
          }
          // Continue polling on transient check error
        }
      }
    }

    // Step 2: Publish media container
    const publishRes = await axios.post(
      `${this.graphBase}/${platformUserId}/media_publish`,
      null,
      {
        params: {
          access_token: accessToken,
          creation_id: creationId
        }
      }
    );

    return { platformPostId: publishRes.data.id };
  }
}

export const instagramProvider = new InstagramProvider();
