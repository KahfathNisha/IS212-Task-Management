<template>
  <v-container>
    <v-card class="mx-auto" max-width="1200">
      <v-card-title class="text-h5 d-flex align-center">
        <v-icon start>mdi-chart-bar</v-icon>
        Project Progress Reports
      </v-card-title>
      <v-card-text>
        <!-- Project Selector --><v-select
          v-model="selectedProject"
          :items="projects"
          item-title="name"
          item-value="id"
          label="Select a Project to Generate a Report"
          variant="outlined"
          class="mb-6"
          :loading="projectsLoading"
          @update:modelValue="fetchReportData"
          :no-data-text="projectsLoading ? 'Loading projects...' : 'No projects found where you are a member.'"
        ></v-select>

        <!-- Loading Indicator --><div v-if="reportLoading" class="text-center pa-8">
          <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
          <p class="mt-4">Generating your report...</p>
        </div>

        <!-- Report Display Area --><div v-if="reportData && !reportLoading" id="report-content">
          <v-row>
            <v-col cols="12" class="d-flex justify-space-between align-center mb-4">
              <div>
                <h2 class="text-h4">{{ reportData.projectName }}</h2>
                <p class="text-medium-emphasis">Report generated on {{ new Date(reportData.generatedAt).toLocaleString() }}</p>
              </div>
              <v-btn
                id="export-button"
                color="primary"
                @click="exportToPDF"
                :loading="exporting"
                :disabled="reportData.summary.totalTasks === 0"
              >
                <v-icon start>mdi-file-pdf-box</v-icon>
                Export to PDF
              </v-btn>
            </v-col>
          </v-row>

          <!-- Visualizations --><v-row>
            <v-col cols="12" md="6">
              <v-card variant="outlined">
                <v-card-title>Task Status Overview</v-card-title>
                <v-card-text>
                  <div style="min-height: 250px;">
                    <canvas v-show="reportData.summary.totalTasks > 0" id="status-chart"></canvas>
                    <div v-if="reportData.summary.totalTasks === 0" class="d-flex flex-column align-center justify-center fill-height text-center pa-8 text-grey">
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
                    <canvas v-show="reportData.summary.totalTasks > 0" id="workload-chart"></canvas>
                    <div v-if="reportData.summary.totalTasks === 0" class="d-flex flex-column align-center justify-center fill-height text-center pa-8 text-grey">
                      <v-icon size="48" class="mb-2">mdi-chart-bar</v-icon>
                      <p>No workload data available.</p>
                    </div>
                  </div>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>

          <!-- Detailed Task List --><v-card variant="outlined" class="mt-8 report-task-list">
            <v-card-title>Detailed Task List</v-card-title>
            <v-list v-if="reportData.summary.totalTasks > 0" lines="two">
              <v-list-item
                v-for="task in reportData.tasks"
                :key="task.id"
                :title="task.title"
                :subtitle="`Status: ${task.status} | Priority: ${task.priority || 'N/A'}`"
              >
                <template #append>
                  <div class="d-flex flex-column align-end">
                    <v-chip-group>
                      <v-chip v-for="assignee in task.assignedTo" :key="assignee" size="small" class="ml-1">{{ assignee.split('@')[0] }}</v-chip>
                    </v-chip-group>
                    <span v-if="task.dueDate" class="text-caption text-medium-emphasis mt-1">
                      Due: {{ task.dueDate ? new Date(task.dueDate.seconds * 1000).toLocaleDateString() : 'N/A' }}
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
    </v-card>
  </v-container>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue';
import Chart from 'chart.js/auto';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useAuthStore } from '@/stores/auth';
import { db } from '@/config/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

const authStore = useAuthStore();
const projects = ref([]);
const selectedProject = ref(null);
const projectsLoading = ref(true);
const reportLoading = ref(false);
const exporting = ref(false);
const reportData = ref(null);

let statusChart = null;
let workloadChart = null;

async function fetchUserProjects() {
  projectsLoading.value = true;
  const currentUserId = authStore.userEmail;
  const currentUserRole = authStore.userRole;
  console.log(`[Reports] Fetching projects for user: ${currentUserId}, Role: ${currentUserRole}`);
  if (!currentUserId || (currentUserRole !== 'manager' && currentUserRole !== 'director')) {
    console.log("[Reports] User not logged in or not authorized.");
    projectsLoading.value = false;
    projects.value = [];
    return;
  }
  try {
    const q = query(collection(db, 'projects'), where('members', 'array-contains', currentUserId));
    const querySnapshot = await getDocs(q);
    projects.value = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    console.log(`[Reports] Found ${projects.value.length} projects.`);
  } catch (error) {
    console.error("[Reports] Error fetching projects:", error);
    projects.value = [];
  } finally {
    projectsLoading.value = false;
  }
}

watch(() => authStore.loading, (isLoading) => {
  if (!isLoading && projects.value.length === 0 && projectsLoading.value) {
      fetchUserProjects();
  }
}, { immediate: true });

async function fetchReportData(projectId) {
  if (!projectId) return;
  reportLoading.value = true;
  reportData.value = null; // Clear previous report data
  // Destroy old charts immediately
  if (statusChart) statusChart.destroy();
  if (workloadChart) workloadChart.destroy();
  statusChart = null;
  workloadChart = null;

  const requesterId = authStore.userEmail;
  console.log(`[Reports] Fetching report for Project ID: ${projectId}, Requester: ${requesterId}`);
  try {
    const response = await fetch(`/api/reports/project/${projectId}?requesterId=${requesterId}`);
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    if (data.success) {
      reportData.value = data.report; // Set the new data
      console.log("[Reports] Report data fetched:", data.report);
      // Charts will now be rendered by the watch function below
    } else {
      console.error('[Reports] Failed to fetch report:', data.message);
    }
  } catch (error) {
    console.error('[Reports] Error fetching report data:', error);
  } finally {
    reportLoading.value = false;
  }
}

// Watch the reportData directly. When it changes (and is not null),
// wait for the DOM update, then render the charts.
watch(reportData, async (newData) => {
  if (newData && newData.summary.totalTasks > 0) {
    await nextTick(); // Wait for Vue to update the DOM based on the new reportData
    renderCharts();   // Now render the charts
  }
}, { deep: true }); // Use deep watch if needed, though likely not necessary here

function renderCharts() {
  if (statusChart) statusChart.destroy();
  if (workloadChart) workloadChart.destroy();
  if (!reportData.value || reportData.value.summary.totalTasks === 0) return;

  const summary = reportData.value.summary;

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
  } else {
      console.error("Status chart canvas element not found!");
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
  } else {
      console.error("Workload chart canvas element not found!");
  }
}

async function exportToPDF() {
  if (!reportData.value || reportData.value.summary.totalTasks === 0) return;
  exporting.value = true;
  const reportElement = document.getElementById('report-content');
  const exportButton = document.getElementById('export-button');
  if (!reportElement) { exporting.value = false; return; }
  if (exportButton) exportButton.style.display = 'none';

  try {
      // Add a slight delay before capturing to ensure styles are applied
      await new Promise(resolve => setTimeout(resolve, 100));
      const canvas = await html2canvas(reportElement);
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      // --- FIX FOR PDF PADDING ---
      const margin = 10; // 10mm padding on each side (adjust as needed)
      const contentWidth = pdfWidth - 2 * margin;
      const contentHeight = (canvas.height * contentWidth) / canvas.width; // Maintain aspect ratio

      pdf.addImage(imgData, 'PNG', margin, margin, contentWidth, contentHeight); // Apply margins
      pdf.save(`${reportData.value.projectName}_Report.pdf`);
  } catch (error) {
      console.error("Error generating PDF:", error);
  } finally {
      if (exportButton) exportButton.style.display = '';
      exporting.value = false;
  }
}
</script>

<style scoped>
/* --- FIX for Black Box --- */
/* Apply a background and remove potential conflicting styles */
.report-task-list {
  overflow: hidden;
  background-color: var(--v-theme-surface); /* Use theme surface directly for better integration */
  border: 1px solid rgba(0, 0, 0, 0.08); /* Match card variant outlined */
}
/* Ensure dark mode compatibility - Vuetify handles --v-theme-surface */
</style>

