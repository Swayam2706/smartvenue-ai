/**
 * Routes Unit Tests
 * Comprehensive tests for all route handlers
 * 
 * @group unit
 * @group routes
 */

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../app');

describe('Routes - Comprehensive Coverage', () => {
  let adminToken;
  let operatorToken;

  beforeAll(async () => {
    // Get admin token
    const adminRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin123' });
    adminToken = adminRes.body.token;

    // Get operator token
    const operatorRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'operator', password: 'operator123' });
    operatorToken = operatorRes.body.token;
  });

  describe('Health Routes', () => {
    it('GET /health should return service status', async () => {
      const res = await request(app).get('/health');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status', 'ok');
      expect(res.body).toHaveProperty('service');
      expect(res.body).toHaveProperty('timestamp');
      expect(res.body).toHaveProperty('uptime');
    });

    it('GET /health should have correct content type', async () => {
      const res = await request(app).get('/health');

      expect(res.headers['content-type']).toMatch(/json/);
    });

    it('GET /health should respond quickly', async () => {
      const start = Date.now();
      await request(app).get('/health');
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(100);
    });
  });

  describe('Auth Routes', () => {
    describe('POST /api/auth/login', () => {
      it('should validate request body', async () => {
        const res = await request(app)
          .post('/api/auth/login')
          .send({});

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('errors');
      });

      it('should return user data on success', async () => {
        const res = await request(app)
          .post('/api/auth/login')
          .send({ username: 'admin', password: 'admin123' });

        expect(res.status).toBe(200);
        expect(res.body.user).toHaveProperty('id');
        expect(res.body.user).toHaveProperty('username');
        expect(res.body.user).toHaveProperty('role');
        expect(res.body.user).toHaveProperty('name');
        expect(res.body.user).not.toHaveProperty('password');
      });

      it('should set correct content type', async () => {
        const res = await request(app)
          .post('/api/auth/login')
          .send({ username: 'admin', password: 'admin123' });

        expect(res.headers['content-type']).toMatch(/json/);
      });

      it('should handle concurrent login requests', async () => {
        const requests = Array(10).fill(0).map(() =>
          request(app)
            .post('/api/auth/login')
            .send({ username: 'admin', password: 'admin123' })
        );

        const responses = await Promise.all(requests);
        expect(responses.every(r => r.status === 200)).toBe(true);
      });
    });

    describe('GET /api/auth/me', () => {
      it('should return current user data', async () => {
        const res = await request(app)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('user');
        expect(res.body.user).toHaveProperty('username');
        expect(res.body.user).not.toHaveProperty('password');
      });

      it('should reject invalid token format', async () => {
        const res = await request(app)
          .get('/api/auth/me')
          .set('Authorization', 'InvalidFormat');

        expect(res.status).toBe(401);
      });

      it('should reject missing Authorization header', async () => {
        const res = await request(app).get('/api/auth/me');

        expect(res.status).toBe(401);
      });
    });

    describe('POST /api/auth/logout', () => {
      it('should logout successfully', async () => {
        const res = await request(app)
          .post('/api/auth/logout')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('message');
      });

      it('should require authentication', async () => {
        const res = await request(app).post('/api/auth/logout');

        expect(res.status).toBe(401);
      });
    });
  });

  describe('Crowd Routes', () => {
    describe('GET /api/crowd/zones', () => {
      it('should return all zones', async () => {
        const res = await request(app).get('/api/crowd/zones');

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('zones');
        expect(res.body).toHaveProperty('timestamp');
        expect(Array.isArray(res.body.zones)).toBe(true);
      });

      it('should include cache headers', async () => {
        const res = await request(app).get('/api/crowd/zones');

        expect(res.headers['cache-control']).toBeDefined();
      });

      it('should return consistent data structure', async () => {
        const res = await request(app).get('/api/crowd/zones');

        res.body.zones.forEach(zone => {
          expect(zone).toHaveProperty('id');
          expect(zone).toHaveProperty('name');
          expect(zone).toHaveProperty('current');
          expect(zone).toHaveProperty('capacity');
          expect(zone).toHaveProperty('riskLevel');
        });
      });
    });

    describe('GET /api/crowd/zones/:id', () => {
      it('should return specific zone', async () => {
        const res = await request(app).get('/api/crowd/zones/gate-a');

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('zone');
        expect(res.body.zone.id).toBe('gate-a');
      });

      it('should return 404 for invalid zone', async () => {
        const res = await request(app).get('/api/crowd/zones/invalid-zone-id');

        expect(res.status).toBe(404);
        expect(res.body).toHaveProperty('error');
      });

      it('should handle special characters in ID', async () => {
        const res = await request(app).get('/api/crowd/zones/zone%20with%20spaces');

        expect([404, 400]).toContain(res.status);
      });
    });

    describe('GET /api/crowd/summary', () => {
      it('should return venue summary', async () => {
        const res = await request(app).get('/api/crowd/summary');

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('totalCount');
        expect(res.body).toHaveProperty('totalCapacity');
        expect(res.body).toHaveProperty('occupancyRate');
        expect(res.body).toHaveProperty('criticalZones');
        expect(res.body).toHaveProperty('highRiskZones');
        expect(res.body).toHaveProperty('safeZones');
      });

      it('should have valid numeric values', async () => {
        const res = await request(app).get('/api/crowd/summary');

        expect(res.body.totalCount).toBeGreaterThanOrEqual(0);
        expect(res.body.totalCapacity).toBeGreaterThan(0);
        expect(res.body.occupancyRate).toBeGreaterThanOrEqual(0);
        expect(res.body.occupancyRate).toBeLessThanOrEqual(1);
      });
    });

    describe('GET /api/crowd/heatmap', () => {
      it('should return heatmap data', async () => {
        const res = await request(app).get('/api/crowd/heatmap');

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('heatmap');
        expect(Array.isArray(res.body.heatmap)).toBe(true);
      });

      it('should have coordinate data', async () => {
        const res = await request(app).get('/api/crowd/heatmap');

        res.body.heatmap.forEach(zone => {
          expect(zone).toHaveProperty('x');
          expect(zone).toHaveProperty('y');
          expect(zone).toHaveProperty('density');
          expect(zone.x).toBeGreaterThanOrEqual(0);
          expect(zone.y).toBeGreaterThanOrEqual(0);
        });
      });
    });
  });

  describe('Navigation Routes', () => {
    describe('POST /api/navigation/route', () => {
      it('should calculate route', async () => {
        const res = await request(app)
          .post('/api/navigation/route')
          .send({ from: 'gate-a', to: 'north-stand' });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('route');
        expect(res.body).toHaveProperty('estimatedTime');
        expect(res.body).toHaveProperty('routeScore');
      });

      it('should validate required fields', async () => {
        const res = await request(app)
          .post('/api/navigation/route')
          .send({});

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('errors');
      });

      it('should handle invalid zones', async () => {
        const res = await request(app)
          .post('/api/navigation/route')
          .send({ from: 'invalid', to: 'invalid' });

        expect(res.status).toBe(400);
      });

      it('should support different preferences', async () => {
        const preferences = ['fastest', 'safest', 'balanced'];

        for (const pref of preferences) {
          const res = await request(app)
            .post('/api/navigation/route')
            .send({ from: 'gate-a', to: 'north-stand', preference: pref });

          expect(res.status).toBe(200);
          expect(res.body.preference).toBe(pref);
        }
      });
    });
  });

  describe('Queue Routes', () => {
    describe('GET /api/queue/all', () => {
      it('should return all queue categories', async () => {
        const res = await request(app).get('/api/queue/all');

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('queues');
        expect(res.body.queues).toHaveProperty('gates');
        expect(res.body.queues).toHaveProperty('food');
        expect(res.body.queues).toHaveProperty('restrooms');
      });
    });

    describe('GET /api/queue/:category', () => {
      it('should return specific category', async () => {
        const res = await request(app).get('/api/queue/gates');

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('category', 'gates');
        expect(res.body).toHaveProperty('queues');
        expect(res.body).toHaveProperty('bestOption');
      });

      it('should return 404 for invalid category', async () => {
        const res = await request(app).get('/api/queue/invalid');

        expect(res.status).toBe(404);
      });

      it('should handle all valid categories', async () => {
        const categories = ['gates', 'food', 'restrooms'];

        for (const cat of categories) {
          const res = await request(app).get(`/api/queue/${cat}`);
          expect(res.status).toBe(200);
          expect(res.body.category).toBe(cat);
        }
      });
    });

    describe('GET /api/queue/predictions', () => {
      it('should return queue predictions', async () => {
        const res = await request(app).get('/api/queue/predictions');

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('predictions');
        expect(Array.isArray(res.body.predictions)).toBe(true);
      });
    });
  });

  describe('Chat Routes', () => {
    describe('POST /api/chat/message', () => {
      it('should process chat message', async () => {
        const res = await request(app)
          .post('/api/chat/message')
          .send({ message: 'Where is the restroom?' });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('response');
        expect(typeof res.body.response).toBe('string');
      });

      it('should validate message field', async () => {
        const res = await request(app)
          .post('/api/chat/message')
          .send({});

        expect(res.status).toBe(400);
      });

      it('should reject empty message', async () => {
        const res = await request(app)
          .post('/api/chat/message')
          .send({ message: '' });

        expect(res.status).toBe(400);
      });

      it('should reject oversized message', async () => {
        const res = await request(app)
          .post('/api/chat/message')
          .send({ message: 'a'.repeat(501) });

        expect(res.status).toBe(400);
      });

      it('should handle various query types', async () => {
        const queries = [
          'Where is the bathroom?',
          'How do I exit?',
          'Where can I get food?',
          'Is it crowded?'
        ];

        for (const query of queries) {
          const res = await request(app)
            .post('/api/chat/message')
            .send({ message: query });

          expect(res.status).toBe(200);
          expect(res.body.response).toBeDefined();
        }
      });
    });
  });

  describe('Alert Routes', () => {
    describe('GET /api/alerts', () => {
      it('should return alerts list', async () => {
        const res = await request(app).get('/api/alerts');

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('alerts');
        expect(res.body).toHaveProperty('activeCount');
        expect(Array.isArray(res.body.alerts)).toBe(true);
      });
    });

    describe('POST /api/alerts', () => {
      it('should create alert with admin token', async () => {
        const res = await request(app)
          .post('/api/alerts')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            type: 'warning',
            title: 'Test Alert',
            message: 'Test message'
          });

        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty('alert');
        expect(res.body.alert.type).toBe('warning');
      });

      it('should require authentication', async () => {
        const res = await request(app)
          .post('/api/alerts')
          .send({
            type: 'warning',
            title: 'Test',
            message: 'Test'
          });

        expect(res.status).toBe(401);
      });

      it('should require admin role', async () => {
        const res = await request(app)
          .post('/api/alerts')
          .set('Authorization', `Bearer ${operatorToken}`)
          .send({
            type: 'warning',
            title: 'Test',
            message: 'Test'
          });

        expect(res.status).toBe(403);
      });

      it('should validate alert data', async () => {
        const res = await request(app)
          .post('/api/alerts')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({});

        expect(res.status).toBe(400);
      });
    });

    describe('PATCH /api/alerts/:id/acknowledge', () => {
      it('should acknowledge alert', async () => {
        // Create alert first
        const createRes = await request(app)
          .post('/api/alerts')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            type: 'warning',
            title: 'Test',
            message: 'Test'
          });

        const alertId = createRes.body.alert.id;

        // Acknowledge it
        const res = await request(app)
          .patch(`/api/alerts/${alertId}/acknowledge`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.alert.acknowledged).toBe(true);
      });

      it('should return 404 for invalid alert ID', async () => {
        const res = await request(app)
          .patch('/api/alerts/999999/acknowledge')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(404);
      });
    });

    describe('POST /api/alerts/emergency', () => {
      it('should create emergency alert', async () => {
        const res = await request(app)
          .post('/api/alerts/emergency')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ message: 'Emergency test' });

        expect(res.status).toBe(201);
        expect(res.body.alert.type).toBe('evacuation');
        expect(res.body.alert.priority).toBe('CRITICAL');
      });

      it('should require admin role', async () => {
        const res = await request(app)
          .post('/api/alerts/emergency')
          .set('Authorization', `Bearer ${operatorToken}`)
          .send({ message: 'Test' });

        expect(res.status).toBe(403);
      });
    });
  });

  describe('Analytics Routes', () => {
    describe('GET /api/analytics/overview', () => {
      it('should return analytics overview', async () => {
        const res = await request(app)
          .get('/api/analytics/overview')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('current');
        expect(res.body).toHaveProperty('historical');
      });

      it('should require authentication', async () => {
        const res = await request(app).get('/api/analytics/overview');

        expect(res.status).toBe(401);
      });
    });

    describe('GET /api/analytics/trends', () => {
      it('should return trend data', async () => {
        const res = await request(app).get('/api/analytics/trends');

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('trends');
        expect(Array.isArray(res.body.trends)).toBe(true);
      });

      it('should respect hours parameter', async () => {
        const res = await request(app).get('/api/analytics/trends?hours=12');

        expect(res.status).toBe(200);
        expect(res.body.hours).toBe(12);
      });

      it('should cap hours at maximum', async () => {
        const res = await request(app).get('/api/analytics/trends?hours=100');

        expect(res.status).toBe(200);
        expect(res.body.hours).toBeLessThanOrEqual(48);
      });
    });
  });

  describe('404 Handler', () => {
    it('should return 404 for unknown routes', async () => {
      const res = await request(app).get('/api/nonexistent/route');

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error');
    });

    it('should return JSON for API routes', async () => {
      const res = await request(app).get('/api/unknown');

      expect(res.headers['content-type']).toMatch(/json/);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON', async () => {
      const res = await request(app)
        .post('/api/chat/message')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}');

      expect(res.status).toBe(400);
    });

    it('should handle missing Content-Type', async () => {
      const res = await request(app)
        .post('/api/chat/message')
        .send('plain text');

      expect([400, 415]).toContain(res.status);
    });
  });
});
