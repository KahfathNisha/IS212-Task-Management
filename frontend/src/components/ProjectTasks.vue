<template>
  <div class="project-tasks-container">
    <!-- Loading State -->
    <div v-if="loadingTasks" class="loading-state">
      <v-progress-circular indeterminate color="primary" size="32" />
      <span class="loading-text">Loading tasks...</span>
    </div>

    <!-- Tasks Content -->
    <div v-else-if="tasks.length > 0" class="tasks-content">
      <!-- Tasks Header -->
      <div class="tasks-header">
        <div class="header-left">
          <h4 class="tasks-title">Project Tasks</h4>
          <v-chip size="small" class="task-count-chip">
            {{ tasks.length }} {{ tasks.length === 1 ? 'task' : 'tasks' }}
          </v-chip>
        </div>
      </div>

      <!-- All Tasks List -->
      <div class="all-tasks-list">
        <ProjectTaskItem
          v-for="task in tasks"
          :key="task.id"
          :task="task"
          @view-task="openTaskDialog"
        />
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="empty-state">
      <v-icon size="48" color="grey-lighten-2">mdi-clipboard-list-outline</v-icon>
      <h4>No tasks found</h4>
      <p>This project doesn't have any tasks yet.</p>
    </div>

    <!-- Project Task Item Details Dialog -->
    <ProjectTaskItemDetails
      :model="selectedTask"
      :show="showTaskDialog"
      :task-statuses="taskStatuses"
      @update:show="showTaskDialog = $event"
      @edit="handleEditTask"
      @change-status="handleStatusChange"
      @archive="handleArchiveTask"
      @view-parent="handleViewParent"
      @open-attachment="handleOpenAttachment"
    />
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import axios from 'axios'
import ProjectTaskItem from './ProjectTaskItem.vue'
import ProjectTaskItemDetails from './ProjectTaskItemDetails.vue' // Changed import

const props = defineProps({
  projectId: { type: String, required: true },
  show: { type: Boolean, default: false }
})

const emit = defineEmits(['view-task', 'task-updated'])

// State
const tasks = ref([])
const loadingTasks = ref(false)
const selectedTask = ref(null)
const showTaskDialog = ref(false)

// Constants
const taskStatuses = ['Pending', 'Ongoing', 'Pending Review', 'Completed']

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
const loadTasks = async () => {
  if (!props.projectId) {
    console.log('❌ No projectId provided to ProjectTasks')
    tasks.value = []
    return
  }
  
  console.log('🔍 ProjectTasks: Loading tasks for projectId:', props.projectId)
  
  if (loadingTasks.value) {
    console.log('⏳ Already loading tasks, skipping...')
    return
  }
  
  loadingTasks.value = true
  
  try {
    const response = await axiosClient.get(`/tasks/project/${props.projectId}`)
    tasks.value = Array.isArray(response.data) ? response.data : []
    console.log('✅ ProjectTasks: Loaded', tasks.value.length, 'tasks')
    
  } catch (error) {
    console.error('❌ ProjectTasks: Error loading tasks:', error)
    tasks.value = []
  } finally {
    loadingTasks.value = false
  }
}

const openTaskDialog = (task) => {
  console.log('📋 Opening task dialog for:', task.title)
  selectedTask.value = task
  showTaskDialog.value = true
}

const handleEditTask = (task) => {
  console.log('✏️ Edit task clicked:', task.title, 'ID:', task.id)
  
  // Close the dialog first
  showTaskDialog.value = false
  selectedTask.value = null
  
  // Emit to parent component (Projects.vue) to handle editing
  emit('edit-task', task)
  
  // Or if you want to handle editing within this component, 
  // you could open an edit dialog or navigate to an edit page
  // For example:
  // router.push(`/edit-task/${task.id}`)
  // or openEditDialog(task)
  
  console.log('✅ Edit task event emitted')
}

const handleStatusChange = async ({ taskId, status }) => {
  console.log('🔄 Changing task status:', taskId, 'to', status)
  
  try {
    // Update task status via API
    const response = await axiosClient.put(`/tasks/${taskId}`, { status })
    
    // Update local task in the list
    const taskIndex = tasks.value.findIndex(t => t.id === taskId)
    if (taskIndex !== -1) {
      tasks.value[taskIndex] = { ...tasks.value[taskIndex], status }
    }
    
    // Update the selected task in dialog
    if (selectedTask.value && selectedTask.value.id === taskId) {
      selectedTask.value = { ...selectedTask.value, status }
    }
    
    console.log('✅ Task status updated successfully')
    emit('task-updated', taskId)
    
  } catch (error) {
    console.error('❌ Error updating task status:', error)
    // You might want to show a notification here
  }
}

const handleArchiveTask = async (taskId) => {
  console.log('🗄️ Archiving task:', taskId)
  
  try {
    // Archive task via API
    await axiosClient.put(`/tasks/${taskId}`, { archived: true })
    
    // Remove task from local list
    tasks.value = tasks.value.filter(t => t.id !== taskId)
    
    // Close dialog
    showTaskDialog.value = false
    selectedTask.value = null
    
    console.log('✅ Task archived successfully')
    emit('task-updated', taskId)
    
  } catch (error) {
    console.error('❌ Error archiving task:', error)
  }
}

const handleViewParent = (parentTask) => {
  console.log('👀 Viewing parent task:', parentTask.title)
  // You can handle viewing parent task here
  // For now, just close current dialog and open parent
  selectedTask.value = parentTask
}

const handleOpenAttachment = (url) => {
  console.log('📎 Opening attachment:', url)
  if (url) {
    window.open(url, '_blank')
  }
}

// Watchers
watch(() => props.show, (newValue) => {
  console.log('👀 ProjectTasks show prop changed:', newValue, 'for project:', props.projectId)
  if (newValue && props.projectId) {
    loadTasks()
  } else if (!newValue) {
    console.log('🧹 ProjectTasks hidden, clearing tasks for project:', props.projectId)
    tasks.value = []
    loadingTasks.value = false
    showTaskDialog.value = false
    selectedTask.value = null
  }
}, { immediate: true })

watch(() => props.projectId, (newValue, oldValue) => {
  console.log('🔄 ProjectTasks projectId changed from', oldValue, 'to', newValue)
  if (newValue && props.show) {
    loadTasks()
  }
})
</script>

<style scoped>
/* Full Width Container */
.project-tasks-container {
  width: 100%;
  padding: 24px;
  background-color: #f9f9fa;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  min-height: 300px;
}

/* Loading State - Full Width */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
  width: 100%;
}

.loading-text {
  margin-top: 12px;
  font-size: 16px;
  color: #666;
  font-weight: 500;
}

/* Tasks Content - Full Width */
.tasks-content {
  display: flex;
  flex-direction: column;
  width: 100%;
}

/* Tasks Header - Full Width */
.tasks-header {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  margin-bottom: 24px;
  width: 100%;
  padding: 0 16px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.tasks-title {
  font-size: 24px;
  font-weight: 600;
  margin: 0;
  color: #333;
}

.task-count-chip {
  height: 28px;
  font-size: 14px;
  font-weight: 500;
}

/* All Tasks List - Full Width */
.all-tasks-list {
  width: 100%;
  padding: 0 16px;
}

/* Empty State - Full Width */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;  
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
  width: 100%;
}

.empty-state h4 {
  margin: 16px 0 8px 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.empty-state p {
  margin: 0 0 20px 0;
  color: #7f8c8d;
  font-size: 14px;
}

/* Responsive Design */
@media (max-width: 768px) {
  .project-tasks-container {
    padding: 16px;
  }
  
  .tasks-header {
    padding: 0 8px;
  }
  
  .all-tasks-list {
    padding: 0 8px;
  }
  
  .empty-state {
    padding: 40px 16px;
  }
}

@media (max-width: 480px) {
  .project-tasks-container {
    padding: 12px;
  }
  
  .all-tasks-list {
    padding: 0 4px;
  }
  
  .empty-state {
    padding: 30px 12px;
  }
}
</style>