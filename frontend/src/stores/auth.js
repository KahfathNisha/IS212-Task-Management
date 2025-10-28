import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import { auth, firestoreHelpers } from "@/config/firebase";
import { useNotificationStore } from "@/stores/notificationStore";
import { initializeListeners, cleanupListeners } from '@/services/notification-service';
import axios from 'axios';

// This is the correct, centralized API client for all authentication requests.
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
  const userRole = computed(() => userData.value?.role || '');
  const userName = computed(() => userData.value?.name || 'User');
  const userEmail = computed(() => user.value?.email || '');

  const initializeAuth = () => {
    onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        user.value = firebaseUser;
        try {
          const userDoc = await firestoreHelpers.getUserByEmail(firebaseUser.email);
          if (userDoc) {
            userData.value = userDoc;
            initializeListeners(firebaseUser.email);
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



  // This is the new, more secure login flow.
  const login = async (email, password) => {
    loading.value = true;
    error.value = null;
    try {
      const checkResponse = await authApiClient.post('/check-lockout', { email });
      if (checkResponse.data.isLocked) {
        throw new Error(checkResponse.data.message || 'Account is locked.');
      }

      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      user.value = userCredential.user;

      const idToken = await userCredential.user.getIdToken();
      localStorage.setItem('firebaseIdToken', idToken);
      const loginResponse = await authApiClient.post('/login', { idToken });
      if (!loginResponse.data.success) throw new Error(loginResponse.data.message);
      
      userData.value = loginResponse.data.user;
      return { success: true, user: userCredential.user };
    } catch (err) {
      console.error("Login error:", err);
      let userFriendlyMessage = 'An unexpected error occurred.';
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/too-many-requests') {
        try {
          const recordResponse = await authApiClient.post('/record-failed-attempt', { email });
          userFriendlyMessage = recordResponse.data.message || 'Incorrect email or password.';
        } catch (apiErr) {
          userFriendlyMessage = 'Could not verify login. Please try again later.';
        }
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
  
  // --- Password Reset logic is now restored and uses the new API client ---
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
  
  // --- Session Management logic is now fully implemented ---
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

  // Get Firebase ID token for API requests
  const getToken = async () => {
    if (!user.value) {
      throw new Error('User not authenticated');
    }
    try {
      // Force refresh the token to ensure it's valid
      const token = await user.value.getIdToken(true);
      return token;
    } catch (error) {
      console.error('Error getting Firebase token:', error);
      throw new Error('Failed to get authentication token');
    }
  };

  // Ensure all functions are exported.
  return {
    user, userData, loading, error, isAuthenticated, userRole, userName, userEmail,
    initializeAuth, login, logout, getToken,
    requestPasswordReset, verifySecurityAnswer, resetPassword,
    updateLastActivity, extendSession, setupActivityListeners
  };
});

