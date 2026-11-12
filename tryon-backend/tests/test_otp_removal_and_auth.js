/**
 * OTP Removal, Auth Middleware, and Core API Regression Test Suite
 *
 * Verifies:
 * 1. OTP routes, controllers, services, config keys, and test files are completely removed.
 * 2. Auth middleware enforces Firebase ID tokens, rejects forged/legacy HS256 JWTs
 *    in both dev and production, rejects dev tokens in production, allows dev fallback
 *    when Firebase is unconfigured in non-production, and strips untrusted userId.
 * 3. Express app returns 404 NOT_FOUND for /api/otp/* endpoints.
 * 4. Remaining /api/v1/* endpoints (health, profile + contact phone, preferences,
 *    wardrobe, coins + idempotency, AI match, subscription, favorites, planner,
 *    recommendations, recent picks, notifications, stats) work intact.
 *
 * Uses an in-memory mock MySQL pool injected via require.cache so it runs
 * deterministically without external MySQL or Firebase credentials.
 */

const assert = require('assert');
const fs = require('fs');
const http = require('http');
const path = require('path');

const backendRoot = path.resolve(__dirname, '..');
const dbModulePath = path.resolve(backendRoot, 'src/db/db.js');

// ---------------------------------------------------------------------------
// In-Memory MySQL Mock Pool (users + user_documents)
// ---------------------------------------------------------------------------
function createInMemoryPool() {
  const usersByFirebaseUid = new Map();
  const usersById = new Map();
  const documents = new Map();
  let nextUserId = 1;
  let failUserUpsert = false;

  const docKey = (uid, collection, docId) => `${uid}::${collection}::${docId}`;

  const pool = {
    async execute(sql, params = []) {
      const normalized = sql.replace(/\s+/g, ' ').trim();

      if (/^INSERT INTO users \(firebase_uid, email, name\)/i.test(normalized)) {
        if (failUserUpsert) {
          const err = new Error('Simulated MySQL connection error');
          err.code = 'ECONNREFUSED';
          throw err;
        }
        const [firebaseUid, email, name] = params;
        let row = usersByFirebaseUid.get(firebaseUid);
        const now = new Date();
        if (!row) {
          row = {
            id: nextUserId++,
            firebase_uid: firebaseUid,
            phone: null,
            name: name || null,
            email: email || null,
            is_verified: 0,
            role: 'user',
            created_at: now,
            updated_at: now,
          };
          usersByFirebaseUid.set(firebaseUid, row);
          usersById.set(row.id, row);
        } else {
          if (params[3] !== null && params[3] !== undefined) row.email = params[3];
          if (params[4] !== null && params[4] !== undefined) row.name = params[4];
          row.updated_at = now;
        }
        return [{ insertId: row.id, affectedRows: 1 }];
      }

      if (/^SELECT .* FROM users WHERE firebase_uid = \? LIMIT 1/i.test(normalized)) {
        const row = usersByFirebaseUid.get(String(params[0]));
        return [row ? [{ ...row }] : []];
      }

      if (/^SELECT .* FROM users WHERE id = \? LIMIT 1/i.test(normalized)) {
        const row = usersById.get(Number(params[0]));
        return [row ? [{ ...row }] : []];
      }

      if (/^UPDATE users SET /i.test(normalized)) {
        const matchWhereFb = /WHERE firebase_uid = \?$/i.test(normalized);
        const matchWhereId = /WHERE id = \?$/i.test(normalized);
        const targetKey = params[params.length - 1];
        const row = matchWhereFb
          ? usersByFirebaseUid.get(String(targetKey))
          : matchWhereId
          ? usersById.get(Number(targetKey))
          : null;
        if (!row) return [{ affectedRows: 0 }];

        const setClause = normalized.match(/^UPDATE users SET (.+) WHERE /i)[1];
        const parts = setClause.split(',').map((s) => s.trim());
        let paramIdx = 0;
        for (const part of parts) {
          const colMatch = part.match(/^`?(\w+)`? = \?$/);
          if (colMatch) {
            row[colMatch[1]] = params[paramIdx++];
          }
        }
        row.updated_at = new Date();
        return [{ affectedRows: 1 }];
      }

      if (/^SELECT data FROM user_documents WHERE user_uid = \? AND collection_name = '__user__' AND document_id = 'root' LIMIT 1/i.test(normalized)) {
        const key = docKey(params[0], '__user__', 'root');
        const record = documents.get(key);
        return [record ? [{ data: record.data }] : []];
      }

      if (/^SELECT data FROM user_documents WHERE user_uid = \? AND collection_name = \? AND document_id = \? LIMIT 1/i.test(normalized)) {
        const key = docKey(params[0], params[1], params[2]);
        const record = documents.get(key);
        return [record ? [{ data: record.data }] : []];
      }

      if (/^INSERT INTO user_documents/i.test(normalized)) {
        const [uid, collection, docId, jsonData] = params;
        const key = docKey(uid, collection, docId);
        const existing = documents.get(key);
        const now = existing ? existing.created_at : new Date();
        documents.set(key, {
          user_uid: String(uid),
          collection_name: String(collection),
          document_id: String(docId),
          data: typeof jsonData === 'string' ? jsonData : JSON.stringify(jsonData),
          created_at: now,
          updated_at: new Date(),
        });
        return [{ affectedRows: 1 }];
      }

      if (/^SELECT document_id, data FROM user_documents WHERE user_uid = \? AND collection_name = \?/i.test(normalized)) {
        const [uid, collection] = params;
        const rows = [];
        for (const rec of documents.values()) {
          if (rec.user_uid === String(uid) && rec.collection_name === String(collection)) {
            rows.push({
              document_id: rec.document_id,
              data: rec.data,
              created_at: rec.created_at,
            });
          }
        }
        rows.sort((a, b) => b.created_at - a.created_at || a.document_id.localeCompare(b.document_id));
        return [rows.map(({ document_id, data }) => ({ document_id, data }))];
      }

      if (/^DELETE FROM user_documents WHERE user_uid = \? AND collection_name = \? AND document_id = \?/i.test(normalized)) {
        const deleted = documents.delete(docKey(params[0], params[1], params[2]));
        return [{ affectedRows: deleted ? 1 : 0 }];
      }

      throw new Error(`Unhandled SQL in test mock: ${normalized}`);
    },
    async query(sql, params) {
      return pool.execute(sql, params);
    },
  };

  return {
    pool,
    usersByFirebaseUid,
    usersById,
    documents,
    setFailUserUpsert(val) {
      failUserUpsert = val;
    },
    seedLegacyUser(row) {
      usersById.set(row.id, { ...row });
      if (row.firebase_uid) usersByFirebaseUid.set(row.firebase_uid, usersById.get(row.id));
    },
  };
}

const dbMock = createInMemoryPool();
require.cache[dbModulePath] = {
  id: dbModulePath,
  filename: dbModulePath,
  loaded: true,
  exports: {
    pool: dbMock.pool,
    testConnection: async () => true,
  },
};

const firebaseConfig = require(path.resolve(backendRoot, 'src/config/firebase.config'));
const { authenticateUser } = require(path.resolve(backendRoot, 'src/middleware/auth.middleware'));
const app = require(path.resolve(backendRoot, 'src/app'));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeMockRes() {
  const result = {
    statusCode: 200,
    body: null,
  };
  return {
    result,
    success(data = {}, message = null, statusCode = 200) {
      result.statusCode = statusCode;
      result.body = { success: true, data, message, error: null };
      return result;
    },
    fail(message = 'An error occurred', errorCode = 'BAD_REQUEST', statusCode = 400) {
      result.statusCode = statusCode;
      result.body = { success: false, data: null, message, error: { code: errorCode } };
      return result;
    },
  };
}

function httpRequest(port, method, reqPath, { headers = {}, body = null } = {}) {
  return new Promise((resolve, reject) => {
    const payload = body !== null ? JSON.stringify(body) : null;
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path: reqPath,
        method,
        headers: {
          ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {}),
          ...headers,
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          let parsed = null;
          try {
            parsed = raw ? JSON.parse(raw) : null;
          } catch {
            parsed = raw;
          }
          resolve({ status: res.statusCode, headers: res.headers, body: parsed });
        });
      }
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

// Synthetic 3-segment HS256-shaped JWT (header.payload.signature)
const SAMPLE_HS256_JWT =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
  'eyJpZCI6MSwicGhvbmUiOiI5MTk4NzY1NDMyMTAiLCJyb2xlIjoidXNlciJ9.' +
  'invalidsignature123456';

let passed = 0;
async function runStep(name, fn) {
  await fn();
  console.log(`  [PASS] ${name}`);
  passed++;
}

async function runTests() {
  console.log('\n==============================================================');
  console.log(' OTP Removal & Backend Auth/API Regression Suite');
  console.log('==============================================================\n');

  // -------------------------------------------------------------------------
  // 1. Static Removal Checks
  // -------------------------------------------------------------------------
  console.log('[1] Removed OTP Artifacts Verification');

  await runStep('OTP routes, controller, service, and test files do not exist', async () => {
    const removed = [
      'src/routes/otp.routes.js',
      'src/controllers/otp.controller.js',
      'src/services/otp.service.js',
      'tests/test_otp.js',
    ];
    for (const rel of removed) {
      assert.strictEqual(fs.existsSync(path.resolve(backendRoot, rel)), false, `${rel} must be deleted`);
    }
  });

  await runStep('package.json removed jsonwebtoken dependency and test:otp script', async () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(backendRoot, 'package.json'), 'utf8'));
    assert.strictEqual(pkg.dependencies.jsonwebtoken, undefined, 'jsonwebtoken must not be in dependencies');
    assert.strictEqual(pkg.scripts['test:otp'], undefined, 'test:otp script must be removed');
    assert.ok(pkg.dependencies['firebase-admin'], 'firebase-admin must be preserved');
    assert.ok(pkg.dependencies.mysql2, 'mysql2 must be preserved');
  });

  await runStep('env templates & docker-compose files removed JWT_SECRET and MSG91_* vars', async () => {
    const filesToCheck = [
      path.resolve(backendRoot, '.env.example'),
      path.resolve(backendRoot, '.env.docker.example'),
      path.resolve(backendRoot, 'docker-compose.yml'),
      path.resolve(backendRoot, '..', 'docker-compose.yml'),
    ];
    for (const filePath of filesToCheck) {
      const text = fs.readFileSync(filePath, 'utf8');
      assert.strictEqual(/JWT_SECRET|MSG91_/i.test(text), false, `${filePath} must not contain JWT_SECRET or MSG91_*`);
    }
  });

  // -------------------------------------------------------------------------
  // 2. Auth Middleware Unit Tests
  // -------------------------------------------------------------------------
  console.log('\n[2] Auth Middleware Unit Tests (Success, Failure, Edge Cases)');

  const savedEnv = {
    NODE_ENV: process.env.NODE_ENV,
    JWT_SECRET: process.env.JWT_SECRET,
  };
  const origFbState = {
    isFirebaseConfigured: firebaseConfig.isFirebaseConfigured,
    auth: firebaseConfig.auth,
  };

  try {
    await runStep('Rejects missing Authorization header with 401', async () => {
      const req = { headers: {} };
      const res = makeMockRes();
      let nextCalled = false;
      await authenticateUser(req, res, () => (nextCalled = true));
      assert.strictEqual(nextCalled, false);
      assert.strictEqual(res.result.statusCode, 401);
      assert.strictEqual(res.result.body.error.code, 'UNAUTHORIZED');
    });

    await runStep('Rejects non-Bearer scheme and empty Bearer token with 401', async () => {
      for (const authHeader of ['Basic dXNlcjpwYXNz', 'Bearer   ']) {
        const req = { headers: { authorization: authHeader } };
        const res = makeMockRes();
        let nextCalled = false;
        await authenticateUser(req, res, () => (nextCalled = true));
        assert.strictEqual(nextCalled, false);
        assert.strictEqual(res.result.statusCode, 401);
      }
    });

    await runStep('Rejects 3-segment OTP HS256 JWT even in dev mode with JWT_SECRET set', async () => {
      process.env.NODE_ENV = 'development';
      process.env.JWT_SECRET = 'legacy-secret';
      firebaseConfig.isFirebaseConfigured = false;
      firebaseConfig.auth = null;

      const req = { headers: { authorization: `Bearer ${SAMPLE_HS256_JWT}` }, body: {}, query: {} };
      const res = makeMockRes();
      let nextCalled = false;
      await authenticateUser(req, res, () => (nextCalled = true));
      assert.strictEqual(nextCalled, false);
      assert.strictEqual(res.result.statusCode, 401);
      assert.strictEqual(res.result.body.error.code, 'UNAUTHORIZED');
    });

    await runStep('Rejects 3-segment JWT in production mode with 401', async () => {
      process.env.NODE_ENV = 'production';
      firebaseConfig.isFirebaseConfigured = false;
      firebaseConfig.auth = null;

      const req = { headers: { authorization: `Bearer ${SAMPLE_HS256_JWT}` }, body: {}, query: {} };
      const res = makeMockRes();
      let nextCalled = false;
      await authenticateUser(req, res, () => (nextCalled = true));
      assert.strictEqual(nextCalled, false);
      assert.strictEqual(res.result.statusCode, 401);
    });

    await runStep('Rejects dev-/mock- tokens in production mode with 401', async () => {
      process.env.NODE_ENV = 'production';
      firebaseConfig.isFirebaseConfigured = false;
      firebaseConfig.auth = null;

      for (const tok of ['dev-123', 'mock-abc', 'test_user_uid_12345']) {
        const req = { headers: { authorization: `Bearer ${tok}` }, body: {}, query: {} };
        const res = makeMockRes();
        let nextCalled = false;
        await authenticateUser(req, res, () => (nextCalled = true));
        assert.strictEqual(nextCalled, false);
        assert.strictEqual(res.result.statusCode, 401);
      }
    });

    await runStep('Allows dev/mock fallback in development mode when Firebase unconfigured & strips userId', async () => {
      process.env.NODE_ENV = 'development';
      firebaseConfig.isFirebaseConfigured = false;
      firebaseConfig.auth = null;

      const req = {
        headers: { authorization: 'Bearer dev-alice_dev' },
        body: { userId: 'spoofed_uid', name: 'Alice' },
        query: { userId: 'spoofed_query_uid', filter: 'top' },
      };
      const res = makeMockRes();
      let nextCalled = false;
      await authenticateUser(req, res, () => (nextCalled = true));
      assert.strictEqual(nextCalled, true);
      assert.strictEqual(req.user.uid, 'alice_dev');
      assert.strictEqual(req.body.userId, undefined, 'body.userId must be stripped');
      assert.strictEqual(req.query.userId, undefined, 'query.userId must be stripped');
      assert.strictEqual(req.body.name, 'Alice');
      assert.strictEqual(req.query.filter, 'top');
    });

    await runStep('Verifies Google Firebase ID token, upserts MySQL user, and attaches req.user', async () => {
      process.env.NODE_ENV = 'production';
      firebaseConfig.isFirebaseConfigured = true;
      firebaseConfig.auth = {
        async verifyIdToken(tok) {
          if (tok === 'valid-firebase-token') {
            return {
              uid: 'fb_uid_001',
              email: 'google.user@tryfit.app',
              name: 'Google Stylist',
              phone_number: '+14155550199',
            };
          }
          throw new Error('Invalid Firebase token');
        },
      };

      const req = {
        headers: { authorization: 'Bearer valid-firebase-token' },
        body: { userId: 'attacker' },
        query: { userId: 'attacker' },
      };
      const res = makeMockRes();
      let nextCalled = false;
      await authenticateUser(req, res, () => (nextCalled = true));
      assert.strictEqual(nextCalled, true);
      assert.strictEqual(req.user.uid, 'fb_uid_001');
      assert.strictEqual(req.user.email, 'google.user@tryfit.app');
      assert.strictEqual(req.user.phone, '+14155550199');
      assert.strictEqual(req.body.userId, undefined);
      assert.strictEqual(req.query.userId, undefined);

      const dbRow = dbMock.usersByFirebaseUid.get('fb_uid_001');
      assert.ok(dbRow, 'Google user row must be upserted into MySQL users table');
      assert.strictEqual(dbRow.email, 'google.user@tryfit.app');
      assert.strictEqual(dbRow.name, 'Google Stylist');
    });

    await runStep('Rejects invalid token with 401 when Firebase is configured (even in dev)', async () => {
      process.env.NODE_ENV = 'development';
      const req = { headers: { authorization: 'Bearer dev-should-fail' }, body: {}, query: {} };
      const res = makeMockRes();
      let nextCalled = false;
      await authenticateUser(req, res, () => (nextCalled = true));
      assert.strictEqual(nextCalled, false);
      assert.strictEqual(res.result.statusCode, 401);
    });

    await runStep('Valid Google login remains non-fatal if MySQL users upsert fails temporarily', async () => {
      dbMock.setFailUserUpsert(true);
      const req = { headers: { authorization: 'Bearer valid-firebase-token' }, body: {}, query: {} };
      const res = makeMockRes();
      let nextCalled = false;
      await authenticateUser(req, res, () => (nextCalled = true));
      dbMock.setFailUserUpsert(false);
      assert.strictEqual(nextCalled, true);
      assert.strictEqual(req.user.uid, 'fb_uid_001');
    });
  } finally {
    process.env.NODE_ENV = savedEnv.NODE_ENV;
    if (savedEnv.JWT_SECRET === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = savedEnv.JWT_SECRET;
    firebaseConfig.isFirebaseConfigured = origFbState.isFirebaseConfigured;
    firebaseConfig.auth = origFbState.auth;
  }

  // -------------------------------------------------------------------------
  // 3. Express HTTP Integration & Regression Tests
  // -------------------------------------------------------------------------
  console.log('\n[3] Express HTTP Integration & Regression Tests');

  firebaseConfig.isFirebaseConfigured = true;
  firebaseConfig.auth = {
    async verifyIdToken(tok) {
      if (tok === 'google-integration-token') {
        return {
          uid: 'google_http_user_001',
          email: 'http.tester@tryfit.app',
          name: 'HTTP Tester',
        };
      }
      throw new Error('Bad ID token');
    },
  };

  let server;
  try {
    server = http.createServer(app);
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', resolve);
    });
    const { port } = server.address();
    const authHeaders = { Authorization: 'Bearer google-integration-token' };

    await runStep('All legacy /api/otp/* routes return 404 NOT_FOUND', async () => {
      const otpRequests = [
        ['POST', '/api/otp/send', { phone: '9876543210' }],
        ['POST', '/api/otp/verify', { phone: '9876543210', otp: '1234' }],
        ['POST', '/api/otp/resend', { phone: '9876543210' }],
        ['GET', '/api/otp', null],
      ];
      for (const [method, endpoint, body] of otpRequests) {
        const res = await httpRequest(port, method, endpoint, { body });
        assert.strictEqual(res.status, 404, `${method} ${endpoint} should return 404`);
        assert.strictEqual(res.body.success, false);
        assert.strictEqual(res.body.error.code, 'NOT_FOUND');
      }
    });

    await runStep('GET /api/v1/health responds 200 ONLINE', async () => {
      const res = await httpRequest(port, 'GET', '/api/v1/health');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.status, 'ONLINE');
    });

    await runStep('Protected /api/v1/profile rejects unauthenticated & OTP-JWT requests with 401', async () => {
      const noAuth = await httpRequest(port, 'GET', '/api/v1/profile');
      assert.strictEqual(noAuth.status, 401);

      const oldJwt = await httpRequest(port, 'GET', '/api/v1/profile', {
        headers: { Authorization: `Bearer ${SAMPLE_HS256_JWT}` },
      });
      assert.strictEqual(oldJwt.status, 401);
    });

    await runStep('Profile, contact phone field, avatar & preferences work for Google user', async () => {
      const profGet = await httpRequest(port, 'GET', '/api/v1/profile', { headers: authHeaders });
      assert.strictEqual(profGet.status, 200);
      assert.strictEqual(profGet.body.data.uid, 'google_http_user_001');

      const infoUpdate = await httpRequest(port, 'PUT', '/api/v1/profile/personal-info', {
        headers: authHeaders,
        body: { name: 'Updated Google User', phone: '+919876543210' },
      });
      assert.strictEqual(infoUpdate.status, 200);
      assert.strictEqual(infoUpdate.body.data.name, 'Updated Google User');
      assert.strictEqual(infoUpdate.body.data.phone, '+919876543210');

      const avatarUpdate = await httpRequest(port, 'PUT', '/api/v1/profile/avatar', {
        headers: authHeaders,
        body: { avatarId: 'avatar_03' },
      });
      assert.strictEqual(avatarUpdate.status, 200);
      assert.strictEqual(avatarUpdate.body.data.selectedAvatarId, 'avatar_03');

      const prefsUpdate = await httpRequest(port, 'PUT', '/api/v1/profile/preferences', {
        headers: authHeaders,
        body: {
          palette: { undertone: 'Warm' },
          aesthetic: { style: 'Minimalist' },
          bodyFit: { fit: 'Tailored' },
        },
      });
      assert.strictEqual(prefsUpdate.status, 200);
      assert.strictEqual(prefsUpdate.body.data.palette.undertone, 'Warm');
    });

    await runStep('Wardrobe validation rejects local paths & CRUD preserves token identity', async () => {
      const badLocal = await httpRequest(port, 'POST', '/api/v1/wardrobe', {
        headers: authHeaders,
        body: { image: 'file:///storage/emulated/0/pic.jpg', category: 'Tops' },
      });
      assert.ok(badLocal.status >= 400, 'file:// path must be rejected');

      const createRes = await httpRequest(port, 'POST', '/api/v1/wardrobe?userId=attacker_id', {
        headers: authHeaders,
        body: {
          userId: 'attacker_id',
          image: 'https://storage.googleapis.com/tryon-8d7f7.appspot.com/shirt.jpg',
          category: 'Tops',
          color: 'Olive',
          style: 'Minimalist',
        },
      });
      assert.strictEqual(createRes.status, 201);
      assert.strictEqual(createRes.body.data.userId, 'google_http_user_001');

      const itemId = createRes.body.data.id;
      const listRes = await httpRequest(port, 'GET', '/api/v1/wardrobe?category=Tops', { headers: authHeaders });
      assert.strictEqual(listRes.status, 200);
      assert.strictEqual(listRes.body.data.length, 1);
      assert.strictEqual(listRes.body.data[0].id, itemId);
    });

    await runStep('Coins balance, purchase idempotency & AI Match deduction work intact', async () => {
      const initBal = await httpRequest(port, 'GET', '/api/v1/coins/balance', { headers: authHeaders });
      assert.strictEqual(initBal.status, 200);
      const startBalance = initBal.body.data.balance;
      assert.strictEqual(typeof startBalance, 'number');

      const idemKey = 'idem-coin-purchase-001';
      const purchase1 = await httpRequest(port, 'POST', '/api/v1/coins/purchase', {
        headers: { ...authHeaders, 'X-Idempotency-Key': idemKey },
        body: { packageId: 'pkg_coins_100' },
      });
      assert.strictEqual(purchase1.status, 200);
      assert.strictEqual(purchase1.body.data.newBalance, startBalance + 100);

      // Replay with same X-Idempotency-Key must not double credit
      const purchase2 = await httpRequest(port, 'POST', '/api/v1/coins/purchase', {
        headers: { ...authHeaders, 'X-Idempotency-Key': idemKey },
        body: { packageId: 'pkg_coins_100' },
      });
      assert.strictEqual(purchase2.status, 200);
      assert.strictEqual(purchase2.body.data.newBalance, startBalance + 100);

      const badPkg = await httpRequest(port, 'POST', '/api/v1/coins/purchase', {
        headers: authHeaders,
        body: { packageId: 'pkg_does_not_exist' },
      });
      assert.strictEqual(badPkg.status, 400);

      const balAfterPurchase = await httpRequest(port, 'GET', '/api/v1/coins/balance', { headers: authHeaders });
      assert.strictEqual(balAfterPurchase.body.data.balance, startBalance + 100);

      const badMatch = await httpRequest(port, 'POST', '/api/v1/ai/match', {
        headers: authHeaders,
        body: { clothingImage: 'https://storage.googleapis.com/tryon-8d7f7.appspot.com/shirt.jpg' },
      });
      assert.strictEqual(badMatch.status, 400);

      const matchRes = await httpRequest(port, 'POST', '/api/v1/ai/match', {
        headers: authHeaders,
        body: {
          personImage: 'https://storage.googleapis.com/tryon-8d7f7.appspot.com/person.jpg',
          clothingImage: 'https://storage.googleapis.com/tryon-8d7f7.appspot.com/shirt.jpg',
          clothingAttributes: { color: 'Olive', fit: 'Tailored', style: 'Minimalist' },
        },
      });
      assert.strictEqual(matchRes.status, 200);
      assert.strictEqual(matchRes.body.data.coinsCharged, 5);
      assert.ok(matchRes.body.data.matchScore >= 50 && matchRes.body.data.matchScore <= 98);

      const balAfterMatch = await httpRequest(port, 'GET', '/api/v1/coins/balance', { headers: authHeaders });
      assert.strictEqual(balAfterMatch.body.data.balance, startBalance + 95);
    });

    await runStep('Subscriptions, favorites, planner, recommendations, recent picks, notifications & stats work intact', async () => {
      const subTrial = await httpRequest(port, 'POST', '/api/v1/subscription/trial/start', {
        headers: authHeaders,
        body: {},
      });
      assert.strictEqual(subTrial.status, 200);
      assert.strictEqual(subTrial.body.data.status, 'FREE_TRIAL');

      const favToggle = await httpRequest(port, 'POST', '/api/v1/favorites/toggle', {
        headers: authHeaders,
        body: { targetType: 'clothing', targetId: 'cloth_1', itemData: { name: 'Linen Shirt', category: 'Tops' } },
      });
      assert.strictEqual(favToggle.status, 200);
      assert.strictEqual(favToggle.body.data.isFavorite, true);

      const favCheck = await httpRequest(port, 'GET', '/api/v1/favorites/check/cloth_1', { headers: authHeaders });
      assert.strictEqual(favCheck.status, 200);
      assert.strictEqual(favCheck.body.data.isFavorite, true);

      const planAdd = await httpRequest(port, 'POST', '/api/v1/planner', {
        headers: authHeaders,
        body: { date: '2026-11-15', imageRef: 'https://storage.googleapis.com/tryon-8d7f7.appspot.com/shirt.jpg' },
      });
      assert.strictEqual(planAdd.status, 200);

      const buildWeek = await httpRequest(port, 'GET', '/api/v1/planner/build-week', { headers: authHeaders });
      assert.strictEqual(buildWeek.status, 200);

      const recs = await httpRequest(port, 'GET', '/api/v1/recommendations/for-you', { headers: authHeaders });
      assert.strictEqual(recs.status, 200);

      const pickRes = await httpRequest(port, 'POST', '/api/v1/recent-picks', {
        headers: authHeaders,
        body: { itemId: 'cloth_1', title: 'Linen Shirt', imageUrl: 'https://storage.googleapis.com/tryon-8d7f7.appspot.com/shirt.jpg' },
      });
      assert.strictEqual(pickRes.status, 200);

      const notifRes = await httpRequest(port, 'GET', '/api/v1/notifications', { headers: authHeaders });
      assert.strictEqual(notifRes.status, 200);

      const statsRes = await httpRequest(port, 'GET', '/api/v1/profile/stats', { headers: authHeaders });
      assert.strictEqual(statsRes.status, 200);
    });
  } finally {
    firebaseConfig.isFirebaseConfigured = origFbState.isFirebaseConfigured;
    firebaseConfig.auth = origFbState.auth;
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  }

  console.log(`\n==============================================================`);
  console.log(` ALL ${passed} TESTS PASSED`);
  console.log(`==============================================================\n`);
}

runTests().catch((err) => {
  console.error('\n[TEST FAILURE]', err);
  process.exit(1);
});
