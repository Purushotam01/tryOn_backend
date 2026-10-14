const express = require('express');
const router = express.Router();

const profileRoutes = require('./profile.routes');
const wardrobeRoutes = require('./wardrobe.routes');
const storageRoutes = require('./storage.routes');
const tryonRoutes = require('./tryon.routes');
const aimatchRoutes = require('./aimatch.routes');
const styledLooksRoutes = require('./styledLooks.routes');
const recommendationsRoutes = require('./recommendations.routes');
const plannerRoutes = require('./planner.routes');
const recentPicksRoutes = require('./recentPicks.routes');
const favoritesRoutes = require('./favorites.routes');
const coinsRoutes = require('./coins.routes');
const subscriptionRoutes = require('./subscription.routes');
const notificationsRoutes = require('./notifications.routes');
const paymentRoutes = require('./payment.routes');

// Mount all v1 sub-routes
router.use('/profile', profileRoutes);
router.use('/wardrobe', wardrobeRoutes);
router.use('/storage', storageRoutes);
router.use('/try-on', tryonRoutes);
router.use('/ai', aimatchRoutes);
router.use('/ai/styled-looks', styledLooksRoutes);
router.use('/recommendations', recommendationsRoutes);
router.use('/planner', plannerRoutes);
router.use('/recent-picks', recentPicksRoutes);
router.use('/favorites', favoritesRoutes);
router.use('/coins', coinsRoutes);
router.use('/subscription', subscriptionRoutes);
router.use('/notifications', notificationsRoutes);
router.use('/payments', paymentRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.success({
    status: 'ONLINE',
    version: '1.0.0',
    service: 'TryFit Backend Service',
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
