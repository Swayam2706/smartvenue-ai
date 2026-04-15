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
const googleCloudIntegration = require('../services/googleCloudIntegration');
const analyticsService = require('../services/analyticsService');
const { asyncHandler } = require('../utils/errorHandler');
const { HTTP_STATUS } = require('../utils/constants');
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

/**
 * GET /api/monitoring/google-cloud
 * Get Google Cloud services status and integration coverage
 * 
 * @route GET /api/monitoring/google-cloud
 * @access Admin
 * @returns {Object} Google Cloud services status
 */
router.get('/google-cloud', authenticate, adminOnly, asyncHandler(async (req, res) => {
  const status = googleCloudIntegration.getServiceStatus();
  
  res.status(HTTP_STATUS.OK).json({
    ...status,
    timestamp: new Date().toISOString()
  });
  
  logger.info('Google Cloud status retrieved', { 
    admin: req.user.username,
    coverage: status.summary.coverage
  });
}));

/**
 * GET /api/monitoring/analytics
 * Get analytics summary
 * 
 * @route GET /api/monitoring/analytics
 * @access Admin
 * @returns {Object} Analytics summary
 */
router.get('/analytics', authenticate, adminOnly, asyncHandler(async (req, res) => {
  const hours = parseInt(req.query.hours) || 24;
  const summary = analyticsService.getAnalyticsSummary(hours);
  
  res.status(HTTP_STATUS.OK).json({
    analytics: summary,
    timestamp: new Date().toISOString()
  });
  
  logger.info('Analytics summary retrieved', { 
    admin: req.user.username,
    hours,
    totalEvents: summary.totalEvents
  });
}));

/**
 * POST /api/monitoring/analytics/export
 * Export analytics data to Cloud Storage
 * 
 * @route POST /api/monitoring/analytics/export
 * @access Admin
 * @returns {Object} Export result with storage URL
 */
router.post('/analytics/export', authenticate, adminOnly, asyncHandler(async (req, res) => {
  const url = await analyticsService.exportToStorage();
  
  res.status(HTTP_STATUS.CREATED).json({
    message: 'Analytics exported successfully',
    url,
    timestamp: new Date().toISOString()
  });
  
  logger.info('Analytics exported', { 
    admin: req.user.username,
    url
  });
}));
