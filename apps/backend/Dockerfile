FROM node:20-alpine AS base

# Install system dependencies and enable corepack for Yarn
RUN apk add --no-cache libc6-compat wget
RUN corepack enable

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package.json yarn.lock* .yarnrc.yml* ./
COPY .yarn .yarn

# Install production dependencies only
RUN yarn workspaces focus --production && yarn cache clean

# Build the app
FROM base AS builder
WORKDIR /app

# Copy package files
COPY package.json yarn.lock* .yarnrc.yml* ./
COPY .yarn .yarn

# Install all dependencies including dev dependencies
RUN yarn install --immutable

# Copy source code
COPY . .

# Generate Prisma client if schema exists
RUN if [ -f prisma/schema.prisma ]; then yarn prisma generate; fi

# Build the application
RUN yarn build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

# Create nodejs user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S -u 1001 -G nodejs nodejs

# Copy production dependencies
COPY --from=deps --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copy built application
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./package.json

# Copy Prisma schema if it exists
COPY --from=builder --chown=nodejs:nodejs /app/prisma ./prisma

# Create health check endpoint
RUN echo '#!/bin/sh\nwget --no-verbose --tries=1 --spider http://localhost:3001/api/health || exit 1' > /usr/local/bin/healthcheck.sh && \
    chmod +x /usr/local/bin/healthcheck.sh

USER nodejs

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD /usr/local/bin/healthcheck.sh

CMD ["node", "dist/index.js"]