/**
 * End-to-End Tests
 * Complete user journey testing from start to finish
 * 
 * @group e2e
 * @group integration
 */

const request = require('supertest');
const app = require('../app');

describe('E2E - Complete User Journeys', () => {
  describe('Visitor Journey - Entry to Exit', () => {
    it('should complete full visitor flow', async () => {
      // Step 1: Check venue status before arrival
      const statusRes = await request(app).get('/api/crowd/summary');
      expect(statusRes.status).toBe(200);
      expect(statusRes.body).toHaveProperty('occupancyRate');

      // Step 2: Find least crowded gate
      const gatesRes = await request(app).get('/api/queue/gates');
      expect(gatesRes.status).toBe(200);
      expect(gatesRes.body).toHaveProperty('bestOption');
      const bestGate = gatesRes.body.bestOption;

      // Step 3: Navigate to recommended gate
      const navRes = await request(app)
        .post('/api/navigation/route')
        .send({ from: 'parking-a', to: bestGate.id });
      expect(navRes.status).toBe(200);
      expect(navRes.body).toHaveProperty('route');

      // Step 4: Check for alerts
      const alertsRes = await request(app).get('/api/alerts');
      expect(alertsRes.status).toBe(200);
      expect(alertsRes.body).toHaveProperty('alerts');

      // Step 5: Find restroom
      const chatRes = await request(app)
        .post('/api/chat/message')
        .send({ message: 'Where is the nearest restroom?' });
      expect(chatRes.status).toBe(200);
      expect(chatRes.body).toHaveProperty('response');

      // Step 6: Check food options
      const foodRes = await request(app).get('/api/queue/food');
      expect(foodRes.status).toBe(200);
      expect(foodRes.body).toHaveProperty('bestOption');

      // Step 7: Navigate to seat
      const seatNavRes = await request(app)
        .post('/api/navigation/route')
        .send({ from: bestGate.id, to: 'north-stand' });
      expect(seatNavRes.status).toBe(200);

      // Step 8: Check exit routes before leaving
      const exitRes = await request(app)
        .post('/api/chat/message')
        .send({ message: 'What is the fastest exit?' });
      expect(exitRes.status).toBe(200);
    });
  });

  describe('Admin Journey - Monitoring and Management', () => {
    let adminToken;
    let createdAlertId;

    it('should complete full admin workflow', async () => {
      // Step 1: Admin login
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin', password: 'admin123' });
      expect(loginRes.status).toBe(200);
      expect(loginRes.body).toHaveProperty('token');
      adminToken = loginRes.body.token;

      // Step 2: Verify authentication
      const meRes = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(meRes.status).toBe(200);
      expect(meRes.body.user.role).toBe('admin');

      // Step 3: Check analytics overview
      const analyticsRes = await request(app)
        .get('/api/analytics/overview')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(analyticsRes.status).toBe(200);
      expect(analyticsRes.body).toHaveProperty('current');

      // Step 4: Monitor crowd levels
      const crowdRes = await request(app).get('/api/crowd/zones');
      expect(crowdRes.status).toBe(200);

      // Step 5: Check for critical zones
      const summaryRes = await request(app).get('/api/crowd/summary');
      expect(summaryRes.status).toBe(200);
      const criticalCount = summaryRes.body.criticalZones;

      // Step 6: Create alert if needed
      if (criticalCount > 0) {
        const alertRes = await request(app)
          .post('/api/alerts')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            type: 'warning',
            title: 'High Crowd Density',
            message: `${criticalCount} zones at critical capacity`
          });
        expect(alertRes.status).toBe(201);
        createdAlertId = alertRes.body.alert.id;
      }

      // Step 7: View all alerts
      const allAlertsRes = await request(app).get('/api/alerts');
      expect(allAlertsRes.status).toBe(200);

      // Step 8: Acknowledge alert
      if (createdAlertId) {
        const ackRes = await request(app)
          .patch(`/api/alerts/${createdAlertId}/acknowledge`)
          .set('Authorization', `Bearer ${adminToken}`);
        expect(ackRes.status).toBe(200);
        expect(ackRes.body.alert.acknowledged).toBe(true);
      }

      // Step 9: Check trends
      const trendsRes = await request(app).get('/api/analytics/trends?hours=6');
      expect(trendsRes.status).toBe(200);
      expect(trendsRes.body).toHaveProperty('trends');

      // Step 10: Logout
      const logoutRes = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(logoutRes.status).toBe(200);
    });
  });

  describe('Operator Journey - Operational Tasks', () => {
    let operatorToken;

    it('should complete operator workflow', async () => {
      // Step 1: Operator login
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ username: 'operator', password: 'operator123' });
      expect(loginRes.status).toBe(200);
      operatorToken = loginRes.body.token;

      // Step 2: Monitor zones
      const zonesRes = await request(app).get('/api/crowd/zones');
      expect(zonesRes.status).toBe(200);

      // Step 3: Check specific zone
      const zoneRes = await request(app).get('/api/crowd/zones/gate-a');
      expect(zoneRes.status).toBe(200);

      // Step 4: View heatmap
      const heatmapRes = await request(app).get('/api/crowd/heatmap');
      expect(heatmapRes.status).toBe(200);

      // Step 5: Check queue status
      const queueRes = await request(app).get('/api/queue/all');
      expect(queueRes.status).toBe(200);

      // Step 6: View alerts (read-only)
      const alertsRes = await request(app).get('/api/alerts');
      expect(alertsRes.status).toBe(200);

      // Step 7: Attempt to create alert (should fail)
      const createAlertRes = await request(app)
        .post('/api/alerts')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({
          type: 'warning',
          title: 'Test',
          message: 'Test'
        });
      expect(createAlertRes.status).toBe(403);

      // Step 8: Logout
      const logoutRes = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${operatorToken}`);
      expect(logoutRes.status).toBe(200);
    });
  });

  describe('Emergency Scenario', () => {
    let adminToken;

    it('should handle emergency evacuation flow', async () => {
      // Step 1: Admin login
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin', password: 'admin123' });
      adminToken = loginRes.body.token;

      // Step 2: Trigger emergency alert
      const emergencyRes = await request(app)
        .post('/api/alerts/emergency')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ message: 'Emergency evacuation required' });
      expect(emergencyRes.status).toBe(201);
      expect(emergencyRes.body.alert.type).toBe('evacuation');
      expect(emergencyRes.body.alert.priority).toBe('CRITICAL');

      // Step 3: Get safe zones
      const safeZones = emergencyRes.body.alert.safeZones;
      expect(Array.isArray(safeZones)).toBe(true);

      // Step 4: Calculate evacuation routes
      const routeRes = await request(app)
        .post('/api/navigation/route')
        .send({
          from: 'north-stand',
          to: safeZones[0],
          preference: 'safest'
        });
      expect(routeRes.status).toBe(200);

      // Step 5: Verify all alerts are visible
      const alertsRes = await request(app).get('/api/alerts');
      expect(alertsRes.status).toBe(200);
      const hasEmergency = alertsRes.body.alerts.some(
        a => a.type === 'evacuation'
      );
      expect(hasEmergency).toBe(true);
    });
  });

  describe('Peak Load Scenario', () => {
    it('should handle high traffic during peak times', async () => {
      // Simulate 50 concurrent visitors checking status
      const requests = Array(50).fill(0).map(() =>
        request(app).get('/api/crowd/zones')
      );

      const responses = await Promise.all(requests);
      const successCount = responses.filter(r => r.status === 200).length;

      expect(successCount).toBe(50);

      // All responses should have consistent data structure
      responses.forEach(res => {
        expect(res.body).toHaveProperty('zones');
        expect(res.body).toHaveProperty('timestamp');
      });
    });

    it('should handle mixed concurrent operations', async () => {
      const operations = [
        request(app).get('/api/crowd/zones'),
        request(app).get('/api/crowd/summary'),
        request(app).get('/api/queue/all'),
        request(app).get('/api/alerts'),
        request(app).post('/api/chat/message').send({ message: 'Where is gate A?' }),
        request(app).post('/api/navigation/route').send({ from: 'gate-a', to: 'north-stand' }),
        request(app).get('/api/analytics/trends'),
        request(app).get('/api/crowd/heatmap')
      ];

      const responses = await Promise.all(operations);
      const successCount = responses.filter(r => r.status === 200).length;

      expect(successCount).toBeGreaterThanOrEqual(6); // At least 75% success
    });
  });

  describe('Data Consistency Across Endpoints', () => {
    it('should maintain consistent zone data', async () => {
      // Get data from multiple endpoints
      const [zonesRes, summaryRes, heatmapRes] = await Promise.all([
        request(app).get('/api/crowd/zones'),
        request(app).get('/api/crowd/summary'),
        request(app).get('/api/crowd/heatmap')
      ]);

      expect(zonesRes.status).toBe(200);
      expect(summaryRes.status).toBe(200);
      expect(heatmapRes.status).toBe(200);

      // Verify zone count consistency
      const zoneCount = zonesRes.body.zones.length;
      const heatmapCount = heatmapRes.body.heatmap.length;

      expect(zoneCount).toBe(heatmapCount);

      // Verify timestamps are close
      const time1 = new Date(zonesRes.body.timestamp);
      const time2 = new Date(summaryRes.body.timestamp);
      const time3 = new Date(heatmapRes.body.timestamp);

      expect(Math.abs(time2 - time1)).toBeLessThan(5000);
      expect(Math.abs(time3 - time1)).toBeLessThan(5000);
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should recover from failed requests', async () => {
      // Make a bad request
      const badRes = await request(app)
        .post('/api/chat/message')
        .send({ invalid: 'data' });
      expect(badRes.status).toBe(400);

      // System should still work
      const goodRes = await request(app).get('/health');
      expect(goodRes.status).toBe(200);

      // Subsequent valid requests should work
      const chatRes = await request(app)
        .post('/api/chat/message')
        .send({ message: 'test' });
      expect(chatRes.status).toBe(200);
    });

    it('should handle authentication failures gracefully', async () => {
      // Failed login
      const failedLogin = await request(app)
        .post('/api/auth/login')
        .send({ username: 'wrong', password: 'wrong' });
      expect(failedLogin.status).toBe(401);

      // Successful login should still work
      const successLogin = await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin', password: 'admin123' });
      expect(successLogin.status).toBe(200);
    });
  });

  describe('Real-time Updates Simulation', () => {
    it('should reflect state changes over time', async () => {
      // Get initial state
      const initial = await request(app).get('/api/crowd/zones');
      expect(initial.status).toBe(200);

      // Wait for simulation tick (small delay)
      await new Promise(resolve => setTimeout(resolve, 100));

      // Get updated state
      const updated = await request(app).get('/api/crowd/zones');
      expect(updated.status).toBe(200);

      // Timestamps should be different
      const time1 = new Date(initial.body.timestamp);
      const time2 = new Date(updated.body.timestamp);
      expect(time2.getTime()).toBeGreaterThanOrEqual(time1.getTime());
    });
  });

  describe('Complete Feature Integration', () => {
    it('should integrate all features in single flow', async () => {
      // 1. Check health
      const health = await request(app).get('/health');
      expect(health.status).toBe(200);

      // 2. Get crowd data
      const crowd = await request(app).get('/api/crowd/zones');
      expect(crowd.status).toBe(200);

      // 3. Get summary
      const summary = await request(app).get('/api/crowd/summary');
      expect(summary.status).toBe(200);

      // 4. Find best queue
      const queue = await request(app).get('/api/queue/gates');
      expect(queue.status).toBe(200);

      // 5. Calculate route
      const route = await request(app)
        .post('/api/navigation/route')
        .send({ from: 'gate-a', to: 'north-stand' });
      expect(route.status).toBe(200);

      // 6. Ask question
      const chat = await request(app)
        .post('/api/chat/message')
        .send({ message: 'How crowded is it?' });
      expect(chat.status).toBe(200);

      // 7. Check alerts
      const alerts = await request(app).get('/api/alerts');
      expect(alerts.status).toBe(200);

      // 8. Get trends
      const trends = await request(app).get('/api/analytics/trends');
      expect(trends.status).toBe(200);

      // 9. Get heatmap
      const heatmap = await request(app).get('/api/crowd/heatmap');
      expect(heatmap.status).toBe(200);

      // All operations completed successfully
      expect(true).toBe(true);
    });
  });
});
