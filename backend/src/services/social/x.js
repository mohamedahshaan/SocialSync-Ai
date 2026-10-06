import axios from 'axios';
import crypto from 'crypto';
import { SocialProvider } from './socialProvider.js';
import { config } from '../../config/index.js';

// Cache for PKCE verifiers keyed by state
const pkceStore = new Map();

export class XProvider extends SocialProvider {
  constructor() {
    super('X');
    this.clientId = config.oauth.x.clientId;
    this.clientSecret = config.oauth.x.clientSecret;
    this.redirectUri = config.oauth.x.redirectUri;
    this.authUrl = 'https://twitter.com/i/oauth2/authorize';
    this.tokenUrl = 'https://api.twitter.com/2/oauth2/token';
    this.apiBase = 'https://api.twitter.com/2';
  }

  isConfigured() {
    return Boolean(this.clientId);
  }

  getAuthorizationUrl(state) {
    if (!this.isConfigured()) {
      throw new Error('CONFIGURATION_REQUIRED: X (Twitter) Client ID is not configured.');
    }

    // Generate PKCE code verifier and challenge
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');

    pkceStore.set(state, codeVerifier);
    // Expire PKCE entry after 15 minutes
    setTimeout(() => pkceStore.delete(state), 15 * 60 * 1000);

    const scopes = ['tweet.read', 'tweet.write', 'users.read', 'offline.access'].join(' ');

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: scopes,
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256'
    });

    return `${this.authUrl}?${params.toString()}`;
  }

  async handleCallback(code, state) {
    if (!this.isConfigured()) {
      throw new Error('CONFIGURATION_REQUIRED: X (Twitter) Client ID is not configured.');
    }

    const codeVerifier = pkceStore.get(state) || 'challenge_fallback';
    pkceStore.delete(state);

    const authHeader = Buffer.from(`${this.clientId}:${this.clientSecret || ''}`).toString('base64');

    const tokenRes = await axios.post(
      this.tokenUrl,
      new URLSearchParams({
        code,
        grant_type: 'authorization_code',
        client_id: this.clientId,
        redirect_uri: this.redirectUri,
        code_verifier: codeVerifier
      }).toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${authHeader}`
        }
      }
    );

    const { access_token, refresh_token, expires_in } = tokenRes.data;

    // Fetch user profile via v2 /users/me
    const userRes = await axios.get(`${this.apiBase}/users/me`, {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    const user = userRes.data.data;

    return {
      accessToken: access_token,
      refreshToken: refresh_token || null,
      tokenExpiresAt: new Date(Date.now() + (expires_in || 7200) * 1000),
      platformUserId: user.id,
      accountName: user.name,
      accountUsername: `@${user.username}`
    };
  }

  async publishPost({ accessToken, caption, mediaUrl, mediaType, platformUserId }) {
    if (!this.isConfigured()) {
      throw new Error('CONFIGURATION_REQUIRED: X Client ID is not configured.');
    }

    // Official X API v2 Tweet creation
    const payload = {
      text: caption
    };

    const res = await axios.post(`${this.apiBase}/tweets`, payload, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    return { platformPostId: res.data.data.id };
  }
}

export const xProvider = new XProvider();
