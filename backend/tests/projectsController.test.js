// Mock Firebase Firestore layer used by projectsController
const mockTasksCollection = {
  get: jest.fn(),
};

const mockProjectsCollection = {
  where: jest.fn().mockReturnThis(),
  get: jest.fn(),
  add: jest.fn(),
  doc: jest.fn(),
};

const mockProjectDocRef = {
  get: jest.fn(),
  update: jest.fn(),
};

jest.mock('../src/config/firebase', () => ({
  db: {
    collection: jest.fn((name) => {
      if (name === 'projects') return mockProjectsCollection;
      if (name === 'tasks') return mockTasksCollection;
      throw new Error(`Unknown collection: ${name}`);
    }),
  },
}));

const projectsController = require('../src/controllers/projectsController');

// Helpers to build Firestore-like docs and snapshots
function buildDoc(id, data) {
  return {
    id,
    data: () => data,
  };
}

function ts(dateString) {
  const d = new Date(dateString);
  return { toDate: () => d };
}

describe('projectsController', () => {
  let req;
  let res;

  beforeEach(() => {
    jest.clearAllMocks();

    req = {
      user: { email: 'manager@example.com', role: 'manager', department: 'Engineering' },
      params: { id: 'project-1', category: 'UX' },
      body: {},
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockProjectsCollection.doc.mockReturnValue(mockProjectDocRef);
  });

  describe('getAllProjects', () => {
    it('returns all non-deleted projects for director', async () => {
      req.user = { email: 'd@example.com', role: 'director', department: 'Any' };

      const docs = [
        buildDoc('a', { name: 'A', isDeleted: false, createdAt: ts('2024-01-02'), updatedAt: ts('2024-01-03') }),
        buildDoc('b', { name: 'B', isDeleted: false, createdAt: ts('2024-02-02'), updatedAt: ts('2024-02-03') }),
      ];

      mockProjectsCollection.get.mockResolvedValueOnce({ docs });

      await projectsController.getAllProjects(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const payload = res.json.mock.calls[0][0];
      expect(Array.isArray(payload)).toBe(true);
      // Sorted by createdAt desc, so B then A
      expect(payload.map(p => p.id)).toEqual(['b', 'a']);
    });

    it('returns department and member projects merged for manager', async () => {
      req.user = { email: 'm@example.com', role: 'manager', department: 'Engineering' };

      const deptDocs = [
        buildDoc('x', { name: 'Dept X', isDeleted: false, department: 'Engineering', createdAt: ts('2024-01-01'), updatedAt: ts('2024-01-02') }),
        buildDoc('y', { name: 'Dept Y', isDeleted: false, department: 'Engineering', createdAt: ts('2024-03-01'), updatedAt: ts('2024-03-02') }),
      ];

      const memberDocs = [
        buildDoc('y', { name: 'Dept Y', isDeleted: false, department: 'Engineering', createdAt: ts('2024-03-01'), updatedAt: ts('2024-03-02') }),
        buildDoc('z', { name: 'Member Z', isDeleted: false, members: ['m@example.com'], createdAt: ts('2024-02-01'), updatedAt: ts('2024-02-02') }),
      ];

      // First query chain: department + isDeleted
      mockProjectsCollection.get
        .mockResolvedValueOnce({ docs: deptDocs })
        // Second query chain: members contains + isDeleted
        .mockResolvedValueOnce({ docs: memberDocs });

      await projectsController.getAllProjects(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const payload = res.json.mock.calls[0][0];
      // Unique ids and sorted desc by createdAt (y, z, x)
      expect(payload.map(p => p.id)).toEqual(['y', 'z', 'x']);
    });

    it('returns only member projects for staff', async () => {
      req.user = { email: 's@example.com', role: 'staff', department: 'Sales' };

      // const docs = [
      //   buildDoc('m1', { name: 'M1', isDeleted: false, members: ['s@example.com'], createdAt: ts('2024-05-01'), updatedAt: ts('2024-05-02') }),
      // ];
      const tasksDocs = [
        buildDoc('t1', { projectId: 'm1', taskOwner: 's@example.com' }),
      ];
      mockTasksCollection.get.mockResolvedValueOnce({ docs: tasksDocs });
    
      // Mock the projects returned from Firestore
      const projectDocs = [
        buildDoc('m1', { name: 'M1', isDeleted: false, createdAt: ts('2024-05-01'), updatedAt: ts('2024-05-02') }),
      ];
      mockProjectsCollection.get.mockResolvedValueOnce({ docs: projectDocs });

      // mockProjectsCollection.get.mockResolvedValueOnce({ docs });

      await projectsController.getAllProjects(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const payload = res.json.mock.calls[0][0];
      expect(payload).toHaveLength(1);
      expect(payload[0].id).toBe('m1');
    });

    it('handles errors', async () => {
      req.user = { email: 'e@example.com', role: 'director', department: 'Any' };
      mockProjectsCollection.get.mockRejectedValueOnce(new Error('boom'));

      await projectsController.getAllProjects(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'boom' });
    });
  });

  describe('getProject', () => {
    it('returns 404 when not found', async () => {
      mockProjectDocRef.get.mockResolvedValueOnce({ exists: false });

      await projectsController.getProject(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Project not found' });
    });

    it('returns project when found', async () => {
      mockProjectDocRef.get.mockResolvedValueOnce({
        exists: true,
        id: 'project-1',
        data: () => ({ name: 'Proj', createdAt: ts('2024-01-01'), updatedAt: ts('2024-01-02') }),
      });

      await projectsController.getProject(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const payload = res.json.mock.calls[0][0];
      expect(payload.id).toBe('project-1');
      expect(payload.name).toBe('Proj');
    });

    it('handles errors', async () => {
      mockProjectDocRef.get.mockRejectedValueOnce(new Error('fail'));

      await projectsController.getProject(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'fail' });
    });
  });

  describe('createProject', () => {
    it('validates name is required', async () => {
      req.body = { name: '   ' };

      await projectsController.createProject(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Project name is required' });
    });

    it('creates project with defaults and returns 201', async () => {
      req.user = { email: 'creator@example.com', role: 'manager', department: 'Engineering' };
      req.body = { name: ' New Project ', description: 'desc' };

      mockProjectsCollection.add.mockResolvedValueOnce({ id: 'new-id' });

      await projectsController.createProject(req, res);

      expect(mockProjectsCollection.add).toHaveBeenCalledTimes(1);
      const saved = mockProjectsCollection.add.mock.calls[0][0];
      expect(saved.name).toBe('New Project');
      expect(saved.createdBy).toBe('creator@example.com');
      expect(saved.members).toEqual(['creator@example.com']);

      expect(res.status).toHaveBeenCalledWith(201);
      const payload = res.json.mock.calls[0][0];
      expect(payload.id).toBe('new-id');
      expect(payload.status).toBe('Ongoing');
      expect(payload.isDeleted).toBe(false);
      expect(payload.totalTasks).toBe(0);
      expect(payload.completedTasks).toBe(0);
      expect(payload.progress).toBe(0);
    });

    it('handles errors', async () => {
      req.user = { email: 'c@example.com', role: 'manager', department: 'Engineering' };
      req.body = { name: 'Proj' };
      mockProjectsCollection.add.mockRejectedValueOnce(new Error('bad'));

      await projectsController.createProject(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'bad' });
    });
  });

  describe('updateProject', () => {
    it('404 when project not found', async () => {
      mockProjectDocRef.get.mockResolvedValueOnce({ exists: false });

      await projectsController.updateProject(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Project not found' });
    });

    it('updates provided fields and returns merged payload', async () => {
      mockProjectDocRef.get.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          name: 'Old',
          description: 'old desc',
          status: 'Ongoing',
          department: 'Engineering',
          dueDate: null,
          categories: ['UX'],
        }),
      });

      req.body = { name: '  New Name  ', description: 'new' };

      await projectsController.updateProject(req, res);

      expect(mockProjectDocRef.update).toHaveBeenCalled();
      const updateData = mockProjectDocRef.update.mock.calls[0][0];
      expect(updateData.name).toBe('New Name');
      expect(updateData.description).toBe('new');
      // Note: categories are no longer stored on projects (removed in implementation)

      expect(res.status).toHaveBeenCalledWith(200);
      const payload = res.json.mock.calls[0][0];
      expect(payload.id).toBe('project-1');
      expect(payload.name).toBe('New Name');
      expect(payload.description).toBe('new');
    });

    it('handles errors', async () => {
      mockProjectDocRef.get.mockRejectedValueOnce(new Error('oops'));

      await projectsController.updateProject(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'oops' });
    });
  });

  // Note: addCategory and removeCategory functions were removed - tests removed

  // ============================================
  // EDGE CASES FOR getAllProjects
  // ============================================
  describe('getAllProjects - Edge Cases', () => {
    it('handles empty projects array for director', async () => {
      req.user = { email: 'd@example.com', role: 'director', department: 'Any' };
      mockProjectsCollection.get.mockResolvedValueOnce({ docs: [] });

      await projectsController.getAllProjects(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const payload = res.json.mock.calls[0][0];
      expect(payload).toEqual([]);
    });

    it('handles projects with null/undefined createdAt for director', async () => {
      req.user = { email: 'd@example.com', role: 'director', department: 'Any' };
      const docs = [
        buildDoc('a', { name: 'A', isDeleted: false, createdAt: null, updatedAt: null }),
        buildDoc('b', { name: 'B', isDeleted: false, createdAt: undefined, updatedAt: undefined }),
      ];
      mockProjectsCollection.get.mockResolvedValueOnce({ docs });

      await projectsController.getAllProjects(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const payload = res.json.mock.calls[0][0];
      expect(payload).toHaveLength(2);
    });

    it('handles HR role same as director', async () => {
      req.user = { email: 'hr@example.com', role: 'hr', department: 'Any' };
      const docs = [
        buildDoc('a', { name: 'A', isDeleted: false, createdAt: ts('2024-01-02'), updatedAt: ts('2024-01-03') }),
      ];
      mockProjectsCollection.get.mockResolvedValueOnce({ docs });

      await projectsController.getAllProjects(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const payload = res.json.mock.calls[0][0];
      expect(payload).toHaveLength(1);
    });

    it('filters out deleted projects for director', async () => {
      req.user = { email: 'd@example.com', role: 'director', department: 'Any' };
      const docs = [
        buildDoc('b', { name: 'B', isDeleted: false, createdAt: ts('2024-02-02'), updatedAt: ts('2024-02-03') }),
      ];
      // Firestore query filters out deleted projects server-side
      mockProjectsCollection.get.mockResolvedValueOnce({ docs });

      await projectsController.getAllProjects(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const payload = res.json.mock.calls[0][0];
      expect(payload).toHaveLength(1);
      expect(payload[0].isDeleted).toBe(false);
    });

    it('handles manager with no department projects', async () => {
      req.user = { email: 'm@example.com', role: 'manager', department: 'Engineering' };
      const deptDocs = [];
      const memberDocs = [
        buildDoc('z', { name: 'Member Z', isDeleted: false, members: ['m@example.com'], createdAt: ts('2024-02-01'), updatedAt: ts('2024-02-02') }),
      ];
      mockProjectsCollection.get
        .mockResolvedValueOnce({ docs: deptDocs })
        .mockResolvedValueOnce({ docs: memberDocs });

      await projectsController.getAllProjects(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const payload = res.json.mock.calls[0][0];
      expect(payload).toHaveLength(1);
      expect(payload[0].id).toBe('z');
    });

    it('handles staff with no tasks', async () => {
      req.user = { email: 's@example.com', role: 'staff', department: 'Sales', name: 'Staff User' };
      const tasksDocs = [];
      mockTasksCollection.get.mockResolvedValueOnce({ docs: tasksDocs });
      const projectDocs = [
        buildDoc('m1', { name: 'M1', isDeleted: false, createdAt: ts('2024-05-01'), updatedAt: ts('2024-05-02') }),
      ];
      mockProjectsCollection.get.mockResolvedValueOnce({ docs: projectDocs });

      await projectsController.getAllProjects(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const payload = res.json.mock.calls[0][0];
      expect(payload).toEqual([]);
    });

    it('handles staff with tasks having different collaborator formats', async () => {
      req.user = { email: 's@example.com', role: 'staff', department: 'Sales', name: 'Staff User' };
      const tasksDocs = [
        buildDoc('t1', { 
          projectId: 'm1', 
          collaborators: [{ email: 's@example.com' }],
        }),
        buildDoc('t2', { 
          projectId: 'm1', 
          collaborators: [{ name: 'Staff User' }],
        }),
        buildDoc('t3', { 
          projectId: 'm1', 
          collaborators: ['s@example.com'],
        }),
      ];
      mockTasksCollection.get.mockResolvedValueOnce({ docs: tasksDocs });
      const projectDocs = [
        buildDoc('m1', { name: 'M1', isDeleted: false, createdAt: ts('2024-05-01'), updatedAt: ts('2024-05-02') }),
      ];
      mockProjectsCollection.get.mockResolvedValueOnce({ docs: projectDocs });

      await projectsController.getAllProjects(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const payload = res.json.mock.calls[0][0];
      expect(payload).toHaveLength(1);
      expect(payload[0].id).toBe('m1');
    });

    it('handles sorting when createdAt dates are equal', async () => {
      req.user = { email: 'd@example.com', role: 'director', department: 'Any' };
      const sameDate = ts('2024-01-01');
      const docs = [
        buildDoc('a', { name: 'A', isDeleted: false, createdAt: sameDate, updatedAt: sameDate }),
        buildDoc('b', { name: 'B', isDeleted: false, createdAt: sameDate, updatedAt: sameDate }),
      ];
      mockProjectsCollection.get.mockResolvedValueOnce({ docs });

      await projectsController.getAllProjects(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const payload = res.json.mock.calls[0][0];
      expect(payload).toHaveLength(2);
    });
  });

  // ============================================
  // EDGE CASES FOR getProject
  // ============================================
  describe('getProject - Edge Cases', () => {
    it('handles project with missing timestamps', async () => {
      mockProjectDocRef.get.mockResolvedValueOnce({
        exists: true,
        id: 'project-1',
        data: () => ({ name: 'Proj', createdAt: null, updatedAt: null }),
      });

      await projectsController.getProject(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const payload = res.json.mock.calls[0][0];
      expect(payload.id).toBe('project-1');
      expect(payload.createdAt).toBeInstanceOf(Date);
    });

    it('handles project with invalid timestamp format', async () => {
      mockProjectDocRef.get.mockResolvedValueOnce({
        exists: true,
        id: 'project-1',
        data: () => ({ 
          name: 'Proj', 
          createdAt: { invalid: true }, 
          updatedAt: { invalid: true } 
        }),
      });

      await projectsController.getProject(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const payload = res.json.mock.calls[0][0];
      expect(payload.createdAt).toBeInstanceOf(Date);
    });
  });

  // ============================================
  // EDGE CASES FOR createProject
  // ============================================
  describe('createProject - Edge Cases', () => {
    it('rejects HR role from creating projects', async () => {
      req.user = { email: 'hr@example.com', role: 'hr', department: 'HR' };
      req.body = { name: 'Project Name' };

      await projectsController.createProject(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ 
        message: 'Insufficient permissions to create projects' 
      });
    });

    it('rejects manager creating project in different department', async () => {
      req.user = { email: 'm@example.com', role: 'manager', department: 'Engineering' };
      req.body = { name: 'Project Name', department: 'Sales' };

      await projectsController.createProject(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ 
        message: 'Insufficient permissions: You can only create projects in your department' 
      });
    });

    it('allows manager to create project without explicit department (uses user department)', async () => {
      req.user = { email: 'm@example.com', role: 'manager', department: 'Engineering' };
      req.body = { name: 'Project Name' };

      mockProjectsCollection.add.mockResolvedValueOnce({ id: 'new-id' });

      await projectsController.createProject(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      const saved = mockProjectsCollection.add.mock.calls[0][0];
      expect(saved.department).toBe('Engineering');
    });

    it('handles project with very long name', async () => {
      req.user = { email: 'c@example.com', role: 'manager', department: 'Engineering' };
      const longName = 'A'.repeat(500);
      req.body = { name: `  ${longName}  ` };

      mockProjectsCollection.add.mockResolvedValueOnce({ id: 'new-id' });

      await projectsController.createProject(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      const saved = mockProjectsCollection.add.mock.calls[0][0];
      expect(saved.name).toBe(longName);
    });

    it('handles project with empty description', async () => {
      req.user = { email: 'c@example.com', role: 'manager', department: 'Engineering' };
      req.body = { name: 'Project', description: '' };

      mockProjectsCollection.add.mockResolvedValueOnce({ id: 'new-id' });

      await projectsController.createProject(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      const saved = mockProjectsCollection.add.mock.calls[0][0];
      expect(saved.description).toBe('');
    });

    it('handles project with null dueDate', async () => {
      req.user = { email: 'c@example.com', role: 'manager', department: 'Engineering' };
      req.body = { name: 'Project', dueDate: null };

      mockProjectsCollection.add.mockResolvedValueOnce({ id: 'new-id' });

      await projectsController.createProject(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      const saved = mockProjectsCollection.add.mock.calls[0][0];
      expect(saved.dueDate).toBeNull();
    });

    it('handles project with custom owners array', async () => {
      req.user = { email: 'c@example.com', role: 'director', department: 'Any' };
      req.body = { 
        name: 'Project', 
        owners: ['owner1@example.com', 'owner2@example.com'] 
      };

      mockProjectsCollection.add.mockResolvedValueOnce({ id: 'new-id' });

      await projectsController.createProject(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      const saved = mockProjectsCollection.add.mock.calls[0][0];
      expect(saved.owners).toEqual(['owner1@example.com', 'owner2@example.com']);
    });

    it('defaults to creator as owner if owners not provided', async () => {
      req.user = { email: 'c@example.com', role: 'director', department: 'Any' };
      req.body = { name: 'Project' };

      mockProjectsCollection.add.mockResolvedValueOnce({ id: 'new-id' });

      await projectsController.createProject(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      const saved = mockProjectsCollection.add.mock.calls[0][0];
      expect(saved.owners).toEqual(['c@example.com']);
    });
  });

  // ============================================
  // EDGE CASES FOR updateProject
  // ============================================
  describe('updateProject - Edge Cases', () => {
    it('rejects HR role from updating projects', async () => {
      req.user = { email: 'hr@example.com', role: 'hr', department: 'HR' };
      mockProjectDocRef.get.mockResolvedValueOnce({
        exists: true,
        data: () => ({ name: 'Project', department: 'HR' }),
      });
      req.body = { name: 'Updated' };

      await projectsController.updateProject(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ 
        message: 'Insufficient permissions to update projects' 
      });
    });

    it('rejects manager updating project from different department', async () => {
      req.user = { email: 'm@example.com', role: 'manager', department: 'Engineering' };
      mockProjectDocRef.get.mockResolvedValueOnce({
        exists: true,
        data: () => ({ name: 'Project', department: 'Sales' }),
      });
      req.body = { name: 'Updated' };

      await projectsController.updateProject(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ 
        message: 'Insufficient permissions: You can only update projects in your department' 
      });
    });

    it('rejects manager changing project department', async () => {
      req.user = { email: 'm@example.com', role: 'manager', department: 'Engineering' };
      mockProjectDocRef.get.mockResolvedValueOnce({
        exists: true,
        data: () => ({ name: 'Project', department: 'Engineering' }),
      });
      req.body = { department: 'Sales' };

      await projectsController.updateProject(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ 
        message: 'Insufficient permissions: Managers cannot change project department' 
      });
    });

    it('rejects non-creator from updating owners', async () => {
      req.user = { email: 'other@example.com', role: 'director', department: 'Any' };
      mockProjectDocRef.get.mockResolvedValueOnce({
        exists: true,
        data: () => ({ 
          name: 'Project', 
          department: 'Engineering',
          createdBy: 'creator@example.com'
        }),
      });
      req.body = { owners: ['newowner@example.com'] };

      await projectsController.updateProject(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ 
        message: 'Insufficient permissions: Only the project creator can modify owners' 
      });
    });

    it('allows creator to update owners', async () => {
      req.user = { email: 'creator@example.com', role: 'director', department: 'Any' };
      mockProjectDocRef.get.mockResolvedValueOnce({
        exists: true,
        data: () => ({ 
          name: 'Project', 
          department: 'Engineering',
          createdBy: 'creator@example.com'
        }),
      });
      req.body = { owners: ['newowner@example.com'] };

      await projectsController.updateProject(req, res);

      expect(mockProjectDocRef.update).toHaveBeenCalled();
      const updateData = mockProjectDocRef.update.mock.calls[0][0];
      expect(updateData.owners).toEqual(['newowner@example.com']);
    });

    it('handles partial updates (only some fields)', async () => {
      req.user = { email: 'u@example.com', role: 'director', department: 'Any' };
      mockProjectDocRef.get.mockResolvedValueOnce({
        exists: true,
        data: () => ({ 
          name: 'Project', 
          description: 'Old desc',
          status: 'Ongoing',
          department: 'Engineering'
        }),
      });
      req.body = { status: 'Completed' };

      await projectsController.updateProject(req, res);

      expect(mockProjectDocRef.update).toHaveBeenCalled();
      const updateData = mockProjectDocRef.update.mock.calls[0][0];
      expect(updateData.status).toBe('Completed');
      expect(updateData.name).toBeUndefined();
    });

    it('trims whitespace from name on update', async () => {
      req.user = { email: 'u@example.com', role: 'director', department: 'Any' };
      mockProjectDocRef.get.mockResolvedValueOnce({
        exists: true,
        data: () => ({ name: 'Project', department: 'Engineering' }),
      });
      req.body = { name: '  Updated Name  ' };

      await projectsController.updateProject(req, res);

      const updateData = mockProjectDocRef.update.mock.calls[0][0];
      expect(updateData.name).toBe('Updated Name');
    });

    it('handles update with undefined fields (should not include in update)', async () => {
      req.user = { email: 'u@example.com', role: 'director', department: 'Any' };
      mockProjectDocRef.get.mockResolvedValueOnce({
        exists: true,
        data: () => ({ name: 'Project', department: 'Engineering' }),
      });
      req.body = { name: 'Updated', description: undefined, status: undefined };

      await projectsController.updateProject(req, res);

      const updateData = mockProjectDocRef.update.mock.calls[0][0];
      expect(updateData.name).toBe('Updated');
      expect(updateData.description).toBeUndefined();
      expect(updateData.status).toBeUndefined();
    });
  });
});


