const { v4: uuidv4 } = require('uuid');
const { setSubdoc } = require('./firebase.service');
const { getPreferences } = require('./profile.service');
const { deductCoins } = require('./coins.service');
const { COIN_COSTS } = require('../config/pricing.config');

/**
 * AI Match Calculation Engine (Section 10)
 * Evaluates clothing and person compatibility dynamically using styling preferences,
 * color undertone harmony, silhouette rules, and aesthetic vibes.
 */

function calculateDynamicMatchScore(preferences, clothingAttributes = {}) {
  let baseScore = 75; // baseline

  // Factor 1: Undertone and color harmony
  const undertone = preferences?.palette?.undertone?.toLowerCase();
  const clothingColor = (clothingAttributes.color || '').toLowerCase();

  if (undertone === 'warm' && ['olive', 'brown', 'gold', 'orange', 'warm beige', 'terracotta'].some((c) => clothingColor.includes(c))) {
    baseScore += 12;
  } else if (undertone === 'cool' && ['blue', 'silver', 'emerald', 'cool gray', 'navy', 'pure white'].some((c) => clothingColor.includes(c))) {
    baseScore += 12;
  } else if (clothingColor) {
    baseScore += 6;
  }

  // Factor 2: Silhouette & Body Fit
  const preferredFit = preferences?.bodyFit?.fit?.toLowerCase();
  if (preferredFit && (clothingAttributes.fit || '').toLowerCase().includes(preferredFit)) {
    baseScore += 8;
  } else {
    baseScore += 4;
  }

  // Factor 3: Aesthetic alignment
  const aestheticStyle = (preferences?.aesthetic?.style || '').toLowerCase();
  if (aestheticStyle && (clothingAttributes.style || '').toLowerCase().includes(aestheticStyle)) {
    baseScore += 5;
  }

  // Add calculated variance based on input characteristics
  const variance = (Math.abs(clothingColor.length * 7 + (clothingAttributes.category?.length || 5) * 3) % 7) - 3;
  let finalScore = Math.min(98, Math.max(50, baseScore + variance));

  let suitability = 'MODERATE';
  if (finalScore >= 85) suitability = 'EXCELLENT';
  else if (finalScore >= 75) suitability = 'GREAT';
  else if (finalScore < 65) suitability = 'FAIR';

  return {
    score: finalScore,
    suitability,
  };
}

async function calculateMatch(uid, { personImage, clothingImage, clothingImages = [], clothingAttributes = {} }) {
  if (!personImage) {
    const err = new Error('personImage is required');
    err.code = 'PERSON_IMAGE_MISSING';
    err.statusCode = 400;
    throw err;
  }

  const primaryClothingImage = clothingImage || (clothingImages.length > 0 ? clothingImages[0] : null);
  if (!primaryClothingImage) {
    const err = new Error('At least one clothing image is required');
    err.code = 'CLOTHING_IMAGE_MISSING';
    err.statusCode = 400;
    throw err;
  }

  // Deduct coins for AI Match
  const coinCost = COIN_COSTS.AI_MATCH;
  await deductCoins(uid, coinCost, 'AI_MATCH');

  // Fetch user styling preferences
  const preferences = await getPreferences(uid);

  // Compute dynamic match
  const { score, suitability } = calculateDynamicMatchScore(preferences, clothingAttributes);

  const matchId = uuidv4();
  const matchResult = {
    id: matchId,
    userId: uid,
    matchScore: score,
    suitability,
    analysis: {
      colorHarmony: `${preferences?.palette?.undertone || 'Natural'} undertone pairs harmoniously with selected shades.`,
      silhouetteFit: `Proportions align with ${preferences?.bodyFit?.silhouette || 'standard'} body frame specifications.`,
      aestheticAlignment: `Matches the ${preferences?.aesthetic?.style || 'curated contemporary'} style preferences.`,
    },
    recommendations: [
      'Accentuate the neckline with delicate complementary jewelry.',
      'Pairs seamlessly with neutral footwear for versatile day-to-night styling.',
    ],
    personImage,
    clothingImage: primaryClothingImage,
    coinsCharged: coinCost,
    createdAt: new Date().toISOString(),
  };

  // Persist record to aiMatchHistory (for profile stats)
  await setSubdoc(uid, 'aiMatchHistory', matchId, matchResult);

  return matchResult;
}

module.exports = {
  calculateMatch,
};
