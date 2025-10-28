# Unified Notification System Guide

## Overview

The notification system has been completely refactored to provide a unified, consistent experience across all notification types. This system combines deadline reminders, task updates, and other notifications into a single, cohesive system.

## Architecture

### Backend Components

1. **NotificationService** (`backend/src/services/notificationService.js`)
   - Central service for all notification operations
   - Handles database notifications, push notifications, and email notifications
   - Provides unified API for creating, reading, and managing notifications

2. **NotificationController** (`backend/src/controllers/notificationController.js`)
   - REST API endpoints for notification management
   - Handles CRUD operations on notifications
   - Provides statistics and cleanup functionality

3. **NotificationRouter** (`backend/src/routes/notificationRouter.js`)
   - Express router for notification endpoints
   - Protected by authentication middleware

4. **Updated TaskReminderJob** (`backend/src/controllers/taskReminderJob.js`)
   - Now uses the unified NotificationService
   - Creates database notifications for frontend consumption
   - Sends both push and email notifications based on user preferences

### Frontend Components

1. **Updated NotificationService** (`frontend/src/services/notification-service.js`)
   - Uses backend API instead of direct Firestore access
   - Provides functions for fetching, marking as read, and managing notifications
   - Maintains real-time listeners for new notifications

2. **Enhanced NotificationHistory** (`frontend/src/views/NotificationHistory.vue`)
   - Displays notifications with proper styling and icons
   - Allows marking individual or all notifications as read
   - Shows notification types with appropriate colors and icons

3. **NotificationStore** (`frontend/src/stores/notificationStore.js`)
   - Manages notification queue for popup display
   - Handles notification dismissal and cleanup

## Key Features

### Unified Notification Types
- **Info**: General information (blue icon)
- **Warning**: Deadline reminders (orange icon)
- **Error**: Error messages (red icon)
- **Success**: Success messages (green icon)

### Notification Channels
1. **Database Notifications**: Stored in Firestore for persistence and history
2. **Push Notifications**: Real-time FCM notifications
3. **Email Notifications**: Email reminders for deadlines

### User Preferences
- Email notifications can be enabled/disabled
- Push notifications can be enabled/disabled
- Custom reminder intervals (1, 3, 7 days or custom hours)
- Timezone support for email notifications

## API Endpoints

### GET `/api/notifications`
- Fetch user notifications
- Query parameters: `limit`, `startAfter`
- Returns paginated list of notifications

### PUT `/api/notifications/:id/read`
- Mark specific notification as read
- Updates `isRead` field and `readAt` timestamp

### PUT `/api/notifications/read-all`
- Mark all notifications as read
- Batch operation for efficiency

### DELETE `/api/notifications/:id`
- Delete specific notification
- Removes from database

### GET `/api/notifications/stats`
- Get notification statistics
- Returns total, unread, and read counts

### POST `/api/notifications/cleanup`
- Clean up old notifications
- Body parameter: `daysOld` (default: 30)

## Usage Examples

### Backend - Creating Notifications

```javascript
const NotificationService = require('./services/notificationService');

// Simple database notification
await NotificationService.createNotification('user@example.com', {
    title: 'Task Updated',
    body: 'Your task has been modified',
    taskId: 'task-123',
    type: 'info'
});

// Unified notification (database + push + email)
await NotificationService.sendNotification('user@example.com', {
    title: 'Deadline Reminder',
    body: 'Your task is due tomorrow!',
    taskId: 'task-123',
    type: 'warning'
}, {
    sendPush: true,
    sendEmail: true,
    taskData: taskData,
    hoursLeft: 24,
    minutesLeft: 0,
    userTimezone: 'America/New_York'
});
```

### Frontend - Managing Notifications

```javascript
import { 
    fetchNotifications, 
    markNotificationAsRead, 
    markAllNotificationsAsRead 
} from '@/services/notification-service';

// Fetch notifications
const notifications = await fetchNotifications(50);

// Mark as read
await markNotificationAsRead('notification-id');

// Mark all as read
await markAllNotificationsAsRead();
```

## Migration from Old System

### What Changed
1. **Unified Backend**: All notifications now go through NotificationService
2. **Database Storage**: Notifications are stored in `users/{userId}/notifications` collection
3. **API Integration**: Frontend uses REST API instead of direct Firestore access
4. **Consistent Format**: All notifications follow the same structure

### Benefits
1. **Consistency**: All notifications look and behave the same way
2. **Reliability**: Centralized error handling and retry logic
3. **Scalability**: Easy to add new notification types
4. **Maintainability**: Single source of truth for notification logic
5. **User Experience**: Unified notification history and management

## Testing

Run the test script to verify the system works:

```bash
cd backend
node test-notifications.js
```

## Configuration

### Environment Variables
- `SENDGRID_API_KEY`: For email notifications
- `SENDGRID_FROM_EMAIL`: Sender email address
- `FRONTEND_URL`: Frontend URL for email links

### User Settings
Users can configure notification preferences in their profile:
- `notificationSettings.emailEnabled`: Enable/disable email notifications
- `notificationSettings.pushEnabled`: Enable/disable push notifications
- `notificationSettings.emailReminderType`: 'preset' or 'custom'
- `notificationSettings.emailPresetReminders`: Array of days (e.g., [1, 3, 7])
- `notificationSettings.emailCustomReminders`: Array of hours (e.g., [24, 48, 72])

## Troubleshooting

### Common Issues
1. **Notifications not appearing**: Check if user has FCM token and notification settings are enabled
2. **Email not sending**: Verify SendGrid API key and from email are configured
3. **Push notifications not working**: Ensure FCM token is saved and valid
4. **Database errors**: Check Firestore rules and user permissions

### Debugging
- Check backend logs for notification service errors
- Verify FCM token is saved in user document
- Test notification creation with the test script
- Check browser console for frontend errors

## Future Enhancements

1. **Notification Templates**: Predefined templates for common notification types
2. **Bulk Operations**: Batch notification operations for better performance
3. **Notification Scheduling**: Schedule notifications for future delivery
4. **Rich Notifications**: Support for images, actions, and rich content
5. **Analytics**: Track notification open rates and user engagement
