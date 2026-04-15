import React, { useState, useCallback, useMemo } from 'react';
import { Navigation, ArrowRight, Star, Clock, Users, Loader } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { usePageTitle } from '../hooks/usePageTitle';

const ZONES_LIST = [
  { id: 'north-stand',   name: 'North Stand' },
  { id: 'south-stand',   name: 'South Stand' },
  { id: 'east-stand',    name: 'East Stand' },
  { id: 'west-stand',    name: 'West Stand' },
  { id: 'gate-a',        name: 'Gate A (North)' },
  { id: 'gate-b',        name: 'Gate B (East)' },
  { id: 'gate-c',        name: 'Gate C (South)' },
  { id: 'gate-d',        name: 'Gate D (West)' },
  { id: 'food-court-1',  name: 'Food Court 1 (NW)' },
  { id: 'food-court-2',  name: 'Food Court 2 (NE)' },
  { id: 'food-court-3',  name: 'Food Court 3 (SW)' },
  { id: 'food-court-4',  name: 'Food Court 4 (SE)' },
  { id: 'restroom-1',    name: 'Restroom NW' },
  { id: 'restroom-2',    name: 'Restroom NE' },
  { id: 'restroom-3',    name: 'Restroom SW' },
  { id: 'restroom-4',    name: 'Restroom SE' },
  { id: 'vip-lounge',    name: 'VIP Lounge' },
  { id: 'medical-center',name: 'Medical Center' },
  { id: 'parking-north', name: 'Parking North' },
  { id: 'parking-south', name: 'Parking South' },
];

const RISK_COLORS = { critical: 'text-red-400', high: 'text-orange-400', medium: 'text-yellow-400', low: 'text-emerald-400' };
const RISK_ICONS  = { critical: '✕', high: '■', medium: '▲', low: '●' };

function RouteScoreBadge({ score }) {
  const color = score >= 80 ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' :
                score >= 60 ? 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30' :
                              'text-red-400 bg-red-500/10 border-red-500/30';
  return (
    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-semibold ${color}`} aria-label={`Route score: ${score} out of 100`}>
      <Star size={14} aria-hidden="true" />
      Route Score: {score}/100
    </div>
  );
}

const RouteVisualizer = React.memo(function RouteVisualizer({ route }) {
  if (!route || route.length === 0) return null;
  return (
    <div className="relative">
      <svg
        viewBox="0 0 560 420"
        className="w-full rounded-lg"
        style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }}
        role="img"
        aria-label={`Route visualization from ${route[0]?.name} to ${route[route.length-1]?.name} with ${route.length} steps`}
      >
        <title>Route Visualization</title>
        <ellipse cx="280" cy="210" rx="240" ry="180" fill="none" stroke="#334155" strokeWidth="1.5" strokeDasharray="6,3" aria-hidden="true" />
        <ellipse cx="280" cy="210" rx="100" ry="75" fill="#0d2818" stroke="#166534" strokeWidth="1" aria-hidden="true" />
        <text x="280" y="215" textAnchor="middle" fill="#166534" fontSize="11" aria-hidden="true">FIELD</text>

        {route.map((zone, i) => {
          if (i === 0) return null;
          const prev = route[i - 1];
          return (
            <line key={i} x1={prev.x*5.6} y1={prev.y*4.2} x2={zone.x*5.6} y2={zone.y*4.2}
              stroke="#3b82f6" strokeWidth="2.5" strokeDasharray="6,3" opacity="0.8" aria-hidden="true" />
          );
        })}

        {route.map((zone, i) => {
          const isStart = i === 0;
          const isEnd   = i === route.length - 1;
          const cx = zone.x * 5.6;
          const cy = zone.y * 4.2;
          return (
            <g key={zone.id} aria-hidden="true">
              <circle cx={cx} cy={cy} r={isStart || isEnd ? 14 : 10}
                fill={isStart ? '#22c55e' : isEnd ? '#3b82f6' : '#1e40af'}
                stroke={isStart ? '#86efac' : isEnd ? '#93c5fd' : '#3b82f6'}
                strokeWidth="2"
              />
              <text x={cx} y={cy+1} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="9" fontWeight="700">
                {isStart ? 'S' : isEnd ? 'E' : i}
              </text>
              <text x={cx} y={cy+20} textAnchor="middle" fill="#94a3b8" fontSize="7">
                {zone.name?.split(' ').slice(0, 2).join(' ')}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
});

export default function NavigationPage() {
  const [from, setFrom] = useState('gate-a');
  const [to, setTo] = useState('north-stand');
  const [preference, setPreference] = useState('balanced');
  const [route, setRoute] = useState(null);
  const [loading, setLoading] = useState(false);
  usePageTitle('Smart Navigation');

  const findRoute = useCallback(async () => {
    if (from === to) { toast.error('Origin and destination must be different'); return; }
    setLoading(true);
    try {
      const res = await axios.post('/api/navigation/route', { from, to, preference });
      setRoute(res.data);
    } catch {
      const fromZone = ZONES_LIST.find(z => z.id === from);
      const toZone   = ZONES_LIST.find(z => z.id === to);
      setRoute({
        route: [
          { id: from, name: fromZone?.name, x: 50, y: 2,  density: 0.3,  riskLevel: 'low',    waitTime: 5 },
          { id: 'food-court-1', name: 'Food Court 1', x: 25, y: 25, density: 0.45, riskLevel: 'medium', waitTime: 8 },
          { id: to,   name: toZone?.name,   x: 50, y: 10, density: 0.25, riskLevel: 'low',    waitTime: 3 }
        ],
        totalSteps: 3, estimatedTime: 8, totalWaitTime: 16,
        avgCrowdDensity: '0.333', routeScore: 78, preference
      });
      toast('Using simulated route (backend offline)', { icon: '⚠️' });
    } finally {
      setLoading(false);
    }
  }, [from, to, preference]);

  const statsItems = useMemo(() => route ? [
    { icon: Clock,      label: 'Est. Time',   value: `${route.estimatedTime} min` },
    { icon: Users,      label: 'Avg Density', value: `${(parseFloat(route.avgCrowdDensity)*100).toFixed(0)}%` },
    { icon: Navigation, label: 'Steps',       value: route.totalSteps },
    { icon: Clock,      label: 'Total Wait',  value: `${route.totalWaitTime} min` },
  ] : [], [route]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white">Smart Navigation</h1>
        <p className="text-slate-400 text-sm">AI-powered pathfinding using Dijkstra's algorithm</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Route planner */}
        <div className="space-y-4">
          <section className="glass p-5 space-y-4" aria-label="Route planner">
            <h2 className="font-semibold text-white">Plan Your Route</h2>

            <div>
              <label htmlFor="from-select" className="text-xs text-slate-400 mb-1.5 block">From</label>
              <select
                id="from-select"
                value={from}
                onChange={e => setFrom(e.target.value)}
                className="input w-full"
                aria-label="Select starting location"
              >
                {ZONES_LIST.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
              </select>
            </div>

            <div className="flex justify-center" aria-hidden="true">
              <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
                <ArrowRight size={14} className="text-blue-400" />
              </div>
            </div>

            <div>
              <label htmlFor="to-select" className="text-xs text-slate-400 mb-1.5 block">To</label>
              <select
                id="to-select"
                value={to}
                onChange={e => setTo(e.target.value)}
                className="input w-full"
                aria-label="Select destination"
              >
                {ZONES_LIST.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
              </select>
            </div>

            <fieldset>
              <legend className="text-xs text-slate-400 mb-1.5 block">Route Preference</legend>
              <div className="grid grid-cols-3 gap-2" role="group" aria-label="Route preference">
                {['fastest', 'least_crowded', 'balanced'].map(p => (
                  <button
                    key={p}
                    onClick={() => setPreference(p)}
                    aria-pressed={preference === p}
                    className={`text-xs py-2 px-2 rounded-lg border transition-all min-h-[44px] ${
                      preference === p
                        ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                        : 'border-slate-700 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    {p === 'least_crowded' ? 'Least Crowd' : p.charAt(0).toUpperCase() + p.slice(1)}
                  </button>
                ))}
              </div>
            </fieldset>

            <button
              onClick={findRoute}
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2"
              aria-busy={loading}
            >
              {loading ? <Loader size={16} className="animate-spin" aria-hidden="true" /> : <Navigation size={16} aria-hidden="true" />}
              {loading ? 'Computing route...' : 'Find Best Route'}
            </button>
          </section>

          {/* Route stats */}
          {route && (
            <section className="glass p-5 space-y-3 animate-slide-up" aria-label="Route details" aria-live="polite">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-white text-sm">Route Details</h3>
                <RouteScoreBadge score={route.routeScore} />
              </div>

              <dl className="space-y-2">
                {statsItems.map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-center justify-between text-sm">
                    <dt className="flex items-center gap-2 text-slate-400">
                      <Icon size={14} aria-hidden="true" />
                      {label}
                    </dt>
                    <dd className="text-white font-medium">{value}</dd>
                  </div>
                ))}
              </dl>

              {/* Step-by-step */}
              <div className="pt-3 border-t border-slate-700/50">
                <p className="text-xs text-slate-400 mb-2" id="steps-label">Step-by-step directions</p>
                <ol className="space-y-1.5" aria-labelledby="steps-label">
                  {route.route.map((step, i) => (
                    <li key={i} className="flex items-center gap-2 text-xs">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                        i === 0                       ? 'bg-emerald-500/20 text-emerald-400' :
                        i === route.route.length - 1  ? 'bg-blue-500/20 text-blue-400' :
                                                        'bg-slate-700 text-slate-400'
                      }`} aria-hidden="true">{i + 1}</div>
                      <span className="text-slate-300 flex-1">{step.name}</span>
                      <span className={`text-xs ${RISK_COLORS[step.riskLevel] || 'text-emerald-400'}`}>
                        <span aria-hidden="true">{RISK_ICONS[step.riskLevel]} </span>
                        {(step.density * 100).toFixed(0)}%
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            </section>
          )}
        </div>

        {/* Map visualization */}
        <section className="lg:col-span-2 glass p-4" aria-label="Route map visualization">
          <h2 className="font-semibold text-white mb-4">Route Visualization</h2>
          {route ? (
            <RouteVisualizer route={route.route} />
          ) : (
            <div className="flex items-center justify-center h-80 text-slate-500 text-sm" role="status">
              <div className="text-center">
                <Navigation size={40} className="mx-auto mb-3 text-slate-700" aria-hidden="true" />
                <p>Select origin and destination to visualize route</p>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
