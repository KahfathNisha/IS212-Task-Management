import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';

// Vuetify
import 'vuetify/styles';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';
import '@mdi/font/css/materialdesignicons.css';

// Firebase initialization
import './config/firebase';

// Auth store
import { useAuthStore } from './stores/auth';

// Create Vuetify instance
const vuetify = createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: 'light',
    themes: {
      light: {
        colors: {
          primary: '#667eea',
          secondary: '#764ba2',
          accent: '#f50057',
          error: '#f44336',
          warning: '#ff9800',
          info: '#2196f3',
          success: '#4caf50'
        }
      },
      dark: {
        colors: {
          primary: '#667eea',
          secondary: '#764ba2',
          accent: '#f50057',
          error: '#f44336',
          warning: '#ff9800',
          info: '#2196f3',
          success: '#4caf50'
        }
      }
    }
  },
  icons: {
    defaultSet: 'mdi',
  }
});

// Create app
const app = createApp(App);
const pinia = createPinia();

// Use plugins
app.use(pinia);
app.use(router);
app.use(vuetify);

// Initialize auth store
const authStore = useAuthStore();
authStore.initializeAuth();

// Setup activity listeners for session management
authStore.setupActivityListeners();

// Global error handler
app.config.errorHandler = (err, instance, info) => {
  console.error('Global error:', err);
  console.error('Component instance:', instance);
  console.error('Error info:', info);
};

// Mount app
app.mount('#app');

// Development helpers
if (import.meta.env.DEV) {
  window.authStore = authStore;
  console.log('🚀 IS212 Task Management System - Development Mode');
  console.log('📝 Auth store available as window.authStore');
}