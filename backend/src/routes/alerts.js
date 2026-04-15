/**
 * @fileoverview Alert Management Routes - Real-time alert system for crowd safety
 * @module routes/alerts
 * @requires express
 * @requires express-validator
 * @requires ../middleware/auth
 * @requires ../websocket/wsServer
 * @requires ../simulation/crowdSimulator
 * @requires ../config/firebaseAdmin
 * @requires ../utils/logger
 * @requires ../services/firebaseService
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticate, adminOnly } = require('../middleware/auth');
const { broadcastAlert } = require('../websocket/wsServer');
const { getCurrentState } = require('../simulation/crowdSimulator');
const { pushAlertToFirebase } = require('../config/firebaseAdmin');
const logger = require('../utils/logger');
const { trackAnalyticsEvent } = require('../services/firebaseService');

const router = express.Router();

/**
 * In-memory alert store
 * @type {Array<Object>}
 */
let alerts = [];

/**
 * Alert ID counter for unique identification
 * @type {number}
 */
let alertIdCounter = 1;

/**
 * Automatically generates alerts based on current crowd state
 * Monitors zone density and creates alerts for high-risk situations
 * 
 * @returns {Array<Object>} Array of newly generated alerts
 * 
 * @example
 * [
 *   {
 *     id: 1,
 *     type: "critical",
 *     title: "Critical Overcrowding",
 *     message: "North Stand is at 92% capacity...",
 *     zoneId: "north-stand",
 *     auto: true,
 *     timestamp: "2024-01-15T10:30:00.000Z"
 *   }
 * ]
 */
function checkAutoAlerts() {
  const state = getCurrentState();
  const newAlerts = [];

  Object.values(state).forEach(zone => {
    if (zone.current >= 0.9) {
      newAlerts.push({
        id: alertIdCounter++,
        type: 'critical',
        title: 'Critical Overcrowding',
        message: `${zone.name} is at ${(zone.current * 100).toFixed(0)}% capacity. Immediate action required.`,
        zoneId: zone.id,
        zoneName: zone.name,
        auto: true,
        timestamp: new Date().toISOString(),
        acknowledged: false
      });
    } else if (zone.current >= 0.75) {
      newAlerts.push({
        id: alertIdCounter++,
        type: 'warning',
        title: 'High Crowd Density',
        message: `${zone.name} is reaching high capacity (${(zone.current * 100).toFixed(0)}%). Monitor closely.`,
        zoneId: zone.id,
        zoneName: zone.name,
        auto: true,
        timestamp: new Date().toISOString(),
        acknowledged: false
      });
    }
  });

  // Keep only last 50 alerts
  alerts = [...newAlerts, ...alerts].slice(0, 50);
  return newAlerts;
}

/**
 * GET /api/alerts
 * Retrieves all alerts with automatic alert generation
 * 
 * @route GET /api/alerts
 * @access Public
 * @returns {Object} 200 - All alerts with active count
 * @returns {Object} 500 - Internal server error
 * 
 * @example
 * Response:
 * {
 *   "alerts": [...],
 *   "activeCount": 5,
 *   "timestamp": "2024-01-15T10:30:00.000Z"
 * }
 */
router.get('/', (req, res) => {
  try {
    checkAutoAlerts();
    const active = alerts.filter(a => !a.acknowledged);
    
    // Track analytics event
    trackAnalyticsEvent('alerts_viewed', {
      total_alerts: alerts.length,
      active_alerts: active.length,
      critical_alerts: alerts.filter(a => a.type === 'critical').length
    });
    
    res.json({ alerts, activeCount: active.length, timestamp: new Date().toISOString() });
    
    logger.info('Alerts retrieved', { total: alerts.length, active: active.length });
  } catch (error) {
    logger.error('Error retrieving alerts', { error: error.message });
    res.status(500).json({ error: 'Failed to retrieve alerts' });
  }
});

/**
 * POST /api/alerts
 * Creates a manual alert (admin only)
 * 
 * @route POST /api/alerts
 * @access Admin
 * @param {string} type - Alert type (info, warning, critical, evacuation)
 * @param {string} title - Alert title
 * @param {string} message - Alert message
 * @returns {Object} 201 - Created alert
 * @returns {Object} 400 - Validation error
 * @returns {Object} 401 - Unauthorized
 * @returns {Object} 500 - Internal server error
 * 
 * @example
 * Request body:
 * {
 *   "type": "warning",
 *   "title": "High Crowd Density",
 *   "message": "North Stand approaching capacity"
 * }
 */
router.post('/', authenticate, adminOnly, [
  body('type').isIn(['info', 'warning', 'critical', 'evacuation']),
  body('title').trim().notEmpty(),
  body('message').trim().notEmpty()
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Alert creation validation failed', { errors: errors.array() });
      return res.status(400).json({ errors: errors.array() });
    }

    const alert = {
      id: alertIdCounter++,
      ...req.body,
      auto: false,
      createdBy: req.user.username,
      timestamp: new Date().toISOString(),
      acknowledged: false
    };

    alerts.unshift(alert);
    broadcastAlert(alert);
    pushAlertToFirebase(alert);

    // Track analytics event
    trackAnalyticsEvent('alert_created', {
      alert_type: alert.type,
      created_by: req.user.username,
      alert_id: alert.id
    });

    res.status(201).json({ alert });
    
    logger.info('Manual alert created', { 
      alertId: alert.id, 
      type: alert.type, 
      createdBy: req.user.username 
    });
  } catch (error) {
    logger.error('Error creating alert', { error: error.message });
    res.status(500).json({ error: 'Failed to create alert' });
  }
});

/**
 * PATCH /api/alerts/:id/acknowledge
 * Acknowledges an alert
 * 
 * @route PATCH /api/alerts/:id/acknowledge
 * @param {number} id - Alert ID
 * @access Authenticated
 * @returns {Object} 200 - Acknowledged alert
 * @returns {Object} 404 - Alert not found
 * @returns {Object} 401 - Unauthorized
 * @returns {Object} 500 - Internal server error
 */
router.patch('/:id/acknowledge', authenticate, (req, res) => {
  try {
    const alert = alerts.find(a => a.id === parseInt(req.params.id));
    
    if (!alert) {
      logger.warn('Alert not found for acknowledgment', { alertId: req.params.id });
      return res.status(404).json({ error: 'Alert not found' });
    }

    alert.acknowledged = true;
    alert.acknowledgedBy = req.user.username;
    alert.acknowledgedAt = new Date().toISOString();

    // Track analytics event
    trackAnalyticsEvent('alert_acknowledged', {
      alert_id: alert.id,
      alert_type: alert.type,
      acknowledged_by: req.user.username
    });

    res.json({ alert });
    
    logger.info('Alert acknowledged', { 
      alertId: alert.id, 
      acknowledgedBy: req.user.username 
    });
  } catch (error) {
    logger.error('Error acknowledging alert', { alertId: req.params.id, error: error.message });
    res.status(500).json({ error: 'Failed to acknowledge alert' });
  }
});

/**
 * POST /api/alerts/emergency
 * Triggers emergency evacuation alert (admin only)
 * 
 * @route POST /api/alerts/emergency
 * @access Admin
 * @param {string} message - Optional custom emergency message
 * @returns {Object} 201 - Emergency alert created and broadcast
 * @returns {Object} 401 - Unauthorized
 * @returns {Object} 500 - Internal server error
 * 
 * @example
 * Request body:
 * {
 *   "message": "Fire detected in North Stand. Evacuate immediately."
 * }
 */
router.post('/emergency', authenticate, adminOnly, (req, res) => {
  try {
    const alert = {
      id: alertIdCounter++,
      type: 'evacuation',
      title: '🚨 EMERGENCY EVACUATION',
      message: req.body.message || 'Emergency evacuation in progress. Please follow safe exit routes immediately.',
      auto: false,
      createdBy: req.user.username,
      timestamp: new Date().toISOString(),
      acknowledged: false,
      safeZones: ['gate-a', 'gate-b', 'gate-c', 'gate-d'],
      priority: 'CRITICAL'
    };

    alerts.unshift(alert);
    broadcastAlert(alert);
    pushAlertToFirebase(alert);

    // Track analytics event
    trackAnalyticsEvent('emergency_alert_triggered', {
      alert_id: alert.id,
      triggered_by: req.user.username,
      timestamp: alert.timestamp
    });

    res.status(201).json({ alert, message: 'Emergency alert broadcast to all clients' });
    
    logger.warn('EMERGENCY ALERT TRIGGERED', { 
      alertId: alert.id, 
      triggeredBy: req.user.username 
    });
  } catch (error) {
    logger.error('Error triggering emergency alert', { error: error.message });
    res.status(500).json({ error: 'Failed to trigger emergency alert' });
  }
});

module.exports = router;
