const express = require('express');
const router = express.Router();
const favoritesController = require('../controllers/favorites.controller');
const { authenticateUser } = require('../middleware/auth.middleware');

router.use(authenticateUser);

// List & Dedicated UI views
router.get('/', favoritesController.listFavorites);
router.get('/clothes', favoritesController.listFavoriteClothes);
router.get('/aesthetics', favoritesController.listFavoriteAesthetics);

// Status check by targetId or favId
router.get('/check/:id', favoritesController.checkFavorite);
router.get('/status/:id', favoritesController.checkFavorite);

// Mutate Favorites
router.post('/', favoritesController.addFavorite);
router.post('/toggle', favoritesController.toggleFavorite);
router.delete('/:id', favoritesController.removeFavorite);

module.exports = router;
