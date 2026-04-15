import React, { useState, useMemo, useCallback, memo } from 'react';
import { RefreshCw, Info, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { usePageTitle } from '../hooks/usePageTitle';

const RISK_ICONS = { low: '●', medium: '▲', high: '■', critical: '✕' };

function getDensityColor(density) {
  if (density >= 0.85) return { bg: 'rgba(239,68,68,0.85)', border: '#ef4444', text: '#fca5a5', label: 'Critical' };
  if (density >= 0.7)  return { bg: 'rgba(249,115,22,0.75)', border: '#f97316', text: '#fdba74', label: 'Very High' };
  if (density >= 0.5)  return { bg: 'rgba(234,179,8,0.7)',   border: '#eab308', text: '#fde047', label: 'High' };
  if (density >= 0.3)  return { bg: 'rgba(34,197,94,0.6)',   border: '#22c55e', text: '#86efac', label: 'Moderate' };
  return                      { bg: 'rgba(59,130,246,0.5)',  border: '#3b82f6', text: '#93c5fd', label: 'Low' };
}

// Memoized zone node — only re-renders when its own data changes
const ZoneNode = memo(function ZoneNode({ zone, selected, onClick }) {
  const color = getDensityColor(zone.current);
  const size = zone.capacity > 1000 ? 52 : zone.capacity > 200 ? 40 : 30;
  const density = Math.round(zone.current * 100);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick(zone);
    }
  }, [zone, onClick]);

  return (
    <g
      transform={`translate(${zone.x * 5.6 - size / 2}, ${zone.y * 4.2 - size / 2})`}
      onClick={() => onClick(zone)}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`${zone.name}: ${density}% capacity, ${color.label} risk, ${zone.waitTime} minute wait`}
      aria-pressed={selected}
      style={{ cursor: 'pointer' }}
    >
      {/* Glow */}
      <circle cx={size/2} cy={size/2} r={size/2+4} fill={color.bg} opacity={0.3} style={{ filter: 'blur(4px)' }} aria-hidden="true" />
      {/* Main circle */}
      <circle
        cx={size/2} cy={size/2} r={size/2}
        fill={color.bg}
        stroke={selected ? '#fff' : color.border}
        strokeWidth={selected ? 2.5 : 1.5}
        style={{ transition: 'all 0.5s ease' }}
        aria-hidden="true"
      />
      {/* Density text */}
      <text x={size/2} y={size/2+1} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize={size > 40 ? 10 : 8} fontWeight="600" aria-hidden="true">
        {density}%
      </text>
      {/* Label */}
      <text x={size/2} y={size+10} textAnchor="middle" fill={color.text} fontSize={7} fontWeight="500" aria-hidden="true">
        {zone.name?.split(' ').slice(0, 2).join(' ')}
      </text>
    </g>
  );
});

export default function HeatmapPage() {
  const { crowdData, lastUpdate, wsConnected } = useAppStore();
  usePageTitle('Crowd Heatmap');
  const [selected, setSelected] = useState(null);
  const [showPrediction, setShowPrediction] = useState(false);

  // Memoize zones — no unnecessary re-renders
  const zones = useMemo(() => Object.values(crowdData || {}), [crowdData]);
  const sortedZones = useMemo(() => [...zones].sort((a, b) => b.current - a.current).slice(0, 5), [zones]);

  const handleZoneClick = useCallback((zone) => setSelected(zone), []);

  const getTrend = useCallback((zone) => {
    if (!zone.predictions || zone.predictions.length < 2) return 'stable';
    const future = zone.predictions[2];
    if (future > zone.current + 0.05) return 'up';
    if (future < zone.current - 0.05) return 'down';
    return 'stable';
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Crowd Heatmap</h1>
          <p className="text-slate-400 text-sm">Real-time crowd density visualization</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowPrediction(!showPrediction)}
            className={`btn-ghost text-sm ${showPrediction ? 'bg-blue-500/20 text-blue-400' : ''}`}
            aria-pressed={showPrediction}
          >
            <TrendingUp size={14} className="inline mr-1" aria-hidden="true" />
            {showPrediction ? 'Hide' : 'Show'} Predictions
          </button>
          <div
            className="flex items-center gap-2 text-xs text-slate-400"
            role="status"
            aria-live="polite"
            aria-label={`Last updated ${lastUpdate ? new Date(lastUpdate).toLocaleTimeString() : 'waiting'}`}
          >
            <RefreshCw
              size={12}
              className={wsConnected ? 'animate-spin text-emerald-400' : 'text-slate-600'}
              style={{ animationDuration: '4s' }}
              aria-hidden="true"
            />
            {lastUpdate ? new Date(lastUpdate).toLocaleTimeString() : 'Waiting...'}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* SVG Heatmap */}
        <section className="lg:col-span-3 glass p-4" aria-label="Stadium crowd density map">
          <div className="relative">
            <svg
              viewBox="0 0 560 420"
              className="w-full rounded-lg"
              style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }}
              role="img"
              aria-label={`Stadium heatmap showing ${zones.length} zones. ${zones.filter(z=>z.riskLevel==='critical').length} critical zones detected.`}
            >
              <title>Stadium Crowd Density Heatmap</title>
              <desc>Interactive map showing real-time crowd density across all stadium zones. Click any zone for details.</desc>

              {/* Stadium outline */}
              <ellipse cx="280" cy="210" rx="240" ry="180" fill="none" stroke="#334155" strokeWidth="2" strokeDasharray="8,4" aria-hidden="true" />
              <ellipse cx="280" cy="210" rx="160" ry="120" fill="none" stroke="#1e3a5f" strokeWidth="1" aria-hidden="true" />
              {/* Field */}
              <ellipse cx="280" cy="210" rx="100" ry="75" fill="#0d2818" stroke="#166534" strokeWidth="1.5" aria-hidden="true" />
              <text x="280" y="215" textAnchor="middle" fill="#166534" fontSize="12" fontWeight="600" aria-hidden="true">FIELD</text>
              {/* Compass */}
              <text x="280" y="18"  textAnchor="middle" fill="#475569" fontSize="10" aria-hidden="true">N</text>
              <text x="280" y="408" textAnchor="middle" fill="#475569" fontSize="10" aria-hidden="true">S</text>
              <text x="548" y="214" textAnchor="middle" fill="#475569" fontSize="10" aria-hidden="true">E</text>
              <text x="12"  y="214" textAnchor="middle" fill="#475569" fontSize="10" aria-hidden="true">W</text>

              {zones.map(zone => (
                <ZoneNode
                  key={zone.id}
                  zone={zone}
                  selected={selected?.id === zone.id}
                  onClick={handleZoneClick}
                />
              ))}
            </svg>

            {/* Legend */}
            <div className="absolute bottom-3 left-3 flex items-center gap-3 bg-slate-900/80 backdrop-blur px-3 py-2 rounded-lg text-xs" aria-label="Density legend">
              {[
                { color: '#3b82f6', label: 'Low',       icon: '●' },
                { color: '#22c55e', label: 'Moderate',  icon: '●' },
                { color: '#eab308', label: 'High',      icon: '▲' },
                { color: '#f97316', label: 'Very High', icon: '■' },
                { color: '#ef4444', label: 'Critical',  icon: '✕' },
              ].map(({ color, label, icon }) => (
                <div key={label} className="flex items-center gap-1">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} aria-hidden="true" />
                  <span className="text-slate-400">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Zone detail panel */}
        <div className="space-y-4">
          {selected ? (
            <section className="glass p-4 animate-slide-in-right" aria-label={`Zone details: ${selected.name}`}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-white text-sm">{selected.name}</h2>
                <button
                  onClick={() => setSelected(null)}
                  className="text-slate-500 hover:text-white text-xs min-h-[44px] min-w-[44px] flex items-center justify-center rounded"
                  aria-label="Close zone details"
                >
                  ✕
                </button>
              </div>

              {/* Density gauge */}
              <div className="mb-4">
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span id="density-label">Density</span>
                  <span aria-live="polite">{(selected.current * 100).toFixed(1)}%</span>
                </div>
                <div
                  className="h-3 bg-slate-700 rounded-full overflow-hidden"
                  role="progressbar"
                  aria-valuenow={Math.round(selected.current * 100)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-labelledby="density-label"
                >
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${selected.current * 100}%`,
                      background: `linear-gradient(90deg, #22c55e, ${selected.current > 0.7 ? '#ef4444' : '#eab308'})`
                    }}
                  />
                </div>
              </div>

              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-slate-400">Count</dt>
                  <dd className="text-white">{selected.count?.toLocaleString()} / {selected.capacity?.toLocaleString()}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-400">Wait Time</dt>
                  <dd className="text-white">{selected.waitTime} minutes</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-400">Risk Level</dt>
                  <dd className={`font-medium ${
                    selected.riskLevel === 'critical' ? 'text-red-400' :
                    selected.riskLevel === 'high'     ? 'text-orange-400' :
                    selected.riskLevel === 'medium'   ? 'text-yellow-400' : 'text-emerald-400'
                  }`}>
                    <span aria-hidden="true">{RISK_ICONS[selected.riskLevel]} </span>
                    {selected.riskLevel?.toUpperCase()}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-400">Trend</dt>
                  <dd className="flex items-center gap-1 text-white">
                    {getTrend(selected) === 'up'   ? <TrendingUp   size={14} className="text-red-400"     aria-hidden="true" /> :
                     getTrend(selected) === 'down' ? <TrendingDown size={14} className="text-emerald-400" aria-hidden="true" /> :
                                                     <Minus        size={14} className="text-slate-400"   aria-hidden="true" />}
                    {getTrend(selected)}
                  </dd>
                </div>
              </dl>

              {/* 15-min prediction */}
              {showPrediction && selected.predictions && (
                <div className="mt-4 pt-4 border-t border-slate-700/50">
                  <p className="text-xs text-slate-400 mb-2" id="prediction-label">15-min Prediction</p>
                  <div className="flex gap-1" role="group" aria-labelledby="prediction-label">
                    {selected.predictions.map((p, i) => (
                      <div
                        key={i}
                        className="flex-1 flex flex-col items-center gap-1"
                        aria-label={`+${(i+1)*3} minutes: ${Math.round(p*100)}% predicted density`}
                      >
                        <div className="w-full h-12 bg-slate-700 rounded relative overflow-hidden" role="presentation">
                          <div
                            className="absolute bottom-0 w-full rounded transition-all duration-500"
                            style={{
                              height: `${p * 100}%`,
                              background: p > 0.8 ? '#ef4444' : p > 0.6 ? '#eab308' : '#22c55e'
                            }}
                          />
                        </div>
                        <span className="text-xs text-slate-500">+{(i+1)*3}m</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          ) : (
            <div className="glass p-4 text-center text-slate-500 text-sm" role="status">
              <Info size={24} className="mx-auto mb-2 text-slate-600" aria-hidden="true" />
              <p>Click or press Enter on a zone to see details</p>
            </div>
          )}

          {/* Top congested zones */}
          <section className="glass p-4" aria-label="Most congested zones">
            <h2 className="text-sm font-semibold text-white mb-3">Most Congested</h2>
            <ul className="space-y-2" role="list">
              {sortedZones.map(zone => (
                <li key={zone.id}>
                  <button
                    onClick={() => setSelected(zone)}
                    className="w-full flex items-center gap-2 text-xs hover:bg-white/5 p-1.5 rounded transition-all min-h-[44px]"
                    aria-label={`${zone.name}: ${(zone.current*100).toFixed(0)}% density`}
                  >
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: getDensityColor(zone.current).border }}
                      aria-hidden="true"
                    />
                    <span className="text-slate-300 flex-1 text-left truncate">{zone.name}</span>
                    <span className="text-slate-400">{(zone.current * 100).toFixed(0)}%</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
