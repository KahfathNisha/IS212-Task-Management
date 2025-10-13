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
      <!-- Recuurent Tasks Sidebar-->
      <RecurringTasksSidebar @select="viewTaskDetails" />

      <!-- Main Content Area -->
      <div class="main-view-area">
        <!-- Header - Always Visible -->
        <div class="view-header">
          <div class="header-left">
            <h1>Good Morning, John!</h1>
            <p class="date-subtitle">It's Saturday, 27 September 2025</p>
          </div>
          
          <div class="header-right">
            <v-btn color="primary" prepend-icon="mdi-plus" @click="showCreateDialog = true" rounded="lg" class="add-task-btn">
              Add Task
            </v-btn>
          </div>
        </div>

        <!-- Controls - Always Visible -->
        <div class="view-controls">
          <div class="controls-row">
            <!-- Left side: View toggle -->
            <div class="view-toggle-left">
              <div class="view-tabs">
                <button 
                  v-for="tab in viewTabs" 
                  :key="tab.value"
                  @click="viewType = tab.value"
                  :class="['view-tab', { 'active': viewType === tab.value }]"
                >
                  {{ tab.label }}
                </button>
              </div>
            </div>

            <!-- Right side: Filters -->
            <div class="filters-right">
              <div class="filter-label">Filters</div>
              
              <v-btn
                color="primary"
                rounded="pill"
                @click.stop="toggleDepartmentMenu"
                ref="departmentBtnRef"
                class="filter-btn"
              >
                Department{{ selectedDepartments.length > 0 ? ` (${selectedDepartments.length})` : '' }}
                <v-icon size="small" class="ml-1">mdi-chevron-down</v-icon>
              </v-btn>

              <v-btn
                color="primary"
                rounded="pill"
                @click.stop="togglePriorityMenu"
                ref="priorityBtnRef"
                class="filter-btn"
              >
                Priority{{ selectedPriorities.length > 0 ? ` (${selectedPriorities.length})` : '' }}
                <v-icon size="small" class="ml-1">mdi-chevron-down</v-icon>
              </v-btn>

              <v-btn
                color="primary"
                rounded="pill"
                @click.stop="toggleAssigneeMenu"
                ref="assigneeBtnRef"
                class="filter-btn"
              >
                Assignee{{ selectedAssignees.length > 0 ? ` (${selectedAssignees.length})` : '' }}
                <v-icon size="small" class="ml-1">mdi-chevron-down</v-icon>
              </v-btn>

              <v-btn
                variant="outlined"
                @click="resetFilters"
                class="reset-btn"
                :disabled="selectedPriorities.length === 0 && selectedAssignees.length === 0 && selectedDepartments.length === 0"
              >
                Reset filters
              </v-btn>
            </div>

            <!-- Department Dropdown -->
            <div
              v-show="departmentMenuOpen"
              class="custom-filter-dropdown"
              :style="{ top: departmentDropdownTop + 'px', left: departmentDropdownLeft + 'px' }"
              ref="departmentDropdownRef"
            >
              <div class="dropdown-body">
                <input
                  v-model="searchDepartment"
                  type="text"
                  placeholder="Search departments"
                  class="search-input"
                />
                <div class="filter-options-list">
                  <label
                    v-for="option in filteredDepartmentOptions"
                    :key="option.value"
                    class="filter-option-item"
                  >
                    <input
                      type="checkbox"
                      :checked="tempSelectedDepartments.includes(option.value)"
                      @change="toggleDepartment(option.value)"
                      class="custom-checkbox"
                    />
                    <span class="option-text">{{ option.title }}</span>
                  </label>
                </div>
              </div>
              <div class="dropdown-footer">
                <v-btn @click="closeDepartmentMenu" variant="outlined">Close</v-btn>
                <v-btn @click="applyDepartmentFilter" color="primary">Apply</v-btn>
              </div>
            </div>

            <!-- Priority Dropdown -->
            <div
              v-show="priorityMenuOpen"
              class="custom-filter-dropdown"
              :style="{ top: priorityDropdownTop + 'px', left: priorityDropdownLeft + 'px' }"
              ref="priorityDropdownRef"
            >
              <div class="dropdown-body">
                <input
                  v-model="searchPriority"
                  type="text"
                  placeholder="Search priorities"
                  class="search-input"
                />
                <div class="filter-options-list">
                  <label
                    v-for="option in filteredPriorityOptions"
                    :key="option.value"
                    class="filter-option-item"
                  >
                    <input
                      type="checkbox"
                      :checked="tempSelectedPriorities.includes(option.value)"
                      @change="togglePriority(option.value)"
                      class="custom-checkbox"
                    />
                    <span class="option-text">{{ option.title }}</span>
                  </label>
                </div>
              </div>
              <div class="dropdown-footer">
                <v-btn @click="closePriorityMenu" variant="outlined">Close</v-btn>
                <v-btn @click="applyPriorityFilter" color="primary">Apply</v-btn>
              </div>
            </div>

            <!-- Assignee Dropdown -->
            <div
              v-show="assigneeMenuOpen"
              class="custom-filter-dropdown"
              :style="{ top: assigneeDropdownTop + 'px', left: assigneeDropdownLeft + 'px' }"
              ref="assigneeDropdownRef"
            >
              <div class="dropdown-body">
                <input
                  v-model="searchAssignee"
                  type="text"
                  placeholder="Search assignees"
                  class="search-input"
                />
                <div class="filter-options-list">
                  <label
                    v-for="option in filteredAssigneeOptions"
                    :key="option.value"
                    class="filter-option-item"
                  >
                    <input
                      type="checkbox"
                      :checked="tempSelectedAssignees.includes(option.value)"
                      @change="toggleAssignee(option.value)"
                      class="custom-checkbox"
                    />
                    <span class="option-text">{{ option.title }}</span>
                  </label>
                </div>
              </div>
              <div class="dropdown-footer">
                <v-btn @click="closeAssigneeMenu" variant="outlined">Close</v-btn>
                <v-btn @click="applyAssigneeFilter" color="primary">Apply</v-btn>
              </div>
            </div>
          </div>
        </div>

        <!-- Filter Chips -->
        <div class="filter-chips" v-if="selectedFilters.length > 0">
          <v-chip
            v-for="filter in selectedFilters"
            :key="filter.key"
            closable
            @click:close="removeFilter(filter)"
            class="filter-chip"
          >
            {{ filter.label }}
          </v-chip>
        </div>

        <!-- CALENDAR VIEW ONLY -->
        <div v-if="viewType === 'calendar'" class="calendar-content">
          <div class="calendar-nav">
            <v-btn icon="mdi-chevron-left" variant="text" @click="previousPeriod" rounded="lg" class="nav-arrow-left"></v-btn>
            
            <div class="nav-center">
              <h2 class="period-title">{{ getCurrentPeriodTitle() }}</h2>
              <v-btn-toggle v-model="viewMode" mandatory rounded="xl" class="view-toggle">
                <v-btn value="month" size="small" prepend-icon="mdi-calendar" rounded="xl" class="view-btn">Month</v-btn>
                <v-btn value="week" size="small" prepend-icon="mdi-view-week" rounded="xl" class="view-btn">Week</v-btn>
              </v-btn-toggle>
            </div>
            
            <v-btn icon="mdi-chevron-right" variant="text" @click="nextPeriod" rounded="lg" class="nav-arrow-right"></v-btn>
          </div>

                  <!-- Month Calendar View -->
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
                    <span class="task-title">{{ truncateTaskTitle(task.isSubtask ? `${task.title} (${task.parentTask.title})` : task.title) }}</span>
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

        <!-- Week Calendar View -->
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

      <!-- LIST VIEW ONLY -->
      <ListView
        v-if="viewType === 'list' && currentView === 'list'"
        :tasks="filteredTasksList"
        :sort-by="listSortBy"
        :sort-order="listSortOrder"
        :search-query="listSearchQuery"
        :current-view="'list'"
        @update:sortBy="listSortBy = $event"
        @update:sortOrder="listSortOrder = $event"
        :selected-task-id="selectedListTask?.id"
        :task-statuses="taskStatuses"
        :current-view="currentView"
        @change-view="currentView = $event"
        @select-task="handleSelectTask"
        @edit-task="editTask"
        @change-status="handleListStatusChange"
        @view-parent="viewTaskDetails"
        @open-attachment="openAttachment"
        @add-task="showCreateDialog = true"
        @bulk-update-status="handleBulkUpdateStatus"
        @bulk-delete="handleBulkDelete"
      />

      <KanbanView
        v-else-if="viewType === 'list' && currentView === 'kanban'"
        :tasks="filteredTasksList"
        :selected-task-id="selectedTaskId"
        :task-statuses="taskStatuses"
        :search-query="searchQuery"
        :current-view="currentView"
        @change-view="currentView = $event"
        @select-task="handleSelectTask"
        @edit-task="editTask"
        @change-status="handleListStatusChange"
        @view-parent="viewTaskDetails"
        @open-attachment="openAttachment"
        @add-task="showCreateDialog = true"
      />
          
    </div>
      
    
        
    

    <!-- Task Details Dialog -->
    <TaskDetailsDialog
      :show="showDetailsDialog"
      @update:show="showDetailsDialog = $event"
      :model="selectedTask"
      :taskStatuses="taskStatuses"
      :parentTaskProgress="parentTaskProgress"
      @edit="editTask"
      @change-status="changeTaskStatus"
      @view-parent="viewTaskDetails"
      @open-attachment="openAttachment" 
    />

    <!-- Create Task Dialog -->
    <CreateTaskDialogue
      v-model="showCreateDialog"
      :model="newTask"
      :isEditing="isEditing"
      :taskStatuses="taskStatuses"
      :priorities="priorities"
      :teamMembers="teamMembers"
      :todayDate="todayDate"
      @save="handleCreateSave"
      @cancel="cancelCreate"
      @message="handleMessage"
    />

    <v-snackbar
      v-model="showSnackbar"
      :color="snackbarColor"
      timeout="3000"
    >
      {{ snackbarMessage }}
    </v-snackbar>

    </div>
  </div>

</template>

<script setup>
import { ref, computed, nextTick, onMounted } from 'vue'
import { storage } from '@/config/firebase'
import { uploadBytes, getDownloadURL, ref as storageRef } from 'firebase/storage'
import axios from 'axios'
import '../assets/styles.css';
import CreateTaskDialogue from '../components/CreateTaskDialogue.vue'
import TaskDetailsDialog from '../components/TaskDetailsDialog.vue'
import ListView from './ListView.vue'
import RecurringTasksSidebar from '../components/RecurringTasksSidebar.vue'

// Axios client configuration
const axiosClient = axios.create({
    baseURL: 'http://localhost:3000', 
    headers: {
        'Content-Type': 'application/json',
    },
});

const viewMode = ref('month')
const currentDate = ref(new Date())
const viewType = ref('calendar')
const currentView = ref('list') 
const viewTabs = [
  { label: 'Overview', value: 'overview' },
  { label: 'Calendar', value: 'calendar' },
  { label: 'Task List', value: 'list' },
  { label: 'Timeline', value: 'timeline' },
  { label: 'Projects', value: 'projects' },
  { label: 'Team', value: 'team' }
]
const selectedTask = ref(null)
const selectedDate = ref(null)
const upcomingSidebarOpen = ref(true)
const selectedPriorities = ref([])
const selectedAssignees = ref([])
const selectedDepartments = ref([])
const tempSelectedPriorities = ref([])
const tempSelectedAssignees = ref([])
const tempSelectedDepartments = ref([])
const searchPriority = ref('')
const searchAssignee = ref('')
const searchDepartment = ref('')
const priorityMenuOpen = ref(false)
const assigneeMenuOpen = ref(false)
const departmentMenuOpen = ref(false)
const priorityDropdownTop = ref(0)
const priorityDropdownLeft = ref(0)
const assigneeDropdownTop = ref(0)
const assigneeDropdownLeft = ref(0)
const departmentDropdownTop = ref(0)
const departmentDropdownLeft = ref(0)
const priorityBtnRef = ref(null)
const assigneeBtnRef = ref(null)
const departmentBtnRef = ref(null)
const priorityDropdownRef = ref(null)
const assigneeDropdownRef = ref(null)
const departmentDropdownRef = ref(null)
const showFilterDialog = ref(false)
const selectedListTask = ref(null)
const listSortBy = ref('dueDate')
const listSortOrder = ref('asc')
const listSearchQuery = ref('')
const selectedTaskId = ref(null) 
const searchQuery = ref('') 

const showDetailsDialog = ref(false)
const showCreateDialog = ref(false)
const showDateDetailsDialog = ref(false)
const isEditing = ref(false)

const formValid = ref(false)
const showSnackbar = ref(false)
const snackbarMessage = ref('')
const snackbarColor = ref('success')

const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const teamMembers = ['John Doe', 'Jane Smith', 'Alice Johnson']

const departments = ['Engineering', 'Marketing', 'Sales', 'HR', 'Finance', 'Operations']
const departmentFilterOptions = departments.map(dept => ({ title: dept, value: dept }))

const tasks = ref([
  {
    id: '1',
    title: 'Complete project proposal',
    description: 'Write and finalize the Q4 project proposal for the new marketing campaign',
    dueDate: '2025-09-27',
    assignedTo: 'John Doe',
    status: 'Ongoing',
    priority: 1,
    attachments: [],
    startTime: '2025-09-25T14:30:00',
    endTime: '2025-09-27T11:00:00',
    createdAt: '2025-09-25T14:30:00',
    updatedAt: '2025-09-26T10:15:00',
    statusHistory: [
      {
        timestamp: '2025-09-25T14:30:00',
        oldStatus: null,
        newStatus: 'Ongoing'
      }
    ],
    subtasks: [
      {
        title: 'Research market trends',
        description: 'Gather data on current market trends',
        assignedTo: 'Jane Smith',
        startTime: '2025-09-27T09:00:00',
        endTime: '2025-09-27T17:00:00',
        dueDate: '2025-09-27',
        status: 'Ongoing',
        priority: 2,
        createdAt: '2025-09-25T15:00:00',
        statusHistory: [
          {
            timestamp: '2025-09-25T15:00:00',
            oldStatus: null,
            newStatus: 'Ongoing'
          }
        ],
        attachments: []
      },
      {
        title: 'Write draft proposal',
        description: 'Create the initial draft of the proposal',
        assignedTo: 'John Doe',
        startTime: '2025-09-26T10:00:00',
        endTime: '2025-09-27T11:00:00',
        dueDate: '2025-09-27',
        status: 'Pending Review',
        priority: 2,
        createdAt: '2025-09-26T10:00:00',
        statusHistory: [
          {
            timestamp: '2025-09-26T10:00:00',
            oldStatus: null,
            newStatus: 'Ongoing'
          },
          {
            timestamp: '2025-09-26T12:00:00',
            oldStatus: 'Ongoing',
            newStatus: 'Pending Review'
          }
        ],
        attachments: []
      }
    ]
  },
  {
    id: '2',
    title: 'Review quarterly reports',
    description: 'Review and approve the quarterly financial reports',
    dueDate: '2025-09-28',
    assignedTo: 'Jane Smith',
    status: 'Ongoing',
    priority: 7,
    attachments: [],
    startTime: '2025-09-28T14:00:00',
    endTime: '2025-09-28T16:00:00',
    createdAt: '2025-09-24T11:20:00',
    updatedAt: '2025-09-24T11:20:00',
    statusHistory: [
      {
        timestamp: '2025-09-24T11:20:00',
        oldStatus: null,
        newStatus: 'Ongoing'
      }
    ],
    subtasks: []
  },
  {
    id: '3',
    title: 'Update website content',
    description: 'Update the company website with new product information',
    dueDate: '2025-09-24',
    assignedTo: 'Alice Johnson',
    status: 'Unassigned',
    priority: 6,
    attachments: [],
    startTime: '2025-09-24T10:00:00',
    endTime: '2025-09-24T12:00:00',
    createdAt: '2025-09-22T16:45:00',
    updatedAt: '2025-09-23T08:30:00',
    statusHistory: [
      {
        timestamp: '2025-09-22T16:45:00',
        oldStatus: null,
        newStatus: 'Unassigned'
      }
    ],
    subtasks: [
      {
        title: 'Design new banner',
        description: 'Create a new banner for the homepage',
        assignedTo: 'Alice Johnson',
        startTime: '2025-09-24T10:00:00',
        endTime: '2025-09-24T11:00:00',
        dueDate: '2025-09-24',
        status: 'Ongoing',
        priority: 5,
        createdAt: '2025-09-23T09:15:00',
        statusHistory: [
          {
            timestamp: '2025-09-23T09:15:00',
            oldStatus: null,
            newStatus: 'Ongoing'
          }
        ],
        attachments: []
      }
    ]
  },
  {
    id: '4',
    title: 'Prepare presentation slides',
    description: 'Create slides for the upcoming client presentation',
    dueDate: '2025-10-02',
    assignedTo: 'John Doe',
    status: 'Completed',
    priority: 2,
    attachments: [],
    startTime: '2025-10-02T13:00:00',
    endTime: '2025-10-02T15:00:00',
    createdAt: '2025-09-26T12:00:00',
    updatedAt: '2025-09-29T17:30:00',
    statusHistory: [
      {
        timestamp: '2025-09-26T12:00:00',
        oldStatus: null,
        newStatus: 'Ongoing'
      },
      {
        timestamp: '2025-09-27T14:20:00',
        oldStatus: 'Ongoing',
        newStatus: 'Pending Review'
      },
      {
        timestamp: '2025-09-29T17:30:00',
        oldStatus: 'Pending Review',
        newStatus: 'Completed'
      }
    ],
    subtasks: []
  }
])

const newTask = ref({
  title: '',
  description: '',
  dueDate: '',
  assignedTo: '',
  collaborators: [],
  status: 'Ongoing',
  attachments: [],
  startTime: '',
  endTime: ''
})

const taskTypes = ['Task', 'Meeting', 'Deadline', 'Review']
const taskStatuses = ['Ongoing', 'Completed', 'Pending Review', 'Unassigned']
const priorities = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
const priorityFilterOptions = [
  { title: 'Priority 1', value: 1 },
  { title: 'Priority 2', value: 2 },
  { title: 'Priority 3', value: 3 },
  { title: 'Priority 4', value: 4 },
  { title: 'Priority 5', value: 5 },
  { title: 'Priority 6', value: 6 },
  { title: 'Priority 7', value: 7 },
  { title: 'Priority 8', value: 8 },
  { title: 'Priority 9', value: 9 },
  { title: 'Priority 10', value: 10 }
]

const assigneeFilterOptions = [
  { title: 'John Doe', value: 'John Doe' },
  { title: 'Jane Smith', value: 'Jane Smith' },
  { title: 'Alice Johnson', value: 'Alice Johnson' }
]

const subtasks = ref([])

onMounted(async () => {
  try {
    const response = await axiosClient.get('/tasks');
    tasks.value = response.data;
  } catch (error) {
    showMessage('Failed to load tasks', 'error');
  }
});

// Get today's date in YYYY-MM-DD format for min date validation
const todayDate = computed(() => {
  return new Date().toISOString().split('T')[0]
})

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
      dateKey: `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`,
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
      dateKey: `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`,
      dayName: date.toLocaleDateString('en-US', { weekday: 'long' }),
      isToday: date.toDateString() === today.toDateString(),
      isWeekend: date.getDay() === 0 || date.getDay() === 6
    })
  }

  return dates
})

const todayTasks = computed(() => {
  const today = new Date().toISOString().split('T')[0]
  let filtered = tasks.value.filter(task => task.dueDate === today && task.status !== 'Completed')

  if (selectedPriorities.value.length > 0) {
    filtered = filtered.filter(task => selectedPriorities.value.includes(task.priority))
  }
  if (selectedAssignees.value.length > 0) {
    filtered = filtered.filter(task => selectedAssignees.value.includes(task.assignedTo))
  }
  if (selectedDepartments.value.length > 0) {
    filtered = filtered.filter(task => selectedDepartments.value.includes(task.department))
  }

  return filtered
})

const weekTasks = computed(() => {
  const today = new Date()
  const nextWeek = new Date(today)
  nextWeek.setDate(today.getDate() + 7)

  let filtered = tasks.value.filter(task => {
    if (!task.dueDate || task.status === 'Completed') return false
    const taskDate = new Date(task.dueDate)
    return taskDate > today && taskDate <= nextWeek
  })

  if (selectedPriorities.value.length > 0) {
    filtered = filtered.filter(task => selectedPriorities.value.includes(task.priority))
  }
  if (selectedAssignees.value.length > 0) {
    filtered = filtered.filter(task => selectedAssignees.value.includes(task.assignedTo))
  }
  if (selectedDepartments.value.length > 0) {
    filtered = filtered.filter(task => selectedDepartments.value.includes(task.department))
  }

  return filtered
})

const overdueTasks = computed(() => {
  const today = new Date().toISOString().split('T')[0]
  let filtered = tasks.value.filter(task => {
    return task.dueDate && task.dueDate < today && task.status !== 'Completed'
  })

  if (selectedPriorities.value.length > 0) {
    filtered = filtered.filter(task => selectedPriorities.value.includes(task.priority))
  }
  if (selectedAssignees.value.length > 0) {
    filtered = filtered.filter(task => selectedAssignees.value.includes(task.assignedTo))
  }
  if (selectedDepartments.value.length > 0) {
    filtered = filtered.filter(task => selectedDepartments.value.includes(task.department))
  }

  return filtered
})

const parentTaskProgress = computed(() => {
  const task = selectedTask.value;
  if (!task || !task.subtasks || task.subtasks.length === 0) return 0;

  const totalSubtasks = task.subtasks.length;
  const completedSubtasks = task.subtasks.filter(subtask => subtask.status === 'Completed').length;
  return Math.round((completedSubtasks / totalSubtasks) * 100);
});

const filteredPriorityOptions = computed(() => {
  return priorityFilterOptions.filter(opt => opt.title.toLowerCase().includes(searchPriority.value.toLowerCase()))
})

const filteredAssigneeOptions = computed(() => {
  return assigneeFilterOptions.filter(opt => opt.title.toLowerCase().includes(searchAssignee.value.toLowerCase()))
})

const filteredDepartmentOptions = computed(() => {
  return departmentFilterOptions.filter(opt => 
    opt.title.toLowerCase().includes(searchDepartment.value.toLowerCase())
  )
})

const selectedFilters = computed(() => {
  return [
    ...selectedDepartments.value.map(d => ({ 
      key: `department-${d}`, 
      label: d, 
      type: 'department', 
      value: d 
    })),
    ...selectedPriorities.value.map(p => ({ 
      key: `priority-${p}`, 
      label: priorityFilterOptions.find(o => o.value === p)?.title || p, 
      type: 'priority', 
      value: p 
    })),
    ...selectedAssignees.value.map(a => ({ 
      key: `assignee-${a}`, 
      label: assigneeFilterOptions.find(o => o.value === a)?.title || a, 
      type: 'assignee', 
      value: a 
    }))
  ]
})

const filteredTasksList = computed(() => {
  let filtered = tasks.value

  if (selectedPriorities.value.length > 0) {
    filtered = filtered.filter(task => selectedPriorities.value.includes(task.priority))
  }
  if (selectedAssignees.value.length > 0) {
    filtered = filtered.filter(task => selectedAssignees.value.includes(task.assignedTo))
  }
  if (selectedDepartments.value.length > 0) {
    filtered = filtered.filter(task => selectedDepartments.value.includes(task.department))
  }

  return filtered
})

// Validate if date is in the past
const validateDueDate = (dateString) => {
  if (!dateString) return true;
  
  const selectedDate = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return selectedDate >= today;
}

// Add Task Function
const handleCreateSave = async (taskData) => {
  try {
    const response = await axios.post('http://localhost:3000/tasks', taskData);
    const newTaskId = response.data.id;
    const newTaskWithId = {
      ...taskData,
      id: newTaskId,
      statusHistory: [{ timestamp: new Date().toISOString(), oldStatus: null, newStatus: taskData.status || 'Ongoing' }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    tasks.value.push(newTaskWithId);
    showSnackbar.value = true;
    snackbarMessage.value = 'Task created successfully!';
    snackbarColor.value = 'success';
  } catch (error) {
    showSnackbar.value = true;
    snackbarMessage.value = error.response?.data?.message || 'Failed to create task.';
    snackbarColor.value = 'error';
  }
};

// Update Task Function
const updateTask = async (taskId, updatedData) => {
  try {
    if (updatedData.dueDate && !validateDueDate(updatedData.dueDate)) {
      showMessage('Cannot set due date in the past', 'error');
      return false;
    }

    if (updatedData.attachments && updatedData.attachments.length > 0) {
      updatedData.attachments = await uploadFiles(updatedData.attachments);
    }

    await axiosClient.put(`/tasks/${taskId}`, updatedData);

    const taskIndex = tasks.value.findIndex(t => t.id === taskId);
    if (taskIndex !== -1) {
      tasks.value[taskIndex] = {
        ...tasks.value[taskIndex],
        ...updatedData,
        updatedAt: new Date().toISOString()
      };

      if (selectedTask.value?.id === taskId) {
        selectedTask.value = tasks.value[taskIndex];
      }
      if (selectedListTask.value?.id === taskId) {
        selectedListTask.value = tasks.value[taskIndex];
      }
    }

    showMessage('Task updated successfully!', 'success');
    return true;
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Failed to update task';
    console.error('Error updating task:', errorMessage, error);
    showMessage(errorMessage, 'error');
    return false;
  }
};

// Create Task Function
const createTask = async () => {
  if (isEditing.value) {
    const mainAttachments = await uploadFiles(newTask.value.attachments);
    
    const updatedData = {
      title: newTask.value.title,
      description: newTask.value.description,
      dueDate: newTask.value.dueDate,
      assignedTo: newTask.value.assignedTo,
      priority: newTask.value.priority,
      status: newTask.value.status,
      collaborators: newTask.value.collaborators,
      attachments: mainAttachments.length > 0 ? mainAttachments : newTask.value.attachments,
      subtasks: subtasks.value
    };
    
    const success = await updateTask(newTask.value.id, updatedData);
    
    if (success) {
      showCreateDialog.value = false;
      resetForm();
    }
    return;
  }
  
  try {
    if (newTask.value.dueDate && !validateDueDate(newTask.value.dueDate)) {
      showMessage('Cannot set due date in the past', 'error');
      return;
    }

    const mainAttachments = await uploadFiles(newTask.value.attachments);

    const processedSubtasks = subtasks.value.map(subtask => ({
        ...subtask,
    }));

    const taskData = {
      title: newTask.value.title,
      description: newTask.value.description || '',
      dueDate: newTask.value.dueDate || null,
      assigneeId: newTask.value.assignedTo || null,
      priority: newTask.value.priority || 1,
      status: newTask.value.status || 'Ongoing',
      collaborators: Array.isArray(newTask.value.collaborators) ? newTask.value.collaborators : [],
      attachments: mainAttachments || [],
      subtasks: processedSubtasks || [],
      projectId: newTask.value.projectId || null,
      recurrence: newTask.value.recurrence || { enabled: false, type: '', interval: 1, startDate: null, endDate: null }
    };

    const response = await axiosClient.post('/tasks', taskData); 
    const newTaskId = response.data.id; 
    
    const newTaskWithId = { 
        ...taskData, 
        id: newTaskId,
        statusHistory: [{ 
            timestamp: new Date().toISOString(),
            oldStatus: null, 
            newStatus: taskData.status 
        }],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };

    tasks.value.push(newTaskWithId);
    showMessage('Task created successfully!', 'success');

    showCreateDialog.value = false;
    resetForm();
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Failed to connect to server or save task.';
    console.error('Error creating task:', errorMessage, error);
    showMessage(errorMessage, 'error');
  }
}

// Change Task Status Function
const changeTaskStatus = async (task, newStatus) => {
  const oldStatus = task.status

  if (oldStatus === newStatus) {
    showMessage(`Task is already in "${newStatus}" status.`, 'info')
    return
  }
  
  if (task.isSubtask) {
      showMessage('Subtask status can only be managed locally for now.', 'info');
      return;
  }
  if (!task.id) {
      showMessage('Task ID is missing.', 'error');
      return;
  }

  try {
    await axiosClient.put(`/tasks/${task.id}/status`, { status: newStatus }); 
    
    const taskIndex = tasks.value.findIndex(t => t.id === task.id)
    if (taskIndex !== -1) {
      const taskData = tasks.value[taskIndex]
      const statusHistory = [...(taskData.statusHistory || [])]
      
      statusHistory.push({
        timestamp: new Date().toISOString(),
        oldStatus: oldStatus,
        newStatus: newStatus
      })
      
      tasks.value[taskIndex] = {
        ...taskData,
        status: newStatus,
        statusHistory,
        updatedAt: new Date().toISOString()
      }
      
      selectedTask.value = tasks.value[taskIndex]
      selectedListTask.value = tasks.value[taskIndex]
    }
    
    showMessage('Task status updated!', 'success')
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Failed to update task status on server.';
    console.error('Error updating task status:', errorMessage, error)
    showMessage(errorMessage, 'error')
  }
}

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
  let items = []
  tasks.value.forEach(task => {
    if (task.subtasks && task.subtasks.length > 0) {
      task.subtasks.forEach((subtask, index) => {
        const subtaskDate = subtask.dueDate?.split('T')[0]
        if (subtaskDate === dateKey) {
          items.push({
            ...subtask,
            id: `${task.id}-subtask-${index}`,
            status: subtask.status,
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

  if (selectedPriorities.value.length > 0) {
    items = items.filter(task => selectedPriorities.value.includes(task.priority))
  }

  if (selectedAssignees.value.length > 0) {
    items = items.filter(task => selectedAssignees.value.includes(task.assignedTo))
  }

  if (selectedDepartments.value.length > 0) {
    items = items.filter(task => selectedDepartments.value.includes(task.department))
  }

  return items
}

const getTaskStatusClass = (status) => {
  return {
    'task-ongoing': status === 'Ongoing',
    'task-pending': status === 'Pending Review', 
    'task-unassigned': status === 'Unassigned', 
    'task-completed': status === 'Completed'
  }
}

const getStatusColor = (status) => {
  const colors = {
    'Ongoing': 'blue',
    'Completed': 'green',
    'Pending Review': 'orange',
    'Unassigned': 'grey'
  }
  return colors[status] || 'grey'
}

const formatDate = (dateString) => {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString()
}

const formatDateTime = (dateString) => {
  if (!dateString) return ''
  return new Date(dateString).toLocaleString()
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
  newTask.value.collaborators = newTask.value.collaborators || []
  newTask.value.attachments = newTask.value.attachments || []
  newTask.value.status = newTask.value.status || 'Ongoing'
  subtasks.value = task.subtasks ? [...task.subtasks] : []
  if (!newTask.value.statusHistory) newTask.value.statusHistory = []
  subtasks.value.forEach(subtask => {
    if (!subtask.statusHistory) subtask.statusHistory = []
    subtask.collaborators = subtask.collaborators || []
    subtask.attachments = subtask.attachments || []
  })
  isEditing.value = true
  showCreateDialog.value = true
  showDetailsDialog.value = false
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
    collaborators: [],
    status: 'Ongoing',
    attachments: [],
  }
  subtasks.value = []
  isEditing.value = false
}

const addSubtask = () => {
  subtasks.value.push({
    title: '',
    description: '',
    status: 'Unassigned',
    priority: 1,
    assignedTo: '',
    collaborators: [],
    dueDate: '',
    attachments: []
  })
}

const showMessage = (message, color = 'success') => {
  snackbarMessage.value = message
  snackbarColor.value = color
  showSnackbar.value = true
}

// Priority Menu Functions
const togglePriorityMenu = () => {
  if (priorityMenuOpen.value) {
    closePriorityMenu()
  } else {
    closeAssigneeMenu()
    closeDepartmentMenu()
    openPriorityMenu()
  }
}

const openPriorityMenu = () => {
  tempSelectedPriorities.value = [...selectedPriorities.value]
  searchPriority.value = ''

  nextTick(() => {
    if (priorityBtnRef.value) {
      const rect = priorityBtnRef.value.$el.getBoundingClientRect()
      priorityDropdownTop.value = rect.bottom + 4
      priorityDropdownLeft.value = rect.left
    }
  })

  priorityMenuOpen.value = true

  nextTick(() => {
    document.addEventListener('click', handlePriorityClickOutside)
  })
}

const closePriorityMenu = () => {
  priorityMenuOpen.value = false
  document.removeEventListener('click', handlePriorityClickOutside)
}

const handlePriorityClickOutside = (event) => {
  if (priorityDropdownRef.value && !priorityDropdownRef.value.contains(event.target)) {
    closePriorityMenu()
  }
}

const applyPriorityFilter = () => {
  selectedPriorities.value = [...tempSelectedPriorities.value]
  closePriorityMenu()
}

const togglePriority = (value) => {
  if (tempSelectedPriorities.value.includes(value)) {
    tempSelectedPriorities.value = tempSelectedPriorities.value.filter(v => v !== value)
  } else {
    tempSelectedPriorities.value.push(value)
  }
}

// Assignee Menu Functions
const toggleAssigneeMenu = () => {
  if (assigneeMenuOpen.value) {
    closeAssigneeMenu()
  } else {
    closePriorityMenu()
    closeDepartmentMenu()
    openAssigneeMenu()
  }
}

const openAssigneeMenu = () => {
  tempSelectedAssignees.value = [...selectedAssignees.value]
  searchAssignee.value = ''

  nextTick(() => {
    if (assigneeBtnRef.value) {
      const rect = assigneeBtnRef.value.$el.getBoundingClientRect()
      assigneeDropdownTop.value = rect.bottom + 4
      assigneeDropdownLeft.value = rect.left
    }
  })

  assigneeMenuOpen.value = true

  nextTick(() => {
    document.addEventListener('click', handleAssigneeClickOutside)
  })
}

const closeAssigneeMenu = () => {
  assigneeMenuOpen.value = false
  document.removeEventListener('click', handleAssigneeClickOutside)
}

const handleAssigneeClickOutside = (event) => {
  if (assigneeDropdownRef.value && !assigneeDropdownRef.value.contains(event.target)) {
    closeAssigneeMenu()
  }
}

const applyAssigneeFilter = () => {
  selectedAssignees.value = [...tempSelectedAssignees.value]
  closeAssigneeMenu()
}

const toggleAssignee = (value) => {
  if (tempSelectedAssignees.value.includes(value)) {
    tempSelectedAssignees.value = tempSelectedAssignees.value.filter(v => v !== value)
  } else {
    tempSelectedAssignees.value.push(value)
  }
}

// Department Menu Functions
const toggleDepartmentMenu = () => {
  if (departmentMenuOpen.value) {
    closeDepartmentMenu()
  } else {
    closePriorityMenu()
    closeAssigneeMenu()
    openDepartmentMenu()
  }
}

const openDepartmentMenu = () => {
  tempSelectedDepartments.value = [...selectedDepartments.value]
  searchDepartment.value = ''

  nextTick(() => {
    if (departmentBtnRef.value) {
      const rect = departmentBtnRef.value.$el.getBoundingClientRect()
      departmentDropdownTop.value = rect.bottom + 4
      departmentDropdownLeft.value = rect.left
    }
  })

  departmentMenuOpen.value = true

  nextTick(() => {
    document.addEventListener('click', handleDepartmentClickOutside)
  })
}

const closeDepartmentMenu = () => {
  departmentMenuOpen.value = false
  document.removeEventListener('click', handleDepartmentClickOutside)
}

const handleDepartmentClickOutside = (event) => {
  if (departmentDropdownRef.value && !departmentDropdownRef.value.contains(event.target)) {
    closeDepartmentMenu()
  }
}

const applyDepartmentFilter = () => {
  selectedDepartments.value = [...tempSelectedDepartments.value]
  closeDepartmentMenu()
}

const toggleDepartment = (value) => {
  if (tempSelectedDepartments.value.includes(value)) {
    tempSelectedDepartments.value = tempSelectedDepartments.value.filter(v => v !== value)
  } else {
    tempSelectedDepartments.value.push(value)
  }
}

// Filter Management
const removeFilter = (filter) => {
  if (filter.type === 'department') {
    selectedDepartments.value = selectedDepartments.value.filter(d => d !== filter.value)
  } else if (filter.type === 'priority') {
    selectedPriorities.value = selectedPriorities.value.filter(p => p !== filter.value)
  } else {
    selectedAssignees.value = selectedAssignees.value.filter(a => a !== filter.value)
  }
}

const resetFilters = () => {
  selectedPriorities.value = []
  selectedAssignees.value = []
  selectedDepartments.value = []
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

const truncateTaskTitle = (title) => {
  if (title.length > 20) {
    return title.substring(0, 20) + '...'
  }
  return title
}

// List View Handlers
const handleSelectTask = (task) => {
  selectedListTask.value = task
  selectedTaskId.value = task?.id || null 
}

const handleListStatusChange = ({ task, status }) => {
  changeTaskStatus(task, status)
}

const handleBulkUpdateStatus = async (taskIds) => {
  const newStatus = prompt('Enter new status (Ongoing, Completed, Pending Review, Unassigned):')  
  if (newStatus && taskStatuses.includes(newStatus)) {
    try {
      for (const taskId of taskIds) {
        const task = tasks.value.find(t => t.id === taskId)
        if (task) {
          await changeTaskStatus(task, newStatus)
        }
      }
      showMessage(`Updated ${taskIds.length} task(s)`, 'success')
    } catch (error) {
      showMessage('Failed to update some tasks', 'error')
    }
  } else {
    showMessage('Invalid status selected', 'error')
  }
}

const handleBulkDelete = async (taskIds) => {
  try {
    for (const taskId of taskIds) {
      await axiosClient.delete(`/tasks/${taskId}`)
      const index = tasks.value.findIndex(t => t.id === taskId)
      if (index > -1) {
        tasks.value.splice(index, 1)
      }
    }
    showMessage(`Deleted ${taskIds.length} task(s)`, 'success')
    selectedListTask.value = null
  } catch (error) {
    showMessage('Failed to delete some tasks', 'error')
  }
}

const handleMessage = ({ message, color }) => {
  showMessage(message, color)
}

</script>

<style scoped>
/* ===========================
   Main Container
   =========================== */
.tasks-container {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: transparent;
}

.content-layout {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* ===========================
   Upcoming Sidebar
   =========================== */
.upcoming-sidebar {
  width: 320px;
  background: transparent;
  border-right: 1px solid rgba(0, 0, 0, 0.08);
  transition: width 0.3s ease;
  overflow: hidden;
}

.sidebar-collapsed {
  width: 60px;
}

[data-theme="dark"] .upcoming-sidebar {
  border-right: 1px solid rgba(255, 255, 255, 0.08);
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
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
  background: rgba(0, 0, 0, 0.02);
  border-radius: 12px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  cursor: pointer;
  transition: all 0.2s ease;
}

[data-theme="dark"] .upcoming-task {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.upcoming-task:hover {
  background: rgba(33, 150, 243, 0.08);
  border-color: #2196f3;
  transform: translateY(-1px);
}

.upcoming-task.overdue {
  background: rgba(244, 67, 54, 0.08);
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
  color: var(--text-primary);
  flex: 1;
  margin-right: 8px;
}

.task-time,
.task-date {
  font-size: 12px;
  color: #7f8c8d;
}

/* ===========================
   Calendar Area
   =========================== */
/* ===========================
   Main View Area
   =========================== */
.main-view-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.view-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 16px 24px 12px 24px;
  background: transparent;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}

[data-theme="dark"] .view-header {
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.view-controls {
  padding: 10px 24px;
  background: transparent;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}

[data-theme="dark"] .view-controls {
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.calendar-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.calendar-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 16px 24px 12px 24px;
  background: transparent;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}

[data-theme="dark"] .calendar-header {
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.header-left h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: var(--text-primary);
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

/* ===========================
   Calendar Controls & Filters
   =========================== */
.calendar-controls {
  padding: 10px 24px;
  background: transparent;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}

[data-theme="dark"] .calendar-controls {
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.controls-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.filters-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-label {
  font-size: 12px;
  font-weight: 600;
  color: #7f8c8d;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-right: 8px;
}

.filter-btn {
  min-width: 100px;
  background: #e8f5e8 !important;
  color: #4a7c4a !important;
  border: 1px solid #6b9b6b !important;
}

.filter-btn:hover {
  background: #d4ead4 !important;
  border-color: #5a8a5a !important;
}

[data-theme="dark"] .filter-btn {
  background: rgba(90, 122, 155, 0.2) !important;
  color: #7b92d1 !important;
  border: 1px solid #5a7a9b !important;
}

[data-theme="dark"] .filter-btn:hover {
  background: rgba(90, 122, 155, 0.3) !important;
  border-color: #7b92d1 !important;
}

/* Add Task button - force green in light mode, blue in dark mode */
:deep(.v-btn[prepend-icon="mdi-plus"]) {
  background: #6b9b6b !important;
  color: white !important;
  border: none !important;
}

:deep(.v-btn[prepend-icon="mdi-plus"]:hover) {
  background: #5a8a5a !important;
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(107, 155, 107, 0.3) !important;
}

[data-theme="dark"] :deep(.v-btn[prepend-icon="mdi-plus"]) {
  background: #5a7a9b !important;
  color: white !important;
}

[data-theme="dark"] :deep(.v-btn[prepend-icon="mdi-plus"]:hover) {
  background: #4a6a8b !important;
  box-shadow: 0 2px 6px rgba(90, 122, 155, 0.3) !important;
}

.reset-btn {
  color: #666;
}

.filter-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 8px 24px;
  background: transparent;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}

[data-theme="dark"] .filter-chips {
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.filter-chip {
  background: rgba(0, 0, 0, 0.05);
  color: var(--text-primary);
}

[data-theme="dark"] .filter-chip {
  background: rgba(255, 255, 255, 0.1);
}

/* Custom Filter Dropdowns */
.custom-filter-dropdown {
  position: fixed;
  z-index: 1000;
  min-width: 250px;
  background: var(--bg-primary);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border: 1px solid rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

[data-theme="dark"] .custom-filter-dropdown {
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.dropdown-header {
  padding: 16px 20px 12px 20px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}

[data-theme="dark"] .dropdown-header {
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.dropdown-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.dropdown-body {
  padding: 8px 0;
}

.search-input {
  width: 100%;
  padding: 8px 16px;
  border: none;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  outline: none;
  font-size: 14px;
  box-sizing: border-box;
  background: transparent;
  color: var(--text-primary);
}

[data-theme="dark"] .search-input {
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.filter-options-list {
  max-height: 200px;
  overflow-y: auto;
}

.filter-option-item {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  cursor: pointer;
  transition: background-color 0.2s;
  user-select: none;
}

.filter-option-item:hover {
  background-color: rgba(0, 0, 0, 0.04);
}

[data-theme="dark"] .filter-option-item:hover {
  background-color: rgba(255, 255, 255, 0.05);
}

.custom-checkbox {
  width: 16px;
  height: 16px;
  margin-right: 8px;
  cursor: pointer;
  accent-color: #1976d2;
}

.option-text {
  flex: 1;
  font-size: 14px;
  color: var(--text-primary);
}

.dropdown-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 20px 16px 20px;
  border-top: 1px solid rgba(0, 0, 0, 0.08);
}

[data-theme="dark"] .dropdown-footer {
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

/* ===========================
   Calendar Navigation
   =========================== */
.calendar-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 24px;
  background: transparent;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  position: relative;
}

[data-theme="dark"] .calendar-nav {
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.nav-arrow-left,
.nav-arrow-right {
  flex-shrink: 0;
}

.nav-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1;
}

.period-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  text-align: center;
  white-space: nowrap;
}

.view-toggle {
  gap: 4px;
  background: transparent !important;
  box-shadow: none !important;
  display: inline-flex !important;
  width: auto !important;
}

.view-btn {
  margin: 0 !important;
  padding: 8px 20px !important;
  font-size: 13px !important;
  height: 36px !important;
  min-width: 95px !important;
  max-width: 95px !important;
  transition: all 0.3s ease !important;
  white-space: nowrap !important;
  overflow: visible !important;
}

.view-toggle .v-btn--active {
  background: #6b9b6b !important;
  color: white !important;
}

.view-toggle .v-btn:not(.v-btn--active) {
  background: #e8f5e8 !important;
  color: #4a7c4a !important;
}

[data-theme="dark"] .view-toggle .v-btn--active {
  background: #5a7a9b !important;
  color: white !important;
}

[data-theme="dark"] .view-toggle .v-btn:not(.v-btn--active) {
  background: rgba(90, 122, 155, 0.2) !important;
  color: #7b92d1 !important;
}

/* ===========================
   Month Calendar Grid
   =========================== */
.calendar-grid {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.calendar-header-row {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  background: transparent;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}

[data-theme="dark"] .calendar-header-row {
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
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
  grid-auto-rows: minmax(100px, auto);
  overflow-y: auto;
  max-height: calc(100vh - 320px);
}

.calendar-day {
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-top: none;
  border-left: none;
  padding: 8px 6px;
  background: transparent;
  cursor: pointer;
  transition: background-color 0.2s ease;
  overflow-y: auto;
  min-height: 100px;
  max-height: 140px;
}

[data-theme="dark"] .calendar-day {
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-top: none;
  border-left: none;
}

.calendar-day:hover {
  background: rgba(0, 0, 0, 0.02);
}

[data-theme="dark"] .calendar-day:hover {
  background: rgba(255, 255, 255, 0.03);
}

.today {
  background: rgba(33, 150, 243, 0.08) !important;
}

.other-month {
  background: transparent;
  opacity: 0.4;
}

.weekend {
  background: rgba(0, 0, 0, 0.01);
}

[data-theme="dark"] .weekend {
  background: rgba(255, 255, 255, 0.02);
}

.day-number {
  font-weight: 600;
  margin-bottom: 4px;
  font-size: 11px;
  color: var(--text-primary);
}

.day-tasks {
  display: flex;
  flex-direction: column;
  gap: 3px;
  max-height: calc(100% - 24px);
  overflow-y: auto;
}

.day-tasks::-webkit-scrollbar {
  width: 4px;
}

.day-tasks::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
}

.task-item {
  background: rgba(0, 0, 0, 0.03);
  border-radius: 6px;
  padding: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  border-left: 3px solid #ccc;
  font-size: 10px;
  min-height: 28px;
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

[data-theme="dark"] .task-item {
  background: rgba(255, 255, 255, 0.05);
}

.task-item:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.task-ongoing {
  border-left-color: #8acbff;
  background: rgba(33, 150, 243, 0.1);
}

.task-completed {
  border-left-color: #9cf99f;
  background: rgba(76, 175, 80, 0.1);
  opacity: 0.8;
}

.task-pending-review {
  border-left-color: hsl(36, 82%, 78%);
  background: rgba(255, 152, 0, 0.1);
}

.task-unassigned {
  border-left-color: #f79595;
  background: rgba(158, 158, 158, 0.1);
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
  color: var(--text-primary);
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

/* ===========================
   Week Calendar View
   =========================== */
.weekly-view {
  flex: 1;
  overflow: hidden;
  background: transparent;
  display: flex;
  flex-direction: column;
  height: calc(100vh - 250px);
}

.week-container {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  height: 100%;
  gap: 12px;
  background: transparent;
  padding: 12px;
}

[data-theme="dark"] .week-container {
  background: rgba(255, 255, 255, 0.08);
}

.week-day-column {
  background: var(--bg-secondary);
  display: flex;
  flex-direction: column;
  min-height: 100%;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.today-column {
  background: rgba(33, 150, 243, 0.03);
}

.weekend-column {
  background: rgba(0, 0, 0, 0.01);
}

[data-theme="dark"] .weekend-column {
  background: rgba(255, 255, 255, 0.02);
}

.week-day-header {
  padding: 12px 8px;
  border-bottom: 2px solid rgba(0, 0, 0, 0.08);
  text-align: center;
  background: transparent;
  min-height: 60px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 4px;
}

[data-theme="dark"] .week-day-header {
  border-bottom: 2px solid rgba(255, 255, 255, 0.08);
}

.today-column {
  background: var(--bg-secondary);
  box-shadow: 0 4px 12px rgba(33, 150, 243, 0.15);
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
  color: var(--text-primary);
}

.today-number {
  color: #2196f3;
  background: var(--bg-primary);
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
  background: rgba(0, 0, 0, 0.03);
  border-radius: 8px;
  padding: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  border-left: 4px solid #ccc;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

[data-theme="dark"] .week-task-item {
  background: rgba(255, 255, 255, 0.05);
}

.week-task-item:hover {
  transform: translateY(-1px);
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.1);
}

.week-task-item.task-ongoing {
  border-left-color: #2196f3;
  background: rgba(33, 150, 243, 0.1);
}

.week-task-item.task-completed {
  border-left-color: #4caf50;
  background: rgba(76, 175, 80, 0.1);
  opacity: 0.8;
}

.week-task-item.task-pending-review {
  border-left-color: #ff9800;
  background: rgba(255, 152, 0, 0.1);
}

.week-task-item.task-unassigned {
  border-left-color: #9e9e9e;
  background: rgba(158, 158, 158, 0.1);
}

.week-task-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.week-task-title {
  font-weight: 500;
  font-size: 14px;
  color: var(--text-primary);
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
  color: white !important;
  border: none !important;
  background: #6b9b6b !important;
  font-weight: 500 !important;
}

.add-task-btn:hover {
  background: #5a8a5a !important;
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(107, 155, 107, 0.3) !important;
}

[data-theme="dark"] .add-task-btn {
  background: #5a7a9b !important;
}

[data-theme="dark"] .add-task-btn:hover {
  background: #4a6a8b !important;
  box-shadow: 0 2px 6px rgba(90, 122, 155, 0.3) !important;
}
/* ===========================
   Date Details Dialog
   =========================== */
.date-details-card {
  background: var(--bg-primary) !important;
}

.date-details-header {
  padding: 20px 24px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}

[data-theme="dark"] .date-details-header {
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
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
  color: var(--text-primary);
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
  color: var(--text-primary);
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
  color: var(--text-primary);
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
  background: transparent !important;
  border: 1px solid rgba(0, 0, 0, 0.08) !important;
  border-left: 4px solid #ccc !important;
}

[data-theme="dark"] .task-card-item {
  border: 1px solid rgba(255, 255, 255, 0.08) !important;
  border-left: 4px solid #ccc !important;
}

.task-card-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1) !important;
}

.task-card-item.task-todo {
  border-left-color: #ff9800 !important;
}

.task-card-item.task-progress {
  border-left-color: #2196f3 !important;
}

.task-card-item.task-done {
  border-left-color: #4caf50 !important;
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
  color: var(--text-primary);
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
  flex-direction: row;
  align-items: center;
  gap: 8px;
}

.detail-icon {
  color: #7f8c8d;
  margin-top: 0;
  align-self: center;
}

.detail-text {
  font-size: 14px;
  color: #5a6c7d;
  line-height: 1.4;
  flex: 1;
  align-self: center;
}

.list-controls {
  padding: 10px 24px;
  background: transparent;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}

[data-theme="dark"] .list-controls {
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.list-controls .controls-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  gap: 16px;
}

.search-wrapper {
  flex: 1;
  max-width: 400px;
  min-width: 250px;
}

.list-controls .search-field {
  width: 100%;
}

.list-controls .sort-select {
  min-width: 180px;
  max-width: 200px;
}

/* ===========================
   Dialog Styles
   =========================== */
.create-task-card,
.task-details-card {
  background: var(--bg-primary) !important;
}

/* ===========================
   Dark Mode
   =========================== */
[data-theme="dark"] .custom-filter-dropdown,
[data-theme="dark"] .custom-dropdown-menu {
  background: var(--bg-primary) !important;
  border-color: rgba(255, 255, 255, 0.1) !important;
}

[data-theme="dark"] .dropdown-header,
[data-theme="dark"] .dropdown-title {
  color: var(--text-primary) !important;
}

[data-theme="dark"] .filter-option-item {
  color: var(--text-primary) !important;
}

[data-theme="dark"] .filter-option-item:hover {
  background-color: rgba(255, 255, 255, 0.05) !important;
}

[data-theme="dark"] .custom-checkbox {
  accent-color: #7b92d1;
}

[data-theme="dark"] .create-task-card,
[data-theme="dark"] .task-details-card,
[data-theme="dark"] .date-details-card {
  background: var(--bg-primary) !important;
  color: var(--text-primary) !important;
}

[data-theme="dark"] .v-field {
  background: rgba(255, 255, 255, 0.05) !important;
  color: var(--text-primary) !important;
}

[data-theme="dark"] .v-field input,
[data-theme="dark"] .v-field textarea,
[data-theme="dark"] .v-field select {
  color: var(--text-primary) !important;
}

[data-theme="dark"] .v-field__outline {
  border-color: rgba(255, 255, 255, 0.1) !important;
}

/* ===========================
   View Tabs Navigation
   =========================== */
.view-toggle-left {
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}

[data-theme="dark"] .view-toggle-left {
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.view-tabs {
  display: flex;
  gap: 32px;
  padding: 0;
  margin: 0;
  border: none;
  background: transparent;
}

.view-tab {
  all: unset;
  padding: 14px 0;
  font-size: 14px;
  font-weight: 500;
  color: #8b95a0;
  cursor: pointer;
  position: relative;
  box-sizing: border-box;
  border-bottom: 3px solid transparent;
}

.view-tab:hover {
  color: #4a5568;
}

.view-tab.active {
  color: #1a202c;
  border-bottom-color: #6b9b6b;
}

[data-theme="dark"] .view-tab.active {
  color: #f7fafc;
  border-bottom-color: #5a7a9b;
}
</style>