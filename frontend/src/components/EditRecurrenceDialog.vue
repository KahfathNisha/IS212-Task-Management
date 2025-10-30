<template>
  <v-dialog v-model="dialog" max-width="500px" persistent>
    <v-card class="recurrence-dialog-card">
      <v-card-title class="dialog-header">
        <v-icon color="primary" size="24" class="header-icon">mdi-repeat</v-icon>
        <h3>Edit Recurrence</h3>
      </v-card-title>
      
      <v-card-text class="dialog-content">
        <!-- Recurrence Type and Interval -->
        <div class="form-row">
          <v-select
            v-model="localRecurrence.type"
            :items="recurrenceTypes"
            label="Recurrence Type"
            variant="outlined"
            class="flex-1"
            required
            density="comfortable"
          />
          <v-text-field
            v-if="localRecurrence.type === 'custom'"
            v-model.number="localRecurrence.interval"
            label="Interval (days)"
            type="number"
            min="1"
            variant="outlined"
            class="flex-1"
            required
            density="comfortable"
          />
        </div>

        <!-- Date Range -->
        <div class="form-row">
          <v-text-field
            v-model="localRecurrence.startDate"
            label="Start Date"
            type="date"
            variant="outlined"
            class="flex-1"
            required
            density="comfortable"
          />
          <v-text-field
            v-model="localRecurrence.endDate"
            label="End Date (Optional)"
            type="date"
            variant="outlined"
            class="flex-1"
            density="comfortable"
          />
        </div>

        <!-- Due Offset Settings -->
        <div class="form-row">
          <v-text-field
            v-model.number="localRecurrence.dueOffset"
            label="Due Offset"
            type="number"
            min="0"
            variant="outlined"
            class="flex-1"
            density="comfortable"
            hint="How many units before/after the recurrence date"
          />
          <v-select
            v-model="localRecurrence.dueOffsetUnit"
            :items="offsetUnits"
            label="Offset Unit"
            variant="outlined"
            class="flex-1"
            required
            density="comfortable"
          />
        </div>

        <!-- Enable/Disable Toggle -->
        <div class="form-row single-column">
          <v-switch
            v-model="localRecurrence.enabled"
            label="Enable Recurrence"
            color="primary"
            density="comfortable"
            hide-details
          />
        </div>

        <!-- Recurrence Preview -->
        <div class="recurrence-preview">
          <h4>Recurrence Summary</h4>
          <div class="preview-content">
            <v-icon size="16" color="primary">mdi-information-outline</v-icon>
            <span>{{ getRecurrenceDescription() }}</span>
          </div>
        </div>
      </v-card-text>
      
      <v-card-actions class="dialog-actions">
        <v-spacer />
        <v-btn 
          color="grey-darken-1" 
          variant="text"
          @click="close" 
          rounded="lg"
        >
          Cancel
        </v-btn>
        <v-btn 
          color="primary" 
          variant="flat"
          @click="save" 
          rounded="lg"
        >
          Save Changes
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, watch, reactive, computed } from 'vue'

const props = defineProps({
  show: Boolean,
  recurrence: Object
})
const emit = defineEmits(['close', 'save'])

// Form options
const recurrenceTypes = [
  { title: 'Daily', value: 'daily' },
  { title: 'Weekly', value: 'weekly' },
  { title: 'Monthly', value: 'monthly' },
  { title: 'Custom Interval', value: 'custom' }
]

const offsetUnits = [
  { title: 'Days', value: 'days' },
  { title: 'Weeks', value: 'weeks' }
]

const dialog = computed({
  get: () => props.show,
  set: v => { if (!v) emit('close') }
})

const localRecurrence = reactive({
  type: 'weekly',
  interval: 1,
  startDate: '',
  endDate: '',
  dueOffset: 0,
  dueOffsetUnit: 'days',
  enabled: true,
  ...props.recurrence
})

watch(
  () => props.recurrence,
  (newVal) => {
    if (newVal) {
      Object.assign(localRecurrence, {
        type: 'weekly',
        interval: 1,
        startDate: '',
        endDate: '',
        dueOffset: 0,
        dueOffsetUnit: 'days',
        enabled: true,
        ...newVal
      })
    }
  },
  { immediate: true, deep: true }
)

const getRecurrenceDescription = () => {
  if (!localRecurrence.enabled) {
    return 'Recurrence is disabled'
  }

  let description = 'Task will repeat '
  
  switch (localRecurrence.type) {
    case 'daily':
      description += 'every day'
      break
    case 'weekly':
      description += 'every week'
      break
    case 'monthly':
      description += 'every month'
      break
    case 'custom':
      description += `every ${localRecurrence.interval} days`
      break
    default:
      description += 'with custom schedule'
  }

  if (localRecurrence.startDate) {
    description += ` starting from ${formatDate(localRecurrence.startDate)}`
  }

  if (localRecurrence.endDate) {
    description += ` until ${formatDate(localRecurrence.endDate)}`
  }

  if (localRecurrence.dueOffset > 0) {
    description += `. Due ${localRecurrence.dueOffset} ${localRecurrence.dueOffsetUnit} after each occurrence.`
  }

  return description
}

const formatDate = (dateString) => {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

const save = () => {
  // Validate required fields
  if (!localRecurrence.startDate) {
    console.warn('Start date is required')
    return
  }

  if (localRecurrence.type === 'custom' && (!localRecurrence.interval || localRecurrence.interval < 1)) {
    console.warn('Custom interval must be at least 1 day')
    return
  }

  emit('save', { ...localRecurrence })
}

const close = () => {
  emit('close')
}
</script>

<style scoped>
/* Solid background for the dialog card */
.recurrence-dialog-card {
  background: #ffffff !important;
  border-radius: 16px !important;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.24) !important;
  overflow: hidden;
}

/* Header with solid background */
.dialog-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 24px 28px;
  background: #f8f9fa !important;
  border-bottom: 1px solid #e9ecef;
}

.dialog-header h3 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #2c3e50;
}

.header-icon {
  background: rgba(25, 118, 210, 0.1);
  padding: 8px;
  border-radius: 8px;
}

/* Content area with solid background */
.dialog-content {
  padding: 28px !important;
  background: #ffffff !important;
}

/* Form styling */
.form-row {
  display: flex;
  gap: 16px;
  margin-bottom: 20px;
  align-items: flex-start;
}

.form-row.single-column {
  flex-direction: column;
}

.flex-1 {
  flex: 1 1 0%;
}

/* Form field backgrounds */
:deep(.v-field__field) {
  background: #ffffff !important;
}

:deep(.v-field) {
  background: #ffffff !important;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1) !important;
}

:deep(.v-field--focused) {
  box-shadow: 0 2px 8px rgba(25, 118, 210, 0.2) !important;
}

/* Recurrence preview */
.recurrence-preview {
  margin-top: 24px;
  padding: 16px;
  background: #f8f9fa !important;
  border: 1px solid #e9ecef;
  border-radius: 12px;
}

.recurrence-preview h4 {
  margin: 0 0 8px 0;
  font-size: 14px;
  font-weight: 600;
  color: #495057;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.preview-content {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #6c757d;
  line-height: 1.4;
}

/* Actions with solid background */
.dialog-actions {
  padding: 20px 28px !important;
  background: #f8f9fa !important;
  border-top: 1px solid #e9ecef;
}

/* Switch styling */
:deep(.v-switch) {
  background: #ffffff;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

/* Responsive adjustments */
@media (max-width: 600px) {
  .dialog-header {
    padding: 20px 24px;
  }
  
  .dialog-content {
    padding: 24px !important;
  }
  
  .dialog-actions {
    padding: 16px 24px !important;
  }
  
  .form-row {
    flex-direction: column;
    gap: 12px;
  }
  
  .form-row:not(.single-column) .flex-1 {
    width: 100%;
  }
}

/* Ensure dialog overlay has solid background */
:deep(.v-overlay__scrim) {
  background: rgba(0, 0, 0, 0.6) !important;
}
</style>