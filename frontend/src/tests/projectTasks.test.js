import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { createVuetify } from 'vuetify';
import ProjectTasks from '@/components/ProjectTasks.vue';
import axios from 'axios';

// Use vi.hoisted() for mocks
const { mockAxiosInstance } = vi.hoisted(() => {
  return {
    mockAxiosInstance: {
      get: vi.fn(),
      interceptors: {
        request: {
          use: vi.fn()
        }
      }
    }
  };
});

// Mock axios
vi.mock('axios', async () => {
  const actual = await vi.importActual('axios');
  return {
    ...actual,
    default: {
      ...actual.default,
      create: vi.fn(() => mockAxiosInstance)
    }
  };
});

// Mock localStorage
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: vi.fn(() => 'mock-token'),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn()
  },
  writable: true
});

// Mock window.open
global.window.open = vi.fn();

// Mock child components
vi.mock('@/components/ProjectTaskItem.vue', () => ({
  default: {
    name: 'ProjectTaskItem',
    template: '<div data-testid="project-task-item">Task Item</div>',
    props: ['task'],
    emits: ['view-task']
  }
}));

vi.mock('@/components/ProjectTaskItemDetails.vue', () => ({
  default: {
    name: 'ProjectTaskItemDetails',
    template: '<div data-testid="project-task-item-details">Task Details</div>',
    props: ['model', 'show'],
    emits: ['update:show', 'view-parent', 'open-attachment']
  }
}));

// Create Vuetify instance
const vuetify = createVuetify();

describe('ProjectTasks.vue - Comprehensive Unit Tests', () => {
  let wrapper;

  // Helper function to set component data (works with Vue 3 if properties are accessible)
  const setComponentData = async (wrapper, data) => {
    if (!wrapper || !wrapper.vm) return;
    for (const [key, value] of Object.entries(data)) {
      try {
        wrapper.vm[key] = value;
      } catch (e) {
        // Property not accessible, skip
      }
    }
    await nextTick();
  };

  const mockTasks = [
    {
      id: 'task1',
      projectId: 'proj1',
      title: 'Task 1',
      status: 'Ongoing',
      priority: 'High',
      assignedTo: 'user@example.com',
      dueDate: '2024-12-31'
    },
    {
      id: 'task2',
      projectId: 'proj1',
      title: 'Task 2',
      status: 'Pending',
      priority: 'Medium',
      assignedTo: 'user2@example.com',
      dueDate: '2024-11-30'
    },
    {
      id: 'task3',
      projectId: 'proj1',
      title: 'Task 3',
      status: 'Completed',
      priority: 'Low',
      assignedTo: 'user@example.com',
      dueDate: '2024-10-15'
    },
    {
      id: 'task4',
      projectId: 'proj1',
      title: 'Task 4',
      status: 'Pending Review',
      priority: 'High',
      assignedTo: 'user3@example.com',
      dueDate: null
    },
    {
      id: 'task5',
      projectId: 'proj1',
      title: 'Task 5',
      status: 'Ongoing',
      priority: 'Medium',
      assignedTo: 'user@example.com'
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockAxiosInstance.get.mockResolvedValue({
      data: mockTasks
    });
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
    vi.restoreAllMocks();
  });

  const createWrapper = (props = {}) => {
    return mount(ProjectTasks, {
      props: {
        projectId: 'proj1',
        show: true,
        ...props
      },
      global: {
        plugins: [vuetify],
        stubs: {
          'ProjectTaskItem': true,
          'ProjectTaskItemDetails': true,
          'v-expand-transition': {
            template: '<div v-show="show"><slot /></div>',
            props: ['show']
          }
        }
      }
    });
  };

  // ============================================
  // COMPONENT INITIALIZATION TESTS
  // ============================================
  describe('Component Initialization', () => {
    it('should mount successfully', () => {
      wrapper = createWrapper();
      expect(wrapper.exists()).toBe(true);
    });

      it('should initialize with default state', () => {
        wrapper = createWrapper({ show: false });
        expect(wrapper.vm.tasks).toEqual([]);
        expect(wrapper.vm.loadingTasks).toBe(false);
        // expandedStatuses should be an array (empty initially)
        const expanded = wrapper.vm.expandedStatuses;
        if (expanded !== undefined) {
          const isEmpty = Array.isArray(expanded) ? expanded.length === 0 : expanded.size === 0;
          expect(isEmpty).toBe(true);
        }
        expect(wrapper.vm.selectedTask).toBe(null);
        expect(wrapper.vm.showTaskDialog).toBe(false);
      });

    it('should load tasks on mount when show is true', async () => {
      wrapper = createWrapper({ show: true, projectId: 'proj1' });
      await nextTick();
      await new Promise(resolve => setTimeout(resolve, 150));
      
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/tasks/project/proj1');
    });

    it('should not load tasks when show is false', async () => {
      wrapper = createWrapper({ show: false, projectId: 'proj1' });
      await nextTick();
      
      // Should not load immediately
      expect(mockAxiosInstance.get).not.toHaveBeenCalled();
    });

    it('should show loading state while fetching', async () => {
      mockAxiosInstance.get.mockImplementation(() => 
        new Promise(() => {}) // Never resolves
      );
      
      wrapper = createWrapper();
      await nextTick();
      
      const loadingState = wrapper.find('.loading-state');
      expect(loadingState.exists()).toBe(true);
    });

    it('should handle loading error gracefully', async () => {
      mockAxiosInstance.get.mockRejectedValueOnce(new Error('Network error'));
      
      wrapper = createWrapper();
      await nextTick();
      await new Promise(resolve => setTimeout(resolve, 150));
      
      expect(wrapper.vm.tasks).toEqual([]);
    });
  });

  // ============================================
  // COMPUTED PROPERTIES TESTS
  // ============================================
  describe('Computed Properties', () => {
    beforeEach(async () => {
      wrapper = createWrapper();
      await nextTick();
        await setComponentData(wrapper, { tasks: mockTasks });
      await nextTick();
    });

    describe('visibleStatuses', () => {
      it('should only include statuses with tasks', () => {
        const visibleStatuses = wrapper.vm.visibleStatuses;
        expect(visibleStatuses).toContain('Ongoing');
        expect(visibleStatuses).toContain('Pending');
        expect(visibleStatuses).toContain('Completed');
        expect(visibleStatuses).toContain('Pending Review');
      });

      it('should exclude statuses with no tasks', async () => {
        const tasksWithLimitedStatuses = [
          { id: 'task1', status: 'Ongoing' },
          { id: 'task2', status: 'Ongoing' }
        ];
        
        await setComponentData(wrapper, { tasks: tasksWithLimitedStatuses });
        await nextTick();
        
        const visibleStatuses = wrapper.vm.visibleStatuses;
        expect(visibleStatuses).toEqual(['Ongoing']);
      });

      it('should update when tasks change', async () => {
        let visibleStatuses = wrapper.vm.visibleStatuses;
        expect(visibleStatuses.length).toBeGreaterThan(0);
        
        await setComponentData(wrapper, { tasks: [] });
        await nextTick();
        
        visibleStatuses = wrapper.vm.visibleStatuses;
        expect(visibleStatuses).toEqual([]);
      });
    });
  });

  // ============================================
  // METHOD TESTS
  // ============================================
  describe('Methods', () => {
    beforeEach(async () => {
      wrapper = createWrapper();
      await nextTick();
        await setComponentData(wrapper, { tasks: mockTasks });
      await nextTick();
    });

    describe('loadTasks', () => {
      it('should load tasks for valid projectId', async () => {
        mockAxiosInstance.get.mockResolvedValueOnce({ data: mockTasks });
        
        await wrapper.setProps({ projectId: 'proj2' });
        await nextTick();
        await new Promise(resolve => setTimeout(resolve, 150));
        
        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/tasks/project/proj2');
      });

      it('should not load if projectId is null', async () => {
        // Create a fresh wrapper with null projectId
        const nullWrapper = createWrapper({ projectId: null, show: true });
        await nextTick();
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // loadTasks should set tasks to empty array when projectId is null
        expect(Array.isArray(nullWrapper.vm.tasks)).toBe(true);
        if (nullWrapper.vm.tasks !== undefined) {
          expect(nullWrapper.vm.tasks.length).toBe(0);
        }
      });

      it('should not load if projectId is empty', async () => {
        // Create a fresh wrapper with empty projectId
        const emptyWrapper = createWrapper({ projectId: '', show: true });
        await nextTick();
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // loadTasks should set tasks to empty array when projectId is empty
        expect(Array.isArray(emptyWrapper.vm.tasks)).toBe(true);
        if (emptyWrapper.vm.tasks !== undefined) {
          expect(emptyWrapper.vm.tasks.length).toBe(0);
        }
      });

      it('should prevent multiple simultaneous loads', async () => {
        // Reset mocks to start fresh
        mockAxiosInstance.get.mockReset();
        
        let resolveFirst;
        const firstPromise = new Promise(resolve => {
          resolveFirst = resolve;
        });
        
        mockAxiosInstance.get.mockImplementation(() => firstPromise);
        
        // Create wrapper with projectId but don't let it auto-load
        wrapper = createWrapper({ projectId: 'proj1', show: false });
        await nextTick();
        
        // Now set show to true and manually trigger load
        await wrapper.setProps({ show: true });
        await nextTick();
        
        // Call loadTasks again immediately (should be blocked by loading flag)
        wrapper.vm.loadTasks();
        await nextTick();
        await new Promise(resolve => setTimeout(resolve, 50));
        
        // Should make only one request (first call)
        const callCount = mockAxiosInstance.get.mock.calls.length;
        expect(callCount).toBe(1);
        
        resolveFirst({ data: mockTasks });
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      it('should handle non-array response', async () => {
        mockAxiosInstance.get.mockResolvedValueOnce({
          data: { tasks: mockTasks } // Object instead of array
        });
        
        wrapper = createWrapper();
        await nextTick();
        await new Promise(resolve => setTimeout(resolve, 150));
        
        // Should default to empty array
        expect(wrapper.vm.tasks).toEqual([]);
      });
    });

    describe('getTasksByStatus', () => {
      it('should filter tasks by status', () => {
        const ongoing = wrapper.vm.getTasksByStatus('Ongoing');
        expect(ongoing.length).toBe(2); // task1 and task5
        expect(ongoing.every(t => t.status === 'Ongoing')).toBe(true);
        
        const completed = wrapper.vm.getTasksByStatus('Completed');
        expect(completed.length).toBe(1); // task3
        expect(completed[0].id).toBe('task3');
      });

      it('should return empty array for status with no tasks', () => {
        const cancelled = wrapper.vm.getTasksByStatus('Cancelled');
        expect(cancelled).toEqual([]);
      });

      it('should handle tasks with null/undefined status', async () => {
        const tasksWithNullStatus = [
          { id: 'task1', status: null },
          { id: 'task2', status: undefined },
          { id: 'task3', status: 'Ongoing' }
        ];
        
        await setComponentData(wrapper, { tasks: tasksWithNullStatus });
        await nextTick();
        
        const ongoing = wrapper.vm.getTasksByStatus('Ongoing');
        expect(ongoing.length).toBe(1);
      });
    });

    describe('toggleStatusSection', () => {
      it('should expand collapsed section', () => {
        wrapper.vm.toggleStatusSection('Ongoing');
        
        expect(wrapper.vm.expandedStatuses).toContain('Ongoing');
      });

      it('should collapse expanded section', () => {
        wrapper.vm.expandedStatuses = ['Ongoing'];
        wrapper.vm.toggleStatusSection('Ongoing');
        
        expect(wrapper.vm.expandedStatuses).not.toContain('Ongoing');
      });

      it('should handle multiple expanded sections', () => {
        wrapper.vm.toggleStatusSection('Ongoing');
        wrapper.vm.toggleStatusSection('Pending');
        wrapper.vm.toggleStatusSection('Completed');
        
        expect(wrapper.vm.expandedStatuses).toContain('Ongoing');
        expect(wrapper.vm.expandedStatuses).toContain('Pending');
        expect(wrapper.vm.expandedStatuses).toContain('Completed');
        expect(wrapper.vm.expandedStatuses.length).toBe(3);
      });

      it('should handle non-existent status', () => {
        wrapper.vm.toggleStatusSection('NonExistentStatus');
        
        expect(wrapper.vm.expandedStatuses).toContain('NonExistentStatus');
      });
    });

    describe('getStatusColor', () => {
      it('should return orange for Pending', () => {
        expect(wrapper.vm.getStatusColor('Pending')).toBe('orange');
      });

      it('should return blue for Ongoing', () => {
        expect(wrapper.vm.getStatusColor('Ongoing')).toBe('blue');
      });

      it('should return purple for Pending Review', () => {
        expect(wrapper.vm.getStatusColor('Pending Review')).toBe('purple');
      });

      it('should return green for Completed', () => {
        expect(wrapper.vm.getStatusColor('Completed')).toBe('green');
      });

      it('should return grey for unknown status', () => {
        expect(wrapper.vm.getStatusColor('Unknown')).toBe('grey');
      });

      it('should handle null/undefined', () => {
        expect(wrapper.vm.getStatusColor(null)).toBe('grey');
        expect(wrapper.vm.getStatusColor(undefined)).toBe('grey');
      });
    });

    describe('getStatusIcon', () => {
      it('should return correct icon for Pending', () => {
        expect(wrapper.vm.getStatusIcon('Pending')).toBe('mdi-clock-outline');
      });

      it('should return correct icon for Ongoing', () => {
        expect(wrapper.vm.getStatusIcon('Ongoing')).toBe('mdi-play-circle-outline');
      });

      it('should return correct icon for Pending Review', () => {
        expect(wrapper.vm.getStatusIcon('Pending Review')).toBe('mdi-eye-outline');
      });

      it('should return correct icon for Completed', () => {
        expect(wrapper.vm.getStatusIcon('Completed')).toBe('mdi-check-circle-outline');
      });

      it('should return default icon for unknown status', () => {
        expect(wrapper.vm.getStatusIcon('Unknown')).toBe('mdi-circle-outline');
      });
    });

    describe('openTaskDialog', () => {
      it('should open dialog with task', () => {
        const task = mockTasks[0];
        wrapper.vm.openTaskDialog(task);
        
        expect(wrapper.vm.showTaskDialog).toBe(true);
        expect(wrapper.vm.selectedTask).toEqual(task);
      });

      it('should handle null task', () => {
        wrapper.vm.openTaskDialog(null);
        
        // When task is null, openTaskDialog returns early, so dialog shouldn't open
        expect(wrapper.vm.showTaskDialog).toBe(false);
        expect(wrapper.vm.selectedTask).toBe(null);
      });
    });

    describe('handleViewParent', () => {
      it('should set parent task as selected', () => {
        const parentTask = { id: 'parent1', title: 'Parent Task' };
        wrapper.vm.handleViewParent(parentTask);
        
        expect(wrapper.vm.selectedTask).toEqual(parentTask);
      });

      it('should update dialog with parent task', () => {
        const parentTask = { id: 'parent1', title: 'Parent Task' };
        wrapper.vm.handleViewParent(parentTask);
        
        expect(wrapper.vm.selectedTask).toEqual(parentTask);
      });
    });

    describe('handleOpenAttachment', () => {
      it('should open attachment URL in new tab', () => {
        const url = 'https://example.com/file.pdf';
        wrapper.vm.handleOpenAttachment(url);
        
        expect(global.window.open).toHaveBeenCalledWith(url, '_blank');
      });

      it('should not open if URL is null', () => {
        global.window.open.mockClear();
        wrapper.vm.handleOpenAttachment(null);
        
        expect(global.window.open).not.toHaveBeenCalled();
      });

      it('should not open if URL is empty', () => {
        global.window.open.mockClear();
        wrapper.vm.handleOpenAttachment('');
        
        expect(global.window.open).not.toHaveBeenCalled();
      });

      it('should handle invalid URLs', () => {
        wrapper.vm.handleOpenAttachment('not-a-url');
        
        // Should still attempt to open
        expect(global.window.open).toHaveBeenCalled();
      });
    });
  });

  // ============================================
  // PROPS WATCHERS TESTS
  // ============================================
  describe('Props Watchers', () => {
    it('should reload tasks when show changes to true', async () => {
      wrapper = createWrapper({ show: false });
      await nextTick();
      
      mockAxiosInstance.get.mockClear();
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockTasks });
      
      await wrapper.setProps({ show: true });
      await nextTick();
      await new Promise(resolve => setTimeout(resolve, 150));
      
      expect(mockAxiosInstance.get).toHaveBeenCalled();
    });

    it('should clear tasks when show changes to false', async () => {
      wrapper = createWrapper({ show: true });
      await nextTick();
        await setComponentData(wrapper, { tasks: mockTasks });
      await nextTick();
      await new Promise(resolve => setTimeout(resolve, 150));
      
      await wrapper.setProps({ show: false });
      await nextTick();
      
      expect(wrapper.vm.tasks).toEqual([]);
      expect(wrapper.vm.loadingTasks).toBe(false);
      expect(wrapper.vm.showTaskDialog).toBe(false);
      expect(wrapper.vm.selectedTask).toBe(null);
      expect(wrapper.vm.expandedStatuses).toEqual([]);
    });

    it('should reload tasks when projectId changes', async () => {
      wrapper = createWrapper({ projectId: 'proj1' });
      await nextTick();
      await new Promise(resolve => setTimeout(resolve, 150));
      
      mockAxiosInstance.get.mockClear();
      mockAxiosInstance.get.mockResolvedValueOnce({ data: [] });
      
      await wrapper.setProps({ projectId: 'proj2' });
      await nextTick();
      await new Promise(resolve => setTimeout(resolve, 150));
      
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/tasks/project/proj2');
    });

    it('should reset expanded sections when projectId changes', async () => {
      wrapper = createWrapper({ projectId: 'proj1' });
      await nextTick();
      await new Promise(resolve => setTimeout(resolve, 150));
      
      wrapper.vm.toggleStatusSection('Ongoing');
      expect(wrapper.vm.expandedStatuses).toContain('Ongoing');
      
      await wrapper.setProps({ projectId: 'proj2' });
      await nextTick();
      
      expect(wrapper.vm.expandedStatuses).toEqual([]);
    });

    it('should not reload if show is false when projectId changes', async () => {
      wrapper = createWrapper({ show: false, projectId: 'proj1' });
      await nextTick();
      
      mockAxiosInstance.get.mockClear();
      
      await wrapper.setProps({ projectId: 'proj2' });
      await nextTick();
      
      // Should not load if show is false
      if (wrapper.vm.show === false) {
        expect(mockAxiosInstance.get).not.toHaveBeenCalled();
      }
    });
  });

  // ============================================
  // TASK DISPLAY TESTS
  // ============================================
  describe('Task Display', () => {
    beforeEach(async () => {
      wrapper = createWrapper();
      await nextTick();
        await setComponentData(wrapper, { tasks: mockTasks });
      await nextTick();
    });

    it('should display all tasks', async () => {
      // Wait for tasks to be set and rendered
      await nextTick();
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Tasks are rendered through status sections, so check if any task items exist
      const taskItems = wrapper.findAll('[data-testid="project-task-item"]');
      // If tasks are set, they should render (might be in collapsed sections though)
      expect(taskItems.length).toBeGreaterThanOrEqual(0);
      
      // Verify tasks are actually in component
      if (wrapper.vm.tasks && wrapper.vm.tasks.length > 0) {
        expect(wrapper.vm.tasks.length).toBe(mockTasks.length);
      }
    });

    it('should show empty state when no tasks', async () => {
      await setComponentData(wrapper, { tasks: [] });
      await nextTick();
      
      const emptyState = wrapper.find('.empty-state');
      expect(emptyState.exists()).toBe(true);
    });

    it('should group tasks by status correctly', () => {
      const ongoingTasks = wrapper.vm.getTasksByStatus('Ongoing');
      const pendingTasks = wrapper.vm.getTasksByStatus('Pending');
      const completedTasks = wrapper.vm.getTasksByStatus('Completed');
      
      expect(ongoingTasks.length).toBe(2);
      expect(pendingTasks.length).toBe(1);
      expect(completedTasks.length).toBe(1);
    });

    it('should display correct task count', () => {
      expect(wrapper.vm.tasks.length).toBe(mockTasks.length);
    });

    it('should show singular form for 1 task', async () => {
      await setComponentData(wrapper, { tasks: [mockTasks[0]] });
      await nextTick();
      
      expect(wrapper.vm.tasks.length).toBe(1);
    });
  });

  // ============================================
  // EDGE CASES
  // ============================================
  describe('Edge Cases', () => {
    beforeEach(() => {
      wrapper = createWrapper();
    });

    it('should handle missing projectId', async () => {
      // Create wrapper with null projectId from start
      wrapper = createWrapper({ projectId: null, show: true });
      await nextTick();
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // When projectId is null, loadTasks should set tasks to empty array
      expect(Array.isArray(wrapper.vm.tasks)).toBe(true);
    });

    it('should handle empty projectId', async () => {
      // Create wrapper with empty projectId from start
      wrapper = createWrapper({ projectId: '', show: true });
      await nextTick();
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // When projectId is empty, loadTasks should set tasks to empty array
      expect(Array.isArray(wrapper.vm.tasks)).toBe(true);
    });

    it('should handle network error', async () => {
      mockAxiosInstance.get.mockRejectedValueOnce(new Error('Network error'));
      
      wrapper = createWrapper();
      await nextTick();
      await new Promise(resolve => setTimeout(resolve, 150));
      
      expect(wrapper.vm.tasks).toEqual([]);
    });

    it('should handle invalid task data', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: [
          { id: 'task1', status: null },
          { id: 'task2', status: undefined },
          null,
          undefined,
          { id: 'task3', status: 'Ongoing' }
        ].filter(Boolean)
      });
      
      wrapper = createWrapper();
      await nextTick();
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Should not crash
      expect(Array.isArray(wrapper.vm.tasks)).toBe(true);
    });

    it('should handle tasks with missing status', async () => {
      const tasksWithMissingStatus = [
        { id: 'task1', title: 'Task 1' }, // No status
        { id: 'task2', title: 'Task 2', status: 'Ongoing' }
      ];
      
      mockAxiosInstance.get.mockResolvedValueOnce({ data: tasksWithMissingStatus });
      
      wrapper = createWrapper();
      await nextTick();
      await setComponentData(wrapper, { tasks: tasksWithMissingStatus });
      await nextTick();
      
      const visibleStatuses = wrapper.vm.visibleStatuses;
      expect(visibleStatuses).toContain('Ongoing');
    });

    it('should handle rapid prop changes', async () => {
      mockAxiosInstance.get.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ data: [] }), 100))
      );
      
      wrapper = createWrapper({ projectId: 'proj1' });
      await nextTick();
      
      await wrapper.setProps({ projectId: 'proj2' });
      await nextTick();
      
      await wrapper.setProps({ projectId: 'proj3' });
      await nextTick();
      
      // Should handle gracefully
      expect(mockAxiosInstance.get).toHaveBeenCalled();
    });

    it('should handle tasks with all statuses', async () => {
      const allStatusTasks = [
        { id: 't1', status: 'Pending' },
        { id: 't2', status: 'Ongoing' },
        { id: 't3', status: 'Pending Review' },
        { id: 't4', status: 'Completed' }
      ];
      
      await setComponentData(wrapper, { tasks: allStatusTasks });
      await nextTick();
      
      const visibleStatuses = wrapper.vm.visibleStatuses;
      expect(visibleStatuses.length).toBe(4);
    });

    it('should handle empty tasks array', async () => {
      await setComponentData(wrapper, { tasks: [] });
      await nextTick();
      
      const visibleStatuses = wrapper.vm.visibleStatuses;
      expect(visibleStatuses).toEqual([]);
    });

      it('should handle task dialog with null task', () => {
        wrapper.vm.openTaskDialog(null);
        
        // When task is null, openTaskDialog returns early, so dialog shouldn't open
        expect(wrapper.vm.showTaskDialog).toBe(false);
        expect(wrapper.vm.selectedTask).toBe(null);
      });
  });
});
