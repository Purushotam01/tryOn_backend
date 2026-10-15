const { listWardrobe } = require('./wardrobe.service');
const { getPreferences } = require('./profile.service');

/**
 * For You Recommendations Service (Section 8 & UI For You Discovery)
 * Synthesizes personalized outfit recommendations based on user styling preferences,
 * wardrobe collection, and curated fashion categories.
 */

const CURATED_CATEGORIES = [
  {
    id: 'casual',
    title: 'Casual',
    subtitle: 'Effortless Daily Wear',
    image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=600&q=80',
    imagePath: 'assets/for_you/casual.png',
    lookCount: 4,
  },
  {
    id: 'party',
    title: 'Party',
    subtitle: 'Evening Glamour & Nightlife',
    image: 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?auto=format&fit=crop&w=600&q=80',
    imagePath: 'assets/for_you/party.png',
    lookCount: 4,
  },
  {
    id: 'work',
    title: 'Work',
    subtitle: 'Smart Professional Silhouettes',
    image: 'https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?auto=format&fit=crop&w=600&q=80',
    imagePath: 'assets/for_you/work.png',
    lookCount: 4,
  },
  {
    id: 'wedding',
    title: 'Wedding',
    subtitle: 'Ceremonial & Luxury Silhouettes',
    image: 'https://images.unsplash.com/photo-1594552072238-b8a33785b261?auto=format&fit=crop&w=600&q=80',
    imagePath: 'assets/for_you/wedding.png',
    lookCount: 4,
  },
  {
    id: 'office',
    title: 'Office',
    subtitle: 'Crisp Contemporary Tailoring',
    image: 'https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&w=600&q=80',
    imagePath: 'assets/for_you/office.png',
    lookCount: 4,
  },
  {
    id: 'date_night',
    title: 'Date Night',
    subtitle: 'Chic Romantic Ensembles',
    image: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=600&q=80',
    imagePath: 'assets/for_you/date_night.png',
    lookCount: 4,
  },
  {
    id: 'travel',
    title: 'Travel',
    subtitle: 'Resort Vibes & Easy Living',
    image: 'https://images.unsplash.com/photo-1509551388413-e18d0ac5d495?auto=format&fit=crop&w=600&q=80',
    imagePath: 'assets/for_you/travel.png',
    lookCount: 4,
  },
];

const CURATED_LOOKS_BY_CATEGORY = {
  casual: [
    {
      id: 'casual_01',
      name: 'Linen Belted Shirt Dress',
      category: 'Casual',
      imageUrl: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=600&q=80',
      imagePath: 'assets/for_you/casual/casual_01.png',
      description: 'Relaxed linen construction with tonal waist-cinching belt and roll-up sleeves.',
      occasion: 'Brunch, Weekend Stroll',
      matchScore: 94,
      score: '94/100',
      progress: 0.94,
    },
    {
      id: 'casual_02',
      name: 'Denim Tiered Midi Dress',
      category: 'Casual',
      imageUrl: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=600&q=80',
      imagePath: 'assets/for_you/casual/casual_02.png',
      description: 'Classic washed denim dress with soft tiered flared skirt.',
      occasion: 'Day Out, Casual Meetings',
      matchScore: 91,
      score: '91/100',
      progress: 0.91,
    },
    {
      id: 'casual_03',
      name: 'Ribbed Cotton Polo Dress',
      category: 'Casual',
      imageUrl: 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?auto=format&fit=crop&w=600&q=80',
      imagePath: 'assets/for_you/casual/casual_03.png',
      description: 'Sporty silhouette crafted from breathable organic stretch cotton.',
      occasion: 'City Errands, Coffee Runs',
      matchScore: 89,
      score: '89/100',
      progress: 0.89,
    },
    {
      id: 'casual_04',
      name: 'Smocked Gingham Sundress',
      category: 'Casual',
      imageUrl: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?auto=format&fit=crop&w=600&q=80',
      imagePath: 'assets/for_you/casual/casual_04.png',
      description: 'Charming monochrome check print with stretch-smocked bodice.',
      occasion: 'Picnic, Casual Dining',
      matchScore: 92,
      score: '92/100',
      progress: 0.92,
    },
  ],
  party: [
    {
      id: 'party_01',
      name: 'Sequined Cut-Out Mini Dress',
      category: 'Party',
      imageUrl: 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?auto=format&fit=crop&w=600&q=80',
      imagePath: 'assets/for_you/party/party_01.png',
      description: 'High-shine micro sequins with architectural waist cut-outs and open back.',
      occasion: 'Cocktail Party, Nightclub',
      matchScore: 96,
      score: '96/100',
      progress: 0.96,
    },
    {
      id: 'party_02',
      name: 'Satin Cowl-Neck Slip Dress',
      category: 'Party',
      imageUrl: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=600&q=80',
      imagePath: 'assets/for_you/party/party_02.png',
      description: 'Fluid heavyweight silk-satin bias-cut slip with delicate spaghetti straps.',
      occasion: 'Evening Soiree, Lounge',
      matchScore: 95,
      score: '95/100',
      progress: 0.95,
    },
  ],
  work: [
    {
      id: 'work_01',
      name: 'Double-Breasted Pinstripe Suit Dress',
      category: 'Work',
      imageUrl: 'https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?auto=format&fit=crop&w=600&q=80',
      imagePath: 'assets/for_you/work/work_01.png',
      description: 'Sharp tailored pinstripe suiting dress with peak lapels and horn buttons.',
      occasion: 'Client Meetings, Executive Workday',
      matchScore: 95,
      score: '95/100',
      progress: 0.95,
    },
    {
      id: 'work_02',
      name: 'Houndstooth Tweed A-Line Dress',
      category: 'Work',
      imageUrl: 'https://images.unsplash.com/photo-1509551388413-e18d0ac5d495?auto=format&fit=crop&w=600&q=80',
      imagePath: 'assets/for_you/work/work_02.png',
      description: 'Timeless monochrome micro-houndstooth weave with mock patch pockets.',
      occasion: 'Corporate Summit, Interviews',
      matchScore: 93,
      score: '93/100',
      progress: 0.93,
    },
  ],
  office: [
    {
      id: 'office_01',
      name: 'Notched Lapel Sheath Dress',
      category: 'Office',
      imageUrl: 'https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&w=600&q=80',
      imagePath: 'assets/for_you/office/office_01.png',
      description: 'Tailored four-way stretch suiting fabric with sharp collar and concealed zip.',
      occasion: 'Board Meeting, Office Daily',
      matchScore: 94,
      score: '94/100',
      progress: 0.94,
    },
  ],
  date_night: [
    {
      id: 'date_night_01',
      name: 'Scarlet Asymmetric Wrap Dress',
      category: 'Date Night',
      imageUrl: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=600&q=80',
      imagePath: 'assets/for_you/date_night/date_night_01.png',
      description: 'Deep ruby red crepe featuring a dramatic tulip hemline and waist tie.',
      occasion: 'Candlelight Dinner, Date Night',
      matchScore: 96,
      score: '96/100',
      progress: 0.96,
    },
  ],
};

/**
 * Dynamically synthesizes personalized outfit recommendations based on user styling preferences and wardrobe collection.
 */
async function getForYouRecommendations(uid, query = {}) {
  const [wardrobe, preferences] = await Promise.all([
    listWardrobe(uid),
    getPreferences(uid),
  ]);

  const aesthetic = preferences?.aesthetic?.style || preferences?.style || 'Minimalist Chic';
  const colors = preferences?.palette?.preferredColors || preferences?.preferredColors || ['Warm Neutrals', 'Monochrome'];
  const silhouette = preferences?.bodyFit?.silhouette || preferences?.silhouette || 'Athletic / V-Taper';
  const undertone = preferences?.palette?.undertone || preferences?.undertone || 'Warm Neutral';

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
    const primaryImg = top.image || top.imageUrl || bottom.image || bottom.imageUrl || '';
    recommendations.push({
      id: `rec_${top.id}_${bottom.id}`,
      title: `${aesthetic} Daily Look`,
      description: `Harmonious pairing of ${top.color || 'neutral'} ${top.category} with tailored ${bottom.color || ''} ${bottom.category}, proportioned for ${silhouette}.`,
      style: aesthetic,
      matchScore: 94,
      score: '94/100',
      progress: 0.94,
      imageUrl: primaryImg,
      image: primaryImg,
      items: [top, bottom],
      pieces: [top, bottom],
      shoes: shoes[0] || null,
      outerwear: outerwear[0] || null,
      occasion: 'Daily Chic & Work',
      tags: ['Daily', 'Versatile', aesthetic],
      createdAt: new Date().toISOString(),
    });
  }

  // Outfit 2: Dress combo if available
  if (dresses.length > 0) {
    const dress = dresses[0];
    const primaryImg = dress.image || dress.imageUrl || '';
    recommendations.push({
      id: `rec_${dress.id}`,
      title: `Curated ${dress.color || 'Statement'} Silhouette`,
      description: `Elevated one-piece ensemble tailored for ${silhouette} proportions in ${undertone} undertones.`,
      style: 'Effortless Elegance',
      matchScore: 96,
      score: '96/100',
      progress: 0.96,
      imageUrl: primaryImg,
      image: primaryImg,
      items: [dress],
      pieces: [dress],
      accessories: accessories[0] || null,
      shoes: shoes[0] || null,
      occasion: 'Date Night & Events',
      tags: ['Chic', 'Evening', 'Effortless'],
      createdAt: new Date().toISOString(),
    });
  }

  // Outfit 3: Layered look with Outerwear
  if (outerwear.length > 0 && (tops.length > 0 || dresses.length > 0)) {
    const coat = outerwear[0];
    const base = tops.length > 1 ? tops[1] : (tops[0] || dresses[0]);
    const bottom = bottoms.length > 0 ? bottoms[0] : null;
    const pieces = [coat, base, ...(bottom ? [bottom] : [])];
    const primaryImg = coat.image || coat.imageUrl || '';
    recommendations.push({
      id: `rec_layer_${coat.id}`,
      title: 'Trans-Seasonal Structured Layering',
      description: `Architectural ${coat.color || ''} outerwear draped over timeless foundation pieces.`,
      style: 'Quiet Luxury',
      matchScore: 92,
      score: '92/100',
      progress: 0.92,
      imageUrl: primaryImg,
      image: primaryImg,
      items: pieces,
      pieces,
      outerwear: coat,
      shoes: shoes.length > 0 ? shoes[0] : null,
      occasion: 'Travel & Urban Walking',
      tags: ['Layered', 'Statement', 'Trans-Seasonal'],
      createdAt: new Date().toISOString(),
    });
  }

  // Fallback curated starter looks if wardrobe is empty or small
  if (recommendations.length < 2) {
    recommendations.push({
      id: 'rec_curated_starter_01',
      title: `${aesthetic} Signature Essential`,
      description: `Tailored for ${undertone} undertones, blending refined monochrome elegance with everyday comfort.`,
      style: aesthetic,
      matchScore: 93,
      score: '93/100',
      progress: 0.93,
      imageUrl: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=600&q=80',
      image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=600&q=80',
      items: wardrobe.slice(0, 2),
      pieces: wardrobe.slice(0, 2),
      occasion: 'Everyday Polished',
      tags: ['Starter Look', 'Curated', aesthetic],
      createdAt: new Date().toISOString(),
    });
  }

  return {
    aesthetic,
    colors,
    recommendedCount: recommendations.length,
    recommendations,
    categories: CURATED_CATEGORIES,
  };
}

/**
 * Returns the 7 curated recommendation categories (Casual, Party, Work, Wedding, Office, Date Night, Travel)
 */
async function getCategories(uid) {
  return CURATED_CATEGORIES;
}

/**
 * Returns the curated collection and looks for a specific category ID
 */
async function getCategoryCollection(uid, categoryId) {
  const normalizedId = (categoryId || '').toLowerCase().trim();
  const category = CURATED_CATEGORIES.find((c) => c.id === normalizedId) || CURATED_CATEGORIES[0];
  const dresses = CURATED_LOOKS_BY_CATEGORY[normalizedId] || CURATED_LOOKS_BY_CATEGORY.casual;

  return {
    id: category.id,
    title: category.title,
    subtitle: category.subtitle,
    image: category.image,
    lookCount: dresses.length,
    dresses,
    looks: dresses,
  };
}

/**
 * Returns today's daily morning outfit recommendation (supporting the Morning Outfit Notification)
 */
async function getDailyRecommendation(uid) {
  const result = await getForYouRecommendations(uid);
  const todayOutfit = result.recommendations[0] || null;

  return {
    date: new Date().toISOString().split('T')[0],
    title: 'Morning Outfit Recommendation',
    aesthetic: result.aesthetic,
    outfit: todayOutfit,
    stylingTip: `Pair your ${todayOutfit?.style || 'look'} with minimal jewelry for an effortless silhouette.`,
    matchScore: todayOutfit?.matchScore || 95,
  };
}

module.exports = {
  CURATED_CATEGORIES,
  CURATED_LOOKS_BY_CATEGORY,
  getForYouRecommendations,
  getCategories,
  getCategoryCollection,
  getDailyRecommendation,
};
