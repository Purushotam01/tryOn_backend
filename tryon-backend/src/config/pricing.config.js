/**
 * TryFit Pricing and Coin Economy Configuration
 */
module.exports = {
  // Coin consumption per AI operation
  COIN_COSTS: {
    VIRTUAL_TRY_ON: 10,
    AI_MATCH: 5,
    OUTFIT_RECOMMENDATION: 0, // Free
  },

  // Coin packages available for purchase
  COIN_PACKAGES: [
    {
      id: 'pkg_coins_100',
      coins: 100,
      price: 1.99,
      currency: 'USD',
      title: '100 Coins',
      popular: false,
    },
    {
      id: 'pkg_coins_500',
      coins: 500,
      price: 7.99,
      currency: 'USD',
      title: '500 Coins',
      popular: true,
      bonusCoins: 50,
    },
    {
      id: 'pkg_coins_1000',
      coins: 1000,
      price: 14.99,
      currency: 'USD',
      title: '1000 Coins',
      popular: false,
      bonusCoins: 200,
    },
  ],

  // Default starting balance for new users
  INITIAL_USER_BALANCE: 20,
};
