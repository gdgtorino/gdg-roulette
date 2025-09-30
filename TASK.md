# Event Management System - Task Documentation

## Project Overview

A Next.js application for managing events with user registration and random winner drawing. The system supports multiple admins managing events and users registering to participate in drawings.

---

## Development Task Checklist

Use this checklist to track progress. Mark tasks as complete by changing `- [ ]` to `- [x]`.

### Phase 1: Project Setup
- [x] Initialize Next.js project with TypeScript and App Router
- [x] Configure ESLint with strict rules (no `any` types)
- [x] Configure Prettier
- [x] Install and configure Tailwind CSS
- [x] Install and configure DaisyUI
- [x] Set up theme system (light/dark mode with OS detection)
- [x] Create theme toggle component (client component)
- [x] Set up Docker Compose with PostgreSQL and Redis services
- [x] Create Dockerfile with multi-stage build
- [x] Set up environment variables (.env.example and .env)
- [x] Initialize Prisma with PostgreSQL
- [x] Create initial database schema (Admin, Event, Participant, Winner models)
- [x] Run initial migration
- [x] Create seed script for default admin account
- [x] Set up folder structure (components, lib, types, hooks, app structure)

### Phase 2: Authentication & Admin Management
- [x] Implement JWT utility functions (sign, verify, hash password)
- [x] Create admin login page (`/admin/login`)
- [x] Implement login API route (`POST /api/admin/login`)
- [x] Implement logout API route (`POST /api/admin/logout`)
- [x] Create authentication middleware for protected routes
- [x] Implement "get current admin" API route (`GET /api/admin/me`)
- [x] Create admin CRUD API routes (`GET, POST, PUT, DELETE /api/admin/admins`)
- [x] Create admin management UI (list, create, edit, delete, set password)
- [x] Add confirmation dialogs for destructive actions

### Phase 3: Internationalization (i18n)
- [ ] Install and configure next-intl or similar i18n library
- [ ] Create translation files for Italian (default)
- [ ] Create translation files for English
- [ ] Implement language switcher component
- [ ] Add translations for all static text
- [ ] Add translations for event statuses
- [ ] Add translations for error messages
- [ ] Add translations for success messages

### Phase 4: Event Management (Admin)
- [x] Create admin dashboard layout with navigation
- [x] Implement events list API route (`GET /api/admin/events`)
- [x] Create admin events dashboard (grouped by status)
- [x] Implement create event API route (`POST /api/admin/events`)
- [x] Create event creation form/modal
- [x] Implement update event API route (`PUT /api/admin/events/[id]`)
- [ ] Create event edit form (only for INIT status)
- [x] Implement delete event API route (`DELETE /api/admin/events/[id]`)
- [ ] Add event deletion with confirmation
- [x] Implement event status transition API (`POST /api/admin/events/[id]/status`)
- [ ] Add status transition buttons with validation
- [x] Create event statistics component (participants, winners, etc.)
- [ ] Add event search/filter functionality

### Phase 5: Event Detail & Participant Management (Admin)
- [x] Create event detail page layout (`/admin/events/[id]`)
- [x] Implement get event details API (`GET /api/admin/events/[id]`)
- [x] Implement get participants API (`GET /api/admin/events/[id]/participants`)
- [x] Create participants list component with real-time updates
- [x] Implement remove participant API (`DELETE /api/admin/events/[id]/participants/[participantId]`)
- [x] Add remove participant button with confirmation
- [x] Create QR code generation component
- [x] Implement QR code fullscreen mode (modal or separate page)
- [x] Add "Copy registration link" button

### Phase 6: Drawing System (Admin)
- [x] Implement draw winner API route (`POST /api/admin/events/[id]/draw`)
- [x] Create secure random selection algorithm (crypto.randomInt)
- [x] Implement get winners API route (`GET /api/admin/events/[id]/winners`)
- [x] Create drawing interface UI
- [x] Add "Draw Next Winner" button
- [x] Add "Close Event" button
- [x] Display winners list with draw order
- [x] Add visual feedback for drawing process
- [x] Implement winner exclusion logic (already drawn)

### Phase 7: WebSocket Real-time Updates
- [ ] Set up WebSocket server (Socket.io or similar)
- [ ] Configure Redis adapter for Socket.io (if using Socket.io)
- [ ] Create WebSocket connection utility
- [ ] Implement admin event channel for live registrations
- [ ] Implement admin drawing channel for live winner updates
- [ ] Implement user status channel for event updates
- [ ] Add WebSocket event handlers (new participant, status change, winner drawn)
- [ ] Test real-time updates across multiple clients
- [ ] Add reconnection logic for WebSocket

### Phase 8: User Registration Flow
- [x] Create public event info API route (`GET /api/events/[id]`)
- [x] Create registration page (`/events/[id]/register`)
- [x] Implement register participant API (`POST /api/events/[id]/register`)
- [x] Add unique name validation within event
- [x] Add localStorage check for existing registration
- [x] Create registration form with validation
- [x] Add success message and redirect logic
- [x] Implement cancel registration API (`DELETE /api/events/[id]/register/[participantId]`)
- [x] Add cancel registration button

### Phase 9: User Waiting & Status Page
- [x] Create user status page (`/events/[id]/status`)
- [x] Implement get participant status API (`GET /api/events/[id]/status/[participantId]`)
- [x] Add localStorage registration ID handling
- [x] Create status display component (waiting, drawing, result)
- [ ] Add WebSocket connection for real-time updates
- [x] Implement confetti animation for winners (canvas-confetti or react-confetti)
- [x] Add loading animation for drawing state
- [x] Display final results (winner/not winner) with statistics

### Phase 10: UI/UX Polish
- [ ] Verify DaisyUI themes work correctly (light/dark)
- [ ] Test theme toggle functionality
- [ ] Verify no theme flash on page load
- [ ] Test OS theme detection
- [ ] Create consistent color scheme using DaisyUI semantic colors
- [ ] Style admin dashboard with DaisyUI cards and badges (color-coded by status)
- [ ] Add loading states using DaisyUI loading component for all async operations
- [ ] Implement toast notifications with DaisyUI alert styling
- [ ] Add skeleton loaders for data fetching
- [ ] Ensure responsive design (mobile, tablet, desktop)
- [ ] Add hover states and transitions to interactive elements
- [ ] Implement focus states for accessibility
- [ ] Add proper ARIA labels for screen readers
- [ ] Test keyboard navigation across all pages
- [ ] Verify color contrast meets WCAG standards in both themes
- [ ] Test all DaisyUI components in both light and dark modes

### Phase 11: Security & Validation
- [ ] Implement input validation on all API routes (Zod or similar)
- [ ] Add CSRF protection (verify Next.js built-in protection)
- [ ] Test SQL injection prevention (Prisma parameterized queries)
- [ ] Test XSS prevention (React escaping)
- [ ] Add rate limiting on login endpoint (optional but recommended)
- [ ] Implement proper error handling (no sensitive data exposure)
- [ ] Add API route middleware for authentication checks
- [ ] Test JWT expiration and refresh logic
- [ ] Verify password hashing (bcrypt salt rounds = 10)

### Phase 12: Testing
- [ ] Write unit tests for utility functions
- [ ] Write unit tests for API route handlers
- [ ] Write integration tests for authentication flow
- [ ] Write integration tests for event management
- [ ] Write integration tests for registration and drawing
- [ ] Test WebSocket connections and events
- [ ] Test i18n language switching
- [ ] Perform manual E2E testing of critical flows
- [ ] Test on different browsers (Chrome, Firefox, Safari)
- [ ] Test on mobile devices

### Phase 13: Docker & Deployment
- [ ] Test Docker Compose setup locally
- [ ] Verify all services start correctly with health checks
- [ ] Test database migrations in Docker environment
- [ ] Verify seed script creates default admin
- [ ] Test application in production mode (`npm run build && npm start`)
- [ ] Optimize Docker image size (multi-stage build)
- [ ] Configure restart policies for services
- [ ] Set up logging (stdout/stderr)
- [ ] Document deployment process
- [ ] Create production environment variables template

### Phase 14: Documentation & Final Touches
- [ ] Write README.md with setup instructions
- [ ] Document API endpoints (optional: generate with Swagger/OpenAPI)
- [ ] Add code comments where necessary (English, lowercase, brief)
- [ ] Create user guide for admins (optional)
- [ ] Create user guide for participants (optional)
- [ ] Add license file
- [ ] Add contributing guidelines (if open source)
- [ ] Final code review and cleanup
- [ ] Run final lint and format pass
- [ ] Verify no TypeScript `any` types exist in codebase

### Phase 15: Optional Enhancements (Post-MVP)
- [ ] Add email notifications for winners
- [ ] Implement export functionality (CSV/Excel)
- [ ] Create event templates
- [ ] Add bulk user import
- [ ] Build analytics dashboard
- [ ] Implement multi-factor authentication for admins
- [ ] Add API rate limiting
- [ ] Create admin activity audit log
- [ ] Add event scheduling (auto-open/close)
- [ ] Create public event listing page

---

## Technology Stack

### Core Technologies
- **Framework**: Next.js (latest stable version with App Router)
- **Language**: TypeScript (strict mode, no `any` types allowed)
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: JWT-based authentication
- **Real-time Updates**: WebSocket (Socket.io or similar)
- **Deployment**: Docker + Docker Compose
- **React Paradigm**: **Use React Server Components (RSC) wherever possible**
  - Leverage server components for data fetching
  - Use client components only when needed (interactivity, hooks, browser APIs)
  - Mark client components with `'use client'` directive

### UI/Styling
- **CSS Framework**: Tailwind CSS
- **Component Library**: DaisyUI
- **Theme System**: Light and Dark mode
  - Auto-detect OS preference
  - Manual theme toggle (persisted in localStorage)
  - Seamless theme switching without flash

### Code Quality Tools
- **Linting**: ESLint (strict configuration)
- **Formatting**: Prettier
- **Type Checking**: TypeScript strict mode

### Internationalization
- **Languages**: Italian (default) and English
- **Library**: next-intl or similar i18n solution
- All UI text must be translatable

---

## Database Schema

### Users (Admins)
```prisma
model Admin {
  id        String   @id @default(cuid())
  username  String   @unique
  password  String   // hashed with bcrypt
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### Events
```prisma
model Event {
  id          String      @id @default(cuid())
  name        String      @unique
  description String?
  status      EventStatus @default(INIT)
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
  participants Participant[]
  winners     Winner[]
}

enum EventStatus {
  INIT
  REGISTRATION_OPEN
  REGISTRATION_CLOSED
  DRAWING
  CLOSED
}
```

### Participants
```prisma
model Participant {
  id           String   @id @default(cuid())
  name         String
  eventId      String
  event        Event    @relation(fields: [eventId], references: [id], onDelete: Cascade)
  registeredAt DateTime @default(now())
  isWinner     Boolean  @default(false)
  
  @@unique([eventId, name])
}
```

### Winners
```prisma
model Winner {
  id             String      @id @default(cuid())
  participantId  String      @unique
  participant    Participant @relation(fields: [participantId], references: [id], onDelete: Cascade)
  eventId        String
  event          Event       @relation(fields: [eventId], references: [id], onDelete: Cascade)
  drawnAt        DateTime    @default(now())
  drawOrder      Int         // order in which they were drawn
}
```

---

## User Roles & Permissions

### Admin Users
**Default Admin Account:**
- Username: `admin`
- Password: `password`

**Capabilities:**
- Create, read, update, delete other admin accounts
- Set/reset admin passwords
- Create events (CRUD operations)
- Manage event status transitions
- View live participant registrations
- Perform winner drawings
- View event statistics
- Delete events permanently (removes from database)
- Remove participants manually

### Regular Users (Event Participants)
**Capabilities:**
- Register for events with a unique name (unique within the event scope)
- View registration status
- Wait for drawing results
- See if they won or lost after drawing

**Limitations:**
- No authentication required
- Identified by registration ID stored in localStorage
- Can register for multiple events simultaneously
- Cannot register twice for the same event (prevented via localStorage registration ID)

---

## Event Status Flow

### Status Transitions (Admin-controlled)

```
INIT → REGISTRATION_OPEN → REGISTRATION_CLOSED → DRAWING → CLOSED
                    ↑________________↓
                    (bidirectional)
```

**Allowed Transitions:**
1. `INIT` → `REGISTRATION_OPEN`: Event goes live, users can register
2. `REGISTRATION_OPEN` → `REGISTRATION_CLOSED`: Stop accepting registrations
3. `REGISTRATION_CLOSED` → `REGISTRATION_OPEN`: Reopen registrations (bidirectional)
4. `REGISTRATION_CLOSED` → `DRAWING`: Begin drawing process
5. `DRAWING` → `CLOSED`: Finalize event (permanent)

**Constraints:**
- Events in `REGISTRATION_OPEN`, `REGISTRATION_CLOSED`, `DRAWING`, or `CLOSED` states are locked (immutable name/description)
- Only events in `INIT` state can be edited

---

## Feature Requirements

### 1. Admin Panel

#### Admin Management (CRUD)
- List all admins with creation date
- Create new admin with username and password
- Edit admin username
- Set/reset admin password
- Delete admin (with confirmation)
- Cannot delete self

#### Event Management Dashboard
- Display events grouped by status
- Show event statistics per event:
  - Total participants
  - Total winners drawn
  - Registration rate over time (optional chart)
  - Current status
- Create new event (name + optional description)
- Edit event details (only in `INIT` state)
- Delete event permanently (with confirmation)
- Transition event status (with validation)

#### Event Detail Page (Admin View)
When event is in `REGISTRATION_OPEN`:
- Display QR code with registration link
- **QR Code Fullscreen Mode**: Button to display QR code fullscreen for easy scanning
- Live participant list (real-time updates via WebSocket)
- Show participant count
- Button to transition to next status

When event is in `REGISTRATION_CLOSED` or `DRAWING`:
- Full participant list
- Button to start/continue drawing
- Button to transition to `CLOSED`

When event is in `DRAWING`:
- Drawing interface:
  - Button: "Draw Next Winner" (extracts 1 random winner)
  - Button: "Close Event" (finalize and transition to `CLOSED`)
  - Display already drawn winners in order
  - Automatically remove drawn winners from pool
  - Maximum winners = total participants
- Real-time updates for all connected clients

When event is in `CLOSED`:
- Read-only view
- Final participant list
- Final winner list
- Event statistics

#### Drawing Algorithm
- Use cryptographically secure random selection (e.g., `crypto.randomInt()`)
- Each draw selects 1 winner from remaining participants
- Already drawn winners are excluded from subsequent draws
- Admin can draw multiple times until satisfied or all participants are drawn
- Admin can close event at any time during drawing

### 2. User Registration Flow

#### Registration Page (`/events/[eventId]/register`)
- Accessible via direct link or QR code
- Display event name and description
- Registration form:
  - Name input (required, unique within event)
  - Submit button
- Validation:
  - Name must be unique within the event
  - Check localStorage for existing registration ID for this event
  - If already registered, redirect to waiting page

#### Post-Registration Waiting Page (`/events/[eventId]/status`)
- Automatically navigate here after successful registration
- Store registration ID in localStorage: `event_${eventId}_registrationId`
- Real-time status updates via WebSocket

**Display by Event Status:**
- `REGISTRATION_OPEN` or `REGISTRATION_CLOSED`: 
  - Show "Waiting for drawing" message (translated)
  - Display participant count (optional)
  
- `DRAWING`:
  - Show "Drawing in progress..." message (translated)
  - Loading animation
  
- `CLOSED`:
  - **Winner**: Display "You won! 🎉" with confetti animation
  - **Not Winner**: Display "You didn't win this time" (translated)
  - Show total winners and participants

#### User Cancellation
- Users can cancel their registration while event is in `REGISTRATION_OPEN`
- Button on waiting page: "Cancel Registration"
- Removes participant from database
- Clears localStorage registration ID

### 3. Real-time Features (WebSocket)

**Admin Channels:**
- `/admin/events/[eventId]`: Live participant registrations
- `/admin/events/[eventId]/drawing`: Live drawing updates

**User Channels:**
- `/events/[eventId]/status`: Event status changes and drawing results

**Events to Broadcast:**
- New participant registration
- Participant cancellation/removal
- Event status change
- Winner drawn
- Event closed

### 4. QR Code Generation

**Requirements:**
- Generate QR code for registration URL: `{baseUrl}/events/{eventId}/register`
- Display QR code on admin event detail page when status is `REGISTRATION_OPEN`
- QR code should be scannable from mobile devices
- **Fullscreen mode**: Button to display QR code fullscreen for projection/display
- Library suggestion: `qrcode` or `qrcode.react`

### 5. Internationalization (i18n)

**Supported Languages:**
- Italian (default locale)
- English

**Translation Scope:**
- All UI text (buttons, labels, messages, errors)
- Event status names
- Success/error notifications
- Email/notification templates (if any)

**Implementation:**
- Use `next-intl` or similar
- Language switcher in header
- Store language preference in localStorage or cookie
- Server-side and client-side translations

### 6. Authentication & Authorization

**Admin Authentication:**
- JWT-based authentication
- Token stored in httpOnly cookie
- Token expiration: 7 days (configurable)
- Refresh token mechanism (optional but recommended)
- Protected API routes with middleware
- Login page at `/admin/login`
- Logout functionality

**User Authentication:**
- No authentication required
- Identification via registration ID in localStorage
- Registration ID format: `event_${eventId}_registrationId` → `participantId`

---

## API Routes

### Admin Authentication
- `POST /api/admin/login`: Admin login (returns JWT)
- `POST /api/admin/logout`: Admin logout (clears cookie)
- `GET /api/admin/me`: Get current admin info (protected)

### Admin Management
- `GET /api/admin/admins`: List all admins (protected)
- `POST /api/admin/admins`: Create admin (protected)
- `PUT /api/admin/admins/[id]`: Update admin (protected)
- `DELETE /api/admin/admins/[id]`: Delete admin (protected)
- `POST /api/admin/admins/[id]/password`: Set admin password (protected)

### Event Management
- `GET /api/admin/events`: List all events (protected)
- `POST /api/admin/events`: Create event (protected)
- `GET /api/admin/events/[id]`: Get event details (protected)
- `PUT /api/admin/events/[id]`: Update event (protected, only in INIT)
- `DELETE /api/admin/events/[id]`: Delete event permanently (protected)
- `POST /api/admin/events/[id]/status`: Transition event status (protected)
- `GET /api/admin/events/[id]/participants`: List participants (protected)
- `DELETE /api/admin/events/[id]/participants/[participantId]`: Remove participant (protected)

### Drawing
- `POST /api/admin/events/[id]/draw`: Draw one random winner (protected)
- `GET /api/admin/events/[id]/winners`: List winners (protected)

### Public Event Routes
- `GET /api/events/[id]`: Get public event info (name, description, status)
- `POST /api/events/[id]/register`: Register participant (public)
- `DELETE /api/events/[id]/register/[participantId]`: Cancel registration (public)
- `GET /api/events/[id]/status/[participantId]`: Check participant status (public)

### WebSocket
- `WS /api/socket`: Main WebSocket connection

---

## UI/UX Requirements

### Admin Dashboard
- Responsive design (mobile-friendly)
- Use DaisyUI `card` components for event cards
- Event cards grouped by status
- Color-coded status badges (DaisyUI `badge` component):
  - INIT: `badge-neutral` (Gray)
  - REGISTRATION_OPEN: `badge-success` (Green)
  - REGISTRATION_CLOSED: `badge-warning` (Orange)
  - DRAWING: `badge-info` (Blue)
  - CLOSED: `badge-error` (Red)
- Search/filter events with DaisyUI `input` component
- Statistics overview using DaisyUI `stats` component
- Navigation with DaisyUI `navbar` component
- Theme toggle in header (sun/moon icon)

### Admin Event Detail Page
- Use DaisyUI `tabs` or `card` sections for different views
- QR code prominently displayed when registration is open
- **Fullscreen QR code button**: Opens DaisyUI `modal` with QR code at maximum size
- Participant list using DaisyUI `table` component with real-time updates
- Drawing interface with DaisyUI `btn` components (primary, secondary)
- Winner list with DaisyUI `badge` showing draw order
- Breadcrumb navigation (custom or DaisyUI `breadcrumbs`)
- Confirmation dialogs using DaisyUI `modal` component

### User Registration Page
- Clean, minimal design using DaisyUI `card`
- Large, accessible form with DaisyUI `form-control` and `input`
- Clear error messages using DaisyUI `alert` component
- Success confirmation before redirect with DaisyUI `alert alert-success`

### User Waiting Page
- Centered content in DaisyUI `card`
- Large status message with appropriate styling
- Confetti animation on win (use library like `react-confetti` or `canvas-confetti`)
- Loading animation using DaisyUI `loading` component during drawing
- Responsive design
- Status-specific styling:
  - Waiting: `alert-info`
  - Drawing: `loading loading-spinner loading-lg`
  - Winner: `alert-success` with confetti
  - Not winner: `alert-warning` or neutral message

### General UI/UX
- Consistent DaisyUI theme (light/dark)
- Loading states using DaisyUI `loading` component for all async operations
- Toast notifications using DaisyUI `alert` component (or react-hot-toast with DaisyUI styling)
- Confirmation dialogs using DaisyUI `modal` for destructive actions (delete, close event)
- Accessibility: proper ARIA labels, keyboard navigation, screen reader support
- Smooth transitions between themes (no flash)
- Mobile-first responsive design using DaisyUI responsive classes

---

## DaisyUI Components & Theme System

### DaisyUI Installation & Configuration

**Install dependencies:**
```bash
npm install daisyui@latest
# or
pnpm add daisyui@latest
```

**Tailwind Config (`tailwind.config.ts`):**
```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [require('daisyui')],
  daisyui: {
    themes: ['light', 'dark'],
    darkTheme: 'dark',
    base: true,
    styled: true,
    utils: true,
  },
};

export default config;
```

### Theme System Implementation

**Requirements:**
1. Auto-detect OS theme preference on first load
2. Allow manual theme toggle (light/dark)
3. Persist theme preference in localStorage
4. No theme flash on page load (SSR-safe)
5. Theme switcher accessible in header/navigation

**Implementation Pattern:**

**1. Theme Provider (Client Component)**
```typescript
// components/theme-provider.tsx
'use client';

import { useEffect, useState } from 'react';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // get saved theme or detect os preference
    const savedTheme = localStorage.getItem('theme');
    const osTheme = window.matchMedia('(prefers-color-scheme: dark)').matches 
      ? 'dark' 
      : 'light';
    
    const theme = savedTheme || osTheme;
    document.documentElement.setAttribute('data-theme', theme);
  }, []);

  if (!mounted) {
    return null; // prevent ssr mismatch
  }

  return <>{children}</>;
}
```

**2. Theme Toggle Component (Client Component)**
```typescript
// components/theme-toggle.tsx
'use client';

import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark';
    const osTheme = window.matchMedia('(prefers-color-scheme: dark)').matches 
      ? 'dark' 
      : 'light';
    
    setTheme(savedTheme || osTheme);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  return (
    <button
      onClick={toggleTheme}
      className="btn btn-ghost btn-circle"
      aria-label="toggle theme"
    >
      {theme === 'light' ? '🌙' : '☀️'}
    </button>
  );
}
```

**3. Root Layout Integration**
```typescript
// app/layout.tsx
import { ThemeProvider } from '@/components/theme-provider';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
```

**4. Prevent Theme Flash (Script in <head>)**
```typescript
// app/layout.tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const theme = localStorage.getItem('theme') || 
                  (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
                document.documentElement.setAttribute('data-theme', theme);
              })();
            `,
          }}
        />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
```

### DaisyUI Component Usage

**Recommended Components for this Project:**

**Admin Panel:**
- `navbar` - Top navigation with theme toggle
- `drawer` - Sidebar navigation (optional)
- `card` - Event cards in dashboard
- `badge` - Status badges (INIT, OPEN, CLOSED, etc.)
- `table` - Participant/admin lists
- `btn` - All buttons (primary, secondary, ghost, etc.)
- `modal` - Confirmation dialogs, event creation forms
- `dropdown` - Actions menu
- `alert` - Success/error messages
- `loading` - Loading spinners
- `stats` - Event statistics display
- `tabs` - Event detail sections
- `form-control`, `input`, `textarea` - Form elements

**User Pages:**
- `card` - Registration card
- `btn` - Submit/cancel buttons
- `input` - Name input field
- `loading` - Loading states
- `alert` - Success/error messages

**Examples:**

```typescript
// status badge
<div className="badge badge-success">REGISTRATION_OPEN</div>
<div className="badge badge-warning">REGISTRATION_CLOSED</div>
<div className="badge badge-error">CLOSED</div>

// event card
<div className="card bg-base-100 shadow-xl">
  <div className="card-body">
    <h2 className="card-title">Event Name</h2>
    <p>Event description...</p>
    <div className="card-actions justify-end">
      <button className="btn btn-primary">View</button>
    </div>
  </div>
</div>

// confirmation modal
<dialog id="delete_modal" className="modal">
  <div className="modal-box">
    <h3 className="font-bold text-lg">Confirm Delete</h3>
    <p className="py-4">Are you sure you want to delete this event?</p>
    <div className="modal-action">
      <button className="btn btn-error">Delete</button>
      <button className="btn">Cancel</button>
    </div>
  </div>
</dialog>

// toast notification (with react-hot-toast + daisyui styling)
<div className="alert alert-success">
  <span>Event created successfully!</span>
</div>
```

### Theme-Aware Custom Colors

**Use DaisyUI semantic color classes:**
- `bg-base-100` - Primary background
- `bg-base-200` - Secondary background
- `bg-base-300` - Tertiary background
- `text-base-content` - Primary text
- `border-base-300` - Borders

These automatically adapt to light/dark theme.

**Status-specific colors:**
- `badge-neutral` - INIT (gray)
- `badge-success` - REGISTRATION_OPEN (green)
- `badge-warning` - REGISTRATION_CLOSED (orange)
- `badge-info` - DRAWING (blue)
- `badge-error` - CLOSED (red)

### Accessibility with DaisyUI

- All DaisyUI components are accessible by default
- Include proper `aria-label` attributes
- Use semantic HTML with DaisyUI classes
- Test keyboard navigation
- Ensure proper color contrast in both themes

---

## Security Requirements

### Admin Security
- Passwords hashed with bcrypt (salt rounds: 10)
- JWT tokens with secure secret (environment variable)
- httpOnly cookies for token storage
- CSRF protection (Next.js built-in)
- SQL injection prevention (Prisma parameterized queries)
- XSS protection (React built-in escaping)

### User Security
- No rate limiting on registration (as per requirements)
- No CAPTCHA (as per requirements)
- localStorage validation: check if registration ID exists before allowing status check
- Prevent duplicate registrations via localStorage + database unique constraint

### General Security
- Environment variables for sensitive data (database URL, JWT secret)
- HTTPS in production (handled by Docker/reverse proxy)
- Input validation on all API routes
- Error handling without exposing sensitive information

---

## Docker Setup

### Requirements
- **Docker Compose is MANDATORY** for both development and production
- Multi-stage Dockerfile for optimized image size
- Docker Compose configuration includes:
  - Next.js app service
  - PostgreSQL service
  - Redis service (for WebSocket if using Socket.io with Redis adapter)
  - Environment variables via `.env` file
- Health checks for all services
- Volume mapping for:
  - Database persistence
  - Node modules (optional, for dev performance)
- Network configuration for service communication

### Docker Compose Structure
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: event_management_db
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: event_management_redis
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: event_management_app
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    environment:
      DATABASE_URL: ${DATABASE_URL}
      JWT_SECRET: ${JWT_SECRET}
      NEXT_PUBLIC_BASE_URL: ${NEXT_PUBLIC_BASE_URL}
      REDIS_URL: ${REDIS_URL}
    ports:
      - "3000:3000"
    volumes:
      - .:/app
      - /app/node_modules
      - /app/.next

volumes:
  postgres_data:
```

### Environment Variables
```env
# Database
POSTGRES_USER=eventuser
POSTGRES_PASSWORD=eventpass
POSTGRES_DB=event_management
DATABASE_URL=postgresql://eventuser:eventpass@postgres:5432/event_management

# Redis
REDIS_URL=redis://redis:6379

# JWT
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=7d

# Next.js
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# Node
NODE_ENV=development
```

---

## Code Quality Standards

### Critical Rules (MUST FOLLOW)
1. **NO `any` types in TypeScript** - use `unknown` or proper types
2. **ALL code comments in English, lowercase, brief**
3. **ALL commit messages lowercase, no descriptions, never mention AI/Claude**
4. **Use React Server Components by default** - only use client components when needed

### TypeScript
- Strict mode enabled
- No `any` types allowed (use `unknown` if needed)
- Explicit return types for functions
- Proper type definitions for all props and API responses

### Code Comments
**Rules:**
- English only
- All lowercase (including first letter)
- Brief and concise (prefer single line)
- Only when necessary for understanding

**Examples:**
```typescript
// ✅ Good comments
// extract random winner from pool
const winner = participants[randomIndex];

// hash password before storing
const hashedPassword = await bcrypt.hash(password, 10);

// prevent race condition in drawing
await db.$transaction(async (tx) => { ... });

// ❌ Bad comments
// Extract random winner from pool (uppercase)
// This function hashes the password... (too verbose)
// winner = participants[randomIndex] (obvious)
// Hash password (capital letter)
```

### ESLint Configuration
```json
{
  "extends": [
    "next/core-web-vitals",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
    "prettier"
  ],
  "rules": {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/explicit-function-return-type": "warn"
  }
}
```

### Prettier Configuration
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2
}
```

### Code Organization
- Feature-based folder structure
- Separate components, hooks, utils, types
- API routes in `/pages/api` or `/app/api`
- Shared types in `/types` directory
- Database queries in `/lib/db` or similar

### React Server Components (RSC) Best Practices
**IMPORTANT**: Maximize use of React Server Components

**Use Server Components (default) for:**
- Data fetching from database
- Static content rendering
- Layout components without interactivity
- Admin dashboard event lists
- Event detail pages (server-side data)
- Any component that doesn't need client-side state or browser APIs

**Use Client Components (`'use client'`) only for:**
- Interactive forms (with `useState`, `useForm`, etc.)
- WebSocket connections (`useEffect` for socket.io)
- QR code generation (if using canvas)
- Confetti animations
- Toast notifications
- Modal dialogs with state
- Language switcher (localStorage access)
- Any component using hooks like `useState`, `useEffect`, `useContext`
- Browser APIs (localStorage, window, document)

**Pattern: Server Component → Client Component**
```typescript
// ✅ Good: Server component fetches data, passes to client component
// app/admin/events/page.tsx (Server Component)
export default async function EventsPage() {
  const events = await db.event.findMany(); // Server-side DB query
  return <EventsList events={events} />; // Client component for interactivity
}

// app/admin/events/EventsList.tsx (Client Component)
'use client';
export function EventsList({ events }: { events: Event[] }) {
  const [filter, setFilter] = useState('');
  // Interactive logic here
}
```

**Avoid:**
- Adding `'use client'` to components that don't need it
- Fetching data in client components when it can be done server-side
- Using client components for static content

---

## Testing Requirements (Optional but Recommended)

### Unit Tests
- Test utility functions
- Test React components (React Testing Library)
- Test API route handlers

### Integration Tests
- Test authentication flow
- Test event creation and management
- Test registration and drawing logic

### E2E Tests (Optional)
- Playwright or Cypress
- Critical user flows:
  - Admin login and event creation
  - User registration and waiting
  - Drawing and winner announcement

---

## Deployment Checklist

### Pre-Deployment
- [ ] All environment variables configured in `.env`
- [ ] Database migrations applied
- [ ] Default admin account created via seed script
- [ ] JWT secret is secure and unique (use `openssl rand -base64 32`)
- [ ] HTTPS configured (production - use reverse proxy like Nginx/Traefik)
- [ ] WebSocket server configured for production URLs
- [ ] CORS settings configured correctly

### Docker Compose Deployment
- [ ] `docker-compose.yml` configured for production (separate from dev config)
- [ ] Dockerfile optimized (multi-stage build, <500MB final image)
- [ ] Docker Compose health checks configured for all services
- [ ] PostgreSQL data volume persisted correctly
- [ ] Redis persistence configured (if needed)
- [ ] Restart policies set (`restart: unless-stopped` or `restart: always`)
- [ ] Port mappings secured (only expose necessary ports)
- [ ] Logging configured (stdout/stderr with Docker logging driver)
- [ ] Resource limits set (memory, CPU)

### Production Considerations
- [ ] Database backups scheduled (pg_dump cron job)
- [ ] Monitoring and alerting setup (optional: Prometheus, Grafana)
- [ ] Rate limiting on critical API routes (optional)
- [ ] CDN for static assets (optional: Cloudflare, AWS CloudFront)
- [ ] SSL/TLS certificates (Let's Encrypt via Certbot)
- [ ] Firewall configured (UFW or cloud provider firewall)
- [ ] Regular security updates scheduled

---

## Development Workflow

### Setup Steps
1. Clone repository
2. Install dependencies: `npm install` or `pnpm install`
   - This will install Next.js, Tailwind CSS, DaisyUI, Prisma, and all other dependencies
3. Copy `.env.example` to `.env` and configure
4. **Start all services with Docker Compose**: `docker-compose up -d`
   - This starts PostgreSQL, Redis, and the app
5. Run migrations: `npx prisma migrate dev`
6. Seed default admin: `npx prisma db seed`
7. Access app at `http://localhost:3000`
8. Verify theme toggle works (light/dark mode)

### Development Commands
```bash
# Start all services (recommended)
docker-compose up -d

# Start only database and redis (if developing app locally)
docker-compose up -d postgres redis
npm run dev

# Stop all services
docker-compose down

# View logs
docker-compose logs -f

# Rebuild containers after changes
docker-compose up -d --build

# Access database shell
docker-compose exec postgres psql -U eventuser -d event_management
```

### Git Workflow
- Feature branches: `feature/feature-name`
- Commit messages: **Conventional Commits format (all lowercase)**
  - Format: `type: subject`
  - **NO descriptions or body text**
  - **NEVER mention "Claude" or AI tools in commits**
  - Types: `feat`, `fix`, `chore`, `refactor`, `docs`, `style`, `test`, `perf`
  - Examples:
    ```
    ✅ Good commits:
    feat: add event creation form
    fix: registration validation error
    chore: update dependencies
    refactor: simplify drawing logic
    docs: update readme setup steps
    style: format code with prettier
    test: add drawing algorithm tests
    perf: optimize participant query
    
    ❌ Bad commits:
    Feat: Add event creation form (uppercase)
    feat: add event creation form
    
    Added form for creating events (has description body)
    feat: implement feature with claude (mentions AI)
    added event form (missing type prefix)
    ```
- Pull requests required for main branch
- Code review before merge

### Code Comments Rules
- **ALL comments must be in English**
- **ALL comments must be lowercase** (no capital letters, even at start)
- **Comments must be brief and concise** (one line preferred)
- Only add comments when necessary for understanding
- Avoid obvious comments
- Examples:
  - ✅ `// extract random winner from remaining participants`
  - ✅ `// prevent duplicate registrations via localstorage`
  - ❌ `// Extract random winner from remaining participants` (uppercase)
  - ❌ `// This function extracts a random winner...` (too verbose)
  - ❌ `// user clicks button` (obvious, not needed)

### Scripts
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "type-check": "tsc --noEmit",
    "db:migrate": "prisma migrate dev",
    "db:seed": "prisma db seed",
    "db:studio": "prisma studio",
    "db:push": "prisma db push",
    "db:generate": "prisma generate",
    "docker:up": "docker-compose up -d",
    "docker:down": "docker-compose down",
    "docker:logs": "docker-compose logs -f",
    "docker:rebuild": "docker-compose up -d --build"
  }
}
```

### Key Dependencies (for reference)
```json
{
  "dependencies": {
    "next": "latest",
    "react": "latest",
    "react-dom": "latest",
    "typescript": "latest",
    "@prisma/client": "latest",
    "prisma": "latest",
    "bcrypt": "latest",
    "jsonwebtoken": "latest",
    "socket.io": "latest",
    "socket.io-client": "latest",
    "next-intl": "latest",
    "qrcode": "latest",
    "canvas-confetti": "latest",
    "daisyui": "latest"
  },
  "devDependencies": {
    "@types/node": "latest",
    "@types/react": "latest",
    "@types/bcrypt": "latest",
    "@types/jsonwebtoken": "latest",
    "@types/qrcode": "latest",
    "tailwindcss": "latest",
    "postcss": "latest",
    "autoprefixer": "latest",
    "eslint": "latest",
    "eslint-config-next": "latest",
    "prettier": "latest"
  }
}
```

---

## Outstanding Questions / Future Enhancements

### Potential Enhancements (Not Required for MVP)
- Email notifications for winners
- Export participant/winner lists (CSV/Excel)
- Event templates
- Bulk user import
- Analytics dashboard
- Multi-factor authentication for admins
- API rate limiting
- Admin activity audit log
- Event scheduling (auto-open/close registrations)
- Public event listing page

---

## Success Criteria

### Functional Requirements Met
- ✅ Admin can create and manage events
- ✅ Admin can manage other admins
- ✅ Users can register with unique names
- ✅ Event status flow enforced correctly
- ✅ Real-time updates via WebSocket
- ✅ Random drawing with exclusion logic
- ✅ QR code generation and fullscreen display
- ✅ Winner announcement with confetti
- ✅ Multilingual support (IT/EN)
- ✅ Light/Dark theme with OS detection and manual toggle

### Technical Requirements Met
- ✅ TypeScript with no `any` types
- ✅ PostgreSQL + Prisma ORM
- ✅ JWT authentication
- ✅ ESLint + Prettier configured
- ✅ Docker Compose deployment ready
- ✅ WebSocket real-time updates
- ✅ DaisyUI component library integrated
- ✅ Tailwind CSS configured
- ✅ Theme system working (no flash, persisted)

### User Experience
- ✅ Intuitive admin dashboard with DaisyUI components
- ✅ Seamless user registration flow
- ✅ Clear feedback on all actions with toast notifications
- ✅ Responsive design (mobile-first)
- ✅ Accessibility compliance (ARIA, keyboard navigation)
- ✅ Smooth theme switching (light/dark)
- ✅ Consistent UI across all pages

---

## Contact & Support

For questions or clarifications during development, refer back to this document and the original requirements.

**Key Principles:**
1. No `any` types in TypeScript
2. All text must be translatable (IT/EN)
3. Real-time updates where specified
4. Secure by default (JWT, bcrypt, input validation)
5. User-friendly UX with clear feedback

---

## Appendix: Example User Flows

### Admin Creates Event and Draws Winners
1. Admin logs in at `/admin/login`
2. Navigates to dashboard at `/admin/events`
3. Clicks "Create Event"
4. Enters event name and description
5. Event created in `INIT` status
6. Admin transitions to `REGISTRATION_OPEN`
7. QR code displayed, admin clicks fullscreen button
8. Users scan QR code and register (admin sees live updates)
9. Admin transitions to `REGISTRATION_CLOSED`
10. Admin transitions to `DRAWING`
11. Admin clicks "Draw Next Winner" multiple times
12. Winners displayed in draw order
13. Admin clicks "Close Event"
14. Event moved to `CLOSED` status

### User Registers and Checks Status
1. User scans QR code or opens link
2. Navigates to `/events/[eventId]/register`
3. Enters unique name
4. Submits form
5. Registration ID saved to localStorage
6. Redirected to `/events/[eventId]/status`
7. Sees "Waiting for drawing" message
8. Event moves to `DRAWING` (real-time update)
9. Sees "Drawing in progress..." message
10. Event moves to `CLOSED` (real-time update)
11. If winner: sees "You won! 🎉" with confetti
12. If not winner: sees "You didn't win this time"

---

**Document Version:** 1.0  
**Last Updated:** 2025-09-30  
**Status:** Ready for Development
