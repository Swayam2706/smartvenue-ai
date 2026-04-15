/**
 * Firebase Admin SDK Configuration
 * Server-side Firebase integration for authentication, database, and cloud services
 * 
 * @module config/firebaseAdmin
 */

const admin = require('firebase-admin');
const logger = require('../utils/logger');
const { GOOGLE_SERVICES } = require('../utils/constants');

let firebaseInitialized = false;
let db = null;
let auth = null;
let messaging = null;
let storage = null;

/**
 * Initialize Firebase Admin SDK
 * Uses service account credentials or default credentials
 * 
 * @returns {boolean} Initialization status
 */
function initializeFirebaseAdmin() {
  if (firebaseInitialized) {
    logger.info('Firebase Admin already initialized');
    return true;
  }

  try {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const databaseURL = process.env.FIREBASE_DATABASE_URL;
    const storageBucket = process.env.FIREBASE_STORAGE_BUCKET;

    if (!projectId) {
      logger.info('Firebase not configured - skipping initialization');
      return false;
    }

    // Initialize with service account or default credentials
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
    
    if (serviceAccount) {
      // Use service account JSON
      const credentials = JSON.parse(serviceAccount);
      admin.initializeApp({
        credential: admin.credential.cert(credentials),
        databaseURL,
        storageBucket,
        projectId
      });
    } else {
      // Use default credentials (for Cloud Run)
      admin.initializeApp({
        projectId,
        databaseURL,
        storageBucket
      });
    }

    // Initialize services
    db = admin.database();
    auth = admin.auth();
    messaging = admin.messaging();
    storage = admin.storage();

    firebaseInitialized = true;

    logger.info('Firebase Admin SDK initialized successfully', {
      projectId,
      services: {
        database: !!db,
        auth: !!auth,
        messaging: !!messaging,
        storage: !!storage
      }
    });

    return true;
  } catch (error) {
    logger.error('Failed to initialize Firebase Admin', {
      error: error.message,
      stack: error.stack
    });
    return false;
  }
}

/**
 * Verify Firebase ID token
 * 
 * @param {string} idToken - Firebase ID token
 * @returns {Promise<Object>} Decoded token
 */
async function verifyIdToken(idToken) {
  if (!firebaseInitialized || !auth) {
    throw new Error('Firebase Admin not initialized');
  }

  try {
    const decodedToken = await auth.verifyIdToken(idToken);
    logger.debug('Firebase token verified', { uid: decodedToken.uid });
    return decodedToken;
  } catch (error) {
    logger.warn('Firebase token verification failed', { error: error.message });
    throw new Error('Invalid Firebase token');
  }
}

/**
 * Create custom token for user
 * 
 * @param {string} uid - User ID
 * @param {Object} claims - Custom claims
 * @returns {Promise<string>} Custom token
 */
async function createCustomToken(uid, claims = {}) {
  if (!firebaseInitialized || !auth) {
    throw new Error('Firebase Admin not initialized');
  }

  try {
    const token = await auth.createCustomToken(uid, claims);
    logger.debug('Custom token created', { uid });
    return token;
  } catch (error) {
    logger.error('Failed to create custom token', { error: error.message });
    throw error;
  }
}

/**
 * Get user by UID
 * 
 * @param {string} uid - User ID
 * @returns {Promise<Object>} User record
 */
async function getUserByUid(uid) {
  if (!firebaseInitialized || !auth) {
    throw new Error('Firebase Admin not initialized');
  }

  try {
    const userRecord = await auth.getUser(uid);
    return {
      uid: userRecord.uid,
      email: userRecord.email,
      displayName: userRecord.displayName,
      photoURL: userRecord.photoURL,
      emailVerified: userRecord.emailVerified,
      disabled: userRecord.disabled,
      metadata: userRecord.metadata
    };
  } catch (error) {
    logger.error('Failed to get user', { uid, error: error.message });
    throw error;
  }
}

/**
 * Store crowd data in Realtime Database
 * 
 * @param {Object} crowdData - Crowd data
 * @returns {Promise<void>}
 */
async function storeCrowdData(crowdData) {
  if (!firebaseInitialized || !db) {
    return;
  }

  try {
    const ref = db.ref('crowd/current');
    await ref.set({
      data: crowdData,
      timestamp: admin.database.ServerValue.TIMESTAMP
    });
    logger.debug('Crowd data stored in Firebase');
  } catch (error) {
    logger.error('Failed to store crowd data', { error: error.message });
  }
}

/**
 * Store alert in Realtime Database
 * 
 * @param {Object} alert - Alert object
 * @returns {Promise<string>} Alert ID
 */
async function storeAlert(alert) {
  if (!firebaseInitialized || !db) {
    return null;
  }

  try {
    const ref = db.ref('alerts');
    const newAlertRef = await ref.push({
      ...alert,
      timestamp: admin.database.ServerValue.TIMESTAMP
    });
    logger.debug('Alert stored in Firebase', { alertId: newAlertRef.key });
    return newAlertRef.key;
  } catch (error) {
    logger.error('Failed to store alert', { error: error.message });
    return null;
  }
}

/**
 * Get alert history
 * 
 * @param {number} limit - Maximum alerts to retrieve
 * @returns {Promise<Array>} Alerts array
 */
async function getAlertHistory(limit = 50) {
  if (!firebaseInitialized || !db) {
    return [];
  }

  try {
    const ref = db.ref('alerts').orderByChild('timestamp').limitToLast(limit);
    const snapshot = await ref.once('value');
    const alerts = [];
    
    snapshot.forEach((childSnapshot) => {
      alerts.push({
        id: childSnapshot.key,
        ...childSnapshot.val()
      });
    });

    return alerts.reverse();
  } catch (error) {
    logger.error('Failed to get alert history', { error: error.message });
    return [];
  }
}

/**
 * Send push notification
 * 
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {Array<string>} tokens - FCM tokens
 * @param {Object} data - Additional data
 * @returns {Promise<Object>} Send result
 */
async function sendPushNotification(title, body, tokens, data = {}) {
  if (!firebaseInitialized || !messaging) {
    logger.warn('Cannot send push notification - Firebase not initialized');
    return { success: false, error: 'Firebase not configured' };
  }

  try {
    const message = {
      notification: {
        title,
        body
      },
      data,
      tokens
    };

    const response = await messaging.sendMulticast(message);
    logger.info('Push notification sent', {
      success: response.successCount,
      failure: response.failureCount
    });

    return {
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount
    };
  } catch (error) {
    logger.error('Failed to send push notification', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Upload file to Firebase Storage
 * 
 * @param {string} path - Storage path
 * @param {Buffer} buffer - File buffer
 * @param {Object} metadata - File metadata
 * @returns {Promise<string>} Download URL
 */
async function uploadToStorage(path, buffer, metadata = {}) {
  if (!firebaseInitialized || !storage) {
    throw new Error('Firebase Storage not initialized');
  }

  try {
    const bucket = storage.bucket();
    const file = bucket.file(path);
    
    await file.save(buffer, {
      metadata: {
        contentType: metadata.contentType || 'application/octet-stream',
        ...metadata
      }
    });

    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: '03-01-2500'
    });

    logger.info('File uploaded to Firebase Storage', { path });
    return url;
  } catch (error) {
    logger.error('Failed to upload to storage', { error: error.message });
    throw error;
  }
}

/**
 * Log analytics event
 * 
 * @param {string} eventName - Event name
 * @param {Object} params - Event parameters
 * @returns {Promise<void>}
 */
async function logAnalyticsEvent(eventName, params = {}) {
  if (!firebaseInitialized || !db) {
    return;
  }

  try {
    const ref = db.ref('analytics/events');
    await ref.push({
      event: eventName,
      params,
      timestamp: admin.database.ServerValue.TIMESTAMP
    });
    logger.debug('Analytics event logged', { event: eventName });
  } catch (error) {
    logger.error('Failed to log analytics event', { error: error.message });
  }
}

/**
 * Check if Firebase is available
 * 
 * @returns {boolean} Availability status
 */
function isFirebaseAvailable() {
  return firebaseInitialized;
}

/**
 * Get Firebase services status
 * 
 * @returns {Object} Services status
 */
function getServicesStatus() {
  return {
    initialized: firebaseInitialized,
    database: !!db,
    auth: !!auth,
    messaging: !!messaging,
    storage: !!storage
  };
}

// Auto-initialize on module load
initializeFirebaseAdmin();

module.exports = {
  initializeFirebaseAdmin,
  verifyIdToken,
  createCustomToken,
  getUserByUid,
  storeCrowdData,
  storeAlert,
  getAlertHistory,
  sendPushNotification,
  uploadToStorage,
  logAnalyticsEvent,
  isFirebaseAvailable,
  getServicesStatus,
  // Export instances
  admin,
  db,
  auth,
  messaging,
  storage
};
