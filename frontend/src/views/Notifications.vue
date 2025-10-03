<template>
  <div class="notification-container">
    <div
      v-for="notification in notificationStore.notifications"
      :key="notification.id"
      class="mb-2"
    >
      <!-- --- THIS IS THE FIX: Wrap the snackbar in a router-link --- -->
      <router-link :to="`/tasks/${notification.taskId}`" class="text-decoration-none">
        <v-snackbar
          :model-value="true"
          location="bottom right"
          timeout="-1"
          multi-line
          @click.prevent
        >
          <div class="d-flex align-center">
            <v-icon class="mr-3" color="info">mdi-information</v-icon>
            <div>
              <div class="font-weight-bold">{{ notification.title }}</div>
              <div>{{ notification.body }}</div>
            </div>
          </div>
          <template v-slot:actions>
            <v-btn
              color="white"
              variant="text"
              icon="mdi-close"
              @click.stop.prevent="notificationStore.removeNotification(notification.id)"
            />
          </template>
        </v-snackbar>
      </router-link>
    </div>
  </div>
</template>

<script setup>
import { useNotificationStore } from '@/stores/notificationStore';
const notificationStore = useNotificationStore();
</script>

<style scoped>
.notification-container {
  position: fixed;
  bottom: 16px;
  right: 16px;
  z-index: 9999;
  width: 350px;
}
</style>
