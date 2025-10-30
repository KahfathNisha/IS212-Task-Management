import { describe, it, expect, vi, beforeEach, afterEach, nextTick } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';
import TasksView from '../Tasks.vue'; 
import { useAuthStore } from '@/stores/auth'; // Import actual store for spy configuration

// --- 1. CRITICAL MOCKING ---

// Mock axios client to control API responses
const mockGet = vi.fn();
const mockPut = vi.fn();

// Mock the axios instance created by the component
vi.mock('axios', async () => {
  const actual = await vi.importActual('axios');
  return {
    ...actual,
    default: {
      ...actual.default,
      create: vi.fn(() => ({
        get: mockGet,
        put: mockPut,
        // Mock the interceptor setup, ensuring token fetching is mocked/spied on
        interceptors: {
            request: { use: vi.fn((handler) => {
                // We'll mock the handler to ensure it doesn't crash
                handler({ headers: {} }); 
            }) } 
        }
      })),
    },
  };
});

// Mock Firebase storage (for file upload logic in the component)
vi.mock('firebase/storage', () => ({
    uploadBytes: vi.fn(),
    getDownloadURL: vi.fn(() => Promise.resolve('mock-download-url')),
    ref: vi.fn(),
}));

// Mock the child views to focus the test on Tasks.vue (shallow rendering)
vi.mock('../Timeline.vue', () => ({ default: { template: '<div>MockTimelineView</div>' } }));
vi.mock('../ListView.vue', () => ({ default: { template: '<div>MockListView</div>' } }));
vi.mock('../components/CreateTaskDialogue.vue', () => ({ default: { template: '<div>MockCreateTaskDialogue</div>' } }));
vi.mock('../components/TaskDetailsDialog.vue', () => ({ default: { template: '<div>MockTaskDetailsDialog</div>' } }));
vi.mock('../components/ArchivedTasks.vue', () => ({ default: { template: '<div>MockArchivedTasks</div>' } }));

// Setup Vuetify (Fix for component resolution warnings)
const vuetify = createVuetify({
    components,
    directives,
});

// Mock Data
const MOCK_PROJECTS = [{ id: 'p1', name: 'Project Alpha' }];
const MOCK_TASKS = [
    // Task 1: Visible (Assigned to John Doe, Engineering Dept)
    { id: 't1', title: 'Task for John', dueDate: '2025-10-30', status: 'Ongoing', priority: 1, assignedTo: 'John Doe', taskOwner: 'John Doe', taskOwnerDepartment: 'Engineering' },
    // Task 2: Hidden (Marketing Dept, not owned or assigned to John Doe)
    { id: 't2', title: 'Hidden Task', dueDate: '2025-11-05', status: 'Completed', priority: 5, assignedTo: 'Jane Smith', taskOwner: 'Jane Smith', taskOwnerDepartment: 'Marketing' },
    // Task 3: Visible (Owned by John Doe, Engineering Dept)
    { id: 't3', title: 'My Dept Task', dueDate: '2025-11-10', status: 'Ongoing', priority: 2, assignedTo: 'Someone Else', taskOwner: 'John Doe', taskOwnerDepartment: 'Engineering' },
];

const MOCK_USER_DATA = { name: 'John Doe', email: 'john.doe@company.com', department: 'Engineering' };


// --- 2. TEST SUITE ---

describe('Tasks.vue Component Integration', () => {
    let wrapper;
    let authStore;
    
    beforeEach(() => {
        // 1. Setup Mock API responses for onMounted
        mockGet.mockClear();
        mockPut.mockClear();
        
        mockGet.mockResolvedValueOnce({ data: MOCK_PROJECTS }) // 1. /projects
               .mockResolvedValueOnce({ data: MOCK_TASKS });    // 2. /tasks

        // 2. Mount the Component with Pinia & Vuetify
        wrapper = mount(TasksView, {
            global: {
                plugins: [
                    createTestingPinia({
                        createSpy: vi.fn, 
                        stubActions: false, 
                    }),
                    vuetify // Crucial fix for Vuetify warnings
                ],
            },
        });

        // 3. Configure the Auth Store Mock
        authStore = useAuthStore();
        authStore.userData = MOCK_USER_DATA;
        authStore.userRole = 'staff';
        authStore.getToken.mockResolvedValue('fake-token');
    });
    
    afterEach(() => {
        wrapper.unmount();
    });

    // --- A. Component Initialization and Data Loading ---
    describe('A. Initialization and Data Loading', () => {
        it('should fetch data and render the correct user header on mount', async () => {
            // Wait for both API calls in onMounted to resolve
            await flushPromises();

            // 1. Assert API Calls
            expect(mockGet).toHaveBeenCalledTimes(2);
            expect(mockGet).toHaveBeenCalledWith('/projects');
            expect(mockGet).toHaveBeenCalledWith('/tasks');

            // 2. Assert User Scoping (Testing the userVisibleTasks computed)
            const visibleTasks = wrapper.vm.userVisibleTasks;
            
            // Expected: Task t1 (assigned to John) and t3 (owned by John) -> 2 tasks
            expect(visibleTasks).toHaveLength(2); 
            expect(visibleTasks.some(t => t.id === 't2')).toBe(false); // t2 should be hidden

            // 3. Assert UI header (basic DOM check)
            expect(wrapper.find('h1').text()).toContain('Good Morning, John Doe!');
        });
    });

    // --- B. View and Filter Controls ---
    describe('B. View and Filter Controls', () => {
        
        it('should switch to TimelineView and render the Mock Timeline component', async () => {
            await flushPromises();
            
            // 1. Assert initial state
            expect(wrapper.vm.viewType).toBe('calendar');
            expect(wrapper.findComponent({ name: 'TimelineView' }).exists()).toBe(false);

            // 2. Find and click the 'Timeline' tab button
            const timelineTab = wrapper.findAll('.view-tab').find(w => w.text() === 'Timeline');
            await timelineTab.trigger('click');
            await nextTick();
            
            // 3. Assert state and rendering
            expect(wrapper.vm.viewType).toBe('timeline');
            expect(wrapper.findComponent({ name: 'TimelineView' }).exists()).toBe(true);
            expect(wrapper.findComponent({ name: 'ListView' }).exists()).toBe(false);
        });
        
        it('should open and close the Priority filter dropdown', async () => {
            await flushPromises();
            
            // 1. Click the Priority filter button (second .filter-btn)
            const priorityButton = wrapper.find('.filter-btn:nth-child(2)'); 
            await priorityButton.trigger('click');

            await nextTick();
            
            // 2. Assert state (menu open)
            expect(wrapper.vm.priorityMenuOpen).toBe(true);
            
            // 3. Click the 'Close' button in the dropdown footer
            const closeButton = wrapper.find('.dropdown-footer .v-btn[variant="outlined"]');
            await closeButton.trigger('click');
            
            // 4. Assert state (menu closed)
            await nextTick();
            expect(wrapper.vm.priorityMenuOpen).toBe(false);
        });
    });
    
    // --- C. Task Status Update (Interaction with Mock API) ---
    describe('C. Task Status Update', () => {
        it('should call the API and update local state when changing task status', async () => {
            await flushPromises();
            
            const taskId = 't1';
            const initialTask = wrapper.vm.tasks.find(t => t.id === taskId);
            
            // 1. Mock the PUT call to succeed
            mockPut.mockResolvedValue({ data: { success: true } });

            // 2. Act: Call the function that updates status
            await wrapper.vm.changeTaskStatus({ taskId: taskId, status: 'Completed' });

            // 3. Assert API Call
            expect(mockPut).toHaveBeenCalledWith(`/tasks/${taskId}/status`, { status: 'Completed' });
            
            // 4. Assert Local State Update (The list should contain the updated task)
            const updatedTask = wrapper.vm.tasks.find(t => t.id === taskId);
            expect(updatedTask.status).toBe('Completed');
            expect(updatedTask.statusHistory.length).toBe(initialTask.statusHistory.length + 1);

            // 5. Assert Snackbar success message
            expect(wrapper.vm.snackbarMessage).toBe('Task status updated!');
            expect(wrapper.vm.snackbarColor).toBe('success');
        });
    });
});