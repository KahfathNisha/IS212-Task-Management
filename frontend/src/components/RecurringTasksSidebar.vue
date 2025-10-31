<template>
  <v-dialog 
    v-model="dialog" 
    :max-width="$vuetify.display.mobile ? '95%' : '800px'"
    :fullscreen="$vuetify.display.mobile"
    persistent
  >
    <v-card class="recurring-tasks-card">
      <v-card-title class="recurring-tasks-header">
        <div class="header-content">
          <v-icon color="primary" size="28" class="header-icon">mdi-repeat</v-icon>
          <h3>Recurring Tasks</h3>
          <v-chip size="small" color="primary" variant="outlined">
            {{ recurringTasks.length }} {{ recurringTasks.length === 1 ? 'task' : 'tasks' }}
          </v-chip>
        </div>
        <v-btn icon="mdi-close" variant="text" @click="dialog = false" />
      </v-card-title>
      
      <v-card-text class="recurring-tasks-content">
        <!-- Loading State -->
        <div v-if="loading" class="loading-state">
          <v-progress-circular indeterminate color="primary" size="32" />
          <p>Loading recurring tasks...</p>
        </div>

        <!-- Tasks List -->
        <div v-else-if="recurringTasks.length > 0" class="tasks-list">
          <div
            v-for="task in recurringTasks"
            :key="task.id"
            class="task-card"
          >
            <!-- Task Header -->
            <div class="task-header">
              <div class="task-title-section">
                <h4 class="task-title">{{ task.title }}</h4>
                <div class="task-badges">
                  <v-chip 
                    size="small" 
                    :color="getStatusColor(task.status)"
                    variant="outlined"
                  >
                    {{ task.status }}
                  </v-chip>
                  <v-chip 
                    size="small" 
                    :color="task.recurrence?.enabled ? 'success' : 'warning'"
                    variant="flat"
                  >
                    <v-icon start size="12">
                      {{ task.recurrence?.enabled ? 'mdi-repeat' : 'mdi-repeat-off' }}
                    </v-icon>
                    {{ task.recurrence?.enabled ? 'Active' : 'Inactive' }}
                  </v-chip>
                </div>
              </div>
              
              <v-btn
                color="primary"
                size="small"
                variant="outlined"
                @click="onEditRecurringTask(task)"
                class="edit-btn"
              >
                <v-icon start size="16">mdi-pencil</v-icon>
                <span class="d-none d-sm-inline">Edit</span>
              </v-btn>
            </div>
            
            <!-- Task Description -->
            <p class="task-description">{{ task.description || 'No description provided' }}</p>
            
            <!-- Task Details Grid -->
            <div class="task-details-grid">
              <div class="detail-item" v-if="task.assignedTo">
                <v-icon size="16" class="detail-icon">mdi-account</v-icon>
                <span class="detail-label">Assigned to:</span>
                <span class="detail-value">{{ getDisplayName(task.assignedTo) }}</span>
              </div>
              
              <div class="detail-item" v-if="task.priority">
                <v-icon size="16" class="detail-icon">mdi-flag</v-icon>
                <span class="detail-label">Priority:</span>
                <span class="detail-value">{{ task.priority }}</span>
              </div>
              
              <div class="detail-item" v-if="task.dueDate">
                <v-icon size="16" class="detail-icon">mdi-calendar</v-icon>
                <span class="detail-label">Due Date:</span>
                <span class="detail-value">{{ formatDate(task.dueDate) }}</span>
              </div>
              
              <div class="detail-item" v-if="task.projectName">
                <v-icon size="16" class="detail-icon">mdi-folder</v-icon>
                <span class="detail-label">Project:</span>
                <span class="detail-value">{{ task.projectName }}</span>
              </div>
              
              <div class="detail-item" v-if="task.recurrence && task.recurrence.enabled">
                <v-icon size="16" class="detail-icon">mdi-repeat</v-icon>
                <span class="detail-label">Recurrence:</span>
                <span class="detail-value">{{ formatRecurrence(task.recurrence) }}</span>
              </div>
              
              <div class="detail-item" v-if="task.categories && task.categories.length > 0">
                <v-icon size="16" class="detail-icon">mdi-tag-multiple</v-icon>
                <span class="detail-label">Categories:</span>
                <div class="categories-chips">
                  <v-chip
                    v-for="category in task.categories"
                    :key="category"
                    size="x-small"
                    color="secondary"
                    variant="outlined"
                  >
                    {{ category }}
                  </v-chip>
                </div>
              </div>
            </div>

            <!-- Recurrence Details -->
            <div v-if="task.recurrence && task.recurrence.enabled" class="recurrence-details">
              <div class="recurrence-info">
                <v-icon size="18" color="success">mdi-information-outline</v-icon>
                <span>Next occurrence: {{ getNextOccurrence(task.recurrence) }}</span>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Empty State -->
        <div v-else class="empty-state">
          <v-icon size="80" color="grey-lighten-2">mdi-repeat-off</v-icon>
          <h4>No Recurring Tasks Found</h4>
          <p>You haven't set up any recurring tasks yet.</p>
          <p class="empty-subtitle">Create a task and enable recurrence to see it here.</p>
        </div>
      </v-card-text>
    </v-card>

    <!-- Edit Recurrence Dialog -->
    <EditRecurrenceDialog
      v-if="editingTask"
      :show="!!editingTask"
      :recurrence="editingTask.recurrence"
      @close="closeEdit"
      @save="saveEdit"
    />
  </v-dialog>
</template>

<script setup>
import { ref, watch, computed, onMounted } from 'vue'
import EditRecurrenceDialog from './EditRecurrenceDialog.vue'
import axios from 'axios'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/config/firebase'

const props = defineProps({
  show: { type: Boolean, default: false }
})

const emit = defineEmits(['close'])

// State
const dialog = ref(props.show)
const recurringTasks = ref([])
const editingId = ref(null)
const loading = ref(false)
const allUsers = ref([])

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

// Computed
const editingTask = computed(() =>
  recurringTasks.value.find(t => t.id === editingId.value)
)

// Watchers
watch(() => props.show, (newValue) => {
  dialog.value = newValue
})

watch(dialog, (newValue) => {
  if (!newValue) {
    emit('close')
  } else {
    fetchRecurringTasks()
  }
})

// Axios client
const axiosClient = axios.create({
  baseURL: 'http://localhost:3000/api',
  headers: { 'Content-Type': 'application/json' }
})

axiosClient.interceptors.request.use(config => {
  const token = localStorage.getItem('firebaseIdToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Methods
const fetchRecurringTasks = async () => {
  loading.value = true
  try {
    console.log('🔄 Fetching recurring tasks...')
    const response = await axiosClient.get('/tasks/recurring')
    recurringTasks.value = Array.isArray(response.data) ? response.data : []
    console.log('✅ Loaded', recurringTasks.value.length, 'recurring tasks')
  } catch (error) {
    console.error('❌ Error fetching recurring tasks:', error)
    recurringTasks.value = []
  } finally {
    loading.value = false
  }
}

const onEditRecurringTask = (task) => {
  console.log('✏️ Editing recurring task:', task.title)
  editingId.value = task.id
}

const closeEdit = () => {
  console.log('❌ Closing edit dialog')
  editingId.value = null
}

const saveEdit = async (newRecurrence) => {
  if (!editingTask.value) return
  
  console.log('💾 Saving recurrence changes for:', editingTask.value.title)
  
  try {
    await axiosClient.put(`/tasks/recurring/${editingTask.value.id}`, {
      userId: editingTask.value.userId,
      recurrence: newRecurrence
    })
    
    console.log('✅ Recurrence updated successfully')
    closeEdit()
    fetchRecurringTasks() // Refresh the list
    
  } catch (error) {
    console.error('❌ Error updating recurrence:', error)
  }
}

const getStatusColor = (status) => {
  const colors = {
    'Pending': 'orange',
    'Ongoing': 'blue',
    'Pending Review': 'purple',
    'Completed': 'green'
  }
  return colors[status] || 'grey'
}

const formatDate = (dateString) => {
  if (!dateString) return ''
  
  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : 
                  dateString.toDate ? dateString.toDate() : dateString
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  } catch (error) {
    console.error('Error formatting date:', error)
    return 'Invalid date'
  }
}

const formatRecurrence = (recurrence) => {
  if (!recurrence || !recurrence.enabled) return 'Not recurring'
  
  switch (recurrence.type) {
    case 'daily':
      return 'Every day'
    case 'weekly':
      return 'Every week'
    case 'monthly':
      return 'Every month'
    case 'yearly':
      return 'Every year'
    case 'custom':
      return `Every ${recurrence.interval} days`
    default:
      return 'Custom recurrence'
  }
}

const getNextOccurrence = (recurrence) => {
  // This is a placeholder - implement based on your recurrence logic
  const now = new Date()
  let nextDate = new Date(now)
  
  switch (recurrence.type) {
    case 'daily':
      nextDate.setDate(now.getDate() + 1)
      break
    case 'weekly':
      nextDate.setDate(now.getDate() + 7)
      break
    case 'monthly':
      nextDate.setMonth(now.getMonth() + 1)
      break
    case 'yearly':
      nextDate.setFullYear(now.getFullYear() + 1)
      break
    case 'custom':
      nextDate.setDate(now.getDate() + (recurrence.interval || 1))
      break
    default:
      return 'Unknown'
  }
  
  return formatDate(nextDate)
}
</script>

<style scoped>
.recurring-tasks-card {
  background: #ffffff !important;
  border-radius: 16px !important;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12) !important;
  overflow: hidden;
}

.recurring-tasks-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 28px;
  border-bottom: 1px solid #e9ecef;
  background: #f8f9fa;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-content h3 {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  color: #2c3e50;
}

.header-icon {
  background: rgba(25, 118, 210, 0.1);
  padding: 10px;
  border-radius: 12px;
}

.recurring-tasks-content {
  padding: 0;
  max-height: 70vh;
  overflow-y: auto;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 24px;
  text-align: center;
  gap: 16px;
}

.loading-state p {
  margin: 0;
  font-size: 16px;
  color: #6c757d;
}

.tasks-list {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.task-card {
  background: white;
  border: 1px solid #e9ecef;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  transition: all 0.2s ease;
}

.task-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  transform: translateY(-2px);
}

.task-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
  gap: 16px;
}

.task-title-section {
  flex: 1;
  min-width: 0;
}

.task-title {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
  color: #2c3e50;
  line-height: 1.4;
  word-break: break-word;
}

.task-badges {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.task-description {
  margin: 0 0 16px 0;
  color: #6c757d;
  font-size: 14px;
  line-height: 1.5;
  font-style: italic;
  word-break: break-word;
}

.task-details-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  padding: 8px 12px;
  background: #f8f9fa;
  border-radius: 8px;
  word-break: break-word;
}

.detail-icon {
  color: #6c757d;
  flex-shrink: 0;
}

.detail-label {
  font-weight: 500;
  color: #495057;
  flex-shrink: 0;
}

.detail-value {
  color: #2c3e50;
  font-weight: 500;
  word-break: break-word;
}

.categories-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.recurrence-details {
  margin-top: 12px;
  padding: 12px;
  background: rgba(76, 175, 80, 0.05);
  border-left: 4px solid #4caf50;
  border-radius: 0 8px 8px 0;
}

.recurrence-info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #2e7d32;
  font-weight: 500;
}

.edit-btn {
  flex-shrink: 0;
  height: 36px;
  min-width: 40px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 24px;
  text-align: center;
}

.empty-state h4 {
  margin: 20px 0 12px 0;
  font-size: 20px;
  font-weight: 600;
  color: #495057;
}

.empty-state p {
  margin: 0 0 8px 0;
  color: #6c757d;
  font-size: 16px;
  line-height: 1.5;
}

.empty-subtitle {
  font-size: 14px !important;
  color: #adb5bd !important;
}

/* Mobile Responsive Design */
@media (max-width: 600px) {
  .recurring-tasks-card {
    border-radius: 0 !important;
    height: 100vh;
  }
  
  .recurring-tasks-header {
    padding: 16px 20px;
  }
  
  .header-content {
    flex-wrap: wrap;
    gap: 8px;
  }
  
  .header-content h3 {
    font-size: 18px;
  }
  
  .tasks-list {
    padding: 12px;
    gap: 12px;
  }
  
  .task-card {
    padding: 16px;
  }
  
  .task-header {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }
  
  .task-title {
    font-size: 16px;
  }
  
  .edit-btn {
    width: 100%;
    min-width: auto;
  }
  
  .task-details-grid {
    grid-template-columns: 1fr;
    gap: 8px;
  }
  
  .empty-state {
    padding: 40px 20px;
  }
  
  .empty-state h4 {
    font-size: 18px;
  }
  
  .recurring-tasks-content {
    max-height: calc(100vh - 80px);
  }
}

/* Custom scrollbar */
.recurring-tasks-content::-webkit-scrollbar {
  width: 6px;
}

.recurring-tasks-content::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.recurring-tasks-content::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.recurring-tasks-content::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>