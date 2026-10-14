/**
 * TryFit Subscription Configuration
 */
module.exports = {
  SUBSCRIPTION_STATUSES: {
    UNKNOWN: 'UNKNOWN',
    FREE_TRIAL: 'FREE_TRIAL',
    PREMIUM_ACTIVE: 'PREMIUM_ACTIVE',
    PAYMENT_PROCESSING: 'PAYMENT_PROCESSING',
    PAYMENT_FAILED: 'PAYMENT_FAILED',
    EXPIRED: 'EXPIRED',
  },

  // Free trial duration in days
  TRIAL_DURATION_DAYS: 3,

  // Available premium plans
  PLANS: [
    {
      id: 'plan_monthly_pro',
      name: 'TryFit Pro Monthly',
      duration: 'monthly',
      price: 9.99,
      currency: 'USD',
      coinsGranted: 500,
      features: [
        'Unlimited AI Match score calculations',
        'High definition Virtual Try-On',
        'Unlimited Wardrobe Cloud sync',
        'Automated Build My Week plans',
        '500 Monthly Bonus Coins',
      ],
    },
    {
      id: 'plan_annual_pro',
      name: 'TryFit Pro Annual',
      duration: 'yearly',
      price: 79.99,
      currency: 'USD',
      coinsGranted: 2000,
      features: [
        'Everything in Monthly Pro',
        'Save over 33%',
        'Priority AI Try-On generation queue',
        '2000 Annual Bonus Coins',
      ],
    },
  ],
};
