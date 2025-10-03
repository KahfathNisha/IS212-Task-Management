import { defineStore } from "pinia";
import { ref, computed } from "vue";

export const useNotificationStore = defineStore("notification", () => {
  // A simple queue of notifications that need to be shown as popups.
  const notificationQueue = ref([]);

  // A computed property to easily get the notification at the front of the queue.
  const currentNotification = computed(() => notificationQueue.value[0]);

  function addNotification(notification) {
    // Add a unique ID for Vue's key-binding and to prevent duplicates
    const newNotification = { ...notification, id: Date.now() + Math.random() };
    notificationQueue.value.push(newNotification);
  }

  // This is called by the UI component when a popup is dismissed.
  function dismissCurrentNotification() {
    if (notificationQueue.value.length > 0) {
      notificationQueue.value.shift(); // Removes the first item from the queue
    }
  }

  // This is called on logout to prevent notifications from reappearing.
  function clearNotifications() {
    notificationQueue.value = [];
  }

  return {
    notificationQueue,
    currentNotification,
    addNotification,
    dismissCurrentNotification,
    clearNotifications,
  };
});

