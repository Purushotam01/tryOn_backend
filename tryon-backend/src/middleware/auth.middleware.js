const { auth, isFirebaseConfigured } = require('../config/firebase.config');

/**
 * Authentication Middleware:
 * 1. Checks 'Authorization: Bearer <token>' header.
 * 2. Verifies token with Firebase Authentication Admin SDK.
 * 3. Injects req.user = { uid, email, phone, ... }.
 * 4. Strips or rejects any untrusted userId sent in body or query parameters.
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

    if (isFirebaseConfigured && auth) {
      // Production verification against Firebase Auth
      const decodedToken = await auth.verifyIdToken(token);
      uid = decodedToken.uid;
      email = decodedToken.email || null;
      phone = decodedToken.phone_number || null;
    } else {
      // Local development fallback: parse mock token or fallback to dev user
      if (token.startsWith('mock-') || token.startsWith('dev-')) {
        uid = token.replace(/^(mock-|dev-)/, '');
      } else {
        // Try decoding JWT if possible or default to token as test UID
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
