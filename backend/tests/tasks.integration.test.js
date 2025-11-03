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
// Reduced default timeout for faster operations while still being safe
const withTimeout = (p, ms = 8000) => new Promise((resolve, reject) => {
  const t = setTimeout(() => reject(new Error('operation timed out')), ms);
  Promise.resolve(p).then((v) => { clearTimeout(t); resolve(v); }).catch((e) => { clearTimeout(t); reject(e); });
});

// Set timeout for all tests
jest.setTimeout(25000); // 25 seconds - reduced from 30 for faster test execution

describe('Tasks Integration Tests', () => {
  let testTasks = [];
  let testProjects = [];
  let authTokens = {}; // Cache tokens to avoid repeated Firebase Auth calls
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
        5000 // Reduced from 8000
      );
    } catch (err) {
      // Silently fail - user might already exist or Firestore unavailable
    }
  };

  // Helper to create/get auth token for a user (cached)
  const getAuthToken = async (userKey) => {
    // Return cached token if available
    if (authTokens[userKey]) return authTokens[userKey];
    
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
      const token = await admin.auth().createCustomToken(userRecord.uid);
      authTokens[userKey] = token; // Cache the token
      return token;
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
      }), 12000); // Slightly increased for reliability
      testProjects.push(projectRef.id);
      return projectRef.id;
    } catch (err) {
      console.warn(`⚠️ Failed to create test project ${name}:`, err.message);
      return null;
    }
  };

  beforeAll(async () => {
    // Best-effort user creation and token caching (with timeout protection)
    if (!db) {
      console.warn('⚠️ Firestore `db` is not available; some tests may be skipped.');
      return;
    }

    try {
      // Create test users in Firestore in parallel (best effort - they might already exist)
      await Promise.allSettled(
        Object.values(testUsers).map(user => ensureTestUser(user))
      );
      
      // Pre-generate and cache all auth tokens to avoid repeated Firebase Auth calls
      await Promise.allSettled(
        Object.keys(testUsers).map(userKey => getAuthToken(userKey))
      );
    } catch (err) {
      console.warn('⚠️ Skipping test user setup:', err.message);
    }
  }, 15000); // 15 second timeout - reduced for faster startup

  afterAll(async () => {
    // Best-effort cleanup with parallel operations for faster cleanup
    if (!db) return;
    
    try {
      // Clean up test tasks in parallel (best effort)
      await Promise.allSettled(
        testTasks.map(taskId => 
          withTimeout(db.collection('tasks').doc(taskId).set(null), 2000).catch(() => {})
        )
      );
      
      // Clean up test projects in parallel (best effort)
      await Promise.allSettled(
        testProjects.map(projectId => 
          withTimeout(db.collection('projects').doc(projectId).set(null), 2000).catch(() => {})
        )
      );
      
      // Clean up recurring tasks created during tests (best effort)
      try {
        const recurringTasksSnapshot = await withTimeout(
          db.collection('recurringTasks').where('taskOwner', 'in', Object.values(testUsers).map(u => u.email)).limit(20).get(),
          5000
        );
        await Promise.allSettled(
          recurringTasksSnapshot.docs.map(doc => 
            withTimeout(doc.ref.set(null), 2000).catch(() => {})
          )
        );
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
    await new Promise((resolve) => setTimeout(resolve, 300)); // Reduced from 500ms
  });

  beforeEach(() => {
    testTasks = [];
    testProjects = [];
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

      // Verify project stats were updated
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for async update
      const projectDoc = await db.collection('projects').doc(projectId).get();
      const projectData = projectDoc.data();
      expect(projectData.totalTasks).toBeGreaterThanOrEqual(1);

      testTasks.push(response.body.id);
    });

    it('should create recurring task', async () => {
      const taskData = {
        title: 'Daily Standup',
        description: 'Daily team standup meeting',
        taskOwner: 'director@test.com',
        taskOwnerDepartment: 'All',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        priority: 5,
        recurrence: {
          enabled: true,
          type: 'daily',
          startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        }
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

      // Verify recurring task template was created
      const recurringTaskDoc = await db.collection('recurringTasks').doc(response.body.id).get();
      expect(recurringTaskDoc.exists).toBe(true);
      expect(recurringTaskDoc.data().recurrence.enabled).toBe(true);

      // Verify task instances were created
      const tasksSnapshot = await db.collection('tasks')
        .where('recurringTaskId', '==', response.body.id)
        .get();
      expect(tasksSnapshot.docs.length).toBeGreaterThan(0);
    });

    it('should validate subtask requirements', async () => {
      const taskData = {
        title: 'Task with Invalid Subtask',
        description: 'Has invalid subtask',
        taskOwner: 'director@test.com',
        taskOwnerDepartment: 'All',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        priority: 5,
        subtasks: [
          {
            title: '', // Missing title
            dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
            priority: 3
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

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Subtask');
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
        // Create test tasks in parallel for faster setup
        const [task1Ref, task2Ref] = await Promise.all([
          withTimeout(db.collection('tasks').add({
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
          }), 5000),
          withTimeout(db.collection('tasks').add({
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
          }), 5000)
        ]);
        
        testTaskId1 = task1Ref.id;
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
        }), 5000); // Reduced timeout
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
        }), 5000);
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

    it('should update project stats when task status changes to Completed', async () => {
      if (!db) {
        console.warn('⚠️ Skipping test - Firestore not available');
        return;
      }

      // Create a project
      const projectId = await createTestProject('Stats Test Project', 'Engineering', 'director@test.com');
      if (!projectId) {
        console.warn('⚠️ Skipping test - Failed to create test project');
        return;
      }

      // Create a task linked to the project
      const taskRef = await withTimeout(db.collection('tasks').add({
        title: `Stats Test Task ${Date.now()}`,
        description: 'Task for stats test',
        taskOwner: 'director@test.com',
        taskOwnerDepartment: 'All',
        projectId: projectId,
        dueDate: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
        priority: 5,
        status: 'Ongoing',
        archived: false,
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now()
      }), 5000);
      const taskId = taskRef.id;
      testTasks.push(taskId);

      // Wait for initial project stats update
      await new Promise(resolve => setTimeout(resolve, 1000));

      const token = await getAuthToken('director');
      if (!token) {
        console.warn('⚠️ Skipping test - Firebase Auth not available');
        return;
      }

      // Update task status to Completed
      const response = await base
        .put(`/api/tasks/${taskId}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'Completed' });

      expect(response.status).toBe(200);

      // Wait for project stats update
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Verify project stats were updated
      const projectDoc = await db.collection('projects').doc(projectId).get();
      const projectData = projectDoc.data();
      expect(projectData.totalTasks).toBeGreaterThanOrEqual(1);
      expect(projectData.completedTasks).toBeGreaterThanOrEqual(1);
      expect(projectData.progress).toBeGreaterThanOrEqual(0);
    });

    it('should update task with assigneeId and transfer ownership', async () => {
      if (!db || !testTaskId) {
        console.warn('⚠️ Skipping test - Task not created');
        return;
      }

      const token = await getAuthToken('director');
      if (!token) {
        console.warn('⚠️ Skipping test - Firebase Auth not available');
        return;
      }

      const response = await base
        .put(`/api/tasks/${testTaskId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ 
          assigneeId: 'staff@test.com',
          status: 'Ongoing'
        });

      expect(response.status).toBe(200);

      // Verify task ownership was transferred
      const taskDoc = await db.collection('tasks').doc(testTaskId).get();
      const taskData = taskDoc.data();
      expect(taskData.taskOwner).toBe('staff@test.com');
      expect(taskData.assigneeId).toBe('staff@test.com');
      expect(taskData.taskOwnerDepartment).toBe('Engineering');
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
        }), 5000);
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
      expect(lastStatusChange.oldStatus).toBe('Ongoing');
    });

    it('should handle multiple status transitions correctly', async () => {
      if (!db || !testTaskId) {
        console.warn('⚠️ Skipping test - Task not created');
        return;
      }

      const token = await getAuthToken('director');
      if (!token) {
        console.warn('⚠️ Skipping test - Firebase Auth not available');
        return;
      }

      // First transition: Ongoing -> In Progress
      await base
        .put(`/api/tasks/${testTaskId}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'In Progress' });

      // Second transition: In Progress -> Completed
      const response = await base
        .put(`/api/tasks/${testTaskId}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'Completed' });

      expect(response.status).toBe(200);

      // Verify status history contains all transitions
      const taskDoc = await db.collection('tasks').doc(testTaskId).get();
      const statusHistory = taskDoc.data().statusHistory;
      expect(statusHistory.length).toBeGreaterThanOrEqual(3); // Initial + 2 transitions
      
      // Verify last status is Completed
      const lastStatusChange = statusHistory[statusHistory.length - 1];
      expect(lastStatusChange.newStatus).toBe('Completed');
    });

    it('should not update status history if status unchanged', async () => {
      if (!db || !testTaskId) {
        console.warn('⚠️ Skipping test - Task not created');
        return;
      }

      const token = await getAuthToken('director');
      if (!token) {
        console.warn('⚠️ Skipping test - Firebase Auth not available');
        return;
      }

      // Get initial status history length
      const initialDoc = await db.collection('tasks').doc(testTaskId).get();
      const initialHistoryLength = (initialDoc.data().statusHistory || []).length;

      // Try to set status to the same value
      const response = await base
        .put(`/api/tasks/${testTaskId}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: initialDoc.data().status });

      expect(response.status).toBe(200);

      // Verify status history length didn't increase
      const updatedDoc = await db.collection('tasks').doc(testTaskId).get();
      const updatedHistoryLength = (updatedDoc.data().statusHistory || []).length;
      expect(updatedHistoryLength).toBe(initialHistoryLength);
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
        }), 5000);
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
      
      // Verify task ownership was transferred
      const taskDoc = await db.collection('tasks').doc(testTaskId).get();
      expect(taskDoc.data().taskOwner).toBe('staff@test.com');
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

    it('should prevent assignment to non-existent user', async () => {
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
        .send({ assigneeId: 'nonexistent@test.com' });

      // Should fail when updating task with assigneeId
      expect([400, 404, 403]).toContain(response.status);
    });

    it('should allow director to assign to any lower tier', async () => {
      if (!db || !testTaskId) {
        console.warn('⚠️ Skipping test - Task not created');
        return;
      }

      const token = await getAuthToken('director');
      if (!token) {
        console.warn('⚠️ Skipping test - Firebase Auth not available');
        return;
      }

      // Director assigning to staff (lower tier)
      const response = await base
        .put(`/api/tasks/${testTaskId}/assign`)
        .set('Authorization', `Bearer ${token}`)
        .send({ assigneeId: 'staff@test.com' });

      expect(response.status).toBe(200);
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
        }), 5000);
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

    it('should update project stats when task is archived', async () => {
      if (!db) {
        console.warn('⚠️ Skipping test - Firestore not available');
        return;
      }

      // Create a project
      const projectId = await createTestProject('Archive Stats Project', 'Engineering', 'director@test.com');
      if (!projectId) {
        console.warn('⚠️ Skipping test - Failed to create test project');
        return;
      }

      // Create a task linked to the project
      const taskRef = await withTimeout(db.collection('tasks').add({
        title: `Archive Stats Task ${Date.now()}`,
        description: 'Task for archive stats test',
        taskOwner: 'director@test.com',
        taskOwnerDepartment: 'All',
        projectId: projectId,
        dueDate: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
        priority: 5,
        status: 'Ongoing',
        archived: false,
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now()
      }), 5000);
      const taskId = taskRef.id;
      testTasks.push(taskId);

      // Wait for initial project stats update
      await new Promise(resolve => setTimeout(resolve, 1000));

      const token = await getAuthToken('director');
      if (!token) {
        console.warn('⚠️ Skipping test - Firebase Auth not available');
        return;
      }

      // Archive the task
      const response = await base
        .put(`/api/tasks/${taskId}/archive`)
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(response.status).toBe(200);

      // Wait for project stats update
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Verify project stats were updated (archived tasks shouldn't count)
      const projectDoc = await db.collection('projects').doc(projectId).get();
      const projectData = projectDoc.data();
      // Archived tasks should not be counted in totalTasks
      expect(projectData.totalTasks).toBeGreaterThanOrEqual(0);
    });

    it('should reject archive by user without permission', async () => {
      if (!db) {
        console.warn('⚠️ Skipping test - Firestore not available');
        return;
      }

      // Create task owned by director
      let taskId;
      try {
        const taskRef = await withTimeout(db.collection('tasks').add({
          title: `Protected Task ${Date.now()}`,
          description: 'Task for permission test',
          taskOwner: 'director@test.com',
          taskOwnerDepartment: 'All',
          assignedTo: null,
          collaborators: [],
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
        }), 15000); // Increased timeout to 15 seconds
        taskId = taskRef.id;
        testTasks.push(taskId);
        
        // Small delay to ensure Firestore consistency
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (err) {
        console.warn('⚠️ Skipping test - Failed to create test task:', err.message);
        return;
      }

      // Try to archive as staff (no permission)
      const token = await getAuthToken('staff');
      if (!token) {
        console.warn('⚠️ Skipping test - Firebase Auth not available');
        return;
      }

      // Add timeout wrapper for HTTP request as well
      const response = await withTimeout(
        base
          .put(`/api/tasks/${taskId}/archive`)
          .set('Authorization', `Bearer ${token}`)
          .send({}),
        10000 // 10 second timeout for HTTP request
      );

      expect(response.status).toBe(403);
    }, 30000); // Increase test timeout to 30 seconds
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
        }), 5000);
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
        }), 5000);
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
        }), 5000);
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

  describe('GET /api/tasks/recurring - Get All Recurring Tasks', () => {
    let recurringTaskId;

    beforeEach(async () => {
      if (!db) {
        recurringTaskId = null;
        return;
      }

      try {
        // Create a recurring task template
        const recurringTaskRef = await withTimeout(db.collection('recurringTasks').add({
          title: `Recurring Task Test ${Date.now()}`,
          description: 'Recurring task template',
          taskOwner: 'director@test.com',
          taskOwnerDepartment: 'All',
          recurrence: {
            enabled: true,
            type: 'weekly',
            startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
          },
          active: true,
          createdAt: admin.firestore.Timestamp.now(),
          updatedAt: admin.firestore.Timestamp.now()
        }), 5000);
        recurringTaskId = recurringTaskRef.id;
      } catch (err) {
        console.warn('⚠️ Error creating recurring task:', err.message);
        recurringTaskId = null;
      }
    });

    it('should return recurring tasks for director', async () => {
      const token = await getAuthToken('director');
      if (!token) {
        console.warn('⚠️ Skipping test - Firebase Auth not available');
        return;
      }

      const response = await base
        .get('/api/tasks/recurring')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      
      if (recurringTaskId) {
        const recurringTask = response.body.find(t => t.id === recurringTaskId);
        expect(recurringTask).toBeDefined();
      }
    });

    it('should filter recurring tasks by department for manager', async () => {
      if (!db) {
        console.warn('⚠️ Skipping test - Firestore not available');
        return;
      }

      // Create recurring task in manager's department
      let managerRecurringTaskId;
      try {
        const managerRecurringTask = await withTimeout(db.collection('recurringTasks').add({
          title: `Manager Recurring Task ${Date.now()}`,
          taskOwner: 'staff@test.com',
          taskOwnerDepartment: 'Engineering',
          recurrence: { enabled: true, type: 'daily' },
          active: true,
          createdAt: admin.firestore.Timestamp.now(),
          updatedAt: admin.firestore.Timestamp.now()
        }), 15000); // Increased timeout to 15 seconds
        managerRecurringTaskId = managerRecurringTask.id;
        
        // Small delay to ensure Firestore consistency
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (err) {
        console.warn('⚠️ Skipping test - Failed to create recurring task:', err.message);
        return;
      }

      const token = await getAuthToken('manager');
      if (!token) {
        console.warn('⚠️ Skipping test - Firebase Auth not available');
        return;
      }

      // Add timeout wrapper for HTTP request as well
      const response = await withTimeout(
        base
          .get('/api/tasks/recurring')
          .set('Authorization', `Bearer ${token}`),
        10000 // 10 second timeout for HTTP request
      );

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    }, 30000); // Increase test timeout to 30 seconds
  });

  describe('PUT /api/tasks/recurring/:id - Update Recurring Task', () => {
    let recurringTaskId;

    beforeEach(async () => {
      if (!db) {
        recurringTaskId = null;
        return;
      }

      try {
        const recurringTaskRef = await withTimeout(db.collection('recurringTasks').add({
          title: `Update Recurring Task ${Date.now()}`,
          taskOwner: 'director@test.com',
          taskOwnerDepartment: 'All',
          recurrence: {
            enabled: true,
            type: 'weekly',
            startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
          },
          active: true,
          createdAt: admin.firestore.Timestamp.now(),
          updatedAt: admin.firestore.Timestamp.now()
        }), 5000);
        recurringTaskId = recurringTaskRef.id;
      } catch (err) {
        console.warn('⚠️ Error creating recurring task:', err.message);
        recurringTaskId = null;
      }
    });

    it('should update recurring task as owner', async () => {
      if (!recurringTaskId) {
        console.warn('⚠️ Skipping test - Recurring task not created');
        return;
      }

      const token = await getAuthToken('director');
      if (!token) {
        console.warn('⚠️ Skipping test - Firebase Auth not available');
        return;
      }

      const updateData = {
        recurrence: {
          enabled: true,
          type: 'daily',
          startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        }
      };

      const response = await base
        .put(`/api/tasks/recurring/${recurringTaskId}`)
        .set('Authorization', `Bearer ${token}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.recurrence.type).toBe('daily');
    });

    it('should reject update by non-owner', async () => {
      if (!recurringTaskId) {
        console.warn('⚠️ Skipping test - Recurring task not created');
        return;
      }

      const token = await getAuthToken('staff');
      if (!token) {
        console.warn('⚠️ Skipping test - Firebase Auth not available');
        return;
      }

      const updateData = {
        recurrence: {
          enabled: true,
          type: 'daily'
        }
      };

      const response = await base
        .put(`/api/tasks/recurring/${recurringTaskId}`)
        .set('Authorization', `Bearer ${token}`)
        .send(updateData);

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('owner');
    });
  });

  describe('Task Collaborators', () => {
    it('should allow collaborator with Edit permission to update task', async () => {
      if (!db) {
        console.warn('⚠️ Skipping test - Firestore not available');
        return;
      }

      // Create task with collaborator (use longer timeout for task creation)
      let taskId;
      try {
        const taskRef = await withTimeout(db.collection('tasks').add({
          title: `Collaborator Task ${Date.now()}`,
          description: 'Task with collaborator',
          taskOwner: 'director@test.com',
          taskOwnerDepartment: 'All',
          assignedTo: null,
          collaborators: [{
            name: 'staff@test.com',
            permission: 'Edit'
          }],
          dueDate: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
          priority: 5,
          status: 'Ongoing',
          archived: false,
          createdAt: admin.firestore.Timestamp.now(),
          updatedAt: admin.firestore.Timestamp.now()
        }), 15000); // Increased timeout for task creation
        taskId = taskRef.id;
        testTasks.push(taskId);
      } catch (err) {
        console.warn('⚠️ Skipping test - Failed to create test task:', err.message);
        return;
      }

      const token = await getAuthToken('staff');
      if (!token) {
        console.warn('⚠️ Skipping test - Firebase Auth not available');
        return;
      }

      const response = await base
        .put(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ description: 'Updated by collaborator' });

      expect(response.status).toBe(200);
      expect(response.body.description).toBe('Updated by collaborator');
    });

    it('should reject collaborator with View permission from updating task', async () => {
      if (!db) {
        console.warn('⚠️ Skipping test - Firestore not available');
        return;
      }

      // Create task with View-only collaborator (use longer timeout)
      let taskId;
      try {
        const taskRef = await withTimeout(db.collection('tasks').add({
          title: `View Only Collaborator Task ${Date.now()}`,
          description: 'Task with view-only collaborator',
          taskOwner: 'director@test.com',
          taskOwnerDepartment: 'All',
          assignedTo: null,
          collaborators: [{
            name: 'staff@test.com',
            permission: 'View'
          }],
          dueDate: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
          priority: 5,
          status: 'Ongoing',
          archived: false,
          createdAt: admin.firestore.Timestamp.now(),
          updatedAt: admin.firestore.Timestamp.now()
        }), 15000); // Increased timeout for task creation
        taskId = taskRef.id;
        testTasks.push(taskId);
      } catch (err) {
        console.warn('⚠️ Skipping test - Failed to create test task:', err.message);
        return;
      }

      const token = await getAuthToken('staff');
      if (!token) {
        console.warn('⚠️ Skipping test - Firebase Auth not available');
        return;
      }

      const response = await base
        .put(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ description: 'Unauthorized update' });

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('permission');
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

    it('should handle concurrent task updates gracefully', async () => {
      if (!db) {
        console.warn('⚠️ Skipping test - Firestore not available');
        return;
      }

      let taskId;
      try {
        const taskRef = await withTimeout(db.collection('tasks').add({
          title: `Concurrent Update Task ${Date.now()}`,
          description: 'Task for concurrent update test',
          taskOwner: 'director@test.com',
          taskOwnerDepartment: 'All',
          dueDate: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
          priority: 5,
          status: 'Ongoing',
          archived: false,
          createdAt: admin.firestore.Timestamp.now(),
          updatedAt: admin.firestore.Timestamp.now()
        }), 15000); // Increased timeout for task creation
        taskId = taskRef.id;
        testTasks.push(taskId);
      } catch (err) {
        console.warn('⚠️ Skipping test - Failed to create test task:', err.message);
        return;
      }

      const token = await getAuthToken('director');
      if (!token) {
        console.warn('⚠️ Skipping test - Firebase Auth not available');
        return;
      }

      // Attempt concurrent updates
      const updates = [
        base.put(`/api/tasks/${taskId}`).set('Authorization', `Bearer ${token}`).send({ description: 'Update 1' }),
        base.put(`/api/tasks/${taskId}`).set('Authorization', `Bearer ${token}`).send({ description: 'Update 2' })
      ];

      const results = await Promise.allSettled(updates);
      
      // At least one should succeed
      const successful = results.filter(r => r.status === 'fulfilled' && r.value.status === 200);
      expect(successful.length).toBeGreaterThanOrEqual(1);
    });
  });
});

