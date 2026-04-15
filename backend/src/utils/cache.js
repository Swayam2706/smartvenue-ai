/**
 * In-Memory Cache Utility
 * Provides TTL-based caching for API responses
 * 
 * @module utils/cache
 */

const logger = require('./logger');

class Cache {
  constructor() {
    this.store = new Map();
    this.ttls = new Map();
    
    // Clean up expired entries every minute
    setInterval(() => this.cleanup(), 60000);
  }

  /**
   * Set cache entry with TTL
   * 
   * @param {string} key - Cache key
   * @param {*} value - Value to cache
   * @param {number} ttl - Time to live in milliseconds
   */
  set(key, value, ttl = 60000) {
    this.store.set(key, value);
    this.ttls.set(key, Date.now() + ttl);
    logger.debug('Cache set', { key, ttl });
  }

  /**
   * Get cache entry
   * 
   * @param {string} key - Cache key
   * @returns {*} Cached value or null if expired/missing
   */
  get(key) {
    const expiry = this.ttls.get(key);
    
    if (!expiry || Date.now() > expiry) {
      this.delete(key);
      return null;
    }
    
    return this.store.get(key);
  }

  /**
   * Delete cache entry
   * 
   * @param {string} key - Cache key
   */
  delete(key) {
    this.store.delete(key);
    this.ttls.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear() {
    this.store.clear();
    this.ttls.clear();
    logger.info('Cache cleared');
  }

  /**
   * Clean up expired entries
   */
  cleanup() {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, expiry] of this.ttls.entries()) {
      if (now > expiry) {
        this.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      logger.debug('Cache cleanup', { cleaned });
    }
  }

  /**
   * Get cache statistics
   * 
   * @returns {Object} Cache stats
   */
  getStats() {
    return {
      size: this.store.size,
      keys: Array.from(this.store.keys())
    };
  }
}

// Singleton instance
const cache = new Cache();

/**
 * Cache middleware factory
 * 
 * @param {number} ttl - Cache TTL in milliseconds
 * @returns {Function} Express middleware
 */
function cacheMiddleware(ttl = 60000) {
  return (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const key = `${req.path}:${JSON.stringify(req.query)}`;
    const cached = cache.get(key);

    if (cached) {
      logger.debug('Cache hit', { key });
      return res.json(cached);
    }

    // Override res.json to cache response
    const originalJson = res.json.bind(res);
    res.json = (data) => {
      cache.set(key, data, ttl);
      return originalJson(data);
    };

    next();
  };
}

module.exports = { cache, cacheMiddleware };
