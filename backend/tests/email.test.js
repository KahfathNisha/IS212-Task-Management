// Load environment variables FIRST (before requiring services that use them)
const path = require('path');
const fs = require('fs');
const envPath = path.join(__dirname, '../src/config/.env');

// Debug: Check if .env file exists
if (!fs.existsSync(envPath)) {
  console.error(`❌ .env file not found at: ${envPath}`);
  console.error(`   Expected location: backend/src/config/.env`);
  process.exit(1);
}

// Load .env
const result = require('dotenv').config({ path: envPath });

if (result.error) {
  console.error('❌ Error loading .env file:', result.error);
  process.exit(1);
}

// Debug: Check if SENDGRID_API_KEY was loaded
if (!process.env.SENDGRID_API_KEY) {
  console.warn('⚠️  SENDGRID_API_KEY not found in .env file');
  console.warn(`   File path: ${envPath}`);
  console.warn(`   Make sure your .env file contains: SENDGRID_API_KEY=SG.xxxxxxxxx`);
} else {
  console.log(`✅ SENDGRID_API_KEY loaded (starts with: ${process.env.SENDGRID_API_KEY.substring(0, 3)}...)`);
}

// Use shared Firebase initialization
const { admin, db } = require('./firebase-init');
const NotificationService = require('../src/services/notificationService');

async function ensureTestUser(userEmail) {
  await db.collection('Users').doc(userEmail).set({
    name: 'Test User',
    email: userEmail,
    testEmail: 'breannong@gmail.com',
    notificationSettings: {
      emailEnabled: true,
      pushEnabled: false
    },
    timezone: 'UTC'
  }, { merge: true });
}

async function run() {
  const testUserEmail = 'john.doe@company.com';
  const testTaskId = `email-test-${Date.now()}`;
  console.log('🧪 Email tests starting...');
  await ensureTestUser(testUserEmail);

  const testTask = {
    id: testTaskId,
    title: 'Email Test Task',
    description: 'Testing email notifications only',
    dueDate: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 24*60*60*1000)),
    assigneeId: testUserEmail,
    status: 'Ongoing',
    priority: 3,
    taskOwner: 'Test System',
    taskOwnerDepartment: 'IT',
    createdAt: admin.firestore.Timestamp.now(),
    updatedAt: admin.firestore.Timestamp.now(),
    archived: false,
    collaborators: []
  };
  await db.collection('tasks').doc(testTaskId).set(testTask);
  console.log('✅ Created test task:', testTaskId);

  const notify = (title, body, type, notificationType, extraTask = {}) => NotificationService.sendNotification(
    testUserEmail,
    { title, body, taskId: testTaskId, type },
    { sendPush: false, sendEmail: true, taskData: { ...testTask, ...extraTask }, notificationType }
  );

  // Helper to add delay between emails (prevents SendGrid rate limiting)
  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  // 1) Task assigned
  await notify('New Task Assigned', `You have been assigned a new task: "${testTask.title}"`, 'info', 'task_assigned');
  console.log('✅ Sent: task_assigned');
  await delay(1000); // Wait 1 second between emails

  // 2) Task updated
  await notify('Task Updated', `Task "${testTask.title}" has been updated`, 'info', 'task_updated', { status: 'In Progress' });
  console.log('✅ Sent: task_updated');
  await delay(1000); // Wait 1 second between emails

  // 3) Status changed
  await notify('Task Status Updated', `Task "${testTask.title}" status changed to "Completed"`, 'success', 'task_status_changed', { status: 'Completed' });
  console.log('✅ Sent: task_status_changed');
  await delay(1000); // Wait 1 second between emails

  // 4) Collaborator added
  await notify('Added as Collaborator', `You have been added as a collaborator to task: "${testTask.title}"`, 'info', 'collaborator_added');
  console.log('✅ Sent: collaborator_added');

  console.log('\n🎉 Email tests finished. Check inbox for 4 emails.');
}

run().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });


