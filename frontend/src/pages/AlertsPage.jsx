import React, { useEffect, useState, useMemo } from 'react';
import { AlertTriangle, Bell, CheckCircle, Siren, Info, RefreshCw } from 'lucide-react';
import axios from 'axios';
import { useAppStore } from '../store/appStore';
import toast from 'react-hot-toast';
import { usePageTitle } from '../hooks/usePageTitle';

const ALERT_CONFIG = {
  info:       { icon: Info,          color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/20',   label: 'Info' },
  warning:    { icon: AlertTriangle, color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20', label: 'Warning' },
  critical:   { icon: Siren,         color: 'text-red-400',    bg: 'bg-red-500/10 border-red-500/20',     label: 'Critical' },
  evacuation: { icon: Siren,         color: 'text-red-300',    bg: 'bg-red-600/20 border-red-500/40',     label: 'EVACUATION' },
};

function AlertCard({ alert, onAcknowledge }) {
  const config = ALERT_CONFIG[alert.type] || ALERT_CONFIG.info;
  const Icon = config.icon;
  const isUrgent = alert.type === 'critical' || alert.type === 'evacuation';

  return (
    <article
      className={`glass border ${config.bg} p-4 animate-slide-up ${isUrgent ? 'animate-pulse-slow' : ''}`}
      aria-label={`${config.label} alert: ${alert.title}`}
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${config.bg} flex-shrink-0`} aria-hidden="true">
          <Icon size={18} className={config.color} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-sm font-semibold ${config.color}`}>{alert.title}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full border ${config.bg} ${config.color}`}>
              {config.label}
            </span>
            {alert.acknowledged && (
              <span className="text-xs text-emerald-400 flex items-center gap-1">
                <CheckCircle size={12} aria-hidden="true" /> Acknowledged
              </span>
            )}
          </div>
          <p className="text-slate-300 text-sm mt-1">{alert.message}</p>
          <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
            <time dateTime={alert.timestamp}>{new Date(alert.timestamp).toLocaleString()}</time>
            {alert.zoneName && <span>Zone: {alert.zoneName}</span>}
            {alert.createdBy && <span>By: {alert.createdBy}</span>}
          </div>
          {alert.safeZones && (
            <div className="mt-2 flex flex-wrap gap-1" aria-label="Safe exit zones">
              <span className="text-xs text-slate-400">Safe exits:</span>
              {alert.safeZones.map(z => (
                <span key={z} className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">{z}</span>
              ))}
            </div>
          )}
        </div>
        {!alert.acknowledged && (
          <button
            onClick={() => onAcknowledge(alert.id)}
            className="text-xs text-slate-400 hover:text-emerald-400 transition-colors flex-shrink-0 border border-slate-700 hover:border-emerald-500/50 px-2 py-1 rounded min-h-[44px]"
            aria-label={`Acknowledge alert: ${alert.title}`}
          >
            Ack
          </button>
        )}
      </div>
    </article>
  );
}

export default function AlertsPage() {
  const { alerts: wsAlerts, token } = useAppStore();
  const [alerts, setAlerts] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  usePageTitle('Alert Center');

  const fetchAlerts = async () => {
    try {
      const res = await axios.get('/api/alerts');
      setAlerts(res.data.alerts);
    } catch {
      setAlerts(wsAlerts);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAlerts(); }, []);
  useEffect(() => {
    if (wsAlerts.length > 0) {
      setAlerts(prev => {
        const ids = new Set(prev.map(a => a.id));
        const newOnes = wsAlerts.filter(a => !ids.has(a.id));
        return [...newOnes, ...prev].slice(0, 50);
      });
    }
  }, [wsAlerts]);

  const acknowledge = async (id) => {
    try {
      await axios.patch(`/api/alerts/${id}/acknowledge`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, acknowledged: true } : a));
      toast.success('Alert acknowledged');
    } catch {
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, acknowledged: true } : a));
    }
  };

  const filtered = useMemo(() => alerts.filter(a => {
    if (filter === 'active')   return !a.acknowledged;
    if (filter === 'critical') return a.type === 'critical' || a.type === 'evacuation';
    return true;
  }), [alerts, filter]);

  const activeCount   = useMemo(() => alerts.filter(a => !a.acknowledged).length, [alerts]);
  const criticalCount = useMemo(() => alerts.filter(a => (a.type === 'critical' || a.type === 'evacuation') && !a.acknowledged).length, [alerts]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Live region for new critical alerts */}
      <div aria-live="assertive" aria-atomic="true" className="sr-only">
        {criticalCount > 0 && `${criticalCount} critical alert${criticalCount > 1 ? 's' : ''} require attention`}
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Alert Center</h1>
          <p className="text-slate-400 text-sm">Real-time safety and crowd alerts</p>
        </div>
        <button onClick={fetchAlerts} className="btn-ghost flex items-center gap-2 text-sm" aria-label="Refresh alerts">
          <RefreshCw size={14} aria-hidden="true" />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4" role="region" aria-label="Alert statistics">
        {[
          { label: 'Total Alerts', value: alerts.length,  color: 'text-slate-300' },
          { label: 'Active',       value: activeCount,    color: 'text-yellow-400' },
          { label: 'Critical',     value: criticalCount,  color: 'text-red-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="glass p-4 text-center">
            <div className={`text-2xl font-bold ${color}`} aria-label={`${value} ${label}`}>{value}</div>
            <div className="text-xs text-slate-400 mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div role="group" aria-label="Filter alerts" className="flex gap-2">
        {['all', 'active', 'critical'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            aria-pressed={filter === f}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all capitalize min-h-[44px] ${
              filter === f ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Alert list */}
      <div className="space-y-3" role="feed" aria-label={`${filtered.length} ${filter} alerts`} aria-busy={loading}>
        {loading ? (
          Array(4).fill(0).map((_, i) => (
            <div key={i} className="skeleton h-24 rounded-xl" aria-hidden="true" />
          ))
        ) : filtered.length > 0 ? (
          filtered.map((alert, i) => (
            <AlertCard key={alert.id || i} alert={alert} onAcknowledge={acknowledge} />
          ))
        ) : (
          <div className="glass p-12 text-center" role="status">
            <Bell size={40} className="mx-auto mb-3 text-slate-700" aria-hidden="true" />
            <p className="text-slate-400">No {filter !== 'all' ? filter : ''} alerts</p>
          </div>
        )}
      </div>
    </div>
  );
}
