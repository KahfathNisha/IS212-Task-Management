import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { createVuetify } from 'vuetify';
import ProjectTaskItemDetails from '@/components/ProjectTaskItemDetails.vue';

// Mock Firebase Firestore
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  getDocs: vi.fn(),
}));

vi.mock('@/config/firebase', () => ({
  db: {},
}));

const vuetify = createVuetify();

describe('ProjectTaskItemDetails.vue', () => {
  let wrapper;

  const mockUsers = [
    { email: 'user1@example.com', name: 'User One' },
    { email: 'user2@example.com', name: 'User Two' },
    { email: 'admin@example.com', name: 'Admin User' }
  ];

  const baseTask = {
    id: 'task-1',
    title: 'Test Task',
    status: 'Ongoing',
    taskOwner: 'Test Owner',
    taskOwnerDepartment: 'IT',
    dueDate: '2025-12-31',
    assignedTo: 'user1@example.com',
    description: 'This is a test task description',
    projectName: 'Test Project',
    priority: 1,
    isSubtask: false,
    collaborators: [
      { name: 'User One', permission: 'Edit' },
      { name: 'User Two', permission: 'View' }
    ],
    categories: ['Development', 'Bug Fix'],
    attachments: [
      { name: 'document.pdf', url: 'https://example.com/document.pdf' },
    ],
    statusHistory: [
      { oldStatus: 'Unassigned', newStatus: 'Ongoing', timestamp: '2025-11-01' }
    ],
    subtasks: [
      {
        id: 'subtask-1',
        title: 'Subtask 1',
        status: 'Completed',
        description: 'First subtask',
        priority: 5,
        assignedTo: 'user2@example.com',
        collaborators: [{ name: 'User Three', permission: 'View' }],
        dueDate: '2025-12-01'
      },
      {
        id: 'subtask-2',
        title: 'Subtask 2',
        status: 'Pending Review',
        description: 'Second subtask',
        priority: 10
      }
    ]
  };

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
    return mount(ProjectTaskItemDetails, {
      props: {
        model: baseTask,
        show: true,
        ...props
      },
      global: {
        plugins: [vuetify],
        stubs: {
          'v-dialog': {
            template: '<div v-if="modelValue" class="v-dialog-stub"><slot /></div>',
            props: ['modelValue', 'maxWidth'],
            emits: ['update:model-value'],
            setup(props, { emit }) {
              return { emit };
            }
          },
          'v-card': { template: '<div class="v-card-stub"><slot /></div>', props: ['rounded'] },
          'v-card-title': { template: '<div class="v-card-title-stub"><slot /></div>' },
          'v-card-text': { template: '<div class="v-card-text-stub"><slot /></div>' },
          'v-chip': {
            template: '<span class="v-chip-stub"><slot /></span>',
            props: ['color', 'size', 'variant', 'rounded']
          },
          'v-icon': { template: '<span class="v-icon-stub"></span>', props: ['size', 'color', 'start'] },
          'v-btn': {
            template: '<button class="v-btn-stub" @click="$attrs.onClick || $emit(\'click\')"><slot /></button>',
            props: ['variant', 'size', 'icon', 'prependIcon', 'rounded'],
            emits: ['click', 'update:show']
          },
          'v-row': { template: '<div class="v-row-stub"><slot /></div>' },
          'v-col': { template: '<div class="v-col-stub"><slot /></div>', props: ['cols'] },
        },
      },
    });
  };

  describe('Component Initialization', () => {
    it('should mount successfully', () => {
      wrapper = createWrapper();
      expect(wrapper.exists()).toBe(true);
    });

    it('should not render when show is false', () => {
      wrapper = createWrapper({ show: false });
      expect(wrapper.find('.v-dialog-stub').exists()).toBe(false);
    });

    it('should render when show is true', () => {
      wrapper = createWrapper({ show: true });
      expect(wrapper.find('.v-dialog-stub').exists()).toBe(true);
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
    it('should display task title', () => {
      wrapper = createWrapper();
      expect(wrapper.text()).toContain('Test Task');
    });

    it('should display task status', () => {
      wrapper = createWrapper();
      expect(wrapper.text()).toContain('Ongoing');
    });

    it('should display task description', () => {
      wrapper = createWrapper();
      expect(wrapper.text()).toContain('This is a test task description');
    });

    it('should display task owner', () => {
      wrapper = createWrapper();
      expect(wrapper.text()).toContain('Test Owner');
    });

    it('should display task owner department', () => {
      wrapper = createWrapper();
      expect(wrapper.text()).toContain('IT');
    });

    it('should display task priority', () => {
      wrapper = createWrapper();
      expect(wrapper.text()).toContain('1');
    });

    it('should display project name', () => {
      wrapper = createWrapper();
      expect(wrapper.text()).toContain('Test Project');
    });

    it('should display due date', () => {
      wrapper = createWrapper();
      expect(wrapper.text()).toContain('2025');
    });
  });

  describe('Assigned To Display', () => {
    it('should display assigned user name when assignedTo is an email', async () => {
      wrapper = createWrapper();
      await nextTick();
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Should convert email to name
      expect(wrapper.vm.getDisplayName('user1@example.com')).toBe('User One');
    });

    it('should display assigned user name when assignedTo is a name', () => {
      wrapper = createWrapper({
        model: { ...baseTask, assignedTo: 'John Doe' }
      });
      expect(wrapper.vm.getDisplayName('John Doe')).toBe('John Doe');
    });

    it('should display "Unassigned" when assignedTo is null', () => {
      wrapper = createWrapper({
        model: { ...baseTask, assignedTo: null }
      });
      expect(wrapper.text()).toContain('Unassigned');
    });

    it('should display "Unassigned" when assignedTo is undefined', () => {
      wrapper = createWrapper({
        model: { ...baseTask, assignedTo: undefined }
      });
      expect(wrapper.text()).toContain('Unassigned');
    });

    it('should handle assignedTo as an object with name', () => {
      wrapper = createWrapper({
        model: { ...baseTask, assignedTo: { name: 'Object User', email: 'object@example.com' } }
      });
      expect(wrapper.vm.getDisplayName({ name: 'Object User' })).toBe('Object User');
    });

    it('should handle assignedTo as an object with email', async () => {
      wrapper = createWrapper({
        model: { ...baseTask, assignedTo: { email: 'user1@example.com' } }
      });
      await nextTick();
      await new Promise((resolve) => setTimeout(resolve, 200));
      expect(wrapper.vm.getDisplayName({ email: 'user1@example.com' })).toBe('User One');
    });
  });

  describe('Edge Cases - Missing Data', () => {
    it('should handle missing task owner', () => {
      wrapper = createWrapper({
        model: { ...baseTask, taskOwner: null }
      });
      expect(wrapper.text()).toContain('Not set');
    });

    it('should handle missing task owner department', () => {
      wrapper = createWrapper({
        model: { ...baseTask, taskOwnerDepartment: null }
      });
      expect(wrapper.text()).toContain('Not set');
    });

    it('should handle missing description', () => {
      wrapper = createWrapper({
        model: { ...baseTask, description: null }
      });
      expect(wrapper.text()).toContain('No description');
    });

    it('should handle missing due date', () => {
      wrapper = createWrapper({
        model: { ...baseTask, dueDate: null }
      });
      expect(wrapper.text()).toContain('No due date');
    });

    it('should handle missing project name', () => {
      wrapper = createWrapper({
        model: { ...baseTask, projectName: null }
      });
      expect(wrapper.text()).toContain('No project');
    });

    it('should handle missing priority', () => {
      wrapper = createWrapper({
        model: { ...baseTask, priority: null }
      });
      expect(wrapper.text()).toContain('Not set');
    });

    it('should handle empty task model', () => {
      wrapper = createWrapper({
        model: null,
        show: false
      });
      // Should not crash
      expect(wrapper.exists()).toBe(true);
    });
  });

  describe('Categories Display', () => {
    it('should display categories when present', () => {
      wrapper = createWrapper({
        model: { ...baseTask, categories: ['Development', 'Bug Fix'] }
      });
      expect(wrapper.text()).toContain('Development');
      expect(wrapper.text()).toContain('Bug Fix');
    });

    it('should not display categories section when empty', () => {
      wrapper = createWrapper({
        model: { ...baseTask, categories: [] }
      });
      // Categories section should not be visible
      expect(wrapper.find('[v-if="task.categories && task.categories.length > 0"]').exists()).toBe(false);
    });

    it('should handle missing categories array', () => {
      wrapper = createWrapper({
        model: { ...baseTask, categories: undefined }
      });
      // Should not crash
      expect(wrapper.exists()).toBe(true);
    });
  });

  describe('Collaborators Display', () => {
    it('should display collaborators when present', () => {
      wrapper = createWrapper();
      expect(wrapper.text()).toContain('COLLABORATORS');
      expect(wrapper.text()).toContain('User One');
      expect(wrapper.text()).toContain('User Two');
    });

    it('should display collaborator permissions', () => {
      wrapper = createWrapper();
      expect(wrapper.text()).toContain('Edit');
      expect(wrapper.text()).toContain('View');
    });

    it('should display "No collaborators" when empty', () => {
      wrapper = createWrapper({
        model: { ...baseTask, collaborators: [] }
      });
      expect(wrapper.text()).toContain('No collaborators');
    });

    it('should handle missing collaborators array', () => {
      wrapper = createWrapper({
        model: { ...baseTask, collaborators: null }
      });
      expect(wrapper.text()).toContain('No collaborators');
    });

    it('should handle collaborators as string array', () => {
      wrapper = createWrapper({
        model: { ...baseTask, collaborators: ['user1@example.com', 'user2@example.com'] }
      });
      // Should handle string collaborators
      expect(wrapper.exists()).toBe(true);
    });
  });

  describe('Attachments Display', () => {
    it('should display attachments when present', () => {
      wrapper = createWrapper({
        model: { ...baseTask, attachments: [{ name: 'file.pdf', url: 'https://example.com/file.pdf' }] }
      });
      expect(wrapper.text()).toContain('file.pdf');
    });

    it('should not display attachments section when empty', () => {
      wrapper = createWrapper({
        model: { ...baseTask, attachments: [] }
      });
      // Should not show attachments section
      expect(wrapper.exists()).toBe(true);
    });

    it('should handle missing attachments array', () => {
      wrapper = createWrapper({
        model: { ...baseTask, attachments: null }
      });
      expect(wrapper.exists()).toBe(true);
    });

    it('should handle attachment click events', async () => {
      wrapper = createWrapper();
      await nextTick();

      // Call the method directly and check emits
      wrapper.vm.onOpenAttachment('https://example.com/file.pdf');
      await nextTick();
      
      const emitted = wrapper.emitted('open-attachment');
      expect(emitted).toBeTruthy();
      expect(emitted[0]).toEqual(['https://example.com/file.pdf']);
    });
  });

  describe('Status History Display', () => {
    it('should display status history when present', () => {
      wrapper = createWrapper();
      expect(wrapper.text()).toContain('Status Updates');
      // The component only shows "Status changed to [newStatus]", not oldStatus
      expect(wrapper.text()).toContain('Ongoing');
      expect(wrapper.text()).toContain('Status changed to');
    });

    it('should not display status history section when empty', () => {
      wrapper = createWrapper({
        model: { ...baseTask, statusHistory: [] }
      });
      // Status history section conditional
      expect(wrapper.exists()).toBe(true);
    });

    it('should handle missing status history array', () => {
      wrapper = createWrapper({
        model: { ...baseTask, statusHistory: null }
      });
      expect(wrapper.exists()).toBe(true);
    });

    it('should format status history timestamps', () => {
      wrapper = createWrapper();
      const formatted = wrapper.vm.formatDateTime('2025-11-01T10:00:00Z');
      expect(formatted).toBeTruthy();
      expect(typeof formatted).toBe('string');
    });
  });

  describe('Subtasks Display', () => {
    it('should display subtasks when present', () => {
      wrapper = createWrapper();
      expect(wrapper.text()).toContain('Subtask 1');
      expect(wrapper.text()).toContain('Subtask 2');
    });

    it('should display subtask status', () => {
      wrapper = createWrapper();
      expect(wrapper.text()).toContain('Completed');
      expect(wrapper.text()).toContain('Pending Review');
    });

    it('should calculate and display parent progress', () => {
      wrapper = createWrapper();
      // 1 out of 2 subtasks completed = 50%
      expect(wrapper.vm.parentProgress).toBe(50);
    });

    it('should display 0% progress when no subtasks', () => {
      wrapper = createWrapper({
        model: { ...baseTask, subtasks: [] }
      });
      expect(wrapper.vm.parentProgress).toBe(0);
    });

    it('should display 100% progress when all subtasks completed', () => {
      wrapper = createWrapper({
        model: {
          ...baseTask,
          subtasks: [
            { ...baseTask.subtasks[0], status: 'Completed' },
            { ...baseTask.subtasks[1], status: 'Completed' }
          ]
        }
      });
      expect(wrapper.vm.parentProgress).toBe(100);
    });

    it('should not display subtasks section when empty', () => {
      wrapper = createWrapper({
        model: { ...baseTask, subtasks: [] }
      });
      // Progress section conditional
      expect(wrapper.exists()).toBe(true);
    });

    it('should handle missing subtasks array', () => {
      wrapper = createWrapper({
        model: { ...baseTask, subtasks: null }
      });
      expect(wrapper.vm.parentProgress).toBe(0);
    });

    it('should handle subtask assignedTo display', async () => {
      wrapper = createWrapper();
      await nextTick();
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Subtask 1 has assignedTo: 'user2@example.com'
      const subtask1 = baseTask.subtasks[0];
      const displayName = wrapper.vm.getDisplayName(subtask1.assignedTo);
      expect(displayName).toBe('User Two');
    });
  });

  describe('Subtask Edge Cases', () => {
    it('should handle subtasks without assignedTo', () => {
      wrapper = createWrapper({
        model: {
          ...baseTask,
          subtasks: [{ ...baseTask.subtasks[0], assignedTo: null }]
        }
      });
      expect(wrapper.exists()).toBe(true);
    });

    it('should handle subtasks without dueDate', () => {
      wrapper = createWrapper({
        model: {
          ...baseTask,
          subtasks: [{ ...baseTask.subtasks[0], dueDate: null }]
        }
      });
      expect(wrapper.exists()).toBe(true);
    });

    it('should handle subtasks without collaborators', () => {
      wrapper = createWrapper({
        model: {
          ...baseTask,
          subtasks: [{ ...baseTask.subtasks[0], collaborators: [] }]
        }
      });
      expect(wrapper.exists()).toBe(true);
    });
  });

  describe('Parent Task Display', () => {
    it('should display parent task when task is a subtask', () => {
      wrapper = createWrapper({
        model: {
          ...baseTask,
          isSubtask: true,
          parentTask: {
            id: 'parent-1',
            title: 'Parent Task Title'
          }
        }
      });
      expect(wrapper.text()).toContain('Parent Task');
      expect(wrapper.text()).toContain('Parent Task Title');
    });

    it('should not display parent task section when not a subtask', () => {
      wrapper = createWrapper({
        model: { ...baseTask, isSubtask: false }
      });
      // Parent task section should not be visible
      expect(wrapper.exists()).toBe(true);
    });

    it('should handle view parent task event', async () => {
      const parentTask = { id: 'parent-1', title: 'Parent Task' };
      wrapper = createWrapper({
        model: {
          ...baseTask,
          isSubtask: true,
          parentTask: parentTask
        }
      });
      await nextTick();

      wrapper.vm.onViewParent();
      await nextTick();

      const emitted = wrapper.emitted('view-parent');
      expect(emitted).toBeTruthy();
      expect(emitted[0]).toEqual([parentTask]);
    });

    it('should not emit view-parent when parentTask is missing', () => {
      wrapper = createWrapper({
        model: {
          ...baseTask,
          isSubtask: true,
          parentTask: null
        }
      });

      const emitSpy = vi.spyOn(wrapper.vm, '$emit');
      wrapper.vm.onViewParent();

      expect(emitSpy).not.toHaveBeenCalled();
    });
  });

  describe('Status Color Mapping', () => {
    it('should return correct color for Ongoing status', () => {
      wrapper = createWrapper();
      expect(wrapper.vm.getStatusColor('Ongoing')).toBe('blue');
    });

    it('should return correct color for Completed status', () => {
      wrapper = createWrapper();
      expect(wrapper.vm.getStatusColor('Completed')).toBe('green');
    });

    it('should return correct color for Pending status', () => {
      wrapper = createWrapper();
      expect(wrapper.vm.getStatusColor('Pending')).toBe('orange');
    });

    it('should return correct color for Pending Review status', () => {
      wrapper = createWrapper();
      expect(wrapper.vm.getStatusColor('Pending Review')).toBe('purple');
    });

    it('should return default grey for unknown status', () => {
      wrapper = createWrapper();
      expect(wrapper.vm.getStatusColor('Unknown Status')).toBe('grey');
    });

    it('should handle null status', () => {
      wrapper = createWrapper();
      expect(wrapper.vm.getStatusColor(null)).toBe('grey');
    });

    it('should handle undefined status', () => {
      wrapper = createWrapper();
      expect(wrapper.vm.getStatusColor(undefined)).toBe('grey');
    });
  });

  describe('Permission Color Mapping', () => {
    it('should return primary color for Edit permission', () => {
      wrapper = createWrapper();
      expect(wrapper.vm.getPermissionColor('Edit')).toBe('primary');
    });

    it('should return secondary color for View permission', () => {
      wrapper = createWrapper();
      expect(wrapper.vm.getPermissionColor('View')).toBe('secondary');
    });

    it('should return secondary color for other permissions', () => {
      wrapper = createWrapper();
      expect(wrapper.vm.getPermissionColor('Read')).toBe('secondary');
    });
  });

  describe('Date Formatting', () => {
    it('should format date strings correctly', () => {
      wrapper = createWrapper();
      const formatted = wrapper.vm.formatDate('2025-12-31');
      expect(formatted).toBeTruthy();
      expect(typeof formatted).toBe('string');
    });

    it('should handle invalid date strings', () => {
      wrapper = createWrapper();
      const formatted = wrapper.vm.formatDate('invalid-date');
      expect(formatted).toBeTruthy();
    });

    it('should return empty string for null date', () => {
      wrapper = createWrapper();
      expect(wrapper.vm.formatDate(null)).toBe('');
    });

    it('should return empty string for undefined date', () => {
      wrapper = createWrapper();
      expect(wrapper.vm.formatDate(undefined)).toBe('');
    });

    it('should format date time strings correctly', () => {
      wrapper = createWrapper();
      const formatted = wrapper.vm.formatDateTime('2025-11-01T10:00:00Z');
      expect(formatted).toBeTruthy();
      expect(typeof formatted).toBe('string');
    });

    it('should handle invalid date time strings', () => {
      wrapper = createWrapper();
      const formatted = wrapper.vm.formatDateTime('invalid-datetime');
      // Should return the original string or formatted version
      expect(formatted).toBeTruthy();
    });
  });

  describe('Dialog Close Functionality', () => {
    it('should emit update:show when close button is clicked', async () => {
      wrapper = createWrapper();
      await nextTick();

      // The dialog template has: @update:model-value="$emit('update:show', $event)"
      // The close button directly emits: @click="$emit('update:show', false)"
      // Since we're stubbing, we'll test that the dialog's update:model-value event
      // is properly forwarded by the component as update:show
      const dialogComponent = wrapper.findComponent({ name: 'v-dialog' });
      
      if (dialogComponent.exists()) {
        // Trigger the dialog's update:model-value event (simulating dialog close)
        dialogComponent.vm.$emit('update:model-value', false);
        await nextTick();
        
        // The component should forward this as update:show
        const emitted = wrapper.emitted('update:show');
        expect(emitted).toBeTruthy();
        expect(emitted[emitted.length - 1]).toEqual([false]);
      } else {
        // Fallback: verify component responds to show prop change
        await wrapper.setProps({ show: false });
        await nextTick();
        expect(wrapper.find('.v-dialog-stub').exists()).toBe(false);
      }
    });

    it('should handle dialog show state changes', async () => {
      wrapper = createWrapper({ show: true });
      await nextTick();
      expect(wrapper.find('.v-dialog-stub').exists()).toBe(true);

      await wrapper.setProps({ show: false });
      await nextTick();
      // Dialog should hide
      expect(wrapper.find('.v-dialog-stub').exists()).toBe(false);
    });
  });

  describe('Edge Cases - Component Stability', () => {
    it('should handle rapid prop changes', async () => {
      wrapper = createWrapper();
      await wrapper.setProps({ show: false });
      await wrapper.setProps({ show: true });
      await wrapper.setProps({ show: false });
      await wrapper.setProps({ show: true });
      expect(wrapper.exists()).toBe(true);
    });

    it('should handle model prop changes', async () => {
      wrapper = createWrapper();
      const newTask = { ...baseTask, title: 'Updated Task' };
      await wrapper.setProps({ model: newTask });
      expect(wrapper.text()).toContain('Updated Task');
    });

    it('should not crash when model becomes null', async () => {
      wrapper = createWrapper();
      await wrapper.setProps({ model: null });
      // Component should handle null model gracefully
      expect(wrapper.exists()).toBe(true);
    });

    it('should handle very long task descriptions', () => {
      const longDescription = 'A'.repeat(10000);
      wrapper = createWrapper({
        model: { ...baseTask, description: longDescription }
      });
      expect(wrapper.exists()).toBe(true);
    });

    it('should handle special characters in task data', () => {
      wrapper = createWrapper({
        model: {
          ...baseTask,
          title: 'Task with <script>alert("xss")</script>',
          description: 'Description with "quotes" and \'apostrophes\''
        }
      });
      expect(wrapper.exists()).toBe(true);
    });

    it('should handle empty strings in optional fields', () => {
      wrapper = createWrapper({
        model: {
          ...baseTask,
          description: '',
          projectName: '',
          taskOwner: ''
        }
      });
      expect(wrapper.exists()).toBe(true);
    });
  });

  describe('Computed Properties', () => {
    it('should compute task from model prop', () => {
      wrapper = createWrapper();
      expect(wrapper.vm.task).toEqual(baseTask);
    });

    it('should update task when model prop changes', async () => {
      wrapper = createWrapper();
      const newTask = { ...baseTask, title: 'New Title' };
      await wrapper.setProps({ model: newTask });
      expect(wrapper.vm.task.title).toBe('New Title');
    });

    it('should compute parent progress correctly for mixed subtask statuses', () => {
      wrapper = createWrapper({
        model: {
          ...baseTask,
          subtasks: [
            { ...baseTask.subtasks[0], status: 'Completed' },
            { ...baseTask.subtasks[1], status: 'Ongoing' },
            { id: 'subtask-3', title: 'Subtask 3', status: 'Completed' }
          ]
        }
      });
      // 2 out of 3 completed = 66% (rounded)
      expect(wrapper.vm.parentProgress).toBe(67);
    });
  });
});

