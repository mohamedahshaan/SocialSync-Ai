# SocialFlow AI — System Architecture

## Overview

SocialFlow AI is a high-performance, multi-tenant social media management SaaS designed around the principle **"Create Once. Publish Everywhere."**
It allows creators, agencies, and businesses to compose rich media updates once and broadcast them simultaneously across Facebook, Instagram, LinkedIn, X (Twitter), and Threads.

```
+-------------------------------------------------------------------------+
|                              FRONTEND                                   |
|                React 18 + Vite + Tailwind CSS + Lucide                  |
|    - Unified Publishing Studio    - Real-Time Analytics Dashboard      |
|    - Multi-Channel Selector       - Post Delivery Breakdown & Audit     |
|    - Official OAuth Management    - Media Previews & Uploads            |
+------------------------------------+------------------------------------+
                                     |
                          REST API / JWT Bearer
                                     |
+------------------------------------v------------------------------------+
|                               BACKEND                                   |
|               Node.js + Express + Zod + Helmet + Multer                 |
|  - Cryptographic OAuth State Validation  - Multi-Tenant User Isolation  |
|  - Storage Abstraction Service           - Independent Channel Worker   |
|  - Status Aggregator & Retry Logic       - Automation Callback Handler  |
+-------------------+---------------------------------+-------------------+
                    |                                 |
           Prisma ORM (PostgreSQL)            Publishing Orchestration
                    |                                 |
+-------------------v--------------+   +--------------v-------------------+
|            DATABASE              |   |               n8n                |
|           PostgreSQL 16          |   |       Workflow Automation        |
|  - users                         |   |  - Webhook Trigger               |
|  - social_accounts               |   |  - Channel Payload Splitter      |
|  - posts                         |   |  - Platform Routing Switch       |
|  - post_platforms                |   |  - Status Callback Pipeline      |
+----------------------------------+   +--------------+-------------------+
                                                      |
                                           Official Platform APIs
                                                      |
                  +-----------------------------------+-----------------------------------+
                  |                 |                 |                 |                 |
                  v                 v                 v                 v                 v
            Meta Graph API     Instagram Graph     LinkedIn REST     X (Twitter) v2    Threads API
              (Facebook)           (Meta)              API             with PKCE          (Meta)
```

---

## 1. Core Architectural Pillars

### 1.1 Strict Multi-Tenant Isolation
Every post, social account, media asset, and publishing record is cryptographically tied to the authenticated user ID extracted from the verified JWT:
```javascript
post.id = requestedPostId AND post.userId = req.user.id
```
- A user can never view, update, delete, or retry another user's content.
- Cross-user social account hijacking is blocked at both the API validation and database query levels.

### 1.2 Zero Social Password Storage
SocialFlow AI forbids forms collecting social media passwords. All channel integrations use **Official OAuth 2.0 with PKCE and HMAC/JWT signed state tokens**. Sensitive tokens (`accessToken`, `refreshToken`, client secrets) reside solely in the backend and are stripped from all API responses to client browsers.

### 1.3 Independent Execution & Partial Failure Recovery
Multi-platform publishing is decoupled so that the failure of one channel (e.g. rate limit, expired token) does not abort publishing to remaining channels:
- If Facebook succeeds and LinkedIn fails, the overall post is marked `PARTIALLY_PUBLISHED`.
- The user can trigger a retry targeting **only the failed platform**. Successful platforms are never re-published.

---

## 2. Database Schema Model (Prisma ORM)

### User Model (`users`)
- `id`: CUID Primary Key
- `name`: String
- `email`: String (Unique)
- `passwordHash`: bcrypt hashed string (12 rounds)
- `profileImage`: String?

### SocialAccount Model (`social_accounts`)
- `id`: CUID Primary Key
- `userId`: Relation to `User` (onDelete: Cascade)
- `platform`: `FACEBOOK` | `INSTAGRAM` | `LINKEDIN` | `X` | `THREADS`
- `platformUserId`: Official platform entity/user ID
- `accountName`: Display name of Page / Profile
- `accountUsername`: Handle (e.g. `@username`)
- `accessToken`: Securely encrypted access token
- `refreshToken`: Refresh token (where supported)
- `tokenExpiresAt`: Expiration timestamp
- `status`: `CONNECTED` | `EXPIRED` | `DISCONNECTED` | `CONFIG_REQUIRED`
- Constraint: `@@unique([userId, platform])`

### Post Model (`posts`)
- `id`: CUID Primary Key
- `userId`: Relation to `User` (onDelete: Cascade)
- `caption`: Text commentary
- `mediaUrl`: Public URL of uploaded asset
- `mediaType`: `NONE` | `IMAGE` | `VIDEO`
- `status`: `DRAFT` | `SCHEDULED` | `PUBLISHING` | `PUBLISHED` | `PARTIALLY_PUBLISHED` | `FAILED`
- `scheduledAt`: Optional ISO timestamp

### PostPlatform Model (`post_platforms`)
- `id`: CUID Primary Key
- `postId`: Relation to `Post` (onDelete: Cascade)
- `socialAccountId`: Relation to `SocialAccount`
- `platform`: Target network
- `status`: `PENDING` | `PUBLISHING` | `PUBLISHED` | `FAILED`
- `platformPostId`: Official ID returned by network
- `errorMessage`: Specific error response from network API
- `publishedAt`: Timestamp of delivery

---

## 3. Status Calculation Engine

The composite status of a post is dynamically calculated based on the states of its associated platform targets:

| Platform Conditions | Post Status |
|---|---|
| All targets are `PUBLISHED` | `PUBLISHED` |
| At least 1 target is `PUBLISHED` and at least 1 target is `FAILED` | `PARTIALLY_PUBLISHED` |
| All targets are `FAILED` | `FAILED` |
| At least 1 target is `PUBLISHING` or `PENDING` | `PUBLISHING` |
| Target has future `scheduledAt` date | `SCHEDULED` |

---

## 4. n8n Automation Orchestration

The backend publishes posts by sending a job payload to the n8n webhook:
```json
{
  "postId": "post_cuid",
  "jobId": "job_1234567890",
  "timestamp": "2026-09-22T12:00:00.000Z"
}
```
1. **Validation**: n8n validates the `x-socialflow-secret` header.
2. **Data Ingestion**: n8n requests the full post details from the backend's internal endpoint.
3. **Channel Splitting**: n8n splits the `platforms` array into discrete parallel streams.
4. **Platform Switch**: Evaluates `platform` and routes to the corresponding official HTTP node (Facebook, Instagram, LinkedIn, X, Threads).
5. **Callback**: Returns results to `POST /api/posts/:id/publish-result` to persist platform IDs and errors.
6. **Resilience Fallback**: If the n8n daemon is offline, the backend automatically falls back to direct internal publishing workers.
