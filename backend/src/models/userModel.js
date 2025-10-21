
// Note: Email serves as the Firestore document ID, so it's not stored as a field
// User documents are accessed as: db.collection('users').doc(email)

const userModel = {
    // Core user information
    name: "",           // User's display name (can be empty initially)
    role: "staff",      // Default role, can be 'staff' or other roles
    
    // Security and authentication fields
    failedAttempts: 0,          // Number of failed login attempts
    lockedUntil: null,          // Timestamp when account is locked until
    lastLogin: null,            // Timestamp of last successful login
    lastFailedAttempt: null,    // Timestamp of last failed login attempt
    passwordResetAt: null,      // Timestamp of last password reset
    
    // Password reset security fields
    securityQuestion: "",       // Question for password reset verification
    securityAnswer: "",         // Answer to security question
    
    // Notification and communication fields
    fcmToken: null,             // Firebase Cloud Messaging token for push notifications
    timezone: "UTC",            // User's timezone preference for email notifications
    
    // Notification settings object (includes both in-app and email preferences)
    notificationSettings: {
        // In-app notification preferences
        TASK_UPDATE: true,                    // Notifications for task updates
        TASK_REASSIGNMENT_ADD: true,          // Notifications when assigned to tasks
        TASK_REASSIGNMENT_REMOVE: true,       // Notifications when removed from tasks
        
        // Email notification preferences (for deadline reminders)
        emailEnabled: true,                   // Master toggle for email notifications
        emailLeadTime: 24,                    // Hours before deadline to start sending emails
        emailFrequency: 6,                    // Hours between reminder emails in final period
        pushEnabled: true                     // Toggle for push notifications
    },
    
    // Timestamps
    createdAt: null            // When the user account was created
};

// Remove undefined fields (Firestore doesn't allow them)
Object.keys(userModel).forEach(key => {
    if (userModel[key] === undefined) {
        delete userModel[key];
    }
});

module.exports = userModel;
