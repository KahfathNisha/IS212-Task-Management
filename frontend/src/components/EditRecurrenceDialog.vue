<template>
  <v-dialog v-model="show" max-width="500px" persistent>
    <v-card class="edit-recurrence-card">
      <v-card-title>Edit Recurrence</v-card-title>
      <v-card-text>
        <div class="d-flex ga-4 mb-4">
          <v-select
            v-model="localRecurrence.type"
            :items="['daily', 'weekly', 'monthly', 'custom']"
            label="Recurrence Type"
            variant="outlined"
            class="flex-1"
            required
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
          />
        </div>
        <div class="d-flex ga-4 mb-4">
          <v-text-field
            v-model="localRecurrence.startDate"
            label="Start Date"
            type="date"
            variant="outlined"
            class="flex-1"
            required
          />
          <v-text-field
            v-model="localRecurrence.endDate"
            label="End Date"
            type="date"
            variant="outlined"
            class="flex-1"
            required
          />
        </div>
        <div class="d-flex ga-4 mb-2">
          <v-text-field
            v-model.number="localRecurrence.dueOffset"
            label="Due Offset"
            type="number"
            min="0"
            variant="outlined"
            class="flex-1"
            hint="How many units after recurrence date is each task due?"
            persistent-hint
          />
          <v-select
            v-model="localRecurrence.dueOffsetUnit"
            :items="['days', 'weeks']"
            label="Due Offset Unit"
            variant="outlined"
            class="flex-1"
            required
          />
        </div>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn color="primary" @click="save" rounded="lg">Save</v-btn>
        <v-btn color="grey" @click="close" rounded="lg">Cancel</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, watch, reactive } from 'vue'

const props = defineProps({
  show: Boolean,
  recurrence: Object
})
const emit = defineEmits(['close', 'save'])

const show = ref(props.show)
watch(() => props.show, v => show.value = v)

// Ensure localRecurrence always reflects the latest props.recurrence
const localRecurrence = reactive({ ...props.recurrence })
watch(
  () => props.recurrence,
  (newVal) => {
    Object.assign(localRecurrence, newVal || {})
  },
  { immediate: true, deep: true }
)

const save = () => {
  emit('save', { ...localRecurrence })
  show.value = false
}
const close = () => {
  emit('close')
  show.value = false
}
</script>

<style scoped>
.edit-recurrence-card {
  background: #fff !important;
  box-shadow: 0 8px 32px rgba(0,0,0,0.25), 0 1.5px 4px rgba(60,60,60,0.08);
  border-radius: 12px;
  padding: 8px 0 0 0;
}
.v-overlay__scrim {
  background: rgba(30, 30, 30, 0.7) !important;
}
.ga-4 { gap: 16px !important; }
.mb-4 { margin-bottom: 16px !important; }
.mb-2 { margin-bottom: 8px !important; }
.d-flex { display: flex !important; }
.flex-1 { flex: 1 1 0% !important; }
</style>