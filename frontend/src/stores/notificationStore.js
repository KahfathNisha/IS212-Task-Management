import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useNotificationStore = defineStore('notification', () => {
  const notifications = ref([]);

  function addNotification(notification) {
    const id = Date.now() + Math.random();
    notifications.value.push({ ...notification, id, show: true });

    setTimeout(() => {
      removeNotification(id);
    }, 8000); // Increased to 8 seconds
  }

  function removeNotification(id) {
    const index = notifications.value.findIndex((n) => n.id === id);
    if (index > -1) {
      notifications.value.splice(index, 1);
    }
  }
  
  // --- THIS IS THE FIX ---
  // A new function to clear all notifications, to be called on logout.
  function clearNotifications() {
    notifications.value = [];
  }

  return { notifications, addNotification, removeNotification, clearNotifications };
});

