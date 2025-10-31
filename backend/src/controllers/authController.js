// --- THIS IS THE FIX ---
// Remove any local Firebase initialization and instead import
// the already-initialized instances from your central config file.
const { admin, db } = require('../config/firebase');

// --- Debugging Check ---
if (!db) {
  console.error("❌ CRITICAL: Firestore 'db' object is undefined in authController.js. Check the export in your config/firebase.js file.");
} else {
  console.log("✅ Firestore 'db' object loaded successfully in authController.js.");
}
// --- End Debugging Check ---


// Constants
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 30 * 60 * 1000; // 30 minutes

/**
 * Handles the actual login by verifying a Firebase ID token.
 */
exports.login = async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ success: false, message: 'ID token is required.' });
    }

    // Verify the ID token with Firebase Admin SDK. This is a secure check.
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const email = decodedToken.email;

    if (!email) {
        return res.status(401).json({ success: false, message: 'Token is invalid or missing email.' });
    }

    // Fetch the user's profile from your Firestore database
    const userRef = db.collection('Users').doc(email);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ success: false, message: 'User profile not found in database.' });
    }

    // Successful login: Reset any failed attempts or lockouts
    await userRef.update({
      failedAttempts: 0,
      lockedUntil: null,
      lastLogin: admin.firestore.FieldValue.serverTimestamp()
    });

    // Migration: Add default notification settings for existing users
    const userData = userDoc.data();

    // Define default notification settings
    const defaultNotificationSettings = {
      TASK_UPDATE: true,
      TASK_REASSIGNMENT_ADD: true,
      TASK_REASSIGNMENT_REMOVE: true,
      emailEnabled: true,
      emailLeadTime: 24,
      emailFrequency: 6,
      pushEnabled: true
    };

    // Check what needs to be migrated
    const updates = {};
    let needsMigration = false;

    if (!userData.notificationSettings) {
      updates.notificationSettings = defaultNotificationSettings;
      needsMigration = true;
    } else {
      // Check for missing individual fields
      const existing = userData.notificationSettings;
      if (existing.emailEnabled === undefined) {
        updates['notificationSettings.emailEnabled'] = true;
        needsMigration = true;
      }
      if (existing.emailLeadTime === undefined) {
        updates['notificationSettings.emailLeadTime'] = 24;
        needsMigration = true;
      }
      if (existing.emailFrequency === undefined) {
        updates['notificationSettings.emailFrequency'] = 6;
        needsMigration = true;
      }
      if (existing.pushEnabled === undefined) {
        updates['notificationSettings.pushEnabled'] = true;
        needsMigration = true;
      }
    }

    if (!userData.timezone) {
      updates.timezone = 'UTC';
      needsMigration = true;
    }

    // Perform migration if needed
    if (needsMigration) {
      await userRef.update(updates);
      console.log(`Migrated notification settings for user: ${email}`);
    }

    // Return updated user data including migrated fields
    const updatedUserDoc = await userRef.get();
    const updatedUserData = updatedUserDoc.data();

    res.status(200).json({
      success: true,
      message: 'Login successful!',
      user: updatedUserData // Now includes migrated notificationSettings
    });

  } catch (error) {
    console.error('❌ API Login Error:', error);
    if (error.code === 'auth/id-token-revoked' || error.code === 'auth/id-token-expired') {
        return res.status(401).json({ success: false, message: 'Your session has expired. Please log in again.' });
    }
    res.status(500).json({ success: false, message: 'An internal server error occurred. Check backend logs.' });
  }
};


/**
 * Check if an account is locked
 */
exports.checkLockout = async (req, res) => {
  try {
    const { email } = req.body;
    
    // --- STRENGTHENED VALIDATION ---
    if (typeof email !== 'string' || email.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'A valid email string is required'
      });
    }
    
    const userRef = db.collection('users').doc(email);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      // Don't reveal if user exists
      return res.json({
        success: true,
        isLocked: false
      });
    }
    
    const userData = userDoc.data();
    const now = Date.now();
    
    // Check if account is locked
    if (userData.lockedUntil && userData.lockedUntil > now) {
      const unlockTime = new Date(userData.lockedUntil).toLocaleTimeString('en-SG', {
        hour: 'numeric',
        minute: 'numeric',
        hour12: true,
        timeZone: 'Asia/Singapore'
      });
      // --- FIX: Always respond 200 OK ---
      return res.status(200).json({
        success: false,
        isLocked: true,
        message: `Account is locked. Please try again after ${unlockTime}.`
      });
    }
    
    // Reset lock if expired
    if (userData.lockedUntil && userData.lockedUntil <= now) {
      await userRef.update({
        failedAttempts: 0,
        lockedUntil: null
      });
    }
    
    return res.json({
      success: true,
      isLocked: false
    });
    
  } catch (error) {
    console.error('❌ Error in checkLockout function:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking account status. Check backend logs for details.'
    });
  }
};

/**
 * Record successful login (reset failed attempts)
 */
exports.loginSuccess = async (req, res) => {
  try {
    const { email } = req.body;
    
    // --- STRENGTHENED VALIDATION ---
    if (typeof email !== 'string' || email.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'A valid email string is required'
      });
    }
    
    const userRef = db.collection('users').doc(email);
    await userRef.update({
      failedAttempts: 0,
      lockedUntil: null,
      lastLogin: admin.firestore.FieldValue.serverTimestamp()
    });
    
    res.json({
      success: true,
      message: 'Login recorded successfully'
    });
    
  } catch (error) {
    console.error('❌ Login success error:', error);
    res.status(500).json({
      success: false,
      message: 'Error recording login. Check backend logs.'
    });
  }
};

/**
 * Record failed login attempt
 */
exports.recordFailedAttempt = async (req, res) => {
  try {
    const { email } = req.body;
    
    // --- STRENGTHENED VALIDATION ---
    if (typeof email !== 'string' || email.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'A valid email string is required'
      });
    }
    
    const userRef = db.collection('users').doc(email);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      // Don't reveal if user exists, but respond calmly.
      return res.status(200).json({
        success: false,
        message: 'Invalid credentials.'
      });
    }
    
    const userData = userDoc.data();
    const now = Date.now();

    // Check if already locked
    if (userData.lockedUntil && userData.lockedUntil > now) {
        const unlockTime = new Date(userData.lockedUntil).toLocaleTimeString('en-SG', {
            hour: 'numeric',
            minute: 'numeric',
            hour12: true,
            timeZone: 'Asia/Singapore'
        });
        // --- FIX: Always respond 200 OK ---
        return res.status(200).json({
            success: false,
            isLocked: true,
            message: `Account is locked. Please try again after ${unlockTime}.`
        });
    }
    
    // Increment failed attempts
    const failedAttempts = (userData.failedAttempts || 0) + 1;
    const updateData = {
      failedAttempts,
      lastFailedAttempt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    // Lock account if max attempts reached
    if (failedAttempts >= MAX_LOGIN_ATTEMPTS) {
      updateData.lockedUntil = now + LOCKOUT_DURATION;
      
      await userRef.update(updateData);
      
      const unlockTime = new Date(updateData.lockedUntil).toLocaleTimeString('en-SG', {
          hour: 'numeric',
          minute: 'numeric',
          hour12: true,
          timeZone: 'Asia/Singapore'
      });
      
      // --- FIX: Always respond 200 OK ---
      return res.status(200).json({
        success: false,
        isLocked: true,
        message: `Too many failed attempts. Account locked until ${unlockTime}.`
      });
    }
    
    // Update failed attempts
    await userRef.update(updateData);
    
    const remainingAttempts = MAX_LOGIN_ATTEMPTS - failedAttempts;
    
    // Respond with 200 OK and a JSON body that indicates the failure and provides details.
    res.status(200).json({
      success: false,
      isLocked: false,
      remainingAttempts,
      message: `Invalid credentials. ${remainingAttempts} attempts remaining.`
    });
    
  } catch (error) {
    console.error('❌ Record failed attempt error:', error);
    res.status(500).json({
      success: false,
      message: 'Error recording failed attempt. Check backend logs.'
    });
  }
};

/**
 * Request password reset
 */
exports.requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;
    
    // --- STRENGTHENED VALIDATION ---
    if (typeof email !== 'string' || email.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'A valid email string is required'
      });
    }
    
    // Get user from Firestore
    const userRef = db.collection('users').doc(email);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      // Don't reveal if user exists - return success anyway
      return res.json({
        success: true,
        message: 'If the email exists in our system, you will receive reset instructions.'
      });
    }
    
    const userData = userDoc.data();
    
    // Generate reset code
    const resetCode = Math.random().toString(36).substring(2, 15);
    const expiresAt = Date.now() + (30 * 60 * 1000); // 30 minutes
    
    // Store reset request in Firestore
    await db.collection('passwordResets').doc(resetCode).set({
      email,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt,
      used: false,
      verified: false
    });
    
    // Return security question
    res.json({
      success: true,
      resetCode,
      securityQuestion: userData.securityQuestion || 'What is your favorite color?'
    });
    
  } catch (error) {
    console.error('❌ Password reset request error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing password reset request. Check backend logs.'
    });
  }
};

/**
 * Verify security answer
 */
exports.verifySecurityAnswer = async (req, res) => {
  try {
    const { resetCode, answer } = req.body;
    
    if (!resetCode || !answer) {
      return res.status(400).json({
        success: false,
        message: 'Reset code and answer are required'
      });
    }
    
    // Get reset request from Firestore
    const resetRef = db.collection('passwordResets').doc(resetCode);
    const resetDoc = await resetRef.get();
    
    if (!resetDoc.exists) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset code'
      });
    }
    
    const resetData = resetDoc.data();
    
    // Check if expired
    if (resetData.expiresAt < Date.now() || resetData.used) {
      return res.status(400).json({
        success: false,
        message: 'Reset code has expired or been used'
      });
    }
    
    // Get user data
    const userRef = db.collection('users').doc(resetData.email);
    const userDoc = await userRef.get();
    const userData = userDoc.data();
    
    // Verify security answer (case-insensitive)
    if (userData.securityAnswer?.toLowerCase() !== answer.toLowerCase()) {
      return res.status(401).json({
        success: false,
        message: 'Incorrect answer to security question'
      });
    }
    
    // Mark as verified
    await resetRef.update({
      verified: true,
      verifiedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    res.json({
      success: true,
      message: 'Identity verified successfully'
    });
    
  } catch (error) {
    console.error('❌ Security answer verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying security answer. Check backend logs.'
    });
  }
};

/**
 * Reset password
 */
exports.resetPassword = async (req, res) => {
  try {
    const { resetCode, newPassword } = req.body;
    
    if (!resetCode || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Reset code and new password are required'
      });
    }
    
    // Validate password requirements
    if (newPassword.length < 12 || !/\d/.test(newPassword)) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 12 characters long and contain a number.'
      });
    }
    
    // Get reset request
    const resetRef = db.collection('passwordResets').doc(resetCode);
    const resetDoc = await resetRef.get();
    
    if (!resetDoc.exists) {
      return res.status(400).json({
        success: false,
        message: 'Invalid reset code'
      });
    }
    
    const resetData = resetDoc.data();
    
    // Verify reset code is valid
    if (!resetData.verified || resetData.expiresAt < Date.now() || resetData.used) {
      return res.status(400).json({
        success: false,
        message: 'Reset code is invalid, expired, or has been used'
      });
    }
    
    // Get user and update password in Firebase Auth
    const userRecord = await admin.auth().getUserByEmail(resetData.email);
    await admin.auth().updateUser(userRecord.uid, {
      password: newPassword
    });
    
    // Mark reset as used
    await resetRef.update({
      used: true,
      usedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Reset failed login attempts
    const userRef = db.collection('users').doc(resetData.email);
    await userRef.update({
      failedAttempts: 0,
      lockedUntil: null,
      passwordResetAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    res.json({
      success: true,
      message: 'Password has been reset successfully'
    });
    
  } catch (error) {
    console.error('❌ Password reset error:', error);
    res.status(500).json({
      success: false,
      message: 'Error resetting password. Check backend logs.'
    });
  }
};

