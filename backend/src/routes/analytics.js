/**
 * @fileoverview Analytics Routes - Historical data and venue statistics
 * @module routes/analytics
 * @requires express
 * @requires ../middleware/auth
 * @requires ../simulation/crowdSimulator
 * @requires ../utils/logger
 * @requires ../services/firebaseService
 */

const express = require('express');
const { authenticate, adminOnly } = require('../middleware/auth');
const { getCurrentState } = require('../simulation/crowdSimulator');
const logger = require('../utils/logger');
const { trackAnalyticsEvent } = require('../services/firebaseService');

const router = express.Router();

/**
 * Generates simulated historical analytics data
 * Models realistic event day crowd patterns
 * 
 * @param {number} hours - Number of hours of historical data to generate
 * @returns {Array<Object>} Array of historical data points
 * 
 * @example
 * [
 *   {
 *     time: "2024-01-15T10:00:00.000Z",
 *     hour: "10:00",
 *     occupancy: 0.35,
 *     avgWaitTime: 9,
 *     incidents: 0
 *   }
 * ]
 */
function generateHistoricalData(hours = 24) {
  const data = [];
  const now = new Date();

  for (let i = hours; i >= 0; i--) {
    const time = new Date(now - i * 60 * 60 * 1000);
    const hour = time.getHours();

    // Simulate event day pattern
    const baseOccupancy = hour < 10 ? 0.1 :
      hour < 14 ? 0.3 + (hour - 10) * 0.1 :
      hour < 16 ? 0.7 :
      hour < 19 ? 0.85 + Math.random() * 0.1 :
      hour < 21 ? 0.9 + Math.random() * 0.08 :
      hour < 23 ? 0.7 - (hour - 21) * 0.2 : 0.2;

    data.push({
      time: time.toISOString(),
      hour: `${hour}:00`,
      occupancy: Math.min(0.98, baseOccupancy + (Math.random() - 0.5) * 0.05),
      avgWaitTime: Math.floor(baseOccupancy * 25 + Math.random() * 5),
      incidents: Math.random() > 0.9 ? Math.floor(Math.random() * 3) : 0
    });
  }

  return data;
}

/**
 * GET /api/analytics/overview
 * Retrieves comprehensive admin analytics dashboard data
 * 
 * @route GET /api/analytics/overview
 * @access Admin
 * @returns {Object} 200 - Complete analytics overview
 * @returns {Object} 401 - Unauthorized
 * @returns {Object} 500 - Internal server error
 * 
 * @example
 * Response:
 * {
 *   "current": {
 *     "totalVisitors": 25000,
 *     "avgOccupancy": "78.1",
 *     "criticalZones": 2,
 *     "avgWaitTime": 8
 *   },
 *   "historical": [...],
 *   "peakHour": "19:00",
 *   "zoneStats": [...],
 *   "timestamp": "2024-01-15T10:30:00.000Z"
 * }
 */
router.get('/overview', authenticate, adminOnly, (req, res) => {
  try {
    const state = getCurrentState();
    const zones = Object.values(state);

    const historical = generateHistoricalData(12);
    const peakHour = historical.reduce((max, d) => d.occupancy > max.occupancy ? d : max, historical[0]);

    const overview = {
      current: {
        totalVisitors: zones.reduce((sum, z) => sum + (z.count || 0), 0),
        avgOccupancy: (zones.reduce((sum, z) => sum + z.current, 0) / zones.length * 100).toFixed(1),
        criticalZones: zones.filter(z => z.riskLevel === 'critical').length,
        avgWaitTime: Math.floor(zones.reduce((sum, z) => sum + (z.waitTime || 0), 0) / zones.length)
      },
      historical,
      peakHour: peakHour.hour,
      zoneStats: zones.map(z => ({
        id: z.id,
        name: z.name,
        occupancy: (z.current * 100).toFixed(1),
        riskLevel: z.riskLevel,
        waitTime: z.waitTime
      })).sort((a, b) => parseFloat(b.occupancy) - parseFloat(a.occupancy)),
      timestamp: new Date().toISOString()
    };

    // Track analytics event
    trackAnalyticsEvent('analytics_overview_viewed', {
      total_visitors: overview.current.totalVisitors,
      avg_occupancy: parseFloat(overview.current.avgOccupancy),
      critical_zones: overview.current.criticalZones,
      viewed_by: req.user.username
    });

    res.json(overview);
    
    logger.info('Analytics overview retrieved', { 
      user: req.user.username, 
      occupancy: overview.current.avgOccupancy 
    });
  } catch (error) {
    logger.error('Error retrieving analytics overview', { error: error.message });
    res.status(500).json({ error: 'Failed to retrieve analytics overview' });
  }
});

/**
 * GET /api/analytics/trends
 * Retrieves zone congestion trends over time (public endpoint for dashboard)
 * 
 * @route GET /api/analytics/trends
 * @query {number} hours - Number of hours of trend data (default: 6, max: 48)
 * @access Public
 * @returns {Object} 200 - Historical trend data
 * @returns {Object} 500 - Internal server error
 * 
 * @example
 * Response:
 * {
 *   "trends": [
 *     {
 *       "time": "2024-01-15T10:00:00.000Z",
 *       "hour": "10:00",
 *       "occupancy": 0.35,
 *       "avgWaitTime": 9,
 *       "incidents": 0
 *     }
 *   ],
 *   "hours": 6,
 *   "timestamp": "2024-01-15T10:30:00.000Z"
 * }
 */
router.get('/trends', (req, res) => {
  try {
    const hours = Math.min(parseInt(req.query.hours) || 6, 48); // cap at 48h
    const data = generateHistoricalData(hours);
    
    // Track analytics event
    trackAnalyticsEvent('trends_viewed', {
      hours_requested: hours,
      data_points: data.length
    });
    
    res.set('Cache-Control', 'public, max-age=30');
    res.json({ trends: data, hours, timestamp: new Date().toISOString() });
    
    logger.info('Trends data retrieved', { hours, dataPoints: data.length });
  } catch (error) {
    logger.error('Error retrieving trends data', { error: error.message });
    res.status(500).json({ error: 'Failed to retrieve trends data' });
  }
});

module.exports = router;
