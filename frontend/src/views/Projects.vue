<template>
  <div class="projects-container">
    <div class="projects-page">
      <!-- Main Content -->
      <main class="main-content">
        <!-- Projects List View -->
        <div class="projects-view">
          <!-- Header -->
          <header class="content-header">
            <div class="header-top">
              <div>
                <h1>Projects</h1>
                <p>View and Manage your teams projects.</p>
              </div>
              <button class="btn btn-primary" @click="createProject">
                + Add project
              </button>
            </div>

            <div class="header-controls">
              <div class="view-toggle">
                <button 
                    class="view-btn" 
                    :class="{ active: viewMode === 'dashboard' }"
                    @click="viewMode = 'dashboard'"
                >
                    Dashboard
                </button>
                <button 
                    class="view-btn" 
                    :class="{ active: viewMode === 'team' }"
                    @click="viewMode = 'team'"
                >
                    Team View
                </button>
                <button 
                    class="view-btn"
                    :class="{ active: viewMode === 'kanban' }"
                    @click="viewMode = 'kanban'"
                >
                    Kanban View
                </button>
                </div>
              <div class="search-filter">
                <div class="search-box">
                  <span class="search-icon">🔍</span>
                  <input 
                    type="text" 
                    placeholder="Search for projects"
                    v-model="searchQuery"
                    class="search-input"
                  />
                </div>
                <button class="btn btn-secondary">
                  <span>⚙</span> Filters
                </button>
              </div>
            </div>
          </header>

          <!-- Dashboard View -->
        <div v-if="viewMode === 'dashboard'" class="dashboard-container">
        <div class="dashboard-stats">
            <div class="stat-card">
            <div class="stat-number">{{ projects.length }}</div>
            <div class="stat-label">Total Projects</div>
            <div class="stat-change">Active workspace</div>
            </div>
            
            <div class="stat-card">
            <div class="stat-number">{{ getProjectsByStatus('Ongoing').length }}</div>
            <div class="stat-label">In Progress</div>
            <div class="stat-change">{{ getProjectsByStatus('Ongoing').length > 0 ? '+' + Math.round((getProjectsByStatus('Ongoing').length / projects.length) * 100) + '% of total' : 'No active projects' }}</div>
            </div>
            
            <div class="stat-card">
            <div class="stat-number">{{ getProjectsByStatus('Pending Review').length }}</div>
            <div class="stat-label">Pending Review</div>
            <div class="stat-change">Awaiting approval</div>
            </div>
            
            <div class="stat-card">
            <div class="stat-number">{{ getProjectsByStatus('Completed').length }}</div>
            <div class="stat-label">Completed</div>
            <div class="stat-change">{{ Math.round((getProjectsByStatus('Completed').length / projects.length) * 100) }}% completion rate</div>
            </div>
        </div>

        <div class="dashboard-content">
            <div class="dashboard-main">
            <div class="dashboard-section">
                <h3>Project Overview</h3>
                <div class="recent-projects">
                <div 
                    v-for="project in projects.slice(0, 5)" 
                    :key="project.id"
                    class="recent-project-card"
                    @click="selectProject(project)"
                >
                    <div class="recent-project-header">
                    <div class="project-icon-small" :style="{ background: project.color }">
                        {{ project.icon }}
                    </div>
                    <span class="status-badge small" :class="getStatusClass(project.status)">
                        {{ project.status }}
                    </span>
                    </div>
                    <div class="recent-project-title">{{ project.name }}</div>
                    <div class="recent-project-about">{{ project.about }}</div>
                    <div class="recent-project-footer">
                    <div class="avatars">
                        <div 
                        v-for="(member, index) in project.members.slice(0, 3)" 
                        :key="index"
                        class="avatar small"
                        >
                        {{ member }}
                        </div>
                    </div>
                    <div class="progress-mini">
                        <span>{{ project.progress }}%</span>
                    </div>
                    </div>
                </div>
                </div>
            </div>
            </div>

            <div class="dashboard-sidebar">
            <div class="dashboard-section">
                <h3>Status Distribution</h3>
                <div class="status-breakdown">
                <div class="status-item">
                    <div class="status-info">
                    <span class="status-dot ongoing"></span>
                    <span>Ongoing</span>
                    </div>
                    <span class="status-count">{{ getProjectsByStatus('Ongoing').length }}</span>
                </div>
                <div class="status-item">
                    <div class="status-info">
                    <span class="status-dot pending"></span>
                    <span>Pending Review</span>
                    </div>
                    <span class="status-count">{{ getProjectsByStatus('Pending Review').length }}</span>
                </div>
                <div class="status-item">
                    <div class="status-info">
                    <span class="status-dot completed"></span>
                    <span>Completed</span>
                    </div>
                    <span class="status-count">{{ getProjectsByStatus('Completed').length }}</span>
                </div>
                <div class="status-item">
                    <div class="status-info">
                    <span class="status-dot unassigned"></span>
                    <span>Unassigned</span>
                    </div>
                    <span class="status-count">{{ getProjectsByStatus('Unassigned').length }}</span>
                </div>
                </div>
            </div>

            <div class="dashboard-section">
                <h3>Quick Actions</h3>
                <div class="quick-actions">
                <button class="quick-action-btn" @click="viewMode = 'team'">
                    <span>📋</span>
                    <span>View All Projects</span>
                </button>
                <button class="quick-action-btn" @click="viewMode = 'kanban'">
                    <span>📊</span>
                    <span>Kanban Board</span>
                </button>
                <button class="quick-action-btn" @click="createProject">
                    <span>➕</span>
                    <span>New Project</span>
                </button>
                </div>
            </div>
            </div>
        </div>
        </div>

          <!-- Team View -->
          <div v-if="viewMode === 'team'" class="table-container">
            <div class="table-header-section">
              <h2>All Projects</h2>
            </div>

            <table class="projects-table">
              <thead>
                <tr>
                  <th class="th-name">
                    <span>Name</span>
                    <span class="sort-icon">↓</span>
                  </th>
                  <th>Status</th>
                  <th>About</th>
                  <th>Members</th>
                  <th>Progress</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <tr 
                  v-for="project in filteredProjects" 
                  :key="project.id"
                  class="project-row"
                  @click="selectProject(project)"
                >
                  <td class="td-name">
                    <div class="project-name-cell">
                      <div class="project-icon" :style="{ background: project.color }">
                        {{ project.icon }}
                      </div>
                      <div class="project-info">
                        <div class="project-title">{{ project.name }}</div>
                        <div class="project-url">{{ project.url }}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span class="status-badge" :class="getStatusClass(project.status)">
                      {{ project.status }}
                    </span>
                  </td>
                  <td class="td-about">
                    <div class="about-cell">
                      <div class="about-title">{{ project.about }}</div>
                      <div class="about-description">{{ project.description }}</div>
                    </div>
                  </td>
                  <td>
                    <div class="members-cell">
                      <div class="avatars">
                        <div 
                          v-for="(member, index) in project.members.slice(0, 4)" 
                          :key="index"
                          class="avatar"
                          :title="member"
                        >
                          {{ member }}
                        </div>
                        <div v-if="project.extraMembers > 0" class="avatar avatar-more">
                          +{{ project.extraMembers }}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td class="td-progress">
                    <div class="progress-cell">
                      <div class="progress-bar-wrapper">
                        <div class="progress-bar">
                          <div 
                            class="progress-fill" 
                            :style="{ width: project.progress + '%', background: getProgressColor(project.progress) }"
                          ></div>
                        </div>
                      </div>
                      <span class="progress-percentage">{{ project.progress }}%</span>
                    </div>
                  </td>
                  <td class="td-actions">
                    <button class="more-btn" @click.stop>⋮</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Kanban View -->
        <div v-if="viewMode === 'kanban'" class="kanban-container">
            <div class="kanban-columns">
              <div 
                v-for="column in kanbanColumns" 
                :key="column.status"
                class="kanban-column"
              >
                <div class="kanban-column-header">
                  <h3>{{ column.status }}</h3>
                  <span class="kanban-count">{{ getProjectsByStatus(column.status).length }}</span>
                </div>
                <div class="kanban-cards">
                  <div 
                    v-for="project in getProjectsByStatus(column.status)" 
                    :key="project.id"
                    class="kanban-card"
                    @click="selectProject(project)"
                  >
                    <div class="kanban-card-header">
                      <div class="project-icon-small" :style="{ background: project.color }">
                        {{ project.icon }}
                      </div>
                      <button class="more-btn" @click.stop>⋮</button>
                    </div>
                    
                    <div class="kanban-card-title">{{ project.name }}</div>
                    <div class="kanban-card-url">{{ project.url }}</div>
                    
                    <div class="kanban-card-about">
                      <div class="about-title">{{ project.about }}</div>
                      <div class="about-description">{{ project.description }}</div>
                    </div>

                    <div class="kanban-card-footer">
                      <div class="avatars">
                        <div 
                          v-for="(member, index) in project.members.slice(0, 3)" 
                          :key="index"
                          class="avatar small"
                          :title="member"
                        >
                          {{ member }}
                        </div>
                        <div v-if="project.extraMembers > 0" class="avatar small avatar-more">
                          +{{ project.extraMembers }}
                        </div>
                      </div>
                      <div class="progress-indicator">
                        <div class="progress-bar small">
                          <div 
                            class="progress-fill" 
                            :style="{ width: project.progress + '%', background: getProgressColor(project.progress) }"
                          ></div>
                        </div>
                        <span class="progress-text">{{ project.progress }}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

// State
// State
const viewMode = ref('dashboard')
const searchQuery = ref('')
const selectedProject = ref(null)

// Kanban columns
const kanbanColumns = [
  { status: 'Ongoing' },
  { status: 'Pending Review' },
  { status: 'Completed' },
  { status: 'Unassigned' }
]

// Mock Data
const projects = ref([
  {
    id: 1,
    name: 'Iconly Pro',
    url: 'iconly.pro',
    icon: '🔷',
    status: 'Completed',
    about: 'Icon Design',
    description: 'Design icons in various styles.',
    members: ['JD', 'SM', 'MJ', 'SL'],
    extraMembers: 3,
    progress: 100,
    color: '#6366f1'
  },
  {
    id: 2,
    name: 'Skale',
    url: 'skale.space',
    icon: '🔵',
    status: 'Ongoing',
    about: 'Website Design',
    description: 'Redesign the skale website.',
    members: ['TB', 'LW', 'EC', 'DP'],
    extraMembers: 2,
    progress: 90,
    color: '#3b82f6'
  },
  {
    id: 3,
    name: 'Localy 2.0',
    url: 'Localy.io',
    icon: '🟠',
    status: 'Pending Review',
    about: 'Map Kit',
    description: 'Minimal maps in 5 styles.',
    members: ['AM', 'JL', 'KR'],
    extraMembers: 0,
    progress: 50,
    color: '#f59e0b'
  },
  {
    id: 4,
    name: 'Iconly Animation',
    url: 'iconly.pro',
    icon: '🔵',
    status: 'Ongoing',
    about: 'Animated Icons',
    description: 'Animated Iconly icons.',
    members: ['RK', 'PP', 'MM'],
    extraMembers: 0,
    progress: 80,
    color: '#3b82f6'
  },
  {
    id: 5,
    name: 'Cultivate',
    url: 'Cultivate.io',
    icon: '🟣',
    status: 'Pending Review',
    about: 'Web app integrations',
    description: 'Connect web apps seamlessly',
    members: ['EW', 'NB', 'GH', 'VD'],
    extraMembers: 0,
    progress: 20,
    color: '#a855f7'
  },
  {
    id: 6,
    name: 'Quotient',
    url: 'quotient.co',
    icon: '🟣',
    status: 'Unassigned',
    about: 'Sales CRM',
    description: 'Web-based sales doc management',
    members: ['XY', 'ZA', 'BC', 'DE'],
    extraMembers: 6,
    progress: 0,
    color: '#8b5cf6'
  },
  {
    id: 7,
    name: 'Mask World',
    url: 'maskworld.io',
    icon: '⚡',
    status: 'Ongoing',
    about: 'NFT project',
    description: 'A large collection of Jordi Mola\'s art.',
    members: ['FG', 'HI', 'JK'],
    extraMembers: 0,
    progress: 40,
    color: '#10b981'
  }
])

// Computed Properties
const filteredProjects = computed(() => {
  if (!searchQuery.value) return projects.value
  
  const query = searchQuery.value.toLowerCase()
  return projects.value.filter(project => 
    project.name.toLowerCase().includes(query) ||
    project.about.toLowerCase().includes(query) ||
    project.description.toLowerCase().includes(query)
  )
})

// Methods
const selectProject = (project) => {
  selectedProject.value = project
}

const getStatusClass = (status) => {
  const statusMap = {
    'Ongoing': 'status-ongoing',
    'Pending Review': 'status-pending',
    'Completed': 'status-completed',
    'Unassigned': 'status-unassigned'
  }
  return statusMap[status] || 'status-default'
}

const getProgressColor = (progress) => {
  if (progress === 100) return '#6b9b6b'
  if (progress >= 80) return '#6b9b6b'
  if (progress >= 50) return '#f59e0b'
  if (progress >= 20) return '#f59e0b'
  return '#ef4444'
}

const getProjectsByStatus = (status) => {
  return projects.value.filter(project => project.status === status)
}

const createProject = () => {
  alert('Create Project functionality - to be implemented')
}
</script>

<style scoped>

/* ===========================
   Responsive Zoom Scaling
   =========================== */
@media (min-width: 1920px) {
  .projects-container {
    font-size: 16px;
  }
}

@media (max-width: 1600px) {
  .projects-container {
    font-size: 15px;
  }
}

@media (max-width: 1366px) {
  .projects-container {
    font-size: 14px;
  }
}

@media (max-width: 1024px) {
  .projects-container {
    font-size: 13px;
  }
}
/* ===========================
   Main Container
   =========================== */
.projects-container {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: transparent;
}

/* ============================================
   MAIN LAYOUT
   ============================================ */
.projects-page {
  display: flex;
  flex: 1;
  background: transparent;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.projects-view {
  display: flex;
  flex-direction: column;
  height: 100%;
}

/* ============================================
   HEADER
   ============================================ */
.content-header {
  background: transparent;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  padding: 16px 24px;
  flex-shrink: 0;
}

[data-theme="dark"] .content-header {
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.header-top {
  display: flex;
  justify-content: space-between;
  align-items: start;
  margin-bottom: 16px;
}

.header-top h1 {
  font-size: 22px;
  font-weight: 600;
  color: #111827;
  margin: 0 0 2px 0;
}

[data-theme="dark"] .header-top h1 {
  color: #f7fafc;
}

.header-top p {
  font-size: 13px;
  color: #6b7280;
  margin: 0;
}

[data-theme="dark"] .header-top p {
  color: rgba(255, 255, 255, 0.6);
}

.btn {
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.btn-primary {
  background: #6b9b6b;
  color: white;
}

.btn-primary:hover {
  background: #5a8a5a;
}

[data-theme="dark"] .btn-primary {
  background: #5a7a9b;
  color: white;
}

[data-theme="dark"] .btn-primary:hover {
  background: #7b92d1;
}

.btn-secondary {
  background: white;
  color: #374151;
  border: 1px solid #d1d5db;
  display: flex;
  align-items: center;
  gap: 6px;
}

.btn-secondary:hover {
  background: #f9fafb;
}

[data-theme="dark"] .btn-secondary {
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

[data-theme="dark"] .btn-secondary:hover {
  background: rgba(255, 255, 255, 0.08);
}

.header-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.view-toggle {
  display: flex;
  gap: 0;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
}

[data-theme="dark"] .view-toggle {
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.view-btn {
  padding: 6px 14px;
  background: white;
  border: none;
  cursor: pointer;
  color: #6b7280;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.2s;
  border-right: 1px solid #e5e7eb;
}

.view-btn:last-child {
  border-right: none;
}

[data-theme="dark"] .view-btn {
  background: rgba(255, 255, 255, 0.03);
  color: rgba(255, 255, 255, 0.6);
  border-right: 1px solid rgba(255, 255, 255, 0.1);
}

.view-btn:hover {
  background: #f9fafb;
}

[data-theme="dark"] .view-btn:hover {
  background: rgba(255, 255, 255, 0.08);
}

.view-btn.active {
  background: #c5d49a;
  color: #3d3d3d;
  font-weight: 600;
}

[data-theme="dark"] .view-btn.active {
  background: rgba(123, 146, 209, 0.3);
  color: #7b92d1;
  font-weight: 600;
}

.search-filter {
  display: flex;
  gap: 12px;
  align-items: center;
}

.search-box {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 12px;
  color: #9ca3af;
  font-size: 14px;
}

.search-input {
  padding: 7px 10px 7px 32px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 13px;
  width: 240px;
  outline: none;
  transition: border-color 0.2s;
  background: white;
  color: #111827;
}

[data-theme="dark"] .search-input {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #f7fafc;
}

.search-input:focus {
  border-color: #d1d5db;
}

[data-theme="dark"] .search-input:focus {
  border-color: rgba(255, 255, 255, 0.2);
}

.search-input::placeholder {
  color: #9ca3af;
}

[data-theme="dark"] .search-input::placeholder {
  color: rgba(255, 255, 255, 0.4);
}

/* ============================================
   TABLE VIEW (TEAM VIEW)
   ============================================ */
.table-container {
  flex: 1;
  padding: 20px 24px;
  overflow-y: auto;
  background: transparent;
}

.table-header-section {
  margin-bottom: 16px;
}

.table-header-section h2 {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

[data-theme="dark"] .table-header-section h2 {
  color: #f7fafc;
}

.projects-table {
  width: 100%;
  background: var(--bg-secondary, white);
  border-radius: 12px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-collapse: separate;
  border-spacing: 0;
}

[data-theme="dark"] .projects-table {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.projects-table thead {
  background: transparent;
}

[data-theme="dark"] .projects-table thead {
  background: rgba(255, 255, 255, 0.02);
}

.projects-table th {
  padding: 12px 20px;
  text-align: left;
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 1px solid #e5e7eb;
}

[data-theme="dark"] .projects-table th {
  color: rgba(255, 255, 255, 0.5);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.projects-table th:first-child {
  border-top-left-radius: 12px;
}

.projects-table th:last-child {
  border-top-right-radius: 12px;
}

.th-name {
  display: flex;
  align-items: center;
  gap: 4px;
}

.sort-icon {
  color: #9ca3af;
  font-size: 10px;
}

.projects-table tbody tr {
  border-bottom: 1px solid #f3f4f6;
  cursor: pointer;
  transition: background-color 0.15s;
}

[data-theme="dark"] .projects-table tbody tr {
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.projects-table tbody tr:hover {
  background: rgba(0, 0, 0, 0.02);
}

[data-theme="dark"] .projects-table tbody tr:hover {
  background: rgba(255, 255, 255, 0.03);
}

.projects-table tbody tr:last-child {
  border-bottom: none;
}

.projects-table td {
  padding: 16px 20px;
  font-size: 14px;
  color: #374151;
  vertical-align: middle;
}

[data-theme="dark"] .projects-table td {
  color: rgba(255, 255, 255, 0.8);
}

.td-name {
  width: 25%;
}

.project-name-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.project-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
}

.project-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.project-title {
  font-weight: 600;
  color: #111827;
  font-size: 14px;
}

[data-theme="dark"] .project-title {
  color: #f7fafc;
}

.project-url {
  font-size: 13px;
  color: #9ca3af;
}

[data-theme="dark"] .project-url {
  color: rgba(255, 255, 255, 0.4);
}

.status-badge {
  padding: 5px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  display: inline-block;
}

.status-ongoing {
  background: rgba(107, 155, 107, 0.15);
  color: #4a7a4a;
}

[data-theme="dark"] .status-ongoing {
  background: rgba(33, 150, 243, 0.2);
  color: #90caf9;
}

.status-pending {
  background: #fef3c7;
  color: #92400e;
}

[data-theme="dark"] .status-pending {
  background: rgba(255, 152, 0, 0.2);
  color: #ffb74d;
}

.status-completed {
  background: rgba(107, 155, 107, 0.25);
  color: #3d6b3d;
}

[data-theme="dark"] .status-completed {
  background: rgba(76, 175, 80, 0.2);
  color: #81c784;
}

.status-unassigned {
  background: #fee2e2;
  color: #991b1b;
}

[data-theme="dark"] .status-unassigned {
  background: rgba(244, 67, 54, 0.2);
  color: #e57373;
}

.td-about {
  width: 28%;
}

.about-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.about-title {
  font-weight: 500;
  color: #111827;
  font-size: 13px;
}

[data-theme="dark"] .about-title {
  color: #f7fafc;
}

.about-description {
  font-size: 13px;
  color: #9ca3af;
}

[data-theme="dark"] .about-description {
  color: rgba(255, 255, 255, 0.4);
}

.members-cell {
  display: flex;
  align-items: center;
}

.avatars {
  display: flex;
  margin-left: -4px;
}

.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-size: 11px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid white;
  margin-left: -4px;
  flex-shrink: 0;
}

[data-theme="dark"] .avatar {
  border: 2px solid #1e1e28;
}

.avatar.small {
  width: 28px;
  height: 28px;
  font-size: 10px;
}

.avatar-more {
  background: #e5e7eb;
  color: #6b7280;
}

[data-theme="dark"] .avatar-more {
  background: rgba(255, 255, 255, 0.2);
  color: rgba(255, 255, 255, 0.7);
}

.td-progress {
  width: 18%;
}

.progress-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.progress-bar-wrapper {
  flex: 1;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: #f3f4f6;
  border-radius: 4px;
  overflow: hidden;
}

[data-theme="dark"] .progress-bar {
  background: rgba(255, 255, 255, 0.1);
}

.progress-bar.small {
  height: 6px;
}

.progress-fill {
  height: 100%;
  background: #10b981;
  transition: width 0.3s;
  border-radius: 4px;
}

.progress-percentage {
  font-size: 13px;
  font-weight: 600;
  color: #6b7280;
  min-width: 38px;
  text-align: right;
}

[data-theme="dark"] .progress-percentage {
  color: rgba(255, 255, 255, 0.6);
}

.td-actions {
  width: 40px;
  text-align: center;
}

.more-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px 8px;
  color: #9ca3af;
  font-size: 18px;
  border-radius: 4px;
  transition: all 0.2s;
}

.more-btn:hover {
  background: #f3f4f6;
  color: #111827;
}

[data-theme="dark"] .more-btn {
  color: rgba(255, 255, 255, 0.5);
}

[data-theme="dark"] .more-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.8);
}

/* ============================================
   KANBAN VIEW
   ============================================ */
.kanban-container {
  flex: 1;
  padding: 20px 24px;
  overflow-x: auto;
  overflow-y: hidden;
  background: transparent;
}

.kanban-columns {
  display: flex;
  gap: 20px;
  height: 100%;
  min-width: min-content;
}

.kanban-column {
  flex: 0 0 320px;
  display: flex;
  flex-direction: column;
  background: rgba(0, 0, 0, 0.02);
  border-radius: 12px;
  padding: 16px;
  max-height: calc(100vh - 220px);
}

[data-theme="dark"] .kanban-column {
  background: rgba(255, 255, 255, 0.03);
}

.kanban-column-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 2px solid #e5e7eb;
}

[data-theme="dark"] .kanban-column-header {
  border-bottom: 2px solid rgba(255, 255, 255, 0.08);
}

.kanban-column-header h3 {
  font-size: 14px;
  font-weight: 600;
  color: #111827;
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

[data-theme="dark"] .kanban-column-header h3 {
  color: #f7fafc;
}

.kanban-count {
  background: #e5e7eb;
  color: #6b7280;
  font-size: 12px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 12px;
}

[data-theme="dark"] .kanban-count {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.7);
}

.kanban-cards {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.kanban-card {
  background: var(--bg-secondary, white);
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 10px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s;
}

[data-theme="dark"] .kanban-card {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.kanban-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}

[data-theme="dark"] .kanban-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.kanban-card-header {
  display: flex;
  justify-content: space-between;
  align-items: start;
  margin-bottom: 12px;
}

.project-icon-small {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
}

.kanban-card-title {
  font-size: 15px;
  font-weight: 600;
  color: #111827;
  margin-bottom: 2px;
}

[data-theme="dark"] .kanban-card-title {
  color: #f7fafc;
}

.kanban-card-url {
  font-size: 12px;
  color: #9ca3af;
  margin-bottom: 12px;
}

[data-theme="dark"] .kanban-card-url {
  color: rgba(255, 255, 255, 0.4);
}

.kanban-card-about {
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid #f3f4f6;
}

[data-theme="dark"] .kanban-card-about {
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.kanban-card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.progress-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.progress-indicator .progress-bar {
  flex: 1;
}

.progress-text {
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  min-width: 32px;
}

[data-theme="dark"] .progress-text {
  color: rgba(255, 255, 255, 0.6);
}

/* ============================================
   RESPONSIVE
   ============================================ */
@media (max-width: 1024px) {
  .dashboard-content {
    grid-template-columns: 1fr;
  }

  .dashboard-stats {
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  }

  .header-controls {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }

  .search-filter {
    justify-content: space-between;
  }

  .kanban-column {
    flex: 0 0 280px;
  }
}

/* ============================================
   DASHBOARD VIEW
   ============================================ */
.dashboard-container {
  flex: 1;
  padding: 20px 24px;
  overflow-y: auto;
  background: transparent;
}

.dashboard-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  background: white;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 10px;
  padding: 18px;
  transition: all 0.2s;
}

[data-theme="dark"] .stat-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.stat-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  transform: translateY(-2px);
}

[data-theme="dark"] .stat-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.stat-number {
  font-size: 28px;
  font-weight: 700;
  color: #111827;
  margin-bottom: 6px;
  line-height: 1;
}

[data-theme="dark"] .stat-number {
  color: #f7fafc;
}

.stat-label {
  font-size: 13px;
  font-weight: 500;
  color: #6b7280;
  margin-bottom: 3px;
}

[data-theme="dark"] .stat-label {
  color: rgba(255, 255, 255, 0.6);
}

.stat-change {
  font-size: 11px;
  color: #9ca3af;
}
[data-theme="dark"] .stat-change {
  color: rgba(255, 255, 255, 0.4);
}

.dashboard-content {
  display: grid;
  grid-template-columns: 1fr 280px;
  gap: 20px;
}

.dashboard-section {
  background: white;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 10px;
  padding: 18px;
  margin-bottom: 16px;
}

[data-theme="dark"] .dashboard-section {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.dashboard-section h3 {
  font-size: 14px;
  font-weight: 600;
  color: #111827;
  margin: 0 0 14px 0;
}

[data-theme="dark"] .dashboard-section h3 {
  color: #f7fafc;
}

.recent-projects {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
}

.recent-project-card {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

[data-theme="dark"] .recent-project-card {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.recent-project-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
  transform: translateY(-2px);
  border-color: #d1d5db;
}

[data-theme="dark"] .recent-project-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  border-color: rgba(255, 255, 255, 0.1);
}

.recent-project-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.status-badge.small {
  padding: 3px 8px;
  font-size: 11px;
}

.recent-project-title {
  font-size: 15px;
  font-weight: 600;
  color: #111827;
  margin-bottom: 4px;
}

[data-theme="dark"] .recent-project-title {
  color: #f7fafc;
}

.recent-project-about {
  font-size: 13px;
  color: #6b7280;
  margin-bottom: 16px;
}

[data-theme="dark"] .recent-project-about {
  color: rgba(255, 255, 255, 0.5);
}

.recent-project-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 12px;
  border-top: 1px solid #e5e7eb;
}

[data-theme="dark"] .recent-project-footer {
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.progress-mini {
  font-size: 13px;
  font-weight: 600;
  color: #6b7280;
}

[data-theme="dark"] .progress-mini {
  color: rgba(255, 255, 255, 0.6);
}

.status-breakdown {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.status-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #f3f4f6;
}

[data-theme="dark"] .status-item {
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.status-item:last-child {
  border-bottom: none;
}

.status-info {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  color: #374151;
}

[data-theme="dark"] .status-info {
  color: rgba(255, 255, 255, 0.8);
}

.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.status-dot.ongoing {
  background: #6b9b6b;
}

.status-dot.pending {
  background: #f59e0b;
}

.status-dot.completed {
  background: #6b9b6b;
}

.status-dot.unassigned {
  background: #ef4444;
}

[data-theme="dark"] .status-dot.ongoing {
  background: #7b92d1;
}

[data-theme="dark"] .status-dot.completed {
  background: #7b92d1;
}

.status-count {
  font-weight: 600;
  color: #111827;
  font-size: 16px;
}

[data-theme="dark"] .status-count {
  color: #f7fafc;
}

.quick-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.quick-action-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
}

[data-theme="dark"] .quick-action-btn {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.8);
}

.quick-action-btn:hover {
  background: white;
  border-color: #d1d5db;
  transform: translateX(2px);
}

[data-theme="dark"] .quick-action-btn:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.1);
}

.quick-action-btn span:first-child {
  font-size: 18px;
}

@media (max-width: 768px) {
  .content-header {
    padding: 20px;
  }

  .header-top {
    flex-direction: column;
    gap: 16px;
  }

  .table-container {
    padding: 20px;
    overflow-x: auto;
  }

  .projects-table {
    min-width: 800px;
  }

  .kanban-container {
    padding: 20px;
  }

  .kanban-column {
    flex: 0 0 260px;
  }
}
</style>