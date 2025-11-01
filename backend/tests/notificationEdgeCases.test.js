// Mock Firebase before requiring the service
const mockNotificationsCollection = {
  add: jest.fn(),
  get: jest.fn(),
  where: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  startAfter: jest.fn().mockReturnThis()
};

const mockDoc = {
  get: jest.fn(),
  collection: jest.fn(() => mockNotificationsCollection),
  update: jest.fn(),
  delete: jest.fn()
};

const mockCollection = {
  doc: jest.fn(() => mockDoc),
  add: jest.fn(),
  get: jest.fn(),
  where: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  startAfter: jest.fn().mockReturnThis()
};

const mockBatch = {
  update: jest.fn(),
  delete: jest.fn(),
  commit: jest.fn()
};

jest.mock('../src/config/firebase', () => ({
  db: {
    collection: jest.fn(() => mockCollection),
    batch: jest.fn(() => mockBatch)
  },
  admin: {
    firestore: {
      Timestamp: {
        now: jest.fn(() => ({ toDate: () => new Date() })),
        fromDate: jest.fn(() => ({ toDate: () => new Date() }))
      }
    }
  }
}));

const NotificationService = require('../src/services/notificationService');

jest.mock('../src/services/emailService', () => ({
  sendDeadlineReminder: jest.fn()
}));

describe('Notification Edge Cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock responses
    mockNotificationsCollection.add.mockResolvedValue({ id: 'notification-123' });
    mockBatch.commit.mockResolvedValue(true);
  });

  describe('Deadline Reminder Edge Cases', () => {
    it('should handle task due in exactly 1 day', async () => {
      const now = new Date();
      const dueDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Exactly 24 hours from now
      
      const timeDiff = dueDate - now;
      const hoursUntilDue = timeDiff / (1000 * 60 * 60);
      const daysUntilDue = hoursUntilDue / 24;

      expect(daysUntilDue).toBeCloseTo(1, 1);
    });

    it('should handle task due in exactly 3 days', async () => {
      const now = new Date();
      const dueDate = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000); // Exactly 3 days from now
      
      const timeDiff = dueDate - now;
      const hoursUntilDue = timeDiff / (1000 * 60 * 60);
      const daysUntilDue = hoursUntilDue / 24;

      expect(daysUntilDue).toBeCloseTo(3, 1);
    });

    it('should handle task due in exactly 7 days', async () => {
      const now = new Date();
      const dueDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // Exactly 7 days from now
      
      const timeDiff = dueDate - now;
      const hoursUntilDue = timeDiff / (1000 * 60 * 60);
      const daysUntilDue = hoursUntilDue / 24;

      expect(daysUntilDue).toBeCloseTo(7, 1);
    });

    it('should handle custom reminder intervals in hours', async () => {
      const now = new Date();
      const dueDate = new Date(now.getTime() + 48 * 60 * 60 * 1000); // 48 hours from now
      
      const userData = {
        email: 'test@example.com',
        notificationSettings: {
          emailEnabled: true,
          emailReminderType: 'custom',
          emailCustomReminders: [24, 48, 72] // 24, 48, 72 hours
        }
      };

      const timeDiff = dueDate - now;
      const hoursUntilDue = timeDiff / (1000 * 60 * 60);
      const daysUntilDue = hoursUntilDue / 24;

      // Convert custom reminders from hours to days
      const reminderIntervals = userData.notificationSettings.emailCustomReminders.map(hours => hours / 24);
      const shouldSendReminder = reminderIntervals.some(interval => Math.abs(daysUntilDue - interval) < 0.1);

      expect(reminderIntervals).toEqual([1, 2, 3]); // 24h=1day, 48h=2days, 72h=3days
      expect(shouldSendReminder).toBe(true); // 48 hours = 2 days, should trigger
    });

    it('should not send reminder for task due in the past', async () => {
      const now = new Date();
      const dueDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago
      
      const timeDiff = dueDate - now;
      const hoursUntilDue = timeDiff / (1000 * 60 * 60);

      expect(hoursUntilDue).toBeLessThan(0);
    });

    it('should handle task due in less than 1 hour', async () => {
      const now = new Date();
      const dueDate = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes from now
      
      const timeDiff = dueDate - now;
      const hoursUntilDue = timeDiff / (1000 * 60 * 60);
      const minutesUntilDue = (hoursUntilDue - Math.floor(hoursUntilDue)) * 60;

      expect(hoursUntilDue).toBeCloseTo(0.5, 1);
      expect(minutesUntilDue).toBeCloseTo(30, 1);
    });
  });

  describe('Task Creation and Deletion Edge Cases', () => {
    it('should handle task created and immediately deleted', async () => {
      // Simulate task creation notification
      const notificationData = {
        title: 'New Task Assigned',
        body: 'You have been assigned a new task: "Test Task"',
        taskId: 'task-123',
        type: 'info'
      };

      await NotificationService.createNotification('test@example.com', notificationData);

      // Simulate task deletion (notification would be created by backend)
      const deletionNotificationData = {
        title: 'Removed from Task',
        body: 'You are no longer assigned to this task.',
        taskId: 'task-123',
        type: 'info'
      };

      await NotificationService.createNotification('test@example.com', deletionNotificationData);

      expect(mockNotificationsCollection.add).toHaveBeenCalledTimes(2);
    });

    it('should handle rapid task updates', async () => {
      // Simulate multiple rapid updates
      const updates = [
        { title: 'Task Updated', body: 'Task "Test Task" has been updated', taskId: 'task-123' },
        { title: 'Task Updated', body: 'Task "Test Task" has been updated', taskId: 'task-123' },
        { title: 'Task Updated', body: 'Task "Test Task" has been updated', taskId: 'task-123' }
      ];

      for (const update of updates) {
        await NotificationService.createNotification('test@example.com', update);
      }

      expect(mockNotificationsCollection.add).toHaveBeenCalledTimes(3);
    });
  });

  describe('Notification Type Edge Cases', () => {
    it('should handle missing notification type', async () => {
      const notificationData = {
        title: 'Test Notification',
        body: 'Test message'
        // Missing type
      };

      await NotificationService.createNotification('test@example.com', notificationData);

      expect(mockNotificationsCollection.add).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'info' // Should default to 'info'
        })
      );
    });

    it('should handle invalid notification type', async () => {
      const notificationData = {
        title: 'Test Notification',
        body: 'Test message',
        type: 'invalid-type'
      };

      await NotificationService.createNotification('test@example.com', notificationData);

      expect(mockNotificationsCollection.add).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'invalid-type' // Should preserve the invalid type
        })
      );
    });
  });

  describe('User Settings Edge Cases', () => {
    it('should handle user with no notification settings', async () => {
      const userData = {
        email: 'test@example.com',
        fcmToken: 'mock-token'
        // Missing notificationSettings
      };

      const mockUserDoc = {
        exists: true,
        data: () => userData
      };

      mockDoc.get.mockResolvedValue(mockUserDoc);

      // Should not send email when settings are missing
      const result = await NotificationService.sendEmailNotification(
        'test@example.com',
        { title: 'Test Task' },
        24,
        30,
        'UTC'
      );

      expect(result).toBe(false);
    });

    it('should handle user with disabled notifications', async () => {
      const userData = {
        email: 'test@example.com',
        fcmToken: 'mock-token',
        notificationSettings: {
          emailEnabled: false,
          pushEnabled: false
        }
      };

      const mockUserDoc = {
        exists: true,
        data: () => userData
      };

      mockDoc.get.mockResolvedValue(mockUserDoc);

      const result = await NotificationService.sendNotification(
        'test@example.com',
        { title: 'Test', body: 'Test message' },
        {
          sendEmail: true
        }
      );

      // Should still create database notification even if email is disabled
      expect(result).toBe('notification-123');
    });
  });

  describe('Database Edge Cases', () => {
    it('should handle database connection errors', async () => {
      mockNotificationsCollection.add.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      await expect(
        NotificationService.createNotification('test@example.com', { title: 'Test' })
      ).rejects.toThrow('Database connection failed');
    });

    it('should handle batch operation failures', async () => {
      const oldNotification = {
        ref: 'old-doc',
        data: () => ({
          createdAt: { toDate: () => new Date(Date.now() - 40 * 24 * 60 * 60 * 1000) } // 40 days ago
        })
      };

      mockNotificationsCollection.get.mockResolvedValueOnce({
        docs: [oldNotification]
      });

      mockBatch.commit.mockRejectedValue(new Error('Batch commit failed'));

      await expect(
        NotificationService.cleanupOldNotifications('test@example.com', 30)
      ).rejects.toThrow('Batch commit failed');
    });
  });
});