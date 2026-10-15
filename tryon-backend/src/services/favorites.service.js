const { v4: uuidv4 } = require('uuid');
const { getSubcollectionDocs, getSubdoc, setSubdoc, deleteSubdoc } = require('./firebase.service');

/**
 * User Favorites Service (Section 15 & UI Profiles Integration)
 * Supports Favorite Clothes, Favorite Aesthetics, and Wardrobe sync.
 */

/**
 * Normalizes targetType to standardized lowercase values:
 * 'clothing', 'aesthetic', 'outfit', etc.
 */
function normalizeTargetType(type, targetId = '', itemData = {}) {
  const raw = (type || '').toString().toLowerCase().trim();
  if (['clothing', 'wardrobe', 'cloth', 'garment'].includes(raw)) return 'clothing';
  if (['aesthetic', 'style', 'vibe'].includes(raw)) return 'aesthetic';
  if (['outfit', 'look', 'aistyledlook', 'ai_styled_look'].includes(raw)) return 'outfit';

  // Smart inference based on targetId or itemData
  if (targetId.startsWith('wardrobe_') || targetId.startsWith('cloth_')) return 'clothing';
  if (targetId.startsWith('look_') || targetId.startsWith('outfit_')) return 'outfit';
  if (targetId.startsWith('aesthetic_')) return 'aesthetic';

  if (
    itemData.category &&
    ['tops', 'bottoms', 'dresses', 'outerwear', 'shoes', 'accessories'].includes(
      itemData.category.toLowerCase()
    )
  ) {
    return 'clothing';
  }
  if (itemData.vibes || itemData.aestheticVibes) return 'aesthetic';

  return raw || 'clothing';
}

/**
 * Normalizes and formats the Favorite response for Flutter UI & REST clients.
 * Matches Flutter Clothing model, FavoriteClothesScreen, and FavoriteAestheticView.
 */
function formatFavoriteResponse(fav = {}, uid = '', wardrobeItem = null) {
  const itemData = fav.itemData || {};
  const targetType = normalizeTargetType(fav.targetType, fav.targetId, itemData);
  const targetId = fav.targetId || fav.id;

  // Merge wardrobe details if available
  const wardrobe = wardrobeItem || {};

  const name =
    itemData.name ||
    itemData.title ||
    wardrobe.name ||
    wardrobe.style ||
    itemData.style ||
    'Favorite Item';
  const title = itemData.title || name;
  const imageUrl =
    itemData.imageUrl || itemData.image || wardrobe.image || wardrobe.imageUrl || '';
  const image = imageUrl;
  const category =
    itemData.category || wardrobe.category || (targetType === 'clothing' ? 'Tops' : '');
  const color = itemData.color || wardrobe.color || '';
  const style = itemData.style || wardrobe.style || name;
  const fit = itemData.fit || wardrobe.fit || 'Regular';
  const season = itemData.season || wardrobe.season || 'All Season';
  const brand = itemData.brand || wardrobe.brand || '';
  const wornCount = Number(itemData.wornCount || wardrobe.wornCount || 0);
  const purchasePrice =
    itemData.purchasePrice !== undefined
      ? Number(itemData.purchasePrice)
      : wardrobe.purchasePrice !== undefined
      ? Number(wardrobe.purchasePrice)
      : null;
  const createdAt =
    fav.createdAt || itemData.createdAt || wardrobe.createdAt || new Date().toISOString();
  const updatedAt = fav.updatedAt || fav.createdAt || new Date().toISOString();

  // Aesthetic specifics
  const vibes = itemData.vibes || itemData.aestheticVibes || ['Minimalist', 'Modern Chic'];
  const goals = itemData.goals || itemData.stylingGoals || ['Everyday outfits', 'Work'];
  const tagline = itemData.tagline || '';
  const badge = itemData.badge || '';
  const desc = itemData.desc || '';

  return {
    id: fav.id || `fav_${targetType}_${targetId}`,
    favoriteId: fav.id || `fav_${targetType}_${targetId}`,
    targetType,
    targetId,
    userId: uid || fav.userId || '',
    isFavorite: true,
    createdAt,
    updatedAt,

    // Flattened UI fields for Flutter Clothing model (Clothing.fromJson)
    name,
    title,
    imageUrl,
    image,
    category,
    color,
    style,
    fit,
    season,
    brand,
    wornCount,
    purchasePrice,
    isLocalImage: false,
    confidence: itemData.confidence !== undefined ? Number(itemData.confidence) : 95,
    canCreateOutfitsCount: itemData.canCreateOutfitsCount || 12,

    // Flattened UI fields for Aesthetic View
    vibes,
    aestheticVibes: vibes,
    goals,
    stylingGoals: goals,
    tagline,
    badge,
    desc,

    // Raw item data preserved
    itemData: {
      ...itemData,
      name,
      title,
      imageUrl,
      image,
      category,
      color,
      style,
      brand,
    },
  };
}

/**
 * List all favorites with optional query filters (type, category, search)
 */
async function listFavorites(uid, query = {}) {
  const items = await getSubcollectionDocs(uid, 'favorites');
  const targetTypeFilter = query.type || query.targetType;
  const categoryFilter = query.category;
  const searchQuery = (query.search || query.q || '').toLowerCase().trim();

  // Load user's wardrobe items to enrich favorites and discover favorited wardrobe items
  const wardrobeDocs = await getSubcollectionDocs(uid, 'wardrobe');
  const wardrobeMap = new Map();
  for (const doc of wardrobeDocs) {
    wardrobeMap.set(doc.id, doc);
  }

  // Enrich favorites list
  const seenTargetIds = new Set();
  const formattedList = [];

  for (const item of items) {
    const wItem = wardrobeMap.get(item.targetId);
    const formatted = formatFavoriteResponse(item, uid, wItem);
    seenTargetIds.add(formatted.targetId);
    formattedList.push(formatted);
  }

  // Include wardrobe items marked with isFavorite: true not already in favorites list
  for (const wItem of wardrobeDocs) {
    if ((wItem.isFavorite === true || wItem.favorite === true) && !seenTargetIds.has(wItem.id)) {
      const syntheticFav = {
        id: `fav_clothing_${wItem.id}`,
        userId: uid,
        targetType: 'clothing',
        targetId: wItem.id,
        itemData: { ...wItem },
        createdAt: wItem.createdAt || new Date().toISOString(),
      };
      formattedList.push(formatFavoriteResponse(syntheticFav, uid, wItem));
      seenTargetIds.add(wItem.id);
    }
  }

  // Filter
  let results = formattedList;
  if (targetTypeFilter) {
    const normalizedTarget = normalizeTargetType(targetTypeFilter);
    results = results.filter((f) => f.targetType === normalizedTarget);
  }
  if (categoryFilter) {
    const catLower = categoryFilter.toLowerCase();
    results = results.filter((f) => f.category && f.category.toLowerCase() === catLower);
  }
  if (searchQuery) {
    results = results.filter(
      (f) =>
        f.name.toLowerCase().includes(searchQuery) ||
        f.brand.toLowerCase().includes(searchQuery) ||
        f.color.toLowerCase().includes(searchQuery) ||
        f.style.toLowerCase().includes(searchQuery)
    );
  }

  return results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

/**
 * List favorite clothes specifically formatted for FavoriteClothesScreen
 */
async function listFavoriteClothes(uid) {
  const allFavorites = await listFavorites(uid, { type: 'clothing' });
  return allFavorites.map((fav) => ({
    id: fav.targetId,
    favoriteId: fav.id,
    targetId: fav.targetId,
    name: fav.name,
    imageUrl: fav.imageUrl,
    image: fav.imageUrl,
    category: fav.category,
    color: fav.color,
    style: fav.style,
    fit: fav.fit,
    season: fav.season,
    brand: fav.brand,
    wornCount: fav.wornCount,
    purchasePrice: fav.purchasePrice,
    createdAt: fav.createdAt,
    confidence: fav.confidence,
    isLocalImage: false,
    canCreateOutfitsCount: fav.canCreateOutfitsCount,
    isFavorite: true,
  }));
}

/**
 * List favorite aesthetics specifically formatted for FavoriteAestheticView
 */
async function listFavoriteAesthetics(uid) {
  const allFavorites = await listFavorites(uid, { type: 'aesthetic' });
  return allFavorites.map((fav) => ({
    id: fav.id,
    targetId: fav.targetId,
    style: fav.style || fav.name,
    title: fav.style || fav.name,
    tagline: fav.tagline || '',
    vibes: fav.vibes || [],
    aestheticVibes: fav.vibes || [],
    goals: fav.goals || [],
    stylingGoals: fav.goals || [],
    badge: fav.badge || '',
    desc: fav.desc || '',
    isFavorite: true,
    createdAt: fav.createdAt,
  }));
}

/**
 * Add an item to user favorites and sync isFavorite with wardrobe if clothing
 */
async function addFavorite(uid, payload = {}) {
  const targetId = payload.targetId || payload.id || payload.itemId || payload.clothId;
  if (!targetId) {
    const err = new Error('targetId or id is required to add a favorite');
    err.code = 'INVALID_FAVORITE_DATA';
    err.statusCode = 400;
    throw err;
  }

  const rawItemData = payload.itemData || payload;
  const targetType = normalizeTargetType(
    payload.targetType || payload.type || payload.itemType,
    targetId,
    rawItemData
  );

  // Check if wardrobe item exists to enrich data and synchronize isFavorite
  let wardrobeItem = await getSubdoc(uid, 'wardrobe', targetId);
  if (!wardrobeItem) {
    try {
      const { SEED_PAYLOADS } = require('../../seed');
      const seedItem = SEED_PAYLOADS.wardrobeItems.find((i) => i.id === targetId);
      if (seedItem) {
        wardrobeItem = { ...seedItem, userId: uid };
      }
    } catch (e) {}
  }

  // Build unified itemData
  const itemData = {
    title:
      rawItemData.title ||
      rawItemData.name ||
      wardrobeItem?.style ||
      wardrobeItem?.name ||
      'Favorite Item',
    name:
      rawItemData.name ||
      rawItemData.title ||
      wardrobeItem?.name ||
      wardrobeItem?.style ||
      'Favorite Item',
    image: rawItemData.image || rawItemData.imageUrl || wardrobeItem?.image || '',
    imageUrl: rawItemData.imageUrl || rawItemData.image || wardrobeItem?.image || '',
    category: rawItemData.category || wardrobeItem?.category || '',
    color: rawItemData.color || wardrobeItem?.color || '',
    style: rawItemData.style || wardrobeItem?.style || '',
    brand: rawItemData.brand || wardrobeItem?.brand || '',
    ...rawItemData,
  };

  const favId =
    payload.id && payload.id.startsWith('fav_')
      ? payload.id
      : `fav_${targetType}_${targetId}`;
  const now = new Date().toISOString();

  const favoriteDoc = {
    id: favId,
    userId: uid,
    targetType,
    targetId,
    itemData,
    isFavorite: true,
    createdAt: now,
    updatedAt: now,
  };

  await setSubdoc(uid, 'favorites', favId, favoriteDoc);

  // Synchronize with wardrobe if this is a clothing/wardrobe item
  if (targetType === 'clothing') {
    try {
      await setSubdoc(uid, 'wardrobe', targetId, { isFavorite: true }, true);
    } catch (e) {}
  }

  return formatFavoriteResponse(favoriteDoc, uid, wardrobeItem);
}

/**
 * Remove an item from user favorites and sync isFavorite with wardrobe
 */
async function removeFavorite(uid, idOrTargetId, targetType = null) {
  if (!idOrTargetId) {
    const err = new Error('id is required to remove favorite');
    err.code = 'INVALID_FAVORITE_DATA';
    err.statusCode = 400;
    throw err;
  }

  // Find the favorite doc in users/{uid}/favorites
  const allFavorites = await getSubcollectionDocs(uid, 'favorites');
  let matchedDoc = allFavorites.find(
    (f) => f.id === idOrTargetId || f.targetId === idOrTargetId
  );

  if (!matchedDoc) {
    // Try matching by suffix or common prefixes
    matchedDoc = allFavorites.find(
      (f) =>
        f.id.endsWith(`_${idOrTargetId}`) ||
        f.id === `fav_clothing_${idOrTargetId}` ||
        f.id === `fav_WARDROBE_${idOrTargetId}` ||
        f.id === `fav_aesthetic_${idOrTargetId}` ||
        f.id === `fav_outfit_${idOrTargetId}`
    );
  }

  const docIdToDelete = matchedDoc ? matchedDoc.id : idOrTargetId;
  const resolvedTargetId =
    matchedDoc?.targetId ||
    (idOrTargetId.startsWith('fav_')
      ? idOrTargetId.replace(/^fav_[^_]+_/, '')
      : idOrTargetId);
  const resolvedTargetType = matchedDoc
    ? normalizeTargetType(matchedDoc.targetType, resolvedTargetId)
    : normalizeTargetType(targetType, resolvedTargetId);

  // Delete from favorites subcollection
  await deleteSubdoc(uid, 'favorites', docIdToDelete);
  if (matchedDoc && matchedDoc.id !== idOrTargetId) {
    await deleteSubdoc(uid, 'favorites', idOrTargetId).catch(() => {});
  }

  // Synchronize with wardrobe if clothing
  if (resolvedTargetType === 'clothing' || resolvedTargetId.startsWith('wardrobe_')) {
    try {
      await setSubdoc(uid, 'wardrobe', resolvedTargetId, { isFavorite: false }, true);
    } catch (e) {}
  }

  return {
    id: idOrTargetId,
    favoriteId: docIdToDelete,
    targetId: resolvedTargetId,
    isFavorite: false,
    removed: true,
  };
}

/**
 * Toggle favorite status on or off
 */
async function toggleFavorite(uid, payload = {}) {
  const targetId = payload.targetId || payload.id || payload.itemId || payload.clothId;
  if (!targetId) {
    const err = new Error('targetId or id is required to toggle favorite');
    err.code = 'INVALID_FAVORITE_DATA';
    err.statusCode = 400;
    throw err;
  }

  const targetType = normalizeTargetType(payload.targetType || payload.type, targetId, payload);
  const status = await checkFavorite(uid, targetId, targetType);

  if (status.isFavorite) {
    const removed = await removeFavorite(uid, status.favoriteId || targetId, targetType);
    return {
      ...removed,
      isFavorite: false,
      targetId,
      message: 'Removed from favorites',
    };
  } else {
    const added = await addFavorite(uid, payload);
    return {
      ...added,
      isFavorite: true,
      targetId,
      message: 'Added to favorites',
    };
  }
}

/**
 * Check if a specific targetId is favorited
 */
async function checkFavorite(uid, targetId, targetType = null) {
  if (!targetId) {
    return { isFavorite: false, favoriteId: null, targetId: null };
  }

  const allFavorites = await getSubcollectionDocs(uid, 'favorites');
  const matched = allFavorites.find(
    (f) =>
      f.id === targetId ||
      f.targetId === targetId ||
      f.id.endsWith(`_${targetId}`)
  );

  if (matched) {
    return {
      isFavorite: true,
      favoriteId: matched.id,
      targetId: matched.targetId || targetId,
      targetType: normalizeTargetType(matched.targetType, targetId),
    };
  }

  // Also check wardrobe document isFavorite flag
  const wardrobeItem = await getSubdoc(uid, 'wardrobe', targetId);
  if (wardrobeItem && (wardrobeItem.isFavorite === true || wardrobeItem.favorite === true)) {
    return {
      isFavorite: true,
      favoriteId: `fav_clothing_${targetId}`,
      targetId,
      targetType: 'clothing',
    };
  }

  return {
    isFavorite: false,
    favoriteId: null,
    targetId,
    targetType: normalizeTargetType(targetType, targetId),
  };
}

module.exports = {
  normalizeTargetType,
  formatFavoriteResponse,
  listFavorites,
  listFavoriteClothes,
  listFavoriteAesthetics,
  addFavorite,
  removeFavorite,
  toggleFavorite,
  checkFavorite,
};
