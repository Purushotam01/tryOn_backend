const axios = require('axios');
const app = require('../src/app');

const PORT = 3108;
const BASE_REC_URL = `http://localhost:${PORT}/api/v1/recommendations`;
const BASE_PROFILE_URL = `http://localhost:${PORT}/api/v1/profile`;
const AUTH_HEADER = { headers: { Authorization: 'Bearer test_user_uid_12345' } };

async function verifyRecommendationsApis() {
  console.log('\n======================================================');
  console.log('🧪 VERIFYING RECOMMENDATIONS APIS & UI RESPONSE FORMAT');
  console.log('======================================================\n');

  const server = app.listen(PORT);
  let passed = 0;
  let failed = 0;

  function assert(condition, message, details) {
    if (condition) {
      console.log(`✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${message}`, details || '');
      failed++;
    }
  }

  try {
    // 1. GET /recommendations/for-you (Main For You recommendations)
    const resForYou = await axios.get(`${BASE_REC_URL}/for-you`, AUTH_HEADER);
    assert(
      resForYou.data.success === true &&
        resForYou.data.data.aesthetic !== undefined &&
        Array.isArray(resForYou.data.data.recommendations) &&
        resForYou.data.data.recommendations.length >= 1,
      'GET /recommendations/for-you returns recommendations array with user aesthetic',
      resForYou.data
    );

    const firstRec = resForYou.data.data.recommendations[0];
    assert(
      firstRec.id !== undefined &&
        firstRec.title !== undefined &&
        firstRec.description !== undefined &&
        firstRec.matchScore !== undefined &&
        firstRec.score !== undefined &&
        firstRec.progress !== undefined &&
        firstRec.imageUrl !== undefined &&
        Array.isArray(firstRec.items),
      'Recommendation item contains all UI fields (score, progress, matchScore, imageUrl, items)',
      firstRec
    );

    // 2. GET /recommendations (Direct route alias)
    const resBase = await axios.get(`${BASE_REC_URL}`, AUTH_HEADER);
    assert(
      resBase.data.success === true &&
        Array.isArray(resBase.data.data.recommendations),
      'GET /recommendations returns same structure as /for-you',
      resBase.data
    );

    // 3. GET /recommendations/categories (The 7 Curated Fashion Categories)
    const resCategories = await axios.get(`${BASE_REC_URL}/categories`, AUTH_HEADER);
    assert(
      resCategories.data.success === true &&
        Array.isArray(resCategories.data.data) &&
        resCategories.data.data.length === 7 &&
        resCategories.data.data.some((c) => c.id === 'casual') &&
        resCategories.data.data.some((c) => c.id === 'party') &&
        resCategories.data.data.some((c) => c.id === 'work'),
      'GET /recommendations/categories returns the 7 curated fashion categories (casual, party, work, wedding, office, date_night, travel)',
      resCategories.data.data
    );

    // 4. GET /recommendations/category/:id (Category looks collection)
    const resCategoryLooks = await axios.get(`${BASE_REC_URL}/category/casual`, AUTH_HEADER);
    assert(
      resCategoryLooks.data.success === true &&
        resCategoryLooks.data.data.id === 'casual' &&
        resCategoryLooks.data.data.title === 'Casual' &&
        Array.isArray(resCategoryLooks.data.data.dresses) &&
        resCategoryLooks.data.data.dresses.length >= 1,
      'GET /recommendations/category/:id returns curated dresses matching ForYouCollection model',
      resCategoryLooks.data.data
    );

    // 5. GET /recommendations/daily (Morning outfit recommendation)
    const resDaily = await axios.get(`${BASE_REC_URL}/daily`, AUTH_HEADER);
    assert(
      resDaily.data.success === true &&
        resDaily.data.data.date !== undefined &&
        resDaily.data.data.outfit !== undefined &&
        resDaily.data.data.stylingTip !== undefined,
      'GET /recommendations/daily returns morning outfit recommendation and styling tip',
      resDaily.data.data
    );

    // 6. Profile sub-routes: GET /profile/recommendations & /profile/for-you
    const resProfileRec = await axios.get(`${BASE_PROFILE_URL}/recommendations`, AUTH_HEADER);
    const resProfileForYou = await axios.get(`${BASE_PROFILE_URL}/for-you`, AUTH_HEADER);
    assert(
      resProfileRec.data.success === true &&
        resProfileForYou.data.success === true &&
        resProfileForYou.data.data.recommendations !== undefined,
      'GET /profile/recommendations and /profile/for-you work seamlessly under profile router',
      { rec: resProfileRec.data, forYou: resProfileForYou.data }
    );

    // 7. Profile sub-routes: GET /profile/recommendations/categories
    const resProfileCats = await axios.get(
      `${BASE_PROFILE_URL}/recommendations/categories`,
      AUTH_HEADER
    );
    assert(
      resProfileCats.data.success === true &&
        Array.isArray(resProfileCats.data.data) &&
        resProfileCats.data.data.length === 7,
      'GET /profile/recommendations/categories works seamlessly under profile router',
      resProfileCats.data.data
    );

    // 8. Security verification: Missing token rejected with 401
    try {
      await axios.get(`${BASE_REC_URL}`);
      assert(false, 'Request without token should have failed with 401');
    } catch (err) {
      assert(
        err.response?.status === 401,
        'Security properly rejects unauthenticated request with 401 UNAUTHORIZED'
      );
    }

    console.log(`\n======================================================`);
    console.log(`Results: ${passed} PASSED, ${failed} FAILED`);
    console.log(`======================================================\n`);
    process.exit(failed > 0 ? 1 : 0);
  } finally {
    server.close();
  }
}

verifyRecommendationsApis().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
