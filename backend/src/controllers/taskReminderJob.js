const cron = require('node-cron');
const NotificationService = require('../services/notificationService');

/**
 * Task Reminder Cron Job
 * Runs every minute to check for tasks due soon and send deadline reminders
 */
if (!global.reminderJobStarted) {
    global.reminderJobStarted = true; // Mark as started
    console.log('[ReminderJob] Cron job starting...');

    // Schedule the job to run every minute
    cron.schedule("* * * * *", async () => {
        try {
            const now = new Date();
            console.log(`[ReminderJob] Checking reminders at ${now.toISOString()}`);

            // Process deadline reminders (query-based approach)
            await NotificationService.processDeadlineReminders(now);

            console.log(`[ReminderJob] Completed reminder check`);
        } catch (err) {
            console.error("[ReminderJob] Error:", err.message);
        }
    });
}
// }