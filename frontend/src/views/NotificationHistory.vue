<template>
  <v-container>
    <v-card max-width="800" class="mx-auto">
      <v-card-title class="text-h5 d-flex align-center justify-space-between">
        <div class="d-flex align-center">
          <v-icon start icon="mdi-bell-ring"></v-icon>
          Notification History
        </div>
        <v-btn
          v-if="history.some(n => !n.isRead)"
          color="primary"
          variant="outlined"
          size="small"
          @click="markAllAsRead"
        >
          <v-icon start>mdi-check-all</v-icon>
          Mark all as read
        </v-btn>
        <v-btn
          v-if="history.length > 0"
          color="error"
          variant="outlined"
          size="small"
          @click="clearAllNotificationsHandler"
          class="ml-2"
        >
          <v-icon start>mdi-delete-sweep</v-icon>
          Clear all
        </v-btn>
      </v-card-title>
      
      <v-card-text v-if="loading" class="text-center pa-8">
        <v-progress-circular indeterminate color="primary"></v-progress-circular>
        <p class="mt-2">Loading notifications...</p>
      </v-card-text>
      
      <v-card-text v-else>
        <v-list v-if="history.length > 0" lines="two">
          <v-list-item
            v-for="notification in history"
            :key="notification.id"
            :title="notification.title"
            :subtitle="notification.body"
            :class="{ 'bg-grey-lighten-4': !notification.isRead }"
          >
            <template #prepend>
              <v-icon 
                :color="getNotificationColor(notification.type)"
                :icon="getNotificationIcon(notification.type)"
              ></v-icon>
            </template>
            <template #append>
              <div class="d-flex flex-column align-end">
                <span class="text-caption text-grey">{{ formatTimeAgo(notification.createdAt) }}</span>
                <v-btn
                  v-if="!notification.isRead"
                  size="small"
                  variant="text"
                  color="primary"
                  @click="markAsRead(notification.id)"
                >
                  Mark as read
                </v-btn>
              </div>
            </template>
          </v-list-item>
        </v-list>
        
        <div v-else class="text-center pa-8 text-grey">
          <v-icon size="48" class="mb-2">mdi-bell-off-outline</v-icon>
          <p>You have no notifications.</p>
        </div>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup>
import { ref, watch } from "vue";
import { useAuthStore } from "@/stores/auth";
import { fetchNotificationHistory, markNotificationAsRead, markAllNotificationsAsRead, clearAllNotifications } from "@/services/notification-service";

const authStore = useAuthStore();
const history = ref([]);
const loading = ref(true);

async function loadHistory() {
  const userEmail = authStore.userEmail;
  if (userEmail) {
    loading.value = true;
    try {
      history.value = await fetchNotificationHistory(userEmail);
    } catch (error) {
      console.error('Error fetching notification history:', error);
      history.value = [];
    } finally {
      loading.value = false;
    }
  } else {
    loading.value = false;
    history.value = [];
  }
}

// Watch for the auth store to finish loading and user to be available
watch(() => [authStore.loading, authStore.userEmail], ([isLoading, userEmail]) => {
  if (!isLoading && userEmail) {
    loadHistory();
  } else if (!isLoading && !userEmail) {
    loading.value = false;
    history.value = [];
  }
}, { immediate: true }); // immediate: true runs the check once on component mount

async function markAsRead(notificationId) {
  try {
    await markNotificationAsRead(notificationId);
    // Update local state
    const notification = history.value.find(n => n.id === notificationId);
    if (notification) {
      notification.isRead = true;
    }
  } catch (error) {
    console.error('Error marking notification as read:', error);
  }
}

async function markAllAsRead() {
  try {
    await markAllNotificationsAsRead();
    // Update local state
    history.value.forEach(notification => {
      notification.isRead = true;
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
  }
}

async function clearAllNotificationsHandler() {
  try {
    await clearAllNotifications();
    // Clear local state
    history.value = [];
    showMessage('All notifications cleared', 'success');
  } catch (error) {
    console.error('Error clearing all notifications:', error);
    showMessage('Failed to clear notifications', 'error');
  }
}

function showMessage(message, type) {
  // Simple message display - you can replace this with your preferred notification system
  console.log(`${type.toUpperCase()}: ${message}`);
}

function getNotificationColor(type) {
  switch (type) {
    case 'warning': return 'orange';
    case 'error': return 'red';
    case 'success': return 'green';
    default: return 'blue';
  }
}

function getNotificationIcon(type) {
  switch (type) {
    case 'warning': return 'mdi-alert';
    case 'error': return 'mdi-alert-circle';
    case 'success': return 'mdi-check-circle';
    default: return 'mdi-information';
  }
}

function formatTimeAgo(timestamp) {
  if (!timestamp) return "Invalid date";
  try {
    // Handle both Firestore timestamps and ISO strings
    const date = typeof timestamp === 'string' ? new Date(timestamp) : 
                 (timestamp.toDate ? timestamp.toDate() : new Date(timestamp));
    
    if (isNaN(date.getTime())) return "Invalid date";
    
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    let interval = Math.floor(seconds / 31536000);
    if (interval >= 1) return interval + (interval === 1 ? " year" : " years") + " ago";
    interval = Math.floor(seconds / 2592000);
    if (interval >= 1) return interval + (interval === 1 ? " month" : " months") + " ago";
    interval = Math.floor(seconds / 86400);
    if (interval >= 1) return interval + (interval === 1 ? " day" : " days") + " ago";
    interval = Math.floor(seconds / 3600);
    if (interval >= 1) return interval + (interval === 1 ? " hour" : " hours") + " ago";
    interval = Math.floor(seconds / 60);
    if (interval >= 1) return interval + (interval === 1 ? " minute" : " minutes") + " ago";
    return "Just now";
  } catch (e) {
    console.error("Error formatting time:", e);
    return "Invalid date";
  }
}
</script>
