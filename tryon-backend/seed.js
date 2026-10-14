require('dotenv').config();
const { v4: uuidv4 } = require('uuid');
const { setSubdoc, setUserDoc } = require('./src/services/firebase.service');
const { VALID_CATEGORIES } = require('./src/services/wardrobe.service');

/**
 * =========================================================================
 * TryFit Reference Payloads & Database Seeder (seed.js)
 * =========================================================================
 * This script exports structured reference payloads for testing and
 * seeds a comprehensive test user profile with real-world data across:
 * - Profile & Styling Preferences
 * - Wardrobe (My Collection with all valid categories)
 * - Coins Account & Ledger Transactions
 * - AI Styled Looks & Recent Picks
 * - Planner & Weekly Calendar
 * - Favorites & Notifications
 * - Subscription & Free Trial State
 */

const SEED_USER_UID = process.env.SEED_USER_UID || 'test_user_uid_12345';

const SEED_PAYLOADS = {
  profile: {
    name: 'Sophia Reynolds',
    email: 'sophia.reynolds@tryfit.app',
    phone: '+1 (555) 789-0123',
    profileImage: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80',
    avatar: 'avatar_sophia_01',
    onboardingStatus: 'COMPLETED',
  },

  preferences: {
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
      undertone: 'Warm',
      preferredColors: ['Camel', 'Olive Green', 'Cream', 'Navy Blue', 'Burgundy', 'Espresso'],
      preferredFabrics: ['Cashmere', 'Mulberry Silk', 'Pure Linen', 'Merino Wool'],
    },
  },

  wardrobeItems: [
    {
      id: 'wardrobe_top_01',
      category: 'Tops',
      color: 'Cream',
      style: 'Silk Button-Down Shirt',
      brand: 'Equipment',
      image: 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 'wardrobe_top_02',
      category: 'Tops',
      color: 'Camel',
      style: 'Chunky Cashmere Crewneck Sweater',
      brand: 'Everlane',
      image: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 'wardrobe_bottom_01',
      category: 'Bottoms',
      color: 'Navy Blue',
      style: 'High-Waisted Pleated Wool Trousers',
      brand: 'Cos',
      image: 'https://images.unsplash.com/photo-1509551388413-e18d0ac5d495?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 'wardrobe_bottom_02',
      category: 'Bottoms',
      color: 'Olive Green',
      style: 'Straight-Leg Tailored Linen Chinos',
      brand: 'Arket',
      image: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 'wardrobe_dress_01',
      category: 'Dresses',
      color: 'Burgundy',
      style: 'Ribbed Knit Midi Column Dress',
      brand: 'Reformation',
      image: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 'wardrobe_outerwear_01',
      category: 'Outerwear',
      color: 'Beige Honey',
      style: 'Classic Double-Breasted Trench Coat',
      brand: 'Burberry',
      image: 'https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 'wardrobe_shoes_01',
      category: 'Shoes',
      color: 'Espresso Brown',
      style: 'Polished Leather Penny Loafers',
      brand: 'G.H. Bass',
      image: 'https://images.unsplash.com/photo-1533867617858-e7b97e060509?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 'wardrobe_acc_01',
      category: 'Accessories',
      color: 'Cognac',
      style: 'Textured Leather Shoulder Tote',
      brand: 'Polène Paris',
      image: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=600&q=80',
    },
  ],

  aiStyledLooks: [
    {
      id: 'look_autumn_capsule_01',
      title: 'Milanese Autumn Afternoon',
      imageUrl: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=600&q=80',
      sourceRecommendation: 'rec_top_01_bottom_01',
      tags: ['Autumn', 'Monochrome', 'Quiet Luxury', 'Tailored'],
    },
    {
      id: 'look_executive_chic_02',
      title: 'Modern Executive Silhouette',
      imageUrl: 'https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?auto=format&fit=crop&w=600&q=80',
      sourceRecommendation: 'rec_outerwear_dress',
      tags: ['Workwear', 'Effortless', 'Statement'],
    },
  ],

  plannerEntries: (() => {
    const today = new Date();
    const dates = [];
    for (let i = 0; i < 4; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      dates.push(d.toISOString().split('T')[0]);
    }
    return [
      {
        id: `plan_${dates[0]}_01`,
        date: dates[0],
        imageRef: 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?auto=format&fit=crop&w=600&q=80',
        outfitRef: 'wardrobe_top_01',
        notes: 'Client presentation & casual team dinner',
      },
      {
        id: `plan_${dates[1]}_02`,
        date: dates[1],
        imageRef: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?auto=format&fit=crop&w=600&q=80',
        outfitRef: 'wardrobe_top_02',
        notes: 'Work from cafe & evening gallery opening',
      },
      {
        id: `plan_${dates[2]}_03`,
        date: dates[2],
        imageRef: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=600&q=80',
        outfitRef: 'wardrobe_dress_01',
        notes: 'Weekend brunch & stroll in Mayfair',
      },
      {
        id: `plan_${dates[3]}_04`,
        date: dates[3],
        imageRef: 'https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&w=600&q=80',
        outfitRef: 'wardrobe_outerwear_01',
        notes: 'Travel day & airport chic styling',
      },
    ];
  })(),

  recentPicks: [
    {
      id: 'pick_wardrobe_bottom_01',
      itemType: 'WARDROBE',
      itemId: 'wardrobe_bottom_01',
      title: 'High-Waisted Pleated Wool Trousers',
      imageUrl: 'https://images.unsplash.com/photo-1509551388413-e18d0ac5d495?auto=format&fit=crop&w=600&q=80',
      metadata: { brand: 'Cos', category: 'Bottoms', color: 'Navy Blue' },
    },
    {
      id: 'pick_wardrobe_top_01',
      itemType: 'WARDROBE',
      itemId: 'wardrobe_top_01',
      title: 'Silk Button-Down Shirt',
      imageUrl: 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?auto=format&fit=crop&w=600&q=80',
      metadata: { brand: 'Equipment', category: 'Tops', color: 'Cream' },
    },
    {
      id: 'pick_look_autumn_01',
      itemType: 'AI_STYLED_LOOK',
      itemId: 'look_autumn_capsule_01',
      title: 'Milanese Autumn Afternoon',
      imageUrl: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=600&q=80',
      metadata: { matchScore: 95, style: 'Quiet Luxury' },
    },
  ],

  favorites: [
    {
      id: 'fav_WARDROBE_wardrobe_dress_01',
      targetType: 'WARDROBE',
      targetId: 'wardrobe_dress_01',
      itemData: {
        title: 'Ribbed Knit Midi Column Dress',
        brand: 'Reformation',
        image: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=600&q=80',
      },
    },
    {
      id: 'fav_LOOK_look_autumn_capsule_01',
      targetType: 'AI_STYLED_LOOK',
      targetId: 'look_autumn_capsule_01',
      itemData: {
        title: 'Milanese Autumn Afternoon',
        image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=600&q=80',
      },
    },
  ],

  coins: {
    balance: 185,
    transactions: [
      {
        id: 'txn_welcome_001',
        type: 'CREDIT',
        amount: 20,
        purpose: 'WELCOME_BONUS',
        status: 'COMPLETED',
        createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
      },
      {
        id: 'txn_pkg_purchase_002',
        type: 'CREDIT',
        amount: 550,
        packageId: 'pkg_coins_500',
        purpose: 'COIN_PURCHASE',
        status: 'COMPLETED',
        createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
      },
      {
        id: 'txn_tryon_debit_003',
        type: 'DEBIT',
        amount: 10,
        purpose: 'VIRTUAL_TRY_ON',
        status: 'COMPLETED',
        createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
      },
      {
        id: 'txn_aimatch_debit_004',
        type: 'DEBIT',
        amount: 5,
        purpose: 'AI_MATCH',
        status: 'COMPLETED',
        createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
      },
    ],
  },

  subscription: {
    status: 'UNKNOWN',
    plan: null,
    trialUsed: false,
    isPremiumActive: false,
    startedAt: null,
    expiresAt: null,
  },

  notifications: [
    {
      id: 'notif_welcome_01',
      title: 'Welcome to TryFit Studio! ✨',
      body: 'Your personalized AI fashion assistant is ready. Upload wardrobe pieces to unlock style plans.',
      type: 'ONBOARDING',
      isRead: true,
      createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    },
    {
      id: 'notif_trial_02',
      title: '3-Day Pro Trial Active 🌟',
      body: 'Enjoy high-definition Virtual Try-On and unlimited AI Match scores until your trial ends.',
      type: 'SUBSCRIPTION',
      isRead: false,
      createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
    },
    {
      id: 'notif_week_03',
      title: 'Your Week Schedule Is Ready 📅',
      body: 'New combinations generated for your upcoming week with an average 92% match score.',
      type: 'PLANNER',
      isRead: false,
      createdAt: new Date().toISOString(),
    },
  ],

  aiMatchSampleRequest: {
    personImage: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80',
    clothingImage: 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?auto=format&fit=crop&w=600&q=80',
    clothingAttributes: {
      category: 'Tops',
      color: 'Cream',
      fit: 'Fitted',
      style: 'Old Money Minimalist',
    },
  },

  tryOnSampleRequest: {
    personImage: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80',
    clothingImage: 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?auto=format&fit=crop&w=600&q=80',
    category: 'upper_body',
  },
};

/**
 * Executes database seeding for the target user UID
 */
async function seedDatabase(targetUid = SEED_USER_UID) {
  console.log(`\n======================================================`);
  console.log(`🚀 Seeding TryFit Database for User: [${targetUid}]`);
  console.log(`======================================================`);

  const now = new Date().toISOString();

  // 1. Root user doc & profile
  await setUserDoc(targetUid, {
    id: targetUid,
    email: SEED_PAYLOADS.profile.email,
    phone: SEED_PAYLOADS.profile.phone,
    onboardingStatus: SEED_PAYLOADS.profile.onboardingStatus,
    createdAt: now,
  });
  await setSubdoc(targetUid, 'profile', 'info', {
    ...SEED_PAYLOADS.profile,
    createdAt: now,
    updatedAt: now,
  });
  console.log('✅ Seeded User Profile & Root Document');

  // 2. Preferences
  await setSubdoc(targetUid, 'preferences', 'styling', {
    ...SEED_PAYLOADS.preferences,
    createdAt: now,
    updatedAt: now,
  });
  console.log('✅ Seeded Styling Preferences (BodyFit, Aesthetic, Palette)');

  // 3. Wardrobe Items (All Categories)
  for (const item of SEED_PAYLOADS.wardrobeItems) {
    await setSubdoc(targetUid, 'wardrobe', item.id, {
      ...item,
      userId: targetUid,
      createdAt: now,
      updatedAt: now,
    });
  }
  console.log(`✅ Seeded ${SEED_PAYLOADS.wardrobeItems.length} Wardrobe Items across categories: Tops, Bottoms, Dresses, Outerwear, Shoes, Accessories`);

  // 4. AI Styled Looks
  for (const look of SEED_PAYLOADS.aiStyledLooks) {
    await setSubdoc(targetUid, 'aiStyledLooks', look.id, {
      ...look,
      userId: targetUid,
      createdAt: now,
      updatedAt: now,
    });
  }
  console.log(`✅ Seeded ${SEED_PAYLOADS.aiStyledLooks.length} Saved AI Styled Looks`);

  // 5. Planner Calendar Looks
  for (const entry of SEED_PAYLOADS.plannerEntries) {
    await setSubdoc(targetUid, 'planner', entry.id, {
      ...entry,
      userId: targetUid,
      createdAt: now,
      updatedAt: now,
    });
  }
  console.log(`✅ Seeded ${SEED_PAYLOADS.plannerEntries.length} Planner Entries (Upcoming 4 days)`);

  // 6. Recent Picks
  for (const pick of SEED_PAYLOADS.recentPicks) {
    await setSubdoc(targetUid, 'recentPicks', pick.id, {
      ...pick,
      updatedAt: now,
    });
  }
  console.log(`✅ Seeded ${SEED_PAYLOADS.recentPicks.length} Recent Picks (Duplicate-safe LRU history)`);

  // 7. Favorites
  for (const fav of SEED_PAYLOADS.favorites) {
    await setSubdoc(targetUid, 'favorites', fav.id, {
      ...fav,
      userId: targetUid,
      createdAt: now,
    });
  }
  console.log(`✅ Seeded ${SEED_PAYLOADS.favorites.length} User Favorites`);

  // 8. Coins & Transactions Ledger
  await setSubdoc(targetUid, 'coins', 'account', {
    balance: SEED_PAYLOADS.coins.balance,
    updatedAt: now,
  });
  for (const txn of SEED_PAYLOADS.coins.transactions) {
    await setSubdoc(targetUid, 'coinTransactions', txn.id, txn);
  }
  console.log(`✅ Seeded Coin Account (${SEED_PAYLOADS.coins.balance} Coins) & ${SEED_PAYLOADS.coins.transactions.length} Ledger Transactions`);

  // 9. Subscription & Free Trial
  await setSubdoc(targetUid, 'subscription', 'details', {
    ...SEED_PAYLOADS.subscription,
    updatedAt: now,
  });
  console.log('✅ Seeded Subscription State (Active 3-Day Free Trial)');

  // 10. Notifications
  for (const notif of SEED_PAYLOADS.notifications) {
    await setSubdoc(targetUid, 'notifications', notif.id, {
      ...notif,
      userId: targetUid,
    });
  }
  console.log(`✅ Seeded ${SEED_PAYLOADS.notifications.length} User Notifications`);

  console.log(`\n🎉 Seeding Complete! User [${targetUid}] is ready for Postman testing.`);
  console.log(`------------------------------------------------------\n`);
}

if (require.main === module) {
  const customUid = process.argv[2] || SEED_USER_UID;
  seedDatabase(customUid)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Seeding failed:', err);
      process.exit(1);
    });
}

module.exports = {
  SEED_USER_UID,
  SEED_PAYLOADS,
  seedDatabase,
};
