import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { 
  fetchNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead,
  deleteNotification,
  getNotificationStats,
  clearAllNotifications
} from '@/services/notification-service';

// Mock the auth store
vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({
    getToken: vi.fn().mockResolvedValue('mock-token')
  })
}));

// Mock fetch globally
global.fetch = vi.fn();

describe('NotificationService API Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('fetchNotifications', () => {
    it('should fetch notifications successfully', async () => {
      const mockNotifications = [
        { id: '1', title: 'Test 1', body: 'Message 1', isRead: false },
        { id: '2', title: 'Test 2', body: 'Message 2', isRead: true }
      ];

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, notifications: mockNotifications })
      });

      const result = await fetchNotifications(50);

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/notifications?limit=50',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-token'
          })
        })
      );
      expect(result).toEqual(mockNotifications);
    });

    it('should handle API errors gracefully', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await fetchNotifications();

      expect(result).toEqual([]);
    });

    it('should include startAfter parameter when provided', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, notifications: [] })
      });

      await fetchNotifications(20, 'last-doc-id');

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/notifications?limit=20&startAfter=last-doc-id',
        expect.any(Object)
      );
    });
  });

  describe('markNotificationAsRead', () => {
    it('should mark notification as read successfully', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });

      const result = await markNotificationAsRead('notification-id');

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/notifications/notification-id/read',
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-token'
          })
        })
      );
      expect(result).toBe(true);
    });

    it('should handle errors gracefully', async () => {
      global.fetch.mockRejectedValueOnce(new Error('API error'));

      const result = await markNotificationAsRead('invalid-id');

      expect(result).toBe(false);
    });
  });

  describe('markAllNotificationsAsRead', () => {
    it('should mark all notifications as read successfully', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });

      const result = await markAllNotificationsAsRead();

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/notifications/read-all',
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-token'
          })
        })
      );
      expect(result).toBe(true);
    });
  });

  describe('deleteNotification', () => {
    it('should delete notification successfully', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });

      const result = await deleteNotification('notification-id');

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/notifications/notification-id',
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-token'
          })
        })
      );
      expect(result).toBe(true);
    });
  });

  describe('getNotificationStats', () => {
    it('should fetch notification statistics successfully', async () => {
      const mockStats = { total: 10, unread: 3, read: 7 };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, stats: mockStats })
      });

      const result = await getNotificationStats();

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/notifications/stats',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-token'
          })
        })
      );
      expect(result).toEqual(mockStats);
    });

    it('should return default stats on error', async () => {
      global.fetch.mockRejectedValueOnce(new Error('API error'));

      const result = await getNotificationStats();

      expect(result).toEqual({ total: 0, unread: 0, read: 0 });
    });
  });

  describe('clearAllNotifications', () => {
    it('should clear all notifications successfully', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });

      const result = await clearAllNotifications();

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/notifications/clear-all',
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-token'
          })
        })
      );
      expect(result).toBe(true);
    });
  });
});

