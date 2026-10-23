const { bucket, isFirebaseConfigured } = require('../config/firebase.config');
const { pool } = require('../db/db');

/**
 * Application records are persisted in MySQL (user_documents).
 * Firebase is intentionally retained only for binary Storage uploads.
 *
 * The JSON document column preserves existing service payloads and API shapes
 * while keeping all application data in MySQL.
 */
function decodeData(value) {
  if (value == null) return {};
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch (_) {
    return {};
  }
}

async function getDocument(uid, collectionName, documentId) {
  const [rows] = await pool.execute(
    `SELECT data FROM user_documents
     WHERE user_uid = ? AND collection_name = ? AND document_id = ?
     LIMIT 1`,
    [String(uid), collectionName, String(documentId)]
  );
  if (!rows.length) return null;
  const data = decodeData(rows[0].data);
  return { id: String(documentId), ...data };
}

async function saveDocument(uid, collectionName, documentId, data, merge = true) {
  const now = new Date().toISOString();
  const current = merge ? (await getDocument(uid, collectionName, documentId)) || {} : {};
  const payload = {
    ...current,
    ...(data || {}),
    updatedAt: now,
  };

  await pool.execute(
    `INSERT INTO user_documents
       (user_uid, collection_name, document_id, data, created_at, updated_at)
     VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
     ON DUPLICATE KEY UPDATE
       data = VALUES(data),
       updated_at = CURRENT_TIMESTAMP`,
    [String(uid), collectionName, String(documentId), JSON.stringify(payload)]
  );
  return { id: String(documentId), ...payload };
}

async function getUserDoc(uid) {
  // 1. Fetch document data if present
  let docData = null;
  const [documentRows] = await pool.execute(
    `SELECT data FROM user_documents
     WHERE user_uid = ? AND collection_name = '__user__' AND document_id = 'root'
     LIMIT 1`,
    [String(uid)]
  );
  if (documentRows.length) {
    docData = decodeData(documentRows[0].data);
  }

  // 2. Fetch canonical user row from MySQL users table (supports both Google firebase_uid and OTP numeric id)
  let userRow = null;
  const [googleRows] = await pool.execute(
    `SELECT id, firebase_uid, phone, name, email, role, created_at, updated_at
     FROM users WHERE firebase_uid = ? LIMIT 1`,
    [String(uid)]
  );
  if (googleRows.length) {
    userRow = googleRows[0];
  } else if (/^\d+$/.test(String(uid))) {
    const [otpRows] = await pool.execute(
      `SELECT id, firebase_uid, phone, name, email, role, created_at, updated_at
       FROM users WHERE id = ? LIMIT 1`,
      [Number(uid)]
    );
    if (otpRows.length) {
      userRow = otpRows[0];
    }
  }

  if (!documentRows.length && !userRow) {
    return {
      id: String(uid),
      uid: String(uid),
      phone: '',
      name: '',
      email: '',
      role: 'user',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  // 3. Return merged object: canonical users table provides baseline identity
  // (phone, email, role, id) so partial profile updates never erase phone or email.
  const baseline = userRow
    ? {
        id: String(userRow.id),
        uid: String(uid),
        phone: userRow.phone || '',
        name: userRow.name || '',
        email: userRow.email || '',
        role: userRow.role || 'user',
        createdAt: userRow.created_at ? new Date(userRow.created_at).toISOString() : new Date().toISOString(),
        updatedAt: userRow.updated_at ? new Date(userRow.updated_at).toISOString() : new Date().toISOString(),
      }
    : {
        id: String(uid),
        uid: String(uid),
        phone: '',
        name: '',
        email: '',
        role: 'user',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

  return {
    ...baseline,
    ...(docData || {}),
    // Ensure phone and email never get blanked out if present in users table
    phone: (docData && docData.phone) ? docData.phone : (baseline.phone || ''),
    email: (docData && docData.email) ? docData.email : (baseline.email || ''),
  };
}

async function setUserDoc(uid, data, merge = true) {
  // Keep canonical authentication fields in the users table synchronized,
  // without failing development/mock identities that have no users row.
  const userFields = ['name', 'email', 'phone'].filter((field) => data && data[field] !== undefined);
  if (userFields.length) {
    const values = userFields.map((field) => data[field]);
    const assignments = userFields.map((field) => `\`${field}\` = ?`);
    assignments.push('updated_at = CURRENT_TIMESTAMP');
    try {
      const [googleRows] = await pool.execute(
        'SELECT id FROM users WHERE firebase_uid = ? LIMIT 1',
        [String(uid)]
      );
      if (googleRows.length) {
        await pool.execute(
          `UPDATE users SET ${assignments.join(', ')} WHERE firebase_uid = ?`,
          [...values, String(uid)]
        );
      } else if (/^\d+$/.test(String(uid))) {
        await pool.execute(
          `UPDATE users SET ${assignments.join(', ')} WHERE id = ?`,
          [...values, Number(uid)]
        );
      }
    } catch (error) {
      // The document write remains authoritative for profile API compatibility.
      // Log the failure without exposing user values or credentials.
      console.warn('[MySQL] Could not sync profile fields to users row:', error.code || error.message);
    }
  }

  const saved = await saveDocument(uid, '__user__', 'root', data, merge);
  const { id, ...result } = saved;
  return result;
}

async function getSubcollectionDocs(uid, subcollectionName) {
  const [rows] = await pool.execute(
    `SELECT document_id, data FROM user_documents
     WHERE user_uid = ? AND collection_name = ?
     ORDER BY created_at DESC, document_id ASC`,
    [String(uid), String(subcollectionName)]
  );
  return rows.map((row) => ({
    id: String(row.document_id),
    ...decodeData(row.data),
  }));
}

async function getSubdoc(uid, subcollectionName, docId) {
  return getDocument(uid, String(subcollectionName), String(docId));
}

async function setSubdoc(uid, subcollectionName, docId, data, merge = true) {
  return saveDocument(uid, String(subcollectionName), String(docId), data, merge);
}

async function deleteSubdoc(uid, subcollectionName, docId) {
  await pool.execute(
    `DELETE FROM user_documents
     WHERE user_uid = ? AND collection_name = ? AND document_id = ?`,
    [String(uid), String(subcollectionName), String(docId)]
  );
  return true;
}

/**
 * Upload a binary buffer to Firebase Storage. This is the only Firebase
 * persistence operation retained by this service; app records use MySQL.
 */
async function uploadBufferToStorage(buffer, destinationPath, contentType = 'image/jpeg') {
  if (isFirebaseConfigured && bucket) {
    const file = bucket.file(destinationPath);
    await file.save(buffer, {
      metadata: { contentType },
      public: true,
    });
    return `https://storage.googleapis.com/${bucket.name}/${destinationPath}`;
  }

  // Preserve existing local/dev behavior when Firebase Storage credentials
  // are not configured.
  return `https://storage.tryfit.local/${destinationPath}`;
}

module.exports = {
  getUserDoc,
  setUserDoc,
  getSubcollectionDocs,
  getSubdoc,
  setSubdoc,
  deleteSubdoc,
  uploadBufferToStorage,
};
