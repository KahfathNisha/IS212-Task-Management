// Mock Firebase Firestore layer for reportsController tests
const mockTasksCollection = {
  where: jest.fn().mockReturnThis(),
  get: jest.fn(),
  doc: jest.fn(),
};

const mockProjectsCollection = {
  doc: jest.fn(),
};

const mockUsersCollection = {
  where: jest.fn().mockReturnThis(),
  get: jest.fn(),
  doc: jest.fn(),
};

// Mock document references that have a get() method
const createMockDocRef = (mockData) => ({
  get: jest.fn().mockResolvedValue(buildDoc('doc-id', mockData)),
  exists: true,
  data: () => mockData,
});

// Helper to set up user doc mocks properly
function setupUserDocMocks(...userDataArray) {
  const docRefs = userDataArray.map(data => ({
    get: jest.fn().mockResolvedValue(buildDoc('email', data)),
  }));
  mockUsersCollection.doc.mockImplementation((email) => {
    const index = userDataArray.findIndex(u => u.email === email || email.includes('@'));
    return docRefs[index >= 0 ? index : 0] || docRefs[0];
  });
  return mockUsersCollection;
}

const mockGetAll = jest.fn();
jest.mock('../src/config/firebase', () => ({
  db: {
    collection: jest.fn((name) => {
      if (name === 'tasks') return mockTasksCollection;
      if (name === 'projects') return mockProjectsCollection;
      if (name === 'Users') return mockUsersCollection;
      throw new Error(`Unknown collection: ${name}`);
    }),
    getAll: mockGetAll,
  },
  admin: {
    firestore: {
      Timestamp: {
        fromDate: (date) => ({
          toDate: () => date,
          seconds: Math.floor(date.getTime() / 1000),
          nanoseconds: (date.getTime() % 1000) * 1000000,
        }),
      },
    },
  },
}));

const { admin } = require('../src/config/firebase');

const reportsController = require('../src/controllers/reportsController');

// Helpers to build Firestore-like docs and snapshots
function buildDoc(id, data) {
  return {
    id,
    exists: true,
    data: () => data,
  };
}

function buildNonExistentDoc() {
  return {
    exists: false,
    data: () => ({}),
  };
}

function buildSnapshot(docs) {
  return {
    docs,
    size: docs.length,
  };
}

describe('reportsController', () => {
  let req;
  let res;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAll.mockReset();

    req = {
      params: {},
      query: {},
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    // Default mocks
    mockProjectsCollection.doc.mockReturnValue({
      get: jest.fn(),
    });
    mockUsersCollection.doc.mockReturnValue({
      get: jest.fn(),
    });
  });

  describe('generateProjectReport', () => {
    beforeEach(() => {
      req.params.projectId = 'project-1';
      req.query.requesterId = 'user@example.com';
    });

    it('allows staff to view project they are a member of', async () => {
      const projectData = {
        name: 'Test Project',
        members: ['user@example.com'],
        department: 'Engineering',
      };

      const userData = {
        role: 'staff',
        department: 'Engineering',
        name: 'Test User',
      };

      const tasks = [
        {
          id: 'task-1',
          title: 'Task 1',
          status: 'Ongoing',
          assignedTo: 'user@example.com',
          dueDate: new Date().toISOString(),
          priority: 1,
        },
      ];

      mockProjectsCollection.doc().get.mockResolvedValue(buildDoc('project-1', projectData));
      mockUsersCollection.doc().get.mockResolvedValue(buildDoc('user@example.com', userData));
      mockTasksCollection.get.mockResolvedValue(buildSnapshot(tasks.map(t => buildDoc(t.id, t))));

      await reportsController.generateProjectReport(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.report.projectName).toBe('Test Project');
    });

    it('denies staff access to project they are not a member of', async () => {
      const projectData = {
        name: 'Test Project',
        members: ['other@example.com'], // User not a member
        department: 'Engineering',
      };

      const userData = {
        role: 'staff',
        department: 'Engineering',
      };

      mockProjectsCollection.doc().get.mockResolvedValue(buildDoc('project-1', projectData));
      mockUsersCollection.doc().get.mockResolvedValue(buildDoc('user@example.com', userData));

      await reportsController.generateProjectReport(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining('member'),
        })
      );
    });

    it('allows manager to view projects in their department', async () => {
      const projectData = {
        name: 'Dept Project',
        department: 'Engineering',
        members: [],
      };

      const userData = {
        role: 'manager',
        department: 'Engineering',
      };

      const tasks = [];

      mockProjectsCollection.doc().get.mockResolvedValue(buildDoc('project-1', projectData));
      mockUsersCollection.doc().get.mockResolvedValue(buildDoc('user@example.com', userData));
      mockTasksCollection.get.mockResolvedValue(buildSnapshot([]));

      await reportsController.generateProjectReport(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('denies manager access to different department projects', async () => {
      const projectData = {
        name: 'Other Dept Project',
        department: 'Finance',
        members: [],
      };

      const userData = {
        role: 'manager',
        department: 'Engineering',
      };

      mockProjectsCollection.doc().get.mockResolvedValue(buildDoc('project-1', projectData));
      mockUsersCollection.doc().get.mockResolvedValue(buildDoc('user@example.com', userData));

      await reportsController.generateProjectReport(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('allows director to view any project', async () => {
      const projectData = {
        name: 'Any Project',
        department: 'Finance',
        members: [],
      };

      const userData = {
        role: 'director',
        department: 'Any',
      };

      const tasks = [];

      mockProjectsCollection.doc().get.mockResolvedValue(buildDoc('project-1', projectData));
      mockUsersCollection.doc().get.mockResolvedValue(buildDoc('user@example.com', userData));
      mockTasksCollection.get.mockResolvedValue(buildSnapshot([]));

      await reportsController.generateProjectReport(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('denies HR access to project reports', async () => {
      const userData = {
        role: 'hr',
        department: 'HR and Admin',
      };

      mockProjectsCollection.doc().get.mockResolvedValue(buildDoc('project-1', { name: 'Test' }));
      mockUsersCollection.doc().get.mockResolvedValue(buildDoc('user@example.com', userData));

      await reportsController.generateProjectReport(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining('permission'),
        })
      );
    });

    it('calculates overdue tasks correctly', async () => {
      const projectData = {
        name: 'Test Project',
        members: ['user@example.com'],
      };

      const userData = { role: 'staff', department: 'Engineering' };

      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5); // 5 days ago

      const tasks = [
        buildDoc('task-1', {
          title: 'Overdue Task',
          status: 'Ongoing',
          dueDate: pastDate.toISOString(),
        }),
        buildDoc('task-2', {
          title: 'Completed Task',
          status: 'Completed',
          dueDate: pastDate.toISOString(), // Overdue but completed, shouldn't count
        }),
      ];

      mockProjectsCollection.doc().get.mockResolvedValue(buildDoc('project-1', projectData));
      mockUsersCollection.doc().get.mockResolvedValue(buildDoc('user@example.com', userData));
      mockTasksCollection.get.mockResolvedValue(buildSnapshot(tasks));

      await reportsController.generateProjectReport(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const response = res.json.mock.calls[0][0];
      expect(response.report.summary.overdueCount).toBe(1); // Only 1 overdue (not completed)
    });
  });

  describe('generateIndividualReport', () => {
    beforeEach(() => {
      req.query.requesterId = 'manager@example.com';
      req.query.employeeEmail = 'employee@example.com';
      
      // Reset mocks
      jest.clearAllMocks();
      mockTasksCollection.where.mockReturnValue(mockTasksCollection);
      
      // Set up default doc mocks that return objects with get() method
      mockUsersCollection.doc.mockImplementation((email) => {
        const mockDocRef = {
          get: jest.fn(),
        };
        return mockDocRef;
      });
    });

    it('allows manager to view employee in same department', async () => {
      const requesterData = {
        role: 'manager',
        department: 'Engineering',
      };

      const employeeData = {
        role: 'staff',
        department: 'Engineering',
        name: 'Test Employee',
      };

      const tasks = [
        buildDoc('task-1', {
          title: 'Task 1',
          status: 'Completed',
          assignedTo: 'employee@example.com',
          createdAt: new Date('2024-01-01').toISOString(),
          updatedAt: new Date('2024-01-05').toISOString(),
        }),
      ];

      // Set up doc mocks to return proper document references
      let callCount = 0;
      mockUsersCollection.doc.mockImplementation((email) => {
        const mockDocRef = {
          get: jest.fn().mockResolvedValue(
            callCount++ === 0 
              ? buildDoc(email, requesterData)
              : buildDoc(email, employeeData)
          ),
        };
        return mockDocRef;
      });
      
      mockTasksCollection.get.mockResolvedValue(buildSnapshot(tasks));

      try {
        await reportsController.generateIndividualReport(req, res);

        if (res.status.mock.calls[0]?.[0] !== 200) {
          console.error('❌ Unexpected status:', res.status.mock.calls[0]?.[0]);
          console.error('❌ Response:', res.json.mock.calls[0]?.[0]);
        }
      } catch (error) {
        console.error('❌ Test error:', error.message);
        console.error('❌ Stack:', error.stack);
        throw error;
      }

      expect(res.status).toHaveBeenCalledWith(200);
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.report.employee.department).toBe('Engineering');
    });

    it('denies manager access to employee in different department', async () => {
      const requesterData = {
        role: 'manager',
        department: 'Engineering',
      };

      const employeeData = {
        role: 'staff',
        department: 'Finance', // Different department
      };

      let callCount = 0;
      mockUsersCollection.doc.mockImplementation((email) => {
        const mockDocRef = {
          get: jest.fn().mockResolvedValue(
            callCount++ === 0 
              ? buildDoc(email, requesterData)
              : buildDoc(email, employeeData)
          ),
        };
        return mockDocRef;
      });

      try {
        await reportsController.generateIndividualReport(req, res);

        if (res.status.mock.calls[0]?.[0] !== 403) {
          console.error('❌ Expected 403, got:', res.status.mock.calls[0]?.[0]);
          console.error('❌ Response:', res.json.mock.calls[0]?.[0]);
        }
      } catch (error) {
        console.error('❌ Test error:', error.message);
        console.error('❌ Stack:', error.stack);
        throw error;
      }

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining('department'),
        })
      );
    });

    it('allows HR to view employee in same department', async () => {
      const requesterData = {
        role: 'hr',
        department: 'HR and Admin',
      };

      const employeeData = {
        role: 'staff',
        department: 'HR and Admin',
        name: 'HR Employee',
      };

      const tasks = [];

      let callCount = 0;
      mockUsersCollection.doc.mockImplementation((email) => {
        const mockDocRef = {
          get: jest.fn().mockResolvedValue(
            callCount++ === 0 
              ? buildDoc('hr@example.com', requesterData)
              : buildDoc('employee@example.com', employeeData)
          ),
        };
        return mockDocRef;
      });
      
      mockTasksCollection.get.mockResolvedValue(buildSnapshot(tasks));

      req.query.requesterId = 'hr@example.com';

      try {
        await reportsController.generateIndividualReport(req, res);

        if (res.status.mock.calls[0]?.[0] !== 200) {
          console.error('❌ Expected 200, got:', res.status.mock.calls[0]?.[0]);
          console.error('❌ Response:', res.json.mock.calls[0]?.[0]);
          if (res.json.mock.calls[0]?.[0]?.message) {
            console.error('❌ Error message:', res.json.mock.calls[0]?.[0].message);
          }
        }
      } catch (error) {
        console.error('❌ Test error:', error.message);
        console.error('❌ Stack:', error.stack);
        throw error;
      }

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('calculates metrics correctly', async () => {
      const requesterData = { role: 'director', department: 'Any' };
      const employeeData = { role: 'staff', department: 'Engineering', name: 'Employee' };

      const tasks = [
        buildDoc('task-1', {
          title: 'Completed 1',
          status: 'Completed',
          assignedTo: 'employee@example.com',
          createdAt: new Date('2024-01-01').toISOString(),
          updatedAt: new Date('2024-01-03').toISOString(), // 2 days
        }),
        buildDoc('task-2', {
          title: 'Completed 2',
          status: 'Completed',
          assignedTo: 'employee@example.com',
          createdAt: new Date('2024-01-01').toISOString(),
          updatedAt: new Date('2024-01-06').toISOString(), // 5 days
        }),
        buildDoc('task-3', {
          title: 'Ongoing',
          status: 'Ongoing',
          assignedTo: 'employee@example.com',
        }),
        buildDoc('task-4', {
          title: 'Overdue',
          status: 'Ongoing',
          assignedTo: 'employee@example.com',
          dueDate: new Date('2024-01-01').toISOString(), // Past date
        }),
      ];

      let callCount = 0;
      mockUsersCollection.doc.mockImplementation((email) => {
        const mockDocRef = {
          get: jest.fn().mockResolvedValue(
            callCount++ === 0 
              ? buildDoc('director@example.com', requesterData)
              : buildDoc('employee@example.com', employeeData)
          ),
        };
        return mockDocRef;
      });
      
      mockTasksCollection.get.mockResolvedValue(buildSnapshot(tasks));

      req.query.requesterId = 'director@example.com';

      try {
        await reportsController.generateIndividualReport(req, res);

        if (res.status.mock.calls[0]?.[0] !== 200) {
          console.error('❌ Expected 200, got:', res.status.mock.calls[0]?.[0]);
          console.error('❌ Response:', res.json.mock.calls[0]?.[0]);
        }
      } catch (error) {
        console.error('❌ Test error:', error.message);
        console.error('❌ Stack:', error.stack);
        throw error;
      }

      expect(res.status).toHaveBeenCalledWith(200);
      const response = res.json.mock.calls[0][0];
      expect(response.report.summary.totalTasks).toBe(4);
      expect(response.report.summary.completedTasks).toBe(2);
      expect(response.report.summary.overdueTasks).toBe(1);
      expect(parseFloat(response.report.summary.completionRate)).toBe(50); // 2/4 * 100
      expect(parseFloat(response.report.summary.avgTimePerTask)).toBe(3.5); // (2+5)/2
    });

    it('allows staff to view their own individual report', async () => {
      const staffData = {
        role: 'staff',
        department: 'Engineering',
        name: 'Staff Member',
      };

      const tasks = [
        buildDoc('task-1', {
          title: 'My Task',
          status: 'Completed',
          assignedTo: 'staff@example.com',
          createdAt: new Date('2024-01-01').toISOString(),
          updatedAt: new Date('2024-01-05').toISOString(),
        }),
      ];

      // Staff viewing their own report - requesterId === employeeEmail
      mockUsersCollection.doc.mockImplementation((email) => {
        const mockDocRef = {
          get: jest.fn().mockResolvedValue(buildDoc(email, staffData)),
        };
        return mockDocRef;
      });
      
      mockTasksCollection.get.mockResolvedValue(buildSnapshot(tasks));

      req.query.requesterId = 'staff@example.com';
      req.query.employeeEmail = 'staff@example.com'; // Same person

      try {
        await reportsController.generateIndividualReport(req, res);

        if (res.status.mock.calls[0]?.[0] !== 200) {
          console.error('❌ Expected 200, got:', res.status.mock.calls[0]?.[0]);
          console.error('❌ Response:', res.json.mock.calls[0]?.[0]);
        }
      } catch (error) {
        console.error('❌ Test error:', error.message);
        console.error('❌ Stack:', error.stack);
        throw error;
      }

      expect(res.status).toHaveBeenCalledWith(200);
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.report.employee.email).toBe('staff@example.com');
    });

    it('denies staff access to other employees individual reports', async () => {
      const requesterData = {
        role: 'staff',
        department: 'Engineering',
      };

      const employeeData = {
        role: 'staff',
        department: 'Engineering',
        name: 'Other Staff',
      };

      // Staff trying to view another employee's report
      let callCount = 0;
      mockUsersCollection.doc.mockImplementation((email) => {
        const mockDocRef = {
          get: jest.fn().mockResolvedValue(
            callCount++ === 0 
              ? buildDoc('staff@example.com', requesterData)
              : buildDoc('employee@example.com', employeeData)
          ),
        };
        return mockDocRef;
      });

      req.query.requesterId = 'staff@example.com';
      req.query.employeeEmail = 'employee@example.com'; // Different person

      try {
        await reportsController.generateIndividualReport(req, res);

        console.log('🔍 Status received:', res.status.mock.calls[0]?.[0]);
        console.log('🔍 Response:', JSON.stringify(res.json.mock.calls[0]?.[0], null, 2));
        
        if (res.status.mock.calls[0]?.[0] !== 403) {
          console.error('❌ Expected 403, got:', res.status.mock.calls[0]?.[0]);
          console.error('❌ Response:', res.json.mock.calls[0]?.[0]);
        }
      } catch (error) {
        console.error('❌ Test error:', error.message);
        console.error('❌ Stack:', error.stack);
        throw error;
      }

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining('own individual'),
        })
      );
    });
  });

  describe('generateDepartmentReport', () => {
    beforeEach(() => {
      req.query.requesterId = 'hr@example.com';
      req.query.department = 'HR and Admin';
      
      // Reset mocks
      jest.clearAllMocks();
      mockUsersCollection.where.mockReturnValue(mockUsersCollection);
      mockTasksCollection.where.mockReturnValue(mockTasksCollection);
      
      // Set up doc mock
      mockUsersCollection.doc.mockImplementation((email) => {
        const mockDocRef = {
          get: jest.fn(),
        };
        return mockDocRef;
      });
    });

    it('allows HR to view their own department', async () => {
      const userData = {
        role: 'hr',
        department: 'HR and Admin',
      };

      const users = [
        buildDoc('user1@example.com', { email: 'user1@example.com', name: 'User 1', department: 'HR and Admin' }),
      ];

      const tasks = [];

      mockUsersCollection.doc.mockImplementation((email) => {
        const mockDocRef = {
          get: jest.fn().mockResolvedValue(buildDoc(email, userData)),
        };
        return mockDocRef;
      });
      
      mockUsersCollection.get.mockResolvedValue(buildSnapshot(users));
      mockTasksCollection.get.mockResolvedValue(buildSnapshot(tasks));

      try {
        await reportsController.generateDepartmentReport(req, res);

        if (res.status.mock.calls[0]?.[0] !== 200) {
          console.error('❌ Expected 200, got:', res.status.mock.calls[0]?.[0]);
          console.error('❌ Response:', res.json.mock.calls[0]?.[0]);
          if (res.json.mock.calls[0]?.[0]?.message) {
            console.error('❌ Error message:', res.json.mock.calls[0]?.[0].message);
          }
        }
      } catch (error) {
        console.error('❌ Test error:', error.message);
        console.error('❌ Stack:', error.stack);
        throw error;
      }

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('denies HR access to different department', async () => {
      const userData = {
        role: 'hr',
        department: 'HR and Admin',
      };

      mockUsersCollection.doc.mockImplementation((email) => {
        const mockDocRef = {
          get: jest.fn().mockResolvedValue(buildDoc(email, userData)),
        };
        return mockDocRef;
      });

      // Need to mock the where().get() chain for users query
      mockUsersCollection.where.mockReturnValue(mockUsersCollection);
      mockUsersCollection.get.mockResolvedValue(buildSnapshot([]));
      mockTasksCollection.where.mockReturnValue(mockTasksCollection);
      mockTasksCollection.get.mockResolvedValue(buildSnapshot([]));

      req.query.department = 'Engineering'; // Different department

      try {
        await reportsController.generateDepartmentReport(req, res);

        console.log('🔍 Status received:', res.status.mock.calls[0]?.[0]);
        console.log('🔍 Response:', JSON.stringify(res.json.mock.calls[0]?.[0], null, 2));
        
        if (res.status.mock.calls[0]?.[0] !== 403) {
          console.error('❌ Expected 403, got:', res.status.mock.calls[0]?.[0]);
          console.error('❌ Response:', res.json.mock.calls[0]?.[0]);
          if (res.json.mock.calls[0]?.[0]?.message) {
            console.error('❌ Error message:', res.json.mock.calls[0]?.[0].message);
          }
        }
      } catch (error) {
        console.error('❌ Test error:', error.message);
        console.error('❌ Stack:', error.stack);
        throw error;
      }

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('allows manager to view their department', async () => {
      const userData = {
        role: 'manager',
        department: 'Engineering',
      };

      const users = [
        buildDoc('user1@example.com', { email: 'user1@example.com', department: 'Engineering' }),
      ];

      const tasks = [];

      mockUsersCollection.doc.mockImplementation((email) => {
        const mockDocRef = {
          get: jest.fn().mockResolvedValue(buildDoc(email, userData)),
        };
        return mockDocRef;
      });
      
      mockUsersCollection.get.mockResolvedValue(buildSnapshot(users));
      mockTasksCollection.get.mockResolvedValue(buildSnapshot(tasks));

      req.query.requesterId = 'manager@example.com';
      req.query.department = 'Engineering';

      try {
        await reportsController.generateDepartmentReport(req, res);

        if (res.status.mock.calls[0]?.[0] !== 200) {
          console.error('❌ Expected 200, got:', res.status.mock.calls[0]?.[0]);
          console.error('❌ Response:', res.json.mock.calls[0]?.[0]);
        }
      } catch (error) {
        console.error('❌ Test error:', error.message);
        console.error('❌ Stack:', error.stack);
        throw error;
      }

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('allows director to view any department including ALL', async () => {
      const userData = {
        role: 'director',
        department: 'Any',
      };

      const users = [];
      const tasks = [];

      mockUsersCollection.doc.mockImplementation((email) => {
        const mockDocRef = {
          get: jest.fn().mockResolvedValue(buildDoc(email, userData)),
        };
        return mockDocRef;
      });
      
      mockUsersCollection.get.mockResolvedValue(buildSnapshot(users));
      mockTasksCollection.get.mockResolvedValue(buildSnapshot(tasks));

      req.query.requesterId = 'director@example.com';
      req.query.department = 'ALL';

      try {
        await reportsController.generateDepartmentReport(req, res);

        if (res.status.mock.calls[0]?.[0] !== 200) {
          console.error('❌ Expected 200, got:', res.status.mock.calls[0]?.[0]);
          console.error('❌ Response:', res.json.mock.calls[0]?.[0]);
        }
      } catch (error) {
        console.error('❌ Test error:', error.message);
        console.error('❌ Stack:', error.stack);
        throw error;
      }

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('denies staff access to department reports', async () => {
      const userData = {
        role: 'staff',
        department: 'Engineering',
      };

      mockUsersCollection.doc.mockImplementation((email) => {
        const mockDocRef = {
          get: jest.fn().mockResolvedValue(buildDoc(email, userData)),
        };
        return mockDocRef;
      });

      req.query.requesterId = 'staff@example.com';

      try {
        await reportsController.generateDepartmentReport(req, res);

        if (res.status.mock.calls[0]?.[0] !== 403) {
          console.error('❌ Expected 403, got:', res.status.mock.calls[0]?.[0]);
          console.error('❌ Response:', res.json.mock.calls[0]?.[0]);
        }
      } catch (error) {
        console.error('❌ Test error:', error.message);
        console.error('❌ Stack:', error.stack);
        throw error;
      }

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('generateCompanyReport', () => {
    beforeEach(() => {
      req.query.requesterId = 'director@example.com';
      
      // Reset mocks
      jest.clearAllMocks();
      mockTasksCollection.where.mockReturnValue(mockTasksCollection);
      
      // Set up doc mock
      mockUsersCollection.doc.mockImplementation((email) => {
        const mockDocRef = {
          get: jest.fn(),
        };
        return mockDocRef;
      });
    });

    it('allows director to generate company report', async () => {
      const userData = {
        role: 'director',
        department: 'Any',
      };

      const tasks = [];
      const users = [
        buildDoc('user1@example.com', { department: 'Engineering' }),
        buildDoc('user2@example.com', { department: 'Finance' }),
      ];

      mockTasksCollection.get.mockResolvedValue(buildSnapshot(tasks));
      mockUsersCollection.doc.mockImplementation((email) => {
        const mockDocRef = {
          get: jest.fn().mockResolvedValue(buildDoc(email, userData)),
        };
        return mockDocRef;
      });
      mockUsersCollection.get.mockResolvedValue(buildSnapshot(users));

      try {
        await reportsController.generateCompanyReport(req, res);

        if (res.status.mock.calls[0]?.[0] !== 200) {
          console.error('❌ Expected 200, got:', res.status.mock.calls[0]?.[0]);
          console.error('❌ Response:', res.json.mock.calls[0]?.[0]);
          if (res.json.mock.calls[0]?.[0]?.message) {
            console.error('❌ Error message:', res.json.mock.calls[0]?.[0].message);
          }
        }
      } catch (error) {
        console.error('❌ Test error:', error.message);
        console.error('❌ Stack:', error.stack);
        throw error;
      }

      expect(res.status).toHaveBeenCalledWith(200);
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.report.reportType).toBe('company');
    });

    it('denies non-director access to company report', async () => {
      const userData = {
        role: 'manager',
        department: 'Engineering',
      };

      mockUsersCollection.doc.mockImplementation((email) => {
        const mockDocRef = {
          get: jest.fn().mockResolvedValue(buildDoc(email, userData)),
        };
        return mockDocRef;
      });

      req.query.requesterId = 'manager@example.com';

      try {
        await reportsController.generateCompanyReport(req, res);

        if (res.status.mock.calls[0]?.[0] !== 403) {
          console.error('❌ Expected 403, got:', res.status.mock.calls[0]?.[0]);
          console.error('❌ Response:', res.json.mock.calls[0]?.[0]);
        }
      } catch (error) {
        console.error('❌ Test error:', error.message);
        console.error('❌ Stack:', error.stack);
        throw error;
      }

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining('directors'),
        })
      );
    });

    it('filters by department when provided', async () => {
      const userData = { role: 'director', department: 'Any' };
      const tasks = [];

      mockUsersCollection.doc.mockImplementation((email) => {
        const mockDocRef = {
          get: jest.fn().mockResolvedValue(buildDoc(email, userData)),
        };
        return mockDocRef;
      });
      
      mockTasksCollection.get.mockResolvedValue(buildSnapshot(tasks));
      mockUsersCollection.get.mockResolvedValue(buildSnapshot([]));

      req.query.department = 'Engineering';

      try {
        await reportsController.generateCompanyReport(req, res);

        if (res.status.mock.calls[0]?.[0] !== 200) {
          console.error('❌ Expected 200, got:', res.status.mock.calls[0]?.[0]);
          console.error('❌ Response:', res.json.mock.calls[0]?.[0]);
        }
      } catch (error) {
        console.error('❌ Test error:', error.message);
        console.error('❌ Stack:', error.stack);
        throw error;
      }

      expect(mockTasksCollection.where).toHaveBeenCalledWith('taskOwnerDepartment', '==', 'Engineering');
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('filters by date range when provided', async () => {
      const userData = { role: 'director', department: 'Any' };
      
      const tasks = [
        buildDoc('task-1', {
          title: 'Task 1',
          createdAt: new Date('2024-01-15').toISOString(), // Within range
        }),
        buildDoc('task-2', {
          title: 'Task 2',
          createdAt: new Date('2024-02-15').toISOString(), // Outside range
        }),
      ];

      mockTasksCollection.get.mockResolvedValue(buildSnapshot(tasks));
      mockUsersCollection.doc.mockImplementation((email) => {
        const mockDocRef = {
          get: jest.fn().mockResolvedValue(buildDoc(email, userData)),
        };
        return mockDocRef;
      });
      
      mockUsersCollection.get.mockResolvedValue(buildSnapshot([]));

      req.query.startDate = '2024-01-01';
      req.query.endDate = '2024-01-31';

      try {
        await reportsController.generateCompanyReport(req, res);

        if (res.status.mock.calls[0]?.[0] !== 200) {
          console.error('❌ Expected 200, got:', res.status.mock.calls[0]?.[0]);
          console.error('❌ Response:', res.json.mock.calls[0]?.[0]);
        }
      } catch (error) {
        console.error('❌ Test error:', error.message);
        console.error('❌ Stack:', error.stack);
        throw error;
      }

      expect(res.status).toHaveBeenCalledWith(200);
      const response = res.json.mock.calls[0][0];
      expect(response.report.summary.totalTasks).toBe(1); // Only task-1
    });

    it('calculates overdue percentage correctly', async () => {
      const userData = { role: 'director', department: 'Any' };
      
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);

      const tasks = [
        buildDoc('task-1', {
          status: 'Ongoing',
          dueDate: pastDate.toISOString(), // Overdue
        }),
        buildDoc('task-2', {
          status: 'Completed',
          dueDate: pastDate.toISOString(), // Not overdue (completed)
        }),
        buildDoc('task-3', {
          status: 'Ongoing',
          dueDate: null, // No due date
        }),
      ];

      mockTasksCollection.get.mockResolvedValue(buildSnapshot(tasks));
      mockUsersCollection.doc.mockImplementation((email) => {
        const mockDocRef = {
          get: jest.fn().mockResolvedValue(buildDoc(email, userData)),
        };
        return mockDocRef;
      });
      
      mockUsersCollection.get.mockResolvedValue(buildSnapshot([]));

      try {
        await reportsController.generateCompanyReport(req, res);

        if (res.status.mock.calls[0]?.[0] !== 200) {
          console.error('❌ Expected 200, got:', res.status.mock.calls[0]?.[0]);
          console.error('❌ Response:', res.json.mock.calls[0]?.[0]);
        }
      } catch (error) {
        console.error('❌ Test error:', error.message);
        console.error('❌ Stack:', error.stack);
        throw error;
      }

      expect(res.status).toHaveBeenCalledWith(200);
      const response = res.json.mock.calls[0][0];
      expect(response.report.summary.overdueCount).toBe(1);
      expect(response.report.summary.overduePercentage).toBe(33.3); // 1/3 * 100
    });

    it('allows HR to generate company report', async () => {
      const userData = {
        role: 'hr',
        department: 'HR and Admin',
      };

      const tasks = [];

      mockUsersCollection.doc.mockImplementation((email) => {
        const mockDocRef = {
          get: jest.fn().mockResolvedValue(buildDoc(email, userData)),
        };
        return mockDocRef;
      });
      
      mockTasksCollection.get.mockResolvedValue(buildSnapshot(tasks));
      mockUsersCollection.get.mockResolvedValue(buildSnapshot([]));

      req.query.requesterId = 'hr@example.com';

      try {
        await reportsController.generateCompanyReport(req, res);

        if (res.status.mock.calls[0]?.[0] !== 200) {
          console.error('❌ Expected 200, got:', res.status.mock.calls[0]?.[0]);
          console.error('❌ Response:', res.json.mock.calls[0]?.[0]);
        }
      } catch (error) {
        console.error('❌ Test error:', error.message);
        throw error;
      }

      expect(res.status).toHaveBeenCalledWith(200);
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.report.type).toBe('company');
    });

    it('filters by multiple departments when departments parameter provided', async () => {
      const userData = { role: 'director', department: 'Any' };
      
      const tasks = [
        buildDoc('task-1', {
          title: 'Engineering Task',
          taskOwnerDepartment: 'Engineering',
          createdAt: {
            toDate: () => new Date('2024-01-15'),
            seconds: Math.floor(new Date('2024-01-15').getTime() / 1000),
            nanoseconds: 0,
          },
        }),
        buildDoc('task-2', {
          title: 'Finance Task',
          taskOwnerDepartment: 'Finance',
          createdAt: {
            toDate: () => new Date('2024-01-15'),
            seconds: Math.floor(new Date('2024-01-15').getTime() / 1000),
            nanoseconds: 0,
          },
        }),
        buildDoc('task-3', {
          title: 'HR Task',
          taskOwnerDepartment: 'HR and Admin',
          createdAt: {
            toDate: () => new Date('2024-01-15'),
            seconds: Math.floor(new Date('2024-01-15').getTime() / 1000),
            nanoseconds: 0,
          },
        }),
      ];

      mockUsersCollection.doc.mockImplementation((email) => {
        const mockDocRef = {
          get: jest.fn().mockResolvedValue(buildDoc(email, userData)),
        };
        return mockDocRef;
      });
      
      mockTasksCollection.get.mockResolvedValue(buildSnapshot(tasks));
      mockUsersCollection.get.mockResolvedValue(buildSnapshot([]));

      req.query.requesterId = 'director@example.com';
      req.query.departments = 'Engineering,Finance'; // Multiple departments

      try {
        await reportsController.generateCompanyReport(req, res);

        if (res.status.mock.calls[0]?.[0] !== 200) {
          console.error('❌ Expected 200, got:', res.status.mock.calls[0]?.[0]);
          console.error('❌ Response:', res.json.mock.calls[0]?.[0]);
        }
      } catch (error) {
        console.error('❌ Test error:', error.message);
        throw error;
      }

      expect(res.status).toHaveBeenCalledWith(200);
      const response = res.json.mock.calls[0][0];
      // Should only include Engineering and Finance tasks, not HR
      expect(response.report.summary.totalTasks).toBe(2);
    });

    it('filters HR users from department reports', async () => {
      const userData = {
        role: 'manager',
        department: 'Engineering',
      };

      const users = [
        buildDoc('staff1@example.com', { 
          email: 'staff1@example.com', 
          name: 'Staff 1', 
          department: 'Engineering',
          role: 'staff'
        }),
        buildDoc('hr1@example.com', { 
          email: 'hr1@example.com', 
          name: 'HR Staff', 
          department: 'Engineering',
          role: 'hr' // Should be filtered out
        }),
        buildDoc('staff2@example.com', { 
          email: 'staff2@example.com', 
          name: 'Staff 2', 
          department: 'Engineering',
          role: 'staff'
        }),
      ];

      const tasks = [
        buildDoc('task-1', {
          title: 'Task 1',
          assignedTo: 'staff1@example.com',
          taskOwnerDepartment: 'Engineering',
          status: 'Ongoing',
        }),
      ];

      mockUsersCollection.doc.mockImplementation((email) => {
        const mockDocRef = {
          get: jest.fn().mockResolvedValue(buildDoc(email, userData)),
        };
        return mockDocRef;
      });
      
      mockUsersCollection.get.mockResolvedValue(buildSnapshot(users));
      mockTasksCollection.get.mockResolvedValue(buildSnapshot(tasks));

      req.query.requesterId = 'manager@example.com';
      req.query.department = 'Engineering';

      try {
        await reportsController.generateDepartmentReport(req, res);

        if (res.status.mock.calls[0]?.[0] !== 200) {
          console.error('❌ Expected 200, got:', res.status.mock.calls[0]?.[0]);
          console.error('❌ Response:', res.json.mock.calls[0]?.[0]);
        }
      } catch (error) {
        console.error('❌ Test error:', error.message);
        throw error;
      }

      expect(res.status).toHaveBeenCalledWith(200);
      const response = res.json.mock.calls[0][0];
      // Should only have 2 employees (staff1 and staff2), not hr1
      expect(Object.keys(response.report.employeeWorkloads)).toHaveLength(2);
      expect(response.report.employeeWorkloads['hr1@example.com']).toBeUndefined();
      expect(response.report.employeeWorkloads['staff1@example.com']).toBeDefined();
      expect(response.report.employeeWorkloads['staff2@example.com']).toBeDefined();
    });

    it('filters individual report by date range correctly', async () => {
      const requesterData = { role: 'director', department: 'Any' };
      const employeeData = { role: 'staff', department: 'Engineering', name: 'Employee' };

      const tasks = [
        buildDoc('task-1', {
          title: 'Task 1',
          status: 'Completed',
          assignedTo: 'employee@example.com',
          createdAt: {
            toDate: () => new Date('2024-01-15'), // Within range
            seconds: Math.floor(new Date('2024-01-15').getTime() / 1000),
            nanoseconds: 0,
          },
          updatedAt: {
            toDate: () => new Date('2024-01-20'),
            seconds: Math.floor(new Date('2024-01-20').getTime() / 1000),
            nanoseconds: 0,
          },
        }),
        buildDoc('task-2', {
          title: 'Task 2',
          status: 'Ongoing',
          assignedTo: 'employee@example.com',
          createdAt: {
            toDate: () => new Date('2024-02-15'), // Outside range
            seconds: Math.floor(new Date('2024-02-15').getTime() / 1000),
            nanoseconds: 0,
          },
        }),
        buildDoc('task-3', {
          title: 'Task 3',
          status: 'Completed',
          assignedTo: 'employee@example.com',
          createdAt: {
            toDate: () => new Date('2024-01-10'), // Within range
            seconds: Math.floor(new Date('2024-01-10').getTime() / 1000),
            nanoseconds: 0,
          },
          updatedAt: {
            toDate: () => new Date('2024-01-12'),
            seconds: Math.floor(new Date('2024-01-12').getTime() / 1000),
            nanoseconds: 0,
          },
        }),
      ];

      let callCount = 0;
      mockUsersCollection.doc.mockImplementation((email) => {
        const mockDocRef = {
          get: jest.fn().mockResolvedValue(
            callCount++ === 0 
              ? buildDoc('director@example.com', requesterData)
              : buildDoc('employee@example.com', employeeData)
          ),
        };
        return mockDocRef;
      });
      
      mockTasksCollection.get.mockResolvedValue(buildSnapshot(tasks));

      req.query.requesterId = 'director@example.com';
      req.query.employeeEmail = 'employee@example.com';
      req.query.startDate = '2024-01-01';
      req.query.endDate = '2024-01-31';

      try {
        await reportsController.generateIndividualReport(req, res);

        if (res.status.mock.calls[0]?.[0] !== 200) {
          console.error('❌ Expected 200, got:', res.status.mock.calls[0]?.[0]);
          console.error('❌ Response:', res.json.mock.calls[0]?.[0]);
        }
      } catch (error) {
        console.error('❌ Test error:', error.message);
        throw error;
      }

      expect(res.status).toHaveBeenCalledWith(200);
      const response = res.json.mock.calls[0][0];
      // Should only include tasks created in January (task-1 and task-3)
      expect(response.report.summary.totalTasks).toBe(2);
      expect(response.report.summary.completedTasks).toBe(2);
    });

    it('allows HR to view all employees across departments', async () => {
      const requesterData = {
        role: 'hr',
        department: 'HR and Admin',
      };

      const employeeData = {
        role: 'staff',
        department: 'Engineering', // Different department
        name: 'Engineering Employee',
      };

      const tasks = [];

      let callCount = 0;
      mockUsersCollection.doc.mockImplementation((email) => {
        const mockDocRef = {
          get: jest.fn().mockResolvedValue(
            callCount++ === 0 
              ? buildDoc('hr@example.com', requesterData)
              : buildDoc('employee@example.com', employeeData)
          ),
        };
        return mockDocRef;
      });
      
      mockTasksCollection.get.mockResolvedValue(buildSnapshot(tasks));

      req.query.requesterId = 'hr@example.com';
      req.query.employeeEmail = 'employee@example.com'; // Different department employee

      try {
        await reportsController.generateIndividualReport(req, res);

        if (res.status.mock.calls[0]?.[0] !== 200) {
          console.error('❌ Expected 200, got:', res.status.mock.calls[0]?.[0]);
          console.error('❌ Response:', res.json.mock.calls[0]?.[0]);
        }
      } catch (error) {
        console.error('❌ Test error:', error.message);
        throw error;
      }

      expect(res.status).toHaveBeenCalledWith(200);
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.report.employee.department).toBe('Engineering');
    });
  });

  describe('Error Handling', () => {
    it('returns 401 when requesterId is missing', async () => {
      req.params.projectId = 'project-1';
      req.query.requesterId = undefined;

      await reportsController.generateProjectReport(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('returns 404 when project does not exist', async () => {
      req.params.projectId = 'nonexistent';
      req.query.requesterId = 'user@example.com';

      mockProjectsCollection.doc().get.mockResolvedValue(buildNonExistentDoc());
      mockUsersCollection.doc().get.mockResolvedValue(buildDoc('user@example.com', { role: 'staff' }));

      await reportsController.generateProjectReport(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('handles empty task lists gracefully', async () => {
      req.params.projectId = 'project-1';
      req.query.requesterId = 'staff@example.com';

      const projectData = {
        name: 'Empty Project',
        members: ['staff@example.com'],
      };

      const userData = { role: 'staff', department: 'Engineering' };

      mockProjectsCollection.doc().get.mockResolvedValue(buildDoc('project-1', projectData));
      mockUsersCollection.doc().get.mockResolvedValue(buildDoc('staff@example.com', userData));
      mockTasksCollection.get.mockResolvedValue(buildSnapshot([]));

      await reportsController.generateProjectReport(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const response = res.json.mock.calls[0][0];
      expect(response.report.summary.totalTasks).toBe(0);
    });

    it('handles tasks without due dates in project report', async () => {
      req.params.projectId = 'project-1';
      req.query.requesterId = 'director@example.com';

      const projectData = {
        name: 'Test Project',
        members: [],
      };

      const userData = { role: 'director', department: 'Any' };

      const tasks = [
        buildDoc('task-1', {
          title: 'Task without due date',
          status: 'Ongoing',
          dueDate: null,
        }),
        buildDoc('task-2', {
          title: 'Task with due date',
          status: 'Ongoing',
          dueDate: {
            toDate: () => new Date(),
            seconds: Math.floor(new Date().getTime() / 1000),
            nanoseconds: 0,
          },
        }),
      ];

      mockProjectsCollection.doc().get.mockResolvedValue(buildDoc('project-1', projectData));
      mockUsersCollection.doc().get.mockResolvedValue(buildDoc('director@example.com', userData));
      mockTasksCollection.get.mockResolvedValue(buildSnapshot(tasks));

      await reportsController.generateProjectReport(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const response = res.json.mock.calls[0][0];
      expect(response.report.tasks.length).toBe(2);
      // Tasks without due date should be sorted to the end
      expect(response.report.tasks[1].title).toBe('Task without due date');
    });

    it('handles database errors gracefully', async () => {
      req.params.projectId = 'project-1';
      req.query.requesterId = 'director@example.com';

      mockProjectsCollection.doc().get.mockRejectedValue(new Error('Database connection failed'));
      mockUsersCollection.doc().get.mockResolvedValue(buildDoc('director@example.com', { role: 'director' }));

      await reportsController.generateProjectReport(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining('Error'),
        })
      );
    });

    it('handles employee not found in individual report', async () => {
      req.query.requesterId = 'director@example.com';
      req.query.employeeEmail = 'nonexistent@example.com';

      let callCount = 0;
      mockUsersCollection.doc.mockImplementation((email) => {
        const mockDocRef = {
          get: jest.fn().mockResolvedValue(
            callCount++ === 0 
              ? buildDoc('director@example.com', { role: 'director', department: 'Any' })
              : buildNonExistentDoc() // Employee not found
          ),
        };
        return mockDocRef;
      });

      await reportsController.generateIndividualReport(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining('not found'),
        })
      );
    });
  });

  // ============================================
  // USER STORY ACCEPTANCE CRITERIA TESTS
  // ============================================

  describe('User Story 1: Monitor Team Progress (Manager) - Acceptance Criteria', () => {
    beforeEach(() => {
      req.query.requesterId = 'manager@example.com';
      mockUsersCollection.doc.mockImplementation((email) => ({
        get: jest.fn().mockResolvedValue(buildDoc(email, {
          role: 'manager',
          department: 'Engineering',
          name: 'Test Manager',
        })),
      }));
      mockUsersCollection.where.mockReturnValue(mockUsersCollection);
      mockTasksCollection.where.mockReturnValue(mockTasksCollection);
    });

    describe('AC1: View all team members\' task details', () => {
      it('should display tasks for all team members in manager\'s department', async () => {
        const teamMembers = [
          buildDoc('member1@example.com', {
            email: 'member1@example.com',
            name: 'Member 1',
            role: 'staff',
            department: 'Engineering',
          }),
          buildDoc('member2@example.com', {
            email: 'member2@example.com',
            name: 'Member 2',
            role: 'staff',
            department: 'Engineering',
          }),
        ];

        const tasks = [
          buildDoc('task-1', {
            title: 'Task 1',
            assignedTo: 'member1@example.com',
            taskOwnerDepartment: 'Engineering',
            status: 'Ongoing',
          }),
          buildDoc('task-2', {
            title: 'Task 2',
            assignedTo: 'member2@example.com',
            taskOwnerDepartment: 'Engineering',
            status: 'Completed',
          }),
        ];

        mockUsersCollection.get.mockResolvedValue(buildSnapshot(teamMembers));
        mockTasksCollection.get.mockResolvedValue(buildSnapshot(tasks));

        req.query.department = 'Engineering';
        await reportsController.generateDepartmentReport(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        const response = res.json.mock.calls[0][0];
        expect(response.report.employeeWorkloads).toBeDefined();
        expect(Object.keys(response.report.employeeWorkloads).length).toBeGreaterThan(0);
      });
    });

    describe('AC2: Select a specific team to generate a report for', () => {
      it('should allow manager to select their department', async () => {
        mockUsersCollection.get.mockResolvedValue(buildSnapshot([]));
        mockTasksCollection.get.mockResolvedValue(buildSnapshot([]));

        req.query.department = 'Engineering';
        await reportsController.generateDepartmentReport(req, res);

        expect(mockUsersCollection.where).toHaveBeenCalledWith('department', '==', 'Engineering');
        expect(res.status).toHaveBeenCalledWith(200);
      });

      it('should prevent manager from accessing other departments', async () => {
        mockUsersCollection.get.mockResolvedValue(buildSnapshot([]));

        req.query.department = 'Finance'; // Different department
        await reportsController.generateDepartmentReport(req, res);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            message: expect.stringContaining('own department'),
          })
        );
      });
    });

    describe('AC3: View summary of team members\' tasks including status and deadlines', () => {
      it('should include task status breakdown for each employee', async () => {
        const teamMembers = [
          buildDoc('member1@example.com', {
            email: 'member1@example.com',
            name: 'Member 1',
            role: 'staff',
            department: 'Engineering',
          }),
        ];

        const tasks = [
          buildDoc('task-1', {
            title: 'Task 1',
            assignedTo: 'member1@example.com',
            taskOwnerDepartment: 'Engineering',
            status: 'Ongoing',
            dueDate: {
              toDate: () => new Date(),
              seconds: Math.floor(new Date().getTime() / 1000),
              nanoseconds: 0,
            },
          }),
          buildDoc('task-2', {
            title: 'Task 2',
            assignedTo: 'member1@example.com',
            taskOwnerDepartment: 'Engineering',
            status: 'Completed',
          }),
        ];

        mockUsersCollection.get.mockResolvedValue(buildSnapshot(teamMembers));
        mockTasksCollection.get.mockResolvedValue(buildSnapshot(tasks));

        req.query.department = 'Engineering';
        await reportsController.generateDepartmentReport(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        const response = res.json.mock.calls[0][0];
        const workload = response.report.employeeWorkloads['member1@example.com'];
        expect(workload).toBeDefined();
        expect(workload['Ongoing']).toBe(1);
        expect(workload['Completed']).toBe(1);
        expect(workload['Total']).toBe(2);
      });
    });

    describe('AC4: Select a date range for tasks to be included', () => {
      it('should filter individual reports by date range', async () => {
        const employeeData = {
          role: 'staff',
          department: 'Engineering',
          name: 'Test Employee',
        };

        const tasks = [
          buildDoc('task-1', {
            title: 'Task 1',
            assignedTo: 'employee@example.com',
            status: 'Completed',
            createdAt: {
              toDate: () => new Date('2024-01-15'),
              seconds: Math.floor(new Date('2024-01-15').getTime() / 1000),
              nanoseconds: 0,
            },
          }),
          buildDoc('task-2', {
            title: 'Task 2',
            assignedTo: 'employee@example.com',
            status: 'Ongoing',
            createdAt: {
              toDate: () => new Date('2024-02-15'), // Outside range
              seconds: Math.floor(new Date('2024-02-15').getTime() / 1000),
              nanoseconds: 0,
            },
          }),
        ];

        let callCount = 0;
        mockUsersCollection.doc.mockImplementation(() => ({
          get: jest.fn().mockResolvedValue(
            callCount++ === 0
              ? buildDoc('manager@example.com', { role: 'manager', department: 'Engineering' })
              : buildDoc('employee@example.com', employeeData)
          ),
        }));

        mockTasksCollection.get.mockResolvedValue(buildSnapshot(tasks));

        req.query.employeeEmail = 'employee@example.com';
        req.query.startDate = '2024-01-01';
        req.query.endDate = '2024-01-31';

        await reportsController.generateIndividualReport(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        const response = res.json.mock.calls[0][0];
        expect(response.report.summary.totalTasks).toBe(1);
      });
    });

    describe('AC5: Export report in PDF format', () => {
      it('should generate report data that can be exported to PDF', async () => {
        const tasks = [
          buildDoc('task-1', {
            title: 'Task 1',
            assignedTo: 'employee@example.com',
            taskOwnerDepartment: 'Engineering',
            status: 'Ongoing',
          }),
        ];

        mockUsersCollection.get.mockResolvedValue(buildSnapshot([
          buildDoc('employee@example.com', { email: 'employee@example.com', role: 'staff', department: 'Engineering' }),
        ]));
        mockTasksCollection.get.mockResolvedValue(buildSnapshot(tasks));

        req.query.department = 'Engineering';
        await reportsController.generateDepartmentReport(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        const response = res.json.mock.calls[0][0];
        expect(response.report).toHaveProperty('title');
        expect(response.report).toHaveProperty('generatedAt');
        expect(response.report).toHaveProperty('employeeWorkloads');
        expect(response.report).toHaveProperty('totalTasks');
      });
    });

    describe('AC6: Can only generate a report for their own team', () => {
      it('should allow manager to view their own department', async () => {
        mockUsersCollection.get.mockResolvedValue(buildSnapshot([]));
        mockTasksCollection.get.mockResolvedValue(buildSnapshot([]));

        req.query.department = 'Engineering'; // Manager's department
        await reportsController.generateDepartmentReport(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
      });

      it('should deny manager access to other departments', async () => {
        req.query.department = 'Finance'; // Different department
        await reportsController.generateDepartmentReport(req, res);

        expect(res.status).toHaveBeenCalledWith(403);
      });
    });
  });

  describe('User Story 3: Project Schedule Overview (Manager) - Acceptance Criteria', () => {
    beforeEach(() => {
      req.params = { projectId: 'project-1' };
      req.query = { requesterId: 'manager@example.com' };

      mockProjectsCollection.doc.mockImplementation(() => ({
        get: jest.fn().mockResolvedValue(buildDoc('project-1', {
          name: 'Test Project',
          department: 'Engineering',
          members: [],
        })),
      }));

      mockUsersCollection.doc.mockImplementation(() => ({
        get: jest.fn().mockResolvedValue(buildDoc('manager@example.com', {
          role: 'manager',
          department: 'Engineering',
        })),
      }));
    });

    describe('AC1: View all tasks within a specific project', () => {
      it('should return all tasks for the selected project', async () => {
        const tasks = [
          buildDoc('task-1', { title: 'Task 1', projectId: 'project-1', status: 'Ongoing' }),
          buildDoc('task-2', { title: 'Task 2', projectId: 'project-1', status: 'Completed' }),
        ];

        mockTasksCollection.get.mockResolvedValue(buildSnapshot(tasks));
        mockTasksCollection.where.mockReturnValue(mockTasksCollection);

        await reportsController.generateProjectReport(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        const response = res.json.mock.calls[0][0];
        expect(response.report.tasks.length).toBe(2);
        expect(response.report.summary.totalTasks).toBe(2);
      });
    });

    describe('AC2: See timeline view of task schedules', () => {
      it('should include tasks sorted by due date for timeline view', async () => {
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 5);
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 5);

        const tasks = [
          buildDoc('task-1', {
            title: 'Task 1',
            projectId: 'project-1',
            status: 'Ongoing',
            dueDate: {
              toDate: () => futureDate,
              seconds: Math.floor(futureDate.getTime() / 1000),
              nanoseconds: 0,
            },
          }),
          buildDoc('task-2', {
            title: 'Task 2',
            projectId: 'project-1',
            status: 'Ongoing',
            dueDate: {
              toDate: () => pastDate,
              seconds: Math.floor(pastDate.getTime() / 1000),
              nanoseconds: 0,
            },
          }),
        ];

        mockTasksCollection.get.mockResolvedValue(buildSnapshot(tasks));

        await reportsController.generateProjectReport(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        const response = res.json.mock.calls[0][0];
        expect(response.report.tasks[0].title).toBe('Task 2'); // Past date comes first
        expect(response.report.tasks[1].title).toBe('Task 1'); // Future date comes second
      });
    });

    describe('AC3: View team member allocation across tasks', () => {
      it('should display workload distribution across team members', async () => {
        const tasks = [
          buildDoc('task-1', {
            title: 'Task 1',
            projectId: 'project-1',
            assignedTo: 'member1@example.com',
            status: 'Ongoing',
          }),
          buildDoc('task-2', {
            title: 'Task 2',
            projectId: 'project-1',
            assignedTo: 'member1@example.com',
            status: 'Completed',
          }),
          buildDoc('task-3', {
            title: 'Task 3',
            projectId: 'project-1',
            assignedTo: 'member2@example.com',
            status: 'Ongoing',
          }),
        ];

        mockTasksCollection.get.mockResolvedValue(buildSnapshot(tasks));
        mockGetAll.mockResolvedValue([
          buildDoc('member1@example.com', { name: 'Member 1' }),
          buildDoc('member2@example.com', { name: 'Member 2' }),
        ]);

        await reportsController.generateProjectReport(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        const response = res.json.mock.calls[0][0];
        expect(response.report.summary.memberWorkload).toBeDefined();
        expect(response.report.summary.memberWorkload['member1@example.com']).toBe(2);
        expect(response.report.summary.memberWorkload['member2@example.com']).toBe(1);
      });
    });

    describe('AC4: Highlight overdue and at-risk tasks', () => {
      it('should mark overdue tasks correctly', async () => {
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 5);

        const tasks = [
          buildDoc('task-1', {
            title: 'Overdue Task',
            projectId: 'project-1',
            status: 'Ongoing',
            dueDate: {
              toDate: () => pastDate,
              seconds: Math.floor(pastDate.getTime() / 1000),
              nanoseconds: 0,
            },
          }),
        ];

        mockTasksCollection.get.mockResolvedValue(buildSnapshot(tasks));
        mockUsersCollection.doc.mockImplementation(() => ({
          get: jest.fn().mockResolvedValue(buildDoc('user', { name: 'Test' })),
        }));
        mockGetAll.mockResolvedValue([]);

        await reportsController.generateProjectReport(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        const response = res.json.mock.calls[0][0];
        expect(response.report.tasks[0].isOverdue).toBe(true);
        expect(response.report.summary.overdueCount).toBe(1);
      });

      it('should mark at-risk tasks (due within 3 days)', async () => {
        const atRiskDate = new Date();
        atRiskDate.setDate(atRiskDate.getDate() + 2); // Due in 2 days

        const tasks = [
          buildDoc('task-1', {
            title: 'At Risk Task',
            projectId: 'project-1',
            status: 'Ongoing',
            dueDate: {
              toDate: () => atRiskDate,
              seconds: Math.floor(atRiskDate.getTime() / 1000),
              nanoseconds: 0,
            },
          }),
        ];

        mockTasksCollection.get.mockResolvedValue(buildSnapshot(tasks));
        mockUsersCollection.doc.mockImplementation(() => ({
          get: jest.fn().mockResolvedValue(buildDoc('user', { name: 'Test' })),
        }));
        mockGetAll.mockResolvedValue([]);

        await reportsController.generateProjectReport(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        const response = res.json.mock.calls[0][0];
        expect(response.report.tasks[0].isAtRisk).toBe(true);
      });
    });
  });

  describe('User Story 5: Workload Distribution Report (HR) - Acceptance Criteria', () => {
    beforeEach(() => {
      req.query = { requesterId: 'hr@example.com' };
      mockUsersCollection.doc.mockImplementation(() => ({
        get: jest.fn().mockResolvedValue(buildDoc('hr@example.com', {
          role: 'hr',
          department: 'HR and Admin',
          name: 'HR Representative',
        })),
      }));
      mockUsersCollection.where.mockReturnValue(mockUsersCollection);
      mockTasksCollection.where.mockReturnValue(mockTasksCollection);
    });

    describe('AC1: Department Selection', () => {
      it('should allow HR to select any department', async () => {
        const users = [
          buildDoc('staff1@example.com', {
            email: 'staff1@example.com',
            name: 'Staff 1',
            role: 'staff',
            department: 'Engineering',
          }),
        ];

        mockUsersCollection.get.mockResolvedValue(buildSnapshot(users));
        mockTasksCollection.get.mockResolvedValue(buildSnapshot([]));

        req.query.department = 'Engineering';
        await reportsController.generateDepartmentReport(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
      });

      it('should allow HR to select any department including their own', async () => {
        mockUsersCollection.get.mockResolvedValue(buildSnapshot([]));
        mockTasksCollection.get.mockResolvedValue(buildSnapshot([]));

        req.query.department = 'HR and Admin';
        await reportsController.generateDepartmentReport(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
      });
    });

    describe('AC2: Task Distribution Overview', () => {
      it('should display total assigned, in-progress, and completed tasks per employee', async () => {
        const users = [
          buildDoc('employee@example.com', {
            email: 'employee@example.com',
            name: 'Employee',
            role: 'staff',
            department: 'Engineering',
          }),
        ];

        const tasks = [
          buildDoc('task-1', {
            title: 'Task 1',
            assignedTo: 'employee@example.com',
            taskOwnerDepartment: 'Engineering',
            status: 'To Do',
          }),
          buildDoc('task-2', {
            title: 'Task 2',
            assignedTo: 'employee@example.com',
            taskOwnerDepartment: 'Engineering',
            status: 'Ongoing',
          }),
          buildDoc('task-3', {
            title: 'Task 3',
            assignedTo: 'employee@example.com',
            taskOwnerDepartment: 'Engineering',
            status: 'Completed',
          }),
        ];

        mockUsersCollection.get.mockResolvedValue(buildSnapshot(users));
        mockTasksCollection.get.mockResolvedValue(buildSnapshot(tasks));

        req.query.department = 'Engineering';
        await reportsController.generateDepartmentReport(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        const response = res.json.mock.calls[0][0];
        const workload = response.report.employeeWorkloads['employee@example.com'];
        expect(workload).toBeDefined();
        expect(workload['To Do']).toBe(1);
        expect(workload['Ongoing']).toBe(1);
        expect(workload['Completed']).toBe(1);
        expect(workload['Total']).toBe(3);
      });
    });

    describe('AC3: Workload Balance View', () => {
      it('should show workload distribution across department for visualization', async () => {
        const users = [
          buildDoc('employee1@example.com', {
            email: 'employee1@example.com',
            name: 'Employee 1',
            role: 'staff',
            department: 'Engineering',
          }),
          buildDoc('employee2@example.com', {
            email: 'employee2@example.com',
            name: 'Employee 2',
            role: 'staff',
            department: 'Engineering',
          }),
        ];

        const tasks = [
          buildDoc('task-1', {
            assignedTo: 'employee1@example.com',
            taskOwnerDepartment: 'Engineering',
            status: 'Ongoing',
          }),
          buildDoc('task-2', {
            assignedTo: 'employee1@example.com',
            taskOwnerDepartment: 'Engineering',
            status: 'Ongoing',
          }),
          buildDoc('task-3', {
            assignedTo: 'employee2@example.com',
            taskOwnerDepartment: 'Engineering',
            status: 'Ongoing',
          }),
        ];

        mockUsersCollection.get.mockResolvedValue(buildSnapshot(users));
        mockTasksCollection.get.mockResolvedValue(buildSnapshot(tasks));

        req.query.department = 'Engineering';
        await reportsController.generateDepartmentReport(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        const response = res.json.mock.calls[0][0];
        expect(response.report.employeeWorkloads['employee1@example.com']['Total']).toBe(2);
        expect(response.report.employeeWorkloads['employee2@example.com']['Total']).toBe(1);
      });
    });

    describe('AC4: Average Task Completion Time', () => {
      it('should calculate average task completion time for individual reports', async () => {
        const employeeData = {
          role: 'staff',
          department: 'Engineering',
          name: 'Employee',
        };

        const tasks = [
          buildDoc('task-1', {
            title: 'Task 1',
            assignedTo: 'employee@example.com',
            status: 'Completed',
            createdAt: {
              toDate: () => new Date('2024-01-01'),
              seconds: Math.floor(new Date('2024-01-01').getTime() / 1000),
              nanoseconds: 0,
            },
            updatedAt: {
              toDate: () => new Date('2024-01-05'), // 4 days
              seconds: Math.floor(new Date('2024-01-05').getTime() / 1000),
              nanoseconds: 0,
            },
          }),
          buildDoc('task-2', {
            title: 'Task 2',
            assignedTo: 'employee@example.com',
            status: 'Completed',
            createdAt: {
              toDate: () => new Date('2024-01-10'),
              seconds: Math.floor(new Date('2024-01-10').getTime() / 1000),
              nanoseconds: 0,
            },
            updatedAt: {
              toDate: () => new Date('2024-01-15'), // 5 days
              seconds: Math.floor(new Date('2024-01-15').getTime() / 1000),
              nanoseconds: 0,
            },
          }),
        ];

        let callCount = 0;
        mockUsersCollection.doc.mockImplementation(() => ({
          get: jest.fn().mockResolvedValue(
            callCount++ === 0
              ? buildDoc('hr@example.com', { role: 'hr', department: 'HR and Admin' })
              : buildDoc('employee@example.com', employeeData)
          ),
        }));

        mockTasksCollection.get.mockResolvedValue(buildSnapshot(tasks));

        req.query.employeeEmail = 'employee@example.com';
        await reportsController.generateIndividualReport(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        const response = res.json.mock.calls[0][0];
        expect(parseFloat(response.report.summary.avgTimePerTask)).toBe(4.5);
      });
    });

    describe('AC5: Export Functionality', () => {
      it('should generate report data suitable for PDF export', async () => {
        mockUsersCollection.get.mockResolvedValue(buildSnapshot([]));
        mockTasksCollection.get.mockResolvedValue(buildSnapshot([]));

        req.query.department = 'Engineering';
        await reportsController.generateDepartmentReport(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        const response = res.json.mock.calls[0][0];
        expect(response.report).toHaveProperty('title');
        expect(response.report).toHaveProperty('generatedAt');
        expect(response.report).toHaveProperty('employeeWorkloads');
      });
    });
  });

  describe('User Story 6: Report Generation for Review (Director) - Acceptance Criteria', () => {
    beforeEach(() => {
      req.query = { requesterId: 'director@example.com' };
      mockUsersCollection.doc.mockImplementation(() => ({
        get: jest.fn().mockResolvedValue(buildDoc('director@example.com', {
          role: 'director',
          department: 'Executive',
          name: 'Director',
        })),
      }));
      mockTasksCollection.where.mockReturnValue(mockTasksCollection);
      mockUsersCollection.where.mockReturnValue(mockUsersCollection);
    });

    describe('AC1: View all tasks from all departments', () => {
      it('should return tasks from all departments when no filter applied', async () => {
        const tasks = [
          buildDoc('task-1', {
            title: 'Engineering Task',
            taskOwnerDepartment: 'Engineering',
            status: 'Ongoing',
          }),
          buildDoc('task-2', {
            title: 'Finance Task',
            taskOwnerDepartment: 'Finance',
            status: 'Completed',
          }),
          buildDoc('task-3', {
            title: 'HR Task',
            taskOwnerDepartment: 'HR and Admin',
            status: 'To Do',
          }),
        ];

        mockTasksCollection.get.mockResolvedValue(buildSnapshot(tasks));
        mockUsersCollection.get.mockResolvedValue(buildSnapshot([]));

        await reportsController.generateCompanyReport(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        const response = res.json.mock.calls[0][0];
        expect(response.report.summary.totalTasks).toBe(3);
      });
    });

    describe('AC2: Filter tasks by department', () => {
      it('should filter tasks by single department', async () => {
        const tasks = [
          buildDoc('task-1', {
            title: 'Engineering Task',
            taskOwnerDepartment: 'Engineering',
            status: 'Ongoing',
          }),
          buildDoc('task-2', {
            title: 'Finance Task',
            taskOwnerDepartment: 'Finance',
            status: 'Completed',
          }),
        ];

        mockTasksCollection.get.mockResolvedValue(buildSnapshot(tasks));
        mockUsersCollection.get.mockResolvedValue(buildSnapshot([]));

        req.query.department = 'Engineering';
        await reportsController.generateCompanyReport(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        const response = res.json.mock.calls[0][0];
        expect(response.report.summary.totalTasks).toBe(1);
      });

      it('should filter tasks by multiple departments', async () => {
        const tasks = [
          buildDoc('task-1', {
            title: 'Engineering Task',
            taskOwnerDepartment: 'Engineering',
            status: 'Ongoing',
            createdAt: {
              toDate: () => new Date('2024-01-15'),
              seconds: Math.floor(new Date('2024-01-15').getTime() / 1000),
              nanoseconds: 0,
            },
          }),
          buildDoc('task-2', {
            title: 'Finance Task',
            taskOwnerDepartment: 'Finance',
            status: 'Completed',
            createdAt: {
              toDate: () => new Date('2024-01-15'),
              seconds: Math.floor(new Date('2024-01-15').getTime() / 1000),
              nanoseconds: 0,
            },
          }),
          buildDoc('task-3', {
            title: 'HR Task',
            taskOwnerDepartment: 'HR and Admin',
            status: 'To Do',
            createdAt: {
              toDate: () => new Date('2024-01-15'),
              seconds: Math.floor(new Date('2024-01-15').getTime() / 1000),
              nanoseconds: 0,
            },
          }),
        ];

        mockTasksCollection.get.mockResolvedValue(buildSnapshot(tasks));
        mockUsersCollection.get.mockResolvedValue(buildSnapshot([]));

        req.query.departments = 'Engineering,Finance';
        await reportsController.generateCompanyReport(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        const response = res.json.mock.calls[0][0];
        expect(response.report.summary.totalTasks).toBe(2);
      });
    });

    describe('AC3: View key indicators of progress (% overdue)', () => {
      it('should calculate and display overdue percentage', async () => {
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 5);

        const tasks = [
          buildDoc('task-1', {
            title: 'Overdue Task',
            taskOwnerDepartment: 'Engineering',
            status: 'Ongoing',
            dueDate: {
              toDate: () => pastDate,
              seconds: Math.floor(pastDate.getTime() / 1000),
              nanoseconds: 0,
            },
          }),
          buildDoc('task-2', {
            title: 'On Time Task',
            taskOwnerDepartment: 'Engineering',
            status: 'Ongoing',
            dueDate: {
              toDate: () => new Date(Date.now() + 86400000), // Tomorrow
              seconds: Math.floor((Date.now() + 86400000) / 1000),
              nanoseconds: 0,
            },
          }),
          buildDoc('task-3', {
            title: 'Completed Task',
            taskOwnerDepartment: 'Engineering',
            status: 'Completed',
            dueDate: {
              toDate: () => pastDate,
              seconds: Math.floor(pastDate.getTime() / 1000),
              nanoseconds: 0,
            },
          }),
        ];

        mockTasksCollection.get.mockResolvedValue(buildSnapshot(tasks));
        mockUsersCollection.get.mockResolvedValue(buildSnapshot([]));

        await reportsController.generateCompanyReport(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        const response = res.json.mock.calls[0][0];
        expect(response.report.summary.overdueCount).toBe(1);
        expect(response.report.summary.overduePercentage).toBe(33);
      });
    });

    describe('AC4: Select a time range for tasks', () => {
      it('should filter company report by date range', async () => {
        const tasks = [
          buildDoc('task-1', {
            title: 'Task 1',
            taskOwnerDepartment: 'Engineering',
            status: 'Ongoing',
            createdAt: {
              toDate: () => new Date('2024-01-15'),
              seconds: Math.floor(new Date('2024-01-15').getTime() / 1000),
              nanoseconds: 0,
            },
          }),
          buildDoc('task-2', {
            title: 'Task 2',
            taskOwnerDepartment: 'Engineering',
            status: 'Ongoing',
            createdAt: {
              toDate: () => new Date('2024-02-15'), // Outside range
              seconds: Math.floor(new Date('2024-02-15').getTime() / 1000),
              nanoseconds: 0,
            },
          }),
        ];

        mockTasksCollection.get.mockResolvedValue(buildSnapshot(tasks));
        mockUsersCollection.get.mockResolvedValue(buildSnapshot([]));

        req.query.startDate = '2024-01-01';
        req.query.endDate = '2024-01-31';
        await reportsController.generateCompanyReport(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        const response = res.json.mock.calls[0][0];
        expect(response.report.summary.totalTasks).toBe(1);
      });
    });

    describe('AC5: Export report in PDF format', () => {
      it('should generate report data suitable for PDF export', async () => {
        mockTasksCollection.get.mockResolvedValue(buildSnapshot([]));
        mockUsersCollection.get.mockResolvedValue(buildSnapshot([]));

        await reportsController.generateCompanyReport(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        const response = res.json.mock.calls[0][0];
        expect(response.report).toHaveProperty('title');
        expect(response.report).toHaveProperty('generatedAt');
        expect(response.report).toHaveProperty('summary');
        expect(response.report).toHaveProperty('departmentStats');
      });
    });
  });
});

