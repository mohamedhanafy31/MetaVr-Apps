# MetaVR Management Dashboard

A centralized administrative platform for managing VR applications and user access.

## 🚀 Features

- **Multi-Application Management**: Unified control over multiple VR applications
- **User Lifecycle Management**: Complete user control with role-based access
- **Access Policy Engine**: Granular review and approval workflows
- **Access Request Workflow**: Professional access request and approval system
- **Real-time Analytics**: Dashboard with KPI metrics and charts
- **Modern UI**: Responsive design with dark mode support

## 🛠️ Tech Stack

- **Frontend**: Next.js 16, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes, Firebase Firestore
- **Authentication**: Custom Next.js authentication with bcrypt
- **Animations**: Framer Motion
- **Charts**: Recharts
- **Icons**: Lucide React

## 📋 Prerequisites

- Node.js 18+
- Conda environment manager
- Firebase project configured
- Python 3 (for auto-download functionality)

## 🚀 Quick Start

### Option 1: Start with Auto Download (Recommended)
```bash
npm run dev:with-download
```
This will automatically download required Firebase credentials and start the development server.

### Option 2: Manual Setup
```bash
npm install
npm run download-file  # Downloads Firebase service account
npm run init-db        # Initialize database with sample data
npm run dev           # Start development server
```

## 📁 Project Structure

```
metavr-dashboard/
├── src/
│   ├── app/                 # Next.js app router pages
│   │   ├── (public)/       # Public access request page
│   │   ├── admin/          # Admin dashboard pages
│   │   └── api/            # API routes
│   ├── components/         # React components
│   │   ├── ui/            # shadcn/ui components
│   │   ├── motion/        # Animation components
│   │   └── navigation/    # Navigation components
│   ├── lib/               # Utilities and configurations
│   └── hooks/             # Custom React hooks
├── scripts/               # Utility scripts
├── downloads/             # Auto-downloaded files
└── public/               # Static assets
```

## 🔧 Configuration

### Environment Variables

1. Copy `env.example` to `.env.local`.
2. Generate random secrets (or fetch them from your secrets manager).
3. Run the root validator `../scripts/validate-env.sh` to ensure both the backend and dashboard have a valid `SESSION_SECRET` (and optional RSA keypair) before starting the app.

Important keys:

```env
SESSION_SECRET=long-random-string
SESSION_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"
NEXT_PUBLIC_SESSION_ISSUER=metavr-backend
NEXT_PUBLIC_SESSION_AUDIENCE=metavr-dashboard
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

### Firebase Setup

1. Create a Firebase project
2. Enable Firestore Database
3. Set up authentication
4. Download service account JSON
5. The project will auto-download credentials from Google Drive

## 📝 Available Scripts

- `npm run dev:with-download` - Start with auto download
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run download-file` - Download Firebase credentials
- `npm run init-db` - Initialize database
- `npm run lint` - Run ESLint

## 🚀 Deployment

### Netlify Deployment

1. Connect your GitHub repository to Netlify
2. Set build command: `npm run build`
3. Set publish directory: `.next`
4. Add environment variables in Netlify dashboard
5. Deploy!

### Environment Variables for Production

Set these in your deployment platform:
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `FIREBASE_SERVICE_ACCOUNT_KEY` (Base64 encoded service account JSON)

## 🔐 Default Admin Credentials

- **Email**: admin@metavr.com
- **Password**: Admin123!

⚠️ **Change these credentials in production!**

## 📊 Features Overview

### Public Access Request
- Professional landing page
- Form validation with real-time feedback
- Responsive design for all devices

### Admin Dashboard
- KPI metrics with trend indicators
- Recent access requests with quick actions
- Application status monitoring
- User activity feed

### User Management
- Complete CRUD operations
- Role-based access control
- Bulk operations support
- Advanced search and filtering

### Application Management
- Multi-platform support (Desktop, Web, Mobile)
- Status monitoring and health checks
- Authentication and platform controls
- Rich descriptions and metadata management

### Analytics
- User registration trends
- Access request throughput
- Platform adoption breakdowns
- Export functionality

## 🛡️ Security Features

- Custom authentication with bcrypt hashing
- Login issues an HttpOnly handshake cookie; `/auth/handshake` consumes it and upgrades the browser to a signed session cookie without exposing intermediate tokens to JS.
- Optional RS256 mode (set `SESSION_PUBLIC_KEY` in the dashboard and the private key on the backend) so only the backend can mint tokens.
- Role-based route protection
- Rate limiting on API endpoints
- CSRF protection via Origin/Referer checks (`sameSite='strict'` by default)
- XSS prevention
- Audit logging

## 📱 Responsive Design

- Mobile-first approach
- Touch-friendly interface
- Dark mode support
- Accessible design (WCAG 2.1 Level AA)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Check the documentation in `/docs`
- Review the troubleshooting guide
- Open an issue on GitHub

---

Built with ❤️ for the MetaVR platform
