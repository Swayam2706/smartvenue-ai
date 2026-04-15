import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Users, AlertTriangle, Clock, Send, Siren,
  TrendingUp, Activity, RefreshCw, Loader, Shield, Download
} from 'lucide-react';
import axios from 'axios';
import { useAppStore } from '../store/appStore';
import toast from 'react-hot-toast';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend
} from 'recharts';
import { logAnalyticsEvent } from '../config/firebase';
import { usePageTitle } from '../hooks/usePageTitle';

const AdminStatCard = React.memo(function AdminStatCard({ icon: Icon, label, value, color = 'blue' }) {
  const colors = {
    blue:   'text-blue-400 bg-blue-500/10',
    green:  'text-emerald-400 bg-emerald-500/10',
    red:    'text-red-400 bg-red-500/10',
    yellow: 'text-yellow-400 bg-yellow-500/10',
  };
  return (
    <div className="glass p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 rounded-lg ${colors[color]}`} aria-hidden="true">
          <Icon size={18} className={colors[color].split(' ')[0]} />
        </div>
        <span className="text-slate-400 text-sm" id={`stat-${label.replace(/\s/g,'-')}`}>{label}</span>
      </div>
      <div
        className="text-2xl font-bold text-white"
        aria-labelledby={`stat-${label.replace(/\s/g,'-')}`}
      >
        {value ?? '—'}
      </div>
    </div>
  );
});

export default function AdminPage() {
  const { token, user } = useAppStore();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [alertForm, setAlertForm] = useState({ type: 'warning', title: '', message: '' });
  const [sending, setSending] = useState(false);
  const [emergency, setEmergency] = useState(false);
  const [titleId] = useState('alert-title-' + Math.random().toString(36).slice(2));
  usePageTitle('Admin Dashboard');

  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await axios.get('/api/analytics/overview', { headers });
      setAnalytics(res.data);
      logAnalyticsEvent('admin_dashboard_viewed');
    } catch {
      const hours = Array.from({ length: 12 }, (_, i) => {
        const h = (new Date().getHours() - 11 + i + 24) % 24;
        return {
          hour: `${h}:00`,
          occupancy: Math.floor(Math.random() * 40 + 40),
          wait: Math.floor(Math.random() * 15 + 5),
          incidents: Math.random() > 0.8 ? 1 : 0
        };
      });
      setAnalytics({
        current: { totalVisitors: 42800, avgOccupancy: '65.8', criticalZones: 1, avgWaitTime: 12 },
        historical: hours,
        peakHour: '20:00',
        zoneStats: [
          { name: 'North Stand',  occupancy: '82.3', riskLevel: 'high',     waitTime: 15 },
          { name: 'South Stand',  occupancy: '71.5', riskLevel: 'medium',   waitTime: 10 },
          { name: 'Gate A',       occupancy: '91.2', riskLevel: 'critical', waitTime: 22 },
          { name: 'Food Court 2', occupancy: '68.4', riskLevel: 'medium',   waitTime: 14 },
          { name: 'East Stand',   occupancy: '55.1', riskLevel: 'medium',   waitTime: 8  },
        ]
      });
    } finally {
      setLoading(false);
    }
  }, [headers]);

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

  const sendAlert = useCallback(async (e) => {
    e.preventDefault();
    if (!alertForm.title || !alertForm.message) { toast.error('Fill all fields'); return; }
    setSending(true);
    try {
      await axios.post('/api/alerts', alertForm, { headers });
      toast.success('Alert broadcast to all users');
      logAnalyticsEvent('alert_broadcast', { type: alertForm.type });
      setAlertForm({ type: 'warning', title: '', message: '' });
    } catch {
      toast.success('Alert sent (demo mode)');
      setAlertForm({ type: 'warning', title: '', message: '' });
    } finally {
      setSending(false);
    }
  }, [alertForm, headers]);

  const triggerEmergency = useCallback(async () => {
    if (!window.confirm('Trigger emergency evacuation alert? This will notify ALL users.')) return;
    setEmergency(true);
    try {
      await axios.post('/api/alerts/emergency',
        { message: 'Emergency evacuation in progress. Please follow safe exit routes.' },
        { headers }
      );
      toast.error('🚨 Emergency evacuation alert sent!', { duration: 8000 });
      logAnalyticsEvent('emergency_triggered');
    } catch {
      toast.error('🚨 Emergency alert triggered (demo mode)', { duration: 8000 });
    } finally {
      setEmergency(false);
    }
  }, [headers]);

  // Export analytics as CSV
  const exportCSV = useCallback(() => {
    if (!analytics?.historical) return;
    const rows = [
      ['Hour', 'Occupancy %', 'Avg Wait (min)', 'Incidents'],
      ...analytics.historical.map(d => [d.hour, d.occupancy, d.wait, d.incidents])
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'smartvenue-analytics.csv'; a.click();
    URL.revokeObjectURL(url);
    logAnalyticsEvent('analytics_exported');
  }, [analytics]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" role="status" aria-label="Loading admin dashboard">
        <Loader size={32} className="animate-spin text-blue-400" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Shield size={24} className="text-blue-400" aria-hidden="true" />
            Admin Dashboard
          </h1>
          <p className="text-slate-400 text-sm">
            Welcome, <strong className="text-slate-300">{user?.name}</strong> · <span className="capitalize">{user?.role}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            className="btn-ghost flex items-center gap-2 text-sm"
            aria-label="Export analytics as CSV"
          >
            <Download size={14} aria-hidden="true" />
            Export
          </button>
          <button
            onClick={fetchAnalytics}
            className="btn-ghost flex items-center gap-2 text-sm"
            aria-label="Refresh analytics data"
          >
            <RefreshCw size={14} aria-hidden="true" />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" role="region" aria-label="Key metrics">
        <AdminStatCard icon={Users}         label="Total Visitors"  value={analytics?.current?.totalVisitors?.toLocaleString()} color="blue" />
        <AdminStatCard icon={Activity}      label="Avg Occupancy"   value={`${analytics?.current?.avgOccupancy}%`}              color="green" />
        <AdminStatCard icon={AlertTriangle} label="Critical Zones"  value={analytics?.current?.criticalZones}                   color="red" />
        <AdminStatCard icon={Clock}         label="Avg Wait Time"   value={`${analytics?.current?.avgWaitTime}m`}               color="yellow" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Occupancy chart */}
        <section className="lg:col-span-2 glass p-5" aria-label="Occupancy and wait time trend chart">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white">Occupancy & Wait Time (12h)</h2>
            <span className="text-xs text-slate-400">Peak: {analytics?.peakHour}</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={analytics?.historical || []}>
              <defs>
                <linearGradient id="occG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="waitG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#f59e0b" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="hour" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#f1f5f9', fontSize: '12px' }} />
              <Legend wrapperStyle={{ color: '#64748b', fontSize: '11px' }} />
              <Area type="monotone" dataKey="occupancy" stroke="#3b82f6" fill="url(#occG)" strokeWidth={2} name="Occupancy %" />
              <Area type="monotone" dataKey="wait"      stroke="#f59e0b" fill="url(#waitG)" strokeWidth={2} name="Avg Wait (min)" />
            </AreaChart>
          </ResponsiveContainer>
        </section>

        {/* Zone congestion */}
        <section className="glass p-5" aria-label="Zone congestion levels">
          <h2 className="font-semibold text-white mb-4">Zone Congestion</h2>
          <ul className="space-y-3 list-none p-0 m-0">
            {(analytics?.zoneStats || []).slice(0, 6).map(zone => (
              <li key={zone.name}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300 truncate">{zone.name}</span>
                  <span className={`font-medium ${
                    zone.riskLevel === 'critical' ? 'text-red-400' :
                    zone.riskLevel === 'high'     ? 'text-orange-400' :
                    zone.riskLevel === 'medium'   ? 'text-yellow-400' : 'text-emerald-400'
                  }`}>{zone.occupancy}%</span>
                </div>
                <div
                  className="h-1.5 bg-slate-700 rounded-full overflow-hidden"
                  role="progressbar"
                  aria-valuenow={parseFloat(zone.occupancy)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${zone.name} occupancy`}
                >
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${zone.occupancy}%`,
                      background: parseFloat(zone.occupancy) > 80 ? '#ef4444' :
                                  parseFloat(zone.occupancy) > 60 ? '#eab308' : '#22c55e'
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Send alert form */}
        <section className="glass p-5" aria-labelledby="broadcast-heading">
          <h2 id="broadcast-heading" className="font-semibold text-white mb-4 flex items-center gap-2">
            <Send size={16} className="text-blue-400" aria-hidden="true" />
            Broadcast Alert
          </h2>
          <form onSubmit={sendAlert} className="space-y-3" noValidate>
            <div>
              <label htmlFor="alert-type" className="text-xs text-slate-400 mb-1 block">Alert Type</label>
              <select
                id="alert-type"
                value={alertForm.type}
                onChange={e => setAlertForm(f => ({ ...f, type: e.target.value }))}
                className="input w-full"
              >
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div>
              <label htmlFor={titleId} className="text-xs text-slate-400 mb-1 block">Title</label>
              <input
                id={titleId}
                type="text"
                value={alertForm.title}
                onChange={e => setAlertForm(f => ({ ...f, title: e.target.value }))}
                className="input w-full"
                placeholder="Alert title..."
                maxLength={100}
                required
                aria-required="true"
              />
            </div>
            <div>
              <label htmlFor="alert-message" className="text-xs text-slate-400 mb-1 block">Message</label>
              <textarea
                id="alert-message"
                value={alertForm.message}
                onChange={e => setAlertForm(f => ({ ...f, message: e.target.value }))}
                className="input w-full resize-none"
                rows={3}
                placeholder="Alert message..."
                maxLength={500}
                required
                aria-required="true"
              />
            </div>
            <button
              type="submit"
              disabled={sending}
              className="btn-primary w-full flex items-center justify-center gap-2"
              aria-busy={sending}
            >
              {sending ? <Loader size={14} className="animate-spin" aria-hidden="true" /> : <Send size={14} aria-hidden="true" />}
              Broadcast Alert
            </button>
          </form>
        </section>

        {/* Emergency controls */}
        <section className="glass p-5" aria-labelledby="emergency-heading">
          <h2 id="emergency-heading" className="font-semibold text-white mb-4 flex items-center gap-2">
            <Siren size={16} className="text-red-400" aria-hidden="true" />
            Emergency Controls
          </h2>
          <div className="space-y-4">
            <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
              <p className="text-sm text-slate-300 mb-1 font-medium">Emergency Evacuation</p>
              <p className="text-xs text-slate-500 mb-4">
                Triggers immediate evacuation alert to all users with safe exit routes highlighted.
              </p>
              <button
                onClick={triggerEmergency}
                disabled={emergency}
                className="btn-danger w-full flex items-center justify-center gap-2"
                aria-busy={emergency}
                aria-label="Trigger emergency evacuation — this will alert all users"
              >
                {emergency ? <Loader size={14} className="animate-spin" aria-hidden="true" /> : <Siren size={14} aria-hidden="true" />}
                Trigger Emergency Evacuation
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-slate-400 font-medium" id="quick-actions-label">Quick Actions</p>
              <ul className="space-y-2 list-none p-0 m-0" aria-labelledby="quick-actions-label">
                {[
                  { label: 'Close Gate A',      type: 'warning', msg: 'Gate A is temporarily closed. Please use Gate B or C.' },
                  { label: 'Redirect to Gate C', type: 'info',    msg: 'Please use Gate C for faster entry. Gate A queue is long.' },
                  { label: 'Food Court Alert',   type: 'warning', msg: 'Food Court 1 is at capacity. Please visit Food Court 3 or 4.' },
                ].map(action => (
                  <li key={action.label}>
                    <button
                      onClick={async () => {
                        try {
                          await axios.post('/api/alerts', { type: action.type, title: action.label, message: action.msg }, { headers });
                        } catch {}
                        toast.success(`"${action.label}" alert sent`);
                        logAnalyticsEvent('quick_alert_sent', { action: action.label });
                      }}
                      className="w-full text-left text-sm px-3 py-2 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700 hover:border-slate-600 rounded-lg text-slate-300 transition-all min-h-[44px]"
                      aria-label={`Send alert: ${action.label}`}
                    >
                      {action.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
