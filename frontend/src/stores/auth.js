import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import { auth, firestoreHelpers } from "@/config/firebase";
import { useNotificationStore } from "@/stores/notificationStore";
import { initializeListeners, cleanupListeners } from '@/services/notification-service';
import axios from 'axios';

const authApiClient = axios.create({
  baseURL: "http://localhost:3000/api/auth",
});

export const useAuthStore = defineStore("auth", () => {
  const user = ref(null);
  const userData = ref(null);
  const loading = ref(true);
  const error = ref(null);
  const lastActivity = ref(Date.now());
  const sessionTimeout = ref(null);
  const SESSION_DURATION = 30 * 60 * 1000;

  const isAuthenticated = computed(() => !!user.value);
  const userRole = computed(() => userData.value?.role?.toLowerCase() || ''); // Added toLowerCase()
  const userName = computed(() => userData.value?.name || 'User');
  const userEmail = computed(() => user.value?.email || '');
  
  // --- THIS IS THE FIX FOR THE 'UNDEFINED' ERROR ---
  // This computed property was missing.
  const userDepartment = computed(() => userData.value?.department || null);

  const initializeAuth = () => {
    onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        user.value = firebaseUser;
        try {
          // Get token first, then use API endpoint for user data
          const idToken = await firebaseUser.getIdToken();
          const userDoc = await firestoreHelpers.getUserByEmail(firebaseUser.email, idToken);
          if (userDoc) {
            userData.value = userDoc; 
            initializeListeners(firebaseUser.email);
            console.log("✅ Persistent notification listeners initialized.");
          } else {
            // If getUserByEmail returns null, try /api/auth/me endpoint
            try {
              const response = await fetch('/api/auth/me', {
                headers: { 'Authorization': `Bearer ${idToken}` }
              });
              if (response.ok) {
                const data = await response.json();
                if (data.success && data.user) {
                  userData.value = { id: data.user.email, ...data.user };
                  initializeListeners(firebaseUser.email);
                  console.log("✅ User data loaded from API endpoint.");
                }
              }
            } catch (apiErr) {
              console.warn("Failed to fetch user data from API:", apiErr);
            }
          }
        } catch (err) {
          console.error("Error fetching user data on auth state change:", err);
        }
        startSessionTimer();
        updateLastActivity();
      } else {
        clearAuthData();
      }
      loading.value = false;
    });
  };

  const login = async (email, password) => {
    loading.value = true;
    error.value = null;
    try {
      const checkResponse = await authApiClient.post('/check-lockout', { email });
      if (checkResponse.data.isLocked) throw new Error(checkResponse.data.message);

      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      user.value = userCredential.user; // Set user state immediately

      const idToken = await userCredential.user.getIdToken();
      const loginResponse = await authApiClient.post('/login', { idToken });
      if (!loginResponse.data.success) throw new Error(loginResponse.data.message);
      
      userData.value = loginResponse.data.user; // Set user data (role, dept)
      return { success: true, user: userCredential.user };
    } catch (err) {
      console.error("Login error:", err);
      let userFriendlyMessage = 'An unexpected error occurred.';
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/too-many-requests') {
        try {
          const recordResponse = await authApiClient.post('/record-failed-attempt', { email });
          userFriendlyMessage = recordResponse.data.message || 'Incorrect email or password.';
        } catch (apiErr) {
          userFriendlyMessage = 'Could not verify login.';
        }
      } else if (err.response?.data?.message) {
        userFriendlyMessage = err.response.data.message; // Use backend error
      } else {
        userFriendlyMessage = err.message;
      }
      error.value = userFriendlyMessage;
      throw new Error(userFriendlyMessage);
    } finally {
      loading.value = false;
    }
  };

  const logout = async (reason = null) => {
    const notificationStore = useNotificationStore();
    notificationStore.clearNotifications();
    cleanupListeners();
    try {
      await signOut(auth);
      clearAuthData();
      return { redirect: reason === "session_expired" ? "/login?sessionExpired=true" : "/login" };
    } catch (err) {
      console.error("Auth Store: Logout error:", err);
      clearAuthData();
      return { redirect: "/login" };
    }
  };

  const requestPasswordReset = async (email) => {
    const response = await authApiClient.post('/request-password-reset', { email });
    return response.data;
  };

  const verifySecurityAnswer = async (resetCode, answer) => {
    const response = await authApiClient.post('/verify-security-answer', { resetCode, answer });
    return response.data;
  };
  
  const resetPassword = async (resetCode, newPassword) => {
    const response = await authApiClient.post('/reset-password', { resetCode, newPassword });
    return response.data;
  };

  const clearAuthData = () => {
    user.value = null; userData.value = null; error.value = null;
    if (sessionTimeout.value) clearTimeout(sessionTimeout.value);
  };
  
  const startSessionTimer = () => {
    if (sessionTimeout.value) clearTimeout(sessionTimeout.value);
    const checkSession = () => {
      const timeSinceActivity = Date.now() - lastActivity.value;
      if (timeSinceActivity >= SESSION_DURATION) {
        logout('session_expired');
      } else {
        const timeUntilTimeout = SESSION_DURATION - timeSinceActivity;
        sessionTimeout.value = setTimeout(checkSession, Math.min(60000, timeUntilTimeout));
      }
    };
    checkSession();
  };

  const updateLastActivity = () => {
    lastActivity.value = Date.now();
    if (isAuthenticated.value) {
      startSessionTimer();
    }
  };

  const extendSession = async () => {
    updateLastActivity();
    return true;
  };

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

  // --- This function is CRITICAL for your API calls ---
  const getToken = async () => {
    // Guard when the Firebase client `auth` export is not initialized (e.g. in tests)
    if (!auth || !auth.currentUser) {
      return null;
    }
    // Force refresh the token if it's about to expire
    return await auth.currentUser.getIdToken(true);
  };

  return {
    user, userData, loading, error, isAuthenticated, userRole, userName, userEmail,
    userDepartment, // <-- EXPORT THE NEW PROPERTY
    initializeAuth, login, logout,
    requestPasswordReset, verifySecurityAnswer, resetPassword,
    updateLastActivity, extendSession, setupActivityListeners,
    getToken // <-- EXPORT THE GETTOKEN FUNCTION
  };
});

