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

      <!-- Tasks by Status -->
      <div class="tasks-by-status">
        <div 
          v-for="status in visibleStatuses" 
          :key="status" 
          class="status-group"
        >
          <!-- Status Header with Caret -->
          <div 
            class="status-header" 
            @click="toggleStatusSection(status)"
            :class="{ 'expanded': expandedStatuses.includes(status) }"
          >
            <div class="status-info">
              <v-icon 
                :icon="expandedStatuses.includes(status) ? 'mdi-chevron-down' : 'mdi-chevron-right'"
                class="caret-icon"
                size="20"
              />
              <v-chip 
                :color="getStatusColor(status)"
                size="small"
                variant="outlined"
                class="status-chip"
              >
                <v-icon 
                  :icon="getStatusIcon(status)" 
                  size="14"
                  start
                />
                {{ status }}
              </v-chip>
            </div>
            
            <!-- Task Count on Right -->
            <span class="task-count">{{ getTasksByStatus(status).length }} tasks</span>
          </div>

          <!-- Collapsible Tasks List -->
          <v-expand-transition>
            <div 
              v-show="expandedStatuses.includes(status)" 
              class="status-tasks"
            >
              <ProjectTaskItem
                v-for="task in getTasksByStatus(status)"
                :key="task.id"
                :task="task"
                @view-task="openTaskDialog"
                class="status-task-item"
              />
            </div>
          </v-expand-transition>
        </div>
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
      @update:show="showTaskDialog = $event"
      @view-parent="handleViewParent"
      @open-attachment="handleOpenAttachment"
    />
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import axios from 'axios'
import ProjectTaskItem from './ProjectTaskItem.vue'
import ProjectTaskItemDetails from './ProjectTaskItemDetails.vue'

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
const expandedStatuses = ref([]) // Default: all sections closed

// Constants
const taskStatuses = ['Pending', 'Ongoing', 'Pending Review', 'Completed']

// Computed
const visibleStatuses = computed(() => {
  return taskStatuses.filter(status => getTasksByStatus(status).length > 0)
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

const getTasksByStatus = (status) => {
  return tasks.value.filter(task => task.status === status)
}

const toggleStatusSection = (status) => {
  const index = expandedStatuses.value.indexOf(status)
  if (index > -1) {
    // Close the section
    expandedStatuses.value.splice(index, 1)
    console.log('📁 Closed status section:', status)
  } else {
    // Open the section
    expandedStatuses.value.push(status)
    console.log('📂 Opened status section:', status)
  }
  console.log('🔄 Current expanded sections:', expandedStatuses.value)
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

const getStatusIcon = (status) => {
  const icons = {
    'Pending': 'mdi-clock-outline',
    'Ongoing': 'mdi-play-circle-outline',
    'Pending Review': 'mdi-eye-outline',
    'Completed': 'mdi-check-circle-outline'
  }
  return icons[status] || 'mdi-circle-outline'
}

const openTaskDialog = (task) => {
  console.log('📋 Opening task dialog for:', task.title)
  selectedTask.value = task
  showTaskDialog.value = true
}

const handleViewParent = (parentTask) => {
  console.log('👀 Viewing parent task:', parentTask.title)
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
    expandedStatuses.value = [] // Reset expanded sections when hiding
  }
}, { immediate: true })

watch(() => props.projectId, (newValue, oldValue) => {
  console.log('🔄 ProjectTasks projectId changed from', oldValue, 'to', newValue)
  if (newValue && props.show) {
    expandedStatuses.value = [] // Reset expanded sections when switching projects
    loadTasks()
  }
})
</script>

<style scoped>
.project-tasks-container {
  width: 100%;
  padding: 24px;
  background-color: #f9f9fa;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  min-height: 300px;
}

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

.tasks-content {
  display: flex;
  flex-direction: column;
  width: 100%;
}

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

/* Status Groups Styling */
.tasks-by-status {
  width: 100%;
  padding: 0 16px;
}

.status-group {
  margin-bottom: 12px;
  border: 1px solid #e9ecef;
  border-radius: 12px;
  overflow: hidden;
  background: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.status-group:last-child {
  margin-bottom: 0;
}

/* Status Header */
.status-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: #f8f9fa;
  cursor: pointer;
  transition: all 0.2s ease;
  user-select: none;
  border-bottom: none;
}

.status-header:hover {
  background: #e9ecef;
}

.status-header.expanded {
  background: #e3f2fd;
  border-bottom: 1px solid #e9ecef;
}

.status-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.caret-icon {
  color: #6c757d;
  transition: transform 0.2s ease;
}

.status-chip {
  font-weight: 600;
}

.task-count {
  font-size: 14px;
  color: #6c757d;
  font-weight: 500;
  background: rgba(0, 0, 0, 0.05);
  padding: 4px 12px;
  border-radius: 12px;
}

/* Status Tasks */
.status-tasks {
  padding: 16px;
  background: white;
}

.status-task-item {
  margin-bottom: 12px !important;
  border: 1px solid rgba(0, 0, 0, 0.05) !important;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05) !important;
}

.status-task-item:last-child {
  margin-bottom: 0 !important;
}

.status-task-item:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1) !important;
  transform: translateY(-1px);
}

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
  
  .tasks-by-status {
    padding: 0 8px;
  }
  
  .status-header {
    padding: 14px 16px;
  }
  
  .empty-state {
    padding: 40px 16px;
  }
}

@media (max-width: 480px) {
  .project-tasks-container {
    padding: 12px;
  }
  
  .tasks-by-status {
    padding: 0 4px;
  }
  
  .status-header {
    padding: 12px 14px;
  }
  
  .status-info {
    gap: 8px;
  }
  
  .task-count {
    font-size: 12px;
    padding: 2px 8px;
  }
  
  .empty-state {
    padding: 30px 12px;
  }
}
</style>