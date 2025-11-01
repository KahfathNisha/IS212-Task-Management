const sgMail = require('@sendgrid/mail');
const EmailService = require('../src/services/emailService');

// Mock @sendgrid/mail
jest.mock('@sendgrid/mail', () => ({
  setApiKey: jest.fn(),
  send: jest.fn()
}));

describe('EmailService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Set up environment variables for testing
    process.env.SENDGRID_API_KEY = 'test-api-key';
    process.env.SENDGRID_FROM_EMAIL = 'noreply@test.com';
    process.env.FRONTEND_URL = 'http://localhost:3000';
  });

  // task deadline reminder email notification
  describe('sendDeadlineReminder', () => {
    const mockTaskData = {
      title: 'Complete Project Report',
      dueDate: {
        toDate: () => new Date('2024-12-31T23:59:59Z')
      },
      description: 'This is a test task description',
      notes: 'Please review carefully',
      id: 'task-123'
    };

    const mockUserEmail = 'user@example.com';
    const mockHoursLeft = 2;
    const mockMinutesLeft = 30;
    const mockUserTimezone = 'America/New_York';

    it('should send deadline reminder email successfully', async () => {
      sgMail.send.mockResolvedValue([{ statusCode: 202 }]);

      await EmailService.sendDeadlineReminder(
        mockUserEmail,
        mockTaskData,
        mockHoursLeft,
        mockMinutesLeft,
        mockUserTimezone
      );

      expect(sgMail.send).toHaveBeenCalledTimes(1);
      const sentEmail = sgMail.send.mock.calls[0][0];

      expect(sentEmail.to).toBe(mockUserEmail);
      expect(sentEmail.from).toBe(process.env.SENDGRID_FROM_EMAIL);
      expect(sentEmail.subject).toBe(`Deadline Reminder: ${mockTaskData.title}`);
      expect(sentEmail.html).toContain('Task Deadline Reminder');
      expect(sentEmail.html).toContain(mockTaskData.title);
      expect(sentEmail.html).toContain('2 hours and 30 minutes');
      expect(sentEmail.html).toContain(mockTaskData.description);
      expect(sentEmail.html).toContain(mockTaskData.notes);
      expect(sentEmail.html).toContain(`${process.env.FRONTEND_URL}/tasks/${mockTaskData.id}`);
    });

    it('should handle email without description and notes', async () => {
      const taskDataWithoutOptional = {
        ...mockTaskData,
        description: undefined,
        notes: undefined
      };

      sgMail.send.mockResolvedValue([{ statusCode: 202 }]);

      await EmailService.sendDeadlineReminder(
        mockUserEmail,
        taskDataWithoutOptional,
        mockHoursLeft,
        mockMinutesLeft,
        mockUserTimezone
      );

      const sentEmail = sgMail.send.mock.calls[0][0];
      expect(sentEmail.html).not.toContain('<p><strong>Description:</strong>');
      expect(sentEmail.html).not.toContain('<p><strong>Notes:</strong>');
    });

    it('should throw error when email sending fails', async () => {
      const mockError = new Error('SendGrid API error');
      sgMail.send.mockRejectedValue(mockError);

      await expect(EmailService.sendDeadlineReminder(
        mockUserEmail,
        mockTaskData,
        mockHoursLeft,
        mockMinutesLeft,
        mockUserTimezone
      )).rejects.toThrow('SendGrid API error');

      expect(sgMail.send).toHaveBeenCalledTimes(1);
    });

    it('should format deadline in user timezone', async () => {
      sgMail.send.mockResolvedValue([{ statusCode: 202 }]);

      await EmailService.sendDeadlineReminder(
        mockUserEmail,
        mockTaskData,
        mockHoursLeft,
        mockMinutesLeft,
        'Asia/Tokyo'
      );

      const sentEmail = sgMail.send.mock.calls[0][0];
      // The exact formatted date will depend on the timezone, but it should contain date/time info
      expect(sentEmail.html).toContain('<p><strong>Deadline:</strong>');
    });
  });

  // task reassignment email notification
  describe('sendReassignmentNotification', () => {
    const mockTaskData = {
      title: 'New Project Task',
      dueDate: {
        toDate: () => new Date('2024-12-31T23:59:59Z')
      },
      description: 'This is a reassigned task',
      priority: 'High',
      id: 'task-456'
    };

    const mockUserEmail = 'user@example.com';
    const mockReassignmentType = 'assigned';
    const mockReassignedBy = 'Manager John';
    const mockReassignmentTime = {
      toDate: () => new Date('2024-12-15T10:30:00Z')
    };
    const mockUserTimezone = 'America/New_York';

    it('should send reassignment notification for task assignment', async () => {
      sgMail.send.mockResolvedValue([{ statusCode: 202 }]);

      await EmailService.sendReassignmentNotification(
        mockUserEmail,
        mockTaskData,
        mockReassignmentType,
        mockReassignedBy,
        mockReassignmentTime,
        mockUserTimezone
      );

      expect(sgMail.send).toHaveBeenCalledTimes(1);
      const sentEmail = sgMail.send.mock.calls[0][0];

      expect(sentEmail.to).toBe(mockUserEmail);
      expect(sentEmail.from).toBe(process.env.SENDGRID_FROM_EMAIL);
      expect(sentEmail.subject).toBe(`Task Reassignment: ${mockTaskData.title}`);
      expect(sentEmail.html).toContain('Task Reassignment Notification');
      expect(sentEmail.html).toContain('You have been assigned to this task');
      expect(sentEmail.html).toContain(mockReassignedBy);
      expect(sentEmail.html).toContain(mockTaskData.priority);
      expect(sentEmail.html).toContain(mockTaskData.description);
      expect(sentEmail.html).toContain(`${process.env.FRONTEND_URL}/tasks/${mockTaskData.id}`);
    });

    it('should send reassignment notification for task removal', async () => {
      sgMail.send.mockResolvedValue([{ statusCode: 202 }]);

      await EmailService.sendReassignmentNotification(
        mockUserEmail,
        mockTaskData,
        'removed',
        mockReassignedBy,
        mockReassignmentTime,
        mockUserTimezone
      );

      const sentEmail = sgMail.send.mock.calls[0][0];
      expect(sentEmail.html).toContain('You have been removed from this task');
    });

    it('should handle task without priority', async () => {
      const taskDataWithoutPriority = {
        ...mockTaskData,
        priority: undefined
      };

      sgMail.send.mockResolvedValue([{ statusCode: 202 }]);

      await EmailService.sendReassignmentNotification(
        mockUserEmail,
        taskDataWithoutPriority,
        mockReassignmentType,
        mockReassignedBy,
        mockReassignmentTime,
        mockUserTimezone
      );

      const sentEmail = sgMail.send.mock.calls[0][0];
      expect(sentEmail.html).toContain('<p><strong>Priority:</strong> Not specified</p>');
    });

    it('should handle task without description', async () => {
      const taskDataWithoutDescription = {
        ...mockTaskData,
        description: undefined
      };

      sgMail.send.mockResolvedValue([{ statusCode: 202 }]);

      await EmailService.sendReassignmentNotification(
        mockUserEmail,
        taskDataWithoutDescription,
        mockReassignmentType,
        mockReassignedBy,
        mockReassignmentTime,
        mockUserTimezone
      );

      const sentEmail = sgMail.send.mock.calls[0][0];
      expect(sentEmail.html).not.toContain('<p><strong>Description:</strong>');
    });

    it('should throw error when reassignment email sending fails', async () => {
      const mockError = new Error('Reassignment email send error');
      sgMail.send.mockRejectedValue(mockError);

      await expect(EmailService.sendReassignmentNotification(
        mockUserEmail,
        mockTaskData,
        mockReassignmentType,
        mockReassignedBy,
        mockReassignmentTime,
        mockUserTimezone
      )).rejects.toThrow('Reassignment email send error');

      expect(sgMail.send).toHaveBeenCalledTimes(1);
    });

    it('should format timestamps in user timezone', async () => {
      sgMail.send.mockResolvedValue([{ statusCode: 202 }]);

      await EmailService.sendReassignmentNotification(
        mockUserEmail,
        mockTaskData,
        mockReassignmentType,
        mockReassignedBy,
        mockReassignmentTime,
        'Europe/London'
      );

      const sentEmail = sgMail.send.mock.calls[0][0];
      expect(sentEmail.html).toContain('<p><strong>Due Date:</strong>');
      expect(sentEmail.html).toContain('<p><strong>Reassignment Time:</strong>');
    });
  });
});