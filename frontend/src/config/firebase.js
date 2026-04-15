/**
 * Firebase Configuration — Google Services Integration
 * Handles: Realtime DB, Auth (sign up / sign in / sign out), Analytics
 */
import { initializeApp, getApps } from 'firebase/app';
import { getDatabase, ref, onValue, off, update } from 'firebase/database';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
} from 'firebase/auth';

// ── Config check ──────────────────────────────────────────────────────────────
export const hasFirebaseConfig = !!(
  import.meta.env.VITE_FIREBASE_API_KEY &&
  import.meta.env.VITE_FIREBASE_API_KEY !== 'paste_your_apiKey_here' &&
  import.meta.env.VITE_FIREBASE_PROJECT_ID &&
  import.meta.env.VITE_FIREBASE_PROJECT_ID !== 'paste_your_projectId_here'
);

// ── Initialize ────────────────────────────────────────────────────────────────
let app  = null;
let db   = null;
let auth = null;
let analytics = null;

if (hasFirebaseConfig) {
  const firebaseConfig = {
    apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    databaseURL:       import.meta.env.VITE_FIREBASE_DATABASE_URL,
    projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId:             import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId:     import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
  };

  try {
    app  = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
    db   = getDatabase(app);
    auth = getAuth(app);
    console.info('🔥 Firebase initialized');

    if (import.meta.env.VITE_FIREBASE_MEASUREMENT_ID && typeof window !== 'undefined') {
      import('firebase/analytics').then(({ getAnalytics, logEvent }) => {
        analytics = getAnalytics(app);
        logEvent(analytics, 'app_open');
        console.info('📊 Google Analytics active');
      }).catch(() => {});
    }
  } catch (err) {
    console.warn('Firebase init error:', err.message);
  }
} else {
  console.info('ℹ️ Firebase keys not set — running in WebSocket simulation mode');
}

export { app, db, auth, analytics };

// ── Realtime DB helpers ───────────────────────────────────────────────────────
export function subscribeToFirebaseCrowd(callback) {
  if (!db) return null;
  const crowdRef = ref(db, 'crowd/zones');
  onValue(crowdRef, (snapshot) => {
    const data = snapshot.val();
    if (data) callback(data);
  }, (err) => console.warn('Firebase crowd read error:', err.message));
  return () => off(crowdRef);
}

export function pushCrowdToFirebase(updates) {
  if (!db) return;
  update(ref(db, 'crowd/zones'), updates).catch(() => {});
}

export function subscribeToFirebaseAlerts(callback) {
  if (!db) return null;
  const alertsRef = ref(db, 'alerts');
  onValue(alertsRef, (snapshot) => {
    const data = snapshot.val();
    if (data) callback(Object.values(data));
  });
  return () => off(alertsRef);
}

// ── Auth helpers ──────────────────────────────────────────────────────────────

/** Sign up with name, email, password */
export async function firebaseSignUp(name, email, password) {
  if (!auth) throw new Error('Firebase Auth not initialized');
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName: name });
  const token = await cred.user.getIdToken();
  return {
    user: {
      id:       cred.user.uid,
      email:    cred.user.email,
      name:     name,
      role:     'user',
      username: email.split('@')[0],
    },
    token
  };
}

/** Sign in with email/password */
export async function firebaseSignIn(email, password) {
  if (!auth) throw new Error('Firebase Auth not initialized');
  const cred  = await signInWithEmailAndPassword(auth, email, password);
  const token = await cred.user.getIdToken();
  return {
    user: {
      id:       cred.user.uid,
      email:    cred.user.email,
      name:     cred.user.displayName || email.split('@')[0],
      role:     'admin',
      username: email.split('@')[0],
    },
    token
  };
}

/** Sign out */
export function firebaseSignOut() {
  if (!auth) return Promise.resolve();
  return signOut(auth);
}

/** Password reset email */
export function firebaseResetPassword(email) {
  if (!auth) return Promise.resolve();
  return sendPasswordResetEmail(auth, email);
}

/** Listen to auth state changes */
export function onFirebaseAuthChange(callback) {
  if (!auth) return () => {};
  return onAuthStateChanged(auth, callback);
}

/** Map Firebase error codes to friendly messages */
export function getFirebaseAuthError(code) {
  const map = {
    'auth/email-already-in-use':   'This email is already registered.',
    'auth/invalid-email':          'Please enter a valid email address.',
    'auth/weak-password':          'Password must be at least 6 characters.',
    'auth/user-not-found':         'No account found with this email.',
    'auth/wrong-password':         'Incorrect password. Please try again.',
    'auth/invalid-credential':     'Invalid email or password.',
    'auth/too-many-requests':      'Too many attempts. Please try again later.',
    'auth/network-request-failed': 'Network error. Check your connection.',
  };
  return map[code] || 'Something went wrong. Please try again.';
}

// ── Analytics helper ──────────────────────────────────────────────────────────
export function logAnalyticsEvent(eventName, params = {}) {
  if (!analytics) return;
  import('firebase/analytics').then(({ logEvent }) => {
    logEvent(analytics, eventName, params);
  }).catch(() => {});
}
