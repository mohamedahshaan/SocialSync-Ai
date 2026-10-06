# SocialFlow AI — Security Architecture & Guidelines

SocialFlow AI implements a defense-in-depth security architecture designed to safeguard multi-tenant data, user privacy, and official API credentials.

---

## 1. Authentication & Session Management

- **Password Hashing**: Passwords are never stored in plaintext. They are hashed using `bcryptjs` with 12 salt rounds before database persistence.
- **JWT Tokens**: Signed using HMAC-SHA256 with an environment-specified `JWT_SECRET`. Tokens expire in 7 days and only carry minimal identity metadata (`userId`, `email`, `name`).
- **Sanitized Outputs**: User entity serialization explicitly omits `passwordHash` and sensitive tokens across all API responses.

---

## 2. Multi-Tenant User Data Isolation

Data isolation is strictly enforced at every route handler and database interaction:
- **No Client Trust**: The backend never accepts a `userId` from request bodies or query parameters. The authenticated user ID is strictly derived from the verified JWT payload.
- **Resource Scoping**: Every query for posts, social accounts, and analytics uses a compound where clause:
  ```javascript
  where: {
    id: requestedId,
    userId: req.user.id
  }
  ```
- **Social Account Hijacking Prevention**: When creating a post with target social accounts, the backend verifies that every `socialAccountId` belongs to the requesting user before executing the transaction.

---

## 3. OAuth 2.0 Security & State Protection

- **No Social Password Fields**: The application never requests or stores user social network passwords.
- **Signed State Tokens**: The `state` parameter generated during OAuth initiation is a signed JWT containing:
  - `sub`: Authenticated user ID
  - `platform`: Target network
  - `nonce`: Cryptographic random string
  - Expiration: 15 minutes
- **State Verification**: Upon OAuth callback, the backend validates the signature, purpose, expiration, and platform match. This guarantees that an external redirect cannot connect an account to an arbitrary user or execute a CSRF injection.
- **Token Protection**: Access and refresh tokens are stored in the PostgreSQL database and are never returned in client JSON payloads or logged to terminal output.

---

## 4. Media & Upload Safeguards

- **MIME & Extension Whitelisting**: Strictly restricts uploads to `.jpg`, `.jpeg`, `.png`, `.webp`, `.mp4`, and `.mov`. Arbitrary executable or script uploads are rejected before saving.
- **Size Limits**: Enforces 10MB ceiling on images and 100MB on video assets.
- **Randomized File Names**: Uses timestamped cryptographic suffixes (`media-${Date.now()}-${random}.ext`) to prevent path traversal attacks and overwrites.

---

## 5. Network & API Protection

- **Helmet**: Secures HTTP response headers against clickjacking, XSS, and MIME-sniffing.
- **CORS**: Enforces origin checks, restricting API access to configured frontend clients.
- **Rate Limiting**: Throttles request rates per IP to mitigate brute-force and denial-of-service attempts.
- **Safe Logging**: Logs record `userId`, `postId`, `platform`, `statusCode`, and `timestamp`, while filtering out passwords, API secrets, and access tokens.
