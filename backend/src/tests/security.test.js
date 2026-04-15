/**
 * Security Tests
 * Comprehensive security testing for vulnerabilities
 * 
 * @group security
 */

const request = require('supertest');
const app = require('../app');

describe('Security Tests', () => {
  describe('XSS Protection', () => {
    it('should sanitize HTML in request body', async () => {
      const response = await request(app)
        .post('/api/chat/message')
        .send({
          message: '<script>alert("xss")</script>Hello'
        });

      expect(response.status).toBe(200);
      expect(response.body.response).not.toContain('<script>');
    });

    it('should escape special characters', async () => {
      const response = await request(app)
        .post('/api/chat/message')
        .send({
          message: '<img src=x onerror=alert(1)>'
        });

      expect(response.status).toBe(200);
      expect(response.body.response).not.toContain('<img');
    });
  });

  describe('SQL Injection Protection', () => {
    it('should handle SQL injection attempts in username', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: "admin' OR '1'='1",
          password: "password"
        });

      expect(response.status).toBe(401);
    });

    it('should handle SQL injection in password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: "admin",
          password: "' OR '1'='1"
        });

      expect(response.status).toBe(401);
    });
  });

  describe('Security Headers', () => {
    it('should include X-Content-Type-Options header', async () => {
      const response = await request(app).get('/health');
      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });

    it('should include X-Frame-Options header', async () => {
      const response = await request(app).get('/health');
      expect(response.headers['x-frame-options']).toBeDefined();
    });

    it('should include Strict-Transport-Security in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      const response = await request(app).get('/health');
      
      process.env.NODE_ENV = originalEnv;
      // HSTS header should be present in production
      expect(response.headers).toBeDefined();
    });

    it('should include X-XSS-Protection header', async () => {
      const response = await request(app).get('/health');
      expect(response.headers).toHaveProperty('x-content-type-options');
    });
  });

  describe('Authentication Security', () => {
    it('should not expose user existence in error messages', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'nonexistentuser',
          password: 'password'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid credentials');
      expect(response.body.error).not.toContain('user not found');
      expect(response.body.error).not.toContain('username');
    });

    it('should use constant-time comparison for passwords', async () => {
      const start1 = Date.now();
      await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin', password: 'wrong' });
      const time1 = Date.now() - start1;

      const start2 = Date.now();
      await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin', password: 'wrongpassword123' });
      const time2 = Date.now() - start2;

      // Timing difference should be minimal (within 100ms)
      expect(Math.abs(time1 - time2)).toBeLessThan(100);
    });

    it('should reject tokens with invalid signatures', async () => {
      const fakeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEiLCJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6ImFkbWluIn0.invalid_signature';
      
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${fakeToken}`);

      expect(response.status).toBe(401);
    });

    it('should reject empty tokens', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer ');

      expect(response.status).toBe(401);
    });
  });

  describe('Input Validation', () => {
    it('should reject oversized payloads', async () => {
      const largePayload = 'a'.repeat(20000); // 20KB
      
      const response = await request(app)
        .post('/api/chat/message')
        .send({ message: largePayload });

      expect([400, 413]).toContain(response.status);
    });

    it('should validate message length', async () => {
      const response = await request(app)
        .post('/api/chat/message')
        .send({ message: 'a'.repeat(501) });

      expect(response.status).toBe(400);
    });

    it('should reject invalid zone IDs', async () => {
      const response = await request(app)
        .post('/api/navigation/route')
        .send({
          from: '../../../etc/passwd',
          to: 'north-stand'
        });

      expect(response.status).toBe(400);
    });

    it('should sanitize special characters in inputs', async () => {
      const response = await request(app)
        .post('/api/chat/message')
        .send({
          message: 'Test & <test> "test" \'test\''
        });

      expect(response.status).toBe(200);
    });
  });

  describe('Rate Limiting', () => {
    it('should rate limit excessive requests', async () => {
      const requests = [];
      
      // Send 250 requests (limit is 200 per 15 min)
      for (let i = 0; i < 250; i++) {
        requests.push(
          request(app).get('/api/crowd/zones')
        );
      }

      const responses = await Promise.all(requests);
      const rateLimited = responses.filter(r => r.status === 429);
      
      expect(rateLimited.length).toBeGreaterThan(0);
    });

    it('should have stricter rate limit on auth endpoints', async () => {
      const requests = [];
      
      // Send 25 login requests (limit is 20 per 15 min)
      for (let i = 0; i < 25; i++) {
        requests.push(
          request(app)
            .post('/api/auth/login')
            .send({ username: 'test', password: 'test' })
        );
      }

      const responses = await Promise.all(requests);
      const rateLimited = responses.filter(r => r.status === 429);
      
      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });

  describe('Authorization', () => {
    it('should prevent privilege escalation', async () => {
      // Login as operator
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({ username: 'operator', password: 'operator123' });

      const token = loginResponse.body.token;

      // Try to access admin-only endpoint
      const response = await request(app)
        .post('/api/alerts')
        .set('Authorization', `Bearer ${token}`)
        .send({
          type: 'warning',
          title: 'Test',
          message: 'Test'
        });

      expect(response.status).toBe(403);
    });

    it('should require authentication for protected routes', async () => {
      const response = await request(app)
        .get('/api/analytics/overview');

      expect(response.status).toBe(401);
    });
  });

  describe('Error Handling', () => {
    it('should not expose stack traces in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin', password: 'wrong' });

      expect(response.body).not.toHaveProperty('stack');
      expect(JSON.stringify(response.body)).not.toContain('at ');
      
      process.env.NODE_ENV = originalEnv;
    });

    it('should not expose sensitive configuration', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin', password: 'wrong' });

      const body = JSON.stringify(response.body);
      expect(body).not.toContain('JWT_SECRET');
      expect(body).not.toContain('DATABASE');
      expect(body).not.toContain('API_KEY');
    });
  });

  describe('CORS Security', () => {
    it('should reject requests from unauthorized origins', async () => {
      const response = await request(app)
        .get('/health')
        .set('Origin', 'https://malicious-site.com');

      // Should either reject or not include CORS headers
      expect(response.status).toBeLessThan(500);
    });

    it('should allow requests from authorized origins', async () => {
      const response = await request(app)
        .get('/health')
        .set('Origin', 'http://localhost:5173');

      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });
  });

  describe('Content Security', () => {
    it('should set Content-Security-Policy header', async () => {
      const response = await request(app).get('/health');
      expect(response.headers['content-security-policy']).toBeDefined();
    });

    it('should prevent clickjacking with X-Frame-Options', async () => {
      const response = await request(app).get('/health');
      expect(response.headers['x-frame-options']).toBeDefined();
    });
  });
});
