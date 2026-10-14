const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profile.controller');
const { authenticateUser } = require('../middleware/auth.middleware');

router.use(authenticateUser);

router.get('/', profileController.getProfile);
router.put('/', profileController.updateProfile);

router.get('/preferences', profileController.getPreferences);
router.put('/preferences', profileController.updatePreferences);

router.get('/stats', profileController.getProfileStats);

module.exports = router;
