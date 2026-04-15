import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Map, Navigation, Clock, MessageSquare,
  Bell, ShieldAlert, X, Zap, LogOut
} from 'lucide-react';
import { useAppStore } from '../../store/appStore';

const navItems = [
  { to: '/dashboard',            icon: LayoutDashboard, label: 'Dashboard',        exact: true },
  { to: '/dashboard/heatmap',    icon: Map,             label: 'Crowd Heatmap' },
  { to: '/dashboard/navigation', icon: Navigation,      label: 'Smart Navigation' },
  { to: '/dashboard/queues',     icon: Clock,           label: 'Queue Predictor' },
  { to: '/dashboard/chat',       icon: MessageSquare,   label: 'AI Assistant' },
  { to: '/dashboard/alerts',     icon: Bell,            label: 'Alerts' },
  { to: '/dashboard/admin',      icon: ShieldAlert,     label: 'Admin Panel' },
];

export default function Sidebar({ open, onClose }) {
  const { user, logout, wsConnected } = useAppStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        aria-label="Main navigation"
        className={`
          fixed lg:static inset-y-0 left-0 z-50 w-64 flex flex-col
          bg-slate-900/95 backdrop-blur-xl border-r border-slate-700/50
          transform transition-transform duration-300 ease-in-out
          ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Logo */}
        <div className="flex items-center justify-between p-5 border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center"
              aria-hidden="true"
            >
              <Zap size={18} className="text-white" />
            </div>
            <div>
              <div className="font-bold text-white text-sm">SmartVenue AI</div>
              <div className="text-xs text-slate-400">Stadium Intelligence</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden text-slate-400 hover:text-white min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg"
            aria-label="Close navigation menu"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        {/* Connection status */}
        <div className="px-4 py-2" role="status" aria-live="polite">
          <div className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-full w-fit ${
            wsConnected ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
          }`}>
            <div
              className={`w-1.5 h-1.5 rounded-full ${wsConnected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`}
              aria-hidden="true"
            />
            {wsConnected ? 'Live Connected' : 'Reconnecting...'}
          </div>
        </div>

        {/* Navigation */}
        <nav aria-label="Site navigation" className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, label, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              onClick={onClose}
              className={({ isActive }) => `
                flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                transition-all duration-150 group min-h-[44px]
                ${isActive
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
                }
              `}
              aria-current={({ isActive }) => isActive ? 'page' : undefined}
            >
              <Icon size={18} className="flex-shrink-0" aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User section */}
        <div className="p-4 border-t border-slate-700/50">
          {user ? (
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                aria-hidden="true"
              >
                {user.name?.[0] || user.username?.[0] || 'A'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white truncate">{user.name || user.username}</div>
                <div className="text-xs text-slate-400 capitalize">{user.role}</div>
              </div>
              <button
                onClick={handleLogout}
                className="text-slate-400 hover:text-red-400 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg"
                aria-label={`Logout ${user.name || user.username}`}
              >
                <LogOut size={16} aria-hidden="true" />
              </button>
            </div>
          ) : (
          <NavLink to="/login" className="btn-primary w-full text-center text-sm block">
              Admin Login
            </NavLink>
          )}
        </div>
      </aside>
    </>
  );
}
