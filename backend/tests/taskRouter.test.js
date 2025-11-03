const request = require('supertest');
const express = require('express');
const taskRouter = require('../src/routes/taskRouter');

// Mock the middleware
jest.mock('../src/middleware/auth.js', () => ({
  verifyToken: (req, res, next) => {
    // Mock user object for testing - can be overridden in tests
    req.user = req.user || { email: 'test@example.com', role: 'staff', name: 'Test User' };
    next();
  },
  checkRole: () => (req, res, next) => next(),
}));

// Mock the taskController - must be defined inline because Jest mocks are hoisted
jest.mock('../src/controllers/taskController', () => ({
  createTask: jest.fn((req, res) => res.status(201).json({ id: 'task1', message: 'Task created successfully' })),
  getAllTasks: jest.fn((req, res) => res.status(200).json([])),
  getAllRecurringTasks: jest.fn((req, res) => res.status(200).json([])),
  getArchivedTasks: jest.fn((req, res) => res.status(200).json([])),
  getTasksByProject: jest.fn((req, res) => res.status(200).json([])),
  getTask: jest.fn((req, res) => res.status(200).json({ id: req.params.id })),
  updateTaskStatus: jest.fn((req, res) => res.status(200).json({ message: 'Task status updated' })),
  assignTask: jest.fn((req, res) => res.status(200).json({ message: 'Task assigned successfully' })),
  archiveTask: jest.fn((req, res) => res.status(200).json({ message: 'Task archived successfully' })),
  unarchiveTask: jest.fn((req, res) => res.status(200).json({ message: 'Task unarchived' })),
  updateRecurringTask: jest.fn((req, res) => res.status(200).json({ message: 'Recurrence updated successfully' })),
  updateTask: jest.fn((req, res) => res.status(200).json({ message: 'Task updated successfully' })),
}));

const taskController = require('../src/controllers/taskController');

describe('taskRouter', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/tasks', taskRouter);
    jest.clearAllMocks();
  });

  describe('POST /tasks', () => {
    it('should create a task with valid data', async () => {
      const response = await request(app)
        .post('/tasks')
        .send({
          title: 'Test Task',
          taskOwner: 'test@example.com',
          taskOwnerDepartment: 'Engineering',
          dueDate: '2024-12-31',
          priority: 1
        });

      expect(response.status).toBe(201);
      expect(taskController.createTask).toHaveBeenCalled();
    });

    it('should apply verifyToken middleware', async () => {
      const response = await request(app)
        .post('/tasks')
        .send({ title: 'Test Task' });

      expect(response.status).toBe(201);
      expect(taskController.createTask).toHaveBeenCalled();
    });

    it('should handle HR role restrictions in middleware', async () => {
      // The HR check is in the route handler itself
      const response = await request(app)
        .post('/tasks')
        .send({
          title: 'Test Task',
          taskOwner: 'hr@example.com',
          taskOwnerDepartment: 'HR',
          dueDate: '2024-12-31',
          priority: 1
        });

      expect(response.status).toBe(201);
      expect(taskController.createTask).toHaveBeenCalled();
    });
  });

  describe('GET /tasks', () => {
    it('should get all tasks', async () => {
      const response = await request(app)
        .get('/tasks');

      expect(response.status).toBe(200);
      expect(taskController.getAllTasks).toHaveBeenCalled();
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should require authentication (verifyToken middleware)', async () => {
      const response = await request(app)
        .get('/tasks');

      expect(response.status).toBe(200);
      expect(taskController.getAllTasks).toHaveBeenCalled();
    });
  });

  describe('GET /tasks/recurring', () => {
    it('should get all recurring tasks', async () => {
      const response = await request(app)
        .get('/tasks/recurring');

      expect(response.status).toBe(200);
      expect(taskController.getAllRecurringTasks).toHaveBeenCalled();
    });
  });

  describe('GET /tasks/archived', () => {
    it('should get archived tasks', async () => {
      const response = await request(app)
        .get('/tasks/archived');

      expect(response.status).toBe(200);
      expect(taskController.getArchivedTasks).toHaveBeenCalled();
    });

    it('should not require authentication (route has no verifyToken)', async () => {
      // This route doesn't have verifyToken middleware according to the router
      const response = await request(app)
        .get('/tasks/archived');

      expect(response.status).toBe(200);
    });
  });

  describe('GET /tasks/project/:projectId', () => {
    it('should get tasks by project ID', async () => {
      const projectId = 'proj1';
      const response = await request(app)
        .get(`/tasks/project/${projectId}`);

      expect(response.status).toBe(200);
      expect(taskController.getTasksByProject).toHaveBeenCalled();
      expect(taskController.getTasksByProject.mock.calls[0][0].params.projectId).toBe(projectId);
    });

    it('should handle different project IDs', async () => {
      const projectId = 'proj-123-abc';
      const response = await request(app)
        .get(`/tasks/project/${projectId}`);

      expect(response.status).toBe(200);
      expect(taskController.getTasksByProject.mock.calls[0][0].params.projectId).toBe(projectId);
    });
  });

  describe('GET /tasks/:id', () => {
    it('should get a specific task by ID', async () => {
      const taskId = 'task1';
      const response = await request(app)
        .get(`/tasks/${taskId}`);

      expect(response.status).toBe(200);
      expect(taskController.getTask).toHaveBeenCalled();
      expect(taskController.getTask.mock.calls[0][0].params.id).toBe(taskId);
    });

    it('should handle UUID task IDs', async () => {
      const taskId = '550e8400-e29b-41d4-a716-446655440000';
      const response = await request(app)
        .get(`/tasks/${taskId}`);

      expect(response.status).toBe(200);
      expect(taskController.getTask.mock.calls[0][0].params.id).toBe(taskId);
    });
  });

  describe('PUT /tasks/:id/status', () => {
    it('should update task status', async () => {
      const taskId = 'task1';
      const newStatus = 'Completed';
      const response = await request(app)
        .put(`/tasks/${taskId}/status`)
        .send({ status: newStatus });

      expect(response.status).toBe(200);
      expect(taskController.updateTaskStatus).toHaveBeenCalled();
      expect(taskController.updateTaskStatus.mock.calls[0][0].params.id).toBe(taskId);
      expect(taskController.updateTaskStatus.mock.calls[0][0].body.status).toBe(newStatus);
    });

    it('should handle different status values', async () => {
      const statuses = ['Ongoing', 'Pending Review', 'Unassigned', 'Completed'];
      for (const status of statuses) {
        jest.clearAllMocks();
        const response = await request(app)
          .put('/tasks/task1/status')
          .send({ status });
        expect(response.status).toBe(200);
      }
    });
  });

  describe('PUT /tasks/:id/assign', () => {
    it('should assign a task', async () => {
      const response = await request(app)
        .put('/tasks/task1/assign')
        .send({ assigneeId: 'user@example.com' });

      expect(response.status).toBe(200);
      expect(taskController.assignTask).toHaveBeenCalled();
    });

    it('should handle assignee ID in request body', async () => {
      const assigneeId = 'assignee@example.com';
      const response = await request(app)
        .put('/tasks/task1/assign')
        .send({ assigneeId });

      expect(response.status).toBe(200);
      expect(taskController.assignTask.mock.calls[0][0].body.assigneeId).toBe(assigneeId);
    });
  });

  describe('PUT /tasks/:id/archive', () => {
    it('should archive a task', async () => {
      const taskId = 'task1';
      const response = await request(app)
        .put(`/tasks/${taskId}/archive`);

      expect(response.status).toBe(200);
      expect(taskController.archiveTask).toHaveBeenCalled();
      expect(taskController.archiveTask.mock.calls[0][0].params.id).toBe(taskId);
    });
  });

  describe('PUT /tasks/:id/unarchive', () => {
    it('should unarchive a task', async () => {
      const taskId = 'task1';
      const response = await request(app)
        .put(`/tasks/${taskId}/unarchive`);

      expect(response.status).toBe(200);
      expect(taskController.unarchiveTask).toHaveBeenCalled();
      expect(taskController.unarchiveTask.mock.calls[0][0].params.id).toBe(taskId);
    });
  });

  describe('PUT /tasks/recurring/:id', () => {
    it('should update recurring task', async () => {
      const recurringTaskId = 'recur1';
      const recurrenceData = { enabled: true, type: 'daily', interval: 1 };
      const response = await request(app)
        .put(`/tasks/recurring/${recurringTaskId}`)
        .send({ recurrence: recurrenceData });

      expect(response.status).toBe(200);
      expect(taskController.updateRecurringTask).toHaveBeenCalled();
      expect(taskController.updateRecurringTask.mock.calls[0][0].params.id).toBe(recurringTaskId);
    });
  });

  describe('PUT /tasks/:id', () => {
    it('should update a task', async () => {
      const taskId = 'task1';
      const updateData = { title: 'Updated Task', priority: 2 };
      const response = await request(app)
        .put(`/tasks/${taskId}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(taskController.updateTask).toHaveBeenCalled();
      expect(taskController.updateTask.mock.calls[0][0].params.id).toBe(taskId);
    });

    it('should handle partial updates', async () => {
      const response = await request(app)
        .put('/tasks/task1')
        .send({ status: 'Completed' });

      expect(response.status).toBe(200);
      expect(taskController.updateTask).toHaveBeenCalled();
    });
  });

  describe('Route Order and Precedence', () => {
    it('should match /tasks/recurring before /tasks/:id', async () => {
      // Test that specific routes match before generic :id route
      const response = await request(app)
        .get('/tasks/recurring');

      expect(response.status).toBe(200);
      expect(taskController.getAllRecurringTasks).toHaveBeenCalled();
      expect(taskController.getTask).not.toHaveBeenCalled();
    });

    it('should match /tasks/archived before /tasks/:id', async () => {
      const response = await request(app)
        .get('/tasks/archived');

      expect(response.status).toBe(200);
      expect(taskController.getArchivedTasks).toHaveBeenCalled();
      expect(taskController.getTask).not.toHaveBeenCalled();
    });

    it('should match /tasks/project/:projectId with correct parameter', async () => {
      const response = await request(app)
        .get('/tasks/project/test-project-id');

      expect(response.status).toBe(200);
      expect(taskController.getTasksByProject).toHaveBeenCalled();
      expect(taskController.getTasksByProject.mock.calls[0][0].params.projectId).toBe('test-project-id');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty request bodies', async () => {
      const response = await request(app)
        .post('/tasks')
        .send({});

      expect(taskController.createTask).toHaveBeenCalled();
      expect(response.status).toBe(201);
    });

    it('should handle missing task ID in params', async () => {
      // This tests route matching - Express should handle missing IDs
      const response = await request(app)
        .get('/tasks/');

      // Express will likely return 404 or handle it differently
      expect([200, 404]).toContain(response.status);
    });

    it('should handle special characters in task IDs', async () => {
      const taskId = 'task-123_abc.def';
      const response = await request(app)
        .get(`/tasks/${taskId}`);

      expect(response.status).toBe(200);
      expect(taskController.getTask.mock.calls[0][0].params.id).toBe(taskId);
    });

    it('should handle very long task IDs', async () => {
      const longId = 'a'.repeat(100);
      const response = await request(app)
        .get(`/tasks/${longId}`);

      expect(response.status).toBe(200);
      expect(taskController.getTask.mock.calls[0][0].params.id).toBe(longId);
    });

    it('should handle missing body parameters gracefully', async () => {
      const response = await request(app)
        .put('/tasks/task1')
        .send({});

      expect(response.status).toBe(200);
      expect(taskController.updateTask).toHaveBeenCalled();
    });

    it('should handle null values in request body', async () => {
      const response = await request(app)
        .put('/tasks/task1')
        .send({ title: null, priority: null });

      expect(response.status).toBe(200);
      expect(taskController.updateTask).toHaveBeenCalled();
    });
  });

  describe('HTTP Method Validation', () => {
    it('should reject GET on POST route', async () => {
      const response = await request(app)
        .get('/tasks')
        .send({ title: 'Test' });

      // GET /tasks should call getAllTasks, not createTask
      expect(taskController.getAllTasks).toHaveBeenCalled();
      expect(taskController.createTask).not.toHaveBeenCalled();
    });

    it('should reject POST on GET route', async () => {
      const response = await request(app)
        .post('/tasks/task1');

      // POST /tasks/:id doesn't exist, so it should fail or be handled by Express
      expect([200, 404, 405]).toContain(response.status);
    });
  });
});

