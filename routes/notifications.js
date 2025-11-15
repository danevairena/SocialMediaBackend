const express = require('express');
const router = express.Router();
const NotificationsController = require('../controllers/NotificationsController');

// POST /api/notifications
router.post('/', NotificationsController.createNotification);

// GET /api/notifications/user/:userId
router.get('/user/:userId', NotificationsController.getNotificationsByUser);

// PUT /api/notifications/user/:userId/read
router.put('/user/:userId/read', NotificationsController.markAllAsRead);

module.exports = router;
