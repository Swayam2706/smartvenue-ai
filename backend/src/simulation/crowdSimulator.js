/**
 * @fileoverview Crowd Simulator - Real-time crowd dynamics simulation engine
 * @module simulation/crowdSimulator
 * @description Generates realistic crowd data using moving averages and random variation
 * Simulates natural crowd flow patterns with time-based multipliers
 * @requires ../websocket/wsServer
 * @requires ../config/firebaseAdmin
 */

const { broadcast } = require('../websocket/wsServer');
const { pushCrowdToFirebase } = require('../config/firebaseAdmin');

/**
 * Venue zones definition with capacity and coordinates
 * @constant {Array<Object>}
 */
const ZONES = [
  { id: 'north-stand', name: 'North Stand', capacity: 8000, x: 50, y: 10 },
  { id: 'south-stand', name: 'South Stand', capacity: 8000, x: 50, y: 90 },
  { id: 'east-stand', name: 'East Stand', capacity: 6000, x: 90, y: 50 },
  { id: 'west-stand', name: 'West Stand', capacity: 6000, x: 10, y: 50 },
  { id: 'gate-a', name: 'Gate A', capacity: 500, x: 50, y: 2 },
  { id: 'gate-b', name: 'Gate B', capacity: 500, x: 98, y: 50 },
  { id: 'gate-c', name: 'Gate C', capacity: 500, x: 50, y: 98 },
  { id: 'gate-d', name: 'Gate D', capacity: 500, x: 2, y: 50 },
  { id: 'food-court-1', name: 'Food Court 1', capacity: 300, x: 25, y: 25 },
  { id: 'food-court-2', name: 'Food Court 2', capacity: 300, x: 75, y: 25 },
  { id: 'food-court-3', name: 'Food Court 3', capacity: 300, x: 25, y: 75 },
  { id: 'food-court-4', name: 'Food Court 4', capacity: 300, x: 75, y: 75 },
  { id: 'restroom-1', name: 'Restroom NW', capacity: 100, x: 15, y: 15 },
  { id: 'restroom-2', name: 'Restroom NE', capacity: 100, x: 85, y: 15 },
  { id: 'restroom-3', name: 'Restroom SW', capacity: 100, x: 15, y: 85 },
  { id: 'restroom-4', name: 'Restroom SE', capacity: 100, x: 85, y: 85 },
  { id: 'vip-lounge', name: 'VIP Lounge', capacity: 200, x: 50, y: 50 },
  { id: 'medical-center', name: 'Medical Center', capacity: 50, x: 30, y: 50 },
  { id: 'parking-north', name: 'Parking North', capacity: 2000, x: 50, y: 5 },
  { id: 'parking-south', name: 'Parking South', capacity: 2000, x: 50, y: 95 },
];

/**
 * Current crowd state for all zones
 * @type {Object<string, Object>}
 */
let crowdState = {};

/**
 * Historical density data for prediction algorithms
 * @type {Object<string, Array<number>>}
 */
let history = {};

/**
 * Simulation interval timer reference
 * @type {NodeJS.Timeout|null}
 */
let simulationInterval = null;

// Initialize state with predictions
ZONES.forEach(zone => {
  const initialDensity = Math.random() * 0.5 + 0.1;
  crowdState[zone.id] = {
    ...zone,
    current: initialDensity,
    trend: (Math.random() - 0.5) * 0.02,
    waitTime: Math.floor(Math.random() * 15) + 2,
    riskLevel: getRiskLevel(initialDensity),
    predictions: Array(5).fill(initialDensity)
  };
  history[zone.id] = [initialDensity];
});

/**
 * Calculates time-based multiplier to simulate event lifecycle
 * Models pre-game rush, peak attendance, and post-game dispersal
 * 
 * @returns {number} Multiplier value between 0.4 and 0.95
 * 
 * @example
 * // Returns values like:
 * // 0.4-0.8 during build-up phase
 * // 0.8-0.95 during peak
 * // 0.85-0.25 during dispersal
 */
function getTimeMultiplier() {
  const now = new Date();
  const minutes = now.getMinutes();
  // Simulate pre-game rush, peak, and post-game
  const phase = (minutes % 60) / 60;
  if (phase < 0.2) return 0.4 + phase * 2; // Building up
  if (phase < 0.5) return 0.8 + (phase - 0.2) * 0.5; // Peak
  if (phase < 0.7) return 0.95 - (phase - 0.5) * 0.3; // Slight decline
  return 0.85 - (phase - 0.7) * 1.5; // Post-event dispersal
}

/**
 * Computes risk level classification from density value
 * 
 * @param {number} density - Crowd density ratio (0-1)
 * @returns {string} Risk level: "low", "medium", "high", or "critical"
 * 
 * @example
 * getRiskLevel(0.45) // returns "low"
 * getRiskLevel(0.75) // returns "high"
 * getRiskLevel(0.92) // returns "critical"
 */
function getRiskLevel(density) {
  if (density >= 0.85) return 'critical';
  if (density >= 0.7) return 'high';
  if (density >= 0.5) return 'medium';
  return 'low';
}

/**
 * Predicts future density values using moving average algorithm
 * Analyzes historical trends to forecast next 15 minutes (5 intervals)
 * 
 * @param {string} zoneId - Zone identifier
 * @param {number} currentDensity - Current density value (0-1)
 * @returns {Array<number>} Array of 5 predicted density values
 * 
 * @example
 * predictDensity("north-stand", 0.75)
 * // returns [0.76, 0.78, 0.80, 0.82, 0.84]
 */
function predictDensity(zoneId, currentDensity) {
  const hist = history[zoneId].slice(-10);
  if (hist.length < 3) return Array(5).fill(currentDensity);

  const avg = hist.reduce((a, b) => a + b, 0) / hist.length;
  const trend = (hist[hist.length - 1] - hist[0]) / hist.length;

  return Array(5).fill(0).map((_, i) => {
    const predicted = avg + trend * (i + 1) * 3;
    return Math.max(0, Math.min(1, predicted + (Math.random() - 0.5) * 0.05));
  });
}

/**
 * Main simulation tick - Updates all zone states
 * Applies random walk with mean reversion, time multipliers, and predictions
 * Broadcasts updates via WebSocket and pushes to Firebase
 * 
 * @returns {Object} Updated crowd state for all zones
 * 
 * @example
 * {
 *   "north-stand": {
 *     id: "north-stand",
 *     name: "North Stand",
 *     current: 0.75,
 *     trend: 0.02,
 *     waitTime: 12,
 *     riskLevel: "high",
 *     predictions: [0.76, 0.78, 0.80, 0.82, 0.84],
 *     count: 6000,
 *     capacity: 8000,
 *     updatedAt: "2024-01-15T10:30:00.000Z"
 *   }
 * }
 */
function simulateTick() {
  const timeMultiplier = getTimeMultiplier();
  const updates = {};

  ZONES.forEach(zone => {
    const state = crowdState[zone.id];

    // Random walk with mean reversion
    const noise = (Math.random() - 0.5) * 0.06;
    const meanReversion = (0.5 * timeMultiplier - state.current) * 0.05;
    let newDensity = state.current + state.trend + noise + meanReversion;
    newDensity = Math.max(0.02, Math.min(0.98, newDensity));

    // Update trend
    const newTrend = state.trend * 0.9 + (Math.random() - 0.5) * 0.01;

    // Wait time based on density
    const baseWait = zone.id.includes('gate') ? 20 : zone.id.includes('food') ? 15 : zone.id.includes('restroom') ? 8 : 5;
    const waitTime = Math.floor(baseWait * newDensity * timeMultiplier + Math.random() * 3);

    // Store history
    history[zone.id].push(newDensity);
    if (history[zone.id].length > 30) history[zone.id].shift();

    const predictions = predictDensity(zone.id, newDensity);

    crowdState[zone.id] = {
      ...state,
      current: newDensity,
      trend: newTrend,
      waitTime: Math.max(1, waitTime),
      riskLevel: getRiskLevel(newDensity),
      predictions,
      count: Math.floor(newDensity * zone.capacity),
      updatedAt: new Date().toISOString()
    };

    updates[zone.id] = crowdState[zone.id];
  });

  // Broadcast to all WebSocket clients
  broadcast({ type: 'CROWD_UPDATE', data: updates, timestamp: new Date().toISOString() });

  // Also push to Firebase Realtime DB (if configured)
  pushCrowdToFirebase(updates);

  return updates;
}

/**
 * Starts the crowd simulation with 4-second intervals
 * Prevents multiple simultaneous simulations
 * 
 * @returns {void}
 */
function startSimulation() {
  if (simulationInterval) return;
  simulationInterval = setInterval(simulateTick, 4000);
  console.log('🎯 Crowd simulation started (4s interval)');
}

/**
 * Stops the crowd simulation
 * Clears the interval timer
 * 
 * @returns {void}
 */
function stopSimulation() {
  if (simulationInterval) {
    clearInterval(simulationInterval);
    simulationInterval = null;
    console.log('⏹️  Crowd simulation stopped');
  }
}

/**
 * Retrieves current crowd state for all zones
 * 
 * @returns {Object<string, Object>} Current state object keyed by zone ID
 */
function getCurrentState() {
  return crowdState;
}

/**
 * Retrieves static zone definitions
 * 
 * @returns {Array<Object>} Array of zone configuration objects
 */
function getZones() {
  return ZONES;
}

module.exports = { 
  startSimulation, 
  stopSimulation, 
  getCurrentState, 
  getZones, 
  simulateTick 
};
