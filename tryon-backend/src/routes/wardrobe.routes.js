const express = require('express');
const router = express.Router();
const wardrobeController = require('../controllers/wardrobe.controller');
const { authenticateUser } = require('../middleware/auth.middleware');

router.use(authenticateUser);

router.get('/', wardrobeController.listWardrobe);
router.post('/', wardrobeController.addWardrobeItem);
router.get('/:id', wardrobeController.getWardrobeItem);
router.put('/:id', wardrobeController.updateWardrobeItem);
router.delete('/:id', wardrobeController.deleteWardrobeItem);

module.exports = router;
