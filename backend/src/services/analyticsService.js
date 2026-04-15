/**
 * Analytics Service
 * Comprehensive analytics with Google Cloud integration
 * 
 * @module services/analyticsService
 */

const { writeMetric, uploadToStorage } = require('../config/googleCloud');
const { trackAnalyticsEvent } = require('./firebaseService');
const logger = require('../utils/logger');

/**
 * Analytics Service Class
 * Handles all analytics operations with Google Cloud integration
 */
class AnalyticsService {
  constructor() {
    this.events = [];
    this.metrics = new Map();
    this.maxEvents = 10000;
  }

  /**
   * Track custom event
   * Sends to both Firebase Analytics and Cloud Monitoring
   * 
   * @param {string} eventName - Event name
   * @param {Object} properties - Event properties
   * @param {Object} user - User context
   * @returns {Promise<void>}
   */
  async trackEvent(eventName, properties = {}, user = null) {
    const event = {
      name: eventName,
      properties,
      user: user ? {
        id: user.id,
        role: user.role
      } : null,
      timestamp: new Date().toISOString(),
      sessionId: properties.sessionId || null
    };

    // Store locally
    this.events.push(event);
    if (this.events.length > this.maxEvents) {
      this.events.shift();
    }

    // Send to Firebase Analytics
    try {
      await trackAnalyticsEvent(eventName, {
        ...properties,
        user_id: user?.id,
        user_role: user?.role
      });
    } catch (error) {
      logger.error('Failed to track Firebase event', { error: error.message });
    }

    // Send to Cloud Monitoring as custom metric
    try {
      await writeMetric(`events/${eventName}`, 1, {
        user_role: user?.role || 'anonymous',
        ...properties
      });
    } catch (error) {
      logger.debug('Cloud Monitoring not available', { error: error.message });
    }

    logger.debug('Event tracked', { eventName, properties });
  }

  /**
   * Track page view
   * 
   * @param {string} page - Page path
   * @param {Object} user - User context
   * @returns {Promise<void>}
   */
  async trackPageView(page, user = null) {
    await this.trackEvent('page_view', { page }, user);
  }

  /**
   * Track API call
   * 
   * @param {string} endpoint - API endpoint
   * @param {string} method - HTTP method
   * @param {number} duration - Response time in ms
   * @param {number} statusCode - HTTP status code
   * @returns {Promise<void>}
   */
  async trackApiCall(endpoint, method, duration, statusCode) {
    await this.trackEvent('api_call', {
      endpoint,
      method,
      duration,
      statusCode,
      success: statusCode < 400
    });

    // Track as performance metric
    try {
      await writeMetric('api/response_time', duration, {
        endpoint,
        method,
        status: statusCode.toString()
      });
    } catch (error) {
      logger.debug('Failed to write metric', { error: error.message });
    }
  }

  /**
   * Track user action
   * 
   * @param {string} action - Action name
   * @param {Object} context - Action context
   * @param {Object} user - User context
   * @returns {Promise<void>}
   */
  async trackUserAction(action, context = {}, user = null) {
    await this.trackEvent('user_action', {
      action,
      ...context
    }, user);
  }

  /**
   * Track error
   * 
   * @param {Error} error - Error object
   * @param {Object} context - Error context
   * @returns {Promise<void>}
   */
  async trackError(error, context = {}) {
    await this.trackEvent('error', {
      message: error.message,
      stack: error.stack,
      ...context
    });

    // Increment error counter metric
    try {
      await writeMetric('errors/count', 1, {
        error_type: error.name,
        endpoint: context.endpoint || 'unknown'
      });
    } catch (err) {
      logger.debug('Failed to write error metric', { error: err.message });
    }
  }

  /**
   * Get analytics summary
   * 
   * @param {number} hours - Hours to look back
   * @returns {Object} Analytics summary
   */
  getAnalyticsSummary(hours = 24) {
    const cutoff = Date.now() - (hours * 60 * 60 * 1000);
    const recentEvents = this.events.filter(e => 
      new Date(e.timestamp).getTime() > cutoff
    );

    const eventCounts = {};
    const userActions = {};
    const errors = [];

    recentEvents.forEach(event => {
      // Count events by name
      eventCounts[event.name] = (eventCounts[event.name] || 0) + 1;

      // Track user actions
      if (event.name === 'user_action' && event.user) {
        const userId = event.user.id;
        userActions[userId] = (userActions[userId] || 0) + 1;
      }

      // Collect errors
      if (event.name === 'error') {
        errors.push({
          message: event.properties.message,
          timestamp: event.timestamp
        });
      }
    });

    return {
      totalEvents: recentEvents.length,
      eventCounts,
      uniqueUsers: Object.keys(userActions).length,
      totalErrors: errors.length,
      recentErrors: errors.slice(-10),
      timeRange: {
        hours,
        from: new Date(cutoff).toISOString(),
        to: new Date().toISOString()
      }
    };
  }

  /**
   * Export analytics data to Cloud Storage
   * 
   * @param {string} filename - Export filename
   * @returns {Promise<string>} Storage URL
   */
  async exportToStorage(filename = null) {
    const exportFilename = filename || `analytics-export-${Date.now()}.json`;
    const data = {
      exportedAt: new Date().toISOString(),
      totalEvents: this.events.length,
      events: this.events,
      summary: this.getAnalyticsSummary(24)
    };

    try {
      const url = await uploadToStorage(
        `analytics/${exportFilename}`,
        JSON.stringify(data, null, 2),
        { contentType: 'application/json' }
      );

      logger.info('Analytics exported to Cloud Storage', { url });
      return url;
    } catch (error) {
      logger.error('Failed to export analytics', { error: error.message });
      throw error;
    }
  }

  /**
   * Clear old events
   * 
   * @param {number} days - Days to keep
   * @returns {number} Number of events removed
   */
  clearOldEvents(days = 30) {
    const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
    const initialLength = this.events.length;
    
    this.events = this.events.filter(e => 
      new Date(e.timestamp).getTime() > cutoff
    );

    const removed = initialLength - this.events.length;
    logger.info('Old events cleared', { removed, remaining: this.events.length });
    
    return removed;
  }
}

// Singleton instance
const analyticsService = new AnalyticsService();

// Auto-cleanup old events every 24 hours
setInterval(() => {
  analyticsService.clearOldEvents(30);
}, 24 * 60 * 60 * 1000);

module.exports = analyticsService;
