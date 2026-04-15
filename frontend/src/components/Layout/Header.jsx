import React, { useState, useRef, useEffect } from 'react';
import { Menu, Bell, Sun, Moon, Wifi, WifiOff, Activity } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { useNavigate } from 'react-router-dom';

export default function Header({ onMenuClick }) {
  const { theme, toggleTheme, wsConnected, alerts, notifications, markAllRead } = useAppStore();
  const [showNotifs, setShowNotifs] = useState(false);
  const notifRef = useRef(null);
  const navigate = useNavigate();

  const unreadCount = notifications.filter(n => !n.read).length;
  const activeAlerts = alerts.filter(a => !a.acknowledged).length;

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifs(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') setShowNotifs(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  return (
    <header className="h-16 bg-slate-900/80 backdrop-blur-xl border-b border-slate-700/50 flex items-center px-4 gap-4 flex-shrink-0">
      <button
        onClick={onMenuClick}
        className="lg:hidden text-slate-400 hover:text-white min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg"
        aria-label="Open navigation menu"
        aria-expanded={false}
      >
        <Menu size={22} aria-hidden="true" />
      </button>

      {/* Live indicator */}
      <div className="flex items-center gap-2 text-xs text-slate-400" aria-hidden="true">
        <Activity size={14} className="text-blue-400" />
        <span className="hidden sm:inline">Real-time Stadium Intelligence</span>
      </div>

      <div className="flex-1" />

      {/* Status indicators */}
      <div className="flex items-center gap-2">
        <div
          className={`hidden sm:flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ${
            wsConnected ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
          }`}
          role="status"
          aria-label={wsConnected ? 'Live data connected' : 'Connection offline'}
        >
          {wsConnected ? <Wifi size={12} aria-hidden="true" /> : <WifiOff size={12} aria-hidden="true" />}
          <span>{wsConnected ? 'Live' : 'Offline'}</span>
        </div>

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => { setShowNotifs(!showNotifs); if (!showNotifs) markAllRead(); }}
            className="relative p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label={`Notifications${activeAlerts > 0 ? `, ${activeAlerts} active alerts` : ''}`}
            aria-expanded={showNotifs}
            aria-haspopup="true"
          >
            <Bell size={18} aria-hidden="true" />
            {(unreadCount > 0 || activeAlerts > 0) && (
              <span
                className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"
                aria-hidden="true"
              />
            )}
          </button>

          {showNotifs && (
            <div
              className="absolute right-0 top-12 w-80 glass-dark shadow-2xl z-50 overflow-hidden animate-slide-up"
              role="dialog"
              aria-label="Notifications panel"
            >
              <div className="p-3 border-b border-slate-700/50 flex items-center justify-between">
                <span className="text-sm font-semibold text-white">Notifications</span>
                {activeAlerts > 0 && (
                  <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">
                    {activeAlerts} active
                  </span>
                )}
              </div>
              <div className="max-h-64 overflow-y-auto" role="list">
                {alerts.slice(0, 5).map((alert, i) => (
                  <div
                    key={i}
                    role="listitem"
                    className={`p-3 border-b border-slate-700/30 text-xs ${
                      alert.type === 'critical' || alert.type === 'evacuation' ? 'bg-red-500/5' :
                      alert.type === 'warning' ? 'bg-yellow-500/5' : ''
                    }`}
                  >
                    <div className="font-medium text-slate-200">{alert.title}</div>
                    <div className="text-slate-400 mt-0.5 line-clamp-2">{alert.message}</div>
                  </div>
                ))}
                {alerts.length === 0 && (
                  <div className="p-4 text-center text-slate-500 text-sm">No notifications</div>
                )}
              </div>
              <button
                onClick={() => { navigate('/dashboard/alerts'); setShowNotifs(false); }}
                className="w-full p-2 text-xs text-blue-400 hover:bg-white/5 transition-colors min-h-[44px]"
              >
                View all alerts →
              </button>
            </div>
          )}
        </div>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark'
            ? <Sun size={18} aria-hidden="true" />
            : <Moon size={18} aria-hidden="true" />
          }
        </button>
      </div>
    </header>
  );
}
