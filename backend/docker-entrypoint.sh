#!/bin/sh
set -e

echo "🚀 SocialSync AI Backend initializing..."

# Database readiness wait loop (if DATABASE_URL is configured)
if [ -n "$DATABASE_URL" ]; then
  echo "🔍 Verifying PostgreSQL database reachability..."
  MAX_RETRIES=30
  RETRY_COUNT=0
  until node -e "
    import('./src/utils/prisma.js')
      .then(m => m.prisma.\$connect())
      .then(() => { process.exit(0); })
      .catch((err) => { process.exit(1); });
  " 2>/dev/null; do
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ "$RETRY_COUNT" -ge "$MAX_RETRIES" ]; then
      echo "⚠️ Could not connect to database after $MAX_RETRIES attempts. Continuing startup..."
      break
    fi
    echo "⏳ Database not ready yet (attempt $RETRY_COUNT/$MAX_RETRIES). Waiting 2s..."
    sleep 2
  done
  echo "✅ Database connection established."
fi

# Synchronize database schema if enabled (default true)
if [ "${PRISMA_DB_PUSH:-true}" = "true" ]; then
  echo "📦 Synchronizing Prisma schema to PostgreSQL (prisma db push)..."
  npx prisma db push --skip-generate || echo "⚠️ prisma db push returned non-zero. Continuing..."
fi

# Optional: Auto-provision bootstrap admin if credentials are provided in environment
if [ -n "$BOOTSTRAP_ADMIN_EMAIL" ] && [ -n "$BOOTSTRAP_ADMIN_PASSWORD" ]; then
  echo "👤 Provisioning initial bootstrap administrator (${BOOTSTRAP_ADMIN_EMAIL})..."
  ADMIN_EMAIL="$BOOTSTRAP_ADMIN_EMAIL" ADMIN_PASSWORD="$BOOTSTRAP_ADMIN_PASSWORD" node scripts/bootstrap_admin.js || true
fi

echo "✨ SocialSync AI Backend ready. Starting application process: $@"
exec "$@"
