const profileService = require('../services/profile.service');
const notificationsController = require('./notifications.controller');
const recommendationsController = require('./recommendations.controller');

/**
 * GET /api/v1/profile
 * Retrieves authenticated user's profile details
 */
async function getProfile(req, res, next) {
  try {
    const profile = await profileService.getProfile(req.user.uid);
    return res.success(profile);
  } catch (error) {
    next(error);
  }
}

/**
 * PUT or PATCH /api/v1/profile
 * Updates authenticated user's profile
 */
async function updateProfile(req, res, next) {
  try {
    const updated = await profileService.updateProfile(req.user.uid, req.body);
    return res.success(updated, 'Profile updated successfully');
  } catch (error) {
    next(error);
  }
}

/**
 * PUT or PATCH /api/v1/profile/avatar
 * Dedicated endpoint for avatar changes from UI
 */
async function updateAvatar(req, res, next) {
  try {
    const avatarId = req.body?.avatarId || req.body?.avatar || req.body?.selectedAvatarId;
    const updated = await profileService.updateAvatar(req.user.uid, avatarId);
    return res.success(updated, 'Avatar updated successfully');
  } catch (error) {
    next(error);
  }
}

/**
 * PUT or PATCH /api/v1/profile/personal-info
 * Dedicated endpoint for personal information modal from UI
 */
async function updatePersonalInfo(req, res, next) {
  try {
    const updated = await profileService.updatePersonalInfo(req.user.uid, req.body);
    return res.success(updated, 'Personal information updated successfully');
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/profile/preferences
 * Retrieves user's complete styling preferences
 */
async function getPreferences(req, res, next) {
  try {
    const preferences = await profileService.getPreferences(req.user.uid);
    return res.success(preferences);
  } catch (error) {
    next(error);
  }
}

/**
 * PUT or PATCH /api/v1/profile/preferences
 * Updates user's styling preferences (supports both nested and flat schemas)
 */
async function updatePreferences(req, res, next) {
  try {
    const updated = await profileService.updatePreferences(req.user.uid, req.body);
    return res.success(updated, 'Styling preferences updated successfully');
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/profile/preferences/body-fit
 * Retrieves Body Fit & Silhouette preferences for BodyFitSilhouetteView
 */
async function getBodyFit(req, res, next) {
  try {
    const bodyFit = await profileService.getBodyFitPreferences(req.user.uid);
    return res.success(bodyFit);
  } catch (error) {
    next(error);
  }
}

/**
 * PUT or PATCH /api/v1/profile/preferences/body-fit
 * Updates Body Fit & Silhouette preferences
 */
async function updateBodyFit(req, res, next) {
  try {
    const updated = await profileService.updateBodyFitPreferences(req.user.uid, req.body);
    return res.success(updated, 'Body fit preferences updated successfully');
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/profile/preferences/aesthetic
 * Retrieves Aesthetic preferences for FavoriteAestheticView
 */
async function getAesthetic(req, res, next) {
  try {
    const aesthetic = await profileService.getAestheticPreferences(req.user.uid);
    return res.success(aesthetic);
  } catch (error) {
    next(error);
  }
}

/**
 * PUT or PATCH /api/v1/profile/preferences/aesthetic
 * Updates Aesthetic preferences
 */
async function updateAesthetic(req, res, next) {
  try {
    const updated = await profileService.updateAestheticPreferences(req.user.uid, req.body);
    return res.success(updated, 'Aesthetic preferences updated successfully');
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/profile/preferences/palette
 * Retrieves Color Palette & Undertone preferences
 */
async function getPalette(req, res, next) {
  try {
    const palette = await profileService.getPalettePreferences(req.user.uid);
    return res.success(palette);
  } catch (error) {
    next(error);
  }
}

/**
 * PUT or PATCH /api/v1/profile/preferences/palette
 * Updates Color Palette & Undertone preferences
 */
async function updatePalette(req, res, next) {
  try {
    const updated = await profileService.updatePalettePreferences(req.user.uid, req.body);
    return res.success(updated, 'Color palette preferences updated successfully');
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/profile/stats
 * Retrieves dynamically aggregated profile metrics (Wardrobe, Favorite Clothes, For You / AI Match, Outfits)
 */
async function getProfileStats(req, res, next) {
  try {
    const stats = await profileService.getProfileStats(req.user.uid);
    return res.success(stats);
  } catch (error) {
    next(error);
  }
}

// Favorites Profile Endpoints
const favoritesService = require('../services/favorites.service');

async function listFavorites(req, res, next) {
  try {
    const favorites = await favoritesService.listFavorites(req.user.uid, req.query);
    return res.success(favorites);
  } catch (error) {
    next(error);
  }
}

async function listFavoriteClothes(req, res, next) {
  try {
    const clothes = await favoritesService.listFavoriteClothes(req.user.uid);
    return res.success(clothes);
  } catch (error) {
    next(error);
  }
}

async function listFavoriteAesthetics(req, res, next) {
  try {
    const aesthetics = await favoritesService.listFavoriteAesthetics(req.user.uid);
    return res.success(aesthetics);
  } catch (error) {
    next(error);
  }
}

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

async function addFavorite(req, res, next) {
  try {
    const favorite = await favoritesService.addFavorite(req.user.uid, req.body);
    return res.success(favorite, 'Added to favorites', 201);
  } catch (error) {
    next(error);
  }
}

async function toggleFavorite(req, res, next) {
  try {
    const result = await favoritesService.toggleFavorite(req.user.uid, req.body);
    const message = result.isFavorite ? 'Added to favorites' : 'Removed from favorites';
    return res.success(result, message);
  } catch (error) {
    next(error);
  }
}

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
  getProfile,
  updateProfile,
  updateAvatar,
  updatePersonalInfo,
  getPreferences,
  updatePreferences,
  getBodyFit,
  updateBodyFit,
  getAesthetic,
  updateAesthetic,
  getPalette,
  updatePalette,
  getProfileStats,
  listFavorites,
  listFavoriteClothes,
  listFavoriteAesthetics,
  checkFavorite,
  addFavorite,
  toggleFavorite,
  removeFavorite,
  // Notifications Profile Endpoints
  listNotifications: notificationsController.listNotifications,
  createNotification: notificationsController.createNotification,
  markAsRead: notificationsController.markAsRead,
  markAllAsRead: notificationsController.markAllAsRead,
  deleteNotification: notificationsController.deleteNotification,
  clearAllNotifications: notificationsController.clearAllNotifications,
  getNotificationSettings: notificationsController.getNotificationSettings,
  updateNotificationSettings: notificationsController.updateNotificationSettings,
  // Recommendations Profile Endpoints
  getForYouRecommendations: recommendationsController.getForYouRecommendations,
  getCategories: recommendationsController.getCategories,
  getCategoryCollection: recommendationsController.getCategoryCollection,
  getDailyRecommendation: recommendationsController.getDailyRecommendation,
};
