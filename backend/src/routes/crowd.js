/**
 * @fileoverview Crowd Data Routes - Real-time crowd monitoring endpoints
 * @module routes/crowd
 * @requires express
 * @requires ../services/crowdService
 * @requires ../utils/logger
 * @requires ../services/firebaseService
 */

const express = require('express');
const crowdService = require('../services/crowdService');
const logger = require('../utils/logger');
const { trackAnalyticsEvent } = require('../services/firebaseService');
const { logAnalyticsEvent, storeCrowdData } = require('../config/firebaseAdmin');
const { writeMetric } = require('../config/googleCloud');
const { asyncHandler, NotFoundError } = require('../utils/errorHandler');
const { HTTP_STATUS, CACHE_TTL } = require('../utils/constants');

const router = express.Router();

/**
 * GET /api/crowd/zones
 * Retrieves all venue zones with current crowd density data
 * 
 * @route GET /api/crowd/zones
 * @access Public
 * @returns {Object} 200 - Array of zones with crowd data
 * @returns {Object} 500 - Internal server error
 * 
 * @example
 * Response:
 * {
 *   "zones": [
 *     {
 *       "id": "north-stand",
 *       "name": "North Stand",
 *       "current": 0.75,
 *       "capacity": 8000,
 *       "riskLevel": "high"
 *     }
 *   ],
 *   "timestamp": "2024-01-15T10:30:00.000Z"
 * }
 */
router.get('/zones', asyncHandler(async (req, res) => {
  const zones = crowdService.getAllZones();
  
  // Track analytics event to Firebase
  await logAnalyticsEvent('crowd_zones_viewed', {
    zone_count: zones.length,
    timestamp: new Date().toISOString()
  });
  
  // Store crowd data in Firebase Realtime Database
  await storeCrowdData({ zones, timestamp: new Date().toISOString() });
  
  // Write metric to Cloud Monitoring
  await writeMetric('crowd/zones_count', zones.length, { endpoint: '/zones' });
  
  res.set('Cache-Control', `public, max-age=${CACHE_TTL.SHORT / 1000}`);
  res.status(HTTP_STATUS.OK).json({ zones, timestamp: new Date().toISOString() });
  
  logger.info('Crowd zones retrieved', { count: zones.length });
}));

/**
 * GET /api/crowd/zones/:id
 * Retrieves detailed crowd data for a specific zone
 * 
 * @route GET /api/crowd/zones/:id
 * @param {string} id - Zone identifier (e.g., "north-stand", "gate-a")
 * @access Public
 * @returns {Object} 200 - Zone details with crowd data
 * @returns {Object} 404 - Zone not found
 * @returns {Object} 500 - Internal server error
 * 
 * @example
 * Response:
 * {
 *   "zone": {
 *     "id": "north-stand",
 *     "name": "North Stand",
 *     "current": 0.75,
 *     "capacity": 8000,
 *     "count": 6000,
 *     "riskLevel": "high",
 *     "waitTime": 12,
 *     "predictions": [0.76, 0.78, 0.80, 0.82, 0.84]
 *   },
 *   "timestamp": "2024-01-15T10:30:00.000Z"
 * }
 */
router.get('/zones/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const zone = crowdService.getZoneById(id);
  
  if (!zone) {
    logger.warn('Zone not found', { zoneId: id });
    throw new NotFoundError('Zone');
  }
  
  // Track analytics event to Firebase
  await logAnalyticsEvent('zone_detail_viewed', {
    zone_id: id,
    zone_name: zone.name,
    density: zone.current,
    risk_level: zone.riskLevel
  });
  
  // Write zone density metric to Cloud Monitoring
  await writeMetric('crowd/zone_density', zone.current, {
    zone_id: id,
    zone_name: zone.name,
    risk_level: zone.riskLevel
  });
  
  res.status(HTTP_STATUS.OK).json({ zone, timestamp: new Date().toISOString() });
  
  logger.info('Zone details retrieved', { zoneId: id, density: zone.current });
}));

/**
 * GET /api/crowd/heatmap
 * Retrieves lightweight heatmap data for visualization
 * Optimized for map rendering with minimal payload
 * 
 * @route GET /api/crowd/heatmap
 * @access Public
 * @returns {Object} 200 - Heatmap data array
 * @returns {Object} 500 - Internal server error
 * 
 * @example
 * Response:
 * {
 *   "heatmap": [
 *     {
 *       "id": "north-stand",
 *       "name": "North Stand",
 *       "x": 50,
 *       "y": 10,
 *       "density": 0.75,
 *       "riskLevel": "high",
 *       "count": 6000,
 *       "capacity": 8000
 *     }
 *   ],
 *   "timestamp": "2024-01-15T10:30:00.000Z"
 * }
 */
router.get('/heatmap', asyncHandler(async (req, res) => {
  const heatmap = crowdService.getHeatmapData();
  const highRiskZones = heatmap.filter(z => z.riskLevel === 'high' || z.riskLevel === 'critical').length;
  
  // Track analytics event to Firebase
  await logAnalyticsEvent('heatmap_viewed', {
    zone_count: heatmap.length,
    high_risk_zones: highRiskZones
  });
  
  // Write high-risk zones metric to Cloud Monitoring
  await writeMetric('crowd/high_risk_zones', highRiskZones, { endpoint: '/heatmap' });
  
  res.set('Cache-Control', `public, max-age=${CACHE_TTL.SHORT / 1000}`);
  res.status(HTTP_STATUS.OK).json({ heatmap, timestamp: new Date().toISOString() });
  
  logger.info('Heatmap data retrieved', { zones: heatmap.length, highRiskZones });
}));

/**
 * GET /api/crowd/summary
 * Retrieves venue-wide crowd statistics and summary
 * 
 * @route GET /api/crowd/summary
 * @access Public
 * @returns {Object} 200 - Venue-wide crowd summary
 * @returns {Object} 500 - Internal server error
 * 
 * @example
 * Response:
 * {
 *   "totalCount": 25000,
 *   "totalCapacity": 32000,
 *   "occupancyRate": "78.1",
 *   "avgDensity": "0.781",
 *   "criticalZones": 2,
 *   "highRiskZones": 5,
 *   "safeZones": 13,
 *   "avgWaitTime": 8,
 *   "timestamp": "2024-01-15T10:30:00.000Z"
 * }
 */
router.get('/summary', asyncHandler(async (req, res) => {
  const summary = crowdService.getSummary();
  
  // Track analytics event to Firebase
  await logAnalyticsEvent('crowd_summary_viewed', {
    occupancy_rate: parseFloat(summary.occupancyRate),
    critical_zones: summary.criticalZones,
    high_risk_zones: summary.highRiskZones
  });
  
  // Write occupancy metrics to Cloud Monitoring
  await writeMetric('crowd/occupancy_rate', parseFloat(summary.occupancyRate), { endpoint: '/summary' });
  await writeMetric('crowd/critical_zones', summary.criticalZones, { endpoint: '/summary' });
  
  res.set('Cache-Control', `public, max-age=${CACHE_TTL.SHORT / 1000}`);
  res.status(HTTP_STATUS.OK).json({ ...summary, timestamp: new Date().toISOString() });
  
  logger.info('Crowd summary retrieved', { 
    occupancy: summary.occupancyRate, 
    criticalZones: summary.criticalZones 
  });
}));

module.exports = router;
