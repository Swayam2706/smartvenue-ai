const express = require('express');
const { authenticate, adminOnly } = require('../middleware/auth');
const { getCurrentState } = require('../simulation/crowdSimulator');

const router = express.Router();

// Generate historical analytics data (simulated)
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

// GET /api/analytics/overview - Admin analytics overview
router.get('/overview', authenticate, adminOnly, (req, res) => {
  const state = getCurrentState();
  const zones = Object.values(state);

  const historical = generateHistoricalData(12);
  const peakHour = historical.reduce((max, d) => d.occupancy > max.occupancy ? d : max, historical[0]);

  res.json({
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
  });
});

// GET /api/analytics/trends - Zone congestion trends (public — used on dashboard)
router.get('/trends', (req, res) => {
  const hours = Math.min(parseInt(req.query.hours) || 6, 48); // cap at 48h
  const data = generateHistoricalData(hours);
  res.set('Cache-Control', 'public, max-age=30');
  res.json({ trends: data, hours, timestamp: new Date().toISOString() });
});

module.exports = router;
