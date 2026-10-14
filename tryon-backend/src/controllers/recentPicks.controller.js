const recentPicksService = require('../services/recentPicks.service');

async function listRecentPicks(req, res, next) {
  try {
    const items = await recentPicksService.listRecentPicks(req.user.uid);
    return res.success(items);
  } catch (error) {
    next(error);
  }
}

async function recordRecentPick(req, res, next) {
  try {
    const { itemType, itemId, title, imageUrl, metadata } = req.body;
    const record = await recentPicksService.recordRecentPick(req.user.uid, {
      itemType,
      itemId,
      title,
      imageUrl,
      metadata,
    });
    return res.success(record, 'Recent pick recorded');
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listRecentPicks,
  recordRecentPick,
};
