<template>
  <div class="categories-detail-container">
    <!-- Search Bar with Button -->
    <div class="search-bar-row">
    <v-text-field
        v-model="searchQuery"
        placeholder="Search categories..."
        prepend-inner-icon="mdi-magnify"
        variant="outlined"
        density="comfortable"
        hide-details
        clearable
        class="search-field"
    />
    <v-btn
        color="#81c784"
        prepend-icon="mdi-plus"
        @click="showAddCategoryDialog = true"
        rounded="lg"
    >
        Add Global Category
    </v-btn>
    </div>

    <!-- Remove this old search bar div -->
    <div class="search-bar" style="display: none;">
      <v-text-field
        v-model="searchQuery"
        placeholder="Search categories..."
        prepend-inner-icon="mdi-magnify"
        variant="outlined"
        density="comfortable"
        hide-details
        clearable
      />
    </div>

    <!-- Category Cards Grid -->
    <div v-if="filteredCategories.length > 0" class="category-cards-grid">
      <div
        v-for="category in filteredCategories"
        :key="category.name"
        class="category-card"
      >
        <!-- Category Header -->
        <div class="category-card-header">
          <div class="category-title-section">
            <v-icon :color="getCategoryColor(category.name)" size="24">mdi-tag</v-icon>
            <h3>{{ category.name }}</h3>
          </div>
          <v-menu>
            <template #activator="{ props }">
              <v-btn
                icon="mdi-dots-vertical"
                variant="text"
                size="small"
                v-bind="props"
              />
            </template>
            <v-list>
              <v-list-item @click="deleteCategory(category.name)">
                <v-list-item-title>
                  <v-icon size="18" start>mdi-delete</v-icon>
                  Delete Category
                </v-list-item-title>
              </v-list-item>
            </v-list>
          </v-menu>
        </div>

        <!-- Category Stats -->
        <div class="category-stats">
          <div class="stat-item">
            <v-icon size="18" color="primary">mdi-briefcase</v-icon>
            <span>{{ category.projectCount }} projects</span>
          </div>
          <div class="stat-item">
            <v-icon size="18" color="success">mdi-checkbox-marked-circle</v-icon>
            <span>{{ category.taskCount }} tasks</span>
          </div>
        </div>

        <!-- Projects in Category -->
        <div class="category-projects">
          <div class="projects-label">Projects:</div>
          <div v-if="category.projects.length > 0" class="project-chips">
            <v-chip
              v-for="project in category.projects.slice(0, 3)"
              :key="project.id"
              size="small"
              class="project-chip"
            >
              {{ project.name }}
            </v-chip>
            <v-chip
              v-if="category.projects.length > 3"
              size="small"
              variant="outlined"
              class="more-chip"
            >
              +{{ category.projects.length - 3 }} more
            </v-chip>
          </div>
          <div v-else class="no-projects">
            No projects in this category
          </div>
        </div>

        <!-- View Details Button -->
        <v-btn
          variant="outlined"
          block
          class="mt-3"
          @click="viewCategoryDetails(category)"
        >
          View All Projects
        </v-btn>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="empty-state">
      <v-icon size="80" color="grey-lighten-1">mdi-tag-off-outline</v-icon>
      <h3>No categories found</h3>
      <p>{{ searchQuery ? 'Try adjusting your search' : 'Create your first category to get started' }}</p>
    </div>

    <!-- Add Global Category Dialog -->
    <v-dialog v-model="showAddCategoryDialog" max-width="500px">
      <v-card rounded="xl">
        <v-card-title class="pa-6">
          <h3>Add Global Category</h3>
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-6">
          <v-text-field
            v-model="newGlobalCategory"
            label="Category Name"
            placeholder="Enter category name"
            variant="outlined"
            density="comfortable"
            autofocus
            @keyup.enter="addGlobalCategory"
          />
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="showAddCategoryDialog = false">Cancel</v-btn>
          <v-btn
            color="primary"
            variant="flat"
            :disabled="!newGlobalCategory.trim()"
            @click="addGlobalCategory"
          >
            Add
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Category Detail Dialog -->
    <v-dialog v-model="showDetailDialog" max-width="800px">
      <v-card v-if="selectedCategory" rounded="xl">
        <v-card-title class="pa-6">
          <div class="d-flex align-center gap-3">
            <v-icon :color="getCategoryColor(selectedCategory.name)" size="32">mdi-tag</v-icon>
            <div>
              <h3>{{ selectedCategory.name }}</h3>
              <p class="text-caption text-grey">{{ selectedCategory.projectCount }} projects, {{ selectedCategory.taskCount }} tasks</p>
            </div>
          </div>
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-6">
          <h4 class="mb-4">Projects in this category:</h4>
          <v-list>
            <v-list-item
              v-for="project in selectedCategory.projects"
              :key="project.id"
              class="project-list-item"
            >
              <template #prepend>
                <v-icon color="primary">mdi-briefcase</v-icon>
              </template>
              <v-list-item-title>{{ project.name }}</v-list-item-title>
              <v-list-item-subtitle>{{ project.department }}</v-list-item-subtitle>
              <template #append>
                <v-chip size="small" :color="getStatusColor(project.status)">
                  {{ project.status }}
                </v-chip>
              </template>
            </v-list-item>
          </v-list>
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="showDetailDialog = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  projects: {
    type: Array,
    required: true
  },
  allCategories: {
    type: Array,
    required: true
  }
})

const emit = defineEmits(['addGlobalCategory', 'deleteCategory'])

// State
const searchQuery = ref('')
const showAddCategoryDialog = ref(false)
const showDetailDialog = ref(false)
const newGlobalCategory = ref('')
const selectedCategory = ref(null)

// Computed
const categoriesWithProjects = computed(() => {
  return props.allCategories.map(categoryName => {
    // Get all projects that have this category
    const projectsInCategory = props.projects.filter(project => 
      project.categories && project.categories.includes(categoryName)
    )
    
    // Count total tasks in this category across all projects
    const taskCount = projectsInCategory.reduce((sum, project) => {
      // Count tasks that have this category
      const tasksWithCategory = (project.tasks || []).filter(task => 
        task.categories && task.categories.includes(categoryName)
      )
      return sum + tasksWithCategory.length
    }, 0)
    
    return {
      name: categoryName,
      projectCount: projectsInCategory.length,
      taskCount: taskCount,
      projects: projectsInCategory
    }
  })
})

const filteredCategories = computed(() => {
  if (!searchQuery.value) {
    return categoriesWithProjects.value
  }
  
  const query = searchQuery.value.toLowerCase()
  return categoriesWithProjects.value.filter(category =>
    category.name.toLowerCase().includes(query)
  )
})

// Methods
const getCategoryColor = (categoryName) => {
  const colors = [
    'primary', 'secondary', 'success', 'warning', 'error', 
    'info', 'purple', 'pink', 'indigo', 'teal'
  ]
  const index = categoryName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return colors[index % colors.length]
}

const getStatusColor = (status) => {
  const statusColors = {
    'Ongoing': 'primary',
    'Completed': 'success',
    'On Hold': 'warning',
    'Cancelled': 'error'
  }
  return statusColors[status] || 'grey'
}

const addGlobalCategory = () => {
  const categoryName = newGlobalCategory.value.trim()
  if (!categoryName) return
  
  emit('addGlobalCategory', categoryName)
  newGlobalCategory.value = ''
  showAddCategoryDialog.value = false
}

const deleteCategory = (categoryName) => {
  if (confirm(`Are you sure you want to delete the category "${categoryName}"? This will remove it from all projects.`)) {
    emit('deleteCategory', categoryName)
  }
}

const viewCategoryDetails = (category) => {
  selectedCategory.value = category
  showDetailDialog.value = true
}
</script>


<style scoped>
.categories-detail-container {
  padding: 0;
  width: 100%;
  max-width: 100%;
}

/* Search Bar Row */
.search-bar-row {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 24px;
  padding: 0 24px;
}

.search-field {
  max-width: 500px;
  flex: 0 0 500px;
}

.search-bar {
  display: none;
}

/* Category Cards Grid */
.category-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  padding: 0 24px 24px 24px;
}

.category-card {
  background: var(--bg-primary);
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 16px;
  padding: 24px;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
}

[data-theme="dark"] .category-card {
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.category-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.12);
}

[data-theme="dark"] .category-card:hover {
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.3);
}

/* Category Header */
.category-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.category-title-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

.category-title-section h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

/* Category Stats */
.category-stats {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}

[data-theme="dark"] .category-stats {
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: #6b7280;
}

/* Category Projects */
.category-projects {
  flex: 1;
  margin-bottom: 16px;
}

.projects-label {
  font-size: 13px;
  font-weight: 500;
  color: #6b7280;
  margin-bottom: 8px;
}

.project-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.project-chip {
  font-size: 12px;
}

.more-chip {
  font-size: 12px;
  opacity: 0.7;
}

.no-projects {
  font-size: 13px;
  color: #9ca3af;
  font-style: italic;
  padding: 8px 0;
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  text-align: center;
}

.empty-state h3 {
  margin: 16px 0 8px 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
}

.empty-state p {
  margin: 0;
  color: #6b7280;
  font-size: 14px;
}

/* Dialog Styles */
:deep(.v-dialog .v-overlay__content) {
  background: var(--bg-primary) !important;
}

:deep(.v-card) {
  background: var(--bg-primary) !important;
}

.project-list-item {
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  padding: 12px 16px;
}

[data-theme="dark"] .project-list-item {
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.project-list-item:last-child {
  border-bottom: none;
}

/* Responsive */
@media (max-width: 768px) {
  .categories-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
    padding: 0 16px;
  }

  .search-bar {
    padding: 0 16px;
  }

  .category-cards-grid {
    grid-template-columns: 1fr;
    padding: 0 16px 16px 16px;
  }

  .category-stats {
    flex-direction: column;
    gap: 8px;
  }
}
</style>