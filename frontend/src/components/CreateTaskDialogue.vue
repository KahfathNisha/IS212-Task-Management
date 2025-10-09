<template>
  <v-dialog v-model="localShow" max-width="700px">
    <v-card class="create-task-card" rounded="xl">
      <v-card-title class="d-flex justify-space-between align-center">
        <span>{{ isEditing ? 'Edit Task' : 'Create New Task' }}</span>
        <v-btn icon="mdi-close" variant="text" @click="onCancel" />
      </v-card-title>
      <v-card-text>
        <v-form ref="taskForm" v-model="formValid">
          <v-text-field
            v-model="localTask.title"
            label="Title *"
            placeholder="Enter task title"
            required
            variant="outlined"
            class="mb-4"
          />
          
          <v-textarea
            v-model="localTask.description"
            label="Description"
            placeholder="Enter task description"
            variant="outlined"
            rows="3"
            class="mb-4"
          />
          
          <div class="d-flex ga-4 mb-4">
            <v-select
              v-model="localTask.type"
              label="Type"
              :items="taskTypes"
              variant="outlined"
              class="flex-1"
            />
            <v-select
              v-model="localTask.status"
              label="Status"
              :items="taskStatuses"
              variant="outlined"
              class="flex-1"
            />
          </div>
          
          <div class="d-flex ga-4 mb-4">
            <v-select
              v-model="localTask.priority"
              label="Priority"
              :items="priorities"
              variant="outlined"
              class="flex-1"
            />
            <v-select
              v-model="localTask.project"
              label="Project"
              :items="projects"
              placeholder="Select project"
              variant="outlined"
              class="flex-1"
            />
          </div>

          <div class="d-flex mb-4">
            <v-text-field
              v-model="localTask.dueDate"
              label="Due Date"
              type="date"
              :min="todayDate"
              variant="outlined"
              class="flex-1"
            />
          </div>

           <div class="d-flex ga-4 mb-4">
            <v-text-field
              v-model="localTask.startTime"
              label="Start Time"
              type="datetime-local"
              variant="outlined"
              class="flex-1"
            />
            <v-text-field
              v-model="localTask.endTime"
              label="End Time"
              type="datetime-local"
              :min="localTask.startTime || (localTask.dueDate ? localTask.dueDate + 'T00:00' : '')"
              variant="outlined"
              class="flex-1"
            />
          </div>
          
          <div class="d-flex ga-4 mb-4">
            <v-select
              v-model="localTask.assignedTo"
              label="Assignee"
              :items="teamMembers.filter(member => !localTask.collaborators.includes(member))"
              placeholder="Select assignee"
              variant="outlined"
              class="flex-1"
            />
            <v-select
              v-model="localTask.collaborators"
              label="Collaborators"
              :items="teamMembers.filter(member => member !== localTask.assignedTo)"
              placeholder="Select collaborators"
              variant="outlined"
              multiple
              chips
              class="flex-1"
            />
          </div>

          <div class="mb-4">
            <v-file-input
              v-model="localTask.attachments"
              label="Attach Documents"
              accept=".pdf"
              multiple
              variant="outlined"
              prepend-icon="mdi-paperclip"
              show-size
              chips
            />
          </div>

          <div class="d-flex justify-center mb-4">
            <v-btn
              variant="text"
              prepend-icon="mdi-plus"
              @click="addSubtask"
              color="primary"
              rounded="lg"
            >
              Add Subtask
            </v-btn>
          </div>

          <div v-for="(subtask, index) in subtasks" :key="index" class="subtask-section mb-4">
            <v-divider class="mb-4"></v-divider>
            <h5 class="mb-3">Subtask {{ index + 1 }}</h5>

            <v-text-field
              v-model="subtask.title"
              label="Subtask Title *"
              placeholder="Enter subtask title"
              required
              variant="outlined"
              class="mb-3"
            />

            <v-textarea
              v-model="subtask.description"
              label="Subtask Description"
              placeholder="Enter subtask description"
              variant="outlined"
              rows="2"
              class="mb-3"
            />

            <div class="d-flex ga-4 mb-3">
              <v-select
                v-model="subtask.status"
                label="Status"
                :items="taskStatuses"
                variant="outlined"
                class="flex-1"
              />
              <v-select
                v-model="subtask.priority"
                label="Priority"
                :items="priorities"
                variant="outlined"
                class="flex-1"
              />
            </div>
            
            <div class="d-flex mb-3">
              <v-text-field
                v-model="subtask.dueDate"
                label="Due Date"
                type="date"
                :min="todayDate"
                variant="outlined"
                class="flex-1"
              />
            </div>

            <div class="d-flex ga-4 mb-3">
              <v-text-field
                v-model="subtask.startTime"
                label="Start Time"
                type="datetime-local"
                variant="outlined"
                class="flex-1"
              />
              <v-text-field
                v-model="subtask.endTime"
                label="End Time"
                type="datetime-local"
                :min="newTask.startTime || (newTask.dueDate ? newTask.dueDate + 'T00:00' : '')"
                variant="outlined"
                class="flex-1"
              />
            </div>


            <div class="d-flex ga-4 mb-3">
              <v-select
                v-model="subtask.assignedTo"
                label="Assignee"
                :items="teamMembers.filter(member => !subtask.collaborators.includes(member))"
                placeholder="Select assignee"
                variant="outlined"
                class="flex-1"
              />
              <v-select
                v-model="subtask.collaborators"
                label="Collaborators"
                :items="teamMembers.filter(member => member !== subtask.assignedTo)"
                placeholder="Select collaborators"
                variant="outlined"
                multiple
                chips
                class="flex-1"
              />
            </div>

            <div class="mb-3">
              <v-file-input
                v-model="subtask.attachments"
                label="Attach Documents/PDFs"
                accept=".pdf,.doc,.docx,.txt"
                multiple
                variant="outlined"
                prepend-icon="mdi-paperclip"
                show-size
                chips
                small-chips
              />
            </div>

            <v-btn
              variant="outlined"
              color="error"
              size="small"
              @click="subtasks.splice(index, 1)"
              prepend-icon="mdi-delete"
              rounded="lg"
            >
              Remove Subtask
            </v-btn>
          </div>
        </v-form>
      </v-card-text>
      
      <v-card-actions class="px-6 pb-6">
        <v-spacer />
        <v-btn variant="text" @click="onCancel" class="mr-2" rounded="lg">Cancel</v-btn>
        <v-btn color="secondary" @click="onSave" rounded="lg">{{ isEditing ? 'Update' : 'Save' }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import '../assets/styles.css';

const props = defineProps({
  model: { type: Object, default: () => ({}) },
  show: { type: Boolean, default: false },
  isEditing: { type: Boolean, default: false },
  taskTypes: { type: Array, default: () => [] },
  taskStatuses: { type: Array, default: () => [] },
  priorities: { type: Array, default: () => [] },
  projects: { type: Array, default: () => [] },
  teamMembers: { type: Array, default: () => [] },
  todayDate: { type: String, default: () => new Date().toISOString().split('T')[0] }
})

const emit = defineEmits(['update:show', 'save', 'cancel'])

const localShow = computed({
  get: () => props.show,
  set: (v) => emit('update:show', v)
})

const localTask = ref({ ...props.model })
const subtasks = ref(localTask.value.subtasks ? [...localTask.value.subtasks] : [])
const formValid = ref(false)
const taskForm = ref(null)

watch(() => props.model, (v) => { localTask.value = { ...v }; subtasks.value = v?.subtasks ? [...v.subtasks] : [] }, { immediate: true })

const addSubtask = () => {
  subtasks.value.push({ title: '', description: '', status: props.taskStatuses[0] || 'To Do', priority: props.priorities[0] || 1, dueDate: '', startTime: '', endTime: '', assignedTo: null, collaborators: [], attachments: [] })
}

const onCancel = () => {
  emit('cancel')
  emit('update:show', false)
}

const onSave = () => {
  // merge subtasks into task before emitting
  const payload = { ...localTask.value, subtasks: subtasks.value }
  emit('save', payload)
  emit('update:show', false)
}
</script>

<style scoped>
.create-task-card {
  width: 100%;
  max-width: 700px;
  padding: 12px 0;
  box-sizing: border-box;
  background: #ffffff;
}


.mb-4 { margin-bottom: 16px !important; }
.mb-3 { margin-bottom: 12px !important; }
.ga-4 { gap: 16px !important; }
.d-flex { display: flex !important; }
.flex-1 { flex: 1 1 0% !important; }
.justify-center { justify-content: center !important; }

/* Subtask section */
.subtask-section {
  background: #fafafa;
  border-radius: 8px;
  padding: 12px;
  border: 1px solid #eee;
}

/* File input / attachments */
.v-file-input .v-field__append-inner,
.v-file-input .v-input__append-inner {
  gap: 8px;
}
.attachment-chip {
  cursor: pointer;
}

/* Buttons */
.v-btn[variant="text"] { min-width: 64px; }
.v-btn[variant="outlined"] { border-radius: 8px; }

/* Form & inputs */
.v-form { width: 100%; }
.v-text-field, .v-textarea, .v-select {
  background: transparent;
}

/* Small responsive tweak */
@media (max-width: 600px) {
  .ga-4 { gap: 8px !important; flex-direction: column; }
  .d-flex.ga-4 { flex-direction: column; }
}
</style>