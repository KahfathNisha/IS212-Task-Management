<template>
  <div>
    <nav :class="{ 'nav-open': isOpen }" class="navbar">
      <div class="nav-toggle" @click="toggleNav">
        <div class="hamburger">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>

      <div class="nav-content">
        <div class="nav-header">
          <h2>Task Management</h2>
        </div>
        
        <div class="nav-menu">
          <div v-for="item in menuItems" :key="item.path" class="nav-item">
            <router-link :to="item.path" class="nav-link" @click="closeNav">
              <v-icon class="nav-icon">{{ item.icon }}</v-icon>
              <span>{{ item.title }}</span>
            </router-link>
          </div>
        </div>

        <!-- Projects Section -->
        <div class="projects-section">
          <div class="projects-header">
            <h3>Projects</h3>
            <v-btn icon="mdi-plus" size="small" variant="text" @click="showProjectDialog = true" />
          </div>
          
          <div class="projects-list">
            <div 
              v-for="project in projects" 
              :key="project.id"
              class="project-item" 
              :class="{ 'active-project': selectedProject === project.id }"
              @click="selectProject(project.id)"
            >
              <v-icon class="project-icon" size="16" :color="project.color">mdi-circle</v-icon>
              <span>{{ project.name }}</span>
            </div>
            <div class="project-item" @click="showProjectDialog = true">
              <v-icon class="project-icon" size="16" color="purple">mdi-folder-plus</v-icon>
              <span>Create Folder</span>
            </div>
          </div>
        </div>

        <!-- Settings and Logout -->
        <div class="nav-bottom">
          <div class="nav-item">
            <a href="#" class="nav-link" @click.prevent="handleSettings">
              <v-icon class="nav-icon">mdi-cog</v-icon>
              <span>Settings</span>
            </a>
          </div>
          <div class="nav-item">
            <a href="#" class="nav-link" @click.prevent="handleLogout">
              <v-icon class="nav-icon">mdi-logout</v-icon>
              <span>Logout</span>
            </a>
          </div>
        </div>
      </div>
    </nav>

    <!-- Theme Toggle Button -->
    <button class="theme-toggle" @click="toggleTheme">
      {{ isDarkMode ? '☀️ Light' : '🌙 Dark' }}
    </button>

    <!-- Overlay for mobile -->
    <div v-if="isOpen" class="overlay" @click="closeNav"></div>

    <!-- Project Dialog -->
    <v-dialog v-model="showProjectDialog" max-width="400px">
      <v-card rounded="xl">
        <v-card-title>Create New Project</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="newProject.name"
            label="Project Name"
            required
          />
          <v-select
            v-model="newProject.color"
            :items="colorOptions"
            label="Color"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showProjectDialog = false">Cancel</v-btn>
          <v-btn color="primary" @click="createProject">Create</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUIStore } from '../stores/useUIStore'

const router = useRouter()
const uiStore = useUIStore()
const isOpen = ref(false)
const isDarkMode = ref(false)
const showProjectDialog = ref(false)
const selectedProject = ref('all')

const projects = ref([
  { id: 'all', name: 'All Tasks', color: 'grey' },
  { id: 'Scrum-timeline', name: 'Scrum Management - Timeline', color: 'green' },
  { id: 'IS212', name: 'IS212 Project', color: 'blue' }
])

const newProject = ref({
  name: '',
  color: 'blue'
})

const colorOptions = [
  { title: 'Blue', value: 'blue' },
  { title: 'Green', value: 'green' },
  { title: 'Purple', value: 'purple' },
  { title: 'Orange', value: 'orange' },
  { title: 'Red', value: 'red' }
]

const menuItems = [
  { title: 'Home', path: '/', icon: 'mdi-home' },
  { title: 'Tasks', path: '/tasks', icon: 'mdi-clipboard-list' },
  { title: 'Reports', path: '/reports', icon: 'mdi-file-document' },
  { title: 'Dashboards', path: '/dashboards', icon: 'mdi-chart-line' },
  { title: 'Notifications', path: '/notifications', icon: 'mdi-bell' },
  { title: 'Profile', path: '/profile', icon: 'mdi-account' }
]

const toggleNav = () => {
  isOpen.value = !isOpen.value
  uiStore.setDrawer(isOpen.value)
}

const closeNav = () => {
  isOpen.value = false
  uiStore.setDrawer(false)
}

const selectProject = (projectId) => {
  selectedProject.value = projectId
  // Emit event or use store to communicate with parent
}

const createProject = () => {
  const project = {
    id: newProject.value.name.toLowerCase().replace(/\s+/g, '-'),
    ...newProject.value
  }
  
  projects.value.push(project)
  showProjectDialog.value = false
  newProject.value = { name: '', color: 'blue' }
}

const handleSettings = () => {
  router.push('/settings')
}

const handleLogout = () => {
  router.push('/login')
}

const toggleTheme = () => {
  isDarkMode.value = !isDarkMode.value
  
  if (window.toggleVuetifyTheme) {
    window.toggleVuetifyTheme()
  }
  
  if (isDarkMode.value) {
    document.documentElement.setAttribute('data-theme', 'dark')
  } else {
    document.documentElement.removeAttribute('data-theme')
  }
}
</script>

<style scoped>
.navbar {
  position: fixed;
  top: 0;
  left: 0;
  height: 100vh;
  background: var(--bg-secondary);
  color: var(--text-primary);
  transform: translateX(-100%);
  transition: transform 0.3s ease;
  z-index: 1000;
  width: 280px;
  box-shadow: 2px 0 15px rgba(59, 89, 152, 0.2);
}

.nav-open {
  transform: translateX(0);
}

.nav-toggle {
  position: absolute;
  right: -50px;
  top: 10px;
  background: var(--primary);
  padding: 12px;
  cursor: pointer;
  border-radius: 0 8px 8px 0;
  box-shadow: 2px 0 10px rgba(59, 89, 152, 0.3);
  border: none;
}

.hamburger {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  width: 20px;
  height: 15px;
}

.hamburger span {
  display: block;
  height: 2px;
  width: 100%;
  background: white;
  border-radius: 2px;
  transition: all 0.3s ease;
}

.nav-open .hamburger span:nth-child(1) {
  transform: rotate(45deg) translate(5px, 5px);
}

.nav-open .hamburger span:nth-child(2) {
  opacity: 0;
}

.nav-open .hamburger span:nth-child(3) {
  transform: rotate(-45deg) translate(7px, -6px);
}

.nav-content {
  padding: 20px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.nav-header {
  margin-bottom: 30px;
  text-align: center;
}

.nav-header h2 {
  font-size: 1.4em;
  font-weight: 600;
  color: var(--text-secondary);
  margin: 0;
}

.nav-menu {
  flex: 1;
  margin-bottom: 20px;
}

.nav-item {
  margin: 8px 0;
}

.nav-link {
  color: var(--text-primary);
  text-decoration: none;
  font-size: 1em;
  display: flex;
  align-items: center;
  padding: 12px;
  border-radius: 8px;
  transition: all 0.3s ease;
  cursor: pointer;
}

.nav-link:hover,
.router-link-active {
  background: var(--primary);
  color: white;
  transform: translateX(5px);
}

.nav-icon {
  width: 20px;
  height: 20px;
  margin-right: 12px;
  color: currentColor;
}

.projects-section {
  margin-bottom: 20px;
}

.projects-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.projects-header h3 {
  color: var(--text-secondary);
  margin: 0;
  font-size: 1em;
  font-weight: 600;
}

.projects-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.project-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.9em;
}

.project-item:hover {
  background: rgba(123, 146, 209, 0.1);
}

.active-project {
  background: var(--primary);
  color: white;
}

.project-icon {
  margin-right: 8px;
}

.nav-bottom {
  border-top: 1px solid rgba(123, 146, 209, 0.2);
  padding-top: 20px;
}

.theme-toggle {
  position: fixed;
  top: 20px;
  right: 20px;
  background: var(--accent-light);
  border: none;
  border-radius: 20px;
  padding: 8px 12px;
  cursor: pointer;
  font-size: 14px;
  color: var(--accent-dark);
  transition: all 0.3s ease;
  font-weight: 500;
  z-index: 1001;
}

.theme-toggle:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(197, 212, 154, 0.4);
}

.overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.3);
  z-index: 999;
}

@media (max-width: 768px) {
  .navbar {
    width: 260px;
  }
}
</style>