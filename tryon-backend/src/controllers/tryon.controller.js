const tryonService = require('../services/tryon.service');

async function handleTryOn(req, res, next) {
  try {
    const { personImage, clothingImage, category } = req.body;
    const result = await tryonService.executeVirtualTryOn(req.user.uid, {
      personImage,
      clothingImage,
      category,
    });
    return res.success(result, 'Virtual Try-On generated successfully');
  } catch (error) {
    next(error);
  }
}

async function getTryOnHistory(req, res, next) {
  try {
    const history = await tryonService.getTryOnHistory(req.user.uid);
    return res.success(history);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  handleTryOn,
  getTryOnHistory,
};
