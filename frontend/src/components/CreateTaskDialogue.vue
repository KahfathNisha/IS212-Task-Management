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
              v-model="localTask.projectId"
              label="Project"
              :items="projects"
              item-title="title"
              item-value="value"
              placeholder="Select project"
              variant="outlined"
              clearable
              class="flex-1"
              @update:model-value="onProjectChange"
            />
          </div>

          <v-select
            v-model="localTask.categories"
            label="Categories"
            :items="availableCategories"
            placeholder="Select categories"
            variant="outlined"
            multiple
            chips
            clearable
            class="mb-4"
          />
          
          <div class="mb-4">
            <v-autocomplete
              v-model="localTask.taskOwner"
              label="Task Owner *"
              :items="teamMembers"
              item-title="text"  :rules="[v => !!v || 'Task Owner is required']"
              required
              placeholder="Search and select task owner"
              variant="outlined"
            />
            <v-alert
                v-if="taskOwnerDepartment"
                type="info"
                variant="tonal"
                class="mt-2"
                density="compact"
            >
                Department: **{{ taskOwnerDepartment }}**
            </v-alert>
          </div>
          
          <div class="d-flex ga-4 mb-4">
            <v-autocomplete
              v-model="localTask.assignedTo"
              label="Assignee"
              :items="teamMembers.filter(member => !localTask.collaborators.includes(member))"
              item-title="text"  placeholder="Search and select assignee"
              variant="outlined"
              class="flex-1"
            />
            <v-autocomplete
              v-model="localTask.collaborators"
              label="Collaborators"
              :items="teamMembers.filter(member => member !== localTask.assignedTo)"
              item-title="text"  placeholder="Search and select collaborators"
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
                item-title="text"  placeholder="Search and select assignee"
                variant="outlined"
                class="flex-1"
              />
              <v-autocomplete
                v-model="subtask.collaborators"
                label="Collaborators"
                :items="teamMembers.filter(member => member !== subtask.assignedTo)"
                item-title="text"  placeholder="Search and select collaborators"
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
            :min-date="todayDate"
            @stop="stopRecurrence"
          />

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
import axios from 'axios'

const props = defineProps({
  model: { type: Object, default: () => ({}) },
  show: { type: Boolean, default: false },
  isEditing: { type: Boolean, default: false },
  taskStatuses: { type: Array, default: () => [] },
  priorities: { type: Array, default: () => [] },
  projects: { type: Array, default: () => [] },
  // NOTE: teamMembers must be an array of objects: { text, value, department }
  teamMembers: { type: Array, default: () => [] }, 
  todayDate: { type: String, default: () => new Date().toISOString().split('T')[0] }
})

const emit = defineEmits(['update:show', 'save', 'cancel'])

const showMessage = (message, color = 'success') => {
  emit('message', { message, color })
}

const localShow = computed({
  get: () => props.show,
  set: (v) => emit('update:show', v)
})

const normalizeCollaborators = (collabs) => {
  const normalized = (collabs || []).map(c => typeof c === 'string' ? { name: c, permission: 'view' } : c)
  const seen = new Set()
  return normalized.filter(c => {
    if (seen.has(c.name)) return false
    seen.add(c.name)
    return true
  })
}

const localTask = ref({ ...props.model })
const subtasks = ref(localTask.value.subtasks ? [...localTask.value.subtasks] : [])
const collaboratorPermissions = ref(normalizeCollaborators(localTask.value.collaborators))
const formValid = ref(false)
const taskForm = ref(null)

// 1. ADDED: Computed property to perform the department lookup
const taskOwnerDepartment = computed(() => {
    const ownerName = localTask.value.taskOwner;
    
    if (ownerName) {
        // Look up the user object by matching the selected value against the 'value' field
        const member = props.teamMembers.find(member => member.value === ownerName);
        
        // Return the department string
        return member ? member.department : null; 
    }
    return null;
});
// --------------------------------------------------------------------------

// ===== EXISTING WATCH BLOCK =====
watch(() => props.model, (v) => {
  // Use a fresh copy of the incoming data
  const taskData = { ...v };

  // --- FIX FOR DATE ---
  // If a due date exists, format it to YYYY-MM-DD
  if (taskData.dueDate) {
    taskData.dueDate = taskData.dueDate.split('T')[0];
  }

  // --- FIX FOR TASK OWNER (and all other fields) ---
  // This explicit assignment ensures taskOwner is populated
  localTask.value = taskData;
  
  // Debugging: Check if taskOwner is present in the incoming data
  console.log('Populating form with model:', v);

  collaboratorPermissions.value = normalizeCollaborators(v.collaborators)
  localTask.value.collaborators = [...new Set(collaboratorPermissions.value.map(c => c.name))] 

  subtasks.value = v?.subtasks ? v.subtasks.map(s => {
    // --- FIX FOR SUBTASK DATES ---
    if (s.dueDate) {
      s.dueDate = s.dueDate.split('T')[0];
    }
    const collabPerms = normalizeCollaborators(s.collaborators)
    const dedupedCollabs = [...new Set(collabPerms.map(c => c.name))]
    return { ...s, collaborators: dedupedCollabs, collaboratorPermissions: collabPerms }
  }) : []
}, { immediate: true })

const showRecurrence = ref(false);

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

watch(() => localTask.value.collaborators, (newCollabs, oldCollabs) => {
  if (!newCollabs) return
  const newNames = [...new Set(newCollabs || [])] 
  const oldNames = [...new Set(oldCollabs || [])] 
  const added = newNames.filter(n => !oldNames.includes(n))
  const removed = oldNames.filter(n => !newNames.includes(n))

  collaboratorPermissions.value = collaboratorPermissions.value.filter(p => !removed.includes(p.name))

  added.forEach(name => {
    if (!collaboratorPermissions.value.some(p => p.name === name)) {
      collaboratorPermissions.value.push({ name, permission: 'view' })
    }
  })
}, { deep: true })

watchEffect(() => {
  subtasks.value.forEach(subtask => {
    if (!subtask.collaboratorPermissions) subtask.collaboratorPermissions = []
    const currentNames = [...new Set(subtask.collaborators || [])] 
    const existingNames = subtask.collaboratorPermissions.map(p => p.name)
    const added = currentNames.filter(n => !existingNames.includes(n))
    const removed = existingNames.filter(n => !currentNames.includes(n))

    subtask.collaboratorPermissions = subtask.collaboratorPermissions.filter(p => !removed.includes(p.name))

    added.forEach(name => {
      if (!subtask.collaboratorPermissions.some(p => p.name === name)) {
        subtask.collaboratorPermissions.push({ name, permission: 'view' })
      }
    })
  })
})

const onCancel = () => {
  emit('cancel')
  emit('update:show', false)
}

const onSave = () => {
  if (!taskForm.value.validate()) {
    return
  }

  if (!localTask.value.title || localTask.value.title.trim() === '') {
    showMessage('Task title is required', 'error')
    return
  }

  // ADDED: Validation check for department lookup (if Task Owner is set)
  if (localTask.value.taskOwner && !taskOwnerDepartment.value) {
    showMessage('Could not determine the Task Owner\'s department. Please re-select the Task Owner.', 'error')
    return
  }
  // ------------------------------------------------------------------

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
    const subDueDate = new Date(subtask.dueDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (subDueDate < today) {
      showMessage(`Subtask ${i + 1}: Due date cannot be in the past`, 'error')
      return
    }
  }

  if (localTask.value.recurrence && localTask.value.recurrence.type) {
    localTask.value.recurrence.enabled = true
  } else {
    localTask.value.recurrence = { enabled: false, type: '', interval: 1, startDate: '', endDate: '' }
  }
  
  const dedupedCollaborators = collaboratorPermissions.value.filter((perm, index, self) =>
    index === self.findIndex(p => p.name === perm.name)
  )
  const payload = {
    ...localTask.value,
    // 2. ADDED: Include the auto-populated department in the payload
    taskOwnerDepartment: taskOwnerDepartment.value, 
    collaborators: dedupedCollaborators,
    subtasks: subtasks.value.map(s => ({
      ...s,
      collaborators: s.collaboratorPermissions.filter((perm, index, self) =>
        index === self.findIndex(p => p.name === perm.name)
      )
    }))
  }

  emit('save', payload)
  emit('update:show', false)
}

const availableCategories = ref([])
const axiosClient = axios.create({
  baseURL: 'http://localhost:3000/api',
  headers: { 'Content-Type': 'application/json' }
})

// Add axios interceptor for authentication
axiosClient.interceptors.request.use(config => {
  const token = localStorage.getItem('firebaseIdToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
}, error => {
  return Promise.reject(error)
})

// Load global categories from API
const loadCategories = async () => {
  try {
    console.log('🔄 Fetching categories from /categories...')
    const response = await axiosClient.get('/categories')
    console.log('📥 Categories API response:', response.data)
    availableCategories.value = response.data.map(cat => cat.name)
    console.log('✅ Loaded categories for task:', availableCategories.value)
  } catch (error) {
    console.error('❌ Error loading categories:', error)
    console.error('❌ Error details:', error.response?.data)
    console.error('❌ Error status:', error.response?.status)
    availableCategories.value = []
  }
}

// Load categories when dialog opens
watch(() => props.show, (isOpen) => {
  if (isOpen) {
    console.log('🔄 Dialog opened, loading categories...')
    loadCategories()
  }
})

const onProjectChange = async (projectId) => {
  // Projects don't affect categories anymore - categories are global
  console.log('Project changed to:', projectId)
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