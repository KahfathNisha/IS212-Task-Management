// Firestore and Admin mocks used by taskController
const mockTasksCollection = {
  get: jest.fn(),
  add: jest.fn(),
  doc: jest.fn(),
  where: jest.fn().mockReturnThis(),
};

const mockProjectsCollection = {
  doc: jest.fn(),
};

const mockRecurringTasksCollection = {
  get: jest.fn(),
  doc: jest.fn(),
  where: jest.fn().mockReturnThis(),
};

const mockUsersCollection = {
  doc: jest.fn(),
  where: jest.fn().mockReturnThis(),
  get: jest.fn(),
};

const mockDocRef = {
  get: jest.fn(),
  update: jest.fn(),
};

const mockProjectDocRef = {
  get: jest.fn(),
  update: jest.fn(),
};

const mockBatch = {
  update: jest.fn(),
  commit: jest.fn(),
};

jest.mock('../src/config/firebase', () => {
  const nowDate = new Date('2024-06-01T10:00:00Z');
  
  const TimestampMock = {
    now: jest.fn(() => ({ toDate: () => nowDate })),
    fromDate: jest.fn((d) => ({ toDate: () => d })),
  };

  const FieldValueMock = {
    delete: jest.fn(() => '__DEL__'),
  };

  return {
    db: {
      collection: jest.fn((name) => {
        if (name === 'tasks') return mockTasksCollection;
        if (name === 'projects') return mockProjectsCollection;
        if (name === 'recurringTasks') return mockRecurringTasksCollection;
        if (name === 'users') return mockUsersCollection;
        return {};
      }),
      batch: jest.fn(() => mockBatch),
    },
    admin: {
      firestore: {
        Timestamp: TimestampMock,
        FieldValue: FieldValueMock,
      },
    },
  };
});

const taskController = require('../src/controllers/taskController');

function ts(dateString) {
  const d = new Date(dateString);
  return { toDate: () => d };
}

describe('taskController', () => {
  let req;
  let res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = { user: { email: 'u@example.com', name: 'Alice' }, params: { id: 't1' }, body: {} };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };

    mockTasksCollection.doc.mockReturnValue(mockDocRef);
    mockProjectsCollection.doc.mockReturnValue(mockProjectDocRef);
  });

  describe('createTask', () => {
    it('validates required fields', async () => {
      req.body = { title: '  ', taskOwner: 'Alice', taskOwnerDepartment: 'Eng', dueDate: '2024-06-10', priority: 'High' };
      await taskController.createTask(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Title is required' });
    });

    it('rejects invalid dueDate', async () => {
      req.body = { title: 'Task', taskOwner: 'Alice', taskOwnerDepartment: 'Eng', dueDate: 'NaN', priority: 'Low' };
      await taskController.createTask(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid dueDate' });
    });

    it('creates a task and updates project stats', async () => {
      req.body = { title: 'Task', taskOwner: 'Alice', taskOwnerDepartment: 'Eng', dueDate: '2024-06-10', priority: 'Low', projectId: 'p1' };

      mockTasksCollection.add.mockResolvedValueOnce({ id: 'new-task' });
      // updateProjectStats internals
      mockProjectDocRef.get.mockResolvedValueOnce({ exists: true, data: () => ({}) });
      mockTasksCollection.where.mockReturnThis();
      mockTasksCollection.get.mockResolvedValueOnce({
        docs: [
          { id: 't1', data: () => ({ status: 'Completed' }) },
          { id: 't2', data: () => ({ status: 'Unassigned' }) },
        ],
      });
      mockProjectDocRef.update.mockResolvedValueOnce();

      await taskController.createTask(req, res);

      expect(mockTasksCollection.add).toHaveBeenCalled();
      expect(mockProjectDocRef.update).toHaveBeenCalledWith(
        expect.objectContaining({ totalTasks: 2, completedTasks: 1, progress: 50 })
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ id: 'new-task', message: 'Task created successfully' });
    });
  });

  describe('getTask', () => {
    it('404 when missing', async () => {
      mockDocRef.get.mockResolvedValueOnce({ exists: false });
      await taskController.getTask(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Task not found' });
    });

    it('returns task with ISO timestamps', async () => {
      mockDocRef.get.mockResolvedValueOnce({
        exists: true,
        data: () => ({ title: 'X', dueDate: ts('2024-06-11T00:00:00Z'), createdAt: ts('2024-06-01T00:00:00Z') }),
      });
      await taskController.getTask(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
      const payload = res.json.mock.calls[0][0];
      expect(payload.dueDate).toMatch(/^2024-06-11/);
      expect(payload.createdAt).toMatch(/^2024-06-01/);
    });
  });

  describe('getAllTasks', () => {
    it('returns mapped tasks with formatted timestamps', async () => {
      mockTasksCollection.get.mockResolvedValueOnce({
        docs: [
          { id: 'a', data: () => ({ title: 'A', dueDate: ts('2024-06-10'), createdAt: ts('2024-06-01'), updatedAt: ts('2024-06-02') }) },
        ],
      });
      await taskController.getAllTasks(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
      const payload = res.json.mock.calls[0][0];
      expect(payload[0].id).toBe('a');
      expect(payload[0].dueDate).toMatch(/^2024-06-10/);
    });
  });

  describe('updateTask', () => {
    it('requires authenticated user name', async () => {
      req.user = {};
      await taskController.updateTask(req, res);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Authentication required or user name is missing.' });
    });

    it('404 when task not found', async () => {
      mockDocRef.get.mockResolvedValueOnce({ exists: false });
      await taskController.updateTask(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Task not found' });
    });

    it('forbids due date change if not owner', async () => {
      mockDocRef.get.mockResolvedValueOnce({
        exists: true,
        data: () => ({ dueDate: ts('2024-06-20'), taskOwner: 'Bob' }),
      });
      req.body = { dueDate: '2024-06-21' };
      await taskController.updateTask(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ message: 'Forbidden: Only the task owner can change the due date.' });
    });

    it('updates allowed fields and returns 200', async () => {
      mockDocRef.get.mockResolvedValueOnce({
        exists: true,
        data: () => ({ title: 'Old', status: 'Unassigned', dueDate: ts('2024-06-20'), taskOwner: 'Alice' }),
      });
      req.body = { title: 'New Title' };
      await taskController.updateTask(req, res);
      expect(mockDocRef.update).toHaveBeenCalledWith(expect.objectContaining({ title: 'New Title' }));
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'Task updated successfully' });
    });
  });

  describe('updateTaskStatus', () => {
    it('updates status and returns 200', async () => {
      mockDocRef.get.mockResolvedValueOnce({
        data: () => ({ title: 'A', status: 'Unassigned', projectId: 'p1' }),
      });
      req.body = { status: 'Completed' };
      await taskController.updateTaskStatus(req, res);
      expect(mockDocRef.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'Completed' }));
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'Task status updated' });
    });
  });

  describe('assignTask', () => {
    it('assigns task', async () => {
      req.body = { assigneeId: 'user1' };
      await taskController.assignTask(req, res);
      expect(mockDocRef.update).toHaveBeenCalledWith(expect.objectContaining({ assigneeId: 'user1' }));
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'Task assigned successfully' });
    });
  });

  describe('archive/unarchive', () => {
    it('archives a task and returns 200', async () => {
      mockDocRef.get.mockResolvedValueOnce({ data: () => ({ title: 'A', projectId: 'p1' }) });
      await taskController.archiveTask(req, res);
      expect(mockDocRef.update).toHaveBeenCalledWith(expect.objectContaining({ archived: true }));
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'Task archived' });
    });

    it('unarchives a task and returns 200', async () => {
      mockDocRef.get.mockResolvedValueOnce({ data: () => ({ title: 'A', projectId: 'p1' }) });
      await taskController.unarchiveTask(req, res);
      expect(mockDocRef.update).toHaveBeenCalledWith(expect.objectContaining({ archived: false }));
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'Task unarchived' });
    });
  });

  describe('recurring tasks', () => {
    it('getAllRecurringTasks returns list with formatted timestamps', async () => {
      // Setup the mock for where().get() chain
      mockRecurringTasksCollection.where.mockReturnValue(mockRecurringTasksCollection);
      mockRecurringTasksCollection.get.mockResolvedValueOnce({
        docs: [
          { 
            id: 'r1', 
            data: () => ({ 
              taskOwner: 'u@example.com',
              createdAt: ts('2024-01-01'), 
              updatedAt: ts('2024-01-02') 
            }) 
          },
        ],
      });
      
      await taskController.getAllRecurringTasks(req, res);
      
      expect(mockRecurringTasksCollection.where).toHaveBeenCalledWith('taskOwner', '==', 'u@example.com');
      expect(res.status).toHaveBeenCalledWith(200);
      const payload = res.json.mock.calls[0][0];
      expect(Array.isArray(payload)).toBe(true);
      expect(payload[0].id).toBe('r1');
      expect(typeof payload[0].createdAt).toBe('string');
    });

    it('updateRecurringTask updates master and future instances', async () => {
      const recurringDocRef = { update: jest.fn() };
      mockRecurringTasksCollection.doc.mockReturnValue(recurringDocRef);

      const taskDoc1 = { data: () => ({ status: 'Unassigned', dueDate: ts('2099-01-01') }), ref: { id: 'a' } };
      const taskDoc2 = { data: () => ({ status: 'Completed', dueDate: ts('2099-01-02') }), ref: { id: 'b' } };
      mockTasksCollection.where.mockReturnThis();
      mockTasksCollection.get.mockResolvedValueOnce({ forEach: (fn) => [taskDoc1, taskDoc2].forEach(fn) });

      req.params.id = 'rec-1';
      req.body = { recurrence: { enabled: true, type: 'weekly' }, taskOwner: 'Alice' };

      await taskController.updateRecurringTask(req, res);

      expect(recurringDocRef.update).toHaveBeenCalledWith(expect.objectContaining({ recurrence: req.body.recurrence }));
      expect(mockBatch.update).toHaveBeenCalledTimes(1); // Only future, not completed
      expect(mockBatch.commit).toHaveBeenCalledTimes(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'Recurrence updated successfully' });
    });
  });
});


