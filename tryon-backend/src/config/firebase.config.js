const admin = require('firebase-admin');

/**
 * Initializes and exports Firebase Admin SDK instances.
 * Falls back to an in-memory mock store if Firebase credentials are not yet supplied,
 * ensuring the server can run locally for development and API testing.
 */
let isFirebaseConfigured = false;
let db = null;
let auth = null;
let bucket = null;

try {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (projectId && clientEmail && privateKey && !clientEmail.includes('your-')) {
    if (privateKey.includes('\\n')) {
      privateKey = privateKey.replace(/\\n/g, '\n');
    }

    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com`,
      });
    }

    db = admin.firestore();
    auth = admin.auth();
    bucket = admin.storage().bucket();
    isFirebaseConfigured = true;
    console.log('[Firebase] Admin SDK initialized successfully with cloud project:', projectId);
  } else {
    console.warn('[Firebase] Warning: Cloud credentials not configured or using placeholders in .env.');
    console.warn('[Firebase] Running with Local In-Memory Fallback Adapter for immediate development.');
  }
} catch (error) {
  console.warn('[Firebase] Error initializing Firebase Admin:', error.message);
  console.warn('[Firebase] Falling back to Local In-Memory Adapter.');
}

/**
 * In-Memory Fallback Store for seamless local testing without Firebase credentials
 */
class InMemoryFirestore {
  constructor() {
    this.storage = new Map(); // path -> document data
  }

  _getKey(collectionPath, docId) {
    return `${collectionPath}/${docId}`;
  }

  collection(collectionPath) {
    const self = this;
    return {
      doc(docId) {
        const id = docId || `doc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        const key = self._getKey(collectionPath, id);
        return {
          id,
          async get() {
            const data = self.storage.get(key);
            return {
              exists: !!data,
              id,
              data: () => (data ? JSON.parse(JSON.stringify(data)) : undefined),
            };
          },
          async set(data, options = {}) {
            let current = self.storage.get(key) || {};
            if (options.merge) {
              current = { ...current, ...data };
            } else {
              current = { ...data };
            }
            self.storage.set(key, current);
            return { id };
          },
          async update(data) {
            const current = self.storage.get(key) || {};
            self.storage.set(key, { ...current, ...data });
            return { id };
          },
          async delete() {
            self.storage.delete(key);
            return true;
          },
          collection(subPath) {
            return self.collection(`${collectionPath}/${id}/${subPath}`);
          },
        };
      },
      async get() {
        const prefix = `${collectionPath}/`;
        const docs = [];
        for (const [k, v] of self.storage.entries()) {
          if (k.startsWith(prefix)) {
            const subPart = k.slice(prefix.length);
            if (!subPart.includes('/')) {
              docs.push({
                id: subPart,
                data: () => JSON.parse(JSON.stringify(v)),
              });
            }
          }
        }
        return {
          empty: docs.length === 0,
          size: docs.length,
          docs,
        };
      },
    };
  }
}

const mockFirestore = new InMemoryFirestore();

module.exports = {
  admin,
  db: db || mockFirestore,
  auth,
  bucket,
  isFirebaseConfigured,
};
