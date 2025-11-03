/**
 * Integration Tests for Report Generation
 * Tests report generation with real Firebase connections (using emulator)
 */

const path = require('path');
const fs = require('fs');
const envPath = path.join(__dirname, '../src/config/.env');

if (!fs.existsSync(envPath)) {
  console.warn(`⚠️ .env file not found at: ${envPath}. Tests may fail without proper configuration.`);
}

require('dotenv').config({ path: envPath });

const { admin, db } = require('./firebase-init');
const reportsController = require('../src/controllers/reportsController');

// Helper to create test data
async function createTestUser(email, userData) {
  await db.collection('users').doc(email).set({
    name: userData.name || 'Test User',
    email: email,
    role: userData.role || 'staff',
    department: userData.department || 'Engineering',
    ...userData,
  }, { merge: true });
}

async function createTestProject(projectId, projectData) {
  await db.collection('projects').doc(projectId).set({
    name: projectData.name || 'Test Project',
    department: projectData.department || 'Engineering',
    members: projectData.members || [],
    ...projectData,
  }, { merge: true });
}

async function createTestTask(taskId, taskData) {
  await db.collection('tasks').doc(taskId).set({
    title: taskData.title || 'Test Task',
    status: taskData.status || 'To Do',
    assignedTo: taskData.assignedTo,
    projectId: taskData.projectId,
    taskOwnerDepartment: taskData.taskOwnerDepartment || 'Engineering',
    dueDate: taskData.dueDate ? admin.firestore.Timestamp.fromDate(new Date(taskData.dueDate)) : null,
    createdAt: taskData.createdAt ? admin.firestore.Timestamp.fromDate(new Date(taskData.createdAt)) : admin.firestore.Timestamp.now(),
    updatedAt: taskData.updatedAt ? admin.firestore.Timestamp.fromDate(new Date(taskData.updatedAt)) : admin.firestore.Timestamp.now(),
    priority: taskData.priority || 1,
    archived: false,
    ...taskData,
  }, { merge: true });
}

async function cleanupTestData(testPrefix) {
  // Clean up users
  const usersSnapshot = await db.collection('users')
    .where('email', '>=', testPrefix)
    .where('email', '<=', testPrefix + '\uf8ff')
    .get();
  
  for (const doc of usersSnapshot.docs) {
    await doc.ref.delete();
  }

  // Clean up projects
  const projectsSnapshot = await db.collection('projects')
    .where('name', '>=', testPrefix)
    .where('name', '<=', testPrefix + '\uf8ff')
    .get();
  
  for (const doc of projectsSnapshot.docs) {
    await doc.ref.delete();
  }

  // Clean up tasks
  const tasksSnapshot = await db.collection('tasks')
    .where('title', '>=', testPrefix)
    .where('title', '<=', testPrefix + '\uf8ff')
    .get();
  
  for (const doc of tasksSnapshot.docs) {
    await doc.ref.delete();
  }
}

describe('Report Generation Integration Tests', () => {
  const testPrefix = `test-report-${Date.now()}`;
  const staffEmail = `${testPrefix}-staff@example.com`;
  const managerEmail = `${testPrefix}-manager@example.com`;
  const directorEmail = `${testPrefix}-director@example.com`;
  const hrEmail = `${testPrefix}-hr@example.com`;
  const employeeEmail = `${testPrefix}-employee@example.com`;
  
  let testProjectId;
  let testTaskIds = [];

  beforeAll(async () => {
    // Create test users
    await createTestUser(staffEmail, {
      name: 'Test Staff',
      role: 'staff',
      department: 'Engineering',
    });
    
    await createTestUser(managerEmail, {
      name: 'Test Manager',
      role: 'manager',
      department: 'Engineering',
    });
    
    await createTestUser(directorEmail, {
      name: 'Test Director',
      role: 'director',
      department: 'Executive',
    });
    
    await createTestUser(hrEmail, {
      name: 'Test HR',
      role: 'hr',
      department: 'HR and Admin',
    });
    
    await createTestUser(employeeEmail, {
      name: 'Test Employee',
      role: 'staff',
      department: 'Engineering',
    });

    // Create test project
    testProjectId = `${testPrefix}-project`;
    await createTestProject(testProjectId, {
      name: `${testPrefix} Project`,
      department: 'Engineering',
      members: [staffEmail, employeeEmail],
    });

    // Create test tasks
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 5);
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 5);

    testTaskIds.push(`${testPrefix}-task-1`);
    await createTestTask(testTaskIds[0], {
      title: `${testPrefix} Task 1`,
      status: 'Completed',
      assignedTo: employeeEmail,
      projectId: testProjectId,
      taskOwnerDepartment: 'Engineering',
      dueDate: pastDate,
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date('2024-01-20'),
    });

    testTaskIds.push(`${testPrefix}-task-2`);
    await createTestTask(testTaskIds[1], {
      title: `${testPrefix} Task 2`,
      status: 'Ongoing',
      assignedTo: employeeEmail,
      projectId: testProjectId,
      taskOwnerDepartment: 'Engineering',
      dueDate: pastDate, // Overdue
      createdAt: new Date('2024-01-10'),
    });

    testTaskIds.push(`${testPrefix}-task-3`);
    await createTestTask(testTaskIds[2], {
      title: `${testPrefix} Task 3`,
      status: 'To Do',
      assignedTo: staffEmail,
      projectId: testProjectId,
      taskOwnerDepartment: 'Engineering',
      dueDate: futureDate,
      createdAt: new Date('2024-02-15'),
    });
  });

  afterAll(async () => {
    await cleanupTestData(testPrefix);
  });

  describe('Project Report Integration', () => {
    it('should generate project report for staff member', async () => {
      const req = {
        params: { projectId: testProjectId },
        query: { requesterId: staffEmail },
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };

      await reportsController.generateProjectReport(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.report.projectName).toBe(`${testPrefix} Project`);
      expect(response.report.summary.totalTasks).toBeGreaterThan(0);
    });

    it('should deny staff access to non-member project', async () => {
      const nonMemberProjectId = `${testPrefix}-nonmember-project`;
      await createTestProject(nonMemberProjectId, {
        name: `${testPrefix} Non-Member Project`,
        department: 'Finance',
        members: ['other@example.com'], // Staff not a member
      });

      const req = {
        params: { projectId: nonMemberProjectId },
        query: { requesterId: staffEmail },
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };

      await reportsController.generateProjectReport(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      
      // Cleanup
      await db.collection('projects').doc(nonMemberProjectId).delete();
    });
  });

  describe('Individual Report Integration', () => {
    it('should generate individual report for employee', async () => {
      const req = {
        query: {
          requesterId: managerEmail,
          employeeEmail: employeeEmail,
        },
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };

      await reportsController.generateIndividualReport(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.report.type).toBe('individual');
      expect(response.report.employee.email).toBe(employeeEmail);
      expect(response.report.summary.totalTasks).toBeGreaterThan(0);
    });

    it('should filter individual report by date range', async () => {
      const req = {
        query: {
          requesterId: directorEmail,
          employeeEmail: employeeEmail,
          startDate: '2024-01-01',
          endDate: '2024-01-31',
        },
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };

      await reportsController.generateIndividualReport(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      // Should only include tasks created in January
      expect(response.report.summary.totalTasks).toBeGreaterThanOrEqual(1);
    });

    it('should allow HR to view any employee', async () => {
      const req = {
        query: {
          requesterId: hrEmail,
          employeeEmail: employeeEmail, // Different department
        },
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };

      await reportsController.generateIndividualReport(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.report.employee.email).toBe(employeeEmail);
    });
  });

  describe('Department Report Integration', () => {
    it('should generate department report for manager', async () => {
      const req = {
        query: {
          requesterId: managerEmail,
          department: 'Engineering',
        },
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };

      await reportsController.generateDepartmentReport(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.report.type).toBe('department');
      expect(response.report.totalTasks).toBeGreaterThan(0);
    });

    it('should filter HR users from department report', async () => {
      const req = {
        query: {
          requesterId: directorEmail,
          department: 'HR and Admin',
        },
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };

      await reportsController.generateDepartmentReport(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      
      // HR users should not appear in employeeWorkloads
      if (response.report.employeeWorkloads) {
        const hrEmails = Object.keys(response.report.employeeWorkloads).filter(
          email => email.includes('hr@')
        );
        expect(hrEmails.length).toBe(0);
      }
    });
  });

  describe('Company Report Integration', () => {
    it('should generate company report for director', async () => {
      const req = {
        query: {
          requesterId: directorEmail,
        },
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };

      await reportsController.generateCompanyReport(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.report.type).toBe('company');
      expect(response.report.summary.totalTasks).toBeGreaterThanOrEqual(0);
    });

    it('should allow HR to generate company report', async () => {
      const req = {
        query: {
          requesterId: hrEmail,
        },
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };

      await reportsController.generateCompanyReport(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.report.type).toBe('company');
    });

    it('should filter company report by multiple departments', async () => {
      // Create tasks in different departments
      await createTestTask(`${testPrefix}-finance-task`, {
        title: `${testPrefix} Finance Task`,
        status: 'Ongoing',
        assignedTo: 'finance@example.com',
        taskOwnerDepartment: 'Finance',
        createdAt: new Date('2024-01-15'),
      });

      const req = {
        query: {
          requesterId: directorEmail,
          departments: 'Engineering,Finance',
        },
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };

      await reportsController.generateCompanyReport(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      // Should include tasks from both departments
      expect(response.report.summary.totalTasks).toBeGreaterThan(0);
      
      // Cleanup
      await db.collection('tasks').doc(`${testPrefix}-finance-task`).delete();
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle missing requesterId gracefully', async () => {
      const req = {
        params: { projectId: testProjectId },
        query: {},
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };

      await reportsController.generateProjectReport(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should handle non-existent project gracefully', async () => {
      const req = {
        params: { projectId: 'nonexistent-project-12345' },
        query: { requesterId: directorEmail },
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };

      await reportsController.generateProjectReport(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should handle empty task lists gracefully', async () => {
      const emptyProjectId = `${testPrefix}-empty-project`;
      await createTestProject(emptyProjectId, {
        name: `${testPrefix} Empty Project`,
        department: 'Engineering',
        members: [staffEmail],
      });

      const req = {
        params: { projectId: emptyProjectId },
        query: { requesterId: staffEmail },
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };

      await reportsController.generateProjectReport(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const response = res.json.mock.calls[0][0];
      expect(response.report.summary.totalTasks).toBe(0);
      
      // Cleanup
      await db.collection('projects').doc(emptyProjectId).delete();
    });
  });
});

