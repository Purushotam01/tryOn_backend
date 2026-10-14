const profileService = require('../services/profile.service');

async function getProfile(req, res, next) {
  try {
    const profile = await profileService.getProfile(req.user.uid);
    return res.success(profile);
  } catch (error) {
    next(error);
  }
}

async function updateProfile(req, res, next) {
  try {
    const updated = await profileService.updateProfile(req.user.uid, req.body);
    return res.success(updated, 'Profile updated successfully');
  } catch (error) {
    next(error);
  }
}

async function getPreferences(req, res, next) {
  try {
    const preferences = await profileService.getPreferences(req.user.uid);
    return res.success(preferences);
  } catch (error) {
    next(error);
  }
}

async function updatePreferences(req, res, next) {
  try {
    const updated = await profileService.updatePreferences(req.user.uid, req.body);
    return res.success(updated, 'Styling preferences updated successfully');
  } catch (error) {
    next(error);
  }
}

async function getProfileStats(req, res, next) {
  try {
    const stats = await profileService.getProfileStats(req.user.uid);
    return res.success(stats);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getProfile,
  updateProfile,
  getPreferences,
  updatePreferences,
  getProfileStats,
};
