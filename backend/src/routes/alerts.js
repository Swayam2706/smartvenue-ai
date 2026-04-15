const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticate, adminOnly } = require('../middleware/auth');
const { broadcastAlert } = require('../websocket/wsServer');
const { getCurrentState } = require('../simulation/crowdSimulator');
const { pushAlertToFirebase } = require('../config/firebaseAdmin');

const router = express.Router();

// In-memory alert store
let alerts = [];
let alertIdCounter = 1;

// Auto-generate alerts based on crowd state
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

// GET /api/alerts - Get all alerts
router.get('/', (req, res) => {
  checkAutoAlerts();
  const active = alerts.filter(a => !a.acknowledged);
  res.json({ alerts, activeCount: active.length, timestamp: new Date().toISOString() });
});

// POST /api/alerts - Create manual alert (admin only)
router.post('/', authenticate, adminOnly, [
  body('type').isIn(['info', 'warning', 'critical', 'evacuation']),
  body('title').trim().notEmpty(),
  body('message').trim().notEmpty()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

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

  res.status(201).json({ alert });
});

// PATCH /api/alerts/:id/acknowledge - Acknowledge alert
router.patch('/:id/acknowledge', authenticate, (req, res) => {
  const alert = alerts.find(a => a.id === parseInt(req.params.id));
  if (!alert) return res.status(404).json({ error: 'Alert not found' });

  alert.acknowledged = true;
  alert.acknowledgedBy = req.user.username;
  alert.acknowledgedAt = new Date().toISOString();

  res.json({ alert });
});

// POST /api/alerts/emergency - Trigger emergency evacuation
router.post('/emergency', authenticate, adminOnly, (req, res) => {
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

  res.status(201).json({ alert, message: 'Emergency alert broadcast to all clients' });
});

module.exports = router;
