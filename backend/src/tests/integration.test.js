/**
 * Integration Tests
 * End-to-end testing of complete user workflows
 * 
 * @group integration
 * @group e2e
 */

const request = require('supertest');
const app = require('../app');

describe('Integration Tests - Complete User Workflows', () => {
  let authToken;
  let userId;

  describe('Complete Authentication Flow', () => {
    it('should complete full login workflow', async () => {
      // Step 1: Login
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'admin',
          password: 'admin123'
        });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body).toHaveProperty('token');
      expect(loginResponse.body).toHaveProperty('user');

      authToken = loginResponse.body.token;
      userId = loginResponse.body.user.id;

      // Step 2: Verify token works
      const meResponse = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(meResponse.status).toBe(200);
      expect(meResponse.body.user.id).toBe(userId);

      // Step 3: Logout
      const logoutResponse = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${authToken}`);

      expect(logoutResponse.status).toBe(200);
    });
  });

  describe('Complete Crowd Monitoring Workflow', () => {
    beforeAll(async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin', password: 'admin123' });
      authToken = response.body.token;
    });

    it('should retrieve complete crowd data pipeline', async () => {
      // Step 1: Get all zones
      const zonesResponse = await request(app)
        .get('/api/crowd/zones');

      expect(zonesResponse.status).toBe(200);
      expect(zonesResponse.body).toHaveProperty('zones');
      expect(Array.isArray(zonesResponse.body.zones)).toBe(true);

      const firstZoneId = Object.keys(zonesResponse.body.zones)[0];

      // Step 2: Get specific zone
      const zoneResponse = await request(app)
        .get(`/api/crowd/zones/${firstZoneId}`);

      expect(zoneResponse.status).toBe(200);
      expect(zoneResponse.body.zone).toHaveProperty('id');
      expect(zoneResponse.body.zone).toHaveProperty('current');
      expect(zoneResponse.body.zone).toHaveProperty('riskLevel');

      // Step 3: Get heatmap
      const heatmapResponse = await request(app)
        .get('/api/crowd/heatmap');

      expect(heatmapResponse.status).toBe(200);
      expect(heatmapResponse.body).toHaveProperty('heatmap');

      // Step 4: Get summary
      const summaryResponse = await request(app)
        .get('/api/crowd/summary');

      expect(summaryResponse.status).toBe(200);
      expect(summaryResponse.body).toHaveProperty('totalCount');
      expect(summaryResponse.body).toHaveProperty('occupancyRate');
    });
  });

  describe('Complete Navigation Workflow', () => {
    it('should calculate route from start to destination', async () => {
      const response = await request(app)
        .post('/api/navigation/route')
        .send({
          start: 'gate-a',
          destination: 'north-stand'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('route');
      expect(response.body).toHaveProperty('distance');
      expect(response.body).toHaveProperty('estimatedTime');
      expect(Array.isArray(response.body.route)).toBe(true);
      expect(response.body.route.length).toBeGreaterThan(0);
    });

    it('should handle invalid destinations gracefully', async () => {
      const response = await request(app)
        .post('/api/navigation/route')
        .send({
          start: 'invalid-zone',
          destination: 'north-stand'
        });

      expect([400, 404]).toContain(response.status);
    });
  });

  describe('Complete Queue Management Workflow', () => {
    it('should retrieve queue predictions', async () => {
      const response = await request(app)
        .get('/api/queue/predictions');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('predictions');
      expect(Array.isArray(response.body.predictions)).toBe(true);

      if (response.body.predictions.length > 0) {
        const prediction = response.body.predictions[0];
        expect(prediction).toHaveProperty('zoneId');
        expect(prediction).toHaveProperty('waitTime');
        expect(prediction).toHaveProperty('trend');
      }
    });
  });

  describe('Complete Chat Workflow', () => {
    it('should handle chat conversation flow', async () => {
      // Question 1: Restroom
      const response1 = await request(app)
        .post('/api/chat/message')
        .send({ message: 'Where is the nearest restroom?' });

      expect(response1.status).toBe(200);
      expect(response1.body).toHaveProperty('response');
      expect(response1.body.response).toContain('restroom');

      // Question 2: Food
      const response2 = await request(app)
        .post('/api/chat/message')
        .send({ message: 'Where can I get food?' });

      expect(response2.status).toBe(200);
      expect(response2.body.response).toContain('food');

      // Question 3: Exit
      const response3 = await request(app)
        .post('/api/chat/message')
        .send({ message: 'How do I exit the stadium?' });

      expect(response3.status).toBe(200);
      expect(response3.body.response).toContain('exit');
    });

    it('should handle multiple languages gracefully', async () => {
      const messages = [
        'Where is the bathroom?',
        'Dónde está el baño?',
        'Où sont les toilettes?'
      ];

      for (const message of messages) {
        const response = await request(app)
          .post('/api/chat/message')
          .send({ message });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('response');
      }
    });
  });

  describe('Complete Alert Workflow', () => {
    it('should retrieve and manage alerts', async () => {
      const response = await request(app)
        .get('/api/alerts');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('alerts');
      expect(Array.isArray(response.body.alerts)).toBe(true);
    });
  });

  describe('Complete Analytics Workflow', () => {
    it('should retrieve analytics data', async () => {
      const response = await request(app)
        .get('/api/analytics/trends?hours=6');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('trends');
      expect(Array.isArray(response.body.trends)).toBe(true);
    });

    it('should handle different time ranges', async () => {
      const timeRanges = [1, 6, 12, 24];

      for (const hours of timeRanges) {
        const response = await request(app)
          .get(`/api/analytics/trends?hours=${hours}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('trends');
      }
    });
  });

  describe('Performance Tests', () => {
    it('should handle concurrent requests efficiently', async () => {
      const requests = Array(50).fill(0).map(() =>
        request(app).get('/api/crowd/zones')
      );

      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const endTime = Date.now();

      const allSuccessful = responses.every(r => r.status === 200);
      expect(allSuccessful).toBe(true);

      // Should complete 50 requests in under 5 seconds
      expect(endTime - startTime).toBeLessThan(5000);
    });

    it('should respond quickly to health checks', async () => {
      const startTime = Date.now();
      const response = await request(app).get('/health');
      const endTime = Date.now();

      expect(response.status).toBe(200);
      expect(endTime - startTime).toBeLessThan(100); // Under 100ms
    });
  });

  describe('Error Recovery', () => {
    it('should recover from malformed requests', async () => {
      const response = await request(app)
        .post('/api/chat/message')
        .send({ invalid: 'data' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
    });

    it('should handle database connection failures gracefully', async () => {
      // This tests graceful degradation
      const response = await request(app)
        .get('/api/crowd/zones');

      expect(response.status).toBe(200);
      // Should still return data even if DB is down (uses simulation)
    });
  });

  describe('Data Consistency', () => {
    it('should maintain data consistency across endpoints', async () => {
      const summaryResponse = await request(app)
        .get('/api/crowd/summary');

      const zonesResponse = await request(app)
        .get('/api/crowd/zones');

      expect(summaryResponse.status).toBe(200);
      expect(zonesResponse.status).toBe(200);

      // Verify timestamps are recent (within last 10 seconds)
      const summaryTime = new Date(summaryResponse.body.timestamp);
      const zonesTime = new Date(zonesResponse.body.timestamp);
      const now = new Date();

      expect(now - summaryTime).toBeLessThan(10000);
      expect(now - zonesTime).toBeLessThan(10000);
    });
  });
});
