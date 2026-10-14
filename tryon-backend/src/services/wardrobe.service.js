const { v4: uuidv4 } = require('uuid');
const { getSubcollectionDocs, getSubdoc, setSubdoc, deleteSubdoc } = require('./firebase.service');

const VALID_CATEGORIES = ['Tops', 'Bottoms', 'Dresses', 'Outerwear', 'Shoes', 'Accessories'];

async function listWardrobe(uid, category = null) {
  const items = await getSubcollectionDocs(uid, 'wardrobe');
  if (category) {
    const target = category.toLowerCase();
    return items.filter((item) => item.category && item.category.toLowerCase() === target);
  }
  return items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

async function getWardrobeItem(uid, itemId) {
  let item = await getSubdoc(uid, 'wardrobe', itemId);
  if (!item) {
    try {
      const { SEED_PAYLOADS } = require('../../seed');
      const seedItem = SEED_PAYLOADS.wardrobeItems.find((i) => i.id === itemId);
      if (seedItem) {
        item = {
          ...seedItem,
          userId: uid,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await setSubdoc(uid, 'wardrobe', itemId, item, false);
      }
    } catch (e) {}
  }
  return item;
}

async function addWardrobeItem(uid, itemData) {
  const { image, category, color, style, brand } = itemData;

  if (!image) {
    throw new Error('Image URL is required for wardrobe items');
  }

  // Prevent local device paths from being saved
  if (image.startsWith('/data/') || image.startsWith('file://')) {
    throw new Error('Local device paths cannot be saved. Upload the image to storage first.');
  }

  // Validate category
  const normalizedCategory = VALID_CATEGORIES.find(
    (c) => c.toLowerCase() === (category || '').trim().toLowerCase()
  );

  if (!normalizedCategory) {
    throw new Error(`Invalid category. Allowed: ${VALID_CATEGORIES.join(', ')}`);
  }

  const itemId = itemData.id || uuidv4();
  const now = new Date().toISOString();

  const item = {
    id: itemId,
    userId: uid,
    image,
    category: normalizedCategory,
    color: color || '',
    style: style || '',
    brand: brand || '',
    createdAt: now,
    updatedAt: now,
  };

  await setSubdoc(uid, 'wardrobe', itemId, item, false);
  return item;
}

async function updateWardrobeItem(uid, itemId, updateData) {
  let existing = await getSubdoc(uid, 'wardrobe', itemId);
  if (!existing) {
    try {
      const { SEED_PAYLOADS } = require('../../seed');
      const seedItem = SEED_PAYLOADS.wardrobeItems.find((i) => i.id === itemId);
      if (seedItem) {
        existing = {
          ...seedItem,
          userId: uid,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await setSubdoc(uid, 'wardrobe', itemId, existing, false);
      }
    } catch (e) {}
  }

  if (!existing) {
    const err = new Error('Wardrobe item not found');
    err.statusCode = 404;
    err.code = 'ITEM_NOT_FOUND';
    throw err;
  }

  const allowedFields = ['category', 'color', 'style', 'brand', 'image'];
  const updatePayload = {};

  for (const field of allowedFields) {
    if (updateData[field] !== undefined) {
      if (field === 'category') {
        const normalized = VALID_CATEGORIES.find(
          (c) => c.toLowerCase() === updateData[field].trim().toLowerCase()
        );
        if (!normalized) {
          throw new Error(`Invalid category. Allowed: ${VALID_CATEGORIES.join(', ')}`);
        }
        updatePayload[field] = normalized;
      } else if (field === 'image') {
        if (updateData.image.startsWith('/data/') || updateData.image.startsWith('file://')) {
          throw new Error('Local device paths cannot be saved.');
        }
        updatePayload[field] = updateData[field];
      } else {
        updatePayload[field] = updateData[field];
      }
    }
  }

  return await setSubdoc(uid, 'wardrobe', itemId, updatePayload, true);
}

async function deleteWardrobeItem(uid, itemId) {
  return await deleteSubdoc(uid, 'wardrobe', itemId);
}

module.exports = {
  VALID_CATEGORIES,
  listWardrobe,
  getWardrobeItem,
  addWardrobeItem,
  updateWardrobeItem,
  deleteWardrobeItem,
};
