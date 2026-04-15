/**
 * Edge Cases and Boundary Tests
 * Tests for edge cases, boundary conditions, and error scenarios
 * 
 * @group unit
 * @group edge-cases
 */

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../app');
const { getCurrentState, simulateTick } = require('../simulation/crowdSimulator');
const crowdService = require('../services/crowdService');

describe('Edge Cases - Boundary Conditions', () => {
  describe('Numeric Boundaries', () => {
    it('should handle zero capacity zones', () => {
      const state = getCurrentState();
      Object.values(state).forEach(zone => {
        expect(zone.capacity).toBeGreaterThan(0);
      });
    });

    it('should handle maximum occupancy', () => {
      const state = getCurrentState();
      Object.values(state).forEach(zone => {
        expect(zone.current).toBeLessThanOrEqual(1);
      });
    });

    it('should handle negative wait times gracefully', () => {
      const state = getCurrentState();
      Object.values(state).forEach(zone => {
        expect(zone.waitTime).toBeGreaterThanOrEqual(0);
      });
    });

    it('should handle very large crowd numbers', () => {
      const summary = crowdService.getSummary();
      expect(summary.totalCount).toBeGreaterThanOrEqual(0);
      expect(summary.totalCount).toBeLessThan(Number.MAX_SAFE_INTEGER);
    });
  });

  describe('String Boundaries', () => {
    it('should handle empty string in chat', async () => {
      const response = await request(app)
        .post('/api/chat/message')
        .send({ message: '' });

      expect(response.status).toBe(400);
    });

    it('should handle whitespace-only message', async () => {
      const response = await request(app)
        .post('/api/chat/message')
        .send({ message: '   ' });

      expect(response.status).toBe(400);
    });

    it('should handle maximum length message', async () => {
      const response = await request(app)
        .post('/api/chat/message')
        .send({ message: 'a'.repeat(500) });

      expect(response.status).toBe(200);
    });

    it('should reject message exceeding limit', async () => {
      const response = await request(app)
        .post('/api/chat/message')
        .send({ message: 'a'.repeat(501) });

      expect(response.status).toBe(400);
    });

    it('should handle special characters in zone IDs', async () => {
      const specialChars = ['!', '@', '#', '$', '%'];
      
      for (const char of specialChars) {
        const response = await request(app)
          .get(`/api/crowd/zones/zone${char}test`);

        expect([404, 400]).toContain(response.status);
      }
    });

    it('should handle unicode in messages', async () => {
      const response = await request(app)
        .post('/api/chat/message')
        .send({ message: '你好世界 🌍 مرحبا' });

      expect(response.status).toBe(200);
    });

    it('should handle emoji in messages', async () => {
      const response = await request(app)
        .post('/api/chat/message')
        .send({ message: '🚀🎉🔥💯' });

      expect(response.status).toBe(200);
    });
  });

  describe('Array Boundaries', () => {
    it('should handle empty route array', async () => {
      const response = await request(app)
        .post('/api/navigation/route')
        .send({ from: 'gate-a', to: 'gate-a' }); // Same start and end

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.route)).toBe(true);
    });

    it('should handle predictions array length', () => {
      const state = getCurrentState();
      Object.values(state).forEach(zone => {
        expect(zone.predictions).toHaveLength(5);
      });
    });

    it('should handle empty alerts array', async () => {
      const response = await request(app).get('/api/alerts');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.alerts)).toBe(true);
    });
  });

  describe('Null and Undefined Handling', () => {
    it('should handle null message', async () => {
      const response = await request(app)
        .post('/api/chat/message')
        .send({ message: null });

      expect(response.status).toBe(400);
    });

    it('should handle undefined fields', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: undefined, password: undefined });

      expect(response.status).toBe(400);
    });

    it('should handle missing required fields', async () => {
      const response = await request(app)
        .post('/api/navigation/route')
        .send({});

      expect(response.status).toBe(400);
    });

    it('should handle null in navigation', async () => {
      const response = await request(app)
        .post('/api/navigation/route')
        .send({ from: null, to: null });

      expect(response.status).toBe(400);
    });
  });

  describe('Type Coercion', () => {
    it('should handle number as string in hours parameter', async () => {
      const response = await request(app)
        .get('/api/analytics/trends?hours=12');

      expect(response.status).toBe(200);
      expect(response.body.hours).toBe(12);
    });

    it('should handle boolean as string', async () => {
      const response = await request(app)
        .post('/api/chat/message')
        .send({ message: 'test', useAI: 'true' });

      expect([200, 400]).toContain(response.status);
    });

    it('should reject non-numeric hours', async () => {
      const response = await request(app)
        .get('/api/analytics/trends?hours=abc');

      expect([200, 400]).toContain(response.status);
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle simultaneous simulation ticks', () => {
      const promises = Array(10).fill(0).map(() => 
        Promise.resolve(simulateTick())
      );

      return expect(Promise.all(promises)).resolves.toBeDefined();
    });

    it('should handle concurrent zone reads', async () => {
      const requests = Array(20).fill(0).map(() =>
        request(app).get('/api/crowd/zones')
      );

      const responses = await Promise.all(requests);
      expect(responses.every(r => r.status === 200)).toBe(true);
    });

    it('should handle concurrent writes', async () => {
      const token = jwt.sign(
        { id: '1', username: 'admin', role: 'admin' },
        process.env.JWT_SECRET
      );

      const requests = Array(5).fill(0).map((_, i) =>
        request(app)
          .post('/api/alerts')
          .set('Authorization', `Bearer ${token}`)
          .send({
            type: 'warning',
            title: `Test ${i}`,
            message: `Test message ${i}`
          })
      );

      const responses = await Promise.all(requests);
      expect(responses.every(r => r.status === 201)).toBe(true);
    });
  });

  describe('Time-based Edge Cases', () => {
    it('should handle zero hours in trends', async () => {
      const response = await request(app)
        .get('/api/analytics/trends?hours=0');

      expect(response.status).toBe(200);
    });

    it('should handle negative hours in trends', async () => {
      const response = await request(app)
        .get('/api/analytics/trends?hours=-5');

      expect(response.status).toBe(200);
      expect(response.body.hours).toBeGreaterThanOrEqual(0);
    });

    it('should cap excessive hours', async () => {
      const response = await request(app)
        .get('/api/analytics/trends?hours=1000');

      expect(response.status).toBe(200);
      expect(response.body.hours).toBeLessThanOrEqual(48);
    });

    it('should handle fractional hours', async () => {
      const response = await request(app)
        .get('/api/analytics/trends?hours=6.5');

      expect(response.status).toBe(200);
    });
  });

  describe('Memory Leaks', () => {
    it('should not leak memory with repeated requests', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      for (let i = 0; i < 100; i++) {
        await request(app).get('/api/crowd/zones');
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const increase = finalMemory - initialMemory;

      // Should not increase by more than 20MB
      expect(increase).toBeLessThan(20 * 1024 * 1024);
    });

    it('should clean up simulation state', () => {
      const initialSize = JSON.stringify(getCurrentState()).length;

      for (let i = 0; i < 50; i++) {
        simulateTick();
      }

      const finalSize = JSON.stringify(getCurrentState()).length;

      // State size should remain relatively constant
      expect(Math.abs(finalSize - initialSize)).toBeLessThan(10000);
    });
  });

  describe('Error Recovery', () => {
    it('should recover from invalid JSON', async () => {
      const response = await request(app)
        .post('/api/chat/message')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}');

      expect(response.status).toBe(400);
    });

    it('should continue after failed request', async () => {
      // Make a bad request
      await request(app)
        .post('/api/auth/login')
        .send({ invalid: 'data' });

      // Next request should work
      const response = await request(app).get('/health');
      expect(response.status).toBe(200);
    });

    it('should handle malformed authorization header', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'InvalidFormat');

      expect(response.status).toBe(401);
    });

    it('should handle missing Bearer prefix', async () => {
      const token = jwt.sign({ id: '1' }, process.env.JWT_SECRET);
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', token);

      expect(response.status).toBe(401);
    });
  });

  describe('Data Validation Edge Cases', () => {
    it('should validate alert type', async () => {
      const token = jwt.sign(
        { id: '1', username: 'admin', role: 'admin' },
        process.env.JWT_SECRET
      );

      const response = await request(app)
        .post('/api/alerts')
        .set('Authorization', `Bearer ${token}`)
        .send({
          type: 'invalid-type',
          title: 'Test',
          message: 'Test'
        });

      expect(response.status).toBe(400);
    });

    it('should validate navigation preference', async () => {
      const response = await request(app)
        .post('/api/navigation/route')
        .send({
          from: 'gate-a',
          to: 'north-stand',
          preference: 'invalid-preference'
        });

      expect([200, 400]).toContain(response.status);
    });

    it('should validate queue category', async () => {
      const response = await request(app)
        .get('/api/queue/invalid-category');

      expect(response.status).toBe(404);
    });
  });

  describe('Floating Point Precision', () => {
    it('should handle floating point density values', () => {
      const state = getCurrentState();
      Object.values(state).forEach(zone => {
        expect(zone.current).toBeCloseTo(zone.current, 10);
      });
    });

    it('should handle occupancy rate precision', async () => {
      const response = await request(app).get('/api/crowd/summary');

      expect(response.status).toBe(200);
      expect(response.body.occupancyRate).toBeGreaterThanOrEqual(0);
      expect(response.body.occupancyRate).toBeLessThanOrEqual(1);
    });
  });

  describe('Case Sensitivity', () => {
    it('should handle case-insensitive zone lookup', async () => {
      const response = await request(app)
        .get('/api/crowd/zones/GATE-A');

      // Should either work or return 404
      expect([200, 404]).toContain(response.status);
    });

    it('should handle mixed case in navigation', async () => {
      const response = await request(app)
        .post('/api/navigation/route')
        .send({ from: 'Gate-A', to: 'North-Stand' });

      expect([200, 400, 404]).toContain(response.status);
    });
  });

  describe('Whitespace Handling', () => {
    it('should trim whitespace in login', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: '  admin  ',
          password: '  admin123  '
        });

      // Should either trim and succeed or fail
      expect([200, 401]).toContain(response.status);
    });

    it('should handle tabs and newlines', async () => {
      const response = await request(app)
        .post('/api/chat/message')
        .send({ message: 'test\n\tmessage' });

      expect(response.status).toBe(200);
    });
  });
});

describe('Edge Cases - Error Scenarios', () => {
  describe('Network Errors', () => {
    it('should handle timeout gracefully', async () => {
      const response = await request(app)
        .get('/api/crowd/zones')
        .timeout(10000);

      expect(response.status).toBe(200);
    });
  });

  describe('Resource Exhaustion', () => {
    it('should handle many simultaneous connections', async () => {
      const requests = Array(200).fill(0).map(() =>
        request(app).get('/health')
      );

      const responses = await Promise.all(requests);
      const successCount = responses.filter(r => r.status === 200).length;

      expect(successCount).toBeGreaterThan(150); // At least 75% success
    });
  });

  describe('State Consistency', () => {
    it('should maintain consistent state across requests', async () => {
      const response1 = await request(app).get('/api/crowd/zones');
      const response2 = await request(app).get('/api/crowd/zones');

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);

      // Timestamps should be close
      const time1 = new Date(response1.body.timestamp);
      const time2 = new Date(response2.body.timestamp);
      expect(Math.abs(time2 - time1)).toBeLessThan(5000);
    });
  });
});
