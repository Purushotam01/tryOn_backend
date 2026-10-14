const { v4: uuidv4 } = require('uuid');
const { getSubcollectionDocs, setSubdoc, deleteSubdoc } = require('./firebase.service');

/**
 * User Favorites Service (Section 15)
 */

async function listFavorites(uid) {
  const items = await getSubcollectionDocs(uid, 'favorites');
  return items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

async function addFavorite(uid, { targetType, targetId, itemData = {} }) {
  if (!targetType || !targetId) {
    const err = new Error('targetType and targetId are required');
    err.code = 'INVALID_FAVORITE_DATA';
    err.statusCode = 400;
    throw err;
  }

  const favId = `fav_${targetType}_${targetId}`;
  const now = new Date().toISOString();

  const favorite = {
    id: favId,
    userId: uid,
    targetType,
    targetId,
    itemData,
    createdAt: now,
  };

  await setSubdoc(uid, 'favorites', favId, favorite);
  return favorite;
}

async function removeFavorite(uid, favId) {
  return await deleteSubdoc(uid, 'favorites', favId);
}

module.exports = {
  listFavorites,
  addFavorite,
  removeFavorite,
};
