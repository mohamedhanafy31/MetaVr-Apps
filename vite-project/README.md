# Vite Project - React Frontend

This is the React + Vite frontend for the Unity Showcase project.

## 🚀 Quick Start

### Prerequisites

- Node.js (v16 or higher)
- npm (comes with Node.js)

### Installation

If `node_modules` doesn't exist or you need to reinstall:

```bash
cd vite-project
npm install
```

### Running the Development Server

```bash
cd vite-project
npm run dev
```

The app will be available at:
- **HTTPS**: https://localhost:5173
- **HTTP**: http://localhost:5173 (if HTTPS fails)

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## 📝 Configuration

### Environment Variables

Create a `.env` file in the `vite-project` directory if needed:

```bash
VITE_GATEWAY_API_URL=http://localhost:8000
```

### Port Configuration

The dev server runs on port **5173** by default (configured in `vite.config.js`).

### API Proxy

The Vite dev server proxies `/api/*` requests to `http://localhost:8000` (Gateway API).

## 🔧 Troubleshooting

### Port 5173 Already in Use

If port 5173 is already in use:

```bash
# Kill the process using port 5173
sudo fuser -k 5173/tcp

# Or change the port in vite.config.js
```

### Permission Denied for vite

If you get "Permission denied" error:

```bash
chmod +x node_modules/.bin/vite
chmod +x node_modules/.bin/*
```

### node_modules Missing

If `node_modules` doesn't exist:

```bash
rm -rf node_modules package-lock.json
npm install
```

### HTTPS Certificate Issues

The project uses HTTPS by default. If you have certificate issues:

1. The vite config will auto-generate a self-signed certificate
2. Your browser will show a security warning - click "Advanced" → "Proceed to localhost"
3. Or modify `vite.config.js` to use HTTP only

## 🌐 Running with Backend Services

To run the full application:

1. **Start backend services** (in project root):
   ```bash
   conda activate unity_showcase
   python3 start-all.py
   ```

2. **Start frontend** (in vite-project directory):
   ```bash
   npm run dev
   ```

3. **Access the app**: https://localhost:5173

## 📦 Production Build

To build for production:

```bash
npm run build
```

The built files will be in the `dist/` directory.

## 🛠️ Tech Stack

- **React 19** - UI framework
- **Vite 7** - Build tool and dev server
- **React Router 7** - Routing
- **Tailwind CSS** - Styling
- **Framer Motion** - Animations
- **MediaPipe Tasks Vision** - Computer vision
