<template>
  <v-container class="fill-height" fluid>
    <v-row align="center" justify="center">
      <v-col cols="12" sm="8" md="6" lg="4">
        <!-- Step 1: Request Password Reset -->
        <v-card v-if="currentStep === 'request'" elevation="8" class="pa-4">
          <v-card-title class="text-h5 text-center">
            Reset Your Password
          </v-card-title>
          
          <v-card-subtitle class="text-center mt-2">
            Enter your email to receive reset instructions
          </v-card-subtitle>

          <v-card-text>
            <v-form ref="requestForm" v-model="requestValid" lazy-validation>
              <v-text-field
                v-model="email"
                :rules="emailRules"
                label="Email Address"
                type="email"
                prepend-icon="mdi-email"
                variant="outlined"
                class="mb-3"
                :disabled="loading"
                @keyup.enter="handleRequestReset"
                required
              />

              <v-alert
                v-if="message"
                :type="messageType"
                variant="tonal"
                class="mb-3"
                closable
                @click:close="message = ''"
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
              >
                Send Reset Instructions
              </v-btn>

              <v-btn
                variant="text"
                block
                class="mt-2"
                @click="$router.push('/login')"
              >
                Back to Login
              </v-btn>
            </v-form>
          </v-card-text>
        </v-card>

        <!-- Step 2: Verify Identity -->
        <v-card v-else-if="currentStep === 'verify'" elevation="8" class="pa-4">
          <v-card-title class="text-h5 text-center">
            Verify Your Identity
          </v-card-title>
          
          <v-card-subtitle class="text-center mt-2">
            Answer your security question to continue
          </v-card-subtitle>

          <v-card-text>
            <v-form ref="verifyForm" v-model="verifyValid" lazy-validation>
              <div class="mb-4">
                <v-label class="text-subtitle-2 mb-2">Security Question:</v-label>
                <p class="text-body-1 font-weight-medium">{{ securityQuestion }}</p>
              </div>

              <v-text-field
                v-model="securityAnswer"
                :rules="answerRules"
                label="Your Answer"
                prepend-icon="mdi-shield-check"
                variant="outlined"
                class="mb-3"
                :disabled="loading"
                @keyup.enter="handleVerifyIdentity"
                required
              />

              <v-alert
                v-if="message"
                :type="messageType"
                variant="tonal"
                class="mb-3"
                closable
                @click:close="message = ''"
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
              >
                Verify Identity
              </v-btn>

              <v-btn
                variant="text"
                block
                class="mt-2"
                @click="currentStep = 'request'"
              >
                Back
              </v-btn>
            </v-form>
          </v-card-text>
        </v-card>

        <!-- Step 3: Set New Password -->
        <v-card v-else-if="currentStep === 'reset'" elevation="8" class="pa-4">
          <v-card-title class="text-h5 text-center">
            Set New Password
          </v-card-title>
          
          <v-card-subtitle class="text-center mt-2">
            Enter your new password
          </v-card-subtitle>

          <v-card-text>
            <v-form ref="resetForm" v-model="resetValid" lazy-validation>
              <v-text-field
                v-model="newPassword"
                :rules="passwordRules"
                label="New Password"
                :type="showNewPassword ? 'text' : 'password'"
                prepend-icon="mdi-lock"
                :append-icon="showNewPassword ? 'mdi-eye' : 'mdi-eye-off'"
                @click:append="showNewPassword = !showNewPassword"
                variant="outlined"
                class="mb-3"
                :disabled="loading"
                required
              />

              <v-text-field
                v-model="confirmPassword"
                :rules="confirmPasswordRules"
                label="Confirm New Password"
                :type="showConfirmPassword ? 'text' : 'password'"
                prepend-icon="mdi-lock-check"
                :append-icon="showConfirmPassword ? 'mdi-eye' : 'mdi-eye-off'"
                @click:append="showConfirmPassword = !showConfirmPassword"
                variant="outlined"
                class="mb-3"
                :disabled="loading"
                @keyup.enter="handleResetPassword"
                required
              />

              <!-- Password Requirements -->
              <v-alert
                variant="tonal"
                density="compact"
                class="mb-3"
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
                class="mb-3"
                closable
                @click:close="message = ''"
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
              >
                Reset Password
              </v-btn>
            </v-form>
          </v-card-text>
        </v-card>

        <!-- Step 4: Success -->
        <v-card v-else-if="currentStep === 'success'" elevation="8" class="pa-4">
          <v-card-text class="text-center">
            <v-icon
              color="success"
              size="64"
              class="mb-4"
            >
              mdi-check-circle
            </v-icon>
            
            <h2 class="text-h5 mb-2">Password Reset Successful!</h2>
            
            <p class="text-body-1 mb-4">
              Your password has been reset successfully. 
              You can now log in with your new password.
            </p>

            <v-btn
              color="primary"
              block
              size="large"
              @click="$router.push('/login')"
            >
              Go to Login
            </v-btn>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
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
      // Store reset code and security question
      resetCode.value = data.resetCode;
      securityQuestion.value = data.securityQuestion;
      
      // Move to verification step
      currentStep.value = 'verify';
      
      message.value = 'Please answer your security question to continue.';
      messageType.value = 'info';
    } else {
      // Always show generic message for security
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
      // Move to reset password step
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
      // Move to success step
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

<style scoped>
.fill-height {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.v-card {
  border-radius: 12px;
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
</style>