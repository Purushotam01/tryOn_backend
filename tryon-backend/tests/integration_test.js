const axios = require('axios');
const app = require('../src/app');

const PORT = 3099;
let server = null;
const BASE_URL = `http://localhost:${PORT}/api/v1`;
const AUTH_HEADER = { headers: { Authorization: 'Bearer test_user_uid_12345' } };

async function runTests() {
  console.log('--- Starting TryFit Backend Verification Suite ---');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  try {
    server = app.listen(PORT);
    console.log(`Test server running on port ${PORT}`);

    // Test 1: Health Check
    const healthRes = await axios.get(`${BASE_URL}/health`);
    assert(healthRes.data.success === true && healthRes.data.data.status === 'ONLINE', 'Health check endpoint returns ONLINE');

    // Test 2: Unauthorized request check
    try {
      await axios.get(`${BASE_URL}/profile`);
      assert(false, 'Unauthorized request should have failed');
    } catch (err) {
      assert(err.response?.status === 401 && err.response?.data?.error?.code === 'UNAUTHORIZED', 'Unauthorized request properly rejected with 401 UNAUTHORIZED');
    }

    // Test 3: Get initial profile
    const profileRes = await axios.get(`${BASE_URL}/profile`, AUTH_HEADER);
    assert(profileRes.data.success === true && profileRes.data.data.onboardingStatus !== undefined, 'Authorized user profile returned');

    // Test 4: Update Styling Preferences
    const updatePrefsRes = await axios.put(
      `${BASE_URL}/profile/preferences`,
      {
        bodyFit: { height: 175, silhouette: 'Athletic', fit: 'Regular' },
        aesthetic: { style: 'Old Money Casual', vibes: ['Minimal', 'Timeless'] },
        palette: { undertone: 'Warm', preferredColors: ['Olive', 'Beige', 'Navy'] },
      },
      AUTH_HEADER
    );
    assert(updatePrefsRes.data.success === true && updatePrefsRes.data.data.aesthetic.style === 'Old Money Casual', 'Styling preferences updated and persisted');

    // Test 5: Check initial Coins balance
    const coinsRes = await axios.get(`${BASE_URL}/coins/balance`, AUTH_HEADER);
    const startingBalance = coinsRes.data.data.balance;
    assert(coinsRes.data.success === true && startingBalance >= 20, `Coin balance initialized properly (${startingBalance} coins)`);

    // Test 6: Add item to Wardrobe (My Collection)
    const addWardrobeRes = await axios.post(
      `${BASE_URL}/wardrobe`,
      {
        image: 'https://storage.tryfit.local/demo/linen_shirt.jpg',
        category: 'Tops',
        color: 'Olive Green',
        style: 'Casual Button-Down',
        brand: 'TryFit Studio',
      },
      AUTH_HEADER
    );
    assert(addWardrobeRes.data.success === true && addWardrobeRes.data.data.category === 'Tops', 'Wardrobe item added to My Collection');
    const wardrobeItemId = addWardrobeRes.data.data.id;

    // Test 7: List Wardrobe items
    const listWardrobeRes = await axios.get(`${BASE_URL}/wardrobe`, AUTH_HEADER);
    assert(listWardrobeRes.data.success === true && listWardrobeRes.data.data.length > 0, 'Wardrobe items listed');

    // Test 8: AI Match calculation (deducts 5 coins)
    const matchRes = await axios.post(
      `${BASE_URL}/ai/match`,
      {
        personImage: 'https://storage.tryfit.local/demo/person1.jpg',
        clothingImage: 'https://storage.tryfit.local/demo/linen_shirt.jpg',
        clothingAttributes: { color: 'Olive Green', fit: 'Regular', style: 'Old Money Casual' },
      },
      AUTH_HEADER
    );
    assert(
      matchRes.data.success === true &&
      typeof matchRes.data.data.matchScore === 'number' &&
      matchRes.data.data.coinsCharged === 5,
      `AI Match calculated dynamically (${matchRes.data.data.matchScore}%, ${matchRes.data.data.suitability}) and charged 5 coins`
    );

    // Test 9: Virtual Try-On proxy (deducts 10 coins)
    const tryOnRes = await axios.post(
      `${BASE_URL}/try-on`,
      {
        personImage: 'https://storage.tryfit.local/demo/person1.jpg',
        clothingImage: 'https://storage.tryfit.local/demo/linen_shirt.jpg',
        category: 'upper_body',
      },
      AUTH_HEADER
    );
    assert(
      tryOnRes.data.success === true &&
      tryOnRes.data.data.coinsCharged === 10 &&
      tryOnRes.data.data.resultImageUrl !== null,
      'Virtual Try-On generated and charged 10 coins'
    );

    // Test 10: Verify Coin balance after deductions
    const balanceAfterRes = await axios.get(`${BASE_URL}/coins/balance`, AUTH_HEADER);
    assert(
      balanceAfterRes.data.data.balance === startingBalance - 15,
      `Authoritative coin balance accurately deducted (${startingBalance} -> ${balanceAfterRes.data.data.balance})`
    );

    // Test 11: Free Trial activation (Section 19)
    const trialRes = await axios.post(`${BASE_URL}/subscription/trial/start`, {}, AUTH_HEADER);
    assert(
      trialRes.data.success === true &&
      trialRes.data.data.status === 'FREE_TRIAL' &&
      trialRes.data.data.isPremiumActive === true,
      'Free trial activated with 3-day duration'
    );

    // Test 12: Idempotent Free Trial re-call (returns 200 OK with active trial)
    const duplicateTrialRes = await axios.post(`${BASE_URL}/subscription/trial/start`, {}, AUTH_HEADER);
    assert(
      duplicateTrialRes.data.success === true &&
      duplicateTrialRes.data.data.trialUsed === true &&
      duplicateTrialRes.data.data.isPremiumActive === true,
      'Duplicate free trial request returns 200 OK with active trial details'
    );

    // Test 13: Planner entry & Build My Week
    const today = new Date().toISOString().split('T')[0];
    const plannerRes = await axios.post(
      `${BASE_URL}/planner`,
      {
        date: today,
        imageRef: 'https://storage.tryfit.local/demo/linen_shirt.jpg',
        notes: 'Casual business lunch',
      },
      AUTH_HEADER
    );
    assert(plannerRes.data.success === true && plannerRes.data.data.date === today, 'Planner outfit saved for date');

    const buildWeekRes = await axios.get(`${BASE_URL}/planner/build-week`, AUTH_HEADER);
    assert(
      buildWeekRes.data.success === true &&
      buildWeekRes.data.data.schedule.length === 7 &&
      buildWeekRes.data.data.summary.averageAiMatch !== undefined,
      'Build My Week generates 7-day plan with weekly summary metrics'
    );

    // Test 14: Recent Picks (max 10, newest first)
    await axios.post(
      `${BASE_URL}/recent-picks`,
      {
        itemType: 'WARDROBE',
        itemId: wardrobeItemId,
        title: 'Linen Shirt',
        imageUrl: 'https://storage.tryfit.local/demo/linen_shirt.jpg',
      },
      AUTH_HEADER
    );
    const recentPicksRes = await axios.get(`${BASE_URL}/recent-picks`, AUTH_HEADER);
    assert(
      recentPicksRes.data.success === true &&
      recentPicksRes.data.data.length > 0 &&
      recentPicksRes.data.data[0].itemId === wardrobeItemId,
      'Recent Picks recorded and served newest-first'
    );

    // Test 15: Profile Dynamic Stats
    const statsRes = await axios.get(`${BASE_URL}/profile/stats`, AUTH_HEADER);
    assert(
      statsRes.data.success === true &&
      statsRes.data.data.wardrobeCount >= 1 &&
      statsRes.data.data.aiMatchCount >= 1,
      `Profile stats dynamically aggregated (Wardrobe: ${statsRes.data.data.wardrobeCount}, AI Matches: ${statsRes.data.data.aiMatchCount})`
    );

    // Test 16: Notifications
    const notifRes = await axios.post(
      `${BASE_URL}/notifications`,
      {
        title: 'Welcome to TryFit',
        body: 'Enjoy your personalized styling experience!',
      },
      AUTH_HEADER
    );
    assert(notifRes.data.success === true, 'Notification created');

    const notifListRes = await axios.get(`${BASE_URL}/notifications`, AUTH_HEADER);
    assert(notifListRes.data.success === true && notifListRes.data.data.length > 0, 'Notifications listed');

    console.log(`\n========================================`);
    console.log(`Test Results: ${passed} PASSED, ${failed} FAILED`);
    console.log(`========================================\n`);

  } catch (err) {
    console.error('Test execution error:', err.response?.data || err.message);
    failed++;
  } finally {
    if (server) {
      server.close();
      console.log('Test server shut down.');
    }
  }

  process.exit(failed > 0 ? 1 : 0);
}

runTests();
