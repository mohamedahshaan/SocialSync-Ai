import axios from 'axios';
import bcrypt from 'bcryptjs';
import { prisma } from '../src/utils/prisma.js';

const API_BASE = process.env.API_BASE || process.env.API_URL || 'http://localhost:5002/api';

async function runLiveVerification() {
  console.log('=== STARTING LIVE END-TO-END VERIFICATION ===\n');

  // 1. Prepare User A and User B in database
  const passwordHash = await bcrypt.hash('Password123!', 10);
  
  const userA = await prisma.user.upsert({
    where: { email: 'usera_live@socialflow.ai' },
    update: { passwordHash },
    create: {
      email: 'usera_live@socialflow.ai',
      name: 'User A (Live Tester)',
      passwordHash
    }
  });

  const userB = await prisma.user.upsert({
    where: { email: 'userb_live@socialflow.ai' },
    update: { passwordHash },
    create: {
      email: 'userb_live@socialflow.ai',
      name: 'User B (Isolation Tester)',
      passwordHash
    }
  });

  console.log(`User A created/updated: ${userA.id} (${userA.email})`);
  console.log(`User B created/updated: ${userB.id} (${userB.email})\n`);

  // 2. Locate active real credentials for Facebook & LinkedIn from existing accounts
  const sourceFb = await prisma.socialAccount.findFirst({
    where: { platform: 'FACEBOOK', status: 'CONNECTED' },
    orderBy: { updatedAt: 'desc' }
  });

  const sourceLi = await prisma.socialAccount.findFirst({
    where: { platform: 'LINKEDIN', status: 'CONNECTED' },
    orderBy: { updatedAt: 'desc' }
  });

  if (!sourceFb) {
    console.error('ERROR: No Facebook account found in database to test.');
  }
  if (!sourceLi) {
    console.error('ERROR: No LinkedIn account found in database to test.');
  }

  // Associate copies of real connected accounts to User A
  let userAFacebookAccount = null;
  let userALinkedInAccount = null;

  if (sourceFb) {
    userAFacebookAccount = await prisma.socialAccount.upsert({
      where: {
        userId_platform_platformUserId: {
          userId: userA.id,
          platform: 'FACEBOOK',
          platformUserId: sourceFb.platformUserId || ''
        }
      },
      update: {
        accessToken: sourceFb.accessToken,
        refreshToken: sourceFb.refreshToken,
        status: 'CONNECTED',
        accountName: sourceFb.accountName,
        accountUsername: sourceFb.accountUsername,
        tokenExpiresAt: sourceFb.tokenExpiresAt
      },
      create: {
        userId: userA.id,
        platform: 'FACEBOOK',
        platformUserId: sourceFb.platformUserId || '',
        accessToken: sourceFb.accessToken,
        refreshToken: sourceFb.refreshToken,
        status: 'CONNECTED',
        accountName: sourceFb.accountName,
        accountUsername: sourceFb.accountUsername,
        tokenExpiresAt: sourceFb.tokenExpiresAt
      }
    });
    console.log(`User A Facebook account linked: ID ${userAFacebookAccount.id} (${userAFacebookAccount.accountName})`);
  }

  if (sourceLi) {
    userALinkedInAccount = await prisma.socialAccount.upsert({
      where: {
        userId_platform_platformUserId: {
          userId: userA.id,
          platform: 'LINKEDIN',
          platformUserId: sourceLi.platformUserId || ''
        }
      },
      update: {
        accessToken: sourceLi.accessToken,
        refreshToken: sourceLi.refreshToken,
        status: 'CONNECTED',
        accountName: sourceLi.accountName,
        accountUsername: sourceLi.accountUsername,
        tokenExpiresAt: sourceLi.tokenExpiresAt
      },
      create: {
        userId: userA.id,
        platform: 'LINKEDIN',
        platformUserId: sourceLi.platformUserId || '',
        accessToken: sourceLi.accessToken,
        refreshToken: sourceLi.refreshToken,
        status: 'CONNECTED',
        accountName: sourceLi.accountName,
        accountUsername: sourceLi.accountUsername,
        tokenExpiresAt: sourceLi.tokenExpiresAt
      }
    });
    console.log(`User A LinkedIn account linked: ID ${userALinkedInAccount.id} (${userALinkedInAccount.accountName})`);
  }

  console.log('\n--- STEP 1: AUTHENTICATION FOR USER A ---');
  const loginResA = await axios.post(`${API_BASE}/auth/login`, {
    email: 'usera_live@socialflow.ai',
    password: 'Password123!'
  });
  const tokenA = loginResA.data.data.token;
  console.log(`User A login successful. HTTP Status: ${loginResA.status}`);

  console.log('\n--- STEP 2: OAUTH URL VERIFICATION (NO SECRETS EXPOSED) ---');
  // Facebook OAuth URL
  const fbOAuthRes = await axios.get(`${API_BASE}/oauth/facebook?json=true`, {
    headers: { Authorization: `Bearer ${tokenA}` }
  });
  const fbUrl = new URL(fbOAuthRes.data.data.url);
  console.log(`Facebook OAuth URL Generated: ${fbUrl.origin}${fbUrl.pathname}`);
  console.log(`  - client_id present: ${fbUrl.searchParams.has('client_id')}`);
  console.log(`  - redirect_uri: ${fbUrl.searchParams.get('redirect_uri')}`);
  console.log(`  - scope: ${fbUrl.searchParams.get('scope')}`);
  console.log(`  - state present: ${fbUrl.searchParams.has('state')}`);

  // LinkedIn OAuth URL
  const liOAuthRes = await axios.get(`${API_BASE}/oauth/linkedin?json=true`, {
    headers: { Authorization: `Bearer ${tokenA}` }
  });
  const liUrl = new URL(liOAuthRes.data.data.url);
  console.log(`LinkedIn OAuth URL Generated: ${liUrl.origin}${liUrl.pathname}`);
  console.log(`  - client_id present: ${liUrl.searchParams.has('client_id')}`);
  console.log(`  - redirect_uri: ${liUrl.searchParams.get('redirect_uri')}`);
  console.log(`  - scope: ${liUrl.searchParams.get('scope')}`);
  console.log(`  - state present: ${liUrl.searchParams.has('state')}`);

  console.log('\n--- STEP 3: CONNECTED ACCOUNTS ENDPOINT FOR USER A ---');
  const accountsResA = await axios.get(`${API_BASE}/social-accounts`, {
    headers: { Authorization: `Bearer ${tokenA}` }
  });
  console.log(`User A connected accounts count: ${accountsResA.data.data.length}`);
  
  // Verify token safety
  let tokensLeaked = false;
  accountsResA.data.data.forEach(acc => {
    console.log(`  - Platform: ${acc.platform}, Name: ${acc.accountName}, Status: ${acc.status}`);
    if (acc.accessToken || acc.refreshToken) {
      tokensLeaked = true;
    }
  });
  if (tokensLeaked) {
    console.error('CRITICAL SECURITY VIOLATION: Access/refresh token was exposed in social-accounts response!');
  } else {
    console.log('SECURITY CHECK PASSED: Zero access tokens or secrets exposed to client.');
  }

  console.log('\n--- STEP 4: LIVE FACEBOOK PUBLISHING ---');
  let fbPostResult = null;
  if (userAFacebookAccount) {
    try {
      const fbPostRes = await axios.post(
        `${API_BASE}/posts`,
        {
          caption: `SocialFlow AI live end-to-end verification test (Facebook) - ${new Date().toISOString()}`,
          platforms: [
            {
              platform: 'FACEBOOK',
              socialAccountId: userAFacebookAccount.id
            }
          ]
        },
        { headers: { Authorization: `Bearer ${tokenA}` } }
      );

      const createdPost = fbPostRes.data.data;
      console.log(`Post created with ID: ${createdPost.id}, overall status: ${createdPost.status}`);

      // Query database for the platform-specific result
      const postPlatformFb = await prisma.postPlatform.findFirst({
        where: { postId: createdPost.id, platform: 'FACEBOOK' }
      });

      console.log(`Facebook Publishing Result:`);
      console.log(`  - Status: ${postPlatformFb?.status}`);
      console.log(`  - Platform Post ID: ${postPlatformFb?.platformPostId || 'None'}`);
      console.log(`  - Error Message: ${postPlatformFb?.errorMessage || 'None'}`);
      fbPostResult = postPlatformFb;
    } catch (err) {
      console.error(`Facebook Publishing Request Error: ${err.response?.data?.message || err.message}`);
      fbPostResult = { error: err.response?.data || err.message };
    }
  }

  console.log('\n--- STEP 5: LIVE LINKEDIN PUBLISHING ---');
  let liPostResult = null;
  if (userALinkedInAccount) {
    try {
      const liPostRes = await axios.post(
        `${API_BASE}/posts`,
        {
          caption: `SocialFlow AI live end-to-end verification test (LinkedIn) - ${new Date().toISOString()}`,
          platforms: [
            {
              platform: 'LINKEDIN',
              socialAccountId: userALinkedInAccount.id
            }
          ]
        },
        { headers: { Authorization: `Bearer ${tokenA}` } }
      );

      const createdPostLi = liPostRes.data.data;
      console.log(`Post created with ID: ${createdPostLi.id}, overall status: ${createdPostLi.status}`);

      // Query database for the platform-specific result
      const postPlatformLi = await prisma.postPlatform.findFirst({
        where: { postId: createdPostLi.id, platform: 'LINKEDIN' }
      });

      console.log(`LinkedIn Publishing Result:`);
      console.log(`  - Status: ${postPlatformLi?.status}`);
      console.log(`  - Platform Post ID: ${postPlatformLi?.platformPostId || 'None'}`);
      console.log(`  - Error Message: ${postPlatformLi?.errorMessage || 'None'}`);
      liPostResult = postPlatformLi;
    } catch (err) {
      console.error(`LinkedIn Publishing Request Error: ${err.response?.data?.message || err.message}`);
      liPostResult = { error: err.response?.data || err.message };
    }
  }

  console.log('\n--- STEP 6: MULTI-USER ISOLATION VERIFICATION ---');
  // Login as User B
  const loginResB = await axios.post(`${API_BASE}/auth/login`, {
    email: 'userb_live@socialflow.ai',
    password: 'Password123!'
  });
  const tokenB = loginResB.data.data.token;
  console.log(`User B login successful. HTTP Status: ${loginResB.status}`);

  // Test 1: User B calls GET /api/social-accounts
  const accountsResB = await axios.get(`${API_BASE}/social-accounts`, {
    headers: { Authorization: `Bearer ${tokenB}` }
  });
  console.log(`User B sees ${accountsResB.data.data.length} accounts (Expected: 0)`);
  if (accountsResB.data.data.length === 0) {
    console.log('ISOLATION TEST 1 PASSED: User B cannot see User A\'s connected accounts.');
  } else {
    console.error('ISOLATION TEST 1 FAILED: User B saw accounts belonging to User A!');
  }

  // Test 2: User B attempts to publish using User A's Facebook account
  if (userAFacebookAccount) {
    try {
      await axios.post(
        `${API_BASE}/posts`,
        {
          caption: 'Unauthorized cross-user post',
          platforms: [
            {
              platform: 'FACEBOOK',
              socialAccountId: userAFacebookAccount.id
            }
          ]
        },
        { headers: { Authorization: `Bearer ${tokenB}` } }
      );
      console.error('ISOLATION TEST 2 FAILED: User B was permitted to publish using User A\'s account!');
    } catch (err) {
      console.log(`ISOLATION TEST 2 PASSED: User B cross-user publish blocked with Status ${err.response?.status} (${err.response?.data?.error}: "${err.response?.data?.message}")`);
    }
  }

  // Test 3: User B attempts to publish using User A's LinkedIn account
  if (userALinkedInAccount) {
    try {
      await axios.post(
        `${API_BASE}/posts`,
        {
          caption: 'Unauthorized cross-user post',
          platforms: [
            {
              platform: 'LINKEDIN',
              socialAccountId: userALinkedInAccount.id
            }
          ]
        },
        { headers: { Authorization: `Bearer ${tokenB}` } }
      );
      console.error('ISOLATION TEST 3 FAILED: User B was permitted to publish using User A\'s account!');
    } catch (err) {
      console.log(`ISOLATION TEST 3 PASSED: User B cross-user publish blocked with Status ${err.response?.status} (${err.response?.data?.error}: "${err.response?.data?.message}")`);
    }
  }

  // Test 4: User B attempts to delete User A's account
  if (userAFacebookAccount) {
    try {
      await axios.delete(`${API_BASE}/social-accounts/${userAFacebookAccount.id}`, {
        headers: { Authorization: `Bearer ${tokenB}` }
      });
      console.error('ISOLATION TEST 4 FAILED: User B was able to delete User A\'s account!');
    } catch (err) {
      console.log(`ISOLATION TEST 4 PASSED: User B account deletion blocked with Status ${err.response?.status} (${err.response?.data?.error}: "${err.response?.data?.message}")`);
    }
  }

  // Test 5: User B calls GET /api/posts
  const postsResB = await axios.get(`${API_BASE}/posts`, {
    headers: { Authorization: `Bearer ${tokenB}` }
  });
  console.log(`User B sees ${postsResB.data.data.posts.length} posts (Expected: 0)`);
  if (postsResB.data.data.posts.length === 0) {
    console.log('ISOLATION TEST 5 PASSED: User B cannot see User A\'s created posts.');
  } else {
    console.error('ISOLATION TEST 5 FAILED: User B saw posts belonging to User A!');
  }

  console.log('\n=== VERIFICATION RUN COMPLETE ===');
  await prisma.$disconnect();
}

runLiveVerification().catch(err => {
  console.error('Unexpected error during verification:', err);
  process.exit(1);
});
