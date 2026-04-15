/**
 * Firebase Configuration and Initialization
 * Comprehensive Firebase integration for authentication, analytics, and real-time features
 * 
 * @module config/firebase
 */

import { initializeApp } from 'firebase/app';
import { getAnalytics, logEvent, setUserId, setUserProperties } from 'firebase/analytics';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  signInWithPopup,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { getDatabase, ref, onValue, set, push, update } from 'firebase/database';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getPerformance, trace } from 'firebase/performance';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

/**
 * Firebase Configuration
 * Uses environment variables for security
 * Configure these in your .env file
 */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
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

/**
 * Sign in with Google
 * 
 * @returns {Promise<Object>} User data and token
 */
export async function signInWithGoogle() {
  if (!auth) {
    throw new Error('Firebase Auth not initialized');
  }

  try {
    const provider = new GoogleAuthProvider();
    provider.addScope('profile');
    provider.addScope('email');
    
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    
    // Track Google sign-in
    if (analytics) {
      logEvent(analytics, 'login', {
        method: 'google',
        user_id: user.uid
      });
    }
    
    // Get ID token for backend
    const token = await user.getIdToken();
    
    return {
      user: {
        id: user.uid,
        email: user.email,
        name: user.displayName,
        photoURL: user.photoURL,
        role: 'user'
      },
      token
    };
  } catch (error) {
    console.error('Google sign-in failed:', error);
    throw error;
  }
}

/**
 * Sign up with Google
 * 
 * @returns {Promise<Object>} User data and token
 */
export async function signUpWithGoogle() {
  // Same as sign in for Google OAuth
  return signInWithGoogle();
}

/**
 * Create user with email and password
 * 
 * @param {string} name - User's full name
 * @param {string} email - User's email
 * @param {string} password - User's password
 * @returns {Promise<Object>} User data and token
 */
export async function createUserWithEmail(name, email, password) {
  if (!auth) {
    throw new Error('Firebase Auth not initialized');
  }

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Update profile with name
    await updateProfile(user, {
      displayName: name
    });
    
    // Track sign up
    if (analytics) {
      logEvent(analytics, 'sign_up', {
        method: 'email',
        user_id: user.uid
      });
    }
    
    // Get ID token
    const token = await user.getIdToken();
    
    return {
      user: {
        id: user.uid,
        email: user.email,
        name: name,
        photoURL: user.photoURL,
        role: 'user'
      },
      token
    };
  } catch (error) {
    console.error('Email sign-up failed:', error);
    throw error;
  }
}

/**
 * Sign in with email and password
 * 
 * @param {string} email - User's email
 * @param {string} password - User's password
 * @returns {Promise<Object>} User data and token
 */
export async function signInWithEmail(email, password) {
  if (!auth) {
    throw new Error('Firebase Auth not initialized');
  }

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Track sign in
    if (analytics) {
      logEvent(analytics, 'login', {
        method: 'email',
        user_id: user.uid
      });
    }
    
    // Get ID token
    const token = await user.getIdToken();
    
    return {
      user: {
        id: user.uid,
        email: user.email,
        name: user.displayName || email.split('@')[0],
        photoURL: user.photoURL,
        role: 'user'
      },
      token
    };
  } catch (error) {
    console.error('Email sign-in failed:', error);
    throw error;
  }
}

/**
 * Check if Firebase is configured
 * 
 * @returns {boolean} Configuration status
 */
export function isFirebaseConfigured() {
  return !!auth && !!analytics;
}

/**
 * Get Firebase auth error message
 * 
 * @param {string} errorCode - Firebase error code
 * @returns {string} User-friendly error message
 */
export function getFirebaseErrorMessage(errorCode) {
  const errorMessages = {
    'auth/email-already-in-use': 'This email is already registered',
    'auth/invalid-email': 'Invalid email address',
    'auth/operation-not-allowed': 'Operation not allowed',
    'auth/weak-password': 'Password is too weak',
    'auth/user-disabled': 'This account has been disabled',
    'auth/user-not-found': 'No account found with this email',
    'auth/wrong-password': 'Incorrect password',
    'auth/too-many-requests': 'Too many attempts. Please try again later',
    'auth/network-request-failed': 'Network error. Please check your connection',
    'auth/popup-closed-by-user': 'Sign-in popup was closed',
    'auth/cancelled-popup-request': 'Sign-in was cancelled'
  };
  
  return errorMessages[errorCode] || 'Authentication failed. Please try again.';
}
