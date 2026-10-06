import axios from 'axios';
import { SocialProvider } from './socialProvider.js';
import { config } from '../../config/index.js';

export class YouTubeProvider extends SocialProvider {
  constructor() {
    super('YOUTUBE');
    this.clientId = config.oauth.youtube?.clientId;
    this.clientSecret = config.oauth.youtube?.clientSecret;
    this.redirectUri = config.oauth.youtube?.redirectUri;
    this.authUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
    this.tokenUrl = 'https://oauth2.googleapis.com/token';
    this.channelsUrl = 'https://www.googleapis.com/youtube/v3/channels';
    this.userInfoUrl = 'https://www.googleapis.com/oauth2/v3/userinfo';
  }

  isConfigured() {
    // Read dynamically from config to reflect any runtime updates
    const cId = config.oauth.youtube?.clientId || this.clientId;
    const cSecret = config.oauth.youtube?.clientSecret || this.clientSecret;
    return Boolean(cId && cSecret);
  }

  getAuthorizationUrl(state) {
    if (!this.isConfigured()) {
      throw new Error('CONFIGURATION_REQUIRED: Google Client ID and Client Secret are not configured.');
    }

    const clientId = config.oauth.youtube?.clientId || this.clientId;
    const redirectUri = config.oauth.youtube?.redirectUri || this.redirectUri;
    const scopes = config.oauth.youtube?.scopes || [
      'https://www.googleapis.com/auth/youtube.upload',
      'https://www.googleapis.com/auth/youtube.readonly',
      'openid',
      'email',
      'profile'
    ].join(' ');

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: scopes,
      state: state,
      access_type: 'offline',
      prompt: 'consent',
      include_granted_scopes: 'true'
    });

    return `${this.authUrl}?${params.toString()}`;
  }

  async handleCallback(code) {
    if (!this.isConfigured()) {
      throw new Error('CONFIGURATION_REQUIRED: Google Client ID and Client Secret are not configured.');
    }

    const clientId = config.oauth.youtube?.clientId || this.clientId;
    const clientSecret = config.oauth.youtube?.clientSecret || this.clientSecret;
    const redirectUri = config.oauth.youtube?.redirectUri || this.redirectUri;

    // 1. Exchange authorization code for tokens with official Google token endpoint
    const tokenRes = await axios.post(
      this.tokenUrl,
      new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      }).toString(),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );

    const { access_token, refresh_token, expires_in } = tokenRes.data;

    if (!access_token) {
      throw new Error('Failed to retrieve access token from Google OAuth endpoint');
    }

    // 2. Query YouTube Data API v3 to identify the connected channel
    let channelData = null;
    try {
      const channelRes = await axios.get(this.channelsUrl, {
        params: {
          part: 'snippet,contentDetails',
          mine: 'true'
        },
        headers: {
          Authorization: `Bearer ${access_token}`,
          Accept: 'application/json'
        }
      });

      if (channelRes.data?.items && channelRes.data.items.length > 0) {
        channelData = channelRes.data.items[0];
      }
    } catch (apiErr) {
      console.warn('[YOUTUBE_CHANNEL_FETCH_WARNING]', apiErr.response?.data || apiErr.message);
    }

    let platformUserId = '';
    let accountName = '';
    let accountUsername = '';

    if (channelData) {
      platformUserId = channelData.id;
      accountName = channelData.snippet?.title || 'YouTube Channel';
      accountUsername = channelData.snippet?.customUrl || channelData.snippet?.title || '';
    } else {
      // Fallback: If user has a Google account without a created YouTube channel yet, fetch basic profile
      try {
        const userRes = await axios.get(this.userInfoUrl, {
          headers: { Authorization: `Bearer ${access_token}` }
        });
        platformUserId = userRes.data?.sub || `google_${Date.now()}`;
        accountName = userRes.data?.name ? `${userRes.data.name} (YouTube)` : 'YouTube Channel';
        accountUsername = userRes.data?.email || '';
      } catch (userErr) {
        throw new Error('Could not retrieve YouTube channel or Google account identity.');
      }
    }

    const tokenExpiresAt = expires_in
      ? new Date(Date.now() + expires_in * 1000)
      : new Date(Date.now() + 3600 * 1000);

    return {
      accessToken: access_token,
      refreshToken: refresh_token || null,
      tokenExpiresAt,
      platformUserId,
      accountName,
      accountUsername
    };
  }

  async refreshToken(refreshToken) {
    if (!this.isConfigured()) {
      throw new Error('CONFIGURATION_REQUIRED: Google Client ID and Client Secret are not configured.');
    }

    const clientId = config.oauth.youtube?.clientId || this.clientId;
    const clientSecret = config.oauth.youtube?.clientSecret || this.clientSecret;

    const response = await axios.post(
      this.tokenUrl,
      new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token'
      }).toString(),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );

    const { access_token, expires_in } = response.data;
    return {
      accessToken: access_token,
      tokenExpiresAt: new Date(Date.now() + (expires_in || 3600) * 1000)
    };
  }

  async publishPost(params) {
    throw new Error('YouTube video publishing will be implemented in the next phase.');
  }
}

export const youtubeProvider = new YouTubeProvider();
