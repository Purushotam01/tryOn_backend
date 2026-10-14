const express = require('express');
const router = express.Router();
const coinsController = require('../controllers/coins.controller');
const { authenticateUser } = require('../middleware/auth.middleware');
const { enforceIdempotency } = require('../middleware/idempotency.middleware');

router.use(authenticateUser);

router.get('/balance', coinsController.getBalance);
router.get('/packages', coinsController.getPackages);
router.get('/transactions', coinsController.getTransactions);
router.post('/purchase', enforceIdempotency, coinsController.purchasePackage);

module.exports = router;
