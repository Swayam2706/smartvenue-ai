/**
 * Utility Functions Tests
 * Tests for logger, sanitizer, and API response utilities
 */

describe('Logger', () => {
  const logger = require('../utils/logger');

  it('has all log levels', () => {
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.debug).toBe('function');
    expect(typeof logger.http).toBe('function');
  });

  it('logs without throwing errors', () => {
    expect(() => logger.info('Test message')).not.toThrow();
    expect(() => logger.warn('Warning message')).not.toThrow();
    expect(() => logger.error('Error message')).not.toThrow();
  });

  it('accepts metadata objects', () => {
    expect(() => logger.info('Test', { key: 'value' })).not.toThrow();
    expect(() => logger.error('Error', { error: 'details' })).not.toThrow();
  });
});

describe('Sanitizer', () => {
  const { sanitizeBody } = require('../utils/sanitize');

  it('sanitizes XSS in request body', () => {
    const req = {
      body: {
        message: '<script>alert("xss")</script>Hello',
        title: 'Test'
      }
    };
    const res = {};
    const next = jest.fn();

    sanitizeBody(req, res, next);

    expect(req.body.message).not.toContain('<script>');
    expect(next).toHaveBeenCalled();
  });

  it('handles empty body', () => {
    const req = { body: {} };
    const res = {};
    const next = jest.fn();

    expect(() => sanitizeBody(req, res, next)).not.toThrow();
    expect(next).toHaveBeenCalled();
  });

  it('handles null values', () => {
    const req = {
      body: {
        field1: null,
        field2: 'value'
      }
    };
    const res = {};
    const next = jest.fn();

    expect(() => sanitizeBody(req, res, next)).not.toThrow();
    expect(next).toHaveBeenCalled();
  });
});

describe('API Response Utility', () => {
  const { successResponse, errorResponse } = require('../utils/apiResponse');

  it('creates success response', () => {
    const response = successResponse({ data: 'test' }, 'Success message');
    expect(response).toHaveProperty('success', true);
    expect(response).toHaveProperty('data');
    expect(response).toHaveProperty('message', 'Success message');
  });

  it('creates error response', () => {
    const response = errorResponse('Error occurred', 400);
    expect(response).toHaveProperty('success', false);
    expect(response).toHaveProperty('error', 'Error occurred');
    expect(response).toHaveProperty('statusCode', 400);
  });

  it('includes timestamp in responses', () => {
    const success = successResponse({ data: 'test' });
    const error = errorResponse('Error');
    
    expect(success).toHaveProperty('timestamp');
    expect(error).toHaveProperty('timestamp');
  });
});

describe('Environment Variables', () => {
  it('JWT_SECRET is set', () => {
    expect(process.env.JWT_SECRET).toBeDefined();
    expect(process.env.JWT_SECRET.length).toBeGreaterThan(10);
  });

  it('NODE_ENV is set', () => {
    expect(process.env.NODE_ENV).toBeDefined();
  });
});

describe('Data Validation', () => {
  it('validates zone IDs', () => {
    const { getZones } = require('../simulation/crowdSimulator');
    const zones = getZones();
    
    zones.forEach(zone => {
      expect(zone.id).toMatch(/^[a-z0-9-]+$/);
      expect(zone.id.length).toBeGreaterThan(0);
    });
  });

  it('validates capacity values', () => {
    const { getZones } = require('../simulation/crowdSimulator');
    const zones = getZones();
    
    zones.forEach(zone => {
      expect(zone.capacity).toBeGreaterThan(0);
      expect(Number.isInteger(zone.capacity)).toBe(true);
    });
  });

  it('validates coordinate ranges', () => {
    const { getZones } = require('../simulation/crowdSimulator');
    const zones = getZones();
    
    zones.forEach(zone => {
      expect(zone.x).toBeGreaterThanOrEqual(0);
      expect(zone.x).toBeLessThanOrEqual(100);
      expect(zone.y).toBeGreaterThanOrEqual(0);
      expect(zone.y).toBeLessThanOrEqual(100);
    });
  });
});

describe('Performance', () => {
  it('getAllZones executes quickly', () => {
    const crowdService = require('../services/crowdService');
    const start = Date.now();
    
    for (let i = 0; i < 100; i++) {
      crowdService.getAllZones();
    }
    
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(200);
  });

  it('getSummary executes quickly', () => {
    const crowdService = require('../services/crowdService');
    const start = Date.now();
    
    for (let i = 0; i < 100; i++) {
      crowdService.getSummary();
    }
    
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(300);
  });
});

describe('Data Consistency', () => {
  it('zone count matches across methods', () => {
    const { getZones, getCurrentState } = require('../simulation/crowdSimulator');
    const zones = getZones();
    const state = getCurrentState();
    
    expect(Object.keys(state).length).toBe(zones.length);
  });

  it('all zones have consistent IDs', () => {
    const { getZones, getCurrentState } = require('../simulation/crowdSimulator');
    const zones = getZones();
    const state = getCurrentState();
    
    zones.forEach(zone => {
      expect(state[zone.id]).toBeDefined();
      expect(state[zone.id].id).toBe(zone.id);
    });
  });
});
