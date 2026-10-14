const express = require('express');
const router = express.Router();
const aimatchController = require('../controllers/aimatch.controller');
const { authenticateUser } = require('../middleware/auth.middleware');
const { aiRateLimiter } = require('../middleware/rateLimit.middleware');

router.use(authenticateUser);

router.post('/match', aiRateLimiter, aimatchController.handleMatch);

module.exports = router;
