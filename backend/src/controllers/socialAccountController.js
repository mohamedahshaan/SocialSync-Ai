import { prisma } from '../utils/prisma.js';
import { config } from '../config/index.js';

/**
 * List all connected social accounts for the authenticated user
 */
export async function getSocialAccounts(req, res, next) {
  try {
    const accounts = await prisma.socialAccount.findMany({
      where: {
        userId: req.user.id
      },
      select: {
        id: true,
        userId: true,
        platform: true,
        platformUserId: true,
        accountName: true,
        accountUsername: true,
        accountImage: true,
        status: true,
        tokenExpiresAt: true,
        createdAt: true,
        updatedAt: true
        // NOTE: accessToken and refreshToken are explicitly excluded!
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: accounts
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get readiness status of each platform in the backend environment
 */
export async function getPlatformStatus(req, res) {
  const readiness = {
    FACEBOOK: {
      isConfigured: config.oauth.facebook.isConfigured,
      name: 'Facebook',
      requiredVars: ['FACEBOOK_CLIENT_ID', 'FACEBOOK_CLIENT_SECRET']
    },
    INSTAGRAM: {
      isConfigured: config.oauth.instagram.isConfigured,
      name: 'Instagram',
      requiredVars: ['INSTAGRAM_CLIENT_ID', 'INSTAGRAM_CLIENT_SECRET']
    },
    LINKEDIN: {
      isConfigured: config.oauth.linkedin.isConfigured,
      name: 'LinkedIn',
      requiredVars: ['LINKEDIN_CLIENT_ID', 'LINKEDIN_CLIENT_SECRET']
    },
    THREADS: {
      isConfigured: config.oauth.threads.isConfigured,
      name: 'Threads',
      requiredVars: ['THREADS_CLIENT_ID', 'THREADS_CLIENT_SECRET']
    },
    TIKTOK: {
      isConfigured: config.oauth.tiktok.isConfigured,
      name: 'TikTok',
      requiredVars: ['TIKTOK_CLIENT_KEY', 'TIKTOK_CLIENT_SECRET']
    },
    YOUTUBE: {
      isConfigured: config.oauth.youtube.isConfigured,
      name: 'YouTube',
      requiredVars: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET']
    }
  };

  res.json({
    success: true,
    data: readiness
  });
}

/**
 * Best-effort token revocation with provider where supported
 */
async function revokeProviderToken(account) {
  if (!account || !account.accessToken) return;
  if (
    account.accessToken.startsWith('super_admin_verified_') ||
    account.accessToken.startsWith('demo_') ||
    account.accessToken.startsWith('mock_') ||
    account.accessToken.startsWith('test_')
  ) {
    return;
  }

  try {
    const platform = account.platform;
    if (platform === 'YOUTUBE') {
      const token = account.refreshToken || account.accessToken;
      await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }).catch(() => {});
    } else if (platform === 'FACEBOOK' || platform === 'INSTAGRAM' || platform === 'THREADS') {
      const targetId = account.platformUserId || 'me';
      await fetch(
        `https://graph.facebook.com/v19.0/${targetId}/permissions?access_token=${encodeURIComponent(account.accessToken)}`,
        { method: 'DELETE' }
      ).catch(() => {});
    } else if (platform === 'LINKEDIN') {
      const params = new URLSearchParams({
        token: account.accessToken,
        client_id: config.oauth.linkedin.clientId || '',
        client_secret: config.oauth.linkedin.clientSecret || ''
      });
      await fetch('https://www.linkedin.com/oauth/v2/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString()
      }).catch(() => {});
    } else if (platform === 'TIKTOK') {
      const params = new URLSearchParams({
        client_key: config.oauth.tiktok.clientKey || '',
        client_secret: config.oauth.tiktok.clientSecret || '',
        token: account.accessToken
      });
      await fetch('https://open.tiktokapis.com/v2/oauth/revoke/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString()
      }).catch(() => {});
    }
  } catch (err) {
    console.warn(`[REVOKE_TOKEN] Best-effort revocation failed for ${account.platform}:`, err.message);
  }
}

/**
 * Disconnect a social account (strict user isolation with token revocation)
 */
export async function disconnectAccount(req, res, next) {
  try {
    const { id } = req.params;

    // Check that account belongs to current user
    const account = await prisma.socialAccount.findFirst({
      where: {
        id,
        userId: req.user.id
      }
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Social account not found or access denied',
        error: 'ACCOUNT_NOT_FOUND'
      });
    }

    // Revoke token with provider before deleting local record
    await revokeProviderToken(account);

    // Delete associated post-platform links first
    await prisma.postPlatform.deleteMany({
      where: { socialAccountId: id }
    });

    await prisma.socialAccount.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: `${account.platform} account disconnected successfully`
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Disabled demo link endpoints - real OAuth must always be used
 */
export async function linkAdminAllAccounts(req, res) {
  return res.status(400).json({
    success: false,
    message: 'Demo social account linking has been disabled. Connect real accounts using the official OAuth flow.',
    error: 'DEMO_CONNECTIONS_DISABLED'
  });
}

export async function linkAdminPlatformAccount(req, res) {
  return res.status(400).json({
    success: false,
    message: 'Demo social account linking has been disabled. Connect real accounts using the official OAuth flow.',
    error: 'DEMO_CONNECTIONS_DISABLED'
  });
}

