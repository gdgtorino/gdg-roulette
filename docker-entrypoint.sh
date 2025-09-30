#!/bin/sh
set -e

echo "🔄 Running database migrations..."
npx prisma migrate deploy

echo "🌱 Running database seed..."
npx prisma db seed || echo "⚠️  Seed failed or already executed"

echo "🚀 Starting application..."
exec node server.js
