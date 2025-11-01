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
      

      <div class="main-view-area" style="width: 100%;">
        <div class="view-header">
          <div class="header-left" style="flex: 1 1 auto; min-width: 0;">
            <h1>Good Morning, {{ currentUser?.name || 'User' }}!</h1>
            <p class="date-subtitle">It's {{ currentFormattedDate }}</p>
          </div>
          
          <div class="header-right">
            
            <v-btn 
              icon="mdi-repeat" 
              size="default" 
              variant="flat" 
              color="purple-lighten-2" 
              @click="showRecurringTasks = true"
              class="recurring-btn"
              rounded="lg"
              :disabled="!canCreateEdit"
            />
            
            <v-btn 
              icon="mdi-archive-arrow-down-outline" 
              size="default" 
              variant="flat" 
              color="primary-lighten-2" 
              @click="showArchived = true"
              class="archive-btn"
              rounded="lg"
              :disabled="!canCreateEdit"
            />
            
            <v-btn
              color="primary"
              prepend-icon="mdi-plus"
              @click="showCreateDialog = true"
              rounded="lg"
              class="add-task-btn"
              size="default"
              :disabled="!canCreateEdit"
            >
              Add Task
            </v-btn>
            
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
                <div class="filter-count-display" style="font-size: 0.75rem; border-radius: 0; border-top: 1px solid #eee; text-align: center;">
                  Showing {{ departmentFilteredTaskCount }} tasks with current selections
                </div>
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
                <div class="filter-count-display" style="font-size: 0.75rem; border-radius: 0; border-top: 1px solid #eee; text-align: center;">
                  Showing {{ priorityFilteredTaskCount }} tasks with current selections
                </div>
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
                <div class="filter-count-display" style="font-size: 0.75rem; border-radius: 0; border-top: 1px solid #eee; text-align: center;">
                  Showing {{ assigneeFilteredTaskCount }} tasks with current selections
                </div>
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
                    :disabled="!canCreateEdit"
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
        @edit-task="handleEditTask"
        @change-status="handleListStatusChange"
        @view-parent="viewTaskDetails"
        @open-attachment="openAttachment"
        @add-task="showCreateDialog = true"
        @bulk-update-status="canCreateEdit ? handleBulkUpdateStatus : handleReadonlyAction"
        @bulk-delete="canCreateEdit ? handleBulkDelete : handleReadonlyAction"
      />
          
    </div>

    <TaskDetailsDialog
      :show="showDetailsDialog"
      @update:show="showDetailsDialog = $event"
      :model="selectedTask"
      :taskStatuses="taskStatuses"
      :parentTaskProgress="parentTaskProgress"
      @edit="handleEditTask"
      @change-status="changeTaskStatus"
      @view-parent="viewTaskDetails"
      @open-attachment="openAttachment"
      @archive="isTaskEditable(selectedTask) ? archiveTask : handleReadonlyAction"
      :is-read-only="!isTaskEditable(selectedTask)"
    />

    <ArchivedTasks :show="showArchived" @close="showArchived = false" />
    <RecurringTasksSidebar :show="showRecurringTasks" @close="showRecurringTasks = false" />

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
      @save="canCreateEdit ? (isEditing ? updateTask(newTask.id, $event) : handleCreateSave($event)) : handleReadonlyAction"
      @cancel="cancelCreate"
      @message="handleMessage"
      :is-read-only="!canCreateEdit"
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
import RecurringTasksSidebar from '../components/RecurringTasksSidebar.vue'

import { useAuthStore } from '@/stores/auth'; // Import your auth store
// import { projectService } from '@/services/projectService'

// Axios client configuration (this is correct)
const axiosClient = axios.create({
    baseURL: 'http://localhost:3000/api', 
    headers: {
        'Content-Type': 'application/json',
    },
});

// Axios interceptor to send the token (FIXED: use fresh token from auth store)
axiosClient.interceptors.request.use(async (config) => {
  try {
    const { useAuthStore } = await import('/src/stores/auth.js');
    const authStore = useAuthStore();
    const token = await authStore.getToken();
    config.headers.Authorization = `Bearer ${token}`;
  } catch (error) {
    console.error('Failed to get auth token:', error);
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

// 🟢 CORRECTED ROLE CHECKS (General Access & Granular Permission)
const userRole = computed(() => authStore.userRole);
const userEmail = computed(() => authStore.userEmail);
const isHR = computed(() => userRole.value === 'hr');
const isDirector = computed(() => userRole.value === 'director'); 

// General permission to create/edit: true for all roles EXCEPT HR
const canCreateEdit = computed(() => {
    const role = userRole.value;
    return role !== 'hr';
});


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


// 🟢 NEW: Granular Task Edit Permission Check (The Core of the HR rule)
const isTaskEditable = (task) => {
    // If the task is null (i.e., new task being created), check general permission
    if (!task) {
        console.log('🔍 [isTaskEditable] Task is null, checking canCreateEdit:', canCreateEdit.value);
        return canCreateEdit.value; 
    }

    console.log('🔍 [isTaskEditable] Checking permissions:', { 
        userRole: userRole.value, 
        isHR: isHR.value, 
        canCreateEdit: canCreateEdit.value,
        taskOwner: task.taskOwner,
        currentUserEmail: userEmail.value
    });

    // Director/Non-HR roles are governed by canCreateEdit logic (assumed full edit)
    if (!isHR.value) {
        console.log('✅ [isTaskEditable] Non-HR user, editable:', canCreateEdit.value);
        return canCreateEdit.value; 
    }

    // HR-SPECIFIC RULE: Only tasks owned or assigned to HR user are editable.
    const currentUserEmail = userEmail.value;

    // Check against task owner EMAIL (assuming taskOwner stores email)
    const isOwner = (task.taskOwner === currentUserEmail); 
    // Check against assignedTo EMAIL (assuming assignedTo stores email)
    const isAssignee = (task.assignedTo === currentUserEmail);
    
    // Check if the current HR user is in the collaborators with Edit permission
    const isEditor = Array.isArray(task.collaborators) && 
                     task.collaborators.some(c => (c.email || c.name) === currentUserEmail && c.permission === 'Edit');
    
    const isEditable = isOwner || isAssignee || isEditor;
    console.log('✅ [isTaskEditable] HR user, editable:', isEditable, { isOwner, isAssignee, isEditor });
    return isEditable;
};

// 🟢 NEW: Handler for unauthorized edits
const handleReadonlyAction = () => {
    if (isHR.value) {
        showMessage('Permission denied. HR can only edit tasks they own or are assigned to.', 'error');
    } else {
         showMessage('Permission denied. You do not have sufficient rights to modify this task.', 'error');
    }
    // We should ensure the dialog is closed if it was an attempt from the list view
    if(showCreateDialog.value) cancelCreate(); 
    return;
};


// --- TASK VISIBILITY ---
const userVisibleTasks = computed(() => {
  if (!currentUser.value || !currentUser.value.name) {
    console.log('⚠️ [userVisibleTasks] No current user');
    return [];
  }
  
  const userName = currentUser.value.name;
  const userEmailAddr = userEmail.value;
  const userRole = authStore.userRole; 
  const currentDept = userDepartment.value; 

  console.log('🔍 [userVisibleTasks] Filtering for:', { userName, userEmailAddr, userRole, currentDept });
  console.log('🔍 [userVisibleTasks] Total tasks:', tasks.value.length);

  if (userRole === 'director') {
    // Only Director sees all tasks at organizational level
    return tasks.value; 
  }

  if (userRole === 'hr') {
    // HR can view all tasks but cannot edit
    return tasks.value;
  }

  // Manager sees: their own tasks + department tasks + projects they're in
  if (userRole === 'manager') {
    const filtered = tasks.value.filter(task => {
      const isOwner = task.taskOwner === userName || task.taskOwner === userEmailAddr;
      const isAssignee = task.assignedTo === userName || task.assignedTo === userEmailAddr;
      const isCollaborator = Array.isArray(task.collaborators) && 
                             task.collaborators.some(c => (c.name === userName || c.name === userEmailAddr));
      const isDepartmentTask = currentDept && task.taskOwnerDepartment && task.taskOwnerDepartment.toLowerCase() === currentDept.toLowerCase();

      return isOwner || isAssignee || isCollaborator || isDepartmentTask;
    });
    console.log('✅ [userVisibleTasks] Manager filtered:', filtered.length, 'tasks');
    return filtered;
  }

  // Staff sees ONLY tasks they're directly involved in (owner/assignee/collaborator)
  // NO department-level visibility for staff
  const filtered = tasks.value.filter(task => {
    const isOwner = task.taskOwner === userName || task.taskOwner === userEmailAddr;
    const isAssignee = task.assignedTo === userName || task.assignedTo === userEmailAddr;
    const isCollaborator = Array.isArray(task.collaborators) && 
                           task.collaborators.some(c => (c.name === userName || c.name === userEmailAddr));

    return isOwner || isAssignee || isCollaborator;
  });
  console.log('✅ [userVisibleTasks] Staff filtered:', filtered.length, 'tasks');
  return filtered;
});

// --- DYNAMIC FILTER OPTIONS & COUNTS ---

const departmentFilteredTaskCount = computed(() => {
  let filtered = userVisibleTasks.value;
  
  if (tempSelectedDepartments.value.length > 0) {
    filtered = filtered.filter(task => 
      tempSelectedDepartments.value.includes(task.taskOwnerDepartment)
    );
  }
  
  return filtered.length;
});

const priorityFilteredTaskCount = computed(() => {
  let filtered = userVisibleTasks.value;
  
  if (tempSelectedPriorities.value.length > 0) {
    filtered = filtered.filter(task => 
      tempSelectedPriorities.value.includes(task.priority)
    );
  }
  
  return filtered.length;
});

const assigneeFilteredTaskCount = computed(() => {
  let filtered = userVisibleTasks.value;
  
  if (tempSelectedAssignees.value.length > 0) {
    filtered = filtered.filter(task => 
      tempSelectedAssignees.value.includes(task.assignedTo)
    );
  }
  
  return filtered.length;
});

// FIX: Scopes assignee list based on user role/department
const assigneeFilterOptions = computed(() => {
    // 🌟 MODIFIED: Return all team members for the filter list, 
    // allowing the search input to handle large lists.
    return teamMembers.map(member => ({ 
        title: member.text, 
        value: member.value,
        department: member.department 
    }));
});


// --- TASK LISTS ---
const todayTasks = computed(() => {
  const today = new Date().toISOString().split('T')[0];
  const filtered = userVisibleTasks.value.filter(task => task.dueDate === today && task.status !== 'Completed');
  return filterTasks(filtered); 
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
  return filterTasks(userVisibleTasks.value);
})


const getTasksForDate = (dateKey) => {
  let items = [];
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
  return filterTasks(items);
}


// --- CORE FILTERS & DATA ---
const viewMode = ref('month')
const currentDate = ref(new Date())
const viewType = ref('calendar')
const currentView = ref('list') 
const viewTabs = [
  { label: 'Calendar', value: 'calendar' },
  { label: 'Task List', value: 'list' },
  { label: 'Timeline', value: 'timeline' }
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
    { text: 'John Doe', value: 'john.doe@company.com', department: 'Engineering' },
    { text: 'Michael Brown', value: 'michael.brown@company.com', department: 'Engineering' },
    { text: 'Sally Loh', value: 'sally.loh@company.com', department: 'HR' },
    { text: 'Alice Johnson', value: 'alice.johnson@company.com', department: 'Engineering' },
    { text: 'Jack Sim', value: 'jack.sim@company.com', department: 'Management' },
    { text: 'Jane Smith', value: 'jane.smith@company.com', department: 'Marketing' }
];

const departments = ['Engineering', 'Marketing', 'Sales', 'HR', 'Finance', 'Operations']
const departmentFilterOptions = departments.map(dept => ({ title: dept, value: dept }))

const menu = ref(false)
const showArchived = ref(false)
const showRecurringTasks = ref(false)

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

// Load projects from backend API (avoid client Firestore permissions)
const loadProjects = async () => {
  loadingProjects.value = true
  try {
    const projectsResponse = await axiosClient.get('/projects')
    const fetchedProjects = projectsResponse.data || []
    projects.value = fetchedProjects.map(p => ({ title: p.name, value: p.id }))
    
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
  
  // 1. Define TODAY at midnight (local time relative to mock)
  const todayDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate()); 

  // 2. Parse the DUE DATE string and define it at midnight (local time relative to mock)
  const dueDateObj = new Date(dueDate);
  
  if (isNaN(dueDateObj.getTime())) return false; 
  
  const dueDateOnly = new Date(
      dueDateObj.getFullYear(), 
      dueDateObj.getMonth(), 
      dueDateObj.getDate()
  );
  
  // This comparison is now safe, as both dates are normalized to midnight
  return dueDateOnly < todayDateOnly; 
};

// FIX: Correctly filters tasks using taskOwnerDepartment
const filterTasks = (taskArray) => {
    let filtered = taskArray;
    if (selectedPriorities.value.length > 0) {
        filtered = filtered.filter(task => selectedPriorities.value.includes(task.priority));
    }
    if (selectedAssignees.value.length > 0) {
        filtered = filtered.filter(task => selectedAssignees.value.includes(task.assignedTo));
    }
    if (selectedDepartments.value.length > 0) {
        filtered = filtered.filter(task => 
            selectedDepartments.value.includes(task.taskOwnerDepartment)
        );
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

// FIX: Correctly filters the SCOPED assignee list using the search query
const filteredAssigneeOptions = computed(() => {
  return assigneeFilterOptions.value.filter(opt => 
    opt.title.toLowerCase().includes(searchAssignee.value.toLowerCase())
  )
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
    ...selectedAssignees.value.map(a => ({ key: `assignee-${a}`, label: assigneeFilterOptions.value.find(o => o.value === a)?.title || a, type: 'assignee', value: a }))
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
  if (!canCreateEdit.value) { // General creation check
      handleReadonlyAction();
      return;
  }
  
  // HR specific check: must be involved in the task being created.
  if (isHR.value && !isTaskEditable(taskData)) { 
       showMessage('HR can only create tasks assigned to themselves or their own department.', 'error');
       return;
  }
  
  try {
    // Map UI payload to backend shape
    const payload = {
      ...taskData,
      assigneeId: taskData.assignedTo || null,
      // Preserve explicit taskOwner/taskOwnerDepartment if provided by dialog
      taskOwner: taskData.taskOwner || currentUser.value?.email || authStore.userEmail,
      taskOwnerDepartment: taskData.taskOwnerDepartment || undefined,
    };

    console.log('📤 [Tasks.vue] Creating task with payload:', {
      title: payload.title,
      assigneeId: payload.assigneeId,
      dueDate: payload.dueDate,
      taskOwner: payload.taskOwner,
      taskOwnerDepartment: payload.taskOwnerDepartment
    });

    const response = await axiosClient.post('/tasks', payload);
    console.log('✅ [Tasks.vue] Create task response:', response.status, response.data);

    const newTaskId = response.data.id;
    
    // Add the task to local state - statusHistory will come from backend via reload
    const newTaskWithId = {
      ...payload,
      id: newTaskId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      statusHistory: [{ timestamp: new Date().toISOString(), oldStatus: null, newStatus: payload.status || 'Unassigned' }]
    };
    tasks.value = tasks.value.filter(t => t.id !== newTaskId);
    tasks.value.push(newTaskWithId);
    showMessage('Task created successfully!', 'success');
  } catch (error) {
    console.error('❌ [Tasks.vue] Failed to create task:', error?.response?.status, error?.response?.data || error);
    showMessage(error.response?.data?.message || 'Failed to create task.', 'error');
  }
};

const updateTask = async (taskId, updatedData) => {
  const taskToUpdate = tasks.value.find(t => t.id === taskId);

  // Granular check applied before execution
  if (!isTaskEditable(taskToUpdate)) {
      handleReadonlyAction();
      return false;
  }

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
    // Preserve existing statusHistory and other fields not in updatedData
    const updatedTask = {
      ...taskToUpdate,
      ...updatedData,
      id: taskId,
      updatedAt: new Date().toISOString()
    };
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
  const taskToArchive = tasks.value.find(t => t.id === taskId);
  
  // Granular check applied before execution
  if (!isTaskEditable(taskToArchive)) {
      handleReadonlyAction();
      return;
  }
  
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
  if (!canCreateEdit.value) { // General check prevents non-write-enabled users
      handleReadonlyAction();
      return;
  }
  
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
    // The inner updateTask call handles the isTaskEditable check
    if (await updateTask(newTask.value.id, updatedData)) {
      showCreateDialog.value = false;
      resetForm();
    }
    return;
  }
  
  // Creation logic relies on handleCreateSave which includes the HR check
  await handleCreateSave(newTask.value);
  
  // If creation succeeded, close and reset. We rely on the backend to actually save.
  showCreateDialog.value = false;
  resetForm();
}

const changeTaskStatus = async (payload) => {
    const taskId = payload.taskId;
    const taskToUpdate = tasks.value.find(t => t.id === taskId);

    // Granular check applied before execution
    if (!isTaskEditable(taskToUpdate)) {
        handleReadonlyAction();
        return;
    }

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
        // 🔥 FIX: Call backend API to update status
        await axiosClient.put(`/tasks/${taskId}/status`, { status: newStatus });

        // 🔥 FIX: Reload the specific task from backend to get complete updated data
        const response = await axiosClient.get('/tasks');
        const updatedTask = response.data.find(t => t.id === taskId);

        if (updatedTask) {
            // Update the task in local state with complete backend data
            const taskIndex = tasks.value.findIndex(t => t.id === taskId);
            if (taskIndex !== -1) {
                tasks.value[taskIndex] = updatedTask;
                selectedTask.value = updatedTask;
                selectedListTask.value = updatedTask;
            }
        } else {
            // Fallback: update local state with minimal data
            const taskIndex = tasks.value.findIndex(t => t.id === taskId);
            if (taskIndex !== -1) {
                const taskData = tasks.value[taskIndex];
                tasks.value[taskIndex] = {
                    ...taskData,
                    status: newStatus,
                    updatedAt: new Date().toISOString()
                };
                selectedTask.value = tasks.value[taskIndex];
                selectedListTask.value = tasks.value[taskIndex];
            }
        }

        showMessage('Task status updated!', 'success');
    } catch (error) {
        console.error('❌ [changeTaskStatus] Error:', error);
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
  if (!canCreateEdit.value) {
      handleReadonlyAction();
      return;
  }
  
  if (selectedDate.value) {
    newTask.value.dueDate = selectedDate.value.dateKey
    showCreateDialog.value = true
    showDateDetailsDialog.value = false
  }
}

const addTaskForDate = (dateKey) => {
  if (!canCreateEdit.value) {
      handleReadonlyAction();
      return;
  }
  
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

const handleEditTask = (task) => {
  console.log('🔧 [handleEditTask] Called with task:', task?.title);
  
  if (!isTaskEditable(task)) {
      console.log('❌ [handleEditTask] Task not editable, calling handleReadonlyAction');
      handleReadonlyAction();
      return;
  }
  
  console.log('✅ [handleEditTask] Opening edit dialog');
  editTask(task);
}

const editTask = (task) => {
  console.log('🔧 [editTask] Called with task:', task?.title);
  
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
  console.log('✅ [editTask] Dialog should now be visible, showCreateDialog:', showCreateDialog.value);
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
  // Check is done in template via canCreateEdit
  const newStatus = prompt('Enter new status (Ongoing, Completed, Pending Review, Unassigned):');  
  if (newStatus && taskStatuses.includes(newStatus)) {
    try {
      for (const taskId of taskIds) {
        // NOTE: For proper HR security, this should call changeTaskStatus with granular checks
        // We will allow this operation if `canCreateEdit` is true, relying on the backend for final checks.
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
  // Check is done in template via canCreateEdit
  try {
    for (const taskId of taskIds) {
      // NOTE: For proper HR security, this should iterate and check ownership for HR users
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
@import url('@/assets/styles/TaskView.css');
</style>