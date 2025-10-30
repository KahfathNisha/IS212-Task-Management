<template>
  <v-dialog v-model="dialog" max-width="700px" persistent>
    <v-card>
      <v-card-title class="recurring-tasks-header">
        <div class="header-content">
          <v-icon color="primary" size="24" class="header-icon">mdi-repeat</v-icon>
          <h3>Recurring Tasks</h3>
        </div>
        <v-btn icon @click="dialog = false">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>
      
      <v-card-text class="recurring-tasks-content">
        <v-list v-if="recurringTasks.length > 0">
          <v-list-item
            v-for="task in recurringTasks"
            :key="task.id"
            class="recurring-task-item"
          >
            <v-list-item-content>
              <div class="task-header">
                <v-list-item-title class="task-title">{{ task.title }}</v-list-item-title>
                <v-btn
                  color="primary"
                  size="small"
                  variant="outlined"
                  @click="onEditRecurringTask(task)"
                  class="edit-btn"
                >
                  <v-icon left size="18">mdi-pencil</v-icon>
                  Edit Recurrence
                </v-btn>
              </div>
              
              <v-list-item-subtitle class="task-desc">{{ task.description || 'No description' }}</v-list-item-subtitle>
              
              <div class="task-details">
                <div><strong>Status:</strong> {{ task.status }}</div>
                <div><strong>Priority:</strong> {{ task.priority || 'Not set' }}</div>
                <div v-if="task.dueDate"><strong>Due:</strong> {{ formatDate(task.dueDate) }}</div>
                <div v-if="task.assignedTo"><strong>Assigned to:</strong> {{ task.assignedTo }}</div>
                <div v-if="task.recurrence && task.recurrence.enabled">
                  <strong>Recurrence:</strong>
                  {{ formatRecurrence(task.recurrence) }}
                </div>
                <div v-if="task.projectName"><strong>Project:</strong> {{ task.projectName }}</div>
              </div>
              
              <!-- Recurrence Status Badge -->
              <div class="recurrence-status">
                <v-chip 
                  size="small" 
                  :color="task.recurrence?.enabled ? 'success' : 'warning'"
                  variant="outlined"
                >
                  <v-icon start size="14">
                    {{ task.recurrence?.enabled ? 'mdi-repeat' : 'mdi-repeat-off' }}
                  </v-icon>
                  {{ task.recurrence?.enabled ? 'Active' : 'Inactive' }}
                </v-chip>
              </div>
            </v-list-item-content>
          </v-list-item>
        </v-list>
        
        <div v-else class="empty-state">
          <v-icon size="64" color="grey-lighten-1">mdi-repeat-off</v-icon>
          <h4>No recurring tasks found</h4>
          <p>Create recurring tasks to see them here</p>
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
import { ref, watch, computed } from 'vue'
import EditRecurrenceDialog from './EditRecurrenceDialog.vue'
import axios from 'axios'

const props = defineProps({
  show: { type: Boolean, default: false }
})

const emit = defineEmits(['close'])

// State
const dialog = ref(props.show)
const recurringTasks = ref([])
const editingId = ref(null)

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
  try {
    console.log('🔄 Fetching recurring tasks...')
    const response = await axiosClient.get('/tasks/recurring')
    recurringTasks.value = Array.isArray(response.data) ? response.data : []
    console.log('✅ Loaded', recurringTasks.value.length, 'recurring tasks')
  } catch (error) {
    console.error('❌ Error fetching recurring tasks:', error)
    recurringTasks.value = []
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
</script>

<style scoped>
.v-card {
  background: #f5f5f5 !important;
  max-height: 80vh;
  overflow: hidden;
}

.recurring-tasks-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid #e0e0e0;
  background: white;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-content h3 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #333;
}

.header-icon {
  background: rgba(25, 118, 210, 0.1);
  padding: 8px;
  border-radius: 50%;
}

.recurring-tasks-content {
  padding: 0;
  max-height: 60vh;
  overflow-y: auto;
}

.recurring-task-item {
  margin-bottom: 20px;
  border-bottom: 1px solid #e0e0e0;
  padding: 16px 24px;
  background: white;
  margin: 0 0 2px 0;
}

.recurring-task-item:hover {
  background: #fafafa;
}

.task-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.task-title {
  font-weight: 600;
  font-size: 18px;
  color: #333;
}

.task-desc {
  margin: 6px 0 12px 0;
  color: #616161;
  font-size: 14px;
}

.task-details {
  font-size: 14px;
  color: #333;
  margin-bottom: 12px;
}

.recurrence-status {
  margin-top: 8px;
}

.empty-state {
  text-align: center;
  padding: 40px 24px;
  color: #999;
}

.empty-state v-icon {
  font-size: 64px;
  margin-bottom: 16px;
}
</style>