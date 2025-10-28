#!/usr/bin/env node

/**
 * Notification Integration Test Script
 * Tests the complete notification flow from backend to frontend
 */

// Use built-in fetch (Node.js 18+) or require node-fetch for older versions
let fetch;
try {
  // Try to use built-in fetch first (Node.js 18+)
  fetch = globalThis.fetch;
  if (!fetch) {
    // Fallback to node-fetch for older Node.js versions
    fetch = require('node-fetch');
  }
} catch (error) {
  console.error('❌ Fetch not available. Please install node-fetch or use Node.js 18+:');
  console.error('   npm install node-fetch');
  console.error('   or upgrade to Node.js 18+');
  process.exit(1);
}

const API_BASE = 'http://localhost:3000/api';
const FRONTEND_URL = 'http://localhost:5173';

// Test configuration
const TEST_USER = {
  email: process.env.TEST_EMAIL || 'test@example.com',
  password: process.env.TEST_PASSWORD || 'testpassword123'
};

const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY;

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getFirebaseToken() {
  if (!FIREBASE_API_KEY) {
    throw new Error('FIREBASE_API_KEY environment variable is required');
  }

  console.log('🔑 Getting Firebase token...');
  
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: TEST_USER.email,
      password: TEST_USER.password,
      returnSecureToken: true
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Firebase auth failed: ${error}`);
  }

  const data = await response.json();
  console.log('✅ Firebase token obtained');
  return data.idToken;
}

async function testBackendAPI(token) {
  console.log('\n🧪 Testing Backend API...');
  
  // Test 1: Create notification
  console.log('  Creating test notification...');
  const createResponse = await fetch(`${API_BASE}/notifications/test`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      title: 'Integration Test Notification',
      body: 'This notification was created by the integration test',
      type: 'info',
      taskId: 'test-task-123'
    })
  });

  if (!createResponse.ok) {
    const error = await createResponse.text();
    throw new Error(`Create notification failed: ${error}`);
  }

  const createResult = await createResponse.json();
  console.log('  ✅ Notification created:', createResult.notificationId);

  // Test 2: Fetch notifications
  console.log('  Fetching notifications...');
  const fetchResponse = await fetch(`${API_BASE}/notifications`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  if (!fetchResponse.ok) {
    const error = await fetchResponse.text();
    throw new Error(`Fetch notifications failed: ${error}`);
  }

  const fetchResult = await fetchResponse.json();
  console.log(`  ✅ Fetched ${fetchResult.count} notifications`);

  // Test 3: Get stats
  console.log('  Getting notification stats...');
  const statsResponse = await fetch(`${API_BASE}/notifications/stats`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  if (!statsResponse.ok) {
    const error = await statsResponse.text();
    throw new Error(`Get stats failed: ${error}`);
  }

  const statsResult = await statsResponse.json();
  console.log('  ✅ Stats:', statsResult.stats);

  return {
    notificationId: createResult.notificationId,
    notifications: fetchResult.notifications,
    stats: statsResult.stats
  };
}

async function testFrontendIntegration() {
  console.log('\n🌐 Testing Frontend Integration...');
  
  // Check if frontend is running
  try {
    const response = await fetch(FRONTEND_URL);
    if (!response.ok) {
      throw new Error(`Frontend not accessible: ${response.status}`);
    }
    console.log('  ✅ Frontend is running');
  } catch (error) {
    console.log('  ⚠️  Frontend not accessible - make sure it\'s running on port 5173');
    return false;
  }

  console.log('  ℹ️  To test frontend integration:');
  console.log('     1. Open http://localhost:5173 in your browser');
  console.log('     2. Login with your test user');
  console.log('     3. Check the notification history page');
  console.log('     4. Look for the test notification created by this script');
  
  return true;
}

async function runIntegrationTest() {
  console.log('🚀 Starting Notification Integration Test\n');
  
  try {
    // Step 1: Get Firebase token
    const token = await getFirebaseToken();
    
    // Step 2: Test backend API
    const backendResult = await testBackendAPI(token);
    
    // Step 3: Test frontend integration
    const frontendRunning = await testFrontendIntegration();
    
    // Summary
    console.log('\n📊 Test Summary:');
    console.log('  ✅ Backend API: Working');
    console.log(`  ${frontendRunning ? '✅' : '⚠️ '} Frontend: ${frontendRunning ? 'Accessible' : 'Not accessible'}`);
    console.log(`  📝 Created notification: ${backendResult.notificationId}`);
    console.log(`  📊 Total notifications: ${backendResult.stats.total}`);
    console.log(`  📬 Unread notifications: ${backendResult.stats.unread}`);
    
    if (backendResult.stats.total > 0) {
      console.log('\n🎉 Integration test completed successfully!');
      console.log('\nNext steps:');
      console.log('  1. Check your frontend for the test notification');
      console.log('  2. Verify real-time notifications work');
      console.log('  3. Test notification dismissal and management');
    } else {
      console.log('\n❌ No notifications found - check your database');
    }
    
  } catch (error) {
    console.error('\n❌ Integration test failed:', error.message);
    console.log('\nTroubleshooting:');
    console.log('  1. Make sure backend is running on port 3000');
    console.log('  2. Check Firebase configuration');
    console.log('  3. Verify test user exists in database');
    console.log('  4. Check backend logs for errors');
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  runIntegrationTest();
}

module.exports = { runIntegrationTest, testBackendAPI, getFirebaseToken };