<template>
  <div class="recurring-task-item" :class="{ editing: isEditing }">
    <div class="task-title-row">
      <v-icon color="primary" size="18" class="mr-1">mdi-repeat</v-icon>
      <span class="task-title">{{ task.title }}</span>
      <v-btn
        icon="mdi-pencil"
        size="x-small"
        variant="text"
        class="edit-btn"
        @click.stop="startEdit"
        :disabled="isEditing"
        title="Edit Recurrence"
      />
    </div>
    <div class="task-meta">
      <span class="recurrence-type">{{ formatRecurrence(task.recurrence) }}</span>
      <span class="recurrence-range">
        {{ formatDate(task.recurrence?.startDate) }} - {{ formatDate(task.recurrence?.endDate) }}
      </span>
    </div>
    <div class="task-desc" v-if="task.description">
      {{ task.description }}
    </div>
    <div v-if="isEditing" class="edit-panel">
      <slot name="edit" :task="task" :close="closeEdit"></slot>
    </div>
  </div>
</template>

<script setup>
import { toRefs } from 'vue'

const props = defineProps({
  task: { type: Object, required: true },
  isEditing: { type: Boolean, default: false }
})

const emit = defineEmits(['edit', 'close-edit'])

const startEdit = () => {
  if (!props.isEditing) emit('edit', props.task)
}

const closeEdit = () => {
  emit('close-edit')
}

const formatRecurrence = (recurrence) => {
  if (!recurrence) return ''
  if (recurrence.type === 'custom') {
    return `Every ${recurrence.interval} days`
  }
  if (recurrence.type) {
    return `Every ${recurrence.type.charAt(0).toUpperCase() + recurrence.type.slice(1)}`
  }
  return ''
}

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString()
}
</script>

<style scoped>
.recurring-task-item {
  padding: 14px 12px 10px 12px;
  border-radius: 8px;
  background: #fff;
  margin-bottom: 14px;
  cursor: pointer;
  border: 1px solid #e0e0e0;
  transition: background 0.2s;
  box-shadow: 0 1px 2px rgba(60,60,60,0.03);
  position: relative;
}
.recurring-task-item.editing {
  background: #f3f7fa;
  border-color: #1976d2;
}
.task-title-row {
  display: flex;
  align-items: center;
  font-weight: 600;
  font-size: 16px;
  margin-bottom: 4px;
}
.task-title {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 160px;
}
.edit-btn {
  margin-left: auto;
}
.task-meta {
  font-size: 12px;
  color: #757575;
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-bottom: 4px;
}
.task-desc {
  font-size: 13px;
  color: #616161;
  margin-top: 2px;
  word-break: break-word;
}
.edit-panel {
  margin-top: 10px;
  padding: 10px;
  background: #e3f2fd;
  border-radius: 6px;
}
</style>