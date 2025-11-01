const cron = require('node-cron');
const NotificationService = require('../services/notificationService');

/**
 * Process deadline reminders for all users
 * This function can be called directly for testing or by the cron job
 * @param {Date} now - Current date/time to check against
 */
async function processDeadlineReminders(now = new Date()) {
    console.log(`[ReminderJob] Processing reminders at ${now.toISOString()}`);
    
    try {
        // Process deadline reminders using NotificationService
        await NotificationService.processDeadlineReminders(now);
        
        console.log(`[ReminderJob] Completed reminder check`);
    } catch (err) {
        console.error("[ReminderJob] Error in processDeadlineReminders:", err.message);
        throw err; // Re-throw to allow proper error handling in tests
    }
}

/**
 * Task Reminder Cron Job
 * Runs every minute to check for tasks due soon and send deadline reminders
 */
if (!global.reminderJobStarted) {
    global.reminderJobStarted = true; // Mark as started
    console.log('[ReminderJob] Cron job starting...');

    // Schedule the job to run every minute
    cron.schedule("* * * * *", async () => {
        await processDeadlineReminders(new Date());
    });
}

// Export the function for testing
module.exports = {
    processDeadlineReminders
};