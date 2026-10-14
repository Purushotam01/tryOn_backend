const express = require('express');
const router = express.Router();
const tryonController = require('../controllers/tryon.controller');
const { authenticateUser } = require('../middleware/auth.middleware');
const { enforceIdempotency } = require('../middleware/idempotency.middleware');
const { aiRateLimiter } = require('../middleware/rateLimit.middleware');

router.use(authenticateUser);

router.post('/', aiRateLimiter, enforceIdempotency, tryonController.handleTryOn);
router.get('/history', tryonController.getTryOnHistory);

module.exports = router;
