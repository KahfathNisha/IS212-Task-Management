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

// --- THIS IS THE FIX ---
// The entire login logic is simplified to a single call to the auth store.
const handleLogin = async () => {
  const { valid } = await loginForm.value.validate();
  if (!valid) return;

  loading.value = true;
  errorMessage.value = '';

  try {
    // Delegate ALL logic to the auth store
    await authStore.login(email.value, password.value);

    // If the store's login is successful, redirect
    const redirectTo = route.query.redirect || '/dashboard';
    router.push(redirectTo);

  } catch (error) {
    // The store will throw an error on failure, which we can display here
    console.error('LoginView.vue: Login failed:', error);
    errorMessage.value = error.message || 'An unknown error occurred.';
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
