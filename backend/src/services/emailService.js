const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY); 

class EmailService {
    //  method parameters:
    // - userEmail: The recipient's email address
    // - taskData: Object containing task details (title, dueDate, description, notes, id)
    // - hoursLeft: Number of hours remaining until deadline
    // - minutesLeft: Number of minutes remaining until deadline (after subtracting full hours)
    // - userTimezone: User's timezone string (e.g., 'America/New_York') for localized deadline display
    static async sendDeadlineReminder(userEmail, taskData, hoursLeft, minutesLeft, userTimezone) {
        const subject = `Deadline Reminder: ${taskData.title}`;
        
        // Convert Firestore timestamps to user's timezone
        const deadline = new Date(taskData.dueDate.toDate());
        const userDeadline = new Intl.DateTimeFormat('en-US', {
            timeZone: userTimezone,
            dateStyle: 'full',
            timeStyle: 'short'
        }).format(deadline);
        
        // email body
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Task Deadline Reminder</h2>
                <p><strong>Task:</strong> ${taskData.title}</p>
                <p><strong>Time Remaining:</strong> ${hoursLeft} hours and ${minutesLeft} minutes</p>
                <p><strong>Deadline:</strong> ${userDeadline}</p>
                ${taskData.description ? `<p><strong>Description:</strong> ${taskData.description}</p>` : ''}
                ${taskData.notes ? `<p><strong>Notes:</strong> ${taskData.notes}</p>` : ''}
                <p><a href="${process.env.FRONTEND_URL}/tasks/${taskData.id}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Task</a></p>
            </div>
        `;

        // to construct the email message obj
        const msg = {
            to: userEmail,
            from: process.env.SENDGRID_FROM_EMAIL, // Verified sender email
            subject: subject,
            html: html
        };

        try {
            await sgMail.send(msg);
            console.log(`Email sent to ${userEmail} for task ${taskData.title}`);
        } catch (error) {
            console.error('Email send error:', error);
            throw error;
        }
    }

    //  method parameters:
    // - userEmail: The recipient's email address
    // - taskData: Object containing task details (title, dueDate, description, priority, id)
    // - reassignmentType: 'assigned' or 'removed'
    // - reassignedBy: Name of the person who made the reassignment
    // - reassignmentTime: Timestamp when reassignment occurred
    // - userTimezone: User's timezone string (e.g., 'America/New_York') for localized timestamp display
    static async sendReassignmentNotification(userEmail, taskData, reassignmentType, reassignedBy, reassignmentTime, userTimezone) {
        const subject = `Task Reassignment: ${taskData.title}`;

        // Convert Firestore timestamps to user's timezone
        const dueDate = new Date(taskData.dueDate.toDate());
        const userDueDate = new Intl.DateTimeFormat('en-US', {
            timeZone: userTimezone,
            dateStyle: 'full',
            timeStyle: 'short'
        }).format(dueDate);

        const reassignmentDateTime = new Date(reassignmentTime.toDate());
        const userReassignmentTime = new Intl.DateTimeFormat('en-US', {
            timeZone: userTimezone,
            dateStyle: 'full',
            timeStyle: 'short'
        }).format(reassignmentDateTime);

        // Determine action text
        const actionText = reassignmentType === 'assigned' ? 'assigned to' : 'removed from';

        // email body
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Task Reassignment Notification</h2>
                <p><strong>Task:</strong> ${taskData.title}</p>
                <p><strong>Action:</strong> You have been ${actionText} this task</p>
                <p><strong>Reassigned by:</strong> ${reassignedBy}</p>
                <p><strong>Reassignment Time:</strong> ${userReassignmentTime}</p>
                <p><strong>Priority:</strong> ${taskData.priority || 'Not specified'}</p>
                <p><strong>Due Date:</strong> ${userDueDate}</p>
                ${taskData.description ? `<p><strong>Description:</strong> ${taskData.description}</p>` : ''}
                <p><a href="${process.env.FRONTEND_URL}/tasks/${taskData.id}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Task</a></p>
            </div>
        `;

        // to construct the email message obj
        const msg = {
            to: userEmail,
            from: process.env.SENDGRID_FROM_EMAIL, // Verified sender email
            subject: subject,
            html: html
        };

        try {
            await sgMail.send(msg);
            console.log(`Reassignment email sent to ${userEmail} for task ${taskData.title} (${reassignmentType})`);
        } catch (error) {
            console.error('Reassignment email send error:', error);
            throw error;
        }
    }
}

module.exports = EmailService;
