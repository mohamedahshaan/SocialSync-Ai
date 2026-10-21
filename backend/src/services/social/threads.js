import axios from 'axios';
import { SocialProvider } from './socialProvider.js';
import { config } from '../../config/index.js';

export class ThreadsProvider extends SocialProvider {
  constructor() {
    super('THREADS');
    this.clientId = config.oauth.threads.clientId;
    this.clientSecret = config.oauth.threads.clientSecret;
    this.redirectUri = config.oauth.threads.redirectUri;
    this.authUrl = 'https://threads.net/oauth/authorize';
    this.tokenUrl = 'https://graph.threads.net/oauth/access_token';
    this.apiBase = 'https://graph.threads.net/v1.0';
  }

  isConfigured() {
    return Boolean(this.clientId && this.clientSecret);
  }

  getAuthorizationUrl(state) {
    if (!this.isConfigured()) {
      throw new Error('CONFIGURATION_REQUIRED: Threads App ID and App Secret are not configured.');
    }

    const scopes = ['threads_basic', 'threads_content_publish'].join(',');

    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: scopes,
      response_type: 'code',
      state
    });

    return `${this.authUrl}?${params.toString()}`;
  }

  async handleCallback(code) {
    if (!this.isConfigured()) {
      throw new Error('CONFIGURATION_REQUIRED: Threads App ID and App Secret are not configured.');
    }

    // 1. Exchange short-lived token
    const formData = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      grant_type: 'authorization_code',
      redirect_uri: this.redirectUri,
      code
    });

    const tokenRes = await axios.post(this.tokenUrl, formData.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const { access_token: shortLivedToken, user_id } = tokenRes.data;

    // 2. Exchange for long-lived Threads token (60 days)
    const longLivedRes = await axios.get('https://graph.threads.net/access_token', {
      params: {
        grant_type: 'th_exchange_token',
        client_secret: this.clientSecret,
        access_token: shortLivedToken
      }
    });

    const longLivedToken = longLivedRes.data.access_token || shortLivedToken;

    // 3. Fetch user profile
    const meRes = await axios.get(`${this.apiBase}/me`, {
      params: {
        fields: 'id,username,name,threads_profile_picture_url',
        access_token: longLivedToken
      }
    });

    const profile = meRes.data;

    return {
      accessToken: longLivedToken,
      tokenExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      platformUserId: profile.id || String(user_id),
      accountName: profile.name || profile.username || 'Threads User',
      accountUsername: `@${profile.username}`,
      accountImage: profile.threads_profile_picture_url || null
    };
  }

  async publishPost({ accessToken, caption, mediaUrl, mediaType, platformUserId }) {
    if (!this.isConfigured()) {
      throw new Error('CONFIGURATION_REQUIRED: Threads App ID and App Secret are not configured.');
    }

    // Step 1: Create Threads Media Container
    const containerParams = {
      access_token: accessToken,
      text: caption || ''
    };

    if (mediaType === 'IMAGE' && mediaUrl) {
      containerParams.media_type = 'IMAGE';
      containerParams.image_url = mediaUrl;
    } else if (mediaType === 'VIDEO' && mediaUrl) {
      containerParams.media_type = 'VIDEO';
      containerParams.video_url = mediaUrl;
    } else {
      containerParams.media_type = 'TEXT';
    }

    const containerRes = await axios.post(
      `${this.apiBase}/me/threads`,
      null,
      { params: containerParams }
    );

    const creationId = containerRes.data.id;

    // Step 2: Publish Threads Container
    const publishRes = await axios.post(
      `${this.apiBase}/me/threads_publish`,
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

export const threadsProvider = new ThreadsProvider();
