<template>
  <div class="recurrence-section">
    <v-select
      v-model="recurrence.type"
      :items="recurrenceTypes"
      label="Recurrence"
      variant="outlined"
      class="mb-3"
    />
    <v-text-field
      v-if="recurrence.type === 'custom'"
      v-model.number="recurrence.interval"
      label="Custom Interval (days)"
      type="number"
      min="1"
      variant="outlined"
      class="mb-3"
    />
    <v-text-field
      v-model="recurrence.startDate"
      label="Recurrence Start Date"
      type="date"
      :min="minDate"
      variant="outlined"
      class="mb-3"
    />
    <v-text-field
      v-model="recurrence.endDate"
      label="Recurrence End Date"
      type="date"
      :min="minDate"
      variant="outlined"
      class="mb-3"
    />
    <v-btn
      variant="text"
      color="error"
      @click="$emit('stop')"
      rounded="lg"
      size="small"
    >
      Stop Recurrence
    </v-btn>
  </div>
</template>

<script setup>
import { computed, watch } from 'vue'

const props = defineProps({
  modelValue: { type: Object, required: true },
  minDate: { type: String, default: () => new Date().toISOString().split('T')[0] }
})
const emit = defineEmits(['update:modelValue', 'stop', 'save', 'update:show'])

const recurrence = computed({
  get: () => props.modelValue,
  set: v => emit('update:modelValue', v)
})

const recurrenceTypes = [
  { title: 'Daily', value: 'daily' },
  { title: 'Weekly', value: 'weekly' },
  { title: 'Monthly', value: 'monthly' },
  { title: 'Custom Interval', value: 'custom' }
]

// Ensure interval is at least 1 for custom
watch(() => recurrence.value.type, (val) => {
  if (val === 'custom' && (!recurrence.value.interval || recurrence.value.interval < 1)) {
    recurrence.value.interval = 1
  }
})

const onSave = () => {
  if (localTask.value.recurrence && localTask.value.recurrence.type) {
    localTask.value.recurrence.enabled = true
  } else {
    localTask.value.recurrence = { enabled: false, type: '', interval: 1, startDate: '', endDate: '' }
  }
  const payload = { ...localTask.value, subtasks: subtasks.value }
  emit('save', payload)
  emit('update:show', false)
}
</script>

<style scoped>
.recurrence-section {
  background: #f5f7fa;
  border-radius: 8px;
  padding: 16px;
  border: 1px solid #e0e0e0;
  margin-bottom: 16px;
}
</style>