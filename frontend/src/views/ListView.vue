<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'

// ===========================
// Props Definition
// ===========================

const props = defineProps({
  tasks: {
    type: Array,
    required: true,
    default: () => []
  },
  sortBy: {
    type: String,
    default: 'priority'
  },
  sortOrder: {
    type: String,
    default: 'asc'
  },
  selectedTaskId: {
    type: String,
    default: null
  },
  taskStatuses: {
    type: Array,
    default: () => ['Ongoing', 'Completed', 'Pending Review', 'Unassigned']
  },
  searchQuery: {
    type: String,
    default: ''
  },
  currentView: {    // ← ADD THIS NEW PROP
    type: String,
    default: 'list'
  }
})


// ===========================
// Emits Definition
// ===========================

const emit = defineEmits([
  'update:sortBy',
  'update:sortOrder',
  'select-task',
  'edit-task',
  'change-status',
  'view-parent',
  'open-attachment',
  'add-task',
  'bulk-update-status',
  'bulk-delete',
  'change-view'    // ← ADD THIS
])

// ===========================
// Local State
// ===========================
const selectedTask = ref(null)
const sortOptions = ['Due Date', 'Priority', 'Status']
const sortDropdownOpen = ref(false)
const sortDropdownTop = ref(0)
const sortDropdownLeft = ref(0)
const sortBtnRef = ref(null)
const sortDropdownRef = ref(null)

// Sort By State
const sortOpen = ref(false)
const sortWrapper = ref(null)

// Search & Filter State
const searchQuery = computed(() => props.searchQuery || '')
const statusFilter = ref([])

// Bulk Select State
const bulkSelectMode = ref(false)
const selectedTaskIds = ref([])

// ===========================
// Computed Properties
// ===========================

/**
 * Flatten tasks to include subtasks as separate items
 * Each subtask gets augmented with parent reference and isSubtask flag
 */
const flattenedTasks = computed(() => {
  let allTasks = []
  
  props.tasks.forEach(task => {
    // Add main task
    allTasks.push(task)
    
    // Add subtasks as separate items
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
  
  return allTasks
})

/**
 * Apply search and status filters to flattened tasks
 */
const filteredTasks = computed(() => {
  let tasks = [...flattenedTasks.value]
  
  // Apply status filter
  if (statusFilter.value.length > 0) {
    tasks = tasks.filter(task => statusFilter.value.includes(task.status))
  }
  
  // Apply search filter
  if (searchQuery.value && searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase().trim()
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
 * Sort filtered tasks based on selected sort option
 */
const sortedTasks = computed(() => {
  const tasks = [...filteredTasks.value]

  tasks.sort((a, b) => {
    let comparison = 0

    switch (props.sortBy) {
      case 'Due Date':
        // Tasks without dates go to the end
        const dateA = a.dueDate ? new Date(a.dueDate) : new Date('9999-12-31')
        const dateB = b.dueDate ? new Date(b.dueDate) : new Date('9999-12-31')
        comparison = dateA - dateB
        break

      case 'Priority':
        // Lower priority number = higher priority (1 is highest, 10 is lowest)
        const priorityA = typeof a.priority === 'number' ? a.priority : 10
        const priorityB = typeof b.priority === 'number' ? b.priority : 10
        comparison = priorityA - priorityB
        break

      case 'Status':
        // Custom order: To Do → In Progress → Pending Review → Completed → Blocked
        const statusOrder = {
          'Ongoing': 1,
          'Pending Review': 2,
          'Completed': 3,
          'Unassigned': 4
        }
        const statusA = a.status || 'Unassigned'
        const statusB = b.status || 'Unassigned'
        const orderA = statusOrder[statusA] || 8
        const orderB = statusOrder[statusB] || 8
        comparison = orderA - orderB
        break

      default:
        comparison = 0
    }

    // Apply sort order
    return props.sortOrder === 'desc' ? -comparison : comparison
  })

  return tasks
})

/**
 * Check if all visible tasks are selected (for "select all" checkbox)
 */
const allSelected = computed(() => {
  return filteredTasks.value.length > 0 && 
         selectedTaskIds.value.length === filteredTasks.value.length
})

// ===========================
// Watchers
// ===========================

/**
 * Watch for external selectedTaskId changes
 * This allows parent component to control task selection
 */
watch(() => props.selectedTaskId, (newId) => {
  if (newId) {
    const task = flattenedTasks.value.find(t => t.id === newId)
    if (task) {
      selectedTask.value = task
    }
  } else {
    selectedTask.value = null
  }
}, { immediate: true })

/**
 * Watch for view changes to load appropriate sort preference
 */
watch(() => props.currentView, (newView) => {
  if (newView) {
    const savedSort = loadSortPreference()
    if (savedSort !== props.sortBy) {
      emit('update:sortBy', savedSort)
    }
    const savedOrder = loadSortOrderPreference()
    if (savedOrder !== props.sortOrder) {
      emit('update:sortOrder', savedOrder)
    }
  }
})

/**
 * Clear bulk selection when filters change
 */
watch([searchQuery, statusFilter], () => {
  if (bulkSelectMode.value) {
    selectedTaskIds.value = []
  }
})

// ===========================
// Task Selection Methods
// ===========================

/**
 * Handle task card click
 * Behavior depends on whether bulk select mode is active
 */
const handleTaskClick = (task) => {
  if (bulkSelectMode.value) {
    toggleTaskSelection(task.id)
  } else {
    selectTask(task)
  }
}

/**
 * Select a task to view details in right panel
 */
const selectTask = (task) => {
  selectedTask.value = task
  emit('select-task', task)
}

/**
 * Handle status change from dropdown
 */
const handleStatusChange = (newStatus) => {
  if (selectedTask.value) {
    emit('change-status', { task: selectedTask.value, status: newStatus })
  }
}

// ===========================
// Bulk Selection Methods
// ===========================

/**
 * Toggle selection of all visible tasks
 */
const toggleSelectAll = (value) => {
  if (value) {
    // Select all filtered tasks
    selectedTaskIds.value = filteredTasks.value.map(t => t.id)
  } else {
    // Deselect all
    selectedTaskIds.value = []
  }
}

/**
 * Toggle selection of individual task
 */
const toggleTaskSelection = (taskId) => {
  const index = selectedTaskIds.value.indexOf(taskId)
  if (index > -1) {
    // Remove from selection
    selectedTaskIds.value.splice(index, 1)
  } else {
    // Add to selection
    selectedTaskIds.value.push(taskId)
  }
}

/**
 * Exit bulk select mode and clear selections
 */
const cancelBulkSelect = () => {
  bulkSelectMode.value = false
  selectedTaskIds.value = []
}

/**
 * Bulk update status of selected tasks
 */
const bulkUpdateStatus = () => {
  emit('bulk-update-status', selectedTaskIds.value)
  cancelBulkSelect()
}

/**
 * Bulk delete selected tasks
 */
const bulkDelete = () => {
  if (confirm(`Are you sure you want to delete ${selectedTaskIds.value.length} task(s)?`)) {
    emit('bulk-delete', selectedTaskIds.value)
    cancelBulkSelect()
  }
}

// ===========================
// Sort Dropdown Methods
// ===========================

/**
 * Toggle sort dropdown menu
 */
const toggleSortDropdown = () => {
  if (sortDropdownOpen.value) {
    closeSortDropdown()
  } else {
    closeOtherDropdowns()
    openSortDropdown()
  }
}

/**
 * Open sort dropdown menu
 */
const openSortDropdown = () => {
  nextTick(() => {
    if (sortBtnRef.value) {
      const rect = sortBtnRef.value.$el.getBoundingClientRect()
      const dropdownWidth = 200
      const dropdownHeight = 120 // Approximate height

      // Position below the button
      sortDropdownTop.value = rect.bottom + 8

      // Check if there's enough space on the right
      const spaceOnRight = window.innerWidth - rect.right
      if (spaceOnRight >= dropdownWidth) {
        // Align to the right edge of the button
        sortDropdownLeft.value = rect.right - dropdownWidth
      } else {
        // Align to the left edge of the button
        sortDropdownLeft.value = rect.left
      }

      // Ensure dropdown doesn't go below viewport
      const dropdownBottom = sortDropdownTop.value + dropdownHeight
      if (dropdownBottom > window.innerHeight) {
        sortDropdownTop.value = rect.top - dropdownHeight - 8
      }
    }
  })

  sortDropdownOpen.value = true

  nextTick(() => {
    document.addEventListener('click', handleSortClickOutside)
  })
}

/**
 * Close sort dropdown menu
 */
const closeSortDropdown = () => {
  sortDropdownOpen.value = false
  document.removeEventListener('click', handleSortClickOutside)
}

/**
 * Handle click outside to close dropdown
 */
const handleSortClickOutside = (event) => {
  if (sortBtnRef.value && !sortBtnRef.value.$el.contains(event.target) &&
      sortDropdownRef.value && !sortDropdownRef.value.contains(event.target)) {
    closeSortDropdown()
  }
}

/**
 * Handle keyboard navigation for accessibility
 */
const handleSortKeydown = (event) => {
  if (event.key === 'Escape') {
    closeSortDropdown()
  }
}

/**
 * Close other dropdowns when opening sort dropdown
 */
const closeOtherDropdowns = () => {
  // This would close other dropdowns if they exist
}

/**
 * Select a sort option
 */
const selectSortOption = (option) => {
  emit('update:sortBy', option)
  saveSortPreference(option)
  closeSortDropdown()

  // Visual feedback - briefly highlight the sort button
  if (sortBtnRef.value) {
    const btn = sortBtnRef.value.$el
    btn.style.backgroundColor = '#e8f5e9'
    btn.style.transform = 'scale(1.02)'
    setTimeout(() => {
      btn.style.backgroundColor = ''
      btn.style.transform = ''
    }, 200)
  }
}

/**
 * Save sort preference to localStorage per view
 */
const saveSortPreference = (sortOption) => {
  const viewKey = props.currentView || 'list'
  const storageKey = `taskSort_${viewKey}`
  localStorage.setItem(storageKey, sortOption)
}

/**
 * Load sort preference from localStorage
 */
const loadSortPreference = () => {
  const viewKey = props.currentView || 'list'
  const storageKey = `taskSort_${viewKey}`
  const savedSort = localStorage.getItem(storageKey)
  return savedSort || 'Due Date' // Default to Due Date
}

/**
 * Save sort order preference to localStorage per view
 */
const saveSortOrderPreference = (sortOrder) => {
  const viewKey = props.currentView || 'list'
  const storageKey = `taskSortOrder_${viewKey}`
  localStorage.setItem(storageKey, sortOrder)
}

/**
 * Load sort order preference from localStorage
 */
const loadSortOrderPreference = () => {
  const viewKey = props.currentView || 'list'
  const storageKey = `taskSortOrder_${viewKey}`
  const savedOrder = localStorage.getItem(storageKey)
  return savedOrder || 'asc' // Default to ascending
}

/**
 * Toggle sort order between asc and desc
 */
const toggleSortOrder = () => {
  const newOrder = props.sortOrder === 'asc' ? 'desc' : 'asc'
  emit('update:sortOrder', newOrder)
  saveSortOrderPreference(newOrder)
}

/**
 * Get icon for sort option
 */
const getSortIcon = (option) => {
  const icons = {
    'Due Date': 'mdi-calendar',
    'Priority': 'mdi-alert-circle',
    'Status': 'mdi-check-circle'
  }
  return icons[option] || 'mdi-sort'
}

// keep a local mirror of current sort for radios
const currentSort = ref(props.sortBy)
watch(() => props.sortBy, v => (currentSort.value = v), { immediate: true })

function selectSort(key) {
  // Map the lowercase keys to the expected format for sorting
  const sortKeyMap = {
    'priority': 'Priority',
    'status': 'Status',
    'dueDate': 'Due Date'
  }

  const mappedKey = sortKeyMap[key] || key
  currentSort.value = mappedKey

  // persist (optional): mirror what your app already does
  try { localStorage.setItem('listSortBy', mappedKey) } catch {}

  // IMPORTANT: keep event name consistent with parent listener (@update:sortBy)
  emit('update:sortBy', mappedKey)

  sortOpen.value = false
}

function onDocClick(e) {
  if (!sortWrapper.value?.contains(e.target)) sortOpen.value = false
}

onMounted(() => document.addEventListener('click', onDocClick, { capture: true }))
onBeforeUnmount(() => document.removeEventListener('click', onDocClick, { capture: true }))

// ===========================
// Utility Methods
// ===========================

/**
 * Get color for task status
 */
const getStatusColor = (status) => {
  const colors = {
    'Ongoing': 'blue',
    'Completed': 'green',
    'Pending Review': 'orange',
    'Unassigned': 'grey'
  }
  return colors[status] || 'grey'
}

/**
 * Format date string to localized date
 */
const formatDate = (dateString) => {
  if (!dateString) return ''
  
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  } catch (error) {
    return dateString
  }
}

/**
 * Format date string to localized datetime
 */
const formatDateTime = (dateString) => {
  if (!dateString) return ''
  
  try {
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
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
// Expose Methods (Optional)
// ===========================
/**
 * Expose methods for parent component to call directly
 */
defineExpose({
  clearSelection: () => {
    selectedTask.value = null
    selectedTaskIds.value = []
    bulkSelectMode.value = false
  },
  selectTaskById: (taskId) => {
    const task = flattenedTasks.value.find(t => t.id === taskId)
    if (task) {
      selectTask(task)
    }
  },
  enterBulkMode: () => {
    bulkSelectMode.value = true
  },
  exitBulkMode: () => {
    cancelBulkSelect()
  },
  getSelectedTaskIds: () => {
    return [...selectedTaskIds.value]
  }
})
</script>

<template>
  <div class="list-view-content">
    <!-- Main Content Area -->
    <div class="main-content">
      <!-- View Toggle Bar - SPANS FULL WIDTH ACROSS BOTH PANELS -->
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
            <!-- SORT ORDER TOGGLE -->
            <button
              class="sort-order-btn"
              type="button"
              :class="{ 'sort-order-active': sortOrder === 'desc' }"
              @click="toggleSortOrder"
              :title="sortOrder === 'asc' ? 'Sort descending' : 'Sort ascending'"
            >
              <v-icon size="small">mdi-sort</v-icon>
            </button>

            <!-- SORT BY (self-contained, no nextTick needed) -->
            <div class="sort-wrapper" ref="sortWrapper">
              <button
                class="sort-btn"
                type="button"
                @click.stop="sortOpen = !sortOpen"
                aria-haspopup="menu"
                :aria-expanded="sortOpen ? 'true' : 'false'"
              >
                <span class="sort-label">Sort By:</span>
                <span class="current-sort">{{ currentSort }}</span>
              </button>

              <!-- Always present in DOM; just toggled with v-show -->
              <div
                class="custom-filter-dropdown"
                v-show="sortOpen"
                role="menu"
                @click.stop
              >
                <div class="dropdown-header">
                  <div class="dropdown-title">Sort tasks by</div>
                </div>

                <ul class="filter-options-list">
                  <li
                    class="filter-option-item"
                    :class="{ 'active': currentSort === 'Priority' }"
                    role="menuitemradio"
                    :aria-checked="currentSort === 'Priority'"
                    @click="selectSort('priority')"
                  >
                    <input
                      class="custom-radio"
                      type="radio"
                      name="sort"
                      :checked="currentSort === 'Priority'"
                      readonly
                    />
                    <span>Priority</span>
                  </li>

                  <li
                    class="filter-option-item"
                    :class="{ 'active': currentSort === 'Status' }"
                    role="menuitemradio"
                    :aria-checked="currentSort === 'Status'"
                    @click="selectSort('status')"
                  >
                    <input
                      class="custom-radio"
                      type="radio"
                      name="sort"
                      :checked="currentSort === 'Status'"
                      readonly
                    />
                    <span>Status</span>
                  </li>

                  <li
                    class="filter-option-item"
                    :class="{ 'active': currentSort === 'Due Date' }"
                    role="menuitemradio"
                    :aria-checked="currentSort === 'Due Date'"
                    @click="selectSort('dueDate')"
                  >
                    <input
                      class="custom-radio"
                      type="radio"
                      name="sort"
                      :checked="currentSort === 'Due Date'"
                      readonly
                    />
                    <span>Due date</span>
                  </li>
                </ul>
              </div>
            </div>

            <v-btn
              v-if="!bulkSelectMode"
              icon="mdi-checkbox-multiple-marked-outline"
              variant="text"
              @click="bulkSelectMode = true"
              title="Bulk select mode"
              size="small"
            />
            <v-btn
              v-else
              color="error"
              @click="cancelBulkSelect"
              prepend-icon="mdi-close"
              size="small"
              variant="tonal"
            >
              Cancel
            </v-btn>


          </div>
        </div>
      </div>

      <!-- Content Panels Wrapper - Side by Side -->
      <div class="content-panels-wrapper">
        <!-- Left Panel: Task List -->
        <div class="task-list-panel">
          <!-- Select All (only in bulk mode) -->
          <div v-if="bulkSelectMode" class="select-all-bar">
            <v-checkbox
              :model-value="allSelected"
              @update:model-value="toggleSelectAll"
              label="Select All"
              hide-details
              density="compact"
              color="primary"
            />
          </div>

          <!-- Bulk Actions Bar (shown when items selected) -->
          <div v-if="bulkSelectMode && selectedTaskIds.length > 0" class="bulk-actions-bar">
            <div class="bulk-info">
              <v-icon>mdi-checkbox-multiple-marked</v-icon>
              <span class="bulk-count">{{ selectedTaskIds.length }} task(s) selected</span>
            </div>
            <div class="bulk-action-buttons">
              <v-btn size="small" @click="bulkUpdateStatus" prepend-icon="mdi-update" variant="tonal">
                Update Status
              </v-btn>
              <v-btn size="small" @click="bulkDelete" color="error" prepend-icon="mdi-delete" variant="tonal">
                Delete
              </v-btn>
            </div>
          </div>

          <!-- Task List Scroll Area -->
          <div class="tasks-list-scroll">
            <!-- Task Cards -->
            <div 
              v-for="task in sortedTasks" 
              :key="task.id"
              class="task-list-card"
              :class="{ 
                'active': selectedTaskId === task.id,
                'bulk-selected': selectedTaskIds.includes(task.id)
              }"
              @click="handleTaskClick(task)"
            >
              <v-checkbox
                v-if="bulkSelectMode"
                :model-value="selectedTaskIds.includes(task.id)"
                @click.stop
                @update:model-value="toggleTaskSelection(task.id)"
                class="bulk-checkbox"
                hide-details
                density="compact"
              />

              <div class="task-card-content" :class="{ 'with-checkbox': bulkSelectMode }">
                <div class="task-list-header">
                  <h4 class="task-list-title">{{ task.title }}</h4>
                  <v-chip 
                    :color="getStatusColor(task.status)" 
                    size="small"
                    rounded="lg"
                    variant="flat"
                  >
                    {{ task.status }}
                  </v-chip>
                </div>

                <div class="task-list-meta">
                  <div v-if="task.dueDate" class="meta-item">
                    <v-icon size="small">mdi-calendar</v-icon>
                    <span>{{ formatDate(task.dueDate) }}</span>
                  </div>
                  <div v-if="task.assignedTo" class="meta-item">
                    <v-icon size="small">mdi-account</v-icon>
                    <span>{{ task.assignedTo }}</span>
                  </div>
                  <div v-if="task.priority" class="meta-item">
                    <v-icon size="small">mdi-flag</v-icon>
                    <span>P{{ task.priority }}</span>
                  </div>
                </div>

                <p class="task-list-description" v-if="task.description">
                  {{ truncateText(task.description, 100) }}
                </p>

                <div class="task-badges">
                  <div class="task-subtasks-indicator" v-if="task.subtasks && task.subtasks.length > 0">
                    <v-icon size="small">mdi-file-tree</v-icon>
                    <span>{{ task.subtasks.length }} subtask(s)</span>
                  </div>

                  <div v-if="task.isSubtask && task.parentTask" class="subtask-badge">
                    <v-icon size="x-small">mdi-subdirectory-arrow-right</v-icon>
                    <span class="parent-task-name">{{ task.parentTask.title }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Empty State -->
            <div v-if="filteredTasks.length === 0" class="no-tasks-message">
              <v-icon size="64" color="grey-lighten-1">mdi-clipboard-text-outline</v-icon>
              <p class="empty-title">No tasks found</p>
              <p class="empty-subtitle">
                Try adjusting your search or filters
              </p>
            </div>
          </div>
        </div>

        <!-- Right Panel: Task Details -->
        <div class="task-detail-panel">
          <!-- No Selection State -->
          <div v-if="!selectedTask" class="no-selection">
            <v-icon size="80" color="grey-lighten-2">mdi-clipboard-text-search-outline</v-icon>
            <h3>Select a task to view details</h3>
            <p>Click on any task from the list to see its full details here</p>
          </div>

          <!-- Task Detail Content -->
          <div v-else class="task-detail-content">
            <!-- Header -->
            <div class="detail-header">
              <div class="detail-title-section">
                <h2>{{ selectedTask.title }}</h2>
                <div class="detail-chips">
                  <v-chip
                    :color="getStatusColor(selectedTask.status)"
                    size="small"
                    rounded="lg"
                    variant="flat"
                  >
                    {{ selectedTask.status }}
                  </v-chip>
                  <v-chip
                    v-if="selectedTask.isSubtask"
                    color="secondary"
                    size="small"
                    rounded="lg"
                    variant="tonal"
                  >
                    Subtask
                  </v-chip>
                  <v-chip
                    v-else
                    color="primary"
                    size="small"
                    rounded="lg"
                    variant="tonal"
                  >
                    Task
                  </v-chip>
                </div>
              </div>

              <v-btn
                color="primary"
                @click="$emit('edit-task', selectedTask)"
                prepend-icon="mdi-pencil"
                rounded="lg"
              >
                Edit
              </v-btn>
            </div>

            <v-divider class="my-4"></v-divider>

            <!-- Task Details Body -->
            <div class="detail-body">
              <!-- Row 1: Description and Due Date -->
              <v-row>
                <v-col cols="12" md="6">
                  <div class="detail-section">
                    <div class="detail-section-icon-row">
                      <v-icon size="small" class="detail-icon">mdi-text</v-icon>
                      <h4>Description</h4>
                    </div>
                    <p>{{ selectedTask.description || "No description provided" }}</p>
                  </div>
                </v-col>
                <v-col cols="12" md="6">
                  <div class="detail-section">
                    <div class="detail-section-icon-row">
                      <v-icon size="small" class="detail-icon">mdi-calendar-outline</v-icon>
                      <h4>Due Date</h4>
                    </div>
                    <p>{{ selectedTask.dueDate ? formatDate(selectedTask.dueDate) : 'No due date' }}</p>
                  </div>
                </v-col>
              </v-row>

              <!-- Row 2: Assignee and Priority -->
              <v-row>
                <v-col cols="12" md="6">
                  <div class="detail-section">
                    <div class="detail-section-icon-row">
                      <v-icon size="small" class="detail-icon">mdi-account</v-icon>
                      <h4>Assigned To</h4>
                    </div>
                    <p>{{ selectedTask.assignedTo || 'Unassigned' }}</p>
                  </div>
                </v-col>
                <v-col cols="12" md="6">
                  <div class="detail-section">
                    <div class="detail-section-icon-row">
                      <v-icon size="small" class="detail-icon">mdi-priority-high</v-icon>
                      <h4>Priority</h4>
                    </div>
                    <p>{{ selectedTask.priority ? 'P' + selectedTask.priority : 'Not set' }}</p>
                  </div>
                </v-col>
              </v-row>

              <!-- Row 3: Collaborators (if exists) -->
              <v-row v-if="selectedTask.collaborators && selectedTask.collaborators.length > 0">
                <v-col cols="12">
                  <div class="detail-section">
                    <div class="detail-section-icon-row">
                      <v-icon size="small" class="detail-icon">mdi-account-group</v-icon>
                      <h4>Collaborators</h4>
                    </div>
                    <div class="collaborators-list">
                      <v-chip
                        v-for="collaborator in selectedTask.collaborators"
                        :key="collaborator"
                        size="small"
                        class="mr-2"
                        variant="tonal"
                      >
                        {{ collaborator }}
                      </v-chip>
                    </div>
                  </div>
                </v-col>
              </v-row>

              <!-- Progress Bar (for tasks with subtasks) -->
              <div class="detail-section" v-if="selectedTask.subtasks && selectedTask.subtasks.length > 0">
                <h4>Progress</h4>
                <div class="progress-bar-container">
                  <div class="custom-progress-bar">
                    <div class="progress-fill" :style="{ width: calculateProgress(selectedTask) + '%' }"></div>
                  </div>
                  <span class="progress-text">{{ calculateProgress(selectedTask) }}%</span>
                </div>
              </div>

              <!-- Attachments -->
              <div class="detail-section" v-if="selectedTask.attachments && selectedTask.attachments.length > 0">
                <h4>Attachments ({{ selectedTask.attachments.length }})</h4>
                <div class="attachments-list">
                  <v-chip
                    v-for="attachment in selectedTask.attachments"
                    :key="attachment.url"
                    variant="outlined"
                    class="attachment-chip"
                    @click="$emit('open-attachment', attachment.url)"
                    prepend-icon="mdi-paperclip"
                  >
                    {{ attachment.name }}
                  </v-chip>
                </div>
              </div>

              <!-- Status History -->
              <div class="detail-section" v-if="selectedTask.statusHistory && selectedTask.statusHistory.length > 0">
                <h4>Status History</h4>
                <div class="status-updates">
                  <div v-for="(entry, idx) in selectedTask.statusHistory" :key="idx" class="status-entry">
                    <div class="status-dot" :style="{ backgroundColor: getStatusColor(entry.newStatus) }"></div>
                    <div class="status-info">
                      <div class="status-description">
                        Status changed 
                        <span v-if="entry.oldStatus">from <strong>{{ entry.oldStatus }}</strong></span>
                        to <v-chip size="x-small" :color="getStatusColor(entry.newStatus)" variant="flat">{{ entry.newStatus }}</v-chip>
                      </div>
                      <div class="status-timestamp">{{ formatDateTime(entry.timestamp) }}</div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Subtasks List -->
              <div class="detail-section" v-if="selectedTask.subtasks && selectedTask.subtasks.length > 0">
                <h4>Subtasks ({{ selectedTask.subtasks.length }})</h4>
                <div class="subtask-list">
                  <div v-for="(subtask, index) in selectedTask.subtasks" :key="subtask.id || index" class="subtask-item">
                    <div class="subtask-info">
                      <div class="subtask-title">{{ subtask.title }}</div>
                      <div class="subtask-status">
                        <v-chip
                          :color="getStatusColor(subtask.status)"
                          size="small"
                          rounded="lg"
                          variant="flat"
                        >
                          {{ subtask.status }}
                        </v-chip>
                      </div>
                    </div>
                    <div class="subtask-meta">
                      <span v-if="subtask.assignedTo" class="subtask-assignee">
                        <v-icon size="x-small">mdi-account</v-icon>
                        {{ subtask.assignedTo }}
                      </span>
                      <span v-if="subtask.dueDate" class="subtask-date">
                        <v-icon size="x-small">mdi-calendar</v-icon>
                        {{ formatDate(subtask.dueDate) }}
                      </span>
                      <span v-if="subtask.priority" class="subtask-priority">
                        <v-icon size="x-small">mdi-flag</v-icon>
                        P{{ subtask.priority }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Parent Task Reference (for subtasks) -->
              <div class="detail-section" v-if="selectedTask.isSubtask && selectedTask.parentTask">
                <h4>Parent Task</h4>
                <div class="parent-task-card">
                  <v-btn
                    variant="outlined"
                    @click="$emit('view-parent', selectedTask.parentTask)"
                    class="parent-task-btn"
                    block
                  >
                    <v-icon start>mdi-file-tree</v-icon>
                    {{ selectedTask.parentTask.title }}
                  </v-btn>
                </div>
              </div>

              <!-- Status Update Action -->
              <div class="detail-actions">
                <v-select
                  :model-value="selectedTask.status"
                  :items="taskStatuses"
                  label="Update Status"
                  variant="outlined"
                  density="comfortable"
                  @update:modelValue="handleStatusChange($event)"
                  prepend-inner-icon="mdi-update"
                  class="status-update-select"
                ></v-select>
              </div>
            </div>
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
.list-view-content {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
  background: transparent;
}

/* ===========================
   Main Content Area
   =========================== */
.main-content {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
}

/* ===========================
   View Toggle Bar Wrapper - SPANS FULL WIDTH
   =========================== */
.view-toggle-bar-wrapper {
  width: 100%;
  background: #f8fafc;
  border-bottom: 1px solid #e0e0e0;
  flex-shrink: 0;
}

.view-toggle-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  gap: 16px;
}

.view-tabs {
  display: flex;
  gap: 8px;
  background: #e8eaed;
  padding: 4px;
  border-radius: 8px;
}

.view-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  color: #5f6368;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.view-tab:hover {
  background: rgba(255, 255, 255, 0.5);
}

.view-tab.active {
  background: #ffffff;
  color: #1a73e8;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
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
}

/* ===========================
   Content Panels Wrapper - Side by Side
   =========================== */
.content-panels-wrapper {
  display: flex;
  flex: 1;
  overflow: hidden;
  gap: 0;
}

/* ===========================
   Left Panel: Task List
   =========================== */
.task-list-panel {
  width: 40%;
  min-width: 350px;
  max-width: 600px;
  background: white;
  border-right: 2px solid #e0e0e0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex-shrink: 0;
}

/* ===========================
    View Toggle Bar (Kanban/List + Actions)
    =========================== */
.view-toggle-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  background: #f8fafc;
  border-bottom: 1px solid #e0e0e0;
  gap: 16px;
}

/* Sort Order Toggle Button */
.sort-order-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid rgba(0,0,0,.12);
  background: #fff;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  transition: all 0.2s ease;
  width: 40px;
  height: 40px;
}

.sort-order-btn:hover {
  background: #f9fafb;
  border-color: #d1d5db;
}

.sort-order-active {
  background-color: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
  border-color: #3b82f6;
}

.view-tabs {
  display: flex;
  gap: 8px;
  background: #e8eaed;
  padding: 4px;
  border-radius: 8px;
}

.view-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  color: #5f6368;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.view-tab:hover {
  background: rgba(255, 255, 255, 0.5);
}

.view-tab.active {
  background: #ffffff;
  color: #1a73e8;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.view-tab .v-icon {
  color: inherit;
}

.view-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}



/* ===========================
   Bulk Actions Bar
   =========================== */
.bulk-actions-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-bottom: 2px solid #5a67d8;
  color: white;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
}

.bulk-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.bulk-count {
  font-weight: 600;
  font-size: 14px;
}

.bulk-action-buttons {
  display: flex;
  gap: 10px;
}

.bulk-action-buttons .v-btn {
  background: white;
  color: #5a67d8;
  font-weight: 600;
}

.bulk-action-buttons .v-btn[color="error"] {
  background: white;
  color: #ef4444;
}

/* Task List Scroll Area */
.tasks-list-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.tasks-list-scroll::-webkit-scrollbar {
  width: 8px;
}

.tasks-list-scroll::-webkit-scrollbar-track {
  background: #f1f5f9;
}

.tasks-list-scroll::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}

.tasks-list-scroll::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

/* ===========================
   Task List Cards
   =========================== */
.task-list-card {
  background: white;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  padding: 18px;
  margin-bottom: 14px;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.task-list-card:hover {
  border-color: #3b82f6;
  box-shadow: 0 4px 16px rgba(59, 130, 246, 0.15);
  transform: translateX(4px);
}

.task-list-card.active {
  border-color: #2563eb;
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
  box-shadow: 0 4px 20px rgba(37, 99, 235, 0.25);
  transform: translateX(6px);
}

.task-list-card.bulk-selected {
  border-color: #8b5cf6;
  background: linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%);
  box-shadow: 0 4px 16px rgba(139, 92, 246, 0.2);
}

.bulk-checkbox {
  position: absolute;
  top: 14px;
  left: 14px;
  z-index: 10;
}

.task-card-content {
  transition: padding-left 0.2s ease;
}

.task-card-content.with-checkbox {
  padding-left: 40px;
}

.task-list-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 12px;
}

.task-list-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
  flex: 1;
  line-height: 1.5;
  word-break: break-word;
}

.task-list-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  margin-bottom: 10px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
  color: #64748b;
  font-weight: 500;
}

.meta-item .v-icon {
  color: #94a3b8;
}

.task-list-description {
  margin: 10px 0 0 0;
  font-size: 14px;
  color: #475569;
  line-height: 1.6;
}

.task-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.task-subtasks-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
  border-radius: 8px;
  font-size: 12px;
  color: #64748b;
  width: fit-content;
  font-weight: 600;
  border: 1px solid #cbd5e1;
}

.subtask-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%);
  border-radius: 8px;
  font-size: 12px;
  color: #7c3aed;
  width: fit-content;
  border: 1px solid #c4b5fd;
}

.parent-task-name {
  font-weight: 600;
}

/* ===========================
   Empty States
   =========================== */
.no-tasks-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  text-align: center;
  color: #64748b;
}

.no-tasks-message .v-icon {
  opacity: 0.4;
  margin-bottom: 20px;
}

.empty-title {
  margin: 0 0 10px 0;
  font-size: 20px;
  font-weight: 700;
  color: #475569;
}

.empty-subtitle {
  margin: 0 0 20px 0;
  font-size: 15px;
  color: #94a3b8;
  max-width: 400px;
}

/* ===========================
   Right Panel: Task Details
   =========================== */
.task-detail-panel {
  flex: 1;
  background: #ffffff;
  overflow-y: auto;
  position: relative;
  width: 100%;
}
.task-detail-panel::-webkit-scrollbar {
  width: 10px;
}

.task-detail-panel::-webkit-scrollbar-track {
  background: #f8fafc;
}

.task-detail-panel::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 5px;
}

.task-detail-panel::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

.no-selection {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 60px;
  text-align: center;
  color: #64748b;
}

.no-selection .v-icon {
  opacity: 0.25;
  margin-bottom: 24px;
}

.no-selection h3 {
  margin: 0 0 12px 0;
  font-size: 22px;
  color: #475569;
  font-weight: 700;
}

.no-selection p {
  margin: 0;
  font-size: 15px;
  color: #94a3b8;
  max-width: 400px;
}

/* Task Detail Content */
.task-detail-content {
  padding: 32px 40px;
  animation: fadeIn 0.35s ease;
  max-width: 1000px;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(15px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 24px;
  margin-bottom: 20px;
}

.detail-title-section {
  flex: 1;
}

.detail-title-section h2 {
  margin: 0 0 14px 0;
  font-size: 28px;
  font-weight: 700;
  color: #1e293b;
  line-height: 1.3;
  word-break: break-word;
}

.detail-chips {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.detail-body {
  margin-top: 24px;
}

.detail-section {
  margin-bottom: 28px;
}

.detail-section-icon-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.detail-section h4 {
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.8px;
}

.detail-section p {
  margin: 0;
  font-size: 15px;
  color: #334155;
  line-height: 1.7;
}

.detail-icon {
  color: #94a3b8;
}

/* Collaborators List */
.collaborators-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 10px;
}

/* Progress Bar */
.progress-bar-container {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-top: 12px;
}

.custom-progress-bar {
  flex: 1;
  height: 28px;
  background: #e2e8f0;
  border-radius: 14px;
  overflow: hidden;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.08);
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #10b981 0%, #34d399 100%);
  border-radius: 14px;
  transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 6px rgba(16, 185, 129, 0.4);
}

.progress-text {
  font-size: 15px;
  font-weight: 700;
  color: #1e293b;
  min-width: 50px;
  text-align: right;
}

/* Attachments */
.attachments-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 12px;
}

.attachment-chip {
  cursor: pointer;
  transition: all 0.25s ease;
  border: 1.5px solid #cbd5e1;
  font-weight: 500;
}

.attachment-chip:hover {
  background-color: rgba(59, 130, 246, 0.08) !important;
  border-color: #3b82f6;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(59, 130, 246, 0.15);
}

/* Status History */
.status-updates {
  margin-top: 14px;
  padding: 20px;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-radius: 12px;
  border: 1.5px solid #e2e8f0;
}

.status-entry {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 12px 0;
}

.status-entry:not(:last-child) {
  border-bottom: 1px solid #e2e8f0;
  padding-bottom: 14px;
  margin-bottom: 14px;
}

.status-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  margin-top: 5px;
  flex-shrink: 0;
  box-shadow: 0 0 0 4px rgba(0, 0, 0, 0.08);
}

.status-info {
  flex: 1;
}

.status-description {
  display: flex;
  align-items: center;
  gap: 7px;
  flex-wrap: wrap;
  font-size: 14px;
  color: #334155;
  margin-bottom: 6px;
  font-weight: 500;
}

.status-description strong {
  color: #1e293b;
  font-weight: 700;
}

.status-timestamp {
  font-size: 12px;
  color: #64748b;
  font-style: italic;
  font-weight: 500;
}

/* Subtasks List */
.subtask-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 14px;
}

.subtask-item {
  background: linear-gradient(135deg, #fafafa 0%, #ffffff 100%);
  border-radius: 12px;
  padding: 16px;
  border: 2px solid #e2e8f0;
  transition: all 0.25s ease;
}

.subtask-item:hover {
  border-color: #3b82f6;
  box-shadow: 0 3px 10px rgba(59, 130, 246, 0.12);
  transform: translateX(6px);
}

.subtask-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  gap: 14px;
}

.subtask-title {
  font-weight: 600;
  font-size: 14px;
  color: #1e293b;
  flex: 1;
  line-height: 1.5;
}

.subtask-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 12px;
  color: #64748b;
}

.subtask-assignee,
.subtask-date,
.subtask-priority {
  display: flex;
  align-items: center;
  gap: 5px;
  background: white;
  padding: 5px 10px;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  font-weight: 600;
}

/* Parent Task Card */
.parent-task-card {
  margin-top: 12px;
}

.parent-task-btn {
  text-transform: none;
  justify-content: flex-start;
  font-weight: 600;
  padding: 14px 18px;
  border: 2px solid #e2e8f0;
  transition: all 0.25s ease;
  color: #1e293b;
}

.parent-task-btn:hover {
  border-color: #3b82f6;
  background: rgba(59, 130, 246, 0.06);
  transform: translateX(6px);
  box-shadow: 0 3px 10px rgba(59, 130, 246, 0.15);
}

/* Actions */
.detail-actions {
  margin-top: 36px;
  padding-top: 28px;
  border-top: 2px solid #e2e8f0;
}

.status-update-select {
  max-width: 350px;
}

/* ===========================
   Responsive Design
   =========================== */
@media (max-width: 1400px) {
  .task-list-panel {
    width: 50%;
  }
}

@media (max-width: 1200px) {
  .task-detail-content {
    padding: 24px 30px;
  }
}

@media (max-width: 1024px) {
  .main-content {
    flex-direction: column;
  }
  
  .task-list-panel {
    width: 100%;
    max-width: none;
    height: 50vh;
    border-right: none;
    border-bottom: 2px solid #e0e0e0;
  }
  
  .task-detail-panel {
    height: 50vh;
  }
}

@media (max-width: 768px) {
  .task-list-panel {
    min-width: auto;
  }

  .view-toggle-bar {
    flex-wrap: wrap;
    gap: 10px;
  }

  .view-tabs {
    flex: 1;
    min-width: 200px;
  }

  .view-actions {
    flex: 1;
    justify-content: flex-end;
  }

  .bulk-actions-bar {
    flex-direction: column;
    gap: 10px;
    align-items: stretch;
    padding: 12px 16px;
  }

  .bulk-action-buttons {
    width: 100%;
    justify-content: stretch;
  }

  .bulk-action-buttons .v-btn {
    flex: 1;
  }
  
  .detail-header {
    flex-direction: column;
  }
  
  .detail-title-section h2 {
    font-size: 24px;
  }

  .task-detail-content {
    padding: 20px;
  }

  .status-update-select {
    max-width: 100%;
  }
}

@media (max-width: 480px) {
  .task-list-card {
    padding: 14px;
  }

  .task-list-title {
    font-size: 15px;
  }

  .meta-item {
    font-size: 12px;
  }

  .task-list-description {
    font-size: 13px;
  }
}

/* ===========================
      Sort By Dropdown
      =========================== */
.sort-item-icon {
  color: #757575;
  flex-shrink: 0;
}

.sort-item-check {
  color: #2e7d32;
  flex-shrink: 0;
}

/* wrapper anchors the absolute menu */
.sort-wrapper {
  position: relative;
  display: inline-block; /* keeps menu aligned to the button */
}

/* your existing button styles can stay; here’s a neutral base */
.sort-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid rgba(0,0,0,.12);
  background: #fff;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  transition: all 0.2s ease;
}

.sort-btn:hover {
  background: #f9fafb;
  border-color: #d1d5db;
}

.sort-label {
  color: #6b7280;
  font-weight: 500;
}

.current-sort {
  color: #1f2937;
  font-weight: 600;
}

/* DROPDOWN: now absolutely positioned under the button */
.custom-filter-dropdown {
  position: absolute;
  top: calc(100% + 8px); /* under the button */
  right: 0;
  min-width: 240px;
  z-index: 1000;
  background: var(--bg-primary, #fff);
  border: 1px solid rgba(0,0,0,0.1);
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.12);
  overflow: hidden;
}

/* keep your existing decorative classes */
.dropdown-header {
  padding: 14px 16px;
  border-bottom: 1px solid rgba(0,0,0,.08);
}

.dropdown-title {
  font-weight: 600;
  font-size: 14px;
}

.filter-options-list {
  max-height: 220px;
  overflow-y: auto;
  margin: 0;
  padding: 6px 0;
  list-style: none;
}

.filter-option-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  cursor: pointer;
  user-select: none;
}

.filter-option-item:hover {
  background-color: rgba(0,0,0,0.05);
}

.filter-option-item.active {
  background-color: rgba(59, 130, 246, 0.1);
  border-left: 3px solid #3b82f6;
}

.filter-option-item.active .custom-radio {
  accent-color: #3b82f6;
}

.custom-radio {
  pointer-events: none; /* click on whole row */
}

/* ===========================
    Transitions & Animations
    =========================== */
.task-list-card,
.subtask-item,
.attachment-chip,
.parent-task-btn {
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.progress-fill {
  transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Slide in animation for list items */
.task-list-card {
  animation: slideIn 0.35s ease;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(-12px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* Smooth hover transitions */
.v-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.v-btn:active {
  transform: translateY(0);
}

/* Dark mode support */
[data-theme="dark"] .task-list-panel,
[data-theme="dark"] .task-detail-panel {
  background: #1e293b;
  border-color: rgba(255, 255, 255, 0.08);
}

[data-theme="dark"] .task-list-card {
  background: #2d3748;
  border-color: rgba(255, 255, 255, 0.1);
}

[data-theme="dark"] .task-list-title,
[data-theme="dark"] .detail-title-section h2,
[data-theme="dark"] .subtask-title {
  color: #f1f5f9;
}

[data-theme="dark"] .meta-item,
[data-theme="dark"] .task-list-description,
[data-theme="dark"] .detail-section p {
  color: #cbd5e1;
}

[data-theme="dark"] .select-all-bar,
[data-theme="dark"] .action-buttons-bar {
  background: #1a202c;
  border-color: rgba(255, 255, 255, 0.08);
}

[data-theme="dark"] .status-updates {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.1);
}

[data-theme="dark"] .subtask-item {
  background: #2d3748;
  border-color: rgba(255, 255, 255, 0.1);
}

[data-theme="dark"] .subtask-assignee,
[data-theme="dark"] .subtask-date,
[data-theme="dark"] .subtask-priority {
  background: #1a202c;
  border-color: rgba(255, 255, 255, 0.08);
}
</style>