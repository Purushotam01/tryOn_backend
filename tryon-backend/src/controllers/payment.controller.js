const paymentService = require('../services/payment.service');

async function handleWebhook(req, res, next) {
  try {
    const signature = req.headers['x-payment-signature'] || req.headers['stripe-signature'];
    const secret = process.env.PAYMENT_WEBHOOK_SECRET;

    const isValid = await paymentService.verifyWebhookSignature(req.body, signature, secret);
    if (!isValid) {
      return res.fail('Invalid webhook signature', 'INVALID_SIGNATURE', 400);
    }

    const result = await paymentService.processPaymentEvent(req.body);
    return res.success(result, 'Payment webhook processed successfully');
  } catch (error) {
    next(error);
  }
}

module.exports = {
  handleWebhook,
};
