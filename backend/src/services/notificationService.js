const { db, admin } = require('../config/firebase');
const EmailService = require('./emailService');

class NotificationService {
    /**
     * Create a notification in the database for frontend consumption
     */
    static async createNotification(userId, notificationData) {
        try {
            const notification = {
                ...notificationData,
                userId,
                isRead: false,
                createdAt: admin.firestore.Timestamp.now(),
                type: notificationData.type || 'info' // 'info', 'warning', 'error', 'success'
            };

            const docRef = await db.collection('Users').doc(userId).collection('notifications').add(notification);
            console.log(`📢 [NotificationService] Created notification for user ${userId}:`);
            console.log(`   Title: ${notification.title}`);
            console.log(`   Body: ${notification.body}`);
            console.log(`   Type: ${notification.type}`);
            console.log(`   TaskId: ${notification.taskId || 'N/A'}`);
            console.log(`   NotificationId: ${docRef.id}`);
            return docRef.id;
        } catch (error) {
            console.error('❌ [NotificationService] Error creating notification:', error);
            throw error;
        }
    }

    /**
     * Send push notification via FCM
     */
    static async sendPushNotification(userId, title, body, data = {}) {
        try {
            const userDoc = await db.collection('Users').doc(userId).get();
            if (!userDoc.exists) {
                console.log(`User ${userId} not found for push notification`);
                return false;
            }

            const userData = userDoc.data();
            const fcmToken = userData.fcmToken;
            
            if (!fcmToken) {
                console.log(`User ${userId} has no FCM token`);
                return false;
            }

            let tokens = Array.isArray(fcmToken) ? fcmToken : [fcmToken];
            
            // Send to all tokens
            const chunkSize = 500;
            let successCount = 0;
            
            for (let i = 0; i < tokens.length; i += chunkSize) {
                const tokenChunk = tokens.slice(i, i + chunkSize);
                
                const sendPromises = tokenChunk.map(token => 
                    admin.messaging().send({
                        token: token,
                        notification: { title, body },
                        data: { ...data, timestamp: Date.now().toString() }
                    }).catch(err => {
                        console.error(`Failed to send push notification to token: ${err.message}`);
                        return { success: false };
                    })
                );
                
                const results = await Promise.all(sendPromises);
                successCount += results.filter(r => r.success !== false).length;
            }

            console.log(`✅ Sent push notification to ${successCount}/${tokens.length} tokens for user ${userId}`);
            return successCount > 0;
        } catch (error) {
            console.error('Error sending push notification:', error);
            return false;
        }
    }

    /**
     * Send email notification
     */
    static async sendEmailNotification(userId, taskData, hoursLeft, minutesLeft, userTimezone) {
        try {
            const userDoc = await db.collection('Users').doc(userId).get();
            if (!userDoc.exists) {
                console.log(`User ${userId} not found for email notification`);
                return false;
            }

            const userData = userDoc.data();
            if (!userData.notificationSettings?.emailEnabled) {
                console.log(`Email notifications disabled for user ${userId}`);
                return false;
            }

            await EmailService.sendDeadlineReminder(
                userData.email || userId, // Use email field or userId as fallback
                taskData,
                hoursLeft,
                minutesLeft,
                userData.timezone || userTimezone || 'UTC'
            );

            console.log(`✅ Sent email notification to user ${userId}`);
            return true;
        } catch (error) {
            console.error('Error sending email notification:', error);
            return false;
        }
    }

    /**
     * Unified notification method - creates DB notification, sends push, and optionally email
     */
    static async sendNotification(userId, notificationData, options = {}) {
        const {
            sendPush = true,
            sendEmail = false,
            taskData = null,
            hoursLeft = 0,
            minutesLeft = 0,
            userTimezone = 'UTC'
        } = options;

        try {
            // 1. Create database notification for frontend
            const notificationId = await this.createNotification(userId, notificationData);

            // 2. Send push notification if enabled
            if (sendPush) {
                await this.sendPushNotification(
                    userId, 
                    notificationData.title, 
                    notificationData.body,
                    { notificationId, taskId: notificationData.taskId }
                );
            }

            // 3. Send email notification if enabled and task data provided
            if (sendEmail && taskData) {
                await this.sendEmailNotification(userId, taskData, hoursLeft, minutesLeft, userTimezone);
            }

            return notificationId;
        } catch (error) {
            console.error('Error in unified notification:', error);
            throw error;
        }
    }

    /**
     * Mark notification as read
     */
    static async markAsRead(userId, notificationId) {
        try {
            await db.collection('Users').doc(userId).collection('notifications').doc(notificationId).update({
                isRead: true,
                readAt: admin.firestore.Timestamp.now()
            });
            console.log(`✅ Marked notification ${notificationId} as read for user ${userId}`);
        } catch (error) {
            console.error('Error marking notification as read:', error);
            throw error;
        }
    }

    /**
     * Mark all notifications as read for a user
     */
    static async markAllAsRead(userId) {
        try {
            const notificationsSnapshot = await db.collection('Users').doc(userId).collection('notifications')
                .where('isRead', '==', false)
                .get();

            const batch = db.batch();
            notificationsSnapshot.docs.forEach(doc => {
                batch.update(doc.ref, {
                    isRead: true,
                    readAt: admin.firestore.Timestamp.now()
                });
            });

            await batch.commit();
            console.log(`✅ Marked ${notificationsSnapshot.size} notifications as read for user ${userId}`);
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
            throw error;
        }
    }

    /**
     * Get user's notifications
     */
    static async getUserNotifications(userId, limit = 50, startAfter = null) {
        try {
            let query = db.collection('Users').doc(userId).collection('notifications')
                .orderBy('createdAt', 'desc')
                .limit(limit);

            if (startAfter) {
                query = query.startAfter(startAfter);
            }

            const snapshot = await query.get();
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
                readAt: doc.data().readAt?.toDate?.()?.toISOString() || null
            }));
        } catch (error) {
            console.error('Error getting user notifications:', error);
            throw error;
        }
    }

    /**
     * Delete old notifications (cleanup)
     */
    static async cleanupOldNotifications(userId, daysOld = 30) {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysOld);
            const cutoffTimestamp = admin.firestore.Timestamp.fromDate(cutoffDate);

            const oldNotificationsSnapshot = await db.collection('Users').doc(userId).collection('notifications')
                .where('createdAt', '<', cutoffTimestamp)
                .get();

            const batch = db.batch();
            oldNotificationsSnapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });

            await batch.commit();
            console.log(`✅ Cleaned up ${oldNotificationsSnapshot.size} old notifications for user ${userId}`);
        } catch (error) {
            console.error('Error cleaning up old notifications:', error);
            throw error;
        }
    }
}

module.exports = NotificationService;
