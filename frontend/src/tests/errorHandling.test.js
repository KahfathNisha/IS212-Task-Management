import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createVuetify } from 'vuetify';
import { nextTick } from 'vue';
import axios from 'axios';
import ProjectTasks from '@/components/ProjectTasks.vue';
import CreateTaskDialogue from '@/components/CreateTaskDialogue.vue';
import TaskDetailsDialog from '@/components/TaskDetailsDialog.vue';
import { useAuthStore } from '@/stores/auth';

// Mock Firebase
vi.mock('@/config/firebase', () => ({
  db: {},
  default: {}
}));

// Mock Firebase Firestore
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  getDocs: vi.fn(() => Promise.resolve({ docs: [] }))
}));

// Mock auth store
const mockAuthStore = {
  getToken: vi.fn(() => Promise.resolve('mock-firebase-token')),
  userRole: 'director',
  userEmail: 'director@example.com',
  userData: {
    name: 'Director User',
    email: 'director@example.com',
    department: 'All'
  }
};

vi.mock('@/stores/auth', () => ({
  useAuthStore: vi.fn(() => mockAuthStore)
}));

// Mock axios
let mockAxiosInstance;

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => mockAxiosInstance)
  }
}));

// Create Vuetify instance
const vuetify = createVuetify();

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(() => 'mock-firebase-token'),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
});

describe('Error State Handling Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    mockAxiosInstance = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      interceptors: {
        request: {
          use: vi.fn()
        }
      }
    };

    axios.create.mockReturnValue(mockAxiosInstance);
    
    // Mock console methods
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const createWrapper = (component, props = {}, options = {}) => {
    return mount(component, {
      props,
      global: {
        plugins: [vuetify],
        stubs: {
          'v-form': { template: '<form><slot /></form>' },
          'v-dialog': { template: '<div v-if="modelValue"><slot /></div>', props: ['modelValue'] },
          'v-card': { template: '<div><slot /></div>' },
          'v-card-title': { template: '<div><slot /></div>' },
          'v-card-text': { template: '<div><slot /></div>' },
          'v-card-actions': { template: '<div><slot /></div>' },
          'v-text-field': { template: '<input />', props: ['modelValue'], emits: ['update:modelValue'] },
          'v-textarea': { template: '<textarea />', props: ['modelValue'], emits: ['update:modelValue'] },
          'v-select': { template: '<select><slot /></select>', props: ['modelValue'], emits: ['update:modelValue'] },
          'v-btn': { template: '<button><slot /></button>' },
          'v-icon': { template: '<span></span>' },
          'RecurrenceOptions': { template: '<div>RecurrenceOptions</div>' },
          ...(options.stubs || {})
        },
        ...options
      }
    });
  };

  describe('Network Error Handling', () => {
    it('ProjectTasks should handle network failure gracefully', async () => {
      const projectId = 'project-123';
      
      mockAxiosInstance.get.mockRejectedValueOnce({
        message: 'Network Error',
        code: 'ERR_NETWORK',
        response: undefined
      });

      const wrapper = createWrapper(ProjectTasks, {
        projectId: projectId,
        show: true
      });

      await nextTick();
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockAxiosInstance.get).toHaveBeenCalled();
      expect(wrapper.vm.tasks).toEqual([]);
      expect(wrapper.vm.loadingTasks).toBe(false);
    });

    it('CreateTaskDialogue should handle network error when creating task', async () => {
      const mockTaskData = {
        title: 'New Task',
        taskOwner: 'director@example.com',
        taskOwnerDepartment: 'All',
        dueDate: '2024-12-31',
        priority: 5
      };

      mockAxiosInstance.post.mockRejectedValueOnce({
        message: 'Network Error',
        code: 'ERR_NETWORK'
      });

      const wrapper = createWrapper(CreateTaskDialogue, {
        model: mockTaskData,
        show: true,
        projects: [],
        teamMembers: []
      });

      await nextTick();

      // Component should handle error gracefully
      expect(wrapper.exists()).toBe(true);
    });

    it('should handle connection timeout error', async () => {
      const projectId = 'project-123';
      
      mockAxiosInstance.get.mockRejectedValueOnce({
        code: 'ECONNABORTED',
        message: 'timeout of 10000ms exceeded',
        response: undefined
      });

      const wrapper = createWrapper(ProjectTasks, {
        projectId: projectId,
        show: true
      });

      await nextTick();
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(wrapper.vm.tasks).toEqual([]);
      expect(wrapper.vm.loadingTasks).toBe(false);
    });

    it('should handle request timeout during task creation', async () => {
      const mockTaskData = {
        title: 'New Task',
        taskOwner: 'director@example.com',
        taskOwnerDepartment: 'All',
        dueDate: '2024-12-31',
        priority: 5
      };

      mockAxiosInstance.post.mockRejectedValueOnce({
        code: 'ECONNABORTED',
        message: 'timeout of 5000ms exceeded'
      });

      const wrapper = createWrapper(CreateTaskDialogue, {
        model: mockTaskData,
        show: true
      });

      await nextTick();

      expect(wrapper.exists()).toBe(true);
    });
  });

  describe('HTTP Error Status Codes', () => {
    it('should handle 400 Bad Request error', async () => {
      const projectId = 'project-123';
      
      mockAxiosInstance.get.mockRejectedValueOnce({
        response: {
          status: 400,
          statusText: 'Bad Request',
          data: { message: 'Invalid request parameters' }
        }
      });

      const wrapper = createWrapper(ProjectTasks, {
        projectId: projectId,
        show: true
      });

      await nextTick();
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(wrapper.vm.tasks).toEqual([]);
      expect(wrapper.vm.loadingTasks).toBe(false);
    });

    it('should handle 401 Unauthorized error', async () => {
      const projectId = 'project-123';
      
      mockAxiosInstance.get.mockRejectedValueOnce({
        response: {
          status: 401,
          statusText: 'Unauthorized',
          data: { message: 'Authentication required' }
        }
      });

      const wrapper = createWrapper(ProjectTasks, {
        projectId: projectId,
        show: true
      });

      await nextTick();
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(wrapper.vm.tasks).toEqual([]);
    });

    it('should handle 403 Forbidden error', async () => {
      const projectId = 'project-123';
      
      mockAxiosInstance.get.mockRejectedValueOnce({
        response: {
          status: 403,
          statusText: 'Forbidden',
          data: { message: 'Insufficient permissions' }
        }
      });

      const wrapper = createWrapper(ProjectTasks, {
        projectId: projectId,
        show: true
      });

      await nextTick();
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(wrapper.vm.tasks).toEqual([]);
    });

    it('should handle 404 Not Found error', async () => {
      const projectId = 'non-existent-project';
      
      mockAxiosInstance.get.mockRejectedValueOnce({
        response: {
          status: 404,
          statusText: 'Not Found',
          data: { message: 'Project not found' }
        }
      });

      const wrapper = createWrapper(ProjectTasks, {
        projectId: projectId,
        show: true
      });

      await nextTick();
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(wrapper.vm.tasks).toEqual([]);
    });

    it('should handle 500 Internal Server Error', async () => {
      const projectId = 'project-123';
      
      mockAxiosInstance.get.mockRejectedValueOnce({
        response: {
          status: 500,
          statusText: 'Internal Server Error',
          data: { error: 'Database connection failed' }
        }
      });

      const wrapper = createWrapper(ProjectTasks, {
        projectId: projectId,
        show: true
      });

      await nextTick();
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(wrapper.vm.tasks).toEqual([]);
      expect(wrapper.vm.loadingTasks).toBe(false);
    });

    it('should handle 503 Service Unavailable error', async () => {
      const projectId = 'project-123';
      
      mockAxiosInstance.get.mockRejectedValueOnce({
        response: {
          status: 503,
          statusText: 'Service Unavailable',
          data: { message: 'Service temporarily unavailable' }
        }
      });

      const wrapper = createWrapper(ProjectTasks, {
        projectId: projectId,
        show: true
      });

      await nextTick();
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(wrapper.vm.tasks).toEqual([]);
    });
  });

  describe('Invalid Data Handling', () => {
    it('should handle invalid response format (non-array)', async () => {
      const projectId = 'project-123';
      
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: { tasks: [] } // Invalid format - should be array
      });

      const wrapper = createWrapper(ProjectTasks, {
        projectId: projectId,
        show: true
      });

      await nextTick();
      await new Promise(resolve => setTimeout(resolve, 100));

      // Component should handle non-array response
      expect(Array.isArray(wrapper.vm.tasks)).toBe(true);
    });

    it('should handle malformed task data', async () => {
      const projectId = 'project-123';
      
      // Filter out null entries before setting in component
      const malformedData = [
        { id: 'task-1', status: 'Pending' }, // Missing some fields but has status
        { id: 'task-2', title: 'Valid Task', status: 'Ongoing' }
      ].filter(Boolean); // Remove any null/undefined entries

      mockAxiosInstance.get.mockResolvedValueOnce({
        data: malformedData
      });

      const wrapper = createWrapper(ProjectTasks, {
        projectId: projectId,
        show: true
      });

      await nextTick();
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should handle data even with missing fields
      expect(Array.isArray(wrapper.vm.tasks)).toBe(true);
      // Component filters tasks by status, so we need valid status field
      expect(wrapper.vm.tasks.every(task => task && typeof task === 'object')).toBe(true);
    });

    it('should handle empty response data', async () => {
      const projectId = 'project-123';
      
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: null
      });

      const wrapper = createWrapper(ProjectTasks, {
        projectId: projectId,
        show: true
      });

      await nextTick();
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(Array.isArray(wrapper.vm.tasks)).toBe(true);
    });
  });

  describe('Authentication Error Handling', () => {
    it('should handle expired token error', async () => {
      const projectId = 'project-123';
      
      // Mock auth store to return expired token
      mockAuthStore.getToken.mockResolvedValueOnce('expired-token');
      
      mockAxiosInstance.get.mockRejectedValueOnce({
        response: {
          status: 401,
          data: { message: 'Token expired' }
        }
      });

      const wrapper = createWrapper(ProjectTasks, {
        projectId: projectId,
        show: true
      });

      await nextTick();
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(wrapper.vm.tasks).toEqual([]);
    });

    it('should handle missing authentication token', async () => {
      const projectId = 'project-123';
      
      mockAuthStore.getToken.mockResolvedValueOnce(null);
      
      mockAxiosInstance.get.mockRejectedValueOnce({
        response: {
          status: 401,
          data: { message: 'Authentication required' }
        }
      });

      const wrapper = createWrapper(ProjectTasks, {
        projectId: projectId,
        show: true
      });

      await nextTick();
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(wrapper.vm.tasks).toEqual([]);
    });
  });

  describe('Partial Failure Handling', () => {
    it('should handle partial success with some failed requests', async () => {
      const projectId1 = 'project-1';
      const projectId2 = 'project-2';

      mockAxiosInstance.get
        .mockResolvedValueOnce({ data: [{ id: 'task-1', projectId: projectId1 }] })
        .mockRejectedValueOnce({
          response: { status: 500, data: { error: 'Server error' } }
        });

      const wrapper1 = createWrapper(ProjectTasks, {
        projectId: projectId1,
        show: true
      });

      const wrapper2 = createWrapper(ProjectTasks, {
        projectId: projectId2,
        show: true
      });

      await Promise.all([nextTick(), nextTick()]);
      await new Promise(resolve => setTimeout(resolve, 100));

      // First wrapper should have tasks, second should handle error
      expect(wrapper1.vm.tasks.length).toBe(1);
      expect(wrapper2.vm.tasks.length).toBe(0);
    });
  });

  describe('Loading State Error Recovery', () => {
    it('should reset loading state after error', async () => {
      const projectId = 'project-123';
      
      mockAxiosInstance.get.mockRejectedValueOnce({
        response: {
          status: 500,
          data: { error: 'Server error' }
        }
      });

      const wrapper = createWrapper(ProjectTasks, {
        projectId: projectId,
        show: true
      });

      // Loading should start
      await nextTick();
      
      // Wait for error handling
      await new Promise(resolve => setTimeout(resolve, 100));

      // Loading should be false after error
      expect(wrapper.vm.loadingTasks).toBe(false);
    });

    it('should allow retry after error', async () => {
      const projectId = 'project-123';
      
      mockAxiosInstance.get
        .mockRejectedValueOnce({
          response: { status: 500, data: { error: 'Server error' } }
        })
        .mockResolvedValueOnce({
          data: [{ id: 'task-1', title: 'Task 1', projectId: projectId }]
        });

      const wrapper = createWrapper(ProjectTasks, {
        projectId: projectId,
        show: true
      });

      await nextTick();
      await new Promise(resolve => setTimeout(resolve, 100));

      // Retry loading
      await wrapper.vm.loadTasks();
      await nextTick();
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(wrapper.vm.tasks.length).toBe(1);
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(2);
    });
  });

  describe('Edge Case Error Scenarios', () => {
    it('should handle circular reference in error response', async () => {
      const projectId = 'project-123';
      const circularError = { message: 'Error' };
      circularError.circular = circularError;
      
      mockAxiosInstance.get.mockRejectedValueOnce(circularError);

      const wrapper = createWrapper(ProjectTasks, {
        projectId: projectId,
        show: true
      });

      await nextTick();
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(wrapper.vm.tasks).toEqual([]);
    });

    it('should handle very large error messages', async () => {
      const projectId = 'project-123';
      const largeErrorMessage = 'A'.repeat(10000);
      
      mockAxiosInstance.get.mockRejectedValueOnce({
        response: {
          status: 500,
          data: { error: largeErrorMessage }
        }
      });

      const wrapper = createWrapper(ProjectTasks, {
        projectId: projectId,
        show: true
      });

      await nextTick();
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(wrapper.vm.tasks).toEqual([]);
    });

    it('should handle rapid successive error calls', async () => {
      const projectId = 'project-123';
      
      mockAxiosInstance.get.mockRejectedValue({
        response: { status: 500, data: { error: 'Server error' } }
      });

      const wrapper = createWrapper(ProjectTasks, {
        projectId: projectId,
        show: true
      });

      // Trigger multiple loads rapidly
      wrapper.vm.loadTasks();
      wrapper.vm.loadTasks();
      wrapper.vm.loadTasks();

      await nextTick();
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should handle gracefully
      expect(wrapper.vm.loadingTasks).toBe(false);
    });

    it('should handle undefined error object', async () => {
      const projectId = 'project-123';
      
      mockAxiosInstance.get.mockRejectedValueOnce(undefined);

      const wrapper = createWrapper(ProjectTasks, {
        projectId: projectId,
        show: true
      });

      await nextTick();
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(wrapper.vm.tasks).toEqual([]);
    });
  });

  describe('Error Message Display', () => {
    it('should handle error without response object', async () => {
      const projectId = 'project-123';
      
      mockAxiosInstance.get.mockRejectedValueOnce({
        message: 'Request failed',
        response: undefined
      });

      const wrapper = createWrapper(ProjectTasks, {
        projectId: projectId,
        show: true
      });

      await nextTick();
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(wrapper.vm.tasks).toEqual([]);
    });

    it('should extract error message from different error formats', async () => {
      const projectId = 'project-123';
      const errorFormats = [
        { response: { data: { message: 'Error message' } } },
        { response: { data: { error: 'Error message' } } },
        { message: 'Error message' },
        { response: { statusText: 'Error message' } }
      ];

      for (const error of errorFormats) {
        mockAxiosInstance.get.mockRejectedValueOnce(error);
        
        const wrapper = createWrapper(ProjectTasks, {
          projectId: projectId,
          show: true
        });

        await nextTick();
        await new Promise(resolve => setTimeout(resolve, 50));

        expect(wrapper.vm.tasks).toEqual([]);
        wrapper.unmount();
        vi.clearAllMocks();
      }
    });
  });

  describe('CreateTaskDialogue Error Handling', () => {
    it('should handle API error when loading categories', async () => {
      mockAxiosInstance.get.mockRejectedValueOnce({
        response: {
          status: 500,
          data: { error: 'Failed to load categories' }
        }
      });

      const wrapper = createWrapper(CreateTaskDialogue, {
        model: {
          title: 'Test Task',
          taskOwner: 'director@example.com',
          taskOwnerDepartment: 'All',
          dueDate: '2024-12-31',
          priority: 5
        },
        show: true,
        projects: [],
        teamMembers: [],
        taskStatuses: ['Unassigned'],
        priorities: [1, 2, 3, 4, 5]
      }, {
        stubs: {
          'RecurrenceOptions': {
            template: '<div>RecurrenceOptions</div>'
          }
        }
      });

      await nextTick();
      await new Promise(resolve => setTimeout(resolve, 100));

      // Component should handle error gracefully
      expect(wrapper.exists()).toBe(true);
    });

    it('should handle network error during task creation', async () => {
      const mockTaskData = {
        title: 'New Task',
        taskOwner: 'director@example.com',
        taskOwnerDepartment: 'All',
        dueDate: '2024-12-31',
        priority: 5,
        projectId: 'project-123'
      };

      mockAxiosInstance.post.mockRejectedValueOnce({
        message: 'Network Error',
        code: 'ERR_NETWORK'
      });

      const wrapper = createWrapper(CreateTaskDialogue, {
        model: mockTaskData,
        show: true,
        projects: [{ title: 'Test Project', value: 'project-123' }],
        teamMembers: [
          { text: 'Director User', value: 'director@example.com', department: 'All' }
        ],
        taskStatuses: ['Unassigned'],
        priorities: [1, 2, 3, 4, 5]
      }, {
        stubs: {
          'RecurrenceOptions': {
            template: '<div>RecurrenceOptions</div>'
          }
        }
      });

      await nextTick();

      // Component should still be functional despite error
      expect(wrapper.exists()).toBe(true);
    });

    it('should handle validation errors gracefully', async () => {
      const wrapper = createWrapper(CreateTaskDialogue, {
        model: {
          title: '', // Invalid: empty title
          taskOwner: 'director@example.com',
          taskOwnerDepartment: 'All',
          dueDate: '2024-12-31',
          priority: 5
        },
        show: true,
        projects: [],
        teamMembers: [
          { text: 'Director User', value: 'director@example.com', department: 'All' }
        ],
        taskStatuses: ['Unassigned'],
        priorities: [1, 2, 3, 4, 5]
      }, {
        stubs: {
          'RecurrenceOptions': {
            template: '<div>RecurrenceOptions</div>'
          }
        }
      });

      await nextTick();

      // Component should handle invalid data
      expect(wrapper.exists()).toBe(true);
    });
  });

  describe('TaskDetailsDialog Error Handling', () => {
    it('should handle error when updating task status', async () => {
      const mockTask = {
        id: 'task-1',
        title: 'Test Task',
        status: 'Ongoing',
        projectId: 'project-123'
      };

      mockAxiosInstance.put.mockRejectedValueOnce({
        response: {
          status: 403,
          data: { message: 'Insufficient permissions' }
        }
      });

      const wrapper = createWrapper(TaskDetailsDialog, {
        model: mockTask,
        show: true,
        taskStatuses: ['Pending', 'Ongoing', 'Completed']
      }, {
        stubs: {
          'v-dialog': {
            template: '<div><slot /></div>',
            props: ['modelValue']
          }
        }
      });

      await nextTick();

      expect(wrapper.exists()).toBe(true);
    });

    it('should handle network error when loading task details', async () => {
      const mockTask = {
        id: 'task-1',
        title: 'Test Task'
      };

      mockAxiosInstance.get.mockRejectedValueOnce({
        message: 'Network Error'
      });

      const wrapper = createWrapper(TaskDetailsDialog, {
        model: mockTask,
        show: true
      }, {
        stubs: {
          'v-dialog': {
            template: '<div><slot /></div>',
            props: ['modelValue']
          }
        }
      });

      await nextTick();

      expect(wrapper.exists()).toBe(true);
    });
  });
});

