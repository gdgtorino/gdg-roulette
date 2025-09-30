#!/bin/sh
set -e

echo "🔄 Running database migrations..."
if ! npx prisma migrate deploy 2>&1; then
  echo "⚠️  Migration failed, trying to resolve schema..."
  npx prisma migrate resolve --applied 0_init || true
  npx prisma db push --accept-data-loss || true
fi

echo "🌱 Running database seed..."
npx prisma db seed || echo "⚠️  Seed failed or already executed"

echo "🚀 Starting application..."
exec node server.js
