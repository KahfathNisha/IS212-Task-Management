<template>
  <v-dialog :model-value="show" @update:model-value="$emit('update:show', $event)" max-width="800px">    
    <v-card v-if="task" class="task-details-card" rounded="xl">
      <v-card-title class="task-details-header">
        <div class="header-content">
          <div class="details-title-section">
            <h2>{{ task.title }}</h2>
            <div class="title-chips">
              <v-chip :color="getStatusColor(task.status)" size="small" rounded="lg">
                {{ task.status }}
              </v-chip>
              <v-chip v-if="task.isSubtask" color="secondary" size="small" rounded="lg">Subtask</v-chip>
              <v-chip v-else color="primary" size="small" rounded="lg">Task</v-chip>
            </div>
          </div>

          <div class="header-actions">
            <v-btn icon="mdi-close" class="close-btn" variant="text" size="small" @click="$emit('update:show', false)" />
            <v-select
              :model-value="task.status"
              :items="taskStatuses"
              label="Update Status"
              variant="outlined"
              density="compact"
              @update:modelValue="onChangeStatus"
              class="status-dropdown"
              hide-details
            ></v-select>
          </div>
        </div>
      </v-card-title>

      <v-card-text class="task-details-content">
        <v-row>
          <v-col cols="6">
            <div class="detail-section">
              <div class="detail-section-icon-row">
                <v-icon size="small" class="detail-icon">mdi-text</v-icon>
                <h4>Description</h4>
              </div>
              <p>{{ task.description || "No description" }}</p>
            </div>
          </v-col>
          <v-col cols="6">
            <div class="detail-section">
              <div class="detail-section-icon-row">
                <v-icon size="small" class="detail-icon">mdi-calendar-outline</v-icon>
                <h4>Due Date</h4>
              </div>
              <p>{{ task.dueDate ? formatDate(task.dueDate) : 'No due date' }}</p>
            </div>
          </v-col>
        </v-row>

        <v-row>
          <v-col cols="6">
            <div class="detail-section">
              <div class="detail-section-icon-row">
                <v-icon size="small" class="detail-icon">mdi-account</v-icon>
                <h4>Assigned To</h4>
              </div>
              <p>{{ task.assignedTo || 'Unassigned' }}</p>
            </div>
          </v-col>
          <v-col cols="6">
            <div class="detail-section">
              <div class="detail-section-icon-row">
                <v-icon size="small" class="detail-icon">mdi-priority-high</v-icon>
                <h4>Priority</h4>
              </div>
              <p>{{ task.priority || 'Not set' }}</p>
            </div>
          </v-col>
        </v-row>

        <v-row v-if="task.collaborators && task.collaborators.length > 0">
          <v-col cols="12">
            <div class="detail-section">
              <div class="detail-section-icon-row">
                <v-icon size="small" class="detail-icon">mdi-account-group</v-icon>
                <h4>Collaborators</h4>
              </div>
              <p>{{ task.collaborators.join(', ') }}</p>
            </div>
          </v-col>
        </v-row>

        <div class="detail-section" v-if="task.subtasks && task.subtasks.length > 0">
          <h4>Progress</h4>
          <div class="progress-bar-container">
            <div class="custom-progress-bar">
              <div class="progress-fill" :style="{ width: parentProgress + '%' }"></div>
            </div>
            <span class="progress-text">{{ parentProgress }}%</span>
          </div>
        </div>

        <div class="detail-section" v-if="task.attachments && task.attachments.length > 0">
          <h4>Attachments</h4>
          <div class="attachments-list">
            <v-chip
              v-for="attachment in task.attachments"
              :key="attachment.url || attachment.name"
              variant="outlined"
              class="attachment-chip"
              @click="onOpenAttachment(attachment.url)"
            >
              <v-icon start>mdi-paperclip</v-icon>
              {{ attachment.name }}
            </v-chip>
          </div>
        </div>

        <div class="detail-section" v-if="task.statusHistory && task.statusHistory.length">
          <h4>Status Updates</h4>
          <div class="status-updates">
            <div v-for="(entry, idx) in task.statusHistory" :key="idx" class="status-entry">
              <div class="status-dot" :style="{ backgroundColor: getStatusColor(entry.newStatus) }"></div>
              <div class="status-info">
                <div class="status-description">
                  Status changed to
                  <v-chip size="x-small" :color="getStatusColor(entry.newStatus)">{{ entry.newStatus }}</v-chip>
                </div>
                <div class="status-timestamp">{{ formatDateTime(entry.timestamp) }}</div>
              </div>
            </div>
          </div>
        </div>

        <div class="detail-section" v-if="task.subtasks && task.subtasks.length > 0">
          <h4>Subtasks</h4>
          <div class="subtask-list">
            <div v-for="(subtask, index) in task.subtasks" :key="subtask.id || index" class="subtask-item">
              <div class="subtask-info">
                <div class="subtask-title">{{ subtask.title }}</div>
                <div class="subtask-status">
                  <v-chip :color="getStatusColor(subtask.status)" size="small" rounded="lg">
                    {{ subtask.status }}
                  </v-chip>
                </div>
              </div>

              <div class="subtask-details">
                <v-row>
                  <v-col cols="6">
                    <div class="detail-row" v-if="subtask.description">
                      <v-icon size="small" class="detail-icon">mdi-text</v-icon>
                      <p>{{ subtask.description }}</p>
                    </div>
                  </v-col>
                  <v-col cols="6">
                    <div class="detail-row" v-if="subtask.priority">
                      <v-icon size="small" class="detail-icon">mdi-priority-high</v-icon>
                      <p>Priority: {{ subtask.priority }}</p>
                    </div>
                  </v-col>
                </v-row>

                <v-row>
                  <v-col cols="6">
                    <div class="detail-row" v-if="subtask.assignedTo">
                      <v-icon size="small" class="detail-icon">mdi-account</v-icon>
                      <p>{{ subtask.assignedTo }}</p>
                    </div>
                  </v-col>
                  <v-col cols="6">
                    <div class="detail-row" v-if="subtask.collaborators && subtask.collaborators.length > 0">
                      <v-icon size="small" class="detail-icon">mdi-account-group</v-icon>
                      <p>{{ subtask.collaborators.join(', ') }}</p>
                    </div>
                  </v-col>
                </v-row>

                <v-row>
                  <v-col cols="6">
                    <div class="detail-row" v-if="subtask.dueDate">
                      <v-icon size="small" class="detail-icon">mdi-calendar-outline</v-icon>
                      <p>{{ formatDate(subtask.dueDate) }}</p>
                    </div>
                  </v-col>
                </v-row>
              </div>
            </div>
          </div>
        </div>

        <div class="detail-section" v-if="task.isSubtask && task.parentTask">
          <h4>Parent Task</h4>
          <div class="parent-summary">
            <div class="parent-title-section">
              <v-btn variant="text" size="small" class="parent-title-btn" @click="onViewParent">
                {{ task.parentTask.title }}
              </v-btn>
            </div>
          </div>
        </div>
      </v-card-text>

      <v-card-actions class="task-details-actions">
        <v-btn color="primary" @click="onEdit" prepend-icon="mdi-pencil" rounded="lg">
          {{ task.isSubtask ? 'Edit Subtask' : 'Edit Task' }}
        </v-btn>
        <v-spacer />
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { computed } from 'vue'
import '../assets/styles.css';

const props = defineProps({
  model: { type: Object, default: null },
  show: { type: Boolean, default: false },
  taskStatuses: { type: Array, default: () => ['To Do', 'In Progress', 'Done'] },
  parentTaskProgress: { type: Number, default: 0 }
})

const emit = defineEmits(['update:show', 'edit', 'change-status', 'view-parent', 'open-attachment'])

const task = computed(() => props.model)
const parentProgress = computed(() => props.parentTaskProgress || 0)

const getStatusColor = (status) => {
  return status === 'To Do' ? 'orange' : status === 'In Progress' ? 'blue' : 'green'
}

const formatDate = (s) => s ? new Date(s).toLocaleDateString() : ''
const formatDateTime = (s) => s ? new Date(s).toLocaleString() : ''

const onEdit = () => {
  if (!task.value) return
  emit('edit', task.value)
}

const onChangeStatus = (newStatus) => {
  if (!task.value) return
  emit('change-status', { task: task.value, status: newStatus })
}

const onViewParent = () => {
  if (!task.value || !task.value.parentTask) return
  emit('view-parent', task.value.parentTask)
}

const onOpenAttachment = (url) => {
  if (!url) return
  emit('open-attachment', url)
}
</script>
<style scoped>
.task-details-card {
  background: var(--bg-primary) !important;
  color: var(--text-primary) !important;
}

[data-theme="dark"] .task-details-card {
  background: var(--bg-primary) !important;
  color: var(--text-primary) !important;
}

.task-details-header {
  padding: 20px 24px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}

[data-theme="dark"] .task-details-header {
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  gap: 24px;
}

.details-title-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
}

.details-title-section h2 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.2;
}

.title-chips {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
  padding-top: 15px;
}

.header-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
  min-width: 200px;
}

.close-btn {
  align-self: flex-end;
}

.status-dropdown {
  width: 100%;
  min-width: 200px;
}

.task-details-content {
  padding: 24px;
}

.detail-section {
  margin-bottom: 24px;
}

.detail-section:last-child {
  margin-bottom: 0;
}

.detail-section h4 {
  margin: 0 0 8px 0;
  font-size: 12px;
  font-weight: 600;
  color: #7f8c8d;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.detail-section p {
  margin: 0;
  color: var(--text-primary);
  font-size: 14px;
  line-height: 1.5;
}

.detail-section-icon-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.detail-section-icon-row h4 {
  margin: 0;
  line-height: 1;
  display: flex;
  align-items: center;
}

.detail-icon {
  color: #7f8c8d;
  flex-shrink: 0;
}

.progress-bar-container {
  display: flex;
  align-items: center;
  gap: 12px;
}

.custom-progress-bar {
  flex: 1;
  height: 8px;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 4px;
  overflow: hidden;
}

[data-theme="dark"] .custom-progress-bar {
  background: rgba(255, 255, 255, 0.1);
}

.progress-fill {
  height: 100%;
  background: #4caf50;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  min-width: 40px;
}

.attachments-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.attachment-chip {
  cursor: pointer;
}

.status-updates {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.status-entry {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.status-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  margin-top: 4px;
  flex-shrink: 0;
}

.status-info {
  flex: 1;
}

.status-description {
  font-size: 14px;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.status-timestamp {
  font-size: 12px;
  color: #7f8c8d;
}

.subtask-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.subtask-item {
  padding: 16px;
  background: rgba(0, 0, 0, 0.02);
  border-radius: 12px;
  border: 1px solid rgba(0, 0, 0, 0.08);
}

[data-theme="dark"] .subtask-item {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.subtask-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.subtask-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.subtask-details {
  margin-top: 12px;
}

.detail-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 24px;
}

.detail-row p {
  margin: 0;
  font-size: 14px;
  color: var(--text-primary);
  line-height: 1.5;
  display: flex;
  align-items: center;
}

.parent-summary {
  padding: 12px;
  background: rgba(0, 0, 0, 0.02);
  border-radius: 8px;
  border: 1px solid rgba(0, 0, 0, 0.08);
}

[data-theme="dark"] .parent-summary {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.parent-title-btn {
  text-transform: none;
  font-size: 14px;
}

.task-details-actions {
  padding: 16px 24px;
  border-top: 1px solid rgba(0, 0, 0, 0.08);
}

[data-theme="dark"] .task-details-actions {
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

/* Fix v-row spacing */
:deep(.v-row) {
  margin-top: 0;
  margin-bottom: 0;
}

:deep(.v-col) {
  padding-top: 8px;
  padding-bottom: 8px;
}
</style>