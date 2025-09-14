# Database Documentation

This document describes the PostgreSQL database schema and utilities for the Event Management System.

## Schema Overview

The database consists of six main models designed to handle lottery/raffle events efficiently:

### Models

#### Admin
- **Purpose**: System administrators and operators
- **Fields**: id, username, password, permissions, timestamps
- **Permissions**: ADMIN, OPERATOR, VIEWER
- **Relations**: Has many Events and Sessions

#### Event
- **Purpose**: Lottery/raffle events
- **Fields**: id, name, state, maxParticipants, registrationLink, qrCode, timestamps
- **States**: INIT, REGISTRATION, DRAW, CLOSED
- **Relations**: Belongs to Admin, has many Participants and Winners

#### Participant
- **Purpose**: Event participants/entrants
- **Fields**: id, name, eventId, userId, registeredAt
- **Relations**: Belongs to Event, may have one Winner

#### Winner
- **Purpose**: Drawn winners from events
- **Fields**: id, participantId, eventId, position, drawnAt
- **Relations**: Belongs to Event and Participant

#### Session
- **Purpose**: Authentication session management
- **Fields**: id, userId, token, expiresAt, timestamps
- **Relations**: Belongs to Admin

#### Cache
- **Purpose**: Application-level caching
- **Fields**: id, key, value, expiresAt, timestamps
- **Usage**: System configuration and performance optimization

## Event States

Events progress through four distinct states:

1. **INIT**: Event created but not yet open for registration
2. **REGISTRATION**: Event open for participant registration
3. **DRAW**: Winners have been drawn, event concluded
4. **CLOSED**: Event completely finished and archived

## Database Utilities

### Connection Management
- Singleton Prisma client with connection pooling
- Health check utilities
- Graceful shutdown handling
- Transaction support with retry logic

### Event Management
```typescript
import { eventManager } from './lib/db-utils';

// Create new event
const event = await eventManager.create('Summer Raffle', adminId, 100);

// Update event state
await eventManager.updateState(eventId, EventState.REGISTRATION);

// Generate registration link
const link = await eventManager.generateRegistrationLink(eventId, baseUrl);
```

### Participant Management
```typescript
import { participantManager } from './lib/db-utils';

// Register participant
const participant = await participantManager.register(eventId, 'John Doe', userId);

// Get event participants
const participants = await participantManager.getByEvent(eventId);
```

### Winner Management
```typescript
import { winnerManager } from './lib/db-utils';

// Draw winners
const winners = await winnerManager.drawWinners(eventId, 3);

// Get event winners
const winners = await winnerManager.getByEvent(eventId);
```

## Environment Configuration

### Development
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/the_draw_dev
DATABASE_DIRECT_URL=postgresql://postgres:postgres@localhost:5432/the_draw_dev
DATABASE_POOL_MIN=5
DATABASE_POOL_MAX=20
DATABASE_SSL=false
```

### Production
```env
DATABASE_URL=postgresql://username:password@host:port/the_draw_prod
DATABASE_DIRECT_URL=postgresql://username:password@host:port/the_draw_prod
DATABASE_POOL_MIN=10
DATABASE_POOL_MAX=50
DATABASE_SSL=true
```

## Available Scripts

### Basic Operations
```bash
# Generate Prisma client
npm run db:generate

# Push schema changes
npm run db:push

# Create and run migrations
npm run db:migrate

# Reset database
npm run db:migrate:reset
```

### Database Utilities
```bash
# Test database connection
npm run db:test

# Setup database (validate + seed + stats)
npm run db:setup

# Reset and seed database
npm run db:reset

# Validate database schema
npm run db:validate

# Show database statistics
npm run db:stats

# Run seed data
npm run db:seed

# Open Prisma Studio
npm run db:studio
```

## Migration Workflow

### Development
1. Modify `prisma/schema.prisma`
2. Run `npm run db:migrate` to create and apply migration
3. Run `npm run db:seed` to populate with test data

### Production
1. Run `npm run db:migrate:deploy` to apply pending migrations
2. Run `npm run db:validate` to ensure schema integrity

## Seed Data

The seed script creates:
- 3 admin accounts (admin, operator, viewer) with different permission levels
- 4 sample events in different states (INIT, REGISTRATION, DRAW, CLOSED)
- 35 sample participants across events
- 8 winners for completed events
- Cache entries for system configuration
- Sample sessions for testing

### Default Accounts
- **admin/admin**: Full admin privileges
- **operator/operator123**: Event management privileges
- **viewer/viewer123**: Read-only access

## Performance Considerations

### Indexing
- Primary keys on all tables
- Unique indexes on username, token fields
- Compound indexes on frequently queried combinations
- Event state and timestamp indexes for filtering

### Connection Pooling
- Configurable min/max connections
- Timeout settings for long-running queries
- Automatic connection cleanup

### Caching
- Database-level cache table for application data
- Automatic cache expiration and cleanup
- Session storage with TTL

## Security Features

### Authentication
- Bcrypt password hashing with salt rounds
- JWT token-based session management
- Session expiration and cleanup

### Authorization
- Role-based permissions (ADMIN, OPERATOR, VIEWER)
- Resource-level access control
- Audit trail through timestamps

### Data Protection
- SSL connections in production
- Input validation through Zod schemas
- SQL injection protection via Prisma

## Backup and Recovery

### Recommended Backup Strategy
1. Daily full database backups
2. Continuous WAL archiving
3. Point-in-time recovery capability
4. Regular backup testing

### Data Export
```bash
# Export events data
npx prisma studio # Use UI to export
# or use pg_dump for full database backup
```

## Troubleshooting

### Common Issues

#### Connection Problems
```bash
npm run db:test  # Test connection
```

#### Schema Sync Issues
```bash
npm run db:validate  # Check schema
npm run db:push      # Sync without migration
```

#### Performance Issues
```bash
npm run db:stats     # Check table sizes
# Review slow query logs
# Analyze query plans
```

### Error Recovery
- Connection failures: Automatic retry with exponential backoff
- Transaction conflicts: Built-in retry logic
- Schema mismatches: Validation utilities

## Development Tips

1. Always run migrations in development before production
2. Use transactions for complex multi-table operations
3. Monitor connection pool usage in production
4. Regular cache cleanup to prevent storage bloat
5. Index optimization based on query patterns