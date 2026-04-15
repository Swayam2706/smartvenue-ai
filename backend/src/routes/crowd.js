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
router.get('/zones', (req, res) => {
  try {
    const zones = crowdService.getAllZones();
    
    // Track analytics event
    trackAnalyticsEvent('crowd_zones_viewed', {
      zone_count: zones.length,
      timestamp: new Date().toISOString()
    });
    
    res.set('Cache-Control', 'public, max-age=4');
    res.json({ zones, timestamp: new Date().toISOString() });
    
    logger.info('Crowd zones retrieved', { count: zones.length });
  } catch (error) {
    logger.error('Error retrieving crowd zones', { error: error.message });
    res.status(500).json({ error: 'Failed to retrieve crowd zones' });
  }
});

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
router.get('/zones/:id', (req, res) => {
  try {
    const { id } = req.params;
    const zone = crowdService.getZoneById(id);
    
    if (!zone) {
      logger.warn('Zone not found', { zoneId: id });
      return res.status(404).json({ error: 'Zone not found' });
    }
    
    // Track analytics event
    trackAnalyticsEvent('zone_detail_viewed', {
      zone_id: id,
      zone_name: zone.name,
      density: zone.current,
      risk_level: zone.riskLevel
    });
    
    res.json({ zone, timestamp: new Date().toISOString() });
    
    logger.info('Zone details retrieved', { zoneId: id, density: zone.current });
  } catch (error) {
    logger.error('Error retrieving zone details', { zoneId: req.params.id, error: error.message });
    res.status(500).json({ error: 'Failed to retrieve zone details' });
  }
});

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
router.get('/heatmap', (req, res) => {
  try {
    const heatmap = crowdService.getHeatmapData();
    
    // Track analytics event
    trackAnalyticsEvent('heatmap_viewed', {
      zone_count: heatmap.length,
      high_risk_zones: heatmap.filter(z => z.riskLevel === 'high' || z.riskLevel === 'critical').length
    });
    
    res.set('Cache-Control', 'public, max-age=4');
    res.json({ heatmap, timestamp: new Date().toISOString() });
    
    logger.info('Heatmap data retrieved', { zones: heatmap.length });
  } catch (error) {
    logger.error('Error retrieving heatmap data', { error: error.message });
    res.status(500).json({ error: 'Failed to retrieve heatmap data' });
  }
});

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
router.get('/summary', (req, res) => {
  try {
    const summary = crowdService.getSummary();
    
    // Track analytics event
    trackAnalyticsEvent('crowd_summary_viewed', {
      occupancy_rate: parseFloat(summary.occupancyRate),
      critical_zones: summary.criticalZones,
      high_risk_zones: summary.highRiskZones
    });
    
    res.set('Cache-Control', 'public, max-age=4');
    res.json({ ...summary, timestamp: new Date().toISOString() });
    
    logger.info('Crowd summary retrieved', { 
      occupancy: summary.occupancyRate, 
      criticalZones: summary.criticalZones 
    });
  } catch (error) {
    logger.error('Error retrieving crowd summary', { error: error.message });
    res.status(500).json({ error: 'Failed to retrieve crowd summary' });
  }
});

module.exports = router;
