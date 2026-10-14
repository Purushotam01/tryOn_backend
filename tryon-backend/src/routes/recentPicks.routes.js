const express = require('express');
const router = express.Router();
const recentPicksController = require('../controllers/recentPicks.controller');
const { authenticateUser } = require('../middleware/auth.middleware');

router.use(authenticateUser);

router.get('/', recentPicksController.listRecentPicks);
router.post('/', recentPicksController.recordRecentPick);

module.exports = router;
