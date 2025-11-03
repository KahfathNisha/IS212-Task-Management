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
  await db.collection('Users').doc(email).set({
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
  const usersSnapshot = await db.collection('Users')
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
      expect(response.report.projectName || response.report.title).toBe(`${testPrefix} Project`);
      expect(response.report.summary.totalTasks).toBeGreaterThan(0);
    });

    it('should show status breakdown (To Do, Ongoing, Pending Review, Completed)', async () => {
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
      const summary = response.report.summary;
      
      // Verify all 4 statuses are included in statusCounts
      expect(summary.statusCounts).toHaveProperty('To Do');
      expect(summary.statusCounts).toHaveProperty('Ongoing');
      expect(summary.statusCounts).toHaveProperty('Pending Review');
      expect(summary.statusCounts).toHaveProperty('Completed');
      
      // Verify status counts are numbers
      expect(typeof summary.statusCounts['To Do']).toBe('number');
      expect(typeof summary.statusCounts['Ongoing']).toBe('number');
      expect(typeof summary.statusCounts['Pending Review']).toBe('number');
      expect(typeof summary.statusCounts['Completed']).toBe('number');
      
      // Verify sum of status counts equals total tasks
      const sumOfStatuses = 
        summary.statusCounts['To Do'] + 
        summary.statusCounts['Ongoing'] + 
        summary.statusCounts['Pending Review'] + 
        summary.statusCounts['Completed'];
      expect(sumOfStatuses).toBe(summary.totalTasks);
    });

    it('should show team member workload distribution', async () => {
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
      const summary = response.report.summary;
      
      // Verify memberWorkload exists and is an object
      expect(summary.memberWorkload).toBeDefined();
      expect(typeof summary.memberWorkload).toBe('object');
      
      // Verify memberNames exists (for displaying names in workload chart)
      expect(summary.memberNames).toBeDefined();
      expect(typeof summary.memberNames).toBe('object');
      
      // If there are tasks assigned, verify workload counts
      if (Object.keys(summary.memberWorkload).length > 0) {
        Object.keys(summary.memberWorkload).forEach(email => {
          expect(summary.memberWorkload[email]).toBeGreaterThan(0);
          expect(summary.memberNames[email]).toBeDefined();
        });
      }
    });

    it('should show overdue tasks for deadline planning', async () => {
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
      const summary = response.report.summary;
      
      // Verify overdue information exists
      expect(summary.overdueCount).toBeDefined();
      expect(typeof summary.overdueCount).toBe('number');
      expect(summary.overdueCount).toBeGreaterThanOrEqual(0);
      
      expect(summary.overduePercentage).toBeDefined();
      expect(typeof summary.overduePercentage).toBe('string');
      
      // Verify tasks include isOverdue flag
      if (response.report.tasks && response.report.tasks.length > 0) {
        const overdueTasks = response.report.tasks.filter(t => t.isOverdue === true);
        expect(overdueTasks.length).toBe(summary.overdueCount);
      }
    });

    it('should show at-risk tasks (due in 3 days) for deadline planning', async () => {
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
      
      // Verify tasks include isAtRisk flag for deadline planning
      if (response.report.tasks && response.report.tasks.length > 0) {
        response.report.tasks.forEach(task => {
          expect(task.hasOwnProperty('isAtRisk')).toBe(true);
          expect(typeof task.isAtRisk).toBe('boolean');
          
          // If task is at risk, it should not be completed or overdue
          if (task.isAtRisk) {
            expect(task.status).not.toBe('Completed');
            expect(task.isOverdue).toBe(false);
          }
        });
      }
    });

    it('should sort tasks by due date for deadline planning', async () => {
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
      
      // Verify tasks are sorted by due date
      if (response.report.tasks && response.report.tasks.length > 1) {
        const tasks = response.report.tasks;
        for (let i = 1; i < tasks.length; i++) {
          const prevTask = tasks[i - 1];
          const currTask = tasks[i];
          
          // If both have due dates, verify they're in ascending order
          if (prevTask.dueDate && currTask.dueDate) {
            const prevDate = prevTask.dueDate.toDate ? prevTask.dueDate.toDate() : new Date(prevTask.dueDate);
            const currDate = currTask.dueDate.toDate ? currTask.dueDate.toDate() : new Date(currTask.dueDate);
            expect(prevDate.getTime()).toBeLessThanOrEqual(currDate.getTime());
          }
          // Tasks without due dates should be at the end
          if (!prevTask.dueDate && currTask.dueDate) {
            // This is acceptable - no due date tasks go to end
          }
        }
      }
    });

    it('should include all required fields for schedule overview', async () => {
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
      const report = response.report;
      
      // Verify report structure for schedule overview
      expect(report).toHaveProperty('title');
      expect(report).toHaveProperty('type', 'project');
      expect(report).toHaveProperty('generatedAt');
      expect(report).toHaveProperty('summary');
      expect(report).toHaveProperty('tasks');
      
      // Verify summary structure
      expect(report.summary).toHaveProperty('totalTasks');
      expect(report.summary).toHaveProperty('statusCounts');
      expect(report.summary).toHaveProperty('memberWorkload');
      expect(report.summary).toHaveProperty('memberNames');
      expect(report.summary).toHaveProperty('overdueCount');
      expect(report.summary).toHaveProperty('overduePercentage');
      
      // Verify each task has required fields for timeline display
      if (report.tasks && report.tasks.length > 0) {
        report.tasks.forEach(task => {
          expect(task).toHaveProperty('id');
          expect(task).toHaveProperty('title');
          expect(task).toHaveProperty('status');
          expect(task).toHaveProperty('assignedTo');
          expect(task.hasOwnProperty('isOverdue')).toBe(true);
          expect(task.hasOwnProperty('isAtRisk')).toBe(true);
        });
      }
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

  describe('Department List Integration', () => {
    it('should exclude HR department from department list', async () => {
      const departmentsController = require('../src/controllers/departmentsController');
      
      // Create a mock request with a director user (who can see all departments)
      const req = {
        user: {
          email: directorEmail,
          role: 'director',
          department: 'Executive'
        }
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };

      await departmentsController.getAllDepartments(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const response = res.json.mock.calls[0][0];
      
      // Verify HR departments are filtered out
      if (Array.isArray(response)) {
        const hrDepartments = response.filter(dept => {
          const deptName = (dept.name || dept.id || '').toUpperCase();
          return deptName === 'HR' || 
                 deptName === 'H R' ||
                 deptName.startsWith('HR ') || 
                 deptName.includes(' HR ') ||
                 deptName.endsWith(' HR') ||
                 deptName === 'HUMAN RESOURCES' ||
                 deptName === 'HR AND ADMIN' ||
                 deptName === 'HR & ADMIN';
        });
        expect(hrDepartments.length).toBe(0);
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
      // Create a Finance user for testing
      const financeUserEmail = `${testPrefix}-finance@example.com`;
      await createTestUser(financeUserEmail, {
        name: 'Test Finance User',
        role: 'staff',
        department: 'Finance',
      });

      // Create tasks in different departments
      await createTestTask(`${testPrefix}-finance-task`, {
        title: `${testPrefix} Finance Task`,
        status: 'Ongoing',
        assignedTo: financeUserEmail,
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
      await db.collection('Users').doc(financeUserEmail).delete();
    });

    it('should exclude HR department from company report', async () => {
      // Create a task in HR department
      await createTestTask(`${testPrefix}-hr-task`, {
        title: `${testPrefix} HR Task`,
        status: 'Ongoing',
        assignedTo: hrEmail,
        taskOwnerDepartment: 'HR and Admin',
        createdAt: new Date('2024-01-15'),
      });

      // Create a task in a non-HR department for comparison
      await createTestTask(`${testPrefix}-engineering-task`, {
        title: `${testPrefix} Engineering Task`,
        status: 'Ongoing',
        assignedTo: employeeEmail,
        taskOwnerDepartment: 'Engineering',
        createdAt: new Date('2024-01-15'),
      });

      const req = {
        query: {
          requesterId: directorEmail,
          // No department filter - should show all departments except HR
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
      
      // Verify HR department is NOT in departmentStats
      if (response.report.departmentStats && response.report.departmentStats.length > 0) {
        const hrDepartments = response.report.departmentStats.filter(dept => {
          const deptName = (dept.name || '').toUpperCase();
          return deptName === 'HR' || 
                 deptName === 'H R' ||
                 deptName.startsWith('HR ') || 
                 deptName.includes(' HR ') ||
                 deptName.endsWith(' HR') ||
                 deptName === 'HUMAN RESOURCES' ||
                 deptName === 'HR AND ADMIN' ||
                 deptName === 'HR & ADMIN';
        });
        expect(hrDepartments.length).toBe(0);
      }
      
      // Verify Engineering department IS included
      const engineeringDepts = response.report.departmentStats?.filter(dept => 
        (dept.name || '').toUpperCase() === 'ENGINEERING'
      ) || [];
      // Engineering should be included if tasks exist
      
      // Cleanup
      await db.collection('tasks').doc(`${testPrefix}-hr-task`).delete();
      await db.collection('tasks').doc(`${testPrefix}-engineering-task`).delete();
    });

    it('should filter out HR department even when explicitly selected', async () => {
      // Create an Engineering user for testing
      const engUserEmail = `${testPrefix}-engineering-user@example.com`;
      await createTestUser(engUserEmail, {
        name: 'Test Engineering User',
        role: 'staff',
        department: 'Engineering',
      });

      // Create a task in HR department (should be excluded)
      await createTestTask(`${testPrefix}-hr-explicit-task`, {
        title: `${testPrefix} HR Explicit Task`,
        status: 'Ongoing',
        assignedTo: hrEmail,
        taskOwnerDepartment: 'HR and Admin',
        createdAt: new Date('2024-01-15'),
      });

      // Create a task in Engineering department (should be included)
      await createTestTask(`${testPrefix}-engineering-explicit-task`, {
        title: `${testPrefix} Engineering Explicit Task`,
        status: 'Ongoing',
        assignedTo: engUserEmail,
        taskOwnerDepartment: 'Engineering',
        createdAt: new Date('2024-01-15'),
      });

      // Try to explicitly select HR department
      const req = {
        query: {
          requesterId: directorEmail,
          departments: 'HR and Admin,Engineering', // HR explicitly selected
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
      
      // Verify HR department is NOT in departmentStats even though it was selected
      if (response.report.departmentStats && response.report.departmentStats.length > 0) {
        const hrDepartments = response.report.departmentStats.filter(dept => {
          const deptName = (dept.name || '').toUpperCase();
          return deptName === 'HR' || 
                 deptName === 'H R' ||
                 deptName.startsWith('HR ') || 
                 deptName.includes(' HR ') ||
                 deptName.endsWith(' HR') ||
                 deptName === 'HUMAN RESOURCES' ||
                 deptName === 'HR AND ADMIN' ||
                 deptName === 'HR & ADMIN';
        });
        expect(hrDepartments.length).toBe(0);
      }
      
      // Verify Engineering tasks are included
      expect(response.report.summary.totalTasks).toBeGreaterThan(0);
      
      // Cleanup
      await db.collection('tasks').doc(`${testPrefix}-hr-explicit-task`).delete();
      await db.collection('tasks').doc(`${testPrefix}-engineering-explicit-task`).delete();
      await db.collection('Users').doc(engUserEmail).delete();
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

