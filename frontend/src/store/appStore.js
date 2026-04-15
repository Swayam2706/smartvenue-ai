import { create } from 'zustand';
import toast from 'react-hot-toast';
import {
  hasFirebaseConfig,
  subscribeToFirebaseCrowd,
  subscribeToFirebaseAlerts,
  firebaseSignOut,
  logAnalyticsEvent
} from '../config/firebase';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:5000/ws';
const API_URL = import.meta.env.VITE_API_URL || '/api';

export const useAppStore = create((set, get) => ({
  // ── Theme ──────────────────────────────────────────────────────────────────
  theme: localStorage.getItem('theme') || 'dark',
  toggleTheme: () => {
    const newTheme = get().theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('theme', newTheme);
    set({ theme: newTheme });
    document.documentElement.classList.toggle('light', newTheme === 'light');
    logAnalyticsEvent('theme_toggle', { theme: newTheme });
  },

  // ── Auth ───────────────────────────────────────────────────────────────────
  user:  JSON.parse(localStorage.getItem('user')  || 'null'),
  token: localStorage.getItem('token') || null,

  login: (user, token) => {
    localStorage.setItem('user',  JSON.stringify(user));
    localStorage.setItem('token', token);
    set({ user, token });
  },

  logout: async () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    set({ user: null, token: null });
    // Sign out from Firebase if it was used
    if (hasFirebaseConfig) {
      await firebaseSignOut().catch(() => {});
    }
    logAnalyticsEvent('admin_logout');
  },

  // ── Data source tracking ───────────────────────────────────────────────────
  dataSource: hasFirebaseConfig ? 'firebase' : 'websocket',

  // ── Firebase Realtime DB ───────────────────────────────────────────────────
  firebaseUnsubCrowd:  null,
  firebaseUnsubAlerts: null,

  initFirebase: () => {
    if (!hasFirebaseConfig) return;

    // Subscribe to crowd data
    const unsubCrowd = subscribeToFirebaseCrowd((data) => {
      set({ crowdData: data, lastUpdate: new Date().toISOString() });
    });

    // Subscribe to alerts
    const unsubAlerts = subscribeToFirebaseAlerts((alertsList) => {
      set({ alerts: alertsList.slice(0, 50) });
    });

    set({ firebaseUnsubCrowd: unsubCrowd, firebaseUnsubAlerts: unsubAlerts });
    console.info('🔥 Firebase Realtime DB subscribed');
  },

  cleanupFirebase: () => {
    const { firebaseUnsubCrowd, firebaseUnsubAlerts } = get();
    if (firebaseUnsubCrowd)  firebaseUnsubCrowd();
    if (firebaseUnsubAlerts) firebaseUnsubAlerts();
  },

  // ── WebSocket (fallback when Firebase not configured) ──────────────────────
  ws: null,
  wsConnected: false,

  initWebSocket: () => {
    // If Firebase is configured, use it instead of WebSocket
    if (hasFirebaseConfig) {
      get().initFirebase();
      set({ wsConnected: true }); // show as "connected" via Firebase
      return;
    }

    const existing = get().ws;
    if (existing && existing.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      set({ wsConnected: true });
      console.log('🔌 WebSocket connected');
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        get().handleWsMessage(msg);
      } catch {}
    };

    ws.onclose = () => {
      set({ wsConnected: false });
      setTimeout(() => get().initWebSocket(), 3000);
    };

    ws.onerror = () => {
      set({ wsConnected: false });
    };

    set({ ws });
  },

  handleWsMessage: (msg) => {
    switch (msg.type) {
      case 'INITIAL_STATE':
      case 'CROWD_UPDATE':
        set({ crowdData: msg.data, lastUpdate: msg.timestamp });
        break;
      case 'ALERT': {
        const alert = msg.data;
        set(state => ({ alerts: [alert, ...state.alerts].slice(0, 50) }));
        if (alert.type === 'critical' || alert.type === 'evacuation') {
          toast.error(`🚨 ${alert.title}: ${alert.message}`, { duration: 8000 });
        } else if (alert.type === 'warning') {
          toast(`⚠️ ${alert.title}`, { duration: 5000 });
        }
        break;
      }
    }
  },

  // ── Crowd data ─────────────────────────────────────────────────────────────
  crowdData:  {},
  lastUpdate: null,

  // ── Alerts ─────────────────────────────────────────────────────────────────
  alerts: [],
  addAlert: (alert) => set(state => ({
    alerts: [alert, ...state.alerts].slice(0, 50)
  })),

  // ── Notifications ──────────────────────────────────────────────────────────
  notifications: [],
  addNotification: (n) => set(state => ({
    notifications: [{ ...n, id: Date.now(), read: false }, ...state.notifications].slice(0, 20)
  })),
  markAllRead: () => set(state => ({
    notifications: state.notifications.map(n => ({ ...n, read: true }))
  })),

  // ── Simulation mode ────────────────────────────────────────────────────────
  simulationMode: !hasFirebaseConfig,
  toggleSimulation: () => set(state => ({ simulationMode: !state.simulationMode })),

  // ── API helpers ────────────────────────────────────────────────────────────
  apiUrl: API_URL,
  getAuthHeaders: () => {
    const token = get().token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }
}));
