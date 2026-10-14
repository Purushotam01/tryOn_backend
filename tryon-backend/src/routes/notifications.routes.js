const express = require('express');
const router = express.Router();
const notificationsController = require('../controllers/notifications.controller');
const { authenticateUser } = require('../middleware/auth.middleware');

router.use(authenticateUser);

router.get('/', notificationsController.listNotifications);
router.post('/', notificationsController.createNotification);
router.put('/read-all', notificationsController.markAllAsRead);
router.put('/:id/read', notificationsController.markAsRead);
router.delete('/:id', notificationsController.deleteNotification);
router.delete('/', notificationsController.clearAllNotifications);

module.exports = router;
