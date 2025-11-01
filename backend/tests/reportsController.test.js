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

jest.mock('../src/config/firebase', () => ({
  db: {
    collection: jest.fn((name) => {
      if (name === 'tasks') return mockTasksCollection;
      if (name === 'projects') return mockProjectsCollection;
      if (name === 'Users') return mockUsersCollection;
      throw new Error(`Unknown collection: ${name}`);
    }),
  },
}));

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
      expect(response.report.metrics.totalTasks).toBe(4);
      expect(response.report.metrics.completedCount).toBe(2);
      expect(response.report.metrics.overdueCount).toBe(1);
      expect(response.report.metrics.completionRate).toBe(50.0); // 2/4 * 100
      expect(response.report.metrics.avgTimePerTask).toBe(3.5); // (2+5)/2
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
  });
});

