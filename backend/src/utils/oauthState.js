import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';

const STATE_PURPOSE = 'socialflow_oauth_state';

/**
 * Generate a CSRF-safe signed OAuth state token
 * @param {string} userId - ID of the authenticated user
 * @param {string} platform - Platform identifier (FACEBOOK, LINKEDIN, etc.)
 * @returns {string} Signed JWT state token
 */
export function generateOAuthState(userId, platform) {
  return jwt.sign(
    {
      sub: userId,
      platform: platform.toUpperCase(),
      purpose: STATE_PURPOSE,
      nonce: Math.random().toString(36).substring(2, 15)
    },
    config.jwtSecret,
    { expiresIn: '15m' }
  );
}

/**
 * Verify and decode an OAuth state token
 * @param {string} stateToken - The state returned from the OAuth provider
 * @param {string} expectedPlatform - The platform callback being handled
 * @returns {{ userId: string, platform: string }}
 */
export function verifyOAuthState(stateToken, expectedPlatform) {
  if (!stateToken) {
    throw new Error('OAuth state parameter is missing');
  }

  try {
    const decoded = jwt.verify(stateToken, config.jwtSecret);
    if (decoded.purpose !== STATE_PURPOSE) {
      throw new Error('Invalid OAuth state purpose');
    }
    if (decoded.platform !== expectedPlatform.toUpperCase()) {
      throw new Error(`OAuth state platform mismatch: expected ${expectedPlatform}, got ${decoded.platform}`);
    }
    return {
      userId: decoded.sub,
      platform: decoded.platform
    };
  } catch (err) {
    throw new Error(`OAuth state verification failed: ${err.message}`);
  }
}
