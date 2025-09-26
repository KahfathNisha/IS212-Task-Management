<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <v-card>
          <v-card-title class="text-h4">
            Welcome, {{ userName }}!
          </v-card-title>
          <v-card-subtitle>
            You are logged in as: {{ userEmail }} ({{ userRole }})
          </v-card-subtitle>
          <v-card-text>
            <v-alert type="success" variant="tonal" class="mb-4">
              Authentication successful! You have been redirected to the dashboard.
            </v-alert>
            
            <p class="mb-4">
              This is a placeholder dashboard. The task management features will be implemented in the next sprint.
            </p>
            
            <v-divider class="my-4" />
            
            <h3 class="text-h6 mb-3">Session Information</h3>
            <v-list density="compact">
              <v-list-item>
                <v-list-item-title>Session Timeout</v-list-item-title>
                <v-list-item-subtitle>30 minutes of inactivity</v-list-item-subtitle>
              </v-list-item>
              <v-list-item>
                <v-list-item-title>Last Activity</v-list-item-title>
                <v-list-item-subtitle>{{ formatLastActivity() }}</v-list-item-subtitle>
              </v-list-item>
            </v-list>
            
            <v-divider class="my-4" />
            
            <v-btn 
              color="primary" 
              variant="outlined"
              @click="handleLogout"
            >
              <v-icon left>mdi-logout</v-icon>
              Logout
            </v-btn>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
    
    <!-- Coming Soon Features -->
    <v-row class="mt-4">
      <v-col cols="12" md="4">
        <v-card>
          <v-card-title>
            <v-icon class="mr-2">mdi-checkbox-marked-circle</v-icon>
            Task Management
          </v-card-title>
          <v-card-text>
            <v-chip color="warning" size="small">Coming in Sprint 2</v-chip>
            <ul class="mt-3">
              <li>Create and update tasks</li>
              <li>Assign tasks to team members</li>
              <li>Track task status</li>
            </ul>
          </v-card-text>
        </v-card>
      </v-col>
      
      <v-col cols="12" md="4">
        <v-card>
          <v-card-title>
            <v-icon class="mr-2">mdi-folder-multiple</v-icon>
            Projects
          </v-card-title>
          <v-card-text>
            <v-chip color="warning" size="small">Coming in Sprint 2</v-chip>
            <ul class="mt-3">
              <li>Create project groups</li>
              <li>Organize tasks by project</li>
              <li>Invite collaborators</li>
            </ul>
          </v-card-text>
        </v-card>
      </v-col>
      
      <v-col cols="12" md="4">
        <v-card>
          <v-card-title>
            <v-icon class="mr-2">mdi-bell</v-icon>
            Notifications
          </v-card-title>
          <v-card-text>
            <v-chip color="warning" size="small">Coming in Sprint 3</v-chip>
            <ul class="mt-3">
              <li>Deadline reminders</li>
              <li>Task updates</li>
              <li>Email notifications</li>
            </ul>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const authStore = useAuthStore();

// Computed properties
const userName = computed(() => authStore.userName);
const userEmail = computed(() => authStore.userEmail);
const userRole = computed(() => authStore.userRole);

// Methods
const handleLogout = async () => {
  try {
    const result = await authStore.logout();
    router.push(result.redirect);
  } catch (error) {
    console.error('Logout error:', error);
  }
};

const formatLastActivity = () => {
  const lastActivity = authStore.lastActivity;
  if (!lastActivity) return 'Unknown';
  
  const now = Date.now();
  const diff = now - lastActivity;
  const minutes = Math.floor(diff / 60000);
  
  if (minutes < 1) return 'Just now';
  if (minutes === 1) return '1 minute ago';
  return `${minutes} minutes ago`;
};
</script>

<style scoped>
ul {
  padding-left: 20px;
}
</style>