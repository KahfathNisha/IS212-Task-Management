<template>
  <div class="reset-wrapper">
    <v-container fluid class="pa-0">
      <v-row no-gutters align="center" justify="center" class="fill-height">
        <v-col cols="12" sm="10" md="6" lg="5" xl="4" class="px-4">
          <!-- Step 1: Request Password Reset -->
          <v-card v-if="currentStep === 'request'" elevation="12" class="reset-card">
            <v-card-title class="text-h5 font-weight-bold text-center pt-8 pb-2" style="word-wrap: break-word; white-space: normal;">
              Reset Your Password
            </v-card-title>
            
            <v-card-subtitle class="text-center pb-6 text-medium-emphasis">
              Enter your email to receive reset instructions
            </v-card-subtitle>

            <v-card-text class="px-8 pb-8">
              <v-form ref="requestForm" v-model="requestValid" lazy-validation>
                <v-text-field
                  v-model="email"
                  :rules="emailRules"
                  label="Email Address"
                  type="email"
                  prepend-inner-icon="mdi-email"
                  variant="outlined"
                  density="comfortable"
                  class="mb-4"
                  :disabled="loading"
                  @keyup.enter="handleRequestReset"
                  required
                  hide-details="auto"
                />

                <v-alert
                  v-if="message"
                  :type="messageType"
                  variant="tonal"
                  class="mb-4"
                  closable
                  @click:close="message = ''"
                  density="compact"
                >
                  {{ message }}
                </v-alert>

                <v-btn
                  color="primary"
                  block
                  size="large"
                  :disabled="!requestValid || loading"
                  :loading="loading"
                  @click="handleRequestReset"
                  elevation="2"
                  class="mb-3"
                >
                  Send Reset Instructions
                </v-btn>

                <v-btn
                  variant="text"
                  block
                  @click="$router.push('/login')"
                >
                  Back to Login
                </v-btn>
              </v-form>
            </v-card-text>
          </v-card>

          <!-- Step 2: Verify Identity -->
          <v-card v-else-if="currentStep === 'verify'" elevation="12" class="reset-card">
            <v-card-title class="text-h5 font-weight-bold text-center pt-8 pb-2">
              Verify Your Identity
            </v-card-title>
            
            <v-card-subtitle class="text-center pb-6 text-medium-emphasis">
              Answer your security question to continue
            </v-card-subtitle>

            <v-card-text class="px-8 pb-8">
              <v-form ref="verifyForm" v-model="verifyValid" lazy-validation>
                <div class="mb-4 pa-4" style="background-color: rgba(0,0,0,0.03); border-radius: 8px;">
                  <div class="text-caption text-medium-emphasis mb-1">Security Question:</div>
                  <p class="text-body-1 font-weight-medium mb-0">{{ securityQuestion }}</p>
                </div>

                <v-text-field
                  v-model="securityAnswer"
                  :rules="answerRules"
                  label="Your Answer"
                  prepend-inner-icon="mdi-shield-check"
                  variant="outlined"
                  density="comfortable"
                  class="mb-4"
                  :disabled="loading"
                  @keyup.enter="handleVerifyIdentity"
                  required
                  hide-details="auto"
                />

                <v-alert
                  v-if="message"
                  :type="messageType"
                  variant="tonal"
                  class="mb-4"
                  closable
                  @click:close="message = ''"
                  density="compact"
                >
                  {{ message }}
                </v-alert>

                <v-btn
                  color="primary"
                  block
                  size="large"
                  :disabled="!verifyValid || loading"
                  :loading="loading"
                  @click="handleVerifyIdentity"
                  elevation="2"
                  class="mb-3"
                >
                  Verify Identity
                </v-btn>

                <v-btn
                  variant="text"
                  block
                  @click="currentStep = 'request'"
                >
                  Back
                </v-btn>
              </v-form>
            </v-card-text>
          </v-card>

          <!-- Step 3: Set New Password -->
          <v-card v-else-if="currentStep === 'reset'" elevation="12" class="reset-card">
            <v-card-title class="text-h5 font-weight-bold text-center pt-8 pb-2">
              Set New Password
            </v-card-title>
            
            <v-card-subtitle class="text-center pb-6 text-medium-emphasis">
              Enter your new password
            </v-card-subtitle>

            <v-card-text class="px-8 pb-8">
              <v-form ref="resetForm" v-model="resetValid" lazy-validation>
                <v-text-field
                  v-model="newPassword"
                  :rules="passwordRules"
                  label="New Password"
                  :type="showNewPassword ? 'text' : 'password'"
                  prepend-inner-icon="mdi-lock"
                  :append-inner-icon="showNewPassword ? 'mdi-eye' : 'mdi-eye-off'"
                  @click:append-inner="showNewPassword = !showNewPassword"
                  variant="outlined"
                  density="comfortable"
                  class="mb-4"
                  :disabled="loading"
                  required
                  hide-details="auto"
                />

                <v-text-field
                  v-model="confirmPassword"
                  :rules="confirmPasswordRules"
                  label="Confirm New Password"
                  :type="showConfirmPassword ? 'text' : 'password'"
                  prepend-inner-icon="mdi-lock-check"
                  :append-inner-icon="showConfirmPassword ? 'mdi-eye' : 'mdi-eye-off'"
                  @click:append-inner="showConfirmPassword = !showConfirmPassword"
                  variant="outlined"
                  density="comfortable"
                  class="mb-4"
                  :disabled="loading"
                  @keyup.enter="handleResetPassword"
                  required
                  hide-details="auto"
                />

                <!-- Password Requirements -->
                <v-alert
                  variant="tonal"
                  density="compact"
                  class="mb-4"
                >
                  <div class="text-caption">
                    <strong>Password Requirements:</strong>
                    <ul class="mt-1">
                      <li :class="passwordLength ? 'text-success' : ''">
                        At least 12 characters
                      </li>
                      <li :class="passwordNumber ? 'text-success' : ''">
                        At least one number
                      </li>
                    </ul>
                  </div>
                </v-alert>

                <v-alert
                  v-if="message"
                  :type="messageType"
                  variant="tonal"
                  class="mb-4"
                  closable
                  @click:close="message = ''"
                  density="compact"
                >
                  {{ message }}
                </v-alert>

                <v-btn
                  color="primary"
                  block
                  size="large"
                  :disabled="!resetValid || loading"
                  :loading="loading"
                  @click="handleResetPassword"
                  elevation="2"
                >
                  Reset Password
                </v-btn>
              </v-form>
            </v-card-text>
          </v-card>

          <!-- Step 4: Success -->
          <v-card v-else-if="currentStep === 'success'" elevation="12" class="reset-card">
            <v-card-text class="text-center px-8 py-12">
              <v-icon
                color="success"
                size="80"
                class="mb-6"
              >
                mdi-check-circle
              </v-icon>
              
              <h2 class="text-h5 font-weight-bold mb-3">Password Reset Successful!</h2>
              
              <p class="text-body-1 text-medium-emphasis mb-6">
                Your password has been reset successfully. 
                You can now log in with your new password.
              </p>

              <v-btn
                color="primary"
                block
                size="large"
                @click="$router.push('/login')"
                elevation="2"
              >
                Go to Login
              </v-btn>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-container>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();

// Current step in the reset process
const currentStep = ref('request'); // 'request', 'verify', 'reset', 'success'

// Form refs and validation
const requestForm = ref(null);
const verifyForm = ref(null);
const resetForm = ref(null);
const requestValid = ref(true);
const verifyValid = ref(true);
const resetValid = ref(true);

// Loading state
const loading = ref(false);

// Message handling
const message = ref('');
const messageType = ref('info');

// Step 1: Request Reset
const email = ref('');
const resetCode = ref('');
const securityQuestion = ref('');

// Step 2: Verify Identity
const securityAnswer = ref('');

// Step 3: Reset Password
const newPassword = ref('');
const confirmPassword = ref('');
const showNewPassword = ref(false);
const showConfirmPassword = ref(false);

// Validation rules
const emailRules = [
  v => !!v || 'Email is required',
  v => /.+@.+\..+/.test(v) || 'Email must be valid',
];

const answerRules = [
  v => !!v || 'Security answer is required',
  v => (v && v.length >= 2) || 'Answer must be at least 2 characters',
];

const passwordRules = [
  v => !!v || 'Password is required',
  v => (v && v.length >= 12) || 'Password must be at least 12 characters',
  v => /\d/.test(v) || 'Password must contain at least one number',
];

const confirmPasswordRules = [
  v => !!v || 'Please confirm your password',
  v => v === newPassword.value || 'Passwords do not match',
];

// Computed properties for password validation
const passwordLength = computed(() => newPassword.value.length >= 12);
const passwordNumber = computed(() => /\d/.test(newPassword.value));

// Watch password changes to update validation
watch(newPassword, () => {
  if (resetForm.value) {
    resetForm.value.validate();
  }
});

// Handle request password reset
const handleRequestReset = async () => {
  const { valid } = await requestForm.value.validate();
  
  if (!valid) return;

  loading.value = true;
  message.value = '';

  try {
    const response = await fetch('/api/auth/request-password-reset', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: email.value }),
    });

    const data = await response.json();

    if (response.ok && data.success) {
      resetCode.value = data.resetCode;
      securityQuestion.value = data.securityQuestion;
      currentStep.value = 'verify';
      message.value = 'Please answer your security question to continue.';
      messageType.value = 'info';
    } else {
      message.value = 'If the email exists in our system, you will receive password reset instructions.';
      messageType.value = 'info';
    }
  } catch (error) {
    console.error('Request reset error:', error);
    message.value = 'An error occurred. Please try again later.';
    messageType.value = 'error';
  } finally {
    loading.value = false;
  }
};

// Handle identity verification
const handleVerifyIdentity = async () => {
  const { valid } = await verifyForm.value.validate();
  
  if (!valid) return;

  loading.value = true;
  message.value = '';

  try {
    const response = await fetch('/api/auth/verify-security-answer', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        resetCode: resetCode.value,
        answer: securityAnswer.value,
      }),
    });

    const data = await response.json();

    if (response.ok && data.success) {
      currentStep.value = 'reset';
      message.value = '';
    } else {
      message.value = data.message || 'Incorrect answer. Please try again.';
      messageType.value = 'error';
    }
  } catch (error) {
    console.error('Verify identity error:', error);
    message.value = 'An error occurred. Please try again.';
    messageType.value = 'error';
  } finally {
    loading.value = false;
  }
};

// Handle password reset
const handleResetPassword = async () => {
  const { valid } = await resetForm.value.validate();
  
  if (!valid) return;

  loading.value = true;
  message.value = '';

  try {
    const response = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        resetCode: resetCode.value,
        newPassword: newPassword.value,
      }),
    });

    const data = await response.json();

    if (response.ok && data.success) {
      currentStep.value = 'success';
    } else {
      message.value = data.message || 'Failed to reset password. Please try again.';
      messageType.value = 'error';
    }
  } catch (error) {
    console.error('Reset password error:', error);
    message.value = 'An error occurred. Please try again.';
    messageType.value = 'error';
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
.reset-wrapper {
  min-height: 100vh;
  width: 100vw;
  background: linear-gradient(135deg, #c5d49a 0%, #f5f4f2 100%);
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

.reset-card {
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.98);
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

ul {
  padding-left: 20px;
  margin: 0;
}

li {
  transition: color 0.3s;
}

.text-success {
  color: #4caf50 !important;
  font-weight: 500;
}

/* Ensure no overflow on mobile */
@media (max-width: 600px) {
  .reset-card {
    border-radius: 12px;
  }
}
</style>