<script setup>
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUIStore } from '../stores/useUIStore'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const uiStore = useUIStore()
const authStore = useAuthStore()
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

// Updated menu items with Projects
const menuItems = [
  { title: 'Home', path: '/', icon: 'mdi-home' },
  { title: 'Projects', path: '/projects', icon: 'mdi-folder-multiple' },
  { title: 'Tasks', path: '/tasks', icon: 'mdi-clipboard-list' },
  { title: 'Reports', path: '/reports', icon: 'mdi-file-document' },
  { title: 'Notifications', path: '/notifications', icon: 'mdi-bell' },
]

const pageTitle = computed(() => {
  const titles = {
    '/': 'Home',
    '/projects': 'Projects Board',
    '/tasks': 'Tasks Board',
    '/reports': 'Reports',
    '/notifications': 'Notifications',
    '/profile': 'Profile',
    '/settings': 'Settings'
  }
  return titles[route.path] || 'Task Management'
})

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
  // You can filter tasks by project or navigate to project-specific view
  // router.push(`/tasks?project=${projectId}`)
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

const handleLogout = async () => {
  try {
    const result = await authStore.logout()
    router.push(result.redirect)
  } catch (error) {
    console.error('Logout error:', error)
  }
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

<template>
  <div>
    <!-- Thin Top Header Bar -->
    <header class="top-header">
      <div class="header-content">
        <div class="header-left">
          <!-- Hamburger Menu -->
          <button class="icon-btn hamburger-btn" @click="toggleNav">
            <div class="hamburger" :class="{ 'active': isOpen }">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </button>
          
          <h1 class="page-title">{{ pageTitle }}</h1>
        </div>
        
        <div class="header-actions">
          <!-- Theme Toggle -->
          <button class="icon-btn" @click="toggleTheme" :title="isDarkMode ? 'Light Mode' : 'Dark Mode'">
            <v-icon size="18">{{ isDarkMode ? 'mdi-white-balance-sunny' : 'mdi-moon-waning-crescent' }}</v-icon>
          </button>
        </div>
      </div>
    </header>

    <!-- Sidebar Navigation -->
    <nav :class="{ 'nav-open': isOpen }" class="navbar">
      <div class="nav-content">
        <div class="nav-header">
          <h2>Task Management</h2>
        </div>
        
        <!-- Main Navigation Menu -->
        <div class="nav-menu">
          <div v-for="item in menuItems" :key="item.path" class="nav-item">
            <router-link :to="item.path" class="nav-link" @click="closeNav">
              <v-icon class="nav-icon" size="18">{{ item.icon }}</v-icon>
              <span>{{ item.title }}</span>
            </router-link>
          </div>
        </div>
        

        <!-- Settings and Logout -->
        <div class="nav-bottom">
          <div class="nav-item">
            <a href="#" class="nav-link" @click.prevent="handleSettings">
              <v-icon class="nav-icon" size="18">mdi-cog</v-icon>
              <span>Settings</span>
            </a>
          </div>
          <div class="nav-item">
            <a href="#" class="nav-link" @click.prevent="handleLogout">
              <v-icon class="nav-icon" size="18">mdi-logout</v-icon>
              <span>Logout</span>
            </a>
          </div>
        </div>
      </div>
    </nav>

    <!-- Overlay for mobile -->
    <div v-if="isOpen" class="overlay" @click="closeNav"></div>

    <!-- Project Dialog -->
    <v-dialog v-model="showProjectDialog" max-width="400px">
      <v-card rounded="xl">
        <v-card-title>Create New Workspace</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="newProject.name"
            label="Workspace Name"
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

<style scoped>
/* All your existing styles remain the same */
.top-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 50px;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  z-index: 1001;
  transition: all 0.3s ease;
}

[data-theme="dark"] .top-header {
  background: rgba(30, 30, 40, 0.85);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.header-content {
  max-width: 100%;
  height: 100%;
  padding: 0 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.page-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary, #666);
  margin: 0;
  letter-spacing: 0.3px;
}

[data-theme="dark"] .page-title {
  color: rgba(255, 255, 255, 0.7);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.icon-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 6px;
  border-radius: 6px;
  color: var(--text-secondary, #666);
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-btn:hover {
  background: rgba(0, 0, 0, 0.05);
}

[data-theme="dark"] .icon-btn {
  color: rgba(255, 255, 255, 0.7);
}

[data-theme="dark"] .icon-btn:hover {
  background: rgba(255, 255, 255, 0.05);
}

.hamburger-btn {
  padding: 8px;
}

.hamburger {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  width: 18px;
  height: 14px;
}

.hamburger span {
  display: block;
  height: 2px;
  width: 100%;
  background: currentColor;
  border-radius: 2px;
  transition: all 0.3s ease;
}

.hamburger.active span:nth-child(1) {
  transform: rotate(45deg) translate(5px, 5px);
}

.hamburger.active span:nth-child(2) {
  opacity: 0;
}

.hamburger.active span:nth-child(3) {
  transform: rotate(-45deg) translate(5px, -5px);
}

.navbar {
  position: fixed;
  top: 0;
  left: 0;
  height: 100vh;
  background: var(--bg-secondary, #ffffff);
  color: var(--text-primary, #333);
  transform: translateX(-100%);
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 1000;
  width: 280px;
  box-shadow: 2px 0 20px rgba(0, 0, 0, 0.08);
}

[data-theme="dark"] .navbar {
  background: #1e1e28;
  box-shadow: 2px 0 20px rgba(0, 0, 0, 0.3);
}

.nav-open {
  transform: translateX(0);
}

.nav-content {
  padding: 70px 20px 24px 20px;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.nav-header {
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

[data-theme="dark"] .nav-header {
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.nav-header h2 {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary, #333);
  margin: 0;
}

[data-theme="dark"] .nav-header h2 {
  color: #fff;
}

.nav-menu {
  flex: 1;
  margin-bottom: 20px;
}

.nav-item {
  margin: 4px 0;
}

.nav-link {
  color: var(--text-primary, #666);
  text-decoration: none;
  font-size: 14px;
  display: flex;
  align-items: center;
  padding: 10px 12px;
  border-radius: 8px;
  transition: all 0.2s ease;
  cursor: pointer;
}

.nav-link:hover {
  background: rgba(123, 146, 209, 0.1);
  color: var(--primary, #7b92d1);
}

.router-link-active {
  background: var(--primary, #7b92d1);
  color: white !important;
}

[data-theme="dark"] .nav-link {
  color: rgba(255, 255, 255, 0.7);
}

[data-theme="dark"] .nav-link:hover {
  background: rgba(123, 146, 209, 0.15);
}

.nav-icon {
  margin-right: 12px;
  color: currentColor;
}

.projects-section {
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

[data-theme="dark"] .projects-section {
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.projects-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding: 0 4px;
}

.projects-header h3 {
  color: var(--text-secondary, #999);
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

[data-theme="dark"] .projects-header h3 {
  color: rgba(255, 255, 255, 0.5);
}

.projects-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.project-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 13px;
  color: var(--text-primary, #666);
}

[data-theme="dark"] .project-item {
  color: rgba(255, 255, 255, 0.7);
}

.project-item:hover {
  background: rgba(123, 146, 209, 0.08);
}

.active-project {
  background: rgba(123, 146, 209, 0.15);
  color: var(--primary, #7b92d1);
  font-weight: 500;
}

.project-icon {
  margin-right: 8px;
}

.nav-bottom {
  padding-top: 16px;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
}

[data-theme="dark"] .nav-bottom {
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.overlay {
  position: fixed;
  top: 50px;
  left: 0;
  width: 100vw;
  height: calc(100vh - 50px);
  background: rgba(0, 0, 0, 0.3);
  z-index: 999;
  backdrop-filter: blur(2px);
}

@media (max-width: 768px) {
  .navbar {
    width: 260px;
  }
  
  .page-title {
    font-size: 13px;
  }
  
  .header-content {
    padding: 0 16px;
  }
}
</style>