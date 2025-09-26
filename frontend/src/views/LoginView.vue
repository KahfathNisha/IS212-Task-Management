<template>
  <v-container class="fill-height" fluid>
    <v-row align="center" justify="center">
      <v-col cols="12" sm="8" md="6" lg="4">
        <v-card elevation="8" class="pa-4">
          <v-card-title class="text-h4 text-center">
            Task Management System
          </v-card-title>
          
          <v-card-subtitle class="text-center mt-2">
            Sign in to your account
          </v-card-subtitle>

          <v-card-text>
            <v-form ref="loginForm" v-model="valid" lazy-validation>
              <!-- Email Field -->
              <v-text-field
                v-model="email"
                :rules="emailRules"
                label="Email"
                type="email"
                prepend-icon="mdi-email"
                variant="outlined"
                class="mb-3"
                :disabled="loading"
                @keyup.enter="handleLogin"
                required
              />

              <!-- Password Field -->
              <v-text-field
                v-model="password"
                :rules="passwordRules"
                label="Password"
                :type="showPassword ? 'text' : 'password'"
                prepend-icon="mdi-lock"
                :append-icon="showPassword ? 'mdi-eye' : 'mdi-eye-off'"
                @click:append="showPassword = !showPassword"
                variant="outlined"
                class="mb-2"
                :disabled="loading"
                @keyup.enter="handleLogin"
                required
              />

              <!-- Account Locked Alert -->
              <v-alert
                v-if="accountLocked"
                type="error"
                variant="tonal"
                class="mb-3"
                closable
                @click:close="accountLocked = false"
              >
                <strong>Account Locked</strong><br>
                {{ lockMessage }}
              </v-alert>

              <!-- Failed Attempts Warning -->
              <v-alert
                v-if="showAttemptsWarning"
                type="warning"
                variant="tonal"
                class="mb-3"
                closable
                @click:close="showAttemptsWarning = false"
              >
                {{ attemptsMessage }}
              </v-alert>

              <!-- Error Alert -->
              <v-alert
                v-if="errorMessage"
                type="error"
                variant="tonal"
                class="mb-3"
                closable
                @click:close="errorMessage = ''"
              >
                {{ errorMessage }}
              </v-alert>

              <!-- Forgot Password Link -->
              <div class="text-right mb-4">
                <router-link
                  to="/forgot-password"
                  class="text-decoration-none"
                >
                  Forgot Password?
                </router-link>
              </div>

              <!-- Login Button -->
              <v-btn
                color="primary"
                block
                size="large"
                :disabled="!valid || loading"
                :loading="loading"
                @click="handleLogin"
              >
                Sign In
              </v-btn>
            </v-form>
          </v-card-text>

          <!-- Demo Credentials (Remove in production) -->
          <v-card-text class="text-caption text-grey">
            <v-divider class="mb-3" />
            <div class="text-center">
              <strong>Demo Credentials:</strong><br>
              Staff: john.doe@company.com / TestPassword123!<br>
              Manager: jane.smith@company.com / AdminPass456!
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Session Expired Dialog -->
    <v-dialog v-model="sessionExpiredDialog" persistent max-width="400">
      <v-card>
        <v-card-title class="text-h6">
          Session Expired
        </v-card-title>
        <v-card-text>
          Your session has expired due to inactivity. Please log in again to continue.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn
            color="primary"
            variant="flat"
            @click="sessionExpiredDialog = false"
          >
            OK
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

// Form state
const loginForm = ref(null);
const valid = ref(true);
const email = ref('');
const password = ref('');
const showPassword = ref(false);
const loading = ref(false);

// Error handling state
const errorMessage = ref('');
const accountLocked = ref(false);
const lockMessage = ref('');
const showAttemptsWarning = ref(false);
const attemptsMessage = ref('');
const sessionExpiredDialog = ref(false);

// Validation rules
const emailRules = [
  v => !!v || 'Email is required',
  v => /.+@.+\..+/.test(v) || 'Email must be valid',
];

const passwordRules = [
  v => !!v || 'Password is required',
];

// Check for session expiry message
onMounted(() => {
  if (route.query.sessionExpired === 'true') {
    sessionExpiredDialog.value = true;
  }
});

// Handle login
const handleLogin = async () => {
  // Validate form
  const { valid } = await loginForm.value.validate();
  
  if (!valid) return;

  loading.value = true;
  errorMessage.value = '';
  accountLocked.value = false;
  showAttemptsWarning.value = false;

  try {
    const auth = getAuth();
    
    // Attempt to sign in with Firebase Auth
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email.value,
      password.value
    );

    // Get ID token
    const idToken = await userCredential.user.getIdToken();

    // Call backend to verify login and track attempts
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email.value,
        password: password.value,
        idToken,
      }),
    });

    const data = await response.json();

    if (response.ok && data.success) {
      // Store user data in Pinia store
      await authStore.login({
        user: userCredential.user,
        userData: data.user,
        token: idToken,
      });

      // Redirect to dashboard or intended page
      const redirectTo = route.query.redirect || '/dashboard';
      router.push(redirectTo);
    } else {
      // Handle various error scenarios
      if (response.status === 423) {
        // Account locked
        accountLocked.value = true;
        lockMessage.value = data.message;
      } else if (data.remainingAttempts !== undefined) {
        // Show remaining attempts warning
        showAttemptsWarning.value = true;
        attemptsMessage.value = `Invalid credentials. ${data.remainingAttempts} attempts remaining.`;
        
        if (data.remainingAttempts === 0) {
          accountLocked.value = true;
          lockMessage.value = 'Too many failed attempts. Your account has been locked for 30 minutes.';
        }
      } else {
        errorMessage.value = data.message || 'Invalid login credentials';
      }
    }
  } catch (error) {
    console.error('Login error:', error);
    
    // Handle Firebase Auth errors
    if (error.code === 'auth/user-not-found') {
      errorMessage.value = 'Invalid login credentials';
    } else if (error.code === 'auth/wrong-password') {
      errorMessage.value = 'Invalid login credentials';
    } else if (error.code === 'auth/invalid-email') {
      errorMessage.value = 'Invalid email format';
    } else if (error.code === 'auth/user-disabled') {
      errorMessage.value = 'This account has been disabled';
    } else if (error.code === 'auth/too-many-requests') {
      accountLocked.value = true;
      lockMessage.value = 'Too many failed attempts. Please try again later.';
    } else {
      errorMessage.value = 'An error occurred during login. Please try again.';
    }
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.fill-height {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.v-card {
  border-radius: 12px;
}
</style>