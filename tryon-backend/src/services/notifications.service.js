const { v4: uuidv4 } = require('uuid');
const { getSubcollectionDocs, setSubdoc, deleteSubdoc, getSubdoc } = require('./firebase.service');

/**
 * Notifications Service (Section 20 & UI Profile Integration)
 * Matches Flutter AppNotification model and NotificationScreen requirements.
 */

/**
 * Normalizes notification type to match UI AppNotification supported types:
 * 'outfit', 'wardrobe', 'ai', 'system', 'general'
 */
function normalizeNotificationType(type = '', title = '', body = '') {
  const raw = (type || '').toString().toLowerCase().trim();
  const text = `${title} ${body}`.toLowerCase();

  if (['outfit', 'look', 'planner', 'style'].includes(raw) || text.includes('schedule') || text.includes('planner')) {
    return 'outfit';
  }
  if (['wardrobe', 'clothing', 'closet', 'item'].includes(raw) || text.includes('wardrobe')) {
    return 'wardrobe';
  }
  if (['ai', 'aimatch', 'ai_match', 'compatibility'].includes(raw) || text.includes('ai match')) {
    return 'ai';
  }
  if (['system', 'subscription', 'trial', 'pro', 'coin', 'coins', 'payment'].includes(raw) || text.includes('trial') || text.includes('pro')) {
    return 'system';
  }
  if (['general', 'onboarding', 'welcome'].includes(raw) || text.includes('welcome')) {
    return 'general';
  }

  return raw || 'general';
}

/**
 * Infers appropriate actionRoute for navigation based on notification type and payload
 */
function inferActionRoute(type, data = {}) {
  if (data && (data.actionRoute || data.route)) {
    return data.actionRoute || data.route;
  }
  switch (type) {
    case 'outfit':
      return '/planner';
    case 'wardrobe':
      return '/wardrobe';
    case 'system':
      return '/subscription';
    case 'ai':
      return '/try-on';
    default:
      return null;
  }
}

/**
 * Normalizes and formats the Notification response for Flutter AppNotification & REST clients
 */
function formatNotificationResponse(notif = {}, uid = '') {
  const id = notif.id || uuidv4();
  const title = notif.title || 'Notification';
  const message = notif.message || notif.body || '';
  const body = notif.body || notif.message || '';
  const timestamp = notif.timestamp || notif.createdAt || new Date().toISOString();
  const createdAt = notif.createdAt || notif.timestamp || new Date().toISOString();
  const data = notif.data || {};
  const type = normalizeNotificationType(notif.type, title, message);
  const actionRoute = notif.actionRoute || inferActionRoute(type, data);
  const isRead = notif.isRead === true;

  return {
    id,
    userId: uid || notif.userId || '',
    title,
    message,
    body,
    timestamp,
    createdAt,
    type,
    rawType: notif.type || 'GENERAL',
    isRead,
    actionRoute,
    data,
  };
}

/**
 * List all notifications for a user, sorted newest-first
 */
async function listNotifications(uid, query = {}) {
  const notifs = await getSubcollectionDocs(uid, 'notifications');
  let results = notifs.map((n) => formatNotificationResponse(n, uid));

  // Optional filtering by read status
  if (query.unread === 'true' || query.isRead === 'false') {
    results = results.filter((n) => !n.isRead);
  } else if (query.isRead === 'true') {
    results = results.filter((n) => n.isRead);
  }

  // Optional filtering by type
  if (query.type) {
    const targetType = query.type.toLowerCase().trim();
    results = results.filter((n) => n.type === targetType || n.rawType.toLowerCase() === targetType);
  }

  return results.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

/**
 * Create a new notification
 */
async function createNotification(uid, payload = {}) {
  const title = payload.title?.trim();
  const message = (payload.message || payload.body)?.trim();

  if (!title || !message) {
    const err = new Error('title and message/body are required to create a notification');
    err.code = 'INVALID_NOTIFICATION_DATA';
    err.statusCode = 400;
    throw err;
  }

  const id = payload.id || uuidv4();
  const now = new Date().toISOString();
  const type = normalizeNotificationType(payload.type, title, message);
  const data = payload.data || {};
  const actionRoute = payload.actionRoute || inferActionRoute(type, data);

  const notification = {
    id,
    userId: uid,
    title,
    message,
    body: message,
    type,
    rawType: payload.type || 'GENERAL',
    data,
    actionRoute,
    isRead: false,
    timestamp: now,
    createdAt: now,
  };

  await setSubdoc(uid, 'notifications', id, notification);
  return formatNotificationResponse(notification, uid);
}

/**
 * Mark a single notification as read
 */
async function markAsRead(uid, notifId) {
  if (!notifId) {
    const err = new Error('notifId is required');
    err.code = 'INVALID_NOTIFICATION_DATA';
    err.statusCode = 400;
    throw err;
  }

  const existing = await getSubdoc(uid, 'notifications', notifId);
  if (existing) {
    await setSubdoc(uid, 'notifications', notifId, { isRead: true, updatedAt: new Date().toISOString() }, true);
    return { id: notifId, isRead: true };
  }

  // Fallback match by prefix or suffix if ID format varies
  const notifs = await getSubcollectionDocs(uid, 'notifications');
  const matched = notifs.find((n) => n.id === notifId || n.id.endsWith(`_${notifId}`));
  if (matched) {
    await setSubdoc(uid, 'notifications', matched.id, { isRead: true, updatedAt: new Date().toISOString() }, true);
    return { id: matched.id, isRead: true };
  }

  return { id: notifId, isRead: true };
}

/**
 * Mark all notifications for the user as read
 */
async function markAllAsRead(uid) {
  const notifs = await getSubcollectionDocs(uid, 'notifications');
  let updatedCount = 0;
  for (const notif of notifs) {
    if (!notif.isRead) {
      await setSubdoc(uid, 'notifications', notif.id, { isRead: true, updatedAt: new Date().toISOString() }, true);
      updatedCount++;
    }
  }
  return { updatedCount, success: true };
}

/**
 * Delete a specific notification by ID
 */
async function deleteNotification(uid, notifId) {
  if (!notifId) {
    const err = new Error('notifId is required');
    err.code = 'INVALID_NOTIFICATION_DATA';
    err.statusCode = 400;
    throw err;
  }

  const existing = await getSubdoc(uid, 'notifications', notifId);
  if (existing) {
    await deleteSubdoc(uid, 'notifications', notifId);
    return { id: notifId, deleted: true };
  }

  const notifs = await getSubcollectionDocs(uid, 'notifications');
  const matched = notifs.find((n) => n.id === notifId || n.id.endsWith(`_${notifId}`));
  if (matched) {
    await deleteSubdoc(uid, 'notifications', matched.id);
    return { id: matched.id, deleted: true };
  }

  return { id: notifId, deleted: true };
}

/**
 * Clear all notifications permanently
 */
async function clearAllNotifications(uid) {
  const notifs = await getSubcollectionDocs(uid, 'notifications');
  for (const notif of notifs) {
    await deleteSubdoc(uid, 'notifications', notif.id);
  }
  return { deletedCount: notifs.length, success: true };
}

/**
 * Get notification settings (e.g. morning outfit recommendation switch)
 */
async function getNotificationSettings(uid) {
  const settings = await getSubdoc(uid, 'settings', 'notifications');
  return {
    notificationsEnabled: settings?.notificationsEnabled ?? true,
    morningOutfitNotification: settings?.morningOutfitNotification ?? true,
    notificationTime: settings?.notificationTime || '08:00',
    updatedAt: settings?.updatedAt || new Date().toISOString(),
  };
}

/**
 * Update notification settings
 */
async function updateNotificationSettings(uid, data = {}) {
  const current = await getNotificationSettings(uid);
  const updated = {
    notificationsEnabled: data.notificationsEnabled !== undefined ? Boolean(data.notificationsEnabled) : current.notificationsEnabled,
    morningOutfitNotification: data.morningOutfitNotification !== undefined ? Boolean(data.morningOutfitNotification) : current.morningOutfitNotification,
    notificationTime: data.notificationTime || current.notificationTime,
    updatedAt: new Date().toISOString(),
  };

  await setSubdoc(uid, 'settings', 'notifications', updated, true);
  return updated;
}

module.exports = {
  normalizeNotificationType,
  formatNotificationResponse,
  listNotifications,
  createNotification,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllNotifications,
  getNotificationSettings,
  updateNotificationSettings,
};
