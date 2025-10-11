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
            <v-btn-toggle v-model="viewType" mandatory class="view-type-toggle">
              <v-btn value="calendar" size="small" prepend-icon="mdi-calendar" rounded="lg">
                Calendar
              </v-btn>
              <v-btn value="list" size="small" prepend-icon="mdi-format-list-bulleted" rounded="lg">
                List
              </v-btn>
            </v-btn-toggle>
            <v-btn variant="outlined" size="small" prepend-icon="mdi-bell" rounded="lg">
            </v-btn>
            <v-btn variant="outlined" size="small" prepend-icon="mdi-cog" rounded="lg">
            </v-btn>
          </div>
        </div>

        <div class="calendar-controls">
          <div class="controls-row">
            <v-btn color="primary" prepend-icon="mdi-plus" @click="showCreateDialog = true" rounded="lg">
              Add Task
            </v-btn>

            <div class="filters-right">
              <div class="filter-label">Filters</div>
              
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
                :disabled="selectedPriorities.length === 0 && selectedAssignees.length === 0"
              >
                Reset filters
              </v-btn>
            </div>

             <!-- Priority Dropdown -->
             <div
               v-show="priorityMenuOpen"
               class="custom-filter-dropdown"
               :style="{ top: priorityDropdownTop + 'px', left: priorityDropdownLeft + 'px' }"
               ref="priorityDropdownRef"
             >
               <!-- <div class="dropdown-header">
                 <span class="dropdown-title">Select Priorities</span>
               </div> -->
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
               <!-- <div class="dropdown-header">
                 <span class="dropdown-title">Select Assignees</span>
               </div> -->
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

        <!-- Calendar View -->
        <div v-if="viewType === 'calendar'">
          <div class="calendar-nav">
            <v-btn icon="mdi-chevron-left" variant="text" @click="previousPeriod" rounded="lg"></v-btn>
            <div class="nav-center">
              <h2 class="period-title">{{ getCurrentPeriodTitle() }}</h2>
              <v-btn-toggle v-model="viewMode" mandatory rounded="xl" class="view-toggle">
                <v-btn value="month" size="x-small" prepend-icon="mdi-calendar" rounded="xl" class="view-btn">Month</v-btn>
                <v-btn value="week" size="x-small" prepend-icon="mdi-view-week" rounded="xl" class="view-btn">Week</v-btn>
              </v-btn-toggle>
            </div>
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
    <!-- List View -->
    <div v-if="viewType === 'list'" class="list-view">
        <!-- Left side: Task list -->
        <div class="task-list-panel">
          <div class="list-header">
            <h3>All Tasks ({{ filteredTasksList.length }})</h3>
            <v-select
              v-model="listSortBy"
              :items="sortOptions"
              density="compact"
              variant="outlined"
              hide-details
              style="max-width: 150px;"
            ></v-select>
          </div>

          <div class="tasks-list-scroll">
            <div 
              v-for="task in filteredTasksList" 
              :key="task.id"
              class="task-list-card"
              :class="{ 'active': selectedListTask?.id === task.id }"
              @click="selectListTask(task)"
            >
              <div class="task-list-header">
                <h4 class="task-list-title">{{ task.title }}</h4>
                <v-chip 
                  :color="getStatusColor(task.status)" 
                  size="small"
                  rounded="lg"
                >
                  {{ task.status }}
                </v-chip>
              </div>

              <div class="task-list-meta">
                <div class="meta-item" v-if="task.dueDate">
                  <v-icon size="small">mdi-calendar</v-icon>
                  <span>{{ formatDate(task.dueDate) }}</span>
                </div>
                <div class="meta-item" v-if="task.assignedTo">
                  <v-icon size="small">mdi-account</v-icon>
                  <span>{{ task.assignedTo }}</span>
                </div>
                <div class="meta-item" v-if="task.priority">
                  <v-icon size="small">mdi-flag</v-icon>
                  <span>Priority {{ task.priority }}</span>
                </div>
              </div>

              <p class="task-list-description" v-if="task.description">
                {{ task.description.substring(0, 100) }}{{ task.description.length > 100 ? '...' : '' }}
              </p>

              <div class="task-subtasks-indicator" v-if="task.subtasks && task.subtasks.length > 0">
                <v-icon size="small">mdi-file-tree</v-icon>
                <span>{{ task.subtasks.length }} subtask(s)</span>
              </div>
            </div>

            <div v-if="filteredTasksList.length === 0" class="no-tasks-message">
              <v-icon size="64" color="grey-lighten-1">mdi-clipboard-text-outline</v-icon>
              <p>No tasks found</p>
            </div>
          </div>
        </div>

        <!-- Right side: Task details -->
        <div class="task-detail-panel">
          <div v-if="!selectedListTask" class="no-selection">
            <v-icon size="80" color="grey-lighten-2">mdi-clipboard-text-search-outline</v-icon>
            <h3>Select a task to view details</h3>
            <p>Click on any task from the list to see its full details here</p>
          </div>

          <div v-else class="task-detail-content">
            <div class="detail-header">
              <div class="detail-title-section">
                <h2>{{ selectedListTask.title }}</h2>
                <div class="detail-chips">
                  <v-chip
                    :color="getStatusColor(selectedListTask.status)"
                    size="small"
                    rounded="lg"
                  >
                    {{ selectedListTask.status }}
                  </v-chip>
                  <v-chip
                    v-if="selectedListTask.isSubtask"
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

              <v-btn
                color="primary"
                @click="editTask(selectedListTask)"
                prepend-icon="mdi-pencil"
                rounded="lg"
              >
                Edit
              </v-btn>
            </div>

            <v-divider class="my-4"></v-divider>

            <div class="detail-body">
              <v-row>
                <v-col cols="6">
                  <div class="detail-section">
                    <div class="detail-section-icon-row">
                      <v-icon size="small" class="detail-icon">mdi-text</v-icon>
                      <h4>Description</h4>
                    </div>
                    <p>{{ selectedListTask.description || "No description" }}</p>
                  </div>
                </v-col>
                <v-col cols="6">
                  <div class="detail-section">
                    <div class="detail-section-icon-row">
                      <v-icon size="small" class="detail-icon">mdi-calendar-outline</v-icon>
                      <h4>Due Date</h4>
                    </div>
                    <p>{{ selectedListTask.dueDate ? formatDate(selectedListTask.dueDate) : 'No due date' }}</p>
                  </div>
                </v-col>
              </v-row>

              <v-row>
                <v-col cols="6">
                  <div class="detail-section">
                    <div class="detail-section-icon-row">
                      <v-icon size="small" class="detail-icon">mdi-account</v-icon>
                      <h4>Assigned To</h4>
                    </div>
                    <p>{{ selectedListTask.assignedTo || 'Unassigned' }}</p>
                  </div>
                </v-col>
                <v-col cols="6">
                  <div class="detail-section">
                    <div class="detail-section-icon-row">
                      <v-icon size="small" class="detail-icon">mdi-priority-high</v-icon>
                      <h4>Priority</h4>
                    </div>
                    <p>{{ selectedListTask.priority || 'Not set' }}</p>
                  </div>
                </v-col>
              </v-row>

              <v-row v-if="selectedListTask.collaborators && selectedListTask.collaborators.length > 0">
                <v-col cols="12">
                  <div class="detail-section">
                    <div class="detail-section-icon-row">
                      <v-icon size="small" class="detail-icon">mdi-account-group</v-icon>
                      <h4>Collaborators</h4>
                    </div>
                    <p>{{ selectedListTask.collaborators.join(', ') }}</p>
                  </div>
                </v-col>
              </v-row>

              <div class="detail-section" v-if="selectedListTask && selectedListTask.subtasks && selectedListTask.subtasks.length > 0">
                <h4>Progress</h4>
                <div class="progress-bar-container">
                  <div class="custom-progress-bar">
                    <div class="progress-fill" :style="{ width: calculateProgress(selectedListTask) + '%' }"></div>
                  </div>
                  <span class="progress-text">{{ calculateProgress(selectedListTask) }}%</span>
                </div>
              </div>

              <div class="detail-section" v-if="selectedListTask.attachments && selectedListTask.attachments.length > 0">
                <h4>Attachments</h4>
                <div class="attachments-list">
                  <v-chip
                    v-for="attachment in selectedListTask.attachments"
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

              <div class="detail-section" v-if="selectedListTask && selectedListTask.subtasks && selectedListTask.subtasks.length > 0">
                <h4>Subtasks ({{ selectedListTask.subtasks.length }})</h4>
                <div class="subtask-list">
                  <div v-for="subtask in selectedListTask.subtasks" :key="subtask.id" class="subtask-item">
                    <div class="subtask-info">
                      <div class="subtask-title">{{ subtask.title }}</div>
                      <div class="subtask-status">
                        <v-chip
                          :color="getStatusColor(subtask.status)"
                          size="small"
                          rounded="lg"
                        >
                          {{ subtask.status }}
                        </v-chip>
                      </div>
                    </div>
                    <div class="subtask-meta">
                      <span v-if="subtask.assignedTo">{{ subtask.assignedTo }}</span>
                      <span v-if="subtask.dueDate">{{ formatDate(subtask.dueDate) }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div class="detail-actions">
                <v-select
                  :model-value="selectedListTask.status"
                  :items="taskStatuses"
                  label="Update Status"
                  variant="outlined"
                  density="comfortable"
                  @update:modelValue="changeTaskStatus(selectedListTask, $event)"
                  style="max-width: 250px;"
                ></v-select>
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
    <TaskDetailsDialog
      v-model:show="showDetailsDialog"
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
      v-model:show="showCreateDialog"
      :model="newTask"
      :isEditing="isEditing"
      :taskStatuses="taskStatuses"
      :priorities="priorities"
      :teamMembers="teamMembers"
      :todayDate="todayDate"
      @save="handleCreateSave"
      @cancel="cancelCreate"
    />
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
import { ref, computed, nextTick , onMounted} from 'vue'
import { storage } from '@/config/firebase'
import { uploadBytes, getDownloadURL, ref as storageRef } from 'firebase/storage'
import axios from 'axios'
import '../assets/styles.css';
import CreateTaskDialogue from '../components/CreateTaskDialogue.vue'
import TaskDetailsDialog from '../components/TaskDetailsDialog.vue'

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
const selectedTask = ref(null)
const selectedDate = ref(null)
const upcomingSidebarOpen = ref(true)
const selectedPriorities = ref([])
const selectedAssignees = ref([])
const tempSelectedPriorities = ref([])
const tempSelectedAssignees = ref([])
const searchPriority = ref('')
const searchAssignee = ref('')
const priorityMenuOpen = ref(false)
const assigneeMenuOpen = ref(false)
const priorityDropdownTop = ref(0)
const priorityDropdownLeft = ref(0)
const assigneeDropdownTop = ref(0)
const assigneeDropdownLeft = ref(0)
const priorityBtnRef = ref(null)
const assigneeBtnRef = ref(null)
const priorityDropdownRef = ref(null)
const assigneeDropdownRef = ref(null)
const showFilterDialog = ref(false)
const selectedListTask = ref(null)
const listSortBy = ref('dueDate')
const sortOptions = ['Due Date', 'Priority', 'Status', 'Assignee']

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

const tasks = ref([
  {
    id: '1',
    title: 'Complete project proposal',
    description: 'Write and finalize the Q4 project proposal for the new marketing campaign',
    dueDate: '2025-09-27',
    assignedTo: 'John Doe',
    status: 'In Progress',
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
        newStatus: 'To Do'
      },
      {
        timestamp: '2025-09-27T09:30:00',
        oldStatus: 'To Do',
        newStatus: 'In Progress'
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
        status: 'In Progress',
        priority: 2,
        createdAt: '2025-09-25T15:00:00',
        statusHistory: [
          {
            timestamp: '2025-09-25T15:00:00',
            oldStatus: null,
            newStatus: 'To Do'
          },
          {
            timestamp: '2025-09-27T16:30:00',
            oldStatus: 'To Do',
            newStatus: 'In Progress'
          },
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
        status: 'In Progress',
        priority: 2,
        createdAt: '2025-09-26T10:00:00',
        statusHistory: [
          {
            timestamp: '2025-09-26T10:00:00',
            oldStatus: null,
            newStatus: 'To Do'
          },
          {
            timestamp: '2025-09-26T12:00:00',
            oldStatus: 'To Do',
            newStatus: 'In Progress'
          },
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
    status: 'To Do',
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
        newStatus: 'To Do'
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
    status: 'To Do',
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
        newStatus: 'To Do'
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
        status: 'To Do',
        priority: 5,
        createdAt: '2025-09-23T09:15:00',
        statusHistory: [
          {
            timestamp: '2025-09-23T09:15:00',
            oldStatus: null,
            newStatus: 'To Do'
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
    status: 'Done',
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
        newStatus: 'To Do'
      },
      {
        timestamp: '2025-09-27T14:20:00',
        oldStatus: 'To Do',
        newStatus: 'In Progress'
      },
      {
        timestamp: '2025-09-29T17:30:00',
        oldStatus: 'In Progress',
        newStatus: 'Done'
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
  status: 'To Do',
  attachments: [],
  startTime: '',
  endTime: ''
})

const taskTypes = ['Task', 'Meeting', 'Deadline', 'Review']
const taskStatuses = ['To Do', 'In Progress', 'Done']
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
  let filtered = tasks.value.filter(task => task.dueDate === today && task.status !== 'Done')

  if (selectedPriorities.value.length > 0) {
    filtered = filtered.filter(task => selectedPriorities.value.includes(task.priority))
  }
  if (selectedAssignees.value.length > 0) {
    filtered = filtered.filter(task => selectedAssignees.value.includes(task.assignedTo))
  }

  return filtered
})

const weekTasks = computed(() => {
  const today = new Date()
  const nextWeek = new Date(today)
  nextWeek.setDate(today.getDate() + 7)

  let filtered = tasks.value.filter(task => {
    if (!task.dueDate || task.status === 'Done') return false
    const taskDate = new Date(task.dueDate)
    return taskDate > today && taskDate <= nextWeek
  })

  if (selectedPriorities.value.length > 0) {
    filtered = filtered.filter(task => selectedPriorities.value.includes(task.priority))
  }
  if (selectedAssignees.value.length > 0) {
    filtered = filtered.filter(task => selectedAssignees.value.includes(task.assignedTo))
  }

  return filtered
})

const overdueTasks = computed(() => {
  const today = new Date().toISOString().split('T')[0]
  let filtered = tasks.value.filter(task => {
    return task.dueDate && task.dueDate < today && task.status !== 'Done'
  })

  if (selectedPriorities.value.length > 0) {
    filtered = filtered.filter(task => selectedPriorities.value.includes(task.priority))
  }
  if (selectedAssignees.value.length > 0) {
    filtered = filtered.filter(task => selectedAssignees.value.includes(task.assignedTo))
  }

  return filtered
})

const parentTaskProgress = computed(() => {
  const task = selectedTask.value;
  if (!task || !task.subtasks || task.subtasks.length === 0) return 0;

  const totalSubtasks = task.subtasks.length;
  const completedSubtasks = task.subtasks.filter(subtask => subtask.status === 'Done').length;
  return Math.round((completedSubtasks / totalSubtasks) * 100);
});

const filteredPriorityOptions = computed(() => {
  return priorityFilterOptions.filter(opt => opt.title.toLowerCase().includes(searchPriority.value.toLowerCase()))
})

const filteredAssigneeOptions = computed(() => {
  return assigneeFilterOptions.filter(opt => opt.title.toLowerCase().includes(searchAssignee.value.toLowerCase()))
})

const selectedFilters = computed(() => {
  return [
    ...selectedPriorities.value.map(p => ({ key: `priority-${p}`, label: priorityFilterOptions.find(o => o.value === p)?.title || p, type: 'priority', value: p })),
    ...selectedAssignees.value.map(a => ({ key: `assignee-${a}`, label: assigneeFilterOptions.find(o => o.value === a)?.title || a, type: 'assignee', value: a }))
  ]
})

const filteredTasksList = computed(() => {
  let allTasks = []
  
  tasks.value.forEach(task => {
    allTasks.push(task)
    if (task.subtasks && task.subtasks.length > 0) {
      task.subtasks.forEach((subtask, index) => {
        allTasks.push({
          ...subtask,
          id: `${task.id}-subtask-${index}`,
          isSubtask: true,
          parentTask: task
        })
      })
    }
  })

  if (selectedPriorities.value.length > 0) {
    allTasks = allTasks.filter(task => selectedPriorities.value.includes(task.priority))
  }
  if (selectedAssignees.value.length > 0) {
    allTasks = allTasks.filter(task => selectedAssignees.value.includes(task.assignedTo))
  }

  allTasks.sort((a, b) => {
    if (listSortBy.value === 'Due Date') {
      return new Date(a.dueDate || '9999-12-31') - new Date(b.dueDate || '9999-12-31')
    } else if (listSortBy.value === 'Priority') {
      return (a.priority || 10) - (b.priority || 10)
    } else if (listSortBy.value === 'Status') {
      return (a.status || '').localeCompare(b.status || '')
    } else if (listSortBy.value === 'Assignee') {
      return (a.assignedTo || '').localeCompare(b.assignedTo || '')
    }
    return 0
  })

  return allTasks
})

// Validate if date is in the past
const validateDueDate = (dateString) => {
  if (!dateString) return true; // Allow empty dates
  
  const selectedDate = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset time to compare dates only
  
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
      statusHistory: [{ timestamp: new Date().toISOString(), oldStatus: null, newStatus: taskData.status }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    tasks.value.push(newTaskWithId);
    showSnackbar.value = true;
    snackbarMessage.value = 'Task created successfully!';
    snackbarColor.value = 'success';
  } catch (error) {
    showSnackbar.value = true;
    snackbarMessage.value = 'Failed to create task.';
    snackbarColor.value = 'error';
  }
};

// Update Task Function
const updateTask = async (taskId, updatedData) => {
  try {
    // Validate due date isn't in the past
    if (updatedData.dueDate && !validateDueDate(updatedData.dueDate)) {
      showMessage('Cannot set due date in the past', 'error');
      return false;
    }

    // Upload attachments if any
    if (updatedData.attachments && updatedData.attachments.length > 0) {
      updatedData.attachments = await uploadFiles(updatedData.attachments);
    }

    // Send update request to backend
    await axiosClient.put(`/tasks/${taskId}`, updatedData);
    
    // Update local state
    const taskIndex = tasks.value.findIndex(t => t.id === taskId);
    if (taskIndex !== -1) {
      tasks.value[taskIndex] = {
        ...tasks.value[taskIndex],
        ...updatedData,
        updatedAt: new Date().toISOString()
      };
      
      // Update refs if the task is currently selected
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

// Create Task Function (updated to handle both create and edit)
const createTask = async () => {
  // Handle Edit Mode
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
  
  // Handle Create Mode
  try {
    // Validate due date
    if (newTask.value.dueDate && !validateDueDate(newTask.value.dueDate)) {
      showMessage('Cannot set due date in the past', 'error');
      return;
    }

    // File upload logic
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
      status: newTask.value.status || 'To Do',
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
  newTask.value.status = newTask.value.status || 'To Do'
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
    status: 'To Do',
    attachments: [],
  }
  subtasks.value = []
  isEditing.value = false
}

const addSubtask = () => {
  subtasks.value.push({
    title: '',
    description: '',
    status: 'To Do',
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

const togglePriorityMenu = () => {
  if (priorityMenuOpen.value) {
    closePriorityMenu()
  } else {
    closeAssigneeMenu()
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

const toggleAssigneeMenu = () => {
  if (assigneeMenuOpen.value) {
    closeAssigneeMenu()
  } else {
    closePriorityMenu()
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

const removeFilter = (filter) => {
  if (filter.type === 'priority') {
    selectedPriorities.value = selectedPriorities.value.filter(p => p !== filter.value)
  } else {
    selectedAssignees.value = selectedAssignees.value.filter(a => a !== filter.value)
  }
}

const resetFilters = () => {
  selectedPriorities.value = []
  selectedAssignees.value = []
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

const selectListTask = (task) => {
  selectedListTask.value = task
}

const calculateProgress = (task) => {
  if (!task || !task.subtasks || task.subtasks.length === 0) return 0
  const totalSubtasks = task.subtasks.length
  const completedSubtasks = task.subtasks.filter(subtask => subtask.status === 'Done').length
  return Math.round((completedSubtasks / totalSubtasks) * 100)
}

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
  flex:  1;
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
  padding: 12px 24px;
  background: white;
  border-bottom: 1px solid #e0e0e0;
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

.view-toggle {
  gap: 8px;
  background: transparent !important;
  box-shadow: none !important;
}

.view-btn {
  margin: 0 2px !important;
  padding: 4px 8px !important;
  font-size: 12px !important;
  height: 28px !important;
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
}

.reset-btn {
  color: #666;
  
}

.filter-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 8px 24px;
  background: white;
  border-bottom: 1px solid #e0e0e0;
}

.filter-chip {
  background: #f0f0f0;
  color: #333;
}

.custom-filter-dropdown {
  position: fixed;
  z-index: 1000;
  min-width: 250px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border: 1px solid #e0e0e0;
  overflow: hidden;
}

.dropdown-header {
  padding: 16px 20px 12px 20px;
  border-bottom: 1px solid #e0e0e0;
}

.dropdown-title {
  font-size: 14px;
  font-weight: 600;
  color: #2c3e50;
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
  border-bottom: 1px solid #e0e0e0;
  outline: none;
  font-size: 14px;
  box-sizing: border-box;
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
  color: rgba(0, 0, 0, 0.87);
}

.dropdown-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 20px 16px 20px;
  border-top: 1px solid #e0e0e0;
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
  margin: 0 0 4px 0;
  font-size: 18px;
  font-weight: 600;
  color: #2c3e50;
  text-align: center;
}

.nav-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  flex: 1;
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
  border-radius: 6px;
  padding: 6px 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  border-left: 3px solid #ccc;
  font-size: 11px;
  min-height: 32px;
  display: flex;
  align-items: center;
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

.task-details-header {
  padding: 20px 20px 12px 20px;
  position: relative;
  padding-right: 40px;
  border-bottom: 1px solid #e0e0e0;
}

.close-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 10;
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
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.detail-section-icon-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
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

/* .parent-controls {
  display: flex;
  align-items: center;
  gap: 8px;
} */

.create-task-card {
  background: white !important;
}

.task-details-card {
  background: white !important;
}

.status-timeline {
  margin-top: 8px;
  padding: 8px;
  background: #f8f9fa;
  border-radius: 8px;
}

.status-time {
  font-size: 12px;
  color: #7f8c8d;
  white-space: nowrap;
}

.status-change-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 0;
}

.status-chip {
  min-width: 70px;
  justify-content: center;
}

.status-updates {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 12px;
}

.status-entry {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 8px 0;
}

.status-entry:not(:last-child) {
  border-bottom: 1px solid #e0e0e0;
}

.status-icon {
  margin-top: 2px;
}

.status-info {
  flex: 1;
}

.status-description {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  color: #2c3e50;
}

.status-timestamp {
  font-size: 12px;
  color: #7f8c8d;
  margin-top: 2px;
}

.progress-bar-container {
  display: flex;
  align-items: center;
  gap: 12px;
}

.custom-progress-bar {
  flex: 1;
  height: 20px;
  background: #e0e0e0;
  border-radius: 10px;
  overflow: hidden;
  position: relative;
}

.progress-fill {
  height: 100%;
  background: #7b92d1;
  border-radius: 10px;
  transition: width 0.3s ease;
  min-width: 0;
}

.progress-text {
  font-size: 14px;
  font-weight: 600;
  color: #2c3e50;
  min-width: 40px;
}

.subtask-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 300px;
  overflow-y: auto;
}

.subtask-item {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 12px;
  border: 1px solid #e0e0e0;
}

.subtask-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.subtask-title {
  font-weight: 500;
  font-size: 14px;
  color: #2c3e50;
}

.subtask-status {
  flex-shrink: 0;
}

.subtask-details {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.filter-categories-list {
  padding: 8px 0;
}

.filter-category-item {
  display: flex;
  align-items: center;
  padding: 16px 20px;
  cursor: pointer;
  transition: background-color 0.2s;
  gap: 12px;
  user-select: none;
}

.filter-category-item:hover {
  background-color: rgba(0, 0, 0, 0.04);
}

.category-icon {
  flex-shrink: 0;
  width: 20px;
}

.category-text {
  flex: 1;
  font-size: 14px;
  color: rgba(0, 0, 0, 0.87);
}

.category-chevron {
  flex-shrink: 0;
  margin-left: auto;
}

.custom-filter-menu {
  position: relative;
  display: inline-block;
}

.custom-dropdown-menu {
  position: fixed;
  z-index: 1000;
  min-width: 250px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border: 1px solid #e0e0e0;
  overflow: hidden;
}

.dropdown-content {
  display: flex;
  flex-direction: column;
}

.dropdown-header {
  padding: 16px 20px 12px 20px;
  border-bottom: 1px solid #e0e0e0;
}

.dropdown-title {
  font-size: 14px;
  font-weight: 600;
  color: #2c3e50;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.dropdown-divider {
  height: 1px;
  background: #e0e0e0;
}

.dropdown-body {
  padding: 8px 0;
}

.dropdown-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 20px 16px 20px;
  border-top: 1px solid #e0e0e0;
}

.footer-btn {
  min-width: auto !important;
}

.filter-options-list {
  padding: 5px 0;
  margin-right: 2px ;
}

.scrollable-submenu {
  max-height: 200px;
  overflow-y: auto;
}

.filter-option-item {
  display: flex;
  align-items: center;
  padding: 6px 10px;
  cursor: pointer;
  transition: background-color 0.2s;
  user-select: none;
}

.filter-option-item:hover {
  background-color: rgba(0, 0, 0, 0.04);
}

.option-text {
  flex: 1;
  font-size: 14px;
  color: rgba(0, 0, 0, 0.87);
  margin-left: 2px;
}

.submenu-dropdown {
  min-width: 200px;
}

.floating-submenu {
  position: fixed;
  z-index: 9999;
  transition: opacity 0.15s ease;
}

.view-type-toggle {
  margin-right: 12px;
  background: transparent !important;
  box-shadow: none !important;
}

.view-type-toggle .v-btn {
  text-transform: none;
  font-size: 13px;
  font-weight: 500;
}

/* Custom checkbox styling */
.custom-checkbox {
  width: 16px;
  height: 16px;
  margin: 5px;
  padding: 0;
  cursor: pointer;
  accent-color: #1976d2;
  flex-shrink: 0;
}

/* Dark mode overrides */
[data-theme="dark"] .custom-dropdown-menu {
  background: #3d3d3d !important;
  border-color: #555 !important;
}

[data-theme="dark"] .dropdown-header,
[data-theme="dark"] .dropdown-title {
  color: #f5f4f2 !important;
}

[data-theme="dark"] .dropdown-divider {
  background: #555 !important;
}

[data-theme="dark"] .filter-category-item,
[data-theme="dark"] .filter-option-item {
  color: #f5f4f2 !important;
}

[data-theme="dark"] .filter-category-item:hover,
[data-theme="dark"] .filter-option-item:hover {
  background-color: rgba(255, 255, 255, 0.1) !important;
}

[data-theme="dark"] .custom-checkbox {
  accent-color: #7b92d1;
  filter: invert(1);
}

[data-theme="dark"] .footer-btn {
  color: #f5f4f2 !important;
}

/* Dialog backgrounds for dark mode */
[data-theme="dark"] .create-task-card,
[data-theme="dark"] .task-details-card,
[data-theme="dark"] .date-details-card {
  background: #3d3d3d !important;
  color: #f5f4f2 !important;
}

/* Ensure submenu backgrounds are dark */
[data-theme="dark"] .floating-submenu .custom-dropdown-menu {
  background: #3d3d3d !important;
  border-color: #555 !important;
}

/* Form fields in dark mode */
[data-theme="dark"] .v-field {
  background: #555 !important;
  color: #f5f4f2 !important;
}

[data-theme="dark"] .v-field input,
[data-theme="dark"] .v-field textarea,
[data-theme="dark"] .v-field select {
  color: #f5f4f2 !important;
}

[data-theme="dark"] .v-field__outline {
  border-color: #777 !important;
}

/* Ensure all text in filter menus and submenus is light
[data-theme="dark"] .option-text {
  color: #f5f4f2 !important;
}

[data-theme="dark"] .dropdown-body .filter-options-list .filter-option-item {
  color: #f5f4f2 !important;
}

/* Ensure category text is light */
/* [data-theme="dark"] .category-text {
  color: #f5f4f2 !important;
} */

</style>