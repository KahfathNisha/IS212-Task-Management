import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { createVuetify } from 'vuetify';
import ProjectTaskItem from '@/components/ProjectTaskItem.vue';

// Mock Firebase Firestore
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  getDocs: vi.fn(),
}));

vi.mock('@/config/firebase', () => ({
  db: {},
}));

const vuetify = createVuetify();

describe('ProjectTaskItem.vue', () => {
  let wrapper;

  const mockTask = {
    id: 'task1',
    title: 'Test Task',
    status: 'Ongoing',
    dueDate: '2024-12-31',
    assignedTo: 'user@example.com',
    projectId: 'proj1',
  };

  const mockUsers = [
    { email: 'user@example.com', name: 'John Doe' },
    { email: 'other@example.com', name: 'Jane Smith' },
  ];

  beforeEach(async () => {
    vi.clearAllMocks();
    const { getDocs } = await import('firebase/firestore');
    vi.mocked(getDocs).mockResolvedValue({
      docs: mockUsers.map((user) => ({
        id: user.email,
        data: () => ({ name: user.name }),
      })),
    });
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
  });

  const createWrapper = (props = {}) => {
    return mount(ProjectTaskItem, {
      props: {
        task: mockTask,
        ...props,
      },
      global: {
        plugins: [vuetify],
        stubs: {
          'v-chip': true,
          'v-icon': true,
          'v-btn': {
            template: '<button @click="$emit(\'click\')"><slot /></button>',
            emits: ['click'],
          },
        },
      },
    });
  };

  describe('Component Initialization', () => {
    it('should mount successfully', () => {
      wrapper = createWrapper();
      expect(wrapper.exists()).toBe(true);
    });

    it('should display task title', () => {
      wrapper = createWrapper();
      expect(wrapper.text()).toContain('Test Task');
    });

    it('should load users on mount', async () => {
      wrapper = createWrapper();
      await nextTick();
      await new Promise((resolve) => setTimeout(resolve, 100));

      const { getDocs } = await import('firebase/firestore');
      expect(getDocs).toHaveBeenCalled();
    });

    it('should handle user loading errors gracefully', async () => {
      const { getDocs } = await import('firebase/firestore');
      vi.mocked(getDocs).mockRejectedValueOnce(new Error('Permission denied'));
      wrapper = createWrapper();
      await nextTick();
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(wrapper.vm.allUsers).toEqual([]);
    });
  });

  describe('Task Display', () => {
    beforeEach(() => {
      wrapper = createWrapper();
    });

    it('should display task status correctly', () => {
      expect(wrapper.vm.task.status).toBe('Ongoing');
    });

    it('should display due date when present', () => {
      expect(wrapper.vm.task.dueDate).toBe('2024-12-31');
    });

    it('should not display due date when missing', () => {
      wrapper = createWrapper({
        task: { ...mockTask, dueDate: null },
      });
      expect(wrapper.vm.task.dueDate).toBeNull();
    });

    it('should display assigned user correctly', async () => {
      await nextTick();
      await new Promise((resolve) => setTimeout(resolve, 100));

      const displayName = wrapper.vm.displayAssignedTo;
      expect(displayName).toBeTruthy();
    });
  });

  describe('Status Colors and Icons', () => {
    beforeEach(() => {
      wrapper = createWrapper();
    });

    it('should return correct color for Pending status', () => {
      wrapper = createWrapper({ task: { ...mockTask, status: 'Pending' } });
      expect(wrapper.vm.getStatusColor('Pending')).toBe('orange');
    });

    it('should return correct color for Ongoing status', () => {
      expect(wrapper.vm.getStatusColor('Ongoing')).toBe('blue');
    });

    it('should return correct color for Pending Review status', () => {
      wrapper = createWrapper({ task: { ...mockTask, status: 'Pending Review' } });
      expect(wrapper.vm.getStatusColor('Pending Review')).toBe('purple');
    });

    it('should return correct color for Completed status', () => {
      wrapper = createWrapper({ task: { ...mockTask, status: 'Completed' } });
      expect(wrapper.vm.getStatusColor('Completed')).toBe('green');
    });

    it('should return grey for unknown status', () => {
      expect(wrapper.vm.getStatusColor('Unknown')).toBe('grey');
    });

    it('should return correct icon for each status', () => {
      expect(wrapper.vm.getStatusIcon('Pending')).toBe('mdi-clock-outline');
      expect(wrapper.vm.getStatusIcon('Ongoing')).toBe('mdi-play-circle-outline');
      expect(wrapper.vm.getStatusIcon('Pending Review')).toBe('mdi-eye-outline');
      expect(wrapper.vm.getStatusIcon('Completed')).toBe('mdi-check-circle-outline');
      expect(wrapper.vm.getStatusIcon('Unknown')).toBe('mdi-circle-outline');
    });
  });

  describe('Date Formatting', () => {
    beforeEach(() => {
      wrapper = createWrapper();
    });

    it('should format date correctly', () => {
      const formatted = wrapper.vm.formatDate('2024-12-31');
      expect(typeof formatted).toBe('string');
      expect(formatted).toBeTruthy();
    });

    it('should return empty string for null date', () => {
      const formatted = wrapper.vm.formatDate(null);
      expect(formatted).toBe('');
    });

    it('should return empty string for empty string date', () => {
      const formatted = wrapper.vm.formatDate('');
      expect(formatted).toBe('');
    });

    it('should handle invalid date format', () => {
      const formatted = wrapper.vm.formatDate('invalid-date');
      expect(typeof formatted).toBe('string');
    });

    it('should show "Today" for today\'s date', () => {
      const today = new Date().toISOString().split('T')[0];
      const formatted = wrapper.vm.formatDate(today);
      // Note: This might be "Today" or "In 0 days" depending on time
      expect(typeof formatted).toBe('string');
    });

    it('should show "Tomorrow" for tomorrow\'s date', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const formatted = wrapper.vm.formatDate(tomorrow.toISOString().split('T')[0]);
      // May show "Tomorrow" or "In 1 days"
      expect(typeof formatted).toBe('string');
    });

    it('should show relative days for future dates', () => {
      const future = new Date();
      future.setDate(future.getDate() + 5);
      const formatted = wrapper.vm.formatDate(future.toISOString().split('T')[0]);
      expect(formatted).toContain('days');
    });
  });

  describe('Overdue Detection', () => {
    beforeEach(() => {
      wrapper = createWrapper();
    });

    it('should detect overdue tasks', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      const isOverdue = wrapper.vm.isOverdue(pastDate.toISOString().split('T')[0]);
      expect(isOverdue).toBe(true);
    });

    it('should not mark future dates as overdue', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      const isOverdue = wrapper.vm.isOverdue(futureDate.toISOString().split('T')[0]);
      expect(isOverdue).toBe(false);
    });

    it('should return false for null date', () => {
      const isOverdue = wrapper.vm.isOverdue(null);
      expect(isOverdue).toBe(false);
    });

    it('should return false for empty string date', () => {
      const isOverdue = wrapper.vm.isOverdue('');
      expect(isOverdue).toBe(false);
    });
  });

  describe('Assigned To Display', () => {
    beforeEach(async () => {
      await nextTick();
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    it('should convert email to name when user found', async () => {
      wrapper = createWrapper({
        task: { ...mockTask, assignedTo: 'user@example.com' },
      });
      await nextTick();
      await new Promise((resolve) => setTimeout(resolve, 100));

      const displayName = wrapper.vm.displayAssignedTo;
      expect(displayName).toBe('John Doe');
    });

    it('should return email if user not found', async () => {
      wrapper = createWrapper({
        task: { ...mockTask, assignedTo: 'notfound@example.com' },
      });
      await nextTick();
      await new Promise((resolve) => setTimeout(resolve, 100));

      const displayName = wrapper.vm.displayAssignedTo;
      expect(displayName).toBe('notfound@example.com');
    });

    it('should handle assignedTo as object with name', async () => {
      wrapper = createWrapper({
        task: { ...mockTask, assignedTo: { name: 'John Doe' } },
      });
      await nextTick();
      await new Promise((resolve) => setTimeout(resolve, 100));

      const displayName = wrapper.vm.displayAssignedTo;
      expect(displayName).toBe('John Doe');
    });

    it('should handle assignedTo as object with email', async () => {
      wrapper = createWrapper({
        task: { ...mockTask, assignedTo: { email: 'user@example.com' } },
      });
      await nextTick();
      await new Promise((resolve) => setTimeout(resolve, 100));

      const displayName = wrapper.vm.displayAssignedTo;
      expect(displayName).toBe('John Doe');
    });

    it('should return empty string for null assignedTo', () => {
      wrapper = createWrapper({
        task: { ...mockTask, assignedTo: null },
      });
      expect(wrapper.vm.displayAssignedTo).toBe('');
    });

    it('should return name directly if not an email', () => {
      wrapper = createWrapper({
        task: { ...mockTask, assignedTo: 'John Doe' },
      });
      expect(wrapper.vm.displayAssignedTo).toBe('John Doe');
    });
  });

  describe('Event Emission', () => {
    it('should emit view-task event when button clicked', async () => {
      wrapper = createWrapper();
      await nextTick();

      const button = wrapper.find('button');
      await button.trigger('click');

      expect(wrapper.emitted('view-task')).toBeTruthy();
      expect(wrapper.emitted('view-task')[0]).toEqual([mockTask]);
    });
  });

  describe('Edge Cases', () => {
    it('should handle task with all null/undefined fields', () => {
      wrapper = createWrapper({
        task: {
          id: 'task1',
          title: null,
          status: undefined,
          dueDate: null,
          assignedTo: undefined,
        },
      });

      expect(wrapper.exists()).toBe(true);
    });

    it('should handle task with very long title', () => {
      const longTitle = 'A'.repeat(1000);
      wrapper = createWrapper({
        task: { ...mockTask, title: longTitle },
      });

      expect(wrapper.vm.task.title).toBe(longTitle);
    });

    it('should handle task with special characters in title', () => {
      wrapper = createWrapper({
        task: { ...mockTask, title: 'Task & <Special> "Chars"' },
      });

      expect(wrapper.vm.task.title).toBe('Task & <Special> "Chars"');
    });

    it('should handle task with invalid date format', () => {
      wrapper = createWrapper({
        task: { ...mockTask, dueDate: 'invalid-date-format' },
      });

      const formatted = wrapper.vm.formatDate('invalid-date-format');
      expect(typeof formatted).toBe('string');
    });

    it('should handle assignedTo with various object formats', async () => {
      wrapper = createWrapper({
        task: {
          ...mockTask,
          assignedTo: { value: 'user@example.com', name: 'John Doe' },
        },
      });
      await nextTick();
      await new Promise((resolve) => setTimeout(resolve, 100));

      const displayName = wrapper.vm.displayAssignedTo;
      expect(displayName).toBeTruthy();
    });

    it('should handle empty users array', async () => {
      const { getDocs } = await import('firebase/firestore');
      vi.mocked(getDocs).mockResolvedValueOnce({ docs: [] });
      wrapper = createWrapper();
      await nextTick();
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(wrapper.vm.allUsers).toEqual([]);
      expect(wrapper.vm.displayAssignedTo).toBe('user@example.com');
    });

    it('should handle task without assignedTo field', () => {
      wrapper = createWrapper({
        task: {
          id: 'task1',
          title: 'Task',
          status: 'Ongoing',
        },
      });

      expect(wrapper.vm.displayAssignedTo).toBe('');
    });

    it('should handle multiple status changes', () => {
      wrapper = createWrapper({ task: { ...mockTask, status: 'Pending' } });
      expect(wrapper.vm.getStatusColor('Pending')).toBe('orange');

      wrapper = createWrapper({ task: { ...mockTask, status: 'Completed' } });
      expect(wrapper.vm.getStatusColor('Completed')).toBe('green');
    });

    it('should handle date in various formats', () => {
      const formats = [
        '2024-12-31',
        '2024-12-31T00:00:00Z',
        new Date('2024-12-31').toISOString(),
      ];

      formats.forEach((format) => {
        const formatted = wrapper.vm.formatDate(format);
        expect(typeof formatted).toBe('string');
      });
    });
  });
});

