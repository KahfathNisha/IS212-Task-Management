import { mount } from '@vue/test-utils';
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import Timeline from "../views/Timeline.vue";

// ----------------------------------------------------
// 1. MOCK THE FRAPPE GANTT LIBRARY (Crucial for testing)
// ----------------------------------------------------
// This prevents Vitest from trying to load and initialize the Gantt library.
vi.mock('frappe-gantt', () => {
  return {
    default: vi.fn(() => ({
      change_view_mode: vi.fn(),
      // Mock any methods called by the component
    })),
  };
});

// ----------------------------------------------------
// 2. MOCK THE DATE (Crucial for Overdue tests)
// ----------------------------------------------------
const FIXED_TODAY_DATE = '2025-10-30T10:00:00.000Z'; 
const mockDate = new Date(FIXED_TODAY_DATE);

beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(mockDate); // Set 'Today' to 2025-10-30
});

afterAll(() => {
  vi.useRealTimers();
});

// ----------------------------------------------------
// 3. MOCK DATA
// ----------------------------------------------------
const mockTasks = [
    // 1. Valid Ongoing Task (Due in the future)
    { id: 'T-1', title: 'Feature Launch', status: 'Ongoing', createdAt: '2025-10-25', dueDate: '2025-11-10', dependsOn: null },
    // 2. Completed Task (Due in the past)
    { id: 'T-2', title: 'Documentation', status: 'Completed', createdAt: '2025-10-01', dueDate: '2025-10-15', dependsOn: 'T-1' },
    // 3. Overdue Task (Due in the past, status is not Completed)
    { id: 'T-3', title: 'Fix Bug', status: 'Pending Review', createdAt: '2025-10-15', dueDate: '2025-10-28', dependencies: null },
    // 4. Single-Day Task (Start > End check)
    { id: 'T-4', title: 'Quick Review', status: 'Ongoing', createdAt: '2025-11-05', dueDate: '2025-11-02', dependencies: null },
    // 5. Invalid Date Task (Should be filtered out)
    { id: 'T-5', title: 'Bad Date', status: 'Ongoing', createdAt: '2025-10-29', dueDate: 'Invalid Date String', dependencies: null },
];

// ----------------------------------------------------
// 4. TEST SUITE
// ----------------------------------------------------

describe('Timeline.vue (Gantt Logic)', () => {

    // Mount the component with mock props
    const wrapper = mount(Timeline, {
        props: {
            tasks: mockTasks,
            taskStatuses: ['Ongoing', 'Completed', 'Pending Review'],
        },
        global: {
            // Stub out Vuetify components to prevent errors
            stubs: { 'v-progress-circular': true, 'v-icon': true }
        }
    });
    
    // Access the computed property we want to test
    const tasksForGantt = wrapper.vm.tasksForGantt;

    it('should correctly filter out tasks with invalid or missing dates', () => {
        // T-5 has an invalid date and should be filtered out.
        expect(tasksForGantt.value.length).toBe(4); 
        expect(tasksForGantt.value.some(t => t.id === 'T-5')).toBe(false);
    });

    describe('Task Transformation and Data Mapping', () => {
        
        const task1 = tasksForGantt.value.find(t => t.id === 'T-1'); // Ongoing, Future
        const task3 = tasksForGantt.value.find(t => t.id === 'T-3'); // Overdue
        const task4 = tasksForGantt.value.find(t => t.id === 'T-4'); // Start > End

        it('should correctly map raw task data to Frappe Gantt format', () => {
            expect(task1).toBeDefined();
            expect(task1).toHaveProperty('id', 'T-1');
            expect(task1).toHaveProperty('name', 'Feature Launch');
            // Dates should be standardized YYYY-MM-DD
            expect(task1).toHaveProperty('start', '2025-10-25');
            expect(task1).toHaveProperty('end', '2025-11-10');
            // Dependencies check (should be mapped)
            const task2 = tasksForGantt.value.find(t => t.id === 'T-2');
            expect(task2).toHaveProperty('dependencies', 'T-1');
        });

        it('should remove the "progress" property to prevent default progress bar rendering', () => {
             // The progress property is deleted in the component to prevent confusing visuals
             expect(task1).not.toHaveProperty('progress'); 
        });

        it('should handle Start Date > End Date by setting Start = End', () => {
            // T-4 has start: 2025-11-05 and end: 2025-11-02
            expect(task4).toBeDefined();
            expect(task4.start).toBe('2025-11-02');
            expect(task4.end).toBe('2025-11-02');
        });
    });

    describe('Status and Overdue Classification', () => {
        
        const task1 = tasksForGantt.value.find(t => t.id === 'T-1'); // Ongoing, Future
        const task2 = tasksForGantt.value.find(t => t.id === 'T-2'); // Completed, Past
        const task3 = tasksForGantt.value.find(t => t.id === 'T-3'); // Pending Review, Overdue

        it('should assign custom class for Ongoing tasks', () => {
            expect(task1.custom_class).toBe('bar-ongoing');
        });

        it('should assign custom class for Completed tasks', () => {
            expect(task2.custom_class).toBe('bar-completed');
        });
        
        it('should assign custom class for Overdue tasks (non-Completed)', () => {
            // T-3 is due 2025-10-28, which is before mock 'today' 2025-10-30
            expect(task3.custom_class).toBe('bar-deadline-passed');
        });

        it('should assign custom class for Pending Review tasks that are NOT overdue', () => {
            // Create a Pending Review task due tomorrow (2025-10-31)
            const mockFuturePending = { id: 'T-6', title: 'Future Review', status: 'Pending Review', createdAt: '2025-10-29', dueDate: '2025-10-31' };
            
            const futurePendingTask = wrapper.vm.tasksForGantt.value.filter(t => t.id === 'T-6')[0];
            // Since T-6 wasn't in the initial mock data, we rely on the component being mounted again 
            // but we can simulate the classification logic directly:
            const classification = wrapper.vm.getGanttTaskClass(mockFuturePending);
            expect(classification).toBe('bar-pending-review');
        });
    });
});