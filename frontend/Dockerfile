# syntax=docker/dockerfile:1
# ============================================================
# SOCIALSYNC AI — FRONTEND PRODUCTION DOCKERFILE
# Multi-stage build: Vite React compiler + Lean Nginx server
# ============================================================

# ------------------------------------------------------------
# Stage 1: Build React static assets with Vite
# ------------------------------------------------------------
FROM node:20-bookworm-slim AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Optional build arguments for baked-in frontend variables (e.g. Google Client ID)
ARG VITE_GOOGLE_CLIENT_ID
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID

RUN npm run build

# ------------------------------------------------------------
# Stage 2: Serve optimized static assets via Nginx
# ------------------------------------------------------------
FROM nginx:1.27-alpine AS runner

# Remove default Nginx welcome page configuration
RUN rm -rf /etc/nginx/conf.d/*

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled frontend distribution from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

# Healthcheck targeting the lightweight /healthz Nginx location
HEALTHCHECK --interval=20s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
