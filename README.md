# MetaVR Management System

A comprehensive multi-application VR/AR management platform with centralized administration, user access control, and analytics.

## 🎯 Overview

MetaVR is a full-stack platform for managing multiple VR/AR applications with:
- **Centralized Dashboard** for administration and monitoring
- **Backend API** for authentication, user management, and access control
- **Multiple User-Facing Apps** (IQ Questions, Card Matching, AI NPC)
- **Access Code System** for secure app access
- **Analytics & Tracking** for user behavior and app usage

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    MetaVR Platform                       │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┐      ┌──────────────┐                │
│  │   Dashboard  │◄────►│  Backend API │                │
│  │  (Port 3000) │      │  (Port 4000) │                │
│  └──────────────┘      └──────┬───────┘                │
│         │                      │                        │
│         │                      │                        │
│  ┌──────┴──────┐      ┌───────┴────────┐               │
│  │             │      │                │               │
│  │ User Apps   │      │  Firebase      │               │
│  │             │      │  Firestore     │               │
│  │ • IQ Q's    │      │                │               │
│  │ • Card Match│      │                │               │
│  │ • AI NPC    │      │                │               │
│  └─────────────┘      └────────────────┘               │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## 📦 Projects

### Core Services

1. **Backend API** (`backend/`)
   - Nest.js REST API
   - Authentication & authorization
   - User access management
   - Access code generation & verification
   - Email notifications

2. **MetaVR Dashboard** (`metavr-dashboard/`)
   - Admin management interface
   - User lifecycle management
   - Access request approval workflow
   - Analytics & monitoring
   - Application management

### User Applications

3. **IQ Questions** (`apps/iq-questions/`)
   - Interactive IQ assessment
   - Timed questions with instant feedback
   - Score tracking

4. **Card Matching** (`apps/card_matching/`)
   - Memory training game
   - Progressive difficulty modes
   - Custom image support

5. **AI NPC** (`apps/AI-npc/`)
   - AI-powered NPC interactions
   - Voice interaction support
   - Immersive VR/AR environment

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ and npm
- **Firebase Project** with Firestore enabled
- **Git**

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd managment_test
   ```

2. **Install dependencies:**
   ```bash
   # Install root dependencies
   npm install

   # Install backend dependencies
   cd backend && npm install && cd ..

   # Install dashboard dependencies
   cd metavr-dashboard && npm install && cd ..

   # Install app dependencies
   cd apps/iq-questions && npm install && cd ../..
   cd apps/card_matching && npm install && cd ../..
   cd apps/AI-npc && npm install && cd ../..
   ```

3. **Configure environment variables:**
   See [SETUP.md](./SETUP.md) for detailed configuration instructions.

4. **Start all services:**
   ```bash
   ./run_all.sh
   ```

## 📖 Documentation

- **[SETUP.md](./SETUP.md)** - Detailed setup and configuration guide
- **[PROJECTS_OVERVIEW.md](./PROJECTS_OVERVIEW.md)** - In-depth project documentation

## 🔐 Access Control

### User Roles

- **Admin**: Full system access, user management, app management
- **Supervisor**: Can configure apps, view analytics for assigned apps
- **User**: Can access apps with valid access code

### Access Flow

1. User submits access request via public dashboard page
2. Admin reviews and approves request
3. 9-digit access code generated and emailed
4. User enters code on app access page
5. Code verified against backend API
6. Session granted for app access

## 🌐 URLs

### Development
- Dashboard: `http://localhost:3000`
- Backend API: `http://localhost:4000`
- IQ Questions: `http://localhost:3001`
- Card Matching: `http://localhost:3002`
- AI NPC: `http://localhost:3003`

### Production
- Dashboard: `https://metavrai.shop`
- IQ Questions: `https://metavrai.shop/iq-questions/`
- Card Matching: `https://metavrai.shop/card-matching/`
- AI NPC: `https://metavrai.shop/AI-npc/`

## 🛠️ Development

### Running Individual Services

```bash
# Backend
cd backend
npm run start:dev

# Dashboard
cd metavr-dashboard
npm run dev

# Apps
cd apps/iq-questions && npm run dev
cd apps/card_matching && npm run dev
cd apps/AI-npc && npm run dev
```

### Building for Production

```bash
# Build all services
cd backend && npm run build && cd ..
cd metavr-dashboard && npm run build && cd ..
cd apps/iq-questions && npm run build && cd ../..
cd apps/card_matching && npm run build && cd ../..
cd apps/AI-npc && npm run build && cd ../..
```

## 📊 Tech Stack

### Frontend
- **Next.js** 14-16 (App Router)
- **TypeScript**
- **Tailwind CSS**
- **React** 18-19

### Backend
- **Nest.js** (Express)
- **TypeScript**
- **Firebase Firestore**
- **Winston** (Logging)

### Infrastructure
- **Firebase** (Database & Storage)
- **Nginx** (Reverse Proxy)
- **Docker** (Containerization)
- **GCP** (Deployment)

## 🔒 Security Features

- Custom JWT-based authentication
- HttpOnly cookies for session management
- CSRF protection
- Role-based access control (RBAC)
- Access code verification
- Secure password hashing (bcrypt)
- Audit logging

## 📝 Scripts

### Root Level
- `./run_all.sh` - Start all services in production mode
- `./update-env-to-domain.sh <domain>` - Update environment URLs
- `./scripts/validate-env.sh` - Validate environment configuration

### Backend
- `npm run start:dev` - Development mode with hot reload
- `npm run build` - Build for production
- `npm run start:prod` - Run production build

### Dashboard
- `npm run dev` - Development server
- `npm run build` - Production build
- `npm run start` - Production server

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

[Add your license information here]

## 🆘 Support

For issues, questions, or contributions, please open an issue on the repository.

## 📚 Additional Resources

- [Setup Guide](./SETUP.md)
- [Projects Overview](./PROJECTS_OVERVIEW.md)
- [Backend README](./backend/README.md)
- [Dashboard README](./metavr-dashboard/README.md)

---

**Built with ❤️ for the MetaVR platform**

