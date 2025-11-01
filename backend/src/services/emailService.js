const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Valid timezone check function
function isValidTimezone(timezone) {
    try {
        new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format(new Date());
        return true;
    } catch (error) {
        return false;
    }
}

class EmailService {
    // Helper method for email validation
    static validateEmail(email) {
        if (!email || typeof email !== 'string') {
            console.warn('Invalid email address: Email is required and must be a string');
            return null;
        }
        const trimmedEmail = email.trim();
        if (!EMAIL_REGEX.test(trimmedEmail)) {
            console.warn('Invalid email address format:', trimmedEmail);
            return null;
        }
        return trimmedEmail.toLowerCase();
    }

    // Helper method for timezone validation with fallback
    static validateTimezone(timezone) {
        if (!timezone || typeof timezone !== 'string') {
            return 'UTC';
        }
        const cleanTimezone = timezone.trim();
        if (isValidTimezone(cleanTimezone)) {
            return cleanTimezone;
        }
        console.warn(`Invalid timezone provided: ${cleanTimezone}, falling back to UTC`);
        return 'UTC';
    }

    // Helper method for safe date handling
    static handleDateConversion(dateField, fallbackMessage = 'Date not available') {
        if (!dateField || !dateField.toDate) {
            return { date: null, formatted: fallbackMessage };
        }
        try {
            const date = new Date(dateField.toDate());
            return { date, formatted: date.toISOString() };
        } catch (error) {
            console.warn('Failed to convert date:', error);
            return { date: null, formatted: fallbackMessage };
        }
    }

    // Helper method for task data validation
    static validateTaskData(taskData, methodName) {
        if (!taskData) {
            throw new Error(`Invalid task data: taskData is required for ${methodName}`);
        }
        if (!taskData.title || typeof taskData.title !== 'string') {
            throw new Error(`Invalid task data: taskData.title is required and must be a string for ${methodName}`);
        }
        return taskData;
    }

    //  method parameters:
    // - userEmail: The recipient's email address
    // - taskData: Object containing task details (title, dueDate, description, notes, id)
    // - hoursLeft: Number of hours remaining until deadline
    // - minutesLeft: Number of minutes remaining until deadline (after subtracting full hours)
    // - userTimezone: User's timezone string (e.g., 'America/New_York') for localized deadline display
    static async sendDeadlineReminder(userEmail, taskData, hoursLeft, minutesLeft, userTimezone) {
        // Validate inputs
        let emailValidationError = null;
        const validatedTaskData = this.validateTaskData(taskData, 'sendDeadlineReminder');
        const validatedTimezone = this.validateTimezone(userTimezone);

        // Check email validity but don't throw yet
        const emailCheck = this.validateEmail(userEmail);
        if (!emailCheck) {
            emailValidationError = new Error('Invalid email address provided');
        }

        const subject = `Deadline Reminder: ${validatedTaskData.title}`;
        
        // Handle date conversion safely
        const { date: deadline, formatted: formattedDeadline } = this.handleDateConversion(
            validatedTaskData.dueDate,
            'Deadline not specified'
        );
        
        // Format deadline in user's timezone if valid
        let userDeadline = formattedDeadline;
        if (deadline && validatedTimezone !== 'UTC') {
            try {
                userDeadline = new Intl.DateTimeFormat('en-US', {
                    timeZone: validatedTimezone,
                    dateStyle: 'full',
                    timeStyle: 'short'
                }).format(deadline);
            } catch (error) {
                console.warn('Failed to format deadline in timezone:', error);
                userDeadline = formattedDeadline;
            }
        }
        
        // email body
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Task Deadline Reminder</h2>
                <p><strong>Task:</strong> ${validatedTaskData.title}</p>
                <p><strong>Time Remaining:</strong> ${hoursLeft} hours and ${minutesLeft} minutes</p>
                <p><strong>Deadline:</strong> ${userDeadline}</p>
                ${validatedTaskData.description ? `<p><strong>Description:</strong> ${validatedTaskData.description}</p>` : ''}
                ${validatedTaskData.notes ? `<p><strong>Notes:</strong> ${validatedTaskData.notes}</p>` : ''}
                ${validatedTaskData.id ? `<p><a href="${process.env.FRONTEND_URL}/tasks/${validatedTaskData.id}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Task</a></p>` : ''}
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
            console.log(`Email sent to ${userEmail} for task ${validatedTaskData.title}`);
        } catch (error) {
            console.error('Email send error:', error);
            // If there was an email validation error, throw that; otherwise throw the send error
            if (emailValidationError) {
                throw emailValidationError;
            }
            throw error;
        }

        // If email validation failed but send succeeded, throw the validation error
        if (emailValidationError) {
            throw emailValidationError;
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
        // Validate inputs
        let emailValidationError = null;
        const validatedTaskData = this.validateTaskData(taskData, 'sendReassignmentNotification');
        const validatedTimezone = this.validateTimezone(userTimezone);

        // Check email validity but don't throw yet
        const emailCheck = this.validateEmail(userEmail);
        if (!emailCheck) {
            emailValidationError = new Error('Invalid email address provided');
        }

        // Validate reassignment type
        if (!reassignmentType || !['assigned', 'removed'].includes(reassignmentType)) {
            throw new Error('Invalid reassignment type: Must be "assigned" or "removed"');
        }

        // Validate reassignedBy
        if (!reassignedBy || typeof reassignedBy !== 'string') {
            throw new Error('Invalid reassignedBy: Must be a non-empty string');
        }

        const subject = `Task Reassignment: ${validatedTaskData.title}`;

        // Handle date conversions safely
        const { date: dueDate, formatted: formattedDueDate } = this.handleDateConversion(
            validatedTaskData.dueDate,
            'Due date not specified'
        );
        
        const { date: reassignmentDateTime, formatted: formattedReassignmentTime } = this.handleDateConversion(
            reassignmentTime,
            'Reassignment time not available'
        );

        // Format dates in user's timezone if valid
        let userDueDate = formattedDueDate;
        let userReassignmentTime = formattedReassignmentTime;

        if (dueDate && validatedTimezone !== 'UTC') {
            try {
                userDueDate = new Intl.DateTimeFormat('en-US', {
                    timeZone: validatedTimezone,
                    dateStyle: 'full',
                    timeStyle: 'short'
                }).format(dueDate);
            } catch (error) {
                console.warn('Failed to format due date in timezone:', error);
                userDueDate = formattedDueDate;
            }
        }

        if (reassignmentDateTime && validatedTimezone !== 'UTC') {
            try {
                userReassignmentTime = new Intl.DateTimeFormat('en-US', {
                    timeZone: validatedTimezone,
                    dateStyle: 'full',
                    timeStyle: 'short'
                }).format(reassignmentDateTime);
            } catch (error) {
                console.warn('Failed to format reassignment time in timezone:', error);
                userReassignmentTime = formattedReassignmentTime;
            }
        }

        // Determine action text
        const actionText = reassignmentType === 'assigned' ? 'assigned to' : 'removed from';

        // email body
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Task Reassignment Notification</h2>
                <p><strong>Task:</strong> ${validatedTaskData.title}</p>
                <p><strong>Action:</strong> You have been ${actionText} this task</p>
                <p><strong>Reassigned by:</strong> ${reassignedBy}</p>
                <p><strong>Reassignment Time:</strong> ${userReassignmentTime}</p>
                <p><strong>Priority:</strong> ${validatedTaskData.priority || 'Not specified'}</p>
                <p><strong>Due Date:</strong> ${userDueDate}</p>
                ${validatedTaskData.description ? `<p><strong>Description:</strong> ${validatedTaskData.description}</p>` : ''}
                ${validatedTaskData.id ? `<p><a href="${process.env.FRONTEND_URL}/tasks/${validatedTaskData.id}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Task</a></p>` : ''}
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
            console.log(`Reassignment email sent to ${userEmail} for task ${validatedTaskData.title} (${reassignmentType})`);
        } catch (error) {
            console.error('Reassignment email send error:', error);
            // If there was an email validation error, throw that; otherwise throw the send error
            if (emailValidationError) {
                throw emailValidationError;
            }
            throw error;
        }

        // If email validation failed but send succeeded, throw the validation error
        if (emailValidationError) {
            throw emailValidationError;
        }
    }
}

module.exports = EmailService;
