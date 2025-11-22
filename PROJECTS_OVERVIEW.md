# MetaVR Management System - Projects Overview

## 🏗️ System Architecture

This is a multi-application VR/AR management platform with:
- **1 Backend API** (Nest.js)
- **1 Management Dashboard** (Next.js)
- **3 User-Facing Apps** (Next.js)

All apps are accessible via domain-based URLs through nginx reverse proxy.

---

## 📦 Projects Breakdown

### 1. **Backend API** (`backend/`)
**Port:** 4000  
**Tech Stack:** Nest.js, TypeScript, Firebase Firestore, Winston Logger

**Purpose:**
- Centralized API service for all MetaVR operations
- Handles authentication, authorization, and user management
- Manages access codes and user access requests
- Provides email services for notifications

**Key Features:**
- **Authentication System:**
  - Admin login with session management
  - Handshake token system for secure session establishment
  - Access code verification for app access
  - CSRF protection and origin validation

- **User Access Management:**
  - Public access request submission
  - Access request approval/rejection workflow
  - Access code generation and regeneration
  - User app access toggling

- **Access Code System:**
  - 9-digit access codes for users and supervisors
  - Code verification for app access
  - Code resend functionality
  - Supervisor welcome emails

- **Modules:**
  - `AuthModule` - Authentication and authorization
  - `UserAccessModule` - User access request management
  - `EmailModule` - Email notifications
  - `FirebaseModule` - Firestore database integration
  - `LoggerModule` - Structured logging with Winston
  - `HealthModule` - Health check endpoints

**API Endpoints:**
- `POST /auth/login` - Admin login
- `POST /auth/handshake` - Session handshake
- `POST /auth/access-codes/check` - Verify access code
- `POST /user-access/request` - Submit access request (public)
- `GET /user-access/requests` - Get access requests (admin)
- `POST /user-access/approve` - Approve access request
- `POST /user-access/reject` - Reject access request
- `GET /health` - Health check

---

### 2. **MetaVR Dashboard** (`metavr-dashboard/`)
**Port:** 3000  
**Tech Stack:** Next.js 16, TypeScript, Tailwind CSS, shadcn/ui, Firebase Firestore

**Purpose:**
- Centralized administrative platform for managing VR applications
- User lifecycle management
- Access request review and approval
- Analytics and monitoring

**Key Features:**
- **Public Access Request Page:**
  - Professional landing page for access requests
  - Form validation with real-time feedback
  - Responsive design

- **Admin Dashboard:**
  - KPI metrics with trend indicators
  - Recent access requests with quick actions
  - Application status monitoring
  - User activity feed

- **User Management:**
  - Complete CRUD operations
  - Role-based access control (admin, supervisor, user)
  - Bulk operations support
  - Advanced search and filtering

- **Application Management:**
  - Multi-platform support (Desktop, Web, Mobile)
  - Status monitoring and health checks
  - Authentication and platform controls
  - App discovery and sync from `apps/` directory
  - Rich descriptions and metadata management

- **Analytics:**
  - User registration trends
  - Access request throughput
  - Platform adoption breakdowns
  - Export functionality

- **Security:**
  - Custom authentication with bcrypt
  - HttpOnly cookies for session management
  - Optional RS256 token signing
  - Role-based route protection
  - CSRF protection
  - Audit logging

**URL:** `https://metavrai.shop` (production)

---

### 3. **IQ Questions App** (`apps/iq-questions/`)
**Port:** 3001  
**Tech Stack:** Next.js, TypeScript, Tailwind CSS

**Purpose:**
- Interactive IQ assessment application
- Timed questions with instant feedback
- Score tracking based on difficulty

**Key Features:**
- Random question selection from JSON file
- Shuffled answer choices
- Score tracking based on question difficulty
- Progress tracking through questions
- Configurable questions per round (default: 20)
- Supervisor configuration page
- Access code gate (requires user access code)
- Page tracking and analytics integration

**Configuration:**
- Questions stored in `questions.json`
- Configurable via supervisor config page
- Questions per round can be adjusted

**URL:** `https://metavrai.shop/iq-questions/` (production)

---

### 4. **Card Matching App** (`apps/card_matching/`)
**Port:** 3002  
**Tech Stack:** Next.js 16, TypeScript, Tailwind CSS

**Purpose:**
- Memory training game with card matching
- Progressive difficulty modes
- Relaxing gameplay experience

**Key Features:**
- Smooth card flip animations
- Gentle audio feedback
- Progressive difficulty modes (Easy, Medium, Hard)
- Custom image upload support
- Score tracking and game statistics
- Supervisor configuration page
- Access code gate (requires user access code)
- Page tracking and analytics integration

**Configuration:**
- Difficulty levels configurable
- Custom images can be uploaded
- Game settings adjustable via supervisor config

**URL:** `https://metavrai.shop/card-matching/` (production)

---

### 5. **AI NPC App** (`apps/AI-npc/`)
**Port:** 3003  
**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS

**Purpose:**
- AI-powered non-player character interaction
- Immersive virtual environment
- Dynamic conversations with AI

**Key Features:**
- Embedded game iframe (AI Avatar Closed from itch.io)
- Microphone access for voice interaction
- Access code gate (requires user access code)
- Dark theme UI with modern design

**Configuration:**
- Game embedded via iframe
- Microphone permissions handled
- Access code protection

**URL:** `https://metavrai.shop/AI-npc/` (production)

---

## 🔐 Access Control System

### Access Code Flow:
1. **User submits access request** via public dashboard page
2. **Admin reviews and approves** via dashboard
3. **Access code generated** (9-digit code)
4. **Code sent via email** to user
5. **User enters code** on app access page
6. **Code verified** against backend API
7. **Session granted** for app access

### Roles:
- **Admin:** Full system access, user management, app management
- **Supervisor:** Can configure apps, view analytics for assigned apps
- **User:** Can access apps with valid access code

---

## 🌐 Deployment Architecture

### Production Setup:
- **Domain:** `metavrai.shop`
- **Nginx:** Reverse proxy routing
  - `/` → Dashboard (port 3000)
  - `/iq-questions/` → IQ Questions App (port 3001)
  - `/card-matching/` → Card Matching App (port 3002)
  - `/AI-npc/` → AI NPC App (port 3003)
  - `/api/*` → Backend API (port 4000)

### Services:
- All apps run as separate Node.js processes
- Backend API runs as Nest.js service
- Redis for session storage (optional)
- Firebase Firestore for data persistence

---

## 📁 Project Structure

```
MetaVR/
├── backend/              # Nest.js API service
├── metavr-dashboard/     # Admin dashboard
├── apps/
│   ├── iq-questions/     # IQ assessment app
│   ├── card_matching/    # Memory game app
│   └── AI-npc/          # AI NPC interaction app
├── deploy/               # Deployment scripts
├── scripts/              # Utility scripts
└── apps-map.json         # App registry
```

---

## 🔄 Data Flow

1. **User Access Request:**
   - User → Dashboard (public page) → Backend API → Firestore
   - Admin → Dashboard → Backend API → Firestore (approval)

2. **App Access:**
   - User → App → Access Code Gate → Backend API (verify) → Session granted

3. **Analytics:**
   - Apps → Page tracking → Backend API → Firestore
   - Dashboard → Backend API → Firestore (read analytics)

---

## 🛠️ Development

### Running All Services:
```bash
./run_all.sh
```

### Individual Services:
```bash
# Backend
cd backend && npm run start:dev

# Dashboard
cd metavr-dashboard && npm run dev

# Apps
cd apps/iq-questions && npm run dev
cd apps/card_matching && npm run dev
cd apps/AI-npc && npm run dev
```

---

## 📊 Key Technologies

- **Frontend:** Next.js, React, TypeScript, Tailwind CSS
- **Backend:** Nest.js, TypeScript, Express
- **Database:** Firebase Firestore
- **Authentication:** Custom JWT-based with HttpOnly cookies
- **Email:** Email service integration
- **Logging:** Winston structured logging
- **Deployment:** Docker, Nginx, GCP

---

## 🔗 Integration Points

1. **Apps ↔ Backend:**
   - Access code verification
   - Page tracking/analytics
   - Configuration fetching

2. **Dashboard ↔ Backend:**
   - User management
   - Access request management
   - Analytics data
   - App management

3. **All ↔ Firebase:**
   - Data persistence
   - Real-time updates
   - User documents
   - Access codes
   - Analytics events

