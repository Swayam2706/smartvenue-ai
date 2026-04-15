/**
 * Firebase Admin SDK
 * Local dev: skips credential (no service account needed)
 * Cloud Run: uses Application Default Credentials automatically
 */
const admin = require('firebase-admin');

let isInitialized = false;
let db = null;

function initFirebaseAdmin() {
  if (isInitialized) return;

  const projectId   = process.env.FIREBASE_PROJECT_ID;
  const databaseURL = process.env.FIREBASE_DATABASE_URL;

  if (!projectId || !databaseURL) {
    console.info('ℹ️  Firebase Admin not configured — skipping');
    return;
  }

  try {
    if (admin.apps.length === 0) {
      const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

      if (serviceAccountPath) {
        // Production: explicit service account file
        const serviceAccount = require(serviceAccountPath);
        admin.initializeApp({
          credential:  admin.credential.cert(serviceAccount),
          databaseURL,
        });
      } else if (process.env.NODE_ENV === 'production') {
        // Cloud Run: Application Default Credentials
        admin.initializeApp({
          credential:  admin.credential.applicationDefault(),
          databaseURL,
        });
      } else {
        // Local dev without service account — init without credentials
        // Firebase Admin will work for reads but writes need auth
        // Frontend Firebase SDK handles real-time sync directly
        console.info('ℹ️  Firebase Admin: local dev mode (no service account) — frontend handles sync');
        isInitialized = false;
        return;
      }
    }

    db = admin.database();
    isInitialized = true;
    console.info('🔥 Firebase Admin initialized');
  } catch (err) {
    console.warn('Firebase Admin init skipped:', err.message);
  }
}

initFirebaseAdmin();

function pushCrowdToFirebase(updates) {
  if (!db) return; // silent no-op in local dev
  const sanitized = {};
  Object.entries(updates).forEach(([id, zone]) => {
    sanitized[id] = {
      id:          zone.id,
      name:        zone.name,
      current:     parseFloat(zone.current.toFixed(4)),
      riskLevel:   zone.riskLevel,
      waitTime:    zone.waitTime,
      count:       zone.count,
      capacity:    zone.capacity,
      x:           zone.x,
      y:           zone.y,
      predictions: zone.predictions || [],
      updatedAt:   zone.updatedAt || new Date().toISOString(),
    };
  });
  db.ref('crowd/zones').update(sanitized).catch(() => {});
}

function pushAlertToFirebase(alert) {
  if (!db) return;
  db.ref(`alerts/${alert.id}`).set(alert).catch(() => {});
}

async function verifyFirebaseToken(idToken) {
  if (!isInitialized) return null;
  try {
    return await admin.auth().verifyIdToken(idToken);
  } catch {
    return null;
  }
}

module.exports = {
  admin,
  pushCrowdToFirebase,
  pushAlertToFirebase,
  verifyFirebaseToken,
  isFirebaseReady: () => isInitialized,
};
