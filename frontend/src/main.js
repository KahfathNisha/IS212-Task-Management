import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';

// Import your custom styles
import './style.css';

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

// Reminder store for notifications
import { initNotifications } from './stores/reminder';

// Create Vuetify instance with your custom theme
const vuetify = createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: 'customLight',
    themes: {
      customLight: {
        dark: false,
        colors: {
          primary: '#7b92d1',      // Your primary blue
          secondary: '#3a5998',    // Your secondary dark blue
          accent: '#c5d49a',       // Your accent sage green
          surface: '#e8e7f0',      // Your secondary background
          background: '#f5f4f2',   // Your primary background
          'on-primary': '#3d3d3d', // Text on primary
          'on-secondary': '#f5f4f2', // Text on secondary
          'on-surface': '#3d3d3d',  // Text on surface
          'on-background': '#3d3d3d', // Text on background
          error: '#d32f2f',
          warning: '#f57c00',
          info: '#1976d2',
          success: '#388e3c'
        }
      },
      customDark: {
        dark: true,
        colors: {
          primary: '#7b92d1',      // Your primary blue
          secondary: '#e8e7f0',    // Light secondary for dark mode
          accent: '#c5d49a',       // Your accent sage green
          surface: '#3a5998',      // Dark surface
          background: '#3d3d3d',   // Dark background
          'on-primary': '#3d3d3d', // Dark text on primary
          'on-secondary': '#3d3d3d', // Dark text on secondary
          'on-surface': '#f5f4f2', // Light text on dark surface
          'on-background': '#f5f4f2', // Light text on dark background
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
// Wait until user is loaded to send notifications
if (authStore.isAuthenticated) {
  initNotifications();
}

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

// Make theme switching globally available
window.toggleVuetifyTheme = () => {
  const theme = vuetify.theme;
  theme.global.name.value = theme.global.name.value === 'customLight' ? 'customDark' : 'customLight';
};

// Development helpers
if (import.meta.env.DEV) {
  window.authStore = authStore;
  window.vuetify = vuetify;
  console.log('🚀 IS212 Task Management System - Development Mode');
  console.log('📝 Auth store available as window.authStore');
  console.log('🎨 Vuetify instance available as window.vuetify');
}