import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import { auth, firestoreHelpers } from "@/config/firebase";
import { useNotificationStore } from "@/stores/notificationStore";
import { initializeListeners, cleanupListeners } from '@/services/notification-service';
import axios from 'axios'; // Import axios

// Create a dedicated API client for your auth routes
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
          // It's good practice to re-fetch user data on auth state change
          // to ensure it's fresh.
          const userDoc = await firestoreHelpers.getUserByEmail(firebaseUser.email);
          if (userDoc) {
            userData.value = userDoc;
            initializeListeners(firebaseUser.email);
            console.log("✅ Persistent notification listeners initialized.");
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

  // --- THIS IS THE UPDATED LOGIN FUNCTION ---
  const login = async (email, password) => {
    loading.value = true;
    error.value = null;
    try {
      // 1. Check for account lockout (this part is correct)
      const checkResponse = await authApiClient.post('/check-lockout', { email });
      const checkData = await checkResponse.data;
      if (checkData.isLocked) {
        throw new Error(checkData.message || 'Account is locked.');
      }

      // 2. Sign in with Firebase on the client
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // 3. --- THIS IS THE CRITICAL NEW STEP ---
      // Get the ID token from the successful login
      const idToken = await userCredential.user.getIdToken();

      // 4. --- AND SAVE IT TO LOCAL STORAGE ---
      // The key MUST match the one in your axios interceptor ('firebaseIdToken')
      localStorage.setItem('firebaseIdToken', idToken);
      console.log("✅ Firebase ID Token saved to localStorage!");

      // 5. Securely verify the token with your backend and get the user's profile
      // This replaces the separate firestoreHelpers and 'login-success' calls
      const loginResponse = await authApiClient.post('/login', { idToken });

      if (loginResponse.data.success) {
        userData.value = loginResponse.data.user;
      } else {
        throw new Error(loginResponse.data.message || 'Backend verification failed.');
      }

      return { success: true, user: userCredential.user };

    } catch (err) {
      console.error("Login error:", err);
      let userFriendlyMessage = 'An unexpected error occurred.';
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/too-many-requests') {
        try {
            // This part for recording failed attempts is correct
            const recordResponse = await authApiClient.post('/record-failed-attempt', { email });
            const recordData = await recordResponse.data;
            userFriendlyMessage = recordData.message || 'Incorrect email or password.';
        } catch (apiErr) {
            userFriendlyMessage = 'Could not verify login. Please try again later.';
        }
      } else if (err.message) {
        userFriendlyMessage = err.message;
      }
      error.value = userFriendlyMessage;
      throw new Error(userFriendlyMessage);
    } finally {
      loading.value = false;
    }
  };

  // --- THIS IS THE UPDATED LOGOUT FUNCTION ---
  const logout = async (reason = null) => {
    const notificationStore = useNotificationStore();
    notificationStore.clearNotifications();
    cleanupListeners();
    try {
      await signOut(auth);
      
      // --- ADDED THIS LINE TO CLEAN UP ---
      localStorage.removeItem('firebaseIdToken');
      
      clearAuthData();
      return { redirect: reason === "session_expired" ? "/login?sessionExpired=true" : "/login" };
    } catch (err) {
      console.error("Auth Store: Logout error:", err);
      
      // Also clear the token on error, just in case
      localStorage.removeItem('firebaseIdToken');

      clearAuthData();
      return { redirect: "/login" };
    }
  };
  
  const clearAuthData = () => {
    user.value = null; userData.value = null; error.value = null;
    if (sessionTimeout.value) clearTimeout(sessionTimeout.value);
  };

  const startSessionTimer = () => { /* Session logic remains the same */ };
  const updateLastActivity = () => { /* Session logic remains the same */ };
  const extendSession = async () => { updateLastActivity(); return true; };
  const setupActivityListeners = () => { /* Session logic remains the same */ };

  return {
    user, userData, loading, error, isAuthenticated, userRole, userName, userEmail,
    initializeAuth, login, logout, updateLastActivity, extendSession, setupActivityListeners
  };
});

