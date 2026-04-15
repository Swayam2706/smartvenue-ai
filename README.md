# 🚀 SmartVenue AI – Intelligent Stadium Experience Platform

A production-ready, real-time smart stadium management system built for hackathon-level quality.

---

## 📁 Project Structure

```
smartvenue-ai/
├── frontend/          # React + Vite + Tailwind
│   ├── src/
│   │   ├── pages/     # Dashboard, Heatmap, Navigation, Queue, Chat, Alerts, Admin, Login
│   │   ├── components/# Layout, Auth components
│   │   ├── store/     # Zustand global state
│   │   └── tests/     # Unit tests
│   └── .env.example
├── backend/           # Node.js + Express + WebSocket
│   ├── src/
│   │   ├── routes/    # auth, crowd, navigation, queue, alerts, chat, analytics
│   │   ├── simulation/# Real-time crowd simulator
│   │   ├── websocket/ # WS server
│   │   ├── middleware/ # JWT auth
│   │   └── tests/     # Backend tests
│   └── .env.example
└── README.md
```

---

## ⚡ Quick Start (Local)

### Prerequisites
- Node.js 18+
- npm 9+

### 1. Install dependencies

```bash
cd smartvenue-ai
npm install
cd frontend && npm install
cd ../backend && npm install
```

### 2. Configure environment

```bash
# Backend
cp backend/.env.example backend/.env
# Edit backend/.env with your values

# Frontend
cp frontend/.env.example frontend/.env
```

### 3. Run development servers

**Terminal 1 – Backend:**
```bash
cd smartvenue-ai/backend
npm run dev
# Runs on http://localhost:5000
```

**Terminal 2 – Frontend:**
```bash
cd smartvenue-ai/frontend
npm run dev
# Runs on http://localhost:3000
```

### 4. Open the app
Visit `http://localhost:3000`

**Demo login:** `admin` / `admin123`

---

## 🔑 Environment Variables

### Backend (`backend/.env`)
| Variable | Description | Default |
|---|---|---|
| `PORT` | Server port | `5000` |
| `JWT_SECRET` | JWT signing secret | required |
| `MONGODB_URI` | MongoDB connection string | optional |
| `GEMINI_API_KEY` | Google Gemini AI key | optional (fallback used) |

### Frontend (`frontend/.env`)
| Variable | Description |
|---|---|
| `VITE_WS_URL` | WebSocket URL |
| `VITE_GOOGLE_MAPS_KEY` | Google Maps API key (optional) |

> All features work without API keys using simulated data.

---

## 🧪 Running Tests

```bash
# Frontend unit tests
cd frontend && npm test

# Backend tests
cd backend && npm test
```

---

## 🚀 Deployment

### Google Cloud (Recommended - Full Stack)

**One-command deployment:**

```bash
# Set your project ID in deploy.sh, then:
bash deploy.sh
```

See [DEPLOYMENT.md](./DEPLOYMENT.md) for complete guide.

### Alternative Platforms

**Vercel (Frontend)**
```bash
cd frontend
npm run build
# Deploy dist/ to Vercel
```

**Railway / Render (Backend)**
- Set environment variables in dashboard
- Deploy from GitHub

**Firebase Hosting**
```bash
npm install -g firebase-tools
firebase login
firebase init hosting
firebase deploy
```

---

## ✨ Features

| Feature | Status |
|---|---|
| Real-time crowd heatmap (SVG) | ✅ |
| Smart navigation (Dijkstra) | ✅ |
| AI queue prediction | ✅ |
| AI chat (Gemini + fallback) | ✅ |
| Emergency alert system | ✅ |
| Admin dashboard + analytics | ✅ |
| WebSocket live updates (4s) | ✅ |
| JWT authentication | ✅ |
| Dark/light mode | ✅ |
| Simulation mode | ✅ |
| Risk level indicators | ✅ |
| Route score gamification | ✅ |
| Responsive design | ✅ |
| Loading skeletons | ✅ |
| Unit tests | ✅ |
