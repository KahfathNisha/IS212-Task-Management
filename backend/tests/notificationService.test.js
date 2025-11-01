// Mock Firebase before requiring the service
// Create mock doc ref that will be returned by .doc() calls
const createMockDocRef = (id = 'notification-123') => ({
  id,
  update: jest.fn().mockResolvedValue(true),
  delete: jest.fn().mockResolvedValue(true),
  get: jest.fn().mockResolvedValue({ exists: true, data: () => ({}) })
});

// Mock notifications subcollection (users/{userId}/notifications)
const createMockNotificationsSubCollection = () => ({
  doc: jest.fn((notificationId) => createMockDocRef(notificationId)),
  add: jest.fn().mockResolvedValue(createMockDocRef('notification-123')),
  get: jest.fn().mockResolvedValue({ docs: [] }),
  where: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  startAfter: jest.fn().mockReturnThis()
});

// Create a mock user doc that has a collection() method
const createMockUserDocRef = (userId) => ({
  collection: jest.fn((collectionName) => {
    if (collectionName === 'notifications') {
      return createMockNotificationsSubCollection();
    }
    return createMockNotificationsSubCollection();
  }),
  get: jest.fn().mockResolvedValue({ 
    exists: true, 
    data: () => ({
      email: userId || 'test@example.com',
      fcmToken: 'mock-fcm-token',
      timezone: 'UTC',
      notificationSettings: {
        emailEnabled: true,
        pushEnabled: true
      }
    })
  })
});

// Mock the main collection
const mockCollection = {
  doc: jest.fn((userId) => createMockUserDocRef(userId)),
  add: jest.fn(),
  get: jest.fn(),
  where: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  startAfter: jest.fn().mockReturnThis()
};

// Keep these for backwards compatibility in tests
let mockNotificationsSubCollection;
let mockUserDoc;
let mockNotificationDoc;

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

// Mock EmailService
jest.mock('../src/services/emailService', () => ({
  sendDeadlineReminder: jest.fn().mockResolvedValue(true)
}));

describe('NotificationService', () => {
  let mockUserDocData;
  let mockNotificationDocData;
  let mockNotificationsSubCollectionInstance;
  let mockUserDocRefInstance;
  let mockNotificationDocRef;

  beforeEach(() => {
    // Setup mock user data
    mockUserDocData = {
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

    mockNotificationDocData = {
      id: 'notification-123',
      data: () => ({
        title: 'Test Notification',
        body: 'Test message',
        isRead: false,
        createdAt: { toDate: () => new Date() }
      })
    };

    // Create fresh instances for each test
    mockNotificationsSubCollectionInstance = createMockNotificationsSubCollection();
    mockUserDocRefInstance = createMockUserDocRef('test@example.com');
    mockNotificationDocRef = createMockDocRef('notification-123');

    // Setup the collection chain to return our mocks
    mockCollection.doc.mockImplementation((userId) => {
      const userDoc = createMockUserDocRef(userId);
      userDoc.get.mockResolvedValue(mockUserDocData);
      
      // Setup notifications subcollection
      const notificationsSubCollection = createMockNotificationsSubCollection();
      userDoc.collection.mockReturnValue(notificationsSubCollection);
      mockNotificationsSubCollectionInstance = notificationsSubCollection;
      
      return userDoc;
    });

    // Setup default mock responses
    mockNotificationsSubCollectionInstance.add.mockResolvedValue(createMockDocRef('notification-123'));
    mockNotificationsSubCollectionInstance.doc.mockReturnValue(mockNotificationDocRef);
    mockBatch.commit.mockResolvedValue(true);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createNotification', () => {
    it('should create a notification successfully', async () => {
      const notificationData = {
        title: 'Test Notification',
        body: 'Test message',
        type: 'info'
      };

      const result = await NotificationService.createNotification('test@example.com', notificationData);

      expect(mockNotificationsSubCollectionInstance.add).toHaveBeenCalledWith(
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
      // Override the mock to reject
      mockCollection.doc.mockImplementationOnce((userId) => {
        const userDoc = createMockUserDocRef(userId);
        userDoc.get.mockResolvedValue(mockUserDocData);
        const notificationsSubCollection = createMockNotificationsSubCollection();
        notificationsSubCollection.add.mockRejectedValueOnce(new Error('Database error'));
        userDoc.collection.mockReturnValue(notificationsSubCollection);
        mockNotificationsSubCollectionInstance = notificationsSubCollection;
        return userDoc;
      });

      await expect(
        NotificationService.createNotification('test@example.com', { title: 'Test' })
      ).rejects.toThrow('Database error');
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

      expect(EmailService.sendDeadlineReminder).toHaveBeenCalledTimes(1);
      expect(result).toBe(true);
    });

    it('should handle email disabled', async () => {
      const userDocWithEmailDisabled = {
        exists: true,
        data: () => ({
          email: 'test@example.com',
          notificationSettings: {
            emailEnabled: false
          }
        })
      };

      mockCollection.doc.mockImplementationOnce((userId) => {
        const userDoc = createMockUserDocRef(userId);
        userDoc.get.mockResolvedValue(userDocWithEmailDisabled);
        return userDoc;
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
    it('should send unified notification with email', async () => {
      const notificationData = {
        title: 'Unified Test',
        body: 'Test message',
        type: 'warning'
      };

      const EmailService = require('../src/services/emailService');

      const result = await NotificationService.sendNotification(
        'test@example.com',
        notificationData,
        {
          sendEmail: true,
          taskData: { title: 'Test Task', dueDate: { toDate: () => new Date() } },
          hoursLeft: 24,
          minutesLeft: 30,
          userTimezone: 'UTC'
        }
      );

      // Verify notification was created and email was sent
      expect(result).toBe('notification-123');
      expect(EmailService.sendDeadlineReminder).toHaveBeenCalledTimes(1);
    });

    it('should send notification with only database storage', async () => {
      const notificationData = {
        title: 'Database Only',
        body: 'Test message',
        type: 'info'
      };

      const EmailService = require('../src/services/emailService');

      const result = await NotificationService.sendNotification(
        'test@example.com',
        notificationData,
        {
          sendEmail: false
        }
      );

      // Verify notification was created but no email was sent
      expect(result).toBe('notification-123');
      expect(EmailService.sendDeadlineReminder).not.toHaveBeenCalled();
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      mockCollection.doc.mockImplementationOnce((userId) => {
        const userDoc = createMockUserDocRef(userId);
        const notificationsSubCollection = createMockNotificationsSubCollection();
        notificationsSubCollection.doc.mockReturnValue(mockNotificationDocRef);
        userDoc.collection.mockReturnValue(notificationsSubCollection);
        return userDoc;
      });

      await NotificationService.markAsRead('test@example.com', 'notification-123');

      expect(mockNotificationDocRef.update).toHaveBeenCalledWith({
        isRead: true,
        readAt: expect.any(Object)
      });
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read', async () => {
      // Setup the nested collection with mock docs
      const doc1Ref = { ref: createMockDocRef('doc1') };
      const doc2Ref = { ref: createMockDocRef('doc2') };
      
      mockCollection.doc.mockImplementationOnce((userId) => {
        const userDoc = createMockUserDocRef(userId);
        const notificationsSubCollection = createMockNotificationsSubCollection();
        notificationsSubCollection.where.mockReturnValue(notificationsSubCollection);
        notificationsSubCollection.get.mockResolvedValue({
          docs: [doc1Ref, doc2Ref],
          size: 2
        });
        userDoc.collection.mockReturnValue(notificationsSubCollection);
        return userDoc;
      });

      await NotificationService.markAllAsRead('test@example.com');

      expect(mockBatch.update).toHaveBeenCalledTimes(2);
      expect(mockBatch.commit).toHaveBeenCalled();
    });
  });

  describe('getUserNotifications', () => {
    it('should get user notifications', async () => {
      mockCollection.doc.mockImplementationOnce((userId) => {
        const userDoc = createMockUserDocRef(userId);
        const notificationsSubCollection = createMockNotificationsSubCollection();
        notificationsSubCollection.orderBy.mockReturnValue(notificationsSubCollection);
        notificationsSubCollection.limit.mockReturnValue(notificationsSubCollection);
        notificationsSubCollection.get.mockResolvedValue({
          docs: [mockNotificationDocData]
        });
        userDoc.collection.mockReturnValue(notificationsSubCollection);
        return userDoc;
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
      let capturedNotificationsSubCollection;
      mockCollection.doc.mockImplementationOnce((userId) => {
        const userDoc = createMockUserDocRef(userId);
        const notificationsSubCollection = createMockNotificationsSubCollection();
        notificationsSubCollection.orderBy.mockReturnValue(notificationsSubCollection);
        notificationsSubCollection.limit.mockReturnValue(notificationsSubCollection);
        notificationsSubCollection.startAfter.mockReturnValue(notificationsSubCollection);
        notificationsSubCollection.get.mockResolvedValue({
          docs: []
        });
        userDoc.collection.mockReturnValue(notificationsSubCollection);
        capturedNotificationsSubCollection = notificationsSubCollection;
        return userDoc;
      });

      await NotificationService.getUserNotifications('test@example.com', 10, 'last-doc');

      expect(capturedNotificationsSubCollection.startAfter).toHaveBeenCalledWith('last-doc');
    });
  });

  describe('cleanupOldNotifications', () => {
    it('should cleanup old notifications', async () => {
      const oldDocRef = createMockDocRef('old-doc');
      const oldNotification = {
        ref: oldDocRef,
        data: () => ({
          createdAt: { toDate: () => new Date(Date.now() - 40 * 24 * 60 * 60 * 1000) } // 40 days ago
        })
      };

      mockCollection.doc.mockImplementationOnce((userId) => {
        const userDoc = createMockUserDocRef(userId);
        const notificationsSubCollection = createMockNotificationsSubCollection();
        notificationsSubCollection.where.mockReturnValue(notificationsSubCollection);
        notificationsSubCollection.get.mockResolvedValue({
          docs: [oldNotification]
        });
        userDoc.collection.mockReturnValue(notificationsSubCollection);
        return userDoc;
      });

      await NotificationService.cleanupOldNotifications('test@example.com', 30);

      expect(mockBatch.delete).toHaveBeenCalledWith(oldDocRef);
      expect(mockBatch.commit).toHaveBeenCalled();
    });
  });
});