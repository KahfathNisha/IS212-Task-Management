const { db } = require('../config/firebase');
const NotificationService = require('../services/notificationService');
const EmailService = require('../services/emailService');

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

        await db.collection('Users').doc(userId).collection('notifications').doc(notificationId).delete();

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
            db.collection('Users').doc(userId).collection('notifications')
                .where('isRead', '==', false)
                .get(),
            db.collection('Users').doc(userId).collection('notifications')
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
        
        const notificationsSnapshot = await db.collection('Users').doc(userId).collection('notifications').get();
        
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

// Send test email via SendGrid (for integration testing)
exports.sendTestEmail = async (req, res) => {
    try {
        const { to, subject, text } = req.body;

        if (!to || !subject || !text) {
            return res.status(400).json({
                success: false,
                error: 'to, subject, and text are required'
            });
        }

        // Whitelist check for test environment
        const allowedDomains = ['example.com', 'test.com', 'gmail.com'];
        const emailDomain = to.split('@')[1];

        if (process.env.NODE_ENV === 'test' && !allowedDomains.includes(emailDomain)) {
            return res.status(403).json({
                success: false,
                error: 'Email domain not allowed in test environment'
            });
        }

        const result = await EmailService.sendTestEmail(to, subject, text);

        res.status(200).json({
            success: true,
            message: 'Test email sent successfully',
            accepted: true,
            statusCode: 202, // SendGrid typically returns 202 for accepted
            requestId: result[0]?.headers?.['x-message-id'] || 'unknown'
        });
    } catch (error) {
        console.error('Error sending test email:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Send test reassignment email via SendGrid (for integration testing)
exports.sendTestReassignmentEmail = async (req, res) => {
    console.log('sendTestReassignmentEmail called with body:', JSON.stringify(req.body, null, 2));
    try {
        const {
            to,
            taskData,
            reassignmentType = 'assigned',
            reassignedBy = 'Test Admin',
            reassignmentTime,
            userTimezone = 'UTC'
        } = req.body;

        if (!to || !taskData) {
            return res.status(400).json({
                success: false,
                error: 'to and taskData are required'
            });
        }

        // Whitelist check for test environment
        const allowedDomains = ['example.com', 'test.com', 'gmail.com'];
        const emailDomain = to.split('@')[1];

        console.log('Email domain check:', emailDomain, 'NODE_ENV:', process.env.NODE_ENV, 'allowedDomains:', allowedDomains);
        if (process.env.NODE_ENV === 'test' && !allowedDomains.includes(emailDomain)) {
            console.log('Email domain not allowed, returning 403');
            return res.status(403).json({
                success: false,
                error: 'Email domain not allowed in test environment'
            });
        }
        console.log('Email domain check passed - proceeding to send email');

        console.log('Validation passed, calling EmailService.sendReassignmentNotification');
        const result = await EmailService.sendReassignmentNotification(
            to,
            taskData,
            reassignmentType,
            reassignedBy,
            reassignmentTime ? new Date(reassignmentTime) : new Date(),
            userTimezone
        );

        console.log('EmailService.sendReassignmentNotification result:', result);
        console.log('Sending success response');

        res.status(200).json({
            success: true,
            message: 'Test reassignment email sent successfully',
            accepted: true,
            statusCode: 202, // SendGrid typically returns 202 for accepted
            requestId: 'reassignment-email-sent' // Since sendReassignmentNotification doesn't return headers like sendTestEmail
        });
    } catch (error) {
        console.log('Error in sendTestReassignmentEmail:', error.message);
        console.log('Error stack:', error.stack);
        console.error('Error sending test reassignment email:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};
