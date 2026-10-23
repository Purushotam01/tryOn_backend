const firebaseConfig = require('../config/firebase.config');
const jwt = require('jsonwebtoken');
const { pool } = require('../db/db');

/**
 * Authentication Middleware:
 * 1. Checks 'Authorization: Bearer <token>' header.
 * 2. Primary (Production): Verifies Firebase ID Token for Google Sign-In users.
 * 3. Secondary (Production & Dev): Verifies HS256 JWT for MSG91 Phone OTP users.
 * 4. Local Dev Fallback: Allows mock/test tokens ONLY when Firebase is unconfigured.
 * 5. Injects req.user = { uid, email, phone, role }.
 * 6. Strips or rejects any untrusted userId sent in body or query parameters.
 */
async function authenticateUser(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.fail('Unauthorized: Missing or invalid Authorization header', 'UNAUTHORIZED', 401);
    }

    const token = authHeader.split('Bearer ')[1].trim();
    if (!token) {
      return res.fail('Unauthorized: Token missing', 'UNAUTHORIZED', 401);
    }

    let uid = null;
    let email = null;
    let phone = null;
    let role = 'user';

    const { auth, isFirebaseConfigured } = firebaseConfig;

    // 1. Primary: Verify Firebase ID Token if Firebase is configured (Google Sign-In)
    if (isFirebaseConfigured && auth) {
      try {
        const decodedToken = await auth.verifyIdToken(token);
        uid = decodedToken.uid;
        email = decodedToken.email || null;
        phone = decodedToken.phone_number || null;
        const displayName = decodedToken.name || null;

        // Persist/refresh Google user record in MySQL using firebase_uid as the
        // stable unique key. This is best-effort: a DB outage must never block
        // a valid Firebase authentication. Email is never used as the join key.
        try {
          await pool.execute(
            `INSERT INTO users (firebase_uid, email, name)
             VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE
               email       = COALESCE(?, email),
               name        = COALESCE(?, name),
               updated_at  = CURRENT_TIMESTAMP`,
            [uid, email, displayName, email, displayName]
          );
        } catch (dbErr) {
          // Non-fatal: Firestore-backed features continue to work without MySQL.
          // Log enough detail to diagnose issues without exposing credentials or tokens.
          console.warn(
            '[Auth] MySQL upsert failed for Google user — code: %s, message: %s',
            dbErr.code || 'UNKNOWN',
            dbErr.message
          );
        }
      } catch (fbError) {
        // Token is not a valid Firebase ID token; proceed to check OTP JWT
      }
    }

    // 2. Secondary: Verify OTP-issued JWT with JWT_SECRET (MSG91 Phone OTP login)
    // Checked whenever uid is not yet resolved and JWT_SECRET is present
    if (!uid && process.env.JWT_SECRET) {
      try {
        const decodedJwt = jwt.verify(token, process.env.JWT_SECRET, {
          algorithms: ['HS256'],
        });

        // Enforce required claims (must have an id claim)
        if (decodedJwt && decodedJwt.id !== undefined && decodedJwt.id !== null) {
          uid = String(decodedJwt.id);
          phone = decodedJwt.phone || null;
          role = decodedJwt.role || 'user';
        }
      } catch (jwtError) {
        // If the token is a structured JWT (3 dot-separated segments) that failed verification,
        // reject immediately as invalid or expired (do not fall through to dev mock strings)
        if (token.includes('.') && token.split('.').length === 3) {
          return res.fail('Unauthorized: Invalid or expired token', 'UNAUTHORIZED', 401);
        }
      }
    }

    // 3. Development / Test Fallback
    // Strictly allowed ONLY when Firebase is unconfigured AND not in production; rejected in production
    if (!uid) {
      if ((isFirebaseConfigured && auth) || process.env.NODE_ENV === 'production') {
        return res.fail('Unauthorized: Invalid or expired token', 'UNAUTHORIZED', 401);
      }

      // Local development fallback: parse mock token or fallback to dev user
      if (token.startsWith('mock-') || token.startsWith('dev-')) {
        uid = token.replace(/^(mock-|dev-)/, '');
      } else {
        // Default to token as test UID (used by integration tests e.g. test_user_uid_12345)
        uid = token.length < 128 ? token : `dev_user_${token.substring(0, 12)}`;
      }
      email = `${uid}@tryfit.app`;
      phone = '+1234567890';
    }

    if (!uid) {
      return res.fail('Unauthorized: Invalid authentication credentials', 'INVALID_TOKEN', 401);
    }

    // Attach authenticated user identity
    req.user = {
      uid,
      email,
      phone,
      role,
    };

    // Security Mandate (Section 3):
    // Ensure body and query userId cannot override the authenticated token UID
    if (req.body && req.body.userId) {
      delete req.body.userId;
    }
    if (req.query && req.query.userId) {
      delete req.query.userId;
    }

    next();
  } catch (error) {
    console.error('[Auth Middleware] Verification failed:', error.message);
    return res.fail('Unauthorized: Invalid or expired token', 'UNAUTHORIZED', 401);
  }
}

module.exports = {
  authenticateUser,
};
