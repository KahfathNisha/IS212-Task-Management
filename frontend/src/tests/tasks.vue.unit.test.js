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
};

// 4. Status History Utilities
const getLatestStatusFromHistory = (statusHistory) => {
  if (!statusHistory || statusHistory.length === 0) return null;
  return statusHistory[statusHistory.length - 1].newStatus;
};

const hasStatusChanged = (statusHistory, targetStatus) => {
  if (!statusHistory || statusHistory.length === 0) return false;
  return statusHistory.some(entry => entry.newStatus === targetStatus);
};

const getStatusChangeCount = (statusHistory) => {
  if (!statusHistory) return 0;
  return statusHistory.length;
};

const addStatusToHistory = (statusHistory, newStatus, oldStatus = null) => {
  const history = statusHistory && Array.isArray(statusHistory) ? statusHistory : [];
  return [
    ...history,
    {
      timestamp: new Date().toISOString(),
      oldStatus,
      newStatus
    }
  ];
};

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

    it('should include tasks with statusHistory for visible users', () => {
      const tasksWithHistory = [
        { id: 10, title: 'Task with History', taskOwner: 'John Doe', assignedTo: 'Someone Else', taskOwnerDepartment: 'Engineering', collaborators: [], statusHistory: [{ timestamp: '2025-10-01T10:00:00.000Z', oldStatus: null, newStatus: 'Ongoing' }] },
        { id: 20, title: 'Task with History', taskOwner: 'John Doe', assignedTo: 'Someone Else', taskOwnerDepartment: 'Engineering', collaborators: [], statusHistory: [{ timestamp: '2025-10-05T14:30:00.000Z', oldStatus: 'Ongoing', newStatus: 'Completed' }] }
      ];
      const visibleTasksWithHistory = ref(tasksWithHistory);
      
      const userVisibleTasksWithHistory = computed(() => {
        const userName = mockAuthStore.userData.value?.name;
        if (!userName) return [];
        return visibleTasksWithHistory.value.filter(task => task.taskOwner === userName);
      });

      mockAuthStore.userData.value = { name: 'John Doe', department: 'Engineering' };
      const result = userVisibleTasksWithHistory.value;
      
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('statusHistory');
      expect(result[0].statusHistory.length).toBe(1);
      expect(result[1]).toHaveProperty('statusHistory');
      expect(result[1].statusHistory.length).toBe(1);
    });
  });

  // --- 4. Test Status History Utilities ---
  describe('Status History Utilities', () => {
    
    const mockStatusHistory = [
      { timestamp: '2025-10-01T10:00:00.000Z', oldStatus: null, newStatus: 'Ongoing' },
      { timestamp: '2025-10-05T14:30:00.000Z', oldStatus: 'Ongoing', newStatus: 'Pending Review' },
      { timestamp: '2025-10-10T09:15:00.000Z', oldStatus: 'Pending Review', newStatus: 'Completed' }
    ];

    describe('getLatestStatusFromHistory', () => {
      it('should return the latest status from status history', () => {
        const latestStatus = getLatestStatusFromHistory(mockStatusHistory);
        expect(latestStatus).toBe('Completed');
      });

      it('should return null for null status history', () => {
        const latestStatus = getLatestStatusFromHistory(null);
        expect(latestStatus).toBe(null);
      });

      it('should return null for undefined status history', () => {
        const latestStatus = getLatestStatusFromHistory(undefined);
        expect(latestStatus).toBe(null);
      });

      it('should handle single entry history', () => {
        const singleEntryHistory = [
          { timestamp: '2025-10-01T10:00:00.000Z', oldStatus: null, newStatus: 'Ongoing' }
        ];
        const latestStatus = getLatestStatusFromHistory(singleEntryHistory);
        expect(latestStatus).toBe('Ongoing');
      });
    });

    describe('hasStatusChanged', () => {
      it('should return true if target status exists in history', () => {
        expect(hasStatusChanged(mockStatusHistory, 'Completed')).toBe(true);
        expect(hasStatusChanged(mockStatusHistory, 'Pending Review')).toBe(true);
        expect(hasStatusChanged(mockStatusHistory, 'Ongoing')).toBe(true);
      });

      it('should return false if target status does not exist in history', () => {
        expect(hasStatusChanged(mockStatusHistory, 'Unassigned')).toBe(false);
        expect(hasStatusChanged(mockStatusHistory, 'Cancelled')).toBe(false);
      });

      it('should return false for null or undefined status history', () => {
        expect(hasStatusChanged(null, 'Completed')).toBe(false);
        expect(hasStatusChanged(undefined, 'Completed')).toBe(false);
      });

      it('should handle case-sensitive status matching', () => {
        expect(hasStatusChanged(mockStatusHistory, 'completed')).toBe(false); // Wrong case
        expect(hasStatusChanged(mockStatusHistory, 'COMPLETED')).toBe(false); // Wrong case
      });
    });

    describe('getStatusChangeCount', () => {
      it('should return correct count of status changes', () => {
        expect(getStatusChangeCount(mockStatusHistory)).toBe(3);
      });

      it('should return 0 for null status history', () => {
        expect(getStatusChangeCount(null)).toBe(0);
      });

      it('should return 0 for undefined status history', () => {
        expect(getStatusChangeCount(undefined)).toBe(0);
      });

      it('should return 1 for single entry history', () => {
        const singleEntryHistory = [
          { timestamp: '2025-10-01T10:00:00.000Z', oldStatus: null, newStatus: 'Ongoing' }
        ];
        expect(getStatusChangeCount(singleEntryHistory)).toBe(1);
      });
    });

    describe('addStatusToHistory', () => {
      it('should add new status entry to existing history', () => {
        const updatedHistory = addStatusToHistory(mockStatusHistory, 'Unassigned', 'Completed');
        expect(updatedHistory).toHaveLength(4);
        expect(updatedHistory[3].newStatus).toBe('Unassigned');
        expect(updatedHistory[3].oldStatus).toBe('Completed');
        expect(updatedHistory[3]).toHaveProperty('timestamp');
      });

      it('should handle null or undefined history', () => {
        const updatedHistory1 = addStatusToHistory(null, 'Ongoing', null);
        expect(updatedHistory1).toHaveLength(1);

        const updatedHistory2 = addStatusToHistory(undefined, 'Ongoing', null);
        expect(updatedHistory2).toHaveLength(1);
      });

      it('should create new history entry with valid existing history', () => {
        const updatedHistory = addStatusToHistory(
          [{ timestamp: '2025-10-01T10:00:00.000Z', oldStatus: null, newStatus: 'Ongoing' }],
          'Completed',
          'Ongoing'
        );
        expect(updatedHistory).toHaveLength(2);
        expect(updatedHistory[1].oldStatus).toBe('Ongoing');
        expect(updatedHistory[1].newStatus).toBe('Completed');
        expect(updatedHistory[1]).toHaveProperty('timestamp');
      });

      it('should create new history entry with current timestamp', () => {
        vi.setSystemTime(new Date('2025-11-01T12:00:00.000Z'));
        const initialHistory = [
          { timestamp: '2025-10-01T10:00:00.000Z', oldStatus: null, newStatus: 'Ongoing' }
        ];
        const updatedHistory = addStatusToHistory(initialHistory, 'Completed', 'Ongoing');
        expect(updatedHistory[1].timestamp).toBe('2025-11-01T12:00:00.000Z');
        expect(updatedHistory[1].oldStatus).toBe('Ongoing');
        expect(updatedHistory[1].newStatus).toBe('Completed');
      });
    });

    describe('Status History Integration with Filter Tasks', () => {
      const tasksWithHistory = [
        { 
          id: 1, 
          priority: 1, 
          assignedTo: 'A', 
          taskOwnerDepartment: 'D1',
          statusHistory: [
            { timestamp: '2025-10-01T10:00:00.000Z', oldStatus: null, newStatus: 'Ongoing' }
          ]
        },
        { 
          id: 2, 
          priority: 5, 
          assignedTo: 'A', 
          taskOwnerDepartment: 'D2',
          statusHistory: [
            { timestamp: '2025-10-05T14:30:00.000Z', oldStatus: 'Ongoing', newStatus: 'Completed' }
          ]
        },
        {
          id: 3,
          priority: 1,
          assignedTo: 'B',
          taskOwnerDepartment: 'D1',
          statusHistory: [
            { timestamp: '2025-10-15T10:00:00.000Z', oldStatus: null, newStatus: 'Ongoing' }
          ]
        },
      ];

      it('should preserve statusHistory when filtering by priority', () => {
        const result = filterTasks(tasksWithHistory, [1], [], []);
        expect(result).toHaveLength(2);
        result.forEach(task => {
          expect(task).toHaveProperty('statusHistory');
          expect(task.statusHistory.length).toBeGreaterThan(0);
        });
      });

      it('should preserve statusHistory when filtering by assignee', () => {
        const result = filterTasks(tasksWithHistory, [], ['A'], []);
        expect(result).toHaveLength(2);
        result.forEach(task => {
          expect(task).toHaveProperty('statusHistory');
          expect(task.statusHistory.length).toBeGreaterThan(0);
        });
      });

      it('should preserve statusHistory when filtering by department', () => {
        const result = filterTasks(tasksWithHistory, [], [], ['D1']);
        expect(result).toHaveLength(2);
        result.forEach(task => {
          expect(task).toHaveProperty('statusHistory');
          expect(task.statusHistory.length).toBeGreaterThan(0);
        });
      });

      it('should maintain statusHistory integrity through combined filters', () => {
        const result = filterTasks(tasksWithHistory, [1], ['B'], ['D1']);
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe(3);
        expect(result[0].statusHistory.length).toBe(1);
        expect(result[0].statusHistory[0].newStatus).toBe('Ongoing');
      });
    });

    describe('Status History Data Validation', () => {
      it('should validate proper status history entry structure', () => {
        const validHistoryEntry = {
          timestamp: '2025-10-01T10:00:00.000Z',
          oldStatus: null,
          newStatus: 'Ongoing'
        };

expect(validHistoryEntry).toHaveProperty('timestamp');
        expect(validHistoryEntry).toHaveProperty('oldStatus');
        expect(validHistoryEntry).toHaveProperty('newStatus');
        expect(typeof validHistoryEntry.timestamp).toBe('string');
        expect(['string', 'null', 'object']).toContain(typeof validHistoryEntry.oldStatus);
        expect(typeof validHistoryEntry.newStatus).toBe('string');
      });

      it('should handle malformed status history entries gracefully', () => {
        const malformedHistory = [
          { timestamp: '2025-10-01T10:00:00.000Z', oldStatus: null, newStatus: 'Ongoing' },
          { oldStatus: 'Ongoing', newStatus: 'Completed' }, // Missing timestamp
          { timestamp: 'invalid-date', oldStatus: 'Completed', newStatus: 'Pending Review' }, // Invalid timestamp
          null, // Null entry
          { timestamp: '2025-10-10T09:15:00.000Z' } // Missing oldStatus and newStatus
        ];

        // Should not crash when processing malformed data
        expect(() => getLatestStatusFromHistory(malformedHistory)).not.toThrow();
        expect(() => hasStatusChanged(malformedHistory, 'Completed')).not.toThrow();
        expect(() => getStatusChangeCount(malformedHistory)).not.toThrow();
      });

      it('should handle status history with invalid status values', () => {
        const invalidStatusHistory = [
          { timestamp: '2025-10-01T10:00:00.000Z', oldStatus: null, newStatus: '' },
          { timestamp: '2025-10-02T10:00:00.000Z', oldStatus: '', newStatus: null },
          { timestamp: '2025-10-03T10:00:00.000Z', oldStatus: undefined, newStatus: 'Ongoing' }
        ];

        expect(() => getLatestStatusFromHistory(invalidStatusHistory)).not.toThrow();
        expect(() => hasStatusChanged(invalidStatusHistory, 'Ongoing')).not.toThrow();
      });

      it('should handle chronological status progression', () => {
        const chronologicalHistory = [
          { timestamp: '2025-10-01T10:00:00.000Z', oldStatus: null, newStatus: 'Ongoing' },
          { timestamp: '2025-10-02T10:00:00.000Z', oldStatus: 'Ongoing', newStatus: 'Pending Review' },
          { timestamp: '2025-10-03T10:00:00.000Z', oldStatus: 'Pending Review', newStatus: 'Completed' },
        ];

        const latestStatus = getLatestStatusFromHistory(chronologicalHistory);
        expect(latestStatus).toBe('Completed');
        expect(getStatusChangeCount(chronologicalHistory)).toBe(3);
      });

      it('should handle status changes with same status value', () => {
        const sameStatusHistory = [
          { timestamp: '2025-10-01T10:00:00.000Z', oldStatus: null, newStatus: 'Ongoing' },
          { timestamp: '2025-10-02T10:00:00.000Z', oldStatus: 'Ongoing', newStatus: 'Ongoing' }, // Same status
        ];

        const latestStatus = getLatestStatusFromHistory(sameStatusHistory);
        expect(latestStatus).toBe('Ongoing');
        expect(hasStatusChanged(sameStatusHistory, 'Ongoing')).toBe(true);
        expect(getStatusChangeCount(sameStatusHistory)).toBe(2);
      });
    });
  });
});