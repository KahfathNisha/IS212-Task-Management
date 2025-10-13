<template>
  <v-app>
    <!-- Your custom NavBar remains, shown only when authenticated -->
    <NavBar v-if="isAuthenticated" />

    <!-- Main Content -->
    <v-main class="app-main">
      <!-- Your existing Session Warning Dialog remains -->
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
            <v-btn variant="text" @click="handleLogout">Logout</v-btn>
            <v-btn color="primary" variant="flat" @click="extendSession">Continue Working</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <!-- Your existing Loading Overlay remains -->
      <v-overlay v-model="authStore.loading" persistent class="align-center justify-center">
        <v-progress-circular indeterminate size="64" color="primary" />
      </v-overlay>

      <!-- Your existing Router View remains -->
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </v-main>

    <!-- 
      THIS IS THE FIX: 
      The old, conflicting v-snackbar has been removed.
      We now use our new, stable Notifications component which will handle all popups.
    -->
    <NotificationPopup />
    <Notifications />
  </v-app>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import NavBar from '@/components/NavBar.vue';

// --- THIS IS THE FIX ---
// This now imports the component from its correct location and removes the old snackbar logic.
import Notifications from '@/components/Notifications.vue';

const router = useRouter();
const authStore = useAuthStore();

// State for session management (this is your existing, correct logic)
const showSessionWarning = ref(false);
const sessionTimeRemaining = ref(5);
let warningTimer = null;
let sessionTimer = null;

// Computed properties from your existing file (these are correct)
const isAuthenticated = computed(() => authStore.isAuthenticated);

// Your existing methods for logout and session extension (these are correct)
const handleLogout = async () => {
  try {
    const result = await authStore.logout();
    await router.push(result.redirect || '/login');
  } catch (error) {
    console.error('App: Logout error:', error);
    await router.push('/login');
  }
};

const extendSession = async () => {
  showSessionWarning.value = false;
  await authStore.extendSession();
  setupSessionWarning();
};

const setupSessionWarning = () => {
  if (warningTimer) clearTimeout(warningTimer);
  if (sessionTimer) clearTimeout(sessionTimer);
  if (!isAuthenticated.value) return;

  warningTimer = setTimeout(() => {
    if (isAuthenticated.value) {
      showSessionWarning.value = true;
      // ... (rest of your countdown logic)
    }
  }, 25 * 60 * 1000);
};

// Your existing lifecycle hooks (these are correct)
onMounted(() => {
  if (isAuthenticated.value) setupSessionWarning();
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

