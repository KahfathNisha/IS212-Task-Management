<template>
  <v-container>
    <v-card max-width="800" class="mx-auto">
      <v-card-title class="text-h5 d-flex align-center">
        <v-icon start icon="mdi-bell-ring"></v-icon>
        Notification History
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
          >
            <template #append>
              <span class="text-caption text-grey">{{ formatTimeAgo(notification.createdAt) }}</span>
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
import { fetchNotificationHistory } from "@/services/notification-service";

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

function formatTimeAgo(timestamp) {
  if (!timestamp || typeof timestamp.toDate !== 'function') return "Invalid date";
  try {
    const date = timestamp.toDate();
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
