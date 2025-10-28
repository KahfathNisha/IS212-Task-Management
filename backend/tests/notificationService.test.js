// Mock Firebase before requiring the service
const mockNotificationsCollection = {
  add: jest.fn(),
  get: jest.fn(),
  where: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  startAfter: jest.fn().mockReturnThis()
};

const mockNotificationDoc = {
  update: jest.fn().mockResolvedValue(true),
  delete: jest.fn().mockResolvedValue(true)
};

const mockDoc = {
  get: jest.fn(),
  collection: jest.fn(() => mockNotificationsCollection),
  update: jest.fn(),
  delete: jest.fn()
};

// Add doc method to notifications collection for chaining
mockNotificationsCollection.doc = jest.fn(() => mockNotificationDoc);

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

const mockMessaging = {
  send: jest.fn()
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
    },
    messaging: jest.fn(() => mockMessaging)
  }
}));

const NotificationService = require('../src/services/notificationService');

// Mock EmailService
jest.mock('../src/services/emailService', () => ({
  sendDeadlineReminder: jest.fn().mockResolvedValue(true)
}));

describe('NotificationService', () => {
  let mockUserDoc;
  let mockNotificationDoc;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock document
    mockUserDoc = {
      exists: true,
      data: () => ({
        email: 'test@example.com',
        fcmToken: 'mock-fcm-token',
        timezone: 'UTC',
        notificationSettings: {
          emailEnabled: true,
          pushEnabled: true
        }
      })
    };

    mockNotificationDoc = {
      id: 'notification-123',
      data: () => ({
        title: 'Test Notification',
        body: 'Test message',
        isRead: false,
        createdAt: { toDate: () => new Date() }
      })
    };

    // Setup mock responses
    mockNotificationsCollection.add.mockResolvedValue({ id: 'notification-123' });
    mockDoc.get.mockResolvedValue(mockUserDoc);
    mockDoc.update.mockResolvedValue(true);
    mockBatch.commit.mockResolvedValue(true);
    mockMessaging.send.mockResolvedValue({ success: true });
  });

  describe('createNotification', () => {
    it('should create a notification successfully', async () => {
      const notificationData = {
        title: 'Test Notification',
        body: 'Test message',
        type: 'info'
      };

      const result = await NotificationService.createNotification('test@example.com', notificationData);

      expect(mockNotificationsCollection.add).toHaveBeenCalledWith(
        expect.objectContaining({
          ...notificationData,
          userId: 'test@example.com',
          isRead: false,
          type: 'info'
        })
      );
      expect(result).toBe('notification-123');
    });

    it('should handle errors gracefully', async () => {
      mockNotificationsCollection.add.mockRejectedValueOnce(new Error('Database error'));

      await expect(
        NotificationService.createNotification('test@example.com', { title: 'Test' })
      ).rejects.toThrow('Database error');
    });
  });

  describe('sendPushNotification', () => {
    it('should send push notification successfully', async () => {
      const result = await NotificationService.sendPushNotification(
        'test@example.com',
        'Test Title',
        'Test Body',
        { taskId: 'task-123' }
      );

      expect(mockMessaging.send).toHaveBeenCalledWith({
        token: 'mock-fcm-token',
        notification: {
          title: 'Test Title',
          body: 'Test Body'
        },
        data: {
          taskId: 'task-123',
          timestamp: expect.any(String)
        }
      });
      expect(result).toBe(true);
    });

    it('should handle user not found', async () => {
      mockUserDoc.exists = false;

      const result = await NotificationService.sendPushNotification(
        'nonexistent@example.com',
        'Test Title',
        'Test Body'
      );

      expect(result).toBe(false);
    });

    it('should handle missing FCM token', async () => {
      mockUserDoc.data = () => ({
        email: 'test@example.com',
        fcmToken: null
      });

      const result = await NotificationService.sendPushNotification(
        'test@example.com',
        'Test Title',
        'Test Body'
      );

      expect(result).toBe(false);
    });

    it('should handle FCM send errors', async () => {
      mockMessaging.send.mockRejectedValueOnce(new Error('FCM error'));

      const result = await NotificationService.sendPushNotification(
        'test@example.com',
        'Test Title',
        'Test Body'
      );

      expect(result).toBe(false);
    });
  });

  describe('sendEmailNotification', () => {
    it('should send email notification successfully', async () => {
      const EmailService = require('../src/services/emailService');
      
      const result = await NotificationService.sendEmailNotification(
        'test@example.com',
        { title: 'Test Task', dueDate: { toDate: () => new Date() } },
        24,
        30,
        'UTC'
      );

      expect(EmailService.sendDeadlineReminder).toHaveBeenCalledWith(
        'test@example.com',
        { title: 'Test Task', dueDate: { toDate: () => new Date() } },
        24,
        30,
        'UTC'
      );
      expect(result).toBe(true);
    });

    it('should handle email disabled', async () => {
      mockUserDoc.data = () => ({
        email: 'test@example.com',
        notificationSettings: {
          emailEnabled: false
        }
      });

      const result = await NotificationService.sendEmailNotification(
        'test@example.com',
        { title: 'Test Task' },
        24,
        30,
        'UTC'
      );

      expect(result).toBe(false);
    });
  });

  describe('sendNotification (unified)', () => {
    it('should send unified notification with all channels', async () => {
      const notificationData = {
        title: 'Unified Test',
        body: 'Test message',
        type: 'warning'
      };

      const result = await NotificationService.sendNotification(
        'test@example.com',
        notificationData,
        {
          sendPush: true,
          sendEmail: true,
          taskData: { title: 'Test Task', dueDate: { toDate: () => new Date() } },
          hoursLeft: 24,
          minutesLeft: 30,
          userTimezone: 'UTC'
        }
      );

      expect(mockNotificationsCollection.add).toHaveBeenCalled();
      expect(mockMessaging.send).toHaveBeenCalled();
      expect(result).toBe('notification-123');
    });

    it('should send notification with only database storage', async () => {
      const notificationData = {
        title: 'Database Only',
        body: 'Test message',
        type: 'info'
      };

      const result = await NotificationService.sendNotification(
        'test@example.com',
        notificationData,
        {
          sendPush: false,
          sendEmail: false
        }
      );

      expect(mockNotificationsCollection.add).toHaveBeenCalled();
      expect(mockMessaging.send).not.toHaveBeenCalled();
      expect(result).toBe('notification-123');
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      await NotificationService.markAsRead('test@example.com', 'notification-123');

      expect(mockNotificationDoc.update).toHaveBeenCalledWith({
        isRead: true,
        readAt: expect.any(Object)
      });
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read', async () => {
      mockNotificationsCollection.get.mockResolvedValueOnce({
        docs: [
          { ref: 'doc1' },
          { ref: 'doc2' }
        ]
      });

      await NotificationService.markAllAsRead('test@example.com');

      expect(mockBatch.update).toHaveBeenCalledTimes(2);
      expect(mockBatch.commit).toHaveBeenCalled();
    });
  });

  describe('getUserNotifications', () => {
    it('should get user notifications', async () => {
      mockNotificationsCollection.get.mockResolvedValueOnce({
        docs: [mockNotificationDoc]
      });

      const result = await NotificationService.getUserNotifications('test@example.com', 10);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'notification-123',
        title: 'Test Notification',
        body: 'Test message',
        isRead: false
      });
    });

    it('should handle pagination with startAfter', async () => {
      mockNotificationsCollection.get.mockResolvedValueOnce({
        docs: []
      });

      await NotificationService.getUserNotifications('test@example.com', 10, 'last-doc');

      expect(mockNotificationsCollection.startAfter).toHaveBeenCalledWith('last-doc');
    });
  });

  describe('cleanupOldNotifications', () => {
    it('should cleanup old notifications', async () => {
      const oldNotification = {
        ref: 'old-doc',
        data: () => ({
          createdAt: { toDate: () => new Date(Date.now() - 40 * 24 * 60 * 60 * 1000) } // 40 days ago
        })
      };

      mockNotificationsCollection.get.mockResolvedValueOnce({
        docs: [oldNotification]
      });

      await NotificationService.cleanupOldNotifications('test@example.com', 30);

      expect(mockBatch.delete).toHaveBeenCalledWith('old-doc');
      expect(mockBatch.commit).toHaveBeenCalled();
    });
  });
});