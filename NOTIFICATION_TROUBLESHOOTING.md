# Notification System Troubleshooting Guide

## Quick Diagnostic Checklist

### 1. Backend Issues
- [ ] Backend server is running on port 3000
- [ ] Firebase connection is working
- [ ] User exists in Firestore `users` collection
- [ ] User has valid FCM token
- [ ] Notification endpoints are accessible

### 2. Frontend Issues
- [ ] Frontend is running on port 5173
- [ ] User is authenticated
- [ ] Notification listeners are initialized
- [ ] No JavaScript errors in console
- [ ] Notification components are mounted

### 3. Integration Issues
- [ ] API calls are successful
- [ ] Real-time listeners are active
- [ ] Notifications are created in database
- [ ] Frontend can fetch notifications

## Step-by-Step Troubleshooting

### Step 1: Test Backend API Directly

```bash
# 1. Get a Firebase token (login via frontend)
# 2. Test notification creation
curl -X POST http://localhost:3000/api/notifications/test \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Notification",
    "body": "This is a test",
    "type": "info"
  }'

# 3. Test fetching notifications
curl -X GET http://localhost:3000/api/notifications \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN"
```

**Expected Results:**
- POST should return 201 with notification data
- GET should return 200 with notifications array

**If this fails:**
- Check backend logs for errors
- Verify Firebase token is valid
- Ensure user exists in database

### Step 2: Check Database

1. **Open Firebase Console**
2. **Navigate to Firestore Database**
3. **Check `users/{email}/notifications` collection**
4. **Verify notifications are being created**

**If no notifications in database:**
- Backend API is not working
- Check notification service logs
- Verify Firebase permissions

### Step 3: Test Frontend API Integration

Open browser console and run:

```javascript
// Test API calls directly
const { fetchNotifications } = await import('/src/services/notification-service.js');
const notifications = await fetchNotifications();
console.log('Notifications:', notifications);

// Test auth store
const { useAuthStore } = await import('/src/stores/auth.js');
const authStore = useAuthStore();
console.log('User:', authStore.user);
console.log('Token:', await authStore.getToken());
```

**Expected Results:**
- Should return notifications array
- Should show user data and valid token

**If this fails:**
- Check authentication
- Verify API endpoints are correct
- Check network requests in DevTools

### Step 4: Test Real-time Listeners

```javascript
// Check if listeners are initialized
const { initializeListeners } = await import('/src/services/notification-service.js');
const { useAuthStore } = await import('/src/stores/auth.js');
const authStore = useAuthStore();

if (authStore.user?.email) {
  initializeListeners(authStore.user.email);
  console.log('Listeners initialized for:', authStore.user.email);
} else {
  console.log('No user email found');
}
```

### Step 5: Test Notification Store

```javascript
// Test notification store directly
const { useNotificationStore } = await import('/src/stores/notificationStore.js');
const notificationStore = useNotificationStore();

// Add a test notification
notificationStore.addNotification({
  title: 'Test Store Notification',
  body: 'This tests the store directly',
  type: 'info'
});

console.log('Store notifications:', notificationStore.notificationQueue);
console.log('Current notification:', notificationStore.currentNotification);
```

## Common Issues and Solutions

### Issue 1: "No authentication token provided"
**Cause:** Missing or invalid Firebase token
**Solution:**
```javascript
// Check if user is authenticated
const { useAuthStore } = await import('/src/stores/auth.js');
const authStore = useAuthStore();
console.log('Is authenticated:', authStore.isAuthenticated);
console.log('User:', authStore.user);

// Get fresh token
const token = await authStore.getToken();
console.log('Token:', token);
```

### Issue 2: "User profile not found in database"
**Cause:** User doesn't exist in Firestore
**Solution:**
1. Check Firebase Console for user document
2. Ensure user registration creates Firestore document
3. Check user document structure

### Issue 3: Notifications created but not visible in frontend
**Cause:** Frontend listeners not initialized or API calls failing
**Solution:**
```javascript
// Check if notification service is working
const { fetchNotificationHistory } = await import('/src/services/notification-service.js');
try {
  const notifications = await fetchNotificationHistory('your-email@example.com');
  console.log('Fetched notifications:', notifications);
} catch (error) {
  console.error('Error fetching notifications:', error);
}
```

### Issue 4: Real-time notifications not working
**Cause:** Firebase listeners not properly initialized
**Solution:**
```javascript
// Check if listeners are set up
const { onSnapshot } = await import('@/config/firebase');
console.log('onSnapshot function:', onSnapshot);

// Manually test listener
const { collection, query, where } = await import('@/config/firebase');
const notificationsQuery = query(
  collection(db, "users", "your-email@example.com", "notifications"),
  where("isRead", "==", false)
);

const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
  console.log('Real-time update:', snapshot.docChanges());
});
```

### Issue 5: Notifications appear but don't show in UI
**Cause:** Component not properly mounted or store not reactive
**Solution:**
```javascript
// Check if components are mounted
const notificationsComponent = document.querySelector('[data-testid="notifications"]');
console.log('Notifications component:', notificationsComponent);

// Check store state
const { useNotificationStore } = await import('/src/stores/notificationStore.js');
const notificationStore = useNotificationStore();
console.log('Store state:', notificationStore.$state);
```

## Debug Scripts

### Complete System Test
```javascript
// Run this in browser console to test entire system
async function testNotificationSystem() {
  console.log('🧪 Testing Notification System...');
  
  // 1. Check authentication
  const { useAuthStore } = await import('/src/stores/auth.js');
  const authStore = useAuthStore();
  console.log('✅ Auth status:', authStore.isAuthenticated);
  console.log('✅ User:', authStore.user?.email);
  
  // 2. Test API
  const { fetchNotifications } = await import('/src/services/notification-service.js');
  try {
    const notifications = await fetchNotifications();
    console.log('✅ API working, notifications:', notifications.length);
  } catch (error) {
    console.error('❌ API error:', error);
  }
  
  // 3. Test store
  const { useNotificationStore } = await import('/src/stores/notificationStore.js');
  const notificationStore = useNotificationStore();
  notificationStore.addNotification({
    title: 'Debug Test',
    body: 'Testing store functionality',
    type: 'info'
  });
  console.log('✅ Store working, queue length:', notificationStore.notificationQueue.length);
  
  // 4. Test components
  const notificationsComponent = document.querySelector('.notification-snackbar');
  console.log('✅ Component mounted:', !!notificationsComponent);
  
  console.log('🎉 System test complete!');
}

testNotificationSystem();
```

### Create Test Notification via API
```javascript
// Create a test notification directly
async function createTestNotification() {
  const { useAuthStore } = await import('/src/stores/auth.js');
  const authStore = useAuthStore();
  const token = await authStore.getToken();
  
  const response = await fetch('http://localhost:3000/api/notifications/test', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      title: 'Frontend Test Notification',
      body: 'Created from browser console',
      type: 'info'
    })
  });
  
  const result = await response.json();
  console.log('Test notification created:', result);
}

createTestNotification();
```

## Performance Monitoring

### Check Notification Queue Performance
```javascript
// Monitor notification queue performance
const { useNotificationStore } = await import('/src/stores/notificationStore.js');
const notificationStore = useNotificationStore();

// Add performance monitoring
const originalAdd = notificationStore.addNotification;
notificationStore.addNotification = function(notification) {
  const start = performance.now();
  const result = originalAdd.call(this, notification);
  const end = performance.now();
  console.log(`Notification added in ${end - start}ms`);
  return result;
};
```

### Monitor API Response Times
```javascript
// Monitor API performance
const originalFetch = window.fetch;
window.fetch = function(...args) {
  const start = performance.now();
  return originalFetch.apply(this, args).then(response => {
    const end = performance.now();
    console.log(`API call to ${args[0]} took ${end - start}ms`);
    return response;
  });
};
```

## Quick Fixes

### Reset Everything
```javascript
// Reset notification system
const { useNotificationStore } = await import('/src/stores/notificationStore.js');
const notificationStore = useNotificationStore();
notificationStore.clearNotifications();

// Clear all notifications from database
const { clearAllNotifications } = await import('/src/services/notification-service.js');
await clearAllNotifications();
```

### Force Re-initialization
```javascript
// Force re-initialize listeners
const { initializeListeners, cleanupListeners } = await import('/src/services/notification-service.js');
const { useAuthStore } = await import('/src/stores/auth.js');
const authStore = useAuthStore();

cleanupListeners();
if (authStore.user?.email) {
  initializeListeners(authStore.user.email);
  console.log('Listeners re-initialized');
}
```

This troubleshooting guide should help you identify and fix any notification integration issues! 🔧
