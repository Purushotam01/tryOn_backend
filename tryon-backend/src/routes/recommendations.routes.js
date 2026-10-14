const express = require('express');
const router = express.Router();
const recommendationsController = require('../controllers/recommendations.controller');
const { authenticateUser } = require('../middleware/auth.middleware');

router.use(authenticateUser);

router.get('/for-you', recommendationsController.getForYouRecommendations);

module.exports = router;
