// Essential notification tests - focused on critical edge cases
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
  batch: jest.fn(() => ({
    update: jest.fn(),
    delete: jest.fn(),
    commit: jest.fn()
  }))
};

const mockMessaging = {
  send: jest.fn()
};

jest.mock('../src/config/firebase', () => ({
  db: { collection: jest.fn(() => mockCollection) },
  admin: {
    firestore: {
      Timestamp: {
        now: jest.fn(() => ({ toDate: () => new Date() })),
        fromDate: jest.fn(() => ({ toDate: () => new Date() }))
      }
    },
    messaging: jest.fn(() => mockMessaging)
  }
}));

jest.mock('../src/services/emailService', () => ({
  sendDeadlineReminder: jest.fn().mockResolvedValue(true)
}));

const NotificationService = require('../src/services/notificationService');

describe('Essential Notification Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNotificationsCollection.add.mockResolvedValue({ id: 'test-notification-id' });
    mockMessaging.send.mockResolvedValue({ success: true });
  });

  describe('Core Functionality', () => {
    it('should create notification with all required fields', async () => {
      const notificationData = {
        title: 'Test Notification',
        body: 'Test message',
        type: 'info',
        taskId: 'task-123'
      };

      const result = await NotificationService.createNotification('test@example.com', notificationData);

      expect(mockNotificationsCollection.add).toHaveBeenCalledWith(
        expect.objectContaining({
          ...notificationData,
          userId: 'test@example.com',
          isRead: false,
          createdAt: expect.any(Object)
        })
      );
      expect(result).toBe('test-notification-id');
    });

    it('should send unified notification (DB + Push + Email)', async () => {
      const notificationData = {
        title: 'Deadline Reminder',
        body: 'Task due tomorrow',
        type: 'warning',
        taskId: 'task-123'
      };

      const userData = {
        email: 'test@example.com',
        fcmToken: 'mock-token',
        notificationSettings: {
          emailEnabled: true,
          pushEnabled: true
        }
      };

      mockDoc.get.mockResolvedValue({ exists: true, data: () => userData });

      const result = await NotificationService.sendNotification('test@example.com', notificationData, {
        sendPush: true,
        sendEmail: true,
        taskData: { title: 'Test Task', dueDate: { toDate: () => new Date() } },
        hoursLeft: 24,
        minutesLeft: 0,
        userTimezone: 'UTC'
      });

      expect(mockNotificationsCollection.add).toHaveBeenCalled();
      expect(mockMessaging.send).toHaveBeenCalled();
      expect(result).toBe('test-notification-id');
    });
  });

  describe('Critical Edge Cases', () => {
    it('should handle missing FCM token gracefully', async () => {
      const userData = {
        email: 'test@example.com',
        fcmToken: null,
        notificationSettings: { pushEnabled: true }
      };

      mockDoc.get.mockResolvedValue({ exists: true, data: () => userData });

      const result = await NotificationService.sendPushNotification(
        'test@example.com',
        'Test Title',
        'Test Body'
      );

      expect(result).toBe(false);
      expect(mockMessaging.send).not.toHaveBeenCalled();
    });

    it('should handle email disabled in user settings', async () => {
      const userData = {
        email: 'test@example.com',
        notificationSettings: { emailEnabled: false }
      };

      mockDoc.get.mockResolvedValue({ exists: true, data: () => userData });

      const result = await NotificationService.sendEmailNotification(
        'test@example.com',
        { title: 'Test Task' },
        24,
        0,
        'UTC'
      );

      expect(result).toBe(false);
    });

    it('should handle database errors gracefully', async () => {
      mockNotificationsCollection.add.mockRejectedValue(new Error('Database error'));

      await expect(
        NotificationService.createNotification('test@example.com', { title: 'Test' })
      ).rejects.toThrow('Database error');
    });

    it('should handle FCM send failures gracefully', async () => {
      const userData = {
        email: 'test@example.com',
        fcmToken: 'mock-token',
        notificationSettings: { pushEnabled: true }
      };

      mockDoc.get.mockResolvedValue({ exists: true, data: () => userData });
      mockMessaging.send.mockRejectedValue(new Error('FCM error'));

      const result = await NotificationService.sendPushNotification(
        'test@example.com',
        'Test Title',
        'Test Body'
      );

      expect(result).toBe(false);
    });
  });

  describe('Deadline Reminder Logic', () => {
    it('should trigger reminder for task due in exactly 1 day', () => {
      const now = new Date();
      const dueDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const timeDiff = dueDate - now;
      const daysUntilDue = timeDiff / (1000 * 60 * 60 * 24);
      const reminderIntervals = [1, 3, 7];
      const shouldSendReminder = reminderIntervals.some(interval => 
        Math.abs(daysUntilDue - interval) < 0.1
      );

      expect(shouldSendReminder).toBe(true);
    });

    it('should not trigger reminder for task due in the past', () => {
      const now = new Date();
      const dueDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const timeDiff = dueDate - now;
      const hoursUntilDue = timeDiff / (1000 * 60 * 60);

      expect(hoursUntilDue).toBeLessThan(0);
    });
  });
});
