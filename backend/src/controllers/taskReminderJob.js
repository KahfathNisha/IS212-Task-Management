const cron = require('node-cron');
const { db, admin } = require('../config/firebase');
const NotificationService = require('../services/notificationService');

async function processDeadlineReminders(now) {
    try {
        // Get all users with notifications enabled
        const usersSnapshot = await db.collection("Users")
            .where("notificationSettings.emailEnabled", "==", true)
            .get();

        if (usersSnapshot.empty) {
            console.log('No users with email notifications enabled');
            return;
        }

        for (const userDoc of usersSnapshot.docs) {
            const userData = userDoc.data();
            const userId = userDoc.id;
            const settings = userData.notificationSettings || {};

            // Get tasks assigned to this user (only active, non-archived tasks)
            const tasksSnapshot = await db.collection("tasks")
                .where("assigneeId", "==", userId)
                .where("archived", "==", false)
                .get();

            if (tasksSnapshot.empty) {
                continue; // No tasks for this user
            }

            for (const taskDoc of tasksSnapshot.docs) {
                const taskData = taskDoc.data();
                const dueDate = taskData.dueDate.toDate();
                const timeDiff = dueDate - now;
                const hoursUntilDue = timeDiff / (1000 * 60 * 60);
                const daysUntilDue = hoursUntilDue / 24;

                // Get reminder intervals based on user settings
                let reminderIntervals = [];
                if (settings.emailReminderType === 'custom' && settings.emailCustomReminders && settings.emailCustomReminders.length > 0) {
                    // Custom reminders are in hours
                    reminderIntervals = settings.emailCustomReminders.map(hours => hours / 24); // Convert to days
                } else {
                    // Default preset: 1, 3, 7 days
                    reminderIntervals = settings.emailPresetReminders || [1, 3, 7];
                }

                // Check if we should send reminder at any of the configured intervals
                // OR if task is due within 24 hours (lead time processing)
                const shouldSendReminder = reminderIntervals.some(interval => Math.abs(daysUntilDue - interval) < 0.5) // Allow tolerance for timing (0.5 days = 12 hours)
                    || (hoursUntilDue <= 24 && hoursUntilDue > 0); // Lead time: send for tasks due within 24 hours

                if (shouldSendReminder && hoursUntilDue > 0) {
                    // Check if we already sent a reminder for this specific interval
                    // For deadline adjustments, we need to check if a reminder was sent for the SAME interval
                    // to prevent duplicates but allow different intervals
                    const lastReminderQuery = await db.collection("emailReminders")
                        .where("userId", "==", userId)
                        .where("taskId", "==", taskDoc.id)
                        .where("daysLeft", "==", Math.round(daysUntilDue))
                        .orderBy("sentAt", "desc")
                        .limit(1)
                        .get();

                    // Only send if no reminder exists for this specific task/user/daysLeft combination
                    // This prevents duplicates for the same interval but allows reminders for different intervals
                    if (lastReminderQuery.empty) {
                        const hoursLeft = Math.floor(hoursUntilDue);
                        const minutesLeft = Math.floor((hoursUntilDue - hoursLeft) * 60);
                        const daysLeft = Math.round(daysUntilDue);

                        try {
                            // Create unified notification (database + push + email)
                            const notificationData = {
                                title: `Task Deadline Reminder`,
                                body: `Your task "${taskData.title}" is due in ${daysLeft} day${daysLeft === 1 ? '' : 's'}!`,
                                taskId: taskDoc.id,
                                type: 'warning'
                            };

                            // For tasks due in less than 1 day, show hours instead
                            if (daysLeft === 0) {
                                const hoursLeft = Math.floor(hoursUntilDue);
                                const minutesLeft = Math.floor((hoursUntilDue - hoursLeft) * 60);
                                notificationData.body = `Your task "${taskData.title}" is due in ${hoursLeft} hour${hoursLeft === 1 ? '' : 's'} and ${minutesLeft} minute${minutesLeft === 1 ? '' : 's'}!`;
                            }

                            await NotificationService.sendNotification(userId, notificationData, {
                                sendPush: settings.pushEnabled !== false, // Default to true
                                sendEmail: true,
                                taskData: { ...taskData, id: taskDoc.id },
                                hoursLeft,
                                minutesLeft,
                                userTimezone: userData.timezone || 'UTC'
                            });

                            // Record the reminder for duplicate prevention
                            await db.collection("emailReminders").add({
                                userId,
                                taskId: taskDoc.id,
                                sentAt: admin.firestore.Timestamp.now(),
                                hoursLeft,
                                minutesLeft,
                                daysLeft
                            });

                        } catch (error) {
                            console.error(`Failed to send deadline reminder for task ${taskDoc.id}:`, error);
                        }
                    }
                }
            }
        }
    } catch (error) {
        console.error('Error in processDeadlineReminders:', error);
        // Don't rethrow - let the cron job continue
    }
}

if (!global.reminderJobStarted) {

    global.reminderJobStarted = true; // Mark as started
    console.log('[ReminderJob] Cron job starting...');

    // Schedule the job to run every minute
    cron.schedule("* * * * *", async () => {
        try {
            const now = new Date();
            console.log(`[ReminderJob] Checking reminders at ${now.toISOString()}`);

            // Check for deadline reminders
            await processDeadlineReminders(now);

            const snapshot = await db
                .collection("reminders")
                .where("reminderTime", "<=", now)
                .where("sent", "==", false)
                .get();

            if (snapshot.empty) {
                console.log("[ReminderJob] No due reminders found.");
                return;
            }

            // Process each reminder sequentially to avoid race conditions
            for (const doc of snapshot.docs) {
                const reminder = doc.data();
                console.log(`[ReminderJob] Reminder due → Task: ${reminder.taskId}, User: ${reminder.userId}`);

                // Mark as sent immediately to prevent duplicates
                await doc.ref.update({ sent: true, sentAt: now });

                // Fetch user document
                const userDoc = await db.collection("Users").doc(reminder.userId).get();
                if (!userDoc.exists || !userDoc.data().fcmToken) {
                    console.log(`[ReminderJob] User ${reminder.userId} has no FCM token`);
                    continue;
                }

                let tokens = userDoc.data().fcmToken;
                if (!Array.isArray(tokens)) tokens = [tokens];

                // Calculate days remaining
                const dueDate = reminder.dueDate.toDate();
                const diffTime = dueDate - now;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                const dayText = diffDays === 1 ? '1 day' : `${diffDays} days`;

                const messageBody = `Your task "${reminder.taskTitle}" is due in ${dayText}!`;

                // Send notifications
                const chunkSize = 500;
                for (let i = 0; i < tokens.length; i += chunkSize) {
                    const tokenChunk = tokens.slice(i, i + chunkSize);
                    
                    const sendPromises = tokenChunk.map(token => 
                        admin.messaging().send({
                            token: token,
                            notification: {
                                title: 'Reminder',
                                body: messageBody
                            }
                        }).catch(err => {
                            console.error(`[ReminderJob] Failed to send to token: ${err.message}`);
                            return { success: false };
                        })
                    );
                    
                    const results = await Promise.all(sendPromises);
                    const successCount = results.filter(r => r.success !== false).length;
                    console.log(`[ReminderJob] Sent ${successCount}/${tokenChunk.length} notifications for user ${reminder.userId}`);
                }
            }

            console.log(`[ReminderJob] Processed ${snapshot.size} reminders`);

        } catch (err) {
            console.error("[ReminderJob] Error:", err.message);
        }
    });
}


// if (!global.reminderJobStarted) {

//     global.reminderJobStarted = true; // Mark as started

//     console.log('[ReminderJob] Cron job starting...');

//     // Schedule the job to run every minute
//     cron.schedule("* * * * *", async () => {
//         try {
//             const now = new Date();
//             console.log(`[ReminderJob] Checking reminders at ${now.toISOString()}`);

//             const snapshot = await db
//                 .collection("reminders")
//                 .where("reminderTime", "<=", now)
//                 .where("sent", "==", false)
//                 .get();

//             if (snapshot.empty) {
//                 console.log("[ReminderJob] No due reminders found.");
//                 return;
//             }

//             const batch = db.batch();

//             // Use Promise.all to handle multiple reminders in parallel
//             await Promise.all(snapshot.docs.map(async (doc) => {
//                 const reminder = doc.data();

//                 console.log(`[ReminderJob] Reminder due → Task: ${reminder.taskId}, User: ${reminder.userId}`);

//                 // Lookup user device token: email (eg. john.doe@company.com)
//                 const userDoc = await db.collection("Users").doc(reminder.userId).get();
//                 const userToken = userDoc.exists ? userDoc.data().fcmToken : null;

//                 if (userToken) {
//                     // Calculate days remaining
//                     const dueDate = reminder.dueDate.toDate();
//                     const nowDate = new Date();
//                     const diffTime = dueDate - nowDate;
//                     const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

//                     // Dynamic notification message
//                     const dayText = diffDays === 1 ? '1 day' : `${diffDays} days`;
//                     const messageBody = `Your task "${reminder.taskTitle}" is due in ${dayText}!`;

//                     // Send Firebase Cloud Messaging (FCM) notification --> recommended if you want reminders even when the user isn't on your page
                    
//                     await admin.messaging().sendMulticast({
//                         tokens: [token1, token2],
//                         notification: {
//                             title: 'Reminder',
//                             body: messageBody,
//                         }
//                     });


//                     console.log(`[ReminderJob] Notification sent to ${reminder.userId}`);
//                 } else {
//                     console.log(`[ReminderJob] User ${reminder.userId} has no FCM token`);
//                 }

//                 // Mark reminder as sent
//                 batch.update(doc.ref, { sent: true, sentAt: now });
//             }));

//             await batch.commit();
//             console.log(`[ReminderJob] Processed ${snapshot.size} reminders`);
//         } catch (err) {
//             console.error("[ReminderJob] Error:", err.message);
//         }
//     });

// Export for testing purposes
module.exports = {
    processDeadlineReminders
};
// }