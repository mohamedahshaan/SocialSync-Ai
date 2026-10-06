# SocialFlow AI — n8n Automation Orchestration Guide

## 1. Overview

n8n serves as the multi-channel workflow orchestration engine for SocialFlow AI. It decouples the backend web server from platform API latency, rate limits, and network retries while keeping token storage and user authentication strictly inside the backend.

---

## 2. Quickstart: Starting n8n with Docker Compose

1. From the project root, start n8n alongside PostgreSQL:
   ```bash
   docker compose up -d n8n
   ```
2. Access the n8n visual editor in your browser:
   ```
   http://localhost:5678
   ```
3. Complete the initial owner setup (first run only).

---

## 3. Importing the SocialFlow AI Workflow

1. In the n8n UI, navigate to **Workflows** → **Import from File...**
2. Select the file:
   ```
   n8n/socialflow-publishing-workflow.json
   ```
3. Click **Save** and toggle the workflow status from **Inactive** to **Active**.

---

## 4. Webhook & Secret Configuration

- **Webhook URL**: `http://localhost:5678/webhook/socialflow-publish`
- **Secret Header**: `x-socialflow-secret`

In `backend/.env`, set:
```env
N8N_WEBHOOK_URL=http://localhost:5678/webhook/socialflow-publish
N8N_API_KEY=socialflow_n8n_secret_token_secure_2026
```

---

## 5. Workflow Node Pipeline

```
[ Webhook Trigger ]
        |
[ Validate Job Payload ]
        |
[ Fetch Post from Backend (GET /api/posts/:id) ]
        |
[ Split Platforms into Individual Items ]
        |
[ Platform Switch Router ]
  ├── Facebook Publisher  --> [ Update Backend Callback ]
  ├── Instagram Publisher --> [ Update Backend Callback ]
  ├── LinkedIn Publisher  --> [ Update Backend Callback ]
  ├── X Publisher         --> [ Update Backend Callback ]
  └── Threads Publisher   --> [ Update Backend Callback ]
```

### Error Handling & Resilience
- Each platform node has `continueOnFail: true` enabled. A network timeout or API error on LinkedIn will **never** stop the execution of X or Instagram.
- Results are reported to `POST /api/posts/:id/publish-result`.
- If n8n is offline or unreachable, the backend's publishing service automatically falls back to direct internal publishing workers so operations never fail silently.
