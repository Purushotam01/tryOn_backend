const express = require('express');
const router = express.Router();
const favoritesController = require('../controllers/favorites.controller');
const { authenticateUser } = require('../middleware/auth.middleware');

router.use(authenticateUser);

router.get('/', favoritesController.listFavorites);
router.post('/', favoritesController.addFavorite);
router.delete('/:id', favoritesController.removeFavorite);

module.exports = router;
