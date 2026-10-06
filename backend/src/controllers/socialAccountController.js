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
    X: {
      isConfigured: config.oauth.x.isConfigured,
      name: 'X (Twitter)',
      requiredVars: ['X_CLIENT_ID', 'X_CLIENT_SECRET']
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
 * Disconnect a social account (strict user isolation!)
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
