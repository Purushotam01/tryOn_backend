const aimatchService = require('../services/aimatch.service');

async function handleMatch(req, res, next) {
  try {
    const { personImage, clothingImage, clothingImages, clothingAttributes } = req.body;
    const result = await aimatchService.calculateMatch(req.user.uid, {
      personImage,
      clothingImage,
      clothingImages,
      clothingAttributes,
    });
    return res.success(result, 'AI Match score calculated successfully');
  } catch (error) {
    next(error);
  }
}

module.exports = {
  handleMatch,
};
