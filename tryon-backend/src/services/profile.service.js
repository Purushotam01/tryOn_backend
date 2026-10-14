const { db } = require('../config/firebase.config');
const { getUserDoc, setUserDoc, getSubdoc, setSubdoc } = require('./firebase.service');

/**
 * User Profile & Styling Preferences Service
 */

async function getProfile(uid) {
  let profile = await getSubdoc(uid, 'profile', 'info');
  let userRoot = await getUserDoc(uid);

  if (!profile) {
    // Initialize default profile if first time
    profile = {
      name: '',
      email: userRoot?.email || '',
      phone: userRoot?.phone || '',
      profileImage: '',
      avatar: null,
      onboardingStatus: 'PENDING',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await setSubdoc(uid, 'profile', 'info', profile);
  }

  return profile;
}

async function updateProfile(uid, updateData) {
  const allowedFields = ['name', 'phone', 'profileImage', 'avatar', 'onboardingStatus'];
  const sanitized = {};

  for (const field of allowedFields) {
    if (updateData[field] !== undefined) {
      sanitized[field] = updateData[field];
    }
  }

  const updated = await setSubdoc(uid, 'profile', 'info', sanitized, true);
  await setUserDoc(uid, { onboardingStatus: sanitized.onboardingStatus || 'COMPLETED' }, true);
  return updated;
}

async function getPreferences(uid) {
  let prefs = await getSubdoc(uid, 'preferences', 'styling');

  if (!prefs) {
    prefs = {
      bodyFit: {
        height: null,
        silhouette: null,
        fit: null,
        proportions: null,
        topFit: null,
        bottomFit: null,
      },
      aesthetic: {
        style: null,
        vibes: [],
        stylingGoals: [],
        seasons: [],
      },
      palette: {
        undertone: null,
        preferredColors: [],
        preferredFabrics: [],
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await setSubdoc(uid, 'preferences', 'styling', prefs);
  }

  return prefs;
}

async function updatePreferences(uid, preferencesData) {
  const updated = await setSubdoc(uid, 'preferences', 'styling', preferencesData, true);
  return updated;
}

async function getProfileStats(uid) {
  // Query actual counts from Firestore subcollections
  const wardrobeSnap = await db.collection('users').doc(uid).collection('wardrobe').get();
  const styledLooksSnap = await db.collection('users').doc(uid).collection('aiStyledLooks').get();
  const matchHistorySnap = await db.collection('users').doc(uid).collection('aiMatchHistory').get();

  return {
    wardrobeCount: wardrobeSnap.size || 0,
    outfitsCount: styledLooksSnap.size || 0,
    aiMatchCount: matchHistorySnap.size || 0,
  };
}

module.exports = {
  getProfile,
  updateProfile,
  getPreferences,
  updatePreferences,
  getProfileStats,
};
