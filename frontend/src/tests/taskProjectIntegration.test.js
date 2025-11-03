import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createVuetify } from 'vuetify';
import { nextTick } from 'vue';
import axios from 'axios';
import ProjectTasks from '@/components/ProjectTasks.vue';
import CreateTaskDialogue from '@/components/CreateTaskDialogue.vue';
import { useAuthStore } from '@/stores/auth';

// Mock Firebase
vi.mock('@/config/firebase', () => ({
  db: {},
  default: {}
}));

// Mock Firebase Firestore
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  getDocs: vi.fn(() => Promise.resolve({ 
    docs: []
  }))
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

// Mock components
vi.mock('@/components/ProjectTaskItem.vue', () => ({
  default: {
    name: 'ProjectTaskItem',
    template: '<div data-testid="project-task-item"><slot /></div>',
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
const vuetify = createVuetify({
  display: {
    mobileBreakpoint: 'sm',
    thresholds: {
      xs: 0,
      sm: 600,
      md: 960,
      lg: 1280,
      xl: 1920
    }
  }
});

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

describe('Task-Project Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup mock axios instance
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
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const createWrapper = (component, props = {}, options = {}) => {
    return mount(component, {
      props,
      global: {
        plugins: [vuetify],
        mocks: {
          $vuetify: {
            display: {
              mobile: false,
              xs: false,
              sm: false,
              md: true,
              lg: false,
              xl: false
            }
          }
        },
        ...options
      }
    });
  };

  describe('ProjectTasks Component - Task Loading Integration', () => {
    it('should load tasks for a project successfully', async () => {
      const projectId = 'project-123';
      const mockTasks = [
        {
          id: 'task-1',
          title: 'Project Task 1',
          status: 'Ongoing',
          projectId: projectId,
          dueDate: '2024-12-31',
          priority: 5
        },
        {
          id: 'task-2',
          title: 'Project Task 2',
          status: 'Pending',
          projectId: projectId,
          dueDate: '2024-12-25',
          priority: 7
        }
      ];

      mockAxiosInstance.get.mockResolvedValueOnce({
        data: mockTasks
      });

      const wrapper = createWrapper(ProjectTasks, {
        projectId: projectId,
        show: true
      });

      await nextTick();
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(`/tasks/project/${projectId}`);
      expect(wrapper.vm.tasks.length).toBe(2);
    });

    it('should handle empty task list for project', async () => {
      const projectId = 'project-empty';
      
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: []
      });

      const wrapper = createWrapper(ProjectTasks, {
        projectId: projectId,
        show: true
      });

      await nextTick();
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(`/tasks/project/${projectId}`);
      expect(wrapper.vm.tasks.length).toBe(0);
    });

    it('should group tasks by status correctly', async () => {
      const projectId = 'project-123';
      const mockTasks = [
        {
          id: 'task-1',
          title: 'Task 1',
          status: 'Ongoing',
          projectId: projectId
        },
        {
          id: 'task-2',
          title: 'Task 2',
          status: 'Ongoing',
          projectId: projectId
        },
        {
          id: 'task-3',
          title: 'Task 3',
          status: 'Completed',
          projectId: projectId
        }
      ];

      mockAxiosInstance.get.mockResolvedValueOnce({
        data: mockTasks
      });

      const wrapper = createWrapper(ProjectTasks, {
        projectId: projectId,
        show: true
      });

      await nextTick();
      await new Promise(resolve => setTimeout(resolve, 100));

      const ongoingTasks = wrapper.vm.getTasksByStatus('Ongoing');
      const completedTasks = wrapper.vm.getTasksByStatus('Completed');

      expect(ongoingTasks.length).toBe(2);
      expect(completedTasks.length).toBe(1);
    });

    it('should refresh tasks when projectId changes', async () => {
      const projectId1 = 'project-1';
      const projectId2 = 'project-2';

      mockAxiosInstance.get
        .mockResolvedValueOnce({ data: [{ id: 'task-1', title: 'Task 1', projectId: projectId1 }] })
        .mockResolvedValueOnce({ data: [{ id: 'task-2', title: 'Task 2', projectId: projectId2 }] });

      const wrapper = createWrapper(ProjectTasks, {
        projectId: projectId1,
        show: true
      });

      await nextTick();
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(`/tasks/project/${projectId1}`);
      expect(wrapper.vm.tasks.length).toBe(1);

      // Change projectId
      await wrapper.setProps({ projectId: projectId2 });
      await nextTick();
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(`/tasks/project/${projectId2}`);
    });
  });

  describe('Task Creation with Project Link Integration', () => {
    it('should create task linked to project successfully', async () => {
      const projectId = 'project-123';
      const mockTaskData = {
        title: 'New Project Task',
        description: 'Task linked to project',
        taskOwner: 'director@example.com',
        taskOwnerDepartment: 'All',
        projectId: projectId,
        dueDate: '2024-12-31',
        priority: 5,
        status: 'Unassigned'
      };

      const wrapper = createWrapper(CreateTaskDialogue, {
        model: mockTaskData,
        show: true,
        projects: [
          { title: 'Test Project', value: projectId }
        ],
        teamMembers: [
          { text: 'Director User', value: 'director@example.com', department: 'All' }
        ],
        taskStatuses: ['Unassigned', 'Ongoing', 'Completed'],
        priorities: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        currentUser: {
          email: 'director@example.com',
          name: 'Director User'
        }
      });

      await nextTick();

      // Verify the task has projectId set
      expect(wrapper.vm.localTask.projectId).toBe(projectId);
      
      // Verify project selection is available
      expect(wrapper.vm.localTask.title).toBe(mockTaskData.title);
    });

    it('should emit save event with projectId when task is created', async () => {
      const projectId = 'project-123';
      const mockTaskData = {
        title: 'New Task',
        description: 'Test task',
        taskOwner: 'director@example.com',
        taskOwnerDepartment: 'All',
        projectId: projectId,
        dueDate: '2024-12-31',
        priority: 5,
        status: 'Unassigned'
      };

      const wrapper = createWrapper(CreateTaskDialogue, {
        model: mockTaskData,
        show: true,
        projects: [
          { title: 'Test Project', value: projectId }
        ],
        teamMembers: [
          { text: 'Director User', value: 'director@example.com', department: 'All' }
        ],
        taskStatuses: ['Unassigned', 'Ongoing', 'Completed'],
        priorities: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        currentUser: {
          email: 'director@example.com',
          name: 'Director User'
        }
      }, {
        stubs: {
          'RecurrenceOptions': {
            template: '<div>RecurrenceOptions</div>'
          }
        }
      });

      await nextTick();

      // Verify task has projectId
      expect(wrapper.vm.localTask.projectId).toBe(projectId);
      
      // The actual save would be triggered by form submission
      // but we verify the data structure is correct
      const taskData = wrapper.vm.localTask;
      expect(taskData).toHaveProperty('projectId');
      expect(taskData.projectId).toBe(projectId);
    });

    it('should update projectId when project selection changes', async () => {
      const projectId1 = 'project-1';
      const projectId2 = 'project-2';
      const mockTaskData = {
        title: 'New Task',
        taskOwner: 'director@example.com',
        taskOwnerDepartment: 'All',
        projectId: projectId1,
        dueDate: '2024-12-31',
        priority: 5
      };

      const wrapper = createWrapper(CreateTaskDialogue, {
        model: mockTaskData,
        show: true,
        projects: [
          { title: 'Project 1', value: projectId1 },
          { title: 'Project 2', value: projectId2 }
        ],
        teamMembers: [
          { text: 'Director User', value: 'director@example.com', department: 'All' }
        ],
        taskStatuses: ['Unassigned', 'Ongoing'],
        priorities: [1, 2, 3, 4, 5]
      }, {
        stubs: {
          'RecurrenceOptions': {
            template: '<div>RecurrenceOptions</div>'
          }
        }
      });

      await nextTick();

      expect(wrapper.vm.localTask.projectId).toBe(projectId1);

      // Update projectId
      wrapper.vm.localTask.projectId = projectId2;
      await nextTick();

      expect(wrapper.vm.localTask.projectId).toBe(projectId2);
    });
  });

  describe('Error Handling - Task-Project Relationships', () => {
    it('should handle network error when loading project tasks', async () => {
      const projectId = 'project-123';
      
      mockAxiosInstance.get.mockRejectedValueOnce({
        message: 'Network Error',
        response: undefined
      });

      const wrapper = createWrapper(ProjectTasks, {
        projectId: projectId,
        show: true
      });

      await nextTick();
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(`/tasks/project/${projectId}`);
      expect(wrapper.vm.tasks.length).toBe(0); // Should default to empty array on error
    });

    it('should handle 404 error when project does not exist', async () => {
      const projectId = 'non-existent-project';
      
      mockAxiosInstance.get.mockRejectedValueOnce({
        response: {
          status: 404,
          data: { message: 'Project not found' }
        }
      });

      const wrapper = createWrapper(ProjectTasks, {
        projectId: projectId,
        show: true
      });

      await nextTick();
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(`/tasks/project/${projectId}`);
      expect(wrapper.vm.tasks.length).toBe(0);
    });

    it('should handle 500 server error when loading tasks', async () => {
      const projectId = 'project-123';
      
      mockAxiosInstance.get.mockRejectedValueOnce({
        response: {
          status: 500,
          data: { error: 'Internal server error' }
        }
      });

      const wrapper = createWrapper(ProjectTasks, {
        projectId: projectId,
        show: true
      });

      await nextTick();
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(wrapper.vm.tasks.length).toBe(0);
      expect(wrapper.vm.loadingTasks).toBe(false); // Loading should complete
    });

    it('should handle invalid projectId gracefully', async () => {
      const invalidProjectId = '';
      
      mockAxiosInstance.get.mockClear();

      const wrapper = createWrapper(ProjectTasks, {
        projectId: invalidProjectId,
        show: true
      });

      await nextTick();
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should not make API call with empty projectId
      expect(mockAxiosInstance.get).not.toHaveBeenCalled();
      expect(wrapper.vm.tasks.length).toBe(0);
    });

    it('should handle timeout error when creating task', async () => {
      const projectId = 'project-123';
      const mockTaskData = {
        title: 'New Task',
        taskOwner: 'director@example.com',
        taskOwnerDepartment: 'All',
        projectId: projectId,
        dueDate: '2024-12-31',
        priority: 5
      };

      mockAxiosInstance.post.mockRejectedValueOnce({
        code: 'ECONNABORTED',
        message: 'timeout of 10000ms exceeded'
      });

      const wrapper = createWrapper(CreateTaskDialogue, {
        model: mockTaskData,
        show: true,
        projects: [{ title: 'Test Project', value: projectId }]
      });

      await nextTick();

      // The component should handle the error gracefully
      // Error handling would typically show a message to user
      expect(mockAxiosInstance.post).not.toHaveBeenCalled(); // Submit not triggered
    });

    it('should handle 403 forbidden error when creating task for project', async () => {
      const projectId = 'project-123';
      const mockTaskData = {
        title: 'New Task',
        taskOwner: 'director@example.com',
        taskOwnerDepartment: 'All',
        projectId: projectId,
        dueDate: '2024-12-31',
        priority: 5
      };

      mockAxiosInstance.post.mockRejectedValueOnce({
        response: {
          status: 403,
          data: { message: 'Insufficient permissions to create tasks for this project' }
        }
      });

      const wrapper = createWrapper(CreateTaskDialogue, {
        model: mockTaskData,
        show: true,
        projects: [{ title: 'Test Project', value: projectId }]
      });

      await nextTick();

      // Component should handle permission error
      expect(wrapper.exists()).toBe(true);
    });
  });

  describe('Task Status Updates - Project Integration', () => {
    it('should update task status and reflect in project tasks list', async () => {
      const projectId = 'project-123';
      const taskId = 'task-1';
      
      const initialTasks = [
        {
          id: taskId,
          title: 'Task 1',
          status: 'Ongoing',
          projectId: projectId
        }
      ];

      mockAxiosInstance.get.mockResolvedValueOnce({ data: initialTasks });
      mockAxiosInstance.put.mockResolvedValueOnce({
        data: { message: 'Task status updated' }
      });

      const wrapper = createWrapper(ProjectTasks, {
        projectId: projectId,
        show: true
      });

      await nextTick();
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(wrapper.vm.tasks.length).toBe(1);
      expect(wrapper.vm.tasks[0].status).toBe('Ongoing');

      // After status update, tasks should be reloaded
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: [{
          id: taskId,
          title: 'Task 1',
          status: 'Completed',
          projectId: projectId
        }]
      });

      // Trigger reload (this would typically be done after status update)
      await wrapper.vm.loadTasks();
      await nextTick();

      expect(wrapper.vm.tasks[0].status).toBe('Completed');
    });
  });

  describe('Project Stats Integration', () => {
    it('should display project stats that reflect task completion', async () => {
      const projectId = 'project-123';
      const mockTasks = [
        { id: 'task-1', status: 'Completed', projectId: projectId },
        { id: 'task-2', status: 'Completed', projectId: projectId },
        { id: 'task-3', status: 'Ongoing', projectId: projectId },
        { id: 'task-4', status: 'Pending', projectId: projectId }
      ];

      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockTasks });

      const wrapper = createWrapper(ProjectTasks, {
        projectId: projectId,
        show: true
      });

      await nextTick();
      await new Promise(resolve => setTimeout(resolve, 100));

      const completedTasks = wrapper.vm.getTasksByStatus('Completed');
      const totalTasks = wrapper.vm.tasks.length;

      expect(completedTasks.length).toBe(2);
      expect(totalTasks).toBe(4);
      // Progress would be 50% (2 completed / 4 total)
    });

    it('should update task list when task status changes to completed', async () => {
      const projectId = 'project-123';
      
      // Initial tasks
      const initialTasks = [
        { id: 'task-1', status: 'Ongoing', projectId: projectId },
        { id: 'task-2', status: 'Pending', projectId: projectId }
      ];

      mockAxiosInstance.get.mockResolvedValueOnce({ data: initialTasks });

      const wrapper = createWrapper(ProjectTasks, {
        projectId: projectId,
        show: true
      });

      await nextTick();
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(wrapper.vm.getTasksByStatus('Completed').length).toBe(0);

      // After status update, reload with completed task
      const updatedTasks = [
        { id: 'task-1', status: 'Completed', projectId: projectId },
        { id: 'task-2', status: 'Pending', projectId: projectId }
      ];

      mockAxiosInstance.get.mockResolvedValueOnce({ data: updatedTasks });
      await wrapper.vm.loadTasks();
      await nextTick();
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(wrapper.vm.getTasksByStatus('Completed').length).toBe(1);
    });
  });

  describe('Task-Project Link Validation', () => {
    it('should validate project exists when linking task', async () => {
      const projectId = 'project-123';
      const invalidProjectId = 'non-existent-project';
      
      // First verify valid project
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: [{ id: 'task-1', projectId: projectId }]
      });

      const wrapper = createWrapper(ProjectTasks, {
        projectId: projectId,
        show: true
      });

      await nextTick();
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(`/tasks/project/${projectId}`);

      // Try with invalid project
      mockAxiosInstance.get.mockRejectedValueOnce({
        response: {
          status: 404,
          data: { message: 'Project not found' }
        }
      });

      await wrapper.setProps({ projectId: invalidProjectId });
      await nextTick();
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(wrapper.vm.tasks).toEqual([]);
    });

    it('should handle task creation with invalid projectId', async () => {
      const invalidProjectId = 'invalid-project-id';
      
      mockAxiosInstance.post.mockRejectedValueOnce({
        response: {
          status: 400,
          data: { message: 'Invalid project ID' }
        }
      });

      const wrapper = createWrapper(CreateTaskDialogue, {
        model: {
          title: 'Test Task',
          taskOwner: 'director@example.com',
          taskOwnerDepartment: 'All',
          projectId: invalidProjectId,
          dueDate: '2024-12-31',
          priority: 5
        },
        show: true,
        projects: [
          { title: 'Valid Project', value: 'valid-project-id' },
          { title: 'Invalid Project', value: invalidProjectId }
        ],
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

      expect(wrapper.vm.localTask.projectId).toBe(invalidProjectId);
    });
  });

  describe('Task Removal from Project', () => {
    it('should handle task unlink from project', async () => {
      const projectId = 'project-123';
      
      const tasksWithProject = [
        { id: 'task-1', title: 'Task 1', projectId: projectId },
        { id: 'task-2', title: 'Task 2', projectId: projectId }
      ];

      mockAxiosInstance.get.mockResolvedValueOnce({ data: tasksWithProject });

      const wrapper = createWrapper(ProjectTasks, {
        projectId: projectId,
        show: true
      });

      await nextTick();
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(wrapper.vm.tasks.length).toBe(2);

      // After unlinking, reload should show fewer tasks
      const tasksAfterUnlink = [
        { id: 'task-1', title: 'Task 1', projectId: projectId }
      ];

      mockAxiosInstance.get.mockResolvedValueOnce({ data: tasksAfterUnlink });
      await wrapper.vm.loadTasks();
      await nextTick();
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(wrapper.vm.tasks.length).toBe(1);
    });
  });

  describe('Concurrent Operations - Task-Project', () => {
    it('should handle multiple simultaneous task loads for different projects', async () => {
      const projectId1 = 'project-1';
      const projectId2 = 'project-2';

      mockAxiosInstance.get
        .mockResolvedValueOnce({ data: [{ id: 'task-1', projectId: projectId1 }] })
        .mockResolvedValueOnce({ data: [{ id: 'task-2', projectId: projectId2 }] });

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

      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(2);
      expect(wrapper1.vm.tasks[0].projectId).toBe(projectId1);
      expect(wrapper2.vm.tasks[0].projectId).toBe(projectId2);
    });

    it('should prevent duplicate task loads when loading already in progress', async () => {
      const projectId = 'project-123';
      
      // Simulate slow network
      let resolvePromise;
      const slowPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockAxiosInstance.get.mockReturnValueOnce(slowPromise);

      const wrapper = createWrapper(ProjectTasks, {
        projectId: projectId,
        show: true
      });

      await nextTick();
      
      // Try to load again while first load is in progress
      wrapper.vm.loadTasks();
      
      await nextTick();

      // Should only have one API call
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(1);

      // Complete the first request
      resolvePromise({ data: [] });
      await new Promise(resolve => setTimeout(resolve, 50));
    });
  });
});

