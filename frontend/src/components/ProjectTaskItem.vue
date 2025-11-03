<template>
  <div class="project-task-item">
    <div class="task-content">
      <!-- Left Section: Task Info -->
      <div class="task-info">
        <div class="task-name">
          <h4>{{ task.title }}</h4>
        </div>
        <div class="task-details">
          <div v-if="task.dueDate" class="task-detail-item" :class="{ 'overdue': isOverdue(task.dueDate) }">
            <v-icon size="16" class="detail-icon">mdi-calendar</v-icon>
            <span>Due: {{ formatDate(task.dueDate) }}</span>
          </div>
          <div v-if="task.assignedTo" class="task-detail-item">
            <v-icon size="16" class="detail-icon">mdi-account</v-icon>
            <span>Assigned to: {{ displayAssignedTo }}</span>
          </div>
        </div>
      </div>

      <!-- Right Section: Status and Actions -->
      <div class="task-actions">
        <div class="task-status">
          <v-chip 
            :color="getStatusColor(task.status)"
            size="small"
            variant="outlined"
          >
            <v-icon 
              :icon="getStatusIcon(task.status)" 
              size="14"
              start
            />
            {{ task.status }}
          </v-chip>
        </div>
        <div class="task-action">
          <v-btn
            variant="outlined"
            color="primary"
            size="small"
            @click="$emit('view-task', task)"
          >
            <v-icon start size="16">mdi-eye</v-icon>
            View Task
          </v-btn>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/config/firebase'

const props = defineProps({
  task: { type: Object, required: true }
})

const emit = defineEmits(['view-task'])

// Load users for email to name conversion
const allUsers = ref([])

onMounted(async () => {
  try {
    const usersSnapshot = await getDocs(collection(db, 'Users'))
    allUsers.value = usersSnapshot.docs.map(doc => ({
      email: doc.id,
      name: doc.data().name || doc.id
    }))
  } catch (e) {
    allUsers.value = []
  }
})

// Convert assignedTo to display name
const displayAssignedTo = computed(() => {
  if (!props.task?.assignedTo) return ''
  
  const assignedValue = props.task.assignedTo
  
  // Handle if it's an object
  let lookupValue
  if (typeof assignedValue === 'object') {
    lookupValue = assignedValue.name || assignedValue.email || assignedValue.value
  } else {
    lookupValue = assignedValue
  }
  
  if (!lookupValue) return ''
  
  // If it's already a name, return it
  if (!lookupValue.includes('@')) {
    return lookupValue
  }
  
  // If it's an email, look up the name
  const user = allUsers.value.find(u => u.email === lookupValue)
  return user && user.name ? user.name : lookupValue
})

// Methods
const getStatusColor = (status) => {
  const colors = {
    'Pending': 'orange',
    'Ongoing': 'blue',
    'Pending Review': 'purple',
    'Completed': 'green'
  }
  return colors[status] || 'grey'
}

const getStatusIcon = (status) => {
  const icons = {
    'Pending': 'mdi-clock-outline',
    'Ongoing': 'mdi-play-circle-outline',
    'Pending Review': 'mdi-eye-outline',
    'Completed': 'mdi-check-circle-outline'
  }
  return icons[status] || 'mdi-circle-outline'
}

const isOverdue = (dueDate) => {
  if (!dueDate) return false
  const now = new Date()
  return new Date(dueDate) < now
}

const formatDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  const now = new Date()
  const diffTime = date - now
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Tomorrow'
  if (diffDays === -1) return 'Yesterday'
  if (diffDays < 0) return `${Math.abs(diffDays)} days ago`
  if (diffDays <= 7) return `In ${diffDays} days`
  
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  })
}
</script>

<style scoped>
.project-task-item {
  background: white;
  border: 1px solid #e9ecef;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 16px;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.project-task-item:hover {
  background-color: #f8f9fa;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
  border-color: #dee2e6;
}

.task-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
}

/* Left Section: Task Info */
.task-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.task-name h4 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #2c3e50;
  line-height: 1.4;
}

.task-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.task-detail-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #6c757d;
  font-weight: 500;
}

.task-detail-item.overdue {
  color: #dc3545;
  font-weight: 600;
}

.detail-icon {
  opacity: 0.8;
}

/* Right Section: Status and Actions */
.task-actions {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-shrink: 0;
}

.task-status {
  display: flex;
  align-items: center;
}

.task-action {
  display: flex;
  align-items: center;
}

/* Responsive Design */
@media (max-width: 768px) {
  .project-task-item {
    padding: 16px;
  }

  .task-content {
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
  }

  .task-info {
    text-align: left;
  }

  .task-actions {
    justify-content: space-between;
    width: 100%;
  }

  .task-name h4 {
    font-size: 16px;
  }

  .task-details {
    gap: 6px;
  }

  .task-detail-item {
    font-size: 13px;
  }
}

@media (max-width: 480px) {
  .project-task-item {
    padding: 14px;
  }

  .task-content {
    gap: 14px;
  }

  .task-actions {
    flex-direction: column;
    gap: 12px;
  }

  .task-name h4 {
    font-size: 15px;
  }

  .task-detail-item {
    font-size: 12px;
  }
}
</style>