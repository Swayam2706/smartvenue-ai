const express = require('express');
const { getCurrentState } = require('../simulation/crowdSimulator');

const router = express.Router();

// Queue categories
const QUEUE_CATEGORIES = {
  gates: ['gate-a', 'gate-b', 'gate-c', 'gate-d'],
  food: ['food-court-1', 'food-court-2', 'food-court-3', 'food-court-4'],
  restrooms: ['restroom-1', 'restroom-2', 'restroom-3', 'restroom-4']
};

function getQueueData(zoneId, state) {
  const zone = state[zoneId];
  if (!zone) return null;

  const density = zone.current;
  const hour = new Date().getHours();

  // Time-based multiplier (peak hours: 18-21)
  const isPeak = hour >= 18 && hour <= 21;
  const timeMultiplier = isPeak ? 1.4 : 1.0;

  const currentWait = Math.floor(zone.waitTime * timeMultiplier);
  const predictedWait = zone.predictions
    ? Math.floor(zone.predictions[2] * zone.waitTime * timeMultiplier * 1.1)
    : currentWait;

  return {
    id: zoneId,
    name: zone.name,
    currentWait,
    predictedWait,
    density,
    queueLength: Math.floor(density * zone.capacity * 0.3),
    status: density > 0.8 ? 'very_long' : density > 0.6 ? 'long' : density > 0.4 ? 'moderate' : 'short',
    riskLevel: zone.riskLevel
  };
}

// GET /api/queue/all - All queue data
router.get('/all', (req, res) => {
  const state = getCurrentState();
  const result = {};

  Object.entries(QUEUE_CATEGORIES).forEach(([category, ids]) => {
    result[category] = ids.map(id => getQueueData(id, state)).filter(Boolean);
  });

  res.json({ queues: result, timestamp: new Date().toISOString() });
});

// GET /api/queue/:category - Specific category
router.get('/:category', (req, res) => {
  const { category } = req.params;
  if (!QUEUE_CATEGORIES[category]) {
    return res.status(404).json({ error: 'Category not found. Use: gates, food, restrooms' });
  }

  const state = getCurrentState();
  const queues = QUEUE_CATEGORIES[category].map(id => getQueueData(id, state)).filter(Boolean);

  // Find best option (least wait)
  const best = queues.reduce((min, q) => q.currentWait < min.currentWait ? q : min, queues[0]);

  res.json({ category, queues, bestOption: best, timestamp: new Date().toISOString() });
});

module.exports = router;
