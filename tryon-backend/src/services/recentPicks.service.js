const { getSubcollectionDocs, setSubdoc, deleteSubdoc } = require('./firebase.service');

const MAX_RECENT_PICKS = 10;

/**
 * Recent Picks Service (Section 14)
 * - Maximum 10 items
 * - Newest first
 * - Duplicate-safe (updates timestamp and brings to front if re-viewed)
 */

async function listRecentPicks(uid) {
  const items = await getSubcollectionDocs(uid, 'recentPicks');
  return items
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .slice(0, MAX_RECENT_PICKS);
}

async function recordRecentPick(uid, { itemType, itemId, title, imageUrl, metadata = {} }) {
  if (!itemId || !imageUrl) {
    const err = new Error('itemId and imageUrl are required');
    err.code = 'INVALID_RECENT_PICK_DATA';
    err.statusCode = 400;
    throw err;
  }

  // Consistent ID per target item to guarantee duplicate safety
  const pickId = `pick_${itemType || 'item'}_${itemId}`;
  const now = new Date().toISOString();

  const record = {
    id: pickId,
    itemType: itemType || 'WARDROBE',
    itemId,
    title: title || 'Item',
    imageUrl,
    metadata,
    updatedAt: now,
  };

  await setSubdoc(uid, 'recentPicks', pickId, record);

  // Enforce maximum 10 items by removing oldest entries if over limit
  const allPicks = await getSubcollectionDocs(uid, 'recentPicks');
  if (allPicks.length > MAX_RECENT_PICKS) {
    const sorted = allPicks.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    const toPrune = sorted.slice(MAX_RECENT_PICKS);
    for (const item of toPrune) {
      await deleteSubdoc(uid, 'recentPicks', item.id);
    }
  }

  return record;
}

module.exports = {
  listRecentPicks,
  recordRecentPick,
};
