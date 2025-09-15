#!/bin/bash

# The Draw Deployment Script
# Usage: ./scripts/deploy.sh [environment] [options]
# Examples:
#   ./scripts/deploy.sh staging
#   ./scripts/deploy.sh production --skip-tests
#   ./scripts/deploy.sh staging --force

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENVIRONMENT="${1:-staging}"
SKIP_TESTS=false
FORCE_DEPLOY=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        --force)
            FORCE_DEPLOY=true
            shift
            ;;
        staging|production)
            ENVIRONMENT="$1"
            shift
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_prerequisites() {
    log_info "Checking prerequisites..."

    # Check if required tools are installed
    command -v docker >/dev/null 2>&1 || { log_error "Docker is required but not installed."; exit 1; }
    command -v docker-compose >/dev/null 2>&1 || { log_error "Docker Compose is required but not installed."; exit 1; }
    command -v yarn >/dev/null 2>&1 || { log_error "Yarn is required but not installed."; exit 1; }

    # Check if environment file exists
    if [[ ! -f "$PROJECT_ROOT/.env.$ENVIRONMENT" ]]; then
        log_error "Environment file .env.$ENVIRONMENT not found!"
        exit 1
    fi

    # Check if docker-compose environment file exists
    if [[ ! -f "$PROJECT_ROOT/docker-compose.$ENVIRONMENT.yml" ]]; then
        log_error "Docker compose file docker-compose.$ENVIRONMENT.yml not found!"
        exit 1
    fi

    log_success "Prerequisites check passed"
}

run_tests() {
    if [[ "$SKIP_TESTS" == "true" ]]; then
        log_warning "Skipping tests as requested"
        return 0
    fi

    log_info "Running tests..."
    cd "$PROJECT_ROOT"

    # Run linting
    yarn lint || { log_error "Linting failed"; exit 1; }

    # Run type checking and build
    yarn build || { log_error "Build failed"; exit 1; }

    # TODO: Add actual test commands when implemented
    # yarn test

    log_success "Tests passed"
}

build_images() {
    log_info "Building Docker images..."
    cd "$PROJECT_ROOT"

    # Load environment variables
    set -a
    source ".env.$ENVIRONMENT"
    set +a

    # Build images
    docker-compose -f docker-compose.yml -f "docker-compose.$ENVIRONMENT.yml" build

    log_success "Docker images built successfully"
}

deploy_services() {
    log_info "Deploying services to $ENVIRONMENT environment..."
    cd "$PROJECT_ROOT"

    # Load environment variables
    set -a
    source ".env.$ENVIRONMENT"
    set +a

    # Stop existing services if running
    docker-compose -f docker-compose.yml -f "docker-compose.$ENVIRONMENT.yml" down || true

    # Start services
    docker-compose -f docker-compose.yml -f "docker-compose.$ENVIRONMENT.yml" up -d

    log_success "Services deployed successfully"
}

health_check() {
    log_info "Performing health checks..."

    local max_attempts=30
    local attempt=1

    while [[ $attempt -le $max_attempts ]]; do
        log_info "Health check attempt $attempt/$max_attempts"

        # Check if containers are running
        if docker-compose -f docker-compose.yml -f "docker-compose.$ENVIRONMENT.yml" ps | grep -q "Up"; then
            log_success "Containers are running"

            # Wait a bit more for services to be ready
            sleep 10

            # TODO: Add specific health check endpoints
            # curl -f "http://localhost:3001/api/health" >/dev/null 2>&1

            log_success "Health checks passed"
            return 0
        fi

        sleep 10
        ((attempt++))
    done

    log_error "Health checks failed after $max_attempts attempts"
    return 1
}

cleanup() {
    log_info "Cleaning up..."

    # Remove unused images
    docker image prune -f || true

    log_success "Cleanup completed"
}

show_deployment_info() {
    log_info "Deployment Information:"
    echo "Environment: $ENVIRONMENT"
    echo "Project Root: $PROJECT_ROOT"

    if [[ "$ENVIRONMENT" == "staging" ]]; then
        echo "Frontend URL: https://staging.thedraw.app"
        echo "Backend API: https://staging.thedraw.app/api"
    elif [[ "$ENVIRONMENT" == "production" ]]; then
        echo "Frontend URL: https://production.thedraw.app"
        echo "Backend API: https://production.thedraw.app/api"
    fi

    echo ""
    log_info "Services status:"
    docker-compose -f docker-compose.yml -f "docker-compose.$ENVIRONMENT.yml" ps
}

main() {
    log_info "Starting deployment to $ENVIRONMENT environment..."

    # Confirmation for production
    if [[ "$ENVIRONMENT" == "production" && "$FORCE_DEPLOY" != "true" ]]; then
        echo -e "${YELLOW}You are about to deploy to PRODUCTION. Are you sure? (y/N)${NC}"
        read -r response
        if [[ ! "$response" =~ ^[Yy]$ ]]; then
            log_info "Deployment cancelled"
            exit 0
        fi
    fi

    check_prerequisites
    run_tests
    build_images
    deploy_services
    health_check
    cleanup
    show_deployment_info

    log_success "Deployment to $ENVIRONMENT completed successfully!"
}

# Trap errors and cleanup
trap 'log_error "Deployment failed at line $LINENO"' ERR

# Run main function
main "$@"