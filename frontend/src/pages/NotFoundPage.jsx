import React from 'react';
import { Link } from 'react-router-dom';
import { Home, AlertTriangle } from 'lucide-react';
import { usePageTitle } from '../hooks/usePageTitle';

export default function NotFoundPage() {
  usePageTitle('Page Not Found');
  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'radial-gradient(ellipse at center, #0f172a 0%, #020617 100%)' }}>
      <div className="text-center">
        <div className="w-20 h-20 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <AlertTriangle size={36} className="text-yellow-400" aria-hidden="true" />
        </div>
        <h1 className="text-6xl font-bold text-white mb-2">404</h1>
        <p className="text-slate-400 text-lg mb-8">Page not found</p>
        <Link to="/" className="btn-primary inline-flex items-center gap-2">
          <Home size={16} aria-hidden="true" />
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
