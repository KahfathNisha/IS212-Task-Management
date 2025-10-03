<template>
  <v-app>
    <!-- Navigation Bar (only show when authenticated)
    <v-app-bar v-if="isAuthenticated" app elevation="2">
      <v-app-bar-nav-icon @click="drawer = !drawer" />
      
      <v-toolbar-title>
        Task Management System
      </v-toolbar-title>

      <v-spacer />

       User Menu
      <v-menu offset-y>
        <template v-slot:activator="{ props }">
          <v-btn icon v-bind="props">
            <v-avatar color="primary" size="36">
              <span class="white--text text-h6">
                {{ userInitials }}
              </span>
            </v-avatar>
          </v-btn>
        </template>
        <v-card min-width="250">
          <v-list>
            <v-list-item>
              <v-list-item-title class="text-h6">
                {{ userName }}
              </v-list-item-title>
              <v-list-item-subtitle>
                {{ userEmail }}
              </v-list-item-subtitle>
            </v-list-item>
            <v-divider />
            <v-list-item @click="handleLogout">
              <template v-slot:prepend>
                <v-icon>mdi-logout</v-icon>
              </template>
              <v-list-item-title>Logout</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-card>
      </v-menu>
    </v-app-bar>

     Navigation Drawer (only show when authenticated) 
    <v-navigation-drawer
      v-if="isAuthenticated"
      v-model="drawer"
      app
      temporary
    >
      <v-list nav dense>
        <v-list-item
          v-for="item in navigationItems"
          :key="item.title"
          :to="item.route"
          :prepend-icon="item.icon"
          :title="item.title"
        />
      </v-list>
    </v-navigation-drawer> -->
    <!-- Replace v-app-bar and v-navigation-drawer with your custom NavBar -->
  <NavBar v-if="isAuthenticated" />

    <!-- Main Content -->
    <v-main>
      <!-- Session Warning Dialog -->
      <v-dialog v-model="showSessionWarning" persistent max-width="400">
        <v-card>
          <v-card-title class="text-h6">
            <v-icon color="warning" class="mr-2">mdi-alert</v-icon>
            Session Expiring Soon
          </v-card-title>
          <v-card-text>
            Your session will expire in {{ sessionTimeRemaining }} minutes due to inactivity. 
            Would you like to continue working?
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn
              variant="text"
              @click="handleLogout"
            >
              Logout
            </v-btn>
            <v-btn
              color="primary"
              variant="flat"
              @click="extendSession"
            >
              Continue Working
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <!-- Loading Overlay -->
      <v-overlay
        v-model="authStore.loading"
        persistent
        class="align-center justify-center"
      >
        <v-progress-circular
          indeterminate
          size="64"
          color="primary"
        />
      </v-overlay>

      <!-- Router View -->
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </v-main>

    <!-- Snackbar for notifications -->
    <v-snackbar
      v-model="snackbar.show"
      :timeout="snackbar.timeout"
      :color="snackbar.color"
    >
      {{ snackbar.text }}
      <template v-slot:actions>
        <v-btn
          variant="text"
          @click="snackbar.show = false"
        >
          Close
        </v-btn>
      </template>
    </v-snackbar>
    <Notifications />
  </v-app>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import NavBar from '@/components/NavBar.vue'; // Import your custom component
import Notifications from '@/views/Notifications.vue';

const router = useRouter();
const authStore = useAuthStore();

// State
const drawer = ref(false);
const showSessionWarning = ref(false);
const sessionTimeRemaining = ref(5);
const snackbar = ref({
  show: false,
  text: '',
  color: 'info',
  timeout: 3000
});

// Session warning timer
let warningTimer = null;
let sessionTimer = null;

// Computed properties
const isAuthenticated = computed(() => authStore.isAuthenticated);
const userName = computed(() => authStore.userName);
const userEmail = computed(() => authStore.userEmail);
const userRole = computed(() => authStore.userRole);

const userInitials = computed(() => {
  const name = authStore.userName;
  if (!name) return 'U';
  
  const parts = name.split(' ');
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
});

// Navigation items based on user role
const navigationItems = computed(() => {
  const baseItems = [
    { title: 'Dashboard', icon: 'mdi-view-dashboard', route: '/dashboard' },
    { title: 'My Tasks', icon: 'mdi-checkbox-marked-circle', route: '/tasks' },
    { title: 'Projects', icon: 'mdi-folder-multiple', route: '/projects' },
  ];

  // Add role-specific items
  if (['manager', 'director', 'hr'].includes(userRole.value)) {
    baseItems.push(
      { title: 'Team Overview', icon: 'mdi-account-group', route: '/team' },
      { title: 'Reports', icon: 'mdi-chart-bar', route: '/reports' }
    );
  }

  if (['director', 'hr'].includes(userRole.value)) {
    baseItems.push(
      { title: 'Settings', icon: 'mdi-cog', route: '/settings' }
    );
  }

  return baseItems;
});

// Methods
// Replace the handleLogout method in your App.vue

const handleLogout = async () => {
  try {
    console.log('App: Initiating logout...');
    const result = await authStore.logout();
    console.log('App: Logout result:', result);
    
    showNotification('Logged out successfully', 'success');
    
    // Force navigation to login
    await router.push('/login');
    
  } catch (error) {
    console.error('App: Logout error:', error);
    showNotification('Error during logout', 'error');
    
    // Force navigation to login even if logout failed
    await router.push('/login');
  }
};

const extendSession = async () => {
  showSessionWarning.value = false;
  const success = await authStore.extendSession();
  if (success) {
    showNotification('Session extended', 'success');
    setupSessionWarning();
  } else {
    showNotification('Failed to extend session', 'error');
    handleLogout();
  }
};

const showNotification = (text, color = 'info') => {
  snackbar.value = {
    show: true,
    text,
    color,
    timeout: 3000
  };
};

const setupSessionWarning = () => {
  // Clear existing timers
  if (warningTimer) clearTimeout(warningTimer);
  if (sessionTimer) clearTimeout(sessionTimer);

  if (!isAuthenticated.value) return;

  // Show warning 5 minutes before session expires (25 minutes after login)
  warningTimer = setTimeout(() => {
    if (isAuthenticated.value) {
      showSessionWarning.value = true;
      sessionTimeRemaining.value = 5;

      // Count down the remaining time
      let remaining = 5;
      sessionTimer = setInterval(() => {
        remaining--;
        sessionTimeRemaining.value = remaining;
        
        if (remaining <= 0) {
          clearInterval(sessionTimer);
          handleLogout();
        }
      }, 60000); // Update every minute
    }
  }, 25 * 60 * 1000); // 25 minutes
};

// Lifecycle hooks
onMounted(() => {
  // Setup session warning if authenticated
  if (isAuthenticated.value) {
    setupSessionWarning();
  }

  // Watch for authentication changes
  authStore.$subscribe((mutation, state) => {
    if (state.isAuthenticated) {
      setupSessionWarning();
    } else {
      if (warningTimer) clearTimeout(warningTimer);
      if (sessionTimer) clearInterval(sessionTimer);
      showSessionWarning.value = false;
    }
  });
});

onUnmounted(() => {
  if (warningTimer) clearTimeout(warningTimer);
  if (sessionTimer) clearInterval(sessionTimer);
});
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>