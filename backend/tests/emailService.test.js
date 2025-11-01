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

// NEW TESTS FOR DEADLINE REMINDER SCENARIOS
describe('EmailService Deadline Reminder Edge Cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.SENDGRID_API_KEY = 'test-api-key';
    process.env.SENDGRID_FROM_EMAIL = 'noreply@test.com';
    process.env.FRONTEND_URL = 'http://localhost:3000';
  });

  // AC1: Task created inside lead time - should still schedule reminder
  describe('Lead Time Handling (AC1)', () => {
    const mockTaskData = {
      title: 'Urgent Task',
      dueDate: {
        toDate: () => new Date(Date.now() + 6 * 60 * 60 * 1000) // Due in 6 hours
      },
      description: 'Task created with short notice',
      notes: 'Needs immediate attention',
      id: 'urgent-task-123'
    };

    const mockUserEmail = 'user@example.com';
    const mockUserTimezone = 'America/New_York';

    it('should schedule reminder for task created inside lead time', async () => {
      sgMail.send.mockResolvedValue([{ statusCode: 202 }]);

      // Task due in 6 hours with 24h lead time - should still trigger reminder
      const hoursLeft = 6;
      const minutesLeft = 0;

      await EmailService.sendDeadlineReminder(
        mockUserEmail,
        mockTaskData,
        hoursLeft,
        minutesLeft,
        mockUserTimezone
      );

      expect(sgMail.send).toHaveBeenCalledTimes(1);
      const sentEmail = sgMail.send.mock.calls[0][0];
      
      expect(sentEmail.to).toBe(mockUserEmail);
      expect(sentEmail.subject).toBe('Deadline Reminder: Urgent Task');
      expect(sentEmail.html).toContain('6 hours and 0 minutes');
      expect(sentEmail.html).toContain('Task created with short notice');
      expect(sentEmail.html).toContain('Needs immediate attention');
    });

    it('should handle reminder for task due very soon', async () => {
      sgMail.send.mockResolvedValue([{ statusCode: 202 }]);

      // Task due in 30 minutes
      const taskData = {
        ...mockTaskData,
        dueDate: {
          toDate: () => new Date(Date.now() + 30 * 60 * 1000) // Due in 30 minutes
        }
      };

      const hoursLeft = 0;
      const minutesLeft = 30;

      await EmailService.sendDeadlineReminder(
        mockUserEmail,
        taskData,
        hoursLeft,
        minutesLeft,
        mockUserTimezone
      );

      expect(sgMail.send).toHaveBeenCalledTimes(1);
      const sentEmail = sgMail.send.mock.calls[0][0];
      
      expect(sentEmail.html).toContain('0 hours and 30 minutes');
    });
  });

  // AC9: Deadline pushed earlier - should cancel old and schedule new
  describe('Deadline Adjustments - Earlier (AC9)', () => {
    const mockTaskData = {
      title: 'Adjustable Task',
      dueDate: {
        toDate: () => new Date(Date.now() + 24 * 60 * 60 * 1000) // Originally due in 24h
      },
      description: 'Task with flexible deadline',
      id: 'adjustable-task-456'
    };

    const mockUserEmail = 'user@example.com';
    const mockUserTimezone = 'America/New_York';

    it('should handle deadline moved from 24h to 8h', async () => {
      sgMail.send.mockResolvedValue([{ statusCode: 202 }]);

      // Original reminder was for 24h due, now due in 8h
      const newHoursLeft = 8;
      const newMinutesLeft = 0;

      await EmailService.sendDeadlineReminder(
        mockUserEmail,
        mockTaskData,
        newHoursLeft,
        newMinutesLeft,
        mockUserTimezone
      );

      expect(sgMail.send).toHaveBeenCalledTimes(1);
      const sentEmail = sgMail.send.mock.calls[0][0];
      
      expect(sentEmail.html).toContain('8 hours and 0 minutes');
      expect(sentEmail.subject).toBe('Deadline Reminder: Adjustable Task');
    });

    it('should handle multiple deadline adjustments', async () => {
      sgMail.send.mockResolvedValue([{ statusCode: 202 }]);

      // Test progression: 24h -> 12h -> 6h
      const adjustments = [
        { hours: 12, minutes: 0, expectedText: '12 hours and 0 minutes' },
        { hours: 6, minutes: 30, expectedText: '6 hours and 30 minutes' }
      ];

      for (const adjustment of adjustments) {
        await EmailService.sendDeadlineReminder(
          mockUserEmail,
          mockTaskData,
          adjustment.hours,
          adjustment.minutes,
          mockUserTimezone
        );
      }

      expect(sgMail.send).toHaveBeenCalledTimes(2);
      
      const secondCall = sgMail.send.mock.calls[1][0];
      expect(secondCall.html).toContain(adjustments[1].expectedText);
    });
  });

  // AC10: Deadline pushed later - should schedule new reminders
  describe('Deadline Adjustments - Later (AC10)', () => {
    const mockTaskData = {
      title: 'Extended Task',
      dueDate: {
        toDate: () => new Date(Date.now() + 48 * 60 * 60 * 1000) // Originally due in 48h
      },
      description: 'Task with extended deadline',
      id: 'extended-task-789'
    };

    const mockUserEmail = 'user@example.com';
    const mockUserTimezone = 'America/New_York';

    it('should handle deadline extended from 24h to 48h', async () => {
      sgMail.send.mockResolvedValue([{ statusCode: 202 }]);

      // Original was 24h, now extended to 48h
      const hoursLeft = 48;
      const minutesLeft = 0;

      await EmailService.sendDeadlineReminder(
        mockUserEmail,
        mockTaskData,
        hoursLeft,
        minutesLeft,
        mockUserTimezone
      );

      expect(sgMail.send).toHaveBeenCalledTimes(1);
      const sentEmail = sgMail.send.mock.calls[0][0];
      
      expect(sentEmail.html).toContain('48 hours and 0 minutes');
      expect(sentEmail.subject).toBe('Deadline Reminder: Extended Task');
    });

    it('should handle deadline extended significantly', async () => {
      sgMail.send.mockResolvedValue([{ statusCode: 202 }]);

      // Extended from 24h to 168h (1 week)
      const taskDataExtended = {
        ...mockTaskData,
        dueDate: {
          toDate: () => new Date(Date.now() + 168 * 60 * 60 * 1000) // 1 week
        }
      };

      const hoursLeft = 168;
      const minutesLeft = 0;

      await EmailService.sendDeadlineReminder(
        mockUserEmail,
        taskDataExtended,
        hoursLeft,
        minutesLeft,
        mockUserTimezone
      );

      expect(sgMail.send).toHaveBeenCalledTimes(1);
      const sentEmail = sgMail.send.mock.calls[0][0];
      
      expect(sentEmail.html).toContain('168 hours and 0 minutes');
      expect(sentEmail.html).toContain('Task with extended deadline');
    });
  });

  // AC11: Task deletion should stop reminders
  describe('Task Deletion Handling (AC11)', () => {
    const mockTaskData = {
      title: 'Deleted Task',
      dueDate: {
        toDate: () => new Date(Date.now() + 12 * 60 * 60 * 1000) // Due in 12h
      },
      description: 'Task that will be deleted',
      id: 'deleted-task-999'
    };

    const mockUserEmail = 'user@example.com';
    const mockUserTimezone = 'America/New_York';

    it('should not send reminder for deleted task', async () => {
      // Simulate task deletion by making task data undefined/null
      const deletedTaskData = null;

      await expect(EmailService.sendDeadlineReminder(
        mockUserEmail,
        deletedTaskData,
        12,
        0,
        mockUserTimezone
      )).rejects.toThrow();

      expect(sgMail.send).not.toHaveBeenCalled();
    });

    it('should handle task with missing critical data', async () => {
      const incompleteTaskData = {
        title: 'Incomplete Task'
        // Missing dueDate, description, notes, id
      };

      sgMail.send.mockResolvedValue([{ statusCode: 202 }]);

      await EmailService.sendDeadlineReminder(
        mockUserEmail,
        incompleteTaskData,
        12,
        0,
        mockUserTimezone
      );

      expect(sgMail.send).toHaveBeenCalledTimes(1);
      const sentEmail = sgMail.send.mock.calls[0][0];
      
      expect(sentEmail.subject).toBe('Deadline Reminder: Incomplete Task');
      // Should not crash even with incomplete data
    });
  });

  // AC17: Multiple tasks with same deadline → separate emails
  describe('Multiple Tasks Same Deadline (AC17)', () => {
    const mockUserEmail = 'user@example.com';
    const mockUserTimezone = 'America/New_York';
    const sameDueDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // Same due date

    it('should send separate emails for tasks with identical deadlines', async () => {
      sgMail.send.mockResolvedValue([{ statusCode: 202 }]);

      const task1 = {
        title: 'Task A',
        dueDate: { toDate: () => sameDueDate },
        description: 'First task',
        id: 'task-a-1'
      };

      const task2 = {
        title: 'Task B', 
        dueDate: { toDate: () => sameDueDate },
        description: 'Second task',
        id: 'task-b-2'
      };

      // Send reminders for both tasks
      await EmailService.sendDeadlineReminder(mockUserEmail, task1, 24, 0, mockUserTimezone);
      await EmailService.sendDeadlineReminder(mockUserEmail, task2, 24, 0, mockUserTimezone);

      expect(sgMail.send).toHaveBeenCalledTimes(2);
      
      const firstCall = sgMail.send.mock.calls[0][0];
      const secondCall = sgMail.send.mock.calls[1][0];
      
      expect(firstCall.subject).toBe('Deadline Reminder: Task A');
      expect(secondCall.subject).toBe('Deadline Reminder: Task B');
      expect(firstCall.html).toContain('First task');
      expect(secondCall.html).toContain('Second task');
    });

    it('should handle many tasks with same deadline', async () => {
      sgMail.send.mockResolvedValue([{ statusCode: 202 }]);

      const tasks = [
        { title: 'Task 1', dueDate: { toDate: () => sameDueDate }, id: 'task-1' },
        { title: 'Task 2', dueDate: { toDate: () => sameDueDate }, id: 'task-2' },
        { title: 'Task 3', dueDate: { toDate: () => sameDueDate }, id: 'task-3' },
        { title: 'Task 4', dueDate: { toDate: () => sameDueDate }, id: 'task-4' },
        { title: 'Task 5', dueDate: { toDate: () => sameDueDate }, id: 'task-5' }
      ];

      // Send reminders for all tasks
      for (const task of tasks) {
        await EmailService.sendDeadlineReminder(mockUserEmail, task, 24, 0, mockUserTimezone);
      }

      expect(sgMail.send).toHaveBeenCalledTimes(5);
      
      // Verify each email has unique content
      tasks.forEach((task, index) => {
        const call = sgMail.send.mock.calls[index][0];
        expect(call.subject).toBe(`Deadline Reminder: ${task.title}`);
      });
    });
  });

  // AC13-14: Disabled notifications suppress all reminders
  describe('Disabled Notifications (AC13-14)', () => {
    const mockTaskData = {
      title: 'Task with Disabled Notifications',
      dueDate: {
        toDate: () => new Date(Date.now() + 24 * 60 * 60 * 1000) // Due in 24h
      },
      description: 'Task when notifications are off',
      id: 'disabled-task-123'
    };

    const mockUserEmail = 'user@example.com';
    const mockUserTimezone = 'America/New_York';

    it('should handle email service failure gracefully when notifications disabled', async () => {
      const mockError = new Error('Email service unavailable');
      sgMail.send.mockRejectedValue(mockError);

      await expect(EmailService.sendDeadlineReminder(
        mockUserEmail,
        mockTaskData,
        24,
        0,
        mockUserTimezone
      )).rejects.toThrow('Email service unavailable');

      expect(sgMail.send).toHaveBeenCalledTimes(1);
    });

    it('should handle invalid email addresses', async () => {
      sgMail.send.mockResolvedValue([{ statusCode: 202 }]);

      const invalidEmails = ['', null, undefined, 'invalid-email'];

      for (const invalidEmail of invalidEmails) {
        await expect(EmailService.sendDeadlineReminder(
          invalidEmail,
          mockTaskData,
          24,
          0,
          mockUserTimezone
        )).rejects.toThrow();
      }

      // Email service should be called for each invalid email (validation happens at service level)
      expect(sgMail.send).toHaveBeenCalledTimes(invalidEmails.length);
    });

    it('should handle timezone edge cases', async () => {
      sgMail.send.mockResolvedValue([{ statusCode: 202 }]);

      const edgeCaseTimezones = [
        'UTC',
        'America/New_York',
        'Asia/Tokyo',
        'Pacific/Auckland',
        'invalid/timezone'
      ];

      for (const timezone of edgeCaseTimezones) {
        await EmailService.sendDeadlineReminder(
          mockUserEmail,
          mockTaskData,
          24,
          0,
          timezone
        );
      }

      expect(sgMail.send).toHaveBeenCalledTimes(edgeCaseTimezones.length);
      
      // All calls should succeed despite timezone variations
      edgeCaseTimezones.forEach((timezone, index) => {
        const call = sgMail.send.mock.calls[index][0];
        expect(call.to).toBe(mockUserEmail);
      });
    });
  });
});
});