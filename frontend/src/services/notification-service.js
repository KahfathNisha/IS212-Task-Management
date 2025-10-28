import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/config/firebase";
import { useNotificationStore } from "@/stores/notificationStore";
import { useAuthStore } from "@/stores/auth";

let unsubscribeNotifications = null;

// This function listens for new unread notifications from the unified backend
function initializeUnreadNotificationListener(userId) {
  const notificationStore = useNotificationStore();
  const notificationsQuery = query(
    collection(db, "users", userId, "notifications"),
    where("isRead", "==", false)
  );
  unsubscribeNotifications = onSnapshot(notificationsQuery, (snapshot) => {
    // Handle new notifications (added)
    snapshot.docChanges().forEach((change) => {
      if (change.type === "added") {
        const notificationData = change.doc.data();
        console.log('📥 New notification added:', notificationData.title);
        notificationStore.addNotification({
          id: change.doc.id, // Include the database notification ID
          title: notificationData.title,
          body: notificationData.body,
          taskId: notificationData.taskId,
          type: notificationData.type || 'info'
        });
      }
    });
    
    // Handle initial load - clear queue and reload all unread notifications
    if (snapshot.docs.length > 0) {
      console.log('📥 Loading existing unread notifications:', snapshot.docs.length);
      // Clear existing queue to avoid duplicates
      notificationStore.clearNotifications();
      
      // Add all unread notifications to the queue
      snapshot.docs.forEach((doc) => {
        const notificationData = doc.data();
        notificationStore.addNotification({
          id: doc.id, // Include the database notification ID
          title: notificationData.title,
          body: notificationData.body,
          taskId: notificationData.taskId,
          type: notificationData.type || 'info'
        });
      });
    }
  });
}

// API functions to interact with backend notification endpoints
const API_BASE_URL = 'http://localhost:3000/api';

async function makeAuthenticatedRequest(endpoint, options = {}) {
  const authStore = useAuthStore();
  const token = await authStore.getToken();
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers
    }
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.statusText}`);
  }

  return response.json();
}

// Get notifications from backend API
export async function fetchNotifications(limit = 50, startAfter = null) {
  try {
    const params = new URLSearchParams({ limit: limit.toString() });
    if (startAfter) params.append('startAfter', startAfter);
    
    const result = await makeAuthenticatedRequest(`/notifications?${params}`);
    return result.notifications;
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }
}

// Mark notification as read
export async function markNotificationAsRead(notificationId) {
  try {
    await makeAuthenticatedRequest(`/notifications/${notificationId}/read`, {
      method: 'PUT'
    });
    return true;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return false;
  }
}

// Mark all notifications as read
export async function markAllNotificationsAsRead() {
  try {
    await makeAuthenticatedRequest('/notifications/read-all', {
      method: 'PUT'
    });
    return true;
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return false;
  }
}

// Delete notification
export async function deleteNotification(notificationId) {
  try {
    await makeAuthenticatedRequest(`/notifications/${notificationId}`, {
      method: 'DELETE'
    });
    return true;
  } catch (error) {
    console.error('Error deleting notification:', error);
    return false;
  }
}

// Clear all notifications
export async function clearAllNotifications() {
  try {
    await makeAuthenticatedRequest('/notifications/clear-all', {
      method: 'DELETE'
    });
    return true;
  } catch (error) {
    console.error('Error clearing all notifications:', error);
    return false;
  }
}

// Exported functions
export function initializeListeners(userId) {
  // Only initialize the notification listener, not the task change listener
  // Task changes are now handled by the backend unified notification system
  initializeUnreadNotificationListener(userId);
}

export async function fetchNotificationHistory(userId) {
  // Use backend API instead of direct Firestore access
  return await fetchNotifications(100);
}

export function cleanupListeners() {
  if (unsubscribeNotifications) unsubscribeNotifications();
}

