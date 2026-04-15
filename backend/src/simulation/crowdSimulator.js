/**
 * Crowd Simulator - Generates realistic real-time crowd data
 * Uses moving average + random variation to simulate crowd dynamics
 */

const { broadcast } = require('../websocket/wsServer');
const { pushCrowdToFirebase } = require('../config/firebaseAdmin');

// Venue zones definition
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

// State: current crowd levels (0-1 ratio)
let crowdState = {};
let history = {};

// Initialize state
ZONES.forEach(zone => {
  crowdState[zone.id] = {
    ...zone,
    current: Math.random() * 0.5 + 0.1,
    trend: (Math.random() - 0.5) * 0.02,
    waitTime: Math.floor(Math.random() * 15) + 2,
    riskLevel: 'low'
  };
  history[zone.id] = [];
});

// Time-based multipliers (simulate event lifecycle)
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

// Compute risk level from density
function getRiskLevel(density) {
  if (density >= 0.85) return 'critical';
  if (density >= 0.7) return 'high';
  if (density >= 0.5) return 'medium';
  return 'low';
}

// Predict next 15 minutes using moving average
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

// Main simulation tick
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

let simulationInterval = null;

function startSimulation() {
  if (simulationInterval) return;
  simulationInterval = setInterval(simulateTick, 4000);
  console.log('🎯 Crowd simulation started (4s interval)');
}

function stopSimulation() {
  if (simulationInterval) {
    clearInterval(simulationInterval);
    simulationInterval = null;
  }
}

function getCurrentState() {
  return crowdState;
}

function getZones() {
  return ZONES;
}

module.exports = { startSimulation, stopSimulation, getCurrentState, getZones, simulateTick };
