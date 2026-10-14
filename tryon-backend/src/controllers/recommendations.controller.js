const recommendationsService = require('../services/recommendations.service');

async function getForYouRecommendations(req, res, next) {
  try {
    const result = await recommendationsService.getForYouRecommendations(req.user.uid);
    return res.success(result);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getForYouRecommendations,
};
