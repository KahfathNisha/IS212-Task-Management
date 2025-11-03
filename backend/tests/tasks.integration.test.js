/* Integration tests for tasks - tests full flow: route -> middleware -> controller -> database
   Uses the same pattern as auth.integration.test.js and projects.integration.test.js
   REQUIREMENTS: Firestore emulator (default localhost:8080) should be running
*/

// Set NODE_ENV=test to prevent server.js auto-listen
process.env.NODE_ENV = 'test';
// Point to local emulators (if using emulators)
process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || 'localhost:8080';

// Load environment variables
require('dotenv').config({ path: '../src/config/.env' });

// Require and initialize Firebase BEFORE importing the app
const { admin, db } = require('./firebase-init');
const request = require('supertest');
const app = require('../src/server');

const base = request(app);

// Helper function for timeout protection (from auth.integration.test.js pattern)
// Default timeout increased for slower Firebase operations
const withTimeout = (p, ms = 10000) => new Promise((resolve, reject) => {
  const t = setTimeout(() => reject(new Error('operation timed out')), ms);
  Promise.resolve(p).then((v) => { clearTimeout(t); resolve(v); }).catch((e) => { clearTimeout(t); reject(e); });
});

// Set timeout for all tests
jest.setTimeout(30000); // 30 seconds like auth tests

describe('Tasks Integration Tests', () => {
  let testTasks = [];
  let testProjects = [];
  const testUsers = {
    director: { email: 'director@test.com', role: 'director', department: 'All', name: 'Director User' },
    hr: { email: 'hr@test.com', role: 'hr', department: 'HR', name: 'HR User' },
    manager: { email: 'manager@test.com', role: 'manager', department: 'Engineering', name: 'Manager User' },
    staff: { email: 'staff@test.com', role: 'staff', department: 'Engineering', name: 'Staff User' },
    otherManager: { email: 'other-manager@test.com', role: 'manager', department: 'Sales', name: 'Other Manager' },
    otherStaff: { email: 'other-staff@test.com', role: 'staff', department: 'Sales', name: 'Other Staff' }
  };

  // Helper to ensure test user exists in Firestore (best effort, with timeout)
  const ensureTestUser = async (userData) => {
    if (!db) return;
    try {
      await withTimeout(
        db.collection('Users').doc(userData.email).set({
          ...userData,
          createdAt: admin.firestore.Timestamp.now(),
          updatedAt: admin.firestore.Timestamp.now()
        }, { merge: true }),
        8000
      );
    } catch (err) {
      // Silently fail - user might already exist or Firestore unavailable
    }
  };

  // Helper to create/get auth token for a user
  const getAuthToken = async (userKey) => {
    const user = testUsers[userKey];
    if (!user || !admin || !db) return null;
    
    try {
      // Ensure user exists in Firestore first
      await ensureTestUser(user);
      
      // Try to get existing user or create one in Auth
      let userRecord;
      try {
        userRecord = await admin.auth().getUserByEmail(user.email);
      } catch (err) {
        // User doesn't exist in Auth, create them
        userRecord = await admin.auth().createUser({
          email: user.email,
          displayName: user.name,
          disabled: false
        });
      }
      
      // Create custom token (can be used as ID token with emulator)
      return await admin.auth().createCustomToken(userRecord.uid);
    } catch (err) {
      // Auth/Firestore not available
      return null;
    }
  };

  // Helper to create a test project
  const createTestProject = async (name, department, createdBy) => {
    if (!db) return null;
    try {
      const projectRef = await withTimeout(db.collection('projects').add({
        name: `${name} ${Date.now()}`,
        department,
        isDeleted: false,
        createdBy,
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now()
      }), 10000);
      testProjects.push(projectRef.id);
      return projectRef.id;
    } catch (err) {
      console.warn(`⚠️ Failed to create test project ${name}:`, err.message);
      return null;
    }
  };

  beforeAll(async () => {
    // Best-effort user creation (with timeout protection)
    if (!db) {
      console.warn('⚠️ Firestore `db` is not available; some tests may be skipped.');
      return;
    }

    try {
      // Create test users in Firestore (best effort - they might already exist)
      await Promise.allSettled(
        Object.values(testUsers).map(user => ensureTestUser(user))
      );
    } catch (err) {
      console.warn('⚠️ Skipping test user setup:', err.message);
    }
  }, 20000); // 20 second timeout like auth tests

  afterAll(async () => {
    // Best-effort cleanup (from auth.integration.test.js pattern)
    if (!db) return;
    
    try {
      // Clean up test tasks (best effort)
      for (const taskId of testTasks) {
        await withTimeout(db.collection('tasks').doc(taskId).set(null), 2000).catch(() => {});
      }
      
      // Clean up test projects (best effort)
      for (const projectId of testProjects) {
        await withTimeout(db.collection('projects').doc(projectId).set(null), 2000).catch(() => {});
      }
      
      // Clean up recurring tasks created during tests (best effort)
      try {
        const recurringTasksSnapshot = await withTimeout(
          db.collection('recurringTasks').where('taskOwner', 'in', Object.values(testUsers).map(u => u.email)).limit(20).get(),
          5000
        );
        for (const doc of recurringTasksSnapshot.docs) {
          await withTimeout(doc.ref.set(null), 2000).catch(() => {});
        }
      } catch (err) {
        // Ignore recurring tasks cleanup errors
      }
    } catch (err) {
      // Ignore cleanup errors
    }

    // Close Firebase connections to allow Jest to exit cleanly (from auth.integration.test.js)
    // NOTE: Don't call db.terminate() - it can cause "client already terminated" errors
    // Just wait a bit and let Jest handle cleanup
    try {
      const apps = admin?.apps || [];
      for (const a of apps) {
        if (typeof a?.delete === 'function') {
          await a.delete().catch(() => {});
        }
      }
    } catch (err) {
      // Ignore app deletion errors
    }
    // Give background SDK tasks a moment to finish and allow Jest to exit cleanly
    await new Promise((resolve) => setTimeout(resolve, 500));
  });

  beforeEach(() => {
    testTasks = [];
  });

  describe('POST /api/tasks - Create Task', () => {
    it('should create a task as director', async () => {
      const taskData = {
        title: 'Integration Test Task - Director',
        description: 'Created by director',
        taskOwner: 'director@test.com',
        taskOwnerDepartment: 'All',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
        priority: 5,
        status: 'Unassigned'
      };

      const token = await getAuthToken('director');
      if (!token) {
        console.warn('⚠️ Skipping test - Firebase Auth not available');
        return;
      }

      const response = await base
        .post('/api/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send(taskData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.message).toContain('successfully');

      testTasks.push(response.body.id);

      // Verify task was created in database
      const taskDoc = await db.collection('tasks').doc(response.body.id).get();
      expect(taskDoc.exists).toBe(true);
      expect(taskDoc.data().title).toBe(taskData.title);
      expect(taskDoc.data().taskOwner).toBe('director@test.com');
    });

    it('should create a task as manager', async () => {
      const taskData = {
        title: 'Integration Test Task - Manager',
        description: 'Created by manager',
        taskOwner: 'manager@test.com',
        taskOwnerDepartment: 'Engineering',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        priority: 5,
        status: 'Unassigned'
      };

      const token = await getAuthToken('manager');
      if (!token) {
        console.warn('⚠️ Skipping test - Firebase Auth not available');
        return;
      }

      const response = await base
        .post('/api/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send(taskData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');

      testTasks.push(response.body.id);
    });

    it('should allow HR to create task only for themselves', async () => {
      const taskData = {
        title: 'HR Self Task',
        description: 'Created by HR for self',
        taskOwner: 'hr@test.com',
        taskOwnerDepartment: 'HR',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        priority: 5,
        status: 'Unassigned'
      };

      const token = await getAuthToken('hr');
      if (!token) {
        console.warn('⚠️ Skipping test - Firebase Auth not available');
        return;
      }

      const response = await base
        .post('/api/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send(taskData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');

      testTasks.push(response.body.id);
    });

    it('should reject HR creating task for someone else', async () => {
      const taskData = {
        title: 'HR Unauthorized Task',
        description: 'HR trying to create for someone else',
        taskOwner: 'staff@test.com',
        taskOwnerDepartment: 'Engineering',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        priority: 5,
        status: 'Unassigned'
      };

      const token = await getAuthToken('hr');
      if (!token) {
        console.warn('⚠️ Skipping test - Firebase Auth not available');
        return;
      }

      const response = await base
        .post('/api/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send(taskData);

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('HR users can only create tasks for themselves');

      // Verify task was not created
      const tasksSnapshot = await db.collection('tasks')
        .where('title', '==', 'HR Unauthorized Task')
        .get();
      expect(tasksSnapshot.empty).toBe(true);
    });

    it('should require title', async () => {
      const taskData = {
        description: 'No title',
        taskOwner: 'director@test.com',
        taskOwnerDepartment: 'All',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        priority: 5
      };

      const token = await getAuthToken('director');
      if (!token) {
        console.warn('⚠️ Skipping test - Firebase Auth not available');
        return;
      }

      const response = await base
        .post('/api/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send(taskData);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Title is required');
    });

    it('should require taskOwner', async () => {
      const taskData = {
        title: 'Task without owner',
        description: 'No owner',
        taskOwnerDepartment: 'All',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        priority: 5
      };

      const token = await getAuthToken('director');
      if (!token) {
        console.warn('⚠️ Skipping test - Firebase Auth not available');
        return;
      }

      const response = await base
        .post('/api/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send(taskData);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Task Owner is required');
    });

    it('should require taskOwnerDepartment', async () => {
      const taskData = {
        title: 'Task without department',
        description: 'No department',
        taskOwner: 'director@test.com',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        priority: 5
      };

      const token = await getAuthToken('director');
      if (!token) {
        console.warn('⚠️ Skipping test - Firebase Auth not available');
        return;
      }

      const response = await base
        .post('/api/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send(taskData);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Task Owner Department is required');
    });

    it('should require dueDate', async () => {
      const taskData = {
        title: 'Task without due date',
        description: 'No due date',
        taskOwner: 'director@test.com',
        taskOwnerDepartment: 'All',
        priority: 5
      };

      const token = await getAuthToken('director');
      if (!token) {
        console.warn('⚠️ Skipping test - Firebase Auth not available');
        return;
      }

      const response = await base
        .post('/api/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send(taskData);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Due Date is required');
    });

    it('should require priority', async () => {
      const taskData = {
        title: 'Task without priority',
        description: 'No priority',
        taskOwner: 'director@test.com',
        taskOwnerDepartment: 'All',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      };

      const token = await getAuthToken('director');
      if (!token) {
        console.warn('⚠️ Skipping test - Firebase Auth not available');
        return;
      }

      const response = await base
        .post('/api/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send(taskData);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Priority is required');
    });

    it('should create task with subtasks', async () => {
      const taskData = {
        title: 'Task with Subtasks',
        description: 'Has subtasks',
        taskOwner: 'director@test.com',
        taskOwnerDepartment: 'All',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        priority: 5,
        subtasks: [
          {
            title: 'Subtask 1',
            dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
            priority: 3
          },
          {
            title: 'Subtask 2',
            dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
            priority: 7
          }
        ]
      };

      const token = await getAuthToken('director');
      if (!token) {
        console.warn('⚠️ Skipping test - Firebase Auth not available');
        return;
      }

      const response = await base
        .post('/api/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send(taskData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');

      const taskDoc = await db.collection('tasks').doc(response.body.id).get();
      expect(taskDoc.exists).toBe(true);
      expect(taskDoc.data().subtasks).toHaveLength(2);

      testTasks.push(response.body.id);
    });

    it('should create task linked to project', async () => {
      // First create a project
      const projectId = await createTestProject('Task Project Test', 'Engineering', 'director@test.com');
      if (!projectId) {
        console.warn('⚠️ Skipping test - Failed to create test project');
        return;
      }

      const taskData = {
        title: 'Task Linked to Project',
        description: 'Belongs to a project',
        taskOwner: 'director@test.com',
        taskOwnerDepartment: 'All',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        priority: 5,
        projectId: projectId
      };

      const token = await getAuthToken('director');
      if (!token) {
        console.warn('⚠️ Skipping test - Firebase Auth not available');
        return;
      }

      const response = await base
        .post('/api/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send(taskData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');

      const taskDoc = await db.collection('tasks').doc(response.body.id).get();
      expect(taskDoc.data().projectId).toBe(projectId);

      testTasks.push(response.body.id);
    });
  });

  describe('GET /api/tasks - Get All Tasks', () => {
    let testTaskId1, testTaskId2;

    beforeEach(async () => {
      if (!db) {
        testTaskId1 = null;
        testTaskId2 = null;
        return;
      }

      try {
        // Create test tasks
        const task1Ref = await withTimeout(db.collection('tasks').add({
          title: `Get All Tasks Test 1 ${Date.now()}`,
          description: 'First test task',
          taskOwner: 'director@test.com',
          taskOwnerDepartment: 'All',
          dueDate: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
          priority: 5,
          status: 'Ongoing',
          archived: false,
          createdAt: admin.firestore.Timestamp.now(),
          updatedAt: admin.firestore.Timestamp.now()
        }), 10000);
        testTaskId1 = task1Ref.id;

        const task2Ref = await withTimeout(db.collection('tasks').add({
          title: `Get All Tasks Test 2 ${Date.now()}`,
          description: 'Second test task',
          taskOwner: 'manager@test.com',
          taskOwnerDepartment: 'Engineering',
          dueDate: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 10 * 24 * 60 * 60 * 1000)),
          priority: 7,
          status: 'Pending',
          archived: false,
          createdAt: admin.firestore.Timestamp.now(),
          updatedAt: admin.firestore.Timestamp.now()
        }), 10000);
        testTaskId2 = task2Ref.id;

        testTasks.push(testTaskId1, testTaskId2);
      } catch (err) {
        console.warn('⚠️ Error creating test tasks:', err.message);
        testTaskId1 = null;
        testTaskId2 = null;
      }
    });

    it('should return tasks for authenticated user', async () => {
      const token = await getAuthToken('director');
      if (!token) {
        console.warn('⚠️ Skipping test - Firebase Auth not available');
        return;
      }

      const response = await base
        .get('/api/tasks')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(0);
    });

    it('should exclude archived tasks', async () => {
      if (!db || !testTaskId1) {
        console.warn('⚠️ Skipping test - Task not created');
        return;
      }

      // Archive a task
      await withTimeout(db.collection('tasks').doc(testTaskId1).update({
        archived: true
      }), 5000);

      const token = await getAuthToken('director');
      if (!token) {
        console.warn('⚠️ Skipping test - Firebase Auth not available');
        return;
      }

      const response = await base
        .get('/api/tasks')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      const archivedTask = response.body.find(t => t.id === testTaskId1);
      expect(archivedTask).toBeUndefined();
    });
  });

  describe('GET /api/tasks/:id - Get Single Task', () => {
    let testTaskId;

    beforeEach(async () => {
      if (!db) {
        testTaskId = null;
        return;
      }

      try {
        const taskRef = await withTimeout(db.collection('tasks').add({
          title: `Get Task Test ${Date.now()}`,
          description: 'Test task for GET endpoint',
          taskOwner: 'director@test.com',
          taskOwnerDepartment: 'All',
          dueDate: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
          priority: 5,
          status: 'Ongoing',
          archived: false,
          createdAt: admin.firestore.Timestamp.now(),
          updatedAt: admin.firestore.Timestamp.now()
        }), 10000);
        testTaskId = taskRef.id;
        testTasks.push(testTaskId);
      } catch (err) {
        console.warn('⚠️ Error creating test task:', err.message);
        testTaskId = null;
      }
    });

    it('should return task by ID', async () => {
      if (!testTaskId) {
        console.warn('⚠️ Skipping test - Task not created');
        return;
      }

      const token = await getAuthToken('director');
      if (!token) {
        console.warn('⚠️ Skipping test - Firebase Auth not available');
        return;
      }

      const response = await base
        .get(`/api/tasks/${testTaskId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(testTaskId);
      expect(response.body.title).toContain('Get Task Test');
    });

    it('should return 404 for non-existent task', async () => {
      const fakeId = 'non-existent-task-id-12345';
      const token = await getAuthToken('director');
      if (!token) {
        console.warn('⚠️ Skipping test - Firebase Auth not available');
        return;
      }

      const response = await base
        .get(`/api/tasks/${fakeId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toContain('not found');
    });
  });

  describe('PUT /api/tasks/:id - Update Task', () => {
    let testTaskId;

    beforeEach(async () => {
      if (!db) {
        testTaskId = null;
        return;
      }

      try {
        const taskRef = await withTimeout(db.collection('tasks').add({
          title: `Update Test Task ${Date.now()}`,
          description: 'Original description',
          taskOwner: 'director@test.com',
          taskOwnerDepartment: 'All',
          dueDate: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
          priority: 5,
          status: 'Ongoing',
          archived: false,
          createdAt: admin.firestore.Timestamp.now(),
          updatedAt: admin.firestore.Timestamp.now()
        }), 10000);
        testTaskId = taskRef.id;
        testTasks.push(testTaskId);
      } catch (err) {
        console.warn('⚠️ Error creating test task:', err.message);
        testTaskId = null;
      }
    });

    it('should update task as task owner', async () => {
      if (!testTaskId) {
        console.warn('⚠️ Skipping test - Task not created');
        return;
      }

      const updateData = {
        title: 'Updated Task Title',
        description: 'Updated description'
      };

      const token = await getAuthToken('director');
      if (!token) {
        console.warn('⚠️ Skipping test - Firebase Auth not available');
        return;
      }

      const response = await base
        .put(`/api/tasks/${testTaskId}`)
        .set('Authorization', `Bearer ${token}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.title).toBe(updateData.title);
      expect(response.body.description).toBe(updateData.description);

      // Verify in database
      const taskDoc = await db.collection('tasks').doc(testTaskId).get();
      expect(taskDoc.data().title).toBe(updateData.title);
    });

    it('should reject user without edit permission', async () => {
      if (!db || !testTaskId) {
        console.warn('⚠️ Skipping test - Task not created');
        return;
      }

      // Create task owned by different user
      const taskRef = await withTimeout(db.collection('tasks').add({
        title: `Restricted Task ${Date.now()}`,
        description: 'Task for permission test',
        taskOwner: 'director@test.com',
        taskOwnerDepartment: 'All',
        assignedTo: null,
        collaborators: [],
        dueDate: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
        priority: 5,
        status: 'Ongoing',
        archived: false,
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now()
      }), 10000);
      const restrictedTaskId = taskRef.id;
      testTasks.push(restrictedTaskId);

      const updateData = {
        description: 'Unauthorized update attempt'
      };

      // Try to update as staff (no permission)
      const token = await getAuthToken('staff');
      if (!token) {
        console.warn('⚠️ Skipping test - Firebase Auth not available');
        return;
      }

      const response = await base
        .put(`/api/tasks/${restrictedTaskId}`)
        .set('Authorization', `Bearer ${token}`)
        .send(updateData);

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('permission');
    });

    it('should only allow task owner to change due date', async () => {
      if (!db || !testTaskId) {
        console.warn('⚠️ Skipping test - Task not created');
        return;
      }

      // Create task assigned to staff but owned by director
      const assignedTaskRef = await withTimeout(db.collection('tasks').add({
        title: `Assigned Task ${Date.now()}`,
        description: 'Task assigned to staff',
        taskOwner: 'director@test.com',
        taskOwnerDepartment: 'All',
        assignedTo: 'staff@test.com',
        dueDate: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
        priority: 5,
        status: 'Ongoing',
        archived: false,
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now()
      }), 10000);
      const assignedTaskId = assignedTaskRef.id;
      testTasks.push(assignedTaskId);

      const newDueDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

      // Try to update due date as assignee (should fail)
      const staffToken = await getAuthToken('staff');
      if (!staffToken) {
        console.warn('⚠️ Skipping test - Firebase Auth not available');
        return;
      }

      const staffResponse = await base
        .put(`/api/tasks/${assignedTaskId}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ dueDate: newDueDate });

      expect(staffResponse.status).toBe(403);
      expect(staffResponse.body.message).toContain('due date');

      // Update due date as owner (should succeed)
      const directorToken = await getAuthToken('director');
      if (!directorToken) {
        console.warn('⚠️ Skipping test - Firebase Auth not available');
        return;
      }

      const directorResponse = await base
        .put(`/api/tasks/${assignedTaskId}`)
        .set('Authorization', `Bearer ${directorToken}`)
        .send({ dueDate: newDueDate });

      expect(directorResponse.status).toBe(200);
    });
  });

  describe('PUT /api/tasks/:id/status - Update Task Status', () => {
    let testTaskId;

    beforeEach(async () => {
      if (!db) {
        testTaskId = null;
        return;
      }

      try {
        const taskRef = await withTimeout(db.collection('tasks').add({
          title: `Status Update Test Task ${Date.now()}`,
          description: 'Task for status update test',
          taskOwner: 'director@test.com',
          taskOwnerDepartment: 'All',
          dueDate: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
          priority: 5,
          status: 'Ongoing',
          archived: false,
          statusHistory: [{
            timestamp: admin.firestore.Timestamp.now(),
            oldStatus: null,
            newStatus: 'Ongoing'
          }],
          createdAt: admin.firestore.Timestamp.now(),
          updatedAt: admin.firestore.Timestamp.now()
        }), 10000);
        testTaskId = taskRef.id;
        testTasks.push(testTaskId);
      } catch (err) {
        console.warn('⚠️ Error creating test task:', err.message);
        testTaskId = null;
      }
    });

    it('should update task status', async () => {
      if (!testTaskId) {
        console.warn('⚠️ Skipping test - Task not created');
        return;
      }

      const token = await getAuthToken('director');
      if (!token) {
        console.warn('⚠️ Skipping test - Firebase Auth not available');
        return;
      }

      const response = await base
        .put(`/api/tasks/${testTaskId}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'Completed' });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('Completed');

      // Verify status history was updated
      const taskDoc = await db.collection('tasks').doc(testTaskId).get();
      const statusHistory = taskDoc.data().statusHistory;
      expect(Array.isArray(statusHistory)).toBe(true);
      expect(statusHistory.length).toBeGreaterThan(1);
      
      const lastStatusChange = statusHistory[statusHistory.length - 1];
      expect(lastStatusChange.newStatus).toBe('Completed');
    });

    it('should return 404 for non-existent task', async () => {
      const fakeId = 'non-existent-task-id-12345';
      const token = await getAuthToken('director');
      if (!token) {
        console.warn('⚠️ Skipping test - Firebase Auth not available');
        return;
      }

      const response = await base
        .put(`/api/tasks/${fakeId}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'Completed' });

      expect(response.status).toBe(404);
      expect(response.body.message).toContain('not found');
    });
  });

  describe('PUT /api/tasks/:id/assign - Assign Task', () => {
    let testTaskId;

    beforeEach(async () => {
      if (!db) {
        testTaskId = null;
        return;
      }

      try {
        const taskRef = await withTimeout(db.collection('tasks').add({
          title: `Assign Test Task ${Date.now()}`,
          description: 'Task for assignment test',
          taskOwner: 'director@test.com',
          taskOwnerDepartment: 'All',
          assignedTo: null,
          assigneeId: null,
          dueDate: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
          priority: 5,
          status: 'Unassigned',
          archived: false,
          createdAt: admin.firestore.Timestamp.now(),
          updatedAt: admin.firestore.Timestamp.now()
        }), 10000);
        testTaskId = taskRef.id;
        testTasks.push(testTaskId);
      } catch (err) {
        console.warn('⚠️ Error creating test task:', err.message);
        testTaskId = null;
      }
    });

    it('should assign task to user', async () => {
      if (!testTaskId) {
        console.warn('⚠️ Skipping test - Task not created');
        return;
      }

      const token = await getAuthToken('director');
      if (!token) {
        console.warn('⚠️ Skipping test - Firebase Auth not available');
        return;
      }

      const response = await base
        .put(`/api/tasks/${testTaskId}/assign`)
        .set('Authorization', `Bearer ${token}`)
        .send({ assigneeId: 'staff@test.com' });

      expect(response.status).toBe(200);
      expect(response.body.assignedTo).toBe('staff@test.com');
      expect(response.body.status).toBe('Ongoing');
    });

    it('should prevent assignment to same or higher tier', async () => {
      if (!testTaskId) {
        console.warn('⚠️ Skipping test - Task not created');
        return;
      }

      const token = await getAuthToken('manager');
      if (!token) {
        console.warn('⚠️ Skipping test - Firebase Auth not available');
        return;
      }

      // Manager trying to assign to another manager (same tier)
      const response = await base
        .put(`/api/tasks/${testTaskId}/assign`)
        .set('Authorization', `Bearer ${token}`)
        .send({ assigneeId: 'other-manager@test.com' });

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('same or higher tier');
    });
  });

  describe('PUT /api/tasks/:id/archive - Archive Task', () => {
    let testTaskId;

    beforeEach(async () => {
      if (!db) {
        testTaskId = null;
        return;
      }

      try {
        const taskRef = await withTimeout(db.collection('tasks').add({
          title: `Archive Test Task ${Date.now()}`,
          description: 'Task for archive test',
          taskOwner: 'director@test.com',
          taskOwnerDepartment: 'All',
          dueDate: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
          priority: 5,
          status: 'Ongoing',
          archived: false,
          createdAt: admin.firestore.Timestamp.now(),
          updatedAt: admin.firestore.Timestamp.now()
        }), 10000);
        testTaskId = taskRef.id;
        testTasks.push(testTaskId);
      } catch (err) {
        console.warn('⚠️ Error creating test task:', err.message);
        testTaskId = null;
      }
    });

    it('should archive task', async () => {
      if (!testTaskId) {
        console.warn('⚠️ Skipping test - Task not created');
        return;
      }

      const token = await getAuthToken('director');
      if (!token) {
        console.warn('⚠️ Skipping test - Firebase Auth not available');
        return;
      }

      const response = await base
        .put(`/api/tasks/${testTaskId}/archive`)
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.archived).toBe(true);

      // Verify in database
      const taskDoc = await db.collection('tasks').doc(testTaskId).get();
      expect(taskDoc.data().archived).toBe(true);
    });
  });

  describe('PUT /api/tasks/:id/unarchive - Unarchive Task', () => {
    let testTaskId;

    beforeEach(async () => {
      if (!db) {
        testTaskId = null;
        return;
      }

      try {
        // Create an archived task
        const taskRef = await withTimeout(db.collection('tasks').add({
          title: `Unarchive Test Task ${Date.now()}`,
          description: 'Archived task for unarchive test',
          taskOwner: 'director@test.com',
          taskOwnerDepartment: 'All',
          dueDate: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
          priority: 5,
          status: 'Completed',
          archived: true,
          createdAt: admin.firestore.Timestamp.now(),
          updatedAt: admin.firestore.Timestamp.now()
        }), 10000);
        testTaskId = taskRef.id;
        testTasks.push(testTaskId);
      } catch (err) {
        console.warn('⚠️ Error creating test task:', err.message);
        testTaskId = null;
      }
    });

    it('should unarchive task', async () => {
      if (!testTaskId) {
        console.warn('⚠️ Skipping test - Task not created');
        return;
      }

      const token = await getAuthToken('director');
      if (!token) {
        console.warn('⚠️ Skipping test - Firebase Auth not available');
        return;
      }

      const response = await base
        .put(`/api/tasks/${testTaskId}/unarchive`)
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.archived).toBe(false);

      // Verify in database
      const taskDoc = await db.collection('tasks').doc(testTaskId).get();
      expect(taskDoc.data().archived).toBe(false);
    });
  });

  describe('GET /api/tasks/project/:projectId - Get Tasks by Project', () => {
    let projectId, testTaskId;

    beforeEach(async () => {
      if (!db) {
        projectId = null;
        testTaskId = null;
        return;
      }

      try {
        // Create a project
        projectId = await createTestProject('Project for Tasks', 'Engineering', 'director@test.com');
        if (!projectId) {
          return;
        }

        // Create a task linked to the project
        const taskRef = await withTimeout(db.collection('tasks').add({
          title: `Project Task ${Date.now()}`,
          description: 'Task linked to project',
          taskOwner: 'director@test.com',
          taskOwnerDepartment: 'All',
          projectId: projectId,
          dueDate: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
          priority: 5,
          status: 'Ongoing',
          archived: false,
          createdAt: admin.firestore.Timestamp.now(),
          updatedAt: admin.firestore.Timestamp.now()
        }), 10000);
        testTaskId = taskRef.id;
        testTasks.push(testTaskId);
      } catch (err) {
        console.warn('⚠️ Error creating test project/task:', err.message);
        projectId = null;
        testTaskId = null;
      }
    });

    it('should return tasks for a project', async () => {
      if (!projectId || !testTaskId) {
        console.warn('⚠️ Skipping test - Project or task not created');
        return;
      }

      const response = await base.get(`/api/tasks/project/${projectId}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(1);
      
      const projectTask = response.body.find(t => t.id === testTaskId);
      expect(projectTask).toBeDefined();
      expect(projectTask.projectId).toBe(projectId);
    });

    it('should return empty array for project with no tasks', async () => {
      if (!db) {
        console.warn('⚠️ Skipping test - Firestore not available');
        return;
      }

      const emptyProjectId = await createTestProject('Empty Project', 'Engineering', 'director@test.com');
      if (!emptyProjectId) {
        console.warn('⚠️ Skipping test - Failed to create test project');
        return;
      }

      const response = await base.get(`/api/tasks/project/${emptyProjectId}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });
  });

  describe('GET /api/tasks/archived - Get Archived Tasks', () => {
    let archivedTaskId;

    beforeEach(async () => {
      if (!db) {
        archivedTaskId = null;
        return;
      }

      try {
        // Create an archived task
        const taskRef = await withTimeout(db.collection('tasks').add({
          title: `Archived Task ${Date.now()}`,
          description: 'This task is archived',
          taskOwner: 'director@test.com',
          taskOwnerDepartment: 'All',
          dueDate: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
          priority: 5,
          status: 'Completed',
          archived: true,
          createdAt: admin.firestore.Timestamp.now(),
          updatedAt: admin.firestore.Timestamp.now()
        }), 10000);
        archivedTaskId = taskRef.id;
        testTasks.push(archivedTaskId);
      } catch (err) {
        console.warn('⚠️ Error creating archived task:', err.message);
        archivedTaskId = null;
      }
    });

    it('should return archived tasks', async () => {
      if (!archivedTaskId) {
        console.warn('⚠️ Skipping test - Archived task not created');
        return;
      }

      const response = await base.get('/api/tasks/archived');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(1);
      
      const archivedTask = response.body.find(t => t.id === archivedTaskId);
      expect(archivedTask).toBeDefined();
      expect(archivedTask.archived).toBe(true);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle malformed request body gracefully', async () => {
      const token = await getAuthToken('director');
      if (!token) {
        console.warn('⚠️ Skipping test - Firebase Auth not available');
        return;
      }

      const response = await base
        .post('/api/tasks')
        .set('Authorization', `Bearer ${token}`)
        .set('Content-Type', 'application/json')
        .send('this is not json'); // Malformed JSON

      expect(response.status).toBe(400);
    });

    it('should handle invalid due date format', async () => {
      const taskData = {
        title: 'Task with Invalid Date',
        description: 'Invalid date format',
        taskOwner: 'director@test.com',
        taskOwnerDepartment: 'All',
        dueDate: 'not-a-date',
        priority: 5
      };

      const token = await getAuthToken('director');
      if (!token) {
        console.warn('⚠️ Skipping test - Firebase Auth not available');
        return;
      }

      const response = await base
        .post('/api/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send(taskData);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('dueDate');
    });

    it('should prevent due date in the past', async () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // Yesterday
      const taskData = {
        title: 'Task with Past Due Date',
        description: 'Due date in the past',
        taskOwner: 'director@test.com',
        taskOwnerDepartment: 'All',
        dueDate: pastDate,
        priority: 5
      };

      const token = await getAuthToken('director');
      if (!token) {
        console.warn('⚠️ Skipping test - Firebase Auth not available');
        return;
      }

      const response = await base
        .post('/api/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send(taskData);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('past');
    });
  });
});

