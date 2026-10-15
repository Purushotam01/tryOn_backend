const notificationsService = require('../services/notifications.service');

/**
 * Notifications Controller
 * Handles HTTP requests for Notifications & Profile Notification settings.
 */

async function listNotifications(req, res, next) {
  try {
    const notifications = await notificationsService.listNotifications(req.user.uid, req.query);
    return res.success(notifications);
  } catch (error) {
    next(error);
  }
}

async function createNotification(req, res, next) {
  try {
    const notification = await notificationsService.createNotification(req.user.uid, req.body);
    return res.success(notification, 'Notification created', 201);
  } catch (error) {
    next(error);
  }
}

async function markAsRead(req, res, next) {
  try {
    const result = await notificationsService.markAsRead(req.user.uid, req.params.id);
    return res.success(result, 'Notification marked as read');
  } catch (error) {
    next(error);
  }
}

async function markAllAsRead(req, res, next) {
  try {
    const result = await notificationsService.markAllAsRead(req.user.uid);
    return res.success(result, 'All notifications marked as read');
  } catch (error) {
    next(error);
  }
}

async function deleteNotification(req, res, next) {
  try {
    const result = await notificationsService.deleteNotification(req.user.uid, req.params.id);
    return res.success(result, 'Notification deleted');
  } catch (error) {
    next(error);
  }
}

async function clearAllNotifications(req, res, next) {
  try {
    const result = await notificationsService.clearAllNotifications(req.user.uid);
    return res.success(result, 'All notifications cleared');
  } catch (error) {
    next(error);
  }
}

async function getNotificationSettings(req, res, next) {
  try {
    const settings = await notificationsService.getNotificationSettings(req.user.uid);
    return res.success(settings);
  } catch (error) {
    next(error);
  }
}

async function updateNotificationSettings(req, res, next) {
  try {
    const settings = await notificationsService.updateNotificationSettings(req.user.uid, req.body);
    return res.success(settings, 'Notification settings updated');
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listNotifications,
  createNotification,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllNotifications,
  getNotificationSettings,
  updateNotificationSettings,
};
