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

        <div v-if="!upcomingSidebarOpen" class="collapsed-content">
          <v-icon size="24" class="collapsed-icon">mdi-clock-outline</v-icon>
        </div>
      </div>

      <!-- Calendar Area -->
      <div class="calendar-area">
        <div class="calendar-header">
          <div class="header-left">
            <h1>Good Morning, John!</h1>
            <p class="date-subtitle">It's Saturday, 27 September 2025</p>
          </div>
          
          <div class="header-right">
            <v-btn variant="outlined" size="small" prepend-icon="mdi-bell" rounded="lg">
            </v-btn>
            <v-btn variant="outlined" size="small" prepend-icon="mdi-cog" rounded="lg">
            </v-btn>
          </div>
        </div>

        <div class="calendar-controls">
          <div class="view-controls">
            <v-btn-toggle v-model="viewMode" mandatory rounded="xl" class="view-toggle">
              <v-btn value="month" size="small" prepend-icon="mdi-calendar" rounded="xl" class="view-btn">Month</v-btn>
              <v-btn value="week" size="small" prepend-icon="mdi-view-week" rounded="xl" class="view-btn">Week</v-btn>
            </v-btn-toggle>
          </div>

          <div class="action-controls">
            <v-btn color="primary" prepend-icon="mdi-plus" @click="showCreateDialog = true" rounded="lg">
              Add Task
            </v-btn>
          </div>
        </div>

        <div class="calendar-nav">
          <v-btn icon="mdi-chevron-left" variant="text" @click="previousPeriod" rounded="lg"></v-btn>
          <h2 class="period-title">{{ getCurrentPeriodTitle() }}</h2>
          <v-btn icon="mdi-chevron-right" variant="text" @click="nextPeriod" rounded="lg"></v-btn>
        </div>

        <div v-if="viewMode === 'month'" class="calendar-grid">
          <div class="calendar-header-row">
            <div v-for="day in weekDays" :key="day" class="day-header">
              {{ day }}
            </div>
          </div>

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

        <div v-else-if="viewMode === 'week'" class="weekly-view">
          <div class="week-container">
            <div 
              v-for="date in weekDates" 
              :key="date.dateKey"
              class="week-day-column"
              :class="{ 'today-column': date.isToday, 'weekend-column': date.isWeekend }"
            >
              <div class="week-day-header">
                <div class="day-name">{{ date.dayName }}</div>
                <div class="day-number" :class="{ 'today-number': date.isToday }">{{ date.day }}</div>
              </div>

              <div class="week-day-tasks">
                <div 
                  v-for="task in getTasksForDate(date.dateKey)" 
                  :key="task.id"
                  class="week-task-item"
                  :class="getTaskStatusClass(task.status)"
                  @click="viewTaskDetails(task)"
                >
                  <div class="week-task-content">
                    <div class="week-task-title">{{ task.isSubtask ? `${task.title} (${task.parentTask.title})` : task.title }}</div>
                    <div class="week-task-meta">
                      <v-chip 
                        :color="getStatusColor(task.status)" 
                        size="x-small"
                        rounded="lg"
                      >
                        {{ task.status }}
                      </v-chip>
                      <span v-if="task.startTime" class="task-time">{{ formatTime(task.startTime) }}</span>
                    </div>
                  </div>
                </div>

                <div class="add-task-day">
                  <v-btn 
                    variant="text" 
                    size="small" 
                    prepend-icon="mdi-plus"
                    @click="addTaskForDate(date.dateKey)"
                    class="add-task-btn"
                    rounded="lg"
                  >
                    Add task
                  </v-btn>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Date Details Dialog -->
    <v-dialog v-model="showDateDetailsDialog" max-width="900px">
      <v-card v-if="selectedDate" class="date-details-card" rounded="xl">
        <v-card-title class="date-details-header">
          <div class="header-content">
            <div class="date-info">
              <h2>{{ selectedDate.date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) }}</h2>
              <v-chip 
                v-if="selectedDate.isToday" 
                color="primary" 
                size="small"
                rounded="lg"
              >
                Today
              </v-chip>
            </div>
            <v-btn icon="mdi-close" variant="text" @click="showDateDetailsDialog = false" />
          </div>
        </v-card-title>

        <v-card-text class="date-details-content">
          <div v-if="getTasksForSelectedDate().length === 0" class="no-tasks-section">
            <v-icon size="64" color="grey-lighten-1">mdi-calendar-blank-outline</v-icon>
            <h3>No tasks today</h3>
            <p>Get started by adding a task for this date</p>
            <v-btn 
              color="primary" 
              prepend-icon="mdi-plus" 
              @click="addTaskForSelectedDate"
              rounded="lg"
              class="mt-4"
            >
              Add Task
            </v-btn>
          </div>

          <div v-else class="tasks-section">
            <div class="section-header">
              <h3>Tasks ({{ getTasksForSelectedDate().length }})</h3>
              <v-btn 
                color="primary" 
                size="small"
                prepend-icon="mdi-plus" 
                @click="addTaskForSelectedDate"
                rounded="lg"
              >
                Add Task
              </v-btn>
            </div>

            <div class="task-cards-list">
              <v-card 
                v-for="task in getTasksForSelectedDate()" 
                :key="task.id"
                class="task-card-item"
                :class="getTaskStatusClass(task.status)"
                @click="viewTaskDetails(task)"
                rounded="lg"
                elevation="1"
              >
                <div class="task-card-content">
                  <div class="task-card-header">
                    <div class="task-title-section">
                      <h4>{{ task.title }}</h4>
                      <div class="task-badges">
                        <v-chip 
                          :color="getStatusColor(task.status)" 
                          size="small"
                          rounded="lg"
                        >
                          {{ task.status }}
                        </v-chip>
                        <v-chip
                          v-if="task.isSubtask"
                          color="secondary"
                          size="small"
                          rounded="lg"
                        >
                          Subtask
                        </v-chip>
                      </div>
                    </div>
                  </div>

                  <div class="task-card-details">
                    <div class="detail-row" v-if="task.description">
                      <v-icon size="small" class="detail-icon">mdi-text</v-icon>
                      <span class="detail-text">{{ task.description }}</span>
                    </div>

                    <div class="detail-row" v-if="task.startTime">
                      <v-icon size="small" class="detail-icon">mdi-clock-outline</v-icon>
                      <span class="detail-text">{{ formatTime(task.startTime) }}</span>
                    </div>

                    <div class="detail-row" v-if="task.assignedTo">
                      <v-icon size="small" class="detail-icon">mdi-account</v-icon>
                      <span class="detail-text">{{ task.assignedTo }}</span>
                    </div>

                    <div class="detail-row" v-if="task.isSubtask && task.parentTask">
                      <v-icon size="small" class="detail-icon">mdi-file-tree</v-icon>
                      <span class="detail-text">Parent: {{ task.parentTask.title }}</span>
                    </div>

                    <div class="detail-row" v-if="task.attachments && task.attachments.length > 0">
                      <v-icon size="small" class="detail-icon">mdi-paperclip</v-icon>
                      <span class="detail-text">{{ task.attachments.length }} attachment(s)</span>
                    </div>
                  </div>
                </div>
              </v-card>
            </div>
          </div>
        </v-card-text>
      </v-card>
    </v-dialog>

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

          <div class="detail-section" v-if="selectedTask.attachments && selectedTask.attachments.length > 0">
            <h4>Attachments</h4>
            <div class="attachments-list">
              <v-chip
                v-for="attachment in selectedTask.attachments"
                :key="attachment.url"
                variant="outlined"
                class="attachment-chip"
                @click="openAttachment(attachment.url)"
              >
                <v-icon start>mdi-paperclip</v-icon>
                {{ attachment.name }}
              </v-chip>
            </div>
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
            <v-text-field
              v-model="newTask.title"
              label="Title *"
              placeholder="Enter task title"
              required
              variant="outlined"
              class="mb-4"
            />
            
            <v-textarea
              v-model="newTask.description"
              label="Description"
              placeholder="Enter task description"
              variant="outlined"
              rows="3"
              class="mb-4"
            />
            
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

            <div class="mb-4">
              <v-file-input
                v-model="newTask.attachments"
                label="Attach Documents"
                accept=".pdf"
                multiple
                variant="outlined"
                prepend-icon="mdi-paperclip"
                show-size
                chips
              />
            </div>

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

            <div v-for="(subtask, index) in subtasks" :key="index" class="subtask-section mb-4">
              <v-divider class="mb-4"></v-divider>
              <h5 class="mb-3">Subtask {{ index + 1 }}</h5>

              <v-text-field
                v-model="subtask.title"
                label="Subtask Title *"
                placeholder="Enter subtask title"
                required
                variant="outlined"
                class="mb-3"
              />

              <v-textarea
                v-model="subtask.description"
                label="Subtask Description"
                placeholder="Enter subtask description"
                variant="outlined"
                rows="2"
                class="mb-3"
              />

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

              <div class="mb-3">
                <v-file-input
                  v-model="subtask.attachments"
                  label="Attach Documents/PDFs"
                  accept=".pdf,.doc,.docx,.txt"
                  multiple
                  variant="outlined"
                  prepend-icon="mdi-paperclip"
                  show-size
                  chips
                  small-chips
                />
              </div>

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
import { storage } from '@/config/firebase'
import { uploadBytes, getDownloadURL, ref as storageRef } from 'firebase/storage'

const viewMode = ref('month')
const currentDate = ref(new Date())
const selectedTask = ref(null)
const selectedDate = ref(null)
const upcomingSidebarOpen = ref(true)

const showDetailsDialog = ref(false)
const showCreateDialog = ref(false)
const showDateDetailsDialog = ref(false)
const isEditing = ref(false)

const formValid = ref(false)
const showSnackbar = ref(false)
const snackbarMessage = ref('')
const snackbarColor = ref('success')

const tasks = ref([])
const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const teamMembers = ['John Doe', 'Jane Smith', 'Alice Johnson']

const newTask = ref({
  title: '',
  description: '',
  dueDate: '',
  assignedTo: '',
  status: 'To Do',
  attachments: [],
  startTime: '',
  endTime: ''
})

const taskTypes = ['Task', 'Meeting', 'Deadline', 'Review']
const taskStatuses = ['To Do', 'In Progress', 'Done']
const priorities = ['Low', 'Medium', 'High', 'Urgent']
const projects = ['Project Alpha', 'Project Beta', 'General', 'Research']

const subtasks = ref([])

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

const weekDates = computed(() => {
  const dates = []
  const referenceDate = new Date(currentDate.value)
  const currentDay = referenceDate.getDay()
  const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay
  const monday = new Date(referenceDate)
  monday.setDate(referenceDate.getDate() + mondayOffset)
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(monday)
    date.setDate(monday.getDate() + i)
    
    const today = new Date()
    dates.push({
      date: date,
      day: date.getDate(),
      month: date.getMonth(),
      year: date.getFullYear(),
      dateKey: date.toISOString().split('T')[0],
      dayName: date.toLocaleDateString('en-US', { weekday: 'long' }),
      isToday: date.toDateString() === today.toDateString(),
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
  if (viewMode.value === 'week') {
    const startOfWeek = weekDates.value[0]?.date
    const endOfWeek = weekDates.value[6]?.date
    if (startOfWeek && endOfWeek) {
      return `${startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
    }
  }
  return currentDate.value.toLocaleString('default', { month: 'long', year: 'numeric' })
}

const previousPeriod = () => {
  if (viewMode.value === 'week') {
    currentDate.value = new Date(currentDate.value.getTime() - 7 * 24 * 60 * 60 * 1000)
  } else {
    currentDate.value = new Date(currentDate.value.getFullYear(), currentDate.value.getMonth() - 1, 1)
  }
}

const nextPeriod = () => {
  if (viewMode.value === 'week') {
    currentDate.value = new Date(currentDate.value.getTime() + 7 * 24 * 60 * 60 * 1000)
  } else {
    currentDate.value = new Date(currentDate.value.getFullYear(), currentDate.value.getMonth() + 1, 1)
  }
}

const selectDate = (date) => {
  selectedDate.value = date
  showDateDetailsDialog.value = true
}

const getTasksForSelectedDate = () => {
  if (!selectedDate.value) return []
  return getTasksForDate(selectedDate.value.dateKey)
}

const addTaskForSelectedDate = () => {
  if (selectedDate.value) {
    newTask.value.dueDate = selectedDate.value.dateKey
    showCreateDialog.value = true
    showDateDetailsDialog.value = false
  }
}

const addTaskForDate = (dateKey) => {
  newTask.value.dueDate = dateKey
  showCreateDialog.value = true
}

const getTasksForDate = (dateKey) => {
  const items = []
  tasks.value.forEach(task => {
    if (task.subtasks && task.subtasks.length > 0) {
      task.subtasks.forEach((subtask, index) => {
        const subtaskDate = subtask.dueDate.split('T')[0]
        if (subtaskDate === dateKey) {
          items.push({
            ...subtask,
            id: `${task.id}-subtask-${index}`,
            status: task.status,
            isSubtask: true,
            parentTask: task
          })
        }
      })
    } else {
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
  showDateDetailsDialog.value = false
}

const openAttachment = (url) => {
  window.open(url, '_blank')
}

const editTask = (task) => {
  newTask.value = { ...task }
  subtasks.value = task.subtasks ? [...task.subtasks] : []
  isEditing.value = true
  showCreateDialog.value = true
  showDetailsDialog.value = false
}

const createTask = async () => {
  try {
    const mainAttachments = []

    const processedSubtasks = await Promise.all(subtasks.value.map(async (subtask) => ({
      ...subtask,
      attachments: await uploadFiles(subtask.attachments)
    })))

    const task = {
      id: newTask.value.id || Date.now().toString(),
      ...newTask.value,
      attachments: mainAttachments,
      subtasks: processedSubtasks,
      status: newTask.value.status || 'To Do',
      createdAt: newTask.value.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    if (newTask.value.id) {
      const index = tasks.value.findIndex(t => t.id === task.id)
      if (index !== -1) {
        tasks.value[index] = task
        showMessage('Task updated successfully!', 'success')
      }
    } else {
      tasks.value.unshift(task)
      showMessage('Task created successfully!', 'success')
    }

    showCreateDialog.value = false
    resetForm()
  } catch (error) {
    console.error('Error creating task:', error)
    showMessage('Failed to create task', 'error')
  }
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
    status: 'To Do',
    attachments: [],
    startTime: '',
    endTime: ''
  }
  subtasks.value = []
  isEditing.value = false
}

const addSubtask = () => {
  subtasks.value.push({
    title: '',
    description: '',
    assignedTo: '',
    startTime: '',
    endTime: '',
    dueDate: '',
    attachments: []
  })
}

const showMessage = (message, color = 'success') => {
  snackbarMessage.value = message
  snackbarColor.value = color
  showSnackbar.value = true
}

const uploadFiles = async (files) => {
  if (!files || files.length === 0) return []

  const urls = []
  for (const file of files) {
    try {
      const fileRef = storageRef(storage, `attachments/${Date.now()}_${file.name}`)
      await uploadBytes(fileRef, file)
      const url = await getDownloadURL(fileRef)
      urls.push({ name: file.name, url })
    } catch (error) {
      console.error('Error uploading file:', error)
      showMessage(`Failed to upload ${file.name}`, 'error')
    }
  }
  return urls
}

onMounted(() => {
  tasks.value = [
    {
      id: '1',
      title: 'Setup development environment',
      description: 'Install Vue.js, configure Vuetify, and set up the project structure.',
      status: 'Done',
      dueDate: '2025-09-25',
      assignedTo: 'John Doe',
      createdAt: '2025-09-22T10:00:00Z',
      startTime: '2025-09-25T09:00:00'
    },
    {
      id: '2',
      title: 'Design task creation form',
      description: 'Create a user-friendly form for task creation with validation.',
      status: 'In Progress',
      dueDate: '2025-09-27',
      assignedTo: 'Jane Smith',
      createdAt: '2025-09-24T11:00:00Z',
      startTime: '2025-09-27T10:00:00',
      subtasks: [
        {
          title: 'Create form layout',
          description: 'Design the basic layout for the task creation form.',
          assignedTo: 'Jane Smith',
          dueDate: '2025-09-26T10:00:00Z',
          startTime: '2025-09-26T10:00:00'
        }
      ]
    },
    {
      id: '3',
      title: 'reflection survey',
      description: 'Complete the reflection survey for the education project.',
      status: 'To Do',
      dueDate: '2025-09-28',
      assignedTo: 'John Doe',
      createdAt: '2025-09-28T08:00:00Z',
      startTime: '2025-09-28T14:00:00'
    },
    {
      id: '4',
      title: 'proj proposal draft',
      description: 'Draft the project proposal for the new initiative.',
      status: 'To Do',
      dueDate: '2025-09-28',
      assignedTo: 'Alice Johnson',
      createdAt: '2025-09-28T09:00:00Z',
      startTime: '2025-09-28T16:00:00'
    },
    {
      id: '5',
      title: 'Team Meeting',
      description: 'Quarterly team sync and planning session',
      status: 'To Do',
      dueDate: '2025-10-03',
      assignedTo: 'John Doe',
      createdAt: '2025-09-29T08:00:00Z',
      startTime: '2025-10-03T10:00:00'
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

.view-toggle {
  gap: 8px;
  background: transparent !important;
  box-shadow: none !important;
}

.view-btn {
  margin: 0 4px !important;
  transition: all 0.3s ease !important;
}

.view-toggle .v-btn--active {
  background: #5a6c5a !important;
  color: white !important;
}

.view-toggle .v-btn:not(.v-btn--active) {
  background: #d4e4d4 !important;
  color: #5a6c5a !important;
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
  font-size: 11px;
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

.weekly-view {
  flex: 1;
  overflow: hidden;
  background: #f8f9fa;
}

.week-container {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  height: 100%;
  gap: 1px;
  background: #e0e0e0;
}

.week-day-column {
  background: white;
  display: flex;
  flex-direction: column;
  min-height: 100%;
}

.today-column {
  background: #f3f7ff;
}

.weekend-column {
  background: #fafafa;
}

.week-day-header {
  padding: 16px 12px;
  border-bottom: 2px solid #e0e0e0;
  text-align: center;
  background: #f8f9fa;
  min-height: 70px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 4px;
}

.today-column .week-day-header {
  background: #e3f2fd;
  border-bottom-color: #2196f3;
}

.day-name {
  font-size: 12px;
  font-weight: 600;
  color: #7f8c8d;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.week-day-header .day-number {
  font-size: 24px;
  font-weight: 700;
  color: #2c3e50;
}

.today-number {
  color: #2196f3;
  background: white;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
}

.week-day-tasks {
  flex: 1;
  padding: 12px 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-y: auto;
}

.week-task-item {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  border-left: 4px solid #ccc;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.week-task-item:hover {
  transform: translateY(-1px);
  box-shadow: 0 3px 8px rgba(0,0,0,0.15);
}

.week-task-item.task-todo {
  border-left-color: #ff9800;
  background: #fff8e1;
}

.week-task-item.task-progress {
  border-left-color: #2196f3;
  background: #e3f2fd;
}

.week-task-item.task-done {
  border-left-color: #4caf50;
  background: #e8f5e8;
  opacity: 0.8;
}

.week-task-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.week-task-title {
  font-weight: 500;
  font-size: 14px;
  color: #2c3e50;
  line-height: 1.3;
}

.week-task-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.task-time {
  font-size: 12px;
  color: #7f8c8d;
  font-weight: 500;
}

.add-task-day {
  margin-top: auto;
  padding-top: 8px;
}

.add-task-btn {
  width: 100%;
  font-size: 12px !important;
  height: 32px !important;
  color: #7f8c8d !important;
  border: 1px dashed #ccc !important;
  background: transparent !important;
}

.add-task-btn:hover {
  background: #f0f0f0 !important;
  border-color: #2196f3 !important;
  color: #2196f3 !important;
}

.date-details-card {
  background: white !important;
}

.date-details-header {
  padding: 20px 24px;
  border-bottom: 1px solid #e0e0e0;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  width: 100%;
}

.date-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.date-info h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #2c3e50;
}

.date-details-content {
  padding: 24px;
  min-height: 300px;
}

.no-tasks-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
}

.no-tasks-section h3 {
  margin: 16px 0 8px 0;
  font-size: 20px;
  font-weight: 600;
  color: #2c3e50;
}

.no-tasks-section p {
  margin: 0;
  color: #7f8c8d;
  font-size: 14px;
}

.tasks-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.section-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #2c3e50;
}

.task-cards-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 500px;
  overflow-y: auto;
}

.task-card-item {
  cursor: pointer;
  transition: all 0.2s ease;
  border-left: 4px solid #ccc;
}

.task-card-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
}

.task-card-item.task-todo {
  border-left-color: #ff9800;
}

.task-card-item.task-progress {
  border-left-color: #2196f3;
}

.task-card-item.task-done {
  border-left-color: #4caf50;
}

.task-card-content {
  padding: 16px;
}

.task-card-header {
  margin-bottom: 12px;
}

.task-title-section h4 {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 600;
  color: #2c3e50;
}

.task-badges {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.task-card-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.detail-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.detail-icon {
  color: #7f8c8d;
  margin-top: 2px;
}

.detail-text {
  font-size: 14px;
  color: #5a6c7d;
  line-height: 1.4;
  flex: 1;
}

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

.attachments-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.attachment-chip {
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.attachment-chip:hover {
  background-color: rgba(33, 150, 243, 0.1) !important;
}

.parent-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.create-task-card {
  background: white !important;
}

.task-details-card {
  background: white !important;
}
</style>