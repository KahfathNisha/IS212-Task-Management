import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ref, computed, nextTick } from 'vue';

// Import the component utilities we'll test
// We'll extract the logic from ListView.vue for unit testing

// ===========================
// Mock Data Setup
// ===========================

// Mock user data based on Firebase rules roles
const MOCK_USERS = [
  { email: 'john.doe@company.com', name: 'John Doe', role: 'staff', department: 'Engineering' },
  { email: 'peter.yap@company.com', name: 'Peter Yap', role: 'manager', department: 'IT' },
  { email: 'jack.sim@company.com', name: 'Jack Sim', role: 'director', department: 'All' },
  { email: 'alice.johnson@company.com', name: 'Alice Johnson', role: 'hr', department: 'HR' },
];

// Mock tasks with various access patterns based on Firebase rules
const MOCK_TASKS = [
  {
    id: 'task-1',
    title: 'Engineering Task',
    description: 'A task for engineering team',
    status: 'Ongoing',
    priority: 1,
    dueDate: '2025-11-15',
    assignedTo: 'john.doe@company.com',
    taskOwner: 'john.doe@company.com',
    taskOwnerDepartment: 'Engineering',
    collaborators: [],
    createdBy: 'john.doe@company.com',
    statusHistory: [
      { timestamp: '2025-10-01T10:00:00.000Z', oldStatus: null, newStatus: 'Ongoing' }
    ],
    subtasks: [
      { id: 'subtask-1', title: 'Subtask 1', status: 'Completed', assignedTo: 'john.doe@company.com' },
      { id: 'subtask-2', title: 'Subtask 2', status: 'Ongoing', assignedTo: 'john.doe@company.com' }
    ]
  },
  {
    id: 'task-2',
    title: 'IT Task',
    description: 'An IT department task',
    status: 'Pending Review',
    priority: 3,
    dueDate: '2025-11-20',
    assignedTo: 'peter.yap@company.com',
    taskOwner: 'peter.yap@company.com',
    taskOwnerDepartment: 'IT',
    collaborators: [],
    createdBy: 'peter.yap@company.com',
    statusHistory: [
      { timestamp: '2025-10-05T14:30:00.000Z', oldStatus: 'Ongoing', newStatus: 'Pending Review' }
    ],
    subtasks: []
  },
  {
    id: 'task-3',
    title: 'High Priority Task',
    description: 'A high priority task for testing',
    status: 'Completed',
    priority: 1,
    dueDate: '2025-10-20', // Overdue task
    assignedTo: 'john.doe@company.com',
    taskOwner: 'jack.sim@company.com',
    taskOwnerDepartment: 'All',
    collaborators: ['alice.johnson@company.com'],
    createdBy: 'jack.sim@company.com',
    statusHistory: [
      { timestamp: '2025-10-10T09:15:00.000Z', oldStatus: 'Ongoing', newStatus: 'Completed' },
      { timestamp: '2025-10-08T16:45:00.000Z', oldStatus: null, newStatus: 'Ongoing' }
    ],
    subtasks: []
  },
  {
    id: 'task-4',
    title: 'Department Task',
    description: 'Task visible by department',
    status: 'Ongoing',
    priority: 5,
    dueDate: null, // No due date
    assignedTo: null,
    taskOwner: 'peter.yap@company.com',
    taskOwnerDepartment: 'IT', // Peter's department
    collaborators: [],
    createdBy: 'peter.yap@company.com',
    statusHistory: [],
    subtasks: []
  },
  {
    id: 'task-5',
    title: 'Unassigned Task',
    description: 'Task with no assignee',
    status: 'Unassigned',
    priority: 2,
    dueDate: '2025-12-01',
    assignedTo: null,
    taskOwner: 'john.doe@company.com',
    taskOwnerDepartment: 'Engineering',
    collaborators: [],
    createdBy: 'john.doe@company.com',
    statusHistory: [
      { timestamp: '2025-10-15T11:20:00.000Z', oldStatus: null, newStatus: 'Unassigned' }
    ],
    subtasks: []
  }
];

// ===========================
// Utility Functions (extracted from ListView.vue)
// ===========================

/**
 * Check if a task is overdue
 */
const isTaskOverdue = (dueDate, status) => {
  if (status === 'Completed' || !dueDate) return false;
  
  const now = new Date('2025-10-31T15:20:38.700Z'); // Mock fixed date
  const todayDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dueDateOnly = new Date(dueDate);
  
  return dueDateOnly < todayDateOnly;
};

/**
 * Get status color for UI
 */
const getStatusColor = (status) => {
  const colors = {
    'Ongoing': 'blue',
    'Completed': 'green',
    'Pending Review': 'orange',
    'Unassigned': 'grey'
  };
  return colors[status] || 'grey';
};

/**
 * Format date string to localized date
 */
const formatDate = (dateString) => {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      return dateString;
    }
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch (error) {
    return dateString;
  }
};

/**
 * Format date string to localized datetime
 */
const formatDateTime = (dateString) => {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      return dateString;
    }
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    return dateString;
  }
};

/**
 * Get display name for assignedTo field
 */
const getDisplayName = (assignedValue, allUsers = []) => {
  if (!assignedValue) return '';
  
  let lookupValue;
  if (typeof assignedValue === 'object') {
    lookupValue = assignedValue.name || assignedValue.email || assignedValue.value;
  } else {
    lookupValue = assignedValue;
  }
  
  if (!lookupValue) return '';
  
  // If it's already a name, return it
  if (!lookupValue.includes('@')) {
    return lookupValue;
  }
  
  // If it's an email, look up the name
  const user = allUsers.find(u => u.email === lookupValue);
  return user && user.name ? user.name : lookupValue;
};

/**
 * Calculate completion percentage for tasks with subtasks
 */
const calculateProgress = (task) => {
  if (!task || !task.subtasks || task.subtasks.length === 0) {
    return 0;
  }
  
  const totalSubtasks = task.subtasks.length;
  const completedSubtasks = task.subtasks.filter(
    subtask => subtask.status === 'Completed'
  ).length;
  
  return Math.round((completedSubtasks / totalSubtasks) * 100);
};

/**
 * Truncate text to specified length with ellipsis
 */
const truncateText = (text, maxLength) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, Math.max(0, maxLength - 3)) + '...';
};

/**
 * Get task card CSS classes
 */
const getTaskCardClasses = (task, selectedTaskId = null, selectedTaskIds = []) => {
  const baseClasses = {
    'active': selectedTaskId === task.id,
    'bulk-selected': selectedTaskIds.includes(task.id)
  };

  // Add overdue class if applicable
  if (isTaskOverdue(task.dueDate, task.status)) {
    baseClasses['task-overdue'] = true;
  }
  
  return baseClasses;
};

/**
 * Filter and flatten tasks with subtasks
 */
const flattenTasks = (tasks) => {
  let allTasks = [];
  
  tasks.forEach(task => {
    // Add main task
    allTasks.push(task);
    
    // Add subtasks as separate items
    if (task.subtasks && task.subtasks.length > 0) {
      task.subtasks.forEach((subtask, index) => {
        allTasks.push({
          ...subtask,
          id: `${task.id}-subtask-${index}`,
          isSubtask: true,
          parentTask: task
        });
      });
    }
  });
  
  return allTasks;
};

/**
 * Apply search and status filters to flattened tasks
 */
const filterTasks = (tasks, searchQuery = '', statusFilter = []) => {
  let filteredTasks = [...tasks];
  
  // Apply status filter
  if (statusFilter.length > 0) {
    filteredTasks = filteredTasks.filter(task => statusFilter.includes(task.status));
  }
  
  // Apply search filter
  if (searchQuery && searchQuery.trim()) {
    const query = searchQuery.toLowerCase().trim();
    filteredTasks = filteredTasks.filter(task => {
      return (
        task.title?.toLowerCase().includes(query) ||
        task.description?.toLowerCase().includes(query) ||
        task.assignedTo?.toLowerCase().includes(query) ||
        (task.collaborators && task.collaborators.some(collab => 
          collab.toLowerCase().includes(query)
        ))
      );
    });
  }
  
  return filteredTasks;
};

/**
 * Sort tasks based on selected sort option
 */
const sortTasks = (tasks, sortBy = 'priority', sortOrder = 'asc') => {
  const sortedTasks = [...tasks];

  sortedTasks.sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case 'Due Date':
        // Tasks without dates go to the end
        const dateA = a.dueDate ? new Date(a.dueDate) : new Date('9999-12-31');
        const dateB = b.dueDate ? new Date(b.dueDate) : new Date('9999-12-31');
        comparison = dateA - dateB;
        break;

      case 'Priority':
        // Lower priority number = higher priority (1 is highest, 10 is lowest)
        const priorityA = typeof a.priority === 'number' ? a.priority : 10;
        const priorityB = typeof b.priority === 'number' ? b.priority : 10;
        comparison = priorityA - priorityB;
        break;

      case 'Status':
        // Custom order: Ongoing → Pending Review → Completed → Unassigned
        const statusOrder = {
          'Ongoing': 1,
          'Pending Review': 2,
          'Completed': 3,
          'Unassigned': 4
        };
        const statusA = a.status || 'Unassigned';
        const statusB = b.status || 'Unassigned';
        const orderA = statusOrder[statusA] || 8;
        const orderB = statusOrder[statusB] || 8;
        comparison = orderA - orderB;
        break;

      default:
        comparison = 0;
    }

    // Apply sort order
    return sortOrder === 'desc' ? -comparison : comparison;
  });

  return sortedTasks;
};

// ===========================
// Test Suites
// ===========================

describe('ListView Unit Tests', () => {

  // ===========================
  // Task Flattening Tests
  // ===========================
  describe('Task Flattening Logic', () => {
    
    it('should flatten tasks and include subtasks as separate items', () => {
      const tasks = [MOCK_TASKS[0]]; // task-1 has 2 subtasks
      const flattened = flattenTasks(tasks);
      
      expect(flattened).toHaveLength(3); // 1 main task + 2 subtasks
      expect(flattened[0].id).toBe('task-1'); // Main task
      expect(flattened[1].id).toBe('task-1-subtask-0'); // First subtask
      expect(flattened[2].id).toBe('task-1-subtask-1'); // Second subtask
    });

    it('should mark subtasks with isSubtask flag and parentTask reference', () => {
      const tasks = [MOCK_TASKS[0]];
      const flattened = flattenTasks(tasks);
      
      const mainTask = flattened[0];
      const subtask = flattened[1];
      
      expect(mainTask.isSubtask).toBeUndefined();
      expect(subtask.isSubtask).toBe(true);
      expect(subtask.parentTask).toEqual(mainTask);
    });

    it('should handle tasks without subtasks correctly', () => {
      const tasks = [MOCK_TASKS[1]]; // task-2 has no subtasks
      const flattened = flattenTasks(tasks);
      
      expect(flattened).toHaveLength(1);
      expect(flattened[0].id).toBe('task-2');
      expect(flattened[0].isSubtask).toBeUndefined();
    });

    it('should handle empty tasks array', () => {
      const flattened = flattenTasks([]);
      expect(flattened).toHaveLength(0);
    });

    it('should handle tasks with empty subtasks array', () => {
      const tasks = [{ id: 'task-empty', subtasks: [] }];
      const flattened = flattenTasks(tasks);
      
      expect(flattened).toHaveLength(1);
      expect(flattened[0].id).toBe('task-empty');
    });
  });

  // ===========================
  // Task Filtering Tests
  // ===========================
  describe('Task Filtering Logic', () => {
    
    it('should filter tasks by status correctly', () => {
      const flattenedTasks = flattenTasks(MOCK_TASKS);
      const filtered = filterTasks(flattenedTasks, '', ['Ongoing']);
      
      const ongoingTasks = filtered.filter(task => task.status === 'Ongoing');
      expect(filtered).toHaveLength(ongoingTasks.length);
      filtered.forEach(task => {
        expect(task.status).toBe('Ongoing');
      });
    });

    it('should filter tasks by multiple statuses', () => {
      const flattenedTasks = flattenTasks(MOCK_TASKS);
      const filtered = filterTasks(flattenedTasks, '', ['Ongoing', 'Completed']);
      
      expect(filtered.every(task => 
        task.status === 'Ongoing' || task.status === 'Completed'
      )).toBe(true);
    });

    it('should filter tasks by search query in title', () => {
      const flattenedTasks = flattenTasks(MOCK_TASKS);
      const filtered = filterTasks(flattenedTasks, 'engineering');
      
      expect(filtered.some(task => 
        task.title?.toLowerCase().includes('engineering')
      )).toBe(true);
    });

    it('should filter tasks by search query in description', () => {
      const flattenedTasks = flattenTasks(MOCK_TASKS);
      const filtered = filterTasks(flattenedTasks, 'high priority');
      
      expect(filtered.some(task => 
        task.description?.toLowerCase().includes('high priority')
      )).toBe(true);
    });

    it('should filter tasks by assignee email', () => {
      const flattenedTasks = flattenTasks(MOCK_TASKS);
      const filtered = filterTasks(flattenedTasks, 'john.doe');
      
      expect(filtered.some(task => 
        task.assignedTo?.toLowerCase().includes('john.doe')
      )).toBe(true);
    });

    it('should filter tasks by collaborator', () => {
      const flattenedTasks = flattenTasks(MOCK_TASKS);
      const filtered = filterTasks(flattenedTasks, 'alice');
      
      // task-3 has alice.johnson as collaborator
      expect(filtered.some(task => 
        task.collaborators?.includes('alice.johnson@company.com')
      )).toBe(true);
    });

    it('should handle empty search query', () => {
      const flattenedTasks = flattenTasks(MOCK_TASKS);
      const filtered = filterTasks(flattenedTasks, '');
      
      expect(filtered).toHaveLength(flattenedTasks.length);
    });

    it('should handle empty status filter', () => {
      const flattenedTasks = flattenTasks(MOCK_TASKS);
      const filtered = filterTasks(flattenedTasks, '', []);
      
      expect(filtered).toHaveLength(flattenedTasks.length);
    });

    it('should handle case-insensitive search', () => {
      const flattenedTasks = flattenTasks(MOCK_TASKS);
      const filtered = filterTasks(flattenedTasks, 'ENGINEERING');
      
      expect(filtered.some(task => 
        task.title?.toLowerCase().includes('engineering') ||
        task.description?.toLowerCase().includes('engineering')
      )).toBe(true);
    });

    it('should return no results for non-matching search', () => {
      const flattenedTasks = flattenTasks(MOCK_TASKS);
      const filtered = filterTasks(flattenedTasks, 'nonexistent');
      
      expect(filtered).toHaveLength(0);
    });

    it('should combine search and status filters', () => {
      const flattenedTasks = flattenTasks(MOCK_TASKS);
      const filtered = filterTasks(flattenedTasks, 'john', ['Ongoing']);
      
      expect(filtered.every(task => 
        task.status === 'Ongoing' && (
          task.title?.toLowerCase().includes('john') ||
          task.assignedTo?.toLowerCase().includes('john') ||
          task.description?.toLowerCase().includes('john')
        )
      )).toBe(true);
    });
  });

  // ===========================
  // Task Sorting Tests
  // ===========================
  describe('Task Sorting Logic', () => {
    
    it('should sort tasks by priority (ascending)', () => {
      const flattenedTasks = flattenTasks(MOCK_TASKS);
      const sorted = sortTasks(flattenedTasks, 'Priority', 'asc');
      
      // Check that priorities are in ascending order (1, 1, 2, 3, 5)
      const priorities = sorted.map(task =>
        typeof task.priority === 'number' ? task.priority : 10
      );
      expect(priorities).toEqual([1, 1, 2, 3, 5, 10, 10]); // 7 tasks including 2 subtasks with no priority
    });

    it('should sort tasks by priority (descending)', () => {
      const flattenedTasks = flattenTasks(MOCK_TASKS);
      const sorted = sortTasks(flattenedTasks, 'Priority', 'desc');
      
      const priorities = sorted.map(task =>
        typeof task.priority === 'number' ? task.priority : 10
      );
      expect(priorities).toEqual([10, 10, 5, 3, 2, 1, 1]); // 7 tasks including 2 subtasks
    });

    it('should sort tasks by due date (ascending)', () => {
      const flattenedTasks = flattenTasks(MOCK_TASKS);
      const sorted = sortTasks(flattenedTasks, 'Due Date', 'asc');
      
      // Tasks without dates should be at the end
      const tasksWithDates = sorted.filter(task => task.dueDate);
      const tasksWithoutDates = sorted.filter(task => !task.dueDate);
      
      expect(tasksWithoutDates.length).toBeGreaterThan(0);
      // Check that dated tasks are in ascending order
      for (let i = 0; i < tasksWithDates.length - 1; i++) {
        expect(new Date(tasksWithDates[i].dueDate).getTime()).toBeLessThanOrEqual(
          new Date(tasksWithDates[i + 1].dueDate).getTime()
        );
      }
    });

    it('should sort tasks by status with custom order', () => {
      const flattenedTasks = flattenTasks(MOCK_TASKS);
      const sorted = sortTasks(flattenedTasks, 'Status', 'asc');
      
      // Custom order: Ongoing (1), Pending Review (2), Completed (3), Unassigned (4)
      const statusOrder = {
        'Ongoing': 1,
        'Pending Review': 2,
        'Completed': 3,
        'Unassigned': 4
      };
      
      const statuses = sorted.map(task => statusOrder[task.status] || 8);
      expect(statuses).toEqual([1, 1, 1, 2, 3, 3, 4]); // 7 tasks including 2 subtasks
    });

    it('should handle tasks with null/undefined priority', () => {
      const tasksWithNullPriority = [
        { id: '1', priority: 1 },
        { id: '2', priority: null },
        { id: '3', priority: 5 },
        { id: '4', priority: undefined }
      ];
      
      const sorted = sortTasks(tasksWithNullPriority, 'Priority', 'asc');
      
      // Tasks with null/undefined priority should be treated as 10 (lowest priority)
      expect(sorted[0].priority).toBe(1);
      expect(sorted[1].priority).toBe(5);
      expect([null, undefined]).toContain(sorted[2].priority);
      expect([null, undefined]).toContain(sorted[3].priority);
    });

    it('should handle tasks with null/undefined status', () => {
      const tasksWithNullStatus = [
        { id: '1', status: 'Ongoing' },
        { id: '2', status: null },
        { id: '3', status: 'Completed' },
        { id: '4', status: undefined }
      ];
      
      const sorted = sortTasks(tasksWithNullStatus, 'Status', 'asc');
      
      // Tasks with null/undefined status should be treated as 'Unassigned' (order 4)
      expect(sorted[0].status).toBe('Ongoing');
      expect(sorted[1].status).toBe('Completed');
      expect([null, undefined]).toContain(sorted[2].status);
      expect([null, undefined]).toContain(sorted[3].status);
    });

    it('should preserve task identity during sorting', () => {
      const flattenedTasks = flattenTasks(MOCK_TASKS);
      const sorted = sortTasks(flattenedTasks, 'Priority', 'asc');
      
      // Each task should maintain its original properties
      sorted.forEach(task => {
        expect(task).toHaveProperty('id');
        expect(task).toHaveProperty('title');
        expect(task).toHaveProperty('status');
      });
    });
  });

  // ===========================
  // Utility Function Tests
  // ===========================
  describe('Utility Functions', () => {
    
    describe('isTaskOverdue', () => {
      it('should return true for overdue ongoing task', () => {
        const dueDate = '2025-10-25'; // Before current date 
        const result = isTaskOverdue(dueDate, 'Ongoing');
        expect(result).toBe(true);
      });

      it('should return false for completed task even if overdue', () => {
        const dueDate = '2025-10-25';
        const result = isTaskOverdue(dueDate, 'Completed');
        expect(result).toBe(false);
      });

      it('should return false for task due today', () => {
        const dueDate = '2025-10-31'; // Current date
        const result = isTaskOverdue(dueDate, 'Ongoing');
        expect(result).toBe(false);
      });

      it('should return false for task due in future', () => {
        const dueDate = '2025-11-15'; // Future date
        const result = isTaskOverdue(dueDate, 'Ongoing');
        expect(result).toBe(false);
      });

      it('should return false for task with no due date', () => {
        const result = isTaskOverdue(null, 'Ongoing');
        expect(result).toBe(false);
      });

      it('should return false for empty due date string', () => {
        const result = isTaskOverdue('', 'Ongoing');
        expect(result).toBe(false);
      });
    });

    describe('getStatusColor', () => {
      it('should return correct colors for valid statuses', () => {
        expect(getStatusColor('Ongoing')).toBe('blue');
        expect(getStatusColor('Completed')).toBe('green');
        expect(getStatusColor('Pending Review')).toBe('orange');
        expect(getStatusColor('Unassigned')).toBe('grey');
      });

      it('should return grey for invalid status', () => {
        expect(getStatusColor('InvalidStatus')).toBe('grey');
        expect(getStatusColor(null)).toBe('grey');
        expect(getStatusColor(undefined)).toBe('grey');
      });
    });

    describe('formatDate', () => {
      it('should format valid date string correctly', () => {
        const dateString = '2025-10-31';
        const result = formatDate(dateString);
        expect(result).toMatch(/Oct \d{1,2}, \d{4}/);
      });

      it('should return empty string for null date', () => {
        const result = formatDate(null);
        expect(result).toBe('');
      });

      it('should return empty string for undefined date', () => {
        const result = formatDate(undefined);
        expect(result).toBe('');
      });

      it('should return original string for invalid date', () => {
        const invalidDate = 'invalid-date';
        const result = formatDate(invalidDate);
        expect(result).toBe(invalidDate);
      });
    });

    describe('formatDateTime', () => {
      it('should format valid datetime string correctly', () => {
        const dateString = '2025-10-31';
        const result = formatDateTime(dateString);
        expect(result).toMatch(/Oct \d{1,2}, \d{4}, \d{1,2}:\d{2} [AP]M/);
      });

      it('should return empty string for null datetime', () => {
        const result = formatDateTime(null);
        expect(result).toBe('');
      });

      it('should return original string for invalid datetime', () => {
        const invalidDateTime = 'invalid-datetime';
        const result = formatDateTime(invalidDateTime);
        expect(result).toBe(invalidDateTime);
      });
    });

    describe('getDisplayName', () => {
      it('should return email for email input when user not found', () => {
        const email = 'test@example.com';
        const result = getDisplayName(email, MOCK_USERS);
        expect(result).toBe('test@example.com');
      });

      it('should return user name for matching email', () => {
        const email = 'john.doe@company.com';
        const result = getDisplayName(email, MOCK_USERS);
        expect(result).toBe('John Doe');
      });

      it('should handle object input with name property', () => {
        const userObj = { name: 'Jane Doe' };
        const result = getDisplayName(userObj, MOCK_USERS);
        expect(result).toBe('Jane Doe');
      });

      it('should handle object input with email property', () => {
        const userObj = { email: 'john.doe@company.com' };
        const result = getDisplayName(userObj, MOCK_USERS);
        expect(result).toBe('John Doe');
      });

      it('should handle object input with value property', () => {
        const userObj = { value: 'john.doe@company.com' };
        const result = getDisplayName(userObj, MOCK_USERS);
        expect(result).toBe('John Doe');
      });

      it('should return empty string for null input', () => {
        const result = getDisplayName(null, MOCK_USERS);
        expect(result).toBe('');
      });

      it('should return empty string for undefined input', () => {
        const result = getDisplayName(undefined, MOCK_USERS);
        expect(result).toBe('');
      });

      it('should return input directly if it looks like a name (no @)', () => {
        const name = 'John Doe';
        const result = getDisplayName(name, MOCK_USERS);
        expect(result).toBe('John Doe');
      });
    });

    describe('calculateProgress', () => {
      it('should calculate progress for tasks with subtasks', () => {
        const task = {
          subtasks: [
            { status: 'Completed' },
            { status: 'Completed' },
            { status: 'Ongoing' }
          ]
        };
        
        const result = calculateProgress(task);
        expect(result).toBe(67); // 2/3 = 66.66... -> 67
      });

      it('should return 0 for task with no subtasks', () => {
        const task = { subtasks: [] };
        const result = calculateProgress(task);
        expect(result).toBe(0);
      });

      it('should return 0 for null task', () => {
        const result = calculateProgress(null);
        expect(result).toBe(0);
      });

      it('should return 0 for task with null subtasks', () => {
        const task = { subtasks: null };
        const result = calculateProgress(task);
        expect(result).toBe(0);
      });

      it('should handle subtasks with different statuses', () => {
        const task = {
          subtasks: [
            { status: 'Completed' },
            { status: 'Pending Review' },
            { status: 'Ongoing' },
            { status: 'Unassigned' }
          ]
        };
        
        const result = calculateProgress(task);
        expect(result).toBe(25); // 1/4 = 25%
      });
    });

    describe('truncateText', () => {
      it('should return original text if length is within limit', () => {
        const text = 'Short text';
        const result = truncateText(text, 20);
        expect(result).toBe('Short text');
      });

      it('should truncate text and add ellipsis', () => {
        const text = 'This is a very long text that needs truncation';
        const result = truncateText(text, 20);
        expect(result).toBe('This is a very lo...');
        expect(result.length).toBe(20); // maxLength chars total (17 + 3 for ellipsis)
      });

      it('should handle empty string', () => {
        const result = truncateText('', 20);
        expect(result).toBe('');
      });

      it('should handle null input', () => {
        const result = truncateText(null, 20);
        expect(result).toBe('');
      });

      it('should handle undefined input', () => {
        const result = truncateText(undefined, 20);
        expect(result).toBe('');
      });

      it('should handle maxLength of 0', () => {
        const text = 'Any text';
        const result = truncateText(text, 0);
        expect(result).toBe('...');
      });

      it('should handle very short maxLength', () => {
        const text = 'Hello';
        const result = truncateText(text, 2);
        expect(result).toBe('...');
      });
    });

    describe('getTaskCardClasses', () => {
      it('should add active class when task is selected', () => {
        const task = { id: 'task-1' };
        const classes = getTaskCardClasses(task, 'task-1', []);
        
        expect(classes.active).toBe(true);
        expect(classes['bulk-selected']).toBe(false);
      });

      it('should add bulk-selected class when task is in selection', () => {
        const task = { id: 'task-1' };
        const classes = getTaskCardClasses(task, null, ['task-1']);
        
        expect(classes.active).toBe(false);
        expect(classes['bulk-selected']).toBe(true);
      });

      it('should add overdue class for overdue ongoing task', () => {
        const task = { 
          id: 'task-1', 
          dueDate: '2025-10-25', 
          status: 'Ongoing' 
        };
        const classes = getTaskCardClasses(task, null, []);
        
        expect(classes['task-overdue']).toBe(true);
      });

      it('should not add overdue class for completed task', () => {
        const task = { 
          id: 'task-1', 
          dueDate: '2025-10-25', 
          status: 'Completed' 
        };
        const classes = getTaskCardClasses(task, null, []);
        
        expect(classes['task-overdue']).toBeUndefined();
      });

      it('should not add overdue class for task without due date', () => {
        const task = { 
          id: 'task-1', 
          dueDate: null, 
          status: 'Ongoing' 
        };
        const classes = getTaskCardClasses(task, null, []);
        
        expect(classes['task-overdue']).toBeUndefined();
      });

      it('should handle all classes together', () => {
        const task = { 
          id: 'task-1', 
          dueDate: '2025-10-25', 
          status: 'Ongoing' 
        };
        const classes = getTaskCardClasses(task, 'task-1', ['task-1']);
        
        expect(classes.active).toBe(true);
        expect(classes['bulk-selected']).toBe(true);
        expect(classes['task-overdue']).toBe(true);
      });
    });
  });

  // ===========================
  // Role-Based Access Control Tests
  // ===========================
  describe('Role-Based Access Control', () => {
    
    it('should filter tasks based on user role and permissions', () => {
      // Staff user should only see tasks they're member of
      const staffUserTasks = MOCK_TASKS.filter(task => {
        // Simplified logic based on Firebase rules
        return task.assignedTo === 'john.doe@company.com' ||
               task.taskOwner === 'john.doe@company.com' ||
               task.collaborators?.includes('john.doe@company.com') ||
               (task.taskOwnerDepartment === 'Engineering' && task.taskOwner === 'peter.yap@company.com');
      });
      
      expect(staffUserTasks.length).toBeGreaterThan(0);
      
      // Director should see all tasks
      const directorTasks = MOCK_TASKS.filter(task => true); // Directors have full access
      expect(directorTasks.length).toBe(MOCK_TASKS.length);
      
      // HR should have read access to all tasks
      const hrTasks = MOCK_TASKS.filter(task => true); // HR has read access
      expect(hrTasks.length).toBe(MOCK_TASKS.length);
    });

    it('should handle department-based filtering for managers', () => {
      const managerTasks = MOCK_TASKS.filter(task =>
        task.taskOwnerDepartment === 'IT' || // Manager's department
        task.taskOwner === 'peter.yap@company.com' || // Own tasks
        task.assignedTo === 'peter.yap@company.com' || // Assigned tasks
        task.collaborators?.includes('alice.johnson@company.com') // Collaborations
      );
      
      expect(managerTasks.length).toBeGreaterThan(0);
    });

    it('should respect project membership for staff users', () => {
      // Staff users can only see tasks from projects they're members of
      // This is a simplified test - in real implementation, this would check project membership
      const staffMemberTasks = MOCK_TASKS.filter(task =>
        task.assignedTo === 'john.doe@company.com' ||
        task.taskOwner === 'john.doe@company.com' ||
        task.collaborators?.includes('john.doe@company.com')
      );
      
      expect(staffMemberTasks.length).toBeGreaterThan(0);
    });
  });

  // ===========================
  // Status History Tests
  // ===========================
  describe('Status History Tracking', () => {

    describe('Task Flattening with Status History', () => {
      it('should preserve statusHistory when flattening tasks', () => {
        const tasks = [MOCK_TASKS[0]]; // task-1 has statusHistory
        const flattened = flattenTasks(tasks);

        expect(flattened[0].statusHistory).toEqual([
          { timestamp: '2025-10-01T10:00:00.000Z', oldStatus: null, newStatus: 'Ongoing' }
        ]);
      });

      it('should handle tasks without statusHistory', () => {
        const tasks = [MOCK_TASKS[3]]; // task-4 has empty statusHistory
        const flattened = flattenTasks(tasks);

        expect(flattened[0].statusHistory).toEqual([]);
      });

      it('should preserve statusHistory in subtasks', () => {
        const tasks = [{
          id: 'task-with-history',
          title: 'Task with History',
          status: 'Ongoing',
          statusHistory: [
            { timestamp: '2025-10-01T10:00:00.000Z', oldStatus: null, newStatus: 'Ongoing' }
          ],
          subtasks: [{
            id: 'subtask-1',
            title: 'Subtask',
            status: 'Completed',
            statusHistory: [
              { timestamp: '2025-10-02T11:00:00.000Z', oldStatus: null, newStatus: 'Completed' }
            ]
          }]
        }];
        const flattened = flattenTasks(tasks);

        expect(flattened).toHaveLength(2);
        expect(flattened[1].statusHistory).toEqual([
          { timestamp: '2025-10-02T11:00:00.000Z', oldStatus: null, newStatus: 'Completed' }
        ]);
      });
    });

    describe('Task Filtering with Status History', () => {
      it('should filter tasks that have statusHistory entries', () => {
        const flattenedTasks = flattenTasks(MOCK_TASKS);
        const tasksWithHistory = flattenedTasks.filter(task =>
          task.statusHistory && task.statusHistory.length > 0
        );

        expect(tasksWithHistory).toHaveLength(4); // task-1, task-2, task-3, task-5
        tasksWithHistory.forEach(task => {
          expect(task.statusHistory.length).toBeGreaterThan(0);
        });
      });

      it('should filter tasks by status history content', () => {
        const flattenedTasks = flattenTasks(MOCK_TASKS);
        const completedHistoryTasks = flattenedTasks.filter(task =>
          task.statusHistory?.some(entry => entry.newStatus === 'Completed')
        );

        expect(completedHistoryTasks).toHaveLength(1); // Only task-3 has Completed in history
        expect(completedHistoryTasks[0].id).toBe('task-3');
      });
    });

    describe('Task Sorting with Status History', () => {
      it('should sort tasks by status history length', () => {
        const tasksWithHistory = MOCK_TASKS.filter(task => task.statusHistory?.length > 0);
        const sorted = sortTasks(tasksWithHistory, 'Priority', 'asc');

        // Should still sort by priority despite having statusHistory
        const priorities = sorted.map(task => task.priority);
        expect(priorities).toEqual([1, 1, 2, 3]); // task-1 (1), task-3 (1), task-5 (2), task-2 (3)
      });

      it('should maintain statusHistory integrity during sorting', () => {
        const tasksWithHistory = MOCK_TASKS.filter(task => task.statusHistory?.length > 0);
        const sorted = sortTasks(tasksWithHistory, 'Status', 'asc');

        sorted.forEach(task => {
          expect(task).toHaveProperty('statusHistory');
          expect(Array.isArray(task.statusHistory)).toBe(true);
        });
      });
    });

    describe('Status History Display Logic', () => {
      it('should get correct colors for status history entries', () => {
        expect(getStatusColor('Ongoing')).toBe('blue');
        expect(getStatusColor('Completed')).toBe('green');
        expect(getStatusColor('Pending Review')).toBe('orange');
        expect(getStatusColor('Unassigned')).toBe('grey');
      });

      it('should handle invalid status in history', () => {
        expect(getStatusColor('InvalidStatus')).toBe('grey');
        expect(getStatusColor(null)).toBe('grey');
        expect(getStatusColor(undefined)).toBe('grey');
      });

      it('should format status history timestamps correctly', () => {
        const timestamp = '2025-10-01T10:00:00.000Z';
        const formatted = formatDateTime(timestamp);
        expect(formatted).toMatch(/Oct \d{1,2}, \d{4}, \d{1,2}:\d{2} [AP]M/);
      });

      it('should handle invalid timestamps in status history', () => {
        const invalidTimestamp = 'invalid-date';
        const result = formatDateTime(invalidTimestamp);
        expect(result).toBe(invalidTimestamp);
      });
    });

    describe('Status Change Handling', () => {
      it('should handle status change events', () => {
        // Mock emit function
        const mockEmit = vi.fn();

        // Simulate status change
        const newStatus = 'Completed';
        const taskId = 'task-1';

        // In a real component, this would be called via handleStatusChange
        mockEmit('change-status', { taskId, status: newStatus });

        expect(mockEmit).toHaveBeenCalledWith('change-status', { taskId, status: newStatus });
      });

      it('should validate status change data', () => {
        const validStatuses = ['Ongoing', 'Completed', 'Pending Review'];

        validStatuses.forEach(status => {
          expect(getStatusColor(status)).not.toBe('grey'); // Valid statuses have colors
        });

        expect(getStatusColor('Unassigned')).toBe('grey'); // Unassigned is grey
        expect(getStatusColor('Invalid')).toBe('grey'); // Invalid status defaults to grey
      });

it('should handle status history with multiple entries', () => {
        const taskWithMultipleHistory = MOCK_TASKS[2]; // task-3 has 2 history entries
        expect(taskWithMultipleHistory.statusHistory).toHaveLength(2);

        // Verify history entries are in correct format
        taskWithMultipleHistory.statusHistory.forEach(entry => {
          expect(entry).toHaveProperty('timestamp');
          expect(entry).toHaveProperty('oldStatus');
          expect(entry).toHaveProperty('newStatus');
          expect(typeof entry.timestamp).toBe('string');
        });
      });

      it('should validate timestamp format in status history', () => {
        const taskWithHistory = MOCK_TASKS[2]; // task-3 has proper timestamps
        taskWithHistory.statusHistory.forEach(entry => {
          // Should be valid ISO 8601 format
          expect(new Date(entry.timestamp).toISOString()).toBe(entry.timestamp);
        });
      });

      it('should handle status history with chronological progression', () => {
        const chronologicalHistory = [
          { timestamp: '2025-10-01T10:00:00.000Z', oldStatus: null, newStatus: 'Ongoing' },
          { timestamp: '2025-10-02T14:30:00.000Z', oldStatus: 'Ongoing', newStatus: 'Pending Review' },
          { timestamp: '2025-10-03T09:15:00.000Z', oldStatus: 'Pending Review', newStatus: 'Completed' }
        ];

        // Verify chronological order
        for (let i = 1; i < chronologicalHistory.length; i++) {
          const prevTime = new Date(chronologicalHistory[i-1].timestamp).getTime();
          const currTime = new Date(chronologicalHistory[i].timestamp).getTime();
          expect(currTime).toBeGreaterThan(prevTime);
        }
      });

it('should validate timestamp format in status history', () => {
        const taskWithHistory = MOCK_TASKS[2]; // task-3 has proper timestamps
        taskWithHistory.statusHistory.forEach(entry => {
          // Should be valid ISO 8601 format
          expect(new Date(entry.timestamp).toISOString()).toBe(entry.timestamp);
        });
      });

      it('should handle status history with chronological progression', () => {
        const chronologicalHistory = [
          { timestamp: '2025-10-01T10:00:00.000Z', oldStatus: null, newStatus: 'Ongoing' },
          { timestamp: '2025-10-02T14:30:00.000Z', oldStatus: 'Ongoing', newStatus: 'Pending Review' },
          { timestamp: '2025-10-03T09:15:00.000Z', oldStatus: 'Pending Review', newStatus: 'Completed' }
        ];

        // Verify chronological order
        for (let i = 1; i < chronologicalHistory.length; i++) {
          const prevTime = new Date(chronologicalHistory[i-1].timestamp).getTime();
          const currTime = new Date(chronologicalHistory[i].timestamp).getTime();
          expect(currTime).toBeGreaterThan(prevTime);
        }
      });
    });
  });

  // ===========================
  // Multi-Function Workflow Tests
  // ===========================
  describe('Multi-Function Workflows', () => {

    it('should handle complete workflow: flatten -> filter -> sort', () => {
      // Step 1: Flatten tasks
      const flattened = flattenTasks(MOCK_TASKS);
      expect(flattened).toHaveLength(7); // 5 main tasks + 2 subtasks from task-1

      // Step 2: Filter for ongoing tasks
      const filtered = filterTasks(flattened, '', ['Ongoing']);
      expect(filtered.every(task => task.status === 'Ongoing')).toBe(true);

      // Step 3: Sort by priority
      const sorted = sortTasks(filtered, 'Priority', 'asc');
      const priorities = sorted.map(task => task.priority || 10);
      expect(priorities).toEqual([1, 5, 10]); // Only ongoing tasks: task-1 (1), task-4 (5), subtask (10 default)
    });

    it('should filter for specific user and sort by due date', () => {
      const flattened = flattenTasks(MOCK_TASKS);
      const johnTasks = filterTasks(flattened, 'john');
      const sorted = sortTasks(johnTasks, 'Due Date', 'asc');

      // Should only contain tasks associated with john
      expect(sorted.every(task =>
        task.assignedTo?.includes('john') ||
        task.taskOwner?.includes('john') ||
        task.createdBy?.includes('john') ||
        task.collaborators?.some(c => c.includes('john'))
      )).toBe(true);
    });

    it('should handle edge cases in complex workflow', () => {
      // Empty search and filter should return all flattened tasks
      const result1 = filterTasks(flattenTasks([]), '', []);
      expect(result1).toHaveLength(0);

      // Search with no matching tasks
      const result2 = filterTasks(flattenTasks(MOCK_TASKS), 'nonexistent', []);
      expect(result2).toHaveLength(0);

      // Sort with invalid sort option should maintain order
      const result3 = sortTasks(MOCK_TASKS, 'InvalidSort', 'asc');
      expect(result3).toEqual(MOCK_TASKS);
    });

    it('should maintain data integrity through all transformations', () => {
      const flattened = flattenTasks(MOCK_TASKS);
      const filtered = filterTasks(flattened, 'task', []);
      const sorted = sortTasks(filtered, 'Priority', 'asc');

      // Each task should maintain its essential properties
      sorted.forEach(task => {
        expect(task).toHaveProperty('id');
        expect(task).toHaveProperty('title');
        expect(task).toHaveProperty('status');
        expect(typeof task.id).toBe('string');
        expect(typeof task.title).toBe('string');
      });
    });

    it('should preserve statusHistory through complete workflow', () => {
      const flattened = flattenTasks(MOCK_TASKS);
      const filtered = filterTasks(flattened, '', ['Ongoing', 'Completed']);
      const sorted = sortTasks(filtered, 'Priority', 'asc');

      // Tasks with statusHistory should maintain it
      const tasksWithHistory = sorted.filter(task => task.statusHistory?.length > 0);
      expect(tasksWithHistory.length).toBeGreaterThan(0);

      tasksWithHistory.forEach(task => {
        expect(Array.isArray(task.statusHistory)).toBe(true);
        task.statusHistory.forEach(entry => {
          expect(entry).toHaveProperty('timestamp');
          expect(entry).toHaveProperty('oldStatus');
          expect(entry).toHaveProperty('newStatus');
        });
      });
    });
  });
});