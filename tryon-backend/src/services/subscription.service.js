const { getSubdoc, setSubdoc } = require('./firebase.service');
const { addCoins } = require('./coins.service');
const { SUBSCRIPTION_STATUSES, TRIAL_DURATION_DAYS, PLANS } = require('../config/subscription.config');

/**
 * Authoritative Premium Subscription & Free Trial Service (Sections 18 & 19)
 */

async function getSubscriptionStatus(uid) {
  let sub = await getSubdoc(uid, 'subscription', 'details');

  if (!sub) {
    sub = {
      status: SUBSCRIPTION_STATUSES.UNKNOWN,
      plan: null,
      startedAt: null,
      expiresAt: null,
      trialUsed: false,
      isPremiumActive: false,
      updatedAt: new Date().toISOString(),
    };
    await setSubdoc(uid, 'subscription', 'details', sub);
  }

  // Check if active subscription or trial has expired
  const now = new Date();
  let isPremiumActive = false;

  if (sub.status === SUBSCRIPTION_STATUSES.FREE_TRIAL || sub.status === SUBSCRIPTION_STATUSES.PREMIUM_ACTIVE) {
    if (sub.expiresAt && new Date(sub.expiresAt) > now) {
      isPremiumActive = true;
    } else if (sub.expiresAt) {
      // Mark as expired
      sub.status = SUBSCRIPTION_STATUSES.EXPIRED;
      sub.isPremiumActive = false;
      await setSubdoc(uid, 'subscription', 'details', sub, true);
    }
  }

  return {
    ...sub,
    isPremiumActive,
    availablePlans: PLANS,
  };
}

async function startFreeTrial(uid, options = {}) {
  const currentSub = await getSubdoc(uid, 'subscription', 'details');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000);

  // If trial was already claimed, return active trial details idempotently instead of throwing 400
  if (currentSub && currentSub.trialUsed && !options.reset) {
    const isStillActive = currentSub.expiresAt && new Date(currentSub.expiresAt) > now;
    const activeSub = {
      ...currentSub,
      status: SUBSCRIPTION_STATUSES.FREE_TRIAL,
      plan: currentSub.plan || 'trial_3_days',
      startedAt: currentSub.startedAt || now.toISOString(),
      expiresAt: isStillActive ? currentSub.expiresAt : expiresAt.toISOString(),
      trialUsed: true,
      isPremiumActive: true,
      updatedAt: now.toISOString(),
    };

    await setSubdoc(uid, 'subscription', 'details', activeSub, true);

    return {
      ...activeSub,
      message: isStillActive
        ? 'Free trial is currently active for this account.'
        : 'Free trial refreshed for this account.',
    };
  }

  const updatedSub = {
    status: SUBSCRIPTION_STATUSES.FREE_TRIAL,
    plan: 'trial_3_days',
    startedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    trialUsed: true,
    isPremiumActive: true,
    updatedAt: now.toISOString(),
  };

  await setSubdoc(uid, 'subscription', 'details', updatedSub, true);

  return updatedSub;
}

async function activatePremium(uid, { planId, paymentRef = 'PAY_' + Date.now() }) {
  const selectedPlan = PLANS.find((p) => p.id === planId) || PLANS[0];
  const now = new Date();

  // Duration calculation
  const durationMonths = selectedPlan.duration === 'yearly' ? 12 : 1;
  const expiresAt = new Date(now);
  expiresAt.setMonth(expiresAt.getMonth() + durationMonths);

  const updatedSub = {
    status: SUBSCRIPTION_STATUSES.PREMIUM_ACTIVE,
    plan: selectedPlan.id,
    paymentRef,
    startedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    isPremiumActive: true,
    updatedAt: now.toISOString(),
  };

  await setSubdoc(uid, 'subscription', 'details', updatedSub, true);

  // Grant bonus coins included with subscription
  if (selectedPlan.coinsGranted) {
    await addCoins(uid, selectedPlan.coinsGranted, selectedPlan.id, 'SUBSCRIPTION_BONUS_COINS');
  }

  return {
    subscription: updatedSub,
    coinsGranted: selectedPlan.coinsGranted || 0,
  };
}

module.exports = {
  getSubscriptionStatus,
  startFreeTrial,
  activatePremium,
};
