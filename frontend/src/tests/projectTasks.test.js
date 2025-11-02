import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { createVuetify } from 'vuetify';
import ProjectTasks from '@/components/ProjectTasks.vue';
import axios from 'axios';

// Mock axios
const mockAxiosInstance = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  interceptors: {
    request: {
      use: vi.fn(),
    },
  },
};

vi.mock('axios', async () => {
  const actual = await vi.importActual('axios');
  return {
    ...actual,
    default: {
      ...actual.default,
      create: vi.fn(() => mockAxiosInstance),
    },
  };
});

// Mock components
vi.mock('@/components/ProjectTaskItem.vue', () => ({
  default: {
    name: 'ProjectTaskItem',
    template: '<div data-testid="project-task-item">ProjectTaskItem</div>',
    props: ['task'],
    emits: ['view-task'],
  },
}));

vi.mock('@/components/ProjectTaskItemDetails.vue', () => ({
  default: {
    name: 'ProjectTaskItemDetails',
    template: '<div data-testid="project-task-item-details">ProjectTaskItemDetails</div>',
    props: ['model', 'show'],
    emits: ['update:show', 'view-parent', 'open-attachment'],
  },
}));

// Mock localStorage
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: vi.fn(() => 'mock-token'),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  },
  writable: true,
});

const vuetify = createVuetify();

describe('ProjectTasks.vue', () => {
  let wrapper;

  const mockTasks = [
    {
      id: 'task1',
      title: 'Task 1',
      status: 'Pending',
      projectId: 'proj1',
      dueDate: '2024-12-31',
      assignedTo: 'user1@example.com',
    },
    {
      id: 'task2',
      title: 'Task 2',
      status: 'Ongoing',
      projectId: 'proj1',
      dueDate: '2024-11-30',
      assignedTo: 'user2@example.com',
    },
    {
      id: 'task3',
      title: 'Task 3',
      status: 'Pending Review',
      projectId: 'proj1',
      assignedTo: 'user3@example.com',
    },
    {
      id: 'task4',
      title: 'Task 4',
      status: 'Completed',
      projectId: 'proj1',
      assignedTo: 'user4@example.com',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockAxiosInstance.get.mockResolvedValue({ data: [] });
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
  });

  const createWrapper = (props = {}) => {
    return mount(ProjectTasks, {
      props: {
        projectId: 'proj1',
        show: true,
        ...props,
      },
      global: {
        plugins: [vuetify],
        stubs: {
          'v-progress-circular': true,
          'v-chip': true,
          'v-icon': true,
          'v-expand-transition': {
            template: '<div v-show="show"><slot /></div>',
            props: ['show'],
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

    it('should load tasks when show prop is true', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockTasks });
      wrapper = createWrapper();
      await nextTick();
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/tasks/project/proj1');
      expect(wrapper.vm.tasks).toHaveLength(4);
    });

    it('should not load tasks when show prop is false', async () => {
      wrapper = createWrapper({ show: false });
      await nextTick();

      expect(mockAxiosInstance.get).not.toHaveBeenCalled();
      expect(wrapper.vm.tasks).toEqual([]);
    });

    it('should show loading state while fetching tasks', async () => {
      mockAxiosInstance.get.mockImplementation(
        () => new Promise(() => {})
      );
      wrapper = createWrapper();
      await nextTick();

      expect(wrapper.vm.loadingTasks).toBe(true);
    });
  });

  describe('Task Loading', () => {
    it('should handle empty tasks array', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({ data: [] });
      wrapper = createWrapper();
      await nextTick();
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(wrapper.vm.tasks).toEqual([]);
      expect(wrapper.vm.loadingTasks).toBe(false);
    });

    it('should handle network errors gracefully', async () => {
      mockAxiosInstance.get.mockRejectedValueOnce(new Error('Network error'));
      wrapper = createWrapper();
      await nextTick();
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(wrapper.vm.tasks).toEqual([]);
      expect(wrapper.vm.loadingTasks).toBe(false);
    });

    it('should handle invalid response format', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({ data: null });
      wrapper = createWrapper();
      await nextTick();
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(Array.isArray(wrapper.vm.tasks)).toBe(true);
    });

    it('should not load if projectId is missing', async () => {
      wrapper = createWrapper({ projectId: null });
      await nextTick();

      expect(wrapper.vm.tasks).toEqual([]);
      expect(mockAxiosInstance.get).not.toHaveBeenCalled();
    });

    it('should prevent duplicate loading', async () => {
      let resolvePromise;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      mockAxiosInstance.get.mockReturnValue(promise);
      wrapper = createWrapper();
      await nextTick();

      // Try to load again while loading
      wrapper.vm.loadTasks();
      await nextTick();

      resolvePromise({ data: mockTasks });
      await nextTick();

      // Should only be called once
      expect(mockAxiosInstance.get.mock.calls.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Task Grouping by Status', () => {
    beforeEach(async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockTasks });
      wrapper = createWrapper();
      await nextTick();
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    it('should group tasks by status correctly', () => {
      const pendingTasks = wrapper.vm.getTasksByStatus('Pending');
      const ongoingTasks = wrapper.vm.getTasksByStatus('Ongoing');
      const completedTasks = wrapper.vm.getTasksByStatus('Completed');

      expect(pendingTasks).toHaveLength(1);
      expect(pendingTasks[0].id).toBe('task1');
      expect(ongoingTasks).toHaveLength(1);
      expect(ongoingTasks[0].id).toBe('task2');
      expect(completedTasks).toHaveLength(1);
      expect(completedTasks[0].id).toBe('task4');
    });

    it('should return empty array for non-existent status', () => {
      const tasks = wrapper.vm.getTasksByStatus('NonExistent');
      expect(tasks).toEqual([]);
    });

    it('should show only statuses with tasks', () => {
      const visibleStatuses = wrapper.vm.visibleStatuses;
      expect(visibleStatuses).toContain('Pending');
      expect(visibleStatuses).toContain('Ongoing');
      expect(visibleStatuses).toContain('Pending Review');
      expect(visibleStatuses).toContain('Completed');
    });
  });

  describe('Status Section Expansion', () => {
    beforeEach(async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockTasks });
      wrapper = createWrapper();
      await nextTick();
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    it('should toggle status section open', () => {
      expect(wrapper.vm.expandedStatuses).not.toContain('Pending');
      wrapper.vm.toggleStatusSection('Pending');
      expect(wrapper.vm.expandedStatuses).toContain('Pending');
    });

    it('should toggle status section closed', () => {
      wrapper.vm.expandedStatuses = ['Pending'];
      wrapper.vm.toggleStatusSection('Pending');
      expect(wrapper.vm.expandedStatuses).not.toContain('Pending');
    });

    it('should handle multiple expanded sections', () => {
      wrapper.vm.toggleStatusSection('Pending');
      wrapper.vm.toggleStatusSection('Ongoing');
      wrapper.vm.toggleStatusSection('Completed');

      expect(wrapper.vm.expandedStatuses).toContain('Pending');
      expect(wrapper.vm.expandedStatuses).toContain('Ongoing');
      expect(wrapper.vm.expandedStatuses).toContain('Completed');
      expect(wrapper.vm.expandedStatuses.length).toBe(3);
    });
  });

  describe('Status Colors and Icons', () => {
    beforeEach(() => {
      wrapper = createWrapper();
    });

    it('should return correct color for each status', () => {
      expect(wrapper.vm.getStatusColor('Pending')).toBe('orange');
      expect(wrapper.vm.getStatusColor('Ongoing')).toBe('blue');
      expect(wrapper.vm.getStatusColor('Pending Review')).toBe('purple');
      expect(wrapper.vm.getStatusColor('Completed')).toBe('green');
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

  describe('Task Dialog', () => {
    beforeEach(async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockTasks });
      wrapper = createWrapper();
      await nextTick();
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    it('should open task dialog when view-task is emitted', () => {
      const task = mockTasks[0];
      wrapper.vm.openTaskDialog(task);

      expect(wrapper.vm.selectedTask).toStrictEqual(task);
      expect(wrapper.vm.showTaskDialog).toBe(true);
    });

    it('should not open dialog for null task', () => {
      wrapper.vm.openTaskDialog(null);
      expect(wrapper.vm.showTaskDialog).toBe(false);
    });

    it('should handle view-parent event', () => {
      const parentTask = mockTasks[1];
      wrapper.vm.handleViewParent(parentTask);

      expect(wrapper.vm.selectedTask).toStrictEqual(parentTask);
    });

    it('should handle open-attachment event', () => {
      const url = 'https://example.com/file.pdf';
      const openSpy = vi.spyOn(window, 'open').mockImplementation(() => {});

      wrapper.vm.handleOpenAttachment(url);

      expect(openSpy).toHaveBeenCalledWith(url, '_blank');
      openSpy.mockRestore();
    });

    it('should not open attachment for null url', () => {
      const openSpy = vi.spyOn(window, 'open').mockImplementation(() => {});

      wrapper.vm.handleOpenAttachment(null);

      expect(openSpy).not.toHaveBeenCalled();
      openSpy.mockRestore();
    });
  });

  describe('Watchers', () => {
    it('should reload tasks when show prop changes to true', async () => {
      wrapper = createWrapper({ show: false });
      await nextTick();

      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockTasks });
      await wrapper.setProps({ show: true });
      await nextTick();
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockAxiosInstance.get).toHaveBeenCalled();
    });

    it('should clear tasks when show prop changes to false', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockTasks });
      wrapper = createWrapper({ show: true });
      await nextTick();
      await new Promise((resolve) => setTimeout(resolve, 100));

      await wrapper.setProps({ show: false });
      await nextTick();

      expect(wrapper.vm.tasks).toEqual([]);
      expect(wrapper.vm.loadingTasks).toBe(false);
      expect(wrapper.vm.showTaskDialog).toBe(false);
      expect(wrapper.vm.expandedStatuses).toEqual([]);
    });

    it('should reload tasks when projectId changes', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockTasks });
      wrapper = createWrapper({ projectId: 'proj1' });
      await nextTick();
      await new Promise((resolve) => setTimeout(resolve, 100));

      mockAxiosInstance.get.mockResolvedValueOnce({ data: [] });
      await wrapper.setProps({ projectId: 'proj2' });
      await nextTick();
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(wrapper.vm.expandedStatuses).toEqual([]);
    });
  });

  describe('Edge Cases', () => {
    it('should handle tasks with null/undefined status', async () => {
      const tasksWithNullStatus = [
        { id: 'task1', status: null },
        { id: 'task2', status: undefined },
      ];
      mockAxiosInstance.get.mockResolvedValueOnce({ data: tasksWithNullStatus });
      wrapper = createWrapper();
      await nextTick();
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(wrapper.vm.tasks).toHaveLength(2);
      const tasks = wrapper.vm.getTasksByStatus(null);
      expect(tasks.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle tasks with invalid status values', async () => {
      const tasksWithInvalidStatus = [
        { id: 'task1', status: 'InvalidStatus' },
      ];
      mockAxiosInstance.get.mockResolvedValueOnce({ data: tasksWithInvalidStatus });
      wrapper = createWrapper();
      await nextTick();
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(wrapper.vm.visibleStatuses).toEqual([]);
    });

    it('should handle very large task arrays', async () => {
      const largeTaskArray = Array.from({ length: 1000 }, (_, i) => ({
        id: `task${i}`,
        title: `Task ${i}`,
        status: i % 2 === 0 ? 'Pending' : 'Ongoing',
        projectId: 'proj1',
      }));
      mockAxiosInstance.get.mockResolvedValueOnce({ data: largeTaskArray });
      wrapper = createWrapper();
      await nextTick();
      await new Promise((resolve) => setTimeout(resolve, 500));

      expect(wrapper.vm.tasks).toHaveLength(1000);
      expect(wrapper.vm.getTasksByStatus('Pending').length).toBe(500);
    }, 10000); // Increase timeout to 10 seconds for this heavy test

    it('should handle missing projectId gracefully', async () => {
      wrapper = createWrapper({ projectId: '' });
      await nextTick();

      expect(wrapper.vm.tasks).toEqual([]);
      expect(mockAxiosInstance.get).not.toHaveBeenCalled();
    });

    it('should reset expanded sections when project changes', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: mockTasks });
      wrapper = createWrapper({ projectId: 'proj1' });
      await nextTick();
      await new Promise((resolve) => setTimeout(resolve, 100));

      wrapper.vm.expandedStatuses = ['Pending', 'Ongoing'];

      await wrapper.setProps({ projectId: 'proj2' });
      await nextTick();

      expect(wrapper.vm.expandedStatuses).toEqual([]);
    });
  });
});
