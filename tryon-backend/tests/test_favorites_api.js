const axios = require('axios');
const app = require('../src/app');

const PORT = 3106;
const BASE_FAVORITES_URL = `http://localhost:${PORT}/api/v1/favorites`;
const BASE_PROFILE_URL = `http://localhost:${PORT}/api/v1/profile`;
const AUTH_HEADER = { headers: { Authorization: 'Bearer test_user_uid_12345' } };

async function verifyFavoritesApis() {
  console.log('\n======================================================');
  console.log('🧪 VERIFYING FAVORITES APIS & UI RESPONSE FORMAT');
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
    // 1. GET /favorites (List all favorites)
    const resGet = await axios.get(`${BASE_FAVORITES_URL}`, AUTH_HEADER);
    assert(
      resGet.data.success === true &&
        Array.isArray(resGet.data.data) &&
        resGet.data.data.length >= 1,
      'GET /favorites returns array of favorites in TryFit envelope',
      resGet.data
    );

    const firstItem = resGet.data.data[0];
    assert(
      firstItem.id !== undefined &&
        firstItem.targetId !== undefined &&
        firstItem.targetType !== undefined &&
        firstItem.name !== undefined &&
        firstItem.imageUrl !== undefined &&
        firstItem.isFavorite === true,
      'Favorites item contains flattened UI attributes (name, imageUrl, isFavorite)',
      firstItem
    );

    // 2. GET /favorites/clothes (Dedicated for FavoriteClothesScreen)
    const resClothes = await axios.get(`${BASE_FAVORITES_URL}/clothes`, AUTH_HEADER);
    assert(
      resClothes.data.success === true &&
        Array.isArray(resClothes.data.data) &&
        resClothes.data.data.every((c) => c.isFavorite === true && c.category !== undefined),
      'GET /favorites/clothes returns clothing items formatted for FavoriteClothesScreen',
      resClothes.data
    );

    // 3. GET /favorites/aesthetics (Dedicated for FavoriteAestheticView)
    const resAesthetics = await axios.get(`${BASE_FAVORITES_URL}/aesthetics`, AUTH_HEADER);
    assert(
      resAesthetics.data.success === true && Array.isArray(resAesthetics.data.data),
      'GET /favorites/aesthetics returns aesthetics list formatted for FavoriteAestheticView',
      resAesthetics.data
    );

    // 4. Query filtering on GET /favorites?type=clothing
    const resFilter = await axios.get(`${BASE_FAVORITES_URL}?type=clothing`, AUTH_HEADER);
    assert(
      resFilter.data.success === true &&
        resFilter.data.data.every((item) => item.targetType === 'clothing'),
      'GET /favorites?type=clothing filters accurately by type',
      resFilter.data
    );

    // 5. GET /favorites/check/:targetId
    const targetCheckId = 'wardrobe_dress_01';
    const resCheck = await axios.get(`${BASE_FAVORITES_URL}/check/${targetCheckId}`, AUTH_HEADER);
    assert(
      resCheck.data.success === true &&
        resCheck.data.data.isFavorite !== undefined &&
        resCheck.data.data.targetId === targetCheckId,
      'GET /favorites/check/:targetId checks favorite status accurately',
      resCheck.data
    );

    // 6. POST /favorites (Add new favorite)
    const newClothId = 'wardrobe_top_01';
    const resAdd = await axios.post(
      `${BASE_FAVORITES_URL}`,
      {
        targetId: newClothId,
        targetType: 'clothing',
        name: 'Silk Button-Down Shirt',
        category: 'Tops',
        color: 'Silk White',
        brand: 'Equipment',
        imageUrl: 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10',
      },
      AUTH_HEADER
    );
    assert(
      resAdd.status === 201 &&
        resAdd.data.success === true &&
        resAdd.data.data.targetId === newClothId &&
        resAdd.data.data.isFavorite === true &&
        resAdd.data.data.name === 'Silk Button-Down Shirt' &&
        resAdd.data.message === 'Added to favorites',
      'POST /favorites adds favorite and returns 201 with proper UI response format',
      resAdd.data
    );

    // 7. Verify check endpoint now reports true for the added item
    const resCheckAdded = await axios.get(`${BASE_FAVORITES_URL}/check/${newClothId}`, AUTH_HEADER);
    assert(
      resCheckAdded.data.success === true && resCheckAdded.data.data.isFavorite === true,
      'GET /favorites/check reports isFavorite: true after adding',
      resCheckAdded.data
    );

    // 8. POST /favorites/toggle (Toggle off)
    const resToggleOff = await axios.post(
      `${BASE_FAVORITES_URL}/toggle`,
      { targetId: newClothId, targetType: 'clothing' },
      AUTH_HEADER
    );
    assert(
      resToggleOff.data.success === true &&
        resToggleOff.data.data.isFavorite === false &&
        resToggleOff.data.message === 'Removed from favorites',
      'POST /favorites/toggle turns favorite OFF if already favorited',
      resToggleOff.data
    );

    // 9. POST /favorites/toggle (Toggle back on)
    const resToggleOn = await axios.post(
      `${BASE_FAVORITES_URL}/toggle`,
      { targetId: newClothId, targetType: 'clothing', name: 'Silk Button-Down Shirt' },
      AUTH_HEADER
    );
    assert(
      resToggleOn.data.success === true &&
        resToggleOn.data.data.isFavorite === true &&
        resToggleOn.data.message === 'Added to favorites',
      'POST /favorites/toggle turns favorite back ON if unfavorited',
      resToggleOn.data
    );

    // 10. DELETE /favorites/:id (Remove by targetId or favId)
    const resDelete = await axios.delete(`${BASE_FAVORITES_URL}/${newClothId}`, AUTH_HEADER);
    assert(
      resDelete.data.success === true &&
        resDelete.data.data.isFavorite === false &&
        resDelete.data.message === 'Removed from favorites',
      'DELETE /favorites/:id successfully removes favorite by targetId',
      resDelete.data
    );

    // 11. Profile sub-routes: GET /profile/favorites & /profile/favorites/clothes
    const resProfileFavs = await axios.get(`${BASE_PROFILE_URL}/favorites`, AUTH_HEADER);
    const resProfileFavClothes = await axios.get(
      `${BASE_PROFILE_URL}/favorites/clothes`,
      AUTH_HEADER
    );
    assert(
      resProfileFavs.data.success === true &&
        resProfileFavClothes.data.success === true &&
        Array.isArray(resProfileFavClothes.data.data),
      'GET /profile/favorites and /profile/favorites/clothes work seamlessly under profile route',
      { favs: resProfileFavs.data, clothes: resProfileFavClothes.data }
    );

    // 12. GET /profile/stats reflects favoriteCount
    const resStats = await axios.get(`${BASE_PROFILE_URL}/stats`, AUTH_HEADER);
    assert(
      resStats.data.success === true &&
        typeof resStats.data.data.favoritesCount === 'number' &&
        typeof resStats.data.data.favoriteCount === 'number' &&
        typeof resStats.data.data.favoriteClothesCount === 'number',
      'GET /profile/stats returns synchronized favoritesCount and favoriteClothesCount',
      resStats.data.data
    );

    // 13. Validation error on missing targetId
    try {
      await axios.post(`${BASE_FAVORITES_URL}`, {}, AUTH_HEADER);
      assert(false, 'Empty payload should have failed with 400 INVALID_FAVORITE_DATA');
    } catch (err) {
      assert(
        err.response?.status === 400 &&
          err.response?.data?.error?.code === 'INVALID_FAVORITE_DATA',
        'Validation properly rejects empty favorite payload with 400 INVALID_FAVORITE_DATA'
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

verifyFavoritesApis().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
