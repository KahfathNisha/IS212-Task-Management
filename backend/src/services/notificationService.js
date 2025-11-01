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
     * Unified notification method - creates DB notification and optionally email
     */
    static async sendNotification(userId, notificationData, options = {}) {
        const {
            sendEmail = false,
            taskData = null,
            hoursLeft = 0,
            minutesLeft = 0,
            userTimezone = 'UTC'
        } = options;

        try {
            // 1. Create database notification for frontend
            const notificationId = await this.createNotification(userId, notificationData);

            // 2. Send email notification if enabled and task data provided
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

    /**
     * Process deadline reminders for all users (called by cron job)
     * Queries tasks and sends reminders based on user settings
     */
    static async processDeadlineReminders(now) {
        try {
            // Get all users with email notifications enabled
            const usersSnapshot = await db.collection("Users")
                .where("notificationSettings.emailEnabled", "==", true)
                .get();

            console.log(`📅 [DeadlineReminders] Processing reminders for ${usersSnapshot.size} users`);

            for (const userDoc of usersSnapshot.docs) {
                const userData = userDoc.data();
                const userId = userDoc.id;
                const settings = userData.notificationSettings || {};
                
                // Get tasks assigned to this user that are not archived
                const tasksSnapshot = await db.collection("tasks")
                    .where("assigneeId", "==", userId)
                    .where("archived", "==", false)
                    .get();

                for (const taskDoc of tasksSnapshot.docs) {
                    const taskData = taskDoc.data();
                    
                    // Skip if no due date
                    if (!taskData.dueDate) continue;
                    
                    const dueDate = taskData.dueDate.toDate();
                    const timeDiff = dueDate - now;
                    const hoursUntilDue = timeDiff / (1000 * 60 * 60);
                    const daysUntilDue = hoursUntilDue / 24;

                    // Get reminder intervals based on user settings
                    let reminderIntervals = [];
                    if (settings.emailReminderType === 'custom' && settings.emailCustomReminders && settings.emailCustomReminders.length > 0) {
                        // Custom reminders are in hours - convert to days
                        reminderIntervals = settings.emailCustomReminders.map(hours => hours / 24);
                    } else {
                        // Default preset: 1, 3, 7 days
                        reminderIntervals = settings.emailPresetReminders || [1, 3, 7];
                    }

                    // Check if we should send reminder at any of the configured intervals
                    // Allow small tolerance (0.1 days = ~2.4 hours) for timing
                    const shouldSendReminder = reminderIntervals.some(interval => 
                        Math.abs(daysUntilDue - interval) < 0.1 && daysUntilDue > 0
                    );

                    if (shouldSendReminder) {
                        const daysLeft = Math.round(daysUntilDue);
                        
                        // Check if we already sent a reminder today for this task
                        // Look for existing notifications with same taskId and similar message
                        const today = new Date(now);
                        today.setHours(0, 0, 0, 0);
                        const todayTimestamp = admin.firestore.Timestamp.fromDate(today);
                        
                        const existingReminders = await db.collection('Users').doc(userId)
                            .collection('notifications')
                            .where('taskId', '==', taskDoc.id)
                            .where('createdAt', '>=', todayTimestamp)
                            .where('title', '==', 'Task Deadline Reminder')
                            .get();

                        // Only send if we haven't sent one today for this task
                        if (existingReminders.empty) {
                            const hoursLeft = Math.floor(hoursUntilDue);
                            const minutesLeft = Math.floor((hoursUntilDue - hoursLeft) * 60);

                            try {
                                // Create unified notification (database + email)
                                const notificationData = {
                                    title: `Task Deadline Reminder`,
                                    body: `Your task "${taskData.title}" is due in ${daysLeft} day${daysLeft === 1 ? '' : 's'}!`,
                                    taskId: taskDoc.id,
                                    type: 'warning'
                                };

                                await this.sendNotification(userId, notificationData, {
                                    sendEmail: true,
                                    taskData: { ...taskData, id: taskDoc.id },
                                    hoursLeft,
                                    minutesLeft,
                                    userTimezone: userData.timezone || 'UTC'
                                });

                                console.log(`✅ [DeadlineReminders] Sent reminder for task "${taskData.title}" to user ${userId} (${daysLeft} days left)`);
                            } catch (error) {
                                console.error(`❌ [DeadlineReminders] Failed to send reminder for task ${taskDoc.id}:`, error);
                            }
                        }
                    }
                }
            }
        } catch (error) {
            console.error('❌ [DeadlineReminders] Error processing reminders:', error);
            throw error;
        }
    }
}

module.exports = NotificationService;
