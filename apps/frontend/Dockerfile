FROM node:20-alpine AS base

# Install system dependencies and enable corepack for Yarn
RUN apk add --no-cache libc6-compat wget dumb-init && \
    corepack enable && \
    npm cache clean --force

# Set working directory
WORKDIR /app

# Install dependencies only when needed
FROM base AS deps

# Copy package files and yarn configuration
COPY package.json yarn.lock* .yarnrc.yml* ./
COPY .yarn/releases .yarn/releases

# Install production dependencies only
RUN --mount=type=cache,target=/root/.yarn/cache \
    yarn workspaces focus --production && \
    yarn cache clean --all

# Build the app
FROM base AS builder

# Copy package files and yarn configuration
COPY package.json yarn.lock* .yarnrc.yml* ./
COPY .yarn .yarn

# Install all dependencies including dev dependencies
RUN --mount=type=cache,target=/root/.yarn/cache \
    yarn install --immutable

# Copy source code
COPY . .

# Set build environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV SKIP_ENV_VALIDATION=1

# Generate Prisma client if schema exists
RUN if [ -f prisma/schema.prisma ]; then yarn prisma generate; fi

# Build the application with optimizations
RUN yarn build && \
    yarn cache clean --all

# Production image
FROM base AS runner

# Security: Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S -u 1001 -G nodejs nextjs

# Set production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Copy built application with proper ownership
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Create optimized health check script
RUN echo '#!/bin/sh\n\
set -e\n\
wget --no-verbose --tries=1 --spider --timeout=5 http://localhost:3000/api/health 2>/dev/null || \\\n\
wget --no-verbose --tries=1 --spider --timeout=5 http://localhost:3000/ || exit 1' > /usr/local/bin/healthcheck.sh && \
    chmod +x /usr/local/bin/healthcheck.sh && \
    chown nextjs:nodejs /usr/local/bin/healthcheck.sh

# Security: Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Health check with proper intervals
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD /usr/local/bin/healthcheck.sh

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "server.js"]