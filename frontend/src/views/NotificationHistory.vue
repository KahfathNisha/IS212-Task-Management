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
import { ref, onMounted } from "vue";
import { useAuthStore } from "@/stores/auth";
import { fetchNotificationHistory } from "@/services/notification-service";

const authStore = useAuthStore();
const history = ref([]);
const loading = ref(true);

onMounted(async () => {
  const userEmail = authStore.userEmail;
  if (userEmail) {
    history.value = await fetchNotificationHistory(userEmail);
  }
  loading.value = false;
});

function formatTimeAgo(timestamp) {
  if (!timestamp) return "";
  const date = timestamp.toDate();
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);
  // (Your existing time formatting logic)
  let interval = seconds / 60;
  if (interval < 60) return Math.floor(interval) + " minutes ago";
  // ... etc.
  return "Just now";
}
</script>

