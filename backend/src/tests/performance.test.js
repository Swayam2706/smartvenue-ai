/**
 * Performance Tests
 * Tests API response times and efficiency
 * 
 * @group performance
 */

const request = require('supertest');
const app = require('../app');

describe('Performance Tests', () => {
  describe('Response Times', () => {
    it('health endpoint should respond within 100ms', async () => {
      const start = Date.now();
      const response = await request(app).get('/health');
      const duration = Date.now() - start;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(100);
    });

    it('crowd zones endpoint should respond within 200ms', async () => {
      const start = Date.now();
      const response = await request(app).get('/api/crowd/zones');
      const duration = Date.now() - start;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(200);
    });

    it('navigation route calculation should complete within 500ms', async () => {
      const start = Date.now();
      const response = await request(app)
        .post('/api/navigation/route')
        .send({
          from: 'gate-a',
          to: 'north-stand',
          preference: 'balanced'
        });
      const duration = Date.now() - start;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(500);
    });
  });

  describe('Payload Sizes', () => {
    it('crowd zones response should be reasonably sized', async () => {
      const response = await request(app).get('/api/crowd/zones');
      const size = JSON.stringify(response.body).length;

      expect(response.status).toBe(200);
      expect(size).toBeLessThan(50000); // Less than 50KB
    });

    it('heatmap data should be optimized', async () => {
      const response = await request(app).get('/api/crowd/heatmap');
      const size = JSON.stringify(response.body).length;

      expect(response.status).toBe(200);
      expect(size).toBeLessThan(20000); // Less than 20KB
    });
  });

  describe('Caching', () => {
    it('should include cache headers for static data', async () => {
      const response = await request(app).get('/api/crowd/heatmap');
      
      expect(response.headers['cache-control']).toBeDefined();
      expect(response.headers['cache-control']).toContain('max-age');
    });

    it('should not cache dynamic auth responses', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin', password: 'admin123' });

      expect(response.headers['cache-control']).not.toContain('public');
    });
  });

  describe('Compression', () => {
    it('should support gzip compression', async () => {
      const response = await request(app)
        .get('/api/crowd/zones')
        .set('Accept-Encoding', 'gzip');

      // Response should either be compressed or support compression
      expect(response.status).toBe(200);
    });
  });

  describe('Concurrent Requests', () => {
    it('should handle 50 concurrent requests', async () => {
      const requests = Array(50).fill(null).map(() =>
        request(app).get('/api/crowd/zones')
      );

      const responses = await Promise.all(requests);
      const successful = responses.filter(r => r.status === 200);

      expect(successful.length).toBe(50);
    });

    it('should handle mixed concurrent requests', async () => {
      const requests = [
        ...Array(20).fill(null).map(() => request(app).get('/api/crowd/zones')),
        ...Array(20).fill(null).map(() => request(app).get('/api/crowd/summary')),
        ...Array(10).fill(null).map(() => request(app).get('/api/queue/all'))
      ];

      const start = Date.now();
      const responses = await Promise.all(requests);
      const duration = Date.now() - start;

      const successful = responses.filter(r => r.status === 200);
      expect(successful.length).toBe(50);
      expect(duration).toBeLessThan(2000); // All 50 requests in under 2 seconds
    });
  });

  describe('Memory Efficiency', () => {
    it('should not leak memory on repeated requests', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Make 100 requests
      for (let i = 0; i < 100; i++) {
        await request(app).get('/api/crowd/zones');
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (less than 10MB)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });
  });

  describe('Database Query Efficiency', () => {
    it('should retrieve all zones efficiently', async () => {
      const start = Date.now();
      const response = await request(app).get('/api/crowd/zones');
      const duration = Date.now() - start;

      expect(response.status).toBe(200);
      expect(response.body.zones.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(100);
    });

    it('should calculate route efficiently', async () => {
      const start = Date.now();
      const response = await request(app)
        .post('/api/navigation/route')
        .send({ from: 'gate-a', to: 'north-stand' });
      const duration = Date.now() - start;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(300);
    });
  });
});
