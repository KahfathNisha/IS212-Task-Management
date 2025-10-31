
<template>
  <div class="register-wrapper">
    <v-container fluid class="pa-0">
      <v-row no-gutters align="center" justify="center" class="fill-height">
        <v-col cols="12" sm="10" md="8" lg="6" xl="5" class="px-4">
          <v-card elevation="12" class="register-card">
            <v-card-title class="text-h5 font-weight-bold text-center pt-8 pb-2">
              Create Your Account
            </v-card-title>
            
            <v-card-subtitle class="text-center pb-6 text-medium-emphasis">
              Join the Task Management System
            </v-card-subtitle>

            <v-card-text class="px-8 pb-8">
              <v-form ref="registerForm" v-model="valid" @submit.prevent="handleRegister">
                
                <!-- Name Fields -->
                <v-row>
                  <v-col cols="12" sm="6">
                    <v-text-field
                      v-model="form.firstName"
                      label="First Name"
                      :rules="[rules.required]"
                      variant="outlined"
                      density="comfortable"
                    ></v-text-field>
                  </v-col>
                  <v-col cols="12" sm="6">
                    <v-text-field
                      v-model="form.lastName"
                      label="Last Name"
                      :rules="[rules.required]"
                      variant="outlined"
                      density="comfortable"
                    ></v-text-field>
                  </v-col>
                </v-row>

                <!-- Auto-generated Email -->
                <v-text-field
                  v-model="generatedEmail"
                  label="Email Address (auto-generated)"
                  variant="outlined"
                  density="comfortable"
                  readonly
                  class="mb-4"
                  prepend-inner-icon="mdi-email"
                ></v-text-field>
                
                <!-- Password Fields (AC4, AC5) -->
                <v-text-field
                  v-model="form.password"
                  label="Password"
                  :rules="[rules.required, rules.password]"
                  :type="showPassword ? 'text' : 'password'"
                  :append-inner-icon="showPassword ? 'mdi-eye' : 'mdi-eye-off'"
                  @click:append-inner="showPassword = !showPassword"
                  variant="outlined"
                  density="comfortable"
                  prepend-inner-icon="mdi-lock"
                  class="mb-4"
                ></v-text-field>
                
                <v-text-field
                  v-model="form.confirmPassword"
                  label="Confirm Password"
                  :rules="[rules.required, rules.passwordMatch]"
                  :type="showConfirmPassword ? 'text' : 'password'"
                  :append-inner-icon="showConfirmPassword ? 'mdi-eye' : 'mdi-eye-off'"
                  @click:append-inner="showConfirmPassword = !showConfirmPassword"
                  variant="outlined"
                  density="comfortable"
                  prepend-inner-icon="mdi-lock-check"
                  class="mb-4"
                ></v-text-field>
                
                <!-- Department and Role -->
                <v-row>
                  <v-col cols="12" sm="6">
                    <v-select
                      v-model="form.department"
                      :items="departments"
                      label="Department"
                      :rules="[rules.required]"
                      variant="outlined"
                      density="comfortable"
                    ></v-select>
                  </v-col>
                  <v-col cols="12" sm="6">
                    <v-select
                      v-model="form.role"
                      :items="roles"
                      label="Role"
                      :rules="[rules.required]"
                      variant="outlined"
                      density="comfortable"
                    ></v-select>
                  </v-col>
                </v-row>

                <!-- Title (from Michelle Goh example) -->
                <v-text-field
                  v-model="form.title"
                  label="Job Title (e.g., Support Team)"
                  :rules="[rules.required]"
                  variant="outlined"
                  density="comfortable"
                  class="mb-4"
                  prepend-inner-icon="mdi-badge-account"
                ></v-text-field>
                
                <!-- Security Question & Answer -->
                <v-text-field
                  v-model="form.securityQuestion"
                  label="Security Question"
                  :rules="[rules.required]"
                  variant="outlined"
                  density="comfortable"
                  prepend-inner-icon="mdi-help-circle"
                  class="mb-4"
                ></v-text-field>
                
                <v-text-field
                  v-model="form.securityAnswer"
                  label="Security Answer"
                  :rules="[rules.required]"
                  variant="outlined"
                  density="comfortable"
                  prepend-inner-icon="mdi-shield-check"
                  class="mb-4"
                ></v-text-field>

                <!-- Error/Success Alert -->
                <v-alert
                  v-if="message.text"
                  :type="message.type"
                  variant="tonal"
                  class="mb-4"
                  closable
                  @click:close="message.text = ''"
                >
                  {{ message.text }}
                </v-alert>

                <!-- Register Button -->
                <v-btn
                  color="primary"
                  block
                  size="large"
                  :disabled="!valid || loading"
                  :loading="loading"
                  type="submit"
                  elevation="2"
                  class="mb-3"
                >
                  Register
                </v-btn>
                
                <v-btn
                  variant="text"
                  block
                  @click="$router.push('/login')"
                >
                  Already have an account? Login
                </v-btn>
              </v-form>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-container>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import axios from 'axios'; // We'll use axios for the API call

const router = useRouter();
const registerForm = ref(null);
const valid = ref(false);
const loading = ref(false);
const message = ref({ text: '', type: 'info' });
const showPassword = ref(false);
const showConfirmPassword = ref(false);

const form = ref({
  firstName: '',
  lastName: '',
  password: '',
  confirmPassword: '',
  department: null,
  role: null,
  title: '',
  securityQuestion: 'What is your favorite color?', // Default
  securityAnswer: '',
});

// Dropdown options
const departments = ['system solutioning', 'engineering', 'consultancy', 'sales', 'it', 'hr', 'finance', 'all'];
const roles = ['staff', 'manager', 'hr', 'director'];

// Auto-generate email (AC1)
const generatedEmail = computed(() => {
  if (form.value.firstName && form.value.lastName) {
    const first = form.value.firstName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const last = form.value.lastName.toLowerCase().replace(/[^a-z0-9]/g, '');
    return `${first}.${last}@company.com`;
  }
  return '';
});

// Validation Rules (AC4, AC5, AC6)
const rules = {
  required: v => !!v || 'This field is required',
  password: v => {
    const passRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return passRegex.test(v) || 'Min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char.';
  },
  passwordMatch: v => v === form.value.password || 'Passwords do not match',
};

// Handle Registration (AC7, AC8)
const handleRegister = async () => {
  const { valid: formIsValid } = await registerForm.value.validate();
  if (!formIsValid) return;

  loading.value = true;
  message.value = { text: '', type: 'info' };

  try {
    const payload = {
      ...form.value,
      email: generatedEmail.value, // Send the auto-generated email
      name: `${form.value.firstName} ${form.value.lastName}`,
    };

    const response = await axios.post('/api/auth/register', payload, {
      baseURL: 'http://localhost:3000' // Using explicit base URL
    });

    message.value = { text: 'Registration was successful. You can now log in.', type: 'success' };
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s
    router.push('/login');

  } catch (error) {
    console.error('Registration error:', error);
    if (error.response && error.response.status === 409) {
      message.value = { text: 'This account is already in use.', type: 'error' };
    } else {
      message.value = { text: error.response?.data?.message || 'An unknown error occurred.', type: 'error' };
    }
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.register-wrapper {
  min-height: 100vh;
  width: 100vw;
background: linear-gradient(135deg, #7b92d1 0%, #f5f4f2 40%, #f5f4f2 70%, #c5d49a 100%);

  display: flex;
  align-items: center;
  justify-content: center;
  overflow-y: auto; /* Allow scrolling on small screens */
  padding: 2rem 0;
}
.fill-height {
  min-height: 100%;
}
.register-card {
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(10px);
  max-width: 100%;
}
</style>
