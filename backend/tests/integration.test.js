// Load environment variables FIRST (before requiring services that use them)
const path = require('path');
const fs = require('fs');
const envPath = path.join(__dirname, '../src/config/.env');

if (!fs.existsSync(envPath)) {
  console.error(`❌ .env file not found at: ${envPath}`);
  process.exit(1);
}

require('dotenv').config({ path: envPath });

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
    // mark offline by default so email path triggers in integration if sendEmail=true
    isOnline: false,
    lastActiveAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 10 * 60 * 1000)),
    timezone: 'UTC'
  }, { merge: true });
}

async function run() {
  const userEmail = 'john.doe@company.com';
  const taskId = `integration-test-${Date.now()}`;
  console.log('🧪 Integration test starting...');
  await ensureTestUser(userEmail);

  const task = {
    id: taskId,
    title: 'Integration Test Task',
    description: 'End-to-end test of notification flow',
    dueDate: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 24*60*60*1000)),
    assigneeId: userEmail,
    status: 'Ongoing',
    priority: 4,
    taskOwner: 'Test System',
    taskOwnerDepartment: 'QA',
    createdAt: admin.firestore.Timestamp.now(),
    updatedAt: admin.firestore.Timestamp.now(),
    archived: false
  };
  await db.collection('tasks').doc(taskId).set(task);
  console.log('✅ Created task:', taskId);

  const send = (title, body, type, notificationType, extra = {}) => NotificationService.sendNotification(
    userEmail,
    { title, body, taskId, type },
    { sendPush: false, sendEmail: true, taskData: { ...task, ...extra }, notificationType }
  );

  // Helper to add delay between emails (prevents SendGrid rate limiting)
  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  await send('New Task Assigned', `You have been assigned a new task: "${task.title}"`, 'info', 'task_assigned');
  await delay(1000); // Wait 1 second between emails

  await send('Task Updated', `Task "${task.title}" has been updated`, 'info', 'task_updated', { status: 'In Progress' });
  await delay(1000); // Wait 1 second between emails

  await send('Task Status Updated', `Task "${task.title}" status changed to "Completed"`, 'success', 'task_status_changed', { status: 'Completed' });

  // Verify stats
  const snapshot = await db.collection('Users').doc(userEmail).collection('notifications').orderBy('createdAt', 'desc').limit(10).get();
  console.log('📊 Recent notifications:', snapshot.size);
  snapshot.docs.forEach((doc, i) => {
    const n = doc.data();
    console.log(`${i+1}. ${n.title} | isRead=${n.isRead} | taskId=${n.taskId || '—'}`);
  });

  console.log('\n🎉 Integration test finished. Expect 3 emails (user offline) and in-app records.');
}

run().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });


