<template>
  <v-container>
    <v-card class="mx-auto" max-width="1200">
      <v-card-title class="text-h5 d-flex align-center">
        <v-icon start>mdi-chart-bar</v-icon>
        Generate Report
      </v-card-title>
      
      <!-- Logo for PDF only -->
      <div class="logo-container pdf-only" style="display:none">
        <img :src="SPMlogo" alt="SPM Logo" class="spm-logo" title="Company Logo" />
      </div>
      
      <!-- 
        ========================================
        HR (Human Resources) View
        ========================================
      -->
      <v-card-text v-if="roleDetails.isHR">
        <h3 class="text-h6 mb-4">Department Workload Report</h3>
        <v-select
          v-model="selectedDepartment"
          :items="departments"
          label="Select a Department"
          variant="outlined"
          class="mb-6"
          @update:modelValue="fetchDepartmentReport"
        ></v-select>

        <!-- Loading Indicator -->
        <div v-if="reportLoading" class="text-center pa-8">
          <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
          <p class="mt-4">Generating department report...</p>
        </div>

        <!-- Department Report Display -->
        <div v-if="deptReportData && !reportLoading" id="dept-report-content" class="report-export-fixed-container">
          <v-row>
            <v-col cols="12" class="d-flex justify-space-between align-center mb-4">
              <div>
                <h2 class="text-h4">{{ deptReportData.departmentName }} Department</h2>
                <p class="text-medium-emphasis">Report generated on {{ new Date(deptReportData.generatedAt).toLocaleString() }}</p>
              </div>
              <v-btn id="export-button-hr" color="primary" @click="exportToPDF('dept-report-content', deptReportData.departmentName)">
                <v-icon start>mdi-file-pdf-box</v-icon>
                Export to PDF
              </v-btn>
            </v-col>
          </v-row>

          <!-- Visualization: Workload Balance View -->
          <v-row>
            <v-col cols="12">
              <v-card variant="outlined">
                <v-card-title>Workload Distribution (Total Tasks)</v-card-title>
                <v-card-text>
                  <div style="min-height: 250px;">
                    <canvas v-show="deptReportData.totalTasks > 0" id="dept-workload-chart"></canvas>
                    <div v-if="deptReportData.totalTasks === 0" class="d-flex flex-column align-center justify-center fill-height text-center pa-8 text-grey">
                      <v-icon size="48" class="mb-2">mdi-chart-bar</v-icon>
                      <p>No task data available for this department.</p>
                    </div>
                  </div>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
          
          <!-- Data Table: Task Distribution Overview (HR View) -->
          <v-card variant="outlined" class="mt-8 report-task-list">
            <v-card-title>Employee Task Breakdown</v-card-title>
            <v-data-table
              :headers="deptReportHeaders"
              :items="deptReportItems"
              item-key="name"
              class="elevation-0"
              v-if="deptReportData.totalTasks > 0"
              show-expand
            >
              <!-- Expanded row: show only detailed tasks (no status summary) -->
              <template #expanded-row="{ item }">
                <v-card flat class="pa-2">
                  <v-table dense style="min-width: 100%">
                    <thead>
                      <tr>
                        <th scope="col">Project</th>
                        <th scope="col">Task Title</th>
                        <th scope="col">Due Date</th>
                        <th scope="col">Priority</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="task in item.tasks" :key="task.id">
                        <td>{{ task.projectName || '-' }}</td>
                        <td>{{ task.title }}</td>
                        <td>{{ formatDateField(task.dueDate) }}</td>
                        <td>{{ task.priority || 'N/A' }}</td>
                      </tr>
                      <tr v-if="!item.tasks || item.tasks.length === 0">
                        <td colspan="4" class="text-grey text-center">No tasks available for this employee.</td>
                      </tr>
                    </tbody>
                  </v-table>
                </v-card>
              </template>
            </v-data-table>
            <div v-else class="text-center pa-8 text-grey">
              <v-icon size="48" class="mb-2">mdi-file-question-outline</v-icon>
              <p>No employees or tasks found for this department.</p>
            </div>
          </v-card>
        </div>
      </v-card-text>

      <!-- 
        ========================================
        MANAGER / DIRECTOR View
        ========================================
      -->
      <v-card-text v-else-if="roleDetails.isManager || roleDetails.isDirector">
        <h3 class="text-h6 mb-4">Project Progress Report</h3>
        <v-select
          v-model="selectedProject"
          :items="projects"
          item-title="name"
          item-value="id"
          label="Select a Project"
          variant="outlined"
          class="mb-6"
          :loading="projectsLoading"
          @update:modelValue="fetchProjectReport"
          :no-data-text="projectsLoading ? 'Loading projects...' : 'No projects found where you are a member.'"
        ></v-select>

        <!-- Loading Indicator -->
        <div v-if="reportLoading" class="text-center pa-8">
          <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
          <p class="mt-4">Generating your report...</p>
        </div>

        <!-- Project Report Display (your existing code) -->
        <div v-if="projectReportData && !reportLoading" id="proj-report-content" class="report-export-fixed-container">
          <v-row>
            <v-col cols="12" class="d-flex justify-space-between align-center mb-4">
              <div>
                <h2 class="text-h4">{{ projectReportData.projectName }}</h2>
                <p class="text-medium-emphasis">Report generated on {{ new Date(projectReportData.generatedAt).toLocaleString() }}</p>
              </div>
              <v-btn
                id="export-button-proj"
                color="primary"
                @click="exportToPDF('proj-report-content', projectReportData.projectName)"
                :loading="exporting"
                :disabled="projectReportData.summary.totalTasks === 0"
              >
                <v-icon start>mdi-file-pdf-box</v-icon>
                Export to PDF
              </v-btn>
            </v-col>
          </v-row>

          <v-row>
            <v-col cols="12" md="6">
              <v-card variant="outlined">
                <v-card-title>Task Status Overview</v-card-title>
                <v-card-text>
                  <div style="min-height: 250px;">
                    <canvas v-show="projectReportData.summary.totalTasks > 0" id="status-chart"></canvas>
                    <div v-if="projectReportData.summary.totalTasks === 0" class="d-flex flex-column align-center justify-center fill-height text-center pa-8 text-grey">
                      <v-icon size="48" class="mb-2">mdi-chart-pie</v-icon>
                      <p>No task data available.</p>
                    </div>
                  </div>
                </v-card-text>
              </v-card>
            </v-col>
            <v-col cols="12" md="6">
              <v-card variant="outlined">
                <v-card-title>Team Workload</v-card-title>
                 <v-card-text>
                   <div style="min-height: 250px;">
                    <canvas v-show="projectReportData.summary.totalTasks > 0" id="workload-chart"></canvas>
                    <div v-if="projectReportData.summary.totalTasks === 0" class="d-flex flex-column align-center justify-center fill-height text-center pa-8 text-grey">
                      <v-icon size="48" class="mb-2">mdi-chart-bar</v-icon>
                      <p>No workload data available.</p>
                    </div>
                  </div>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>

          <v-card variant="outlined" class="mt-8 report-task-list">
            <v-card-title>Detailed Task List</v-card-title>
            <v-list v-if="projectReportData.summary.totalTasks > 0" lines="two">
              <v-list-item
                v-for="task in projectReportData.tasks"
                :key="task.id"
                :title="task.title"
                :subtitle="`Status: ${task.status} | Priority: ${task.priority || 'N/A'}`"
              >
                <template #append>
                  <div class="d-flex flex-column align-end">
                    <v-chip-group>
                      <v-chip v-if="task.assignee || task.assignedTo" size="small" class="ml-1 assignee-chip" variant="flat">
                        {{ (task.assignee && task.assignee.name) || (task.assignedTo && task.assignedTo.split('@')[0]) }}
                      </v-chip>
                    </v-chip-group>
                    <div v-if="task.assignee && task.assignee.department" class="text-caption text-medium-emphasis mt-1">
                      Department: {{ task.assignee.department }}
                    </div>
                    <span v-if="task.dueDate" class="text-caption text-medium-emphasis mt-1">
                      Due: {{ formatDateField(task.dueDate) }}
                    </span>
                  </div>
                </template>
              </v-list-item>
            </v-list>
            <div v-else class="text-center pa-8 text-grey">
              <v-icon size="48" class="mb-2">mdi-file-question-outline</v-icon>
              <p>This project has no tasks yet.</p>
            </div>
          </v-card>
        </div>
      </v-card-text>
      
      <!-- 
        ========================================
        STAFF (or other) View
        ========================================
      -->
      <v-card-text v-else>
        <div class="text-center pa-8 text-grey">
          <v-icon size="48" class="mb-2">mdi-lock-outline</v-icon>
          <p>You do not have permission to generate reports.</p>
        </div>
      </v-card-text>

    </v-card>
  </v-container>
</template>

<script setup>
import { ref, watch, nextTick, computed } from 'vue';
import Chart from 'chart.js/auto';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useAuthStore } from '@/stores/auth';
import SPMlogo from '@/assets/SPM.png';

// --- THIS IS THE FIX ---
// The following line has been removed, as VDataTable is now globally registered
// in your vuetify.js plugin file.
// import { VDataTable } from 'vuetify/labs/VDataTable'; 
// --- END OF FIX ---


const authStore = useAuthStore();
const reportLoading = ref(false);
const exporting = ref(false);

// --- Manager State ---
const projects = ref([]);
const selectedProject = ref(null);
const projectsLoading = ref(false);
const projectReportData = ref(null);
let statusChart = null;
let workloadChart = null;

// --- HR State ---
const departments = ref(['Engineering', 'Finance', 'HR and Admin', 'Operations']); // From your org chart
const selectedDepartment = ref(null);
const deptReportData = ref(null);
let deptWorkloadChart = null;

// Summary statuses and colors
const SUMMARY_STATUSES = ['Ongoing', 'Pending Review', 'Completed', 'Unassigned'];
const STATUS_COLORS = {
  'Ongoing': '#FFA726',
  'Pending Review': '#B39DDB',
  'Completed': '#66BB6A',
  'Unassigned': '#BDBDBD'
};

const deptReportHeaders = [
  { title: 'Employee', key: 'name', sortable: true },
  { title: 'Ongoing', key: 'Ongoing', sortable: true },
  { title: 'Pending Review', key: 'Pending Review', sortable: true },
  { title: 'Completed', key: 'Completed', sortable: true },
  { title: 'Unassigned', key: 'Unassigned', sortable: true },
  { title: 'Total Tasks', key: 'Total', sortable: true },
];
const deptReportItems = computed(() => {
  if (!deptReportData.value) return [];
  return Object.values(deptReportData.value.employeeWorkloads);
});

function formatDateField(date) {
  if (!date) return 'N/A';
  if (typeof date === 'string') return new Date(date).toLocaleDateString();
  if (date._seconds) return new Date(date._seconds * 1000).toLocaleDateString();
  if (date.seconds) return new Date(date.seconds * 1000).toLocaleDateString();
  return 'N/A';
}

const userEmail = computed(() => authStore.userEmail || "");
const userDept = computed(() => authStore.userDepartment || "");

const roleDetails = computed(() => {
  // Explicit mapping for your environment
  const email = userEmail.value.toLowerCase();
  const dept = userDept.value.toLowerCase();
  return {
    isDirector: email === 'jack.sim@company.com',
    isHR: email === 'sally.loh@company.com',
    isManager: email === 'michael.brown@company.com',
    isStaff: !['jack.sim@company.com', 'sally.loh@company.com', 'michael.brown@company.com'].includes(email),
    managerDepartment: dept || 'engineering', // fallback
  };
});

// Fetch data based on user role
watch(() => authStore.loading, (isLoading) => {
  if (!isLoading) {
    if (roleDetails.value.isManager) {
      fetchManagerProjects();
    } else if (roleDetails.value.isDirector) {
      fetchAllProjects();
    }
  }
}, { immediate: true });

async function fetchManagerProjects() {
  projectsLoading.value = true;
  try {
    const token = await authStore.getToken();
    const response = await fetch(`/api/projects?department=${roleDetails.value.managerDepartment}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    projects.value = response.ok ? await response.json() : [];
  } catch (e) {
    console.error(e);
    projects.value = [];
  } finally {
    projectsLoading.value = false;
  }
}

async function fetchAllProjects() {
  projectsLoading.value = true;
  try {
    const token = await authStore.getToken();
    const response = await fetch(`/api/projects`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    projects.value = response.ok ? await response.json() : [];
  } catch (e) {
    console.error(e);
    projects.value = [];
  } finally {
    projectsLoading.value = false;
  }
}

async function fetchProjectReport(projectId) {
  if (!projectId) return;
  reportLoading.value = true;
  projectReportData.value = null;
  if (statusChart) statusChart.destroy();
  if (workloadChart) workloadChart.destroy();
  statusChart = null;
  workloadChart = null;

  const requesterId = authStore.userEmail;
  try {
    const response = await fetch(`/api/reports/project/${projectId}?requesterId=${requesterId}`);
    if (!response.ok) throw new Error('Failed to fetch project report');
    const data = await response.json();
    if (data.success) {
      projectReportData.value = data.report;
      if (data.report.summary.totalTasks > 0) {
        await nextTick();
        renderProjectCharts();
      }
    } else {
      console.error('Failed to fetch report:', data.message);
    }
  } catch (error) {
    console.error('Error fetching report data:', error);
  } finally {
    reportLoading.value = false;
  }
}

async function fetchDepartmentReport(departmentName) {
  if (!departmentName) return;
  reportLoading.value = true;
  deptReportData.value = null;
  if (deptWorkloadChart) deptWorkloadChart.destroy();
  deptWorkloadChart = null;

  const requesterId = authStore.userEmail;
  try {
    const response = await fetch(`/api/reports/department?department=${departmentName}&requesterId=${requesterId}`);
    if (!response.ok) throw new Error('Failed to fetch department report');
    const data = await response.json();
    if (data.success) {
      deptReportData.value = data.report;
      if (data.report.totalTasks > 0) {
        await nextTick();
        renderDepartmentChart();
      }
    } else {
      console.error('Failed to fetch dept report:', data.message);
    }
  } catch (error) {
    console.error('Error fetching dept report data:', error);
  } finally {
    reportLoading.value = false;
  }
}

function renderProjectCharts() {
  if (statusChart) statusChart.destroy();
  if (workloadChart) workloadChart.destroy();
  if (!projectReportData.value || projectReportData.value.summary.totalTasks === 0) return;

  const summary = projectReportData.value.summary;
  const statusCanvas = document.getElementById('status-chart');
  if (statusCanvas) {
    const statusCtx = statusCanvas.getContext('2d');
    statusChart = new Chart(statusCtx, {
      type: 'pie',
      data: {
        labels: Object.keys(summary.statusCounts),
        datasets: [{ label: 'Task Status', data: Object.values(summary.statusCounts), backgroundColor: ['#42A5F5', '#66BB6A', '#FFA726', '#EF5350', '#8D6E63', '#BDBDBD'] }]
      },
       options: { responsive: true, maintainAspectRatio: false }
    });
  }
  const workloadCanvas = document.getElementById('workload-chart');
  if (workloadCanvas) {
    const workloadCtx = workloadCanvas.getContext('2d');
    workloadChart = new Chart(workloadCtx, {
      type: 'bar',
      data: {
        labels: Object.keys(summary.memberWorkload).map(e => e.split('@')[0]),
        datasets: [{ label: 'Number of Tasks Assigned', data: Object.values(summary.memberWorkload), backgroundColor: '#7E57C2' }]
      },
       options: { responsive: true, maintainAspectRatio: false }
    });
  }
}

function renderDepartmentChart() {
  if (deptWorkloadChart) deptWorkloadChart.destroy();
  if (!deptReportData.value || deptReportData.value.totalTasks === 0) return;

  const workloadData = deptReportData.value.employeeWorkloads;
  const items = Object.values(workloadData);
  const labels = items.map(e => e.name);
  const statuses = SUMMARY_STATUSES;
  const datasets = statuses.map(status => ({
    label: status,
    data: items.map(e => e[status] || 0),
    backgroundColor: STATUS_COLORS[status]
  }));

  const workloadCtx = document.getElementById('dept-workload-chart');
  if (workloadCtx) {
    deptWorkloadChart = new Chart(workloadCtx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        scales: {
          x: { stacked: true },
          y: { stacked: true, beginAtZero: true, title: { display: true, text: 'Number of Tasks' } }
        }
      }
    });
  }
}

async function exportToPDF(elementId, reportName) {
  if ((elementId === 'proj-report-content' && (!projectReportData.value || projectReportData.value.summary.totalTasks === 0)) ||
      (elementId === 'dept-report-content' && (!deptReportData.value || deptReportData.value.totalTasks === 0))) {
    return;
  }
  
  exporting.value = true;
  const reportElement = document.getElementById(elementId);
  const exportButton = document.getElementById(elementId === 'proj-report-content' ? 'export-button-proj' : 'export-button-hr');
  const pdfLogos = document.querySelectorAll('.pdf-only');

  if (!reportElement) { exporting.value = false; return; }
  if (exportButton) exportButton.style.display = 'none';
  // Show PDF-only elements
  pdfLogos.forEach(el => el.style.display = 'flex');

  try {
      await new Promise(resolve => setTimeout(resolve, 120));
      const canvas = await html2canvas(reportElement, { scale: 2, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const margin = 10;
      const pdfWidth = pdf.internal.pageSize.getWidth() - (margin * 2);
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', margin, margin, pdfWidth, pdfHeight);
      pdf.save(`${reportName}_Report.pdf`);
  } catch (error) {
      console.error("Error generating PDF:", error);
  } finally {
      if (exportButton) exportButton.style.display = '';
      // Hide PDF-only elements back
      pdfLogos.forEach(el => el.style.display = 'none');
      exporting.value = false;
  }
}
</script>

<style scoped>
.report-task-list {
  overflow: hidden;
  background-color: var(--v-theme-surface);
  border: 1px solid rgba(0, 0, 0, 0.08);
}

/* Fixed width, export-friendly container to avoid mobile warping */
.report-export-fixed-container {
  width: 900px;
  max-width: 98vw;
  margin: 0 auto 24px auto;
  background: white;
  padding: 18px 18px 28px 18px;
  border-radius: 12px;
  overflow: visible !important;
}

.pdf-section {
  border: 2px solid #2222bb;
  margin-bottom: 32px;
  border-radius: 8px;
  padding: 18px;
  background: #f9faff;
}
.pdf-section h2, .pdf-section h3 {
  margin-top: 0;
  margin-bottom: 8px;
}
.logo-container {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 12px;
  margin-top: 6px;
}
.spm-logo {
  max-height: 68px;
  width: auto;
  border-radius: 10px;
  box-shadow: 0 2px 12px rgba(60,60,80,0.08);
}

/* Table clarity for PDF */
.v-table {
  width: 100%;
  border-collapse: collapse;
}
.v-table th, .v-table td {
  border: 1px solid #e0e0e0;
  padding: 6px 10px !important;
}
.v-table th {
  background: #f7f7fa;
  font-weight: 700;
  color: #666;
  letter-spacing: 0.08em;
}
.v-table td {
  background: #fff;
}
/* make chip non-interactive */
.assignee-chip { pointer-events: none; cursor: default; }
/* Hide pdf-only in normal screen */
.pdf-only { display: none; }
/* Shown during export via JS */
</style>

