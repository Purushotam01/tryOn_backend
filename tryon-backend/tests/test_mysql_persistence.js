/**
 * MySQL Persistence Tests — OTP & Google Login
 *
 * Tests MySQL persistence logic directly without a running HTTP server,
 * Firestore, MSG91, or real Firebase tokens. Uses isolated identities
 * and cleans up all test rows at the end.
 *
 * Run: node tests/test_mysql_persistence.js
 */

require('dotenv').config();
const mysql = require('mysql2/promise');

const TEST_PHONE      = '910000000001'; // synthetic — won't clash with real users
const TEST_FIREBASE_UID = 'test-firebase-uid-persistence-check-001';
const TEST_EMAIL      = 'persistence.test@tryfit.local';
const TEST_NAME       = 'Persistence Test User';

let passed = 0;
let failed = 0;
let conn;

function assert(condition, label) {
  if (condition) {
    console.log(`  [PASS] ${label}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${label}`);
    failed++;
  }
}

async function cleanupTestData(connection) {
  await connection.execute(
    'DELETE FROM users WHERE phone = ? OR firebase_uid = ?',
    [TEST_PHONE, TEST_FIREBASE_UID]
  );
}

async function runTests() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  MySQL Persistence Tests (OTP + Google Login)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  conn = await mysql.createConnection({
    host:     process.env.MYSQL_HOST     || '127.0.0.1',
    port:     parseInt(process.env.MYSQL_PORT || '3306', 10),
    user:     process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE || 'tryon_db',
  });

  // Pre-test: ensure no leftover test data
  await cleanupTestData(conn);

  // ─── OTP Login Tests ──────────────────────────────────────────

  console.log('[ OTP Login ]');

  // 1. First OTP login creates a new row
  await conn.execute(
    `INSERT INTO users (phone, is_verified)
     VALUES (?, TRUE)
     ON DUPLICATE KEY UPDATE is_verified = TRUE, updated_at = CURRENT_TIMESTAMP`,
    [TEST_PHONE]
  );
  const [[otpUser1]] = await conn.execute(
    'SELECT id, phone, firebase_uid, is_verified, role FROM users WHERE phone = ?',
    [TEST_PHONE]
  );
  assert(otpUser1 !== undefined,            'OTP first login — row created');
  assert(otpUser1?.phone === TEST_PHONE,    'OTP first login — phone stored correctly');
  assert(otpUser1?.is_verified === 1,       'OTP first login — is_verified = TRUE');
  assert(otpUser1?.firebase_uid === null,   'OTP first login — firebase_uid is NULL');
  assert(otpUser1?.role === 'user',         'OTP first login — role defaults to user');
  const otpUserId = otpUser1?.id;

  // 2. Repeat OTP login updates same row (no duplicate)
  await conn.execute(
    `INSERT INTO users (phone, is_verified)
     VALUES (?, TRUE)
     ON DUPLICATE KEY UPDATE is_verified = TRUE, updated_at = CURRENT_TIMESTAMP`,
    [TEST_PHONE]
  );
  const [[countOtp]] = await conn.execute(
    'SELECT COUNT(*) AS cnt FROM users WHERE phone = ?',
    [TEST_PHONE]
  );
  assert(countOtp.cnt === 1,               'OTP repeat login — no duplicate row created');

  const [[otpUser2]] = await conn.execute(
    'SELECT id FROM users WHERE phone = ?', [TEST_PHONE]
  );
  assert(otpUser2?.id === otpUserId,       'OTP repeat login — same row (id unchanged)');

  // ─── Google Login Tests ───────────────────────────────────────

  console.log('\n[ Google Login ]');

  // 3. First Google login creates a new row
  await conn.execute(
    `INSERT INTO users (firebase_uid, email, name)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE
       email      = COALESCE(?, email),
       name       = COALESCE(?, name),
       updated_at = CURRENT_TIMESTAMP`,
    [TEST_FIREBASE_UID, TEST_EMAIL, TEST_NAME, TEST_EMAIL, TEST_NAME]
  );
  const [[googleUser1]] = await conn.execute(
    'SELECT id, phone, firebase_uid, email, name, role FROM users WHERE firebase_uid = ?',
    [TEST_FIREBASE_UID]
  );
  assert(googleUser1 !== undefined,                       'Google first login — row created');
  assert(googleUser1?.firebase_uid === TEST_FIREBASE_UID, 'Google first login — firebase_uid stored correctly');
  assert(googleUser1?.email === TEST_EMAIL,               'Google first login — email stored correctly');
  assert(googleUser1?.name === TEST_NAME,                 'Google first login — name stored correctly');
  assert(googleUser1?.phone === null,                     'Google first login — phone is NULL');
  assert(googleUser1?.role === 'user',                    'Google first login — role defaults to user');
  const googleUserId = googleUser1?.id;

  // 4. Repeat Google login updates same row (no duplicate)
  await conn.execute(
    `INSERT INTO users (firebase_uid, email, name)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE
       email      = COALESCE(?, email),
       name       = COALESCE(?, name),
       updated_at = CURRENT_TIMESTAMP`,
    [TEST_FIREBASE_UID, TEST_EMAIL, TEST_NAME, TEST_EMAIL, TEST_NAME]
  );
  const [[countGoogle]] = await conn.execute(
    'SELECT COUNT(*) AS cnt FROM users WHERE firebase_uid = ?',
    [TEST_FIREBASE_UID]
  );
  assert(countGoogle.cnt === 1,            'Google repeat login — no duplicate row created');

  const [[googleUser2]] = await conn.execute(
    'SELECT id FROM users WHERE firebase_uid = ?', [TEST_FIREBASE_UID]
  );
  assert(googleUser2?.id === googleUserId, 'Google repeat login — same row (id unchanged)');

  // ─── Identity Isolation Tests ─────────────────────────────────

  console.log('\n[ Identity Isolation ]');

  // 5. OTP and Google users are separate rows
  const [[totalCount]] = await conn.execute(
    'SELECT COUNT(*) AS cnt FROM users WHERE phone = ? OR firebase_uid = ?',
    [TEST_PHONE, TEST_FIREBASE_UID]
  );
  assert(totalCount.cnt === 2,             'OTP and Google users stored as separate rows');
  assert(otpUserId !== googleUserId,       'OTP and Google users have different MySQL IDs');

  // ─── Invalid Input Tests ──────────────────────────────────────

  console.log('\n[ Invalid Input Rejection ]');

  // 6. Duplicate phone rejected (constraint violation)
  try {
    // Use a fresh unique firebase_uid to avoid hitting the firebase_uid unique constraint
    await conn.execute(
      `INSERT INTO users (phone, firebase_uid, is_verified) VALUES (?, ?, TRUE)`,
      [TEST_PHONE, 'test-firebase-uid-dup-phone-001']
    );
    assert(false, 'Duplicate phone — should have thrown ER_DUP_ENTRY');
  } catch (err) {
    assert(err.code === 'ER_DUP_ENTRY',    'Duplicate phone — correctly rejected by UNIQUE constraint');
  }

  // 7. Duplicate firebase_uid rejected (constraint violation)
  try {
    await conn.execute(
      `INSERT INTO users (firebase_uid, email) VALUES (?, ?)`,
      [TEST_FIREBASE_UID, 'other@example.com']
    );
    assert(false, 'Duplicate firebase_uid — should have thrown ER_DUP_ENTRY');
  } catch (err) {
    assert(err.code === 'ER_DUP_ENTRY',    'Duplicate firebase_uid — correctly rejected by UNIQUE constraint');
  }

  // ─── Startup Seeding Check ────────────────────────────────────

  console.log('\n[ App Startup ]');

  const appSrc = require('fs').readFileSync(
    require('path').join(__dirname, '../src/app.js'), 'utf8'
  );
  const hasAutoSeed = /seedDatabase\s*\(/.test(appSrc);
  assert(!hasAutoSeed,                     'app.js — no automatic seedDatabase() call on startup');

  // ─── Cleanup ──────────────────────────────────────────────────

  await cleanupTestData(conn);
  const [[afterCleanup]] = await conn.execute(
    'SELECT COUNT(*) AS cnt FROM users WHERE phone = ? OR firebase_uid = ?',
    [TEST_PHONE, TEST_FIREBASE_UID]
  );
  assert(afterCleanup.cnt === 0,           'Cleanup — all test rows removed');

  // ─── Summary ──────────────────────────────────────────────────

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
}

runTests()
  .then(() => {
    if (conn) conn.end();
    process.exit(failed > 0 ? 1 : 0);
  })
  .catch((err) => {
    console.error('\n[ERROR] Test runner failed:', err.message);
    if (conn) conn.end();
    process.exit(1);
  });
