const notificationsService = require('../services/notifications.service');

async function listNotifications(req, res, next) {
  try {
    const notifications = await notificationsService.listNotifications(req.user.uid);
    return res.success(notifications);
  } catch (error) {
    next(error);
  }
}

async function createNotification(req, res, next) {
  try {
    const { id, title, body, type, data } = req.body;
    const notification = await notificationsService.createNotification(req.user.uid, {
      id,
      title,
      body,
      type,
      data,
    });
    return res.success(notification, 'Notification created', 201);
  } catch (error) {
    next(error);
  }
}

async function markAsRead(req, res, next) {
  try {
    await notificationsService.markAsRead(req.user.uid, req.params.id);
    return res.success({ id: req.params.id }, 'Notification marked as read');
  } catch (error) {
    next(error);
  }
}

async function markAllAsRead(req, res, next) {
  try {
    await notificationsService.markAllAsRead(req.user.uid);
    return res.success(null, 'All notifications marked as read');
  } catch (error) {
    next(error);
  }
}

async function deleteNotification(req, res, next) {
  try {
    await notificationsService.deleteNotification(req.user.uid, req.params.id);
    return res.success({ id: req.params.id }, 'Notification deleted');
  } catch (error) {
    next(error);
  }
}

async function clearAllNotifications(req, res, next) {
  try {
    await notificationsService.clearAllNotifications(req.user.uid);
    return res.success(null, 'All notifications cleared');
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
};
