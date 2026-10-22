# SocialSync AI — Production Docker & VM Deployment Guide

This guide provides end-to-end instructions for deploying **SocialSync AI** onto a Linux Virtual Machine (Ubuntu, Debian, or RHEL) or local Docker environment using Docker Compose.

---

## 1. Architecture Overview

SocialSync AI runs as an isolated multi-container architecture orchestrated via Docker Compose:

```
                      Internet / Browser
                              │
                              ▼
        ┌───────────────────────────────────────────┐
        │       socialsync-frontend (Nginx)         │
        │       Host Port 5180 -> Container Port 80 │
        └─────────────────────┬─────────────────────┘
                              │
             ┌────────────────┴────────────────┐
             │ /                               │ /api/ & /uploads/
             ▼                                 ▼
    ┌─────────────────┐             ┌─────────────────────┐
    │ React 18 SPA    │             │ socialsync-backend  │
    │ (Vite Static)   │             │ Express + Node.js 20│
    └─────────────────┘             │ Port 5002 (internal)│
                                    └──────────┬──────────┘
                                               │
                          ┌────────────────────┼────────────────────┐
                          │                    │                    │
                          ▼                    ▼                    ▼
               ┌──────────────────────┐  ┌───────────┐  ┌─────────────────────┐
               │  socialsync-postgres │  │  uploads  │  │ External Services   │
               │  PostgreSQL 16       │  │  Named    │  │ • Meta / LinkedIn   │
               │  (or Host / RDS DB)  │  │  Volume   │  │ • PayHere / AI      │
               └──────────────────────┘  └───────────┘  └─────────────────────┘
```

### Components:
1. **Frontend (`socialsync-frontend`)**:
   - Multi-stage build compiling React 18 + Vite + Tailwind CSS into minified static assets.
   - Served by `nginx:1.27-alpine` with gzip compression, security headers, and Single Page Application (SPA) fallback.
   - Reverse proxies `/api/*` and `/uploads/*` directly to the backend container without CORS constraints.
   - Built-in `/healthz` healthcheck endpoint.
2. **Backend (`socialsync-backend`)**:
   - Node.js 20 on Debian slim (`node:20-bookworm-slim`).
   - Bundles `openssl`, `ca-certificates`, `ffmpeg` (for video conversion & probes), and `curl`.
   - Runs with least privilege under the non-root `node` user.
   - Auto-synchronizes Prisma database schema via `prisma db push` on startup.
   - Healthcheck polled against `/api/health`.
3. **Database (`socialsync-postgres`)**:
   - PostgreSQL 16 Alpine with persistent data volume (`socialsync_postgres_data`).
   - Configurable to use either this embedded container or an external PostgreSQL instance (e.g. on the VM host or managed RDS).
4. **Persistent Storage (`socialsync_uploads_data`)**:
   - Dedicated Docker named volume mounted at `/app/uploads` in the backend container to ensure uploaded images, collages, and videos are never lost during container restarts or rebuilds.

---

## 2. Supervisor's VM Prerequisites

Before deploying to the supervisor's VM, verify the following are installed and configured:

### A. Operating System & Hardware
- **OS**: Ubuntu 22.04 LTS / 24.04 LTS, Debian 12, or RHEL 9.
- **CPU/RAM**: Minimum 2 vCPUs and 2 GB RAM (4 GB RAM recommended if processing large videos via FFmpeg).
- **Disk**: Minimum 20 GB free disk space.

### B. Docker Engine & Docker Compose
If Docker is not yet installed on the VM, install using official Docker repositories:

```bash
# 1. Update package index and install certificates
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg

# 2. Add Docker's official GPG key
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# 3. Set up the repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 4. Install Docker Engine, CLI, and Compose plugin
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# 5. Enable and start Docker service
sudo systemctl enable docker
sudo systemctl start docker

# 6. (Optional) Allow running docker without sudo
sudo usermod -aG docker $USER
newgrp docker
```

Verify installation:
```bash
docker --version
docker compose version
```

### C. Firewall & Network Ports
Ensure the VM firewall (e.g., UFW or AWS Security Group) allows inbound traffic on the required ports:

```bash
# Allow Frontend (Port 5180) and direct Backend API (Port 5002)
sudo ufw allow 5180/tcp
sudo ufw allow 5002/tcp

# Note: PostgreSQL is internal-only to the Docker bridge network. Do NOT expose port 5432.
```

---

## 3. Configuration & Environment Variables

Copy the environment template into place before starting containers:

```bash
cp .env.example .env
cp .env.example backend/.env
```

### Key Variables for VM Deployment

| Variable | Description | Example (VM by IP) | Example (Domain + SSL) |
|---|---|---|---|
| `NODE_ENV` | Runtime environment | `production` | `production` |
| `FRONTEND_URL` | Frontend origin for CORS and OAuth redirects | `http://<VM_PUBLIC_IP>:5180` | `https://socialsync.example.com` |
| `BACKEND_URL` | Backend URL for media file URLs and internal API | `http://<VM_PUBLIC_IP>:5002` (or `http://backend:5002`) | `https://socialsync.example.com` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:password@postgres:5432/socialflow_db` | `postgresql://postgres:password@postgres:5432/socialflow_db` |
| `JWT_SECRET` | Secret key for JWT auth tokens | Random 64-char hex string | Random 64-char hex string |
| `BOOTSTRAP_ADMIN_EMAIL` | Optional admin email for initial provisioning | `admin@company.com` | `admin@company.com` |
| `BOOTSTRAP_ADMIN_PASSWORD` | Optional admin password for initial provisioning | `StrongSecretPass123!` | `StrongSecretPass123!` |
| `PRISMA_DB_PUSH` | Auto-sync Prisma schema on startup (`true`/`false`) | `true` | `true` |

Generate a cryptographically secure `JWT_SECRET`:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 4. Deployment Modes

### Mode A: All-in-One Deployment (Recommended)
This mode starts the **Frontend**, **Backend**, and **PostgreSQL 16 container** together in a single command.

```bash
# Build and start all services in the background
docker compose up -d --build

# View real-time container startup logs
docker compose logs -f
```

### Mode B: External / Existing PostgreSQL Database
If the VM already has a native PostgreSQL service installed or uses an external cloud database (Amazon RDS, Google Cloud SQL, Supabase, Neon):

1. Edit `.env` and set `DATABASE_URL`:
   - **For PostgreSQL on the VM host**:
     ```env
     DATABASE_URL="postgresql://postgres:yourpassword@host.docker.internal:5432/socialflow_db?schema=public"
     ```
   - **For Remote Managed PostgreSQL**:
     ```env
     DATABASE_URL="postgresql://dbuser:dbpass@db.yourprovider.com:5432/socialflow_db?sslmode=require"
     ```
2. Start only the backend and frontend services without spinning up the `postgres` container:
   ```bash
   docker compose up backend frontend -d --build
   ```

---

## 5. Verification & Health Checks

Check container statuses:
```bash
docker compose ps
```

Expected output:
```
NAME                  IMAGE                  COMMAND                  SERVICE    CREATED          STATUS                    PORTS
socialsync-backend    socialsync-backend     "./docker-entrypoint…"   backend    10 seconds ago   Up 9 seconds (healthy)    0.0.0.0:5002->5002/tcp
socialsync-frontend   socialsync-frontend    "nginx -g 'daemon of…"   frontend   5 seconds ago    Up 4 seconds (healthy)    0.0.0.0:5180->80/tcp
socialsync-postgres   postgres:16-alpine     "docker-entrypoint.s…"   postgres   12 seconds ago   Up 11 seconds (healthy)   5432/tcp (internal)
```

Test health endpoints from the terminal:
```bash
# Frontend health
curl -f http://localhost:5180/healthz
# Backend health (via Nginx proxy)
curl -f http://localhost:5180/api/health
# Direct backend health
curl -f http://localhost:5002/api/health
```

---

## 6. Admin Account Provisioning

To create or promote the initial administrator account:

### Option 1: Automatic via `.env`
Set in `.env`:
```env
BOOTSTRAP_ADMIN_EMAIL=admin@yourcompany.com
BOOTSTRAP_ADMIN_PASSWORD=YourSecurePassword123!
```
The backend container entrypoint will automatically provision this account on startup.

### Option 2: Interactive Terminal Command
Run the bootstrap script inside the running backend container:
```bash
docker compose exec backend npm run seed:admin
```
Or specify credentials on the fly:
```bash
docker compose exec -e ADMIN_EMAIL="admin@company.com" -e ADMIN_PASSWORD="SuperSecretAdminPass123!" backend npm run seed:admin
```

---

## 7. Media Persistence & Restart Procedures

### Stop the Application (Safely Preserving All Data)
```bash
# Stops and removes container instances, but PRESERVES all database data and uploaded media
docker compose down
```

> [!IMPORTANT]
> Never run `docker compose down -v` in production! The `-v` flag deletes named volumes (`socialsync_postgres_data` and `socialsync_uploads_data`).

### Restart After Code or Configuration Changes
```bash
# Pull/rebuild and start with zero data loss
docker compose up -d --build
```

### Inspect Stored Uploaded Media
All uploaded photos and videos are stored in the Docker volume `socialsync_uploads_data`. You can inspect files inside the volume at any time:
```bash
docker compose exec backend ls -la /app/uploads
```

---

## 8. Backup & Restore Procedures

### Database Backup (PostgreSQL)
```bash
# Export compressed database dump
docker compose exec -T postgres pg_dump -U postgres socialflow_db | gzip > backup_socialflow_$(date +%Y%m%d_%H%M%S).sql.gz
```

### Database Restore
```bash
# Restore from compressed database dump
gunzip < backup_socialflow_20261021.sql.gz | docker compose exec -T postgres psql -U postgres -d socialflow_db
```

### Media Uploads Backup
```bash
# Backup uploads volume to a tarball on the host
docker run --rm \
  -v socialsync_uploads_data:/volume \
  -v $(pwd):/backup \
  alpine tar -czf /backup/uploads_backup_$(date +%Y%m%d_%H%M%S).tar.gz -C /volume .
```

### Media Uploads Restore
```bash
# Restore uploads volume from tarball
docker run --rm \
  -v socialsync_uploads_data:/volume \
  -v $(pwd):/backup \
  alpine sh -c "cd /volume && tar -xzf /backup/uploads_backup_XXXXX.tar.gz"
```

---

## 9. Next Steps for Production & Public Domain

When moving from a VM IP to a custom public domain (e.g., `https://socialsync.example.com`):

1. **DNS Record**: Point an `A` record from your domain to the VM public IP.
2. **Environment Variables**:
   Update `FRONTEND_URL` and `BACKEND_URL` in `.env`:
   ```env
   FRONTEND_URL=https://socialsync.example.com
   BACKEND_URL=https://socialsync.example.com
   ```
3. **SSL / HTTPS Termination**:
   - Install Certbot on the VM host to obtain a free Let's Encrypt certificate:
     ```bash
     sudo apt-get install -y certbot python3-certbot-nginx
     ```
   - Alternatively, place Cloudflare, AWS ALB, or an Nginx reverse proxy in front of port 80.
4. **OAuth Callbacks**: Update Meta, Google, LinkedIn, TikTok, and PayHere developer portals with your production HTTPS domain:
   - `https://socialsync.example.com/api/oauth/facebook/callback`
   - `https://socialsync.example.com/api/oauth/instagram/callback`
   - `https://socialsync.example.com/api/oauth/linkedin/callback`
   - `https://socialsync.example.com/api/webhooks/payment`

---

## 10. Troubleshooting Cheat Sheet

| Symptom | Cause | Solution |
|---|---|---|
| Frontend loads but API calls fail with 502 Bad Gateway | Backend is still starting or unhealthy | Check `docker compose ps` and `docker compose logs backend`. Ensure database is reachable. |
| `docker compose up` fails with "port already in use" | Another service on the shared host is using 5180 or 5002 | Check `sudo lsof -i :5180 -i :5002`. Change mapped host ports in `.env` (`FRONTEND_PORT`, `BACKEND_PORT`). |
| Uploading a large video fails with 413 Entity Too Large | Nginx or body-parser limit exceeded | Ensure `client_max_body_size 100M;` is active in `frontend/nginx.conf`. |
| Prisma reports connection error to PostgreSQL | `DATABASE_URL` hostname is incorrect | Use `postgres` as hostname within Docker (`@postgres:5432`), or `host.docker.internal` if connecting to host OS. |
| Admin login fails after fresh deployment | Database is empty and admin not provisioned | Run `docker compose exec backend npm run seed:admin`. |
