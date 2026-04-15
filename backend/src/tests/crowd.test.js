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
  const { authenticate } = require('../middleware/auth');

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
});
