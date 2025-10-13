<script setup>
import { ref, computed, watch } from 'vue'

// ===========================
// Props Definition
// ===========================

const props = defineProps({
  tasks: {
    type: Array,
    required: true,
    default: () => []
  },
  selectedTaskId: {
    type: String,
    default: null
  },
  taskStatuses: {
    type: Array,
    default: () => ['Ongoing', 'Pending Review', 'Completed', 'Unassigned']
  },
  searchQuery: {
    type: String,
    default: ''
  },
  currentView: {
    type: String,
    default: 'kanban'
  }
})

// ===========================
// Emits Definition
// ===========================

const emit = defineEmits([
  'select-task',
  'edit-task',
  'change-status',
  'view-parent',
  'open-attachment',
  'add-task',
  'change-view'
])

// ===========================
// Local State
// ===========================

const selectedTask = ref(null)
const draggedTask = ref(null)
const dragOverColumn = ref(null)

// ===========================
// Column Configuration
// ===========================

const columns = computed(() => [
  {
    id: 'Ongoing',
    title: 'Ongoing',
    color: '#3b82f6',
    icon: 'mdi-progress-clock'
  },
  {
    id: 'Pending Review',
    title: 'Pending Review',
    color: '#f59e0b',
    icon: 'mdi-clock-alert-outline'
  },
  {
    id: 'Completed',
    title: 'Completed',
    color: '#10b981',
    icon: 'mdi-check-circle'
  },
  {
    id: 'Unassigned',
    title: 'Unassigned',
    color: '#6b7280',
    icon: 'mdi-account-off-outline'
  }
])

// ===========================
// Computed Properties
// ===========================

/**
 * Filter tasks by search query
 */
const filteredTasks = computed(() => {
  let tasks = [...props.tasks]
  
  // Apply search filter
  if (props.searchQuery && props.searchQuery.trim()) {
    const query = props.searchQuery.toLowerCase().trim()
    tasks = tasks.filter(task => {
      return (
        task.title?.toLowerCase().includes(query) ||
        task.description?.toLowerCase().includes(query) ||
        task.assignedTo?.toLowerCase().includes(query) ||
        task.collaborators?.some(collab => collab.toLowerCase().includes(query))
      )
    })
  }
  
  return tasks
})

/**
 * Group tasks by status for each column
 */
const tasksByStatus = computed(() => {
  const grouped = {}
  
  columns.value.forEach(column => {
    grouped[column.id] = filteredTasks.value.filter(task => task.status === column.id)
  })
  
  return grouped
})

/**
 * Get count of tasks in each column
 */
const getColumnCount = (statusId) => {
  return tasksByStatus.value[statusId]?.length || 0
}

// ===========================
// Watchers
// ===========================

/**
 * Watch for external selectedTaskId changes
 */
watch(() => props.selectedTaskId, (newId) => {
  if (newId) {
    const task = props.tasks.find(t => t.id === newId)
    if (task) {
      selectedTask.value = task
    }
  } else {
    selectedTask.value = null
  }
}, { immediate: true })

// ===========================
// Task Interaction Methods
// ===========================

/**
 * Select a task to view details
 */
const selectTask = (task) => {
  selectedTask.value = task
  emit('select-task', task)
}

/**
 * Handle edit task
 */
const handleEditTask = (task) => {
  emit('edit-task', task)
}

// ===========================
// Drag and Drop Methods
// ===========================

/**
 * Handle drag start
 */
const handleDragStart = (event, task) => {
  draggedTask.value = task
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/html', event.target)
  
  // Add visual feedback
  event.target.style.opacity = '0.5'
}

/**
 * Handle drag end
 */
const handleDragEnd = (event) => {
  event.target.style.opacity = '1'
  draggedTask.value = null
  dragOverColumn.value = null
}

/**
 * Handle drag over column
 */
const handleDragOver = (event, columnId) => {
  event.preventDefault()
  event.dataTransfer.dropEffect = 'move'
  dragOverColumn.value = columnId
}

/**
 * Handle drag leave column
 */
const handleDragLeave = () => {
  dragOverColumn.value = null
}

/**
 * Handle drop on column
 */
const handleDrop = (event, newStatus) => {
  event.preventDefault()
  
  if (draggedTask.value && draggedTask.value.status !== newStatus) {
    emit('change-status', { task: draggedTask.value, status: newStatus })
  }
  
  dragOverColumn.value = null
  draggedTask.value = null
}

// ===========================
// Utility Methods
// ===========================

/**
 * Get color for task status
 */
const getStatusColor = (status) => {
  const column = columns.value.find(col => col.id === status)
  return column ? column.color : '#6b7280'
}

/**
 * Format date string to localized date
 */
const formatDate = (dateString) => {
  if (!dateString) return ''
  
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })
  } catch (error) {
    return dateString
  }
}

/**
 * Truncate text to specified length with ellipsis
 */
const truncateText = (text, maxLength) => {
  if (!text) return ''
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

/**
 * Calculate completion percentage for tasks with subtasks
 */
const calculateProgress = (task) => {
  if (!task || !task.subtasks || task.subtasks.length === 0) {
    return 0
  }
  
  const totalSubtasks = task.subtasks.length
  const completedSubtasks = task.subtasks.filter(
    subtask => subtask.status === 'Completed'
  ).length
  
  return Math.round((completedSubtasks / totalSubtasks) * 100)
}

// ===========================
// Expose Methods
// ===========================

defineExpose({
  clearSelection: () => {
    selectedTask.value = null
  },
  selectTaskById: (taskId) => {
    const task = props.tasks.find(t => t.id === taskId)
    if (task) {
      selectTask(task)
    }
  }
})
</script>

<template>
  <div class="kanban-view-content">
    <!-- View Toggle Bar -->
    <div class="view-toggle-bar-wrapper">
      <div class="view-toggle-bar">
        <div class="view-tabs">
          <button 
            class="view-tab"
            :class="{ active: currentView === 'kanban' }"
            @click="$emit('change-view', 'kanban')"
          >
            <v-icon size="small">mdi-view-column</v-icon>
            <span>Kanban</span>
          </button>
          
          <button 
            class="view-tab"
            :class="{ active: currentView === 'list' }"
            @click="$emit('change-view', 'list')"
          >
            <v-icon size="small">mdi-format-list-bulleted</v-icon>
            <span>List view</span>
          </button>
        </div>

        <div class="view-actions">
          <v-btn
            color="primary"
            @click="$emit('add-task')"
            prepend-icon="mdi-plus"
            rounded="lg"
            class="add-task-btn"
          >
            Add Task
          </v-btn>
        </div>
      </div>
    </div>

    <!-- Kanban Board -->
    <div class="kanban-board">
      <!-- Kanban Columns -->
      <div 
        v-for="column in columns" 
        :key="column.id"
        class="kanban-column"
        :class="{ 'drag-over': dragOverColumn === column.id }"
        @dragover="handleDragOver($event, column.id)"
        @dragleave="handleDragLeave"
        @drop="handleDrop($event, column.id)"
      >
        <!-- Column Header -->
        <div class="column-header" :style="{ borderTopColor: column.color }">
          <div class="column-title-section">
            <v-icon :color="column.color" size="small">{{ column.icon }}</v-icon>
            <h3 class="column-title">{{ column.title }}</h3>
            <span class="task-count">{{ getColumnCount(column.id) }}</span>
          </div>
          <v-btn
            icon="mdi-plus"
            variant="text"
            size="small"
            @click="$emit('add-task', column.id)"
            :title="`Add task to ${column.title}`"
          />
        </div>

        <!-- Column Content -->
        <div class="column-content">
          <!-- Task Cards -->
          <div
            v-for="task in tasksByStatus[column.id]"
            :key="task.id"
            class="kanban-card"
            :class="{ 'selected': selectedTaskId === task.id }"
            draggable="true"
            @dragstart="handleDragStart($event, task)"
            @dragend="handleDragEnd"
            @click="selectTask(task)"
          >
            <!-- Task Header -->
            <div class="card-header">
              <h4 class="card-title">{{ task.title }}</h4>
              <v-btn
                icon="mdi-pencil"
                variant="text"
                size="x-small"
                @click.stop="handleEditTask(task)"
                class="edit-btn"
              />
            </div>

            <!-- Task Description -->
            <p v-if="task.description" class="card-description">
              {{ truncateText(task.description, 80) }}
            </p>

            <!-- Task Meta Info -->
            <div class="card-meta">
              <div v-if="task.priority" class="meta-badge priority">
                <v-icon size="x-small">mdi-flag</v-icon>
                <span>P{{ task.priority }}</span>
              </div>
              <div v-if="task.dueDate" class="meta-badge due-date">
                <v-icon size="x-small">mdi-calendar</v-icon>
                <span>{{ formatDate(task.dueDate) }}</span>
              </div>
              <div v-if="task.subtasks && task.subtasks.length > 0" class="meta-badge subtasks">
                <v-icon size="x-small">mdi-file-tree</v-icon>
                <span>{{ task.subtasks.length }}</span>
              </div>
            </div>

            <!-- Progress Bar (for tasks with subtasks) -->
            <div v-if="task.subtasks && task.subtasks.length > 0" class="card-progress">
              <div class="progress-bar">
                <div 
                  class="progress-fill" 
                  :style="{ 
                    width: calculateProgress(task) + '%',
                    backgroundColor: column.color
                  }"
                ></div>
              </div>
              <span class="progress-label">{{ calculateProgress(task) }}%</span>
            </div>

            <!-- Task Footer -->
            <div class="card-footer">
              <div v-if="task.assignedTo" class="assignee">
                <v-icon size="small" color="grey-darken-1">mdi-account-circle</v-icon>
                <span>{{ task.assignedTo }}</span>
              </div>
              <div v-else class="assignee unassigned">
                <v-icon size="small" color="grey-lighten-1">mdi-account-off</v-icon>
                <span>Unassigned</span>
              </div>

              <div v-if="task.attachments && task.attachments.length > 0" class="attachments-indicator">
                <v-icon size="small">mdi-paperclip</v-icon>
                <span>{{ task.attachments.length }}</span>
              </div>
            </div>

            <!-- Collaborators Avatars -->
            <div v-if="task.collaborators && task.collaborators.length > 0" class="card-collaborators">
              <div 
                v-for="(collaborator, index) in task.collaborators.slice(0, 3)" 
                :key="index"
                class="collaborator-avatar"
                :title="collaborator"
              >
                {{ collaborator.charAt(0).toUpperCase() }}
              </div>
              <div v-if="task.collaborators.length > 3" class="collaborator-more">
                +{{ task.collaborators.length - 3 }}
              </div>
            </div>
          </div>

          <!-- Empty State -->
          <div v-if="tasksByStatus[column.id].length === 0" class="empty-column">
            <v-icon size="40" color="grey-lighten-2">{{ column.icon }}</v-icon>
            <p>No tasks</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ===========================
   Main Layout
   =========================== */
.kanban-view-content {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
  background: #f8fafc;
}

/* ===========================
   View Toggle Bar
   =========================== */
.view-toggle-bar-wrapper {
  width: 100%;
  background: #ffffff;
  border-bottom: 2px solid #e2e8f0;
  flex-shrink: 0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.view-toggle-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 24px;
  gap: 16px;
}

.view-tabs {
  display: flex;
  gap: 8px;
  background: #f1f5f9;
  padding: 4px;
  border-radius: 10px;
}

.view-tab {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  border: none;
  background: transparent;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  color: #64748b;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.view-tab:hover {
  background: rgba(255, 255, 255, 0.7);
  color: #475569;
}

.view-tab.active {
  background: #ffffff;
  color: #3b82f6;
  box-shadow: 0 2px 6px rgba(59, 130, 246, 0.15);
}

.view-tab .v-icon {
  color: inherit;
}

.view-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.add-task-btn {
  text-transform: none;
  font-weight: 600;
  letter-spacing: 0.3px;
  padding: 0 20px;
}

/* ===========================
   Kanban Board
   =========================== */
.kanban-board {
  display: flex;
  gap: 20px;
  padding: 24px;
  overflow-x: auto;
  overflow-y: hidden;
  flex: 1;
  align-items: flex-start;
}

.kanban-board::-webkit-scrollbar {
  height: 10px;
}

.kanban-board::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 5px;
}

.kanban-board::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 5px;
}

.kanban-board::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

/* ===========================
   Kanban Column
   =========================== */
.kanban-column {
  flex: 0 0 340px;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  max-height: calc(100vh - 200px);
  transition: all 0.3s ease;
}

.kanban-column.drag-over {
  background: #f0f9ff;
  border: 2px dashed #3b82f6;
  transform: scale(1.02);
}

/* Column Header */
.column-header {
  padding: 16px 18px;
  border-bottom: 2px solid #f1f5f9;
  border-top: 4px solid;
  border-top-left-radius: 12px;
  border-top-right-radius: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fafbfc;
  flex-shrink: 0;
}

.column-title-section {
  display: flex;
  align-items: center;
  gap: 10px;
}

.column-title {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: #1e293b;
  letter-spacing: 0.3px;
}

.task-count {
  background: #e2e8f0;
  color: #475569;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 700;
  min-width: 28px;
  text-align: center;
}

/* Column Content */
.column-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.column-content::-webkit-scrollbar {
  width: 6px;
}

.column-content::-webkit-scrollbar-track {
  background: transparent;
}

.column-content::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

.column-content::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

/* ===========================
   Kanban Card
   =========================== */
.kanban-card {
  background: #ffffff;
  border: 2px solid #e2e8f0;
  border-radius: 10px;
  padding: 16px;
  cursor: grab;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.kanban-card:hover {
  border-color: #3b82f6;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
  transform: translateY(-2px);
}

.kanban-card:active {
  cursor: grabbing;
}

.kanban-card.selected {
  border-color: #2563eb;
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
  box-shadow: 0 4px 16px rgba(37, 99, 235, 0.25);
}

/* Card Header */
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 10px;
}

.card-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #1e293b;
  line-height: 1.4;
  flex: 1;
  word-break: break-word;
}

.edit-btn {
  opacity: 0;
  transition: opacity 0.2s ease;
}

.kanban-card:hover .edit-btn {
  opacity: 1;
}

/* Card Description */
.card-description {
  margin: 0 0 12px 0;
  font-size: 13px;
  color: #64748b;
  line-height: 1.5;
}

/* Card Meta Info */
.card-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.meta-badge {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  border: 1px solid;
}

.meta-badge.priority {
  background: #fef3c7;
  color: #92400e;
  border-color: #fde68a;
}

.meta-badge.due-date {
  background: #dbeafe;
  color: #1e40af;
  border-color: #bfdbfe;
}

.meta-badge.subtasks {
  background: #e0e7ff;
  color: #4338ca;
  border-color: #c7d2fe;
}

/* Card Progress */
.card-progress {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.progress-bar {
  flex: 1;
  height: 8px;
  background: #e2e8f0;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.4s ease;
}

.progress-label {
  font-size: 11px;
  font-weight: 700;
  color: #64748b;
  min-width: 35px;
  text-align: right;
}

/* Card Footer */
.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 12px;
  border-top: 1px solid #f1f5f9;
  margin-top: 8px;
}

.assignee {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: #475569;
}

.assignee.unassigned {
  color: #94a3b8;
  font-style: italic;
}

.attachments-indicator {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: #64748b;
  font-weight: 600;
}

/* Card Collaborators */
.card-collaborators {
  display: flex;
  align-items: center;
  gap: -8px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #f1f5f9;
}

.collaborator-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  border: 2px solid white;
  margin-left: -8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.collaborator-avatar:first-child {
  margin-left: 0;
}

.collaborator-more {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #e2e8f0;
  color: #475569;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 700;
  border: 2px solid white;
  margin-left: -8px;
}

/* Empty Column State */
.empty-column {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
  color: #cbd5e1;
}

.empty-column .v-icon {
  margin-bottom: 12px;
  opacity: 0.5;
}

.empty-column p {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: #94a3b8;
}

/* ===========================
   Responsive Design
   =========================== */
@media (max-width: 1400px) {
  .kanban-column {
    flex: 0 0 300px;
  }
}

@media (max-width: 1024px) {
  .kanban-board {
    padding: 16px;
    gap: 16px;
  }
  
  .kanban-column {
    flex: 0 0 280px;
  }
}

@media (max-width: 768px) {
  .view-toggle-bar {
    flex-wrap: wrap;
    padding: 12px 16px;
  }

  .view-tabs {
    flex: 1;
    min-width: 200px;
  }

  .view-actions {
    flex: 1;
    justify-content: flex-end;
  }

  .kanban-board {
    padding: 12px;
    gap: 12px;
  }
  
  .kanban-column {
    flex: 0 0 260px;
  }
}

@media (max-width: 480px) {
  .kanban-column {
    flex: 0 0 240px;
  }
  
  .card-title {
    font-size: 14px;
  }
  
  .card-description {
    font-size: 12px;
  }
}

/* ===========================
   Animations
   =========================== */
.kanban-card {
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Smooth transitions */
.kanban-column,
.kanban-card,
.meta-badge,
.progress-fill {
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Hover effects */
.v-btn:hover {
  transform: translateY(-1px);
}

.v-btn:active {
  transform: translateY(0);
}
</style>