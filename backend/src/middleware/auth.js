// 1. Import 'db' to access the Firestore database
const { admin, db } = require('../config/firebase');

/**
 * Rate limiter for login attempts (per IP)
 */
const loginRateLimiter = (() => {
  const attempts = new Map();
  const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
  const MAX_ATTEMPTS = 10; // Max attempts per IP

  return (req, res, next) => {
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    const now = Date.now();
    
    if (!attempts.has(ip)) {
      attempts.set(ip, {
        count: 0,
        firstAttempt: now,
        lastAttempt: now
      });
    }
    
    const record = attempts.get(ip);
    
    if (now - record.firstAttempt > WINDOW_MS) {
      record.count = 0;
      record.firstAttempt = now;
    }
    
    if (record.count >= MAX_ATTEMPTS) {
      const timeRemaining = Math.ceil((WINDOW_MS - (now - record.firstAttempt)) / 60000);
      return res.status(429).json({
        success: false,
        message: `Too many requests. Please try again in ${timeRemaining} minutes.`
      });
    }
    
    record.count++;
    record.lastAttempt = now;
    
    next();
  };
})();

/**
 * Verify Firebase ID token (for protected routes)
 */
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No authentication token provided'
      });
    }

    // Verify the token with Firebase Auth
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    // Look up the user's profile in Firestore
    const userDoc = await db.collection('users').doc(decodedToken.email).get();

    if (!userDoc.exists) {
      return res.status(404).json({ 
        success: false, 
        message: 'User profile not found in database.' 
      });
    }

    const userProfile = userDoc.data();
    
    // ✅ FIXED: Include ALL necessary fields
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: userProfile.name,
      role: userProfile.role,           // ✅ Added
      department: userProfile.department // ✅ Added
    };

    next();
  } catch (error) {
    console.error('Token verification error:', error);
    
    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired'
      });
    }
    
    return res.status(403).json({
      success: false,
      message: 'Invalid authentication token'
    });
  }
};

module.exports = {
  loginRateLimiter,
  verifyToken
};