/**
 * Test Data Setup Script for Report Testing
 * 
 * This script creates test users, projects, and tasks for manual testing
 * Run with: node scripts/setup-test-data.js
 */

require('dotenv').config({ path: './src/config/.env' });
const { admin, db } = require('../src/config/firebase');

async function setupTestData() {
  console.log('🔧 Setting up test data for report testing...\n');

  // Test Users
  const testUsers = [
    {
      email: 'staff@company.com',
      name: 'Staff User',
      role: 'staff',
      department: 'Engineering',
      securityQuestion: 'Test Question',
      securityAnswer: 'Test Answer',
    },
    {
      email: 'manager@company.com',
      name: 'Manager User',
      role: 'manager',
      department: 'Engineering',
      securityQuestion: 'Test Question',
      securityAnswer: 'Test Answer',
    },
    {
      email: 'hr@company.com',
      name: 'HR User',
      role: 'hr',
      department: 'HR and Admin',
      securityQuestion: 'Test Question',
      securityAnswer: 'Test Answer',
    },
    {
      email: 'director@company.com',
      name: 'Director User',
      role: 'director',
      department: 'Executive',
      securityQuestion: 'Test Question',
      securityAnswer: 'Test Answer',
    },
    {
      email: 'employee1@company.com',
      name: 'Employee One',
      role: 'staff',
      department: 'Engineering',
      securityQuestion: 'Test Question',
      securityAnswer: 'Test Answer',
    },
    {
      email: 'employee2@company.com',
      name: 'Employee Two',
      role: 'staff',
      department: 'HR and Admin',
      securityQuestion: 'Test Question',
      securityAnswer: 'Test Answer',
    },
  ];

  console.log('📝 Creating test users...');
  for (const user of testUsers) {
    try {
      const userRef = db.collection('Users').doc(user.email);
      await userRef.set({
        ...user,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        failedAttempts: 0,
        lockedUntil: null,
        notificationSettings: {
          emailEnabled: true,
          pushEnabled: false,
        },
      }, { merge: true });
      console.log(`  ✅ Created user: ${user.email} (${user.role})`);
    } catch (error) {
      console.error(`  ❌ Error creating user ${user.email}:`, error.message);
    }
  }

  // Test Projects
  const now = new Date();
  const testProjects = [
    {
      id: 'project-engineering-1',
      name: 'Engineering Project A',
      description: 'Test project for Engineering department',
      department: 'Engineering',
      members: ['staff@company.com', 'manager@company.com', 'employee1@company.com'],
      createdBy: 'manager@company.com',
      isDeleted: false,
      createdAt: admin.firestore.Timestamp.fromDate(now),
      updatedAt: admin.firestore.Timestamp.fromDate(now),
    },
    {
      id: 'project-engineering-2',
      name: 'Engineering Project B',
      description: 'Another test project',
      department: 'Engineering',
      members: ['manager@company.com'],
      createdBy: 'manager@company.com',
      isDeleted: false,
      createdAt: admin.firestore.Timestamp.fromDate(now),
      updatedAt: admin.firestore.Timestamp.fromDate(now),
    },
    {
      id: 'project-hr-1',
      name: 'HR Project',
      description: 'Test project for HR department',
      department: 'HR and Admin',
      members: ['employee2@company.com'],
      createdBy: 'hr@company.com',
      isDeleted: false,
      createdAt: admin.firestore.Timestamp.fromDate(now),
      updatedAt: admin.firestore.Timestamp.fromDate(now),
    },
  ];

  console.log('\n📦 Creating test projects...');
  for (const project of testProjects) {
    try {
      await db.collection('projects').doc(project.id).set(project);
      console.log(`  ✅ Created project: ${project.name}`);
    } catch (error) {
      console.error(`  ❌ Error creating project ${project.id}:`, error.message);
    }
  }

  // Test Tasks
  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - 5); // 5 days ago

  const atRiskDate = new Date();
  atRiskDate.setDate(atRiskDate.getDate() + 2); // 2 days from now

  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 10); // 10 days from now

  const testTasks = [
    // Overdue tasks
    {
      id: 'task-overdue-1',
      title: 'Overdue Task 1',
      description: 'This task is overdue',
      status: 'Ongoing',
      priority: 1,
      projectId: 'project-engineering-1',
      assignedTo: 'staff@company.com',
      taskOwner: 'manager@company.com',
      taskOwnerDepartment: 'Engineering',
      dueDate: admin.firestore.Timestamp.fromDate(pastDate),
      createdAt: admin.firestore.Timestamp.fromDate(new Date(pastDate.getTime() - 10 * 24 * 60 * 60 * 1000)),
      updatedAt: admin.firestore.Timestamp.fromDate(now),
      archived: false,
    },
    {
      id: 'task-overdue-2',
      title: 'Overdue Task 2',
      description: 'Another overdue task',
      status: 'Pending Review',
      priority: 2,
      projectId: 'project-engineering-1',
      assignedTo: 'employee1@company.com',
      taskOwner: 'manager@company.com',
      taskOwnerDepartment: 'Engineering',
      dueDate: admin.firestore.Timestamp.fromDate(pastDate),
      createdAt: admin.firestore.Timestamp.fromDate(new Date(pastDate.getTime() - 10 * 24 * 60 * 60 * 1000)),
      updatedAt: admin.firestore.Timestamp.fromDate(now),
      archived: false,
    },
    // At-risk tasks (due within 3 days)
    {
      id: 'task-at-risk-1',
      title: 'At Risk Task 1',
      description: 'This task is at risk',
      status: 'Ongoing',
      priority: 1,
      projectId: 'project-engineering-1',
      assignedTo: 'staff@company.com',
      taskOwner: 'manager@company.com',
      taskOwnerDepartment: 'Engineering',
      dueDate: admin.firestore.Timestamp.fromDate(atRiskDate),
      createdAt: admin.firestore.Timestamp.fromDate(now),
      updatedAt: admin.firestore.Timestamp.fromDate(now),
      archived: false,
    },
    // Completed tasks
    {
      id: 'task-completed-1',
      title: 'Completed Task 1',
      description: 'This task is completed',
      status: 'Completed',
      priority: 1,
      projectId: 'project-engineering-1',
      assignedTo: 'staff@company.com',
      taskOwner: 'manager@company.com',
      taskOwnerDepartment: 'Engineering',
      dueDate: admin.firestore.Timestamp.fromDate(futureDate),
      createdAt: admin.firestore.Timestamp.fromDate(new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000)),
      updatedAt: admin.firestore.Timestamp.fromDate(new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)), // Completed 3 days ago
      archived: false,
    },
    {
      id: 'task-completed-2',
      title: 'Completed Task 2',
      description: 'Another completed task',
      status: 'Completed',
      priority: 2,
      projectId: 'project-engineering-1',
      assignedTo: 'employee1@company.com',
      taskOwner: 'manager@company.com',
      taskOwnerDepartment: 'Engineering',
      dueDate: admin.firestore.Timestamp.fromDate(futureDate),
      createdAt: admin.firestore.Timestamp.fromDate(new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000)),
      updatedAt: admin.firestore.Timestamp.fromDate(new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000)), // Completed 5 days ago
      archived: false,
    },
    // Ongoing tasks
    {
      id: 'task-ongoing-1',
      title: 'Ongoing Task 1',
      description: 'This task is in progress',
      status: 'Ongoing',
      priority: 1,
      projectId: 'project-engineering-1',
      assignedTo: 'staff@company.com',
      taskOwner: 'manager@company.com',
      taskOwnerDepartment: 'Engineering',
      dueDate: admin.firestore.Timestamp.fromDate(futureDate),
      createdAt: admin.firestore.Timestamp.fromDate(now),
      updatedAt: admin.firestore.Timestamp.fromDate(now),
      archived: false,
    },
    // Unassigned tasks
    {
      id: 'task-unassigned-1',
      title: 'Unassigned Task 1',
      description: 'This task has no assignee',
      status: 'Unassigned',
      priority: 1,
      projectId: 'project-engineering-1',
      assignedTo: null,
      taskOwner: 'manager@company.com',
      taskOwnerDepartment: 'Engineering',
      dueDate: admin.firestore.Timestamp.fromDate(futureDate),
      createdAt: admin.firestore.Timestamp.fromDate(now),
      updatedAt: admin.firestore.Timestamp.fromDate(now),
      archived: false,
    },
    // Tasks for different departments
    {
      id: 'task-hr-1',
      title: 'HR Task 1',
      description: 'Task for HR department',
      status: 'Ongoing',
      priority: 1,
      projectId: 'project-hr-1',
      assignedTo: 'employee2@company.com',
      taskOwner: 'hr@company.com',
      taskOwnerDepartment: 'HR and Admin',
      dueDate: admin.firestore.Timestamp.fromDate(futureDate),
      createdAt: admin.firestore.Timestamp.fromDate(now),
      updatedAt: admin.firestore.Timestamp.fromDate(now),
      archived: false,
    },
  ];

  console.log('\n✅ Creating test tasks...');
  for (const task of testTasks) {
    try {
      await db.collection('tasks').doc(task.id).set(task);
      console.log(`  ✅ Created task: ${task.title} (${task.status})`);
    } catch (error) {
      console.error(`  ❌ Error creating task ${task.id}:`, error.message);
    }
  }

  console.log('\n🎉 Test data setup complete!');
  console.log('\n📊 Summary:');
  console.log(`  - Users: ${testUsers.length}`);
  console.log(`  - Projects: ${testProjects.length}`);
  console.log(`  - Tasks: ${testTasks.length}`);
  console.log('\n💡 You can now test reports with:');
  console.log('  - Staff: staff@company.com');
  console.log('  - Manager: manager@company.com');
  console.log('  - HR: hr@company.com');
  console.log('  - Director: director@company.com');
}

// Run the setup
setupTestData()
  .then(() => {
    console.log('\n✅ Setup complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Setup failed:', error);
    process.exit(1);
  });

