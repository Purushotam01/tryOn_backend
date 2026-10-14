/**
 * Idempotency Middleware (Section 28)
 * Prevents double payments, duplicate coin purchases, and repeated Try-On requests.
 * Uses X-Idempotency-Key header or req.body.idempotencyKey.
 */

// In-memory cache for idempotency records with TTL
const idempotencyStore = new Map();
const TTL_MS = 10 * 60 * 1000; // 10 minutes

function cleanExpiredKeys() {
  const now = Date.now();
  for (const [key, record] of idempotencyStore.entries()) {
    if (now - record.timestamp > TTL_MS) {
      idempotencyStore.delete(key);
    }
  }
}

// Clean every 5 minutes
setInterval(cleanExpiredKeys, 5 * 60 * 1000).unref();

function enforceIdempotency(req, res, next) {
  const idempotencyKey = req.headers['x-idempotency-key'] || (req.body && req.body.idempotencyKey);

  if (!idempotencyKey) {
    // If no idempotency key provided, proceed normally
    return next();
  }

  const userKey = `${req.user ? req.user.uid : 'anon'}:${idempotencyKey}`;
  const existing = idempotencyStore.get(userKey);

  if (existing) {
    if (existing.status === 'PROCESSING') {
      return res.fail(
        'A request with this idempotency key is already processing. Please wait.',
        'IDEMPOTENCY_IN_PROGRESS',
        409
      );
    }
    // Return cached response
    return res.status(existing.statusCode).json(existing.body);
  }

  // Mark as processing
  idempotencyStore.set(userKey, {
    status: 'PROCESSING',
    timestamp: Date.now(),
  });

  // Capture original response
  const originalJson = res.json.bind(res);
  res.json = function (body) {
    idempotencyStore.set(userKey, {
      status: 'COMPLETED',
      statusCode: res.statusCode,
      body,
      timestamp: Date.now(),
    });
    return originalJson(body);
  };

  next();
}

module.exports = {
  enforceIdempotency,
};
