<template>
  <div class="recurring-tasks-sidebar" :class="{ 'sidebar-collapsed': !sidebarOpen }">
    <div class="sidebar-header">
      <div v-if="sidebarOpen" class="header-content">
        <h3>Recurring Tasks</h3>
      </div>
      <v-btn 
        :icon="sidebarOpen ? 'mdi-chevron-left' : 'mdi-chevron-right'"
        size="small"
        variant="text"
        @click="toggleSidebar"
        class="collapse-btn"
      />
    </div>
    <div v-if="!sidebarOpen" class="collapsed-repeat-row">
      <v-icon color="primary" size="28">mdi-repeat</v-icon>
    </div>
    <div v-if="sidebarOpen" class="recurring-tasks-list">
      <RecurringTaskItem
        v-for="task in recurringTasks"
        :key="task.id"
        :task="task"
        :is-editing="editingId === task.id"
        @edit="onEditRecurringTask"
      />
      <div v-if="recurringTasks.length === 0" class="no-tasks">
        No recurring tasks found.
      </div>
    </div>
    <EditRecurrenceDialog
      v-if="editingTask"
      :show="!!editingTask"
      :recurrence="editingTask.recurrence"
      @close="closeEdit"
      @save="saveEdit"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import RecurringTaskItem from './RecurringTaskItem.vue'
import EditRecurrenceDialog from './EditRecurrenceDialog.vue'
import axios from 'axios'

const recurringTasks = ref([])
const sidebarOpen = ref(true)
const editingId = ref(null)

const editingTask = computed(() =>
  recurringTasks.value.find(t => t.id === editingId.value)
)

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

const onEditRecurringTask = (task) => {
  editingId.value = task.id
}
const closeEdit = () => {
  editingId.value = null
}
const saveEdit = async (newRecurrence) => {
  if (!editingTask.value) return
  // Call your backend API to update recurrence
  await axios.put(`http://localhost:3000/api/tasks/recurring/${editingTask.value.id}`, {
    userId: editingTask.value.userId,
    recurrence: newRecurrence
  })
  closeEdit()
  fetchRecurringTasks()
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
  min-height: 56px;
}
.header-content {
  display: flex;
  align-items: center;
}
.collapsed-repeat-row {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px 0 0 0;
}
.recurring-tasks-list {
  flex: 1;
  overflow-y: auto;
  padding: 12px 8px 12px 8px;
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
.collapse-btn {
  transition: transform 0.2s;
}
</style>