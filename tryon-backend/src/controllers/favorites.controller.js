const favoritesService = require('../services/favorites.service');

/**
 * Favorites Controller
 * Handles HTTP requests for Favorites & Profile favorites endpoints.
 */

/**
 * GET /api/v1/favorites or /api/v1/profile/favorites
 * List all favorites with optional query filtering (?type=clothing, ?category=..., ?search=...)
 */
async function listFavorites(req, res, next) {
  try {
    const favorites = await favoritesService.listFavorites(req.user.uid, req.query);
    return res.success(favorites);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/favorites/clothes or /api/v1/profile/favorites/clothes
 * Dedicated endpoint returning list of favorite clothes formatted for FavoriteClothesScreen
 */
async function listFavoriteClothes(req, res, next) {
  try {
    const clothes = await favoritesService.listFavoriteClothes(req.user.uid);
    return res.success(clothes);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/favorites/aesthetics or /api/v1/profile/favorites/aesthetics
 * Dedicated endpoint returning list of favorite aesthetics formatted for FavoriteAestheticView
 */
async function listFavoriteAesthetics(req, res, next) {
  try {
    const aesthetics = await favoritesService.listFavoriteAesthetics(req.user.uid);
    return res.success(aesthetics);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/favorites/check/:id or /api/v1/profile/favorites/check/:id
 * Check favorite status by targetId or favoriteId
 */
async function checkFavorite(req, res, next) {
  try {
    const targetId = req.params.id || req.query.targetId;
    const targetType = req.query.type || req.query.targetType;
    const status = await favoritesService.checkFavorite(req.user.uid, targetId, targetType);
    return res.success(status);
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/favorites or /api/v1/profile/favorites
 * Add an item to favorites (accepts { targetType, targetId, itemData } or flat clothing item)
 */
async function addFavorite(req, res, next) {
  try {
    const favorite = await favoritesService.addFavorite(req.user.uid, req.body);
    return res.success(favorite, 'Added to favorites', 201);
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/favorites/toggle or /api/v1/profile/favorites/toggle
 * Toggle favorite state on or off
 */
async function toggleFavorite(req, res, next) {
  try {
    const result = await favoritesService.toggleFavorite(req.user.uid, req.body);
    const message = result.isFavorite ? 'Added to favorites' : 'Removed from favorites';
    return res.success(result, message);
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/v1/favorites/:id or /api/v1/profile/favorites/:id
 * Remove an item from favorites by favorite id or targetId
 */
async function removeFavorite(req, res, next) {
  try {
    const result = await favoritesService.removeFavorite(
      req.user.uid,
      req.params.id,
      req.query.type
    );
    return res.success(result, 'Removed from favorites');
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listFavorites,
  listFavoriteClothes,
  listFavoriteAesthetics,
  checkFavorite,
  addFavorite,
  toggleFavorite,
  removeFavorite,
};
