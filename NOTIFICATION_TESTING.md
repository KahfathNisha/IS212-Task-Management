# Notification System Testing Guide

## Quick Start

```bash
# Run all notification tests
npm run test:notifications

# Run comprehensive tests only
npm run test:comprehensive

# Run integration test (requires running servers)
node test-notification-integration.js
```

## Test Structure

### Backend Tests (`backend/tests/`)
- `notificationComprehensive.test.js` - All backend notification tests
- `notificationController.test.js` - API endpoint tests
- `notificationService.test.js` - Service layer tests

### Frontend Tests (`frontend/src/tests/`)
- `notificationComprehensive.test.js` - All frontend notification tests
- `notificationStore.test.js` - Store tests
- `notificationService.test.js` - API service tests

## Test Coverage

### Core Functionality
- ✅ Notification creation and management
- ✅ Push notification delivery
- ✅ Email notification delivery
- ✅ Real-time updates
- ✅ Notification dismissal and queue management

### Edge Cases
- ✅ Different notification types (info, warning, error, success)
- ✅ Multiple notifications in queue
- ✅ API error handling
- ✅ Authentication edge cases
- ✅ Performance with large datasets

### Integration
- ✅ Backend API endpoints
- ✅ Frontend component rendering
- ✅ Real-time listener functionality
- ✅ End-to-end notification flow

## Manual Testing

### Browser Console Tests
```javascript
// Test complete notification flow
async function testNotifications() {
  const { useNotificationStore } = await import('/src/stores/notificationStore.js');
  const notificationStore = useNotificationStore();
  
  // Clear existing
  notificationStore.clearNotifications();
  
  // Add test notifications
  notificationStore.addNotification({
    title: 'Test Notification',
    body: 'This is a test',
    type: 'info'
  });
  
  console.log('Queue length:', notificationStore.notificationQueue.length);
  console.log('Current notification:', notificationStore.currentNotification?.title);
}

testNotifications();
```

### API Testing
```bash
# Create test notification
curl -X POST http://localhost:3000/api/notifications/test \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","body":"Test message","type":"info"}'

# Get notifications
curl -X GET http://localhost:3000/api/notifications \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Troubleshooting

### Common Issues
1. **Notifications not appearing** - Check authentication and API calls
2. **Real-time not working** - Verify Firebase listeners are initialized
3. **API errors** - Check backend logs and token validity

### Debug Commands
```bash
# Check backend logs
cd backend && npm run dev

# Check frontend console
# Open browser DevTools and look for errors

# Test API directly
node test-notification-integration.js
```

## Performance Testing

```javascript
// Test with large dataset
const { useNotificationStore } = await import('/src/stores/notificationStore.js');
const notificationStore = useNotificationStore();

// Add 100 notifications
for (let i = 0; i < 100; i++) {
  notificationStore.addNotification({
    title: `Test ${i}`,
    body: `Message ${i}`,
    type: 'info'
  });
}

console.log('Performance test complete');
```

This consolidated guide covers everything you need for notification testing! 🧪✅
