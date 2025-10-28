<template>
  <v-snackbar
    v-model="showSnackbar"
    :timeout="-1"
    location="bottom right"
    multi-line
    color="#333333"
    elevation="24"
    class="notification-snackbar"
    persistent
  >
    <!-- We now bind to a local ref to prevent reactivity issues -->
    <div v-if="localNotification" class="d-flex align-center">
      <v-icon start size="x-large" :color="getNotificationColor(localNotification.type)">{{ getNotificationIcon(localNotification.type) }}</v-icon>
      <div class="ml-3">
        <div class="font-weight-bold text-subtitle-1">{{ localNotification.title }}</div>
        <div class="text-body-2">{{ localNotification.body }}</div>
      </div>
    </div>
    <template #actions>
      <div class="action-container">
        <v-btn 
          color="primary" 
          variant="text" 
          size="small"
          @click="markAsRead"
          class="action-btn mark-read-btn"
        >
          Mark as Read
        </v-btn>
        <v-btn 
          color="grey" 
          variant="text" 
          size="small"
          @click="dismiss"
          class="action-btn dismiss-btn"
        >
          Dismiss
        </v-btn>
        <v-btn 
          icon="mdi-close" 
          variant="text" 
          size="small"
          @click="markAsRead"
          class="action-btn close-btn"
        ></v-btn>
      </div>
    </template>
  </v-snackbar>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue';
import { useNotificationStore } from '@/stores/notificationStore';
import { storeToRefs } from 'pinia';
import { markNotificationAsRead } from '@/services/notification-service';

const notificationStore = useNotificationStore();
// THIS IS THE FIX: Use storeToRefs to create a reactive reference to the queue.
const { notificationQueue } = storeToRefs(notificationStore);

const showSnackbar = ref(false);
const localNotification = ref(null);

// This now watches the entire queue for any changes.
watch(notificationQueue, (newQueue) => {
  console.log('🔍 [Notifications.vue] Queue changed:', {
    queueLength: newQueue.length,
    showSnackbar: showSnackbar.value,
    currentNotification: localNotification.value?.title
  });
  
  // If a snackbar is NOT currently showing AND there are new items in the queue...
  if (!showSnackbar.value && newQueue.length > 0) {
    console.log('📱 [Notifications.vue] Showing popup for:', newQueue[0].title);
    // ...take the first one to display locally.
    localNotification.value = newQueue[0];
    
    // Use nextTick to ensure the DOM is updated before showing
    nextTick(() => {
      showSnackbar.value = true;
      console.log('📱 [Notifications.vue] Set showSnackbar to true');
      
      // Force keep it visible for a minimum time
      setTimeout(() => {
        if (showSnackbar.value) {
          console.log('📱 [Notifications.vue] Snackbar still visible after 1 second');
        }
      }, 1000);
    });
  }
}, { deep: true });

// Watch showSnackbar to debug what's happening
watch(showSnackbar, (newValue, oldValue) => {
  console.log('🔍 [Notifications.vue] showSnackbar changed from', oldValue, 'to', newValue);
});

// Mark as read - calls API and removes from queue
async function markAsRead() {
  if (localNotification.value) {
    try {
      // Call API to mark as read (if notification has an ID from the database)
      if (localNotification.value.id && typeof localNotification.value.id === 'string' && localNotification.value.id.length > 10) {
        await markNotificationAsRead(localNotification.value.id);
        console.log('✅ Notification marked as read:', localNotification.value.title);
      }
    } catch (error) {
      console.error('❌ Failed to mark notification as read:', error);
    }
    
    // Remove from queue and close popup
    notificationStore.dismissCurrentNotification();
    showSnackbar.value = false;
    localNotification.value = null;
  }
}

// Dismiss - just removes from queue without marking as read
function dismiss() {
  if (localNotification.value) {
    notificationStore.dismissNotification();
    showSnackbar.value = false;
    localNotification.value = null;
  }
}

// Get notification icon based on type
function getNotificationIcon(type) {
  switch (type) {
    case 'success': return 'mdi-check-circle';
    case 'warning': return 'mdi-alert';
    case 'error': return 'mdi-alert-circle';
    case 'info': 
    default: return 'mdi-information';
  }
}

// Get notification color based on type
function getNotificationColor(type) {
  switch (type) {
    case 'success': return 'green';
    case 'warning': return 'orange';
    case 'error': return 'red';
    case 'info': 
    default: return 'blue';
  }
}
</script>

<style>
.notification-snackbar .v-snackbar__content {
  padding-right: 16px !important;
}

/* Action container layout */
.notification-snackbar .action-container {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  width: 100%;
  gap: 8px;
}

/* Specific spacing for each button */
.notification-snackbar .mark-read-btn {
  margin-right: 0 !important;
}

.notification-snackbar .dismiss-btn {
  margin-right: 0 !important;
}

.notification-snackbar .close-btn {
  margin-left: 0 !important;
}

/* Button styling for better visual distinction */
.notification-snackbar .action-btn {
  text-transform: none !important;
  font-size: 12px !important;
  min-width: auto !important;
  margin: 0 !important;
}

.notification-snackbar .mark-read-btn {
  color: #1976d2 !important;
  font-weight: 500 !important;
}

.notification-snackbar .dismiss-btn {
  color: #757575 !important;
  font-weight: 500 !important;
}

.notification-snackbar .close-btn {
  color: #f44336 !important;
  flex-shrink: 0;
}

.notification-snackbar .action-btn:hover {
  background-color: rgba(255, 255, 255, 0.1) !important;
}

/* Ensure proper spacing in snackbar actions */
.notification-snackbar .v-snackbar__actions {
  padding: 0 !important;
  margin: 0 !important;
  width: 100%;
}

/* Force the snackbar to stay visible */
.notification-snackbar.v-snackbar--active {
  display: flex !important;
  opacity: 1 !important;
  visibility: visible !important;
}

/* Prevent auto-hide behavior */
.notification-snackbar .v-snackbar__wrapper {
  pointer-events: auto !important;
}
</style>

