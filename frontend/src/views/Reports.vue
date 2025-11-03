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
      <!-- Desktop: Use tabs with grow, Mobile: Stack in grid -->
      <div class="report-type-tabs-wrapper">
        <v-tabs 
          v-model="selectedReportType" 
          color="primary" 
          :grow="isDesktop"
          class="report-type-tabs"
        >
          <v-tab v-if="rbac.canViewProject" value="project">
            <span class="tab-label-full">Project Schedule</span>
            <span class="tab-label-short">Project</span>
          </v-tab>
          <v-tab v-if="rbac.canViewIndividual" value="individual">
            <span class="tab-label-full">Individual Performance</span>
            <span class="tab-label-short">Individual</span>
          </v-tab>
          <v-tab v-if="rbac.canViewDepartment" value="department">
            <span class="tab-label-full">Department Workload</span>
            <span class="tab-label-short">Department</span>
          </v-tab>
          <v-tab v-if="rbac.canViewCompany" value="company">
            <span class="tab-label-full">Company Performance</span>
            <span class="tab-label-short">Company</span>
          </v-tab>
      </v-tabs>
      </div>
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
                <v-text-field 
                  v-model="params.startDate" 
                  type="date" 
                  label="Start Date (Task Created)" 
                  variant="outlined"
                  :max="params.endDate || undefined"
                ></v-text-field>
            </v-col>
              <v-col cols="6" md="3">
                <v-text-field 
                  v-model="params.endDate" 
                  type="date" 
                  label="End Date (Task Created)" 
                  variant="outlined"
                  :min="params.startDate || undefined"
                  :error-messages="dateValidationMessage"
                ></v-text-field>
              </v-col>
            </v-row>
            <v-row v-if="!areDatesValid">
              <v-col cols="12">
                <v-alert type="error" variant="tonal" density="compact">
                  <strong>Invalid Date Range:</strong> End date cannot be earlier than start date. Please select valid dates.
                </v-alert>
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
                  v-model="params.selectedDepartments"
                  :items="allDepartmentsForFilter"
                  item-title="title"
                  item-value="value"
                  label="Filter by Department(s)"
                  variant="outlined"
                  multiple
                  chips
                  closable-chips
                >
                  <template #selection="{ item: deptValue, index }">
                    <v-chip
                      v-if="index < 2"
                      :key="index"
                      closable
                      @click:close="removeDepartment(deptValue)"
                    >
                      {{ getDepartmentTitle(deptValue) }}
                    </v-chip>
                    <span
                      v-else-if="index === 2"
                      class="text-grey text-caption align-self-center"
                    >
                      (+{{ params.selectedDepartments.length - 2 }} others)
                    </span>
                  </template>
                </v-select>
            </v-col>
              <v-col cols="6" md="4">
                <v-text-field 
                  v-model="params.startDate" 
                  type="date" 
                  label="Start Date (Created)" 
                  variant="outlined"
                  :max="params.endDate || undefined"
                ></v-text-field>
            </v-col>
              <v-col cols="6" md="4">
                <v-text-field 
                  v-model="params.endDate" 
                  type="date" 
                  label="End Date (Created)" 
                  variant="outlined"
                  :min="params.startDate || undefined"
                  :error-messages="dateValidationMessage"
                ></v-text-field>
              </v-col>
            </v-row>
            <v-row v-if="params.selectedDepartments && params.selectedDepartments.includes('ALL') && params.selectedDepartments.length > 1">
              <v-col cols="12">
                <v-alert 
                  type="error" 
                  variant="tonal" 
                  density="compact"
                  class="department-warning-alert"
                >
                  <strong class="warning-alert-title">Invalid Selection:</strong> 
                  <span class="warning-alert-text">"All Departments" includes all departments. Please remove it if you want to filter by specific departments, or remove other departments if you want to see all.</span>
                </v-alert>
              </v-col>
            </v-row>
            <v-row v-if="!areDatesValid">
              <v-col cols="12">
                <v-alert type="error" variant="tonal" density="compact">
                  <strong>Invalid Date Range:</strong> End date cannot be earlier than start date. Please select valid dates.
                </v-alert>
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
            <v-col cols="12" class="report-header mb-4 no-export">
              <div class="report-header-content">
                <div class="report-title-section">
                  <h2 class="text-h4 report-title">{{ reportData.title }}</h2>
                  <p class="text-medium-emphasis report-subtitle">Report generated on {{ new Date(reportData.generatedAt).toLocaleString() }}</p>
                        </div>
                <v-btn id="export-button" color="primary" @click="exportToPDF" :loading="loading.exporting" size="small">
                  <v-icon start>mdi-file-pdf-box</v-icon>
                  <span class="export-btn-text">Export PDF</span>
                </v-btn>
                      </div>
            </v-col>
          </v-row>

          <div v-if="reportData.summary.totalTasks > 0">
            <v-row class="mb-4">
              <v-col cols="6" sm="4" md="2"><v-card variant="outlined" class="text-center pa-2 metric-card"><div class="text-h6">{{ reportData.summary.totalTasks }}</div><div class="text-caption">Total Tasks</div></v-card></v-col>
              <v-col cols="6" sm="4" md="2"><v-card variant="outlined" class="text-center pa-2 metric-card"><div class="text-h6 text-info">{{ reportData.summary.statusCounts['To Do'] || 0 }}</div><div class="text-caption">To Do</div></v-card></v-col>
              <v-col cols="6" sm="4" md="2"><v-card variant="outlined" class="text-center pa-2 metric-card"><div class="text-h6 text-warning">{{ reportData.summary.statusCounts['Ongoing'] || 0 }}</div><div class="text-caption">Ongoing</div></v-card></v-col>
              <v-col cols="6" sm="4" md="2"><v-card variant="outlined" class="text-center pa-2 metric-card"><div class="text-h6 text-purple">{{ reportData.summary.statusCounts['Pending Review'] || 0 }}</div><div class="text-caption">In Review</div></v-card></v-col>
              <v-col cols="6" sm="4" md="2"><v-card variant="outlined" class="text-center pa-2 metric-card"><div class="text-h6 text-success">{{ reportData.summary.statusCounts['Completed'] || 0 }}</div><div class="text-caption">Completed</div></v-card></v-col>
              <v-col cols="6" sm="4" md="2"><v-card variant="outlined" class="text-center pa-2 metric-card" :class="{ 'border-error': reportData.summary.overdueCount > 0 }"><div class="text-h6 text-error">{{ reportData.summary.overdueCount || 0 }}</div><div class="text-caption">Overdue ({{ reportData.summary.overduePercentage || 0 }}%)</div></v-card></v-col>
            </v-row>
          <v-row>
            <v-col cols="12" md="5">
                <v-card variant="outlined" class="chart-card">
                <v-card-title>Task Status Overview</v-card-title>
                <v-card-text>
                    <div class="chart-container">
                      <canvas id="pie-chart"></canvas>
                  </div>
                </v-card-text>
              </v-card>
            </v-col>
              <v-col cols="12" md="7">
                <v-card variant="outlined" class="chart-card">
                <v-card-title>Team Workload</v-card-title>
                <v-card-text>
                    <div class="chart-container">
                      <canvas id="bar-chart-workload"></canvas>
                  </div>
                </v-card-text>
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

          <v-row>
            <v-col cols="6" sm="6" md="3"><v-card variant="outlined" class="pa-3 text-center metric-card"><div class="text-h5 text-md-h4">{{ reportData.summary?.totalTasks || 0 }}</div><div class="text-caption">Total Tasks</div></v-card></v-col>
            <v-col cols="6" sm="6" md="3"><v-card variant="outlined" class="pa-3 text-center metric-card"><div class="text-h5 text-md-h4 text-success">{{ reportData.summary?.completionRate || 0 }}%</div><div class="text-caption">Completion Rate</div></v-card></v-col>
            <v-col cols="6" sm="6" md="3"><v-card variant="outlined" class="pa-3 text-center metric-card"><div class="text-h5 text-md-h4 text-error">{{ reportData.summary?.overdueTasks || 0 }}</div><div class="text-caption">Overdue Tasks</div></v-card></v-col>
            <v-col cols="6" sm="6" md="3"><v-card variant="outlined" class="pa-3 text-center metric-card"><div class="text-h5 text-md-h4">{{ reportData.summary?.avgTimePerTask || 0 }}</div><div class="text-caption">Avg. Days / Task</div></v-card></v-col>
          </v-row>
          <v-row v-if="reportData.summary && reportData.summary.totalTasks > 0" class="mb-4">
            <v-col cols="6" sm="3" md="3"><v-card variant="outlined" class="pa-2 text-center metric-card"><div class="text-h6 text-info">{{ reportData.summary?.statusCounts?.['To Do'] || 0 }}</div><div class="text-caption">To Do</div></v-card></v-col>
            <v-col cols="6" sm="3" md="3"><v-card variant="outlined" class="pa-2 text-center metric-card"><div class="text-h6 text-warning">{{ reportData.summary?.statusCounts?.['Ongoing'] || 0 }}</div><div class="text-caption">Ongoing</div></v-card></v-col>
            <v-col cols="6" sm="3" md="3"><v-card variant="outlined" class="pa-2 text-center metric-card"><div class="text-h6 text-purple">{{ reportData.summary?.statusCounts?.['Pending Review'] || 0 }}</div><div class="text-caption">Under Review</div></v-card></v-col>
            <v-col cols="6" sm="3" md="3"><v-card variant="outlined" class="pa-2 text-center metric-card"><div class="text-h6 text-success">{{ reportData.summary?.statusCounts?.['Completed'] || 0 }}</div><div class="text-caption">Completed</div></v-card></v-col>
          </v-row>
          <v-row v-if="reportData.summary && reportData.summary.totalTasks > 0">
            <v-col cols="12" md="6">
                <v-card variant="outlined" class="chart-card">
                <v-card-title>Task Status Breakdown</v-card-title>
                <v-card-text>
                    <div class="chart-container">
                      <canvas id="individual-pie-chart"></canvas>
                  </div>
                </v-card-text>
              </v-card>
            </v-col>
            <v-col cols="12" md="6">
                <v-card variant="outlined" class="chart-card">
                  <v-card-title>Longest Completed Tasks (Top 10)</v-card-title>
                  <v-card-text style="min-height: 250px; max-height: 300px; overflow-y: auto;">
                    <v-list v-if="reportData && reportData.timeBreakdown && reportData.timeBreakdown.length > 0">
                    <v-list-item
                        v-for="item in reportData.timeBreakdown"
                        :key="item.id || item.taskId"
                        :title="item.title || item.taskTitle || 'Untitled Task'"
                        :subtitle="`${item.daysTaken || 0} days`"
                    ></v-list-item>
                  </v-list>
                    <div v-else class="text-center pa-8 text-grey">No completed tasks with time data.</div>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
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
            <v-card variant="outlined" class="chart-card">
              <v-card-title>Workload Distribution (Stacked)</v-card-title>
                <v-card-text>
                <div class="chart-container">
                  <canvas id="bar-chart-stacked"></canvas>
                  </div>
                </v-card-text>
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
              <v-col cols="6" sm="6" md="3"><v-card variant="outlined" class="pa-3 text-center metric-card"><div class="text-h5 text-md-h4">{{ reportData.summary.totalTasks }}</div><div class="text-caption">Total Tasks</div></v-card></v-col>
              <v-col cols="6" sm="6" md="3"><v-card variant="outlined" class="pa-3 text-center metric-card"><div class="text-h5 text-md-h4 text-error">{{ reportData.summary.overdueCount || 0 }}</div><div class="text-caption">Overdue Tasks</div></v-card></v-col>
              <v-col cols="6" sm="6" md="3"><v-card variant="outlined" class="pa-3 text-center metric-card"><div class="text-h5 text-md-h4 text-error">{{ reportData.summary.overduePercentage || 0 }}%</div><div class="text-caption">Overdue Rate</div></v-card></v-col>
              <v-col cols="6" sm="6" md="3"><v-card variant="outlined" class="pa-3 text-center metric-card"><div class="text-h5 text-md-h4 text-success">{{ reportData.summary.statusCounts['Completed'] || 0 }}</div><div class="text-caption">Completed</div></v-card></v-col>
          </v-row>
          <v-row>
            <v-col cols="12" md="6">
                <v-card variant="outlined" class="chart-card">
                  <v-card-title>Overall Status Distribution</v-card-title>
                <v-card-text>
                    <div class="chart-container">
                      <canvas id="company-pie-chart"></canvas>
                  </div>
                </v-card-text>
              </v-card>
            </v-col>
            <v-col cols="12" md="6">
                <v-card variant="outlined" class="chart-card">
                <v-card-title>Tasks by Department</v-card-title>
                 <v-card-text>
                    <div class="chart-container">
                      <canvas id="company-bar-chart"></canvas>
                  </div>
                </v-card-text>
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
import { useDisplay } from 'vuetify';
import Chart from 'chart.js/auto';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useAuthStore } from '@/stores/auth';
import SPMLogo from '@/assets/SPM.png';

const authStore = useAuthStore();
const display = useDisplay();
const isDesktop = computed(() => display.mdAndUp.value);
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
  selectedDepartments: ['ALL'], // For company report multi-select
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
    canViewCompany: role === 'director' || role === 'hr', // HR can view company reports for KPI tracking
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

function getDepartmentTitle(value) {
  const dept = allDepartmentsForFilter.value.find(d => d.value === value);
  return dept ? dept.title : value;
}

function removeDepartment(deptValue) {
  const index = params.value.selectedDepartments.indexOf(deptValue);
  if (index > -1) {
    params.value.selectedDepartments.splice(index, 1);
    // Ensure at least one department is selected
    if (params.value.selectedDepartments.length === 0) {
      params.value.selectedDepartments = ['ALL'];
    }
  }
}

// Computed property for date validation message
const dateValidationMessage = computed(() => {
  if (params.value.startDate && params.value.endDate) {
    const startDate = new Date(params.value.startDate);
    const endDate = new Date(params.value.endDate);
    if (endDate < startDate) {
      return 'End date cannot be earlier than start date';
    }
  }
  return '';
});

// Computed property to check if dates are valid
const areDatesValid = computed(() => {
  if (!params.value.startDate || !params.value.endDate) {
    return true; // Valid if one or both are empty (optional fields)
  }
  const startDate = new Date(params.value.startDate);
  const endDate = new Date(params.value.endDate);
  return endDate >= startDate;
});

const isGenerateButtonEnabled = computed(() => {
  // First check date validity
  if (!areDatesValid.value) {
    return false;
  }
  
  switch (selectedReportType.value) {
    case 'project': return !!params.value.projectId;
    case 'individual': return !!params.value.employeeEmail;
    case 'department': return !!params.value.department;
    case 'company': 
      // Block generation if "ALL" is selected with other departments
      if (!params.value.selectedDepartments || params.value.selectedDepartments.length === 0) {
        return false;
      }
      // If "ALL" is selected, it must be the only selection
      if (params.value.selectedDepartments.includes('ALL') && params.value.selectedDepartments.length > 1) {
        return false;
      }
      return true;
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
      // Use API endpoint instead of direct Firestore query to avoid permission issues
    const token = await authStore.getToken();
      const response = await fetch('/api/projects', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const allProjects = await response.json();
        // Filter based on role (API already filters, but we ensure client-side safety)
        if (role === 'staff' || role === 'manager') {
          projects.value = allProjects.filter(p => p.members && p.members.includes(email));
    } else {
          projects.value = allProjects;
    }
      } else {
        console.warn('Failed to fetch projects from API, projects list will be empty');
    projects.value = [];
      }
      loading.value.projects = false;
    }

    if (rbac.value.canViewIndividual) {
      loading.value.employees = true;
      
      if (role === 'staff') {
        // Staff only see themselves
        employees.value = [{
          email: email,
          name: authStore.userName || email.split('@')[0],
          department: department || 'Unassigned'
        }];
        params.value.employeeEmail = email;
        loading.value.employees = false;
      } else {
        // Use API endpoint for managers/HR/directors to get proper RBAC filtering
        try {
    const token = await authStore.getToken();
          const response = await fetch('/api/auth/users', {
            headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.ok) {
      const users = await response.json();
            // Filter out HR users - they don't have tasks so shouldn't appear in reports
            employees.value = users
              .filter(u => u.role?.toLowerCase() !== 'hr')
              .map(u => ({
                email: u.email,
                name: u.name || u.email.split('@')[0],
                department: u.department || 'Unassigned',
                role: u.role
              }));
          } else {
            // API failed - show empty list with error message
            console.error('Failed to fetch employees from API:', response.status, response.statusText);
            employees.value = [];
            errorMessage.value = 'Failed to load employee list. Please refresh the page.';
          }
        } catch (apiErr) {
          console.error('Error fetching employees from API:', apiErr);
          employees.value = [];
          errorMessage.value = 'Failed to load employee list. Please refresh the page.';
        }
        loading.value.employees = false;
      }
    }

    if (rbac.value.canViewDepartment || rbac.value.canViewCompany) {
      // Use API endpoint to get departments list instead of direct Firestore query
      try {
        const token = await authStore.getToken();
        const response = await fetch('/api/auth/users', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        let deptArray = [];
        if (response.ok) {
          const users = await response.json();
          const depts = new Set(users.map(u => u.department).filter(Boolean));
          if (department) depts.add(department);
          deptArray = Array.from(depts).sort();
        } else {
          // Fallback: use known departments if API fails
          deptArray = ['Engineering', 'Finance', 'HR and Admin', 'Operations'];
          if (department) deptArray.push(department);
        }
        
        if (role === 'director' || role === 'hr') {
          // Directors and HR can see all departments (but NOT "Company (All)" for department reports)
          departments.value = deptArray; // No "Company (All)" for department reports
          // Company reports use allDepartmentsForFilter which includes "All Departments"
          allDepartmentsForFilter.value = [
            { title: 'All Departments', value: 'ALL' },
            ...deptArray.map(dept => ({ title: dept, value: dept }))
          ];
        } else if (role === 'manager' && department) {
          // Managers can only see their own department
          departments.value = [department];
          params.value.department = department;
          allDepartmentsForFilter.value = [
            { title: 'All Departments', value: 'ALL' },
            ...deptArray.map(dept => ({ title: dept, value: dept }))
          ];
        } else {
          departments.value = deptArray;
          allDepartmentsForFilter.value = [
            { title: 'All Departments', value: 'ALL' },
            ...deptArray.map(dept => ({ title: dept, value: dept }))
          ];
        }
      } catch (apiErr) {
        console.warn('Failed to fetch departments from API:', apiErr);
        // Fallback to known departments
        const deptArray = ['Engineering', 'Finance', 'HR and Admin', 'Operations'];
        if (department) deptArray.push(department);
        departments.value = deptArray;
        allDepartmentsForFilter.value = [
          { title: 'All Departments', value: 'ALL' },
          ...deptArray.map(dept => ({ title: dept, value: dept }))
        ];
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
    // Validate dates before proceeding
    if (params.value.startDate && params.value.endDate) {
      const startDate = new Date(params.value.startDate);
      const endDate = new Date(params.value.endDate);
      if (endDate < startDate) {
        throw new Error("End date cannot be earlier than start date. Please select valid dates.");
      }
    }
    
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
      // Handle multiple department selection
      if (params.value.selectedDepartments && params.value.selectedDepartments.length > 0) {
        if (params.value.selectedDepartments.includes('ALL')) {
          queryParams.append('department', 'ALL');
        } else {
          // Send comma-separated list of departments
          queryParams.append('departments', params.value.selectedDepartments.join(','));
        }
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

  // Use nextTick to ensure canvas elements are available, then add small delay for DOM to fully render
  nextTick(() => {
    setTimeout(() => {
      try {
        if (type === 'project') renderProjectCharts();
        else if (type === 'individual') renderIndividualCharts();
        else if (type === 'department') renderDepartmentCharts();
        else if (type === 'company') renderCompanyCharts();
      } catch (e) {
        console.error("Chart rendering error:", e);
        errorMessage.value = "Failed to render visualizations.";
      }
    }, 100); // Small delay to ensure canvas elements are fully rendered
  });
}

const statusColors = {
  'To Do': '#42A5F5',
  'Ongoing': '#FFA726',
  'Pending Review': '#B39DDB',
  'Completed': '#66BB6A',
  'Overdue': '#EF5350', // Red color for overdue tasks
};
const chartBGColors = [statusColors['To Do'], statusColors['Ongoing'], statusColors['Pending Review'], statusColors['Completed'], statusColors['Overdue']];

function renderProjectCharts() {
  const summary = reportData.value.summary;
  const pieCtx = document.getElementById('pie-chart')?.getContext('2d');
  if (pieCtx && summary.totalTasks > 0) {
    try {
      // Build chart data including overdue tasks as a separate category
      const statusLabels = Object.keys(summary.statusCounts || {}).filter(k => (summary.statusCounts[k] || 0) > 0);
      const statusData = statusLabels.map(k => summary.statusCounts[k]);
      const statusColors_forChart = statusLabels.map(label => statusColors[label] || '#9E9E9E');
      
      // Add overdue as a separate category if there are overdue tasks
      const chartLabels = [...statusLabels];
      const chartData = [...statusData];
      const chartColors = [...statusColors_forChart];
      
      if (summary.overdueCount && summary.overdueCount > 0) {
        chartLabels.push('Overdue');
        chartData.push(summary.overdueCount);
        chartColors.push(statusColors['Overdue']);
      }
      
      if (activeChart) {
        activeChart.destroy();
        activeChart = null;
      }
      
      activeChart = new Chart(pieCtx, {
        type: 'pie',
        data: {
          labels: chartLabels,
          datasets: [{ 
            data: chartData,
            backgroundColor: chartColors
          }]
        },
        options: { 
          responsive: true, 
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'right'
            }
          }
        }
      });
  } catch (error) {
      console.error('Error rendering pie chart:', error);
    }
  }
  const barCtx = document.getElementById('bar-chart-workload')?.getContext('2d');
  if (barCtx && summary.totalTasks > 0 && summary.memberWorkload && Object.keys(summary.memberWorkload).length > 0) {
    try {
      activeChart2 = new Chart(barCtx, {
        type: 'bar',
        data: {
          labels: Object.keys(summary.memberWorkload).map(email => (summary.memberNames && summary.memberNames[email]) || email.split('@')[0]),
          datasets: [{ label: 'Number of Tasks', data: Object.values(summary.memberWorkload), backgroundColor: '#7E57C2' }]
        },
        options: { 
          responsive: true, 
          maintainAspectRatio: false, 
          scales: { 
            y: { beginAtZero: true, ticks: { stepSize: 1 } } 
          },
          plugins: {
            legend: {
              display: false
            }
          }
        }
      });
    } catch (error) {
      console.error('Error rendering workload chart:', error);
    }
  }
}

function renderIndividualCharts() {
  const summary = reportData.value.summary;
  console.log('Rendering individual charts, summary:', summary);
  const pieCtx = document.getElementById('individual-pie-chart')?.getContext('2d');
  console.log('Pie chart canvas context:', pieCtx);
  
  if (pieCtx && summary && summary.totalTasks > 0) {
    try {
      const statusCounts = summary.statusCounts || {};
      console.log('Status counts:', statusCounts);
      const labels = Object.keys(statusCounts).filter(k => (statusCounts[k] || 0) > 0);
      console.log('Filtered labels:', labels);
      
      // Build chart data including overdue tasks as a separate category
      const chartLabels = [...labels];
      const chartData = [...labels.map(k => statusCounts[k])];
      const chartColors = labels.map(label => statusColors[label] || '#9E9E9E');
      
      // Add overdue as a separate category if there are overdue tasks
      if (summary.overdueTasks && summary.overdueTasks > 0) {
        chartLabels.push('Overdue');
        chartData.push(summary.overdueTasks);
        chartColors.push(statusColors['Overdue']);
      }
      
      if (chartLabels.length === 0) {
        console.warn('No status labels to display in chart');
        return;
      }
      
      // Destroy existing chart if it exists
      if (activeChart) {
        activeChart.destroy();
        activeChart = null;
      }
      
      activeChart = new Chart(pieCtx, {
      type: 'pie',
      data: {
          labels: chartLabels,
        datasets: [{
            data: chartData,
            backgroundColor: chartColors
        }]
      },
      options: { 
        responsive: true, 
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right'
          }
        }
      }
    });
      console.log('Individual pie chart rendered successfully');
    } catch (error) {
      console.error('Error rendering individual chart:', error);
      errorMessage.value = 'Failed to render status breakdown chart: ' + error.message;
    }
  } else {
    console.warn('Cannot render individual chart:', {
      hasContext: !!pieCtx,
      hasSummary: !!summary,
      totalTasks: summary?.totalTasks || 0
    });
  }
}

function renderDepartmentCharts() {
  const workloadData = reportData.value.employeeWorkloads || {};
  if (Object.keys(workloadData).length === 0) return;
  
  const labels = Object.values(workloadData).map(e => e.name || e.email?.split('@')[0] || 'Unknown');
  const datasets = [
    { label: 'Ongoing', data: Object.values(workloadData).map(e => e['Ongoing'] || 0), backgroundColor: statusColors['Ongoing'] },
    { label: 'Pending Review', data: Object.values(workloadData).map(e => e['Pending Review'] || 0), backgroundColor: statusColors['Pending Review'] },
    { label: 'To Do', data: Object.values(workloadData).map(e => e['To Do'] || e['Unassigned'] || 0), backgroundColor: statusColors['To Do'] },
    { label: 'Completed', data: Object.values(workloadData).map(e => e['Completed'] || 0), backgroundColor: statusColors['Completed'] }
  ];
  
  const barCtx = document.getElementById('bar-chart-stacked')?.getContext('2d');
  if (barCtx) {
    try {
      activeChart = new Chart(barCtx, {
      type: 'bar',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { stacked: true },
            y: { stacked: true, beginAtZero: true, ticks: { stepSize: 1 } } 
          },
          plugins: {
            legend: {
              position: 'top'
            }
          }
        }
      });
    } catch (error) {
      console.error('Error rendering department chart:', error);
    }
  }
}

function renderCompanyCharts() {
  const summary = reportData.value.summary;
  const pieCtx = document.getElementById('company-pie-chart')?.getContext('2d');
  if (pieCtx && summary.totalTasks > 0) {
    try {
      const statusCounts = summary.statusCounts || {};
      const labels = Object.keys(statusCounts).filter(k => (statusCounts[k] || 0) > 0);
      
      // Build chart data including overdue tasks as a separate category
      const chartLabels = [...labels];
      const chartData = [...labels.map(k => statusCounts[k])];
      const chartColors = labels.map(label => statusColors[label] || '#9E9E9E');
      
      // Add overdue as a separate category if there are overdue tasks
      if (summary.overdueCount && summary.overdueCount > 0) {
        chartLabels.push('Overdue');
        chartData.push(summary.overdueCount);
        chartColors.push(statusColors['Overdue']);
      }
      
      if (activeChart) {
        activeChart.destroy();
        activeChart = null;
      }
      
      activeChart = new Chart(pieCtx, {
      type: 'pie',
      data: {
          labels: chartLabels,
        datasets: [{
            data: chartData,
            backgroundColor: chartColors
          }]
        },
        options: { 
          responsive: true, 
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'right'
            }
          }
        }
      });
    } catch (error) {
      console.error('Error rendering company pie chart:', error);
    }
  }
  const barCtx = document.getElementById('company-bar-chart')?.getContext('2d');
  if (barCtx && summary.totalTasks > 0 && reportData.value.departmentStats) {
    try {
      activeChart2 = new Chart(barCtx, {
      type: 'bar',
      data: {
          labels: reportData.value.departmentStats.map(s => s.name || s.department || 'Unknown'),
        datasets: [{
            label: 'Number of Tasks', 
            data: reportData.value.departmentStats.map(s => s.total || 0), 
          backgroundColor: '#7E57C2'
        }]
      },
        options: { 
          responsive: true, 
          maintainAspectRatio: false, 
          scales: { 
            y: { beginAtZero: true, ticks: { stepSize: 1 } } 
          },
          plugins: {
            legend: {
              display: false
            }
          }
        }
      });
    } catch (error) {
      console.error('Error rendering company bar chart:', error);
    }
  }
}

// --- PDF Export (FIXED) ---
async function exportToPDF() {
  loading.value.exporting = true;
  // Find the single, visible report-content div
  const sourceEl = document.querySelector('#report-content');
  if (!sourceEl) {
    loading.value.exporting = false; 
    return;
  }

  let cloneWrapper = null;
  try {
    // Step 1: Convert all Chart.js canvas elements to images BEFORE cloning
    // DO NOT modify original charts - just capture them as-is
  const canvasToImageMap = new Map();
    const canvasElements = sourceEl.querySelectorAll('canvas');
    
    console.log(`Found ${canvasElements.length} canvas elements to export`);
    
  for (let i = 0; i < canvasElements.length; i++) {
    const canvas = canvasElements[i];
      const canvasId = canvas.id || `canvas-${i}`;
      
    try {
      // Get the Chart.js instance from the canvas
      const chart = Chart.getChart(canvas);
      if (chart) {
          console.log(`Found chart instance for ${canvasId}, type: ${chart.config.type}`);
          
          // Get the container element to determine proper dimensions
          const container = canvas.parentElement;
          const containerRect = container ? container.getBoundingClientRect() : null;
          
          // Determine chart type and appropriate dimensions
          const chartType = chart.config.type;
          const isPieChart = chartType === 'pie' || chartType === 'doughnut';
          
          // For pie charts, use square dimensions to prevent stretching
          // For other charts, use container dimensions
          let exportWidth, exportHeight;
          
          if (isPieChart) {
            // For pie charts, we need to capture at a square resolution
            // Get the actual rendered size and use the smaller dimension
            const renderedWidth = chart.canvas.width || canvas.width || 400;
            const renderedHeight = chart.canvas.height || canvas.height || 400;
            const size = Math.min(renderedWidth, renderedHeight, containerRect ? Math.min(containerRect.width, containerRect.height || containerRect.width) : 400);
            
            // Temporarily resize chart canvas to square for export
            const originalWidth = chart.canvas.width;
            const originalHeight = chart.canvas.height;
            
            // Set square dimensions
            chart.canvas.width = size;
            chart.canvas.height = size;
        chart.resize();
            
            // Wait a moment for resize to complete
            await new Promise(resolve => setTimeout(resolve, 100));
            
            exportWidth = size;
            exportHeight = size; // MUST be equal for pie charts
            
            // Capture at square resolution
        const imageUrl = chart.toBase64Image('image/png', 1.0);
            
            // IMMEDIATELY restore original dimensions to avoid visual glitches
            chart.canvas.width = originalWidth;
            chart.canvas.height = originalHeight;
        chart.resize();
        
            canvasToImageMap.set(canvasId, {
              imageUrl,
              width: exportWidth,
              height: exportHeight,
              isPieChart: true
            });
            console.log(`Successfully captured pie chart ${canvasId} at square resolution: ${exportWidth}x${exportHeight}`);
            continue; // Skip the normal capture flow below
      } else {
            // For bar/line charts, use container dimensions
            exportWidth = containerRect ? containerRect.width : 400;
            exportHeight = containerRect ? containerRect.height : 250;
          }
          
          // Capture the chart as-is without modifying it
          // Use toBase64Image with quality parameter
          const imageUrl = chart.toBase64Image('image/png', 1.0);
          
          if (!imageUrl || imageUrl.length < 100) {
            console.warn(`Chart ${canvasId} produced invalid image, using fallback`);
            // Fallback to canvas direct conversion
            const fallbackUrl = canvas.toDataURL('image/png');
            canvasToImageMap.set(canvasId, {
              imageUrl: fallbackUrl,
              width: exportWidth,
              height: exportHeight,
              isPieChart
            });
          } else {
            canvasToImageMap.set(canvasId, {
              imageUrl,
              width: exportWidth,
              height: exportHeight,
              isPieChart
            });
            console.log(`Successfully captured chart ${canvasId}, image size: ${imageUrl.length} chars`);
          }
        } else {
          console.log(`No chart instance for ${canvasId}, using direct canvas conversion`);
        // Fallback: convert canvas directly to image
          const container = canvas.parentElement;
          const containerRect = container ? container.getBoundingClientRect() : null;
          const width = containerRect ? containerRect.width : canvas.width || 400;
          const height = containerRect ? containerRect.height : canvas.height || 250;
          
        const imageUrl = canvas.toDataURL('image/png');
          canvasToImageMap.set(canvasId, {
            imageUrl,
            width,
            height,
            isPieChart: false
          });
      }
    } catch (error) {
        console.error('Failed to convert canvas to image:', error, canvas);
        // Fallback: try direct conversion
      try {
        const imageUrl = canvas.toDataURL('image/png');
          if (imageUrl && imageUrl.length > 100) {
            canvasToImageMap.set(canvasId, {
              imageUrl,
              width: canvas.width || 400,
              height: canvas.height || 250,
              isPieChart: false
            });
          }
      } catch (e) {
          console.error('Failed to convert canvas to data URL:', e);
      }
    }
  }

    console.log(`Successfully captured ${canvasToImageMap.size} chart images`);

    // Step 2: Clone the report content
    cloneWrapper = document.createElement('div');
  cloneWrapper.style.position = 'fixed';
    cloneWrapper.style.left = '-9999px'; // Move off-screen but keep in DOM
  cloneWrapper.style.top = '0';
    cloneWrapper.style.width = '1200px'; // Wider to accommodate side-by-side charts
  cloneWrapper.style.background = '#ffffff';
    cloneWrapper.style.padding = '20px';
    cloneWrapper.style.zIndex = '9999';
    cloneWrapper.style.opacity = '1'; // Make visible for html2canvas
    cloneWrapper.style.pointerEvents = 'none';
    cloneWrapper.style.overflow = 'visible';

  const logoDiv = document.createElement('div');
    logoDiv.style.textAlign = 'center';
    logoDiv.style.marginBottom = '20px';
    const logoImg = document.createElement('img');
    logoImg.src = SPMLogo;
    logoImg.style.maxWidth = '200px';
    logoDiv.appendChild(logoImg);
  cloneWrapper.appendChild(logoDiv);

    const reportClone = sourceEl.cloneNode(true);
    
    // Ensure Vuetify grid layout is preserved in clone for side-by-side charts
    // Force flex display on v-row elements to maintain layout
    reportClone.querySelectorAll('.v-row, .row').forEach(row => {
      row.style.display = 'flex';
      row.style.flexWrap = 'wrap';
      row.style.marginLeft = '0';
      row.style.marginRight = '0';
      row.style.width = '100%';
    });
    
    // Ensure v-col elements maintain their proportional widths
    // For md="5" cols (pie chart), ensure ~41.67% width
    // For md="7" cols (bar chart), ensure ~58.33% width
    reportClone.querySelectorAll('.v-col, .col').forEach(col => {
      if (col.classList.contains('col-md-5') || col.getAttribute('cols') === '12' && col.getAttribute('md') === '5') {
        col.style.flex = '0 0 41.666667%';
        col.style.maxWidth = '41.666667%';
      } else if (col.classList.contains('col-md-7') || col.getAttribute('cols') === '12' && col.getAttribute('md') === '7') {
        col.style.flex = '0 0 58.333333%';
        col.style.maxWidth = '58.333333%';
      } else if (col.classList.contains('col-md-6') || col.getAttribute('cols') === '12' && col.getAttribute('md') === '6') {
        col.style.flex = '0 0 50%';
        col.style.maxWidth = '50%';
      }
      col.style.paddingLeft = '12px';
      col.style.paddingRight = '12px';
      col.style.boxSizing = 'border-box';
    });
    
    // Ensure chart containers maintain their sizing
    reportClone.querySelectorAll('.chart-container, .chart-card').forEach(container => {
      container.style.width = '100%';
      container.style.height = 'auto';
      container.style.minHeight = '250px';
    });
    
    // Step 3: Replace canvas elements with images in the clone
    const imagePromises = [];
    reportClone.querySelectorAll('canvas').forEach((clonedCanvas, index) => {
      const canvasId = clonedCanvas.id || `canvas-${index}`;
    
    if (canvasToImageMap.has(canvasId)) {
        const chartData = canvasToImageMap.get(canvasId);
      const img = document.createElement('img');
        
        // Use stored dimensions if available, otherwise use fallback
        let imgWidth, imgHeight;
        let imageUrl = '';
        
        if (typeof chartData === 'object' && chartData.width && chartData.height) {
          // New format with dimensions
          imgWidth = chartData.width;
          imgHeight = chartData.height;
          imageUrl = chartData.imageUrl || '';
          
          // CRITICAL: For pie charts, ensure dimensions are always square
          if (chartData.isPieChart) {
            // Use the stored dimensions (which should already be square) or calculate square
            const size = Math.min(imgWidth, imgHeight, 400);
            imgWidth = size;
            imgHeight = size; // MUST be equal
            console.log(`Pie chart ${canvasId}: forcing square dimensions ${imgWidth}x${imgHeight}`);
          }
    } else {
          // Old format fallback
          imageUrl = chartData || (typeof chartData === 'object' ? chartData.imageUrl : '');
          const container = clonedCanvas.parentElement;
          if (container) {
            const containerRect = container.getBoundingClientRect();
            const canvasIdLower = canvasId.toLowerCase();
            const isPie = canvasIdLower.includes('status') || canvasIdLower.includes('pie') || canvasIdLower.includes('individual-pie') || canvasIdLower.includes('company-pie');
            
            if (isPie) {
              // For pie charts, ALWAYS use square dimensions
              const size = Math.min(containerRect.width, containerRect.height || containerRect.width);
              imgWidth = size;
              imgHeight = size; // Must be equal
            } else {
              imgWidth = containerRect.width || 400;
              imgHeight = containerRect.height || 250;
            }
          } else {
            // Fallback: check if pie chart by ID
            const canvasIdLower = canvasId.toLowerCase();
            const isPie = canvasIdLower.includes('pie');
            if (isPie) {
              imgWidth = 400;
              imgHeight = 400; // Square for pie charts
            } else {
              imgWidth = 400;
              imgHeight = 250;
            }
          }
        }
        
        if (!imageUrl || imageUrl.length < 100) {
          console.error(`Invalid image URL for ${canvasId}:`, imageUrl ? imageUrl.substring(0, 50) : 'empty');
          clonedCanvas.remove();
          return;
        }
        
        // Set image source BEFORE adding to DOM
        img.src = imageUrl;
        
        // For pie charts, ensure perfect square
        if (chartData.isPieChart) {
          const squareSize = Math.round(Math.min(imgWidth, imgHeight));
          imgWidth = squareSize;
          imgHeight = squareSize;
        }
        
        // Set explicit width/height attributes for html2canvas (critical for pie charts)
        img.width = Math.round(imgWidth);
        img.height = Math.round(imgHeight);
        
        // Set image dimensions
        img.style.width = imgWidth + 'px';
        img.style.height = imgHeight + 'px';
        img.style.maxWidth = '100%';
        img.style.maxHeight = '100%';
        
        // For pie charts, use object-fit: contain to preserve circle shape
        // For other charts, use cover or contain as needed
        if (chartData.isPieChart) {
          img.style.objectFit = 'contain'; // Preserve circular aspect ratio
          img.style.aspectRatio = '1 / 1'; // Force 1:1 aspect ratio
        } else {
          img.style.objectFit = 'contain';
        }
        
        img.style.display = 'block';
        img.style.margin = '0 auto'; // Center the image
        
        // Replace the canvas with the image
        clonedCanvas.parentNode.replaceChild(img, clonedCanvas);
        
        // Wait for image to load (base64 images may load immediately)
        const imageLoadPromise = new Promise((resolve, reject) => {
          // Check if already loaded (for base64 images)
          if (img.complete && img.naturalHeight !== 0) {
            console.log(`Image already loaded for ${canvasId} (${img.naturalWidth}x${img.naturalHeight})`);
            resolve();
            return;
          }
          
          img.onload = () => {
            console.log(`Image loaded for ${canvasId} (${img.naturalWidth}x${img.naturalHeight})`);
            resolve();
          };
          img.onerror = (err) => {
            console.error(`Failed to load image for ${canvasId}:`, err);
            reject(new Error(`Image load failed for ${canvasId}`));
          };
          // Timeout after 5 seconds
          setTimeout(() => {
            if (img.complete) {
              resolve(); // Image finished loading
            } else {
              reject(new Error(`Image load timeout for ${canvasId}`));
            }
          }, 5000);
        });
        imagePromises.push(imageLoadPromise);
      } else {
        console.warn('No image found for canvas:', canvasId);
        // Remove canvas if no replacement found
        clonedCanvas.remove();
      }
    });
    
    // Remove elements that shouldn't be exported
    reportClone.querySelectorAll('.no-export').forEach(el => el.style.display = 'none');
    reportClone.querySelectorAll('.v-data-table__progress').forEach(el => el.remove());
    
    cloneWrapper.appendChild(reportClone);
  document.body.appendChild(cloneWrapper);

    // Step 4: Wait for all images to load before capturing
    console.log(`Waiting for ${imagePromises.length} images to load...`);
    await Promise.all(imagePromises).catch(err => {
      console.warn('Some images failed to load, continuing anyway:', err);
    });
    
    // Additional delay to ensure DOM is ready
    await new Promise(resolve => setTimeout(resolve, 500));
    
    console.log('Starting html2canvas capture...');

    const canvas = await html2canvas(cloneWrapper, { 
      scale: 2,
      logging: true, // Enable logging for debugging
      useCORS: true,
      backgroundColor: '#ffffff',
      windowWidth: cloneWrapper.scrollWidth,
      windowHeight: cloneWrapper.scrollHeight,
      allowTaint: false,
      removeContainer: false
    });
    
    console.log(`html2canvas completed, canvas size: ${canvas.width}x${canvas.height}`);
    
    if (canvas.width === 0 || canvas.height === 0) {
      throw new Error('html2canvas produced empty canvas');
    }
    
    const imgData = canvas.toDataURL('image/png');
    
    if (!imgData || imgData === 'data:,') {
      throw new Error('Failed to generate image data from canvas');
    }
    
    console.log(`Generated image data, length: ${imgData.length}`);
    const pdf = new jsPDF('p', 'mm', 'a4');
    const margin = 10;
    const pdfWidth = pdf.internal.pageSize.getWidth() - (margin * 2);
    const pdfPageHeight = pdf.internal.pageSize.getHeight() - (margin * 2);
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const ratio = imgWidth / imgHeight;
    
    // Calculate how the image should fit on the PDF page width
    const imgDisplayWidth = pdfWidth;
    const imgDisplayHeight = pdfWidth / ratio;
    
    // If the image height is larger than one page, we need to split it across multiple pages
    if (imgDisplayHeight > pdfPageHeight) {
      let yPosition = 0; // Track where we are in the image
      let pageNumber = 1;
      
      // Load the image first
      const sourceImg = new Image();
      sourceImg.src = imgData;
      
      await new Promise((resolve) => {
        sourceImg.onload = () => {
          // Split the image across pages
          while (yPosition < imgHeight) {
            if (pageNumber > 1) {
              pdf.addPage();
            }
            
            // Calculate the height of the chunk for this page
            const remainingHeight = imgHeight - yPosition;
            const chunkHeight = Math.min(
              remainingHeight,
              (pdfPageHeight / imgDisplayHeight) * imgHeight
            );
            
            // Calculate the display height on PDF
            const displayHeight = (chunkHeight / imgHeight) * imgDisplayHeight;
            
            // Create a temporary canvas for this chunk
            const pageCanvas = document.createElement('canvas');
            pageCanvas.width = imgWidth;
            pageCanvas.height = chunkHeight;
            const pageCtx = pageCanvas.getContext('2d');
            
            // Draw the chunk of the image
            pageCtx.drawImage(
              sourceImg,
              0, yPosition, imgWidth, chunkHeight,
              0, 0, imgWidth, chunkHeight
            );
            
            const chunkImgData = pageCanvas.toDataURL('image/png');
            pdf.addImage(chunkImgData, 'PNG', margin, margin, imgDisplayWidth, displayHeight);
            
            yPosition += chunkHeight;
            pageNumber++;
          }
          resolve();
        };
      });
    } else {
      // Image fits on one page
      pdf.addImage(imgData, 'PNG', margin, margin, imgDisplayWidth, imgDisplayHeight);
    }
    
    pdf.save(`${reportData.value.title}_Report.pdf`);
  } catch (error) {
    console.error("Error generating PDF:", error);
    errorMessage.value = 'Failed to export PDF: ' + error.message;
  } finally {
    // Clean up: remove clone wrapper
    if (cloneWrapper && document.body.contains(cloneWrapper)) {
    document.body.removeChild(cloneWrapper);
    }
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
/* .no-export is used in the PDF export logic - no styles needed */

/* --- MOBILE FRIENDLY FIX --- */
/* Makes data tables scroll horizontally on small screens */
:deep(.v-data-table) {
  display: block;
  width: 100%;
  overflow-x: auto;
}

/* Report Type Tabs - Mobile Responsive */
.report-type-tabs-wrapper {
  width: 100%;
}

.report-type-tabs {
  width: 100%;
}

/* Hide full labels on mobile, show short labels */
.tab-label-short {
  display: none;
}

.tab-label-full {
  display: inline;
}

/* On mobile, show short labels and make tabs fit in one row or wrap */
@media (max-width: 960px) {
  .tab-label-full {
    display: none;
  }
  
  .tab-label-short {
    display: inline;
  }
  
  /* Make tabs container wrap and remove horizontal scroll */
  .report-type-tabs-wrapper {
    overflow: visible;
  }
  
  .report-type-tabs {
    overflow: visible;
  }
  
  /* Remove grow behavior and allow wrapping */
  .report-type-tabs :deep(.v-tabs) {
    display: block;
    overflow: visible;
  }
  
  .report-type-tabs :deep(.v-tab) {
    flex: 1 1 0;
    min-width: calc(25% - 4px);
    max-width: calc(50% - 4px);
    padding: 12px 6px;
    font-size: 0.875rem;
    white-space: normal;
    word-wrap: break-word;
    text-align: center;
    box-sizing: border-box;
  }
  
  /* Make slider group wrap into rows */
  .report-type-tabs :deep(.v-slider-group) {
    display: flex !important;
    flex-wrap: wrap !important;
    gap: 4px;
    overflow: visible;
  }
  
  /* Ensure tab bar doesn't restrict width */
  .report-type-tabs :deep(.v-tabs-bar) {
    overflow: visible;
  }
}

/* On very small screens, make tabs fit in 2x2 grid */
@media (max-width: 600px) {
  .report-type-tabs :deep(.v-tab) {
    flex: 1 1 calc(50% - 4px);
    min-width: calc(50% - 4px);
    max-width: calc(50% - 4px);
    padding: 10px 4px;
    font-size: 0.8rem;
    min-height: 44px;
  }
}

/* On extra small screens, keep 2x2 grid */
@media (max-width: 400px) {
  .report-type-tabs :deep(.v-tab) {
    flex: 1 1 calc(50% - 4px);
    min-width: calc(50% - 4px);
    max-width: calc(50% - 4px);
    padding: 8px 2px;
    font-size: 0.75rem;
    min-height: 40px;
  }
}

/* Department Warning Alert - Responsive */
.department-warning-alert {
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.department-warning-alert :deep(.v-alert__content) {
  line-height: 1.5;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.warning-alert-title {
  display: inline-block;
  font-size: clamp(0.875rem, 2vw, 1rem);
  margin-right: 4px;
}

.warning-alert-text {
  font-size: clamp(0.8rem, 1.8vw, 0.9375rem);
  line-height: 1.5;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

/* Responsive adjustments for warning alert */
@media (max-width: 960px) {
  .department-warning-alert {
    padding: 10px 12px !important;
  }
  
  .warning-alert-title {
    display: block;
    margin-bottom: 4px;
    font-size: clamp(0.813rem, 2.5vw, 0.9375rem);
  }
  
  .warning-alert-text {
    display: block;
    font-size: clamp(0.75rem, 2vw, 0.875rem);
  }
}

@media (max-width: 600px) {
  .department-warning-alert {
    padding: 8px 10px !important;
  }
  
  .warning-alert-title {
    font-size: clamp(0.75rem, 3vw, 0.875rem);
    margin-bottom: 6px;
  }
  
  .warning-alert-text {
    font-size: clamp(0.688rem, 2.5vw, 0.813rem);
    line-height: 1.6;
  }
}

@media (max-width: 400px) {
  .department-warning-alert {
    padding: 6px 8px !important;
  }
  
  .warning-alert-title {
    font-size: 0.75rem;
  }
  
  .warning-alert-text {
    font-size: 0.688rem;
    line-height: 1.7;
  }
}

.metric-card {
  height: 100%;
  min-height: 80px;
}

.chart-card {
  height: 100%;
}

.chart-container {
  min-height: 250px;
  height: 250px;
  position: relative;
  width: 100%;
}

canvas {
  max-width: 100%;
  height: 100% !important;
  min-height: 250px;
  width: 100% !important;
}

.report-header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}

.report-title-section {
  flex: 1;
  min-width: 200px;
}

.report-title {
  word-wrap: break-word;
  font-size: clamp(1.25rem, 4vw, 2rem);
}

.report-subtitle {
  font-size: clamp(0.75rem, 2vw, 0.875rem);
  word-wrap: break-word;
}

.export-btn-text {
  display: inline;
}

/* ===========================
   Responsive Design - Mobile
   =========================== */

/* Tablet and below */
@media (max-width: 960px) {
  .v-card {
    margin-bottom: 16px;
  }

  .chart-container {
    min-height: 300px;
  }

  canvas {
    max-height: 300px;
  }

  .report-header-content {
    flex-direction: column;
    align-items: flex-start;
  }

  #export-button {
    width: 100%;
  }
}

/* Mobile devices */
@media (max-width: 600px) {
  .v-container {
    padding: 8px !important;
  }

  .v-card {
    margin-bottom: 12px;
  }

  .report-title {
    font-size: 1.25rem;
  }

  .report-subtitle {
    font-size: 0.75rem;
  }

  .chart-container {
    min-height: 250px;
    padding: 8px;
  }

  canvas {
    max-height: 250px;
  }

  .metric-card {
    padding: 12px !important;
    min-height: 70px;
  }

  .metric-card .text-h5,
  .metric-card .text-h6 {
    font-size: 1.25rem !important;
  }

  .export-btn-text {
    display: none;
  }

  /* Make tables horizontally scrollable on mobile */
  :deep(.v-data-table) {
    overflow-x: auto;
    display: block;
  }

  :deep(.v-data-table__wrapper) {
    overflow-x: auto;
  }

  .v-table {
    min-width: 600px;
  }

  /* Timeline adjustments for mobile */
  :deep(.v-timeline) {
    padding-left: 8px;
  }
}

/* Very small mobile devices */
@media (max-width: 400px) {
  .chart-container {
    min-height: 200px;
  }

  canvas {
    max-height: 200px;
  }

  .metric-card {
    padding: 8px !important;
  }
}
</style>

