<template>
  <div class="projects-container">
    <div class="projects-page">
      <!-- Header -->
      <header class="page-header">
        <div class="header-left">
          <h1>Project Overview</h1>
          <p class="subtitle">Monitor team workload and manage project categories</p>
        </div>
        
        <div class="header-right">
          <v-btn
            color="primary"
            prepend-icon="mdi-plus"
            @click="showCreateDialog = true"
            rounded="lg"
            class="add-project-btn"
          >
            New Project
          </v-btn>
        </div>
      </header>

      <!-- Filters -->
      <div class="view-controls">
        <div class="controls-row">
          <div class="view-toggle-left">
            <div class="view-tabs">
              <button 
                v-for="tab in viewTabs" 
                :key="tab.value"
                @click="currentView = tab.value"
                :class="['view-tab', { 'active': currentView === tab.value }]"
              >
                {{ tab.label }}
              </button>
            </div>
          </div>

          <div class="filters-right">
            <div class="filter-label">Filters</div>
            
            <v-btn
              color="primary"
              rounded="pill"
              @click.stop="toggleCategoryMenu"
              ref="categoryBtnRef"
              class="filter-btn"
            >
              Category{{ selectedCategories.length > 0 ? ` (${selectedCategories.length})` : '' }}
              <v-icon size="small" class="ml-1">mdi-chevron-down</v-icon>
            </v-btn>

            <v-btn
              color="primary"
              rounded="pill"
              @click.stop="toggleStatusMenu"
              ref="statusBtnRef"
              class="filter-btn"
            >
              Status{{ selectedStatuses.length > 0 ? ` (${selectedStatuses.length})` : '' }}
              <v-icon size="small" class="ml-1">mdi-chevron-down</v-icon>
            </v-btn>

            <v-btn
              color="primary"
              rounded="pill"
              @click.stop="toggleDepartmentMenu"
              ref="departmentBtnRef"
              class="filter-btn"
            >
              Department{{ selectedDepartments.length > 0 ? ` (${selectedDepartments.length})` : '' }}
              <v-icon size="small" class="ml-1">mdi-chevron-down</v-icon>
            </v-btn>

            <v-btn
              variant="outlined"
              @click="resetFilters"
              class="reset-btn"
              :disabled="selectedStatuses.length === 0 && selectedDepartments.length === 0 && selectedCategories.length === 0"
            >
              Reset filters
            </v-btn>
          </div>

          <!-- Category Dropdown -->
          <div
            v-show="categoryMenuOpen"
            class="custom-filter-dropdown"
            :style="{ top: categoryDropdownTop + 'px', left: categoryDropdownLeft + 'px' }"
            ref="categoryDropdownRef"
          >
            <div class="dropdown-body">
              <input
                v-model="searchCategory"
                type="text"
                placeholder="Search categories"
                class="search-input"
              />
              <div class="filter-options-list">
                <label
                  v-for="option in filteredCategoryOptions"
                  :key="option.value"
                  class="filter-option-item"
                >
                  <input
                    type="checkbox"
                    :checked="tempSelectedCategories.includes(option.value)"
                    @change="toggleCategory(option.value)"
                    class="custom-checkbox"
                  />
                  <span class="option-text">{{ option.title }}</span>
                </label>
              </div>
            </div>
            <div class="dropdown-footer">
              <v-btn @click="closeCategoryMenu" variant="outlined">Close</v-btn>
              <v-btn @click="applyCategoryFilter" color="primary">Apply</v-btn>
            </div>
          </div>

          <!-- Status Dropdown -->
          <div
            v-show="statusMenuOpen"
            class="custom-filter-dropdown"
            :style="{ top: statusDropdownTop + 'px', left: statusDropdownLeft + 'px' }"
            ref="statusDropdownRef"
          >
            <div class="dropdown-body">
              <input
                v-model="searchStatus"
                type="text"
                placeholder="Search status"
                class="search-input"
              />
              <div class="filter-options-list">
                <label
                  v-for="option in filteredStatusOptions"
                  :key="option.value"
                  class="filter-option-item"
                >
                  <input
                    type="checkbox"
                    :checked="tempSelectedStatuses.includes(option.value)"
                    @change="toggleStatus(option.value)"
                    class="custom-checkbox"
                  />
                  <span class="option-text">{{ option.title }}</span>
                </label>
              </div>
            </div>
            <div class="dropdown-footer">
              <v-btn @click="closeStatusMenu" variant="outlined">Close</v-btn>
              <v-btn @click="applyStatusFilter" color="primary">Apply</v-btn>
            </div>
          </div>

          <!-- Department Dropdown -->
          <div
            v-show="departmentMenuOpen"
            class="custom-filter-dropdown"
            :style="{ top: departmentDropdownTop + 'px', left: departmentDropdownLeft + 'px' }"
            ref="departmentDropdownRef"
          >
            <div class="dropdown-body">
              <input
                v-model="searchDepartment"
                type="text"
                placeholder="Search departments"
                class="search-input"
              />
              <div class="filter-options-list">
                <label
                  v-for="option in filteredDepartmentOptions"
                  :key="option.value"
                  class="filter-option-item"
                >
                  <input
                    type="checkbox"
                    :checked="tempSelectedDepartments.includes(option.value)"
                    @change="toggleDepartment(option.value)"
                    class="custom-checkbox"
                  />
                  <span class="option-text">{{ option.title }}</span>
                </label>
              </div>
            </div>
            <div class="dropdown-footer">
              <v-btn @click="closeDepartmentMenu" variant="outlined">Close</v-btn>
              <v-btn @click="applyDepartmentFilter" color="primary">Apply</v-btn>
            </div>
          </div>
        </div>
      </div>

      <!-- Filter Chips -->
      <div class="filter-chips" v-if="selectedFilters.length > 0">
        <v-chip
          v-for="filter in selectedFilters"
          :key="filter.key"
          closable
          @click:close="removeFilter(filter)"
          class="filter-chip"
        >
          {{ filter.label }}
        </v-chip>
      </div>

      <!-- PROJECTS VIEW -->
      <div v-if="currentView === 'projects'" class="projects-list">
        <!-- Loading State -->
        <div v-if="loadingProjects" class="loading-state">
          <v-progress-circular indeterminate color="primary" size="64" />
          <p>Loading projects...</p>
        </div>

        <!-- Projects List -->
        <template v-else>
          <div 
            v-for="project in filteredProjects" 
            :key="project.id" 
            class="project-card"
          >
            <!-- Project Header -->
            <div class="project-header" @click="toggleProject(project.id)">
              <div class="project-header-left">
                <button class="expand-btn">
                  <v-icon size="20">
                    {{ expandedProjects.includes(project.id) ? 'mdi-chevron-down' : 'mdi-chevron-right' }}
                  </v-icon>
                </button>
                <h3 class="project-name">{{ project.name }}</h3>
                <v-chip 
                  :color="getStatusColor(project.status)" 
                  size="small"
                  class="status-chip"
                >
                  {{ project.status }}
                </v-chip>
                <v-chip 
                  size="small"
                  class="department-chip"
                >
                  {{ project.department }}
                </v-chip>
              </div>
              <div class="project-header-right">
                <v-btn 
                  icon="mdi-pencil" 
                  size="small" 
                  variant="text"
                  @click.stop="editProject(project)"
                />
                <v-btn 
                  icon="mdi-dots-vertical" 
                  size="small" 
                  variant="text"
                  @click.stop
                />
              </div>
            </div>

            <!-- Project Summary -->
            <div class="project-summary">
              <p class="project-description">{{ project.description }}</p>
              
              <!-- Categories -->
              <div class="project-categories" v-if="project.categories?.length">
                <v-chip 
                  v-for="category in project.categories" 
                  :key="category"
                  size="small"
                  class="category-chip"
                  :color="getCategoryColor(category)"
                >
                  <v-icon size="14" start>mdi-tag</v-icon>
                  {{ category }}
                </v-chip>
              </div>

              <div class="project-meta">
                <div class="meta-item">
                  <v-icon size="18" class="meta-icon">mdi-account-multiple</v-icon>
                  <span>{{ project.members?.length || 0 }} members</span>
                </div>
                <div class="meta-item">
                  <v-icon size="18" class="meta-icon">mdi-checkbox-marked-circle-outline</v-icon>
                  <span>{{ project.completedTasks || 0 }}/{{ project.totalTasks || 0 }} tasks</span>
                </div>
                <div class="meta-item">
                  <v-icon size="18" class="meta-icon">mdi-calendar</v-icon>
                  <span>{{ formatDate(project.dueDate) }}</span>
                </div>
                <div class="progress-container">
                  <div class="progress-bar">
                    <div 
                      class="progress-fill" 
                      :style="{ width: (project.progress || 0) + '%' }"
                    ></div>
                  </div>
                  <span class="progress-text">{{ project.progress || 0 }}%</span>
                </div>
              </div>
              <div class="avatars" v-if="project.members?.length">
                <v-tooltip
                  v-for="(member, idx) in project.members.slice(0, 5)" 
                  :key="idx"
                  :text="member.name || member"
                >
                  <template v-slot:activator="{ props }">
                    <div 
                      v-bind="props"
                      class="avatar"
                      :style="{ background: getAvatarColor(idx) }"
                    >
                      {{ getInitials(member) }}
                    </div>
                  </template>
                </v-tooltip>
                <div v-if="project.members.length > 5" class="avatar avatar-more">
                  +{{ project.members.length - 5 }}
                </div>
              </div>
            </div>

            <!-- Expanded Details -->
            <div v-if="expandedProjects.includes(project.id)" class="project-details">
              <!-- Tasks by Category -->
              <ProjectTasks
                  :key="`project-tasks-${project.id}`"
                  :project-id="project.id"
                  :show="true"
                  @view-task="viewTask"
                  @task-updated="refreshProject"
              />

              <div class="details-section">
                <div class="section-header">
                  <h4>Tasks by Category</h4>
                  <v-btn 
                    size="small" 
                    variant="text" 
                    prepend-icon="mdi-tag-plus"
                    @click="manageCategoriesForProject(project)"
                  >
                    Manage Categories
                  </v-btn>
                </div>

                <div v-if="project.categories?.length" class="categories-section">
                  <div 
                    v-for="category in project.categories" 
                    :key="category"
                    class="category-group"
                  >
                    <div class="category-header">
                      <v-chip 
                        size="small"
                        :color="getCategoryColor(category)"
                      >
                        <v-icon size="14" start>mdi-tag</v-icon>
                        {{ category }}
                      </v-chip>
                      <span class="task-count">{{ getTasksByCategory(project, category).length }} tasks</span>
                    </div>

                    <div class="category-tasks">
                      <div 
                        v-for="task in getTasksByCategory(project, category)" 
                        :key="task.id"
                        class="task-item"
                      >
                        <v-icon size="20" class="task-icon">mdi-checkbox-blank-circle-outline</v-icon>
                        <div class="task-content">
                          <div class="task-title">{{ task.title }}</div>
                          <div class="task-meta">
                            <span>{{ task.assignedTo }}</span>
                            <span>•</span>
                            <span>Due: {{ formatDate(task.dueDate) }}</span>
                          </div>
                        </div>
                        <v-chip 
                          :color="getStatusColor(task.status)" 
                          size="small"
                        >
                          {{ task.status }}
                        </v-chip>
                      </div>
                    </div>
                  </div>
                </div>

                <div v-else class="no-categories">
                  <v-icon size="48" color="grey-lighten-1">mdi-tag-outline</v-icon>
                  <p>No categories assigned</p>
                  <v-btn 
                    size="small" 
                    variant="text" 
                    prepend-icon="mdi-tag-plus"
                    @click="manageCategoriesForProject(project)"
                  >
                    Add Categories
                  </v-btn>
                </div>
              </div>

              <!-- Team Members Section -->
              <div class="details-section" v-if="project.members?.length">
                <h4>Team Members</h4>
                <div class="team-members">
                  <div 
                    v-for="(member, idx) in project.members" 
                    :key="idx" 
                    class="team-member"
                  >
                    <div 
                      class="avatar avatar-large"
                      :style="{ background: getAvatarColor(idx) }"
                    >
                      {{ getInitials(member) }}
                    </div>
                    <div class="member-info">
                      <div class="member-name">{{ typeof member === 'string' ? member : member.name }}</div>
                      <div class="member-role" v-if="member.role">{{ member.role }}</div>
                      <div class="member-tasks">{{ getMemberTaskCount(project, typeof member === 'string' ? member : member.name) }} tasks</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Empty State -->
          <div v-if="filteredProjects.length === 0" class="empty-state">
            <v-icon size="64" color="grey-lighten-1">mdi-folder-outline</v-icon>
            <h3>No projects found</h3>
            <p>Adjust your filters or create a new project</p>
          </div>
        </template>
      </div>

      <!-- CATEGORY VIEW -->
      <CategoriesDetail 
        v-if="currentView === 'categories'"
        :projects="filteredProjects"
        :all-categories="allCategories"
        @add-global-category="addGlobalCategory"
        @delete-category="deleteGlobalCategory"
      />

      <!-- WORKLOAD VIEW -->
      <div v-else-if="currentView === 'workload'" class="workload-view">
        <div class="workload-grid">
          <div 
            v-for="dept in departments" 
            :key="dept"
            class="department-card"
          >
            <div class="dept-header">
              <h3>{{ dept }}</h3>
              <v-chip size="small">
                {{ getProjectsByDepartment(dept).length }} projects
              </v-chip>
            </div>

            <div class="dept-stats">
              <div class="stat-row">
                <span class="stat-label">Total Tasks</span>
                <span class="stat-value">{{ getTotalTasksByDepartment(dept) }}</span>
              </div>
              <div class="stat-row">
                <span class="stat-label">Completed</span>
                <span class="stat-value">{{ getCompletedTasksByDepartment(dept) }}</span>
              </div>
              <div class="stat-row">
                <span class="stat-label">In Progress</span>
                <span class="stat-value">{{ getOngoingTasksByDepartment(dept) }}</span>
              </div>
              <div class="stat-row">
                <span class="stat-label">Team Members</span>
                <span class="stat-value">{{ getTeamMembersByDepartment(dept) }}</span>
              </div>
            </div>

            <div class="dept-progress">
              <div class="progress-label">
                <span>Overall Progress</span>
                <span>{{ getDepartmentProgress(dept) }}%</span>
              </div>
              <div class="progress-bar progress-bar-large">
                <div 
                  class="progress-fill" 
                  :style="{ width: getDepartmentProgress(dept) + '%' }"
                ></div>
              </div>
            </div>

            <v-btn 
              variant="outlined" 
              block
              @click="filterByDepartment(dept)"
              class="mt-2"
            >
              View Projects
            </v-btn>
          </div>
        </div>
      </div>
    </div>

    <!-- Create/Edit Project Dialog -->
    <v-dialog v-model="showCreateDialog" max-width="700px">
      <v-card class="project-dialog-card">
        <v-card-title class="d-flex justify-space-between align-center">
          <span>{{ isEditing ? 'Edit Project' : 'Create New Project' }}</span>
          <v-btn icon size="small" variant="text" @click="cancelCreate">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>

        <v-card-text class="pt-4">
          <v-text-field
            v-model="newProject.name"
            label="Project Name *"
            variant="outlined"
            density="comfortable"
            :rules="[v => !!v || 'Project name is required']"
          />

          <v-textarea
            v-model="newProject.description"
            label="Description"
            variant="outlined"
            density="comfortable"
            rows="3"
            class="mt-2"
          />

          <v-row class="mt-2">
            <v-col cols="6">
              <v-select
                v-model="newProject.status"
                label="Status *"
                :items="projectStatuses"
                variant="outlined"
                density="comfortable"
              />
            </v-col>

            <v-col cols="6">
              <v-select
                v-model="newProject.department"
                label="Department *"
                :items="departments"
                variant="outlined"
                density="comfortable"
              />
            </v-col>
          </v-row>

          <v-text-field
            v-model="newProject.dueDate"
            label="Due Date"
            type="date"
            variant="outlined"
            density="comfortable"
            class="mt-2"
          />

          <div class="mt-4">
            <div class="text-subtitle-2 mb-2">Categories</div>
            <div v-if="newProject.categories?.length" class="d-flex flex-wrap ga-2 mb-2">
              <v-chip 
                v-for="category in newProject.categories" 
                :key="category"
                closable
                @click:close="removeCategory(category)"
                :color="getCategoryColor(category)"
                size="small"
              >
                <v-icon start size="14">mdi-tag</v-icon>
                {{ category }}
              </v-chip>
            </div>
            <v-row dense>
              <v-col cols="9">
                <v-select
                  v-model="newCategoryInput"
                  :items="allCategories"
                  label="Add Category"
                  variant="outlined"
                  density="comfortable"
                  clearable
                />
              </v-col>
              <v-col cols="3">
                <v-btn 
                  color="primary" 
                  block
                  @click="addCategory"
                  :disabled="!newCategoryInput"
                  height="40"
                >
                  Add
                </v-btn>
              </v-col>
            </v-row>
          </div>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="cancelCreate">Cancel</v-btn>
          <v-btn color="primary" variant="flat" @click="saveProject">
            {{ isEditing ? 'Update' : 'Create' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>


    <!-- Add Category Dialog -->
    <v-dialog v-model="showAddCategoryDialog" max-width="400px">
      <v-card>
        <v-card-title class="dialog-header">
          <span class="dialog-title">Create New Category</span>
          <v-btn icon="mdi-close" variant="text" @click="showAddCategoryDialog = false" />
        </v-card-title>

        <v-card-text class="dialog-content">
          <v-text-field
            v-model="newGlobalCategory"
            label="Category Name"
            variant="outlined"
            placeholder="e.g., Feature, Bug, Enhancement"
          />
        </v-card-text>

        <v-card-actions class="dialog-actions">
          <v-spacer />
          <v-btn variant="outlined" @click="showAddCategoryDialog = false">Cancel</v-btn>
          <v-btn 
            color="primary" 
            @click="createGlobalCategory"
            :disabled="!newGlobalCategory"
          >
            Create
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar
      v-model="showSnackbar"
      :color="snackbarColor"
      timeout="3000"
    >
      {{ snackbarMessage }}
    </v-snackbar>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, onUnmounted, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { projectService } from '@/services/projectService'
import CategoriesDetail from '@/components/CategoryDetailsDialog.vue'
import axios from 'axios'
import ProjectTasks from '@/components/ProjectTasks.vue'

// Axios client configuration
const axiosClient = axios.create({
  baseURL: 'http://localhost:3000/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Axios interceptor to send the token
axiosClient.interceptors.request.use(config => {
  const token = localStorage.getItem('firebaseIdToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
}, error => {
  return Promise.reject(error)
})

// Auth store
const authStore = useAuthStore()

// State
const expandedProjects = ref([])
const currentView = ref('projects')
const showCreateDialog = ref(false)
const showManageCategoriesDialog = ref(false)
const showAddCategoryDialog = ref(false)
const showWorkloadDialog = ref(false)
const isEditing = ref(false)
const showSnackbar = ref(false)
const snackbarMessage = ref('')
const snackbarColor = ref('success')
// const selectedProjectForCategories = ref(null)
const newCategoryInput = ref('')
const newGlobalCategory = ref('')

// View tabs
const viewTabs = [
  { label: 'Projects', value: 'projects' },
  { label: 'Categories', value: 'categories' },
  { label: 'Workload', value: 'workload' }
]

// Filter states
const selectedStatuses = ref([])
const selectedDepartments = ref([])
const selectedCategories = ref([])
const tempSelectedStatuses = ref([])
const tempSelectedDepartments = ref([])
const tempSelectedCategories = ref([])
const searchStatus = ref('')
const searchDepartment = ref('')
const searchCategory = ref('')
const statusMenuOpen = ref(false)
const departmentMenuOpen = ref(false)
const categoryMenuOpen = ref(false)
const statusDropdownTop = ref(0)
const statusDropdownLeft = ref(0)
const departmentDropdownTop = ref(0)
const departmentDropdownLeft = ref(0)
const categoryDropdownTop = ref(0)
const categoryDropdownLeft = ref(0)
const statusBtnRef = ref(null)
const departmentBtnRef = ref(null)
const categoryBtnRef = ref(null)
const statusDropdownRef = ref(null)
const departmentDropdownRef = ref(null)
const categoryDropdownRef = ref(null)

// Constants
const projectStatuses = ['Ongoing', 'Pending Review', 'Completed', 'Unassigned']
const departments = ['Engineering', 'Marketing', 'Sales', 'HR', 'Finance', 'Operations']

const statusFilterOptions = projectStatuses.map(status => ({ 
  title: status, 
  value: status
}))

const departmentFilterOptions = departments.map(dept => ({ 
  title: dept, 
  value: dept 
}))

// New project form
const newProject = ref({
  name: '',
  description: '',
  status: 'Ongoing',
  department: 'Engineering',
  dueDate: '',
  categories: []
})

// Real Firebase data
const projects = ref([])
const loadingProjects = ref(true)
const globalCategories = ref([])

// Load projects from Firebase
const loadProjects = async () => {
  loadingProjects.value = true
  try {
    // Load projects from backend API
    const projectsResponse = await axiosClient.get('/projects')
    const fetchedProjects = projectsResponse.data
    
    // Load tasks for all projects
    const tasksResponse = await axiosClient.get('/tasks')
    const allTasks = tasksResponse.data
    
    // Attach tasks to each project
    projects.value = fetchedProjects.map(project => ({
      ...project,
      tasks: allTasks.filter(task => task.projectId === project.id && !task.archived)
    }))
    
    console.log('📦 Loaded projects:', projects.value)
  } catch (error) {
    console.error('Error loading projects:', error)
    showMessage('Failed to load projects: ' + error.message, 'error')
  } finally {
    loadingProjects.value = false
  }
}
// Load global categories
const loadCategories = async () => {
  try {
    const response = await axiosClient.get('/categories')
    globalCategories.value = response.data
    console.log('✅ Loaded categories:', response.data)
  } catch (error) {
    console.error('❌ Error loading categories:', error)
    // Don't show error to user - categories are optional
  }
}

// Load projects when component mounts
onMounted(async () => {
  await loadCategories()  // Load global categories first
  await loadProjects()     // Then load projects
})


// Computed
const allCategories = computed(() => {
  // Get categories from global collection
  const categories = new Set()
  
  // Add global categories
  globalCategories.value.forEach(cat => {
    categories.add(cat.name)
  })
  
  // Also add categories from projects (in case some aren't in global yet)
  projects.value.forEach(project => {
    if (project.categories) {
      project.categories.forEach(cat => categories.add(cat))
    }
  })
  
  return Array.from(categories).sort()
})

const categoryFilterOptions = computed(() => {
  return allCategories.value.map(cat => ({ title: cat, value: cat }))
})

const filteredCategoryOptions = computed(() => {
  return categoryFilterOptions.value.filter(opt => 
    opt.title.toLowerCase().includes(searchCategory.value.toLowerCase())
  )
})

const filteredStatusOptions = computed(() => {
  return statusFilterOptions.filter(opt => 
    opt.title.toLowerCase().includes(searchStatus.value.toLowerCase())
  )
})

const filteredDepartmentOptions = computed(() => {
  return departmentFilterOptions.filter(opt => 
    opt.title.toLowerCase().includes(searchDepartment.value.toLowerCase())
  )
})

const selectedFilters = computed(() => {
  return [
    ...selectedCategories.value.map(c => ({ 
      key: `category-${c}`, 
      label: c, 
      type: 'category', 
      value: c 
    })),
    ...selectedStatuses.value.map(s => ({ 
      key: `status-${s}`, 
      label: s, 
      type: 'status', 
      value: s 
    })),
    ...selectedDepartments.value.map(d => ({ 
      key: `department-${d}`, 
      label: d, 
      type: 'department', 
      value: d 
    }))
  ]
})

const filteredProjects = computed(() => {
  let filtered = projects.value

  if (selectedStatuses.value.length > 0) {
    filtered = filtered.filter(project => 
      selectedStatuses.value.includes(project.status)
    )
  }

  if (selectedDepartments.value.length > 0) {
    filtered = filtered.filter(project => 
      selectedDepartments.value.includes(project.department)
    )
  }

  if (selectedCategories.value.length > 0) {
    filtered = filtered.filter(project => 
      project.categories?.some(cat => selectedCategories.value.includes(cat))
    )
  }

  return filtered
})

// Methods
const toggleProject = (projectId) => {
  if (expandedProjects.value.includes(projectId)) {
    expandedProjects.value = expandedProjects.value.filter(id => id !== projectId)
  } else {
    expandedProjects.value.push(projectId)
  }
}

const getStatusColor = (status) => {
  const colors = {
    'Ongoing': 'blue',
    'Pending Review': 'orange',
    'Completed': 'green',
    'Unassigned': 'grey'
  }
  return colors[status] || 'grey'
}

const getCategoryColor = (category) => {
  const colors = {
    'Feature': 'blue',
    'Bug': 'red',
    'UI/UX': 'purple',
    'Performance': 'orange',
    'Testing': 'cyan',
    'Content': 'pink',
    'Social Media': 'indigo',
    'Analytics': 'teal',
    'Security': 'deep-orange',
    'Training': 'amber',
    'Documentation': 'lime',
    'Migration': 'deep-purple'
  }
  return colors[category] || 'grey'
}

const getAvatarColor = (index) => {
  const colors = [
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
  ]
  return colors[index % colors.length]
}
const getInitials = (member) => {
  if (!member) return '?'
  
  // If member is just an email string
  if (typeof member === 'string') {
    const name = member.split('@')[0] // Get part before @
    const parts = name.split('.')
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
  }
  
  // If member has initials property
  if (member.initials) {
    return member.initials
  }
  
  // If member has name property
  if (member.name) {
    const nameParts = member.name.split(' ')
    if (nameParts.length >= 2) {
      return (nameParts[0][0] + nameParts[1][0]).toUpperCase()
    }
    return member.name.substring(0, 2).toUpperCase()
  }
  
  return '?'
}

const formatDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const getTasksByCategory = (project, category) => {
  if (!project.tasks) return []
  return project.tasks.filter(task => task.categories?.includes(category))
}

const getMemberTaskCount = (project, memberName) => {
  if (!project.tasks) return 0
  return project.tasks.filter(task => task.assignedTo === memberName).length
}

const getProjectsByCategory = (category) => {
  return projects.value.filter(project => project.categories?.includes(category))
}

const getTasksCountByCategory = (category) => {
  let count = 0
  projects.value.forEach(project => {
    if (project.categories?.includes(category) && project.tasks) {
      count += project.tasks.filter(task => task.categories?.includes(category)).length
    }
  })
  return count
}

const getCompletionRateByCategory = (category) => {
  let total = 0
  let completed = 0
  projects.value.forEach(project => {
    if (project.categories?.includes(category) && project.tasks) {
      const categoryTasks = project.tasks.filter(task => task.categories?.includes(category))
      total += categoryTasks.length
      completed += categoryTasks.filter(task => task.status === 'Completed').length
    }
  })
  return total > 0 ? Math.round((completed / total) * 100) : 0
}

const getProjectsByDepartment = (department) => {
  return projects.value.filter(project => project.department === department)
}

const getTotalTasksByDepartment = (department) => {
  return getProjectsByDepartment(department).reduce((sum, project) => sum + project.totalTasks, 0)
}

const getCompletedTasksByDepartment = (department) => {
  return getProjectsByDepartment(department).reduce((sum, project) => sum + project.completedTasks, 0)
}

const getOngoingTasksByDepartment = (department) => {
  let count = 0
  getProjectsByDepartment(department).forEach(project => {
    if (project.tasks) {
      count += project.tasks.filter(task => task.status === 'Ongoing').length
    }
  })
  return count
}

const getTeamMembersByDepartment = (department) => {
  const members = new Set()
  getProjectsByDepartment(department).forEach(project => {
    project.members.forEach(member => members.add(member.name))
  })
  return members.size
}

const getDepartmentProgress = (department) => {
  const deptProjects = getProjectsByDepartment(department)
  if (deptProjects.length === 0) return 0
  const totalProgress = deptProjects.reduce((sum, project) => sum + project.progress, 0)
  return Math.round(totalProgress / deptProjects.length)
}

const filterByCategory = (category) => {
  currentView.value = 'projects'
  selectedCategories.value = [category]
}

const filterByDepartment = (department) => {
  currentView.value = 'projects'
  selectedDepartments.value = [department]
}

const scrollToProject = (projectId) => {
  currentView.value = 'projects'
  nextTick(() => {
    expandedProjects.value = [projectId]
  })
}

const editProject = (project) => {
  newProject.value = { ...project }
  isEditing.value = true
  showCreateDialog.value = true
}
const manageCategoriesForProject = (project) => {
  // This would open a dialog to manage categories for a specific project
  // For now, you can edit the project to change categories
  editProject(project)
}

const addGlobalCategory = async (category) => {
  try {
    // CategoriesDetail already created the category
    // Just reload categories and projects
    await loadCategories()
    await loadProjects()
    showMessage(`Category "${category.name}" added successfully`, 'success')
  } catch (error) {
    console.error('Error handling category addition:', error)
    showMessage('Failed to refresh', 'error')
  }
}

const deleteGlobalCategory = async (categoryName) => {
  try {
    // CategoriesDetail already deleted the category
    // Just reload categories and projects
    await loadCategories()
    await loadProjects()
    showMessage(`Category "${categoryName}" removed successfully`, 'success')
  } catch (error) {
    console.error('Error handling category deletion:', error)
    showMessage('Failed to refresh', 'error')
  }
}

const saveProject = async () => {
  if (!newProject.value.name) {
    showMessage('Please enter a project name', 'error')
    return
  }

  try {
    if (isEditing.value) {
      // Update existing project
      await axiosClient.put(`/projects/${newProject.value.id}`, newProject.value)
      showMessage('Project updated successfully', 'success')
    } else {
      // Create new project
      await axiosClient.post('/projects', newProject.value)
      showMessage('Project created successfully', 'success')
    }

    // Reload projects from Firebase
    await loadProjects()
    showCreateDialog.value = false
    resetForm()
  } catch (error) {
    console.error('Error saving project:', error)
    showMessage('Failed to save project: ' + error.message, 'error')
  }
}

const cancelCreate = () => {
  showCreateDialog.value = false
  resetForm()
}

const resetForm = () => {
  newProject.value = {
    name: '',
    description: '',
    status: 'Ongoing',
    department: 'Engineering',
    dueDate: '',
    categories: []
  }
  isEditing.value = false
  newCategoryInput.value = ''
}
const addCategory = () => {
  if (newCategoryInput.value && !newProject.value.categories.includes(newCategoryInput.value)) {
    newProject.value.categories.push(newCategoryInput.value)
    newCategoryInput.value = ''
  }
}

const removeCategory = (category) => {
  newProject.value.categories = newProject.value.categories.filter(c => c !== category)
}


const showMessage = (message, color = 'success') => {
  snackbarMessage.value = message
  snackbarColor.value = color
  showSnackbar.value = true
}

// Category Filter Methods
const toggleCategoryMenu = () => {
  if (categoryMenuOpen.value) {
    closeCategoryMenu()
  } else {
    closeStatusMenu()
    closeDepartmentMenu()
    openCategoryMenu()
  }
}

const openCategoryMenu = () => {
  tempSelectedCategories.value = [...selectedCategories.value]
  searchCategory.value = ''

  nextTick(() => {
    if (categoryBtnRef.value) {
      const rect = categoryBtnRef.value.$el.getBoundingClientRect()
      categoryDropdownTop.value = rect.bottom + 4
      categoryDropdownLeft.value = rect.left
    }
  })

  categoryMenuOpen.value = true

  nextTick(() => {
    document.addEventListener('click', handleCategoryClickOutside)
  })
}

const closeCategoryMenu = () => {
  categoryMenuOpen.value = false
  document.removeEventListener('click', handleCategoryClickOutside)
}

const handleCategoryClickOutside = (event) => {
  if (categoryDropdownRef.value && !categoryDropdownRef.value.contains(event.target)) {
    closeCategoryMenu()
  }
}

const applyCategoryFilter = () => {
  selectedCategories.value = [...tempSelectedCategories.value]
  closeCategoryMenu()
}

const toggleCategory = (value) => {
  if (tempSelectedCategories.value.includes(value)) {
    tempSelectedCategories.value = tempSelectedCategories.value.filter(v => v !== value)
  } else {
    tempSelectedCategories.value.push(value)
  }
}

// Status Filter Methods
const toggleStatusMenu = () => {
  if (statusMenuOpen.value) {
    closeStatusMenu()
  } else {
    closeCategoryMenu()
    closeDepartmentMenu()
    openStatusMenu()
  }
}

const openStatusMenu = () => {
  tempSelectedStatuses.value = [...selectedStatuses.value]
  searchStatus.value = ''

  nextTick(() => {
    if (statusBtnRef.value) {
      const rect = statusBtnRef.value.$el.getBoundingClientRect()
      statusDropdownTop.value = rect.bottom + 4
      statusDropdownLeft.value = rect.left
    }
  })

  statusMenuOpen.value = true

  nextTick(() => {
    document.addEventListener('click', handleStatusClickOutside)
  })
}

const closeStatusMenu = () => {
  statusMenuOpen.value = false
  document.removeEventListener('click', handleStatusClickOutside)
}

const handleStatusClickOutside = (event) => {
  if (statusDropdownRef.value && !statusDropdownRef.value.contains(event.target)) {
    closeStatusMenu()
  }
}

const applyStatusFilter = () => {
  selectedStatuses.value = [...tempSelectedStatuses.value]
  closeStatusMenu()
}

const toggleStatus = (value) => {
  if (tempSelectedStatuses.value.includes(value)) {
    tempSelectedStatuses.value = tempSelectedStatuses.value.filter(v => v !== value)
  } else {
    tempSelectedStatuses.value.push(value)
  }
}

// Department Filter Methods
const toggleDepartmentMenu = () => {
  if (departmentMenuOpen.value) {
    closeDepartmentMenu()
  } else {
    closeCategoryMenu()
    closeStatusMenu()
    openDepartmentMenu()
  }
}

const openDepartmentMenu = () => {
  tempSelectedDepartments.value = [...selectedDepartments.value]
  searchDepartment.value = ''

  nextTick(() => {
    if (departmentBtnRef.value) {
      const rect = departmentBtnRef.value.$el.getBoundingClientRect()
      departmentDropdownTop.value = rect.bottom + 4
      departmentDropdownLeft.value = rect.left
    }
  })

  departmentMenuOpen.value = true

  nextTick(() => {
    document.addEventListener('click', handleDepartmentClickOutside)
  })
}

const closeDepartmentMenu = () => {
  departmentMenuOpen.value = false
  document.removeEventListener('click', handleDepartmentClickOutside)
}

const handleDepartmentClickOutside = (event) => {
  if (departmentDropdownRef.value && !departmentDropdownRef.value.contains(event.target)) {
    closeDepartmentMenu()
  }
}

const applyDepartmentFilter = () => {
  selectedDepartments.value = [...tempSelectedDepartments.value]
  closeDepartmentMenu()
}

const toggleDepartment = (value) => {
  if (tempSelectedDepartments.value.includes(value)) {
    tempSelectedDepartments.value = tempSelectedDepartments.value.filter(v => v !== value)
  } else {
    tempSelectedDepartments.value.push(value)
  }
}

// Filter Management
const removeFilter = (filter) => {
  if (filter.type === 'category') {
    selectedCategories.value = selectedCategories.value.filter(c => c !== filter.value)
  } else if (filter.type === 'status') {
    selectedStatuses.value = selectedStatuses.value.filter(s => s !== filter.value)
  } else if (filter.type === 'department') {
    selectedDepartments.value = selectedDepartments.value.filter(d => d !== filter.value)
  }
}

const resetFilters = () => {
  selectedStatuses.value = []
  selectedDepartments.value = []
  selectedCategories.value = []
}

const viewTask = (task) => {
  console.log('📋 Viewing task:', task)
}

const refreshProject = async (projectId) => {
  try {
    const response = await axiosClient.get(`/projects/${projectId}`);
    const updatedProject = response.data;
    
    // Find and update the project in the list
    const index = projects.value.findIndex(p => p.id === projectId);
    if (index !== -1) {
      projects.value[index] = {
        ...projects.value[index],
        totalTasks: updatedProject.totalTasks,
        completedTasks: updatedProject.completedTasks,
        progress: updatedProject.progress
      };
    }
    
    // If this is the selected project, update it too
    // Update the project in the projects array
    const projectIndex = projects.value.findIndex(p => p.id === projectId)
      if (projectIndex !== -1) {
        projects.value[projectIndex] = {
          ...projects.value[projectIndex],
          totalTasks: updatedProject.totalTasks,
          completedTasks: updatedProject.completedTasks,
          progress: updatedProject.progress
        }
      }
  } catch (error) {
    console.error('Error refreshing project:', error);
  }
};


const projectTasks = ref([])

const loadProjectTasks = async (projectId) => {
  try {
    const response = await axiosClient.get('/tasks')
    projectTasks.value = response.data.filter(t => 
      t.projectId === projectId && !t.archived
    )
  } catch (error) {
    console.error('Error loading project tasks:', error)
  }
}

// Fix the watchers - this should be at the bottom of your script
watch(() => props.show, (newValue) => {
  console.log('👀 ProjectTasks show prop changed:', newValue, 'for project:', props.projectId)
  if (newValue && props.projectId) {
    loadTasks()
  }
}, { immediate: true })

watch(() => props.projectId, (newValue, oldValue) => {
  console.log('🔄 ProjectTasks projectId changed from', oldValue, 'to', newValue)
  if (newValue && props.show) {
    loadTasks()
  }
})

// Remove any onMounted hook - the watcher handles it
</script>


<style scoped>
/* ===========================
   Base Container
   =========================== */
.projects-container {
  width: 100%;
  min-height: 100vh;
  background: transparent;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
}

.projects-page {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

/* ===========================
   Page Header
   =========================== */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px 12px 24px;
  background: transparent;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}

[data-theme="dark"] .page-header {
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.header-left h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: var(--text-primary);
}

.subtitle {
  margin: 4px 0 0 0;
  color: #7f8c8d;
  font-size: 14px;
}

.header-right {
  display: flex;
  gap: 12px;
  flex-shrink: 0;
}

.workload-btn {
  background: transparent !important;
  border: 1px solid rgba(0, 0, 0, 0.2) !important;
  color: var(--text-primary) !important;
}

.workload-btn:hover {
  background: rgba(0, 0, 0, 0.05) !important;
}

[data-theme="dark"] .workload-btn {
  border: 1px solid rgba(255, 255, 255, 0.2) !important;
}

[data-theme="dark"] .workload-btn:hover {
  background: rgba(255, 255, 255, 0.05) !important;
}

/* ===========================
   View Controls & Filters
   =========================== */
.view-controls {
  padding: 10px 24px;
  background: transparent;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}

[data-theme="dark"] .view-controls {
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.controls-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.view-toggle-left {
  border-bottom: none;
}

.view-tabs {
  display: flex;
  gap: 32px;
  padding: 0;
  margin: 0;
  border: none;
  background: transparent;
}

.view-tab {
  all: unset;
  padding: 14px 0;
  font-size: 14px;
  font-weight: 500;
  color: #8b95a0;
  cursor: pointer;
  position: relative;
  box-sizing: border-box;
  border-bottom: 3px solid transparent;
}

.view-tab:hover {
  color: #4a5568;
}

.view-tab.active {
  color: #1a202c;
  border-bottom-color: #6b9b6b;
}

[data-theme="dark"] .view-tab.active {
  color: #f7fafc;
  border-bottom-color: #5a7a9b;
}

.filters-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-label {
  font-size: 12px;
  font-weight: 600;
  color: #7f8c8d;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-right: 8px;
}

.filter-btn {
  min-width: 120px;
  background: #e8f5e8 !important;
  color: #4a7c4a !important;
  border: 1px solid #6b9b6b !important;
}

.filter-btn:hover {
  background: #d4ead4 !important;
  border-color: #5a8a5a !important;
}

[data-theme="dark"] .filter-btn {
  background: rgba(90, 122, 155, 0.2) !important;
  color: #7b92d1 !important;
  border: 1px solid #5a7a9b !important;
}

[data-theme="dark"] .filter-btn:hover {
  background: rgba(90, 122, 155, 0.3) !important;
  border-color: #7b92d1 !important;
}

.reset-btn {
  color: #666;
}

/* Filter Chips */
.filter-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 8px 24px;
  background: transparent;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}

[data-theme="dark"] .filter-chips {
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.filter-chip {
  background: rgba(0, 0, 0, 0.05);
  color: var(--text-primary);
}

[data-theme="dark"] .filter-chip {
  background: rgba(255, 255, 255, 0.1);
}

/* Custom Filter Dropdowns */
.custom-filter-dropdown {
  position: fixed;
  z-index: 1000;
  min-width: 250px;
  background: var(--bg-primary);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border: 1px solid rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

[data-theme="dark"] .custom-filter-dropdown {
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.dropdown-body {
  padding: 8px 0;
}

.search-input {
  width: 100%;
  padding: 8px 16px;
  border: none;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  outline: none;
  font-size: 14px;
  box-sizing: border-box;
  background: transparent;
  color: var(--text-primary);
}

[data-theme="dark"] .search-input {
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.filter-options-list {
  max-height: 200px;
  overflow-y: auto;
}

.filter-option-item {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  cursor: pointer;
  transition: background-color 0.2s;
  user-select: none;
}

.filter-option-item:hover {
  background-color: rgba(0, 0, 0, 0.04);
}

[data-theme="dark"] .filter-option-item:hover {
  background-color: rgba(255, 255, 255, 0.05);
}

.custom-checkbox {
  width: 16px;
  height: 16px;
  margin-right: 8px;
  cursor: pointer;
  accent-color: #1976d2;
}

.option-text {
  flex: 1;
  font-size: 14px;
  color: var(--text-primary);
}

.dropdown-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 20px 16px 20px;
  border-top: 1px solid rgba(0, 0, 0, 0.08);
}

[data-theme="dark"] .dropdown-footer {
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

/* ===========================
   Projects List
   =========================== */
.projects-list {
  flex: 1;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow-y: auto;
}

/* ===========================
   Project Card
   =========================== */
.project-card {
  background: var(--bg-primary);
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.2s;
}

[data-theme="dark"] .project-card {
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.project-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

[data-theme="dark"] .project-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

/* Project Header */
.project-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  cursor: pointer;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

[data-theme="dark"] .project-header {
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.project-header:hover {
  background: rgba(0, 0, 0, 0.02);
}

[data-theme="dark"] .project-header:hover {
  background: rgba(255, 255, 255, 0.02);
}

.project-header-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.expand-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: #6b7280;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  transition: all 0.2s;
  border-radius: 4px;
}

[data-theme="dark"] .expand-btn {
  color: rgba(255, 255, 255, 0.6);
}

.expand-btn:hover {
  background: rgba(0, 0, 0, 0.05);
}

[data-theme="dark"] .expand-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.project-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.status-chip,
.department-chip {
  text-transform: capitalize;
  font-weight: 500;
}

.department-chip {
  background: rgba(0, 0, 0, 0.05) !important;
  color: var(--text-primary) !important;
}

[data-theme="dark"] .department-chip {
  background: rgba(255, 255, 255, 0.1) !important;
}

.project-header-right {
  display: flex;
  gap: 4px;
}

/* Project Summary */
.project-summary {
  padding: 16px 20px 16px 56px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

[data-theme="dark"] .project-summary {
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.project-description {
  font-size: 14px;
  color: #6b7280;
  margin: 0 0 12px 0;
  line-height: 1.5;
}

[data-theme="dark"] .project-description {
  color: rgba(255, 255, 255, 0.7);
}

.project-categories {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.category-chip {
  font-weight: 500;
  text-transform: capitalize;
}

.project-meta {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #6b7280;
}

[data-theme="dark"] .meta-item {
  color: rgba(255, 255, 255, 0.6);
}

.meta-icon {
  color: #9ca3af;
}

.progress-container {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}

.progress-bar {
  width: 120px;
  height: 6px;
  background: rgba(0, 0, 0, 0.08);
  border-radius: 3px;
  overflow: hidden;
}

[data-theme="dark"] .progress-bar {
  background: rgba(255, 255, 255, 0.1);
}

.progress-fill {
  height: 100%;
  background: #6b9b6b;
  border-radius: 3px;
  transition: width 0.3s;
}

[data-theme="dark"] .progress-fill {
  background: #5a7a9b;
}

.progress-text {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  min-width: 38px;
}

.avatars {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  color: white;
  font-size: 11px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid var(--bg-primary);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.avatar-large {
  width: 40px;
  height: 40px;
  font-size: 13px;
}

.avatar-more {
  background: rgba(0, 0, 0, 0.08) !important;
  color: var(--text-primary) !important;
}

[data-theme="dark"] .avatar-more {
  background: rgba(255, 255, 255, 0.1) !important;
}

/* ===========================
   Project Details (Expanded)
   =========================== */
.project-details {
  padding: 20px 20px 20px 56px;
  background: rgba(0, 0, 0, 0.02);
  display: flex;
  flex-direction: column;
  gap: 24px;
}

[data-theme="dark"] .project-details {
  background: rgba(255, 255, 255, 0.02);
}

.details-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.details-section h4 {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* Categories Section */
.categories-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.category-group {
  background: var(--bg-primary);
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 8px;
  padding: 12px;
}

[data-theme="dark"] .category-group {
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.category-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.task-count {
  font-size: 12px;
  color: #6b7280;
  font-weight: 500;
}

.category-tasks {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.no-categories {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
  color: #9ca3af;
}

.no-categories p {
  margin: 8px 0 12px 0;
  font-size: 14px;
}

/* Team Members */
.team-members {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.team-member {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.03);
  border-radius: 8px;
}

[data-theme="dark"] .team-member {
  background: rgba(255, 255, 255, 0.03);
}

.member-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.member-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
}

.member-role {
  font-size: 12px;
  color: #6b7280;
}

[data-theme="dark"] .member-role {
  color: rgba(255, 255, 255, 0.6);
}

.member-tasks {
  font-size: 11px;
  color: #9ca3af;
}

/* Tasks */
.task-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: var(--bg-primary);
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 8px;
  transition: all 0.2s;
}

[data-theme="dark"] .task-item {
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.task-item:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.task-icon {
  color: #9ca3af;
  flex-shrink: 0;
}

.task-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.task-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.task-meta {
  display: flex;
  gap: 8px;
  font-size: 12px;
  color: #9ca3af;
  align-items: center;
}

[data-theme="dark"] .task-meta {
  color: rgba(255, 255, 255, 0.5);
}

/* ===========================
   Categories View
   =========================== */
.categories-view {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
}

.category-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.category-card {
  background: var(--bg-primary);
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 12px;
  padding: 20px;
  transition: all 0.2s;
}

[data-theme="dark"] .category-card {
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.category-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}

.category-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.category-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
}

.stat-label {
  font-size: 12px;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.category-projects h5 {
  margin: 0 0 8px 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.project-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.project-tag {
  cursor: pointer;
}

.project-tag:hover {
  opacity: 0.8;
}

.project-tag-more {
  background: rgba(0, 0, 0, 0.05) !important;
  color: var(--text-primary) !important;
}

[data-theme="dark"] .project-tag-more {
  background: rgba(255, 255, 255, 0.1) !important;
}

.add-category-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border: 2px dashed rgba(0, 0, 0, 0.2);
  background: transparent;
}

[data-theme="dark"] .add-category-card {
  border: 2px dashed rgba(255, 255, 255, 0.2);
}

.add-category-card:hover {
  border-color: var(--primary);
  background: rgba(0, 0, 0, 0.02);
}

[data-theme="dark"] .add-category-card:hover {
  background: rgba(255, 255, 255, 0.02);
}

.add-category-card p {
  margin: 8px 0 0 0;
  font-size: 14px;
  color: #6b7280;
}

/* ===========================
   Workload View
   =========================== */
.workload-view {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
}

.workload-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
}

.department-card {
  background: var(--bg-primary);
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 12px;
  padding: 24px;
  transition: all 0.2s;
}

[data-theme="dark"] .department-card {
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.department-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.dept-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}

[data-theme="dark"] .dept-header {
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.dept-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.dept-stats {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
}

.stat-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stat-row .stat-label {
  font-size: 14px;
  color: #6b7280;
}

.stat-row .stat-value {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.dept-progress {
  margin-bottom: 16px;
}

.progress-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 13px;
  color: #6b7280;
}

.progress-bar-large {
  width: 100%;
  height: 8px;
}

/* ===========================
   Empty State
   =========================== */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
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
  color: #7f8c8d;
  font-size: 14px;
}

/* ===========================
   Dialog Styles
   =========================== */
:deep(.v-dialog .v-card) {
  background: white !important;
}

[data-theme="dark"] :deep(.v-dialog .v-card) {
  background: #1e1e1e !important;
}

.create-project-card {
  background: white !important;
}

[data-theme="dark"] .create-project-card {
  background: #1e1e1e !important;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}

[data-theme="dark"] .dialog-header {
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.dialog-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
}

.dialog-content {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.categories-input {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.input-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.selected-categories {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  min-height: 32px;
  padding: 8px;
  background: rgba(0, 0, 0, 0.02);
  border-radius: 6px;
}

[data-theme="dark"] .selected-categories {
  background: rgba(255, 255, 255, 0.02);
}

.empty-text {
  font-size: 13px;
  color: #9ca3af;
}

.category-input-row {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}

.category-input-row .v-combobox {
  flex: 1;
}

.dialog-actions {
  padding: 16px 24px;
  border-top: 1px solid rgba(0, 0, 0, 0.08);
}

[data-theme="dark"] .dialog-actions {
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

/* ===========================
   Dark Mode
   =========================== */
[data-theme="dark"] .create-project-card {
  background: var(--bg-primary) !important;
  color: var(--text-primary) !important;
}

:deep(.v-field) {
  background: white !important;
}

:deep(.v-select .v-field) {
  background: white !important;
}

:deep(.v-text-field .v-field) {
  background: white !important;
}

[data-theme="dark"] :deep(.v-field input),
[data-theme="dark"] :deep(.v-field textarea) {
  color: var(--text-primary) !important;
}

[data-theme="dark"] :deep(.v-field__outline) {
  border-color: rgba(255, 255, 255, 0.1) !important;
}

/* ===========================
   Responsive
   =========================== */
@media (max-width: 768px) {
  .projects-list,
  .categories-view,
  .workload-view {
    padding: 16px;
  }

  .project-summary {
    padding-left: 20px;
  }

  .project-details {
    padding-left: 20px;
  }

  .team-members {
    flex-direction: column;
  }

  .project-meta {
    flex-wrap: wrap;
  }

  .form-row {
    grid-template-columns: 1fr;
  }

  .category-cards {
    grid-template-columns: 1fr;
  }

  .workload-grid {
    grid-template-columns: 1fr;
  }

  .controls-row {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }

  .view-toggle-left,
  .filters-right {
    width: 100%;
  }

  .filters-right {
    justify-content: flex-start;
    flex-wrap: wrap;
  }
}
/* Loading State */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  gap: 16px;
}

.loading-state p {
  font-size: 14px;
  color: #6b7280;
  margin: 0;
}

/* Dialog Background Fix */
.project-dialog-card {
  background: white !important;
}

[data-theme="dark"] .project-dialog-card {
  background: #2c2c2c !important;
}

:deep(.project-dialog-card) {
  background: white !important;
}

[data-theme="dark"] :deep(.project-dialog-card) {
  background: #2c2c2c !important;
}

:deep(.v-card.project-dialog-card) {
  background: white !important;
}

[data-theme="dark"] :deep(.v-card.project-dialog-card) {
  background: #2c2c2c !important;
}
</style>