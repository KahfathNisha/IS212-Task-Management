<template>
  <v-dialog v-model="dialog" max-width="500px" persistent>
    <v-card>
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
import { ref, watch, reactive, computed } from 'vue'

const props = defineProps({
  show: Boolean,
  recurrence: Object
})
const emit = defineEmits(['close', 'save'])

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
  ...props.recurrence
})

watch(
  () => props.recurrence,
  (newVal) => {
    if (newVal) {
      Object.assign(localRecurrence, newVal)
    }
  },
  { immediate: true, deep: true }
)

const save = () => {
  emit('save', { ...localRecurrence })
}

const close = () => {
  emit('close')
}
</script>

<style scoped>
.ga-4 { gap: 16px !important; }
.mb-4 { margin-bottom: 16px !important; }
.mb-2 { margin-bottom: 8px !important; }
.d-flex { display: flex !important; }
.flex-1 { flex: 1 1 0% !important; }
</style>