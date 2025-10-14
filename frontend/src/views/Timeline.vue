<template>
  <div class="main-view-area">
    
    <div class="view-header">
      <div class="header-left">
        <h1>Task Timeline</h1>
        <p class="date-subtitle">Visualize tasks over time with the Frappe Gantt chart</p>
      </div>
      <div class="header-right">
        <v-btn color="primary" prepend-icon="mdi-plus" @click="$emit('addTask')" rounded="lg" class="add-task-btn">
          Add Task
        </v-btn>
      </div>
    </div>

    <div class="view-controls">
      <div class="controls-row">
        <div class="view-toggle-left">
          <div class="view-tabs button-spacing-fix">
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

// 🚨 CSS IMPORT: Using the specific local path you determined.
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

// 🚨 ESSENTIAL FIX: Helper function to convert complex date format to YYYY-MM-DD
const parseGanttDate = (dateString) => {
  if (!dateString || typeof dateString !== 'string') return null;

  try {
    // 1. Clean the string to prepare for parsing (removes UTC+8, inserts comma)
    let cleanedString = dateString
      .replace(' at ', ' ')
      .replace(' UTC+8', '');
    
    // Insert a comma before the year/time for better compatibility
    cleanedString = cleanedString.replace(/(\d{1,2}\s+[A-Za-z]+\s+)(\d{4})/, '$1$2,');
      
    const date = new Date(cleanedString);
    
    // 2. Validation and Formatting
    if (isNaN(date) || date.getFullYear() < 2000) {
        // Logging an error here is crucial for debugging if it still fails
        console.error("Date Validation Failed on cleaned string:", cleanedString);
        return null; 
    } 

    // Format into the required YYYY-MM-DD format
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  } catch (e) {
    console.error("FINAL DATE PARSING CRASH:", dateString, e);
    return null;
  }
};


// Simple helper to get status color
const getStatusColor = (status) => {
  const colors = {
    'Ongoing': '#2196f3',
    'Completed': '#4caf50',
    'Pending Review': '#ff9800',
    'Unassigned': '#9e9e9e'
  };
  return colors[status] || '#9e9e9e';
};

// Function to map your status to a CSS class for coloring
const getGanttTaskClass = (status) => {
  switch (status) {
    case 'Completed':
      return 'bar-completed';
    case 'Ongoing':
      return 'bar-ongoing';
    case 'Pending Review':
      return 'bar-pending-review';
    case 'Unassigned':
    default:
      return 'bar-unassigned';
  }
};

// Map your task structure to the Frappe Gantt format
const tasksForGantt = computed(() => {
  return props.tasks
    .filter(task => task.dueDate && task.createdAt) 
    .map(task => {
      
      // ✅ CORRECT LOGIC: Start Date = createdAt, End Date = dueDate
      const startDateString = parseGanttDate(task.createdAt); 
      const endDateString = parseGanttDate(task.dueDate);
      
      // CRITICAL CHECK: If parsing failed on either date, return null to filter later.
      if (!startDateString || !endDateString) {
          return null; 
      }

      let progress = 0;
      if (task.subtasks && task.subtasks.length > 0) {
        const completed = task.subtasks.filter(s => s.status === 'Completed').length;
        progress = Math.round((completed / task.subtasks.length) * 100);
      } else if (task.status === 'Completed') {
        progress = 100;
      }
      
      const customClass = getGanttTaskClass(task.status);

      return {
        id: task.id,
        name: task.title,
        start: startDateString,
        end: endDateString,
        progress: progress,
        custom_class: customClass,
        dependencies: task.dependsOn || '', 
        data: task 
      };
    })
    // Final filter removes any tasks that returned null due to parsing failure
    .filter(task => task !== null); 
});


// === Methods ===

const initializeGantt = () => {
  if (!ganttChart.value) return;

  // 🚨 CRITICAL FIX: Prevent re-initialization with an empty array
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
    // === AESTHETIC ADJUSTMENTS (for better bar visibility) ===
    bar_height: 36,     
    padding: 24,        
    column_width: 60,   
    // =======================================================

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
    
    on_progress_change: (task, progress) => {
      console.log(`Task ${task.name} progress updated to: ${progress}%`);
    },

    custom_popup_html: (task) => {
      const originalTask = props.tasks.find(t => t.id === task.id);
      const statusColor = getStatusColor(originalTask?.status || 'Unassigned');
      
      return `
        <div class="details-container">
          <h5>${task.name}</h5>
          <p>Assigned to: ${originalTask?.assignedTo || 'N/A'}</p>
          <p>Priority: ${originalTask?.priority || 'N/A'}</p>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="background: ${statusColor}; color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px;">${originalTask?.status || 'N/A'}</span>
            <span style="font-size: 10px; color: #7f8c8d;">Progress: ${task.progress}%</span>
          </div>
        </div>
      `;
    }
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
/* NOTE: These styles rely on CSS variables (like --bg-secondary) 
   defined in your global styles or parent component. */

.main-view-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.view-header {
  padding: 16px 24px 12px 24px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}

.view-controls {
  padding: 10px 24px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}

.controls-row {
  justify-content: flex-start;
}

/* 🚨 FIX: Add gap to spread the Day/Week/Month buttons */
.button-spacing-fix {
    gap: 16px; 
}

/* === Frappe Gantt Container Styles === */
.gantt-chart-container {
  flex: 1;
  overflow: auto; 
  padding: 24px;
  position: relative;
  background: var(--bg-secondary);
  min-height: 400px; /* FIX: Enforce minimum height so the bars can draw */
}

.gantt-target {
  min-height: 350px; /* FIX: Enforce minimum height on the SVG target */
}

/* Custom Status Bar Coloring for Gantt Bars (Requires !important to override defaults) */
.bar-completed .bar {
  fill: #4caf50 !important; /* Green */
}

.bar-ongoing .bar {
  fill: #2196f3 !important; /* Blue */
}

.bar-pending-review .bar {
  fill: #ff9800 !important; /* Orange */
}

.bar-unassigned .bar {
  fill: #9e9e9e !important; /* Grey */
}

/* Dark mode adjustments for Frappe Gantt */
[data-theme="dark"] .gantt-chart-container {
  background: transparent;
}

[data-theme="dark"] .gantt .grid-header {
  fill: #2c3e50; 
}

[data-theme="dark"] .gantt .grid-row, 
[data-theme="dark"] .gantt .grid-header {
  stroke: rgba(255, 255, 255, 0.1);
}

[data-theme="dark"] .gantt .date, 
[data-theme="dark"] .gantt .full-date,
[data-theme="dark"] .gantt .bar-label,
[data-theme="dark"] .gantt .name {
  fill: var(--text-primary);
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
.view-tabs {
  border-bottom: none !important;
}

.view-tab {
  padding: 0 0 4px 0 !important; 
}
</style>