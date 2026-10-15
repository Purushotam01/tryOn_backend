const axios = require('axios');
const app = require('../src/app');

const PORT = 3107;
const BASE_NOTIF_URL = `http://localhost:${PORT}/api/v1/notifications`;
const BASE_PROFILE_URL = `http://localhost:${PORT}/api/v1/profile`;
const AUTH_HEADER = { headers: { Authorization: 'Bearer test_user_uid_12345' } };

async function verifyNotificationsApis() {
  console.log('\n======================================================');
  console.log('🧪 VERIFYING NOTIFICATIONS APIS & UI RESPONSE FORMAT');
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
    // 1. GET /notifications (List all notifications)
    const resGet = await axios.get(`${BASE_NOTIF_URL}`, AUTH_HEADER);
    assert(
      resGet.data.success === true &&
        Array.isArray(resGet.data.data) &&
        resGet.data.data.length >= 1,
      'GET /notifications returns array of notifications in standard TryFit envelope',
      resGet.data
    );

    const firstItem = resGet.data.data[0];
    assert(
      firstItem.id !== undefined &&
        firstItem.title !== undefined &&
        firstItem.message !== undefined &&
        firstItem.body !== undefined &&
        firstItem.timestamp !== undefined &&
        firstItem.type !== undefined &&
        firstItem.isRead !== undefined,
      'Notification item contains all Flutter AppNotification model fields (title, message, timestamp, type, isRead)',
      firstItem
    );

    // 2. POST /notifications (Create notification)
    const resCreate = await axios.post(
      `${BASE_NOTIF_URL}`,
      {
        title: 'New Outfit Ready',
        message: 'Your minimalist autumn look is ready in the planner.',
        type: 'outfit',
        actionRoute: '/planner',
      },
      AUTH_HEADER
    );
    assert(
      resCreate.status === 201 &&
        resCreate.data.success === true &&
        resCreate.data.data.title === 'New Outfit Ready' &&
        resCreate.data.data.message.includes('minimalist autumn look') &&
        resCreate.data.data.type === 'outfit' &&
        resCreate.data.data.actionRoute === '/planner' &&
        resCreate.data.data.isRead === false,
      'POST /notifications creates notification with 201 and UI format',
      resCreate.data
    );

    const createdId = resCreate.data.data.id;

    // 3. PUT /notifications/:id/read (Mark single as read)
    const resRead = await axios.put(`${BASE_NOTIF_URL}/${createdId}/read`, {}, AUTH_HEADER);
    assert(
      resRead.data.success === true &&
        resRead.data.data.isRead === true &&
        resRead.data.message === 'Notification marked as read',
      'PUT /notifications/:id/read marks notification as read',
      resRead.data
    );

    // 4. PUT /notifications/read-all (Mark all as read)
    const resReadAll = await axios.put(`${BASE_NOTIF_URL}/read-all`, {}, AUTH_HEADER);
    assert(
      resReadAll.data.success === true &&
        resReadAll.data.message === 'All notifications marked as read',
      'PUT /notifications/read-all marks all notifications as read',
      resReadAll.data
    );

    // 5. Query filtering by unread
    const resUnread = await axios.get(`${BASE_NOTIF_URL}?unread=true`, AUTH_HEADER);
    assert(
      resUnread.data.success === true &&
        Array.isArray(resUnread.data.data) &&
        resUnread.data.data.length === 0,
      'GET /notifications?unread=true filters unread notifications accurately (0 unread after read-all)',
      resUnread.data
    );

    // 6. DELETE /notifications/:id (Delete single notification)
    const resDelete = await axios.delete(`${BASE_NOTIF_URL}/${createdId}`, AUTH_HEADER);
    assert(
      resDelete.data.success === true &&
        resDelete.data.message === 'Notification deleted',
      'DELETE /notifications/:id removes individual notification',
      resDelete.data
    );

    // 7. GET & PUT /profile/notifications/settings (Morning Outfit switch in UI Profile)
    const resGetSettings = await axios.get(`${BASE_PROFILE_URL}/notifications/settings`, AUTH_HEADER);
    assert(
      resGetSettings.data.success === true &&
        resGetSettings.data.data.notificationsEnabled !== undefined &&
        resGetSettings.data.data.morningOutfitNotification !== undefined,
      'GET /profile/notifications/settings returns settings matching UI profile toggle',
      resGetSettings.data
    );

    const resPutSettings = await axios.put(
      `${BASE_PROFILE_URL}/notifications/settings`,
      { morningOutfitNotification: false },
      AUTH_HEADER
    );
    assert(
      resPutSettings.data.success === true &&
        resPutSettings.data.data.morningOutfitNotification === false,
      'PUT /profile/notifications/settings updates morning outfit notification preference',
      resPutSettings.data
    );

    // 8. Profile sub-routes: GET & POST /profile/notifications
    const resProfileNotifs = await axios.get(`${BASE_PROFILE_URL}/notifications`, AUTH_HEADER);
    assert(
      resProfileNotifs.data.success === true &&
        Array.isArray(resProfileNotifs.data.data),
      'GET /profile/notifications works seamlessly under profile router',
      resProfileNotifs.data
    );

    // 9. Validation error test on missing title / message
    try {
      await axios.post(`${BASE_NOTIF_URL}`, {}, AUTH_HEADER);
      assert(false, 'Empty notification payload should fail validation');
    } catch (err) {
      assert(
        err.response?.status === 400 &&
          err.response?.data?.error?.code === 'INVALID_NOTIFICATION_DATA',
        'Validation properly rejects empty notification payload with 400 INVALID_NOTIFICATION_DATA'
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

verifyNotificationsApis().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
