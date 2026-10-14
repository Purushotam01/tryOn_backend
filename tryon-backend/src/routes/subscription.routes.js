const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscription.controller');
const { authenticateUser } = require('../middleware/auth.middleware');
const { enforceIdempotency } = require('../middleware/idempotency.middleware');

router.use(authenticateUser);

router.get('/', subscriptionController.getSubscription);
router.post('/trial/start', subscriptionController.startFreeTrial);
router.post('/purchase', enforceIdempotency, subscriptionController.purchaseSubscription);

module.exports = router;
