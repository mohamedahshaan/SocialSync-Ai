/**
 * Abstract Base Class for Social Media Providers
 */
export class SocialProvider {
  constructor(platformName) {
    this.platform = platformName;
  }

  /**
   * Get the official OAuth authorization URL
   * @param {string} state - CSRF state token
   * @returns {string} Official OAuth URL
   */
  getAuthorizationUrl(state) {
    throw new Error(`getAuthorizationUrl not implemented for ${this.platform}`);
  }

  /**
   * Exchange authorization code for access and refresh tokens
   * @param {string} code - OAuth authorization code
   * @returns {Promise<{ accessToken: string, refreshToken?: string, tokenExpiresAt?: Date, platformUserId: string, accountName: string, accountUsername?: string }>}
   */
  async handleCallback(code) {
    throw new Error(`handleCallback not implemented for ${this.platform}`);
  }

  /**
   * Publish post to the official platform API
   * @param {Object} params
   * @param {string} params.accessToken
   * @param {string} params.caption
   * @param {string} [params.mediaUrl]
   * @param {string} [params.mediaType]
   * @param {string} params.platformUserId
   * @returns {Promise<{ platformPostId: string, url?: string }>}
   */
  async publishPost(params) {
    throw new Error(`publishPost not implemented for ${this.platform}`);
  }

  /**
   * Refresh expired access token using refresh token
   * @param {string} refreshToken
   * @returns {Promise<{ accessToken: string, refreshToken?: string, tokenExpiresAt?: Date }>}
   */
  async refreshToken(refreshToken) {
    throw new Error(`refreshToken not implemented for ${this.platform}`);
  }

  /**
   * Validate media requirements for this platform
   * @param {string} mediaType - IMAGE or VIDEO
   * @param {number} size - File size in bytes
   * @returns {{ valid: boolean, error?: string }}
   */
  validateMedia(mediaType, size) {
    return { valid: true };
  }
}
