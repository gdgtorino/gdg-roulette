# The Draw

A modern, full-stack lottery and raffle management system designed for events,
organizations, and communities. The Draw provides an intuitive interface for
administrators to create events, manage participants, and conduct fair,
transparent drawings with visual effects.

## 🎯 Features

### Admin Features

- **Event Management**: Create, delete, and view historical events with
  participant lists and winner records
- **QR Code Generation**: Automatic QR code generation for easy participant
  registration
- **Registration Control**: Real-time registration blocking and participant
  management
- **Multiple Drawings**: Conduct multiple sequential draws with automatic
  participant removal
- **Visual Effects**: Confetti animations and roulette-style randomizer for
  engaging draw experience
- **Comprehensive Dashboard**: Full event history and winner tracking
- **Multi-language Support**: Available in English and Italian
- **Dark/Light Mode**: Theme switching for better user experience

### User Features

- **QR Code Registration**: Quick and easy event registration via QR code
  scanning
- **Auto-generated Names**: Passphrase-style default names with customization
  options
- **Multi-event Participation**: Same user can participate in different events
- **Real-time Updates**: Live registration status and draw results

## 🏗️ Architecture

The Draw is built as a modern monorepo with the following components:

- **Frontend**: Next.js with React, TailwindCSS, and Radix UI components
- **Backend**: Node.js with Express and TypeScript
- **Database**: Redis for fast, in-memory data storage
- **Real-time Communication**: Socket.IO for live updates
- **Reverse Proxy**: Traefik for load balancing and routing
- **Containerization**: Docker and Docker Compose for easy deployment

## 📋 Prerequisites

- Node.js 20+ and Yarn 4.0+
- Docker and Docker Compose (for containerized deployment)
- Redis (for development without Docker)

## 🚀 Quick Start

### Development Setup

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd the-draw
   ```

2. **Install dependencies**

   ```bash
   yarn install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start Redis (if not using Docker)**

   ```bash
   # macOS with Homebrew
   brew services start redis

   # Ubuntu/Debian
   sudo systemctl start redis
   ```

5. **Start development servers**

   ```bash
   yarn dev
   ```

   This starts:

   - Backend API on http://localhost:3001
   - Frontend on http://localhost:3000

### Docker Deployment

1. **Build and start services**

   ```bash
   yarn docker:up
   ```

   This starts:

   - Frontend: http://localhost:8090
   - Backend API: http://localhost:8090/api
   - Traefik Dashboard: http://localhost:8091
   - Redis: Internal network only

2. **Stop services**
   ```bash
   yarn docker:down
   ```

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# JWT Secret for authentication (CHANGE IN PRODUCTION!)
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# Admin user credentials
ADMIN_DEFAULT_USER=admin
ADMIN_DEFAULT_PASSWORD=admin

# Redis configuration
REDIS_URL=redis://localhost:6381

# CORS origin for frontend
CORS_ORIGIN=http://localhost:8090

# Environment
NODE_ENV=production
```

### Key Configuration Options

- **JWT_SECRET**: Used for session authentication. Must be changed in production
- **ADMIN_DEFAULT_USER/PASSWORD**: Default admin credentials for initial setup
- **REDIS_URL**: Redis connection string (adjust port for Docker vs local Redis)
- **CORS_ORIGIN**: Frontend URL for CORS configuration

## 📚 API Documentation

### Authentication

- `POST /api/auth/login` - Admin login
- `POST /api/auth/logout` - Admin logout
- `GET /api/auth/me` - Get current user info

### Events

- `GET /api/events` - List all events
- `POST /api/events` - Create new event
- `GET /api/events/:id` - Get event details
- `DELETE /api/events/:id` - Delete event
- `POST /api/events/:id/close` - Close event registration
- `POST /api/events/:id/draw` - Perform drawing

### Participants

- `GET /api/events/:id/participants` - Get event participants
- `POST /api/events/:id/participants` - Register participant
- `DELETE /api/events/:id/participants/:participantId` - Remove participant

### QR Codes

- `GET /api/events/:id/qr` - Get event QR code

## 🛠️ Development Commands

### Monorepo Commands

```bash
# Start all services in development
yarn dev

# Build all projects
yarn build

# Start production servers
yarn start

# Clean build artifacts
yarn clean

# Docker commands
yarn docker:build    # Build Docker images
yarn docker:up       # Start with Docker Compose
yarn docker:down     # Stop Docker services
```

### Backend Commands

```bash
# Development server with hot reload
yarn workspace @the-draw/backend dev

# Build TypeScript
yarn workspace @the-draw/backend build

# Start production server
yarn workspace @the-draw/backend start

# Linting
yarn workspace @the-draw/backend lint
yarn workspace @the-draw/backend lint:fix
```

### Frontend Commands

```bash
# Development server
yarn workspace @the-draw/frontend dev

# Build for production
yarn workspace @the-draw/frontend build

# Start production server
yarn workspace @the-draw/frontend start

# Linting
yarn workspace @the-draw/frontend lint
```

## 📁 Project Structure

```
the-draw/
├── apps/
│   ├── backend/              # Node.js/Express API
│   │   ├── src/
│   │   │   ├── routes/       # API routes
│   │   │   ├── middleware/   # Authentication & validation
│   │   │   ├── services/     # Business logic
│   │   │   ├── utils/        # Utilities
│   │   │   └── types/        # TypeScript definitions
│   │   └── Dockerfile
│   └── frontend/             # Next.js React app
│       ├── app/              # App Router pages
│       ├── components/       # Reusable components
│       ├── lib/              # Utilities and configurations
│       ├── public/           # Static assets
│       └── Dockerfile
├── docker-compose.yml        # Multi-service Docker setup
├── package.json              # Monorepo configuration
└── .env.example              # Environment template
```

## 🔐 Security Considerations

- Change default admin credentials in production
- Use a strong, random JWT secret
- Configure CORS origins properly
- Run behind HTTPS in production
- Regularly update dependencies
- Use environment variables for sensitive data

## 🚢 Production Deployment

### Docker Production Setup

1. **Update environment variables**

   ```bash
   # Set strong passwords and secrets
   JWT_SECRET=$(openssl rand -hex 32)
   ADMIN_DEFAULT_PASSWORD=$(openssl rand -base64 32)
   ```

2. **Configure domain and SSL** Update `docker-compose.yml` Traefik labels for
   your domain:

   ```yaml
   - 'traefik.http.routers.frontend.rule=Host(`yourdomain.com`)'
   ```

3. **Start production services**
   ```bash
   docker-compose up -d
   ```

### Manual Deployment

1. **Build applications**

   ```bash
   yarn build
   ```

2. **Set up Redis**

   ```bash
   # Install and configure Redis
   sudo apt install redis-server
   ```

3. **Configure reverse proxy** Set up Nginx or Apache to proxy requests to the
   backend and serve the frontend.

4. **Set up process management** Use PM2 or systemd to manage Node.js processes:
   ```bash
   pm2 start dist/index.js --name the-draw-app
   ```

## 🧪 Testing

The project includes ESLint configuration for code quality:

```bash
# Run backend linting
yarn workspace @the-draw/backend lint

# Run frontend linting
yarn workspace @the-draw/frontend lint

# Auto-fix issues
yarn workspace @the-draw/backend lint:fix
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for
details.

## 🆘 Troubleshooting

### Common Issues

**Redis Connection Failed**

```bash
# Check Redis status
redis-cli ping
# Should return PONG

# For Docker deployment
docker logs the-draw-redis
```

**Port Already in Use**

```bash
# Find process using port
lsof -i :3000
# Kill process
kill -9 <PID>
```

**Docker Build Issues**

```bash
# Clean Docker cache
docker system prune -a
# Rebuild without cache
docker-compose build --no-cache
```

**Frontend Build Failures**

```bash
# Clear Next.js cache
rm -rf .next
# Reinstall dependencies
yarn install --force
```

### Development Tips

- Use `yarn dev` for hot reloading during development
- Check browser console for frontend errors
- Monitor backend logs for API issues
- Use Redis CLI to inspect data: `redis-cli monitor`
- Traefik dashboard shows routing and service health

## 📞 Support

For issues, questions, or contributions, please open an issue in the GitHub
repository.
