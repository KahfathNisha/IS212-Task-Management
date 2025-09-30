const cron = require('node-cron');
const { db, admin } = require('../config/firebase');

if (!global.reminderJobStarted) {

    global.reminderJobStarted = true; // Mark as started
    console.log('[ReminderJob] Cron job starting...');

    // Schedule the job to run every minute
    cron.schedule("* * * * *", async () => {
        try {
            const now = new Date();
            console.log(`[ReminderJob] Checking reminders at ${now.toISOString()}`);

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
                const userDoc = await db.collection("users").doc(reminder.userId).get();
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
//                 const userDoc = await db.collection("users").doc(reminder.userId).get();
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

//                     // Send Firebase Cloud Messaging (FCM) notification --> recommended if you want reminders even when the user isn’t on your page
                    
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
// }