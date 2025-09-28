<template>
  <div class="tasks-container">
    <!-- Main Content Area -->
    <div class="content-layout">
      <!-- Upcoming Tasks Sidebar -->
      <div class="upcoming-sidebar" :class="{ 'sidebar-collapsed': !upcomingSidebarOpen }">
        <div class="sidebar-header">
          <h3 v-if="upcomingSidebarOpen">Upcoming Tasks</h3>
          <v-btn 
            icon="mdi-chevron-left" 
            size="small" 
            variant="text"
            @click="toggleUpcomingSidebar"
            class="collapse-btn"
            :class="{ 'rotated': !upcomingSidebarOpen }"
          />
        </div>
        
        <div v-if="upcomingSidebarOpen" class="upcoming-content">
          <div class="upcoming-section">
            <h4>Today</h4>
            <div class="task-list">
              <div 
                v-for="task in todayTasks" 
                :key="task.id"
                class="upcoming-task"
                @click="viewTaskDetails(task)"
              >
                <div class="task-info">
                  <span class="task-name">{{ task.title }}</span>
                  <v-chip 
                    :color="getStatusColor(task.status)" 
                    size="x-small"
                  >
                    {{ task.status }}
                  </v-chip>
                </div>
                <span class="task-time">{{ formatTime(task.dueDate) }}</span>
              </div>
            </div>
          </div>

          <div class="upcoming-section">
            <h4>This Week</h4>
            <div class="task-list">
              <div 
                v-for="task in weekTasks" 
                :key="task.id"
                class="upcoming-task"
                @click="viewTaskDetails(task)"
              >
                <div class="task-info">
                  <span class="task-name">{{ task.title }}</span>
                  <v-chip 
                    :color="getStatusColor(task.status)" 
                    size="x-small"
                  >
                    {{ task.status }}
                  </v-chip>
                </div>
                <span class="task-date">{{ formatShortDate(task.dueDate) }}</span>
              </div>
            </div>
          </div>

          <div class="upcoming-section">
            <h4>Overdue</h4>
            <div class="task-list">
              <div 
                v-for="task in overdueTasks" 
                :key="task.id"
                class="upcoming-task overdue"
                @click="viewTaskDetails(task)"
              >
                <div class="task-info">
                  <span class="task-name">{{ task.title }}</span>
                  <v-chip color="red" size="x-small">
                    Overdue
                  </v-chip>
                </div>
                <span class="task-date">{{ formatShortDate(task.dueDate) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Collapsed state icon -->
        <div v-if="!upcomingSidebarOpen" class="collapsed-content">
          <v-icon size="24" class="collapsed-icon">mdi-clock-outline</v-icon>
        </div>
      </div>

      <!-- Calendar Area -->
      <div class="calendar-area">
        <!-- Calendar Header -->
        <div class="calendar-header">
          <div class="header-left">
            <h1>Good Morning, John!</h1>
            <p class="date-subtitle">It's Saturday, 27 September 2025</p>
          </div>
          
          <div class="header-right">
            <v-btn variant="outlined" size="small" prepend-icon="mdi-bell" rounded="lg">
              <!-- <v-badge color="primary" :content="3">
                Notifications
              </v-badge> -->
            </v-btn>
            <!-- <v-btn variant="outlined" size="small" prepend-icon="mdi-share" rounded="lg">
              Invite
            </v-btn> -->
            <v-btn variant="outlined" size="small" prepend-icon="mdi-cog" rounded="lg">
              <!-- Settings -->
            </v-btn>
          </div>
        </div>

        <!-- Calendar Controls -->
        <div class="calendar-controls">
          <div class="view-controls">
            <v-btn-toggle v-model="viewMode" mandatory rounded="lg">
              <v-btn value="month" size="small" prepend-icon="mdi-calendar" rounded="lg">Month</v-btn>
              <v-btn value="week" size="small" prepend-icon="mdi-view-week" rounded="lg">Week</v-btn>
              <!-- <v-btn value="list" size="small" prepend-icon="mdi-format-list-bulleted" rounded="lg">List</v-btn>
              <v-btn value="board" size="small" prepend-icon="mdi-view-dashboard" rounded="lg">Board</v-btn> -->
            </v-btn-toggle>
          </div>

          <!-- <div class="project-info">
            <v-chip color="green" prepend-icon="mdi-circle" size="small" rounded="lg">
              Team Project - Timeline
            </v-chip>
            <v-chip color="primary" size="small" rounded="lg">Important</v-chip>
            <v-chip color="primary" size="small" rounded="lg">11 Meet</v-chip>
            <span class="date-range">24 Sept • 27 Sept 2024</span>
          </div> -->

          <div class="action-controls">
            <!-- <v-btn color="primary" prepend-icon="mdi-share" variant="outlined" size="small" rounded="lg">
              Share
            </v-btn> -->
            <v-btn color="primary" prepend-icon="mdi-plus" @click="showCreateDialog = true" rounded="lg">
              Add Task
            </v-btn>
            <!-- <v-btn icon="mdi-filter" variant="outlined" size="small" rounded="lg"></v-btn> -->
          </div>
        </div>

        <!-- Calendar Navigation -->
        <div class="calendar-nav">
          <v-btn icon="mdi-chevron-left" variant="text" @click="previousPeriod" rounded="lg"></v-btn>
          <h2 class="period-title">{{ getCurrentPeriodTitle() }}</h2>
          <v-btn icon="mdi-chevron-right" variant="text" @click="nextPeriod" rounded="lg"></v-btn>
        </div>

        <!-- Calendar Grid -->
        <div class="calendar-grid">
          <!-- Days Header -->
          <div class="calendar-header-row">
            <div v-for="day in weekDays" :key="day" class="day-header">
              {{ day }}
            </div>
          </div>

          <!-- Calendar Days -->
          <div class="calendar-body">
            <div 
              v-for="date in calendarDates" 
              :key="date.dateKey"
              class="calendar-day"
              :class="{ 
                'today': date.isToday, 
                'other-month': date.isOtherMonth,
                'weekend': date.isWeekend
              }"
              @click="selectDate(date)"
            >
              <div class="day-number">{{ date.day }}</div>
              
              <!-- Tasks for this day -->
              <div class="day-tasks">
                <div 
                  v-for="task in getTasksForDate(date.dateKey)" 
                  :key="task.id"
                  class="task-item"
                  :class="getTaskStatusClass(task.status)"
                  @click.stop="viewTaskDetails(task)"
                >
                  <div class="task-content">
                    <span class="task-title">{{ task.isSubtask ? `${task.title} (${task.parentTask.title})` : task.title }}</span>
                    <div class="task-meta">
                      <v-chip 
                        :color="getStatusColor(task.status)" 
                        size="x-small" 
                        class="task-status"
                        rounded="lg"
                      >
                        {{ task.status }}
                      </v-chip>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Task Details Dialog -->
    <v-dialog v-model="showDetailsDialog" max-width="800px">
      <v-card v-if="selectedTask" class="task-details-card" rounded="xl">
        <v-card-title class="task-details-header">
          <v-btn icon="mdi-close" variant="text" @click="showDetailsDialog = false" />
          <div class="details-title-section">
            <h2>{{ selectedTask.title }}</h2>
            <div class="title-chips">
                <v-chip
                  :color="getStatusColor(selectedTask.status)"
                  size="small"
                  rounded="lg"
                >
                  {{ selectedTask.status }}
                </v-chip>
                <!-- Type indicator chip -->
                <v-chip
                  v-if="selectedTask.isSubtask"
                  color="secondary"
                  size="small"
                  rounded="lg"
                >
                  Subtask
                </v-chip>
                <v-chip
                  v-else
                  color="primary"
                  size="small"
                  rounded="lg"
                >
                  Task
                </v-chip>
              </div>
          </div>
        </v-card-title>

        <v-card-text class="task-details-content">
          <div class="detail-section">
            <h4>Description</h4>
            <p>{{ selectedTask.description }}</p>
          </div>

          <div class="detail-section">
            <h4>Due Date</h4>
            <p>{{ selectedTask.dueDate ? formatDate(selectedTask.dueDate) : 'No due date' }}</p>
          </div>

          <div class="detail-section">
            <h4>Assigned To</h4>
            <p>{{ selectedTask.assignedTo || 'Unassigned' }}</p>
          </div>

          <v-divider class="my-4"></v-divider>
          <div class="detail-section" v-if="selectedTask.isSubtask">
           <h4>Parent Task</h4>
           <div class="parent-summary">
             <div class="parent-title-section">
               <v-btn
                 variant="text"
                 size="small"
                 class="parent-title-btn"
                 @click="viewTaskDetails(selectedTask.parentTask)"
                 title="View task details"
               >
                 {{ selectedTask.parentTask.title }}
               </v-btn>
             </div>
             <div class="parent-controls">
               <v-chip :color="getStatusColor(selectedTask.parentTask.status)" size="small">{{ selectedTask.parentTask.status }}</v-chip>
             </div>
           </div>
          </div>
        </v-card-text>

        <v-card-actions>
          <v-btn
            color="white"
            @click="editTask(selectedTask)"
            prepend-icon="mdi-pencil"
            rounded="lg"
          >
            {{ selectedTask.isSubtask ? 'Edit Subtask' : 'Edit Task' }}
          </v-btn>
          <v-spacer />
          <v-btn
            color="white"
            @click="changeTaskStatus(selectedTask)"
            rounded="lg"
          >
            Mark Complete
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

        <!-- Create Task Dialog -->
        <v-dialog v-model="showCreateDialog" max-width="700px">
          <v-card class="create-task-card" rounded="xl">
        <v-card-title class="d-flex justify-space-between align-center">
          <span>{{ isEditing ? 'Edit Task' : 'Create New Task' }}</span>
          <v-btn icon="mdi-close" variant="text" @click="cancelCreate" />
        </v-card-title>
        <v-card-text>
          <v-form ref="taskForm" v-model="formValid">
            <!-- Title -->
            <v-text-field
              v-model="newTask.title"
              label="Title *"
              placeholder="Enter task title"
              required
              variant="outlined"
              class="mb-4"
            />
            
            <!-- Description -->
            <v-textarea
              v-model="newTask.description"
              label="Description"
              placeholder="Enter task description"
              variant="outlined"
              rows="3"
              class="mb-4"
            />
            
            <!-- Row 1: Type and Status -->
            <div class="d-flex ga-4 mb-4">
              <v-select
                v-model="newTask.type"
                label="Type"
                :items="taskTypes"
                variant="outlined"
                class="flex-1"
              />
              <v-select
                v-model="newTask.status"
                label="Status"
                :items="taskStatuses"
                variant="outlined"
                class="flex-1"
              />
            </div>
            
            <!-- Row 2: Priority and Project -->
            <div class="d-flex ga-4 mb-4">
              <v-select
                v-model="newTask.priority"
                label="Priority"
                :items="priorities"
                variant="outlined"
                class="flex-1"
              />
              <v-select
                v-model="newTask.project"
                label="Project"
                :items="projects"
                placeholder="Select project"
                variant="outlined"
                class="flex-1"
              />
            </div>
            
            <!-- Row 3: Assignee and Start Time -->
            <div class="d-flex ga-4 mb-4">
              <v-select
                v-model="newTask.assignedTo"
                label="Assignee"
                :items="teamMembers"
                placeholder="Select assignee"
                variant="outlined"
                class="flex-1"
              />
              <v-text-field
                v-model="newTask.startTime"
                label="Start Time"
                type="datetime-local"
                variant="outlined"
                class="flex-1"
              />
            </div>
            
            <!-- Row 4: End Time and Due Date -->
            <div class="d-flex ga-4 mb-4">
              <v-text-field
                v-model="newTask.endTime"
                label="End Time"
                type="datetime-local"
                variant="outlined"
                class="flex-1"
              />
              <v-text-field
                v-model="newTask.dueDate"
                label="Due Date"
                type="date"
                variant="outlined"
                class="flex-1"
              />
              </div>

            <!-- Row 4: Add Subtasks -->

            <!-- Subtask Button -->
            <div class="d-flex justify-center mb-4">
              <v-btn
                variant="text"
                prepend-icon="mdi-plus"
                @click="addSubtask"
                color="primary"
                rounded="lg"
              >
                Add Subtask
              </v-btn>
            </div>

            <!-- Dynamic Subtask Forms -->
            <div v-for="(subtask, index) in subtasks" :key="index" class="subtask-section mb-4">
              <v-divider class="mb-4"></v-divider>
              <h5 class="mb-3">Subtask {{ index + 1 }}</h5>

              <!-- Subtask Title -->
              <v-text-field
                v-model="subtask.title"
                label="Subtask Title *"
                placeholder="Enter subtask title"
                required
                variant="outlined"
                class="mb-3"
              />

              <!-- Subtask Description -->
              <v-textarea
                v-model="subtask.description"
                label="Subtask Description"
                placeholder="Enter subtask description"
                variant="outlined"
                rows="2"
                class="mb-3"
              />

              <!-- Subtask Assignee and Start Time -->
              <div class="d-flex ga-4 mb-3">
                <v-select
                  v-model="subtask.assignedTo"
                  label="Assignee"
                  :items="teamMembers"
                  placeholder="Select assignee"
                  variant="outlined"
                  class="flex-1"
                />
                <v-text-field
                  v-model="subtask.startTime"
                  label="Start Time"
                  type="datetime-local"
                  variant="outlined"
                  class="flex-1"
                />
              </div>

              <!-- Subtask End Time and Due Date -->
              <div class="d-flex ga-4 mb-3">
                <v-text-field
                  v-model="subtask.endTime"
                  label="End Time"
                  type="datetime-local"
                  variant="outlined"
                  class="flex-1"
                />
                <v-text-field
                  v-model="subtask.dueDate"
                  label="Due Date"
                  type="date"
                  variant="outlined"
                  class="flex-1"
                />
              </div>

              <!-- Remove Subtask Button -->
              <v-btn
                variant="outlined"
                color="error"
                size="small"
                @click="subtasks.splice(index, 1)"
                prepend-icon="mdi-delete"
                rounded="lg"
              >
                Remove Subtask
              </v-btn>

          </div>
        </v-form>
        </v-card-text>
        
        <v-card-actions class="px-6 pb-6">
          <v-spacer />
          <v-btn variant="text" @click="cancelCreate" class="mr-2" rounded="lg">Cancel</v-btn>
          <v-btn color="secondary" @click="createTask" rounded="lg">{{ isEditing ? 'Update' : 'Save' }}</v-btn>
        </v-card-actions>
        
        </v-card>
    </v-dialog>

    <!-- Snackbar for notifications -->
    <v-snackbar
      v-model="showSnackbar"
      :color="snackbarColor"
      timeout="3000"
    >
      {{ snackbarMessage }}
    </v-snackbar>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

// Reactive data
const viewMode = ref('month')
const currentDate = ref(new Date())
const selectedTask = ref(null)
const upcomingSidebarOpen = ref(true)

// Dialog states
const showDetailsDialog = ref(false)
const showCreateDialog = ref(false)
const isEditing = ref(false)

// Form states
const formValid = ref(false)
const showSnackbar = ref(false)
const snackbarMessage = ref('')
const snackbarColor = ref('success')

// Sample data
const tasks = ref([])
const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const teamMembers = ['John Doe', 'Jane Smith', 'Alice Johnson']

// Form data
const newTask = ref({
  title: '',
  description: '',
  dueDate: '',
  assignedTo: '',
  status: 'To Do'
})

// Subtask data
const subtasks = ref([])

// Computed properties
const calendarDates = computed(() => {
  const dates = []
  const year = currentDate.value.getFullYear()
  const month = currentDate.value.getMonth()
  
  const firstDay = new Date(year, month, 1)
  const startDate = new Date(firstDay)
  const dayOfWeek = (firstDay.getDay() + 6) % 7
  startDate.setDate(firstDay.getDate() - dayOfWeek)
  
  for (let i = 0; i < 42; i++) {
    const date = new Date(startDate)
    date.setDate(startDate.getDate() + i)
    
    const today = new Date()
    dates.push({
      date: date,
      day: date.getDate(),
      month: date.getMonth(),
      year: date.getFullYear(),
      dateKey: date.toISOString().split('T')[0],
      isToday: date.toDateString() === today.toDateString(),
      isOtherMonth: date.getMonth() !== month,
      isWeekend: date.getDay() === 0 || date.getDay() === 6
    })
  }
  
  return dates
})

const todayTasks = computed(() => {
  const today = new Date().toISOString().split('T')[0]
  return tasks.value.filter(task => task.dueDate === today && task.status !== 'Done')
})

const weekTasks = computed(() => {
  const today = new Date()
  const nextWeek = new Date(today)
  nextWeek.setDate(today.getDate() + 7)
  
  return tasks.value.filter(task => {
    if (!task.dueDate || task.status === 'Done') return false
    const taskDate = new Date(task.dueDate)
    return taskDate > today && taskDate <= nextWeek
  })
})

const overdueTasks = computed(() => {
  const today = new Date().toISOString().split('T')[0]
  return tasks.value.filter(task => {
    return task.dueDate && task.dueDate < today && task.status !== 'Done'
  })
})

// Methods
const toggleUpcomingSidebar = () => {
  upcomingSidebarOpen.value = !upcomingSidebarOpen.value
}

const formatTime = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
}

const formatShortDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString([], {month: 'short', day: 'numeric'})
}

const getCurrentPeriodTitle = () => {
  return currentDate.value.toLocaleString('default', { month: 'long', year: 'numeric' })
}

const previousPeriod = () => {
  currentDate.value = new Date(currentDate.value.getFullYear(), currentDate.value.getMonth() - 1, 1)
}

const nextPeriod = () => {
  currentDate.value = new Date(currentDate.value.getFullYear(), currentDate.value.getMonth() + 1, 1)
}

const selectDate = (date) => {
  console.log('Selected date:', date)
}

const getTasksForDate = (dateKey) => {
  const items = []
  tasks.value.forEach(task => {
    if (task.subtasks && task.subtasks.length > 0) {
      // add subtasks that match the date
      task.subtasks.forEach((subtask, index) => {
        const subtaskDate = subtask.dueDate.split('T')[0]
        if (subtaskDate === dateKey) {
          items.push({
            ...subtask,
            id: `${task.id}-subtask-${index}`,
            status: task.status, // inherit status from parent
            isSubtask: true,
            parentTask: task
          })
        }
      })
    } else {
      // add the task if it matches
      if (task.dueDate === dateKey) {
        items.push(task)
      }
    }
  })
  return items
}

const getTaskStatusClass = (status) => {
  return {
    'task-todo': status === 'To Do',
    'task-progress': status === 'In Progress', 
    'task-done': status === 'Done'
  }
}

const getStatusColor = (status) => {
  const colors = {
    'To Do': 'orange',
    'In Progress': 'blue',
    'Done': 'green'
  }
  return colors[status] || 'grey'
}

const formatDate = (dateString) => {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString()
}

const viewTaskDetails = (task) => {
  selectedTask.value = task
  showDetailsDialog.value = true
}

const editTask = (task) => {
  newTask.value = { ...task }
  subtasks.value = task.subtasks ? [...task.subtasks] : []
  isEditing.value = true
  showCreateDialog.value = true
  showDetailsDialog.value = false
}

const createTask = () => {
  const task = {
    id: newTask.value.id || Date.now().toString(),
    ...newTask.value,
    subtasks: subtasks.value,
    status: newTask.value.status || 'To Do',
    createdAt: newTask.value.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }

  if (newTask.value.id) {
    // Update existing task
    const index = tasks.value.findIndex(t => t.id === task.id)
    if (index !== -1) {
      tasks.value[index] = task
      showMessage('Task updated successfully!', 'success')
    }
  } else {
    // Create new task
    tasks.value.unshift(task)
    showMessage('Task created successfully!', 'success')
  }

  showCreateDialog.value = false
  resetForm()
}

const changeTaskStatus = (task) => {
  task.status = task.status === 'Done' ? 'To Do' : 'Done'
  showMessage('Task status updated!', 'success')
}

const cancelCreate = () => {
  showCreateDialog.value = false
  isEditing.value = false
  resetForm()
}

const resetForm = () => {
  newTask.value = {
    title: '',
    description: '',
    dueDate: '',
    assignedTo: '',
    status: 'To Do'
  }
  subtasks.value = [] //to reset subtasks
  isEditing.value = false
}

const addSubtask = () => {
  subtasks.value.push({
    title: '',
    description: '',
    assignedTo: '',
    startTime: '',
    endTime: '',
    dueDate: ''
  })
}

const showMessage = (message, color = 'success') => {
  snackbarMessage.value = message
  snackbarColor.value = color
  showSnackbar.value = true
}

// Sample data initialization
onMounted(() => {
  tasks.value = [
    {
      id: '1',
      title: 'Setup development environment',
      description: 'Install Vue.js, configure Vuetify, and set up the project structure.',
      status: 'Done',
      dueDate: '2025-09-25',
      assignedTo: 'John Doe',
      createdAt: '2025-09-22T10:00:00Z'
    },
    {
      id: '2',
      title: 'Design task creation form',
      description: 'Create a user-friendly form for task creation with validation.',
      status: 'In Progress',
      dueDate: '2025-09-27',
      assignedTo: 'Jane Smith',
      createdAt: '2025-09-24T11:00:00Z',
      subtasks: [
        {
          title: 'Create form layout',
          description: 'Design the basic layout for the task creation form.',
          assignedTo: 'Jane Smith',
          dueDate: '2025-09-26T10:00:00Z'
        },
        // {
        //   title: 'Add validation',
        //   description: 'Implement form validation for required fields.',
        //   assignedTo: 'Alice Johnson',
        //   dueDate: '2025-09-27T10:00:00Z'
        // }
      ]
    }
  ]
})
</script>

<style scoped>
.tasks-container {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f8f9fa;
}

.content-layout {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* Upcoming Tasks Sidebar */
.upcoming-sidebar {
  width: 320px;
  background: white;
  border-right: 1px solid #e0e0e0;
  transition: width 0.3s ease;
  display: flex;
  flex-direction: column;
  box-shadow: 2px 0 8px rgba(0,0,0,0.1);
}

.sidebar-collapsed {
  width: 60px;
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #e0e0e0;
  background: #f8f9fa;
}

.sidebar-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #2c3e50;
}

.collapse-btn {
  transition: transform 0.3s ease;
}

.rotated {
  transform: rotate(180deg);
}

.upcoming-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.collapsed-content {
  display: flex;
  justify-content: center;
  align-items: center;
  flex: 1;
}

.collapsed-icon {
  color: #7f8c8d;
}

.upcoming-section {
  margin-bottom: 24px;
}

.upcoming-section h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: #7f8c8d;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.task-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.upcoming-task {
  padding: 12px;
  background: #f8f9fa;
  border-radius: 12px;
  border: 1px solid #e0e0e0;
  cursor: pointer;
  transition: all 0.2s ease;
}

.upcoming-task:hover {
  background: #e3f2fd;
  border-color: #2196f3;
  transform: translateY(-1px);
}

.upcoming-task.overdue {
  background: #ffebee;
  border-color: #f44336;
}

.task-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.task-name {
  font-weight: 500;
  font-size: 14px;
  color: #2c3e50;
  flex: 1;
  margin-right: 8px;
}

.task-time,
.task-date {
  font-size: 12px;
  color: #7f8c8d;
}

/* Calendar Area */
.calendar-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.calendar-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 20px 24px 16px 24px;
  background: white;
  border-bottom: 1px solid #e0e0e0;
}

.header-left h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: #2c3e50;
}

.date-subtitle {
  margin: 4px 0 0 0;
  color: #7f8c8d;
  font-size: 14px;
}

.header-right {
  display: flex;
  gap: 8px;
  align-items: center;
}

.calendar-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 24px;
  background: white;
  border-bottom: 1px solid #e0e0e0;
}

.project-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.action-controls {
  display: flex;
  gap: 8px;
}

.calendar-nav {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  padding: 12px 24px;
  background: white;
  border-bottom: 1px solid #e0e0e0;
}

.period-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #2c3e50;
  min-width: 180px;
  text-align: center;
}

.calendar-grid {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.calendar-header-row {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  background: #f8f9fa;
  border-bottom: 1px solid #e0e0e0;
}

.day-header {
  padding: 8px;
  text-align: center;
  font-weight: 600;
  color: #5a6c7d;
  font-size: 12px;
}

.calendar-body {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  grid-template-rows: repeat(6, 1fr);
  overflow: hidden;
}

.calendar-day {
  border: 1px solid #e0e0e0;
  border-top: none;
  border-left: none;
  padding: 6px;
  background: white;
  cursor: pointer;
  transition: background-color 0.2s ease;
  overflow: hidden;
}

.calendar-day:hover {
  background: #f8f9fa;
}

.today {
  background: #e3f2fd !important;
}

.other-month {
  background: #fafafa;
  color: #bbb;
}

.weekend {
  background: #f9f9f9;
}

.day-number {
  font-weight: 600;
  margin-bottom: 4px;
  font-size: 12px;
}

.day-tasks {
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-height: calc(100% - 20px);
  overflow: hidden;
}

.task-item {
  background: #f0f0f0;
  border-radius: 8px;
  padding: 4px 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  border-left: 3px solid #ccc;
  font-size: 10px;
}

.task-item:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.task-todo {
  border-left-color: #ff9800;
  background: #fff3e0;
}

.task-progress {
  border-left-color: #2196f3;
  background: #e3f2fd;
}

.task-done {
  border-left-color: #4caf50;
  background: #e8f5e8;
  opacity: 0.8;
}

.task-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.task-title {
  font-weight: 500;
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.task-status {
  font-size: 8px !important;
  height: 14px !important;
}

/* Dialog Styles */
.task-details-header {
  padding: 20px 20px 12px 20px;
  border-bottom: 1px solid #e0e0e0;
}

.details-title-section {
  flex: 1;
}

.details-title-section h2 {
  margin: 0 0 8px 0;
  font-size: 20px;
  font-weight: 600;
  color: #2c3e50;
}

.title-chips {
  display: flex;
  gap: 8px;
}

.task-details-content {
  padding: 20px;
}

.detail-section {
  margin-bottom: 20px;
}

.detail-section h4 {
  margin: 0 0 6px 0;
  font-size: 12px;
  font-weight: 600;
  color: #7f8c8d;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.detail-section p {
  margin: 0;
  line-height: 1.4;
  color: #2c3e50;
  font-size: 14px;
}

.subtask-section {
  padding: 16px;
  background: #f9f9f9;
  border-radius: 8px;
  border: 1px solid #ffffff;
}

.subtask-section h5 {
  margin: 0 0 12px 0;
  font-size: 16px;
  font-weight: 600;
  color: #2c3e50;
}

.parent-summary {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
}

.parent-title-section {
  display: flex;
  align-items: center;
  gap: 4px;
}

.parent-title-btn {
  padding: 4px 8px !important;
  height: auto !important;
  min-height: auto !important;
  font-size: 14px !important;
  font-weight: 400 !important;
  color: #2c3e50 !important;
  text-transform: none !important;
  letter-spacing: normal !important;
  text-align: left !important;
  justify-content: flex-start !important;
  background: #f5f5f5 !important;
  border: 1px solid #ddd !important;
  border-radius: 4px !important;
  box-shadow: none !important;
  margin: 0 !important;
  line-height: 1.4 !important;
}

.parent-title-btn:hover {
  background: rgba(33, 150, 243, 0.1) !important;
  box-shadow: none !important;
}

.edit-parent-btn {
  opacity: 0.8;
  transition: opacity 0.2s ease;
}

.edit-parent-btn:hover {
  opacity: 1;
}

.parent-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.rotated {
  transform: rotate(180deg);
  transition: transform 0.3s ease;
}

.parent-details {
  margin-top: 8px;
  padding: 8px;
  background: #f9f9f9;
  border-radius: 4px;
}

.parent-section {
  border-radius: 8px;
  padding: 16px;
}

/* Dark mode overrides */
[data-theme="dark"] .tasks-container {
  background: #000000 !important;
}

[data-theme="dark"] .upcoming-sidebar {
  background: #1a1a1a !important;
  border-right: 1px solid #333 !important;
}

[data-theme="dark"] .sidebar-header {
  background: #000000 !important;
  border-bottom: 1px solid #333 !important;
}

[data-theme="dark"] .sidebar-header h3 {
  color: #ffffff !important;
}

[data-theme="dark"] .upcoming-task {
  background: #2a2a2a !important;
  border: 1px solid #333 !important;
  color: #ffffff !important;
}

[data-theme="dark"] .upcoming-task:hover {
  background: #1a1a2e !important;
  border-color: #2196f3 !important;
}

[data-theme="dark"] .upcoming-task.overdue {
  background: #2a1a1a !important;
  border-color: #f44336 !important;
}

[data-theme="dark"] .task-name {
  color: #ffffff !important;
}

[data-theme="dark"] .task-time,
[data-theme="dark"] .task-date {
  color: #bbbbbb !important;
}

[data-theme="dark"] .upcoming-section h4 {
  color: #bbbbbb !important;
}

[data-theme="dark"] .calendar-header {
  background: #000000 !important;
  border-bottom: 1px solid #333 !important;
}

[data-theme="dark"] .header-left h1 {
  color: #ffffff !important;
}

[data-theme="dark"] .date-subtitle {
  color: #bbbbbb !important;
}

[data-theme="dark"] .calendar-controls {
  background: #000000 !important;
  border-bottom: 1px solid #333 !important;
}

[data-theme="dark"] .calendar-nav {
  background: #000000 !important;
  border-bottom: 1px solid #333 !important;
}

[data-theme="dark"] .period-title {
  color: #ffffff !important;
}

[data-theme="dark"] .calendar-header-row {
  background: #1a1a1a !important;
  border-bottom: 1px solid #333 !important;
}

[data-theme="dark"] .day-header {
  color: #bbbbbb !important;
}

[data-theme="dark"] .calendar-day {
  background: #000000 !important;
  border: 1px solid #333 !important;
  color: #ffffff !important;
}

[data-theme="dark"] .calendar-day:hover {
  background: #1a1a1a !important;
}

[data-theme="dark"] .today {
  background: #1a1a2e !important;
}

[data-theme="dark"] .other-month {
  background: #0a0a0a !important;
  color: #666 !important;
}

[data-theme="dark"] .weekend {
  background: #0a0a0a !important;
}

[data-theme="dark"] .task-item {
  background: #2a2a2a !important;
  color: #ffffff !important;
}

[data-theme="dark"] .task-todo {
  background: #2a1f0f !important;
}

[data-theme="dark"] .task-progress {
  background: #0f1a2a !important;
}

[data-theme="dark"] .task-done {
  background: #0f2a0f !important;
}

[data-theme="dark"] .task-title {
  color: #ffffff !important;
}

/* Dialog dark mode */
[data-theme="dark"] .v-card {
  background: #1a1a1a !important;
  color: #ffffff !important;
}

[data-theme="dark"] .task-details-header {
  border-bottom: 1px solid #333 !important;
}

[data-theme="dark"] .details-title-section h2 {
  color: #ffffff !important;
}

[data-theme="dark"] .detail-section h4 {
  color: #bbbbbb !important;
}

[data-theme="dark"] .detail-section p {
  color: #ffffff !important;
}

/* Make the entire calendar area dark */
[data-theme="dark"] .calendar-area {
  background: #000000 !important;
}

[data-theme="dark"] .calendar-grid {
  background: #000000 !important;
}

[data-theme="dark"] .calendar-body {
  background: #000000 !important;
}

/* Ensure all calendar cells have dark background */
[data-theme="dark"] .calendar-day {
  background: #1a1a1a !important;
  border: 1px solid #333 !important;
  color: #ffffff !important;
}

[data-theme="dark"] .calendar-day:hover {
  background: #2a2a2a !important;
}

[data-theme="dark"] .today {
  background: #1a1a2e !important;
}

[data-theme="dark"] .other-month {
  background: #0f0f0f !important;
  color: #666 !important;
}

[data-theme="dark"] .weekend {
  background: #1a1a1a !important;
}

[data-theme="dark"] .subtask-section {
  background: #2a2a2a !important;
  border: 1px solid #1a1a1a !important;
}

[data-theme="dark"] .subtask-section h5 {
  color: #ffffff !important;
}

[data-theme="dark"] .parent-details {
  background: #2a2a2a !important;
  color: #ffffff !important;
}

[data-theme="dark"] .parent-title-btn {
  color: #ffffff !important;
  background: #2a2a2a !important;
  border: 1px solid #555 !important;
  box-shadow: none !important;
}

[data-theme="dark"] .parent-title-btn:hover {
  background: rgba(33, 150, 243, 0.2) !important;
  box-shadow: none !important;
}

[data-theme="dark"] .edit-parent-btn {
  color: #ffffff !important;
}


.create-task-card {
  background: white !important;
}

.task-details-card {
  background: white !important;
}

@media (max-width: 768px) {
  .content-layout {
    flex-direction: column;
  }
  
  .upcoming-sidebar {
    width: 100%;
    height: auto;
    max-height: 150px;
  }
  
  .calendar-header {
    flex-direction: column;
    gap: 12px;
  }
  
  .calendar-controls {
    flex-direction: column;
    gap: 8px;
    align-items: flex-start;
  }

  

}
</style>