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
      label="Recurrence Start Date *"
      type="date"
      :min="minDate"
      :error="startDateError"
      :error-messages="startDateError ? 'Start date is required' : ''"
      variant="outlined"
      class="mb-3"
      required
    />
    <v-text-field
      v-model="recurrence.endDate"
      label="Recurrence End Date *"
      type="date"
      :min="recurrence.startDate || minDate"
      :error="endDateError"
      :error-messages="endDateErrorMsg"
      variant="outlined"
      class="mb-3"
      required
    />
    <v-text-field
      v-model.number="modelValue.dueOffset"
      label="Due Offset"
      type="number"
      min="0"
      placeholder="e.g. 1"
      variant="outlined"
      class="mb-3"
      hint="How many days/ week after start date is the task due?"
      persistent-hint
    />
    <v-select
      v-model="modelValue.dueOffsetUnit"
      :items="['days', 'weeks']"
      label="Due Offset Unit"
      variant="outlined"
      class="mb-3"
      placeholder="Select unit"
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
import { computed, watch, ref } from 'vue'

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

// Error handling for start and end date
const startDateError = computed(() => !recurrence.value.startDate)
const endDateError = computed(() => {
  if (!recurrence.value.endDate) return true
  if (!recurrence.value.startDate) return false
  return recurrence.value.endDate < recurrence.value.startDate
})
const endDateErrorMsg = computed(() => {
  if (!recurrence.value.endDate) return 'End date is required'
  if (recurrence.value.endDate < recurrence.value.startDate) return 'End date must be after start date'
  return ''
})

// Ensure interval is at least 1 for custom
watch(() => recurrence.value.type, (val) => {
  if (val === 'custom' && (!recurrence.value.interval || recurrence.value.interval < 1)) {
    recurrence.value.interval = 1
  }
})

const onSave = () => {
  if (
    !recurrence.value.startDate ||
    !recurrence.value.endDate ||
    recurrence.value.endDate < recurrence.value.startDate
  ) {
    // Prevent save if invalid
    return
  }
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