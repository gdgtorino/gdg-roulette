# Express to Next.js API Migration

This document outlines the migration of the Express backend to Next.js API routes for The Draw lottery system.

## Migration Overview

The Express backend has been successfully migrated to Next.js App Router API routes with the following improvements:

### ✅ Completed Features

1. **API Routes Migration**
   - All Express routes converted to Next.js App Router API routes
   - Maintained full API compatibility
   - RESTful endpoints preserved with same functionality

2. **tRPC Integration**
   - Type-safe API layer with tRPC
   - Client and server components
   - Authentication middleware integration

3. **NextAuth.js Setup**
   - JWT-based authentication
   - Prisma adapter integration
   - Custom credential provider for admin login

4. **Next.js Middleware**
   - CORS configuration
   - Security headers (replacing Helmet)
   - Authentication validation

5. **Server Actions**
   - Form handling with Server Actions
   - Type-safe form submissions
   - Server-side validation

6. **Swagger Documentation**
   - API documentation (development only)
   - Interactive Swagger UI
   - Automatic OpenAPI spec generation

7. **Streaming Support**
   - Streaming API endpoints
   - NDJSON responses for large datasets
   - Efficient data transfer

8. **Server-Sent Events**
   - Real-time updates replacing WebSocket
   - Event-based notifications
   - Participant registration updates
   - Winner draw notifications

## Architecture Changes

### Before (Express)
```
apps/backend/
├── src/
│   ├── index.ts (Express server)
│   ├── routes/ (Express routes)
│   ├── middleware/ (Express middleware)
│   └── services/ (Redis service)
```

### After (Next.js)
```
apps/frontend/
├── src/
│   ├── app/api/ (Next.js API routes)
│   ├── lib/ (Shared utilities)
│   │   ├── trpc/ (tRPC configuration)
│   │   ├── actions/ (Server Actions)
│   │   └── auth-config.ts (NextAuth)
│   └── middleware.ts (Next.js middleware)
```

## API Endpoints

All original API endpoints are preserved:

### Authentication
- `POST /api/auth/login` - Admin login
- `GET|POST /api/auth/[...nextauth]` - NextAuth endpoints

### Admin Management
- `GET /api/admin` - List admins
- `POST /api/admin` - Create admin
- `DELETE /api/admin/[username]` - Delete admin

### Event Management
- `GET /api/events` - List events (protected)
- `POST /api/events` - Create event (protected)
- `GET /api/events/[eventId]` - Get event details
- `DELETE /api/events/[eventId]` - Delete event (protected)
- `PATCH /api/events/[eventId]/registration` - Toggle registration (protected)
- `PATCH /api/events/[eventId]/close` - Close event (protected)

### Participant Management
- `GET /api/events/[eventId]/participants` - List participants (protected)
- `POST /api/events/[eventId]/participants` - Register participant
- `GET /api/events/[eventId]/participants/[participantId]` - Get participant
- `GET /api/events/[eventId]/participants/[participantId]/winner` - Check if winner

### Lottery Operations
- `POST /api/events/[eventId]/draw` - Draw winner (protected)
- `GET /api/events/[eventId]/winners` - List winners (protected)

### Real-time Features
- `GET /api/events/[eventId]/stream` - Server-Sent Events
- `GET /api/events/[eventId]/participants/stream` - Streaming participants
- `GET /api/events/[eventId]/winners/stream` - Streaming winners

### Utility Endpoints
- `GET /api/health` - Health check
- `GET /api/docs` - API documentation (development only)
- `GET /api/events/[eventId]/check-name/[name]` - Check name availability
- `GET /api/events/[eventId]/find-participant/[name]` - Find participant by name

## tRPC Endpoints

Type-safe API with tRPC:

```typescript
// Authentication
trpc.auth.login.mutate({ username, password })

// Admin operations
trpc.admin.getAll.query()
trpc.admin.create.mutate({ username, password })
trpc.admin.delete.mutate({ username })

// Event operations
trpc.events.getAll.query()
trpc.events.create.mutate({ name })
trpc.events.getById.query({ eventId })
trpc.events.delete.mutate({ eventId })
trpc.events.toggleRegistration.mutate({ eventId })
trpc.events.close.mutate({ eventId })

// Participant operations
trpc.events.registerParticipant.mutate({ eventId, name })
trpc.events.getParticipants.query({ eventId })
trpc.events.drawWinner.mutate({ eventId })
trpc.events.getWinners.query({ eventId })

// Utility operations
trpc.events.checkNameAvailability.query({ eventId, name })
trpc.events.findParticipant.query({ eventId, name })
trpc.events.checkWinner.query({ eventId, participantId })
```

## Server Actions

Form handling with Server Actions:

```typescript
// Authentication actions
import { loginAction, createAdminAction, deleteAdminAction } from '@/lib/actions/auth'

// Event actions
import {
  createEventAction,
  registerParticipantAction,
  toggleEventRegistrationAction,
  closeEventAction,
  drawWinnerAction,
  deleteEventAction
} from '@/lib/actions/events'
```

## Real-time Updates

Server-Sent Events for real-time functionality:

```typescript
// Client-side hook
import { useEventStream } from '@/lib/sse'

useEventStream(eventId, (data) => {
  switch (data.type) {
    case 'participantRegistered':
      // Handle new participant
      break
    case 'registrationToggled':
      // Handle registration toggle
      break
    case 'eventClosed':
      // Handle event closure
      break
    case 'winnerDrawn':
      // Handle winner draw
      break
  }
})
```

## Database Support

Dual database support:
- **Redis**: For fast data access (legacy support)
- **Prisma + SQLite**: For structured data with relationships

```typescript
// Redis service (legacy)
import { redisService } from '@/lib/redis'

// Database service (new)
import { databaseService } from '@/lib/database'
```

## Environment Variables

```env
# Database
DATABASE_URL="file:./dev.db"
REDIS_URL="redis://localhost:6379"

# Authentication
JWT_SECRET="your-secret-key"
NEXTAUTH_SECRET="your-nextauth-secret"
NEXTAUTH_URL="http://localhost:3000"

# CORS
CORS_ORIGIN="http://localhost:3000"

# Default Admin
DEFAULT_ADMIN_USERNAME="admin"
DEFAULT_ADMIN_PASSWORD="admin123"
```

## Development

1. **Install dependencies**:
   ```bash
   cd apps/frontend
   npm install
   ```

2. **Setup database**:
   ```bash
   npx prisma generate
   npx prisma db push
   ```

3. **Initialize default admin**:
   ```bash
   npx tsx src/scripts/init-db.ts
   ```

4. **Start development server**:
   ```bash
   npm run dev
   ```

5. **View API documentation** (development only):
   - Visit `http://localhost:3000/docs`

## Migration Benefits

1. **Type Safety**: Full TypeScript support with tRPC
2. **Modern Architecture**: Next.js App Router with latest features
3. **Better Performance**: Server Actions and streaming responses
4. **Enhanced Security**: NextAuth.js integration and middleware
5. **Real-time Updates**: Server-Sent Events instead of WebSocket
6. **Better DX**: Integrated development experience
7. **Documentation**: Auto-generated API docs with Swagger
8. **Scalability**: Support for both Redis and SQL databases

## Backward Compatibility

All existing API endpoints remain functional, ensuring seamless migration for existing clients. The Express backend can be gradually deprecated as clients migrate to the new Next.js API.