import React, { useEffect, useState, useMemo } from 'react';
import { Users, AlertTriangle, Clock, TrendingUp, Activity, Zap, Shield, Navigation } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Link } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { logAnalyticsEvent } from '../config/firebase';
import { usePageTitle } from '../hooks/usePageTitle';

// Risk level icons for colorblind accessibility
const RISK_ICONS = { low: '●', medium: '▲', high: '■', critical: '✕' };

const StatCard = React.memo(function StatCard({ icon: Icon, label, value, sub, color = 'blue', loading }) {
  const colors = {
    blue:   'from-blue-500/20 to-blue-600/10 border-blue-500/20 text-blue-400',
    green:  'from-emerald-500/20 to-emerald-600/10 border-emerald-500/20 text-emerald-400',
    yellow: 'from-yellow-500/20 to-yellow-600/10 border-yellow-500/20 text-yellow-400',
    red:    'from-red-500/20 to-red-600/10 border-red-500/20 text-red-400',
  };

  if (loading) return <div className="skeleton h-28 rounded-xl" aria-busy="true" aria-label="Loading statistic" />;

  return (
    <div className={`glass bg-gradient-to-br ${colors[color]} p-5 animate-slide-up`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-slate-400 text-sm" id={`stat-${label.replace(/\s/g,'-').toLowerCase()}`}>{label}</p>
          <p className="text-2xl font-bold text-white mt-1" aria-labelledby={`stat-${label.replace(/\s/g,'-').toLowerCase()}`}>{value}</p>
          {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
        </div>
        <div className={`p-2.5 rounded-xl bg-gradient-to-br ${colors[color]}`} aria-hidden="true">
          <Icon size={20} className={colors[color].split(' ').pop()} />
        </div>
      </div>
    </div>
  );
});

function RiskBadge({ level }) {
  const map = { low: 'badge-low', medium: 'badge-medium', high: 'badge-high', critical: 'badge-critical' };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[level] || 'badge-low'}`}>
      <span aria-hidden="true">{RISK_ICONS[level]} </span>
      {level}
    </span>
  );
}

export default function Dashboard() {
  const { crowdData, wsConnected, lastUpdate } = useAppStore();
  usePageTitle('Dashboard');

  // Use custom hook with caching — replaces raw axios calls
  const { data: summaryData, loading: summaryLoading } = useApi('/api/crowd/summary', { cacheMs: 5000 });
  const { data: trendRaw,    loading: trendLoading    } = useApi('/api/analytics/trends?hours=6', { cacheMs: 30000 });

  const summary = summaryData || null;
  const loading = summaryLoading;

  const trendData = useMemo(() => {
    if (!trendRaw?.trends) return [];
    return trendRaw.trends.map(t => ({
      time:      t.hour,
      occupancy: (t.occupancy * 100).toFixed(0),
      wait:      t.avgWaitTime
    }));
  }, [trendRaw]);

  useEffect(() => {
    logAnalyticsEvent('dashboard_viewed');
  }, []);

  // Memoize expensive computations — prevent re-sort on every render
  const zones = useMemo(() => Object.values(crowdData || {}), [crowdData]);
  const criticalZones = useMemo(() => zones.filter(z => z.riskLevel === 'critical'), [zones]);
  // Fix: use spread to avoid mutating original array
  const topZones = useMemo(() => [...zones].sort((a, b) => b.current - a.current).slice(0, 6), [zones]);

  const quickActions = useMemo(() => [
    { to: '/dashboard/heatmap',    icon: Activity,   label: 'View Heatmap',  desc: 'Live crowd density',  color: 'text-blue-400' },
    { to: '/dashboard/navigation', icon: Navigation, label: 'Get Route',     desc: 'Smart pathfinding',   color: 'text-purple-400' },
    { to: '/dashboard/queues',     icon: Clock,      label: 'Check Queues',  desc: 'Wait time predictor', color: 'text-yellow-400' },
    { to: '/dashboard/chat',       icon: Zap,        label: 'AI Assistant',  desc: 'Ask anything',        color: 'text-emerald-400' },
    { to: '/dashboard/alerts',     icon: Shield,     label: 'Alerts',        desc: `${criticalZones.length} active`, color: 'text-red-400' },
  ], [criticalZones.length]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Live region for screen readers — announces critical changes */}
      <div aria-live="assertive" aria-atomic="true" className="sr-only">
        {criticalZones.length > 0 &&
          `Critical alert: ${criticalZones.map(z => z.name).join(', ')} ${criticalZones.length === 1 ? 'is' : 'are'} critically overcrowded`
        }
      </div>

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Stadium Overview</h1>
          <p className="text-slate-400 text-sm mt-1" aria-live="polite">
            {lastUpdate ? `Last updated ${new Date(lastUpdate).toLocaleTimeString()}` : 'Connecting to live feed...'}
          </p>
        </div>
        <div
          className="flex items-center gap-2 text-xs text-slate-400"
          role="status"
          aria-label={wsConnected ? 'Live data feed active' : 'Data feed offline'}
        >
          <div className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} aria-hidden="true" />
          {wsConnected ? 'Live' : 'Offline'}
        </div>
      </div>

      {/* Emergency banner */}
      {criticalZones.length > 0 && (
        <div
          role="alert"
          aria-live="assertive"
          className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3 animate-pulse-slow"
        >
          <AlertTriangle size={20} className="text-red-400 flex-shrink-0" aria-hidden="true" />
          <div>
            <p className="text-red-400 font-semibold text-sm">Critical Alert</p>
            <p className="text-slate-300 text-xs">
              {criticalZones.map(z => z.name).join(', ')} {criticalZones.length === 1 ? 'is' : 'are'} critically overcrowded
            </p>
          </div>
          <Link to="/dashboard/alerts" className="ml-auto text-xs text-red-400 hover:text-red-300 underline">
            View alerts
          </Link>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" role="region" aria-label="Venue statistics">
        <StatCard icon={Users}         label="Total Visitors"  value={summary?.totalCount?.toLocaleString() || '—'} sub={`of ${summary?.totalCapacity?.toLocaleString() || '—'} capacity`} color="blue"   loading={loading} />
        <StatCard icon={Activity}      label="Occupancy Rate"  value={`${summary?.occupancyRate || '—'}%`}          sub="venue-wide average"                                                color="green"  loading={loading} />
        <StatCard icon={AlertTriangle} label="Critical Zones"  value={summary?.criticalZones ?? '—'}                sub={`${summary?.highRiskZones ?? '—'} high risk`}                      color={summary?.criticalZones > 0 ? 'red' : 'yellow'} loading={loading} />
        <StatCard icon={Clock}         label="Avg Wait Time"   value={`${Math.floor((summary?.avgDensity || 0) * 25)}m`} sub="across all queues"                                            color="yellow" loading={loading} />
      </div>

      {/* Charts + Quick actions */}
      <div className="grid lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 glass p-5" aria-label="Occupancy trend chart">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white">Occupancy Trend (6h)</h2>
            <TrendingUp size={16} className="text-blue-400" aria-hidden="true" />
          </div>
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={trendData} aria-label="Occupancy percentage over the last 6 hours">
                <defs>
                  <linearGradient id="occGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 100]} unit="%" />
                <Tooltip
                  contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#f1f5f9' }}
                  formatter={(v) => [`${v}%`, 'Occupancy']}
                />
                <Area type="monotone" dataKey="occupancy" stroke="#3b82f6" fill="url(#occGrad)" strokeWidth={2} name="Occupancy %" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center" aria-busy="true" aria-label="Loading chart">
              <div className="skeleton w-full h-full rounded-lg" />
            </div>
          )}
        </section>

        <nav className="glass p-5 space-y-3" aria-label="Quick navigation actions">
          <h2 className="font-semibold text-white mb-4">Quick Actions</h2>
          {quickActions.map(({ to, icon: Icon, label, desc, color }) => (
            <Link
              key={to}
              to={to}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-all group min-h-[44px]"
            >
              <Icon size={18} className={`${color} flex-shrink-0`} aria-hidden="true" />
              <div>
                <div className="text-sm font-medium text-slate-200 group-hover:text-white">{label}</div>
                <div className="text-xs text-slate-500">{desc}</div>
              </div>
              <span className="ml-auto text-slate-600 group-hover:text-slate-400" aria-hidden="true">→</span>
            </Link>
          ))}
        </nav>
      </div>

      {/* Zone status table */}
      <section className="glass p-5" aria-label="Zone congestion status">
        <h2 className="font-semibold text-white mb-4">Zone Status (Top Congested)</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" aria-label="Top congested zones">
            <thead>
              <tr className="text-slate-500 text-xs border-b border-slate-700/50">
                <th scope="col" className="text-left pb-3 font-medium">Zone</th>
                <th scope="col" className="text-left pb-3 font-medium">Density</th>
                <th scope="col" className="text-left pb-3 font-medium">Count</th>
                <th scope="col" className="text-left pb-3 font-medium">Wait</th>
                <th scope="col" className="text-left pb-3 font-medium">Risk</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/30">
              {topZones.length > 0 ? topZones.map(zone => (
                <tr key={zone.id} className="hover:bg-white/3 transition-colors">
                  <td className="py-3 text-slate-200 font-medium">{zone.name}</td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-20 h-1.5 bg-slate-700 rounded-full overflow-hidden"
                        role="progressbar"
                        aria-valuenow={Math.round(zone.current * 100)}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`${zone.name} density`}
                      >
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            zone.current > 0.8 ? 'bg-red-500' : zone.current > 0.6 ? 'bg-yellow-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${zone.current * 100}%` }}
                        />
                      </div>
                      <span className="text-slate-400 text-xs">{(zone.current * 100).toFixed(0)}%</span>
                    </div>
                  </td>
                  <td className="py-3 text-slate-400">{zone.count?.toLocaleString()}</td>
                  <td className="py-3 text-slate-400">{zone.waitTime}m</td>
                  <td className="py-3"><RiskBadge level={zone.riskLevel} /></td>
                </tr>
              )) : Array(6).fill(0).map((_, i) => (
                <tr key={i}>
                  <td colSpan={5} className="py-3">
                    <div className="skeleton h-4 rounded" aria-hidden="true" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
