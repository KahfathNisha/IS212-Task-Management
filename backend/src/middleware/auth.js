const admin = require('firebase-admin');

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
    
    // Get or create attempt record
    if (!attempts.has(ip)) {
      attempts.set(ip, {
        count: 0,
        firstAttempt: now,
        lastAttempt: now
      });
    }
    
    const record = attempts.get(ip);
    
    // Reset if outside window
    if (now - record.firstAttempt > WINDOW_MS) {
      record.count = 0;
      record.firstAttempt = now;
    }
    
    // Check if limit exceeded
    if (record.count >= MAX_ATTEMPTS) {
      const timeRemaining = Math.ceil((WINDOW_MS - (now - record.firstAttempt)) / 60000);
      return res.status(429).json({
        success: false,
        message: `Too many requests. Please try again in ${timeRemaining} minutes.`
      });
    }
    
    // Increment counter
    record.count++;
    record.lastAttempt = now;
    
    next();
  };
})();

/**
 * Verify Firebase ID token (for protected routes)
 * Note: Not used for authentication endpoints, but useful for other protected routes
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

    // Verify the ID token
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    // Attach user info to request
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email
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