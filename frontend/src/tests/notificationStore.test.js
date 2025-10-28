import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useNotificationStore } from '@/stores/notificationStore';

describe('NotificationStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  describe('Initial State', () => {
    it('should initialize with empty notification queue', () => {
      const store = useNotificationStore();
      expect(store.notificationQueue).toEqual([]);
      expect(store.currentNotification).toBeUndefined();
    });
  });

  describe('addNotification', () => {
    it('should add a notification to the queue', () => {
      const store = useNotificationStore();
      const notification = {
        title: 'Test Notification',
        body: 'This is a test',
        type: 'info'
      };

      store.addNotification(notification);

      expect(store.notificationQueue).toHaveLength(1);
      expect(store.notificationQueue[0]).toMatchObject({
        title: 'Test Notification',
        body: 'This is a test',
        type: 'info'
      });
      expect(store.notificationQueue[0].id).toBeDefined();
    });

    it('should add unique ID to each notification', () => {
      const store = useNotificationStore();
      const notification = { title: 'Test', body: 'Test' };

      store.addNotification(notification);
      store.addNotification(notification);

      expect(store.notificationQueue).toHaveLength(2);
      expect(store.notificationQueue[0].id).not.toBe(store.notificationQueue[1].id);
    });

    it('should handle different notification types', () => {
      const store = useNotificationStore();
      const notifications = [
        { title: 'Info', body: 'Info message', type: 'info' },
        { title: 'Warning', body: 'Warning message', type: 'warning' },
        { title: 'Error', body: 'Error message', type: 'error' },
        { title: 'Success', body: 'Success message', type: 'success' }
      ];

      notifications.forEach(notif => store.addNotification(notif));

      expect(store.notificationQueue).toHaveLength(4);
      notifications.forEach((notif, index) => {
        expect(store.notificationQueue[index].type).toBe(notif.type);
      });
    });
  });

  describe('dismissCurrentNotification', () => {
    it('should remove the first notification from queue', () => {
      const store = useNotificationStore();
      store.addNotification({ title: 'First', body: 'First message' });
      store.addNotification({ title: 'Second', body: 'Second message' });

      expect(store.notificationQueue).toHaveLength(2);
      store.dismissCurrentNotification();
      expect(store.notificationQueue).toHaveLength(1);
      expect(store.notificationQueue[0].title).toBe('Second');
    });

    it('should handle empty queue gracefully', () => {
      const store = useNotificationStore();
      expect(() => store.dismissCurrentNotification()).not.toThrow();
      expect(store.notificationQueue).toHaveLength(0);
    });
  });

  describe('clearNotifications', () => {
    it('should clear all notifications', () => {
      const store = useNotificationStore();
      store.addNotification({ title: 'Test 1', body: 'Message 1' });
      store.addNotification({ title: 'Test 2', body: 'Message 2' });

      expect(store.notificationQueue).toHaveLength(2);
      store.clearNotifications();
      expect(store.notificationQueue).toHaveLength(0);
    });
  });

  describe('currentNotification computed', () => {
    it('should return the first notification in queue', () => {
      const store = useNotificationStore();
      const firstNotification = { title: 'First', body: 'First message' };
      const secondNotification = { title: 'Second', body: 'Second message' };

      store.addNotification(firstNotification);
      store.addNotification(secondNotification);

      expect(store.currentNotification).toMatchObject(firstNotification);
    });

    it('should return undefined when queue is empty', () => {
      const store = useNotificationStore();
      expect(store.currentNotification).toBeUndefined();
    });
  });
});

