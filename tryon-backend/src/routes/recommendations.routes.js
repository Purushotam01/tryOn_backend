const express = require('express');
const router = express.Router();
const recommendationsController = require('../controllers/recommendations.controller');
const { authenticateUser } = require('../middleware/auth.middleware');

router.use(authenticateUser);

// Main Recommendations
router.get('/', recommendationsController.getForYouRecommendations);
router.get('/for-you', recommendationsController.getForYouRecommendations);

// Curated Categories & Collections
router.get('/categories', recommendationsController.getCategories);
router.get('/categories/:id', recommendationsController.getCategoryCollection);
router.get('/category/:id', recommendationsController.getCategoryCollection);

// Daily Morning Outfit
router.get('/daily', recommendationsController.getDailyRecommendation);
router.get('/today', recommendationsController.getDailyRecommendation);

module.exports = router;
