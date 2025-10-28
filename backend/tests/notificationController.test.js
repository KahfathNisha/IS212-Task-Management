// Mock the notification service
jest.mock('../src/services/notificationService', () => ({
  getUserNotifications: jest.fn(),
  markAsRead: jest.fn(),
  markAllAsRead: jest.fn(),
  cleanupOldNotifications: jest.fn()
}));

// Mock Firebase
const mockCollection = {
  doc: jest.fn(),
  add: jest.fn(),
  get: jest.fn(),
  where: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  startAfter: jest.fn().mockReturnThis()
};

const mockDoc = {
  get: jest.fn(),
  collection: jest.fn(),
  update: jest.fn(),
  delete: jest.fn()
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
  }
}));

const notificationController = require('../src/controllers/notificationController');

describe('NotificationController', () => {
  let mockReq;
  let mockRes;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock request and response objects
    mockReq = {
      user: { email: 'test@example.com' },
      params: { notificationId: 'notification-123' },
      query: { limit: '50', startAfter: 'last-doc' },
      body: { daysOld: 30 }
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  });

  describe('getNotifications', () => {
    it('should get notifications successfully', async () => {
      const NotificationService = require('../src/services/notificationService');
      const mockNotifications = [
        { id: '1', title: 'Test 1', body: 'Message 1', isRead: false },
        { id: '2', title: 'Test 2', body: 'Message 2', isRead: true }
      ];

      NotificationService.getUserNotifications.mockResolvedValue(mockNotifications);

      await notificationController.getNotifications(mockReq, mockRes);

      expect(NotificationService.getUserNotifications).toHaveBeenCalledWith(
        'test@example.com',
        50,
        'last-doc'
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        notifications: mockNotifications,
        count: 2
      });
    });

    it('should handle errors gracefully', async () => {
      const NotificationService = require('../src/services/notificationService');
      NotificationService.getUserNotifications.mockRejectedValue(new Error('Database error'));

      await notificationController.getNotifications(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Database error'
      });
    });

    it('should use default limit when not provided', async () => {
      const NotificationService = require('../src/services/notificationService');
      mockReq.query = {};

      await notificationController.getNotifications(mockReq, mockRes);

      expect(NotificationService.getUserNotifications).toHaveBeenCalledWith(
        'test@example.com',
        50,
        undefined
      );
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read successfully', async () => {
      const NotificationService = require('../src/services/notificationService');
      NotificationService.markAsRead.mockResolvedValue();

      await notificationController.markAsRead(mockReq, mockRes);

      expect(NotificationService.markAsRead).toHaveBeenCalledWith(
        'test@example.com',
        'notification-123'
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Notification marked as read'
      });
    });

    it('should handle errors gracefully', async () => {
      const NotificationService = require('../src/services/notificationService');
      NotificationService.markAsRead.mockRejectedValue(new Error('Database error'));

      await notificationController.markAsRead(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Database error'
      });
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read successfully', async () => {
      const NotificationService = require('../src/services/notificationService');
      NotificationService.markAllAsRead.mockResolvedValue();

      await notificationController.markAllAsRead(mockReq, mockRes);

      expect(NotificationService.markAllAsRead).toHaveBeenCalledWith('test@example.com');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'All notifications marked as read'
      });
    });
  });

  describe('deleteNotification', () => {
    it('should delete notification successfully', async () => {
      const mockNotificationDoc = {
        delete: jest.fn().mockResolvedValue()
      };
      
      mockCollection.doc.mockReturnValue(mockDoc);
      mockDoc.collection.mockReturnValue({
        doc: jest.fn(() => mockNotificationDoc)
      });

      await notificationController.deleteNotification(mockReq, mockRes);

      expect(mockCollection.doc).toHaveBeenCalledWith('test@example.com');
      expect(mockDoc.collection).toHaveBeenCalledWith('notifications');
      expect(mockNotificationDoc.delete).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Notification deleted'
      });
    });
  });

  describe('getNotificationStats', () => {
    it('should get notification statistics successfully', async () => {
      const mockUnreadSnapshot = { size: 3 };
      const mockTotalSnapshot = { size: 10 };
      
      const mockNotificationsCollection = {
        where: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue(mockUnreadSnapshot)
        }),
        get: jest.fn().mockResolvedValue(mockTotalSnapshot)
      };
      
      // Mock the Firebase calls that the controller makes
      mockCollection.doc.mockReturnValueOnce(mockDoc);
      mockDoc.collection.mockReturnValueOnce(mockNotificationsCollection);
      mockCollection.doc.mockReturnValueOnce(mockDoc);
      mockDoc.collection.mockReturnValueOnce(mockNotificationsCollection);

      await notificationController.getNotificationStats(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        stats: {
          total: 10,
          unread: 3,
          read: 7
        }
      });
    });
  });

  describe('clearAllNotifications', () => {
    it('should clear all notifications successfully', async () => {
      const mockSnapshot = {
        empty: false,
        size: 5,
        docs: [
          { ref: 'doc1' },
          { ref: 'doc2' },
          { ref: 'doc3' },
          { ref: 'doc4' },
          { ref: 'doc5' }
        ]
      };

      const mockNotificationsCollection = {
        get: jest.fn().mockResolvedValue(mockSnapshot)
      };

      mockCollection.doc.mockReturnValue(mockDoc);
      mockDoc.collection.mockReturnValue(mockNotificationsCollection);
      mockBatch.commit.mockResolvedValue();

      await notificationController.clearAllNotifications(mockReq, mockRes);

      expect(mockBatch.delete).toHaveBeenCalledTimes(5);
      expect(mockBatch.commit).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Cleared 5 notifications'
      });
    });

    it('should handle empty notifications gracefully', async () => {
      const mockSnapshot = {
        empty: true,
        size: 0,
        docs: []
      };

      const mockNotificationsCollection = {
        get: jest.fn().mockResolvedValue(mockSnapshot)
      };

      mockCollection.doc.mockReturnValue(mockDoc);
      mockDoc.collection.mockReturnValue(mockNotificationsCollection);

      await notificationController.clearAllNotifications(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'No notifications to clear'
      });
    });
  });
});