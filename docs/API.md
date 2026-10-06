# SocialFlow AI — REST API Documentation

Base URL: `http://localhost:5001/api`

All protected endpoints require an `Authorization` header formatted as:
```http
Authorization: Bearer <jwt_token>
```

---

## 1. System Health

### GET `/health`
Returns the operational health of the SocialFlow AI backend service.

**Response (200 OK):**
```json
{
  "success": true,
  "message": "SocialFlow AI API is running"
}
```

---

## 2. Authentication

### POST `/auth/register`
Register a new user account.

**Request Body:**
```json
{
  "name": "Mohamed Ahshaan",
  "email": "ahshaan@example.com",
  "password": "SecurePassword123!",
  "confirmPassword": "SecurePassword123!"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "user": {
      "id": "cuid12345",
      "name": "Mohamed Ahshaan",
      "email": "ahshaan@example.com",
      "profileImage": "",
      "createdAt": "2026-09-22T10:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### POST `/auth/login`
Authenticate an existing user.

**Request Body:**
```json
{
  "email": "ahshaan@example.com",
  "password": "SecurePassword123!"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "cuid12345",
      "name": "Mohamed Ahshaan",
      "email": "ahshaan@example.com",
      "profileImage": "",
      "createdAt": "2026-09-22T10:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### GET `/auth/me` *(Protected)*
Fetch profile of currently authenticated user.

---

## 3. Social Accounts & Channels

### GET `/social-accounts` *(Protected)*
List all connected social accounts for the authenticated user. Tokens are never exposed.

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "acc_1",
      "userId": "cuid12345",
      "platform": "FACEBOOK",
      "platformUserId": "104928172910",
      "accountName": "SocialFlow Official Page",
      "accountUsername": "socialflow_page",
      "status": "CONNECTED",
      "tokenExpiresAt": "2026-11-21T10:00:00.000Z",
      "createdAt": "2026-09-22T10:00:00.000Z"
    }
  ]
}
```

### GET `/social-accounts/status` *(Protected)*
Check whether official OAuth credentials are configured in `.env` for each network.

### DELETE `/social-accounts/:id` *(Protected)*
Disconnect a social account. Validates ownership before deleting.

---

## 4. OAuth 2.0 Integration

### GET `/oauth/:platform` *(Protected)*
Initiates official OAuth 2.0 flow for `facebook`, `instagram`, `linkedin`, `x`, or `threads`.
Generates CSRF-safe state signed with the user ID.

Query parameters:
- `json=true`: Returns `{ "success": true, "data": { "url": "https://..." } }` instead of 302 redirect.

### GET `/oauth/:platform/callback`
Official OAuth callback target redirected to by the network.
Validates state signature, exchanges code for access tokens, updates `SocialAccount`, and redirects back to frontend `/accounts`.

---

## 5. Posts & Publishing

### POST `/posts` *(Protected)*
Create a post and trigger immediate publishing or schedule for a future date.

**Request Body:**
```json
{
  "caption": "Excited to launch our product on all channels! 🚀",
  "mediaUrl": "http://localhost:5001/uploads/media-17270088921.jpg",
  "mediaType": "IMAGE",
  "scheduledAt": null,
  "platforms": [
    { "platform": "FACEBOOK", "socialAccountId": "acc_1" },
    { "platform": "LINKEDIN", "socialAccountId": "acc_2" }
  ]
}
```

### GET `/posts` *(Protected)*
List posts for current user with optional query filters:
- `search`: Filter by caption keywords
- `status`: `PUBLISHED`, `FAILED`, `PARTIALLY_PUBLISHED`, `SCHEDULED`, `DRAFT`
- `platform`: `FACEBOOK`, `INSTAGRAM`, `LINKEDIN`, `X`, `THREADS`
- `page`: Page number (default: 1)
- `limit`: Records per page (default: 20)

### GET `/posts/:id` *(Protected)*
Get granular delivery report for a specific post with individual platform statuses and errors.

### POST `/posts/:id/retry` *(Protected)*
Retries **only the failed platforms** for a post. Successful platforms are never republished.

### POST `/posts/:id/cancel` *(Protected)*
Cancels a scheduled post and reverts its status to `DRAFT`.

### POST `/posts/:id/publish-result`
Internal callback endpoint called by n8n or background workers. Requires `x-socialflow-secret` header.

---

## 6. Media Storage

### POST `/uploads` *(Protected)*
Upload an image or video file via `multipart/form-data` with key `media`.
- Supported images: JPG, JPEG, PNG, WEBP (max 10MB)
- Supported videos: MP4, MOV (max 100MB)

---

## 7. Real Analytics

### GET `/analytics` *(Protected)*
Returns real database aggregate metrics for the authenticated user:
- Total, published, scheduled, failed, and draft post counts.
- Overall publishing success rate percentage.
- Per-channel breakdown of published vs failed deliveries.
