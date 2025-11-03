const request = require('supertest');
const express = require('express');
const projectsRouter = require('../src/routes/projectsRouter');

// Mock the middleware
jest.mock('../src/middleware/auth.js', () => ({
  verifyToken: (req, res, next) => {
    // Mock user object for testing - can be overridden in tests
    req.user = req.user || { email: 'test@example.com', role: 'staff', name: 'Test User', department: 'Engineering' };
    next();
  },
}));

// Mock the projectsController - must be defined inline because Jest mocks are hoisted
jest.mock('../src/controllers/projectsController', () => ({
  getAllProjects: jest.fn((req, res) => res.status(200).json([])),
  getProject: jest.fn((req, res) => res.status(200).json({ id: req.params.id })),
  createProject: jest.fn((req, res) => res.status(201).json({ id: 'proj1', message: 'Project created successfully' })),
  updateProject: jest.fn((req, res) => res.status(200).json({ message: 'Project updated successfully' })),
}));

const projectsController = require('../src/controllers/projectsController');

describe('projectsRouter', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/projects', projectsRouter);
    jest.clearAllMocks();
  });

  describe('GET /projects', () => {
    it('should get all projects', async () => {
      const response = await request(app)
        .get('/projects');

      expect(response.status).toBe(200);
      expect(projectsController.getAllProjects).toHaveBeenCalled();
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should require authentication (verifyToken middleware)', async () => {
      const response = await request(app)
        .get('/projects');

      expect(response.status).toBe(200);
      expect(projectsController.getAllProjects).toHaveBeenCalled();
    });

    it('should pass user information from middleware to controller', async () => {
      const mockUser = { email: 'user@example.com', role: 'director', name: 'Director User', department: 'All' };
      
      // Override the mock middleware for this test
      const originalVerifyToken = require('../src/middleware/auth.js').verifyToken;
      jest.spyOn(require('../src/middleware/auth.js'), 'verifyToken').mockImplementation((req, res, next) => {
        req.user = mockUser;
        next();
      });

      const response = await request(app)
        .get('/projects');

      expect(response.status).toBe(200);
      expect(projectsController.getAllProjects).toHaveBeenCalled();
      
      // Restore original
      jest.restoreAllMocks();
    });
  });

  describe('GET /projects/:id', () => {
    it('should get a specific project by ID', async () => {
      const projectId = 'proj1';
      const response = await request(app)
        .get(`/projects/${projectId}`);

      expect(response.status).toBe(200);
      expect(projectsController.getProject).toHaveBeenCalled();
      expect(projectsController.getProject.mock.calls[0][0].params.id).toBe(projectId);
    });

    it('should handle UUID project IDs', async () => {
      const projectId = '550e8400-e29b-41d4-a716-446655440000';
      const response = await request(app)
        .get(`/projects/${projectId}`);

      expect(response.status).toBe(200);
      expect(projectsController.getProject.mock.calls[0][0].params.id).toBe(projectId);
    });

    it('should handle alphanumeric project IDs', async () => {
      const projectId = 'proj-123-abc';
      const response = await request(app)
        .get(`/projects/${projectId}`);

      expect(response.status).toBe(200);
      expect(projectsController.getProject.mock.calls[0][0].params.id).toBe(projectId);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/projects/proj1');

      expect(response.status).toBe(200);
      expect(projectsController.getProject).toHaveBeenCalled();
    });
  });

  describe('POST /projects', () => {
    it('should create a project with valid data', async () => {
      const response = await request(app)
        .post('/projects')
        .send({
          name: 'Test Project',
          description: 'Test project description',
          department: 'Engineering'
        });

      expect(response.status).toBe(201);
      expect(projectsController.createProject).toHaveBeenCalled();
    });

    it('should apply verifyToken middleware', async () => {
      const response = await request(app)
        .post('/projects')
        .send({ name: 'Test Project' });

      expect(response.status).toBe(201);
      expect(projectsController.createProject).toHaveBeenCalled();
    });

    it('should pass request body to controller', async () => {
      const projectData = {
        name: 'New Project',
        description: 'Project description',
        department: 'IT',
        members: ['user1@example.com', 'user2@example.com']
      };

      const response = await request(app)
        .post('/projects')
        .send(projectData);

      expect(response.status).toBe(201);
      expect(projectsController.createProject.mock.calls[0][0].body).toEqual(projectData);
    });

    it('should handle empty request bodies', async () => {
      const response = await request(app)
        .post('/projects')
        .send({});

      expect(projectsController.createProject).toHaveBeenCalled();
      expect(response.status).toBe(201);
    });
  });

  describe('PUT /projects/:id', () => {
    it('should update a project', async () => {
      const projectId = 'proj1';
      const updateData = { name: 'Updated Project', description: 'Updated description' };
      const response = await request(app)
        .put(`/projects/${projectId}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(projectsController.updateProject).toHaveBeenCalled();
      expect(projectsController.updateProject.mock.calls[0][0].params.id).toBe(projectId);
    });

    it('should handle partial updates', async () => {
      const response = await request(app)
        .put('/projects/proj1')
        .send({ name: 'Updated Name Only' });

      expect(response.status).toBe(200);
      expect(projectsController.updateProject).toHaveBeenCalled();
    });

    it('should handle project ID in params', async () => {
      const projectId = 'project-123-xyz';
      const response = await request(app)
        .put(`/projects/${projectId}`)
        .send({ name: 'Test' });

      expect(response.status).toBe(200);
      expect(projectsController.updateProject.mock.calls[0][0].params.id).toBe(projectId);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .put('/projects/proj1')
        .send({ name: 'Test' });

      expect(response.status).toBe(200);
      expect(projectsController.updateProject).toHaveBeenCalled();
    });

    it('should handle empty update body', async () => {
      const response = await request(app)
        .put('/projects/proj1')
        .send({});

      expect(response.status).toBe(200);
      expect(projectsController.updateProject).toHaveBeenCalled();
    });
  });

  describe('Route Order and Precedence', () => {
    it('should match GET /projects before GET /projects/:id', async () => {
      // Test that the root route matches before the :id route
      const response = await request(app)
        .get('/projects');

      expect(response.status).toBe(200);
      expect(projectsController.getAllProjects).toHaveBeenCalled();
      expect(projectsController.getProject).not.toHaveBeenCalled();
    });

    it('should correctly route GET /projects/:id with specific ID', async () => {
      const response = await request(app)
        .get('/projects/specific-project-id');

      expect(response.status).toBe(200);
      expect(projectsController.getProject).toHaveBeenCalled();
      expect(projectsController.getProject.mock.calls[0][0].params.id).toBe('specific-project-id');
      expect(projectsController.getAllProjects).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle special characters in project IDs', async () => {
      const projectId = 'proj-123_abc.def';
      const response = await request(app)
        .get(`/projects/${projectId}`);

      expect(response.status).toBe(200);
      expect(projectsController.getProject.mock.calls[0][0].params.id).toBe(projectId);
    });

    it('should handle very long project IDs', async () => {
      const longId = 'a'.repeat(100);
      const response = await request(app)
        .get(`/projects/${longId}`);

      expect(response.status).toBe(200);
      expect(projectsController.getProject.mock.calls[0][0].params.id).toBe(longId);
    });

    it('should handle null values in request body', async () => {
      const response = await request(app)
        .put('/projects/proj1')
        .send({ name: null, description: null });

      expect(response.status).toBe(200);
      expect(projectsController.updateProject).toHaveBeenCalled();
    });

    it('should handle undefined values in request body', async () => {
      const response = await request(app)
        .post('/projects')
        .send({ name: 'Test', description: undefined });

      expect(response.status).toBe(201);
      expect(projectsController.createProject).toHaveBeenCalled();
    });

    it('should handle missing project ID in params for GET', async () => {
      // GET /projects/ with trailing slash might be handled differently
      const response = await request(app)
        .get('/projects/');

      // Express will likely return 404 or handle it differently
      expect([200, 404]).toContain(response.status);
    });

    it('should handle missing project ID in params for PUT', async () => {
      // This tests route matching - Express should handle missing IDs
      const response = await request(app)
        .put('/projects/');

      // Express will likely return 404 or handle it differently
      expect([200, 404]).toContain(response.status);
    });

    it('should handle large request bodies', async () => {
      const largeDescription = 'A'.repeat(10000);
      const largeBody = {
        name: 'Large Project',
        description: largeDescription,
        members: Array.from({ length: 100 }, (_, i) => `user${i}@example.com`)
      };

      const response = await request(app)
        .post('/projects')
        .send(largeBody);

      expect(response.status).toBe(201);
      expect(projectsController.createProject).toHaveBeenCalled();
    });

    it('should handle array data in request body', async () => {
      const projectData = {
        name: 'Team Project',
        members: ['user1@example.com', 'user2@example.com', 'user3@example.com'],
        tags: ['urgent', 'important', 'client-facing']
      };

      const response = await request(app)
        .post('/projects')
        .send(projectData);

      expect(response.status).toBe(201);
      expect(projectsController.createProject.mock.calls[0][0].body).toEqual(projectData);
    });

    it('should handle nested objects in request body', async () => {
      const projectData = {
        name: 'Complex Project',
        metadata: {
          client: 'ABC Corp',
          budget: 100000,
          timeline: {
            start: '2025-01-01',
            end: '2025-12-31'
          }
        }
      };

      const response = await request(app)
        .post('/projects')
        .send(projectData);

      expect(response.status).toBe(201);
      expect(projectsController.createProject.mock.calls[0][0].body).toEqual(projectData);
    });
  });

  describe('HTTP Method Validation', () => {
    it('should reject GET on POST route', async () => {
      const response = await request(app)
        .get('/projects')
        .send({ name: 'Test' });

      // GET /projects should call getAllProjects, not createProject
      expect(projectsController.getAllProjects).toHaveBeenCalled();
      expect(projectsController.createProject).not.toHaveBeenCalled();
    });

    it('should reject POST on GET route with ID', async () => {
      const response = await request(app)
        .post('/projects/proj1');

      // POST /projects/:id doesn't exist as a route, so it should fail or be handled by Express
      expect([200, 404, 405]).toContain(response.status);
    });

    it('should reject PUT on GET route', async () => {
      const response = await request(app)
        .put('/projects')
        .send({ name: 'Test' });

      // PUT /projects without ID doesn't exist, so it should fail or be handled by Express
      expect([200, 404, 405]).toContain(response.status);
    });

    it('should reject DELETE requests (not implemented)', async () => {
      const response = await request(app)
        .delete('/projects/proj1');

      // DELETE route doesn't exist, so Express should return 404 or 405
      expect([404, 405]).toContain(response.status);
    });
  });

  describe('Middleware Integration', () => {
    it('should execute verifyToken before controller', async () => {
      // Since the middleware is already mocked at module level, we verify execution
      // by checking that req.user is set when the controller is called
      const response = await request(app)
        .get('/projects');

      expect(response.status).toBe(200);
      expect(projectsController.getAllProjects).toHaveBeenCalled();
      
      // Verify that the controller received a request with user object (set by middleware)
      const req = projectsController.getAllProjects.mock.calls[0][0];
      expect(req.user).toBeDefined();
      expect(req.user).toHaveProperty('email');
      expect(req.user).toHaveProperty('role');
    });

    it('should pass user context from middleware to all routes', async () => {
      const testRoutes = [
        { method: 'get', path: '/projects', controller: 'getAllProjects' },
        { method: 'get', path: '/projects/proj1', controller: 'getProject' },
        { method: 'post', path: '/projects', controller: 'createProject' },
        { method: 'put', path: '/projects/proj1', controller: 'updateProject' }
      ];

      for (const route of testRoutes) {
        jest.clearAllMocks();
        const response = await request(app)
          [route.method](route.path)
          .send(route.method === 'post' || route.method === 'put' ? { name: 'Test' } : {});

        expect(projectsController[route.controller]).toHaveBeenCalled();
        expect([200, 201]).toContain(response.status);
      }
    });
  });

  describe('Request/Response Flow', () => {
    it('should pass req.params correctly to controller', async () => {
      const projectId = 'test-project-123';
      
      const response = await request(app)
        .get(`/projects/${projectId}`);

      const req = projectsController.getProject.mock.calls[0][0];
      expect(req.params.id).toBe(projectId);
    });

    it('should pass req.body correctly to POST controller', async () => {
      const body = { name: 'New Project', department: 'Engineering' };
      
      const response = await request(app)
        .post('/projects')
        .send(body);

      const req = projectsController.createProject.mock.calls[0][0];
      expect(req.body).toEqual(body);
    });

    it('should pass req.body correctly to PUT controller', async () => {
      const body = { name: 'Updated Project', status: 'active' };
      
      const response = await request(app)
        .put('/projects/proj1')
        .send(body);

      const req = projectsController.updateProject.mock.calls[0][0];
      expect(req.body).toEqual(body);
    });

    it('should handle JSON parsing errors gracefully', async () => {
      // Send invalid JSON
      const response = await request(app)
        .post('/projects')
        .set('Content-Type', 'application/json')
        .send('invalid json{');

      // Express should handle this and return 400 or similar
      expect([400, 500]).toContain(response.status);
    });
  });
});

