/**
 * Firebase Configuration and Initialization
 * Comprehensive Firebase integration for authentication, analytics, and real-time features
 * 
 * @module config/firebase
 */

import { initializeApp } from 'firebase/app';
import { getAnalytics, logEvent, setUserId, setUserProperties } from 'firebase/analytics';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { getDatabase, ref, onValue, set, push, update } from 'firebase/database';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getPerformance, trace } from 'firebase/performance';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

/**
 * Firebase Configuration
 * Production credentials for SmartVenue AI
 */
const firebaseConfig = {
  apiKey: "AIzaSyC9cASwY265oGk4YFlJ54rpiRCgOD-KOEw",
  authDomain: "smartvenue-ai-eda90.firebaseapp.com",
  databaseURL: "https://smartvenue-ai-eda90-default-rtdb.firebaseio.com",
  projectId: "smartvenue-ai-eda90",
  storageBucket: "smartvenue-ai-eda90.firebasestorage.app",
  messagingSenderId: "890749235852",
  appId: "1:890749235852:web:39a10c9573c8d0294d81a9",
  measurementId: "G-YR6C99CD6R"
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Firebase Services
let analytics = null;
let auth = null;
let database = null;
let storage = null;
let performance = null;
let messaging = null;

/**
 * Initialize Firebase Analytics
 * Tracks user behavior and app performance
 * 
 * @returns {Analytics|null} Analytics instance
 */
function initializeAnalytics() {
  try {
    analytics = getAnalytics(app);
    console.log('✅ Firebase Analytics initialized');
    
    // Track app initialization
    logEvent(analytics, 'app_initialized', {
      timestamp: new Date().toISOString(),
      platform: 'web'
    });
    
    return analytics;
  } catch (error) {
    console.error('Failed to initialize Analytics:', error);
    return null;
  }
}

/**
 * Initialize Firebase Authentication
 * Handles user authentication and session management
 * 
 * @returns {Auth|null} Auth instance
 */
function initializeAuthentication() {
  try {
    auth = getAuth(app);
    console.log('✅ Firebase Authentication initialized');
    return auth;
  } catch (error) {
    console.error('Failed to initialize Authentication:', error);
    return null;
  }
}

/**
 * Initialize Firebase Realtime Database
 * Real-time data synchronization
 * 
 * @returns {Database|null} Database instance
 */
function initializeDatabase() {
  try {
    database = getDatabase(app);
    console.log('✅ Firebase Realtime Database initialized');
    return database;
  } catch (error) {
    console.error('Failed to initialize Database:', error);
    return null;
  }
}

/**
 * Initialize Firebase Storage
 * File upload and storage management
 * 
 * @returns {Storage|null} Storage instance
 */
function initializeStorage() {
  try {
    storage = getStorage(app);
    console.log('✅ Firebase Storage initialized');
    return storage;
  } catch (error) {
    console.error('Failed to initialize Storage:', error);
    return null;
  }
}

/**
 * Initialize Firebase Performance Monitoring
 * Tracks app performance metrics
 * 
 * @returns {Performance|null} Performance instance
 */
function initializePerformance() {
  try {
    performance = getPerformance(app);
    console.log('✅ Firebase Performance Monitoring initialized');
    return performance;
  } catch (error) {
    console.error('Failed to initialize Performance:', error);
    return null;
  }
}

/**
 * Initialize Firebase Cloud Messaging
 * Push notifications
 * 
 * @returns {Messaging|null} Messaging instance
 */
function initializeMessaging() {
  try {
    if ('serviceWorker' in navigator) {
      messaging = getMessaging(app);
      console.log('✅ Firebase Cloud Messaging initialized');
      return messaging;
    }
    return null;
  } catch (error) {
    console.error('Failed to initialize Messaging:', error);
    return null;
  }
}

/**
 * Initialize all Firebase services
 * 
 * @returns {Object} Initialized services
 */
export function initializeFirebase() {
  const services = {
    app,
    analytics: initializeAnalytics(),
    auth: initializeAuthentication(),
    database: initializeDatabase(),
    storage: initializeStorage(),
    performance: initializePerformance(),
    messaging: initializeMessaging()
  };

  console.log('🔥 Firebase fully initialized:', {
    analytics: !!services.analytics,
    auth: !!services.auth,
    database: !!services.database,
    storage: !!services.storage,
    performance: !!services.performance,
    messaging: !!services.messaging
  });

  return services;
}

/**
 * Track custom analytics event
 * 
 * @param {string} eventName - Event name
 * @param {Object} params - Event parameters
 */
export function trackEvent(eventName, params = {}) {
  if (analytics) {
    logEvent(analytics, eventName, {
      ...params,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Track page view
 * 
 * @param {string} pageName - Page name
 * @param {string} pageTitle - Page title
 */
export function trackPageView(pageName, pageTitle) {
  if (analytics) {
    logEvent(analytics, 'page_view', {
      page_name: pageName,
      page_title: pageTitle,
      page_location: window.location.href
    });
  }
}

/**
 * Set user ID for analytics
 * 
 * @param {string} userId - User ID
 */
export function setAnalyticsUserId(userId) {
  if (analytics) {
    setUserId(analytics, userId);
  }
}

/**
 * Set user properties for analytics
 * 
 * @param {Object} properties - User properties
 */
export function setAnalyticsUserProperties(properties) {
  if (analytics) {
    setUserProperties(analytics, properties);
  }
}

/**
 * Start performance trace
 * 
 * @param {string} traceName - Trace name
 * @returns {Trace|null} Trace instance
 */
export function startTrace(traceName) {
  if (performance) {
    const t = trace(performance, traceName);
    t.start();
    return t;
  }
  return null;
}

/**
 * Subscribe to realtime database updates
 * 
 * @param {string} path - Database path
 * @param {Function} callback - Callback function
 * @returns {Function} Unsubscribe function
 */
export function subscribeToRealtimeData(path, callback) {
  if (database) {
    const dataRef = ref(database, path);
    return onValue(dataRef, (snapshot) => {
      callback(snapshot.val());
    });
  }
  return () => {};
}

/**
 * Write data to realtime database
 * 
 * @param {string} path - Database path
 * @param {*} data - Data to write
 * @returns {Promise<void>}
 */
export async function writeRealtimeData(path, data) {
  if (database) {
    const dataRef = ref(database, path);
    await set(dataRef, data);
  }
}

/**
 * Update data in realtime database
 * 
 * @param {string} path - Database path
 * @param {Object} updates - Updates object
 * @returns {Promise<void>}
 */
export async function updateRealtimeData(path, updates) {
  if (database) {
    const dataRef = ref(database, path);
    await update(dataRef, updates);
  }
}

/**
 * Upload file to Firebase Storage
 * 
 * @param {string} path - Storage path
 * @param {File|Blob} file - File to upload
 * @returns {Promise<string>} Download URL
 */
export async function uploadFile(path, file) {
  if (storage) {
    const fileRef = storageRef(storage, path);
    await uploadBytes(fileRef, file);
    return await getDownloadURL(fileRef);
  }
  throw new Error('Storage not initialized');
}

/**
 * Request notification permission and get FCM token
 * 
 * @returns {Promise<string|null>} FCM token
 */
export async function requestNotificationPermission() {
  if (messaging) {
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const token = await getToken(messaging, {
          vapidKey: process.env.VITE_FIREBASE_VAPID_KEY
        });
        console.log('FCM Token:', token);
        return token;
      }
    } catch (error) {
      console.error('Failed to get FCM token:', error);
    }
  }
  return null;
}

/**
 * Listen for foreground messages
 * 
 * @param {Function} callback - Message callback
 */
export function onForegroundMessage(callback) {
  if (messaging) {
    onMessage(messaging, (payload) => {
      console.log('Foreground message received:', payload);
      callback(payload);
    });
  }
}

/**
 * Monitor authentication state
 * 
 * @param {Function} callback - Auth state callback
 * @returns {Function} Unsubscribe function
 */
export function onAuthStateChange(callback) {
  if (auth) {
    return onAuthStateChanged(auth, callback);
  }
  return () => {};
}

// Export Firebase instances
export {
  app,
  analytics,
  auth,
  database,
  storage,
  performance,
  messaging
};

// Auto-initialize on module load
initializeFirebase();
