<template>
  <div class="main-view-area">
    
    <div class="view-header">
      <div class="header-left">
        <h1>Task Timeline</h1>
        <p class="date-subtitle">Visualize tasks over time with the Frappe Gantt chart</p>
      </div>
      </div>

    <div class="view-controls">
      <div class="controls-row">
        <div class="view-toggle-left">
          <div class="gantt-toggle-buttons">
            <button 
              v-for="mode in viewModes" 
              :key="mode.value"
              @click="ganttViewMode = mode.value"
              :class="['view-tab', { 'active': ganttViewMode === mode.value }]"
            >
              {{ mode.label }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="gantt-chart-container">
      <div ref="ganttChart" class="gantt-target"></div>

      <div v-if="loading" class="loading-overlay">
        <v-progress-circular indeterminate color="primary"></v-progress-circular>
      </div>
      <div v-if="tasksForGantt.length === 0 && !loading" class="no-tasks-message">
        No tasks found for the current filters or missing a due date.
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, defineProps, defineEmits, nextTick } from 'vue';
import Gantt from 'frappe-gantt';

// 🚨 CSS IMPORT: Using the deep relative path you determined.
import '/node_modules/frappe-gantt/dist/frappe-gantt.css'; 

// Define Props and Emits
const props = defineProps({
  tasks: {
    type: Array,
    required: true
  },
  taskStatuses: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(['viewTaskDetails', 'addTask']);

// === State ===
const ganttChart = ref(null);
const ganttInstance = ref(null);
const ganttViewMode = ref('Week'); 
const loading = ref(false);

const viewModes = [
  { label: 'Day', value: 'Day' },
  { label: 'Week', value: 'Week' },
  { label: 'Month', value: 'Month' },
];

// Helper function to convert complex date format to YYYY-MM-DD
const parseGanttDate = (dateString) => {
  if (!dateString || typeof dateString !== 'string') return null;

  try {
    let cleanedString = dateString
      .replace(' at ', ' ')
      .replace(' UTC+8', '');
      
    cleanedString = cleanedString.replace(/(\d{1,2}\s+[A-Za-z]+\s+)(\d{4})/, '$1$2,');

    const date = new Date(cleanedString);
    
    if (isNaN(date) || date.getFullYear() < 2000) {
        return null; 
    } 

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  } catch (e) {
    return null;
  }
};


// Simple helper to get status color (used for pop-up but kept for consistency)
const getStatusColor = (status) => {
  const colors = {
    'Ongoing': '#2196f3',
    'Completed': '#4caf50',
    'Pending Review': '#ff9800',
    'Unassigned': '#9e9e9e'
  };
  return colors[status] || '#9e9e9e';
};

// 🟢 FIX: Function to check for Overdue status (replicated from Tasks.vue logic)
const isTaskOverdue = (dueDate, status) => {
  if (status === 'Completed' || !dueDate) return false;
  
  const now = new Date();
  const todayDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dueDateOnly = new Date(dueDate);
  
  return dueDateOnly < todayDateOnly;
};


// 🟢 FIX: Function made robust for status matching AND Overdue check
const getGanttTaskClass = (task) => {
  const status = task.status;
  const dueDate = task.dueDate;
  const normalizedStatus = status ? status.trim().toLowerCase() : '';

  if (isTaskOverdue(dueDate, status)) {
    return 'bar-overdue'; // 👈 Apply Overdue class first
  }

  switch (normalizedStatus) {
    case 'completed':
      return 'bar-completed';
    case 'ongoing':
      return 'bar-ongoing';
    case 'pending review':
      return 'bar-pending-review';
    case 'unassigned':
    default:
      return 'bar-unassigned';
  }
};

// Map your task structure to the Frappe Gantt format
const tasksForGantt = computed(() => {
  return props.tasks
    .filter(task => task.dueDate && task.createdAt) 
    .map(task => {
      
      let startDateString = parseGanttDate(task.createdAt); 
      let endDateString = parseGanttDate(task.dueDate);
      
      if (!startDateString || !endDateString) {
          return null; 
      }
      
      // 🛑 CRITICAL DATE FIX: Ensure start date is NOT after end date
      const start = new Date(startDateString);
      const end = new Date(endDateString);
      
      if (start > end) {
        startDateString = endDateString; 
      }
      
      const progressToFillBar = 100;
      const customClass = getGanttTaskClass(task); // Pass the whole task object now

      const ganttTask = {
        id: task.id,
        name: task.title,
        start: startDateString,
        end: endDateString,
        progress: progressToFillBar, 
        custom_class: customClass,
        dependencies: task.dependsOn || '', 
        data: task 
      };

      // CRITICAL FIX: To stop the progress text from appearing in the pop-up, 
      delete ganttTask.progress;

      return ganttTask;
    })
    .filter(task => task !== null); 
});

// Since the JS attempt failed, we rely purely on the Unscoped CSS now.
const removeTooltip = () => { /* No action needed here, relies on CSS */ }

// === Methods ===

const initializeGantt = () => {
  if (!ganttChart.value) return;

  if (tasksForGantt.value.length === 0) {
    if (ganttInstance.value) {
      ganttChart.value.innerHTML = '';
      ganttInstance.value = null;
    }
    loading.value = false;
    return;
  }
  
  if (ganttInstance.value) {
    ganttChart.value.innerHTML = '';
  }

  // Frappe Gantt Initialization with configuration options
  ganttInstance.value = new Gantt(ganttChart.value, tasksForGantt.value, {
    bar_height: 36,     
    padding: 24,        
    column_width: 100, 
    view_mode: ganttViewMode.value,
    
    on_click: (task) => {
      const originalTask = props.tasks.find(t => t.id === task.id);
      if (originalTask) {
        emit('viewTaskDetails', originalTask); 
      }
    },
    
    on_date_change: (task, start, end) => {
      console.log(`Task ${task.name} moved to Start: ${start}, End: ${end}`);
    },
    
    // custom_popup_html option is removed
  });

  ganttInstance.value.change_view_mode(ganttViewMode.value);
  loading.value = false;
};

// === Lifecycle Hooks and Watchers ===

onMounted(() => {
  loading.value = true;
  nextTick(initializeGantt);
});

watch(tasksForGantt, (newTasks) => {
  if (newTasks.length > 0 || ganttInstance.value) {
    loading.value = true;
    nextTick(initializeGantt);
  }
}, { deep: true });

watch(ganttViewMode, (newMode) => {
  if (ganttInstance.value) {
    ganttInstance.value.change_view_mode(newMode);
  }
});
</script>

<style scoped>
/* NOTE: All custom Frappe Gantt color/position overrides are in this scoped block, 
   except for the final tooltip kill CSS which is unscoped below. */

.main-view-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 🚨 UI FIX: Header is now consolidated */
.view-header {
  padding: 16px 24px 12px 24px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.view-controls {
  padding: 10px 24px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}

.controls-row {
  justify-content: flex-start;
}

/* 🚨 UI FIX: Targets the container of the Day/Week/Month buttons */
.gantt-toggle-buttons {
    display: flex; 
    gap: 20px; 
}

/* === Frappe Gantt Container Styles === */
.gantt-chart-container {
  flex: 1;
  overflow: auto; 
  padding: 24px;
  position: relative;
  background: var(--bg-secondary);
  min-height: 400px; 
}

.gantt-target {
  min-height: 350px; 
}

/* 🚀 FINAL COLOR FIX (using :deep() for scope bypass) */

/* 🟢 NEW: Overdue Task Bar Styling for Frappe Gantt */
:deep(.bar-overdue rect), 
:deep(.bar-overdue .bar-progress) {
  fill: #f44336 !important; /* Red */
  stroke: #d32f2f !important; /* Darker red border */
}
/* No white label text here, handled by general text rule below */


/* 1. Completed Tasks */
:deep(.bar-completed rect), 
:deep(.bar-completed .bar-progress) {
  fill: #4caf50 !important; /* Green */
}

/* 2. Ongoing Tasks */
:deep(.bar-ongoing rect), 
:deep(.bar-ongoing .bar-progress) {
  fill: #2196f3 !important; /* Blue */
}

/* 3. Pending Review Tasks */
:deep(.bar-pending-review rect), 
:deep(.bar-pending-review .bar-progress) {
  fill: #ff9800 !important; /* Orange */
}

/* 4. Unassigned/Default Tasks */
:deep(.bar-unassigned rect), 
:deep(.bar-unassigned .bar-progress) {
  fill: #9e9e9e !important; /* Grey */
}

/* Hide the progress percentage text */
:deep(.bar-progress-text) {
  display: none !important;
}


/* 🟢 FIX TASK LABELS: SHIFT LABEL TO THE SIDE AND SET DARK COLOR */
:deep(.name) {
    /* Shifts the name right by the width of the name column plus some buffer. */
    transform: translateX(120px) !important;
    text-anchor: start !important; /* Ensure text starts from the left of the new position */
    /* FORCE DARK TEXT for readability against the main calendar/list background */
    fill: #1a202c !important; 
    font-weight: 500;
}

[data-theme="dark"] :deep(.name) {
    /* Retain white/light text in dark mode for the side column */
    fill: var(--text-primary) !important;
}

/* Dark mode adjustments for Frappe Gantt - using :deep() where necessary */
[data-theme="dark"] .gantt-chart-container {
  background: transparent;
}

[data-theme="dark"] :deep(.gantt .grid-header) {
  fill: #2c3e50; 
}

[data-theme="dark"] :deep(.gantt .grid-row), 
[data-theme="dark"] :deep(.gantt .grid-header) {
  stroke: rgba(255, 255, 255, 0.1);
}

[data-theme="dark"] :deep(.gantt .date), 
[data-theme="dark"] :deep(.gantt .full-date) {
  fill: var(--text-primary);
}

/* 🛑 NEW: FORCE DARK TEXT FOR ALL BAR LABELS (TASK NAMES) 
   This ensures task names inside the bars (when they are long) 
   and on the side are legible against a light background. 
   We only keep the white text on the status chip. 
*/
:deep(.gantt .bar-label) {
    fill: #1a202c !important; /* Black/Dark Grey */
}
[data-theme="dark"] :deep(.gantt .bar-label) {
    fill: #ffffff !important; /* White in dark mode */
}


/* Loading/No Tasks Overlay */
.loading-overlay, .no-tasks-message {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 10;
  text-align: center;
}

.no-tasks-message {
  color: #7f8c8d;
  font-size: 16px;
}

/* View Tabs (reusing existing styles) */
.view-tab {
  padding: 0 0 4px 0 !important; 
}
</style>

<style>
/* Targeting the element that Frappe Gantt uses for its default tooltip */
.gantt-details-container {
    display: none !important;
    visibility: hidden !important; 
    opacity: 0 !important;
}
</style>