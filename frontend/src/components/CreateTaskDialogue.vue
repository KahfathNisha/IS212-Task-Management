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
              v-model="localTask.status"
              label="Status"
              :items="taskStatuses"
              variant="outlined"
              class="flex-1"
            />
            <v-text-field
              v-model="localTask.dueDate"
              label="Due Date *"
              type="date"
              :rules="[v => !!v || 'Due date is required']"
              required
              :min="todayDate"
              variant="outlined"
              class="flex-1"
            />
          </div>

          <div class="d-flex ga-4 mb-4">
            <v-select
              v-model="localTask.priority"
              label="Priority *"
              :items="priorities"
              :rules="[v => !!v || 'Priority is required']"
              required
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
          
          <div class="d-flex ga-4 mb-4">
            <v-autocomplete
              v-model="localTask.assignedTo"
              label="Assignee"
              :items="teamMembers.filter(member => !localTask.collaborators.includes(member))"
              placeholder="Search and select assignee"
              variant="outlined"
              class="flex-1"
            />
            <v-autocomplete
              v-model="localTask.collaborators"
              label="Collaborators"
              :items="teamMembers.filter(member => member !== localTask.assignedTo)"
              placeholder="Search and select collaborators"
              variant="outlined"
              multiple
              chips
              class="flex-1"
            />
          </div>

          <div v-if="localTask.collaborators && localTask.collaborators.length > 0" class="collaborator-permissions mb-4">
            <h4 class="mb-3">Collaborator Permissions</h4>
            <div v-for="perm in collaboratorPermissions" :key="perm.name" class="permission-row d-flex align-center ga-3 mb-2">
              <span class="flex-1">{{ perm.name }}</span>
              <div class="custom-permission-toggle">
                <v-btn
                  :class="{ 'active': perm.permission === 'view' }"
                  @click="perm.permission = 'view'"
                  prepend-icon="mdi-eye"
                  size="small"
                  variant="outlined"
                  class="permission-btn"
                >
                  View
                </v-btn>
                <v-btn
                  :class="{ 'active': perm.permission === 'edit' }"
                  @click="perm.permission = 'edit'"
                  prepend-icon="mdi-pencil"
                  size="small"
                  variant="outlined"
                  class="permission-btn"
                >
                  Edit
                </v-btn>
              </div>
            </div>
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

          <div class="d-flex justify-center mb-4">
            <v-btn
              variant="outlined"
              color="primary"
              prepend-icon="mdi-repeat"
              @click="showRecurrence = !showRecurrence"
              rounded="lg"
              class="mb-4"
            >
              {{ showRecurrence ? 'Disable Recurrence' : 'Set Recurrence' }}
            </v-btn>
            <v-icon v-if="localTask.recurrence?.enabled" color="primary" class="ml-2">mdi-repeat</v-icon>
          </div>
          <RecurrenceOptions
            v-if="showRecurrence"
            v-model="localTask.recurrence"
            :min-date="localTask.dueDate || todayDate"
            @stop="stopRecurrence"
          />


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
                label="Priority *"
                :items="priorities"
                :rules="[v => !!v || 'Priority is required']"
                required
                variant="outlined"
                class="flex-1"
              />
            </div>

            <div class="d-flex mb-3">
              <v-text-field
                v-model="subtask.dueDate"
                label="Due Date *"
                type="date"
                :rules="[v => !!v || 'Due date is required']"
                :min="todayDate"
                required
                variant="outlined"
                class="flex-1"
              />
            </div>


            <div class="d-flex ga-4 mb-3">
              <v-autocomplete
                v-model="subtask.assignedTo"
                label="Assignee"
                :items="teamMembers.filter(member => !subtask.collaborators.includes(member))"
                placeholder="Search and select assignee"
                variant="outlined"
                class="flex-1"
              />
              <v-autocomplete
                v-model="subtask.collaborators"
                label="Collaborators"
                :items="teamMembers.filter(member => member !== subtask.assignedTo)"
                placeholder="Search and select collaborators"
                variant="outlined"
                multiple
                chips
                class="flex-1"
              />
            </div>

            <div v-if="subtask.collaborators && subtask.collaborators.length > 0" class="collaborator-permissions mb-3">
              <h5 class="mb-2">Collaborator Permissions</h5>
              <div v-for="perm in subtask.collaboratorPermissions" :key="perm.name" class="permission-row d-flex align-center ga-3 mb-2">
                <span class="flex-1">{{ perm.name }}</span>
                <div class="custom-permission-toggle">
                  <v-btn
                    :class="{ 'active': perm.permission === 'view' }"
                    @click="perm.permission = 'view'"
                    prepend-icon="mdi-eye"
                    size="small"
                    variant="outlined"
                    class="permission-btn"
                  >
                    View
                  </v-btn>
                  <v-btn
                    :class="{ 'active': perm.permission === 'edit' }"
                    @click="perm.permission = 'edit'"
                    prepend-icon="mdi-pencil"
                    size="small"
                    variant="outlined"
                    class="permission-btn"
                  >
                    Edit
                  </v-btn>
                </div>
              </div>
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
import { ref, computed, watch, watchEffect } from 'vue'
import '../assets/styles.css';
import RecurrenceOptions from './RecurrenceOptions.vue'

const props = defineProps({
  model: { type: Object, default: () => ({}) },
  show: { type: Boolean, default: false },
  isEditing: { type: Boolean, default: false },
  taskStatuses: { type: Array, default: () => [] },
  priorities: { type: Array, default: () => [] },
  projects: { type: Array, default: () => [] },
  teamMembers: { type: Array, default: () => [] },
  todayDate: { type: String, default: () => new Date().toISOString().split('T')[0] }
})

const emit = defineEmits(['update:show', 'save', 'cancel'])

const showMessage = (message, color = 'success') => {
  // Emit a message event that can be handled by the parent
  emit('message', { message, color })
}

const localShow = computed({
  get: () => props.show,
  set: (v) => emit('update:show', v)
})

const normalizeCollaborators = (collabs) => {
  return (collabs || []).map(c => typeof c === 'string' ? { name: c, permission: 'view' } : c)
}

const localTask = ref({ ...props.model })
const subtasks = ref(localTask.value.subtasks ? [...localTask.value.subtasks] : [])
const collaboratorPermissions = ref(normalizeCollaborators(localTask.value.collaborators))
const formValid = ref(false)
const taskForm = ref(null)

watch(() => props.model, (v) => {
  localTask.value = { ...v }
  collaboratorPermissions.value = normalizeCollaborators(v.collaborators)
  subtasks.value = v?.subtasks ? v.subtasks.map(s => ({ ...s, collaboratorPermissions: normalizeCollaborators(s.collaborators) })) : []
}, { immediate: true })

const showRecurrence = ref(false);

// Ensure localTask.recurrence always exists and is reactive
watch(localTask, (val) => {
  if (!val.recurrence) {
    val.recurrence = { enabled: false, type: '', interval: 1, endDate: '' }
  }
}, { immediate: true, deep: true })

const stopRecurrence = () => {
  showRecurrence.value = false;
  localTask.value.recurrence = { enabled: false, type: '', interval: 1, endDate: '' }
}

const addSubtask = () => {
  subtasks.value.push({
    title: '',
    description: '',
    status: props.taskStatuses[0] || 'To Do',
    priority: props.priorities[0] || 1,
    dueDate: '',
    assignedTo: null,
    collaborators: [],
    collaboratorPermissions: [],
    attachments: []
  })
}

// Sync main task collaborator permissions
watch(() => localTask.value.collaborators, (newCollabs, oldCollabs) => {
  const newNames = newCollabs || []
  const oldNames = oldCollabs || []
  const added = newNames.filter(n => !oldNames.includes(n))
  const removed = oldNames.filter(n => !newNames.includes(n))
  collaboratorPermissions.value = collaboratorPermissions.value.filter(p => !removed.includes(p.name)).concat(added.map(name => ({ name, permission: 'view' })))
}, { deep: true })

// Sync subtask collaborator permissions
watchEffect(() => {
  subtasks.value.forEach(subtask => {
    if (!subtask.collaboratorPermissions) subtask.collaboratorPermissions = []
    const currentNames = subtask.collaborators || []
    const existingNames = subtask.collaboratorPermissions.map(p => p.name)
    const added = currentNames.filter(n => !existingNames.includes(n))
    const removed = existingNames.filter(n => !currentNames.includes(n))
    subtask.collaboratorPermissions = subtask.collaboratorPermissions.filter(p => !removed.includes(p.name)).concat(added.map(name => ({ name, permission: 'view' })))
  })
})

const onCancel = () => {
  emit('cancel')
  emit('update:show', false)
}

const onSave = () => {
  // Validate form
  if (!taskForm.value.validate()) {
    return
  }

  // Validate main task title
  if (!localTask.value.title || localTask.value.title.trim() === '') {
    showMessage('Task title is required', 'error')
    return
  }

  // Validate subtasks
  for (let i = 0; i < subtasks.value.length; i++) {
    const subtask = subtasks.value[i]
    if (!subtask.title || subtask.title.trim() === '') {
      showMessage(`Subtask ${i + 1}: Title is required`, 'error')
      return
    }
    if (!subtask.dueDate) {
      showMessage(`Subtask ${i + 1}: Due date is required`, 'error')
      return
    }
    if (!subtask.priority) {
      showMessage(`Subtask ${i + 1}: Priority is required`, 'error')
      return
    }
    // Check if due date is in the past
    const subDueDate = new Date(subtask.dueDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (subDueDate < today) {
      showMessage(`Subtask ${i + 1}: Due date cannot be in the past`, 'error')
      return
    }
  }

  // Ensure recurrence.enabled is set correctly
  if (localTask.value.recurrence && localTask.value.recurrence.type) {
    localTask.value.recurrence.enabled = true
  } else {
    localTask.value.recurrence = { enabled: false, type: '', interval: 1, startDate: '', endDate: '' }
  }
  // merge subtasks and collaborators with permissions
  const payload = {
    ...localTask.value,
    collaborators: collaboratorPermissions.value,
    subtasks: subtasks.value.map(s => ({ ...s, collaborators: s.collaboratorPermissions }))
  }
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
  background: var(--bg-primary) !important;
  color: var(--text-primary) !important;
}

[data-theme="dark"] .create-task-card {
  background: var(--bg-primary) !important;
  color: var(--text-primary) !important;
}

.mb-4 { margin-bottom: 16px !important; }
.mb-3 { margin-bottom: 12px !important; }
.ga-4 { gap: 16px !important; }
.d-flex { display: flex !important; }
.flex-1 { flex: 1 1 0% !important; }
.justify-center { justify-content: center !important; }

/* Subtask section */
.subtask-section {
  background: rgba(0, 0, 0, 0.02);
  border-radius: 8px;
  padding: 12px;
  border: 1px solid rgba(0, 0, 0, 0.08);
}

[data-theme="dark"] .subtask-section {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
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

/* Override Vuetify primary color buttons to green in light mode */
.v-btn.text-primary:not([prepend-icon="mdi-plus"]),
:deep(.v-btn.text-primary:not([prepend-icon="mdi-plus"])) {
  color: #6b9b6b !important;
}

.v-btn[color="primary"]:not([prepend-icon="mdi-plus"]),
:deep(.v-btn[color="primary"]:not([prepend-icon="mdi-plus"])) {
  background: #6b9b6b !important;
  color: white !important;
}

.v-btn[color="primary"]:not([prepend-icon="mdi-plus"]):hover,
:deep(.v-btn[color="primary"]:not([prepend-icon="mdi-plus"]):hover) {
  background: #5a8a5a !important;
}

.v-btn[color="secondary"]:not([prepend-icon="mdi-plus"]),
:deep(.v-btn[color="secondary"]:not([prepend-icon="mdi-plus"])) {
  background: #6b9b6b !important;
  color: white !important;
}

.v-btn[color="secondary"]:not([prepend-icon="mdi-plus"]):hover,
:deep(.v-btn[color="secondary"]:not([prepend-icon="mdi-plus"]):hover) {
  background: #5a8a5a !important;
}

/* Dark mode - use blue */
[data-theme="dark"] .v-btn[color="primary"]:not([prepend-icon="mdi-plus"]),
[data-theme="dark"] :deep(.v-btn[color="primary"]:not([prepend-icon="mdi-plus"])) {
  background: #5a7a9b !important;
  color: white !important;
}

[data-theme="dark"] .v-btn[color="primary"]:not([prepend-icon="mdi-plus"]):hover,
[data-theme="dark"] :deep(.v-btn[color="primary"]:not([prepend-icon="mdi-plus"]):hover) {
  background: #4a6a8b !important;
}

[data-theme="dark"] .v-btn[color="secondary"]:not([prepend-icon="mdi-plus"]),
[data-theme="dark"] :deep(.v-btn[color="secondary"]:not([prepend-icon="mdi-plus"])) {
  background: #5a7a9b !important;
  color: white !important;
}

[data-theme="dark"] .v-btn[color="secondary"]:not([prepend-icon="mdi-plus"]):hover,
[data-theme="dark"] :deep(.v-btn[color="secondary"]:not([prepend-icon="mdi-plus"]):hover) {
  background: #4a6a8b !important;
}

/* Chips and outlined buttons */
.v-chip.text-primary,
:deep(.v-chip.text-primary) {
  color: #6b9b6b !important;
  border-color: #6b9b6b !important;
}

.v-btn[variant="outlined"][color="primary"]:not([prepend-icon="mdi-plus"]),
:deep(.v-btn[variant="outlined"][color="primary"]:not([prepend-icon="mdi-plus"])) {
  color: #6b9b6b !important;
  border-color: #6b9b6b !important;
}

.v-btn[variant="outlined"][color="primary"]:not([prepend-icon="mdi-plus"]):hover,
:deep(.v-btn[variant="outlined"][color="primary"]:not([prepend-icon="mdi-plus"]):hover) {
  background: rgba(107, 155, 107, 0.1) !important;
}

[data-theme="dark"] .v-btn[variant="outlined"][color="primary"]:not([prepend-icon="mdi-plus"]),
[data-theme="dark"] :deep(.v-btn[variant="outlined"][color="primary"]:not([prepend-icon="mdi-plus"])) {
  color: #7b92d1 !important;
  border-color: #7b92d1 !important;
}

[data-theme="dark"] .v-btn[variant="outlined"][color="primary"]:not([prepend-icon="mdi-plus"]):hover,
[data-theme="dark"] :deep(.v-btn[variant="outlined"][color="primary"]:not([prepend-icon="mdi-plus"]):hover) {
  background: rgba(123, 146, 209, 0.1) !important;
}

/* Icon colors */
.v-icon.text-primary,
:deep(.v-icon.text-primary),
.v-icon[color="primary"],
:deep(.v-icon[color="primary"]) {
  color: #6b9b6b !important;
}

[data-theme="dark"] .v-icon.text-primary,
[data-theme="dark"] :deep(.v-icon.text-primary),
[data-theme="dark"] .v-icon[color="primary"],
[data-theme="dark"] :deep(.v-icon[color="primary"]) {
  color: #7b92d1 !important;
}

/* Collaborator permissions section */
.collaborator-permissions {
  background: rgba(0, 0, 0, 0.02);
  border-radius: 8px;
  padding: 12px;
  border: 1px solid rgba(0, 0, 0, 0.08);
}

[data-theme="dark"] .collaborator-permissions {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.collaborator-permissions h4, .collaborator-permissions h5 {
  margin: 0 0 8px 0;
  font-size: 1rem;
  font-weight: 500;
  color: var(--text-primary);
}

.permission-row {
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 6px;
  border: 1px solid rgba(0, 0, 0, 0.05);
  align-items: center;
}

[data-theme="dark"] .permission-row {
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.custom-permission-toggle {
  display: flex;
  gap: 4px;
}

.permission-btn {
  min-width: 70px;
  height: 32px;
  font-size: 0.8rem;
  border-radius: 6px;
  text-transform: none;
  padding: 0 8px;
  transition: all 0.2s ease;
}

.permission-btn.active {
  background: #6b9b6b !important;
  color: white !important;
  border-color: #6b9b6b !important;
}

[data-theme="dark"] .permission-btn.active {
  background: #5a7a9b !important;
  color: white !important;
  border-color: #5a7a9b !important;
}

.permission-btn:not(.active) {
  color: var(--text-primary) !important;
  border-color: rgba(0, 0, 0, 0.23) !important;
}

[data-theme="dark"] .permission-btn:not(.active) {
  border-color: rgba(255, 255, 255, 0.23) !important;
}

.permission-btn:hover:not(.active) {
  background: rgba(0, 0, 0, 0.04) !important;
}

[data-theme="dark"] .permission-btn:hover:not(.active) {
  background: rgba(255, 255, 255, 0.04) !important;
}

/* Small responsive tweak */
@media (max-width: 600px) {
  .ga-4 { gap: 8px !important; flex-direction: column; }
  .d-flex.ga-4 { flex-direction: column; }
}
</style>