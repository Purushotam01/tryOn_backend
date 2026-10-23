const admin = require('firebase-admin');
const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getStorage } = require('firebase-admin/storage');
const fs = require('fs');
const path = require('path');

/**
 * Firebase Admin SDK Configuration
 *
 * Used strictly for:
 * 1. Google Sign-In Firebase ID Token verification (auth)
 * 2. File and image uploads to Cloud Storage (bucket)
 *
 * All application records are persisted in MySQL; Firestore is not used at runtime.
 */
let isFirebaseConfigured = false;
let auth = null;
let bucket = null;

try {
  const projectId = process.env.FIREBASE_PROJECT_ID || 'tryon-8d7f7';
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;
  const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

  let credential = null;

  // Support service account JSON file if configured
  if (serviceAccountPath) {
    try {
      const resolvedPath = path.resolve(serviceAccountPath);
      if (fs.existsSync(resolvedPath)) {
        credential = cert(require(resolvedPath));
      }
    } catch (fileErr) {
      console.warn('[Firebase] Warning: Failed to load service account file:', fileErr.message);
    }
  }

  // Fallback to explicit env vars (FIREBASE_CLIENT_EMAIL & FIREBASE_PRIVATE_KEY)
  if (!credential && projectId && clientEmail && privateKey && !clientEmail.includes('your-')) {
    if (privateKey.includes('\\n')) {
      privateKey = privateKey.replace(/\\n/g, '\n');
    }

    credential = cert({
      projectId,
      clientEmail,
      privateKey,
    });
  }

  if (credential) {
    const apps = getApps();
    const app = apps.length > 0 ? apps[0] : initializeApp({
      credential,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com`,
    });

    auth = getAuth(app);
    bucket = getStorage(app).bucket();
    isFirebaseConfigured = true;
    console.log('[Firebase] Admin SDK initialized successfully for Auth & Storage:', projectId);
  } else {
    console.warn('[Firebase] Warning: Cloud credentials not configured or using placeholders in .env.');
    console.warn('[Firebase] Application data persistence remains MySQL-only.');
  }
} catch (error) {
  console.warn('[Firebase] Error initializing Firebase Auth/Storage:', error.message);
}

module.exports = {
  admin,
  auth,
  bucket,
  isFirebaseConfigured,
};
