/**
 * Unit tests — core utility functions + business logic
 * All 17 original tests + 12 new tests = 29 total
 */
import { describe, it, expect } from 'vitest';

// ─── Dijkstra pathfinding ─────────────────────────────────────────────────────
function dijkstra(graph, start, end) {
  const distances = {}, previous = {}, visited = new Set();
  const nodes = Object.keys(graph);
  nodes.forEach(n => { distances[n] = Infinity; previous[n] = null; });
  distances[start] = 0;
  while (true) {
    let current = null, minDist = Infinity;
    nodes.forEach(n => { if (!visited.has(n) && distances[n] < minDist) { minDist = distances[n]; current = n; } });
    if (!current || current === end) break;
    visited.add(current);
    Object.entries(graph[current] || {}).forEach(([neighbor, weight]) => {
      if (!visited.has(neighbor)) {
        const newDist = distances[current] + weight;
        if (newDist < distances[neighbor]) { distances[neighbor] = newDist; previous[neighbor] = current; }
      }
    });
  }
  const path = [];
  let cur = end;
  while (cur) { path.unshift(cur); cur = previous[cur]; }
  return { path: path[0] === start ? path : [], distance: distances[end] };
}

describe('Dijkstra pathfinding', () => {
  const graph = { A: { B: 1, C: 4 }, B: { A: 1, C: 2, D: 5 }, C: { A: 4, B: 2, D: 1 }, D: { B: 5, C: 1 } };

  it('finds shortest path A→D', () => {
    const r = dijkstra(graph, 'A', 'D');
    expect(r.path).toEqual(['A', 'B', 'C', 'D']);
    expect(r.distance).toBe(4);
  });
  it('returns same node for A→A', () => expect(dijkstra(graph, 'A', 'A').path).toContain('A'));
  it('handles disconnected graph', () => {
    expect(dijkstra({ A: { B: 1 }, B: { A: 1 }, C: {} }, 'A', 'C').distance).toBe(Infinity);
  });
  it('finds direct path A→B', () => {
    const r = dijkstra(graph, 'A', 'B');
    expect(r.path).toEqual(['A', 'B']);
    expect(r.distance).toBe(1);
  });
  it('handles single-node graph', () => {
    const r = dijkstra({ A: {} }, 'A', 'A');
    expect(r.path).toContain('A');
  });
});

// ─── Risk level ───────────────────────────────────────────────────────────────
function getRiskLevel(density) {
  if (density >= 0.85) return 'critical';
  if (density >= 0.7)  return 'high';
  if (density >= 0.5)  return 'medium';
  return 'low';
}

describe('getRiskLevel', () => {
  it('returns critical for density >= 0.85', () => expect(getRiskLevel(0.9)).toBe('critical'));
  it('returns high for density >= 0.7',      () => expect(getRiskLevel(0.75)).toBe('high'));
  it('returns medium for density >= 0.5',    () => expect(getRiskLevel(0.6)).toBe('medium'));
  it('returns low for density < 0.5',        () => expect(getRiskLevel(0.3)).toBe('low'));
  it('boundary: 0.85 is critical',           () => expect(getRiskLevel(0.85)).toBe('critical'));
  it('boundary: 0.7 is high',                () => expect(getRiskLevel(0.7)).toBe('high'));
  it('boundary: 0.5 is medium',              () => expect(getRiskLevel(0.5)).toBe('medium'));
  it('boundary: 0.0 is low',                 () => expect(getRiskLevel(0.0)).toBe('low'));
});

// ─── Wait time prediction ─────────────────────────────────────────────────────
function predictWaitTime(density, baseWait, timeMultiplier = 1.0) {
  return Math.max(1, Math.floor(baseWait * density * timeMultiplier));
}

describe('predictWaitTime', () => {
  it('scales with density',        () => { expect(predictWaitTime(0.5, 20)).toBe(10); expect(predictWaitTime(1.0, 20)).toBe(20); });
  it('applies time multiplier',    () => expect(predictWaitTime(0.5, 20, 1.5)).toBe(15));
  it('minimum wait is 1',          () => expect(predictWaitTime(0.01, 1)).toBe(1));
  it('peak multiplier increases',  () => expect(predictWaitTime(0.5, 20, 1.4)).toBeGreaterThan(predictWaitTime(0.5, 20, 1.0)));
});

// ─── Input validation ─────────────────────────────────────────────────────────
function validateMessage(msg) {
  if (!msg || typeof msg !== 'string') return { valid: false, error: 'Message required' };
  if (msg.trim().length === 0)         return { valid: false, error: 'Message cannot be empty' };
  if (msg.length > 500)                return { valid: false, error: 'Message too long' };
  return { valid: true };
}

describe('validateMessage', () => {
  it('accepts valid message',          () => expect(validateMessage('Hello').valid).toBe(true));
  it('rejects empty string',           () => expect(validateMessage('').valid).toBe(false));
  it('rejects null',                   () => expect(validateMessage(null).valid).toBe(false));
  it('rejects too long message',       () => expect(validateMessage('a'.repeat(501)).valid).toBe(false));
  it('rejects whitespace only',        () => expect(validateMessage('   ').valid).toBe(false));
  it('accepts exactly 500 chars',      () => expect(validateMessage('a'.repeat(500)).valid).toBe(true));
  it('rejects undefined',              () => expect(validateMessage(undefined).valid).toBe(false));
  it('rejects number type',            () => expect(validateMessage(42).valid).toBe(false));
});

// ─── Route score calculation ──────────────────────────────────────────────────
function calcRouteScore(avgDensity, totalWait) {
  return Math.max(0, Math.min(100, Math.round(100 - avgDensity * 60 - totalWait * 0.5)));
}

describe('calcRouteScore', () => {
  it('perfect route scores 100',       () => expect(calcRouteScore(0, 0)).toBe(100));
  it('high density lowers score',      () => expect(calcRouteScore(0.9, 0)).toBeLessThan(50));
  it('score never goes below 0',       () => expect(calcRouteScore(2, 1000)).toBe(0));
  it('score never exceeds 100',        () => expect(calcRouteScore(-1, -100)).toBe(100));
  it('balanced route scores mid-range',() => { const s = calcRouteScore(0.4, 10); expect(s).toBeGreaterThan(50); expect(s).toBeLessThan(90); });
});

// ─── Density color mapping ────────────────────────────────────────────────────
function getDensityLabel(density) {
  if (density >= 0.85) return 'Critical';
  if (density >= 0.7)  return 'Very High';
  if (density >= 0.5)  return 'High';
  if (density >= 0.3)  return 'Moderate';
  return 'Low';
}

describe('getDensityLabel', () => {
  it('labels critical correctly',  () => expect(getDensityLabel(0.9)).toBe('Critical'));
  it('labels very high correctly', () => expect(getDensityLabel(0.75)).toBe('Very High'));
  it('labels high correctly',      () => expect(getDensityLabel(0.6)).toBe('High'));
  it('labels moderate correctly',  () => expect(getDensityLabel(0.4)).toBe('Moderate'));
  it('labels low correctly',       () => expect(getDensityLabel(0.1)).toBe('Low'));
});
