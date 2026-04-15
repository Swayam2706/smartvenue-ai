/**
 * Advanced Rate Limiting Middleware
 * Implements sliding window rate limiting with Redis-like in-memory store
 * 
 * @module middleware/rateLimiter
 */

const logger = require('../utils/logger');

// In-memory store for rate limiting (use Redis in production)
const requestStore = new Map();

/**
 * Clean up old entries every 5 minutes
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of requestStore.entries()) {
    if (now - data.resetTime > 0) {
      requestStore.delete(key);
    }
  }
}, 300000);

/**
 * Creates rate limiter middleware with custom options
 * 
 * @param {Object} options - Rate limiter options
 * @param {number} options.windowMs - Time window in milliseconds
 * @param {number} options.max - Maximum requests per window
 * @param {string} options.message - Error message
 * @param {Function} options.keyGenerator - Function to generate rate limit key
 * @returns {Function} Express middleware
 */
function createRateLimiter(options = {}) {
  const {
    windowMs = 60000,
    max = 100,
    message = 'Too many requests',
    keyGenerator = (req) => req.ip
  } = options;

  return (req, res, next) => {
    const key = keyGenerator(req);
    const now = Date.now();
    
    let record = requestStore.get(key);
    
    if (!record || now > record.resetTime) {
      record = {
        count: 0,
        resetTime: now + windowMs
      };
      requestStore.set(key, record);
    }
    
    record.count++;
    
    const remaining = Math.max(0, max - record.count);
    const resetTime = Math.ceil((record.resetTime - now) / 1000);
    
    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', resetTime);
    
    if (record.count > max) {
      logger.warn('Rate limit exceeded', {
        key,
        count: record.count,
        max,
        path: req.path
      });
      
      return res.status(429).json({
        error: message,
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: resetTime
      });
    }
    
    next();
  };
}

module.exports = { createRateLimiter };
