import jwt from 'jsonwebtoken';
import { getProvider } from '../services/social/index.js';
import { generateOAuthState, verifyOAuthState } from '../utils/oauthState.js';
import { prisma } from '../utils/prisma.js';
import { config } from '../config/index.js';

const VALID_PLATFORMS = ['FACEBOOK', 'INSTAGRAM', 'LINKEDIN', 'X', 'THREADS', 'TIKTOK'];

/**
 * Initiate OAuth flow for a platform
 */
export async function initiateOAuth(req, res, next) {
  try {
    const platform = req.params.platform.toUpperCase();

    if (!VALID_PLATFORMS.includes(platform)) {
      return res.status(400).json({
        success: false,
        message: `Unsupported platform: ${platform}`,
        error: 'INVALID_PLATFORM'
      });
    }

    const provider = getProvider(platform);

    if (!provider.isConfigured()) {
      return res.status(400).json({
        success: false,
        message: `${platform} OAuth is not configured yet. Please configure the developer credentials in your environment.`,
        error: 'CONFIGURATION_REQUIRED'
      });
    }

    // Generate CSRF-safe state bound to current user
    const state = generateOAuthState(req.user.id, platform);
    const authUrl = provider.getAuthorizationUrl(state);

    // If client asks for JSON redirect URL, return it; otherwise redirect directly
    if (req.query.json === 'true' || req.headers.accept?.includes('application/json')) {
      return res.json({
        success: true,
        data: { url: authUrl }
      });
    }

    res.redirect(authUrl);
  } catch (error) {
    next(error);
  }
}

/**
 * Handle OAuth callback from platform
 */
export async function handleOAuthCallback(req, res) {
  const platform = req.params.platform.toUpperCase();

  try {
    const { code, state, error, error_description } = req.query;

    if (error) {
      const msg = error_description || error;
      return res.redirect(`${config.frontendUrl}/accounts?error=${encodeURIComponent(msg)}&platform=${platform}`);
    }

    if (!code) {
      return res.redirect(`${config.frontendUrl}/accounts?error=Missing+authorization+code&platform=${platform}`);
    }

    // 1. Verify CSRF-safe state (strictly guarantees the user initiating the OAuth matches!)
    const stateData = verifyOAuthState(state, platform);
    const userId = stateData.userId;

    // 2. Exchange code with official platform provider
    const provider = getProvider(platform);
    const tokenData = await provider.handleCallback(code, state);

    // 3. Multi-Page Selection Handling for Facebook
    if (platform === 'FACEBOOK') {
      const pages = tokenData.pages || [];

      if (pages.length === 0) {
        return res.redirect(
          `${config.frontendUrl}/accounts?error=${encodeURIComponent(
            'No Facebook Pages found. Your Facebook account must create or manage at least one Page to connect.'
          )}&platform=FACEBOOK`
        );
      }

      if (pages.length > 1) {
        // Multiple pages found! Create a short-lived secure selection token
        const selectionToken = jwt.sign(
          {
            userId,
            platform: 'FACEBOOK',
            purpose: 'facebook_page_selection',
            facebookUserName: tokenData.facebookUser?.name || tokenData.accountUsername,
            tokenExpiresAt: tokenData.tokenExpiresAt ? new Date(tokenData.tokenExpiresAt).toISOString() : null,
            pages: pages.map(p => ({
              id: p.id,
              name: p.name,
              category: p.category,
              accessToken: p.accessToken
            }))
          },
          config.jwtSecret,
          { expiresIn: '15m' }
        );

        return res.redirect(
          `${config.frontendUrl}/accounts?select_page=true&platform=FACEBOOK&selection_token=${encodeURIComponent(selectionToken)}`
        );
      }

      // Exactly 1 page found -> proceed to connect this page
      const singlePage = pages[0];
      tokenData.platformUserId = singlePage.id;
      tokenData.accountName = `${singlePage.name} (Page)`;
      tokenData.accessToken = singlePage.accessToken;
    }

    // 4. Upsert social account for user in PostgreSQL (Strictly isolated by userId + platform + platformUserId!)
    const platformUserId = String(tokenData.platformUserId || '');
    await prisma.socialAccount.upsert({
      where: {
        userId_platform_platformUserId: {
          userId,
          platform,
          platformUserId
        }
      },
      create: {
        userId,
        platform,
        platformUserId,
        accountName: tokenData.accountName,
        accountUsername: tokenData.accountUsername || null,
        accessToken: tokenData.accessToken,
        refreshToken: tokenData.refreshToken || null,
        tokenExpiresAt: tokenData.tokenExpiresAt || null,
        status: 'CONNECTED'
      },
      update: {
        accountName: tokenData.accountName,
        accountUsername: tokenData.accountUsername || null,
        accessToken: tokenData.accessToken,
        refreshToken: tokenData.refreshToken || null,
        tokenExpiresAt: tokenData.tokenExpiresAt || null,
        status: 'CONNECTED'
      }
    });

    // 5. Redirect user back to frontend accounts page with success indicator
    res.redirect(`${config.frontendUrl}/accounts?connected=${platform}`);
  } catch (err) {
    console.error(`[OAUTH_CALLBACK_ERROR] Platform: ${platform}`, err.message);
    res.redirect(
      `${config.frontendUrl}/accounts?error=${encodeURIComponent(err.message || 'OAuth authorization failed')}&platform=${platform}`
    );
  }
}

/**
 * Retrieve the list of pages available in a Facebook OAuth session (sanitized without tokens)
 */
export async function getAvailableFacebookPages(req, res, next) {
  try {
    const { selection_token } = req.query;

    if (!selection_token) {
      return res.status(400).json({
        success: false,
        message: 'Missing selection_token parameter',
        error: 'TOKEN_REQUIRED'
      });
    }

    const decoded = jwt.verify(selection_token, config.jwtSecret);
    if (decoded.purpose !== 'facebook_page_selection') {
      return res.status(400).json({
        success: false,
        message: 'Invalid selection session',
        error: 'INVALID_TOKEN'
      });
    }

    // Return sanitized pages list (NEVER leak accessToken to browser client!)
    const safePages = (decoded.pages || []).map(p => ({
      id: p.id,
      name: p.name,
      category: p.category || 'General'
    }));

    res.json({
      success: true,
      data: {
        facebookUserName: decoded.facebookUserName,
        pages: safePages
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Page selection session expired or invalid. Please connect Facebook again.',
      error: 'SESSION_EXPIRED'
    });
  }
}

/**
 * Complete connection for a selected Facebook Page
 */
export async function selectFacebookPage(req, res, next) {
  try {
    const { selectionToken, selectedPageId } = req.body;
    const userId = req.user.id;

    if (!selectionToken || !selectedPageId) {
      return res.status(400).json({
        success: false,
        message: 'selectionToken and selectedPageId are required',
        error: 'MISSING_FIELDS'
      });
    }

    const decoded = jwt.verify(selectionToken, config.jwtSecret);
    if (decoded.purpose !== 'facebook_page_selection') {
      return res.status(400).json({
        success: false,
        message: 'Invalid selection token purpose',
        error: 'INVALID_TOKEN'
      });
    }

    // Security check: verify the initiating user matches the current authenticated user
    if (decoded.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You cannot complete OAuth for another user session',
        error: 'FORBIDDEN_USER_MISMATCH'
      });
    }

    const selectedPage = (decoded.pages || []).find(p => p.id === String(selectedPageId));
    if (!selectedPage) {
      return res.status(404).json({
        success: false,
        message: 'Selected page was not found in your authorized Facebook pages',
        error: 'PAGE_NOT_FOUND'
      });
    }

    // Upsert SocialAccount for this specific user
    const platformUserId = String(selectedPage.id);
    const account = await prisma.socialAccount.upsert({
      where: {
        userId_platform_platformUserId: {
          userId,
          platform: 'FACEBOOK',
          platformUserId
        }
      },
      create: {
        userId,
        platform: 'FACEBOOK',
        platformUserId,
        accountName: `${selectedPage.name} (Page)`,
        accountUsername: decoded.facebookUserName || null,
        accessToken: selectedPage.accessToken,
        tokenExpiresAt: decoded.tokenExpiresAt ? new Date(decoded.tokenExpiresAt) : null,
        status: 'CONNECTED'
      },
      update: {
        accountName: `${selectedPage.name} (Page)`,
        accountUsername: decoded.facebookUserName || null,
        accessToken: selectedPage.accessToken,
        tokenExpiresAt: decoded.tokenExpiresAt ? new Date(decoded.tokenExpiresAt) : null,
        status: 'CONNECTED'
      }
    });

    res.json({
      success: true,
      message: `Successfully connected ${selectedPage.name}!`,
      data: {
        id: account.id,
        platform: account.platform,
        accountName: account.accountName,
        platformUserId: account.platformUserId,
        status: account.status
      }
    });
  } catch (error) {
    next(error);
  }
}
