<template>
  <div class="tasks-container">
    <div class="content-layout">
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
                <v-chip 
                  v-if="task.recurrence && task.recurrence.enabled"
                  color="purple"
                  size="x-small"
                  class="recurring-badge"
                >
                  Recurring
                </v-chip>
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
                <v-chip 
                  v-if="task.recurrence && task.recurrence.enabled"
                  color="purple"
                  size="x-small"
                  class="recurring-badge"
                >
                  Recurring
                </v-chip>
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
                <v-chip 
                  v-if="task.recurrence && task.recurrence.enabled"
                  color="purple"
                  size="x-small"
                  class="recurring-badge"
                >
                  Recurring
                </v-chip>
              </div>
            </div>
          </div>
        </div>

        <div v-if="!upcomingSidebarOpen" class="collapsed-content">
          <v-icon size="24" class="collapsed-icon">mdi-clock-outline</v-icon>
        </div>
      </div>
      

      <div class="main-view-area">
        <div class="view-header">
          <div class="header-left">
            <h1>Good Morning, {{ currentUser?.name || 'User' }}!</h1>
            <p class="date-subtitle">It's Friday, 17 October 2025</p>
          </div>
          
          <div class="header-right">
            <v-btn
              color="primary"
              prepend-icon="mdi-plus"
              @click="showCreateDialog = true"
              rounded="lg"
              class="add-task-btn"
            >
              Add Task
            </v-btn>
            <v-menu v-model="menu" :close-on-content-click="false" offset-y>
              <template #activator="{ props }">
                <v-btn icon v-bind="props" variant="text" class="triple-dot-btn">
                  <v-icon>mdi-dots-vertical</v-icon>
                </v-btn>
              </template>
              <v-list>
                <v-list-item @click="showArchived = true">
                  <v-list-item-title>Archived Tasks</v-list-item-title>
                  <ArchivedTasks :show="showArchived" @close="showArchived = false" />
                </v-list-item>
              </v-list>
            </v-menu>
          </div>
        </div>

        <div class="view-controls">
          <div class="controls-row">
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
                <v-btn @click="closeAllFilterMenus" variant="outlined">Close</v-btn>
                <v-btn @click="applyDepartmentFilter" color="primary">Apply</v-btn>
              </div>
            </div>

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
                <v-btn @click="closeAllFilterMenus" variant="outlined">Close</v-btn>
                <v-btn @click="applyPriorityFilter" color="primary">Apply</v-btn>
              </div>
            </div>

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
                <v-btn @click="closeAllFilterMenus" variant="outlined">Close</v-btn>
                <v-btn @click="applyAssigneeFilter" color="primary">Apply</v-btn>
              </div>
            </div>
          </div>
        </div>

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
                    :class="getTaskStatusClass(task.status, task.dueDate)" 
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
                  :class="getTaskStatusClass(task.status, task.dueDate)"
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

      <TimelineView
          v-else-if="viewType === 'timeline'"
          :tasks="filteredTasksList"
          :task-statuses="taskStatuses"
          @view-task-details="viewTaskDetails"
          @add-task="showCreateDialog = true"
        />

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
          
    </div>

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
      @archive="archiveTask"
    />

    <CreateTaskDialogue
      v-model="showCreateDialog"
      :model="newTask"
      :isEditing="isEditing"
      :taskStatuses="taskStatuses"
      :priorities="priorities"
      :projects="projects"
      :teamMembers="teamMembers"
      :todayDate="todayDate"
      :currentUser="currentUser"  
      @save="isEditing ? updateTask(newTask.id, $event) : handleCreateSave($event)"
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
import TimelineView from './Timeline.vue'
import ListView from './ListView.vue'
import ArchivedTasks from '../components/ArchivedTasks.vue'
import { useAuthStore } from '@/stores/auth'; // Import your auth store
import { projectService } from '@/services/projectService'  // ADD THIS LINE

// Axios client configuration (this is correct)
const axiosClient = axios.create({
    baseURL: 'http://localhost:3000', 
    headers: {
        'Content-Type': 'application/json',
    },
});

// Axios interceptor to send the token (this is correct)
axiosClient.interceptors.request.use(config => {
  const token = localStorage.getItem('firebaseIdToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, error => {
  return Promise.reject(error);
});

// Get an instance of the auth store (this is correct)
const authStore = useAuthStore();

// Create computed properties for user data
const currentUser = computed(() => authStore.userData);
const userDepartment = computed(() => authStore.userData?.department); 

// 🌟 ADDED: Computed property for the current date format (for the header)
const currentFormattedDate = computed(() => {
  const date = new Date();
  const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });
  const datePart = date.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
  return `${dayOfWeek}, ${datePart}`; 
});

const tasks = ref([]) // This will hold ALL tasks from the backend
const projects = ref([]) // Will hold projects from Firebase
const loadingProjects = ref(false)

// --- 1. THIS IS THE NEW CENTRAL FILTER (FIXED) ---
// This computed property returns only the tasks that the current user should see.
const userVisibleTasks = computed(() => {
  if (!currentUser.value || !currentUser.value.name) {
    // If there's no user logged in, show no tasks.
    return [];
  }
  
  const userName = currentUser.value.name;
  // Access the user's role from the auth store
  const userRole = authStore.userRole; 
  
  // 💥 FIX: Define the local alias 'currentDept' here by accessing the global computed ref's value
  const currentDept = userDepartment.value; 

  // RBAC: HR role can see all tasks (Override logic)
  if (userRole === 'hr' || userRole === 'director') {
    return tasks.value; 
  }

  // Standard visibility logic for Staff, Manager, Director, etc.
  return tasks.value.filter(task => {
    // Check if the user is the task owner
    const isOwner = task.taskOwner === userName;
    
    // Check if the user is the assignee
    const isAssignee = task.assignedTo === userName;

    // Check if the user is a collaborator
    const isCollaborator = Array.isArray(task.collaborators) && 
                           task.collaborators.some(c => c.name === userName);

    // 🌟 UPDATED CHECK: Task is visible if its owner's department matches the user's department
    const isDepartmentTask = currentDept && task.taskOwnerDepartment === currentDept;

    // The task is visible if ANY of these conditions are true
    return isOwner || isAssignee || isCollaborator || isDepartmentTask;
  });
});


// --- 2. ALL OTHER COMPUTED PROPERTIES ARE NOW UPDATED ---
// They now use 'userVisibleTasks' as their starting point instead of the raw 'tasks' list.

const todayTasks = computed(() => {
  const today = new Date().toISOString().split('T')[0];
  const filtered = userVisibleTasks.value.filter(task => task.dueDate === today && task.status !== 'Completed');
  return filterTasks(filtered); // Applies secondary filters like priority, etc.
})

const weekTasks = computed(() => {
  const today = new Date();
  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 7);
  const filtered = userVisibleTasks.value.filter(task => {
    if (!task.dueDate || task.status === 'Completed') return false;
    const taskDate = new Date(task.dueDate);
    return taskDate > today && taskDate <= nextWeek;
  });
  return filterTasks(filtered);
})

const overdueTasks = computed(() => {
  const today = new Date().toISOString().split('T')[0];
  const filtered = userVisibleTasks.value.filter(task => task.dueDate && task.dueDate < today && task.status !== 'Completed');
  return filterTasks(filtered);
})

const filteredTasksList = computed(() => {
  // The list view should show only visible tasks, plus any other active filters
  return filterTasks(userVisibleTasks.value);
})


// --- 3. THE 'getTasksForDate' FUNCTION IS ALSO UPDATED ---
const getTasksForDate = (dateKey) => {
  let items = [];
  // We iterate over the pre-filtered visible tasks list
  userVisibleTasks.value.forEach(task => {
    const taskDate = task.dueDate?.split('T')[0];
    if (task.subtasks && task.subtasks.length > 0) {
      const hasMatchingSubtask = task.subtasks.some(sub => sub.dueDate?.split('T')[0] === dateKey);
      if (taskDate === dateKey || hasMatchingSubtask) items.push(task);
      task.subtasks.forEach((subtask, index) => {
        if (subtask.dueDate?.split('T')[0] === dateKey) {
          items.push({ ...subtask, id: `${task.id}-subtask-${index}`, isSubtask: true, parentTask: task });
        }
      });
    } else if (taskDate === dateKey) {
      items.push(task);
    }
  });
  // Secondary filters (priority, etc.) are still applied at the end
  return filterTasks(items);
}


// --- The rest of your script setup remains unchanged ---
const viewMode = ref('month')
const currentDate = ref(new Date())
const viewType = ref('calendar')
const currentView = ref('list') 
const viewTabs = [
  { label: 'Calendar', value: 'calendar' },
  { label: 'Task List', value: 'list' },
  { label: 'Timeline', value: 'timeline' },
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
const teamMembers = [
    // Ensure all departments are capitalized or consistently formatted (e.g., 'HR' not 'hr')
    { text: 'John Doe', value: 'John Doe', department: 'Engineering' },
    { text: 'Michael Brown', value: 'Michael Brown', department: 'Engineering' },
    { text: 'Sally Loh', value: 'Sally Loh', department: 'HR' },
    { text: 'Alice Johnson', value: 'Alice Johnson', department: 'Marketing' },
    { text: 'Jack Sim', value: 'Jack Sim', department: 'Management' },
    { text: 'Jane Smith', value: 'Jane Smith', department: 'Engineering' }
];

const departments = ['Engineering', 'Marketing', 'Sales', 'HR', 'Finance', 'Operations']
const departmentFilterOptions = departments.map(dept => ({ title: dept, value: dept }))

const menu = ref(false)
const showArchived = ref(false)

const newTask = ref({
  title: '',
  description: '',
  dueDate: '',
  assignedTo: '',
  collaborators: [],
  status: 'Ongoing',
  attachments: [],
  startTime: '',
  endTime: '',
  projectId: null
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
  // Load projects first
  await loadProjects()
  
  // Try to load tasks from backend
  try {
    console.log('📤 Fetching tasks from backend...')
    const response = await axiosClient.get('/tasks');
    console.log('✅ Backend response:', response.data)
    
    const uniqueTasks = response.data.filter((task, index, self) =>
      index === self.findIndex(t => t.id === task.id)
    );
    
    tasks.value = uniqueTasks.map(task => ({
      ...task,
      recurrence: task.recurrence || { enabled: false }
    }));
    
    console.log('✅ Loaded tasks:', tasks.value.length)
    showMessage(`Loaded ${tasks.value.length} tasks`, 'success');
    
  } catch (error) {
    console.error('❌ Error loading tasks:', error)
    console.error('❌ Error details:', error.response?.data)
    
    // Show user-friendly error
    if (error.response?.status === 400) {
      showMessage('Backend filtering error. Check console for details.', 'error');
    } else if (error.response?.status === 403) {
      showMessage('Permission denied. You may not have access to tasks.', 'error');
    } else {
      showMessage('Failed to load tasks. You may need to log in.', 'error');
    }
  }
});

// Load projects from Firebase
const loadProjects = async () => {
  loadingProjects.value = true
  try {
    const fetchedProjects = await projectService.getAllProjects(
      authStore.userEmail,
      authStore.userRole,
      authStore.userData?.department
    )
    
    // Format projects for dropdown (id and name)
    projects.value = fetchedProjects.map(p => ({
      title: p.name,  // Display name
      value: p.id     // Store ID
    }))
    
    console.log('📦 Loaded projects for tasks:', projects.value)
  } catch (error) {
    console.error('Error loading projects:', error)
    showMessage('Failed to load projects: ' + error.message, 'error')
  } finally {
    loadingProjects.value = false
  }
}

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

const isTaskOverdue = (dueDate, status) => {
  if (status === 'Completed' || !dueDate) return false;
  const now = new Date();
  const todayDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dueDateOnly = new Date(dueDate);
  return dueDateOnly < todayDateOnly;
};

const filterTasks = (taskArray) => {
    let filtered = taskArray;
    if (selectedPriorities.value.length > 0) {
        filtered = filtered.filter(task => selectedPriorities.value.includes(task.priority));
    }
    if (selectedAssignees.value.length > 0) {
        filtered = filtered.filter(task => selectedAssignees.value.includes(task.assignedTo));
    }
    if (selectedDepartments.value.length > 0) {
        filtered = filtered.filter(task => selectedDepartments.value.includes(task.department));
    }
    return filtered;
}

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
    ...selectedDepartments.value.map(d => ({ key: `department-${d}`, label: d, type: 'department', value: d })),
    ...selectedPriorities.value.map(p => ({ key: `priority-${p}`, label: priorityFilterOptions.find(o => o.value === p)?.title || p, type: 'priority', value: p })),
    ...selectedAssignees.value.map(a => ({ key: `assignee-${a}`, label: assigneeFilterOptions.find(o => o.value === a)?.title || a, type: 'assignee', value: a }))
  ]
})

const validateDueDate = (dateString) => {
  if (!dateString) return true;
  const selectedDate = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return selectedDate >= today;
}

const handleCreateSave = async (taskData) => {
  try {
    const response = await axiosClient.post('/tasks', taskData);
    const newTaskId = response.data.id;
    const newTaskWithId = {
      ...taskData,
      id: newTaskId,
      statusHistory: [{ timestamp: new Date().toISOString(), oldStatus: null, newStatus: taskData.status || 'Ongoing' }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    tasks.value = tasks.value.filter(t => t.id !== newTaskId);
    tasks.value.push(newTaskWithId);
    showMessage('Task created successfully!', 'success');
  } catch (error) {
    showMessage(error.response?.data?.message || 'Failed to create task.', 'error');
  }
};

const updateTask = async (taskId, updatedData) => {
  try {
    if (updatedData.dueDate && !validateDueDate(updatedData.dueDate)) {
      showMessage('Cannot set due date in the past', 'error');
      return false;
    }
    if (updatedData.attachments && updatedData.attachments.length > 0) {
      updatedData.attachments = await uploadFiles(updatedData.attachments);
    }
    const backendData = JSON.parse(JSON.stringify({ ...updatedData, collaborators: updatedData.collaborators || [] }));
    await axiosClient.put(`/tasks/${taskId}`, backendData);
    tasks.value = tasks.value.filter(t => t.id !== taskId);
    const updatedTask = { ...updatedData, id: taskId, updatedAt: new Date().toISOString() };
    tasks.value.push(updatedTask);
    if (selectedTask.value?.id === taskId) selectedTask.value = updatedTask;
    if (selectedListTask.value?.id === taskId) selectedListTask.value = updatedTask;
    showMessage('Task updated successfully!', 'success');
    return true;
  } catch (error) {
    showMessage(error.response?.data?.message || 'Failed to update task', 'error');
    return false;
  }
};

const archiveTask = async (taskId) => {
  try {
    await axiosClient.put(`/tasks/${taskId}/archive`);
    tasks.value = tasks.value.filter(task => task.id !== taskId);
    showMessage('Task archived successfully!', 'success');
    showDetailsDialog.value = false;
  } catch (error) {
    showMessage(error.response?.data?.message || 'Failed to archive task', 'error');
  }
}

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
    if (await updateTask(newTask.value.id, updatedData)) {
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
    const processedSubtasks = subtasks.value.map(subtask => ({ ...subtask }));
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
    const newTaskWithId = { 
        ...taskData, 
        id: response.data.id,
        statusHistory: [{ timestamp: new Date().toISOString(), oldStatus: null, newStatus: taskData.status }],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };
    tasks.value.push(newTaskWithId);
    showMessage('Task created successfully!', 'success');
    showCreateDialog.value = false;
    resetForm();
  } catch (error) {
    showMessage(error.response?.data?.message || 'Failed to connect to server or save task.', 'error');
  }
}

const changeTaskStatus = async (payload) => {
    const taskId = payload.taskId;
    const newStatus = payload.status; 
    if (!taskId || typeof taskId !== 'string' || taskId.includes('subtask')) {
        showMessage('Failed to update: Task ID is invalid or missing.', 'error');
        return;
    }
    const task = tasks.value.find(t => t.id === taskId);
    if (!task) {
        showMessage('Task not found in local data.', 'error');
        return;
    }
    const oldStatus = task.status;
    if (oldStatus === newStatus) return;
    if (task.isSubtask) {
        showMessage('Subtask status is managed through the parent task details.', 'info');
        return;
    }
    try {
        await axiosClient.put(`/tasks/${taskId}/status`, { status: newStatus }); 
        const taskIndex = tasks.value.findIndex(t => t.id === taskId);
        if (taskIndex !== -1) {
          const taskData = tasks.value[taskIndex];
          const statusHistory = [...(taskData.statusHistory || []), { timestamp: new Date().toISOString(), oldStatus: oldStatus, newStatus: newStatus }];
          tasks.value[taskIndex] = { ...taskData, status: newStatus, statusHistory, updatedAt: new Date().toISOString() };
          selectedTask.value = tasks.value[taskIndex];
          selectedListTask.value = tasks.value[taskIndex];
        }
        showMessage('Task status updated!', 'success');
    } catch (error) {
        showMessage(error.response?.data?.message || 'Failed to update task status on server.', 'error');
    }
};

const toggleUpcomingSidebar = () => {
  upcomingSidebarOpen.value = !upcomingSidebarOpen.value
}

const formatTime = (dateString) => {
  if (!dateString) return ''
  return new Date(dateString).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
}

const formatShortDate = (dateString) => {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString([], {month: 'short', day: 'numeric'})
}

const getCurrentPeriodTitle = () => {
  if (viewMode.value === 'week') {
    const startOfWeek = weekDates.value[0]?.date;
    const endOfWeek = weekDates.value[6]?.date;
    if (startOfWeek && endOfWeek) {
      return `${startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }
  }
  return currentDate.value.toLocaleString('default', { month: 'long', year: 'numeric' });
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

const getTaskStatusClass = (status, dueDate) => {
  if (isTaskOverdue(dueDate, status)) return 'task-overdue'; 
  return {
    'task-ongoing': status === 'Ongoing',
    'task-pending': status === 'Pending Review', 
    'task-unassigned': status === 'Unassigned', 
    'task-completed': status === 'Completed'
  }
}

const getStatusColor = (status) => {
  return { 'Ongoing': 'blue', 'Completed': 'green', 'Pending Review': 'orange', 'Unassigned': 'grey' }[status] || 'grey';
}

const formatDate = (dateString) => dateString ? new Date(dateString).toLocaleDateString() : '';
const formatDateTime = (dateString) => dateString ? new Date(dateString).toLocaleString() : '';

const viewTaskDetails = (task) => {
  selectedTask.value = task;
  showDetailsDialog.value = true;
  showDateDetailsDialog.value = false;
}

const openAttachment = (url) => window.open(url, '_blank');

const editTask = (task) => {
  newTask.value = { ...task, collaborators: task.collaborators || [], attachments: task.attachments || [], status: task.status || 'Ongoing', statusHistory: task.statusHistory || [] };
  subtasks.value = task.subtasks ? [...task.subtasks] : [];
  subtasks.value.forEach(sub => {
    sub.statusHistory = sub.statusHistory || [];
    sub.collaborators = sub.collaborators || [];
    sub.attachments = sub.attachments || [];
  });
  isEditing.value = true;
  showCreateDialog.value = true;
  showDetailsDialog.value = false;
}

const cancelCreate = () => {
  showCreateDialog.value = false;
  isEditing.value = false;
  resetForm();
}

const resetForm = () => {
  newTask.value = { title: '', description: '', dueDate: '', assignedTo: '', collaborators: [], status: 'Ongoing', attachments: [] };
  subtasks.value = [];
  isEditing.value = false;
}

const addSubtask = () => {
  subtasks.value.push({ title: '', description: '', status: 'Unassigned', priority: 1, assignedTo: '', collaborators: [], dueDate: '', attachments: [] });
}

const showMessage = (message, color = 'success') => {
  snackbarMessage.value = message;
  snackbarColor.value = color;
  showSnackbar.value = true;
}

const setupFilterMenu = (menuState, btnRef, topRef, leftRef, clickOutsideHandler) => {
    if (menuState.value) {
        menuState.value = false;
        document.removeEventListener('click', clickOutsideHandler);
    } else {
        closeAllFilterMenus();
        nextTick(() => {
            if (btnRef.value) {
                const rect = btnRef.value.$el.getBoundingClientRect();
                topRef.value = rect.bottom + 4;
                leftRef.value = rect.left;
            }
            menuState.value = true;
            nextTick(() => document.addEventListener('click', clickOutsideHandler));
        });
    }
}

const closeAllFilterMenus = () => {
    priorityMenuOpen.value = false;
    assigneeMenuOpen.value = false;
    departmentMenuOpen.value = false;
    document.removeEventListener('click', handlePriorityClickOutside);
    document.removeEventListener('click', handleAssigneeClickOutside);
    document.removeEventListener('click', handleDepartmentClickOutside);
}

const togglePriorityMenu = () => {
    tempSelectedPriorities.value = [...selectedPriorities.value];
    searchPriority.value = '';
    setupFilterMenu(priorityMenuOpen, priorityBtnRef, priorityDropdownTop, priorityDropdownLeft, handlePriorityClickOutside);
}
const handlePriorityClickOutside = (event) => {
    if (priorityDropdownRef.value && !priorityDropdownRef.value.contains(event.target)) closeAllFilterMenus();
}
const applyPriorityFilter = () => {
    selectedPriorities.value = [...tempSelectedPriorities.value];
    closeAllFilterMenus();
}
const togglePriority = (value) => {
    const index = tempSelectedPriorities.value.indexOf(value);
    if (index > -1) tempSelectedPriorities.value.splice(index, 1);
    else tempSelectedPriorities.value.push(value);
}

const toggleAssigneeMenu = () => {
    tempSelectedAssignees.value = [...selectedAssignees.value];
    searchAssignee.value = '';
    setupFilterMenu(assigneeMenuOpen, assigneeBtnRef, assigneeDropdownTop, assigneeDropdownLeft, handleAssigneeClickOutside);
}
const handleAssigneeClickOutside = (event) => {
    if (assigneeDropdownRef.value && !assigneeDropdownRef.value.contains(event.target)) closeAllFilterMenus();
}
const applyAssigneeFilter = () => {
    selectedAssignees.value = [...tempSelectedAssignees.value];
    closeAllFilterMenus();
}
const toggleAssignee = (value) => {
    const index = tempSelectedAssignees.value.indexOf(value);
    if (index > -1) tempSelectedAssignees.value.splice(index, 1);
    else tempSelectedAssignees.value.push(value);
}

const toggleDepartmentMenu = () => {
    tempSelectedDepartments.value = [...selectedDepartments.value];
    searchDepartment.value = '';
    setupFilterMenu(departmentMenuOpen, departmentBtnRef, departmentDropdownTop, departmentDropdownLeft, handleDepartmentClickOutside);
}
const handleDepartmentClickOutside = (event) => {
    if (departmentDropdownRef.value && !departmentDropdownRef.value.contains(event.target)) closeAllFilterMenus();
}
const applyDepartmentFilter = () => {
    selectedDepartments.value = [...tempSelectedDepartments.value];
    closeAllFilterMenus();
}
const toggleDepartment = (value) => {
    const index = tempSelectedDepartments.value.indexOf(value);
    if (index > -1) tempSelectedDepartments.value.splice(index, 1);
    else tempSelectedDepartments.value.push(value);
}

const removeFilter = (filter) => {
    if (filter.type === 'department') selectedDepartments.value = selectedDepartments.value.filter(d => d !== filter.value);
    else if (filter.type === 'priority') selectedPriorities.value = selectedPriorities.value.filter(p => p !== filter.value);
    else selectedAssignees.value = selectedAssignees.value.filter(a => a !== filter.value);
}

const resetFilters = () => {
    selectedPriorities.value = [];
    selectedAssignees.value = [];
    selectedDepartments.value = [];
}

const uploadFiles = async (files) => {
    if (!files || files.length === 0) return [];
    const urls = [];
    for (const file of files) {
        try {
            const fileRef = storageRef(storage, `attachments/${Date.now()}_${file.name}`);
            await uploadBytes(fileRef, file);
            const url = await getDownloadURL(fileRef);
            urls.push({ name: file.name, url });
        } catch (error) {
            showMessage(`Failed to upload ${file.name}`, 'error');
        }
    }
    return urls;
}

const truncateTaskTitle = (title) => title.length > 20 ? title.substring(0, 20) + '...' : title;

const handleSelectTask = (task) => {
  selectedListTask.value = task;
  selectedTaskId.value = task?.id || null;
}

const handleListStatusChange = (payload) => {
  if (!payload.taskId) {
      showMessage('Update failed: Task ID is missing.', 'error');
      return;
  }
  changeTaskStatus({ taskId: payload.taskId, status: payload.status });
}

const handleBulkUpdateStatus = async (taskIds) => {
  const newStatus = prompt('Enter new status (Ongoing, Completed, Pending Review, Unassigned):');  
  if (newStatus && taskStatuses.includes(newStatus)) {
    try {
      for (const taskId of taskIds) {
        await changeTaskStatus({ taskId, status: newStatus });
      }
      showMessage(`Updated ${taskIds.length} task(s)`, 'success');
    } catch (error) {
      showMessage('Failed to update some tasks', 'error');
    }
  } else {
    showMessage('Invalid status selected', 'error');
  }
}

const handleBulkDelete = async (taskIds) => {
  try {
    for (const taskId of taskIds) {
      await axiosClient.delete(`/tasks/${taskId}`);
      const index = tasks.value.findIndex(t => t.id === taskId);
      if (index > -1) tasks.value.splice(index, 1);
    }
    showMessage(`Deleted ${taskIds.length} task(s)`, 'success');
    selectedListTask.value = null;
  } catch (error) {
    showMessage('Failed to delete some tasks', 'error');
  }
}

const handleMessage = ({ message, color }) => showMessage(message, color);

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
  position: relative;
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

/* Recurring Badge in Sidebar */
.recurring-badge {
  position: absolute;
  bottom: 8px;
  right: 8px;
  font-size: 9px !important;
  height: 16px !important;
  padding: 0 6px !important;
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
  align-items: center;
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
  flex-shrink: 0;
  min-width: 0;
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

/* Find where your other task styles are (e.g., after .upcoming-task.overdue) */

/* 🟢 START OF OVERDUE FIXES FOR CALENDAR VIEW */
.task-item.task-overdue,
.week-task-item.task-overdue {
  /* Use dashed border for a softer outline */
  border: 1px dashed var(--v-theme-error, #f44336) !important; 
  /* Force override background color with a light red */
  background-color: var(--v-theme-error-lighten5, #fff5f5) !important; 
  box-shadow: 0 0 5px rgba(244, 67, 54, 0.2);
  
  /* Ensure the left border is always RED and prominent */
  border-left: 4px solid var(--v-theme-error, #f44336) !important; 
  opacity: 1 !important; 
}

[data-theme="dark"] .task-item.task-overdue,
[data-theme="dark"] .week-task-item.task-overdue {
  background-color: rgba(244, 67, 54, 0.15) !important; 
  border: 1px dashed var(--v-theme-error, #f44336) !important;
  border-left: 4px solid var(--v-theme-error, #f44336) !important;
}

/* Text and Chip Styling inside overdue task to make it legible and prominent */
.task-overdue .task-title, 
.task-overdue .week-task-title {
  color: var(--v-theme-error-darken2, #c62828) !important; 
}

.task-overdue .v-chip {
  background-color: var(--v-theme-error, #f44336) !important;
  color: white !important;
  font-weight: bold;
}
/* 🟢 END OF OVERDUE FIXES */


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

.triple-dot-btn {
  background: transparent !important;
  box-shadow: none !important;
  color: #424242 !important;
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