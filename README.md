# SocialFlow AI

<div align="center">

**Create Once. Publish Everywhere.**

An enterprise-grade, multi-tenant social media orchestration SaaS. Compose rich media updates once and publish simultaneously across Facebook, Instagram, LinkedIn, YouTube, TikTok, and Threads using official OAuth 2.0 and API integrations.

[![Node.js](https://img.shields.io/badge/Node.js-v20+-green.svg)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-18.3-blue.svg)](https://react.dev)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue.svg)](https://www.postgresql.org)
[![Prisma](https://img.shields.io/badge/Prisma-5.22-darkblue.svg)](https://www.prisma.io)
[![n8n](https://img.shields.io/badge/n8n-Orchestration-red.svg)](https://n8n.io)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

</div>

---

## 🌟 Key Features

- **Official OAuth 2.0 Integrations**: Official authorization flows with PKCE and CSRF-safe signed state tokens for Facebook, Instagram, LinkedIn, X, and Threads. Zero password collection forms.
- **Strict Multi-Tenant Isolation**: Every post, account, media upload, and query is bound to the verified JWT authenticated user. User A can never access or retry User B's content.
- **Independent Channel Execution**: Parallel publishing workers ensure one platform's network error or rate limit never aborts publishing to other selected networks.
- **Partial Failure Recovery & Smart Retry**: Posts with mixed outcomes receive a `PARTIALLY_PUBLISHED` status. Retrying only re-executes `FAILED` targets and never republishes successful platforms.
- **Rich Media Studio**: Drag-and-drop uploader supporting JPG, JPEG, PNG, WEBP (up to 10MB) and MP4, MOV (up to 100MB) with live media previews and character counters.
- **Flexible Scheduling**: Publish immediately or schedule updates for an exact future date and time.
- **n8n Automation Engine**: Importable JSON workflow for visual orchestration and webhook callbacks with automated direct fallback.
- **Real Database Analytics**: Aggregated volume charts and success rate indicators calculated from real database records.

---

## 🏗️ Architecture & Tech Stack

```
socialflow-ai/
├── frontend/                  # React 18 + Vite + Tailwind CSS + Lucide React
│   ├── src/components/        # Reusable UI cards, badges, modal, buttons, uploaders
│   ├── src/pages/             # Dashboard, CreatePost, Accounts, Posts, PostDetail, Analytics, Settings
│   ├── src/context/           # AuthContext managing user sessions and JWT
│   └── src/services/          # Axios client with bearer token injection
│
├── backend/                   # Node.js + Express REST API
│   ├── prisma/schema.prisma   # PostgreSQL schema with User, SocialAccount, Post, PostPlatform
│   ├── src/services/social/   # Official Facebook, Instagram, LinkedIn, X, Threads providers
│   ├── src/controllers/       # Auth, Accounts, OAuth, Posts, Uploads, Analytics
│   ├── src/middleware/        # Auth, Zod validation, Multer upload, Error handler
│   └── tests/                 # Vitest & Supertest automated test suite
│
├── n8n/                       # Orchestration workflow definitions
│   └── socialflow-publishing-workflow.json
│
├── docs/                      # Architectural, API, OAuth, and Security guides
└── docker-compose.yml         # Containerized PostgreSQL 16 & n8n engine
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v18.0.0 or higher (v20+ recommended)
- **npm**: v9.0.0 or higher
- **Docker & Docker Compose**: For PostgreSQL and n8n

---

### Step 1: Start Database & Infrastructure

Start PostgreSQL and n8n in detached mode:
```bash
docker compose up -d postgres
```
Verify PostgreSQL is healthy on `localhost:5432`.

---

### Step 2: Configure Environment Variables

Copy the example configuration to `backend/.env`:
```bash
cp .env.example backend/.env
```

Review `backend/.env`:
```env
DATABASE_URL="postgresql://postgres:postgrespassword@localhost:5432/socialflow_db?schema=public"
PORT=5001
JWT_SECRET=your_jwt_secret_key_here
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:5001

N8N_WEBHOOK_URL=http://localhost:5678/webhook/socialflow-publish
N8N_API_KEY=socialflow_n8n_secret_token_secure_2026
```

*(Optional)* Add your official developer app credentials for Facebook, Instagram, LinkedIn, X, and Threads. If left blank, SocialFlow AI gracefully marks the channel as **Configuration Required** in the UI.

---

### Step 3: Initialize Database Schema

```bash
cd backend
npm install
npx prisma generate
npx prisma db push
```

---

### Step 4: Run the Automated Test Suite

Verify system integrity, authentication, and multi-tenant security isolation:
```bash
cd backend
npm test
```
All 18 tests will execute and pass in under 2 seconds.

---

### Step 5: Start Backend & Frontend

#### Terminal 1 — Backend:
```bash
cd backend
npm run dev
```
Backend API will start on: `http://localhost:5001`  
Health check: `http://localhost:5001/api/health`

#### Terminal 2 — Frontend:
```bash
cd frontend
npm install
npm run dev
```
Frontend UI will start on: `http://localhost:5173`

---

## 🛡️ Security Highlights

1. **Zero Social Passwords**: Password forms for social networks are completely absent.
2. **Encrypted State Parameter**: Prevents CSRF injection by signing `userId` and timestamp nonce inside OAuth state tokens.
3. **Multi-Tenant Protection**: Queries strictly enforce `userId: req.user.id`.
4. **MIME Validation**: Uploads are restricted to verified image and video MIME types.

---

## 📚 Documentation Links

- [System Architecture](file:///Users/ahshaan/Documents/socialflow-ai/docs/ARCHITECTURE.md)
- [REST API Reference](file:///Users/ahshaan/Documents/socialflow-ai/docs/API.md)
- [Official OAuth Setup Guide](file:///Users/ahshaan/Documents/socialflow-ai/docs/OAUTH_SETUP.md)
- [n8n Automation Guide](file:///Users/ahshaan/Documents/socialflow-ai/docs/N8N_SETUP.md)
- [Security Specifications](file:///Users/ahshaan/Documents/socialflow-ai/docs/SECURITY.md)
- [Implementation Status](file:///Users/ahshaan/Documents/socialflow-ai/docs/IMPLEMENTATION_STATUS.md)

---

## 📄 License

MIT License — SocialFlow AI Team.
