const { db, bucket, isFirebaseConfigured } = require('../config/firebase.config');

/**
 * Common Firebase Firestore and Storage operations
 */

async function getUserDoc(uid) {
  const docRef = db.collection('users').doc(uid);
  const snap = await docRef.get();
  return snap.exists ? snap.data() : null;
}

async function setUserDoc(uid, data, merge = true) {
  const docRef = db.collection('users').doc(uid);
  const payload = {
    ...data,
    updatedAt: new Date().toISOString(),
  };
  await docRef.set(payload, { merge });
  return payload;
}

async function getSubcollectionDocs(uid, subcollectionName) {
  const colRef = db.collection('users').doc(uid).collection(subcollectionName);
  const snapshot = await colRef.get();
  const results = [];
  snapshot.docs.forEach((doc) => {
    results.push({ id: doc.id, ...doc.data() });
  });
  return results;
}

async function getSubdoc(uid, subcollectionName, docId) {
  const docRef = db.collection('users').doc(uid).collection(subcollectionName).doc(docId);
  const snap = await docRef.get();
  return snap.exists ? { id: snap.id, ...snap.data() } : null;
}

async function setSubdoc(uid, subcollectionName, docId, data, merge = true) {
  const docRef = db.collection('users').doc(uid).collection(subcollectionName).doc(docId);
  const payload = {
    ...data,
    updatedAt: new Date().toISOString(),
  };
  await docRef.set(payload, { merge });
  return { id: docId, ...payload };
}

async function deleteSubdoc(uid, subcollectionName, docId) {
  const docRef = db.collection('users').doc(uid).collection(subcollectionName).doc(docId);
  await docRef.delete();
  return true;
}

/**
 * Upload a binary buffer to Firebase Storage or generate a reliable URL
 */
async function uploadBufferToStorage(buffer, destinationPath, contentType = 'image/jpeg') {
  if (isFirebaseConfigured && bucket) {
    const file = bucket.file(destinationPath);
    await file.save(buffer, {
      metadata: {
        contentType,
      },
      public: true,
    });
    // Public URL or signed URL
    return `https://storage.googleapis.com/${bucket.name}/${destinationPath}`;
  } else {
    // Local / Dev simulated URL
    return `https://storage.tryfit.local/${destinationPath}`;
  }
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
