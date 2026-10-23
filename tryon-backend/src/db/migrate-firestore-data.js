/**
 * One-time legacy Firestore -> MySQL migration script.
 *
 * This script is NOT used by the application at runtime and is NOT run
 * automatically during server startup or standard database migration.
 *
 * Safety Guarantees:
 * 1. Read-only against Firestore: does NOT delete, mutate, or drop Firestore data.
 * 2. Non-destructive: uses INSERT IGNORE into user_documents so existing MySQL records win.
 * 3. Does not run automatically in production or startup.
 *
 * Usage (when explicitly approved and after taking backups):
 *   node src/db/migrate-firestore-data.js
 */
require('dotenv').config();

const admin = require('firebase-admin');
const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');
const path = require('path');
const { pool } = require('./db');

function getCredential() {
  const projectId = process.env.FIREBASE_PROJECT_ID || 'tryon-8d7f7';
  const serviceAccountPath =
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

  if (serviceAccountPath) {
    const resolvedPath = path.resolve(serviceAccountPath);
    if (fs.existsSync(resolvedPath)) return cert(require(resolvedPath));
  }

  let privateKey = process.env.FIREBASE_PRIVATE_KEY;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  if (privateKey && privateKey.includes('\\n')) {
    privateKey = privateKey.replace(/\\n/g, '\n');
  }
  if (projectId && clientEmail && privateKey && !clientEmail.includes('your-')) {
    return cert({ projectId, clientEmail, privateKey });
  }
  throw new Error(
    'Firebase migration credentials are missing. Configure FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY or a service-account file.'
  );
}

function jsonSafe(value) {
  if (value == null) return value;
  if (typeof value.toDate === 'function') return value.toDate().toISOString();
  if (typeof value === 'bigint') return value.toString();
  if (Array.isArray(value)) return value.map(jsonSafe);
  if (typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, jsonSafe(item)]));
  }
  return value;
}

async function importDocument(uid, collectionName, documentId, data) {
  const serialized = JSON.stringify(jsonSafe(data || {}));
  const [result] = await pool.execute(
    `INSERT IGNORE INTO user_documents
       (user_uid, collection_name, document_id, data, created_at, updated_at)
     VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    [String(uid), String(collectionName), String(documentId), serialized]
  );
  return result.affectedRows === 1;
}

async function migrate() {
  const credential = getCredential();
  const apps = getApps();
  const app = apps.length ? apps[0] : initializeApp({
    credential,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  });
  const firestore = getFirestore(app);

  let imported = 0;
  let skipped = 0;
  const users = await firestore.collection('users').get();

  for (const userDoc of users.docs) {
    const uid = userDoc.id;
    if (await importDocument(uid, '__user__', 'root', userDoc.data())) imported++;
    else skipped++;

    // Preserve each direct subcollection document using the same collection
    // and document IDs expected by existing services.
    const collections = await userDoc.ref.listCollections();
    for (const collection of collections) {
      const docs = await collection.get();
      for (const doc of docs.docs) {
        if (await importDocument(uid, collection.id, doc.id, doc.data())) imported++;
        else skipped++;
      }
    }
  }

  console.log(`[Migration] Completed. Imported: ${imported}; skipped (already present): ${skipped}.`);
  console.log('[Migration] Legacy Firestore data was not modified or deleted.');
}

if (require.main === module) {
  migrate()
    .catch((error) => {
      console.error('[Migration] Failed:', error.message);
      process.exitCode = 1;
    })
    .finally(async () => {
      await pool.end().catch(() => {});
      await Promise.all((admin.apps || []).map((app) => app.delete().catch(() => {})));
    });
}

module.exports = { migrate };
