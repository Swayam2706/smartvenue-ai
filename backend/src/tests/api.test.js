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
});
