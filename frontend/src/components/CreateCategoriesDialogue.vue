<template>
  <div>
    <v-dialog v-model="localShow" max-width="600px" persistent>
    <v-card rounded="xl">
      <v-card-title class="d-flex justify-space-between align-center pa-6">
        <div>
          <h3 class="text-h5 mb-1">Manage Categories</h3>
          <p class="text-caption text-grey">Add or remove categories for {{ projectName }}</p>
        </div>
        <v-btn icon="mdi-close" variant="text" size="small" @click="onClose" />
      </v-card-title>

      <v-divider />

      <v-card-text class="pa-6">
        <!-- Add New Category -->
        <div class="mb-6">
          <v-text-field
            v-model="newCategory"
            label="New Category"
            placeholder="Enter category name"
            variant="outlined"
            density="comfortable"
            hide-details="auto"
            @keyup.enter="addCategory"
          >
            <template #append-inner>
              <v-btn
                color="primary"
                variant="flat"
                size="small"
                :disabled="!newCategory.trim()"
                @click="addCategory"
              >
                Add
              </v-btn>
            </template>
          </v-text-field>
        </div>

        <!-- Existing Categories List -->
        <div v-if="categories.length > 0">
          <h4 class="text-subtitle-2 mb-3 text-grey-darken-1">Current Categories</h4>
          <v-list class="pa-0">
            <v-list-item
              v-for="(category, index) in categories"
              :key="index"
              class="category-item px-4 py-2 mb-2"
              rounded="lg"
            >
              <template #prepend>
                <v-icon color="primary" size="20">mdi-tag</v-icon>
              </template>
              
              <v-list-item-title class="text-body-2">
                {{ category }}
              </v-list-item-title>

              <template #append>
                <v-btn
                  icon="mdi-delete"
                  variant="text"
                  size="small"
                  color="error"
                  @click="removeCategory(category)"
                />
              </template>
            </v-list-item>
          </v-list>
        </div>

        <!-- Empty State -->
        <div v-else class="text-center py-8">
          <v-icon size="48" color="grey-lighten-1" class="mb-3">mdi-tag-off-outline</v-icon>
          <p class="text-body-2 text-grey">No categories yet. Add one above to get started.</p>
        </div>
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn
          variant="text"
          @click="onClose"
        >
          Close
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Success Snackbar -->
  <v-snackbar
    v-model="showSnackbar"
    :color="snackbarColor"
    timeout="3000"
    location="top"
  >
  </v-snackbar>
  </div>
  
</template>


<script setup>
import { ref, watch, computed } from 'vue'
import axios from 'axios'

const props = defineProps({
  show: {
    type: Boolean,
    required: true
  },
  projectId: {
    type: String,
    required: true
  },
  projectName: {
    type: String,
    default: 'this project'
  },
  initialCategories: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:show', 'categoriesUpdated'])

// Axios client setup
const axiosClient = axios.create({
  baseURL: 'http://localhost:3000',
  headers: {
    'Content-Type': 'application/json',
  },
})

axiosClient.interceptors.request.use(config => {
  const token = localStorage.getItem('firebaseIdToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
}, error => {
  return Promise.reject(error)
})

// State
const localShow = computed({
  get: () => props.show,
  set: (value) => emit('update:show', value)
})

const categories = ref([])
const newCategory = ref('')
const showSnackbar = ref(false)
const snackbarMessage = ref('')
const snackbarColor = ref('success')

// Watch for prop changes
watch(() => props.initialCategories, (newVal) => {
  categories.value = [...newVal]
}, { immediate: true })

// Methods
const addCategory = async () => {
  const categoryName = newCategory.value.trim()
  
  if (!categoryName) return
  
  if (categories.value.includes(categoryName)) {
    showMessage('Category already exists', 'warning')
    return
  }

  try {
    const response = await axiosClient.post(`/projects/${props.projectId}/categories`, {
      category: categoryName
    })
    
    categories.value = response.data.categories
    newCategory.value = ''
    showMessage('Category added successfully', 'success')
    emit('categoriesUpdated', categories.value)
  } catch (error) {
    console.error('Error adding category:', error)
    showMessage('Failed to add category', 'error')
  }
}

const removeCategory = async (category) => {
  try {
    const response = await axiosClient.delete(`/projects/${props.projectId}/categories/${encodeURIComponent(category)}`)
    
    categories.value = response.data.categories
    showMessage('Category removed successfully', 'success')
    emit('categoriesUpdated', categories.value)
  } catch (error) {
    console.error('Error removing category:', error)
    showMessage('Failed to remove category', 'error')
  }
}

const onClose = () => {
  emit('update:show', false)
}

const showMessage = (message, color) => {
  snackbarMessage.value = message
  snackbarColor.value = color
  showSnackbar.value = true
}
</script>

<style scoped>
.category-item {
  background-color: var(--v-theme-surface);
  border: 1px solid rgba(var(--v-border-color), 0.12);
  transition: all 0.2s ease;
}

.category-item:hover {
  background-color: rgba(var(--v-theme-primary), 0.05);
  border-color: rgba(var(--v-theme-primary), 0.2);
}

/* Fix dialog background */
:deep(.v-dialog .v-overlay__content) {
  background: transparent !important;
}

:deep(.v-card) {
  background: var(--bg-primary) !important;
}

.v-list {
  background-color: transparent !important;
}

.text-grey-darken-1 {
  opacity: 0.7;
}

/* Dark mode fixes */
[data-theme="dark"] :deep(.v-card) {
  background: #1e1e1e !important;
}

[data-theme="dark"] :deep(.v-field) {
  background: rgba(255, 255, 255, 0.05) !important;
}

[data-theme="dark"] :deep(.v-list-item) {
  background: transparent !important;
}
</style>