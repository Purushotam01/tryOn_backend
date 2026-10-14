const crypto = require('crypto');
const { addCoins } = require('./coins.service');
const { activatePremium } = require('./subscription.service');
const { setSubdoc } = require('./firebase.service');

/**
 * Payment Verification & Webhook Service (Section 17)
 */

async function verifyWebhookSignature(payload, signature, secret) {
  if (!secret) return true; // Development bypass if secret not set
  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(typeof payload === 'string' ? payload : JSON.stringify(payload))
      .digest('hex');
    return expectedSignature === signature;
  } catch (err) {
    return false;
  }
}

async function processPaymentEvent(event) {
  const { eventType, userId, amount, currency, metadata = {}, paymentId } = event;

  if (!userId) {
    throw new Error('userId is missing in payment event');
  }

  // Record payment in Firestore
  const paymentRecord = {
    paymentId: paymentId || `pay_${Date.now()}`,
    userId,
    eventType,
    amount,
    currency,
    metadata,
    status: 'COMPLETED',
    processedAt: new Date().toISOString(),
  };

  await setSubdoc(userId, 'payments', paymentRecord.paymentId, paymentRecord);

  // Handle fulfillment based on metadata type
  if (metadata.type === 'COINS' && metadata.packageId) {
    const coinsService = require('./coins.service');
    await coinsService.purchasePackage(userId, metadata.packageId);
  } else if (metadata.type === 'SUBSCRIPTION' && metadata.planId) {
    await activatePremium(userId, { planId: metadata.planId, paymentRef: paymentRecord.paymentId });
  }

  return paymentRecord;
}

module.exports = {
  verifyWebhookSignature,
  processPaymentEvent,
};
