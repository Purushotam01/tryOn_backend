const axios = require('axios');
const { SEED_PAYLOADS, SEED_USER_UID } = require('./seed');

/**
 * =========================================================================
 * TryFit API Live Test Runner (run_postman_with_seed.js)
 * =========================================================================
 * Reads payloads from seed.js and executes every API endpoint on the live
 * server (http://localhost:3000/api/v1), simulating Postman test executions.
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000/api/v1';
const AUTH_TOKEN = process.env.AUTH_TOKEN || SEED_USER_UID;

const client = axios.create({
  baseURL: BASE_URL,
  headers: {
    Authorization: `Bearer ${AUTH_TOKEN}`,
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

let testCount = 0;
let passedCount = 0;
let failedCount = 0;

async function runStep(name, requestFn) {
  testCount++;
  const start = Date.now();
  process.stdout.write(`[${testCount.toString().padStart(2, '0')}] ${name.padEnd(52, '.')} `);

  try {
    const response = await requestFn();
    const duration = Date.now() - start;
    const isSuccess = response.data && response.data.success === true;

    if (isSuccess) {
      passedCount++;
      console.log(`✅ [${response.status}] (${duration}ms)`);
      return response.data.data;
    } else {
      failedCount++;
      console.log(`❌ FAIL - Unexpected format:`, response.data);
      return null;
    }
  } catch (error) {
    failedCount++;
    const duration = Date.now() - start;
    const errorMsg = error.response?.data?.message || error.response?.data?.error?.code || error.message;
    console.log(`❌ [${error.response?.status || 'ERR'}] (${duration}ms) - ${errorMsg}`);
    return null;
  }
}

async function executeLivePostmanRun() {
  console.log(`\n======================================================================`);
  console.log(`🚀 RUNNING POSTMAN API TESTS WITH SEED DATA AGAINST LIVE SERVER`);
  console.log(`   Target: [${BASE_URL}] | User: [${AUTH_TOKEN}]`);
  console.log(`======================================================================\n`);

  // 0. System Health Check
  await runStep('GET  /health (Service Status)', () => client.get('/health', { headers: { Authorization: '' } }));

  // 1. Profile & Preferences
  await runStep('PUT  /profile (Set Sophia Reynolds Profile)', () => client.put('/profile', SEED_PAYLOADS.profile));
  const profile = await runStep('GET  /profile (Fetch Profile Details)', () => client.get('/profile'));
  if (profile) console.log(`     ↳ User: "${profile.name}" <${profile.email}> | Status: ${profile.onboardingStatus}`);

  await runStep('PUT  /profile/preferences (Set Styling Preferences)', () => client.put('/profile/preferences', SEED_PAYLOADS.preferences));
  const prefs = await runStep('GET  /profile/preferences (Verify Preferences)', () => client.get('/profile/preferences'));
  if (prefs) console.log(`     ↳ Style: "${prefs.aesthetic?.style}" | Undertone: "${prefs.palette?.undertone}"`);

  // 2. Wardrobe (My Collection)
  console.log(`\n--- Wardrobe Collection Seeding & Verification ---`);
  for (const item of SEED_PAYLOADS.wardrobeItems) {
    await runStep(`POST /wardrobe [${item.category}] "${item.style}"`, () => client.post('/wardrobe', item));
  }

  const allWardrobe = await runStep('GET  /wardrobe (List All My Collection Items)', () => client.get('/wardrobe'));
  if (allWardrobe) console.log(`     ↳ Total items in wardrobe: ${allWardrobe.length}`);

  const topsOnly = await runStep('GET  /wardrobe?category=Tops (Filter Tops)', () => client.get('/wardrobe?category=Tops'));
  if (topsOnly) console.log(`     ↳ Filtered Tops count: ${topsOnly.length}`);

  // 3. AI Styled Looks
  console.log(`\n--- AI Styled Looks ---`);
  for (const look of SEED_PAYLOADS.aiStyledLooks) {
    await runStep(`POST /ai/styled-looks "${look.title}"`, () => client.post('/ai/styled-looks', look));
  }
  const looks = await runStep('GET  /ai/styled-looks (List Saved Looks)', () => client.get('/ai/styled-looks'));
  if (looks) console.log(`     ↳ Saved looks count: ${looks.length}`);

  // 4. Planner & Build My Week
  console.log(`\n--- Planner & Weekly Style Plans ---`);
  for (const plan of SEED_PAYLOADS.plannerEntries) {
    await runStep(`POST /planner [${plan.date}] "${plan.notes}"`, () => client.post('/planner', plan));
  }
  const planner = await runStep('GET  /planner (List Calendar Outfits)', () => client.get('/planner'));
  if (planner) console.log(`     ↳ Planned dates: ${planner.map((p) => p.date).join(', ')}`);

  const weekPlan = await runStep('GET  /planner/build-week (Aggregate 7-Day Week)', () => client.get('/planner/build-week'));
  if (weekPlan) {
    console.log(`     ↳ Summary: Avg AI Match: ${weekPlan.summary?.averageAiMatch} | Best Match: ${weekPlan.summary?.bestAiMatch}`);
    console.log(`     ↳ Schedule days: ${weekPlan.schedule?.length} days planned`);
  }

  // 5. Recent Picks & Favorites
  console.log(`\n--- Recent Picks & User Favorites ---`);
  for (const pick of SEED_PAYLOADS.recentPicks) {
    await runStep(`POST /recent-picks "${pick.title}"`, () => client.post('/recent-picks', pick));
  }
  const recentPicks = await runStep('GET  /recent-picks (Fetch Newest 10 Interactions)', () => client.get('/recent-picks'));
  if (recentPicks) console.log(`     ↳ Recent picks count: ${recentPicks.length} (Newest: "${recentPicks[0]?.title}")`);

  for (const fav of SEED_PAYLOADS.favorites) {
    await runStep(`POST /favorites [${fav.targetType}] "${fav.itemData?.title}"`, () => client.post('/favorites', fav));
  }
  const favs = await runStep('GET  /favorites (List User Favorites)', () => client.get('/favorites'));
  if (favs) console.log(`     ↳ Total favorites: ${favs.length}`);

  // 6. Coins Economics & Balance
  console.log(`\n--- Coins & Ledger System ---`);
  const balanceBefore = await runStep('GET  /coins/balance (Check Initial Balance)', () => client.get('/coins/balance'));
  if (balanceBefore) console.log(`     ↳ Current Coins: ${balanceBefore.balance}`);

  const packages = await runStep('GET  /coins/packages (Fetch Available Bundles)', () => client.get('/coins/packages'));
  if (packages) console.log(`     ↳ Bundles available: ${packages.packages?.map((p) => p.title).join(', ')}`);

  const purchase = await runStep('POST /coins/purchase (Buy 500 Coins Package)', () =>
    client.post('/coins/purchase', { packageId: 'pkg_coins_500' }, { headers: { 'X-Idempotency-Key': 'key_run_500_coins' } })
  );
  if (purchase) console.log(`     ↳ Added: ${purchase.coinsAdded} coins | New Balance: ${purchase.newBalance}`);

  // 7. Dynamic AI Match & Virtual Try-On
  console.log(`\n--- Dynamic AI Operations (Coin Consumption) ---`);
  const aiMatch = await runStep('POST /ai/match (Dynamic Compatibility Analysis)', () =>
    client.post('/ai/match', SEED_PAYLOADS.aiMatchSampleRequest)
  );
  if (aiMatch) {
    console.log(`     ↳ AI Match Score: ${aiMatch.matchScore}% (${aiMatch.suitability}) | Charged: ${aiMatch.coinsCharged} coins`);
    console.log(`     ↳ Harmony: "${aiMatch.analysis?.colorHarmony}"`);
  }

  const tryOn = await runStep('POST /try-on (Virtual Try-On Secure Proxy)', () =>
    client.post('/try-on', SEED_PAYLOADS.tryOnSampleRequest, { headers: { 'X-Idempotency-Key': 'key_run_tryon_01' } })
  );
  if (tryOn) {
    console.log(`     ↳ Result Image: ${tryOn.resultImageUrl} | Charged: ${tryOn.coinsCharged} coins`);
  }

  const forYou = await runStep('GET  /recommendations/for-you (Dynamic Outfits)', () => client.get('/recommendations/for-you'));
  if (forYou) console.log(`     ↳ Generated Recommendations: ${forYou.recommendedCount} looks for "${forYou.aesthetic}"`);

  // 8. Subscriptions & Free Trial
  console.log(`\n--- Subscriptions & Free Trial ---`);
  const subStatus = await runStep('GET  /subscription (Check Status & Plans)', () => client.get('/subscription'));
  if (subStatus) console.log(`     ↳ Status: ${subStatus.status} | Premium Active: ${subStatus.isPremiumActive}`);

  // Try starting free trial (or handling already claimed)
  await runStep('POST /subscription/trial/start (Activate Free Trial)', () => client.post('/subscription/trial/start', {}));

  // 9. Notifications
  console.log(`\n--- Notifications System ---`);
  for (const notif of SEED_PAYLOADS.notifications) {
    await runStep(`POST /notifications "${notif.title}"`, () => client.post('/notifications', notif));
  }
  const notifs = await runStep('GET  /notifications (List Notifications)', () => client.get('/notifications'));
  if (notifs) console.log(`     ↳ Total notifications: ${notifs.length}`);

  await runStep('PUT  /notifications/read-all (Mark All as Read)', () => client.put('/notifications/read-all', {}));

  // 10. Profile Dynamic Stats Aggregation
  console.log(`\n--- Dynamic Profile Statistics ---`);
  const stats = await runStep('GET  /profile/stats (Dynamic Aggregated Counts)', () => client.get('/profile/stats'));
  if (stats) {
    console.log(`     ↳ Wardrobe Items: ${stats.wardrobeCount}`);
    console.log(`     ↳ Saved Looks:    ${stats.outfitsCount}`);
    console.log(`     ↳ AI Matches:     ${stats.aiMatchCount}`);
  }

  // 11. Payment Webhook
  console.log(`\n--- Payment Webhook Simulation ---`);
  await runStep('POST /payments/webhook (Simulate Async Payment Event)', () =>
    client.post(
      '/payments/webhook',
      {
        eventType: 'PAYMENT_SUCCESS',
        userId: AUTH_TOKEN,
        amount: 7.99,
        currency: 'USD',
        paymentId: `pay_test_${Date.now()}`,
        metadata: { type: 'COINS', packageId: 'pkg_coins_500' },
      },
      { headers: { Authorization: '', 'X-Idempotency-Key': `pay_hook_${Date.now()}` } }
    )
  );

  console.log(`\n======================================================================`);
  console.log(`🏁 POSTMAN API TEST RUN COMPLETED`);
  console.log(`   Total Tests:  ${testCount}`);
  console.log(`   Passed:       ${passedCount} ✅`);
  console.log(`   Failed:       ${failedCount} ${failedCount > 0 ? '❌' : ''}`);
  console.log(`======================================================================\n`);
}

executeLivePostmanRun().catch((err) => {
  console.error('Execution encountered fatal error:', err);
  process.exit(1);
});
