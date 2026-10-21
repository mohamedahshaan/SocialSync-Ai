# syntax=docker/dockerfile:1
# ============================================================
# SOCIALSYNC AI — BACKEND PRODUCTION DOCKERFILE
# Multi-stage build with OpenSSL, FFmpeg, and non-root user
# ============================================================

# ------------------------------------------------------------
# Stage 1: Base runtime environment with system dependencies
# ------------------------------------------------------------
FROM node:20-bookworm-slim AS base

WORKDIR /app

# Install runtime system packages:
# - openssl & ca-certificates: required by Prisma engine and HTTPS requests
# - ffmpeg: required for media pipeline (video conversions & thumbnail probing)
# - curl: required for container healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    ca-certificates \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

# ------------------------------------------------------------
# Stage 2: Dependencies and Prisma client generation
# ------------------------------------------------------------
FROM base AS builder

COPY package*.json ./

# Install all dependencies (including devDependencies needed for Prisma CLI)
RUN npm ci

# Copy schema and generate Prisma client for Debian Linux
COPY prisma ./prisma
RUN npx prisma generate

# ------------------------------------------------------------
# Stage 3: Lean production runner image
# ------------------------------------------------------------
FROM base AS runner

ENV NODE_ENV=production
ENV PORT=5001
ENV STORAGE_TYPE=local
ENV UPLOAD_DIR=uploads

# Create uploads directory and establish ownership for non-root node user
RUN mkdir -p /app/uploads && chown -R node:node /app

# Copy dependencies and compiled Prisma Client artifacts from builder
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/prisma ./prisma

# Copy application source code and deployment scripts
COPY --chown=node:node package*.json ./
COPY --chown=node:node src ./src
COPY --chown=node:node scripts ./scripts
COPY --chown=node:node docker-entrypoint.sh ./docker-entrypoint.sh

RUN chmod +x ./docker-entrypoint.sh

# Run as non-privileged node user for security
USER node

EXPOSE 5001

# Container Healthcheck (polls the /api/health endpoint)
HEALTHCHECK --interval=20s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:5001/api/health || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "src/server.js"]
