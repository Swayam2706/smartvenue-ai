/**
 * Backend unit tests
 */

// Mock the wsServer to avoid real WebSocket
jest.mock('../websocket/wsServer', () => ({ broadcast: jest.fn(), broadcastAlert: jest.fn() }));

const { getCurrentState, getZones, simulateTick } = require('../simulation/crowdSimulator');

describe('Crowd Simulator', () => {
  it('returns zones array', () => {
    const zones = getZones();
    expect(Array.isArray(zones)).toBe(true);
    expect(zones.length).toBeGreaterThan(0);
  });

  it('each zone has required fields', () => {
    const zones = getZones();
    zones.forEach(zone => {
      expect(zone).toHaveProperty('id');
      expect(zone).toHaveProperty('name');
      expect(zone).toHaveProperty('capacity');
      expect(zone).toHaveProperty('x');
      expect(zone).toHaveProperty('y');
    });
  });

  it('getCurrentState returns crowd data', () => {
    const state = getCurrentState();
    expect(typeof state).toBe('object');
    const keys = Object.keys(state);
    expect(keys.length).toBeGreaterThan(0);
  });

  it('crowd density is between 0 and 1', () => {
    const state = getCurrentState();
    Object.values(state).forEach(zone => {
      expect(zone.current).toBeGreaterThanOrEqual(0);
      expect(zone.current).toBeLessThanOrEqual(1);
    });
  });

  it('simulateTick updates state', () => {
    const before = { ...getCurrentState() };
    simulateTick();
    const after = getCurrentState();
    // State should still be valid
    Object.values(after).forEach(zone => {
      expect(zone.current).toBeGreaterThanOrEqual(0);
      expect(zone.current).toBeLessThanOrEqual(1);
      expect(['low', 'medium', 'high', 'critical']).toContain(zone.riskLevel);
    });
  });
});

describe('Auth middleware', () => {
  const jwt = require('jsonwebtoken');
  const { authenticate, adminOnly, operatorOrAdmin } = require('../middleware/auth');

  it('rejects request without token', () => {
    const req = { headers: {} };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    authenticate(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('accepts valid token', () => {
    const token = jwt.sign({ id: '1', role: 'admin' }, process.env.JWT_SECRET);
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = {};
    const next = jest.fn();
    authenticate(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.user).toBeDefined();
  });

  it('rejects expired token', () => {
    const token = jwt.sign({ id: '1', role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '-1s' });
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    authenticate(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('rejects malformed token', () => {
    const req = { headers: { authorization: 'Bearer invalid.token.here' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    authenticate(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('adminOnly allows admin role', () => {
    const req = { user: { role: 'admin' } };
    const res = {};
    const next = jest.fn();
    adminOnly(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('adminOnly rejects operator role', () => {
    const req = { user: { role: 'operator' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    adminOnly(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('operatorOrAdmin allows admin', () => {
    const req = { user: { role: 'admin' } };
    const res = {};
    const next = jest.fn();
    operatorOrAdmin(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('operatorOrAdmin allows operator', () => {
    const req = { user: { role: 'operator' } };
    const res = {};
    const next = jest.fn();
    operatorOrAdmin(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('operatorOrAdmin rejects user role', () => {
    const req = { user: { role: 'user' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    operatorOrAdmin(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(403);
  });
});

describe('CrowdService', () => {
  const crowdService = require('../services/crowdService');

  it('getAllZones returns array', () => {
    const zones = crowdService.getAllZones();
    expect(Array.isArray(zones)).toBe(true);
    expect(zones.length).toBeGreaterThan(0);
  });

  it('getZoneById returns zone', () => {
    const zone = crowdService.getZoneById('gate-a');
    expect(zone).toBeDefined();
    expect(zone.id).toBe('gate-a');
  });

  it('getZoneById returns null for invalid id', () => {
    const zone = crowdService.getZoneById('invalid-zone');
    expect(zone).toBeNull();
  });

  it('getHeatmapData returns lightweight data', () => {
    const heatmap = crowdService.getHeatmapData();
    expect(Array.isArray(heatmap)).toBe(true);
    heatmap.forEach(zone => {
      expect(zone).toHaveProperty('id');
      expect(zone).toHaveProperty('x');
      expect(zone).toHaveProperty('y');
      expect(zone).toHaveProperty('density');
      expect(zone).toHaveProperty('riskLevel');
      expect(zone).not.toHaveProperty('predictions'); // Should be lightweight
    });
  });

  it('getSummary returns venue statistics', () => {
    const summary = crowdService.getSummary();
    expect(summary).toHaveProperty('totalCount');
    expect(summary).toHaveProperty('totalCapacity');
    expect(summary).toHaveProperty('occupancyRate');
    expect(summary).toHaveProperty('criticalZones');
    expect(summary).toHaveProperty('highRiskZones');
    expect(summary).toHaveProperty('safeZones');
    expect(summary.totalCount).toBeGreaterThanOrEqual(0);
    expect(summary.totalCapacity).toBeGreaterThan(0);
  });

  it('getLeastCrowdedByType finds least crowded gate', () => {
    const gate = crowdService.getLeastCrowdedByType('gate');
    expect(gate).toBeDefined();
    expect(gate.id).toContain('gate');
  });

  it('getLeastCrowdedByType returns null for invalid type', () => {
    const zone = crowdService.getLeastCrowdedByType('nonexistent');
    expect(zone).toBeNull();
  });
});

describe('Risk Level Calculation', () => {
  it('assigns correct risk levels', () => {
    const state = getCurrentState();
    Object.values(state).forEach(zone => {
      if (zone.current >= 0.85) {
        expect(zone.riskLevel).toBe('critical');
      } else if (zone.current >= 0.7) {
        expect(zone.riskLevel).toBe('high');
      } else if (zone.current >= 0.5) {
        expect(zone.riskLevel).toBe('medium');
      } else {
        expect(zone.riskLevel).toBe('low');
      }
    });
  });
});

describe('Predictions', () => {
  it('generates predictions for all zones', () => {
    const state = getCurrentState();
    Object.values(state).forEach(zone => {
      expect(zone.predictions).toBeDefined();
      expect(Array.isArray(zone.predictions)).toBe(true);
      expect(zone.predictions.length).toBe(5);
      zone.predictions.forEach(pred => {
        expect(pred).toBeGreaterThanOrEqual(0);
        expect(pred).toBeLessThanOrEqual(1);
      });
    });
  });
});

describe('Wait Time Calculation', () => {
  it('calculates wait times for all zones', () => {
    const state = getCurrentState();
    Object.values(state).forEach(zone => {
      expect(zone.waitTime).toBeDefined();
      expect(zone.waitTime).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(zone.waitTime)).toBe(true);
    });
  });

  it('wait time correlates with density', () => {
    const state = getCurrentState();
    const zones = Object.values(state);
    const highDensity = zones.filter(z => z.current > 0.8);
    const lowDensity = zones.filter(z => z.current < 0.3);
    
    if (highDensity.length > 0 && lowDensity.length > 0) {
      const avgHighWait = highDensity.reduce((sum, z) => sum + z.waitTime, 0) / highDensity.length;
      const avgLowWait = lowDensity.reduce((sum, z) => sum + z.waitTime, 0) / lowDensity.length;
      expect(avgHighWait).toBeGreaterThan(avgLowWait);
    }
  });
});
