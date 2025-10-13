<template>
  <div class="recurring-tasks-sidebar" :class="{ 'sidebar-collapsed': !sidebarOpen }">
    <div class="sidebar-header">
      <h3 v-if="sidebarOpen">Recurring Tasks</h3>
      <v-btn 
        icon="mdi-chevron-right"
        size="small"
        variant="text"
        @click="toggleSidebar"
        class="collapse-btn"
        :class="{ 'rotated': !sidebarOpen }"
      />
    </div>
    <div v-if="sidebarOpen" class="recurring-tasks-list">
      <div
        v-for="task in recurringTasks"
        :key="task.id"
        class="recurring-task-item"
        @click="$emit('select', task)"
      >
        <div class="task-title">
          <v-icon color="primary" size="16" class="mr-1">mdi-repeat</v-icon>
          {{ task.title }}
        </div>
        <div class="task-meta">
          <span class="recurrence-type">{{ formatRecurrence(task.recurrence) }}</span>
          <span class="recurrence-range">
            {{ formatDate(task.recurrence.startDate) }} - {{ formatDate(task.recurrence.endDate) }}
          </span>
        </div>
      </div>
      <div v-if="recurringTasks.length === 0" class="no-tasks">
        No recurring tasks found.
      </div>
    </div>
    <div v-if="!sidebarOpen" class="collapsed-content">
      <v-icon size="24" class="collapsed-icon">mdi-repeat</v-icon>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'

const recurringTasks = ref([])
const sidebarOpen = ref(true)

const toggleSidebar = () => {
  sidebarOpen.value = !sidebarOpen.value
}

const fetchRecurringTasks = async () => {
  try {
    const response = await axios.get('http://localhost:3000/tasks/recurring')
    recurringTasks.value = response.data
  } catch (error) {
    recurringTasks.value = []
  }
}

onMounted(fetchRecurringTasks)

const formatRecurrence = (recurrence) => {
  if (!recurrence) return ''
  if (recurrence.type === 'custom') {
    return `Every ${recurrence.interval} days`
  }
  return `Every ${recurrence.type.charAt(0).toUpperCase() + recurrence.type.slice(1)}`
}

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString()
}
</script>

<style scoped>
.recurring-tasks-sidebar {
  width: 320px;
  background: #f8f9fa;
  border-right: 1px solid #e0e0e0;
  height: 100%;
  display: flex;
  flex-direction: column;
  transition: width 0.2s;
}
.sidebar-header {
  padding: 16px;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.recurring-tasks-list {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}
.recurring-task-item {
  padding: 12px;
  border-radius: 8px;
  background: #fff;
  margin-bottom: 12px;
  cursor: pointer;
  border: 1px solid #e0e0e0;
  transition: background 0.2s;
}
.recurring-task-item:hover {
  background: #e3f2fd;
}
.task-title {
  font-weight: 600;
  font-size: 15px;
  margin-bottom: 4px;
  display: flex;
  align-items: center;
}
.task-meta {
  font-size: 12px;
  color: #757575;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.no-tasks {
  color: #bdbdbd;
  text-align: center;
  margin-top: 40px;
}
.sidebar-collapsed {
  width: 56px !important;
  min-width: 56px;
  max-width: 56px;
  transition: width 0.2s;
}
.collapsed-content {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}
.collapse-btn {
  transition: transform 0.2s;
}
.collapse-btn.rotated {
  transform: rotate(180deg);
}
</style>