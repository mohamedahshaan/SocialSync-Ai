import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { SocialProvider } from './socialProvider.js';
import { config } from '../../config/index.js';
import { storageService } from '../storageService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class FacebookProvider extends SocialProvider {
  constructor() {
    super('FACEBOOK');
    this.clientId = config.oauth.facebook.clientId;
    this.clientSecret = config.oauth.facebook.clientSecret;
    this.redirectUri = config.oauth.facebook.redirectUri;
    this.graphVersion = 'v20.0';
    this.baseUrl = `https://graph.facebook.com/${this.graphVersion}`;
  }

  isConfigured() {
    return Boolean(this.clientId && this.clientSecret);
  }

  getAuthorizationUrl(state) {
    if (!this.isConfigured()) {
      throw new Error('CONFIGURATION_REQUIRED: Facebook App ID and App Secret are not configured.');
    }

    const scopes = config.oauth.facebook.scopes;

    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      state,
      scope: scopes,
      response_type: 'code'
    });

    return `https://www.facebook.com/${this.graphVersion}/dialog/oauth?${params.toString()}`;
  }

  async handleCallback(code) {
    if (!this.isConfigured()) {
      throw new Error('CONFIGURATION_REQUIRED: Facebook App ID and App Secret are not configured.');
    }

    // 1. Exchange code for short-lived user access token
    const tokenRes = await axios.get(`${this.baseUrl}/oauth/access_token`, {
      params: {
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: this.redirectUri,
        code
      }
    });

    const { access_token: shortLivedToken, expires_in } = tokenRes.data;

    // 2. Exchange for long-lived user token (60 days)
    const longLivedRes = await axios.get(`${this.baseUrl}/oauth/access_token`, {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        fb_exchange_token: shortLivedToken
      }
    });

    const userAccessToken = longLivedRes.data.access_token || shortLivedToken;

    // 3. Get user info (including profile picture)
    const meRes = await axios.get(`${this.baseUrl}/me`, {
      params: {
        access_token: userAccessToken,
        fields: 'id,name,picture.type(large)'
      }
    });

    const userPictureUrl = meRes.data?.picture?.data?.url || null;

    // 4. Retrieve managed Facebook Pages (including page avatar)
    const pagesRes = await axios.get(`${this.baseUrl}/me/accounts`, {
      params: {
        access_token: userAccessToken,
        fields: 'id,name,category,access_token,tasks,picture.type(large)'
      }
    });

    const pagesList = (pagesRes.data?.data || []).map(p => ({
      id: String(p.id),
      name: p.name,
      category: p.category || 'General',
      accessToken: p.access_token,
      tasks: p.tasks || [],
      pictureUrl: p.picture?.data?.url || null
    }));

    const expiresAt = expires_in
      ? new Date(Date.now() + expires_in * 1000)
      : new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);

    const primaryPage = pagesList.length > 0 ? pagesList[0] : null;

    return {
      facebookUser: {
        id: meRes.data.id,
        name: meRes.data.name,
        pictureUrl: userPictureUrl
      },
      userAccessToken,
      tokenExpiresAt: expiresAt,
      pages: pagesList,
      accessToken: primaryPage ? primaryPage.accessToken : userAccessToken,
      platformUserId: primaryPage ? primaryPage.id : meRes.data.id,
      accountName: primaryPage ? `${primaryPage.name} (Page)` : meRes.data.name,
      accountUsername: meRes.data.name,
      accountImage: primaryPage ? (primaryPage.pictureUrl || userPictureUrl) : userPictureUrl
    };
  }

  async publishPost({ accessToken, caption, mediaUrl, mediaType, platformUserId }) {
    if (!this.isConfigured()) {
      throw new Error('CONFIGURATION_REQUIRED: Facebook App ID and App Secret are not configured.');
    }

    const normType = (mediaType || '').toUpperCase();
    const isImage = normType === 'IMAGE' || (mediaUrl && /\.(jpg|jpeg|png|webp)$/i.test(mediaUrl.split('?')[0]));
    const isVideo = normType === 'VIDEO' || (mediaUrl && /\.(mp4|mov)$/i.test(mediaUrl.split('?')[0]));

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    case '.webp':
      return 'image/webp';
    case '.mp4':
      return 'video/mp4';
    case '.mov':
      return 'video/quicktime';
    default:
      return 'application/octet-stream';
  }
}

    // 1. IMAGE PUBLISHING
    if (isImage && mediaUrl) {
      const localFilePath = storageService.getLocalFilePath(mediaUrl);

      if (localFilePath) {
        // Upload binary file directly using multipart/form-data
        const blob = await fs.openAsBlob(localFilePath, { type: getMimeType(localFilePath) });
        const formData = new FormData();
        formData.append('source', blob, path.basename(localFilePath));
        if (caption) {
          formData.append('message', caption);
          formData.append('caption', caption);
        }
        formData.append('access_token', accessToken);

        const response = await axios.post(`${this.baseUrl}/${platformUserId}/photos`, formData, {
          maxBodyLength: Infinity,
          maxContentLength: Infinity,
          timeout: 120000
        });
        return { platformPostId: response.data.post_id || response.data.id };
      } else {
        // Remote public URL upload
        let targetUrl = mediaUrl;
        if (targetUrl.startsWith('/')) {
          targetUrl = `${config.backendUrl}${targetUrl}`;
        }
        const response = await axios.post(`${this.baseUrl}/${platformUserId}/photos`, null, {
          params: {
            access_token: accessToken,
            url: targetUrl,
            caption: caption || ''
          },
          timeout: 120000
        });
        return { platformPostId: response.data.post_id || response.data.id };
      }
    }

    // 2. VIDEO PUBLISHING
    if (isVideo && mediaUrl) {
      const localFilePath = storageService.getLocalFilePath(mediaUrl);

      if (localFilePath) {
        // Upload binary video directly using multipart/form-data
        const blob = await fs.openAsBlob(localFilePath, { type: getMimeType(localFilePath) });
        const formData = new FormData();
        formData.append('source', blob, path.basename(localFilePath));
        if (caption) {
          formData.append('description', caption);
        }
        formData.append('published', 'true');
        formData.append('access_token', accessToken);

        const response = await axios.post(`${this.baseUrl}/${platformUserId}/videos`, formData, {
          maxBodyLength: Infinity,
          maxContentLength: Infinity,
          timeout: 300000 // 5 minutes for video upload
        });

        const videoId = response.data?.id;

        // Quick verification of status if available
        if (videoId) {
          let attempts = 0;
          while (attempts < 5) {
            attempts++;
            await new Promise(r => setTimeout(r, 2000));
            try {
              const statusRes = await axios.get(`${this.baseUrl}/${videoId}`, {
                params: {
                  fields: 'status',
                  access_token: accessToken
                },
                timeout: 10000
              });
              const videoStatus = statusRes.data?.status?.video_status;
              if (videoStatus === 'error') {
                throw new Error('Facebook video processing failed on Meta servers.');
              }
              if (videoStatus === 'ready') {
                break;
              }
            } catch (statusErr) {
              if (statusErr.message.includes('Facebook video processing failed')) throw statusErr;
              break;
            }
          }
        }

        return { platformPostId: String(videoId) };
      } else {
        // Remote public video URL
        let targetUrl = mediaUrl;
        if (targetUrl.startsWith('/')) {
          targetUrl = `${config.backendUrl}${targetUrl}`;
        }
        const response = await axios.post(`${this.baseUrl}/${platformUserId}/videos`, null, {
          params: {
            access_token: accessToken,
            file_url: targetUrl,
            description: caption || '',
            published: true
          },
          timeout: 300000
        });
        return { platformPostId: String(response.data.id) };
      }
    }

    // 3. TEXT-ONLY PUBLISHING — UNTOUCHED AND WORKING
    const response = await axios.post(`${this.baseUrl}/${platformUserId}/feed`, null, {
      params: {
        access_token: accessToken,
        message: caption
      }
    });
    return { platformPostId: response.data.id };
  }
}

export const facebookProvider = new FacebookProvider();
