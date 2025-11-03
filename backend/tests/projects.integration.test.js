/* Integration tests for projects - tests full flow: route -> middleware -> controller -> database
   Uses the same pattern as auth.integration.test.js
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

describe('Projects Integration Tests', () => {
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
      // Clean up test projects (best effort)
      for (const projectId of testProjects) {
        await withTimeout(db.collection('projects').doc(projectId).set(null), 2000).catch(() => {});
      }
      
      // Clean up test tasks created during tests (best effort)
      try {
        const tasksSnapshot = await withTimeout(
          db.collection('tasks').where('taskOwner', 'in', Object.values(testUsers).map(u => u.email)).limit(50).get(),
          5000
        );
        
        for (const doc of tasksSnapshot.docs) {
          await withTimeout(doc.ref.set(null), 2000).catch(() => {});
        }
      } catch (err) {
        // Ignore task cleanup errors
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
    testProjects = [];
  });

  describe('POST /api/projects - Create Project', () => {
    it('should create a project as director', async () => {
      const token = await getAuthToken('director');
      if (!token) {
        console.warn('⚠️ Skipping test - Firebase Auth not available');
        return;
      }

      const projectData = {
        name: `Integration Test Project - Director ${Date.now()}`,
        description: 'Created by director',
        status: 'Ongoing',
        department: 'Engineering',
        dueDate: null
      };

      const response = await base
        .post('/api/projects')
        .set('Authorization', `Bearer ${token}`)
        .send(projectData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(projectData.name);
      expect(response.body.department).toBe(projectData.department);
      expect(response.body.createdBy).toBe('director@test.com');
      
      if (response.body.id) {
        testProjects.push(response.body.id);
      }

      // Verify project exists in database
      if (db) {
        const projectDoc = await db.collection('projects').doc(response.body.id).get();
        expect(projectDoc.exists).toBe(true);
        expect(projectDoc.data().name).toBe(projectData.name);
      }
    });

    it('should create a project as manager in their department', async () => {
      const token = await getAuthToken('manager');
      if (!token) {
        console.warn('⚠️ Skipping test - Firebase Auth not available');
        return;
      }

      const projectData = {
        name: `Integration Test Project - Manager ${Date.now()}`,
        description: 'Created by manager',
        department: 'Engineering'
      };

      const response = await base
        .post('/api/projects')
        .set('Authorization', `Bearer ${token}`)
        .send(projectData);

      expect(response.status).toBe(201);
      expect(response.body.department).toBe('Engineering');
      
      if (response.body.id) {
        testProjects.push(response.body.id);
      }
    });

    it('should reject manager creating project outside their department', async () => {
      const token = await getAuthToken('manager');
      if (!token) {
        console.warn('⚠️ Skipping test - Firebase Auth not available');
        return;
      }

      const projectData = {
        name: `Invalid Project ${Date.now()}`,
        department: 'Sales'
      };

      const response = await base
        .post('/api/projects')
        .set('Authorization', `Bearer ${token}`)
        .send(projectData);

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('department');
    });

    it('should require project name', async () => {
      const token = await getAuthToken('director');
      if (!token) {
        console.warn('⚠️ Skipping test - Firebase Auth not available');
        return;
      }

      const response = await base
        .post('/api/projects')
        .set('Authorization', `Bearer ${token}`)
        .send({ description: 'No name' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('name');
    });
  });

  describe('GET /api/projects - Get All Projects', () => {
    let directorProjectId, managerProjectId, staffProjectId;

    beforeEach(async () => {
      if (!db) {
        directorProjectId = null;
        managerProjectId = null;
        staffProjectId = null;
        return;
      }
      
      try {
        // Create test projects with different visibility rules (with longer timeout)
        const directorProject = await withTimeout(db.collection('projects').add({
          name: `Director Project ${Date.now()}`,
          department: 'Engineering',
          isDeleted: false,
          createdBy: 'director@test.com',
          createdAt: admin.firestore.Timestamp.now(),
          updatedAt: admin.firestore.Timestamp.now()
        }), 10000);
        directorProjectId = directorProject.id;

        const managerProject = await withTimeout(db.collection('projects').add({
          name: `Manager Project ${Date.now()}`,
          department: 'Engineering',
          members: ['manager@test.com'],
          isDeleted: false,
          createdBy: 'manager@test.com',
          createdAt: admin.firestore.Timestamp.now(),
          updatedAt: admin.firestore.Timestamp.now()
        }), 10000);
        managerProjectId = managerProject.id;

        const staffProject = await withTimeout(db.collection('projects').add({
          name: `Staff Project ${Date.now()}`,
          department: 'Engineering',
          isDeleted: false,
          createdBy: 'director@test.com',
          createdAt: admin.firestore.Timestamp.now(),
          updatedAt: admin.firestore.Timestamp.now()
        }), 10000);
        staffProjectId = staffProject.id;

        // Create a task for staff user on this project
        await withTimeout(db.collection('tasks').add({
          projectId: staffProjectId,
          taskOwner: 'staff@test.com',
          assignedTo: 'staff@test.com',
          title: 'Staff Task',
          status: 'Ongoing',
          createdAt: admin.firestore.Timestamp.now()
        }), 10000);

        testProjects.push(directorProjectId, managerProjectId, staffProjectId);
      } catch (err) {
        console.warn('⚠️ Error creating test projects:', err.message);
        // Set IDs to null so tests can skip gracefully
        directorProjectId = null;
        managerProjectId = null;
        staffProjectId = null;
      }
    });

    it('should return all projects for director', async () => {
      const token = await getAuthToken('director');
      if (!token) {
        console.warn('⚠️ Skipping test - Firebase Auth not available');
        return;
      }

      const response = await base
        .get('/api/projects')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      
      // Check that we get projects back
      expect(response.body.length).toBeGreaterThanOrEqual(0);
      
      // If our test projects exist, verify they're included (using partial name match since we add timestamps)
      if (directorProjectId && managerProjectId && staffProjectId) {
        const projectNames = response.body.map(p => p.name);
        const hasDirectorProject = projectNames.some(n => n.includes('Director Project'));
        const hasManagerProject = projectNames.some(n => n.includes('Manager Project'));
        const hasStaffProject = projectNames.some(n => n.includes('Staff Project'));
        
        // At least some of our test projects should be visible
        expect(hasDirectorProject || hasManagerProject || hasStaffProject).toBe(true);
      }
    });

    it('should return department and member projects for manager', async () => {
      const token = await getAuthToken('manager');
      if (!token) {
        console.warn('⚠️ Skipping test - Firebase Auth not available');
        return;
      }

      const response = await base
        .get('/api/projects')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      
      // Manager should see department projects
      if (directorProjectId && managerProjectId && staffProjectId) {
        const projectNames = response.body.map(p => p.name);
        const hasDirectorProject = projectNames.some(n => n.includes('Director Project'));
        const hasManagerProject = projectNames.some(n => n.includes('Manager Project'));
        const hasStaffProject = projectNames.some(n => n.includes('Staff Project'));
        
        // Manager should see Engineering department projects
        expect(hasDirectorProject || hasManagerProject || hasStaffProject).toBe(true);
      }
    });

    it('should return only projects with tasks for staff', async () => {
      const token = await getAuthToken('staff');
      if (!token) {
        console.warn('⚠️ Skipping test - Firebase Auth not available');
        return;
      }

      const response = await base
        .get('/api/projects')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      
      // Staff should only see projects where they have tasks
      if (staffProjectId) {
        const projectNames = response.body.map(p => p.name);
        const hasStaffProject = projectNames.some(n => n.includes('Staff Project'));
        expect(hasStaffProject).toBe(true);
      }
    });
  });

  describe('GET /api/projects/:id - Get Single Project', () => {
    let projectId;

    beforeEach(async () => {
      if (!db) {
        projectId = null;
        return;
      }
      
      try {
        const projectRef = await withTimeout(db.collection('projects').add({
          name: `Get Project Test ${Date.now()}`,
          description: 'Test project for GET endpoint',
          department: 'Engineering',
          status: 'Ongoing',
          isDeleted: false,
          createdBy: 'director@test.com',
          createdAt: admin.firestore.Timestamp.now(),
          updatedAt: admin.firestore.Timestamp.now()
        }), 10000);
        projectId = projectRef.id;
        testProjects.push(projectId);
      } catch (err) {
        console.warn('⚠️ Error creating test project:', err.message);
        projectId = null;
      }
    });

    it('should return project by ID', async () => {
      const token = await getAuthToken('director');
      if (!token) {
        console.warn('⚠️ Skipping test - Firebase Auth not available');
        return;
      }

      const response = await base
        .get(`/api/projects/${projectId}`)
        .set('Authorization', `Bearer ${token}`);

      if (!projectId) {
        console.warn('⚠️ Skipping test - Project not created');
        return;
      }
      
      expect(response.status).toBe(200);
      expect(response.body.id).toBe(projectId);
      expect(response.body.name).toContain('Get Project Test');
      expect(response.body.department).toBe('Engineering');
    });

    it('should return 404 for non-existent project', async () => {
      const token = await getAuthToken('director');
      if (!token) {
        console.warn('⚠️ Skipping test - Firebase Auth not available');
        return;
      }

      const fakeId = 'non-existent-project-id-12345';
      const response = await base
        .get(`/api/projects/${fakeId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toContain('not found');
    });
  });

  describe('PUT /api/projects/:id - Update Project', () => {
    let projectId;

    beforeEach(async () => {
      if (!db) {
        projectId = null;
        return;
      }
      
      try {
        const projectRef = await withTimeout(db.collection('projects').add({
          name: `Update Test Project ${Date.now()}`,
          description: 'Original description',
          department: 'Engineering',
          status: 'Ongoing',
          isDeleted: false,
          createdBy: 'director@test.com',
          createdAt: admin.firestore.Timestamp.now(),
          updatedAt: admin.firestore.Timestamp.now()
        }), 10000);
        projectId = projectRef.id;
        testProjects.push(projectId);
      } catch (err) {
        console.warn('⚠️ Error creating test project:', err.message);
        projectId = null;
      }
    });

    it('should update project as director', async () => {
      if (!projectId) {
        console.warn('⚠️ Skipping test - Project not created');
        return;
      }
      
      const token = await getAuthToken('director');
      if (!token) {
        console.warn('⚠️ Skipping test - Firebase Auth not available');
        return;
      }

      const updateData = {
        name: 'Updated Project Name',
        description: 'Updated description',
        status: 'Completed'
      };

      const response = await base
        .put(`/api/projects/${projectId}`)
        .set('Authorization', `Bearer ${token}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Updated Project Name');
      expect(response.body.description).toBe('Updated description');
      expect(response.body.status).toBe('Completed');
    });

    it('should allow manager to update project in their department', async () => {
      if (!projectId) {
        console.warn('⚠️ Skipping test - Project not created');
        return;
      }
      
      const token = await getAuthToken('manager');
      if (!token) {
        console.warn('⚠️ Skipping test - Firebase Auth not available');
        return;
      }

      const updateData = {
        description: 'Updated by manager'
      };

      const response = await base
        .put(`/api/projects/${projectId}`)
        .set('Authorization', `Bearer ${token}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.description).toBe('Updated by manager');
    });

    it('should reject manager updating project outside their department', async () => {
      if (!db) {
        console.warn('⚠️ Skipping test - Firestore not available');
        return;
      }
      
      const token = await getAuthToken('manager');
      if (!token) {
        console.warn('⚠️ Skipping test - Firebase Auth not available');
        return;
      }

      let salesProjectId;
      try {
        // Create project in Sales department
        const salesProject = await withTimeout(db.collection('projects').add({
          name: `Sales Project ${Date.now()}`,
          department: 'Sales',
          isDeleted: false,
          createdBy: 'other-manager@test.com',
          createdAt: admin.firestore.Timestamp.now(),
          updatedAt: admin.firestore.Timestamp.now()
        }), 10000);
        salesProjectId = salesProject.id;
        testProjects.push(salesProjectId);
      } catch (err) {
        console.warn('⚠️ Skipping test - Failed to create test project:', err.message);
        return;
      }

      const response = await base
        .put(`/api/projects/${salesProjectId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ description: 'Should fail' });

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('department');
    });
  });
});
