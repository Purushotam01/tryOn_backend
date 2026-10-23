const assert = require('assert');

const rows = new Map();
const keyOf = (uid, collection, id) => `${uid}|${collection}|${id}`;

const fakePool = {
  async execute(sql, params) {
    if (sql.includes('FROM users WHERE id = ?') && params[0] === 42) {
      return [[{ id: 42, firebase_uid: null, phone: '919876543210', name: 'Original Name', email: 'otp@tryfit.app', role: 'user', created_at: new Date(), updated_at: new Date() }]];
    }
    if (sql.includes('FROM users WHERE')) return [[]];
    if (sql.includes('UPDATE users SET')) return [{ affectedRows: 0 }];
    if (sql.includes("collection_name = '__user__'")) {
      const key = keyOf(params[0], '__user__', 'root');
      return [rows.has(key) ? [{ data: rows.get(key) }] : []];
    }
    if (sql.includes('SELECT data FROM user_documents')) {
      const key = keyOf(params[0], params[1], params[2]);
      return [rows.has(key) ? [{ data: rows.get(key) }] : []];
    }
    if (sql.includes('SELECT document_id, data FROM user_documents')) {
      const [uid, collection] = params;
      const selected = [];
      for (const [key, data] of rows.entries()) {
        const [rowUid, rowCollection, documentId] = key.split('|');
        if (rowUid === uid && rowCollection === collection) {
          selected.push({ document_id: documentId, data });
        }
      }
      return [selected];
    }
    if (sql.includes('INSERT INTO user_documents')) {
      const [uid, collection, id, json] = params;
      rows.set(keyOf(uid, collection, id), JSON.parse(json));
      return [{ affectedRows: 1 }];
    }
    if (sql.includes('DELETE FROM user_documents')) {
      rows.delete(keyOf(params[0], params[1], params[2]));
      return [{ affectedRows: 1 }];
    }
    throw new Error(`Unexpected SQL in adapter test: ${sql}`);
  },
};

const firebaseConfigPath = require.resolve('../src/config/firebase.config');
const dbPath = require.resolve('../src/db/db');
require.cache[firebaseConfigPath] = {
  id: firebaseConfigPath,
  filename: firebaseConfigPath,
  loaded: true,
  exports: { bucket: null, isFirebaseConfigured: false },
};
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: { pool: fakePool },
};

const store = require('../src/services/firebase.service');

(async () => {
  await store.setSubdoc('u1', 'wardrobe', 'item1', {
    category: 'Tops',
    color: 'Blue',
    createdAt: '2026-01-01T00:00:00.000Z',
  }, false);

  const first = await store.getSubdoc('u1', 'wardrobe', 'item1');
  assert.strictEqual(first.category, 'Tops');
  assert.strictEqual(first.id, 'item1');

  await store.setSubdoc('u1', 'wardrobe', 'item1', { color: 'Red' }, true);
  const updated = await store.getSubdoc('u1', 'wardrobe', 'item1');
  assert.strictEqual(updated.category, 'Tops', 'merge keeps existing fields');
  assert.strictEqual(updated.color, 'Red', 'merge updates supplied fields');
  assert.strictEqual(updated.createdAt, '2026-01-01T00:00:00.000Z', 'merge preserves createdAt');

  const list = await store.getSubcollectionDocs('u1', 'wardrobe');
  assert.strictEqual(list.length, 1);
  assert.strictEqual(list[0].id, 'item1');

  await store.setUserDoc('u1', { name: 'Test User' });
  assert.strictEqual((await store.getUserDoc('u1')).name, 'Test User');

  // Verify identity preservation for OTP user: updating name does not erase phone/email
  await store.setUserDoc('42', { name: 'New OTP Name' });
  const otpUserDoc = await store.getUserDoc('42');
  assert.strictEqual(otpUserDoc.name, 'New OTP Name');
  assert.strictEqual(otpUserDoc.phone, '919876543210', 'Phone number must be preserved from users table');
  assert.strictEqual(otpUserDoc.email, 'otp@tryfit.app', 'Email must be preserved from users table');

  await store.deleteSubdoc('u1', 'wardrobe', 'item1');
  assert.strictEqual(await store.getSubdoc('u1', 'wardrobe', 'item1'), null);

  console.log('MySQL document adapter unit tests passed.');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
