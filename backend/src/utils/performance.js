/**
 * Performance Monitoring Utility
 * Tracks API response times and system metrics
 * 
 * @module utils/performance
 */

const logger = require('./logger');

// Store performance metrics
const metrics = {
  requests: [],
  errors: [],
  slowQueries: []
};

// Configuration
const SLOW_THRESHOLD = 1000; // 1 second
const MAX_METRICS = 1000;

/**
 * Performance monitoring middleware
 * Tracks request duration and logs slow requests
 * 
 * @returns {Function} Express middleware
 */
function performanceMonitoring() {
  return (req, res, next) => {
    const start = Date.now();
    
    // Capture original end function
    const originalEnd = res.end;
    
    res.end = function(...args) {
      const duration = Date.now() - start;
      
      // Log slow requests
      if (duration > SLOW_THRESHOLD) {
        logger.warn('Slow request detected', {
          method: req.method,
          path: req.path,
          duration,
          ip: req.ip
        });
        
        metrics.slowQueries.push({
          method: req.method,
          path: req.path,
          duration,
          timestamp: new Date().toISOString()
        });
        
        // Keep only recent slow queries
        if (metrics.slowQueries.length > MAX_METRICS) {
          metrics.slowQueries.shift();
        }
      }
      
      // Store metrics
      metrics.requests.push({
        method: req.method,
        path: req.path,
        status: res.statusCode,
        duration,
        timestamp: new Date().toISOString()
      });
      
      // Keep only recent requests
      if (metrics.requests.length > MAX_METRICS) {
        metrics.requests.shift();
      }
      
      // Set performance headers
      res.setHeader('X-Response-Time', `${duration}ms`);
      
      // Call original end
      originalEnd.apply(res, args);
    };
    
    next();
  };
}

/**
 * Get performance statistics
 * 
 * @returns {Object} Performance stats
 */
function getPerformanceStats() {
  const recentRequests = metrics.requests.slice(-100);
  
  if (recentRequests.length === 0) {
    return {
      totalRequests: 0,
      avgResponseTime: 0,
      minResponseTime: 0,
      maxResponseTime: 0,
      slowRequests: 0
    };
  }
  
  const durations = recentRequests.map(r => r.duration);
  const sum = durations.reduce((a, b) => a + b, 0);
  
  return {
    totalRequests: metrics.requests.length,
    recentRequests: recentRequests.length,
    avgResponseTime: Math.round(sum / durations.length),
    minResponseTime: Math.min(...durations),
    maxResponseTime: Math.max(...durations),
    slowRequests: metrics.slowQueries.length,
    errorRate: (metrics.errors.length / metrics.requests.length * 100).toFixed(2),
    requestsPerMinute: calculateRequestsPerMinute()
  };
}

/**
 * Calculate requests per minute
 * 
 * @returns {number} Requests per minute
 */
function calculateRequestsPerMinute() {
  const oneMinuteAgo = Date.now() - 60000;
  const recentRequests = metrics.requests.filter(r => 
    new Date(r.timestamp).getTime() > oneMinuteAgo
  );
  return recentRequests.length;
}

/**
 * Get slow queries
 * 
 * @param {number} limit - Maximum number of queries to return
 * @returns {Array} Slow queries
 */
function getSlowQueries(limit = 10) {
  return metrics.slowQueries.slice(-limit);
}

/**
 * Clear metrics
 */
function clearMetrics() {
  metrics.requests = [];
  metrics.errors = [];
  metrics.slowQueries = [];
  logger.info('Performance metrics cleared');
}

/**
 * Log error
 * 
 * @param {Error} error - Error object
 * @param {Object} context - Error context
 */
function logError(error, context = {}) {
  metrics.errors.push({
    message: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString()
  });
  
  if (metrics.errors.length > MAX_METRICS) {
    metrics.errors.shift();
  }
}

/**
 * Get system metrics
 * 
 * @returns {Object} System metrics
 */
function getSystemMetrics() {
  const memUsage = process.memoryUsage();
  
  return {
    memory: {
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + ' MB',
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + ' MB',
      external: Math.round(memUsage.external / 1024 / 1024) + ' MB',
      rss: Math.round(memUsage.rss / 1024 / 1024) + ' MB'
    },
    uptime: Math.round(process.uptime()) + ' seconds',
    nodeVersion: process.version,
    platform: process.platform,
    cpuUsage: process.cpuUsage()
  };
}

module.exports = {
  performanceMonitoring,
  getPerformanceStats,
  getSlowQueries,
  clearMetrics,
  logError,
  getSystemMetrics
};
