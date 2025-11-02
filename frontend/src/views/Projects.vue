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
          <v-btn
            color="primary"
            prepend-icon="mdi-plus"
            @click="showAddDepartmentDialog = true"
            rounded="lg"
            v-if="authStore.userRole === 'director' || authStore.userRole === 'hr'">
            New Department
          </v-btn>
        </div>
      </header>

      <!-- Filters -->
      <div class="view-controls">
        <div class="controls-row">
          <div class="view-toggle-left">
            <div class="view-tabs">
              <button 
                v-for="tab in visibleViewTabs" 
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
          <div class="project-categories" v-if="getProjectTaskCategories(project).length">
            <v-chip 
              v-for="category in getProjectTaskCategories(project)" 
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
            </div>

            <!-- Expanded Details -->
            <div v-if="expandedProjects.includes(project.id)" class="project-details">
              <ProjectTasks
                  :key="`project-tasks-${project.id}`"
                  :project-id="project.id"
                  :show="true"
                  @view-task="viewTask"
                  @task-updated="refreshProject"
              />
              <!-- Team Members Section -->
              <div class="details-section" v-if="getProjectTeamMembers(project).length > 0">
                <h4>Team Members</h4>
                <div class="team-members">
                  <div 
                    v-for="(member, idx) in getProjectTeamMembers(project)" 
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
                      <div class="member-name">{{ member.name }}</div>
                      <div class="member-email" v-if="member.name !== member.email">{{ member.email }}</div>
                      <div class="member-role" v-if="member.role">{{ member.role }}</div>
                      <div class="member-tasks">{{ getMemberTaskCountForEmail(project, member.email) }} tasks</div>
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
        <div v-if="visibleDepartments.length === 0" class="empty-state">
          <v-icon size="64" color="grey-lighten-1">mdi-office-building-outline</v-icon>
          <h3 v-if="authStore.userRole === 'staff'">Access Restricted</h3>
          <h3 v-else>No Departments Found</h3>
          <p v-if="authStore.userRole === 'staff'">Staff members cannot view department workload</p>
          <p v-else>No departments are available to display</p>
        </div>
        <div v-else class="workload-grid">
          <div 
            v-for="dept in visibleDepartments" 
            :key="dept"
            class="department-card"
          >
            <div class="dept-header">
              <div>
                <h3>{{ capitalizeDepartment(dept) }}</h3>
                <v-chip size="small">
                  {{ getProjectsByDepartment(dept).length }} projects
                </v-chip>
              </div>
              <v-btn 
                v-if="authStore.userRole === 'director' || authStore.userRole === 'hr'"
                icon="mdi-pencil" 
                size="small" 
                variant="text"
                @click.stop="editDepartment(dept)"
              />
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
                :items="realDepartments"
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

          <v-autocomplete
            v-model="newProject.owners"
            label="Owners"
            :items="availableUsersForOwners"
            item-title="name"
            item-value="email"
            multiple
            chips
            variant="outlined"
            density="comfortable"
            class="mt-2"
            prepend-inner-icon="mdi-account-multiple"
            :disabled="!canEditOwners"
            :readonly="!canEditOwners"
            :hint="!canEditOwners && isEditing ? 'Only the project creator can edit owners' : ''"
            persistent-hint
            :no-data-text="availableUsersForOwners.length === 0 ? (allUsers.length === 0 ? 'Loading users...' : 'No users available') : 'Type to search users'"
          >
            <template v-slot:item="{ props: itemProps, item }">
              <v-list-item 
                :value="itemProps.value"
                :key="item.raw?.email || item.email"
                @click="itemProps.onClick"
              >
                <template v-slot:prepend>
                  <v-avatar size="32">
                    {{ getInitials(item.raw?.name || item.name) }}
                  </v-avatar>
                </template>
                <template v-slot:title>
                  <span>{{ item.raw?.name || item.name }}</span>
                </template>
                <template v-slot:subtitle>
                  <span>{{ item.raw?.email || item.email }}</span>
                </template>
                <template v-slot:append>
                  <v-chip size="small" color="primary" variant="flat">
                    {{ capitalizeDepartment(item.raw?.department || item.department) }}
                  </v-chip>
                </template>
              </v-list-item>
            </template>
          </v-autocomplete>
          
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

    <!-- Add/Edit Department Dialog -->
    <v-dialog 
      v-model="showAddDepartmentDialog" 
      max-width="600px"
      persistent
      class="department-dialog"
    >
      <v-card class="department-dialog-card">
        <v-card-title class="d-flex justify-space-between align-center">
          <span>{{ isEditingDepartment ? 'Edit Department' : 'Add New Department' }}</span>
          <v-btn icon size="small" variant="text" @click="cancelDepartmentEdit">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        <v-card-text>
          <v-text-field 
            v-model="newDepartmentTitle" 
            label="Department Title" 
            :rules="[v => !!v || 'Department title is required']"
            variant="outlined"
            class="mb-4"
          />
          <v-autocomplete 
            v-model="newDepartmentMembers" 
            :items="uniqueUsers" 
            item-title="name" 
            item-value="email" 
            label="Add Members" 
            multiple 
            chips
            variant="outlined"
            prepend-inner-icon="mdi-account-multiple"
          >
            <template v-slot:item="{ props: itemProps, item }">
              <v-list-item 
                :value="itemProps.value"
                :key="item.raw.email"
                @click="itemProps.onClick"
              >
                <template v-slot:prepend>
                  <v-avatar size="32">
                    {{ getInitials(item.raw.name) }}
                  </v-avatar>
                </template>
                <v-list-item-title>{{ item.raw.name }}</v-list-item-title>
                <v-list-item-subtitle>{{ item.raw.email }}</v-list-item-subtitle>
                <template v-slot:append>
                  <v-chip size="small" color="primary" variant="flat">
                    {{ capitalizeDepartment(item.raw.department) }}
                  </v-chip>
                </template>
              </v-list-item>
            </template>
            <template v-slot:chip="{ props, item }">
              <v-chip v-bind="props" :text="item.raw.name"></v-chip>
            </template>
          </v-autocomplete>
        </v-card-text>
        <v-card-actions>
          <v-spacer/>
          <v-btn @click="cancelDepartmentEdit">Cancel</v-btn>
          <v-btn 
            color="primary" 
            :loading="departmentWriteLoading" 
            :disabled="!newDepartmentTitle || newDepartmentMembers.length == 0" 
            @click="createDepartment"
          >
            {{ isEditingDepartment ? 'Update' : 'Create' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, onUnmounted, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import CategoriesDetail from '@/components/CategoryDetailsDialog.vue'
import axios from 'axios'
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
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

// Computed: Check if current user can edit owners field
// Only the original creator (createdBy) can edit owners
const canEditOwners = computed(() => {
  if (!isEditing.value || !newProject.value.createdBy) {
    // When creating, user can always edit owners (will be set to creator)
    return true;
  }
  // When editing, only the creator can edit owners
  return newProject.value.createdBy === authStore.userEmail;
})

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

// State for Add/Edit Department Modal
const showAddDepartmentDialog = ref(false);
const isEditingDepartment = ref(false);
const editingDepartmentId = ref(null);
const newDepartmentTitle = ref('');
const newDepartmentMembers = ref([]);
const departmentWriteLoading = ref(false);
const allUsers = ref([]);
const allDepartments = ref([]);

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

const statusFilterOptions = projectStatuses.map(status => ({ 
  title: status, 
  value: status
}))

// New project form
const newProject = ref({
  name: '',
  description: '',
  status: 'Ongoing',
  department: 'Engineering',
  dueDate: '',
  owners: []
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

// Load departments from Firebase
async function loadDepartments() {
  try {
    const deptSnapshot = await getDocs(collection(db, 'departments'));
    allDepartments.value = deptSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error loading departments:', error);
    allDepartments.value = [];
  }
}

// Load projects when component mounts
onMounted(async () => {
  await loadCategories()  // Load global categories first
  await loadProjects()     // Then load projects
  await fetchAllUsers();
  await loadDepartments();
  
  // Redirect staff away from workload view
  if (authStore.userRole === 'staff' && currentView.value === 'workload') {
    currentView.value = 'projects';
  }
})

// Watch for role changes and redirect staff from workload view
watch(() => authStore.userRole, (newRole) => {
  if (newRole === 'staff' && currentView.value === 'workload') {
    currentView.value = 'projects';
  }
})


// Computed
const allCategories = computed(() => {
  // Only use global categories. Projects no longer carry categories.
  return globalCategories.value.map(cat => cat.name).sort()
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

// Compute actual department list (from projects)
const realDepartments = computed(() => {
  const depts = Array.from(new Set(projects.value.filter(p => p.department).map(p => p.department)));
  // Filter out "All" department - it's a special department for director only
  return depts.filter(dept => dept.toLowerCase() !== 'all').sort();
});

// Options for department filter dropdown
const departmentFilterOptions = computed(() => {
  return realDepartments.value.map(dep => ({ title: dep, value: dep }))
});

const filteredDepartmentOptions = computed(() => {
  return (departmentFilterOptions.value || []).filter(opt => 
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
    filtered = filtered.filter(project => {
      const taskCats = new Set()
      ;(project.tasks || []).forEach(t => (t.categories || []).forEach(c => taskCats.add(c)))
      return selectedCategories.value.some(c => taskCats.has(c))
    })
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

// Get unique categories present in a project's tasks
const getProjectTaskCategories = (project) => {
  const set = new Set()
  if (project && project.tasks) {
    project.tasks.forEach(t => (t.categories || []).forEach(c => set.add(c)))
  }
  return Array.from(set).sort()
}

const getMemberTaskCount = (project, memberName) => {
  if (!project.tasks) return 0
  return project.tasks.filter(task => 
    task.assignedTo === memberName || 
    task.assigneeId === memberName ||
    task.taskOwner === memberName ||
    (task.collaborators && task.collaborators.includes(memberName))
  ).length
}

// Helper function to extract string value from field (handles objects)
const extractFieldValue = (field) => {
  if (!field) return null
  if (typeof field === 'string') return field
  if (typeof field === 'object') {
    return field.name || field.email || field.value || null
  }
  return String(field)
}

// Get task count for a member by email (checks all possible fields)
const getMemberTaskCountForEmail = (project, memberEmail) => {
  if (!project.tasks) return 0
  return project.tasks.filter(task => {
    // Check all fields that might contain this user's email or name
    const assignedTo = extractFieldValue(task.assignedTo)
    const assigneeId = extractFieldValue(task.assigneeId)
    const taskOwner = extractFieldValue(task.taskOwner)
    const collaborators = (task.collaborators || []).map(extractFieldValue)
    
    // Check if any field matches the email
    const matchesEmail = [assignedTo, assigneeId, taskOwner].some(field => 
      field === memberEmail
    ) || collaborators.includes(memberEmail)
    
    // Also check if any field matches a name that corresponds to this email
    const user = allUsers.value.find(u => u.email === memberEmail)
    if (user && user.name) {
      const matchesName = [assignedTo, assigneeId, taskOwner].some(field => 
        field === user.name || field === user.name.toLowerCase()
      ) || collaborators.some(collab => collab === user.name || collab === user.name.toLowerCase())
      
      return matchesEmail || matchesName
    }
    
    return matchesEmail
  }).length
}

// Get all team members involved in project tasks (assignedTo, assigneeId, taskOwner, collaborators)
const getProjectTeamMembers = (project) => {
  if (!project.tasks || project.tasks.length === 0) return []
  
  const membersMap = new Map() // Map email -> display info
  
  project.tasks.forEach(task => {
    // Helper function to add member with deduplication
    const addMember = (memberValue) => {
      if (!memberValue) return
      
      // Use the helper function to extract the string value
      const memberStr = extractFieldValue(memberValue)
      if (!memberStr || memberStr === '[object Object]') return
      const trimmed = memberStr.trim()
      if (!trimmed) return
      
      // Check if this value is an email or a name
      const isEmail = trimmed.includes('@')
      
      let userEmail = trimmed
      let displayName = trimmed
      
      // Try to find the user in allUsers
      let user = null
      if (isEmail) {
        // Lookup by email
        user = allUsers.value.find(u => u.email === trimmed)
      } else {
        // Lookup by name (case-insensitive)
        user = allUsers.value.find(u => 
          (u.name && u.name.toLowerCase().trim() === trimmed.toLowerCase()) ||
          (u.email && u.email.toLowerCase().trim() === trimmed.toLowerCase())
        )
      }
      
      // Only add if we found the user in allUsers - this ensures proper deduplication
      if (user && user.email) {
        userEmail = user.email
        displayName = user.name || user.email
        
        // Use email as the unique key to prevent duplicates
        if (!membersMap.has(userEmail)) {
          membersMap.set(userEmail, {
            email: userEmail,
            name: displayName,
            displayText: displayName === userEmail ? displayName : `${displayName} (${userEmail})`
          })
        }
      }
      // Skip entries that aren't found in allUsers to prevent duplicates
    }
    
    // Add assignedTo if it exists
    if (task.assignedTo) addMember(task.assignedTo)
    
    // Add assigneeId if it exists
    if (task.assigneeId) addMember(task.assigneeId)
    
    // Add taskOwner if it exists
    if (task.taskOwner) addMember(task.taskOwner)
    
    // Add all collaborators if they exist
    if (task.collaborators && Array.isArray(task.collaborators)) {
      task.collaborators.forEach(collab => addMember(collab))
    }
  })
  
  // Return unique members as an array
  return Array.from(membersMap.values())
}

const getProjectsByCategory = (category) => {
  return projects.value.filter(project => (project.tasks || []).some(t => (t.categories || []).includes(category)))
}

const getTasksCountByCategory = (category) => {
  let count = 0
  projects.value.forEach(project => {
    if (project.tasks) {
      count += project.tasks.filter(task => (task.categories || []).includes(category)).length
    }
  })
  return count
}

const getCompletionRateByCategory = (category) => {
  let total = 0
  let completed = 0
  projects.value.forEach(project => {
    if (project.tasks) {
      const categoryTasks = project.tasks.filter(task => (task.categories || []).includes(category))
      total += categoryTasks.length
      completed += categoryTasks.filter(task => task.status === 'Completed').length
    }
  })
  return total > 0 ? Math.round((completed / total) * 100) : 0
}

const getProjectsByDepartment = (department) => {
  // Match departments case-insensitively
  return projects.value.filter(project => 
    project.department && 
    project.department.toLowerCase() === department.toLowerCase()
  )
}

const getTotalTasksByDepartment = (department) => {
  return getProjectsByDepartment(department).reduce((sum, project) => sum + (project.totalTasks || 0), 0)
}

const getCompletedTasksByDepartment = (department) => {
  return getProjectsByDepartment(department).reduce((sum, project) => sum + (project.completedTasks || 0), 0)
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
  // Count users from database who belong to this department (case-insensitive)
  const usersInDept = allUsers.value.filter(user => 
    user.department && 
    user.department.trim().toLowerCase() === department.toLowerCase()
  );
  return usersInDept.length;
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
  // Populate owners with createdBy if owners is empty or doesn't exist
  // Also ensure createdBy is included in owners
  const projectOwners = project.owners || [];
  const createdBy = project.createdBy || project.members?.[0] || authStore.userEmail;
  
  // If no owners exist, use createdBy as the owner
  // If owners exist but createdBy is not included, add it to the beginning
  let finalOwners = projectOwners;
  if (projectOwners.length === 0 && createdBy) {
    // No owners found, use creator
    finalOwners = [createdBy];
  } else if (createdBy && !projectOwners.includes(createdBy)) {
    // Owners exist but creator not in list - add creator to the beginning
    finalOwners = [createdBy, ...projectOwners.filter(o => o !== createdBy)];
  }
  
  newProject.value = { 
    ...project,
    owners: finalOwners.length > 0 ? finalOwners : [createdBy], // Ensure at least creator is owner
    createdBy: createdBy // Preserve createdBy field for permission check
  };
  isEditing.value = true;
  showCreateDialog.value = true;
  
  console.log('[editProject] Loaded project:', {
    id: project.id,
    createdBy: createdBy,
    owners: finalOwners,
    canEditOwners: canEditOwners.value
  });
}
// Category management is global only; no per-project management
const manageCategoriesForProject = () => {}

const createGlobalCategory = async () => {
  const categoryName = newGlobalCategory.value.trim()
  if (!categoryName) return

  try {
    // Call the API to create the category
    const response = await axiosClient.post('/categories', {
      name: categoryName
    })
    
    // Close dialog and reset
    showAddCategoryDialog.value = false
    newGlobalCategory.value = ''
    
    // Reload categories and projects
    await loadCategories()
    await loadProjects()
    showMessage(`Category "${categoryName}" added successfully`, 'success')
  } catch (error) {
    console.error('Error creating category:', error)
    showMessage(error.response?.data?.error || 'Failed to create category', 'error')
  }
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
      // Ensure createdBy is preserved and owners are valid
      const updateData = {
        ...newProject.value,
        createdBy: newProject.value.createdBy || authStore.userEmail
      };
      
      // Only update owners if current user is the creator
      if (canEditOwners.value) {
        updateData.owners = newProject.value.owners || [updateData.createdBy];
      } else {
        // Don't update owners if user is not the creator
        delete updateData.owners;
      }
      
      await axiosClient.put(`/projects/${newProject.value.id}`, updateData)
      showMessage('Project updated successfully', 'success')
    } else {
      // Create new project
      // Ensure creator is set as owner if not already specified
      const createData = {
        ...newProject.value,
        owners: newProject.value.owners && newProject.value.owners.length > 0 
          ? newProject.value.owners 
          : [authStore.userEmail],
        createdBy: authStore.userEmail
      };
      
      await axiosClient.post('/projects', createData)
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
    owners: [],
    createdBy: null // Reset createdBy when resetting form
  }
  isEditing.value = false
  newCategoryInput.value = ''
}
// Removed project-level category add/remove


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

// Computed for visible departments by role
defineProps(); // To support script setup even if not used for now

// Get unique users (deduplicated by email)
const uniqueUsers = computed(() => {
  const userMap = new Map();
  allUsers.value.forEach(user => {
    if (!userMap.has(user.email)) {
      // Name is already cleaned in fetchAllUsers
      userMap.set(user.email, {
        ...user,
        displayName: user.name || user.email.split('@')[0]
      });
    }
  });
  return Array.from(userMap.values());
});

// Available users for owners field (cleaned and ready for autocomplete)
const availableUsersForOwners = computed(() => {
  if (!allUsers.value || allUsers.value.length === 0) {
    console.log('[availableUsersForOwners] No users available yet');
    return [];
  }
  
  // Use allUsers but ensure proper structure for Vuetify autocomplete
  const userMap = new Map();
  allUsers.value.forEach(user => {
    if (user && user.email && !userMap.has(user.email)) {
      const cleanName = user.name || user.email.split('@')[0];
      userMap.set(user.email, {
        email: user.email,
        name: cleanName,
        department: user.department || '',
        role: user.role || ''
      });
    }
  });
  
  const usersList = Array.from(userMap.values());
  console.log(`[availableUsersForOwners] Returning ${usersList.length} users for owners field`);
  return usersList;
});

// Capitalize department name (first letter of each word, with special handling for acronyms)
const capitalizeDepartment = (deptName) => {
  if (!deptName) return '';
  
  // Common acronyms that should be fully uppercase
  const acronyms = ['it', 'hr', 'ui', 'ux', 'api', 'id', 'qa', 'rd'];
  
  return deptName
    .split(' ')
    .map(word => {
      const wordLower = word.toLowerCase().trim();
      // If it's a known acronym (1-3 letters), make it fully uppercase
      if (acronyms.includes(wordLower) && word.length <= 3) {
        return word.toUpperCase();
      }
      // Otherwise, capitalize first letter
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
};

// Get departments from users collection (organized by department field)
const departmentsFromUsers = computed(() => {
  const deptMap = new Map();
  allUsers.value.forEach(user => {
    if (user.department && user.department.trim()) {
      const deptName = user.department.trim();
      // Filter out "All" department - it's a special department for director only
      if (deptName.toLowerCase() === 'all') {
        return;
      }
      // Use lowercase for consistent grouping, but we'll capitalize when displaying
      const deptKey = deptName.toLowerCase();
      if (!deptMap.has(deptKey)) {
        deptMap.set(deptKey, {
          name: deptName, // Keep original for reference
          users: []
        });
      }
      deptMap.get(deptKey).users.push(user);
    }
  });
  // Return unique department names, preserving original casing for sorting but we'll capitalize in display
  const uniqueDepts = Array.from(deptMap.values()).map(dept => dept.name);
  // Remove duplicates by converting to lowercase set, then return original names sorted
  const seen = new Set();
  return uniqueDepts
    .filter(dept => {
      const key = dept.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort();
});

const visibleDepartments = computed(() => {
  // Staff cannot see workload view
  if (authStore.userRole === 'staff') {
    return [];
  }
  
  // Director and HR see all departments
  if (authStore.userRole === 'director' || authStore.userRole === 'hr') {
    return departmentsFromUsers.value.length > 0 ? departmentsFromUsers.value : realDepartments.value;
  }
  
  // Manager sees only their department
  if (authStore.userRole === 'manager') {
    const userDept = authStore.userData?.department;
    if (!userDept) {
      console.warn('[visibleDepartments] Manager has no department assigned');
      return [];
    }
    
    // Normalize manager's department (trim and lowercase for comparison)
    const managerDeptNormalized = userDept.trim().toLowerCase();
    
    // First, check if manager exists in allUsers with this department
    // This is the most reliable check - if the manager is in the system with a department, show it
    const managerInUsers = allUsers.value.find(user => {
      const userEmail = user.email || '';
      const userDeptNormalized = (user.department || '').trim().toLowerCase();
      // Match by email (most reliable) and department
      return (userEmail.toLowerCase() === authStore.userEmail?.toLowerCase() || 
              userEmail === authStore.userEmail) &&
             userDeptNormalized === managerDeptNormalized;
    });
    
    // If manager is found in users, find the department name as stored in the system
    // This ensures we get the exact casing used in the database
    if (managerInUsers && managerInUsers.department) {
      const systemDeptName = managerInUsers.department.trim();
      
      // Check if this department exists in departmentsFromUsers (for consistency)
      const allDepts = departmentsFromUsers.value.length > 0 ? departmentsFromUsers.value : realDepartments.value;
      const matchingDept = allDepts.find(dept => {
        return dept.trim().toLowerCase() === systemDeptName.toLowerCase();
      });
      
      // Return the department - prefer the one from departmentsFromUsers if available, otherwise use system name
      if (matchingDept) {
        console.log('[visibleDepartments] Manager department found:', matchingDept);
        return [matchingDept];
      } else {
        // Department exists for this manager but not in the aggregated list yet
        // Return the system department name (will be capitalized in display)
        console.log('[visibleDepartments] Manager department found in user data:', systemDeptName);
        return [systemDeptName];
      }
    }
    
    // Fallback: Try to match from departmentsFromUsers or realDepartments by name only
    // This handles cases where manager might not be in allUsers yet (edge case)
    const allDepts = departmentsFromUsers.value.length > 0 ? departmentsFromUsers.value : realDepartments.value;
    const matchingDept = allDepts.find(dept => {
      return dept.trim().toLowerCase() === managerDeptNormalized;
    });
    
    if (matchingDept) {
      console.log('[visibleDepartments] Manager department matched from dept list:', matchingDept);
      return [matchingDept];
    }
    
    // Last resort: If manager has a department in userData, show it even if not found elsewhere
    // This ensures managers can always see their assigned department
    console.log('[visibleDepartments] Using manager department from userData as fallback:', userDept.trim());
    return [userDept.trim()];
  }
  
  return [];
});

const isStaff = computed(() => authStore.userRole === 'staff');

// Filter view tabs based on role (staff cannot see Workload)
const visibleViewTabs = computed(() => {
  if (authStore.userRole === 'staff') {
    return viewTabs.filter(tab => tab.value !== 'workload');
  }
  return viewTabs;
});

// Helper function to clean user names (remove prefixes, duplicates, emails)
const cleanUserName = (name) => {
  if (!name) return '';
  
  // Remove any prefix like "AL ", "AM ", "DA " etc (2-3 uppercase letters followed by space)
  let cleaned = name.replace(/^[A-Z]{2,3}\s+/, '').trim();
  
  // Remove email addresses if present in the name
  cleaned = cleaned.replace(/\s+[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi, '').trim();
  
  // If it still contains @, split and use the part before @
  if (cleaned.includes('@')) {
    cleaned = cleaned.split('@')[0].trim();
  }
  
  // Remove duplicate names (if name appears twice like "Alex Ng Alex Ng")
  const parts = cleaned.split(/\s+/);
  const uniqueParts = [];
  const seen = new Set();
  for (const part of parts) {
    const normalized = part.toLowerCase();
    if (!seen.has(normalized)) {
      seen.add(normalized);
      uniqueParts.push(part);
    }
  }
  cleaned = uniqueParts.join(' ');
  
  return cleaned.trim() || '';
};

// Fetch all users for member dropdown (via backend API to avoid Firestore permission issues)
async function fetchAllUsers() {
  try {
    // Use backend API endpoint which handles authentication and role-based filtering
    // axiosClient automatically adds the auth token via interceptor
    const response = await axiosClient.get('/auth/users');

    if (response.status === 200 && Array.isArray(response.data)) {
      const users = response.data.map(user => {
        const rawName = user.name || user.email.split('@')[0];
        const cleanedName = cleanUserName(rawName) || user.email.split('@')[0];
        return {
          email: user.email,
          name: cleanedName,
          department: user.department || '',
          role: user.role || ''
        };
      });
      
      allUsers.value = users;
      console.log(`[fetchAllUsers] Loaded ${allUsers.value.length} users from API:`, 
        allUsers.value.map(u => `${u.name} (${u.email})`).join(', '));
    } else {
      throw new Error('Invalid response format from API');
    }
  } catch (e) {
    console.error('[fetchAllUsers] Error loading users:', e);
    allUsers.value = [];
    
    // Only show error message if it's not a permission error (which might be expected for some roles)
    if (e.response?.status !== 403) {
      showMessage('Failed to load users: ' + (e.response?.data?.message || e.message), 'error');
    } else {
      console.warn('[fetchAllUsers] User does not have permission to view users list');
    }
  }
}

// Edit department function
function editDepartment(deptName) {
  // Try to find in departments collection first
  const dept = allDepartments.value.find(d => d.title === deptName);
  if (dept) {
    editingDepartmentId.value = dept.id;
    newDepartmentTitle.value = dept.title;
    newDepartmentMembers.value = dept.members || [];
    isEditingDepartment.value = true;
    showAddDepartmentDialog.value = true;
  } else {
    // If not in departments collection, create/edit using dept name from users
    editingDepartmentId.value = null;
    newDepartmentTitle.value = deptName;
    // Pre-populate members from users collection who belong to this department
    const usersInDept = allUsers.value.filter(user => 
      user.department && user.department.trim().toLowerCase() === deptName.toLowerCase()
    );
    newDepartmentMembers.value = usersInDept.map(user => user.email);
    isEditingDepartment.value = false; // Create new if not exists
    showAddDepartmentDialog.value = true;
  }
}

// Cancel department edit
function cancelDepartmentEdit() {
  showAddDepartmentDialog.value = false;
  newDepartmentTitle.value = '';
  newDepartmentMembers.value = [];
  editingDepartmentId.value = null;
  isEditingDepartment.value = false;
}

// Department create/edit method
async function createDepartment() {
  // RBAC: Only directors and HR can create/edit departments
  if (authStore.userRole !== 'director' && authStore.userRole !== 'hr') {
    showMessage('Only directors and HR can create/edit departments', 'error')
    return
  }
  
  departmentWriteLoading.value = true;
  try {
    if (isEditingDepartment.value && editingDepartmentId.value) {
      // Update existing department
      const deptRef = doc(db, 'departments', editingDepartmentId.value);
      await updateDoc(deptRef, {
        title: newDepartmentTitle.value.trim(),
        members: newDepartmentMembers.value,
        updatedAt: new Date().toISOString()
      });
      showMessage(`Department "${newDepartmentTitle.value}" updated successfully`, 'success')
    } else {
      // Create new department
      await addDoc(collection(db, 'departments'), {
        title: newDepartmentTitle.value.trim(),
        members: newDepartmentMembers.value, // array of user emails
        createdAt: new Date().toISOString()
      });
      showMessage(`Department "${newDepartmentTitle.value}" created successfully`, 'success')
    }
    
    showAddDepartmentDialog.value = false;
    newDepartmentTitle.value = '';
    newDepartmentMembers.value = [];
    editingDepartmentId.value = null;
    isEditingDepartment.value = false;
    await loadDepartments();
  } catch (error) {
    console.error('Error creating/updating department:', error)
    showMessage('Failed to save department: ' + error.message, 'error')
  } finally {
    departmentWriteLoading.value = false;
  }
}

// Removed stray watchers referencing undefined props
</script>

<style scoped>
@import url('@/assets/styles/ProjectView.css');
</style>