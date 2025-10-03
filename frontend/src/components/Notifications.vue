<template>
  <v-snackbar
    v-model="showSnackbar"
    :timeout="6000"
    @update:modelValue="onSnackbarClose"
    location="bottom right"
    multi-line
    color="#333333"
    elevation="24"
    class="notification-snackbar"
  >
    <!-- We now bind to a local ref to prevent reactivity issues -->
    <div v-if="localNotification" class="d-flex align-center">
      <v-icon start size="x-large" color="info">mdi-information</v-icon>
      <div class="ml-3">
        <div class="font-weight-bold text-subtitle-1">{{ localNotification.title }}</div>
        <div class="text-body-2">{{ localNotification.body }}</div>
      </div>
    </div>
    <template #actions>
      <v-btn icon="mdi-close" variant="text" @click="showSnackbar = false"></v-btn>
    </template>
  </v-snackbar>
</template>

<script setup>
import { ref, watch } from 'vue';
import { useNotificationStore } from '@/stores/notificationStore';
import { storeToRefs } from 'pinia';

const notificationStore = useNotificationStore();
// THIS IS THE FIX: Use storeToRefs to create a reactive reference to the queue.
const { notificationQueue } = storeToRefs(notificationStore);

const showSnackbar = ref(false);
const localNotification = ref(null);

// This now watches the entire queue for any changes.
watch(notificationQueue, (newQueue) => {
  // If a snackbar is NOT currently showing AND there are new items in the queue...
  if (!showSnackbar.value && newQueue.length > 0) {
    // ...take the first one to display locally.
    localNotification.value = newQueue[0];
    showSnackbar.value = true;
  }
}, { deep: true });

// This function is called when the snackbar finishes closing.
function onSnackbarClose(isActive) {
  if (!isActive && localNotification.value) {
    // The snackbar has closed, so we can now safely tell the store to remove the notification.
    notificationStore.dismissCurrentNotification();
    localNotification.value = null; // Clear the local copy
  }
}
</script>

<style>
.notification-snackbar .v-snackbar__content {
  padding-right: 16px !important;
}
</style>

