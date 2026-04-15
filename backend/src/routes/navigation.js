const express = require('express');
const { body, validationResult } = require('express-validator');
const { getCurrentState, getZones } = require('../simulation/crowdSimulator');

const router = express.Router();

/**
 * Dijkstra's algorithm for pathfinding
 * Graph edges connect adjacent zones with weights based on distance + crowd density
 */

// Build adjacency graph from zones
function buildGraph(crowdState) {
  const zones = getZones();
  const graph = {};

  zones.forEach(zone => {
    graph[zone.id] = {};
  });

  // Connect zones that are "adjacent" (within distance threshold)
  for (let i = 0; i < zones.length; i++) {
    for (let j = i + 1; j < zones.length; j++) {
      const a = zones[i];
      const b = zones[j];
      const dist = Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));

      if (dist < 40) { // Connect if within 40 units
        const densityA = crowdState[a.id]?.current || 0.3;
        const densityB = crowdState[b.id]?.current || 0.3;
        // Weight = distance * (1 + crowd penalty)
        const weight = dist * (1 + (densityA + densityB) * 2);

        graph[a.id][b.id] = { weight, distance: dist, crowdFactor: (densityA + densityB) / 2 };
        graph[b.id][a.id] = { weight, distance: dist, crowdFactor: (densityA + densityB) / 2 };
      }
    }
  }

  return graph;
}

// Dijkstra's shortest path
function dijkstra(graph, start, end) {
  const distances = {};
  const previous = {};
  const visited = new Set();
  const nodes = Object.keys(graph);

  nodes.forEach(n => { distances[n] = Infinity; previous[n] = null; });
  distances[start] = 0;

  while (true) {
    // Find unvisited node with minimum distance
    let current = null;
    let minDist = Infinity;
    nodes.forEach(n => {
      if (!visited.has(n) && distances[n] < minDist) {
        minDist = distances[n];
        current = n;
      }
    });

    if (!current || current === end) break;
    visited.add(current);

    const neighbors = graph[current] || {};
    Object.entries(neighbors).forEach(([neighbor, edge]) => {
      if (!visited.has(neighbor)) {
        const newDist = distances[current] + edge.weight;
        if (newDist < distances[neighbor]) {
          distances[neighbor] = newDist;
          previous[neighbor] = current;
        }
      }
    });
  }

  // Reconstruct path
  const path = [];
  let current = end;
  while (current) {
    path.unshift(current);
    current = previous[current];
  }

  return {
    path: path[0] === start ? path : [],
    distance: distances[end],
    reachable: distances[end] !== Infinity
  };
}

// POST /api/navigation/route
router.post('/route', [
  body('from').notEmpty().withMessage('Origin required'),
  body('to').notEmpty().withMessage('Destination required'),
  body('preference').optional().isIn(['fastest', 'least_crowded', 'balanced'])
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { from, to, preference = 'balanced' } = req.body;
  const crowdState = getCurrentState();
  const zones = getZones();

  const zoneIds = zones.map(z => z.id);
  if (!zoneIds.includes(from)) return res.status(400).json({ error: 'Invalid origin zone' });
  if (!zoneIds.includes(to)) return res.status(400).json({ error: 'Invalid destination zone' });

  const graph = buildGraph(crowdState);
  const result = dijkstra(graph, from, to);

  if (!result.reachable) {
    return res.status(404).json({ error: 'No route found between these zones' });
  }

  // Build route details
  const routeDetails = result.path.map(zoneId => {
    const zone = zones.find(z => z.id === zoneId);
    const state = crowdState[zoneId];
    return {
      id: zoneId,
      name: zone?.name || zoneId,
      x: zone?.x,
      y: zone?.y,
      density: state?.current || 0,
      riskLevel: state?.riskLevel || 'low',
      waitTime: state?.waitTime || 0
    };
  });

  const totalWait = routeDetails.reduce((sum, z) => sum + z.waitTime, 0);
  const avgDensity = routeDetails.reduce((sum, z) => sum + z.density, 0) / routeDetails.length;
  const score = Math.max(0, 100 - avgDensity * 60 - totalWait * 0.5).toFixed(0);

  res.json({
    route: routeDetails,
    totalSteps: result.path.length,
    estimatedTime: Math.ceil(result.path.length * 2 + totalWait * 0.3),
    totalWaitTime: totalWait,
    avgCrowdDensity: avgDensity.toFixed(3),
    routeScore: parseInt(score),
    preference,
    timestamp: new Date().toISOString()
  });
});

// GET /api/navigation/zones - Get navigable zones list
router.get('/zones', (req, res) => {
  const zones = getZones();
  res.json({ zones: zones.map(z => ({ id: z.id, name: z.name, x: z.x, y: z.y })) });
});

module.exports = router;
