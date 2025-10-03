// src/stores/auth.js
import { useNotificationStore } from '@/stores/notificationStore';
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  sendPasswordResetEmail,
  confirmPasswordReset,
  verifyPasswordResetCode
} from 'firebase/auth';
import { auth, firestoreHelpers } from '@/config/firebase';
// updated fcm token everytime user logs in
import { initializeTaskListeners, cleanupTaskListeners } from '@/services/notification-service';

// Use absolute URL for API calls
const API_BASE_URL = 'http://localhost:3000/api';

export const useAuthStore = defineStore('auth', () => {
  // State
  const user = ref(null);
  const userData = ref(null);
  const loading = ref(true);
  const error = ref(null);
  const sessionTimeout = ref(null);
  const lastActivity = ref(Date.now());

  // Session configuration
  const SESSION_DURATION = 30 * 60 * 1000; // 30 minutes
  const WARNING_BEFORE_TIMEOUT = 5 * 60 * 1000; // 5 minutes warning

  // Computed
  const isAuthenticated = computed(() => !!user.value);
  const userRole = computed(() => userData.value?.role || 'staff');
  const userName = computed(() => userData.value?.name || 'User');
  const userEmail = computed(() => user.value?.email || '');

  // Initialize auth listener
  const initializeAuth = () => {
    console.log('🔐 Initializing auth state listener...');
    onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('🔐 Auth state changed:', firebaseUser ? 'logged in' : 'logged out');
      
      if (firebaseUser) {
        user.value = firebaseUser;
        
        // Get user data from Firestore
        try {
            const userDoc = await firestoreHelpers.getUserByEmail(firebaseUser.email);
            if (userDoc) {
              userData.value = userDoc;
              await firestoreHelpers.updateLastLogin(firebaseUser.email);

              // START THE REAL-TIME LISTENER FOR THIS USER
              initializeTaskListeners(firebaseUser.email);
              console.log('✅ Real-time task notification listeners initialized.');
            }
        } catch (err) {
          console.error('Error fetching user data:', err);
        }
        
        // Start session monitoring
        startSessionTimer();
        updateLastActivity();
      } else {
        clearAuthData();
      }
      
      loading.value = false;
    });
  };

  // Login with email and password
// Replace the entire 'login' function in src/stores/auth.js with this

const login = async (email, password) => {
  loading.value = true;
  error.value = null;
  
  try {
    console.log('🔐 Attempting login for:', email);
    
    // First check if account is locked
    console.log('📞 Checking account lockout status...');
    const checkResponse = await fetch(`${API_BASE_URL}/auth/check-lockout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    
    const checkData = await checkResponse.json();
    console.log('📞 Lockout check response:', checkData);
    
    if (checkData.isLocked) {
      throw new Error(checkData.message || 'Account is locked.');
    }
    
    // Attempt Firebase authentication
    console.log('🔥 Attempting Firebase authentication...');
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log('✅ Firebase authentication successful');
    
    // Get user data from Firestore
    const userDoc = await firestoreHelpers.getUserByEmail(email);
    userData.value = userDoc;
    
    // Notify backend of successful login
    await fetch(`${API_BASE_URL}/auth/login-success`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    
    console.log('✅ Login completed successfully');
    return { success: true, user: userCredential.user };

  } catch (err) {
    console.error('❌ Login error:', err);
    let userFriendlyMessage = 'An unexpected error occurred.';

    if (err.code === 'auth/too-many-requests' || err.code === 'auth/invalid-credential') {
      try {
        const recordResponse = await fetch(`${API_BASE_URL}/auth/record-failed-attempt`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
        const recordData = await recordResponse.json();
        userFriendlyMessage = recordData.message || 'Incorrect email or password.';
      } catch (apiErr) {
        console.error('API call during login error failed:', apiErr);
        userFriendlyMessage = 'Could not verify login. Please try again later.';
      }
    } else if (err.message) {
      userFriendlyMessage = err.message;
    }
    
    error.value = userFriendlyMessage;
    throw new Error(userFriendlyMessage);

  } finally {
    // THIS IS THE FIX: This block will always run, ensuring the loading state is reset.
    loading.value = false;
  }
};


// Logout
const logout = async (reason = null) => {
  const notificationStore = useNotificationStore(); // Get store instance
  notificationStore.clearNotifications(); // Clear notifications on logout
  try {
    // STOP THE REAL-TIME LISTENER
    cleanupTaskListeners();

    await signOut(auth);
    clearAuthData();
    
    console.log('Auth Store: Logout successful');
    
    // Return appropriate redirect
    if (reason === 'session_expired') {
      return { redirect: '/login?sessionExpired=true' };
    }
    return { redirect: '/login' };
    
  } catch (err) {
    console.error('Auth Store: Logout error:', err);
    error.value = err.message;
    
    // Even if logout fails, clear local data and redirect
    clearAuthData();
    return { redirect: '/login' };
  }
};
  // Request password reset
  const requestPasswordReset = async (email) => {
    loading.value = true;
    error.value = null;
    
    try {
      // Call backend to create reset record and get security question
      const response = await fetch(`${API_BASE_URL}/auth/request-password-reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to request password reset');
      }
      
      // Return security question and reset code
      return {
        success: true,
        securityQuestion: data.securityQuestion,
        resetCode: data.resetCode
      };
      
    } catch (err) {
      console.error('Password reset request error:', err);
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Verify security answer
  const verifySecurityAnswer = async (resetCode, answer) => {
    loading.value = true;
    error.value = null;
    
    try {
      const response = await fetch(`${API_BASE_URL}/auth/verify-security-answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resetCode, answer })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Incorrect security answer');
      }
      
      return { success: true };
      
    } catch (err) {
      console.error('Security answer verification error:', err);
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Reset password
  const resetPassword = async (resetCode, newPassword) => {
    loading.value = true;
    error.value = null;
    
    try {
      const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resetCode, newPassword })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to reset password');
      }
      
      return { success: true };
      
    } catch (err) {
      console.error('Password reset error:', err);
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Clear auth data
  const clearAuthData = () => {
    user.value = null;
    userData.value = null;
    error.value = null;
    
    if (sessionTimeout.value) {
      clearTimeout(sessionTimeout.value);
      sessionTimeout.value = null;
    }
  };

  // Session management
  const startSessionTimer = () => {
    if (sessionTimeout.value) {
      clearTimeout(sessionTimeout.value);
    }
    
    const checkSession = () => {
      const now = Date.now();
      const timeSinceActivity = now - lastActivity.value;
      
      if (timeSinceActivity >= SESSION_DURATION) {
        // Session expired
        logout('session_expired');
      } else {
        // Schedule next check
        const timeUntilTimeout = SESSION_DURATION - timeSinceActivity;
        sessionTimeout.value = setTimeout(checkSession, Math.min(60000, timeUntilTimeout));
      }
    };
    
    checkSession();
  };

  // Update last activity
  const updateLastActivity = () => {
    lastActivity.value = Date.now();
    if (isAuthenticated.value) {
      startSessionTimer();
    }
  };

  // Extend session
  const extendSession = async () => {
    updateLastActivity();
    return true;
  };

  // Setup activity listeners
  const setupActivityListeners = () => {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    
    events.forEach(event => {
      document.addEventListener(event, updateLastActivity, { passive: true });
    });
    
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, updateLastActivity);
      });
    };
  };

  return {
    // State
    user,
    userData,
    loading,
    error,
    lastActivity,
    
    // Computed
    isAuthenticated,
    userRole,
    userName,
    userEmail,
    
    // Methods
    initializeAuth,
    login,
    logout,
    requestPasswordReset,
    verifySecurityAnswer,
    resetPassword,
    updateLastActivity,
    extendSession,
    setupActivityListeners
  };
});