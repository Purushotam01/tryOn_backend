const axios = require('axios');
const app = require('../src/app');

const PORT = 3105;
const BASE_URL = `http://localhost:${PORT}/api/v1/profile`;
const AUTH_HEADER = { headers: { Authorization: 'Bearer test_user_uid_12345' } };

async function verifyProfileApis() {
  console.log('\n======================================================');
  console.log('🧪 VERIFYING COMPLETE PROFILE APIS & UI RESPONSE FORMAT');
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
    // 1. GET /profile
    const resGet = await axios.get(`${BASE_URL}`, AUTH_HEADER);
    assert(
      resGet.data.success === true &&
        resGet.data.data.name !== undefined &&
        resGet.data.data.selectedAvatarId !== undefined &&
        resGet.data.data.onboardingCompleted !== undefined,
      'GET /profile returns proper UI structure and status',
      resGet.data
    );

    // 2. PUT /profile (General update)
    const resPut = await axios.put(
      `${BASE_URL}`,
      {
        name: 'Elena Rostova',
        phone: '+1 (555) 999-0000',
        avatar: 'avatar_elena_02',
        onboardingCompleted: true,
      },
      AUTH_HEADER
    );
    assert(
      resPut.data.success === true &&
        resPut.data.data.name === 'Elena Rostova' &&
        resPut.data.data.displayName === 'Elena Rostova' &&
        resPut.data.data.selectedAvatarId === 'avatar_elena_02' &&
        resPut.data.data.onboardingStatus === 'COMPLETED' &&
        resPut.data.message === 'Profile updated successfully',
      'PUT /profile updates profile and returns proper message and format',
      resPut.data
    );

    // 3. PUT /profile/avatar (Change Avatar from UI)
    const resAvatar = await axios.put(`${BASE_URL}/avatar`, { avatarId: 'avatar_03' }, AUTH_HEADER);
    assert(
      resAvatar.data.success === true &&
        resAvatar.data.data.avatar === 'avatar_03' &&
        resAvatar.data.data.selectedAvatarId === 'avatar_03' &&
        resAvatar.data.message === 'Avatar updated successfully',
      'PUT /profile/avatar updates avatar for UI selection',
      resAvatar.data
    );

    // 4. PUT /profile/personal-info (Personal Info dialog from UI)
    const resPersonalInfo = await axios.put(
      `${BASE_URL}/personal-info`,
      {
        name: 'Elena Rostova Updated',
        phone: '+1 (555) 123-4567',
      },
      AUTH_HEADER
    );
    assert(
      resPersonalInfo.data.success === true &&
        resPersonalInfo.data.data.name === 'Elena Rostova Updated' &&
        resPersonalInfo.data.message === 'Personal information updated successfully',
      'PUT /profile/personal-info updates personal info modal details',
      resPersonalInfo.data
    );

    // 5. GET /profile/preferences
    const resGetPrefs = await axios.get(`${BASE_URL}/preferences`, AUTH_HEADER);
    assert(
      resGetPrefs.data.success === true &&
        resGetPrefs.data.data.bodyFit?.height !== undefined &&
        resGetPrefs.data.data.heightCm !== undefined &&
        resGetPrefs.data.data.fitSilhouetteSummary !== undefined &&
        resGetPrefs.data.data.aesthetic?.style !== undefined &&
        resGetPrefs.data.data.palette?.paletteName !== undefined,
      'GET /profile/preferences returns unified nested & flat structure with UI summaries',
      resGetPrefs.data
    );

    // 6. PUT /profile/preferences
    const resPutPrefs = await axios.put(
      `${BASE_URL}/preferences`,
      {
        bodyFit: { height: 168, silhouette: 'Hourglass', fit: 'Tailored' },
        aesthetic: { style: 'Quiet Luxury', vibes: ['Elegant', 'Classic'] },
        palette: { paletteName: 'Warm Neutrals', undertone: 'Warm' },
      },
      AUTH_HEADER
    );
    assert(
      resPutPrefs.data.success === true &&
        resPutPrefs.data.data.bodyFit.height === 168 &&
        resPutPrefs.data.data.heightCm === 168 &&
        resPutPrefs.data.data.aesthetic.style === 'Quiet Luxury' &&
        resPutPrefs.data.data.style === 'Quiet Luxury' &&
        resPutPrefs.data.data.fitSilhouetteSummary.includes('168 cm'),
      'PUT /profile/preferences updates preferences and computes dynamic summaries',
      resPutPrefs.data
    );

    // 7. GET & PUT /profile/preferences/body-fit
    const resBodyFit = await axios.put(
      `${BASE_URL}/preferences/body-fit`,
      { height: 170, silhouette: 'Pear', fit: 'Slim' },
      AUTH_HEADER
    );
    assert(
      resBodyFit.data.success === true &&
        resBodyFit.data.data.height === 170 &&
        resBodyFit.data.data.silhouette === 'Pear' &&
        resBodyFit.data.message === 'Body fit preferences updated successfully',
      'PUT /profile/preferences/body-fit updates granular body fit section',
      resBodyFit.data
    );

    // 8. GET & PUT /profile/preferences/aesthetic
    const resAesthetic = await axios.put(
      `${BASE_URL}/preferences/aesthetic`,
      { style: 'Minimalist Modern', vibes: ['Clean', 'Sharp'] },
      AUTH_HEADER
    );
    assert(
      resAesthetic.data.success === true &&
        resAesthetic.data.data.style === 'Minimalist Modern' &&
        resAesthetic.data.data.vibes.includes('Clean'),
      'PUT /profile/preferences/aesthetic updates granular aesthetic section',
      resAesthetic.data
    );

    // 9. GET & PUT /profile/preferences/palette
    const resPalette = await axios.put(
      `${BASE_URL}/preferences/palette`,
      { paletteName: 'Cool Monochrome', undertone: 'Cool' },
      AUTH_HEADER
    );
    assert(
      resPalette.data.success === true &&
        resPalette.data.data.paletteName === 'Cool Monochrome' &&
        resPalette.data.data.undertone === 'Cool',
      'PUT /profile/preferences/palette updates granular palette section',
      resPalette.data
    );

    // 10. GET /profile/stats
    const resStats = await axios.get(`${BASE_URL}/stats`, AUTH_HEADER);
    assert(
      resStats.data.success === true &&
        typeof resStats.data.data.wardrobeCount === 'number' &&
        typeof resStats.data.data.favoritesCount === 'number' &&
        typeof resStats.data.data.forYouCount === 'number' &&
        typeof resStats.data.data.aiMatchCount === 'number' &&
        typeof resStats.data.data.outfitsCount === 'number',
      'GET /profile/stats returns all UI statistics counters',
      resStats.data
    );

    // 11. Validation error test on empty name
    try {
      await axios.put(`${BASE_URL}/personal-info`, { name: '' }, AUTH_HEADER);
      assert(false, 'Empty name should have failed validation');
    } catch (err) {
      assert(
        err.response?.status === 400 && err.response?.data?.error?.code === 'VALIDATION_ERROR',
        'Validation properly rejects empty name with 400 VALIDATION_ERROR'
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

verifyProfileApis().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
