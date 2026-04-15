import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { Clock, TrendingUp, TrendingDown, Star, RefreshCw, Loader } from 'lucide-react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';
import { logAnalyticsEvent } from '../config/firebase';
import { usePageTitle } from '../hooks/usePageTitle';

const STATUS_CONFIG = {
  short:    { color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30', label: 'Short',     icon: '●' },
  moderate: { color: 'text-yellow-400',  bg: 'bg-yellow-500/10 border-yellow-500/30',   label: 'Moderate',  icon: '▲' },
  long:     { color: 'text-orange-400',  bg: 'bg-orange-500/10 border-orange-500/30',   label: 'Long',      icon: '■' },
  very_long:{ color: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/30',         label: 'Very Long', icon: '✕' },
};

const QueueCard = React.memo(function QueueCard({ queue, isBest }) {
  const status = STATUS_CONFIG[queue.status] || STATUS_CONFIG.short;
  const trend = queue.predictedWait > queue.currentWait + 2 ? 'up' :
                queue.predictedWait < queue.currentWait - 2 ? 'down' : 'stable';

  const trendLabel = trend === 'up' ? 'increasing' : trend === 'down' ? 'decreasing' : 'stable';

  return (
    <article
      className={`glass p-4 transition-all duration-300 ${isBest ? 'ring-1 ring-emerald-500/50' : ''}`}
      aria-label={`${queue.name}: ${queue.currentWait} minute wait, ${status.label} queue, trend ${trendLabel}${isBest ? ', best option' : ''}`}
    >
      {isBest && (
        <div className="flex items-center gap-1 text-xs text-emerald-400 mb-2" aria-label="Recommended option">
          <Star size={12} aria-hidden="true" /> Best Option
        </div>
      )}
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-medium text-white text-sm">{queue.name}</h3>
        <span className={`text-xs px-2 py-0.5 rounded-full border ${status.bg} ${status.color}`}>
          <span aria-hidden="true">{status.icon} </span>{status.label}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="bg-slate-800/50 rounded-lg p-2.5 text-center">
          <div className="text-lg font-bold text-white" aria-label={`Current wait: ${queue.currentWait} minutes`}>
            {queue.currentWait}m
          </div>
          <div className="text-xs text-slate-400">Current Wait</div>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-2.5 text-center">
          <div
            className={`text-lg font-bold flex items-center justify-center gap-1 ${
              trend === 'up' ? 'text-red-400' : trend === 'down' ? 'text-emerald-400' : 'text-slate-300'
            }`}
            aria-label={`Predicted wait in 15 minutes: ${queue.predictedWait} minutes, ${trendLabel}`}
          >
            {trend === 'up'   && <TrendingUp   size={14} aria-hidden="true" />}
            {trend === 'down' && <TrendingDown size={14} aria-hidden="true" />}
            {queue.predictedWait}m
          </div>
          <div className="text-xs text-slate-400">Predicted (15m)</div>
        </div>
      </div>

      <div>
        <div className="flex justify-between text-xs text-slate-500 mb-1">
          <span id={`queue-len-${queue.id}`}>Queue Length</span>
          <span>{queue.queueLength} people</span>
        </div>
        <div
          className="h-1.5 bg-slate-700 rounded-full overflow-hidden"
          role="progressbar"
          aria-valuenow={Math.round(queue.density * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-labelledby={`queue-len-${queue.id}`}
        >
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${queue.density * 100}%`,
              background: queue.density > 0.7 ? '#ef4444' : queue.density > 0.5 ? '#eab308' : '#22c55e'
            }}
          />
        </div>
      </div>
    </article>
  );
});

const TABS = [
  { id: 'gates',    label: 'Entry Gates', icon: '🚪' },
  { id: 'food',     label: 'Food Courts', icon: '🍔' },
  { id: 'restrooms',label: 'Restrooms',   icon: '🚻' },
];

export default function QueuePage() {
  const [queues, setQueues] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('gates');
  const [refreshing, setRefreshing] = useState(false);
  const abortRef = useRef(null);
  usePageTitle('Queue Predictor');

  const fetchQueues = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    // Abort previous request
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    try {
      const res = await axios.get('/api/queue/all', { signal: abortRef.current.signal });
      setQueues(res.data.queues);
      logAnalyticsEvent('queue_viewed', { tab: activeTab });
    } catch (err) {
      if (axios.isCancel(err)) return;
      const sim = (names, baseWait) => names.map((name, i) => ({
        id: `sim-${i}`, name,
        currentWait:   baseWait + Math.floor(Math.random() * 10),
        predictedWait: baseWait + Math.floor(Math.random() * 15),
        density:       Math.random() * 0.7 + 0.1,
        queueLength:   Math.floor(Math.random() * 80) + 10,
        status:        ['short','moderate','long','very_long'][Math.floor(Math.random() * 4)],
        riskLevel:     'medium'
      }));
      setQueues({
        gates:    sim(['Gate A','Gate B','Gate C','Gate D'], 8),
        food:     sim(['Food Court 1','Food Court 2','Food Court 3','Food Court 4'], 12),
        restrooms:sim(['Restroom NW','Restroom NE','Restroom SW','Restroom SE'], 4),
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab]);

  useEffect(() => { fetchQueues(); }, []);

  // Auto-refresh every 10s with cleanup
  useEffect(() => {
    const interval = setInterval(() => fetchQueues(true), 10000);
    return () => {
      clearInterval(interval);
      if (abortRef.current) abortRef.current.abort();
    };
  }, [fetchQueues]);

  const currentQueues = useMemo(() => queues?.[activeTab] || [], [queues, activeTab]);
  const bestOption    = useMemo(() =>
    currentQueues.reduce((min, q) => !min || q.currentWait < min.currentWait ? q : min, null),
    [currentQueues]
  );
  const chartData = useMemo(() =>
    currentQueues.map(q => ({
      name:      q.name?.split(' ').slice(-1)[0] || q.name,
      current:   q.currentWait,
      predicted: q.predictedWait
    })),
    [currentQueues]
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Queue Predictor</h1>
          <p className="text-slate-400 text-sm">AI-powered wait time estimation</p>
        </div>
        <button
          onClick={() => fetchQueues(true)}
          disabled={refreshing}
          className="btn-ghost flex items-center gap-2 text-sm"
          aria-label="Refresh queue data"
          aria-busy={refreshing}
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} aria-hidden="true" />
          Refresh
        </button>
      </div>

      {/* Tabs — keyboard navigable */}
      <div role="tablist" aria-label="Queue categories" className="flex gap-2">
        {TABS.map(tab => (
          <button
            key={tab.id}
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={activeTab === tab.id}
            aria-controls={`tabpanel-${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
            onKeyDown={(e) => {
              const idx = TABS.findIndex(t => t.id === tab.id);
              if (e.key === 'ArrowRight') setActiveTab(TABS[(idx + 1) % TABS.length].id);
              if (e.key === 'ArrowLeft')  setActiveTab(TABS[(idx - 1 + TABS.length) % TABS.length].id);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all min-h-[44px] ${
              activeTab === tab.id
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span aria-hidden="true">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4" aria-busy="true" aria-label="Loading queue data">
          {Array(4).fill(0).map((_, i) => (
            <div key={i} className="skeleton h-44 rounded-xl" aria-hidden="true" />
          ))}
        </div>
      ) : (
        <div
          role="tabpanel"
          id={`tabpanel-${activeTab}`}
          aria-labelledby={`tab-${activeTab}`}
          className="space-y-6"
        >
          {/* Queue cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {currentQueues.map(queue => (
              <QueueCard key={queue.id} queue={queue} isBest={queue.id === bestOption?.id} />
            ))}
          </div>

          {/* Chart */}
          <section className="glass p-5" aria-label="Wait time comparison chart">
            <h2 className="font-semibold text-white mb-4">Wait Time Comparison</h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} barGap={4} aria-label="Bar chart comparing current and predicted wait times">
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} unit="m" />
                <Tooltip
                  contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#f1f5f9' }}
                  formatter={(v, name) => [`${v} min`, name]}
                />
                <Legend wrapperStyle={{ color: '#64748b', fontSize: '11px' }} />
                <Bar dataKey="current" name="Current Wait" radius={[4,4,0,0]} fill="#3b82f6">
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.current > 20 ? '#ef4444' : entry.current > 12 ? '#eab308' : '#22c55e'} />
                  ))}
                </Bar>
                <Bar dataKey="predicted" name="Predicted (15m)" radius={[4,4,0,0]} fill="#6366f1" opacity={0.6} />
              </BarChart>
            </ResponsiveContainer>
          </section>
        </div>
      )}
    </div>
  );
}
