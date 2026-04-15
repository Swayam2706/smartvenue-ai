/**
 * Monitoring Routes
 * Provides performance and health monitoring endpoints
 * 
 * @module routes/monitoring
 */

const express = require('express');
const { authenticate, adminOnly } = require('../middleware/auth');
const { 
  getPerformanceStats, 
  getSlowQueries, 
  getSystemMetrics 
} = require('../utils/performance');
const { cache } = require('../utils/cache');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * GET /api/monitoring/performance
 * Get performance statistics
 * 
 * @route GET /api/monitoring/performance
 * @access Admin
 * @returns {Object} Performance statistics
 */
router.get('/performance', authenticate, adminOnly, (req, res) => {
  try {
    const stats = getPerformanceStats();
    res.json({
      performance: stats,
      timestamp: new Date().toISOString()
    });
    
    logger.info('Performance stats retrieved', { admin: req.user.username });
  } catch (error) {
    logger.error('Error retrieving performance stats', { error: error.message });
    res.status(500).json({ error: 'Failed to retrieve performance stats' });
  }
});

/**
 * GET /api/monitoring/slow-queries
 * Get slow queries
 * 
 * @route GET /api/monitoring/slow-queries
 * @access Admin
 * @returns {Object} Slow queries
 */
router.get('/slow-queries', authenticate, adminOnly, (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const slowQueries = getSlowQueries(limit);
    
    res.json({
      slowQueries,
      count: slowQueries.length,
      timestamp: new Date().toISOString()
    });
    
    logger.info('Slow queries retrieved', { admin: req.user.username, count: slowQueries.length });
  } catch (error) {
    logger.error('Error retrieving slow queries', { error: error.message });
    res.status(500).json({ error: 'Failed to retrieve slow queries' });
  }
});

/**
 * GET /api/monitoring/system
 * Get system metrics
 * 
 * @route GET /api/monitoring/system
 * @access Admin
 * @returns {Object} System metrics
 */
router.get('/system', authenticate, adminOnly, (req, res) => {
  try {
    const metrics = getSystemMetrics();
    const cacheStats = cache.getStats();
    
    res.json({
      system: metrics,
      cache: cacheStats,
      timestamp: new Date().toISOString()
    });
    
    logger.info('System metrics retrieved', { admin: req.user.username });
  } catch (error) {
    logger.error('Error retrieving system metrics', { error: error.message });
    res.status(500).json({ error: 'Failed to retrieve system metrics' });
  }
});

/**
 * GET /api/monitoring/health
 * Comprehensive health check
 * 
 * @route GET /api/monitoring/health
 * @access Public
 * @returns {Object} Health status
 */
router.get('/health', (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.env.npm_package_version || '1.0.0'
    };
    
    res.json(health);
  } catch (error) {
    logger.error('Health check failed', { error: error.message });
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
