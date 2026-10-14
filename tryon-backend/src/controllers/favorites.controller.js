const favoritesService = require('../services/favorites.service');

async function listFavorites(req, res, next) {
  try {
    const favorites = await favoritesService.listFavorites(req.user.uid);
    return res.success(favorites);
  } catch (error) {
    next(error);
  }
}

async function addFavorite(req, res, next) {
  try {
    const { targetType, targetId, itemData } = req.body;
    const favorite = await favoritesService.addFavorite(req.user.uid, { targetType, targetId, itemData });
    return res.success(favorite, 'Added to favorites', 201);
  } catch (error) {
    next(error);
  }
}

async function removeFavorite(req, res, next) {
  try {
    await favoritesService.removeFavorite(req.user.uid, req.params.id);
    return res.success({ id: req.params.id }, 'Removed from favorites');
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listFavorites,
  addFavorite,
  removeFavorite,
};
