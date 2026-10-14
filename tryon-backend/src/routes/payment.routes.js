const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const { enforceIdempotency } = require('../middleware/idempotency.middleware');

router.post('/webhook', enforceIdempotency, paymentController.handleWebhook);

module.exports = router;
