<template>
  <div class="recurrence-section">
    <label class="recurrence-label">Recurrence Settings</label>
    <div class="recurrence-form">
      <div class="d-flex ga-4 mb-4">
        <v-select
          :model-value="modelValue.type"
          @update:model-value="updateValue('type', $event)"
          :items="['daily', 'weekly', 'monthly', 'custom']"
          label="Recurrence Type"
          variant="outlined"
          class="flex-1"
          required
        />
        <v-text-field
          v-if="modelValue.type === 'custom'"
          :model-value="modelValue.interval"
          @update:model-value="updateValue('interval', parseInt($event))"
          label="Custom Interval (days)"
          type="number"
          min="1"
          variant="outlined"
          class="flex-1"
          required
        />
      </div>
      <div class="d-flex ga-4 mb-4">
        <v-text-field
          :model-value="modelValue.startDate"
          @update:model-value="updateValue('startDate', $event)"
          label="Start Date"
          type="date"
          :min="minDate"
          variant="outlined"
          class="flex-1"
          required
        />
        <v-text-field
          :model-value="modelValue.endDate"
          @update:model-value="updateValue('endDate', $event)"
          label="End Date"
          type="date"
          :min="modelValue.startDate || minDate"
          variant="outlined"
          class="flex-1"
          required
        />
      </div>
      <div class="d-flex ga-4 mb-2">
        <v-text-field
          :model-value="modelValue.dueOffset"
          @update:model-value="updateValue('dueOffset', parseInt($event))"
          label="Due Offset"
          type="number"
          min="0"
          variant="outlined"
          class="flex-1"
        />
        <v-select
          :model-value="modelValue.dueOffsetUnit"
          @update:model-value="updateValue('dueOffsetUnit', $event)"
          :items="['days', 'weeks']"
          label="Due Offset Unit"
          variant="outlined"
          class="flex-1"
          required
        />
      </div>
      <div class="actions">
        <v-btn color="error" @click="emit('stop')" variant="outlined">
          Stop Recurrence
        </v-btn>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: { type: Object, required: true },
  minDate: { type: String, default: () => new Date().toISOString().split('T')[0] }
})

const emit = defineEmits(['update:modelValue', 'stop'])

const updateValue = (key, value) => {
  emit('update:modelValue', {
    ...props.modelValue,
    [key]: value
  })
}
</script>

<style scoped>
.recurrence-section {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 16px;
  margin: 16px 0;
}

.recurrence-label {
  font-weight: 600;
  font-size: 16px;
  color: #333;
  margin-bottom: 12px;
  display: block;
}

.recurrence-form {
  margin-top: 12px;
}

.actions {
  margin-top: 16px;
  text-align: right;
}

.ga-4 { gap: 16px !important; }
.mb-4 { margin-bottom: 16px !important; }
.mb-2 { margin-bottom: 8px !important; }
.d-flex { display: flex !important; }
.flex-1 { flex: 1 1 0% !important; }
</style>