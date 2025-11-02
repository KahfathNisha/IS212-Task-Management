<!-- ArchivedTasks.vue -->
<template>
  <v-dialog v-model="dialog" max-width="700px" persistent>
    <v-card>
      <v-card-title>
        Archived Tasks
        <v-spacer />
        <v-btn icon @click="dialog = false"><v-icon>mdi-close</v-icon></v-btn>
      </v-card-title>
      
      <!-- Status Message Snackbar -->
      <v-alert
        v-if="statusMessage.show"
        :type="statusMessage.type"
        closable
        @click:close="statusMessage.show = false"
        class="ma-4"
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
            <!-- ✅ Fix: Remove v-list-item-content and use proper Vuetify 3 structure -->
            <template v-slot:prepend>
              <!-- Optional: Add an icon here if needed -->
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
                <v-icon left size="18">mdi-archive-arrow-up</v-icon>
                {{ unarchivingId === task.id ? 'Unarchiving...' : 'Unarchive' }}
              </v-btn>
            </template>
          </v-list-item>
        </v-list>
        <div v-if="archivedTasks.length === 0" class="text-center grey--text">
          No archived tasks found.
        </div>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import axios from 'axios'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/config/firebase'

const props = defineProps({
  show: Boolean
})
const emit = defineEmits(['close'])

const dialog = ref(props.show)
watch(() => props.show, v => dialog.value = v)
watch(dialog, v => { if (!v) emit('close') })

const archivedTasks = ref([])
const allUsers = ref([])
const unarchivingId = ref(null)

// Status message state
const statusMessage = ref({
  show: false,
  text: '',
  type: 'success' // 'success', 'error', 'warning', 'info'
})

// Helper function to show status messages
const showStatus = (message, type = 'success') => {
  statusMessage.value = {
    show: true,
    text: message,
    type: type
  }
  
  // Auto-hide after 5 seconds
  setTimeout(() => {
    statusMessage.value.show = false
  }, 5000)
}

// Load users for email to name conversion
onMounted(async () => {
  try {
    const usersSnapshot = await getDocs(collection(db, 'Users'))
    allUsers.value = usersSnapshot.docs.map(doc => ({
      email: doc.id,
      name: doc.data().name || doc.id
    }))
  } catch (e) {
    allUsers.value = []
  }
})

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
  
  // If it's already a name, return it
  if (!lookupValue.includes('@')) {
    return lookupValue
  }
  
  // If it's an email, look up the name
  const user = allUsers.value.find(u => u.email === lookupValue)
  return user && user.name ? user.name : lookupValue
}

const fetchArchivedTasks = async () => {
  try {
    console.log('🔍 Making request to: http://localhost:3000/tasks/archived');

    // ✅ Remove token requirement for testing
    const res = await axios.get('http://localhost:3000/tasks/archived')
    
    console.log('✅ Response received:', res.status);
    console.log('✅ Response data type:', typeof res.data);
    console.log('✅ Response is array:', Array.isArray(res.data));
    console.log('✅ Response data length:', res.data?.length);
    console.log('🗂️ RAW RESPONSE DATA:', res.data);
    
    // ✅ Log each individual archived task
    if (Array.isArray(res.data)) {
      res.data.forEach((task, index) => {
        console.log(`📋 Archived Task ${index + 1}:`, {
          id: task.id,
          title: task.title,
          archived: task.archived,
          status: task.status,
          description: task.description,
          dueDate: task.dueDate,
          createdAt: task.createdAt
        });
      });
    }
    
    archivedTasks.value = res.data;
    console.log(`✅ Set ${archivedTasks.value.length} archived tasks to reactive variable`);
    
    if (archivedTasks.value.length === 0) {
      showStatus('No archived tasks found.', 'info')
    } else {
      console.log(`📋 Successfully loaded ${archivedTasks.value.length} archived tasks`);
    }
    
  } catch (error) {
    console.error('❌ Full error object:', error);
    showStatus('Failed to fetch archived tasks: ' + (error.response?.data?.error || error.message), 'error')
  }
}

watch(dialog, (val) => {
  if (val) {
    fetchArchivedTasks()
    // Reset status message when dialog opens
    statusMessage.value.show = false
  }
})

const unarchive = async (id) => {
  try {
    unarchivingId.value = id
    const token = localStorage.getItem('token') || sessionStorage.getItem('token')
  
    const response = await axios.put(`http://localhost:3000/tasks/${id}/unarchive`, {}, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
    
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