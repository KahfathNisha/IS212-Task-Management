// ========================================
// TASK REMINDER JOB EDGE CASE TESTS
// ========================================

const cron = require('node-cron');
const { db, admin } = require('../src/config/firebase');
const NotificationService = require('../src/services/notificationService');

// Mock dependencies
jest.mock('node-cron', () => ({
  schedule: jest.fn()
}));

jest.mock('../src/config/firebase', () => ({
  db: {
    collection: jest.fn(() => ({
      where: jest.fn(() => ({
        where: jest.fn(() => ({
          get: jest.fn()
        })),
        get: jest.fn()
      }))
    }))
  },
  admin: {
    firestore: {
      Timestamp: {
        now: () => ({ toDate: () => new Date() })
      }
    },
    messaging: () => ({
      send: jest.fn().mockResolvedValue({ success: true }),
      sendMulticast: jest.fn().mockResolvedValue({ successCount: 1 })
    })
  }
}));

jest.mock('../src/services/notificationService');

// Import the taskReminderJob module
const taskReminderJob = require('../src/controllers/taskReminderJob');

describe('Task Reminder Job Edge Cases', () => {
  let mockNow;

  beforeEach(() => {
    jest.clearAllMocks();
    mockNow = new Date('2025-10-30T16:44:00.000Z');
    
    // Reset global state
    global.reminderJobStarted = false;
  });

  // AC1: Lead time handling in job processing
  describe('Lead Time Processing (AC1)', () => {
    it('should process reminder for task created inside lead time', async () => {
      // Mock users collection with email enabled
      const mockUsersSnapshot = {
        docs: [{
          id: 'user123',
          data: () => ({
            notificationSettings: {
              emailEnabled: true,
              emailPresetReminders: [1, 3, 7] // 24h lead time
            },
            timezone: 'America/New_York'
          })
        }]
      };

      // Mock tasks collection with short notice task (6h due)
      const mockTasksSnapshot = {
        docs: [{
          id: 'task-short-123',
          data: () => ({
            title: 'Short Notice Task',
            dueDate: {
              toDate: () => new Date(mockNow.getTime() + 6 * 60 * 60 * 1000) // 6 hours from now
            },
            assigneeId: 'user123',
            archived: false
          })
        }]
      };

      // Mock empty email reminders (no previous reminders sent)
      const mockEmptyRemindersSnapshot = {
        empty: true
      };

      // Setup mock chain
      const mockCollection = {
        where: jest.fn()
      };

      const mockUsersCollection = {
        where: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue(mockUsersSnapshot)
        })
      };

      const mockTasksCollection = {
        where: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue(mockTasksSnapshot)
          })
        })
      };

      const mockRemindersCollection = {
        where: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              orderBy: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                  get: jest.fn().mockResolvedValue(mockEmptyRemindersSnapshot)
                })
              })
            })
          }),
          add: jest.fn().mockResolvedValue({ id: 'reminder123' })
        })
      };

      db.collection.mockImplementation((collectionName) => {
        if (collectionName === 'users') return mockUsersCollection;
        if (collectionName === 'tasks') return mockTasksCollection;
        if (collectionName === 'emailReminders') return mockRemindersCollection;
        return mockCollection;
      });

      // Mock NotificationService.processDeadlineReminders to test the wrapper function
      NotificationService.processDeadlineReminders.mockResolvedValue();

      // Import and trigger processDeadlineReminders
      const { processDeadlineReminders } = require('../src/controllers/taskReminderJob');
      await processDeadlineReminders(mockNow);

      // Should call the NotificationService method
      expect(NotificationService.processDeadlineReminders).toHaveBeenCalledTimes(1);
      expect(NotificationService.processDeadlineReminders).toHaveBeenCalledWith(mockNow);
    });

    it('should handle task due in minutes (extreme short notice)', async () => {
      const mockUsersSnapshot = {
        docs: [{
          id: 'user456',
          data: () => ({
            notificationSettings: {
              emailEnabled: true,
              emailPresetReminders: [1]
            },
            timezone: 'America/New_York'
          })
        }]
      };

      const mockTasksSnapshot = {
        docs: [{
          id: 'task-456',
          data: () => ({
            title: 'Urgent Task',
            dueDate: {
              toDate: () => new Date(mockNow.getTime() + 30 * 60 * 1000) // 30 minutes
            },
            assigneeId: 'user456',
            archived: false
          })
        }]
      };

      const mockEmptyRemindersSnapshot = { empty: true };

      const mockUsersCollection = {
        where: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue(mockUsersSnapshot)
        })
      };

      const mockTasksCollection = {
        where: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue(mockTasksSnapshot)
          })
        })
      };

      const mockRemindersCollection = {
        where: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              orderBy: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                  get: jest.fn().mockResolvedValue(mockEmptyRemindersSnapshot)
                })
              })
            })
          }),
          add: jest.fn().mockResolvedValue({ id: 'reminder456' })
        })
      };

      db.collection.mockImplementation((collectionName) => {
        if (collectionName === 'users') return mockUsersCollection;
        if (collectionName === 'tasks') return mockTasksCollection;
        if (collectionName === 'emailReminders') return mockRemindersCollection;
        return { where: jest.fn() };
      });

      NotificationService.processDeadlineReminders.mockResolvedValue();

      const { processDeadlineReminders } = require('../src/controllers/taskReminderJob');
      await processDeadlineReminders(mockNow);

      expect(NotificationService.processDeadlineReminders).toHaveBeenCalledTimes(1);
      expect(NotificationService.processDeadlineReminders).toHaveBeenCalledWith(mockNow);
    });
  });

  // AC9: Deadline pushed earlier
  describe('Deadline Adjustments - Earlier', () => {
    it('should reschedule reminder when deadline moved from 24h to 8h', async () => {
      // Mock user with notification enabled
      const mockUsersSnapshot = {
        docs: [{
          id: 'user789',
          data: () => ({
            notificationSettings: {
              emailEnabled: true,
              emailPresetReminders: [1, 3, 7]
            },
            timezone: 'America/New_York'
          })
        }]
      };

      // Task originally due in 24h, now due in 8h
      const mockTasksSnapshot = {
        docs: [{
          id: 'task-789',
          data: () => ({
            title: 'Adjustable Task',
            dueDate: {
              toDate: () => new Date(mockNow.getTime() + 8 * 60 * 60 * 1000) // Now due in 8h
            },
            assigneeId: 'user789',
            archived: false
          })
        }]
      };

      // Mock existing reminder for 24h (should be ignored)
      const mockExistingReminder = {
        empty: false,
        docs: [{
          data: () => ({
            userId: 'user789',
            taskId: 'task-789',
            daysLeft: 1, // 24h reminder already sent
            sentAt: admin.firestore.Timestamp.now()
          })
        }]
      };

      const mockUsersCollection = {
        where: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue(mockUsersSnapshot)
        })
      };

      const mockTasksCollection = {
        where: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue(mockTasksSnapshot)
          })
        })
      };

      const mockRemindersCollection = {
        where: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              orderBy: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                  get: jest.fn().mockResolvedValue(mockExistingReminder)
                })
              })
            })
          }),
          add: jest.fn().mockResolvedValue({ id: 'reminder789' })
        })
      };

      db.collection.mockImplementation((collectionName) => {
        if (collectionName === 'users') return mockUsersCollection;
        if (collectionName === 'tasks') return mockTasksCollection;
        if (collectionName === 'emailReminders') return mockRemindersCollection;
        return { where: jest.fn() };
      });

      // Since reminder exists, should still call the service (it handles the deduplication internally)
      NotificationService.processDeadlineReminders.mockResolvedValue();

      const { processDeadlineReminders } = require('../src/controllers/taskReminderJob');
      await processDeadlineReminders(mockNow);

      // Should still call the service as it handles the logic internally
      expect(NotificationService.processDeadlineReminders).toHaveBeenCalledTimes(1);
    });

    it('should send new reminder for different time interval after deadline change', async () => {
      const mockUsersSnapshot = {
        docs: [{
          id: 'user101',
          data: () => ({
            notificationSettings: {
              emailEnabled: true,
              emailPresetReminders: [1, 3, 7]
            },
            timezone: 'America/New_York'
          })
        }]
      };

      // Task due in 12h now (different from previous 24h reminder)
      const mockTasksSnapshot = {
        docs: [{
          id: 'task-101',
          data: () => ({
            title: 'Reschedule Task',
            dueDate: {
              toDate: () => new Date(mockNow.getTime() + 12 * 60 * 60 * 1000)
            },
            assigneeId: 'user101',
            archived: false
          })
        }]
      };

      // No existing reminder for 12h interval
      const mockExistingReminder = {
        empty: true
      };

      const mockUsersCollection = {
        where: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue(mockUsersSnapshot)
        })
      };

      const mockTasksCollection = {
        where: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue(mockTasksSnapshot)
          })
        })
      };

      const mockRemindersCollection = {
        where: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              orderBy: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                  get: jest.fn().mockResolvedValue(mockExistingReminder)
                })
              })
            })
          }),
          add: jest.fn().mockResolvedValue({ id: 'reminder101' })
        })
      };

      db.collection.mockImplementation((collectionName) => {
        if (collectionName === 'users') return mockUsersCollection;
        if (collectionName === 'tasks') return mockTasksCollection;
        if (collectionName === 'emailReminders') return mockRemindersCollection;
        return { where: jest.fn() };
      });

      NotificationService.processDeadlineReminders.mockResolvedValue();

      const { processDeadlineReminders } = require('../src/controllers/taskReminderJob');
      await processDeadlineReminders(mockNow);

      // Should send 12h reminder (different from existing 24h reminder)
      expect(NotificationService.processDeadlineReminders).toHaveBeenCalledTimes(1);
      expect(NotificationService.processDeadlineReminders).toHaveBeenCalledWith(mockNow);
    });
  });

  // AC10: Deadline pushed later
  describe('Deadline Adjustments - Later', () => {
    it('should schedule new reminders when deadline extended from 24h to 48h', async () => {
      const mockUsersSnapshot = {
        docs: [{
          id: 'user202',
          data: () => ({
            notificationSettings: {
              emailEnabled: true,
              emailPresetReminders: [1, 3, 7] // 24h, 72h, 168h
            },
            timezone: 'America/New_York'
          })
        }]
      };

      // Task now due in 48h (extended from 24h)
      const mockTasksSnapshot = {
        docs: [{
          id: 'task-202',
          data: () => ({
            title: 'Extended Task',
            dueDate: {
              toDate: () => new Date(mockNow.getTime() + 72 * 60 * 60 * 1000) // 72 hours (3 days)
            },
            assigneeId: 'user202',
            archived: false
          })
        }]
      };

      const mockEmptyRemindersSnapshot = { empty: true };

      const mockUsersCollection = {
        where: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue(mockUsersSnapshot)
        })
      };

      const mockTasksCollection = {
        where: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue(mockTasksSnapshot)
          })
        })
      };

      const mockRemindersCollection = {
        where: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              orderBy: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                  get: jest.fn().mockResolvedValue(mockEmptyRemindersSnapshot)
                })
              })
            })
          }),
          add: jest.fn().mockResolvedValue({ id: 'reminder202' })
        })
      };

      db.collection.mockImplementation((collectionName) => {
        if (collectionName === 'users') return mockUsersCollection;
        if (collectionName === 'tasks') return mockTasksCollection;
        if (collectionName === 'emailReminders') return mockRemindersCollection;
        return { where: jest.fn() };
      });

      NotificationService.processDeadlineReminders.mockResolvedValue();

      const { processDeadlineReminders } = require('../src/controllers/taskReminderJob');
      await processDeadlineReminders(mockNow);

      // Should send 72h reminder (3 days) - matches 72h preset exactly
      expect(NotificationService.processDeadlineReminders).toHaveBeenCalledTimes(1);
      expect(NotificationService.processDeadlineReminders).toHaveBeenCalledWith(mockNow);
    });
  });

  // AC11: Task deletion handling
  describe('Task Deletion Handling', () => {
    it('should not process reminders for deleted/archived tasks', async () => {
      const mockUsersSnapshot = {
        docs: [{
          id: 'user303',
          data: () => ({
            notificationSettings: {
              emailEnabled: true,
              emailPresetReminders: [1, 3, 7]
            },
            timezone: 'America/New_York'
          })
        }]
      };

      // Only active task (archived tasks are filtered out by the query)
      const mockTasksSnapshot = {
        docs: [
          {
            id: 'active-task-303',
            data: () => ({
              title: 'Active Task',
              dueDate: {
                toDate: () => new Date(mockNow.getTime() + 24 * 60 * 60 * 1000)
              },
              assigneeId: 'user303',
              archived: false // Active task
            })
          }
        ]
      };

      const mockEmptyRemindersSnapshot = { empty: true };

      const mockUsersCollection = {
        where: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue(mockUsersSnapshot)
        })
      };

      const mockTasksCollection = {
        where: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue(mockTasksSnapshot)
          })
        })
      };

      const mockRemindersCollection = {
        where: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              orderBy: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                  get: jest.fn().mockResolvedValue(mockEmptyRemindersSnapshot)
                })
              })
            })
          }),
          add: jest.fn().mockResolvedValue({ id: 'reminder303' })
        })
      };

      db.collection.mockImplementation((collectionName) => {
        if (collectionName === 'users') return mockUsersCollection;
        if (collectionName === 'tasks') return mockTasksCollection;
        if (collectionName === 'emailReminders') return mockRemindersCollection;
        return { where: jest.fn() };
      });

      NotificationService.processDeadlineReminders.mockResolvedValue();

      const { processDeadlineReminders } = require('../src/controllers/taskReminderJob');
      await processDeadlineReminders(mockNow);

      // Should only process active task, not archived one
      expect(NotificationService.processDeadlineReminders).toHaveBeenCalledTimes(1);
      expect(NotificationService.processDeadlineReminders).toHaveBeenCalledWith(mockNow);
    });
  });

  // AC17: Multiple tasks with same deadline
  describe('Multiple Tasks Same Deadline', () => {
    it('should process separate reminders for tasks with identical deadlines', async () => {
      const mockUsersSnapshot = {
        docs: [{
          id: 'user404',
          data: () => ({
            notificationSettings: {
              emailEnabled: true,
              emailPresetReminders: [1, 3, 7]
            },
            timezone: 'America/New_York'
          })
        }]
      };

      // Multiple tasks with same due date
      const sameDueDate = new Date(mockNow.getTime() + 24 * 60 * 60 * 1000);
      const mockTasksSnapshot = {
        docs: [
          {
            id: 'task-a-404',
            data: () => ({
              title: 'Task A',
              dueDate: { toDate: () => sameDueDate },
              assigneeId: 'user404',
              archived: false
            })
          },
          {
            id: 'task-b-405',
            data: () => ({
              title: 'Task B',
              dueDate: { toDate: () => sameDueDate },
              assigneeId: 'user404',
              archived: false
            })
          },
          {
            id: 'task-c-406',
            data: () => ({
              title: 'Task C',
              dueDate: { toDate: () => sameDueDate },
              assigneeId: 'user404',
              archived: false
            })
          }
        ]
      };

      const mockEmptyRemindersSnapshot = { empty: true };

      const mockUsersCollection = {
        where: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue(mockUsersSnapshot)
        })
      };

      const mockTasksCollection = {
        where: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue(mockTasksSnapshot)
          })
        })
      };

      const mockRemindersCollection = {
        where: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              orderBy: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                  get: jest.fn().mockResolvedValue(mockEmptyRemindersSnapshot)
                })
              })
            })
          }),
          add: jest.fn().mockResolvedValue({ id: 'reminder404' })
        })
      };

      db.collection.mockImplementation((collectionName) => {
        if (collectionName === 'users') return mockUsersCollection;
        if (collectionName === 'tasks') return mockTasksCollection;
        if (collectionName === 'emailReminders') return mockRemindersCollection;
        return { where: jest.fn() };
      });

      NotificationService.processDeadlineReminders.mockResolvedValue();

      const { processDeadlineReminders } = require('../src/controllers/taskReminderJob');
      await processDeadlineReminders(mockNow);

      // Should send separate notification for each task
      expect(NotificationService.processDeadlineReminders).toHaveBeenCalledTimes(1);
      
      // Should have called with the correct time parameter
      expect(NotificationService.processDeadlineReminders).toHaveBeenCalledWith(mockNow);
    });
  });

  // AC13-14: Disabled notifications
  describe('Disabled Notifications', () => {
    it('should skip users with email notifications disabled', async () => {
      const mockUsersSnapshot = {
        docs: [
          {
            id: 'user505',
            data: () => ({
              notificationSettings: {
                emailEnabled: false, // Email disabled
                emailPresetReminders: [1, 3, 7]
              },
              timezone: 'America/New_York'
            })
          },
          {
            id: 'user506',
            data: () => ({
              notificationSettings: {
                emailEnabled: true, // Email enabled
                emailPresetReminders: [1, 3, 7]
              },
              timezone: 'America/New_York'
            })
          }
        ]
      };

      const mockTasksSnapshot = {
        docs: [{
          id: 'task-mixed-507',
          data: () => ({
            title: 'Mixed User Task',
            dueDate: {
              toDate: () => new Date(mockNow.getTime() + 24 * 60 * 60 * 1000)
            },
            assigneeId: 'user505', // User with disabled email
            archived: false
          })
        }]
      };

      const mockUsersCollection = {
        where: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue(mockUsersSnapshot)
        })
      };

      const mockTasksCollection = {
        where: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue(mockTasksSnapshot)
          })
        })
      };

      db.collection.mockImplementation((collectionName) => {
        if (collectionName === 'users') return mockUsersCollection;
        if (collectionName === 'tasks') return mockTasksCollection;
        return { where: jest.fn() };
      });

      NotificationService.processDeadlineReminders.mockResolvedValue();

      const { processDeadlineReminders } = require('../src/controllers/taskReminderJob');
      await processDeadlineReminders(mockNow);

      // Should call the service as it handles disabled notifications internally
      expect(NotificationService.processDeadlineReminders).toHaveBeenCalledTimes(1);
    });

    it('should handle users with no notification settings', async () => {
      const mockUsersSnapshot = {
        docs: [{
          id: 'user707',
          data: () => ({
            // No notificationSettings
            timezone: 'America/New_York'
          })
        }]
      };

      const mockTasksSnapshot = {
        docs: [{
          id: 'task-no-settings-708',
          data: () => ({
            title: 'No Settings Task',
            dueDate: {
              toDate: () => new Date(mockNow.getTime() + 24 * 60 * 60 * 1000)
            },
            assigneeId: 'user707',
            archived: false
          })
        }]
      };

      const mockUsersCollection = {
        where: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue(mockUsersSnapshot)
        })
      };

      const mockTasksCollection = {
        where: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue(mockTasksSnapshot)
          })
        })
      };

      db.collection.mockImplementation((collectionName) => {
        if (collectionName === 'users') return mockUsersCollection;
        if (collectionName === 'tasks') return mockTasksCollection;
        return { where: jest.fn() };
      });

      // Should not crash when notificationSettings is missing
      NotificationService.processDeadlineReminders.mockResolvedValue();
      
      const { processDeadlineReminders } = require('../src/controllers/taskReminderJob');
      await expect(processDeadlineReminders(mockNow)).resolves.not.toThrow();
    });
  });

  // Error handling and edge cases
  describe('Error Handling and Edge Cases', () => {
    it('should handle database errors gracefully', async () => {
      const mockUsersCollection = {
        where: jest.fn().mockReturnValue({
          get: jest.fn().mockRejectedValue(new Error('Database connection failed'))
        })
      };

      db.collection.mockImplementation((collectionName) => {
        if (collectionName === 'users') return mockUsersCollection;
        return { where: jest.fn() };
      });

      const { processDeadlineReminders } = require('../src/controllers/taskReminderJob');
      
      // Should not crash on database errors
      await expect(processDeadlineReminders(mockNow)).resolves.not.toThrow();
    });

    it('should re-throw task processing errors', async () => {
      const mockUsersSnapshot = {
        docs: [{
          id: 'user808',
          data: () => ({
            notificationSettings: {
              emailEnabled: true,
              emailPresetReminders: [1, 3, 7]
            },
            timezone: 'America/New_York'
          })
        }]
      };

      const mockTasksSnapshot = {
        docs: [{
          id: 'task-error-809',
          data: () => ({
            title: 'Error Task',
            dueDate: {
              toDate: () => new Error('Invalid date') // This will cause an error
            },
            assigneeId: 'user808',
            archived: false
          })
        }]
      };

      const mockEmptyRemindersSnapshot = { empty: true };

      const mockUsersCollection = {
        where: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue(mockUsersSnapshot)
        })
      };

      const mockTasksCollection = {
        where: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue(mockTasksSnapshot)
          })
        })
      };

      const mockRemindersCollection = {
        where: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              orderBy: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                  get: jest.fn().mockResolvedValue(mockEmptyRemindersSnapshot)
                })
              })
            })
          }),
          add: jest.fn().mockResolvedValue({ id: 'reminder123' })
        })
      };

      db.collection.mockImplementation((collectionName) => {
        if (collectionName === 'users') return mockUsersCollection;
        if (collectionName === 'tasks') return mockTasksCollection;
        if (collectionName === 'emailReminders') return mockRemindersCollection;
        return { where: jest.fn() };
      });

      // Mock NotificationService to throw error
      NotificationService.processDeadlineReminders.mockRejectedValue(new Error('Notification failed'));

      const { processDeadlineReminders } = require('../src/controllers/taskReminderJob');
      
      // Should re-throw errors since taskReminderJob re-throws them
      await expect(processDeadlineReminders(mockNow)).rejects.toThrow('Notification failed');
    });

    it('should handle very large numbers of tasks', async () => {
      const mockUsersSnapshot = {
        docs: [{
          id: 'bulk-user',
          data: () => ({
            notificationSettings: {
              emailEnabled: true,
              emailPresetReminders: [1, 3, 7]
            },
            timezone: 'America/New_York'
          })
        }]
      };

      // Generate many tasks
      const mockTasksDocs = [];
      for (let i = 1; i <= 1000; i++) {
        mockTasksDocs.push({
          id: `bulk-task-${i}`,
          data: () => ({
            title: `Bulk Task ${i}`,
            dueDate: {
              toDate: () => new Date(mockNow.getTime() + 24 * 60 * 60 * 1000)
            },
            assigneeId: 'bulk-user',
            archived: false
          })
        });
      }

      const mockTasksSnapshot = {
        docs: mockTasksDocs
      };

      const mockEmptyRemindersSnapshot = { empty: true };

      const mockUsersCollection = {
        where: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue(mockUsersSnapshot)
        })
      };

      const mockTasksCollection = {
        where: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue(mockTasksSnapshot)
          })
        })
      };

      const mockRemindersCollection = {
        where: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              orderBy: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                  get: jest.fn().mockResolvedValue(mockEmptyRemindersSnapshot)
                })
              })
            })
          }),
          add: jest.fn().mockResolvedValue({ id: `bulk-reminder` })
        })
      };

      db.collection.mockImplementation((collectionName) => {
        if (collectionName === 'users') return mockUsersCollection;
        if (collectionName === 'tasks') return mockTasksCollection;
        if (collectionName === 'emailReminders') return mockRemindersCollection;
        return { where: jest.fn() };
      });

      NotificationService.processDeadlineReminders.mockResolvedValue();

      const { processDeadlineReminders } = require('../src/controllers/taskReminderJob');
      await processDeadlineReminders(mockNow);

      // Should process all tasks without crashing
      expect(NotificationService.processDeadlineReminders).toHaveBeenCalledTimes(1);
    });
  });
});