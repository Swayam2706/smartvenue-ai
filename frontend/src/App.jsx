import React, { useEffect, Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAppStore } from './store/appStore';
import Layout from './components/Layout/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from './components/Auth/ProtectedRoute';

// Lazy load all pages
const LandingPage    = lazy(() => import('./pages/LandingPage'));
const LoginPage      = lazy(() => import('./pages/LoginPage'));
const SignupPage     = lazy(() => import('./pages/SignupPage'));
const Dashboard      = lazy(() => import('./pages/Dashboard'));
const HeatmapPage    = lazy(() => import('./pages/HeatmapPage'));
const NavigationPage = lazy(() => import('./pages/NavigationPage'));
const QueuePage      = lazy(() => import('./pages/QueuePage'));
const ChatPage       = lazy(() => import('./pages/ChatPage'));
const AlertsPage     = lazy(() => import('./pages/AlertsPage'));
const AdminPage      = lazy(() => import('./pages/AdminPage'));
const NotFoundPage   = lazy(() => import('./pages/NotFoundPage'));

function PageLoader() {
  return (
    <div className="min-h-screen hero-bg flex items-center justify-center" role="status" aria-label="Loading">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center animate-pulse">
          <span className="text-white font-black text-lg" aria-hidden="true">V</span>
        </div>
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  );
}

export default function App() {
  const { initWebSocket, theme } = useAppStore();

  useEffect(() => {
    initWebSocket();
  }, []);

  return (
    <div className={theme === 'light' ? 'light' : ''}>
      <ErrorBoundary>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* ── Public routes ─────────────────────────────────────────── */}
            <Route path="/"       element={<LandingPage />} />
            <Route path="/login"  element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />

            {/* ── App routes (inside Layout) ────────────────────────────── */}
            <Route path="/dashboard" element={<Layout />}>
              <Route index element={<ErrorBoundary><Dashboard /></ErrorBoundary>} />
              <Route path="heatmap"    element={<ErrorBoundary><HeatmapPage /></ErrorBoundary>} />
              <Route path="navigation" element={<ErrorBoundary><NavigationPage /></ErrorBoundary>} />
              <Route path="queues"     element={<ErrorBoundary><QueuePage /></ErrorBoundary>} />
              <Route path="chat"       element={<ErrorBoundary><ChatPage /></ErrorBoundary>} />
              <Route path="alerts"     element={<ErrorBoundary><AlertsPage /></ErrorBoundary>} />
              <Route path="admin"      element={
                <ProtectedRoute>
                  <ErrorBoundary><AdminPage /></ErrorBoundary>
                </ProtectedRoute>
              } />
            </Route>

            {/* ── Redirects ─────────────────────────────────────────────── */}
            <Route path="/404" element={<NotFoundPage />} />
            <Route path="*"    element={<Navigate to="/404" replace />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
