const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'is212-task-management',
    storageBucket: 'is212-task-management.firebasestorage.app'
  });
}

// Now initialize Firestore after Firebase is initialized
const db = admin.firestore();

// Constants
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 30 * 60 * 1000; // 30 minutes

/**
 * Check if an account is locked
 */
exports.checkLockout = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
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
      const remainingTime = Math.ceil((userData.lockedUntil - now) / 60000);
      return res.json({
        success: true,
        isLocked: true,
        remainingTime,
        message: `Account is locked. Please try again in ${remainingTime} minutes.`
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
    console.error('Check lockout error:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking account status'
    });
  }
};

/**
 * Record successful login (reset failed attempts)
 */
exports.loginSuccess = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
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
    console.error('Login success error:', error);
    res.status(500).json({
      success: false,
      message: 'Error recording login'
    });
  }
};

/**
 * Record failed login attempt
 */
exports.recordFailedAttempt = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }
    
    const userRef = db.collection('users').doc(email);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      // Don't reveal if user exists
      return res.json({
        success: true,
        remainingAttempts: MAX_LOGIN_ATTEMPTS
      });
    }
    
    const userData = userDoc.data();
    const now = Date.now();
    
    // Check if already locked
    if (userData.lockedUntil && userData.lockedUntil > now) {
      const remainingTime = Math.ceil((userData.lockedUntil - now) / 60000);
      return res.json({
        success: true,
        isLocked: true,
        remainingTime,
        message: `Account is locked for ${remainingTime} more minutes.`
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
      
      return res.json({
        success: true,
        isLocked: true,
        remainingTime: 30,
        message: 'Too many failed attempts. Account locked for 30 minutes.'
      });
    }
    
    // Update failed attempts
    await userRef.update(updateData);
    
    const remainingAttempts = MAX_LOGIN_ATTEMPTS - failedAttempts;
    
    res.json({
      success: true,
      isLocked: false,
      remainingAttempts,
      message: `Invalid credentials. ${remainingAttempts} attempts remaining.`
    });
    
  } catch (error) {
    console.error('Record failed attempt error:', error);
    res.status(500).json({
      success: false,
      message: 'Error recording failed attempt'
    });
  }
};

/**
 * Request password reset
 */
exports.requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
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
    console.error('Password reset request error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing password reset request'
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
    // In production, this should be hashed
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
    console.error('Security answer verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying security answer'
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
    if (newPassword.length < 12) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 12 characters long'
      });
    }
    
    if (!/\d/.test(newPassword)) {
      return res.status(400).json({
        success: false,
        message: 'Password must contain at least one number'
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
    console.error('Password reset error:', error);
    res.status(500).json({
      success: false,
      message: 'Error resetting password'
    });
  }
};