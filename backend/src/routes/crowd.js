const express = require('express');
const crowdService = require('../services/crowdService');
const logger = require('../utils/logger');

const router = express.Router();

// GET /api/crowd/zones
router.get('/zones', (req, res) => {
  const zones = crowdService.getAllZones();
  res.set('Cache-Control', 'public, max-age=4');
  res.json({ zones, timestamp: new Date().toISOString() });
});

// GET /api/crowd/zones/:id
router.get('/zones/:id', (req, res) => {
  const zone = crowdService.getZoneById(req.params.id);
  if (!zone) return res.status(404).json({ error: 'Zone not found' });
  res.json({ zone, timestamp: new Date().toISOString() });
});

// GET /api/crowd/heatmap
router.get('/heatmap', (req, res) => {
  const heatmap = crowdService.getHeatmapData();
  res.set('Cache-Control', 'public, max-age=4');
  res.json({ heatmap, timestamp: new Date().toISOString() });
});

// GET /api/crowd/summary
router.get('/summary', (req, res) => {
  const summary = crowdService.getSummary();
  res.set('Cache-Control', 'public, max-age=4');
  res.json({ ...summary, timestamp: new Date().toISOString() });
});

module.exports = router;
