const { v4: uuidv4 } = require('uuid');
const { getSubcollectionDocs, getSubdoc, setSubdoc, deleteSubdoc } = require('./firebase.service');

/**
 * AI Styled Looks Service (Section 9)
 * Explicitly saved AI generated looks. Not part of My Collection.
 */

async function listStyledLooks(uid) {
  const looks = await getSubcollectionDocs(uid, 'aiStyledLooks');
  return looks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

async function getStyledLook(uid, lookId) {
  let look = await getSubdoc(uid, 'aiStyledLooks', lookId);
  if (!look) {
    try {
      const { SEED_PAYLOADS } = require('../../seed');
      const seedLook = SEED_PAYLOADS.aiStyledLooks.find((l) => l.id === lookId);
      if (seedLook) {
        look = {
          ...seedLook,
          userId: uid,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await setSubdoc(uid, 'aiStyledLooks', lookId, look);
      }
    } catch (e) {}
  }
  return look;
}

async function saveStyledLook(uid, { id, imageUrl, sourceRecommendation = null, title = 'Curated Look', tags = [] }) {
  if (!imageUrl) {
    const err = new Error('imageUrl is required');
    err.code = 'IMAGE_URL_MISSING';
    err.statusCode = 400;
    throw err;
  }

  const lookId = id || uuidv4();
  const now = new Date().toISOString();

  const look = {
    id: lookId,
    userId: uid,
    imageUrl,
    sourceRecommendation,
    title,
    tags: Array.isArray(tags) ? tags : [],
    createdAt: now,
    updatedAt: now,
  };

  await setSubdoc(uid, 'aiStyledLooks', lookId, look);
  return look;
}

async function deleteStyledLook(uid, lookId) {
  return await deleteSubdoc(uid, 'aiStyledLooks', lookId);
}

module.exports = {
  listStyledLooks,
  getStyledLook,
  saveStyledLook,
  deleteStyledLook,
};
