const rateLimit = require('express-rate-limit');

/**
 * Rate Limiting Middleware (Section 25)
 * Protects expensive APIs (Virtual Try-On, AI Match) against abuse.
 */

const aiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP / user to 30 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    data: null,
    message: 'Too many AI requests. Please try again later.',
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
    },
  },
});

const standardRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit general requests to 200 per 15 mins
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    data: null,
    message: 'Too many requests. Please try again later.',
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
    },
  },
});

module.exports = {
  aiRateLimiter,
  standardRateLimiter,
};
