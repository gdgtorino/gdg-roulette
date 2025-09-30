# Event Management System

A complete Next.js application for managing events with user registration and random winner drawing. Built with TypeScript, Prisma, PostgreSQL, Redis, and DaisyUI.

## Features

### Admin Features

- **Authentication**: JWT-based login system
- **Event Management**: Create, edit, delete events with status transitions
- **Drawing System**: Cryptographically secure random winner selection
- **Real-time Monitoring**: View participants as they register
- **QR Code Generation**: Fullscreen QR codes for easy registration
- **Admin Management**: Create and manage multiple admin accounts

### User Features

- **Easy Registration**: Register with just a name via QR code or link
- **Status Tracking**: Real-time event status updates (polling every 3s)
- **Winner Notification**: Confetti animation for winners
- **Cancel Registration**: Users can cancel while registration is open

### Technical Features

- **TypeScript**: Strict mode, no `any` types
- **Server Components**: React Server Components by default
- **Theme System**: Light/dark mode with OS detection
- **Database**: PostgreSQL with Prisma ORM
- **Redis**: Ready for WebSocket scaling
- **Docker**: Complete Docker Compose setup
- **Production Ready**: Optimized multi-stage Dockerfile

## Quick Start

### Prerequisites

- Node.js 22 LTS
- Docker and Docker Compose

### Installation

1. **Clone and setup**:

   ```bash
   npm install
   cp .env.example .env
   ```

2. **Start services**:

   ```bash
   docker-compose up -d postgres redis
   ```

3. **Run migrations and seed**:

   ```bash
   npm run db:migrate
   npm run db:seed
   ```

4. **Start development server**:

   ```bash
   npm run dev
   ```

5. **Access the application**:
   - Admin: <http://localhost:3004/admin/login>
   - Default credentials: `admin` / `password`

## Project Structure

```
├── app/
│   ├── admin/(dashboard)/    # Protected admin routes
│   │   ├── events/           # Event management
│   │   └── admins/           # Admin management
│   ├── admin/(auth)/         # Public admin routes
│   │   └── login/            # Login page
│   ├── events/[id]/          # Public user routes
│   │   ├── register/         # Registration page
│   │   └── status/           # Status/waiting page
│   └── api/                  # API routes
├── components/               # React components
├── lib/                      # Utilities
│   ├── auth/                 # JWT & middleware
│   └── db/                   # Prisma client
├── prisma/                   # Database schema & migrations
└── types/                    # TypeScript types
```

## Usage Guide

### Admin Workflow

1. **Login**: Navigate to `/admin/login`
2. **Create Event**: Click "create event" button
3. **Open Registration**: Change status to "REGISTRATION_OPEN"
4. **Share QR Code**: Use fullscreen QR or copy link
5. **Close Registration**: Change status to "REGISTRATION_CLOSED"
6. **Start Drawing**: Change status to "DRAWING"
7. **Draw Winners**: Click "draw next winner" for each winner
8. **Close Event**: Click "close event" when done

### User Workflow

1. **Register**: Scan QR code or open registration link
2. **Wait**: View real-time status updates
3. **Result**: See confetti if you win!

## Event Status Flow

```
INIT → REGISTRATION_OPEN → REGISTRATION_CLOSED → DRAWING → CLOSED
              ↑_________________↓
              (bidirectional)
```

## API Routes

### Admin Routes (Protected)

- `POST /api/admin/login` - Admin login
- `POST /api/admin/logout` - Admin logout
- `GET /api/admin/me` - Get current admin
- `GET /api/admin/events` - List all events
- `POST /api/admin/events` - Create event
- `GET /api/admin/events/[id]` - Get event details
- `PUT /api/admin/events/[id]` - Update event
- `DELETE /api/admin/events/[id]` - Delete event
- `POST /api/admin/events/[id]/status` - Update status
- `POST /api/admin/events/[id]/draw` - Draw winner
- `DELETE /api/admin/events/[id]/participants/[participantId]` - Remove participant

### Public Routes

- `GET /api/events/[id]` - Get event info
- `POST /api/events/[id]/register` - Register participant
- `DELETE /api/events/[id]/register/[participantId]` - Cancel registration
- `GET /api/events/[id]/status/[participantId]` - Get participant status

## Environment Variables

```env
# Database
DATABASE_URL=postgresql://eventuser:eventpass@localhost:5433/event_management

# Redis
REDIS_URL=redis://localhost:6380

# JWT
JWT_SECRET=your-secure-secret-key-here
JWT_EXPIRES_IN=7d

# Next.js
NEXT_PUBLIC_BASE_URL=http://localhost:3004
```

## Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run format       # Format code with Prettier
npm run type-check   # TypeScript type checking
npm run db:migrate   # Run Prisma migrations
npm run db:seed      # Seed default admin
npm run db:studio    # Open Prisma Studio
```

## Docker Commands

```bash
# Start all services
docker-compose up -d

# Start only database and redis
docker-compose up -d postgres redis

# Stop all services
docker-compose down

# View logs
docker-compose logs -f

# Rebuild containers
docker-compose up -d --build
```

## Production Deployment

1. **Build the application**:

   ```bash
   npm run build
   ```

2. **Set environment variables**:
   - Generate secure JWT_SECRET: `openssl rand -base64 32`
   - Update DATABASE_URL for production
   - Set NEXT_PUBLIC_BASE_URL to your domain

3. **Deploy with Docker**:

   ```bash
   docker-compose up -d
   ```

4. **Run migrations**:

   ```bash
   docker-compose exec app npx prisma migrate deploy
   docker-compose exec app npx prisma db seed
   ```

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript 5 (strict mode)
- **Database**: PostgreSQL 16
- **ORM**: Prisma 6
- **Cache**: Redis 7
- **Authentication**: JWT with httpOnly cookies
- **Styling**: Tailwind CSS + DaisyUI
- **Validation**: Zod
- **QR Codes**: qrcode.react
- **Confetti**: canvas-confetti

## Code Standards

- **No `any` types**: All TypeScript is strictly typed
- **Comments**: English, lowercase, brief
- **Commits**: Lowercase conventional commits (feat/fix/chore)
- **Server Components**: Used by default, client components only when needed

