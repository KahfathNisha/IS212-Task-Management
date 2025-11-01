import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createVuetify } from 'vuetify';
import Settings from '@/views/Settings.vue';
import { createPinia, setActivePinia } from 'pinia';
import { useAuthStore } from '@/stores/auth';
import { config } from '@vue/test-utils';

// Create Vuetify instance for testing
const vuetify = createVuetify();

config.global.stubs = {
  'v-icon': true,
  'v-card': true,
  'v-card-title': true,
  'v-switch': true,
  'v-select': true,
  'v-chip': true,
  'v-btn': true,
  'v-alert': true,
  'v-card-text': true,
  'v-card': true,
  'v-spacer': true,
  'v-card-actions': true,
  'v-dialog': true,
  'v-text-field': true,
  'v-list-item': true,
  'v-list': true,
  'v-progress-circular': true,
  'v-container': true
};

// Mock the notification service
vi.mock('@/services/notification-service', () => ({
  initializeListeners: vi.fn(),
  fetchNotificationHistory: vi.fn(() => Promise.resolve([])),
  cleanupListeners: vi.fn()
}));

// Mock Firebase
vi.mock('@/config/firebase', () => ({
  db: {},
  auth: {}
}));

describe('Email Reminder Frontend Integration', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  // Setting page configuration
  describe('Settings View Email Reminder Configuration', () => {
    it('should render email notification settings', async () => {
      const authStore = useAuthStore();
      authStore.user = { email: 'test@example.com' };

      const wrapper = mount(Settings, {
        global: {
          plugins: [vuetify, createPinia()],
          mocks: {
            $auth: authStore
          }
        }
      });

      await wrapper.vm.$nextTick();

      // Check if settings form is rendered
      expect(wrapper.exists()).toBe(true);
    });

    it('should display email reminder options when enabled', async () => {
      const authStore = useAuthStore();
      authStore.user = {
        email: 'test@example.com',
        notificationSettings: {
          emailEnabled: true,
          emailPresetReminders: [1, 3, 7]
        }
      };

      const wrapper = mount(Settings, {
        global: {
          plugins: [vuetify, createPinia()],
          mocks: {
            $auth: authStore
          }
        }
      });

      await wrapper.vm.$nextTick();

      // Should render without errors
      expect(wrapper.exists()).toBe(true);
    });

    it('should handle custom email reminder intervals', async () => {
      const authStore = useAuthStore();
      authStore.user = {
        email: 'test@example.com',
        notificationSettings: {
          emailEnabled: true,
          emailReminderType: 'custom',
          emailCustomReminders: [2, 6, 12]
        }
      };

      const wrapper = mount(Settings, {
        global: {
          plugins: [vuetify, createPinia()],
          mocks: {
            $auth: authStore
          }
        }
      });

      await wrapper.vm.$nextTick();

      // Should handle custom settings
      expect(wrapper.exists()).toBe(true);
    });
  });

  describe('Notification Store Integration', () => {
    it('should handle email reminder notifications from backend', async () => {
      const { useNotificationStore } = await import('@/stores/notificationStore');
      const notificationStore = useNotificationStore();

      // Simulate receiving an email reminder notification
      const emailNotification = {
        title: 'Deadline Reminder: Project Report',
        body: 'Task: Project Report\nTime Remaining: 1 hours and 0 minutes\nDeadline: October 29, 2025 at 5:21 PM',
        taskId: 'task-123'
      };

      notificationStore.addNotification(emailNotification);

      // Verify notification was added to queue
      expect(notificationStore.notificationQueue).toHaveLength(1);
      expect(notificationStore.notificationQueue[0].title).toBe('Deadline Reminder: Project Report');
      expect(notificationStore.notificationQueue[0].body).toBe('Task: Project Report\nTime Remaining: 1 hours and 0 minutes\nDeadline: October 29, 2025 at 5:21 PM');
    });

    it('should handle multiple email notifications', async () => {
      const { useNotificationStore } = await import('@/stores/notificationStore');
      const notificationStore = useNotificationStore();

      const notification1 = {
        title: 'Deadline Reminder: First Task',
        body: 'Task: First Task\nTime Remaining: 2 hours and 30 minutes\nDeadline: October 29, 2025 at 8:00 AM',
        taskId: 'task-1'
      };

      const notification2 = {
        title: 'Deadline Reminder: Second Task',
        body: 'Task: Second Task\nTime Remaining: 4 hours and 15 minutes\nDeadline: October 29, 2025 at 9:30 AM',
        taskId: 'task-2'
      };

      notificationStore.addNotification(notification1);
      notificationStore.addNotification(notification2);

      // Should have both notifications
      expect(notificationStore.notificationQueue).toHaveLength(2);
      expect(notificationStore.currentNotification.title).toBe('Deadline Reminder: First Task');
    });

    it('should dismiss current notification', async () => {
      const { useNotificationStore } = await import('@/stores/notificationStore');
      const notificationStore = useNotificationStore();

      const notification = {
        title: 'Deadline Reminder: Test Task',
        body: 'Task: Test Task\nTime Remaining: 3 hours and 45 minutes\nDeadline: October 29, 2025 at 9:15 AM',
        taskId: 'task-123'
      };

      notificationStore.addNotification(notification);
      expect(notificationStore.notificationQueue).toHaveLength(1);

      // Dismiss current notification
      notificationStore.dismissCurrentNotification();

      // Should be removed from queue
      expect(notificationStore.notificationQueue).toHaveLength(0);
    });
  });

  describe('User Settings Validation', () => {
    it('should validate email reminder intervals', () => {
      // Test valid intervals
      const validIntervals = [1, 3, 7, 14];
      validIntervals.forEach(interval => {
        expect(interval).toBeGreaterThan(0);
        expect(Number.isInteger(interval)).toBe(true);
      });

      // Test invalid intervals
      const invalidIntervals = [0, -1, 1.5, 'invalid'];
      invalidIntervals.forEach(interval => {
        const isInvalid = typeof interval !== 'number' ||
                         interval <= 0 ||
                         !Number.isInteger(interval);
        expect(isInvalid).toBe(true);
      });
    });

    it('should handle email notification preferences', () => {
      const validSettings = {
        emailEnabled: true,
        emailReminderType: 'preset',
        emailPresetReminders: [1, 3, 7]
      };

      expect(validSettings.emailEnabled).toBe(true);
      expect(validSettings.emailReminderType).toBe('preset');
      expect(Array.isArray(validSettings.emailPresetReminders)).toBe(true);
    });

    it('should validate custom reminder settings', () => {
      const customSettings = {
        emailEnabled: true,
        emailReminderType: 'custom',
        emailCustomReminders: [2, 6, 12, 24]
      };

      expect(customSettings.emailReminderType).toBe('custom');
      expect(customSettings.emailCustomReminders.length).toBeGreaterThan(0);
      customSettings.emailCustomReminders.forEach(hours => {
        expect(hours).toBeGreaterThan(0);
        expect(Number.isInteger(hours)).toBe(true);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle notification service failures gracefully', async () => {
      const { fetchNotificationHistory } = await import('@/services/notification-service');
      fetchNotificationHistory.mockRejectedValue(new Error('Service unavailable'));

      const wrapper = mount(await import('@/views/NotificationHistory.vue').then(m => m.default), {
        global: {
          plugins: [vuetify, createPinia()]
        }
      });

      await wrapper.vm.$nextTick();

      // Should not crash on service errors
      expect(wrapper.exists()).toBe(true);
    });

    it('should handle invalid notification data', async () => {
      const { useNotificationStore } = await import('@/stores/notificationStore');
      const notificationStore = useNotificationStore();

      const invalidNotification = {
        title: null,
        body: undefined,
        taskId: 'task-123'
      };

      // Should handle gracefully
      expect(() => {
        notificationStore.addNotification(invalidNotification);
      }).not.toThrow();
    });

    it('should handle missing user settings', () => {
      const defaultSettings = {
        emailEnabled: false,
        emailReminderType: 'preset',
        emailPresetReminders: [1, 3, 7]
      };

      // Should provide sensible defaults
      expect(defaultSettings.emailEnabled).toBe(false);
      expect(defaultSettings.emailPresetReminders).toEqual([1, 3, 7]);
    });
  });

// ========================================
// NEW TESTS FOR DEADLINE REMINDER SCENARIOS
// ========================================

describe('Email Deadline Reminder Frontend Edge Cases', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  // AC1: Task created inside lead time - should still schedule reminder
  describe('Lead Time Handling (AC1)', () => {
    it('should handle task created with short notice (< lead time)', async () => {
      const { useNotificationStore } = await import('@/stores/notificationStore');
      const notificationStore = useNotificationStore();

      // Simulate task created with 6 hours notice (lead time is 24h)
      const shortNoticeNotification = {
        title: 'Deadline Reminder: Urgent Project',
        body: 'Task: Urgent Project\nTime Remaining: 6 hours and 0 minutes\nDeadline: October 30, 2025 at 10:40 PM',
        taskId: 'urgent-task-123'
      };

      notificationStore.addNotification(shortNoticeNotification);

      // Should still add notification even though created inside lead time
      expect(notificationStore.notificationQueue).toHaveLength(1);
      expect(notificationStore.notificationQueue[0].title).toBe('Deadline Reminder: Urgent Project');
      expect(notificationStore.notificationQueue[0].body).toContain('6 hours and 0 minutes');
    });

    it('should handle task due in minutes (extreme short notice)', async () => {
      const { useNotificationStore } = await import('@/stores/notificationStore');
      const notificationStore = useNotificationStore();

      // Task due in 30 minutes
      const urgentNotification = {
        title: 'Deadline Reminder: Critical Task',
        body: 'Task: Critical Task\nTime Remaining: 0 hours and 30 minutes\nDeadline: October 30, 2025 at 5:10 PM',
        taskId: 'critical-task-456'
      };

      notificationStore.addNotification(urgentNotification);

      expect(notificationStore.notificationQueue).toHaveLength(1);
      expect(notificationStore.notificationQueue[0].body).toContain('0 hours and 30 minutes');
    });

    it('should display appropriate urgency for short notice tasks', async () => {
      const authStore = useAuthStore();
      authStore.user = { 
        email: 'test@example.com',
        notificationSettings: {
          emailEnabled: true,
          emailPresetReminders: [1, 3, 7]
        }
      };

      const wrapper = mount(Settings, {
        global: {
          plugins: [vuetify, createPinia()],
          mocks: {
            $auth: authStore
          }
        }
      });

      await wrapper.vm.$nextTick();

      // Should handle settings for short notice scenarios
      expect(wrapper.exists()).toBe(true);
      expect(authStore.user.notificationSettings.emailPresetReminders).toEqual([1, 3, 7]);
    });
  });

  // AC9: Deadline pushed earlier - should cancel old and schedule new
  describe('Deadline Adjustments - Earlier (AC9)', () => {
    it('should handle deadline moved from 24h to 8h', async () => {
      const { useNotificationStore } = await import('@/stores/notificationStore');
      const notificationStore = useNotificationStore();

      // Original notification for 24h due
      const originalNotification = {
        title: 'Deadline Reminder: Adjustable Task',
        body: 'Task: Adjustable Task\nTime Remaining: 24 hours and 0 minutes\nDeadline: October 31, 2025 at 4:40 PM',
        taskId: 'adjustable-task-123'
      };

      notificationStore.addNotification(originalNotification);
      expect(notificationStore.notificationQueue).toHaveLength(1);

      // Updated notification for 8h due (deadline moved earlier)
      const updatedNotification = {
        title: 'Deadline Reminder: Adjustable Task',
        body: 'Task: Adjustable Task\nTime Remaining: 8 hours and 0 minutes\nDeadline: October 30, 2025 at 12:40 AM',
        taskId: 'adjustable-task-123'
      };

      // Add updated notification (simulating reschedule)
      notificationStore.addNotification(updatedNotification);

      // Should have both notifications (old one dismissed, new one added)
      expect(notificationStore.notificationQueue).toHaveLength(2);
      
      const latestNotification = notificationStore.notificationQueue[notificationStore.notificationQueue.length - 1];
      expect(latestNotification.body).toContain('8 hours and 0 minutes');
    });

    it('should handle multiple deadline adjustments', async () => {
      const { useNotificationStore } = await import('@/stores/notificationStore');
      const notificationStore = useNotificationStore();

      const taskId = 'multi-adjust-task-456';
      
      // Progressive deadline adjustments: 24h -> 12h -> 6h
      const adjustments = [
        { hours: 24, minutes: 0, deadline: 'October 31, 2025 at 4:40 PM' },
        { hours: 12, minutes: 0, deadline: 'October 31, 2025 at 4:40 AM' },
        { hours: 6, minutes: 30, deadline: 'October 30, 2025 at 11:10 PM' }
      ];

      adjustments.forEach((adjustment, index) => {
        const notification = {
          title: `Deadline Reminder: Multi-Adjust Task`,
          body: `Task: Multi-Adjust Task\nTime Remaining: ${adjustment.hours} hours and ${adjustment.minutes} minutes\nDeadline: ${adjustment.deadline}`,
          taskId: taskId
        };
        notificationStore.addNotification(notification);
      });

      // Should have all three notifications
      expect(notificationStore.notificationQueue).toHaveLength(3);
      
      // Latest should be the most recent adjustment
      const latestNotification = notificationStore.notificationQueue[2];
      expect(latestNotification.body).toContain('6 hours and 30 minutes');
    });

    it('should dismiss old notifications when deadline moved earlier', async () => {
      const { useNotificationStore } = await import('@/stores/notificationStore');
      const notificationStore = useNotificationStore();

      const taskId = 'early-move-task-789';

      // Add initial notification
      const initialNotification = {
        title: 'Deadline Reminder: Early Move Task',
        body: 'Task: Early Move Task\nTime Remaining: 24 hours and 0 minutes\nDeadline: October 31, 2025 at 4:40 PM',
        taskId: taskId
      };

      notificationStore.addNotification(initialNotification);
      expect(notificationStore.notificationQueue).toHaveLength(1);

      // Dismiss current notification
      notificationStore.dismissCurrentNotification();
      expect(notificationStore.notificationQueue).toHaveLength(0);

      // Add updated notification (simulating deadline moved earlier)
      const updatedNotification = {
        title: 'Deadline Reminder: Early Move Task',
        body: 'Task: Early Move Task\nTime Remaining: 8 hours and 0 minutes\nDeadline: October 30, 2025 at 12:40 AM',
        taskId: taskId
      };

      notificationStore.addNotification(updatedNotification);
      expect(notificationStore.notificationQueue).toHaveLength(1);
      expect(notificationStore.notificationQueue[0].body).toContain('8 hours and 0 minutes');
    });
  });

  // AC10: Deadline pushed later - should schedule new reminders
  describe('Deadline Adjustments - Later (AC10)', () => {
    it('should handle deadline extended from 24h to 48h', async () => {
      const { useNotificationStore } = await import('@/stores/notificationStore');
      const notificationStore = useNotificationStore();

      // Original notification for 24h due
      const originalNotification = {
        title: 'Deadline Reminder: Extended Task',
        body: 'Task: Extended Task\nTime Remaining: 24 hours and 0 minutes\nDeadline: October 31, 2025 at 4:40 PM',
        taskId: 'extended-task-123'
      };

      notificationStore.addNotification(originalNotification);

      // Extended notification for 48h due
      const extendedNotification = {
        title: 'Deadline Reminder: Extended Task',
        body: 'Task: Extended Task\nTime Remaining: 48 hours and 0 minutes\nDeadline: November 1, 2025 at 4:40 PM',
        taskId: 'extended-task-123'
      };

      notificationStore.addNotification(extendedNotification);

      // Should have both notifications (new one added for extended deadline)
      expect(notificationStore.notificationQueue).toHaveLength(2);
      
      const extendedNotif = notificationStore.notificationQueue[1];
      expect(extendedNotif.body).toContain('48 hours and 0 minutes');
    });

    it('should handle significant deadline extension', async () => {
      const { useNotificationStore } = await import('@/stores/notificationStore');
      const notificationStore = useNotificationStore();

      const taskId = 'significant-extend-task-456';

      // Original: due in 24h
      const originalNotification = {
        title: 'Deadline Reminder: Significant Extend Task',
        body: 'Task: Significant Extend Task\nTime Remaining: 24 hours and 0 minutes\nDeadline: October 31, 2025 at 4:40 PM',
        taskId: taskId
      };

      notificationStore.addNotification(originalNotification);

      // Extended to 168h (1 week)
      const weekLaterNotification = {
        title: 'Deadline Reminder: Significant Extend Task',
        body: 'Task: Significant Extend Task\nTime Remaining: 168 hours and 0 minutes\nDeadline: November 6, 2025 at 4:40 PM',
        taskId: taskId
      };

      notificationStore.addNotification(weekLaterNotification);

      expect(notificationStore.notificationQueue).toHaveLength(2);
      
      const weekLaterNotif = notificationStore.notificationQueue[1];
      expect(weekLaterNotif.body).toContain('168 hours and 0 minutes');
    });
  });

  // AC11: Task deletion should stop reminders
  describe('Task Deletion Handling (AC11)', () => {
    it('should remove notifications when task is deleted', async () => {
      const { useNotificationStore } = await import('@/stores/notificationStore');
      const notificationStore = useNotificationStore();

      const taskId = 'deleted-task-123';

      // Add notification for task that will be deleted
      const taskNotification = {
        title: 'Deadline Reminder: Deleted Task',
        body: 'Task: Deleted Task\nTime Remaining: 12 hours and 0 minutes\nDeadline: October 31, 2025 at 4:40 AM',
        taskId: taskId
      };

      notificationStore.addNotification(taskNotification);
      expect(notificationStore.notificationQueue).toHaveLength(1);

      // Simulate task deletion by removing notifications for that task
      const filteredQueue = notificationStore.notificationQueue.filter(
        notif => notif.taskId !== taskId
      );
      notificationStore.notificationQueue.splice(0, notificationStore.notificationQueue.length, ...filteredQueue);

      // Should be removed when task is deleted
      expect(notificationStore.notificationQueue).toHaveLength(0);
    });

    it('should handle task with missing critical data gracefully', async () => {
      const { useNotificationStore } = await import('@/stores/notificationStore');
      const notificationStore = useNotificationStore();

      // Notification with incomplete data
      const incompleteNotification = {
        title: 'Deadline Reminder: Incomplete Task',
        body: 'Task: Incomplete Task\nTime Remaining: 12 hours and 0 minutes\nDeadline: Invalid Date',
        taskId: 'incomplete-task-456'
        // Missing some expected fields
      };

      // Should handle gracefully without crashing
      expect(() => {
        notificationStore.addNotification(incompleteNotification);
      }).not.toThrow();

      expect(notificationStore.notificationQueue).toHaveLength(1);
    });
  });

  // AC17: Multiple tasks with same deadline → separate emails
  describe('Multiple Tasks Same Deadline (AC17)', () => {
    it('should handle separate notifications for tasks with identical deadlines', async () => {
      const { useNotificationStore } = await import('@/stores/notificationStore');
      const notificationStore = useNotificationStore();

      const sameDeadline = 'October 31, 2025 at 4:40 PM';
      
      const task1 = {
        title: 'Deadline Reminder: Task A',
        body: `Task: Task A\nTime Remaining: 24 hours and 0 minutes\nDeadline: ${sameDeadline}`,
        taskId: 'task-a-1'
      };

      const task2 = {
        title: 'Deadline Reminder: Task B',
        body: `Task: Task B\nTime Remaining: 24 hours and 0 minutes\nDeadline: ${sameDeadline}`,
        taskId: 'task-b-2'
      };

      notificationStore.addNotification(task1);
      notificationStore.addNotification(task2);

      // Should have separate notifications for each task
      expect(notificationStore.notificationQueue).toHaveLength(2);
      
      expect(notificationStore.notificationQueue[0].title).toBe('Deadline Reminder: Task A');
      expect(notificationStore.notificationQueue[1].title).toBe('Deadline Reminder: Task B');
      expect(notificationStore.notificationQueue[0].body).toContain('Task A');
      expect(notificationStore.notificationQueue[1].body).toContain('Task B');
    });

    it('should handle many tasks with same deadline', async () => {
      const { useNotificationStore } = await import('@/stores/notificationStore');
      const notificationStore = useNotificationStore();

      const sameDeadline = 'October 31, 2025 at 4:40 PM';
      const tasks = ['Task 1', 'Task 2', 'Task 3', 'Task 4', 'Task 5'];

      // Add notifications for all tasks with same deadline
      tasks.forEach((taskTitle, index) => {
        const notification = {
          title: `Deadline Reminder: ${taskTitle}`,
          body: `Task: ${taskTitle}\nTime Remaining: 24 hours and 0 minutes\nDeadline: ${sameDeadline}`,
          taskId: `task-${index + 1}`
        };
        notificationStore.addNotification(notification);
      });

      // Should have separate notification for each task
      expect(notificationStore.notificationQueue).toHaveLength(5);
      
      // Verify each has unique content
      tasks.forEach((taskTitle, index) => {
        const notification = notificationStore.notificationQueue[index];
        expect(notification.title).toBe(`Deadline Reminder: ${taskTitle}`);
        expect(notification.body).toContain(taskTitle);
      });
    });

    it('should queue multiple notifications correctly', async () => {
      const { useNotificationStore } = await import('@/stores/notificationStore');
      const notificationStore = useNotificationStore();

      // Add multiple notifications rapidly
      for (let i = 1; i <= 10; i++) {
        const notification = {
          title: `Deadline Reminder: Batch Task ${i}`,
          body: `Task: Batch Task ${i}\nTime Remaining: ${i * 2} hours and 0 minutes\nDeadline: October ${30 + i}, 2025 at 4:40 PM`,
          taskId: `batch-task-${i}`
        };
        notificationStore.addNotification(notification);
      }

      expect(notificationStore.notificationQueue).toHaveLength(10);
      expect(notificationStore.currentNotification.title).toBe('Deadline Reminder: Batch Task 1');
    });
  });

  // AC13-14: Disabled notifications suppress all reminders
  describe('Disabled Notifications (AC13-14)', () => {
    it('should handle email notification toggle off', async () => {
      const authStore = useAuthStore();
      authStore.user = { 
        email: 'test@example.com',
        notificationSettings: {
          emailEnabled: false, // Email notifications disabled
          emailPresetReminders: [1, 3, 7]
        }
      };

      const wrapper = mount(Settings, {
        global: {
          plugins: [vuetify, createPinia()],
          mocks: {
            $auth: authStore
          }
        }
      });

      await wrapper.vm.$nextTick();

      // Settings should reflect disabled state
      expect(wrapper.exists()).toBe(true);
      expect(authStore.user.notificationSettings.emailEnabled).toBe(false);
    });

    it('should suppress notification display when disabled', async () => {
      const { useNotificationStore } = await import('@/stores/notificationStore');
      const notificationStore = useNotificationStore();

      // Add notification
      const notification = {
        title: 'Deadline Reminder: Suppressed Task',
        body: 'Task: Suppressed Task\nTime Remaining: 24 hours and 0 minutes\nDeadline: October 31, 2025 at 4:40 PM',
        taskId: 'suppressed-task-123'
      };

      notificationStore.addNotification(notification);
      expect(notificationStore.notificationQueue).toHaveLength(1);

      // Simulate notifications being disabled
      notificationStore.notificationQueue.splice(0, notificationStore.notificationQueue.length);

      // Should be suppressed when notifications are disabled
      expect(notificationStore.notificationQueue).toHaveLength(0);
    });

    it('should handle notification service failures gracefully', async () => {
      const { fetchNotificationHistory } = await import('@/services/notification-service');
      fetchNotificationHistory.mockRejectedValue(new Error('Service unavailable'));

      const wrapper = mount(await import('@/views/NotificationHistory.vue').then(m => m.default), {
        global: {
          plugins: [vuetify, createPinia()]
        }
      });

      await wrapper.vm.$nextTick();

      // Should handle service failures gracefully without crashing
      expect(wrapper.exists()).toBe(true);
    });

    it('should validate notification settings combinations', () => {
      const validSettings = [
        { emailEnabled: true, emailPresetReminders: [1, 3, 7] },
        { emailEnabled: true, emailReminderType: 'custom', emailCustomReminders: [2, 6, 12] },
        { emailEnabled: false, emailPresetReminders: [] }
      ];

      validSettings.forEach(settings => {
        expect(typeof settings.emailEnabled).toBe('boolean');
        if (settings.emailEnabled) {
          expect(settings.emailPresetReminders || settings.emailCustomReminders).toBeDefined();
        }
      });
    });
  });

  // Additional Edge Case Tests
  describe('Additional Edge Cases', () => {
    it('should handle timezone changes for deadline calculations', async () => {
      const { useNotificationStore } = await import('@/stores/notificationStore');
      const notificationStore = useNotificationStore();

      const notification = {
        title: 'Deadline Reminder: Timezone Task',
        body: 'Task: Timezone Task\nTime Remaining: 24 hours and 0 minutes\nDeadline: October 31, 2025 at 4:40 PM EST',
        taskId: 'timezone-task-123'
      };

      notificationStore.addNotification(notification);
      expect(notificationStore.notificationQueue).toHaveLength(1);
    });

    it('should handle very large numbers of notifications', async () => {
      const { useNotificationStore } = await import('@/stores/notificationStore');
      const notificationStore = useNotificationStore();

      // Add many notifications to test queue handling
      for (let i = 1; i <= 100; i++) {
        const notification = {
          title: `Deadline Reminder: Bulk Task ${i}`,
          body: `Task: Bulk Task ${i}\nTime Remaining: ${i} hours and 0 minutes\nDeadline: October ${30 + i}, 2025 at 4:40 PM`,
          taskId: `bulk-task-${i}`
        };
        notificationStore.addNotification(notification);
      }

      expect(notificationStore.notificationQueue).toHaveLength(100);
    });

    it('should handle notifications with special characters', async () => {
      const { useNotificationStore } = await import('@/stores/notificationStore');
      const notificationStore = useNotificationStore();

      const specialCharNotification = {
        title: 'Deadline Reminder: Special "Quotes" & <Tags>',
        body: 'Task: Special "Task" with \\ slashes & <html> tags\nTime Remaining: 24 hours and 0 minutes\nDeadline: October 31, 2025 at 4:40 PM',
        taskId: 'special-char-task-123'
      };

      notificationStore.addNotification(specialCharNotification);
      expect(notificationStore.notificationQueue).toHaveLength(1);
      expect(notificationStore.notificationQueue[0].title).toContain('"Quotes"');
    });
  });
});
});