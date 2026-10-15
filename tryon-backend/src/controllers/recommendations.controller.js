const recommendationsService = require('../services/recommendations.service');

/**
 * Recommendations Controller
 * Handles HTTP requests for "For You" recommendations and curated fashion categories.
 */

async function getForYouRecommendations(req, res, next) {
  try {
    const result = await recommendationsService.getForYouRecommendations(req.user.uid, req.query);
    return res.success(result);
  } catch (error) {
    next(error);
  }
}

async function getCategories(req, res, next) {
  try {
    const categories = await recommendationsService.getCategories(req.user.uid);
    return res.success(categories);
  } catch (error) {
    next(error);
  }
}

async function getCategoryCollection(req, res, next) {
  try {
    const categoryId = req.params.id || req.params.categoryId;
    const collection = await recommendationsService.getCategoryCollection(req.user.uid, categoryId);
    return res.success(collection);
  } catch (error) {
    next(error);
  }
}

async function getDailyRecommendation(req, res, next) {
  try {
    const daily = await recommendationsService.getDailyRecommendation(req.user.uid);
    return res.success(daily);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getForYouRecommendations,
  getCategories,
  getCategoryCollection,
  getDailyRecommendation,
};
