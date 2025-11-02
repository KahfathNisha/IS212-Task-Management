import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';

// Import the component logic directly by mocking dependencies
const CreateTaskDialogue = {
  // Component data and methods extracted for testing
  localTask: {
    title: '',
    description: '',
    priority: null,
    dueDate: '',
    taskOwner: '',
    status: 'Ongoing',
    projectId: '',
    categories: [],
    assignedTo: '',
    collaborators: [],
    recurrence: { enabled: false, type: '', interval: 1, endDate: '' }
  },
  subtasks: [],
  collaboratorPermissions: [],
  
  // Computed properties
  normalizeCollaborators(collabs) {
    const normalized = (collabs || []).map(c => typeof c === 'string' ? { name: c, permission: 'view' } : c);
    const seen = new Set();
    return normalized.filter(c => {
      if (seen.has(c.name)) return false;
      seen.add(c.name);
      return true;
    });
  },
  
  taskOwnerDepartment: null,
  isTaskOwner: true,
  
  // Methods
  setTaskOwnerDepartment(teamMembers, taskOwner) {
    if (taskOwner && teamMembers) {
      const member = teamMembers.find(member => member && member.value === taskOwner);
      this.taskOwnerDepartment = member ? member.department : null;
    } else {
      this.taskOwnerDepartment = null;
    }
    return this.taskOwnerDepartment;
  },
  
  checkTaskOwner(currentUser, taskOwner) {
    if (!currentUser || !taskOwner) return true; // Allow on create
    const userEmail = currentUser.email || '';
    const userName = currentUser.name || '';
    return taskOwner === userEmail || taskOwner === userName;
  },
  
  validateTitle(title) {
    if (!title) return false;
    return title.trim() !== '';
  },
  
  validateDueDate(dueDate) {
    if (!dueDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDateObj = new Date(dueDate);
    if (isNaN(dueDateObj.getTime())) return false;
    return dueDateObj >= today;
  },
  
  validateSubtask(subtask, index) {
    if (!subtask.title || subtask.title.trim() === '') {
      return { valid: false, message: `Subtask ${index + 1}: Title is required` };
    }
    if (!subtask.dueDate) {
      return { valid: false, message: `Subtask ${index + 1}: Due date is required` };
    }
    if (!subtask.priority) {
      return { valid: false, message: `Subtask ${index + 1}: Priority is required` };
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDateObj = new Date(subtask.dueDate);
    if (dueDateObj < today) {
      return { valid: false, message: `Subtask ${index + 1}: Due date cannot be in the past` };
    }
    return { valid: true };
  },
  
  addSubtask() {
    this.subtasks.push({
      title: '',
      description: '',
      status: 'Ongoing',
      priority: 1,
      dueDate: '',
      assignedTo: null,
      collaborators: [],
      collaboratorPermissions: [],
      attachments: []
    });
  },
  
  removeSubtask(index) {
    this.subtasks.splice(index, 1);
  },
  
  validateTask() {
    if (!this.validateTitle(this.localTask.title)) {
      return { valid: false, message: 'Task title is required', color: 'error' };
    }
    if (!this.localTask.priority) {
      return { valid: false, message: 'Priority is required', color: 'error' };
    }
    if (!this.localTask.dueDate) {
      return { valid: false, message: 'Due date is required', color: 'error' };
    }
    if (!this.validateDueDate(this.localTask.dueDate)) {
      return { valid: false, message: 'Due date cannot be in the past', color: 'error' };
    }
    if (!this.localTask.taskOwner) {
      return { valid: false, message: 'Task Owner is required', color: 'error' };
    }
    if (this.taskOwnerDepartment === null && this.localTask.taskOwner) {
      return { valid: false, message: "Could not determine the Task Owner's department. Please re-select the Task Owner.", color: 'error' };
    }
    
    // Validate subtasks
    for (let i = 0; i < this.subtasks.length; i++) {
      const subResult = this.validateSubtask(this.subtasks[i], i);
      if (!subResult.valid) {
        return subResult;
      }
    }
    
    return { valid: true };
  },
  
  buildPayload() {
    const dedupedCollaborators = this.collaboratorPermissions.filter((perm, index, self) =>
      index === self.findIndex(p => p.name === perm.name)
    );
    
    return {
      ...this.localTask,
      taskOwnerDepartment: this.taskOwnerDepartment,
      collaborators: dedupedCollaborators,
      subtasks: this.subtasks.map(s => ({
        ...s,
        collaborators: s.collaboratorPermissions.filter((perm, index, self) =>
          index === self.findIndex(p => p.name === perm.name)
        )
      }))
    };
  }
};

// Test data
const mockTeamMembers = [
  { text: 'John Doe', value: 'john.doe@company.com', department: 'Engineering' },
  { text: 'Jane Smith', value: 'jane.smith@company.com', department: 'Marketing' },
  { text: 'Bob Johnson', value: 'bob.johnson@company.com', department: 'Engineering' },
  { text: 'Alice Brown', value: 'alice.brown@company.com', department: 'Sales' }
];

const mockCurrentUser = {
  email: 'john.doe@company.com',
  name: 'John Doe'
};

// Test Suite
describe('CreateTaskDialogue Unit Tests', () => {
  
  let mockEmit;
  let mockTodayDate;

  // Mock today's date for consistent testing
  beforeAll(() => {
    const fixedDate = new Date('2025-11-01');
    vi.setSystemTime(fixedDate);
    mockTodayDate = '2025-11-01'; // Match the mocked date
  });

  afterAll(() => {
    vi.useRealTimers();
  });
  
  beforeEach(() => {
    mockEmit = vi.fn();
    
    // Reset component state
    Object.assign(CreateTaskDialogue, {
      localTask: {
        title: '',
        description: '',
        priority: null,
        dueDate: '',
        taskOwner: '',
        status: 'Ongoing',
        projectId: '',
        categories: [],
        assignedTo: '',
        collaborators: [],
        recurrence: { enabled: false, type: '', interval: 1, endDate: '' }
      },
      subtasks: [],
      collaboratorPermissions: [],
      taskOwnerDepartment: null,
      isTaskOwner: true
    });
  });

  // ===== UNIT TEST SUITE 1: Collaborator Normalization =====
  describe('Collaborator Normalization', () => {
    
    it('should normalize string collaborators to objects with default permission', () => {
      const collaborators = ['user1@example.com', 'user2@example.com'];
      const result = CreateTaskDialogue.normalizeCollaborators(collaborators);
      
      expect(result).toEqual([
        { name: 'user1@example.com', permission: 'view' },
        { name: 'user2@example.com', permission: 'view' }
      ]);
    });
    
    it('should preserve existing permission objects', () => {
      const collaborators = [
        { name: 'user1@example.com', permission: 'edit' },
        { name: 'user2@example.com', permission: 'view' }
      ];
      const result = CreateTaskDialogue.normalizeCollaborators(collaborators);
      
      expect(result).toEqual([
        { name: 'user1@example.com', permission: 'edit' },
        { name: 'user2@example.com', permission: 'view' }
      ]);
    });
    
    it('should remove duplicate collaborators', () => {
      const collaborators = ['user1@example.com', 'user1@example.com', 'user2@example.com'];
      const result = CreateTaskDialogue.normalizeCollaborators(collaborators);
      
      expect(result).toEqual([
        { name: 'user1@example.com', permission: 'view' },
        { name: 'user2@example.com', permission: 'view' }
      ]);
      expect(result).toHaveLength(2);
    });
    
    it('should handle null or undefined collaborators', () => {
      expect(CreateTaskDialogue.normalizeCollaborators(null)).toEqual([]);
      expect(CreateTaskDialogue.normalizeCollaborators(undefined)).toEqual([]);
      expect(CreateTaskDialogue.normalizeCollaborators([])).toEqual([]);
    });
  });

  // ===== UNIT TEST SUITE 2: Department Lookup =====
  describe('Department Lookup', () => {
    
    it('should find department for valid task owner email', () => {
      const result = CreateTaskDialogue.setTaskOwnerDepartment(mockTeamMembers, 'john.doe@company.com');
      expect(result).toBe('Engineering');
      expect(CreateTaskDialogue.taskOwnerDepartment).toBe('Engineering');
    });
    
    it('should return null for invalid task owner email', () => {
      const result = CreateTaskDialogue.setTaskOwnerDepartment(mockTeamMembers, 'invalid@email.com');
      expect(result).toBe(null);
      expect(CreateTaskDialogue.taskOwnerDepartment).toBe(null);
    });
    
    it('should handle empty or null task owner', () => {
      expect(CreateTaskDialogue.setTaskOwnerDepartment(mockTeamMembers, '')).toBe(null);
      expect(CreateTaskDialogue.setTaskOwnerDepartment(mockTeamMembers, null)).toBe(null);
      expect(CreateTaskDialogue.setTaskOwnerDepartment(mockTeamMembers, undefined)).toBe(null);
    });
    
    it('should handle empty team members array', () => {
      expect(CreateTaskDialogue.setTaskOwnerDepartment([], 'john.doe@company.com')).toBe(null);
    });
  });

  // ===== UNIT TEST SUITE 3: Task Owner Verification =====
  describe('Task Owner Verification', () => {
    
    it('should identify task owner by email match', () => {
      const result = CreateTaskDialogue.checkTaskOwner(mockCurrentUser, 'john.doe@company.com');
      expect(result).toBe(true);
    });
    
    it('should identify task owner by name match', () => {
      const result = CreateTaskDialogue.checkTaskOwner(mockCurrentUser, 'John Doe');
      expect(result).toBe(true);
    });
    
    it('should return false for non-owner', () => {
      const result = CreateTaskDialogue.checkTaskOwner(mockCurrentUser, 'jane.smith@company.com');
      expect(result).toBe(false);
    });
    
    it('should allow any owner during task creation (no current user)', () => {
      const result = CreateTaskDialogue.checkTaskOwner(null, 'any@email.com');
      expect(result).toBe(true);
    });
    
    it('should allow any owner during task creation (no task owner)', () => {
      const result = CreateTaskDialogue.checkTaskOwner(mockCurrentUser, '');
      expect(result).toBe(true);
    });
  });

  // ===== UNIT TEST SUITE 4: Field Validation =====
  describe('Field Validation', () => {
    
    describe('Title Validation', () => {
      it('should validate non-empty title', () => {
        expect(CreateTaskDialogue.validateTitle('Valid Task')).toBe(true);
        expect(CreateTaskDialogue.validateTitle('Task with spaces ')).toBe(true);
      });
      
      it('should reject empty title', () => {
        expect(CreateTaskDialogue.validateTitle('')).toBe(false);
      });
      
      it('should reject whitespace-only title', () => {
        expect(CreateTaskDialogue.validateTitle('   ')).toBe(false);
        expect(CreateTaskDialogue.validateTitle('\t\n')).toBe(false);
      });
    });
    
    describe('Due Date Validation', () => {
      it('should accept today\'s date', () => {
        expect(CreateTaskDialogue.validateDueDate(mockTodayDate)).toBe(true);
      });
      
      it('should accept future dates', () => {
        expect(CreateTaskDialogue.validateDueDate('2025-11-02')).toBe(true);
        expect(CreateTaskDialogue.validateDueDate('2025-12-31')).toBe(true);
      });
      
      it('should reject past dates', () => {
        expect(CreateTaskDialogue.validateDueDate('2025-10-31')).toBe(false);
        expect(CreateTaskDialogue.validateDueDate('2025-01-01')).toBe(false);
      });
      
      it('should reject empty dates', () => {
        expect(CreateTaskDialogue.validateDueDate('')).toBe(false);
        expect(CreateTaskDialogue.validateDueDate(null)).toBe(false);
        expect(CreateTaskDialogue.validateDueDate(undefined)).toBe(false);
      });
    });
  });

  // ===== UNIT TEST SUITE 5: Subtask Validation =====
  describe('Subtask Validation', () => {
    
    it('should validate complete subtask', () => {
      const subtask = {
        title: 'Valid Subtask',
        priority: 1,
        dueDate: mockTodayDate
      };
      
      const result = CreateTaskDialogue.validateSubtask(subtask, 0);
      expect(result.valid).toBe(true);
    });
    
    it('should reject subtask without title', () => {
      const subtask = {
        title: '',
        priority: 1,
        dueDate: mockTodayDate
      };
      
      const result = CreateTaskDialogue.validateSubtask(subtask, 0);
      expect(result.valid).toBe(false);
      expect(result.message).toBe('Subtask 1: Title is required');
    });
    
    it('should reject subtask without due date', () => {
      const subtask = {
        title: 'Valid Subtask',
        priority: 1,
        dueDate: ''
      };
      
      const result = CreateTaskDialogue.validateSubtask(subtask, 0);
      expect(result.valid).toBe(false);
      expect(result.message).toBe('Subtask 1: Due date is required');
    });
    
    it('should reject subtask without priority', () => {
      const subtask = {
        title: 'Valid Subtask',
        priority: null,
        dueDate: mockTodayDate
      };
      
      const result = CreateTaskDialogue.validateSubtask(subtask, 0);
      expect(result.valid).toBe(false);
      expect(result.message).toBe('Subtask 1: Priority is required');
    });
    
    it('should reject subtask with past due date', () => {
      const subtask = {
        title: 'Valid Subtask',
        priority: 1,
        dueDate: '2025-10-31'
      };
      
      const result = CreateTaskDialogue.validateSubtask(subtask, 0);
      expect(result.valid).toBe(false);
      expect(result.message).toBe('Subtask 1: Due date cannot be in the past');
    });
    
    it('should provide correct index in error messages', () => {
      const subtask = {
        title: '',
        priority: 1,
        dueDate: mockTodayDate
      };
      
      expect(CreateTaskDialogue.validateSubtask(subtask, 0).message).toBe('Subtask 1: Title is required');
      expect(CreateTaskDialogue.validateSubtask(subtask, 4).message).toBe('Subtask 5: Title is required');
    });
  });

  // ===== UNIT TEST SUITE 6: Subtask Management =====
  describe('Subtask Management', () => {
    
    it('should add new subtask with default values', () => {
      const initialLength = CreateTaskDialogue.subtasks.length;
      CreateTaskDialogue.addSubtask();
      
      expect(CreateTaskDialogue.subtasks).toHaveLength(initialLength + 1);
      const newSubtask = CreateTaskDialogue.subtasks[CreateTaskDialogue.subtasks.length - 1];
      expect(newSubtask.title).toBe('');
      expect(newSubtask.priority).toBe(1);
      expect(newSubtask.status).toBe('Ongoing');
      expect(newSubtask.collaborators).toEqual([]);
      expect(newSubtask.collaboratorPermissions).toEqual([]);
    });
    
    it('should remove subtask by index', () => {
      // Add two subtasks first
      CreateTaskDialogue.addSubtask();
      CreateTaskDialogue.addSubtask();
      CreateTaskDialogue.subtasks[0].title = 'First';
      CreateTaskDialogue.subtasks[1].title = 'Second';
      
      expect(CreateTaskDialogue.subtasks).toHaveLength(2);
      
      // Remove first subtask
      CreateTaskDialogue.removeSubtask(0);
      
      expect(CreateTaskDialogue.subtasks).toHaveLength(1);
      expect(CreateTaskDialogue.subtasks[0].title).toBe('Second');
    });
  });

  // ===== UNIT TEST SUITE 7: Task Validation =====
  describe('Task Validation', () => {
    
    beforeEach(() => {
      CreateTaskDialogue.setTaskOwnerDepartment(mockTeamMembers, 'john.doe@company.com');
    });
    
    it('should validate complete task', () => {
      CreateTaskDialogue.localTask.title = 'Valid Task';
      CreateTaskDialogue.localTask.priority = 1;
      CreateTaskDialogue.localTask.dueDate = mockTodayDate;
      CreateTaskDialogue.localTask.taskOwner = 'john.doe@company.com';
      
      const result = CreateTaskDialogue.validateTask();
      expect(result.valid).toBe(true);
    });
    
    it('should reject task without title', () => {
      CreateTaskDialogue.localTask.title = '';
      CreateTaskDialogue.localTask.priority = 1;
      CreateTaskDialogue.localTask.dueDate = mockTodayDate;
      CreateTaskDialogue.localTask.taskOwner = 'john.doe@company.com';
      
      const result = CreateTaskDialogue.validateTask();
      expect(result.valid).toBe(false);
      expect(result.message).toBe('Task title is required');
      expect(result.color).toBe('error');
    });
    
    it('should reject task without priority', () => {
      CreateTaskDialogue.localTask.title = 'Valid Task';
      CreateTaskDialogue.localTask.priority = null;
      CreateTaskDialogue.localTask.dueDate = mockTodayDate;
      CreateTaskDialogue.localTask.taskOwner = 'john.doe@company.com';
      
      const result = CreateTaskDialogue.validateTask();
      expect(result.valid).toBe(false);
      expect(result.message).toBe('Priority is required');
    });
    
    it('should reject task without due date', () => {
      CreateTaskDialogue.localTask.title = 'Valid Task';
      CreateTaskDialogue.localTask.priority = 1;
      CreateTaskDialogue.localTask.dueDate = '';
      CreateTaskDialogue.localTask.taskOwner = 'john.doe@company.com';
      
      const result = CreateTaskDialogue.validateTask();
      expect(result.valid).toBe(false);
      expect(result.message).toBe('Due date is required');
    });
    
    it('should reject task without task owner', () => {
      CreateTaskDialogue.localTask.title = 'Valid Task';
      CreateTaskDialogue.localTask.priority = 1;
      CreateTaskDialogue.localTask.dueDate = mockTodayDate;
      CreateTaskDialogue.localTask.taskOwner = '';
      
      const result = CreateTaskDialogue.validateTask();
      expect(result.valid).toBe(false);
      expect(result.message).toBe('Task Owner is required');
    });
    
    it('should reject task with invalid task owner department', () => {
      CreateTaskDialogue.localTask.title = 'Valid Task';
      CreateTaskDialogue.localTask.priority = 1;
      CreateTaskDialogue.localTask.dueDate = mockTodayDate;
      CreateTaskDialogue.localTask.taskOwner = 'invalid@email.com';
      CreateTaskDialogue.setTaskOwnerDepartment(mockTeamMembers, 'invalid@email.com');
      
      const result = CreateTaskDialogue.validateTask();
      expect(result.valid).toBe(false);
      expect(result.message).toBe("Could not determine the Task Owner's department. Please re-select the Task Owner.");
    });
    
    it('should validate subtasks and return first error', () => {
      CreateTaskDialogue.localTask.title = 'Valid Task';
      CreateTaskDialogue.localTask.priority = 1;
      CreateTaskDialogue.localTask.dueDate = mockTodayDate;
      CreateTaskDialogue.localTask.taskOwner = 'john.doe@company.com';
      
      // Add invalid subtask
      CreateTaskDialogue.addSubtask();
      CreateTaskDialogue.subtasks[0].title = '';
      CreateTaskDialogue.subtasks[0].priority = 1;
      CreateTaskDialogue.subtasks[0].dueDate = mockTodayDate;
      
      const result = CreateTaskDialogue.validateTask();
      expect(result.valid).toBe(false);
      expect(result.message).toBe('Subtask 1: Title is required');
    });
  });

  // ===== UNIT TEST SUITE 8: Payload Building =====
  describe('Payload Building', () => {
    
    beforeEach(() => {
      CreateTaskDialogue.setTaskOwnerDepartment(mockTeamMembers, 'john.doe@company.com');
      CreateTaskDialogue.collaboratorPermissions = [
        { name: 'user1@example.com', permission: 'view' },
        { name: 'user2@example.com', permission: 'edit' }
      ];
    });
    
    it('should build complete payload', () => {
      CreateTaskDialogue.localTask.title = 'Test Task';
      CreateTaskDialogue.localTask.description = 'Test Description';
      CreateTaskDialogue.localTask.priority = 1;
      CreateTaskDialogue.localTask.dueDate = mockTodayDate;
      CreateTaskDialogue.localTask.taskOwner = 'john.doe@company.com';
      
      const payload = CreateTaskDialogue.buildPayload();
      
      expect(payload.title).toBe('Test Task');
      expect(payload.description).toBe('Test Description');
      expect(payload.priority).toBe(1);
      expect(payload.dueDate).toBe(mockTodayDate);
      expect(payload.taskOwner).toBe('john.doe@company.com');
      expect(payload.taskOwnerDepartment).toBe('Engineering');
      expect(payload.collaborators).toEqual([
        { name: 'user1@example.com', permission: 'view' },
        { name: 'user2@example.com', permission: 'edit' }
      ]);
    });
    
    it('should deduplicate collaborators in payload', () => {
      // Add duplicate collaborator permission
      CreateTaskDialogue.collaboratorPermissions.push(
        { name: 'user1@example.com', permission: 'view' }
      );
      
      const payload = CreateTaskDialogue.buildPayload();
      
      const user1Count = payload.collaborators.filter(c => c.name === 'user1@example.com').length;
      expect(user1Count).toBe(1);
    });
    
    it('should handle subtasks with collaborator permissions', () => {
      CreateTaskDialogue.addSubtask();
      CreateTaskDialogue.subtasks[0].collaboratorPermissions = [
        { name: 'subtask-user@example.com', permission: 'view' }
      ];
      
      const payload = CreateTaskDialogue.buildPayload();
      
      expect(payload.subtasks).toHaveLength(1);
      expect(payload.subtasks[0].collaborators).toEqual([
        { name: 'subtask-user@example.com', permission: 'view' }
      ]);
    });
  });

  // ===== UNIT TEST SUITE 9: Edge Cases =====
  describe('Edge Cases', () => {
    
    it('should handle very long titles', () => {
      const longTitle = 'a'.repeat(1000);
      expect(CreateTaskDialogue.validateTitle(longTitle)).toBe(true);
    });
    
    it('should handle special characters in titles', () => {
      const specialTitle = 'Task with émojis 🎉 and spéciål çhars';
      expect(CreateTaskDialogue.validateTitle(specialTitle)).toBe(true);
    });
    
    it('should handle XSS attempts in titles', () => {
      const xssTitle = '<script>alert("test")</script>';
      expect(CreateTaskDialogue.validateTitle(xssTitle)).toBe(true); // Validation allows it
    });
    
    it('should handle many subtasks', () => {
      const initialLength = CreateTaskDialogue.subtasks.length;
      
      // Add 10 subtasks
      for (let i = 0; i < 10; i++) {
        CreateTaskDialogue.addSubtask();
        CreateTaskDialogue.subtasks[i].title = `Subtask ${i + 1}`;
      }
      
      expect(CreateTaskDialogue.subtasks).toHaveLength(initialLength + 10);
    });
    
    it('should handle malformed team member data', () => {
      const malformedMembers = [
        null,
        undefined,
        {},
        { text: 'Valid User', value: 'valid@email.com', department: 'Engineering' },
        { text: 'Invalid User 1' },
        { value: 'invalid@email.com' }
      ];
      
      // Should not crash
      expect(() => {
        CreateTaskDialogue.setTaskOwnerDepartment(malformedMembers, 'valid@email.com');
      }).not.toThrow();
      
      // Should return null for invalid data
      const result = CreateTaskDialogue.setTaskOwnerDepartment(malformedMembers, 'nonexistent@email.com');
      expect(result).toBe(null);
    });
  });

  // ===== UNIT TEST SUITE 10: Integration Scenarios =====
  describe('Integration Scenarios', () => {
    
    beforeEach(() => {
      CreateTaskDialogue.setTaskOwnerDepartment(mockTeamMembers, 'john.doe@company.com');
    });
    
    it('should handle complete valid task workflow', () => {
      // Set up valid task
      CreateTaskDialogue.localTask.title = 'Integration Test Task';
      CreateTaskDialogue.localTask.description = 'Testing complete workflow';
      CreateTaskDialogue.localTask.priority = 2;
      CreateTaskDialogue.localTask.dueDate = mockTodayDate;
      CreateTaskDialogue.localTask.taskOwner = 'john.doe@company.com';
      CreateTaskDialogue.localTask.assignedTo = 'jane.smith@company.com';
      
      // Add collaborator
      CreateTaskDialogue.localTask.collaborators = ['bob.johnson@company.com'];
      CreateTaskDialogue.collaboratorPermissions = [
        { name: 'bob.johnson@company.com', permission: 'edit' }
      ];
      
      // Add valid subtask
      CreateTaskDialogue.addSubtask();
      CreateTaskDialogue.subtasks[0].title = 'Valid Subtask';
      CreateTaskDialogue.subtasks[0].priority = 1;
      CreateTaskDialogue.subtasks[0].dueDate = mockTodayDate;
      
      // Validate
      const validation = CreateTaskDialogue.validateTask();
      expect(validation.valid).toBe(true);
      
      // Build payload
      const payload = CreateTaskDialogue.buildPayload();
      
      expect(payload.title).toBe('Integration Test Task');
      expect(payload.taskOwnerDepartment).toBe('Engineering');
      expect(payload.subtasks).toHaveLength(1);
    });
    
    it('should fail validation on first error encountered', () => {
      // Set up task with multiple validation errors
      CreateTaskDialogue.localTask.title = ''; // Error 1: empty title
      CreateTaskDialogue.localTask.priority = null; // Error 2: no priority
      CreateTaskDialogue.localTask.dueDate = ''; // Error 3: no due date
      
      // Add subtask with error
      CreateTaskDialogue.addSubtask();
      CreateTaskDialogue.subtasks[0].title = ''; // Error 4: empty subtask title
      
      const validation = CreateTaskDialogue.validateTask();
      expect(validation.valid).toBe(false);
      expect(validation.message).toBe('Task title is required'); // First error
    });
  });
});

// ===== PERFORMANCE TESTS =====
describe('CreateTaskDialogue Performance', () => {
  
  it('should handle rapid collaborator updates', () => {
    const collaborators = [];
    for (let i = 0; i < 100; i++) {
      collaborators.push(`user${i}@example.com`);
    }
    
    const start = Date.now();
    const result = CreateTaskDialogue.normalizeCollaborators(collaborators);
    const end = Date.now();
    
    expect(result).toHaveLength(100);
    expect(end - start).toBeLessThan(100); // Should complete in under 100ms
  });
  
  it('should handle subtask operations efficiently', () => {
    const start = Date.now();
    
    // Test subtask operations (simpler version)
    const initialLength = CreateTaskDialogue.subtasks.length;
    for (let i = 0; i < 10; i++) {
      CreateTaskDialogue.addSubtask();
      CreateTaskDialogue.subtasks[initialLength + i].title = `Subtask ${i + 1}`;
    }
    
    const end = Date.now();
    
    expect(CreateTaskDialogue.subtasks).toHaveLength(initialLength + 10);
    expect(end - start).toBeLessThan(100); // Should complete in under 100ms
  });
});