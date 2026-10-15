const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profile.controller');
const favoritesController = require('../controllers/favorites.controller');
const notificationsController = require('../controllers/notifications.controller');
const recommendationsController = require('../controllers/recommendations.controller');
const { authenticateUser } = require('../middleware/auth.middleware');

// All profile endpoints require authenticated user token
router.use(authenticateUser);

// Core Profile Endpoints
router.get('/', profileController.getProfile);
router.put('/', profileController.updateProfile);
router.patch('/', profileController.updateProfile);

// Dedicated Avatar Update (matches UI Avatar selection & editing)
router.put('/avatar', profileController.updateAvatar);
router.patch('/avatar', profileController.updateAvatar);

// Dedicated Personal Information Update (matches UI Edit Profile bottom sheet)
router.put('/personal-info', profileController.updatePersonalInfo);
router.patch('/personal-info', profileController.updatePersonalInfo);

// Dynamic Profile Statistics (Wardrobe, Favorite Clothes, For You, AI Matches, Outfits)
router.get('/stats', profileController.getProfileStats);

// Complete Styling Preferences Endpoints
router.get('/preferences', profileController.getPreferences);
router.put('/preferences', profileController.updatePreferences);
router.patch('/preferences', profileController.updatePreferences);

// Granular Preference Sub-routes (matching individual UI preference views)
router.get('/preferences/body-fit', profileController.getBodyFit);
router.put('/preferences/body-fit', profileController.updateBodyFit);
router.patch('/preferences/body-fit', profileController.updateBodyFit);

router.get('/preferences/aesthetic', profileController.getAesthetic);
router.put('/preferences/aesthetic', profileController.updateAesthetic);
router.patch('/preferences/aesthetic', profileController.updateAesthetic);

router.get('/preferences/palette', profileController.getPalette);
router.put('/preferences/palette', profileController.updatePalette);
router.patch('/preferences/palette', profileController.updatePalette);

// Favorites Endpoints under Profile (matching UI Profile navigation)
router.get('/favorites', favoritesController.listFavorites);
router.get('/favorites/clothes', favoritesController.listFavoriteClothes);
router.get('/favorites/aesthetics', favoritesController.listFavoriteAesthetics);
router.get('/favorites/check/:id', favoritesController.checkFavorite);
router.get('/favorites/status/:id', favoritesController.checkFavorite);
router.post('/favorites', favoritesController.addFavorite);
router.post('/favorites/toggle', favoritesController.toggleFavorite);
router.delete('/favorites/:id', favoritesController.removeFavorite);

// Notifications Endpoints & Settings under Profile (matching UI Morning Outfit Notification switch)
router.get('/notifications/settings', notificationsController.getNotificationSettings);
router.put('/notifications/settings', notificationsController.updateNotificationSettings);
router.patch('/notifications/settings', notificationsController.updateNotificationSettings);

router.get('/notifications', notificationsController.listNotifications);
router.post('/notifications', notificationsController.createNotification);
router.put('/notifications/read-all', notificationsController.markAllAsRead);
router.put('/notifications/:id/read', notificationsController.markAsRead);
router.delete('/notifications/:id', notificationsController.deleteNotification);
router.delete('/notifications', notificationsController.clearAllNotifications);

// Recommendations & "For You" Endpoints under Profile (matching UI Profile "For You" tile)
router.get('/recommendations', recommendationsController.getForYouRecommendations);
router.get('/recommendations/for-you', recommendationsController.getForYouRecommendations);
router.get('/recommendations/categories', recommendationsController.getCategories);
router.get('/recommendations/categories/:id', recommendationsController.getCategoryCollection);
router.get('/recommendations/category/:id', recommendationsController.getCategoryCollection);
router.get('/recommendations/daily', recommendationsController.getDailyRecommendation);
router.get('/for-you', recommendationsController.getForYouRecommendations);

module.exports = router;
