<template>
  <v-container>
    <v-card class="mx-auto" max-width="1200">
      <v-card-title class="text-h5 d-flex align-center">
        <v-icon start>mdi-chart-bar</v-icon>
        Generate Report
      </v-card-title>

      <!-- Logo for PDF export only (hidden) -->
      <div class="pdf-only" style="display: none;">
        <img :src="SPMLogo" alt="Company Logo" style="width: 200px; margin: 20px auto; display: block;" />
      </div>

      <!-- 
        ========================================
        Report Type Selection Tabs (RBAC)
        ========================================
      -->
      <v-tabs v-model="selectedReportType" color="primary" grow>
        <v-tab v-if="rbac.canViewProject" value="project">Project Schedule</v-tab>
        <v-tab v-if="rbac.canViewIndividual" value="individual">Individual Performance</v-tab>
        <v-tab v-if="rbac.canViewDepartment" value="department">Department Workload</v-tab>
        <v-tab v-if="rbac.canViewCompany" value="company">Company Performance</v-tab>
      </v-tabs>
      <v-divider></v-divider>

      <!-- 
        ========================================
        Report Parameter Controls
        ========================================
      -->
      <v-card-text>
        <v-window v-model="selectedReportType">
          
          <!-- Project Report Controls -->
          <v-window-item value="project">
            <v-select
              v-model="params.projectId"
              :items="projects"
              item-title="name"
              item-value="id"
              label="Select a Project"
              variant="outlined"
              :loading="loading.projects"
              no-data-text="No projects found."
            ></v-select>
          </v-window-item>

          <!-- Individual Report Controls -->
          <v-window-item value="individual">
            <v-row>
              <v-col cols="12" md="6">
                <v-select
                  v-model="params.employeeEmail"
                  :items="employees"
                  item-title="name"
                  item-value="email"
                  :label="authStore.userRole === 'staff' ? 'Your Performance Report' : 'Select an Employee'"
                  variant="outlined"
                  :loading="loading.employees"
                  :disabled="authStore.userRole === 'staff'"
                  no-data-text="No employees found."
                ></v-select>
              </v-col>
              <v-col cols="6" md="3">
                <v-text-field v-model="params.startDate" type="date" label="Start Date (Task Created)" variant="outlined"></v-text-field>
              </v-col>
              <v-col cols="6" md="3">
                <v-text-field v-model="params.endDate" type="date" label="End Date (Task Created)" variant="outlined"></v-text-field>
              </v-col>
            </v-row>
          </v-window-item>

          <!-- Department Report Controls -->
          <v-window-item value="department">
            <v-select
              v-model="params.department"
              :items="departments"
              label="Select a Department"
              variant="outlined"
              :disabled="authStore.userRole === 'hr' || authStore.userRole === 'manager'"
            ></v-select>
          </v-window-item>

          <!-- Company Report Controls -->
          <v-window-item value="company">
             <v-row>
              <v-col cols="12" md="4">
                <v-select
                  v-model="params.department"
                  :items="allDepartmentsForFilter"
                  item-title="title"
                  item-value="value"
                  label="Filter by Department (Optional)"
                  variant="outlined"
                  clearable
                ></v-select>
              </v-col>
              <v-col cols="6" md="4">
                <v-text-field v-model="params.startDate" type="date" label="Start Date (Created)" variant="outlined"></v-text-field>
              </v-col>
              <v-col cols="6" md="4">
                <v-text-field v-model="params.endDate" type="date" label="End Date (Created)" variant="outlined"></v-text-field>
              </v-col>
            </v-row>
          </v-window-item>
        </v-window>

        <v-btn
          color="primary"
          @click="generateReport"
          :loading="loading.report"
          block
          size="large"
          class="mt-4"
          :disabled="!isGenerateButtonEnabled"
        >
          Generate Report
        </v-btn>
      </v-card-text>

      <v-divider></v-divider>

      <!-- Loading Spinner for Report -->
      <div v-if="loading.report" class="text-center pa-12">
        <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
        <p class="mt-4">Generating your report...</p>
      </div>

      <!-- Error Message -->
      <div v-if="errorMessage" class="pa-4">
        <v-alert type="error" variant="tonal" closable @click:close="errorMessage = ''">
          {{ errorMessage }}
        </v-alert>
      </div>

      <!-- 
        ========================================
        Report Display Area
        ========================================
      -->
      <div v-if="reportData && !loading.report">
        <!-- We add a 'report-content' ID wrapper for each report type for PDF export -->

        <!-- 
          =====================
          REPORT TYPE: PROJECT
          =====================
        -->
        <div v-if="reportData.type === 'project'" id="report-content" class="pa-4">
          <v-row>
            <v-col cols="12" class="d-flex justify-space-between align-center mb-4 no-export">
              <div>
                <h2 class="text-h4">{{ reportData.title }}</h2>
                <p class="text-medium-emphasis">Report generated on {{ new Date(reportData.generatedAt).toLocaleString() }}</p>
              </div>
              <v-btn id="export-button" color="primary" @click="exportToPDF" :loading="loading.exporting">
                <v-icon start>mdi-file-pdf-box</v-icon>
                Export to PDF
              </v-btn>
            </v-col>
          </v-row>
          
          <div v-if="reportData.summary.totalTasks > 0">
            <v-row class="mb-4">
              <v-col cols="4" md="2"><v-card variant="outlined" class="text-center pa-2"><div class="text-h6">{{ reportData.summary.totalTasks }}</div><div class="text-caption">Total Tasks</div></v-card></v-col>
              <v-col cols="4" md="2"><v-card variant="outlined" class="text-center pa-2"><div class="text-h6 text-info">{{ reportData.summary.statusCounts['To Do'] || 0 }}</div><div class="text-caption">To Do</div></v-card></v-col>
              <v-col cols="4" md="2"><v-card variant="outlined" class="text-center pa-2"><div class="text-h6 text-warning">{{ reportData.summary.statusCounts['Ongoing'] || 0 }}</div><div class="text-caption">Ongoing</div></v-card></v-col>
              <v-col cols="4" md="2"><v-card variant="outlined" class="text-center pa-2"><div class="text-h6 text-purple">{{ reportData.summary.statusCounts['Pending Review'] || 0 }}</div><div class="text-caption">In Review</div></v-card></v-col>
              <v-col cols="4" md="2"><v-card variant="outlined" class="text-center pa-2"><div class="text-h6 text-success">{{ reportData.summary.statusCounts['Completed'] || 0 }}</div><div class="text-caption">Completed</div></v-card></v-col>
              <v-col cols="4" md="2"><v-card variant="outlined" class="text-center pa-2" :class="{ 'border-error': reportData.summary.overdueCount > 0 }"><div class="text-h6 text-error">{{ reportData.summary.overdueCount }}</div><div class="text-caption">Overdue ({{ reportData.summary.overduePercentage }}%)</div></v-card></v-col>
            </v-row>
            <v-row>
              <v-col cols="12" md="5">
                <v-card variant="outlined">
                  <v-card-title>Task Status Overview</v-card-title>
                  <v-card-text style="min-height: 250px;"><canvas id="pie-chart"></canvas></v-card-text>
                </v-card>
              </v-col>
              <v-col cols="12" md="7">
                <v-card variant="outlined">
                  <v-card-title>Team Workload</v-card-title>
                  <v-card-text style="min-height: 250px;"><canvas id="bar-chart-workload"></canvas></v-card-text>
                </v-card>
              </v-col>
            </v-row>
            <v-card variant="outlined" class="mt-8 report-task-list">
              <v-card-title>Project Schedule</v-card-title>
              <v-card-text>
                <v-timeline side="end" density="compact">
                  <v-timeline-item
                    v-for="task in reportData.tasks"
                    :key="task.id"
                    :dot-color="getTaskColor(task)"
                    size="small"
                  >
                    <div class="d-flex justify-space-between">
                      <div>
                        <strong>{{ task.title }}</strong>
                        <div class="text-caption">{{ task.status }} - {{ task.assignedTo ? task.assignedTo.split('@')[0] : 'N/A' }}</div>
                      </div>
                      <div class="text-caption" :class="{'text-error font-weight-bold': task.isOverdue, 'text-warning': task.isAtRisk}">
                        {{ formatDate(task.dueDate) }} {{ task.isOverdue ? '(Overdue)' : (task.isAtRisk ? '(At Risk)' : '') }}
                      </div>
                    </div>
                  </v-timeline-item>
                </v-timeline>
              </v-card-text>
            </v-card>
          </div>
          <div v-else class="text-center pa-8 text-grey">
            <v-icon size="48" class="mb-2">mdi-file-question-outline</v-icon>
            <p>This project has no tasks yet.</p>
          </div>
        </div>

        <!-- 
          =====================
          REPORT TYPE: INDIVIDUAL
          =====================
        -->
        <div v-if="reportData.type === 'individual'" id="report-content" class="pa-4">
          <v-row>
            <v-col cols="12" class="d-flex justify-space-between align-center mb-4 no-export">
              <div>
                <h2 class="text-h4">{{ reportData.title }}</h2>
                <p class="text-medium-emphasis">Report generated on {{ new Date(reportData.generatedAt).toLocaleString() }}</p>
              </div>
              <v-btn id="export-button" color="primary" @click="exportToPDF" :loading="loading.exporting">
                <v-icon start>mdi-file-pdf-box</v-icon>
                Export to PDF
              </v-btn>
            </v-col>
          </v-row>
          
          <div v-if="reportData.summary.totalTasks > 0">
            <v-row>
              <v-col cols="6" md="3"><v-card variant="outlined" class="pa-4 text-center"><div class="text-h4">{{ reportData.summary.totalTasks }}</div><div class="text-caption">Total Tasks</div></v-card></v-col>
              <v-col cols="6" md="3"><v-card variant="outlined" class="pa-4 text-center"><div class="text-h4 text-success">{{ reportData.summary.completionRate }}%</div><div class="text-caption">Completion Rate</div></v-card></v-col>
              <v-col cols="6" md="3"><v-card variant="outlined" class="pa-4 text-center"><div class="text-h4 text-error">{{ reportData.summary.overdueTasks }}</div><div class="text-caption">Overdue Tasks</div></v-card></v-col>
              <v-col cols="6" md="3"><v-card variant="outlined" class="pa-4 text-center"><div class="text-h4">{{ reportData.summary.avgTimePerTask }}</div><div class="text-caption">Avg. Days / Task</div></v-card></v-col>
            </v-row>
            <v-row>
              <v-col cols="12" md="6">
                <v-card variant="outlined">
                  <v-card-title>Task Status Breakdown</v-card-title>
                  <v-card-text style="min-height: 250px;"><canvas id="individual-pie-chart"></canvas></v-card-text>
                </v-card>
              </v-col>
              <v-col cols="12" md="6">
                <v-card variant="outlined">
                  <v-card-title>Longest Completed Tasks (Top 10)</v-card-title>
                  <v-card-text style="min-height: 250px; max-height: 300px; overflow-y: auto;">
                    <v-list v-if="reportData.timeBreakdown.length > 0">
                      <v-list-item
                        v-for="item in reportData.timeBreakdown"
                        :key="item.id"
                        :title="item.title"
                        :subtitle="`${item.daysTaken} days`"
                      ></v-list-item>
                    </v-list>
                    <div v-else class="text-center pa-8 text-grey">No completed tasks with time data.</div>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
          </div>
          <div v-else class="text-center pa-8 text-grey">
            <v-icon size="48" class="mb-2">mdi-account-search-outline</v-icon>
            <p>No tasks found for this employee in the selected range.</p>
          </div>
        </div>
        
        <!-- 
          =====================
          REPORT TYPE: DEPARTMENT (HR / Manager)
          =====================
        -->
        <div v-if="reportData.type === 'department'" id="report-content" class="pa-4">
          <v-row>
            <v-col cols="12" class="d-flex justify-space-between align-center mb-4 no-export">
              <div>
                <h2 class="text-h4">{{ reportData.title }}</h2>
                <p class="text-medium-emphasis">Report generated on {{ new Date(reportData.generatedAt).toLocaleString() }}</p>
              </div>
              <v-btn id="export-button" color="primary" @click="exportToPDF" :loading="loading.exporting">
                <v-icon start>mdi-file-pdf-box</v-icon>
                Export to PDF
              </v-btn>
            </v-col>
          </v-row>

          <div v-if="reportData.totalTasks > 0">
            <v-card variant="outlined">
              <v-card-title>Workload Distribution (Stacked)</v-card-title>
              <v-card-text style="min-height: 300px;"><canvas id="bar-chart-stacked"></canvas></v-card-text>
            </v-card>
            <v-card variant="outlined" class="mt-8">
              <v-card-title>Employee Task Breakdown</v-card-title>
              <v-data-table
                :headers="deptReportHeaders"
                :items="deptReportItems"
                item-key="name"
                :show-expand="true"
                class="report-task-list"
              >
                <template #expanded-row="{ item, columns }">
                  <tr>
                    <td :colspan="columns.length" class="pa-0">
                      <v-card flat color="grey-lighten-4">
                        <v-card-text>
                          <v-table dense>
                            <thead>
                              <tr><th>Project</th><th>Task Title</th><th>Due Date</th><th>Priority</th><th>Status</th></tr>
                            </thead>
                            <tbody>
                              <tr v-for="task in item.raw.tasks" :key="task.id">
                                <td>{{ task.projectName }}</td>
                                <td>{{ task.title }}</td>
                                <td>{{ formatDate(task.dueDate) }}</td>
                                <td>{{ task.priority || 'N/A' }}</td>
                                <td><v-chip size="small" :color="getTaskColor(task)">{{ task.status }}</v-chip></td>
                              </tr>
                              <tr v-if="item.raw.tasks.length === 0">
                                <td colspan="5" class="text-center text-grey">No tasks assigned.</td>
                              </tr>
                            </tbody>
                          </v-table>
                        </v-card-text>
                      </v-card>
                    </td>
                  </tr>
                </template>
              </v-data-table>
            </v-card>
          </div>
          <div v-else class="text-center pa-8 text-grey">
            <v-icon size="48" class="mb-2">mdi-domain-off</v-icon>
            <p>No tasks found for this department.</p>
          </div>
        </div>

        <!-- 
          =====================
          REPORT TYPE: COMPANY (Director)
          =====================
        -->
        <div v-if="reportData.type === 'company'" id="report-content" class="pa-4">
          <v-row>
            <v-col cols="12" class="d-flex justify-space-between align-center mb-4 no-export">
              <div>
                <h2 class="text-h4">{{ reportData.title }}</h2>
                <p class="text-medium-emphasis">Report generated on {{ new Date(reportData.generatedAt).toLocaleString() }}</p>
              </div>
              <v-btn id="export-button" color="primary" @click="exportToPDF" :loading="loading.exporting">
                <v-icon start>mdi-file-pdf-box</v-icon>
                Export to PDF
              </v-btn>
            </v-col>
          </v-row>
          
          <div v-if="reportData.summary.totalTasks > 0">
            <v-row>
              <v-col cols="6" md="3"><v-card variant="outlined" class="pa-4 text-center"><div class="text-h4">{{ reportData.summary.totalTasks }}</div><div class="text-caption">Total Tasks</div></v-card></v-col>
              <v-col cols="6" md="3"><v-card variant="outlined" class="pa-4 text-center"><div class="text-h4 text-error">{{ reportData.summary.totalOverdue }}</div><div class="text-caption">Overdue Tasks</div></v-card></v-col>
              <v-col cols="6" md="3"><v-card variant="outlined" class="pa-4 text-center"><div class="text-h4 text-error">{{ reportData.summary.overdueRate }}%</div><div class="text-caption">Overdue Rate</div></v-card></v-col>
              <v-col cols="6" md="3"><v-card variant="outlined" class="pa-4 text-center"><div class="text-h4 text-success">{{ reportData.summary.statusCounts['Completed'] || 0 }}</div><div class="text-caption">Completed</div></v-card></v-col>
            </v-row>
            <v-row>
              <v-col cols="12" md="6">
                <v-card variant="outlined">
                  <v-card-title>Overall Status Distribution</v-card-title>
                  <v-card-text style="min-height: 300px;"><canvas id="company-pie-chart"></canvas></v-card-text>
                </v-card>
              </v-col>
              <v-col cols="12" md="6">
                <v-card variant="outlined">
                  <v-card-title>Tasks by Department</v-card-title>
                  <v-card-text style="min-height: 300px;"><canvas id="company-bar-chart"></canvas></v-card-text>
                </v-card>
              </v-col>
            </v-row>
            <v-card variant="outlined" class="mt-8">
              <v-card-title>Performance by Department</v-card-title>
              <v-data-table
                :headers="companyReportHeaders"
                :items="companyReportItems"
                item-key="name"
              ></v-data-table>
            </v-card>
          </div>
          <div v-else class="text-center pa-8 text-grey">
            <v-icon size="48" class="mb-2">mdi-file-cancel-outline</v-icon>
            <p>No task data found for the selected filters.</p>
          </div>
        </div>

      </div>
    </v-card>
  </v-container>
</template>

<script setup>
import { ref, watch, nextTick, computed, onMounted } from 'vue';
import Chart from 'chart.js/auto';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useAuthStore } from '@/stores/auth';
import { db } from '@/config/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import SPMLogo from '@/assets/SPM.png';

const authStore = useAuthStore();
const selectedReportType = ref(null);
const reportData = ref(null);
const errorMessage = ref('');

// --- State for Selectors ---
const projects = ref([]);
const employees = ref([]);
const departments = ref([]); // For HR/Manager dropdown
const allDepartmentsForFilter = ref([{ title: 'All Departments', value: 'ALL' }]);

const params = ref({
  projectId: null,
  employeeEmail: null,
  department: null,
  startDate: null,
  endDate: null,
});

const loading = ref({
  projects: false,
  employees: false,
  report: false,
  exporting: false,
});

let activeChart = null;
let activeChart2 = null; // For pages with two charts

// --- RBAC: Control what tabs are visible ---
const rbac = computed(() => {
  const role = authStore.userRole?.toLowerCase();
  return {
    canViewProject: ['staff', 'manager', 'director'].includes(role),
    canViewIndividual: ['staff', 'manager', 'director', 'hr'].includes(role),
    canViewDepartment: ['manager', 'director', 'hr'].includes(role),
    canViewCompany: role === 'director',
  };
});

const hasMultipleReportTypes = computed(() => {
  return [rbac.value.canViewProject, rbac.value.canViewIndividual, rbac.value.canViewDepartment, rbac.value.canViewCompany].filter(Boolean).length > 1;
});

// Set default tab based on role
watch(() => authStore.userRole, (newRole) => {
  if (newRole) {
    params.value = { projectId: null, employeeEmail: null, department: null, startDate: null, endDate: null };
    reportData.value = null;

    if (rbac.value.canViewProject) selectedReportType.value = 'project';
    else if (rbac.value.canViewIndividual) selectedReportType.value = 'individual';
    else if (rbac.value.canViewDepartment) selectedReportType.value = 'department';
    else if (rbac.value.canViewCompany) selectedReportType.value = 'company';
  }
}, { immediate: true });

const isGenerateButtonEnabled = computed(() => {
  switch (selectedReportType.value) {
    case 'project': return !!params.value.projectId;
    case 'individual': return !!params.value.employeeEmail;
    case 'department': return !!params.value.department;
    case 'company': return true;
    default: return false;
  }
});

// --- Data Fetching for Selectors (FIXED) ---
async function fetchSelectorData() {
  const role = authStore.userRole;
  const email = authStore.userEmail;
  const department = authStore.userDepartment; // From authStore
  
  if (!email || !role) return;

  try {
    if (rbac.value.canViewProject) {
      loading.value.projects = true;
      let projQuery = query(collection(db, 'projects'));
      if (role === 'staff' || role === 'manager') {
        projQuery = query(projQuery, where('members', 'array-contains', email));
      }
      const pSnapshot = await getDocs(projQuery);
      projects.value = pSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      loading.value.projects = false;
    }

    if (rbac.value.canViewIndividual) {
      loading.value.employees = true;
      let empQuery = query(collection(db, 'Users'));
      // Only filter by department if the role is manager/hr AND department is defined
      if ((role === 'manager' || role === 'hr') && department) {
        empQuery = query(empQuery, where('department', '==', department));
      } else if (role === 'staff') {
        empQuery = query(empQuery, where('email', '==', email));
        params.value.employeeEmail = email;
      }
      const eSnapshot = await getDocs(empQuery);
      employees.value = eSnapshot.docs.map(doc => ({ email: doc.id, name: doc.data().name || doc.id, ...doc.data() }));
      loading.value.employees = false;
    }

    if (rbac.value.canViewDepartment || rbac.value.canViewCompany) {
      const usersSnapshot = await getDocs(query(collection(db, 'Users')));
      const depts = new Set(usersSnapshot.docs.map(doc => doc.data().department).filter(Boolean));
      if (department) depts.add(department);
      
      departments.value = [...depts];
      allDepartmentsForFilter.value = [{ title: 'All Departments', value: 'ALL' }, ...depts];
      if ((role === 'hr' || role === 'manager') && department) {
        params.value.department = department;
      }
    }
  } catch (err) {
    console.error("Error fetching selector data:", err);
    errorMessage.value = "Failed to load initial data. " + err.message;
  }
}

// Watch for auth to be ready, then fetch selector data
watch(() => authStore.loading, (isLoading) => {
  if (!isLoading && authStore.userEmail) {
    fetchSelectorData();
  }
}, { immediate: true });

// --- Report Generation (FIXED) ---
async function generateReport() {
  loading.value.report = true;
  reportData.value = null;
  errorMessage.value = '';
  destroyCharts();

  try {
    // Get the token from the auth store
    const token = await authStore.getToken(); 
    if (!token) throw new Error("Authentication token not found. Please log in again.");
    
    const headers = { 'Authorization': `Bearer ${token}` };
    let url = '/api/reports/';
    let queryParams = new URLSearchParams({ requesterId: authStore.userEmail }); // requesterId is used by backend
    
    const reportType = selectedReportType.value;
    if (reportType === 'project') {
      if (!params.value.projectId) throw new Error("Please select a project.");
      url += `project/${params.value.projectId}`;
    } else if (reportType === 'individual') {
      if (!params.value.employeeEmail) throw new Error("Please select an employee.");
      queryParams.append('employeeEmail', params.value.employeeEmail);
      if (params.value.startDate) queryParams.append('startDate', params.value.startDate);
      if (params.value.endDate) queryParams.append('endDate', params.value.endDate);
      url += 'individual';
    } else if (reportType === 'department') {
      if (!params.value.department) throw new Error("Please select a department.");
      queryParams.append('department', params.value.department);
      url += 'department';
    } else if (reportType === 'company') {
      if (params.value.department && params.value.department !== 'ALL') {
        queryParams.append('department', params.value.department);
      }
      if (params.value.startDate) queryParams.append('startDate', params.value.startDate);
      if (params.value.endDate) queryParams.append('endDate', params.value.endDate);
      url += 'company';
    }

    const response = await fetch(`${url}?${queryParams.toString()}`, { headers });
    const data = await response.json();
    
    if (data.success) {
      reportData.value = { ...data.report, type: reportType, title: getReportTitle(data.report) };
      await nextTick();
      renderVisualizations();
    } else {
      throw new Error(data.message);
    }
  } catch (error) {
    console.error("Error generating report:", error);
    errorMessage.value = error.message;
  } finally {
    loading.value.report = false;
  }
}

function getReportTitle(report) {
  switch (selectedReportType.value) {
    case 'project': return report.projectName || "Project Report";
    case 'department': return report.title || "Department Report";
    case 'individual': return report.title || `Report for ${report.employee?.name || 'Employee'}`;
    case 'company': return report.title || "Company Report";
    default: return "Report";
  }
}

function destroyCharts() {
  if (activeChart) activeChart.destroy();
  if (activeChart2) activeChart2.destroy();
  activeChart = null;
  activeChart2 = null;
}

// --- Visualization Rendering (FIXED) ---
function renderVisualizations() {
  destroyCharts(); 
  if (!reportData.value) return;
  
  const type = reportData.value.type;

  // Use nextTick to ensure canvas elements are available
  nextTick(() => {
    try {
      if (type === 'project') renderProjectCharts();
      else if (type === 'individual') renderIndividualCharts();
      else if (type === 'department') renderDepartmentCharts();
      else if (type === 'company') renderCompanyCharts();
    } catch (e) {
      console.error("Chart rendering error:", e);
      errorMessage.value = "Failed to render visualizations.";
    }
  });
}

const statusColors = {
  'To Do': '#42A5F5',
  'Ongoing': '#FFA726',
  'Pending Review': '#B39DDB',
  'Completed': '#66BB6A',
};
const chartBGColors = [statusColors['To Do'], statusColors['Ongoing'], statusColors['Pending Review'], statusColors['Completed']];

function renderProjectCharts() {
  const summary = reportData.value.summary;
  const pieCtx = document.getElementById('pie-chart')?.getContext('2d');
  if (pieCtx && summary.totalTasks > 0) {
    activeChart = new Chart(pieCtx, {
      type: 'pie',
      data: {
        labels: Object.keys(summary.statusCounts),
        datasets: [{ data: Object.values(summary.statusCounts), backgroundColor: chartBGColors }]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
  }
  const barCtx = document.getElementById('bar-chart-workload')?.getContext('2d');
  if (barCtx && summary.totalTasks > 0 && Object.keys(summary.memberWorkload).length > 0) {
    activeChart2 = new Chart(barCtx, {
      type: 'bar',
      data: {
        labels: Object.keys(summary.memberWorkload).map(email => summary.memberNames[email] || email.split('@')[0]),
        datasets: [{ label: 'Number of Tasks', data: Object.values(summary.memberWorkload), backgroundColor: '#7E57C2' }]
      },
      options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
    });
  }
}

function renderIndividualCharts() {
  const summary = reportData.value.summary;
  const pieCtx = document.getElementById('individual-pie-chart')?.getContext('2d');
  if (pieCtx && summary.totalTasks > 0) {
    activeChart = new Chart(pieCtx, {
      type: 'pie',
      data: {
        labels: Object.keys(summary.statusCounts),
        datasets: [{ data: Object.values(summary.statusCounts), backgroundColor: chartBGColors }]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
  }
}

function renderDepartmentCharts() {
  const workloadData = reportData.value.employeeWorkloads;
  const labels = Object.values(workloadData).map(e => e.name);
  const datasets = [
    { label: 'Ongoing', data: Object.values(workloadData).map(e => e['Ongoing'] || 0), backgroundColor: statusColors['Ongoing'] },
    { label: 'Pending Review', data: Object.values(workloadData).map(e => e['Pending Review'] || 0), backgroundColor: statusColors['Pending Review'] },
    { label: 'To Do', data: Object.values(workloadData).map(e => e['To Do'] || 0), backgroundColor: statusColors['To Do'] },
    { label: 'Completed', data: Object.values(workloadData).map(e => e['Completed'] || 0), backgroundColor: statusColors['Completed'] }
  ];
  
  const barCtx = document.getElementById('bar-chart-stacked')?.getContext('2d');
  if (barCtx) {
    activeChart = new Chart(barCtx, {
      type: 'bar',
      data: { labels, datasets },
      options: {
        responsive: true, maintainAspectRatio: false,
        scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true, ticks: { stepSize: 1 } } }
      }
    });
  }
}

function renderCompanyCharts() {
  const summary = reportData.value.summary;
  const pieCtx = document.getElementById('company-pie-chart')?.getContext('2d');
  if (pieCtx && summary.totalTasks > 0) {
    activeChart = new Chart(pieCtx, {
      type: 'pie',
      data: {
        labels: Object.keys(summary.statusCounts),
        datasets: [{ data: Object.values(summary.statusCounts), backgroundColor: chartBGColors }]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
  }
  const barCtx = document.getElementById('company-bar-chart')?.getContext('2d');
  if (barCtx && summary.totalTasks > 0) {
    activeChart2 = new Chart(barCtx, {
      type: 'bar',
      data: {
        labels: reportData.value.departmentStats.map(s => s.name),
        datasets: [{ label: 'Number of Tasks', data: reportData.value.departmentStats.map(s => s.total), backgroundColor: '#7E57C2' }]
      },
      options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
    });
  }
}

// --- PDF Export (FIXED) ---
async function exportToPDF() {
  loading.value.exporting = true;
  // Find the single, visible report-content div
  const sourceEl = document.querySelector('#report-content');
  if (!sourceEl) { loading.value.exporting = false; return; }

  const cloneWrapper = document.createElement('div');
  cloneWrapper.style.position = 'fixed';
  cloneWrapper.style.left = '-99999px';
  cloneWrapper.style.top = '0';
  cloneWrapper.style.width = '900px'; 
  cloneWrapper.style.background = '#ffffff';
  cloneWrapper.style.padding = '20px';

  const logoDiv = document.createElement('div');
  logoDiv.style.textAlign = 'center';
  logoDiv.style.marginBottom = '20px';
  const img = document.createElement('img');
  img.src = SPMLogo;
  img.style.maxWidth = '200px';
  logoDiv.appendChild(img);
  cloneWrapper.appendChild(logoDiv);

  const reportClone = sourceEl.cloneNode(true);
  reportClone.querySelectorAll('.no-export').forEach(el => el.style.display = 'none');
  reportClone.querySelectorAll('.v-data-table__progress').forEach(el => el.remove());
  cloneWrapper.appendChild(reportClone);
  
  document.body.appendChild(cloneWrapper);

  try {
    // Re-render charts on the *clone* canvas elements
    if (reportData.value) {
      const type = reportData.value.type;
      const mainChartConfig = activeChart ? activeChart.config : null;
      const secondChartConfig = activeChart2 ? activeChart2.config : null;

      // This logic ensures the correct chart config is applied to the correct clone canvas
      if (type === 'project' && mainChartConfig && secondChartConfig) {
        new Chart(cloneWrapper.querySelector('#pie-chart').getContext('2d'), mainChartConfig);
        new Chart(cloneWrapper.querySelector('#bar-chart-workload').getContext('2d'), secondChartConfig);
      } else if (type === 'individual' && mainChartConfig) {
        new Chart(cloneWrapper.querySelector('#individual-pie-chart').getContext('2d'), mainChartConfig);
      } else if (type === 'department' && mainChartConfig) {
        new Chart(cloneWrapper.querySelector('#bar-chart-stacked').getContext('2d'), mainChartConfig);
      } else if (type === 'company' && mainChartConfig && secondChartConfig) {
         new Chart(cloneWrapper.querySelector('#company-pie-chart').getContext('2d'), mainChartConfig);
         new Chart(cloneWrapper.querySelector('#company-bar-chart').getContext('2d'), secondChartConfig);
      }
    }

    await new Promise(resolve => setTimeout(resolve, 500)); // Ensure charts render
    
    const canvas = await html2canvas(cloneWrapper, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const margin = 10;
    const pdfWidth = pdf.internal.pageSize.getWidth() - (margin * 2);
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    
    pdf.addImage(imgData, 'PNG', margin, margin, pdfWidth, pdfHeight);
    pdf.save(`${reportData.value.title}_Report.pdf`);
  } catch (error) {
    console.error("Error generating PDF:", error);
  } finally {
    document.body.removeChild(cloneWrapper);
    loading.value.exporting = false;
  }
}

// --- Table Headers (for v-data-table) ---
const deptReportHeaders = [
  { title: 'Employee', key: 'name', sortable: true },
  { title: 'Ongoing', key: 'Ongoing', sortable: true },
  { title: 'Pending Review', key: 'Pending Review', sortable: true },
  { title: 'Completed', key: 'Completed', sortable: true },
  { title: 'To Do', key: 'To Do', sortable: true },
  { title: 'Total', key: 'Total', sortable: true },
  { title: 'Overdue', key: 'Overdue', sortable: true },
  { title: '', key: 'data-table-expand', sortable: false }, // For expand button
];
const deptReportItems = computed(() => {
  if (reportData.value?.type !== 'department') return [];
  // We must return the raw object for the expand slot to work
  return Object.values(reportData.value.employeeWorkloads).map(item => ({ ...item, raw: item }));
});

const companyReportHeaders = [
  { title: 'Department', key: 'name', sortable: true },
  { title: 'Total Tasks', key: 'total', sortable: true },
  { title: 'Completed', key: 'completed', sortable: true },
  { title: 'Overdue', key: 'overdue', sortable: true },
  { title: 'Completion %', key: 'completionRate', sortable: true },
  { title: 'Overdue %', key: 'overdueRate', sortable: true },
];
const companyReportItems = computed(() => {
  if (reportData.value?.type !== 'company') return [];
  return Object.values(reportData.value.departmentStats).map(stats => ({
    ...stats,
    completionRate: `${stats.completionRate}%`,
    overdueRate: `${stats.overdueRate}%`,
  }));
});

// Helper for timeline date formatting
function formatDate(timestamp) {
  if (!timestamp) return 'No due date';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('en-SG', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
// Helper for timeline dot color
function getTaskColor(task) {
  if (task.isOverdue) return 'error';
  if (task.isAtRisk) return 'warning';
  if (task.status === 'Completed') return 'success';
  return 'grey';
}
</script>

<style scoped>
.report-task-list {
  overflow: hidden;
  /* Use theme surface color */
  background-color: rgb(var(--v-theme-surface)); 
}
/* Ensure canvas is responsive */
canvas {
  max-width: 100%;
  height: auto;
  min-height: 250px; /* Ensure a minimum height for charts */
}
.border-error {
  border: 1px solid rgb(var(--v-theme-error)) !important;
}

/* Fix for v-table inside expanded row */
:deep(.v-data-table__expanded-content) {
  padding: 0 !important;
  box-shadow: inset 0 3px 5px -5px rgba(0,0,0,0.3);
}
:deep(.v-table) {
  width: 100%;
  border-collapse: collapse;
}
:deep(.v-table th),
:deep(.v-table td) {
  border-bottom: 1px solid #e0e0e0;
  padding: 8px 16px !important;
}
:deep(.v-table th) {
  background: #f7f7fa;
  font-weight: 600;
  color: #555;
}

/* Class to hide elements from PDF export */
.no-export {
  /* This class is referenced in the PDF export logic */
}

/* --- MOBILE FRIENDLY FIX --- */
/* Makes data tables scroll horizontally on small screens */
:deep(.v-data-table) {
  display: block;
  width: 100%;
  overflow-x: auto;
}
</style>

