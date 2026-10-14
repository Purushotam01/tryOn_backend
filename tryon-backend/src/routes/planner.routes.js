const express = require('express');
const router = express.Router();
const plannerController = require('../controllers/planner.controller');
const { authenticateUser } = require('../middleware/auth.middleware');

router.use(authenticateUser);

router.get('/build-week', plannerController.buildMyWeek);
router.get('/', plannerController.listPlannerEntries);
router.post('/', plannerController.addOrUpdatePlannerEntry);
router.delete('/:id', plannerController.deletePlannerEntry);

module.exports = router;
