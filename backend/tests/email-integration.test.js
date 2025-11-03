// Email Integration Test - Focused on EmailService functionality
// Tests deadline reminders and task reassignments

// Load environment variables FIRST (before requiring services that use them)
const path = require('path');
const fs = require('fs');
const envPath = path.join(__dirname, '../.env');

if (!fs.existsSync(envPath)) {
  console.error(`❌ .env file not found at: ${envPath}`);
  process.exit(1);
}

require('dotenv').config({ path: envPath });

// Use shared Firebase initialization
const { admin, db } = require('./firebase-init');
const EmailService = require('../src/services/emailService');

async function run() {
  const userEmail = 'breannong@gmail.com';
  const taskId = `email-test-${Date.now()}`;
  console.log('📧 Email Integration Test Starting...');
  console.log('🎯 Testing EmailService functionality (deadline reminders & reassignments)');
  console.log(`📮 Sending all emails to: ${userEmail}`);

  // Create test task data
  const task = {
    id: taskId,
    title: 'Email Integration Test Task',
    description: 'End-to-end test of EmailService for task updates',
    dueDate: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 2*60*60*1000)), // 2 hours from now
    status: 'Ongoing',
    priority: 4,
    taskOwner: 'Email Test System',
    taskOwnerDepartment: 'QA',
    createdAt: admin.firestore.Timestamp.now(),
    updatedAt: admin.firestore.Timestamp.now(),
    archived: false
  };

  // Helper to add delay between emails (prevents SendGrid rate limiting)
  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  console.log('\n🔔 Testing Deadline Reminder Emails...');

  // Test 1: Deadline Reminder Email (5 hours remaining)
  try {
    await EmailService.sendDeadlineReminder(
      userEmail,
      task,
      5, // hours left
      0, // minutes left
      'UTC'
    );
    console.log('✅ Deadline reminder email (5 hours) sent successfully');
  } catch (error) {
    console.error('❌ Failed to send deadline reminder email (5 hours):', error.message);
  }
  await delay(1000); // Wait 1 second between emails

  // Test 2: Deadline Reminder Email (3 days remaining)
  try {
    const threeDaysFromNowTask = {
      ...task,
      dueDate: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 3*24*60*60*1000)) // 3 days from now
    };
    
    await EmailService.sendDeadlineReminder(
      userEmail,
      threeDaysFromNowTask,
      72, // hours left (3 days)
      0, // minutes left
      'UTC'
    );
    console.log('✅ Deadline reminder email (3 days) sent successfully');
  } catch (error) {
    console.error('❌ Failed to send deadline reminder email (3 days):', error.message);
  }
  await delay(1000);

  console.log('\n🔄 Testing Task Reassignment Emails...');

  // Test 3: Task Assignment Email
  try {
    const reassignmentTime = admin.firestore.Timestamp.now();
    
    await EmailService.sendReassignmentNotification(
      userEmail,
      task,
      'assigned', // type: assigned/removed
      'Email Test Admin',
      reassignmentTime,
      'UTC'
    );
    console.log('✅ Task assignment email sent successfully');
  } catch (error) {
    console.error('❌ Failed to send task assignment email:', error.message);
  }
  await delay(1000);

  // Test 4: Task Unassignment Email
  try {
    const unassignmentTime = admin.firestore.Timestamp.now();
    
    await EmailService.sendReassignmentNotification(
      userEmail,
      task,
      'removed', // type: assigned/removed
      'Email Test Admin',
      unassignmentTime,
      'UTC'
    );
    console.log('✅ Task unassignment email sent successfully');
  } catch (error) {
    console.error('❌ Failed to send task unassignment email:', error.message);
  }
  await delay(1000);

  console.log('Email Integration Test Completed!');
}

run().then(() => process.exit(0)).catch((e) => { 
  console.error('Email integration test failed:', e); 
  process.exit(1); 
});