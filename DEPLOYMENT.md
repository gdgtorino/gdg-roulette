# The Draw - Complete CI/CD Deployment Guide

This guide covers the complete CI/CD pipeline setup for The Draw lottery
management system, including GitHub Actions workflows, Docker containerization,
and multi-environment deployment strategies.

## 📋 Overview

The CI/CD pipeline supports:

- **Testing**: Automated testing with PostgreSQL and Redis services
- **Building**: Optimized Docker builds with caching
- **Deployment**: Multi-environment deployment (staging, production)
- **Monitoring**: Integrated monitoring and logging
- **Security**: Security scanning and best practices

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Development   │───▶│     Staging     │───▶│   Production    │
│                 │    │                 │    │                 │
│ • Local dev     │    │ • Auto deploy   │    │ • Manual deploy │
│ • Feature tests │    │ • Integration   │    │ • Tag-based     │
│ • PR checks     │    │ • Full testing  │    │ • Blue/green    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🔄 GitHub Actions Workflows

### 1. Test Workflow (`.github/workflows/test.yml`)

**Triggers**: Pull requests and pushes to `dev` branch

**Features**:

- PostgreSQL 15 and Redis 7 services
- Parallel linting and type checking
- Database schema validation
- Security auditing
- Comprehensive caching strategy

**Services**:

```yaml
postgres:
  image: postgres:15-alpine
  env:
    POSTGRES_DB: test_db
    POSTGRES_USER: postgres
    POSTGRES_PASSWORD: postgres

redis:
  image: redis:7-alpine
```

### 2. Build Workflow (`.github/workflows/build.yml`)

**Triggers**: Pushes to `main`/`dev` branches and pull requests to `main`

**Features**:

- Path-based change detection
- Matrix builds for frontend/backend
- Docker image building and testing
- Build artifact caching
- Size analysis for frontend builds

**Change Detection**:

```yaml
frontend: ['apps/frontend/**', 'package.json', 'yarn.lock']
backend: ['apps/backend/**', 'package.json', 'yarn.lock']
docker: ['apps/**/Dockerfile', 'docker-compose*.yml']
```

### 3. Deploy Workflow (`.github/workflows/deploy.yml`)

**Triggers**:

- Pushes to `main` branch
- Version tags (`v*`)
- Manual workflow dispatch

**Features**:

- Environment-specific deployments
- Pre-deployment checks
- Docker image publishing to GHCR
- Deployment status tracking
- Health checks and rollback capabilities

## 🐳 Docker Configuration

### Frontend Dockerfile

**Multi-stage build**:

1. **base**: Node.js 20 Alpine with system dependencies
2. **deps**: Production dependencies only
3. **builder**: Full build with dev dependencies
4. **runner**: Optimized production image

**Key Features**:

- Next.js standalone output
- Non-root user for security
- Optimized health checks
- Signal handling with dumb-init
- Build caching with mount cache

### Backend Dockerfile

**Features**:

- Prisma client generation
- Production-only dependencies
- Health check endpoints
- Security hardening

## 🌍 Environment Management

### Development Environment

```bash
# Start development environment
yarn dev

# Or with Docker
yarn docker:up
```

### Staging Environment

```bash
# Deploy to staging
yarn deploy:staging

# Or manually
docker-compose -f docker-compose.yml -f docker-compose.staging.yml up -d
```

**Staging Features**:

- SSL termination with Let's Encrypt
- Prometheus monitoring
- Resource limits
- Debug logging enabled

### Production Environment

```bash
# Deploy to production (requires confirmation)
yarn deploy:production

# Force deployment
yarn deploy:production:force
```

**Production Features**:

- Multiple domain support
- Enhanced security headers
- Rate limiting
- Backup automation
- Log aggregation with Loki
- Grafana dashboards

## 📊 Monitoring Stack

### Prometheus Configuration

- Application metrics collection
- Service discovery
- Alert rules for critical metrics

### Grafana Dashboards

- Application performance metrics
- Infrastructure monitoring
- Business metrics tracking

### Logging

- Structured JSON logging
- Log aggregation with Loki
- Centralized log analysis

## 🔒 Security Features

### Application Security

- Non-root container execution
- Security headers (HSTS, CSP, etc.)
- Rate limiting
- Input validation

### Infrastructure Security

- SSL/TLS termination
- Security scanning in CI
- Dependency vulnerability checks
- Container image scanning

## 🚀 Deployment Commands

### Available Scripts

```bash
# Development
yarn dev                    # Start development servers
yarn build                  # Build all applications
yarn test                   # Run tests
yarn lint                   # Run linting

# Docker Operations
yarn docker:build          # Build Docker images
yarn docker:up            # Start development stack
yarn docker:down          # Stop all services
yarn docker:staging       # Start staging environment
yarn docker:production    # Start production environment

# Deployment
yarn deploy:staging        # Deploy to staging
yarn deploy:production     # Deploy to production
yarn deploy:staging:force  # Force staging deployment
yarn deploy:production:force # Force production deployment

# Database Operations
yarn db:migrate           # Run database migrations
yarn db:seed              # Seed database with initial data

# Monitoring
yarn monitoring:up         # Start monitoring stack
yarn logs                 # View all logs
yarn logs:backend         # View backend logs only
yarn logs:frontend        # View frontend logs only

# Maintenance
yarn health:check         # Check service health
yarn security:audit       # Run security audit
```

### Manual Deployment

Using the deployment script:

```bash
# Deploy to staging
./scripts/deploy.sh staging

# Deploy to production with force flag
./scripts/deploy.sh production --force

# Skip tests during deployment
./scripts/deploy.sh staging --skip-tests
```

## 🌐 Vercel Deployment (Alternative)

For Vercel deployment, use the provided `vercel.json` configuration:

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

**Vercel Features**:

- Next.js optimized builds
- API route proxying to backend
- Security headers
- Performance monitoring

## 📁 File Structure

```
.
├── .github/
│   └── workflows/
│       ├── test.yml              # CI testing workflow
│       ├── build.yml             # Build and validation
│       └── deploy.yml            # Deployment workflow
├── apps/
│   ├── frontend/
│   │   └── Dockerfile            # Optimized Next.js build
│   └── backend/
│       └── Dockerfile            # Node.js backend build
├── config/
│   └── prometheus/
│       └── prometheus.yml        # Monitoring configuration
├── scripts/
│   └── deploy.sh                 # Deployment automation script
├── docker-compose.yml            # Base composition
├── docker-compose.staging.yml    # Staging overrides
├── docker-compose.production.yml # Production overrides
├── .env.example                  # Environment template
├── .env.staging                  # Staging configuration
├── .env.production               # Production template
└── vercel.json                   # Vercel deployment config
```

## 🔧 Configuration

### Environment Variables

#### Required for All Environments

- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `JWT_SECRET`: JWT signing secret

#### Production Specific

- `POSTGRES_PASSWORD`: Secure database password
- `ACME_EMAIL`: Let's Encrypt certificate email
- `GRAFANA_PASSWORD`: Grafana admin password

### Docker Compose Overrides

Use environment-specific compose files:

```bash
# Staging
docker-compose -f docker-compose.yml -f docker-compose.staging.yml up -d

# Production
docker-compose -f docker-compose.yml -f docker-compose.production.yml up -d
```

## 🚨 Troubleshooting

### Common Issues

1. **Database Connection Failures**

   ```bash
   # Check database logs
   docker-compose logs postgres

   # Verify connection
   docker-compose exec postgres pg_isready
   ```

2. **Build Failures**

   ```bash
   # Clear Docker build cache
   docker system prune -a

   # Rebuild without cache
   docker-compose build --no-cache
   ```

3. **Port Conflicts**
   ```bash
   # Check port usage
   lsof -i :3000
   lsof -i :3001
   ```

### Health Checks

Each service includes health checks:

```bash
# Check service health
docker-compose ps

# View health check logs
docker inspect <container_name> | jq '.[0].State.Health'
```

## 📈 Performance Optimization

### Build Optimization

- Multi-stage Docker builds
- Layer caching
- Dependency optimization
- Build artifact reuse

### Runtime Optimization

- Next.js standalone output
- Resource limits
- Connection pooling
- Caching strategies

## 🔄 Update Procedures

### Application Updates

1. Create feature branch
2. Run tests locally
3. Create pull request
4. Automated CI/CD pipeline deploys to staging
5. Manual promotion to production

### Infrastructure Updates

1. Update Docker images
2. Test in staging environment
3. Schedule maintenance window
4. Deploy with rollback plan

## 📚 Additional Resources

- [Next.js Production Deployment](https://nextjs.org/docs/deployment)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Prometheus Monitoring](https://prometheus.io/docs/guides/getting_started/)
- [Traefik Load Balancer](https://doc.traefik.io/traefik/)

## 🤝 Contributing

1. Follow the established deployment patterns
2. Update documentation for any infrastructure changes
3. Test changes in staging before production
4. Maintain backward compatibility

---

**Note**: This deployment setup is designed for scalability and security. Always
review and adapt configurations for your specific infrastructure requirements.
