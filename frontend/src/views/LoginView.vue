<template>
  <div class="login-wrapper">
    <v-container fluid class="pa-0">
      <v-row no-gutters align="center" justify="center" class="fill-height">
        <v-col cols="12" sm="10" md="6" lg="5" xl="4" class="px-4">
          <v-card elevation="12" class="login-card">
            <v-card-title class="text-h5 font-weight-bold text-center pt-8 pb-2" style="word-wrap: break-word; white-space: normal;">
              Task Management System
            </v-card-title>
            
            <v-card-subtitle class="text-center pb-6 text-medium-emphasis">
              Sign in to your account
            </v-card-subtitle>

            <v-card-text class="px-8 pb-8">
              <v-form ref="loginForm" v-model="valid" lazy-validation>
                <!-- Email Field -->
                <v-text-field
                  v-model="email"
                  :rules="emailRules"
                  label="Email"
                  type="email"
                  prepend-inner-icon="mdi-email"
                  variant="outlined"
                  density="comfortable"
                  class="mb-4"
                  :disabled="loading"
                  @keyup.enter="handleLogin"
                  required
                  hide-details="auto"
                />

                <!-- Password Field -->
                <v-text-field
                  v-model="password"
                  :rules="passwordRules"
                  label="Password"
                  :type="showPassword ? 'text' : 'password'"
                  prepend-inner-icon="mdi-lock"
                  :append-inner-icon="showPassword ? 'mdi-eye' : 'mdi-eye-off'"
                  @click:append-inner="showPassword = !showPassword"
                  variant="outlined"
                  density="comfortable"
                  class="mb-2"
                  :disabled="loading"
                  @keyup.enter="handleLogin"
                  required
                  hide-details="auto"
                />

                <!-- Error Alert -->
                <v-alert
                  v-if="errorMessage"
                  type="error"
                  variant="tonal"
                  class="mt-4 mb-4"
                  closable
                  @click:close="errorMessage = ''"
                  density="compact"
                >
                  {{ errorMessage }}
                </v-alert>

                <!-- Forgot Password Link -->
                <div class="text-right mt-3 mb-6">
                  <router-link
                    to="/forgot-password"
                    class="text-decoration-none text-primary"
                  >
                    Forgot Password?
                  </router-link>
                </div>

                <!-- Login Button -->
                <v-btn
                  color="secondary"
                  block
                  size="large"
                  :disabled="!valid || loading"
                  :loading="loading"
                  @click="handleLogin"
                  elevation="2"
                >
                  Sign In
                </v-btn>
                <v-btn
                variant="text"
                block
                @click="$router.push('/register')"
              >
                Don't have an account? Register
              </v-btn>
              </v-form>
            </v-card-text>

            <!-- Demo Credentials -->
            <v-card-text class="text-caption text-grey">
            <v-divider class="mb-3" />
            <div class="text-center" style="line-height: 1.6;">
              <strong>Demo Credentials:</strong><br>
              <strong>Director:</strong> jack.sim@company.com / Password123!<br>
              <strong>Manager:</strong> michael.brown@company.com / Password123!<br>
              <strong>HR:</strong> sally.loh@company.com / Password123!<br>
              <strong>Staff 1:</strong> john.doe@company.com / TestPassword123!<br>
              <strong>Staff 2:</strong> jane.smith@company.com / AdminPass456!<br>
              <strong>Staff 3:</strong> alice.johnson@company.com / Password123!
            </div>
          </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-container>

    <!-- Session Expired Dialog -->
    <v-dialog v-model="sessionExpiredDialog" persistent max-width="400">
      <v-card>
        <v-card-title class="text-h6 font-weight-bold">
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
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
// This tells Vue to look inside the 'src' folder for 'stores/auth.js'
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

const handleLogin = async () => {
  const { valid } = await loginForm.value.validate();
  if (!valid) return;

  loading.value = true;
  errorMessage.value = '';

  try {
    await authStore.login(email.value, password.value);
    const redirectTo = route.query.redirect || '/home';
    router.push(redirectTo);
  } catch (error) {
    console.error('LoginView.vue: Login failed:', error);
    errorMessage.value = error.message || 'An unknown error occurred.';
  } finally {
    loading.value = false;
  }
};
</script>

<style>
/* Remove any default body/html margins and padding */
body, html {
  margin: 0;
  padding: 0;
  overflow: hidden;
  height: 100%;
}
</style>

<style scoped>
.login-wrapper {
  min-height: 100vh;
  width: 100vw;
  background: linear-gradient(135deg, #7b92d1 0%, #f5f4f2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  margin: 0;
  padding: 0;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}

.v-container {
  height: 100%;
  margin: 0;
  padding: 0;
}

.fill-height {
  height: 100%;
}

.login-card {
  border-radius: 16px;
  background: #ffffff;
  backdrop-filter: blur(10px);
  max-width: 100%;
  overflow: visible;
  width: 100%;
}

.v-card-title {
  line-height: 1.3 !important;
  overflow-wrap: break-word;
  word-break: break-word;
}

/* Ensure no overflow on mobile */
@media (max-width: 600px) {
  .login-card {
    border-radius: 12px;
  }
}
</style>