const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { verifyToken } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(verifyToken);

// Get user notifications
router.get('/', notificationController.getNotifications);

// Get notification statistics
router.get('/stats', notificationController.getNotificationStats);

// Mark specific notification as read
router.put('/:notificationId/read', notificationController.markAsRead);

// Mark all notifications as read
router.put('/read-all', notificationController.markAllAsRead);

// Delete specific notification
router.delete('/:notificationId', notificationController.deleteNotification);

// Clear all notifications (for debugging)
router.delete('/clear-all', notificationController.clearAllNotifications);

// Create test notification (for debugging/testing with Postman)
router.post('/test', notificationController.createTestNotification);

module.exports = router;
