const subscriptionService = require('../services/subscription.service');

async function getSubscription(req, res, next) {
  try {
    const status = await subscriptionService.getSubscriptionStatus(req.user.uid);
    return res.success(status);
  } catch (error) {
    next(error);
  }
}

async function startFreeTrial(req, res, next) {
  try {
    const options = { reset: req.query.reset === 'true' || req.body?.reset === true };
    const result = await subscriptionService.startFreeTrial(req.user.uid, options);
    return res.success(result, 'Free trial started successfully');
  } catch (error) {
    next(error);
  }
}

async function purchaseSubscription(req, res, next) {
  try {
    const { planId, paymentRef } = req.body;
    const result = await subscriptionService.activatePremium(req.user.uid, { planId, paymentRef });
    return res.success(result, 'Premium subscription activated successfully');
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getSubscription,
  startFreeTrial,
  purchaseSubscription,
};
