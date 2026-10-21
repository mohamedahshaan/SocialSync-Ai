/**
 * Script: cleanup_demo_social_accounts.js
 * Inspects and safely cleans up demo/test social account connections,
 * revoking tokens where supported, while strictly preserving:
 * - Super Admin user account (admin@socialsync.ai)
 * - Professional plan and credits
 * - Application configuration and OAuth client credentials
 * - Real user accounts / authentic connections
 */

import { prisma } from '../src/utils/prisma.js';
import { config } from '../src/config/index.js';

export async function revokeProviderToken(account) {
  if (!account || !account.accessToken) return false;
  // If demo token, provider revocation is not applicable
  if (
    account.accessToken.startsWith('super_admin_verified_') ||
    account.accessToken.startsWith('demo_') ||
    account.accessToken.startsWith('mock_') ||
    account.accessToken.startsWith('test_')
  ) {
    return false;
  }

  try {
    const platform = account.platform;
    if (platform === 'YOUTUBE') {
      const token = account.refreshToken || account.accessToken;
      await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }).catch(() => {});
      return true;
    } else if (platform === 'FACEBOOK' || platform === 'INSTAGRAM' || platform === 'THREADS') {
      const targetId = account.platformUserId || 'me';
      await fetch(
        `https://graph.facebook.com/v19.0/${targetId}/permissions?access_token=${encodeURIComponent(account.accessToken)}`,
        { method: 'DELETE' }
      ).catch(() => {});
      return true;
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
      return true;
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
      return true;
    }
  } catch (err) {
    console.warn(`[REVOKE_TOKEN] Best-effort revocation for ${account.platform} skipped:`, err.message);
  }
  return false;
}

export async function cleanupDemoSocialAccounts() {
  console.log('--- Inspecting PostgreSQL Social Accounts Before Cleanup ---');
  const allAccounts = await prisma.socialAccount.findMany({
    include: {
      user: {
        select: {
          id: true,
          email: true,
          role: true,
          plan: true,
          credits: true
        }
      }
    }
  });

  console.log(`Total social account records in DB: ${allAccounts.length}`);

  const demoAccounts = allAccounts.filter((acc) => {
    const isDemoToken =
      !acc.accessToken ||
      acc.accessToken.startsWith('super_admin_verified_') ||
      acc.accessToken.startsWith('demo_') ||
      acc.accessToken.startsWith('mock_') ||
      acc.accessToken.startsWith('test_');

    const isDemoPlatformId =
      acc.platformUserId.startsWith('fb_') ||
      acc.platformUserId.startsWith('ig_') ||
      acc.platformUserId.startsWith('li_') ||
      acc.platformUserId.startsWith('th_') ||
      acc.platformUserId.startsWith('tt_') ||
      acc.platformUserId.startsWith('yt_');

    const isDemoName = [
      'SocialSync Official (Page)',
      'SocialSync AI',
      'SocialSync AI Company',
      'SocialSync Creators',
      'SocialSync AI Official'
    ].includes(acc.accountName);

    return isDemoToken || isDemoPlatformId || isDemoName;
  });

  console.log(`Identified demo/test accounts to remove: ${demoAccounts.length}`);

  let removedCount = 0;
  for (const acc of demoAccounts) {
    console.log(`Attempting revocation for: [${acc.platform}] ${acc.accountName} (ID: ${acc.id})`);
    await revokeProviderToken(acc);

    // Delete associated post-platform links if any
    await prisma.postPlatform.deleteMany({
      where: { socialAccountId: acc.id }
    });

    await prisma.socialAccount.delete({
      where: { id: acc.id }
    });
    removedCount++;
    console.log(`✓ Removed record ID: ${acc.id} (${acc.platform} - ${acc.accountName})`);
  }

  console.log('--- Database State After Cleanup ---');
  const remainingAccounts = await prisma.socialAccount.findMany({
    select: {
      id: true,
      platform: true,
      accountName: true,
      userId: true
    }
  });
  console.log(`Remaining social accounts in DB: ${remainingAccounts.length}`);

  // Confirm Super Admin integrity
  const superAdmin = await prisma.user.findFirst({
    where: { role: 'SUPER_ADMIN' },
    select: { id: true, email: true, role: true, plan: true, credits: true }
  });
  console.log('Super Admin status:', superAdmin);

  return {
    removedCount,
    remainingCount: remainingAccounts.length,
    superAdmin
  };
}

if (process.argv[1]?.endsWith('cleanup_demo_social_accounts.js')) {
  cleanupDemoSocialAccounts()
    .then((res) => {
      console.log('Cleanup script completed successfully:', res);
      process.exit(0);
    })
    .catch((err) => {
      console.error('Error during cleanup:', err);
      process.exit(1);
    });
}
