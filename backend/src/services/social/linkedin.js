import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { SocialProvider } from './socialProvider.js';
import { config } from '../../config/index.js';
import { storageService } from '../storageService.js';

export class LinkedInProvider extends SocialProvider {
  constructor() {
    super('LINKEDIN');
    this.clientId = config.oauth.linkedin.clientId;
    this.clientSecret = config.oauth.linkedin.clientSecret;
    this.redirectUri = config.oauth.linkedin.redirectUri;
    this.authUrl = 'https://www.linkedin.com/oauth/v2/authorization';
    this.tokenUrl = 'https://www.linkedin.com/oauth/v2/accessToken';
    this.apiBase = 'https://api.linkedin.com';
  }

  isConfigured() {
    return Boolean(this.clientId && this.clientSecret);
  }

  getAuthorizationUrl(state) {
    if (!this.isConfigured()) {
      throw new Error('CONFIGURATION_REQUIRED: LinkedIn Client ID and Client Secret are not configured.');
    }

    const scopes = config.oauth.linkedin.scopes || 'openid profile email w_member_social';

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      state,
      scope: scopes
    });

    return `${this.authUrl}?${params.toString()}`;
  }

  async handleCallback(code) {
    if (!this.isConfigured()) {
      throw new Error('CONFIGURATION_REQUIRED: LinkedIn Client ID and Client Secret are not configured.');
    }

    // 1. Exchange code for access token
    const tokenRes = await axios.post(
      this.tokenUrl,
      new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: this.redirectUri
      }).toString(),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );

    const { access_token, expires_in, refresh_token } = tokenRes.data;

    // 2. Fetch authenticated profile info via OpenID userinfo
    const userRes = await axios.get(`${this.apiBase}/v2/userinfo`, {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    const profile = userRes.data;
    const platformUserId = profile.sub; // URN ID for member
    const accountName = profile.name || `${profile.given_name || ''} ${profile.family_name || ''}`.trim() || 'LinkedIn User';

    return {
      accessToken: access_token,
      refreshToken: refresh_token || null,
      tokenExpiresAt: new Date(Date.now() + (expires_in || 5184000) * 1000),
      platformUserId,
      accountName,
      accountUsername: profile.email || profile.name,
      accountImage: profile.picture || null
    };
  }

  /**
   * Get active LinkedIn API version (format: YYYYMM).
   * Verified against official LinkedIn API documentation:
   * LinkedIn versions follow a monthly YYYYMM format (e.g. '202601').
   * Normalizes any YYYYMMDD (e.g. '20260101') or YYYY-MM formatted strings to valid 6-digit YYYYMM.
   */
  getApiVersion() {
    const rawVersion = config.oauth?.linkedin?.apiVersion || process.env.LINKEDIN_API_VERSION;
    if (rawVersion) {
      const digitsOnly = String(rawVersion).replace(/[^0-9]/g, '');
      if (digitsOnly.length >= 6) {
        return digitsOnly.substring(0, 6);
      }
    }
    return '202601';
  }

  async publishPost({ accessToken, caption, mediaUrl, mediaType, platformUserId }) {
    if (!this.isConfigured()) {
      throw new Error('CONFIGURATION_REQUIRED: LinkedIn Client ID and Client Secret are not configured.');
    }

    const authorUrn = String(platformUserId).startsWith('urn:li:')
      ? platformUserId
      : `urn:li:person:${platformUserId}`;

    const apiVersion = this.getApiVersion();

    const payload = {
      author: authorUrn,
      commentary: caption,
      visibility: 'PUBLIC',
      distribution: {
        feedDistribution: 'MAIN_FEED',
        targetEntities: [],
        thirdPartyDistributionChannels: []
      },
      lifecycleState: 'PUBLISHED',
      isReshareDisabledByAuthor: false
    };

    // If media is provided, upload image or configure article
    if (mediaUrl) {
      const isImage = mediaType === 'IMAGE' || /\.(png|jpe?g|webp|gif)$/i.test(mediaUrl);

      if (isImage) {
        let buffer = null;
        let contentType = 'image/jpeg';

        const localFilePath = storageService.getLocalFilePath(mediaUrl);
        if (localFilePath && fs.existsSync(localFilePath)) {
          buffer = await fs.promises.readFile(localFilePath);
          const ext = path.extname(localFilePath).toLowerCase();
          if (ext === '.png') contentType = 'image/png';
          else if (ext === '.webp') contentType = 'image/webp';
          else if (ext === '.gif') contentType = 'image/gif';
        } else if (mediaUrl.startsWith('http://') || mediaUrl.startsWith('https://')) {
          const mediaRes = await axios.get(mediaUrl, {
            responseType: 'arraybuffer',
            maxBodyLength: Infinity,
            maxContentLength: Infinity
          });
          buffer = Buffer.from(mediaRes.data);
          contentType = mediaRes.headers['content-type'] || 'image/jpeg';
        }

        if (!buffer) {
          throw new Error('Failed to resolve image binary data for LinkedIn upload.');
        }

        // Step 1: Initialize image upload
        const initRes = await axios.post(
          `${this.apiBase}/rest/images?action=initializeUpload`,
          {
            initializeUploadRequest: {
              owner: authorUrn
            }
          },
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'LinkedIn-Version': apiVersion,
              'X-Restli-Protocol-Version': '2.0.0',
              'Content-Type': 'application/json'
            }
          }
        );

        const { uploadUrl, image } = initRes.data.value;

        // Step 2: Upload binary image data
        await axios.put(uploadUrl, buffer, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': contentType
          },
          maxBodyLength: Infinity,
          maxContentLength: Infinity,
          timeout: 120000
        });

        // Step 3: Attach image URN to post content
        payload.content = {
          media: {
            id: image,
            title: caption ? caption.substring(0, 100) : 'SocialFlow Media'
          }
        };
      } else if (mediaType === 'VIDEO' || /\.(mp4|mov|avi|webm)$/i.test(mediaUrl)) {
        let buffer = null;
        let fileSizeBytes = 0;

        const localFilePath = storageService.getLocalFilePath(mediaUrl);
        if (localFilePath && fs.existsSync(localFilePath)) {
          const stats = await fs.promises.stat(localFilePath);
          fileSizeBytes = stats.size;
          buffer = await fs.promises.readFile(localFilePath);
        } else if (mediaUrl.startsWith('http://') || mediaUrl.startsWith('https://')) {
          const mediaRes = await axios.get(mediaUrl, {
            responseType: 'arraybuffer',
            maxBodyLength: Infinity,
            maxContentLength: Infinity
          });
          buffer = Buffer.from(mediaRes.data);
          fileSizeBytes = buffer.length;
        }

        if (!buffer || fileSizeBytes === 0) {
          throw new Error('Failed to resolve video file binary data for LinkedIn upload.');
        }

        // Step 1: Initialize video upload
        const initRes = await axios.post(
          `${this.apiBase}/rest/videos?action=initializeUpload`,
          {
            initializeUploadRequest: {
              owner: authorUrn,
              fileSizeBytes: fileSizeBytes,
              uploadCaptions: false,
              uploadThumbnail: false
            }
          },
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'LinkedIn-Version': apiVersion,
              'X-Restli-Protocol-Version': '2.0.0',
              'Content-Type': 'application/json'
            }
          }
        );

        const { video: videoUrn, uploadInstructions, uploadToken } = initRes.data.value;

        if (!uploadInstructions || uploadInstructions.length === 0) {
          throw new Error('LinkedIn did not return upload instructions for video.');
        }

        // Step 2: Upload parts and collect ETags
        const uploadedPartIds = [];
        for (const instruction of uploadInstructions) {
          const chunk = buffer.subarray(instruction.firstByte, instruction.lastByte + 1);
          const putHeaders = {
            'Content-Type': 'application/octet-stream'
          };
          if (instruction.headers) {
            Object.assign(putHeaders, instruction.headers);
          }

          const partRes = await axios.put(instruction.uploadUrl, chunk, {
            headers: putHeaders,
            maxBodyLength: Infinity,
            maxContentLength: Infinity,
            timeout: 300000
          });

          const rawEtag = partRes.headers['etag'] || partRes.headers.etag;
          if (!rawEtag) {
            throw new Error(`LinkedIn upload part failed: missing ETag header for byte range ${instruction.firstByte}-${instruction.lastByte}`);
          }
          uploadedPartIds.push(rawEtag);
        }

        // Step 3: Finalize upload
        await axios.post(
          `${this.apiBase}/rest/videos?action=finalizeUpload`,
          {
            finalizeUploadRequest: {
              video: videoUrn,
              uploadToken: uploadToken,
              uploadedPartIds: uploadedPartIds
            }
          },
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'LinkedIn-Version': apiVersion,
              'X-Restli-Protocol-Version': '2.0.0',
              'Content-Type': 'application/json'
            }
          }
        );

        // Step 4: Poll video status until AVAILABLE
        let isReady = false;
        let attempts = 0;
        const maxAttempts = 35; // 35 * 2.5s = ~87s
        while (!isReady && attempts < maxAttempts) {
          attempts++;
          await new Promise(r => setTimeout(r, 2500));
          try {
            const statusRes = await axios.get(
              `${this.apiBase}/rest/videos/${encodeURIComponent(videoUrn)}`,
              {
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  'LinkedIn-Version': apiVersion,
                  'X-Restli-Protocol-Version': '2.0.0'
                },
                timeout: 10000
              }
            );
            const videoStatus = statusRes.data?.status;
            if (videoStatus === 'AVAILABLE') {
              isReady = true;
            } else if (videoStatus === 'PROCESSING_FAILED') {
              throw new Error('LinkedIn video processing failed on LinkedIn servers.');
            }
          } catch (pollErr) {
            if (pollErr.message?.includes('LinkedIn video processing failed')) {
              throw pollErr;
            }
            // Transient status polling errors are ignored
          }
        }

        if (!isReady) {
          throw new Error('LinkedIn video processing timed out before reaching AVAILABLE status.');
        }

        // Step 5: Attach video URN to post content
        payload.content = {
          media: {
            id: videoUrn,
            title: caption ? caption.substring(0, 100) : 'SocialFlow Video'
          }
        };
      } else if (mediaUrl.startsWith('http://') || mediaUrl.startsWith('https://')) {
        payload.content = {
          article: {
            source: mediaUrl,
            title: caption ? caption.substring(0, 50) : 'SocialFlow Media Post',
            description: caption ? caption.substring(0, 200) : ''
          }
        };
      }
    }

    const res = await axios.post(`${this.apiBase}/rest/posts`, payload, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'LinkedIn-Version': apiVersion,
        'X-Restli-Protocol-Version': '2.0.0'
      }
    });

    const postId = res.headers['x-restli-id'] || res.data?.id || `urn:li:share:${Date.now()}`;
    return { platformPostId: postId };
  }
}

export const linkedinProvider = new LinkedInProvider();
