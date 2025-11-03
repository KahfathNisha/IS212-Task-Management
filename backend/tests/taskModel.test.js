const taskModel = require('../src/models/taskModel');

describe('taskModel', () => {
  describe('Model Structure', () => {
    it('should have all required fields with correct default values', () => {
      expect(taskModel).toHaveProperty('title');
      expect(taskModel.title).toBe('');
      expect(taskModel).toHaveProperty('description');
      expect(taskModel.description).toBe('');
      expect(taskModel).toHaveProperty('type');
      expect(taskModel.type).toBe('');
      expect(taskModel).toHaveProperty('status');
      expect(taskModel.status).toBe('');
      expect(taskModel).toHaveProperty('priority');
      expect(taskModel.priority).toBe(1);
      expect(taskModel).toHaveProperty('projectId');
      expect(taskModel.projectId).toBe(null);
      expect(taskModel).toHaveProperty('dueDate');
      expect(taskModel.dueDate).toBe(null);
      expect(taskModel).toHaveProperty('startTime');
      expect(taskModel.startTime).toBe(null);
      expect(taskModel).toHaveProperty('endTime');
      expect(taskModel.endTime).toBe(null);
      expect(taskModel).toHaveProperty('assigneeId');
      expect(taskModel.assigneeId).toBe(null);
      expect(taskModel).toHaveProperty('collaborators');
      expect(Array.isArray(taskModel.collaborators)).toBe(true);
      expect(taskModel).toHaveProperty('attachments');
      expect(Array.isArray(taskModel.attachments)).toBe(true);
      expect(taskModel).toHaveProperty('subtasks');
      expect(Array.isArray(taskModel.subtasks)).toBe(true);
      expect(taskModel).toHaveProperty('archived');
      expect(taskModel.archived).toBe(false);
      expect(taskModel).toHaveProperty('createdAt');
      expect(taskModel.createdAt).toBe(null);
      expect(taskModel).toHaveProperty('updatedAt');
      expect(taskModel.updatedAt).toBe(null);
      expect(taskModel).toHaveProperty('statusHistory');
      expect(Array.isArray(taskModel.statusHistory)).toBe(true);
    });

    it('should have recurrence object with correct structure', () => {
      expect(taskModel).toHaveProperty('recurrence');
      expect(typeof taskModel.recurrence).toBe('object');
      expect(taskModel.recurrence).toHaveProperty('enabled');
      expect(taskModel.recurrence.enabled).toBe(false);
      expect(taskModel.recurrence).toHaveProperty('type');
      expect(taskModel.recurrence.type).toBe('');
      expect(taskModel.recurrence).toHaveProperty('interval');
      expect(taskModel.recurrence.interval).toBe(1);
      expect(taskModel.recurrence).toHaveProperty('startDate');
      expect(taskModel.recurrence.startDate).toBe(null);
      expect(taskModel.recurrence).toHaveProperty('endDate');
      expect(taskModel.recurrence.endDate).toBe(null);
      expect(taskModel.recurrence).toHaveProperty('dueOffset');
      expect(taskModel.recurrence.dueOffset).toBe(0);
      expect(taskModel.recurrence).toHaveProperty('dueOffsetUnit');
      expect(taskModel.recurrence.dueOffsetUnit).toBe('days');
    });
  });

  describe('Edge Cases - Firestore Compatibility', () => {
    it('should not have undefined fields (Firestore does not allow undefined)', () => {
      const modelKeys = Object.keys(taskModel);
      const hasUndefined = modelKeys.some(key => taskModel[key] === undefined);
      expect(hasUndefined).toBe(false);
    });

    it('should have arrays initialized as empty arrays', () => {
      expect(taskModel.collaborators).toEqual([]);
      expect(taskModel.attachments).toEqual([]);
      expect(taskModel.subtasks).toEqual([]);
      expect(taskModel.statusHistory).toEqual([]);
    });

    it('should handle null values for optional fields correctly', () => {
      expect(taskModel.projectId).toBe(null);
      expect(taskModel.dueDate).toBe(null);
      expect(taskModel.startTime).toBe(null);
      expect(taskModel.endTime).toBe(null);
      expect(taskModel.assigneeId).toBe(null);
      expect(taskModel.createdAt).toBe(null);
      expect(taskModel.updatedAt).toBe(null);
      expect(taskModel.recurrence.startDate).toBe(null);
      expect(taskModel.recurrence.endDate).toBe(null);
    });
  });

  describe('Data Type Validation', () => {
    it('should have proper types for all fields', () => {
      expect(typeof taskModel.title).toBe('string');
      expect(typeof taskModel.description).toBe('string');
      expect(typeof taskModel.type).toBe('string');
      expect(typeof taskModel.status).toBe('string');
      expect(typeof taskModel.priority).toBe('number');
      expect(Array.isArray(taskModel.collaborators)).toBe(true);
      expect(Array.isArray(taskModel.attachments)).toBe(true);
      expect(Array.isArray(taskModel.subtasks)).toBe(true);
      expect(typeof taskModel.archived).toBe('boolean');
      expect(Array.isArray(taskModel.statusHistory)).toBe(true);
      expect(typeof taskModel.recurrence).toBe('object');
      expect(typeof taskModel.recurrence.enabled).toBe('boolean');
      expect(typeof taskModel.recurrence.type).toBe('string');
      expect(typeof taskModel.recurrence.interval).toBe('number');
      expect(typeof taskModel.recurrence.dueOffset).toBe('number');
      expect(typeof taskModel.recurrence.dueOffsetUnit).toBe('string');
    });

    it('should have priority as a number (not string)', () => {
      expect(typeof taskModel.priority).toBe('number');
      expect(taskModel.priority).toBe(1);
    });

    it('should have archived as a boolean (not string or number)', () => {
      expect(typeof taskModel.archived).toBe('boolean');
      expect(taskModel.archived).toBe(false);
    });
  });

  describe('Default Value Edge Cases', () => {
    it('should have priority default value of 1 (highest priority)', () => {
      expect(taskModel.priority).toBe(1);
    });

    it('should have archived default value of false', () => {
      expect(taskModel.archived).toBe(false);
    });

    it('should have recurrence enabled default to false', () => {
      expect(taskModel.recurrence.enabled).toBe(false);
    });

    it('should have recurrence interval default to 1', () => {
      expect(taskModel.recurrence.interval).toBe(1);
    });

    it('should have recurrence dueOffset default to 0', () => {
      expect(taskModel.recurrence.dueOffset).toBe(0);
    });

    it('should have recurrence dueOffsetUnit default to days', () => {
      expect(taskModel.recurrence.dueOffsetUnit).toBe('days');
    });

    it('should have empty string defaults for text fields', () => {
      expect(taskModel.title).toBe('');
      expect(taskModel.description).toBe('');
      expect(taskModel.type).toBe('');
      expect(taskModel.status).toBe('');
      expect(taskModel.recurrence.type).toBe('');
    });
  });

  describe('Model Immutability and Cloning', () => {
    it('should allow shallow cloning without modifying original', () => {
      const cloned = { ...taskModel };
      cloned.title = 'New Title';
      expect(taskModel.title).toBe('');
      expect(cloned.title).toBe('New Title');
    });

    it('should allow deep cloning of nested objects', () => {
      const cloned = JSON.parse(JSON.stringify(taskModel));
      cloned.recurrence.enabled = true;
      cloned.recurrence.type = 'daily';
      expect(taskModel.recurrence.enabled).toBe(false);
      expect(taskModel.recurrence.type).toBe('');
      expect(cloned.recurrence.enabled).toBe(true);
      expect(cloned.recurrence.type).toBe('daily');
    });

    it('should handle nested array cloning correctly', () => {
      const cloned = JSON.parse(JSON.stringify(taskModel));
      cloned.collaborators.push({ name: 'Test User', permission: 'Edit' });
      cloned.subtasks.push({ title: 'Test Subtask' });
      expect(taskModel.collaborators.length).toBe(0);
      expect(taskModel.subtasks.length).toBe(0);
      expect(cloned.collaborators.length).toBe(1);
      expect(cloned.subtasks.length).toBe(1);
    });
  });

  describe('Array Field Defaults and Mutations', () => {
    it('should have empty arrays that can be modified without affecting the model', () => {
      const instance1 = { ...taskModel, collaborators: [...taskModel.collaborators] };
      const instance2 = { ...taskModel, collaborators: [...taskModel.collaborators] };
      
      instance1.collaborators.push({ name: 'User1', permission: 'Edit' });
      instance2.collaborators.push({ name: 'User2', permission: 'View' });
      
      expect(taskModel.collaborators).toEqual([]);
      expect(instance1.collaborators.length).toBe(1);
      expect(instance2.collaborators.length).toBe(1);
    });

    it('should handle statusHistory array correctly', () => {
      const instance = { ...taskModel, statusHistory: [...taskModel.statusHistory] };
      instance.statusHistory.push({
        timestamp: new Date(),
        oldStatus: 'Unassigned',
        newStatus: 'Ongoing'
      });
      expect(taskModel.statusHistory).toEqual([]);
      expect(instance.statusHistory.length).toBe(1);
    });
  });

  describe('Edge Cases - Null and Empty Values', () => {
    it('should handle all null values gracefully', () => {
      const nullFields = ['projectId', 'dueDate', 'startTime', 'endTime', 'assigneeId', 'createdAt', 'updatedAt'];
      nullFields.forEach(field => {
        expect(taskModel[field]).toBe(null);
        expect(taskModel[field]).not.toBeUndefined();
      });
    });

    it('should handle empty strings for text fields', () => {
      const emptyStringFields = ['title', 'description', 'type', 'status'];
      emptyStringFields.forEach(field => {
        expect(taskModel[field]).toBe('');
        expect(typeof taskModel[field]).toBe('string');
      });
    });

    it('should handle nested null values in recurrence object', () => {
      expect(taskModel.recurrence.startDate).toBe(null);
      expect(taskModel.recurrence.endDate).toBe(null);
      expect(taskModel.recurrence.startDate).not.toBeUndefined();
      expect(taskModel.recurrence.endDate).not.toBeUndefined();
    });
  });
});

