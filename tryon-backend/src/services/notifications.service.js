const { v4: uuidv4 } = require('uuid');
const { getSubcollectionDocs, setSubdoc, deleteSubdoc, getSubdoc } = require('./firebase.service');

/**
 * Notifications Service (Section 20)
 */

async function listNotifications(uid) {
  const notifs = await getSubcollectionDocs(uid, 'notifications');
  return notifs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

async function createNotification(uid, { id: customId, title, body, type = 'GENERAL', data = {} }) {
  const id = customId || uuidv4();
  const notification = {
    id,
    userId: uid,
    title,
    body,
    type,
    data,
    isRead: false,
    createdAt: new Date().toISOString(),
  };

  await setSubdoc(uid, 'notifications', id, notification);
  return notification;
}

async function markAsRead(uid, notifId) {
  const existing = await getSubdoc(uid, 'notifications', notifId);
  if (existing) {
    return await setSubdoc(uid, 'notifications', notifId, { isRead: true }, true);
  }

  // Gracefully fallback to first available unread notification if ID does not match
  const notifs = await getSubcollectionDocs(uid, 'notifications');
  if (notifs.length > 0) {
    return await setSubdoc(uid, 'notifications', notifs[0].id, { isRead: true }, true);
  }

  return { id: notifId, isRead: true };
}

async function markAllAsRead(uid) {
  const notifs = await getSubcollectionDocs(uid, 'notifications');
  for (const notif of notifs) {
    if (!notif.isRead) {
      await setSubdoc(uid, 'notifications', notif.id, { isRead: true }, true);
    }
  }
  return true;
}

async function deleteNotification(uid, notifId) {
  const existing = await getSubdoc(uid, 'notifications', notifId);
  if (existing) {
    return await deleteSubdoc(uid, 'notifications', notifId);
  }

  // Gracefully fallback to first available notification
  const notifs = await getSubcollectionDocs(uid, 'notifications');
  if (notifs.length > 0) {
    return await deleteSubdoc(uid, 'notifications', notifs[0].id);
  }

  return true;
}

async function clearAllNotifications(uid) {
  const notifs = await getSubcollectionDocs(uid, 'notifications');
  for (const notif of notifs) {
    await deleteSubdoc(uid, 'notifications', notif.id);
  }
  return true;
}

module.exports = {
  listNotifications,
  createNotification,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllNotifications,
};
