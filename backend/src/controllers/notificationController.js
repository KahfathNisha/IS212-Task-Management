const { db } = require('../config/firebase');
const NotificationService = require('../services/notificationService');

// Get user notifications
exports.getNotifications = async (req, res) => {
    try {
        const userId = req.user.email; // Assuming user email is stored in req.user from auth middleware
        const { limit = 50, startAfter } = req.query;

        const notifications = await NotificationService.getUserNotifications(
            userId, 
            parseInt(limit), 
            startAfter
        );

        res.status(200).json({
            success: true,
            notifications,
            count: notifications.length
        });
    } catch (error) {
        console.error('Error getting notifications:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
};

// Mark notification as read
exports.markAsRead = async (req, res) => {
    try {
        const userId = req.user.email;
        const { notificationId } = req.params;

        await NotificationService.markAsRead(userId, notificationId);

        res.status(200).json({
            success: true,
            message: 'Notification marked as read'
        });
    } catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
};

// Mark all notifications as read
exports.markAllAsRead = async (req, res) => {
    try {
        const userId = req.user.email;

        await NotificationService.markAllAsRead(userId);

        res.status(200).json({
            success: true,
            message: 'All notifications marked as read'
        });
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
};

// Delete notification
exports.deleteNotification = async (req, res) => {
    try {
        const userId = req.user.email;
        const { notificationId } = req.params;

        await db.collection('users').doc(userId).collection('notifications').doc(notificationId).delete();

        res.status(200).json({
            success: true,
            message: 'Notification deleted'
        });
    } catch (error) {
        console.error('Error deleting notification:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
};

// Get notification statistics
exports.getNotificationStats = async (req, res) => {
    try {
        const userId = req.user.email;

        const [unreadSnapshot, totalSnapshot] = await Promise.all([
            db.collection('users').doc(userId).collection('notifications')
                .where('isRead', '==', false)
                .get(),
            db.collection('users').doc(userId).collection('notifications')
                .get()
        ]);

        res.status(200).json({
            success: true,
            stats: {
                total: totalSnapshot.size,
                unread: unreadSnapshot.size,
                read: totalSnapshot.size - unreadSnapshot.size
            }
        });
    } catch (error) {
        console.error('Error getting notification stats:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
};

// Clear all notifications for current user (for debugging)
exports.clearAllNotifications = async (req, res) => {
    try {
        const userId = req.user.email;
        
        const notificationsSnapshot = await db.collection('users').doc(userId).collection('notifications').get();
        
        if (notificationsSnapshot.empty) {
            return res.status(200).json({
                success: true,
                message: 'No notifications to clear'
            });
        }
        
        const batch = db.batch();
        notificationsSnapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        
        await batch.commit();
        
        res.status(200).json({
            success: true,
            message: `Cleared ${notificationsSnapshot.size} notifications`
        });
    } catch (error) {
        console.error('Error clearing all notifications:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
};

// Create a test notification (for debugging/testing with Postman)
exports.createTestNotification = async (req, res) => {
    try {
        const userId = req.user.email;
        const { title, body, type = 'info', taskId } = req.body;

        if (!title || !body) {
            return res.status(400).json({
                success: false,
                error: 'Title and body are required'
            });
        }

        const notificationData = {
            title,
            body,
            type,
            taskId: taskId || null
        };

        const notificationId = await NotificationService.sendNotification(userId, notificationData, {
            sendPush: false,
            sendEmail: false
        });

        res.status(201).json({
            success: true,
            message: 'Test notification created successfully',
            notificationId,
            notification: {
                id: notificationId,
                ...notificationData,
                userId,
                isRead: false,
                createdAt: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Error creating test notification:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
};
