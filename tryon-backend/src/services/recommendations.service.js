const { listWardrobe } = require('./wardrobe.service');
const { getPreferences } = require('./profile.service');

/**
 * For You Recommendations Service (Section 8)
 * Dynamically synthesizes personalized outfit recommendations from user styling preferences and wardrobe collection.
 */

async function getForYouRecommendations(uid) {
  const [wardrobe, preferences] = await Promise.all([
    listWardrobe(uid),
    getPreferences(uid),
  ]);

  const aesthetic = preferences?.aesthetic?.style || 'Smart Casual';
  const colors = preferences?.palette?.preferredColors || ['Neutral', 'Navy'];

  // Categorize available items
  const tops = wardrobe.filter((i) => i.category === 'Tops');
  const bottoms = wardrobe.filter((i) => i.category === 'Bottoms');
  const dresses = wardrobe.filter((i) => i.category === 'Dresses');
  const outerwear = wardrobe.filter((i) => i.category === 'Outerwear');
  const shoes = wardrobe.filter((i) => i.category === 'Shoes');
  const accessories = wardrobe.filter((i) => i.category === 'Accessories');

  const recommendations = [];

  // Outfit 1: Top + Bottom combo
  if (tops.length > 0 && bottoms.length > 0) {
    const top = tops[0];
    const bottom = bottoms[0];
    recommendations.push({
      id: `rec_${top.id}_${bottom.id}`,
      title: `${aesthetic} Daily Look`,
      description: `A harmonious balance of ${top.color || 'stylish'} top and ${bottom.color || 'complementary'} bottom.`,
      style: aesthetic,
      matchScore: 92,
      items: [top, bottom],
      shoes: shoes[0] || null,
      outerwear: outerwear[0] || null,
      tags: ['Daily', 'Versatile', aesthetic],
    });
  }

  // Outfit 2: Dress combo if available
  if (dresses.length > 0) {
    const dress = dresses[0];
    recommendations.push({
      id: `rec_${dress.id}`,
      title: `Chic ${dress.color || 'Statement'} Silhouette`,
      description: `Elevated one-piece ensemble tailored for your ${preferences?.bodyFit?.silhouette || 'proportions'}.`,
      style: 'Effortless Elegance',
      matchScore: 95,
      items: [dress],
      accessories: accessories[0] || null,
      shoes: shoes[0] || null,
      tags: ['Chic', 'Evening', 'Effortless'],
    });
  }

  // Fallback curated recommendation if wardrobe is still growing
  if (recommendations.length === 0) {
    recommendations.push({
      id: 'rec_curated_starter',
      title: 'Monochrome Minimalist Essential',
      description: `Tailored for ${preferences?.palette?.undertone || 'Natural'} undertones, blending neutral elegance with timeless comfort.`,
      style: aesthetic,
      matchScore: 89,
      items: wardrobe.slice(0, 2),
      tags: ['Starter Look', 'Curated', 'Trend'],
    });
  }

  return {
    aesthetic,
    recommendedCount: recommendations.length,
    recommendations,
  };
}

module.exports = {
  getForYouRecommendations,
};
