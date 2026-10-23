# SocialFlow AI — Official OAuth & Platform Developer Setup Guide

This guide details the exact steps and permissions needed to configure official OAuth 2.0 applications for each supported platform.

---

## 1. Meta / Facebook (Graph API v20.0+)

- **Developer Portal**: [https://developers.facebook.com/](https://developers.facebook.com/)
- **App Type**: Business
- **Redirect URI**: `http://localhost:5002/api/oauth/facebook/callback`
- **Environment Variables**:
  ```env
  FACEBOOK_CLIENT_ID=your_facebook_app_id
  FACEBOOK_CLIENT_SECRET=your_facebook_app_secret
  FACEBOOK_REDIRECT_URI=http://localhost:5002/api/oauth/facebook/callback
  ```

### Required Scopes / Permissions:
- `pages_show_list`: Allows discovering Pages managed by the user.
- `pages_read_engagement`: Allows reading Page metadata and validation.
- `pages_manage_posts`: Grants permission to publish feed updates, photos, and videos to the Page.
- `public_profile`: Basic identity verification.

> [!WARNING]
> ### Fixing Meta "Invalid Scopes" Error
> If Facebook displays:
> **"Invalid Scopes: pages_read_engagement, pages_manage_posts"** or **"Invalid Scopes: instagram_basic, instagram_content_publish"**, it means your Meta Developer App either:
> 1. **Has the wrong App Type**: Consumer apps do *not* support Page or Instagram permissions. Your app must be created with type **"Business"** (or select **"Other"** -> **"Business"**).
> 2. **Has not added the permission to the App Dashboard**:
>    - In [Meta Developer Dashboard](https://developers.facebook.com/apps/) -> Select your App.
>    - Under **Use cases** (or **App Review** -> **Permissions and Features**):
>      - Find **"Manage and access Page content"** (or **"Facebook Login for Business"**) -> Click **Add** or **Customize**.
>      - Add `pages_show_list`, `pages_read_engagement`, and `pages_manage_posts`.
>    - For Instagram:
>      - Under **Use cases**, add **"Instagram Graph API"** (or **"Manage and access Instagram content"**).
>      - Add `instagram_basic` and `instagram_content_publish`.
> 
> **Quick Testing / Development Workaround**:
> If you want to connect your account immediately before configuring Page/Instagram permissions in Meta's portal, you can override the requested scopes in `backend/.env`:
> ```env
> FACEBOOK_SCOPES=public_profile,pages_show_list
> ```


---

## 2. Instagram Graph API (Meta)

- **Developer Portal**: [https://developers.facebook.com/products/instagram](https://developers.facebook.com/products/instagram)
- **Account Requirement**: Instagram Professional (Creator or Business) Account connected to a Facebook Page.
- **Redirect URI**: `http://localhost:5002/api/oauth/instagram/callback`
- **Environment Variables**:
  ```env
  INSTAGRAM_CLIENT_ID=your_facebook_app_id
  INSTAGRAM_CLIENT_SECRET=your_facebook_app_secret
  INSTAGRAM_REDIRECT_URI=http://localhost:5002/api/oauth/instagram/callback
  ```

### Required Scopes / Permissions:
- `instagram_basic`: Allows querying Instagram Business Account ID and username.
- `instagram_content_publish`: Allows creating media containers and publishing photos and Reels/videos.
- `pages_show_list`: Required to discover connected Facebook Pages linking the Instagram account.

### Limitations:
- The official Instagram Graph API requires media (photo or video) with every published post. Text-only posts are not supported by Instagram's API.

---

## 3. LinkedIn (REST API & OpenID Connect)

- **Developer Portal**: [https://www.linkedin.com/developers/apps](https://www.linkedin.com/developers/apps)
- **App Name**: SocialFlow AI
- **Redirect URI**: `http://localhost:5002/api/oauth/linkedin/callback`
- **Environment Variables**:
  ```env
  LINKEDIN_CLIENT_ID=your_client_id
  LINKEDIN_CLIENT_SECRET=your_client_secret
  LINKEDIN_REDIRECT_URI=http://localhost:5002/api/oauth/linkedin/callback
  LINKEDIN_SCOPES=openid profile email w_member_social
  ```

### Required Scopes / Permissions:
* `openid`: OpenID Connect identity verification.
* `profile`: Member name and profile details.
* `email`: Primary email address.
* `w_member_social`: Publish text, links, and media to personal feed.

> [!IMPORTANT]
> ### Fixing LinkedIn "The requested permission scope is not valid"
> In LinkedIn Developer Portal, scopes are enabled by adding **Products**:
> 1. Open your app on [linkedin.com/developers/apps](https://www.linkedin.com/developers/apps).
> 2. Go to the **Products** tab.
> 3. Add **"Sign In with LinkedIn using OpenID Connect"** (provides `openid`, `profile`, `email`). Click **Request access** (Instant approval).
> 4. Add **"Share on LinkedIn"** (provides `w_member_social`). Click **Request access** (Instant approval).
> 5. Go to the **Auth** tab &rarr; ensure `http://localhost:5002/api/oauth/linkedin/callback` is saved under **Authorized redirect URLs for your app**.

---

## 4. X / Twitter (Developer Platform API v2)

- **Developer Portal**: [https://developer.x.com/](https://developer.x.com/)
- **App Type**: Web App (Confidential Client with PKCE)
- **Redirect URI**: `http://localhost:5002/api/oauth/x/callback`
- **Environment Variables**:
  ```env
  X_CLIENT_ID=your_x_client_id
  X_CLIENT_SECRET=your_x_client_secret
  X_REDIRECT_URI=http://localhost:5002/api/oauth/x/callback
  ```

### Required Scopes:
- `tweet.read`: Allows reading public Tweets.
- `tweet.write`: Allows creating Tweets on behalf of the user.
- `users.read`: Allows fetching user profile and handle.
- `offline.access`: Provides a refresh token to renew access tokens automatically.

### Architecture Note:
- SocialFlow AI uses **OAuth 2.0 with PKCE (Proof Key for Code Exchange)** via SHA-256 challenges, as mandated by the X v2 API standard.

---

## 5. Threads API (Meta)

- **Developer Portal**: [https://developers.facebook.com/docs/threads](https://developers.facebook.com/docs/threads)
- **App Type**: Threads App
- **Redirect URI**: `http://localhost:5002/api/oauth/threads/callback`
- **Environment Variables**:
  ```env
  THREADS_CLIENT_ID=your_threads_app_id
  THREADS_CLIENT_SECRET=your_threads_app_secret
  THREADS_REDIRECT_URI=http://localhost:5002/api/oauth/threads/callback
  ```

### Required Scopes:
- `threads_basic`: Read profile information and threads.
- `threads_content_publish`: Create and publish text, images, and videos on Threads.

---

## 6. Google OAuth 2.0 / Sign-In with Google

- **Developer Portal**: [https://console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials)
- **App Type**: Web application
- **Authorized JavaScript Origins**:
  - `https://socialsync.raccoon-ai.io` (Production domain — no trailing slash)
  - `http://localhost:5180` (Docker container preview)
  - `http://localhost:5173` (Local development)
- **Authorized Redirect URIs**:
  - `https://socialsync.raccoon-ai.io/api/auth/google/callback` (Production callback)
  - `http://localhost:5002/api/auth/google/callback` (Local development callback)
- **Environment Variables**:
  ```env
  GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
  GOOGLE_CLIENT_SECRET=your_google_client_secret
  GOOGLE_AUTH_REDIRECT_URI=https://socialsync.raccoon-ai.io/api/auth/google/callback
  ```

### Required Scopes:
- `openid`: OpenID Connect identity token.
- `email`: User verified email address.
- `profile`: User display name and avatar photo.

---

## Handling Missing Credentials

If any platform credentials are left blank in `backend/.env`, SocialFlow AI marks the platform as **"Configuration Required"** in the UI and displays this guide. It will never create fake success records or throw uncaught errors.
