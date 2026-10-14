const styledLooksService = require('../services/styledLooks.service');

async function listStyledLooks(req, res, next) {
  try {
    const looks = await styledLooksService.listStyledLooks(req.user.uid);
    return res.success(looks);
  } catch (error) {
    next(error);
  }
}

async function getStyledLook(req, res, next) {
  try {
    const look = await styledLooksService.getStyledLook(req.user.uid, req.params.id);
    if (!look) {
      return res.fail('AI Styled Look not found', 'LOOK_NOT_FOUND', 404);
    }
    return res.success(look);
  } catch (error) {
    next(error);
  }
}

async function saveStyledLook(req, res, next) {
  try {
    const look = await styledLooksService.saveStyledLook(req.user.uid, req.body);
    return res.success(look, 'AI Styled Look saved successfully', 201);
  } catch (error) {
    next(error);
  }
}

async function deleteStyledLook(req, res, next) {
  try {
    await styledLooksService.deleteStyledLook(req.user.uid, req.params.id);
    return res.success({ id: req.params.id }, 'AI Styled Look deleted successfully');
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listStyledLooks,
  getStyledLook,
  saveStyledLook,
  deleteStyledLook,
};
