<template>
  <v-dialog v-model="dialog" max-width="700px" persistent>
    <v-card>
      <v-card-title>
        Archived Tasks
        <v-spacer />
        <v-btn icon @click="dialog = false"><v-icon>mdi-close</v-icon></v-btn>
      </v-card-title>
      
      <v-alert
        v-if="statusMessage.show"
        :type="statusMessage.type"
        closable
        @click:close="statusMessage.show = false"
        class="ma-4"
        density="compact"
      >
        {{ statusMessage.text }}
      </v-alert>
      
      <v-card-text>
        <v-list>
          <v-list-item
            v-for="task in archivedTasks"
            :key="task.id"
            class="archived-task-item"
          >
            <template v-slot:prepend>
              <v-icon color="grey-lighten-1">mdi-folder-zip-outline</v-icon>
            </template>
            
            <v-list-item-title class="task-title">{{ task.title }}</v-list-item-title>
            <v-list-item-subtitle class="task-desc">{{ task.description }}</v-list-item-subtitle>
            
            <div class="task-details">
              <div><strong>Status:</strong> {{ task.status }}</div>
              <div><strong>Priority:</strong> {{ task.priority }}</div>
              <div v-if="task.dueDate"><strong>Due:</strong> {{ formatDate(task.dueDate) }}</div>
              <div v-if="task.assigneeId"><strong>Assignee:</strong> {{ getDisplayName(task.assigneeId) }}</div>
              <div v-if="task.recurrence && task.recurrence.enabled">
                <strong>Recurrence:</strong>
                {{ formatRecurrence(task.recurrence) }}
              </div>
            </div>

            <template v-slot:append>
              <v-btn
                color="primary"
                size="small"
                variant="outlined"
                @click="unarchive(task.id)"
                class="unarchive-btn"
                :loading="unarchivingId === task.id"
                :disabled="unarchivingId === task.id"
              >
                <v-icon start size="18">mdi-archive-arrow-up</v-icon>
                {{ unarchivingId === task.id ? 'Restoring...' : 'Unarchive' }}
              </v-btn>
            </template>
          </v-list-item>
        </v-list>
        <div v-if="archivedTasks.length === 0" class="text-center grey--text py-6">
          No archived tasks found.
        </div>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import axios from 'axios'
// We are removing the direct Firestore imports: import { collection, getDocs } from 'firebase/firestore'
import { useAuthStore } from '@/stores/auth' // Used for secure token access

// --- 1. Centralized Axios Client (Re-configured for this component) ---
const authStore = useAuthStore();
const axiosClient = axios.create({
    baseURL: 'http://localhost:3000/api', 
    headers: {
        'Content-Type': 'application/json',
    },
});

// Interceptor to attach the current Firebase ID Token
axiosClient.interceptors.request.use(async (config) => {
    const token = await authStore.getToken(); // Securely get token from store
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, error => Promise.reject(error));
// -------------------------------------------------------------------

const props = defineProps({
  show: Boolean
})
const emit = defineEmits(['close'])

const dialog = ref(props.show)
watch(() => props.show, v => dialog.value = v)
// Simplified close logic
watch(dialog, v => { 
  if (!v) emit('close') 
})

const archivedTasks = ref([])
const allUsers = ref([])
const unarchivingId = ref(null)

// Status message state
const statusMessage = ref({
  show: false,
  text: '',
  type: 'success'
})

// Helper function to show status messages
const showStatus = (message, type = 'success') => {
  statusMessage.value = {
    show: true,
    text: message,
    type: type
  }
  setTimeout(() => {
    statusMessage.value.show = false
  }, 5000)
}

// 🟢 FIX 3: Fetch users via secured backend API instead of client-side Firestore
const fetchAllUsers = async () => {
  try {
    // Rely on the backend's /auth/users/all secured endpoint
    const response = await axiosClient.get('/auth/users/all'); 
    allUsers.value = response.data.map(user => ({
      email: user.email,
      name: user.name || user.email
    }))
  } catch (e) {
    console.error('Failed to load users for display names:', e);
    allUsers.value = [];
  }
}

onMounted(fetchAllUsers)


// Helper to convert assignedTo to display name
const getDisplayName = (assignedValue) => {
  if (!assignedValue) return ''
  
  let lookupValue
  if (typeof assignedValue === 'object') {
    lookupValue = assignedValue.name || assignedValue.email || assignedValue.value
  } else {
    lookupValue = assignedValue
  }
  
  if (!lookupValue) return ''
  
  if (!lookupValue.includes('@')) {
    return lookupValue
  }
  
  // If it's an email, look up the name in the securely loaded list
  const user = allUsers.value.find(u => u.email === lookupValue)
  return user && user.name ? user.name : lookupValue
}

const fetchArchivedTasks = async () => {
  try {
    // 🟢 FIX 1: Use the secured axiosClient instance and the correct endpoint
    const res = await axiosClient.get('/tasks/archived');
    
    archivedTasks.value = res.data;
    
    if (archivedTasks.value.length > 0) {
      console.log(`📋 Successfully loaded ${archivedTasks.value.length} archived tasks`);
    }
    
  } catch (error) {
    console.error('❌ Failed to fetch archived tasks:', error);
    let errorMessage = error.response?.data?.message || error.message || 'Failed to fetch archived tasks';
    if (error.response?.status === 403) {
        errorMessage = 'Access denied. You do not have permission to view archived tasks.';
    }
    showStatus(`Error: ${errorMessage}`, 'error')
  }
}

watch(dialog, (val) => {
  if (val) {
    fetchArchivedTasks()
    statusMessage.value.show = false
  }
})

const unarchive = async (id) => {
  try {
    unarchivingId.value = id
    
    // 🟢 FIX 2: Use the secured axiosClient instance and the relative PUT URL
    const response = await axiosClient.put(`/tasks/${id}/unarchive`, {}) 
    
    if (response.status === 200) {
      showStatus('Task unarchived successfully!', 'success')
      await fetchArchivedTasks() // Refresh the list
    }
  } catch (error) {
    console.error('Failed to unarchive task:', error)
    const errorMessage = error.response?.data?.message || error.message || 'Failed to unarchive task'
    showStatus(`Error: ${errorMessage}`, 'error')
  } finally {
    unarchivingId.value = null
  }
}

const formatDate = (date) => {
  if (!date) return ''
  // Handle Firestore Timestamp objects if they exist, or ISO strings
  const d = typeof date === 'string' ? new Date(date) : date.toDate ? date.toDate() : date
  return d.toLocaleDateString()
}

const formatRecurrence = (rec) => {
  if (!rec) return ''
  if (rec.type === 'custom') return `Every ${rec.interval} days`
  if (rec.type) return `Every ${rec.type.charAt(0).toUpperCase() + rec.type.slice(1)}`
  return ''
}
</script>

<style scoped>
.v-card {
  background: #f5f5f5 !important;
}
.archived-task-item {
  margin-bottom: 18px;
  border-bottom: 1px solid #e0e0e0;
  padding-bottom: 12px;
}
.task-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.task-title {
  font-weight: 600;
  font-size: 18px;
}
.task-desc {
  margin: 6px 0 8px 0;
  color: #616161;
}
.task-details {
  font-size: 13px;
  color: #424242;
  display: flex;
  flex-wrap: wrap;
  gap: 18px;
  margin-bottom: 2px;
}
.unarchive-btn {
  min-width: 110px;
}

/* Status message styling */
.v-alert {
  margin-bottom: 16px !important;
}
</style>