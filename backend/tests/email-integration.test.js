// Email Integration Test - Focused on EmailService functionality
// Tests deadline reminders and task reassignments

// Load environment variables FIRST (before requiring services that use them)
const path = require('path');
const fs = require('fs');
const envPath = path.join(__dirname, '../.env');

if (!fs.existsSync(envPath)) {
  console.error(`❌ .env file not found at: ${envPath}`);
  process.exit(1);
}

require('dotenv').config({ path: envPath });

// Mock @sendgrid/mail for integration testing
const sgMail = require('@sendgrid/mail');
jest.mock('@sendgrid/mail', () => ({
  setApiKey: jest.fn(),
  send: jest.fn()
}));

// Use shared Firebase initialization
const { admin, db } = require('./firebase-init');
const EmailService = require('../src/services/emailService');

describe('EmailService Integration Tests', () => {
  let mockUserEmail;
  let mockTaskData;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUserEmail = 'test@example.com';
    
    mockTaskData = {
      id: `email-test-${Date.now()}`,
      title: 'Email Integration Test Task',
      description: 'End-to-end test of EmailService for task updates',
      dueDate: {
        toDate: () => new Date(Date.now() + 2*60*60*1000) // 2 hours from now
      },
      status: 'Ongoing',
      priority: 'High',
      notes: 'Integration test notes',
      taskOwner: 'Email Test System',
      taskOwnerDepartment: 'QA',
      archived: false
    };

    // Mock successful email sending
    sgMail.send.mockResolvedValue([{ statusCode: 202 }]);
  });

  describe('Deadline Reminder Integration', () => {
    it('should send deadline reminder email with 5 hours remaining', async () => {
      const hoursLeft = 5;
      const minutesLeft = 0;
      const userTimezone = 'UTC';

      await EmailService.sendDeadlineReminder(
        mockUserEmail,
        mockTaskData,
        hoursLeft,
        minutesLeft,
        userTimezone
      );

      expect(sgMail.send).toHaveBeenCalledTimes(1);
      const sentEmail = sgMail.send.mock.calls[0][0];

      expect(sentEmail.to).toBe(mockUserEmail);
      expect(sentEmail.from).toBe(process.env.SENDGRID_FROM_EMAIL);
      expect(sentEmail.subject).toBe(`Deadline Reminder: ${mockTaskData.title}`);
      expect(sentEmail.html).toContain('📋 Task:</strong> Email Integration Test Task');
      expect(sentEmail.html).toContain('⏰ Time Remaining:</strong> 5 hours and 0 minutes');
      expect(sentEmail.html).toContain('📅 Due Date:</strong>');
      expect(sentEmail.html).toContain('⭐️ Priority:</strong> High');
      expect(sentEmail.html).toContain('📝 Description:</strong> End-to-end test of EmailService for task updates');
      expect(sentEmail.html).toContain('📝 Notes:</strong> Integration test notes');
      expect(sentEmail.html).toContain(`${process.env.FRONTEND_URL}/tasks/${mockTaskData.id}`);
    });

    it('should send deadline reminder email with 3 days remaining (72 hours)', async () => {
      const threeDaysTaskData = {
        ...mockTaskData,
        dueDate: {
          toDate: () => new Date(Date.now() + 3*24*60*60*1000) // 3 days from now
        }
      };

      await EmailService.sendDeadlineReminder(
        mockUserEmail,
        threeDaysTaskData,
        72, // 3 days = 72 hours
        0,
        'UTC'
      );

      expect(sgMail.send).toHaveBeenCalledTimes(1);
      const sentEmail = sgMail.send.mock.calls[0][0];

      // Should convert 72 hours to "3 days"
      expect(sentEmail.html).toContain('⏰ Time Remaining:</strong> 3 days');
    });

    it('should handle deadline reminder with mixed hours and minutes', async () => {
      const hoursLeft = 2;
      const minutesLeft = 30;

      await EmailService.sendDeadlineReminder(
        mockUserEmail,
        mockTaskData,
        hoursLeft,
        minutesLeft,
        'UTC'
      );

      expect(sgMail.send).toHaveBeenCalledTimes(1);
      const sentEmail = sgMail.send.mock.calls[0][0];

      expect(sentEmail.html).toContain('⏰ Time Remaining:</strong> 2 hours and 30 minutes');
    });
  });

  describe('Task Reassignment Integration', () => {
    const mockReassignedBy = 'Email Test Admin';
    const mockReassignmentTime = {
      toDate: () => new Date()
    };
    const mockUserTimezone = 'UTC';

    it('should send task assignment email', async () => {
      await EmailService.sendReassignmentNotification(
        mockUserEmail,
        mockTaskData,
        'assigned',
        mockReassignedBy,
        mockReassignmentTime,
        mockUserTimezone
      );

      expect(sgMail.send).toHaveBeenCalledTimes(1);
      const sentEmail = sgMail.send.mock.calls[0][0];

      expect(sentEmail.to).toBe(mockUserEmail);
      expect(sentEmail.from).toBe(process.env.SENDGRID_FROM_EMAIL);
      expect(sentEmail.subject).toBe(`Task Reassignment: ${mockTaskData.title}`);
      expect(sentEmail.html).toContain('📋 Task:</strong> Email Integration Test Task');
      expect(sentEmail.html).toContain('🎯 Action:</strong> You have been assigned to this task');
      expect(sentEmail.html).toContain('👤 Reassigned by:</strong> Email Test Admin');
      expect(sentEmail.html).toContain('⏰ Reassignment Time:</strong>');
      expect(sentEmail.html).toContain('⭐️ Priority:</strong> High');
      expect(sentEmail.html).toContain('📅 Due Date:</strong>');
      expect(sentEmail.html).toContain('📝 Description:</strong> End-to-end test of EmailService for task updates');
      expect(sentEmail.html).toContain(`${process.env.FRONTEND_URL}/tasks/${mockTaskData.id}`);
    });

    it('should send task unassignment email', async () => {
      await EmailService.sendReassignmentNotification(
        mockUserEmail,
        mockTaskData,
        'removed',
        mockReassignedBy,
        mockReassignmentTime,
        mockUserTimezone
      );

      expect(sgMail.send).toHaveBeenCalledTimes(1);
      const sentEmail = sgMail.send.mock.calls[0][0];

      expect(sentEmail.html).toContain('🎯 Action:</strong> You have been removed from this task');
    });

    it('should handle missing priority field', async () => {
      const taskDataWithoutPriority = {
        ...mockTaskData,
        priority: undefined
      };

      await EmailService.sendReassignmentNotification(
        mockUserEmail,
        taskDataWithoutPriority,
        'assigned',
        mockReassignedBy,
        mockReassignmentTime,
        mockUserTimezone
      );

      expect(sgMail.send).toHaveBeenCalledTimes(1);
      const sentEmail = sgMail.send.mock.calls[0][0];

      expect(sentEmail.html).toContain('⭐️ Priority:</strong> Not specified');
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle email sending failure', async () => {
      const mockError = new Error('Email service temporarily unavailable');
      sgMail.send.mockRejectedValue(mockError);

      await expect(EmailService.sendDeadlineReminder(
        mockUserEmail,
        mockTaskData,
        5,
        0,
        'UTC'
      )).rejects.toThrow('Email service temporarily unavailable');

      expect(sgMail.send).toHaveBeenCalledTimes(1);
    });

    it('should handle invalid email address', async () => {
      const invalidEmail = 'invalid-email';

      await expect(EmailService.sendDeadlineReminder(
        invalidEmail,
        mockTaskData,
        5,
        0,
        'UTC'
      )).rejects.toThrow();

      // Email service should still attempt to send (validation happens at service level)
      expect(sgMail.send).toHaveBeenCalled();
      const sentEmail = sgMail.send.mock.calls[0][0];
      expect(sentEmail.to).toBe(invalidEmail);
    });

    it('should handle invalid task data', async () => {
      const invalidTaskData = null;

      await expect(EmailService.sendDeadlineReminder(
        mockUserEmail,
        invalidTaskData,
        5,
        0,
        'UTC'
      )).rejects.toThrow();

      expect(sgMail.send).not.toHaveBeenCalled();
    });
  });

  describe('Timezone Integration', () => {
    it('should format emails in different timezones', async () => {
      const timezones = ['America/New_York', 'Asia/Tokyo', 'Europe/London'];

      for (const timezone of timezones) {
        jest.clearAllMocks();
        sgMail.send.mockResolvedValue([{ statusCode: 202 }]);

        await EmailService.sendDeadlineReminder(
          mockUserEmail,
          mockTaskData,
          5,
          0,
          timezone
        );

        expect(sgMail.send).toHaveBeenCalledTimes(1);
      }
    });

    it('should handle invalid timezone gracefully', async () => {
      const invalidTimezone = 'Invalid/Timezone';

      await EmailService.sendDeadlineReminder(
        mockUserEmail,
        mockTaskData,
        5,
        0,
        invalidTimezone
      );

      expect(sgMail.send).toHaveBeenCalledTimes(1);
      // Should fall back to UTC
      const sentEmail = sgMail.send.mock.calls[0][0];
      expect(sentEmail.html).toContain('📅 Due Date:</strong>');
    });
  });
});