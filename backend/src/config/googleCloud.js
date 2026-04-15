/**
 * Google Cloud Services Configuration
 * Comprehensive integration of Google Cloud Platform services
 * 
 * @module config/googleCloud
 */

const { Storage } = require('@google-cloud/storage');
const { Logging } = require('@google-cloud/logging');
const { ErrorReporting } = require('@google-cloud/error-reporting');
const { Monitoring } = require('@google-cloud/monitoring');
const { PubSub } = require('@google-cloud/pubsub');
const logger = require('../utils/logger');

// Initialize Google Cloud Storage
let storage = null;
let bucket = null;

// Initialize Cloud Logging
let cloudLogging = null;
let cloudLogger = null;

// Initialize Error Reporting
let errorReporting = null;

// Initialize Cloud Monitoring
let monitoring = null;

// Initialize Pub/Sub
let pubsub = null;
let alertTopic = null;

/**
 * Initialize Google Cloud Storage
 * Used for storing crowd analytics data, reports, and media
 * 
 * @returns {boolean} Success status
 */
function initializeStorage() {
  try {
    const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID;
    const bucketName = process.env.GOOGLE_CLOUD_STORAGE_BUCKET;

    if (!projectId || !bucketName) {
      logger.info('Google Cloud Storage not configured - skipping');
      return false;
    }

    storage = new Storage({ projectId });
    bucket = storage.bucket(bucketName);

    logger.info('Google Cloud Storage initialized', { bucket: bucketName });
    return true;
  } catch (error) {
    logger.error('Failed to initialize Google Cloud Storage', { error: error.message });
    return false;
  }
}

/**
 * Initialize Cloud Logging
 * Centralized logging for production monitoring
 * 
 * @returns {boolean} Success status
 */
function initializeCloudLogging() {
  try {
    const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID;

    if (!projectId) {
      logger.info('Cloud Logging not configured - skipping');
      return false;
    }

    cloudLogging = new Logging({ projectId });
    cloudLogger = cloudLogging.log('smartvenue-application');

    logger.info('Cloud Logging initialized', { projectId });
    return true;
  } catch (error) {
    logger.error('Failed to initialize Cloud Logging', { error: error.message });
    return false;
  }
}

/**
 * Initialize Error Reporting
 * Automatic error tracking and alerting
 * 
 * @returns {boolean} Success status
 */
function initializeErrorReporting() {
  try {
    const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID;

    if (!projectId) {
      logger.info('Error Reporting not configured - skipping');
      return false;
    }

    errorReporting = new ErrorReporting({
      projectId,
      reportMode: 'production',
      serviceContext: {
        service: 'smartvenue-backend',
        version: process.env.npm_package_version || '1.0.0'
      }
    });

    logger.info('Error Reporting initialized', { projectId });
    return true;
  } catch (error) {
    logger.error('Failed to initialize Error Reporting', { error: error.message });
    return false;
  }
}

/**
 * Initialize Cloud Monitoring
 * Custom metrics and performance monitoring
 * 
 * @returns {boolean} Success status
 */
function initializeMonitoring() {
  try {
    const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID;

    if (!projectId) {
      logger.info('Cloud Monitoring not configured - skipping');
      return false;
    }

    monitoring = new Monitoring.MetricServiceClient({ projectId });

    logger.info('Cloud Monitoring initialized', { projectId });
    return true;
  } catch (error) {
    logger.error('Failed to initialize Cloud Monitoring', { error: error.message });
    return false;
  }
}

/**
 * Initialize Pub/Sub
 * Event-driven architecture for alerts and notifications
 * 
 * @returns {boolean} Success status
 */
function initializePubSub() {
  try {
    const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID;
    const topicName = process.env.PUBSUB_ALERT_TOPIC || 'smartvenue-alerts';

    if (!projectId) {
      logger.info('Pub/Sub not configured - skipping');
      return false;
    }

    pubsub = new PubSub({ projectId });
    alertTopic = pubsub.topic(topicName);

    logger.info('Pub/Sub initialized', { projectId, topic: topicName });
    return true;
  } catch (error) {
    logger.error('Failed to initialize Pub/Sub', { error: error.message });
    return false;
  }
}

/**
 * Upload file to Cloud Storage
 * 
 * @param {string} filename - File name
 * @param {Buffer|string} content - File content
 * @param {Object} metadata - File metadata
 * @returns {Promise<string>} Public URL
 */
async function uploadToStorage(filename, content, metadata = {}) {
  if (!bucket) {
    throw new Error('Cloud Storage not initialized');
  }

  const file = bucket.file(filename);
  await file.save(content, {
    metadata: {
      contentType: metadata.contentType || 'application/json',
      ...metadata
    }
  });

  logger.info('File uploaded to Cloud Storage', { filename });
  return `gs://${bucket.name}/${filename}`;
}

/**
 * Write log entry to Cloud Logging
 * 
 * @param {string} severity - Log severity (DEBUG, INFO, WARNING, ERROR, CRITICAL)
 * @param {string} message - Log message
 * @param {Object} metadata - Additional metadata
 * @returns {Promise<void>}
 */
async function writeCloudLog(severity, message, metadata = {}) {
  if (!cloudLogger) {
    return;
  }

  const entry = cloudLogger.entry({
    severity,
    resource: {
      type: 'cloud_run_revision',
      labels: {
        service_name: 'smartvenue-backend',
        revision_name: process.env.K_REVISION || 'local'
      }
    }
  }, {
    message,
    ...metadata,
    timestamp: new Date().toISOString()
  });

  await cloudLogger.write(entry);
}

/**
 * Report error to Error Reporting
 * 
 * @param {Error} error - Error object
 * @param {Object} context - Error context
 * @returns {Promise<void>}
 */
async function reportError(error, context = {}) {
  if (!errorReporting) {
    return;
  }

  errorReporting.report(error, {
    user: context.userId || 'anonymous',
    httpRequest: context.request ? {
      method: context.request.method,
      url: context.request.url,
      userAgent: context.request.headers?.['user-agent'],
      remoteIp: context.request.ip
    } : undefined
  });

  logger.error('Error reported to Cloud Error Reporting', {
    error: error.message,
    context
  });
}

/**
 * Write custom metric to Cloud Monitoring
 * 
 * @param {string} metricType - Metric type
 * @param {number} value - Metric value
 * @param {Object} labels - Metric labels
 * @returns {Promise<void>}
 */
async function writeMetric(metricType, value, labels = {}) {
  if (!monitoring) {
    return;
  }

  const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID;
  const projectPath = monitoring.projectPath(projectId);

  const dataPoint = {
    interval: {
      endTime: {
        seconds: Date.now() / 1000
      }
    },
    value: {
      doubleValue: value
    }
  };

  const timeSeriesData = {
    metric: {
      type: `custom.googleapis.com/${metricType}`,
      labels
    },
    resource: {
      type: 'cloud_run_revision',
      labels: {
        project_id: projectId,
        service_name: 'smartvenue-backend',
        revision_name: process.env.K_REVISION || 'local'
      }
    },
    points: [dataPoint]
  };

  const request = {
    name: projectPath,
    timeSeries: [timeSeriesData]
  };

  await monitoring.createTimeSeries(request);
  logger.debug('Metric written to Cloud Monitoring', { metricType, value });
}

/**
 * Publish message to Pub/Sub topic
 * 
 * @param {Object} message - Message data
 * @param {Object} attributes - Message attributes
 * @returns {Promise<string>} Message ID
 */
async function publishAlert(message, attributes = {}) {
  if (!alertTopic) {
    throw new Error('Pub/Sub not initialized');
  }

  const dataBuffer = Buffer.from(JSON.stringify(message));
  const messageId = await alertTopic.publishMessage({
    data: dataBuffer,
    attributes: {
      timestamp: new Date().toISOString(),
      ...attributes
    }
  });

  logger.info('Alert published to Pub/Sub', { messageId, topic: alertTopic.name });
  return messageId;
}

/**
 * Initialize all Google Cloud services
 * 
 * @returns {Object} Initialization status
 */
function initializeAllServices() {
  const status = {
    storage: initializeStorage(),
    logging: initializeCloudLogging(),
    errorReporting: initializeErrorReporting(),
    monitoring: initializeMonitoring(),
    pubsub: initializePubSub()
  };

  const enabledServices = Object.entries(status)
    .filter(([_, enabled]) => enabled)
    .map(([service]) => service);

  logger.info('Google Cloud services initialized', {
    enabled: enabledServices,
    total: enabledServices.length
  });

  return status;
}

// Auto-initialize on module load
initializeAllServices();

module.exports = {
  // Storage
  uploadToStorage,
  getStorageBucket: () => bucket,
  
  // Logging
  writeCloudLog,
  
  // Error Reporting
  reportError,
  
  // Monitoring
  writeMetric,
  
  // Pub/Sub
  publishAlert,
  
  // Status
  isStorageAvailable: () => !!bucket,
  isLoggingAvailable: () => !!cloudLogger,
  isErrorReportingAvailable: () => !!errorReporting,
  isMonitoringAvailable: () => !!monitoring,
  isPubSubAvailable: () => !!alertTopic
};
