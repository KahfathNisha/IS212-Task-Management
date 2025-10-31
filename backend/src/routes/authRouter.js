const express = require('express');
const authController = require('../controllers/authController');
const { loginRateLimiter, verifyToken } = require('../middleware/auth');

const router = express.Router();

/**
 * POST /api/auth/login
 * Handles the main user login request after client-side Firebase auth
 */
router.post('/login', authController.login);

/**
 * POST /api/auth/check-lockout
 * Check if an account is locked before attempting login
 */
router.post('/check-lockout', authController.checkLockout);

/**
 * POST /api/auth/login-success
 * Record successful login (reset failed attempts)
 */
router.post('/login-success', authController.loginSuccess);

/**
 * POST /api/auth/record-failed-attempt
 * Record a failed login attempt
 */
router.post('/record-failed-attempt', loginRateLimiter, authController.recordFailedAttempt);

/**
 * POST /api/auth/request-password-reset
 * Request password reset and get security question
 */
router.post('/request-password-reset', authController.requestPasswordReset);

/**
 * POST /api/auth/verify-security-answer
 * Verify the security question answer
 */
router.post('/verify-security-answer', authController.verifySecurityAnswer);

/**
 * POST /api/auth/reset-password
 * Reset password with new password
 */
router.post('/reset-password', authController.resetPassword);
/**
 * POST /api/auth/register
 * Handles a new user self-registering.
 */
router.post('/register', authController.registerUser);
/**
 * GET /api/auth/me
 * Return the authenticated user's profile using Firebase token
 */
router.get('/me', verifyToken, (req, res) => {
  return res.status(200).json({ success: true, user: req.user });
});

module.exports = router;
