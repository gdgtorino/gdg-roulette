FROM node:18-alpine AS base

# Install system dependencies
RUN apk add --no-cache libc6-compat wget

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm install --only=production && npm cache clean --force

# Build the app
FROM base AS builder
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies including dev dependencies
RUN npm install

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Create nextjs user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S -u 1001 -G nodejs nextjs

# Copy built application
COPY --from=builder /app/public ./public

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Create health check script
RUN echo '#!/bin/sh\nwget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1' > /usr/local/bin/healthcheck.sh && \
    chmod +x /usr/local/bin/healthcheck.sh

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD /usr/local/bin/healthcheck.sh

CMD ["node", "server.js"]