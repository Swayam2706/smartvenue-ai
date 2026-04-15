/**
 * API Integration Tests — supertest
 * Tests all major endpoints for correctness, validation, and security
 */

jest.mock('../websocket/wsServer', () => ({ broadcast: jest.fn(), broadcastAlert: jest.fn() }));

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../app');

// Helper: generate valid admin token using same secret as setup.js
const makeToken = (role = 'admin') =>
  jwt.sign({ id: '1', username: 'admin', role, name: 'Test Admin' }, process.env.JWT_SECRET);

// ─── Health ───────────────────────────────────────────────────────────────────
describe('GET /health', () => {
  it('returns 200 with status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('SmartVenue AI');
    expect(res.body.timestamp).toBeDefined();
  });
});

// ─── Auth ─────────────────────────────────────────────────────────────────────
describe('POST /api/auth/login', () => {
  it('returns token for valid admin credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin123' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.role).toBe('admin');
    expect(res.body.user.username).toBe('admin');
  });

  it('returns 401 for wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'wrongpassword' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid credentials');
  });

  it('returns 401 for unknown user', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'hacker', password: 'anything' });
    expect(res.status).toBe(401);
  });

  it('returns 400 for missing fields', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin' });
    expect(res.status).toBe(400);
  });

  it('returns token for operator credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'operator', password: 'operator123' });
    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('operator');
  });
});

describe('GET /api/auth/me', () => {
  it('returns user for valid token', async () => {
    const token = makeToken();
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.user).toBeDefined();
  });

  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });
});

// ─── Crowd ────────────────────────────────────────────────────────────────────
describe('GET /api/crowd/zones', () => {
  it('returns array of zones', async () => {
    const res = await request(app).get('/api/crowd/zones');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.zones)).toBe(true);
    expect(res.body.zones.length).toBeGreaterThan(0);
    expect(res.body.timestamp).toBeDefined();
  });

  it('each zone has required fields', async () => {
    const res = await request(app).get('/api/crowd/zones');
    res.body.zones.forEach(zone => {
      expect(zone).toHaveProperty('id');
      expect(zone).toHaveProperty('name');
      expect(zone).toHaveProperty('current');
      expect(zone).toHaveProperty('riskLevel');
      expect(zone.current).toBeGreaterThanOrEqual(0);
      expect(zone.current).toBeLessThanOrEqual(1);
    });
  });
});

describe('GET /api/crowd/summary', () => {
  it('returns venue summary', async () => {
    const res = await request(app).get('/api/crowd/summary');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('totalCount');
    expect(res.body).toHaveProperty('occupancyRate');
    expect(res.body).toHaveProperty('criticalZones');
    expect(res.body).toHaveProperty('highRiskZones');
  });
});

describe('GET /api/crowd/zones/:id', () => {
  it('returns specific zone', async () => {
    const res = await request(app).get('/api/crowd/zones/gate-a');
    expect(res.status).toBe(200);
    expect(res.body.zone.id).toBe('gate-a');
  });

  it('returns 404 for unknown zone', async () => {
    const res = await request(app).get('/api/crowd/zones/nonexistent-zone');
    expect(res.status).toBe(404);
  });
});

// ─── Navigation ───────────────────────────────────────────────────────────────
describe('POST /api/navigation/route', () => {
  it('returns route between valid zones', async () => {
    const res = await request(app)
      .post('/api/navigation/route')
      .send({ from: 'gate-a', to: 'north-stand', preference: 'balanced' });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.route)).toBe(true);
    expect(res.body.route.length).toBeGreaterThan(0);
    expect(res.body.routeScore).toBeDefined();
    expect(res.body.estimatedTime).toBeGreaterThan(0);
  });

  it('returns 400 for missing origin', async () => {
    const res = await request(app)
      .post('/api/navigation/route')
      .send({ to: 'north-stand' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid zone id', async () => {
    const res = await request(app)
      .post('/api/navigation/route')
      .send({ from: 'fake-zone', to: 'north-stand' });
    expect(res.status).toBe(400);
  });

  it('route score is between 0 and 100', async () => {
    const res = await request(app)
      .post('/api/navigation/route')
      .send({ from: 'gate-a', to: 'south-stand' });
    expect(res.status).toBe(200);
    expect(res.body.routeScore).toBeGreaterThanOrEqual(0);
    expect(res.body.routeScore).toBeLessThanOrEqual(100);
  });
});

// ─── Queue ────────────────────────────────────────────────────────────────────
describe('GET /api/queue/all', () => {
  it('returns all queue categories', async () => {
    const res = await request(app).get('/api/queue/all');
    expect(res.status).toBe(200);
    expect(res.body.queues).toHaveProperty('gates');
    expect(res.body.queues).toHaveProperty('food');
    expect(res.body.queues).toHaveProperty('restrooms');
  });

  it('each queue has wait time fields', async () => {
    const res = await request(app).get('/api/queue/all');
    const allQueues = Object.values(res.body.queues).flat();
    allQueues.forEach(q => {
      expect(q).toHaveProperty('currentWait');
      expect(q).toHaveProperty('predictedWait');
      expect(q.currentWait).toBeGreaterThanOrEqual(0);
    });
  });
});

describe('GET /api/queue/:category', () => {
  it('returns gates category', async () => {
    const res = await request(app).get('/api/queue/gates');
    expect(res.status).toBe(200);
    expect(res.body.category).toBe('gates');
    expect(res.body.bestOption).toBeDefined();
  });

  it('returns 404 for invalid category', async () => {
    const res = await request(app).get('/api/queue/invalid');
    expect(res.status).toBe(404);
  });
});

// ─── Chat ─────────────────────────────────────────────────────────────────────
describe('POST /api/chat/message', () => {
  it('returns response for washroom query', async () => {
    const res = await request(app)
      .post('/api/chat/message')
      .send({ message: 'Where is the nearest washroom?' });
    expect(res.status).toBe(200);
    expect(res.body.response).toBeDefined();
    expect(typeof res.body.response).toBe('string');
    expect(res.body.response.length).toBeGreaterThan(0);
    expect(res.body.usedAI).toBeDefined();
  });

  it('returns response for exit query', async () => {
    const res = await request(app)
      .post('/api/chat/message')
      .send({ message: 'What is the fastest exit?' });
    expect(res.status).toBe(200);
    expect(res.body.response).toContain('🚪');
  });

  it('returns 400 for empty message', async () => {
    const res = await request(app)
      .post('/api/chat/message')
      .send({ message: '' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for message over 500 chars', async () => {
    const res = await request(app)
      .post('/api/chat/message')
      .send({ message: 'a'.repeat(501) });
    expect(res.status).toBe(400);
  });
});

// ─── Alerts ───────────────────────────────────────────────────────────────────
describe('GET /api/alerts', () => {
  it('returns alerts array', async () => {
    const res = await request(app).get('/api/alerts');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.alerts)).toBe(true);
    expect(res.body.activeCount).toBeDefined();
  });
});

describe('POST /api/alerts', () => {
  it('creates alert with admin token', async () => {
    const token = makeToken('admin');
    const res = await request(app)
      .post('/api/alerts')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'warning', title: 'Test Alert', message: 'Test message' });
    expect(res.status).toBe(201);
    expect(res.body.alert.title).toBe('Test Alert');
  });

  it('returns 401 without token', async () => {
    const res = await request(app)
      .post('/api/alerts')
      .send({ type: 'warning', title: 'Test', message: 'Test' });
    expect(res.status).toBe(401);
  });

  it('returns 403 for operator role', async () => {
    const token = makeToken('operator');
    const res = await request(app)
      .post('/api/alerts')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'warning', title: 'Test', message: 'Test' });
    expect(res.status).toBe(403);
  });
});

// ─── Analytics ────────────────────────────────────────────────────────────────
describe('GET /api/analytics/overview', () => {
  it('returns analytics for admin', async () => {
    const token = makeToken('admin');
    const res = await request(app)
      .get('/api/analytics/overview')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.current).toBeDefined();
    expect(res.body.historical).toBeDefined();
    expect(Array.isArray(res.body.historical)).toBe(true);
  });

  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/analytics/overview');
    expect(res.status).toBe(401);
  });
});

// ─── 404 ──────────────────────────────────────────────────────────────────────
describe('Unknown routes', () => {
  it('returns 404 for unknown API route', async () => {
    const res = await request(app).get('/api/nonexistent');
    expect(res.status).toBe(404);
  });

  it('returns 404 for root path', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(404);
  });
});

// ─── Heatmap ──────────────────────────────────────────────────────────────────
describe('GET /api/crowd/heatmap', () => {
  it('returns heatmap data', async () => {
    const res = await request(app).get('/api/crowd/heatmap');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.heatmap)).toBe(true);
    expect(res.body.heatmap.length).toBeGreaterThan(0);
  });

  it('heatmap has coordinate data', async () => {
    const res = await request(app).get('/api/crowd/heatmap');
    res.body.heatmap.forEach(zone => {
      expect(zone).toHaveProperty('x');
      expect(zone).toHaveProperty('y');
      expect(zone).toHaveProperty('density');
      expect(zone.x).toBeGreaterThanOrEqual(0);
      expect(zone.y).toBeGreaterThanOrEqual(0);
    });
  });

  it('has cache headers', async () => {
    const res = await request(app).get('/api/crowd/heatmap');
    expect(res.headers['cache-control']).toBeDefined();
  });
});

// ─── Alert Acknowledgment ─────────────────────────────────────────────────────
describe('PATCH /api/alerts/:id/acknowledge', () => {
  it('acknowledges alert with valid token', async () => {
    const token = makeToken('admin');
    
    // First create an alert
    const createRes = await request(app)
      .post('/api/alerts')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'warning', title: 'Test', message: 'Test message' });
    
    const alertId = createRes.body.alert.id;
    
    // Then acknowledge it
    const res = await request(app)
      .patch(`/api/alerts/${alertId}/acknowledge`)
      .set('Authorization', `Bearer ${token}`);
    
    expect(res.status).toBe(200);
    expect(res.body.alert.acknowledged).toBe(true);
    expect(res.body.alert.acknowledgedBy).toBe('admin');
  });

  it('returns 404 for non-existent alert', async () => {
    const token = makeToken('admin');
    const res = await request(app)
      .patch('/api/alerts/999999/acknowledge')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it('returns 401 without token', async () => {
    const res = await request(app).patch('/api/alerts/1/acknowledge');
    expect(res.status).toBe(401);
  });
});

// ─── Emergency Alert ──────────────────────────────────────────────────────────
describe('POST /api/alerts/emergency', () => {
  it('creates emergency alert with admin token', async () => {
    const token = makeToken('admin');
    const res = await request(app)
      .post('/api/alerts/emergency')
      .set('Authorization', `Bearer ${token}`)
      .send({ message: 'Test emergency' });
    
    expect(res.status).toBe(201);
    expect(res.body.alert.type).toBe('evacuation');
    expect(res.body.alert.priority).toBe('CRITICAL');
    expect(res.body.alert.safeZones).toBeDefined();
  });

  it('returns 403 for operator role', async () => {
    const token = makeToken('operator');
    const res = await request(app)
      .post('/api/alerts/emergency')
      .set('Authorization', `Bearer ${token}`)
      .send({ message: 'Test' });
    expect(res.status).toBe(403);
  });

  it('uses default message if not provided', async () => {
    const token = makeToken('admin');
    const res = await request(app)
      .post('/api/alerts/emergency')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    
    expect(res.status).toBe(201);
    expect(res.body.alert.message).toContain('evacuation');
  });
});

// ─── Analytics Trends ─────────────────────────────────────────────────────────
describe('GET /api/analytics/trends', () => {
  it('returns trend data', async () => {
    const res = await request(app).get('/api/analytics/trends');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.trends)).toBe(true);
    expect(res.body.hours).toBeDefined();
  });

  it('respects hours query parameter', async () => {
    const res = await request(app).get('/api/analytics/trends?hours=12');
    expect(res.status).toBe(200);
    expect(res.body.hours).toBe(12);
    expect(res.body.trends.length).toBeGreaterThan(0);
  });

  it('caps hours at 48', async () => {
    const res = await request(app).get('/api/analytics/trends?hours=100');
    expect(res.status).toBe(200);
    expect(res.body.hours).toBe(48);
  });

  it('has cache headers', async () => {
    const res = await request(app).get('/api/analytics/trends');
    expect(res.headers['cache-control']).toBeDefined();
  });

  it('trend data has required fields', async () => {
    const res = await request(app).get('/api/analytics/trends');
    res.body.trends.forEach(point => {
      expect(point).toHaveProperty('time');
      expect(point).toHaveProperty('hour');
      expect(point).toHaveProperty('occupancy');
      expect(point).toHaveProperty('avgWaitTime');
      expect(point.occupancy).toBeGreaterThanOrEqual(0);
      expect(point.occupancy).toBeLessThanOrEqual(1);
    });
  });
});

// ─── Queue Categories ─────────────────────────────────────────────────────────
describe('Queue categories', () => {
  it('food category returns food courts', async () => {
    const res = await request(app).get('/api/queue/food');
    expect(res.status).toBe(200);
    expect(res.body.category).toBe('food');
    res.body.queues.forEach(q => {
      expect(q.id).toContain('food');
    });
  });

  it('restrooms category returns restrooms', async () => {
    const res = await request(app).get('/api/queue/restrooms');
    expect(res.status).toBe(200);
    expect(res.body.category).toBe('restrooms');
    res.body.queues.forEach(q => {
      expect(q.id).toContain('restroom');
    });
  });

  it('bestOption has lowest wait time', async () => {
    const res = await request(app).get('/api/queue/gates');
    expect(res.status).toBe(200);
    const best = res.body.bestOption;
    const allWaits = res.body.queues.map(q => q.currentWait);
    expect(best.currentWait).toBe(Math.min(...allWaits));
  });
});

// ─── Chat Variations ──────────────────────────────────────────────────────────
describe('Chat query variations', () => {
  it('handles food query', async () => {
    const res = await request(app)
      .post('/api/chat/message')
      .send({ message: 'Where can I get food?' });
    expect(res.status).toBe(200);
    expect(res.body.response).toContain('🍔');
  });

  it('handles parking query', async () => {
    const res = await request(app)
      .post('/api/chat/message')
      .send({ message: 'Where should I park?' });
    expect(res.status).toBe(200);
    expect(res.body.response).toContain('🅿️');
  });

  it('handles medical query', async () => {
    const res = await request(app)
      .post('/api/chat/message')
      .send({ message: 'Where is medical center?' });
    expect(res.status).toBe(200);
    expect(res.body.response).toContain('🏥');
  });

  it('handles crowd status query', async () => {
    const res = await request(app)
      .post('/api/chat/message')
      .send({ message: 'How crowded is it?' });
    expect(res.status).toBe(200);
    expect(res.body.response).toBeDefined();
  });

  it('handles VIP lounge query', async () => {
    const res = await request(app)
      .post('/api/chat/message')
      .send({ message: 'VIP lounge status?' });
    expect(res.status).toBe(200);
    expect(res.body.response).toContain('⭐');
  });

  it('handles generic query', async () => {
    const res = await request(app)
      .post('/api/chat/message')
      .send({ message: 'Hello' });
    expect(res.status).toBe(200);
    expect(res.body.response).toContain('🤖');
  });
});

// ─── Navigation Preferences ───────────────────────────────────────────────────
describe('Navigation preferences', () => {
  it('handles fastest preference', async () => {
    const res = await request(app)
      .post('/api/navigation/route')
      .send({ from: 'gate-a', to: 'north-stand', preference: 'fastest' });
    expect(res.status).toBe(200);
    expect(res.body.preference).toBe('fastest');
  });

  it('handles safest preference', async () => {
    const res = await request(app)
      .post('/api/navigation/route')
      .send({ from: 'gate-a', to: 'south-stand', preference: 'safest' });
    expect(res.status).toBe(200);
    expect(res.body.preference).toBe('safest');
  });

  it('defaults to balanced preference', async () => {
    const res = await request(app)
      .post('/api/navigation/route')
      .send({ from: 'gate-a', to: 'east-stand' });
    expect(res.status).toBe(200);
    expect(res.body.preference).toBe('balanced');
  });
});

// ─── Alert Validation ─────────────────────────────────────────────────────────
describe('Alert validation', () => {
  const token = makeToken('admin');

  it('rejects invalid alert type', async () => {
    const res = await request(app)
      .post('/api/alerts')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'invalid', title: 'Test', message: 'Test' });
    expect(res.status).toBe(400);
  });

  it('rejects empty title', async () => {
    const res = await request(app)
      .post('/api/alerts')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'warning', title: '', message: 'Test' });
    expect(res.status).toBe(400);
  });

  it('rejects empty message', async () => {
    const res = await request(app)
      .post('/api/alerts')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'warning', title: 'Test', message: '' });
    expect(res.status).toBe(400);
  });

  it('accepts all valid alert types', async () => {
    const types = ['info', 'warning', 'critical', 'evacuation'];
    for (const type of types) {
      const res = await request(app)
        .post('/api/alerts')
        .set('Authorization', `Bearer ${token}`)
        .send({ type, title: 'Test', message: 'Test message' });
      expect(res.status).toBe(201);
      expect(res.body.alert.type).toBe(type);
    }
  });
});

// ─── Rate Limiting ────────────────────────────────────────────────────────────
describe('Rate limiting', () => {
  it('health endpoint is not rate limited', async () => {
    for (let i = 0; i < 10; i++) {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
    }
  });
});

// ─── CORS ─────────────────────────────────────────────────────────────────────
describe('CORS headers', () => {
  it('includes CORS headers', async () => {
    const res = await request(app)
      .get('/health')
      .set('Origin', 'http://localhost:5173');
    expect(res.headers['access-control-allow-origin']).toBeDefined();
  });
});

// ─── Logout ───────────────────────────────────────────────────────────────────
describe('POST /api/auth/logout', () => {
  it('logs out successfully', async () => {
    const token = makeToken('admin');
    const res = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Logged out successfully');
  });

  it('requires authentication', async () => {
    const res = await request(app).post('/api/auth/logout');
    expect(res.status).toBe(401);
  });
});
