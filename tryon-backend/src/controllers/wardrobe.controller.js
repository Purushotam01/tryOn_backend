const wardrobeService = require('../services/wardrobe.service');

async function listWardrobe(req, res, next) {
  try {
    const { category } = req.query;
    const items = await wardrobeService.listWardrobe(req.user.uid, category);
    return res.success(items);
  } catch (error) {
    next(error);
  }
}

async function getWardrobeItem(req, res, next) {
  try {
    const item = await wardrobeService.getWardrobeItem(req.user.uid, req.params.id);
    if (!item) {
      return res.fail('Wardrobe item not found', 'ITEM_NOT_FOUND', 404);
    }
    return res.success(item);
  } catch (error) {
    next(error);
  }
}

async function addWardrobeItem(req, res, next) {
  try {
    const item = await wardrobeService.addWardrobeItem(req.user.uid, req.body);
    return res.success(item, 'Item added to wardrobe successfully', 201);
  } catch (error) {
    next(error);
  }
}

async function updateWardrobeItem(req, res, next) {
  try {
    const updated = await wardrobeService.updateWardrobeItem(req.user.uid, req.params.id, req.body);
    return res.success(updated, 'Wardrobe item updated successfully');
  } catch (error) {
    next(error);
  }
}

async function deleteWardrobeItem(req, res, next) {
  try {
    await wardrobeService.deleteWardrobeItem(req.user.uid, req.params.id);
    return res.success({ id: req.params.id }, 'Wardrobe item removed successfully');
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listWardrobe,
  getWardrobeItem,
  addWardrobeItem,
  updateWardrobeItem,
  deleteWardrobeItem,
};
