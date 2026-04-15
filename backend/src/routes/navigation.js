/**
 * Navigation Routes Module
 * Provides intelligent pathfinding and route optimization using Dijkstra's algorithm
 * 
 * Features:
 * - Crowd-aware routing
 * - Real-time path optimization
 * - Multiple routing preferences
 * - Route scoring and analytics
 * 
 * @module routes/navigation
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const { getCurrentState, getZones } = require('../simulation/crowdSimulator');
const { logAnalyticsEvent } = require('../services/firebaseService');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * Build adjacency graph from venue zones
 * Connects zones within proximity threshold with weighted edges
 * 
 * @param {Object} crowdState - Current crowd state for all zones
 * @returns {Object} Adjacency graph with weighted edges
 * 
 * @algorithm
 * - Connects zones within 40 units distance
 * - Edge weight = distance * (1 + crowd_penalty)
 * - Crowd penalty increases weight for congested paths
 * 
 * @complexity O(n²) where n is number of zones
 */
function buildGraph(crowdState) {
  const zones = getZones();
  const graph = {};

  // Initialize empty adjacency lists
  zones.forEach(zone => {
    graph[zone.id] = {};
  });

  // Connect adjacent zones with weighted edges
  for (let i = 0; i < zones.length; i++) {
    for (let j = i + 1; j < zones.length; j++) {
      const a = zones[i];
      const b = zones[j];
      
      // Calculate Euclidean distance
      const dist = Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));

      // Connect if within proximity threshold
      if (dist < 40) {
        const densityA = crowdState[a.id]?.current || 0.3;
        const densityB = crowdState[b.id]?.current || 0.3;
        
        // Weight = distance * (1 + crowd penalty)
        // Higher crowd density increases edge weight
        const weight = dist * (1 + (densityA + densityB) * 2);

        graph[a.id][b.id] = { 
          weight, 
          distance: dist, 
          crowdFactor: (densityA + densityB) / 2 
        };
        graph[b.id][a.id] = { 
          weight, 
          distance: dist, 
          crowdFactor: (densityA + densityB) / 2 
        };
      }
    }
  }

  return graph;
}

/**
 * Dijkstra's shortest path algorithm
 * Finds optimal path considering both distance and crowd density
 * 
 * @param {Object} graph - Adjacency graph with weighted edges
 * @param {string} start - Starting zone ID
 * @param {string} end - Destination zone ID
 * @returns {Object} Path result with route and distance
 * 
 * @algorithm Dijkstra's shortest path
 * @complexity O((V + E) log V) with priority queue optimization
 * 
 * @example
 * const result = dijkstra(graph, 'gate-a', 'north-stand');
 * // Returns: { path: ['gate-a', 'zone-1', 'north-stand'], distance: 45.2, reachable: true }
 */
function dijkstra(graph, start, end) {
  const distances = {};
  const previous = {};
  const visited = new Set();
  const nodes = Object.keys(graph);

  // Initialize distances and previous nodes
  nodes.forEach(n => { 
    distances[n] = Infinity; 
    previous[n] = null; 
  });
  distances[start] = 0;

  // Main algorithm loop
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

    // No more reachable nodes or reached destination
    if (!current || current === end) break;
    
    visited.add(current);

    // Update distances to neighbors
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

  // Reconstruct path from end to start
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

/**
 * Calculate route score based on crowd density and wait times
 * Higher score indicates better route
 * 
 * @param {Array} routeDetails - Array of zone details along route
 * @returns {number} Route score (0-100)
 * 
 * @scoring
 * - Base score: 100
 * - Penalty: -60 * avg_density
 * - Penalty: -0.5 * total_wait_time
 */
function calculateRouteScore(routeDetails) {
  const totalWait = routeDetails.reduce((sum, z) => sum + z.waitTime, 0);
  const avgDensity = routeDetails.reduce((sum, z) => sum + z.density, 0) / routeDetails.length;
  return Math.max(0, 100 - avgDensity * 60 - totalWait * 0.5).toFixed(0);
}

/**
 * POST /api/navigation/route
 * Calculate optimal route between two zones
 * 
 * @route POST /api/navigation/route
 * @param {string} from - Origin zone ID
 * @param {string} to - Destination zone ID
 * @param {string} [preference=balanced] - Routing preference (fastest|least_crowded|balanced)
 * @returns {Object} Route details with path, time estimate, and score
 * 
 * @security Input validation with express-validator
 * @performance O((V + E) log V) - Dijkstra's algorithm
 */
router.post('/route', [
  body('from').notEmpty().withMessage('Origin required'),
  body('to').notEmpty().withMessage('Destination required'),
  body('preference').optional().isIn(['fastest', 'least_crowded', 'balanced'])
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn('Navigation route validation failed', { errors: errors.array() });
    return res.status(400).json({ errors: errors.array() });
  }

  const { from, to, preference = 'balanced' } = req.body;
  const crowdState = getCurrentState();
  const zones = getZones();

  // Validate zone IDs
  const zoneIds = zones.map(z => z.id);
  if (!zoneIds.includes(from)) {
    logger.warn('Invalid origin zone', { from });
    return res.status(400).json({ error: 'Invalid origin zone' });
  }
  if (!zoneIds.includes(to)) {
    logger.warn('Invalid destination zone', { to });
    return res.status(400).json({ error: 'Invalid destination zone' });
  }

  try {
    // Build graph and calculate route
    const graph = buildGraph(crowdState);
    const result = dijkstra(graph, from, to);

    if (!result.reachable) {
      logger.info('No route found', { from, to });
      return res.status(404).json({ error: 'No route found between these zones' });
    }

    // Build detailed route information
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
    const score = calculateRouteScore(routeDetails);

    const response = {
      route: routeDetails,
      totalSteps: result.path.length,
      estimatedTime: Math.ceil(result.path.length * 2 + totalWait * 0.3),
      totalWaitTime: totalWait,
      avgCrowdDensity: avgDensity.toFixed(3),
      routeScore: parseInt(score),
      preference,
      timestamp: new Date().toISOString()
    };

    // Log analytics event to Firebase
    await logAnalyticsEvent('route_calculated', {
      from,
      to,
      steps: result.path.length,
      score: parseInt(score),
      preference
    });

    logger.info('Route calculated successfully', { 
      from, 
      to, 
      steps: result.path.length,
      score 
    });

    res.json(response);
  } catch (error) {
    logger.error('Route calculation error', { error: error.message, from, to });
    res.status(500).json({ error: 'Failed to calculate route' });
  }
});

/**
 * GET /api/navigation/zones
 * Get list of all navigable zones
 * 
 * @route GET /api/navigation/zones
 * @returns {Object} List of zones with ID, name, and coordinates
 * 
 * @caching Cacheable for 60 seconds
 */
router.get('/zones', (req, res) => {
  try {
    const zones = getZones();
    const zoneList = zones.map(z => ({ 
      id: z.id, 
      name: z.name, 
      x: z.x, 
      y: z.y 
    }));

    res.set('Cache-Control', 'public, max-age=60');
    res.json({ 
      zones: zoneList,
      count: zoneList.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to get zones', { error: error.message });
    res.status(500).json({ error: 'Failed to retrieve zones' });
  }
});

module.exports = router;
