/**
 * Firebase Integration Service
 * Provides Firebase Admin SDK integration for authentication, analytics, and real-time database
 * 
 * Features:
 * - User authentication and token verification
 * - Real-time database for crowd data persistence
 * - Analytics event tracking
 * - Push notifications for critical alerts
 * 
 * @module services/firebaseService
 */

const admin = require('firebase-admin');
const logger = require('../utils/logger');

let firebaseInitialized = false;
let db = null;
let messaging = null;

/**
 * Initialize Firebase Admin SDK
 * Uses service account credentials from environment or default credentials
 * 
 * @returns {boolean} True if initialization successful
 */
function initializeFirebase() {
  if (firebaseInitialized) {
    return true;
  }

  try {
    // Check if Firebase credentials are provided
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
    const projectId = process.env.FIREBASE_PROJECT_ID;

    if (!projectId) {
      logger.info('Firebase not configured - skipping initialization');
      return false;
    }

    // Initialize with service account or default credentials
    if (serviceAccount) {
      const credentials = JSON.parse(serviceAccount);
      admin.initializeApp({
        credential: admin.credential.cert(credentials),
        databaseURL: process.env.FIREBASE_DATABASE_URL,
        projectId: projectId
      });
    } else {
      // Use default credentials (for Cloud Run)
      admin.initializeApp({
        projectId: projectId,
        databaseURL: process.env.FIREBASE_DATABASE_URL
      });
    }

    db = admin.database();
    messaging = admin.messaging();
    firebaseInitialized = true;

    logger.info('Firebase Admin SDK initialized successfully', { projectId });
    return true;
  } catch (error) {
    logger.error('Failed to initialize Firebase', { error: error.message });
    return false;
  }
}

/**
 * Verify Firebase ID token
 * 
 * @param {string} idToken - Firebase ID token from client
 * @returns {Promise<Object>} Decoded token with user information
 * @throws {Error} If token is invalid or expired
 */
async function verifyIdToken(idToken) {
  if (!firebaseInitialized) {
    throw new Error('Firebase not initialized');
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    logger.debug('Firebase token verified', { uid: decodedToken.uid });
    return decodedToken;
  } catch (error) {
    logger.warn('Firebase token verification failed', { error: error.message });
    throw new Error('Invalid Firebase token');
  }
}

/**
 * Store crowd data in Firebase Realtime Database
 * Enables real-time synchronization across clients
 * 
 * @param {Object} crowdData - Crowd data to store
 * @returns {Promise<void>}
 */
async function storeCrowdData(crowdData) {
  if (!firebaseInitialized || !db) {
    return; // Silently skip if Firebase not configured
  }

  try {
    const ref = db.ref('crowd/current');
    await ref.set({
      data: crowdData,
      timestamp: admin.database.ServerValue.TIMESTAMP
    });
    logger.debug('Crowd data stored in Firebase');
  } catch (error) {
    logger.error('Failed to store crowd data in Firebase', { error: error.message });
  }
}

/**
 * Log analytics event to Firebase
 * 
 * @param {string} eventName - Name of the event
 * @param {Object} params - Event parameters
 * @returns {Promise<void>}
 */
async function logAnalyticsEvent(eventName, params = {}) {
  if (!firebaseInitialized) {
    return;
  }

  try {
    // Store event in Realtime Database for analytics
    const ref = db.ref('analytics/events');
    await ref.push({
      event: eventName,
      params: params,
      timestamp: admin.database.ServerValue.TIMESTAMP
    });
    logger.debug('Analytics event logged', { event: eventName });
  } catch (error) {
    logger.error('Failed to log analytics event', { error: error.message });
  }
}

/**
 * Send push notification for critical alerts
 * 
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {Array<string>} tokens - FCM device tokens
 * @param {Object} data - Additional data payload
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
        title: title,
        body: body
      },
      data: data,
      tokens: tokens
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
 * Get user data from Firebase Authentication
 * 
 * @param {string} uid - Firebase user ID
 * @returns {Promise<Object>} User record
 */
async function getUserData(uid) {
  if (!firebaseInitialized) {
    throw new Error('Firebase not initialized');
  }

  try {
    const userRecord = await admin.auth().getUser(uid);
    return {
      uid: userRecord.uid,
      email: userRecord.email,
      displayName: userRecord.displayName,
      photoURL: userRecord.photoURL,
      emailVerified: userRecord.emailVerified,
      disabled: userRecord.disabled
    };
  } catch (error) {
    logger.error('Failed to get user data', { uid, error: error.message });
    throw new Error('User not found');
  }
}

/**
 * Store alert history in Firebase
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
 * Get alert history from Firebase
 * 
 * @param {number} limit - Maximum number of alerts to retrieve
 * @returns {Promise<Array>} Array of alerts
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

    return alerts.reverse(); // Most recent first
  } catch (error) {
    logger.error('Failed to get alert history', { error: error.message });
    return [];
  }
}

/**
 * Check if Firebase is initialized and available
 * 
 * @returns {boolean} True if Firebase is ready
 */
function isFirebaseAvailable() {
  return firebaseInitialized;
}

/**
 * Track analytics event (alias for logAnalyticsEvent)
 * Provides consistent naming across the application
 * 
 * @param {string} eventName - Name of the event
 * @param {Object} params - Event parameters
 * @returns {Promise<void>}
 */
async function trackAnalyticsEvent(eventName, params = {}) {
  return logAnalyticsEvent(eventName, params);
}

// Initialize Firebase on module load
initializeFirebase();

module.exports = {
  initializeFirebase,
  verifyIdToken,
  storeCrowdData,
  logAnalyticsEvent,
  trackAnalyticsEvent,
  sendPushNotification,
  getUserData,
  storeAlert,
  getAlertHistory,
  isFirebaseAvailable
};
