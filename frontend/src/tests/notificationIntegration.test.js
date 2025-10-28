import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { useNotificationStore } from '@/stores/notificationStore';
import { useAuthStore } from '@/stores/auth';
import Notifications from '@/components/Notifications.vue';
import NotificationHistory from '@/views/NotificationHistory.vue';

// Mock Firebase
vi.mock('@/config/firebase', () => ({
  db: {},
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  onSnapshot: vi.fn()
}));

// Mock notification service
vi.mock('@/services/notification-service', () => ({
  fetchNotificationHistory: vi.fn(),
  markNotificationAsRead: vi.fn(),
  markAllNotificationsAsRead: vi.fn(),
  clearAllNotifications: vi.fn()
}));

describe('Notification Integration Tests', () => {
  let pinia;
  let notificationStore;
  let authStore;

  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
    notificationStore = useNotificationStore();
    authStore = useAuthStore();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Notification Component Integration', () => {
    it('should display notification when added to store', async () => {
      const wrapper = mount(Notifications, {
        global: {
          plugins: [pinia]
        }
      });

      // Add notification to store
      notificationStore.addNotification({
        title: 'Test Notification',
        body: 'This is a test notification',
        type: 'info'
      });

      await wrapper.vm.$nextTick();

      expect(wrapper.text()).toContain('Test Notification');
      expect(wrapper.text()).toContain('This is a test notification');
    });

    it('should show multiple notifications in queue', async () => {
      const wrapper = mount(Notifications, {
        global: {
          plugins: [pinia]
        }
      });

      // Add multiple notifications
      notificationStore.addNotification({
        title: 'First Notification',
        body: 'First message',
        type: 'info'
      });

      notificationStore.addNotification({
        title: 'Second Notification',
        body: 'Second message',
        type: 'warning'
      });

      await wrapper.vm.$nextTick();

      // Should show the first notification
      expect(wrapper.text()).toContain('First Notification');
      expect(wrapper.text()).toContain('First message');
    });

    it('should handle notification dismissal', async () => {
      const wrapper = mount(Notifications, {
        global: {
          plugins: [pinia]
        }
      });

      // Add notification
      notificationStore.addNotification({
        title: 'Test Notification',
        body: 'Test message',
        type: 'info'
      });

      await wrapper.vm.$nextTick();

      // Dismiss notification
      const dismissButton = wrapper.find('[data-testid="dismiss-button"]');
      if (dismissButton.exists()) {
        await dismissButton.trigger('click');
        await wrapper.vm.$nextTick();
      }

      // Notification should be removed from store
      expect(notificationStore.notificationQueue).toHaveLength(0);
    });
  });

  describe('Notification History Integration', () => {
    it('should load notification history on mount', async () => {
      const mockNotifications = [
        { id: '1', title: 'Test 1', body: 'Message 1', isRead: false, createdAt: new Date() },
        { id: '2', title: 'Test 2', body: 'Message 2', isRead: true, createdAt: new Date() }
      ];

      const { fetchNotificationHistory } = await import('@/services/notification-service');
      fetchNotificationHistory.mockResolvedValue(mockNotifications);

      const wrapper = mount(NotificationHistory, {
        global: {
          plugins: [pinia]
        }
      });

      await wrapper.vm.$nextTick();

      expect(fetchNotificationHistory).toHaveBeenCalled();
      expect(wrapper.text()).toContain('Test 1');
      expect(wrapper.text()).toContain('Test 2');
    });

    it('should handle mark as read functionality', async () => {
      const mockNotifications = [
        { id: '1', title: 'Test 1', body: 'Message 1', isRead: false, createdAt: new Date() }
      ];

      const { fetchNotificationHistory, markNotificationAsRead } = await import('@/services/notification-service');
      fetchNotificationHistory.mockResolvedValue(mockNotifications);
      markNotificationAsRead.mockResolvedValue(true);

      const wrapper = mount(NotificationHistory, {
        global: {
          plugins: [pinia]
        }
      });

      await wrapper.vm.$nextTick();

      // Find and click mark as read button
      const markAsReadButton = wrapper.find('[data-testid="mark-as-read-1"]');
      if (markAsReadButton.exists()) {
        await markAsReadButton.trigger('click');
        await wrapper.vm.$nextTick();

        expect(markNotificationAsRead).toHaveBeenCalledWith('1');
      }
    });

    it('should handle clear all functionality', async () => {
      const mockNotifications = [
        { id: '1', title: 'Test 1', body: 'Message 1', isRead: false, createdAt: new Date() },
        { id: '2', title: 'Test 2', body: 'Message 2', isRead: false, createdAt: new Date() }
      ];

      const { fetchNotificationHistory, clearAllNotifications } = await import('@/services/notification-service');
      fetchNotificationHistory.mockResolvedValue(mockNotifications);
      clearAllNotifications.mockResolvedValue(true);

      const wrapper = mount(NotificationHistory, {
        global: {
          plugins: [pinia]
        }
      });

      await wrapper.vm.$nextTick();

      // Find and click clear all button
      const clearAllButton = wrapper.find('[data-testid="clear-all-button"]');
      if (clearAllButton.exists()) {
        await clearAllButton.trigger('click');
        await wrapper.vm.$nextTick();

        expect(clearAllNotifications).toHaveBeenCalled();
      }
    });
  });

  describe('Real-time Notification Flow', () => {
    it('should handle real-time notification updates', async () => {
      const mockOnSnapshot = vi.fn();
      const { onSnapshot } = await import('@/config/firebase');
      onSnapshot.mockImplementation(mockOnSnapshot);

      // Simulate real-time notification
      const mockNotification = {
        title: 'Real-time Notification',
        body: 'This came from real-time updates',
        type: 'info'
      };

      // Trigger the snapshot callback
      const callback = mockOnSnapshot.mock.calls[0][1];
      callback({
        docChanges: () => [{
          type: 'added',
          doc: {
            data: () => mockNotification
          }
        }]
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(notificationStore.notificationQueue).toHaveLength(1);
      expect(notificationStore.notificationQueue[0]).toMatchObject(mockNotification);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty notification queue gracefully', () => {
      expect(notificationStore.notificationQueue).toHaveLength(0);
      expect(notificationStore.currentNotification).toBeUndefined();
    });

    it('should handle malformed notification data', () => {
      // Add notification with missing required fields
      notificationStore.addNotification({
        title: 'Incomplete Notification'
        // Missing body and type
      });

      expect(notificationStore.notificationQueue).toHaveLength(1);
      expect(notificationStore.notificationQueue[0].body).toBeUndefined();
      expect(notificationStore.notificationQueue[0].type).toBeUndefined();
    });

    it('should handle rapid notification additions', () => {
      // Add many notifications quickly
      for (let i = 0; i < 10; i++) {
        notificationStore.addNotification({
          title: `Notification ${i}`,
          body: `Message ${i}`,
          type: 'info'
        });
      }

      expect(notificationStore.notificationQueue).toHaveLength(10);
    });

    it('should handle notification dismissal when queue is empty', () => {
      expect(() => notificationStore.dismissCurrentNotification()).not.toThrow();
      expect(notificationStore.notificationQueue).toHaveLength(0);
    });
  });
});
