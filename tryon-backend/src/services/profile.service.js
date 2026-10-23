const { getUserDoc, setUserDoc, getSubdoc, setSubdoc, getSubcollectionDocs } = require('./firebase.service');

/**
 * Normalizes and formats the Profile response according to UI expectations.
 * Matches Flutter AuthController, AvatarController, and Personal Information requirements.
 */
function formatProfileResponse(profile = {}, userRoot = {}, uid = '') {
  const name = profile.name || userRoot.name || '';
  const email = profile.email || userRoot.email || '';
  const phone = profile.phone || userRoot.phone || '';
  const profileImage = profile.profileImage || profile.profileImagePath || userRoot.profileImage || '';
  const avatar = profile.avatar || profile.selectedAvatarId || userRoot.avatar || null;
  const onboardingStatus = profile.onboardingStatus || userRoot.onboardingStatus || 'PENDING';
  const onboardingCompleted = onboardingStatus === 'COMPLETED' || profile.onboardingCompleted === true;

  return {
    id: profile.id || 'info',
    uid: uid || profile.uid || userRoot.id || userRoot.uid || '',
    name,
    displayName: name,
    email,
    phone,
    profileImage,
    profileImagePath: profileImage,
    photoUrl: profileImage,
    avatar,
    selectedAvatarId: avatar || 'avatar_01',
    onboardingStatus,
    onboardingCompleted,
    createdAt: profile.createdAt || userRoot.createdAt || new Date().toISOString(),
    updatedAt: profile.updatedAt || new Date().toISOString(),
  };
}

/**
 * Normalizes and formats Styling Preferences according to both:
 * 1. UI Models (Flutter StylingPreferences.fromMap)
 * 2. Backend Requirements & Postman schema (nested bodyFit, aesthetic, palette)
 */
function formatPreferencesResponse(rawPrefs = {}) {
  const bodyFit = rawPrefs.bodyFit || {};
  const aesthetic = rawPrefs.aesthetic || {};
  const palette = rawPrefs.palette || {};

  const height = Number(bodyFit.height || bodyFit.heightCm || rawPrefs.heightCm || rawPrefs.height || 172);
  const silhouette = bodyFit.silhouette || rawPrefs.silhouette || 'Athletic / V-Taper';
  const fit = bodyFit.fit || rawPrefs.fit || 'Regular';
  const proportions = bodyFit.proportions || rawPrefs.proportions || 'Balanced';
  const topFit = bodyFit.topFit || rawPrefs.topFit || 'Regular';
  const bottomFit = bodyFit.bottomFit || rawPrefs.bottomFit || 'Classic Straight';

  const style = aesthetic.style || rawPrefs.style || 'Minimalist Chic';
  const vibes = aesthetic.vibes || aesthetic.aestheticVibes || rawPrefs.aestheticVibes || rawPrefs.vibes || ['Minimalist', 'Modern Chic'];
  const goals = aesthetic.stylingGoals || aesthetic.goals || rawPrefs.stylingGoals || rawPrefs.goals || ['Everyday outfits', 'Work'];
  const seasons = aesthetic.seasons || rawPrefs.seasons || ['Autumn', 'Spring'];

  const paletteName = palette.paletteName || rawPrefs.paletteName || palette.palette || rawPrefs.palette || 'Warm Neutrals';
  const undertone = palette.undertone || rawPrefs.undertone || 'Warm Neutral';
  const colors = palette.preferredColors || palette.colors || rawPrefs.preferredColors || rawPrefs.colors || [
    'Warm Neutrals',
    'Monochrome',
    'Silk White',
    'Charcoal',
  ];
  const fabrics = palette.preferredFabrics || palette.fabrics || rawPrefs.preferredFabrics || rawPrefs.fabrics || ['Silk & Satin'];

  const fitSilhouetteSummary = `${silhouette} • ${fit} • ${height} cm`;
  const aestheticSummary = style;
  const colorPaletteSummary = paletteName;

  return {
    // Nested format (as expected by Backend Requirements §5 and Postman suite)
    bodyFit: {
      height,
      heightCm: height,
      silhouette,
      fit,
      proportions,
      topFit,
      bottomFit,
    },
    aesthetic: {
      style,
      vibes,
      aestheticVibes: vibes,
      stylingGoals: goals,
      goals,
      seasons,
    },
    palette: {
      paletteName,
      undertone,
      preferredColors: colors,
      colors,
      preferredFabrics: fabrics,
      fabrics,
    },
    // Top-level flat format (as directly consumed by Flutter StylingPreferences.fromMap)
    style,
    aestheticVibes: vibes,
    vibes,
    goals,
    stylingGoals: goals,
    paletteName,
    undertone,
    preferredColors: colors,
    colors,
    preferredFabrics: fabrics,
    fabrics,
    fit,
    seasons,
    silhouette,
    heightCm: height,
    height,
    proportions,
    topFit,
    bottomFit,
    // UI Summaries
    fitSilhouetteSummary,
    aestheticSummary,
    colorPaletteSummary,
    // Timestamps
    createdAt: rawPrefs.createdAt || new Date().toISOString(),
    updatedAt: rawPrefs.updatedAt || new Date().toISOString(),
  };
}

/**
 * Fetch User Profile
 */
async function getProfile(uid) {
  let profile = await getSubdoc(uid, 'profile', 'info');
  const userRoot = await getUserDoc(uid);

  if (!profile) {
    const initialProfile = {
      name: userRoot?.name || '',
      email: userRoot?.email || '',
      phone: userRoot?.phone || '',
      profileImage: userRoot?.profileImage || '',
      avatar: userRoot?.avatar || null,
      onboardingStatus: userRoot?.onboardingStatus || 'PENDING',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    profile = await setSubdoc(uid, 'profile', 'info', initialProfile);
  }

  return formatProfileResponse(profile, userRoot, uid);
}

/**
 * Update User Profile
 */
async function updateProfile(uid, updateData = {}) {
  if (!updateData || typeof updateData !== 'object') {
    const err = new Error('Invalid update data provided');
    err.code = 'INVALID_INPUT';
    err.statusCode = 400;
    throw err;
  }

  const existingProfile = (await getSubdoc(uid, 'profile', 'info')) || {};
  const userRoot = (await getUserDoc(uid)) || {};

  const sanitized = {};

  // Name / Display Name
  if (updateData.name !== undefined) sanitized.name = String(updateData.name).trim();
  else if (updateData.displayName !== undefined) sanitized.name = String(updateData.displayName).trim();

  // Email
  if (updateData.email !== undefined) sanitized.email = String(updateData.email).trim().toLowerCase();

  // Phone
  if (updateData.phone !== undefined) sanitized.phone = String(updateData.phone).trim();
  else if (updateData.phoneNumber !== undefined) sanitized.phone = String(updateData.phoneNumber).trim();

  // Profile Image / Path / URL
  if (updateData.profileImage !== undefined) sanitized.profileImage = updateData.profileImage;
  else if (updateData.profileImagePath !== undefined) sanitized.profileImage = updateData.profileImagePath;
  else if (updateData.photoUrl !== undefined) sanitized.profileImage = updateData.photoUrl;

  // Avatar / Selected Avatar ID
  if (updateData.avatar !== undefined) sanitized.avatar = updateData.avatar;
  else if (updateData.selectedAvatarId !== undefined) sanitized.avatar = updateData.selectedAvatarId;
  else if (updateData.avatarId !== undefined) sanitized.avatar = updateData.avatarId;

  // Onboarding Status / Completed
  if (updateData.onboardingStatus !== undefined) {
    sanitized.onboardingStatus = updateData.onboardingStatus;
  } else if (updateData.onboardingCompleted !== undefined) {
    sanitized.onboardingStatus = updateData.onboardingCompleted ? 'COMPLETED' : 'PENDING';
  }

  // Persist to Firestore subdoc
  const updated = await setSubdoc(uid, 'profile', 'info', sanitized, true);

  // Sync core user fields to userRoot document
  const rootUpdate = {};
  if (sanitized.name !== undefined) rootUpdate.name = sanitized.name;
  if (sanitized.email !== undefined) rootUpdate.email = sanitized.email;
  if (sanitized.phone !== undefined) rootUpdate.phone = sanitized.phone;
  if (sanitized.profileImage !== undefined) rootUpdate.profileImage = sanitized.profileImage;
  if (sanitized.avatar !== undefined) rootUpdate.avatar = sanitized.avatar;
  if (sanitized.onboardingStatus !== undefined) rootUpdate.onboardingStatus = sanitized.onboardingStatus;

  if (Object.keys(rootUpdate).length > 0) {
    await setUserDoc(uid, rootUpdate, true);
  }

  const merged = { ...existingProfile, ...updated };
  return formatProfileResponse(merged, { ...userRoot, ...rootUpdate }, uid);
}

/**
 * Dedicated Avatar Update (matches UI Avatar selection & editing)
 */
async function updateAvatar(uid, avatarId) {
  if (!avatarId || typeof avatarId !== 'string' || avatarId.trim().length === 0) {
    const err = new Error('Avatar identifier is required');
    err.code = 'INVALID_AVATAR';
    err.statusCode = 400;
    throw err;
  }

  return await updateProfile(uid, { avatar: avatarId.trim() });
}

/**
 * Dedicated Personal Information Update (matches UI Edit Profile dialog)
 */
async function updatePersonalInfo(uid, { name, email, phone }) {
  if (name !== undefined && String(name).trim().length === 0) {
    const err = new Error('Name cannot be empty');
    err.code = 'VALIDATION_ERROR';
    err.statusCode = 400;
    throw err;
  }

  const payload = {};
  if (name !== undefined) payload.name = String(name).trim();
  if (email !== undefined) payload.email = String(email).trim().toLowerCase();
  if (phone !== undefined) payload.phone = String(phone).trim();

  return await updateProfile(uid, payload);
}

/**
 * Fetch Styling Preferences
 */
async function getPreferences(uid) {
  let prefs = await getSubdoc(uid, 'preferences', 'styling');

  if (!prefs) {
    const defaultPrefs = {
      bodyFit: {
        height: 172,
        silhouette: 'Hourglass',
        fit: 'Tailored',
        proportions: 'Balanced',
        topFit: 'Fitted',
        bottomFit: 'Wide Leg',
      },
      aesthetic: {
        style: 'Old Money Minimalist',
        vibes: ['Timeless', 'Sophisticated', 'Quiet Luxury', 'Effortless'],
        stylingGoals: ['Build a versatile capsule wardrobe', 'Elevate professional daily wear'],
        seasons: ['Autumn', 'Spring'],
      },
      palette: {
        paletteName: 'Warm Neutrals',
        undertone: 'Warm',
        preferredColors: ['Camel', 'Olive Green', 'Cream', 'Navy Blue', 'Burgundy', 'Espresso'],
        preferredFabrics: ['Cashmere', 'Mulberry Silk', 'Pure Linen', 'Merino Wool'],
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    prefs = await setSubdoc(uid, 'preferences', 'styling', defaultPrefs);
  }

  return formatPreferencesResponse(prefs);
}

/**
 * Update Styling Preferences (supports both nested and flat inputs)
 */
async function updatePreferences(uid, preferencesData = {}) {
  if (!preferencesData || typeof preferencesData !== 'object') {
    const err = new Error('Invalid preferences data provided');
    err.code = 'INVALID_INPUT';
    err.statusCode = 400;
    throw err;
  }

  const existing = (await getSubdoc(uid, 'preferences', 'styling')) || {};

  const existingBodyFit = existing.bodyFit || {};
  const existingAesthetic = existing.aesthetic || {};
  const existingPalette = existing.palette || {};

  const inputBodyFit = preferencesData.bodyFit || {};
  const inputAesthetic = preferencesData.aesthetic || {};
  const inputPalette = preferencesData.palette || {};

  const updatedBodyFit = {
    height:
      inputBodyFit.height ??
      inputBodyFit.heightCm ??
      preferencesData.heightCm ??
      preferencesData.height ??
      existingBodyFit.height ??
      existing.heightCm ??
      172,
    silhouette:
      inputBodyFit.silhouette ??
      preferencesData.silhouette ??
      existingBodyFit.silhouette ??
      existing.silhouette ??
      'Hourglass',
    fit:
      inputBodyFit.fit ??
      preferencesData.fit ??
      existingBodyFit.fit ??
      existing.fit ??
      'Tailored',
    proportions:
      inputBodyFit.proportions ??
      preferencesData.proportions ??
      existingBodyFit.proportions ??
      existing.proportions ??
      'Balanced',
    topFit:
      inputBodyFit.topFit ??
      preferencesData.topFit ??
      existingBodyFit.topFit ??
      existing.topFit ??
      'Fitted',
    bottomFit:
      inputBodyFit.bottomFit ??
      preferencesData.bottomFit ??
      existingBodyFit.bottomFit ??
      existing.bottomFit ??
      'Wide Leg',
  };

  const updatedAesthetic = {
    style:
      inputAesthetic.style ??
      preferencesData.style ??
      existingAesthetic.style ??
      existing.style ??
      'Old Money Minimalist',
    vibes:
      inputAesthetic.vibes ??
      inputAesthetic.aestheticVibes ??
      preferencesData.aestheticVibes ??
      preferencesData.vibes ??
      existingAesthetic.vibes ??
      existing.aestheticVibes ??
      ['Timeless', 'Sophisticated'],
    stylingGoals:
      inputAesthetic.stylingGoals ??
      inputAesthetic.goals ??
      preferencesData.stylingGoals ??
      preferencesData.goals ??
      existingAesthetic.stylingGoals ??
      existing.goals ??
      ['Build a versatile capsule wardrobe'],
    seasons:
      inputAesthetic.seasons ??
      preferencesData.seasons ??
      existingAesthetic.seasons ??
      existing.seasons ??
      ['Autumn', 'Spring'],
  };

  const updatedPalette = {
    paletteName:
      inputPalette.paletteName ??
      inputPalette.palette ??
      preferencesData.paletteName ??
      preferencesData.palette ??
      existingPalette.paletteName ??
      existing.paletteName ??
      'Warm Neutrals',
    undertone:
      inputPalette.undertone ??
      preferencesData.undertone ??
      existingPalette.undertone ??
      existing.undertone ??
      'Warm',
    preferredColors:
      inputPalette.preferredColors ??
      inputPalette.colors ??
      preferencesData.preferredColors ??
      preferencesData.colors ??
      existingPalette.preferredColors ??
      existing.preferredColors ??
      ['Camel', 'Olive Green', 'Cream'],
    preferredFabrics:
      inputPalette.preferredFabrics ??
      inputPalette.fabrics ??
      preferencesData.preferredFabrics ??
      preferencesData.fabrics ??
      existingPalette.preferredFabrics ??
      existing.preferredFabrics ??
      ['Cashmere', 'Mulberry Silk'],
  };

  const toSave = {
    bodyFit: updatedBodyFit,
    aesthetic: updatedAesthetic,
    palette: updatedPalette,
    // Flat fields directly accessible by Flutter models
    style: updatedAesthetic.style,
    aestheticVibes: updatedAesthetic.vibes,
    goals: updatedAesthetic.stylingGoals,
    paletteName: updatedPalette.paletteName,
    undertone: updatedPalette.undertone,
    preferredColors: updatedPalette.preferredColors,
    preferredFabrics: updatedPalette.preferredFabrics,
    fit: updatedBodyFit.fit,
    seasons: updatedAesthetic.seasons,
    silhouette: updatedBodyFit.silhouette,
    heightCm: updatedBodyFit.height,
    proportions: updatedBodyFit.proportions,
    topFit: updatedBodyFit.topFit,
    bottomFit: updatedBodyFit.bottomFit,
    createdAt: existing.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await setSubdoc(uid, 'preferences', 'styling', toSave, true);

  return formatPreferencesResponse(toSave);
}

/**
 * Granular: Get Body Fit & Silhouette preferences
 */
async function getBodyFitPreferences(uid) {
  const prefs = await getPreferences(uid);
  return prefs.bodyFit;
}

/**
 * Granular: Update Body Fit & Silhouette preferences
 */
async function updateBodyFitPreferences(uid, bodyFitData = {}) {
  const updated = await updatePreferences(uid, { bodyFit: bodyFitData });
  return updated.bodyFit;
}

/**
 * Granular: Get Aesthetic preferences
 */
async function getAestheticPreferences(uid) {
  const prefs = await getPreferences(uid);
  return prefs.aesthetic;
}

/**
 * Granular: Update Aesthetic preferences
 */
async function updateAestheticPreferences(uid, aestheticData = {}) {
  const updated = await updatePreferences(uid, { aesthetic: aestheticData });
  return updated.aesthetic;
}

/**
 * Granular: Get Palette preferences
 */
async function getPalettePreferences(uid) {
  const prefs = await getPreferences(uid);
  return prefs.palette;
}

/**
 * Granular: Update Palette preferences
 */
async function updatePalettePreferences(uid, paletteData = {}) {
  const updated = await updatePreferences(uid, { palette: paletteData });
  return updated.palette;
}

/**
 * Dynamic Profile Statistics (Wardrobe, Favorite Clothes, AI Match / For You, Saved Looks)
 * Matches UI counters on ProfileScreen:
 * - Wardrobe
 * - Favorite Clothes
 * - For You / AI Match
 */
async function getProfileStats(uid) {
  const [wardrobe, styledLooks, matchHistory, favorites, planner] = await Promise.all([
    getSubcollectionDocs(uid, 'wardrobe'),
    getSubcollectionDocs(uid, 'aiStyledLooks'),
    getSubcollectionDocs(uid, 'aiMatchHistory'),
    getSubcollectionDocs(uid, 'favorites'),
    getSubcollectionDocs(uid, 'planner'),
  ]);

  const wardrobeFavCount = wardrobe.filter(
    (item) => item && (item.isFavorite === true || item.favorite === true)
  ).length;
  const favoritesCount = Math.max(favorites.length, wardrobeFavCount);

  return {
    wardrobeCount: wardrobe.length,
    outfitsCount: styledLooks.length,
    aiMatchCount: matchHistory.length,
    forYouCount: matchHistory.length,
    favoriteCount: favoritesCount,
    favoritesCount,
    favoriteClothesCount: wardrobeFavCount || favoritesCount,
    plannerCount: planner.length,
  };
}

module.exports = {
  getProfile,
  updateProfile,
  updateAvatar,
  updatePersonalInfo,
  getPreferences,
  updatePreferences,
  getBodyFitPreferences,
  updateBodyFitPreferences,
  getAestheticPreferences,
  updateAestheticPreferences,
  getPalettePreferences,
  updatePalettePreferences,
  getProfileStats,
};
