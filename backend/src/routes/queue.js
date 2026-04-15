/**
 * @fileoverview Queue Management Routes - Real-time queue wait time predictions
 * @module routes/queue
 * @requires express
 * @requires ../simulation/crowdSimulator
 * @requires ../utils/logger
 * @requires ../services/firebaseService
 */

const express = require('express');
const { getCurrentState } = require('../simulation/crowdSimulator');
const logger = require('../utils/logger');
const { trackAnalyticsEvent } = require('../services/firebaseService');
const { logAnalyticsEvent } = require('../config/firebaseAdmin');
const { writeMetric } = require('../config/googleCloud');
const { asyncHandler, ValidationError } = require('../utils/errorHandler');
const { HTTP_STATUS } = require('../utils/constants');

const router = express.Router();

/**
 * Queue categories mapping
 * @constant {Object}
 */
const QUEUE_CATEGORIES = {
  gates: ['gate-a', 'gate-b', 'gate-c', 'gate-d'],
  food: ['food-court-1', 'food-court-2', 'food-court-3', 'food-court-4'],
  restrooms: ['restroom-1', 'restroom-2', 'restroom-3', 'restroom-4']
};

/**
 * Calculates queue data for a specific zone
 * Applies time-based multipliers for peak hours
 * 
 * @param {string} zoneId - Zone identifier
 * @param {Object} state - Current crowd state from simulator
 * @returns {Object|null} Queue data object or null if zone not found
 * 
 * @example
 * {
 *   id: "gate-a",
 *   name: "Gate A",
 *   currentWait: 15,
 *   predictedWait: 18,
 *   density: 0.75,
 *   queueLength: 112,
 *   status: "long",
 *   riskLevel: "high"
 * }
 */
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

/**
 * GET /api/queue/all
 * Retrieves queue data for all categories (gates, food, restrooms)
 * 
 * @route GET /api/queue/all
 * @access Public
 * @returns {Object} 200 - Queue data grouped by category
 * @returns {Object} 500 - Internal server error
 * 
 * @example
 * Response:
 * {
 *   "queues": {
 *     "gates": [
 *       { "id": "gate-a", "currentWait": 15, "status": "long" }
 *     ],
 *     "food": [...],
 *     "restrooms": [...]
 *   },
 *   "timestamp": "2024-01-15T10:30:00.000Z"
 * }
 */
router.get('/all', asyncHandler(async (req, res) => {
  const state = getCurrentState();
  const result = {};
  let totalQueues = 0;

  Object.entries(QUEUE_CATEGORIES).forEach(([category, ids]) => {
    result[category] = ids.map(id => getQueueData(id, state)).filter(Boolean);
    totalQueues += result[category].length;
  });

  // Track analytics event to Firebase
  await logAnalyticsEvent('queue_all_viewed', {
    total_queues: totalQueues,
    categories: Object.keys(QUEUE_CATEGORIES).length
  });
  
  // Write metric to Cloud Monitoring
  await writeMetric('queue/total_queues', totalQueues, { endpoint: '/all' });

  res.status(HTTP_STATUS.OK).json({ 
    queues: result, 
    timestamp: new Date().toISOString() 
  });
  
  logger.info('All queue data retrieved', { totalQueues });
}));

/**
 * GET /api/queue/:category
 * Retrieves queue data for a specific category with best option recommendation
 * 
 * @route GET /api/queue/:category
 * @param {string} category - Queue category (gates, food, restrooms)
 * @access Public
 * @returns {Object} 200 - Queue data for category with best option
 * @returns {Object} 404 - Invalid category
 * @returns {Object} 500 - Internal server error
 * 
 * @example
 * Response:
 * {
 *   "category": "gates",
 *   "queues": [
 *     { "id": "gate-a", "currentWait": 15, "status": "long" },
 *     { "id": "gate-b", "currentWait": 8, "status": "moderate" }
 *   ],
 *   "bestOption": { "id": "gate-b", "currentWait": 8 },
 *   "timestamp": "2024-01-15T10:30:00.000Z"
 * }
 */
router.get('/:category', asyncHandler(async (req, res) => {
  const { category } = req.params;
  
  if (!QUEUE_CATEGORIES[category]) {
    logger.warn('Invalid queue category requested', { category });
    throw new ValidationError(`Category not found. Use: ${Object.keys(QUEUE_CATEGORIES).join(', ')}`);
  }

  const state = getCurrentState();
  const queues = QUEUE_CATEGORIES[category]
    .map(id => getQueueData(id, state))
    .filter(Boolean);

  // Find best option (least wait)
  const best = queues.reduce(
    (min, q) => q.currentWait < min.currentWait ? q : min, 
    queues[0]
  );
  
  const avgWaitTime = Math.floor(queues.reduce((sum, q) => sum + q.currentWait, 0) / queues.length);

  // Track analytics event to Firebase
  await logAnalyticsEvent('queue_category_viewed', {
    category,
    queue_count: queues.length,
    best_wait_time: best.currentWait,
    avg_wait_time: avgWaitTime
  });
  
  // Write metrics to Cloud Monitoring
  await writeMetric('queue/avg_wait_time', avgWaitTime, { category });
  await writeMetric('queue/best_wait_time', best.currentWait, { category });

  res.status(HTTP_STATUS.OK).json({ 
    category, 
    queues, 
    bestOption: best, 
    timestamp: new Date().toISOString() 
  });
  
  logger.info('Queue category retrieved', { 
    category, 
    count: queues.length, 
    bestWait: best.currentWait 
  });
}));

module.exports = router;
