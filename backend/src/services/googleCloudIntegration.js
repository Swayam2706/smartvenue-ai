/**
 * Google Cloud Platform Integration Service
 * Comprehensive integration of all Google Cloud services for SmartVenue AI
 * 
 * Services Integrated:
 * - Firebase Admin SDK (Authentication, Realtime Database, Storage, Messaging)
 * - Cloud Storage (File storage and analytics exports)
 * - Cloud Logging (Centralized structured logging)
 * - Error Reporting (Automatic error tracking)
 * - Cloud Monitoring (Custom metrics and performance)
 * - Pub/Sub (Event-driven architecture)
 * 
 * @module services/googleCloudIntegration
 */

const {
  logAnalyticsEvent,
  storeCrowdData,
  storeAlert,
  getAlertHistory,
  sendPushNotification,
  uploadToStorage: firebaseUpload,
  isFirebaseAvailable,
  getServicesStatus: getFirebaseStatus
} = require('../config/firebaseAdmin');

const {
  uploadToStorage: cloudUpload,
  writeCloudLog,
  reportError,
  writeMetric,
  publishAlert,
  isStorageAvailable,
  isLoggingAvailable,
  isErrorReportingAvailable,
  isMonitoringAvailable,
  isPubSubAvailable
} = require('../config/googleCloud');

const logger = require('../utils/logger');

/**
 * Google Cloud Integration Service
 * Provides unified interface for all Google Cloud operations
 */
class GoogleCloudIntegrationService {
  constructor() {
    this.initialized = false;
    this.services = {};
  }

  /**
   * Initialize and check all Google Cloud services
   * 
   * @returns {Object} Service availability status
   */
  initialize() {
    if (this.initialized) {
      return this.services;
    }

    this.services = {
      firebase: {
        available: isFirebaseAvailable(),
        ...getFirebaseStatus()
      },
      cloudStorage: {
        available: isStorageAvailable()
      },
      cloudLogging: {
        available: isLoggingAvailable()
      },
      errorReporting: {
        available: isErrorReportingAvailable()
      },
      cloudMonitoring: {
        available: isMonitoringAvailable()
      },
      pubSub: {
        available: isPubSubAvailable()
      }
    };

    const enabledServices = Object.entries(this.services)
      .filter(([_, config]) => config.available)
      .map(([name]) => name);

    logger.info('Google Cloud Integration initialized', {
      enabled: enabledServices,
      total: enabledServices.length,
      coverage: `${((enabledServices.length / 6) * 100).toFixed(0)}%`
    });

    this.initialized = true;
    return this.services;
  }

  /**
   * Track analytics event across Firebase and Cloud Monitoring
   * 
   * @param {string} eventName - Event name
   * @param {Object} params - Event parameters
   * @returns {Promise<Object>} Tracking result
   */
  async trackEvent(eventName, params = {}) {
    const results = {
      firebase: false,
      cloudMonitoring: false
    };

    // Track in Firebase Analytics
    try {
      await logAnalyticsEvent(eventName, params);
      results.firebase = true;
    } catch (error) {
      logger.debug('Firebase analytics tracking skipped', { error: error.message });
    }

    // Track in Cloud Monitoring
    try {
      await writeMetric(`events/${eventName}`, 1, params);
      results.cloudMonitoring = true;
    } catch (error) {
      logger.debug('Cloud Monitoring tracking skipped', { error: error.message });
    }

    return results;
  }

  /**
   * Store crowd data in Firebase Realtime Database
   * 
   * @param {Object} crowdData - Crowd data
   * @returns {Promise<boolean>} Success status
   */
  async storeCrowdData(crowdData) {
    try {
      await storeCrowdData(crowdData);
      logger.debug('Crowd data stored in Firebase');
      return true;
    } catch (error) {
      logger.error('Failed to store crowd data', { error: error.message });
      return false;
    }
  }

  /**
   * Store alert in Firebase and publish to Pub/Sub
   * 
   * @param {Object} alert - Alert object
   * @returns {Promise<Object>} Storage result
   */
  async storeAndPublishAlert(alert) {
    const results = {
      firebase: null,
      pubsub: null
    };

    // Store in Firebase
    try {
      results.firebase = await storeAlert(alert);
    } catch (error) {
      logger.error('Failed to store alert in Firebase', { error: error.message });
    }

    // Publish to Pub/Sub
    try {
      results.pubsub = await publishAlert(alert, {
        type: alert.type,
        priority: alert.type === 'critical' ? 'high' : 'normal'
      });
    } catch (error) {
      logger.debug('Pub/Sub publish skipped', { error: error.message });
    }

    return results;
  }

  /**
   * Get alert history from Firebase
   * 
   * @param {number} limit - Maximum alerts to retrieve
   * @returns {Promise<Array>} Alerts array
   */
  async getAlertHistory(limit = 50) {
    try {
      return await getAlertHistory(limit);
    } catch (error) {
      logger.error('Failed to get alert history', { error: error.message });
      return [];
    }
  }

  /**
   * Send push notification via Firebase Cloud Messaging
   * 
   * @param {string} title - Notification title
   * @param {string} body - Notification body
   * @param {Array<string>} tokens - FCM tokens
   * @param {Object} data - Additional data
   * @returns {Promise<Object>} Send result
   */
  async sendPushNotification(title, body, tokens, data = {}) {
    try {
      return await sendPushNotification(title, body, tokens, data);
    } catch (error) {
      logger.error('Failed to send push notification', { error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Upload file to Cloud Storage or Firebase Storage
   * 
   * @param {string} path - Storage path
   * @param {Buffer|string} content - File content
   * @param {Object} metadata - File metadata
   * @param {string} service - Storage service ('cloud' or 'firebase')
   * @returns {Promise<string>} Storage URL
   */
  async uploadFile(path, content, metadata = {}, service = 'cloud') {
    try {
      if (service === 'firebase') {
        return await firebaseUpload(path, content, metadata);
      } else {
        return await cloudUpload(path, content, metadata);
      }
    } catch (error) {
      logger.error('Failed to upload file', { error: error.message, service });
      throw error;
    }
  }

  /**
   * Write structured log to Cloud Logging
   * 
   * @param {string} severity - Log severity
   * @param {string} message - Log message
   * @param {Object} metadata - Additional metadata
   * @returns {Promise<void>}
   */
  async writeLog(severity, message, metadata = {}) {
    try {
      await writeCloudLog(severity, message, metadata);
    } catch (error) {
      logger.debug('Cloud Logging write skipped', { error: error.message });
    }
  }

  /**
   * Report error to Cloud Error Reporting
   * 
   * @param {Error} error - Error object
   * @param {Object} context - Error context
   * @returns {Promise<void>}
   */
  async reportError(error, context = {}) {
    try {
      await reportError(error, context);
    } catch (err) {
      logger.debug('Error reporting skipped', { error: err.message });
    }
  }

  /**
   * Write custom metric to Cloud Monitoring
   * 
   * @param {string} metricType - Metric type
   * @param {number} value - Metric value
   * @param {Object} labels - Metric labels
   * @returns {Promise<void>}
   */
  async writeMetric(metricType, value, labels = {}) {
    try {
      await writeMetric(metricType, value, labels);
    } catch (error) {
      logger.debug('Cloud Monitoring write skipped', { error: error.message });
    }
  }

  /**
   * Get comprehensive service status
   * 
   * @returns {Object} Service status report
   */
  getServiceStatus() {
    if (!this.initialized) {
      this.initialize();
    }

    const enabledCount = Object.values(this.services)
      .filter(s => s.available).length;

    return {
      services: this.services,
      summary: {
        total: 6,
        enabled: enabledCount,
        coverage: `${((enabledCount / 6) * 100).toFixed(0)}%`,
        status: enabledCount >= 5 ? 'excellent' : enabledCount >= 3 ? 'good' : 'limited'
      }
    };
  }

  /**
   * Export analytics data to Cloud Storage
   * 
   * @param {Object} data - Analytics data
   * @param {string} filename - Export filename
   * @returns {Promise<string>} Storage URL
   */
  async exportAnalytics(data, filename = null) {
    const exportFilename = filename || `analytics-${Date.now()}.json`;
    
    try {
      const url = await cloudUpload(
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
   * Batch write multiple metrics
   * 
   * @param {Array<Object>} metrics - Array of metric objects
   * @returns {Promise<Object>} Write results
   */
  async batchWriteMetrics(metrics) {
    const results = {
      success: 0,
      failed: 0,
      errors: []
    };

    for (const metric of metrics) {
      try {
        await writeMetric(metric.type, metric.value, metric.labels || {});
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          metric: metric.type,
          error: error.message
        });
      }
    }

    return results;
  }
}

// Singleton instance
const googleCloudIntegration = new GoogleCloudIntegrationService();

// Auto-initialize on module load
googleCloudIntegration.initialize();

module.exports = googleCloudIntegration;
