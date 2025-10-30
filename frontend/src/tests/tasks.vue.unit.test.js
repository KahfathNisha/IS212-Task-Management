import { describe, it, expect, vi, beforeAll, afterAll, computed, ref } from 'vitest';
import { computed, ref } from 'vue';

// --- MOCK IMPLEMENTATIONS (Copied from Tasks.vue <script setup>) ---

// Define the fixed "today" date string for consistent testing
// (Must be done before the 'isTaskOverdue' helper is defined if we imported it, 
// but since we're defining the helper here, we just use the mocked time)
const FIXED_TODAY_DATE = '2025-10-30T00:00:00.000Z'; 


// 1. Corrected isTaskOverdue Helper
const isTaskOverdue = (dueDate, status) => {
  if (status === 'Completed' || !dueDate) return false;
  
  const now = new Date();
  
  // 1. Define TODAY at midnight (local time relative to mock)
  const todayDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate()); 

  // 2. Parse the DUE DATE string and define it at midnight (local time relative to mock)
  const dueDateObj = new Date(dueDate);
  
  if (isNaN(dueDateObj.getTime())) return false; 
  
  const dueDateOnly = new Date(
      dueDateObj.getFullYear(), 
      dueDateObj.getMonth(), 
      dueDateObj.getDate()
  );
  
  // This comparison is now safe, as both dates are normalized to midnight
  return dueDateOnly < todayDateOnly; 
};


// 2. Mocking the Auth Store and user data for dependencies
const mockAuthStore = {
  userData: ref({ 
    name: 'John Doe', 
    email: 'john.doe@company.com', 
    department: 'Engineering' 
  }),
  userRole: ref('staff'),
};

// 3. Mock the filter logic
const filterTasks = (taskArray, priorities, assignees, departments) => {
    let filtered = taskArray;

    if (priorities && priorities.length > 0) {
        filtered = filtered.filter(task => priorities.includes(task.priority));
    }
    if (assignees && assignees.length > 0) {
        filtered = filtered.filter(task => assignees.includes(task.assignedTo));
    }
    if (departments && departments.length > 0) {
        filtered = filtered.filter(task => departments.includes(task.taskOwnerDepartment));
    }
    return filtered;
}

// --- Test Suites ---

describe('Tasks.vue Core Logic', () => {
  
  const originalDate = Date;

  // --- Date Mock Setup (CRITICAL FIX) ---
  beforeAll(() => {
    // Use Vitest's time mocking features to fix the time
    vi.useFakeTimers();
    vi.setSystemTime(new Date(FIXED_TODAY_DATE));
  });

  afterAll(() => {
    // Restore the original Date object and timers
    vi.useRealTimers();
    global.Date = originalDate;
  });

  // --- 1. Test isTaskOverdue Helper ---
  describe('isTaskOverdue', () => {
    
    it('should return true for a task due yesterday and status is Ongoing', () => {
      // 2025-10-28 is before our mock 'today' (2025-10-30)
      expect(isTaskOverdue('2025-10-28', 'Ongoing')).toBe(true);
    });

    it('should return false for a task due today', () => {
      expect(isTaskOverdue('2025-10-30', 'Ongoing')).toBe(false);
    });

    it('should return false for a task due tomorrow', () => {
      expect(isTaskOverdue('2025-10-31', 'Ongoing')).toBe(false);
    });

    it('should return false if status is Completed, even if the date is in the past', () => {
      expect(isTaskOverdue('2025-10-28', 'Completed')).toBe(false);
    });

    it('should return false if dueDate is null', () => {
      expect(isTaskOverdue(null, 'Ongoing')).toBe(false);
    });
  });

  // --- 2. Test filterTasks Function ---
  describe('filterTasks', () => {
    
    const tasks = [
        { id: 1, priority: 1, assignedTo: 'A', taskOwnerDepartment: 'D1' },
        { id: 2, priority: 5, assignedTo: 'A', taskOwnerDepartment: 'D2' },
        { id: 3, priority: 1, assignedTo: 'B', taskOwnerDepartment: 'D1' },
        { id: 4, priority: 10, assignedTo: 'C', taskOwnerDepartment: 'D3' },
    ];
    
    it('should return all tasks if no filters are applied', () => {
      expect(filterTasks(tasks, [], [], [])).toHaveLength(4);
    });

    it('should filter correctly by a single priority', () => {
      const result = filterTasks(tasks, [1], [], []);
      expect(result).toHaveLength(2);
      expect(result.map(t => t.id)).toEqual([1, 3]);
    });

    it('should filter correctly by multiple priorities', () => {
      const result = filterTasks(tasks, [1, 10], [], []);
      expect(result).toHaveLength(3);
      expect(result.map(t => t.id)).toEqual([1, 3, 4]);
    });

    it('should filter correctly by assignee', () => {
      const result = filterTasks(tasks, [], ['A'], []);
      expect(result).toHaveLength(2);
      expect(result.map(t => t.id)).toEqual([1, 2]);
    });

    it('should filter correctly by department', () => {
      const result = filterTasks(tasks, [], [], ['D1']);
      expect(result).toHaveLength(2);
      expect(result.map(t => t.id)).toEqual([1, 3]);
    });
    
    it('should filter by a combination of priority and assignee', () => {
      const result = filterTasks(tasks, [1], ['A'], []);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
    });

    it('should filter by a combination of priority and department', () => {
      const result = filterTasks(tasks, [1], [], ['D1']);
      expect(result).toHaveLength(2); 
    });
  });

  // --- 3. Test userVisibleTasks Computed Property ---
  describe('userVisibleTasks Computed', () => {
    
    const visibleTasks = ref([
      { id: 10, title: 'My Task', taskOwner: 'John Doe', assignedTo: 'Someone Else', taskOwnerDepartment: 'Engineering', collaborators: [] },
      { id: 20, title: 'Assigned Task', taskOwner: 'Someone Else', assignedTo: 'John Doe', taskOwnerDepartment: 'Marketing', collaborators: [] },
      { id: 30, title: 'Collaborator Task', taskOwner: 'Someone Else', assignedTo: 'Another', taskOwnerDepartment: 'Finance', collaborators: [{ name: 'John Doe' }] },
      { id: 40, title: 'Dept Task', taskOwner: 'Jane Smith', assignedTo: 'Jane Smith', taskOwnerDepartment: 'Engineering', collaborators: [] },
      { id: 50, title: 'Hidden Task', taskOwner: 'Someone Else', assignedTo: 'Another', taskOwnerDepartment: 'Sales', collaborators: [] },
    ]);
    
    const userVisibleTasks = computed(() => {
        if (!mockAuthStore.userData.value || !mockAuthStore.userData.value.name) {
            return [];
        }
        
        const userName = mockAuthStore.userData.value.name;
        const userRole = mockAuthStore.userRole.value; 
        const currentDept = mockAuthStore.userData.value.department; 

        if (userRole === 'hr' || userRole === 'director') {
            return visibleTasks.value; 
        }

        return visibleTasks.value.filter(task => {
            const isOwner = task.taskOwner === userName;
            const isAssignee = task.assignedTo === userName;
            const isCollaborator = Array.isArray(task.collaborators) && 
                                   task.collaborators.some(c => c.name === userName);
            const isDepartmentTask = currentDept && task.taskOwnerDepartment === currentDept;

            return isOwner || isAssignee || isCollaborator || isDepartmentTask;
        });
    });

    it('should return tasks where user is owner, assignee, or collaborator (staff role)', () => {
        mockAuthStore.userRole.value = 'staff';
        mockAuthStore.userData.value = { name: 'John Doe', department: 'Engineering' };
        
        const result = userVisibleTasks.value;
        expect(result).toHaveLength(4); // Tasks 10, 20, 30, 40
        expect(result.map(t => t.id)).not.toContain(50); 
    });

    it('should return all tasks for a Director role', () => {
        mockAuthStore.userRole.value = 'director';
        mockAuthStore.userData.value = { name: 'Alice', department: 'Management' };

        const result = userVisibleTasks.value;
        expect(result).toHaveLength(5); // All tasks
    });

    it('should only show tasks from the user\'s department if not owner/assignee/collaborator (staff role)', () => {
        mockAuthStore.userRole.value = 'staff';
        mockAuthStore.userData.value = { name: 'John Doe', department: 'Engineering' };
        
        // Task 40: Jane Smith is owner, but department is Engineering (user's dept)
        const deptTask = userVisibleTasks.value.find(t => t.id === 40);
        expect(deptTask).toBeDefined();
    });

    it('should return an empty array if user data is incomplete', () => {
        mockAuthStore.userData.value = null;
        expect(userVisibleTasks.value).toHaveLength(0);
    });
  });
});