<template>
  <div class="recurring-task-item">
    <div class="task-header">
      <h4 class="task-title">{{ task?.title || '' }}</h4>
      <v-btn
        icon
        size="small"
        variant="text"
        :disabled="isEditing"
        @click="emit('edit', task)"
        class="edit-btn"
      >
        <v-icon>mdi-pencil</v-icon>
      </v-btn>
    </div>
    <p class="task-desc">{{ task?.description || '' }}</p>
    <div class="recurrence-info">
      <span class="recurrence-type">{{ formatRecurrenceType }}</span>
      <span class="recurrence-range">{{ formatDateRange }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  task: { type: Object, required: true },
  isEditing: { type: Boolean, default: false }
})

const emit = defineEmits(['edit', 'close-edit'])

const formatRecurrenceType = computed(() => {
  if (!props.task?.recurrence) return ''
  
  const { type, interval } = props.task.recurrence
  
  if (type === 'custom') {
    return `Every ${interval} days`
  }
  
  return `Every ${type.charAt(0).toUpperCase() + type.slice(1)}`
})

const formatDateRange = computed(() => {
  if (!props.task?.recurrence?.startDate || !props.task?.recurrence?.endDate) return ''
  
  const startDate = new Date(props.task.recurrence.startDate)
  const endDate = new Date(props.task.recurrence.endDate)
  
  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric'
    })
  }
  
  return `${formatDate(startDate)} - ${formatDate(endDate)}`
})
</script>

<style scoped>
.recurring-task-item {
  padding: 16px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  margin-bottom: 12px;
  background: white;
}

.task-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.task-title {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
  color: #333;
}

.task-desc {
  color: #666;
  margin: 8px 0;
  font-size: 14px;
}

.recurrence-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
  color: #888;
}

.recurrence-type {
  font-weight: 500;
}

.recurrence-range {
  font-style: italic;
}

.edit-btn:hover {
  background-color: rgba(0, 0, 0, 0.04);
}
</style>