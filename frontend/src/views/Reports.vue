<template>
  <v-container>
    <v-card class="mx-auto" max-width="1200">
      <v-card-title class="text-h5 d-flex align-center">
        <v-icon start>mdi-chart-bar</v-icon>
        Project Progress Reports
      </v-card-title>
      <v-card-text>
        <!-- Project Selector (SCRUM-80) -->
        <v-select
          v-model="selectedProject"
          :items="projects"
          item-title="name"
          item-value="id"
          label="Select a Project to Generate a Report"
          variant="outlined"
          class="mb-6"
          :loading="projectsLoading"
          @update:modelValue="fetchReportData"
          no-data-text="No projects found where you are a member."
        ></v-select>

        <!-- Loading Indicator -->
        <div v-if="reportLoading" class="text-center pa-8">
          <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
          <p class="mt-4">Generating your report...</p>
        </div>

        <!-- Report Display Area -->
        <div v-if="reportData && !reportLoading" id="report-content">
          <v-row>
            <v-col cols="12" class="d-flex justify-space-between align-center mb-4">
              <div>
                <h2 class="text-h4">{{ reportData.projectName }}</h2>
                <p class="text-medium-emphasis">Report generated on {{ new Date(reportData.generatedAt).toLocaleString() }}</p>
              </div>
              <v-btn color="primary" @click="exportToPDF" :loading="exporting">
                <v-icon start>mdi-file-pdf-box</v-icon>
                Export to PDF
              </v-btn>
            </v-col>
          </v-row>

          <!-- Visualizations -->
          <v-row>
            <v-col cols="12" md="6">
              <v-card variant="outlined">
                <v-card-title>Task Status Overview</v-card-title>
                <v-card-text>
                  <canvas id="status-chart"></canvas>
                </v-card-text>
              </v-card>
            </v-col>
            <v-col cols="12" md="6">
              <v-card variant="outlined">
                <v-card-title>Team Workload</v-card-title>
                <v-card-text>
                  <canvas id="workload-chart"></canvas>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>

          <!-- Detailed Task List (SCRUM-81) -->
          <v-card variant="outlined" class="mt-8">
            <v-card-title>Detailed Task List</v-card-title>
            <v-list lines="two">
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
                      Due: {{ new Date(task.dueDate.toDate()).toLocaleDateString() }}
                    </span>
                  </div>
                </template>
              </v-list-item>
            </v-list>
             <div v-if="!reportData.tasks || reportData.tasks.length === 0" class="text-center pa-4 text-grey">
                No tasks found for this project.
            </div>
          </v-card>
        </div>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { db } from '@/config/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import Chart from 'chart.js/auto';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const authStore = useAuthStore();
const projects = ref([]);
const selectedProject = ref(null);
const projectsLoading = ref(false);
const reportLoading = ref(false);
const exporting = ref(false);
const reportData = ref(null);

let statusChart = null;
let workloadChart = null;

// Fetch projects where the current user is a member
onMounted(async () => {
  projectsLoading.value = true;
  const currentUserId = authStore.userEmail;
  if (!currentUserId || (authStore.userRole !== 'manager' && authStore.userRole !== 'director')) {
    projectsLoading.value = false;
    // Optionally show a message that the user can't view reports
    return;
  }
  // This query now correctly fetches projects based on the 'members' array.
  const q = query(collection(db, 'projects'), where('members', 'array-contains', currentUserId));
  const querySnapshot = await getDocs(q);
  projects.value = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  projectsLoading.value = false;
});

async function fetchReportData(projectId) {
  if (!projectId) return;
  reportLoading.value = true;
  reportData.value = null;
  const requesterId = authStore.userEmail;

  try {
    const response = await fetch(`/api/reports/project/${projectId}?requesterId=${requesterId}`);
    const data = await response.json();
    if (data.success) {
      reportData.value = data.report;
      await nextTick(); // Wait for the DOM to update before rendering charts
      renderCharts();
    } else {
      console.error('Failed to fetch report:', data.message);
      // You could show an error message to the user here
    }
  } catch (error) {
    console.error('Error fetching report data:', error);
  } finally {
    reportLoading.value = false;
  }
}

function renderCharts() {
  if (statusChart) statusChart.destroy();
  if (workloadChart) workloadChart.destroy();

  const summary = reportData.value.summary;

  // Status Pie Chart
  const statusCtx = document.getElementById('status-chart').getContext('2d');
  statusChart = new Chart(statusCtx, {
    type: 'pie',
    data: {
      labels: Object.keys(summary.statusCounts),
      datasets: [{
        label: 'Task Status',
        data: Object.values(summary.statusCounts),
        backgroundColor: ['#42A5F5', '#66BB6A', '#FFA726', '#EF5350', '#8D6E63', '#BDBDBD'],
      }]
    },
  });

  // Workload Bar Chart
  const workloadCtx = document.getElementById('workload-chart').getContext('2d');
  workloadChart = new Chart(workloadCtx, {
    type: 'bar',
    data: {
      labels: Object.keys(summary.memberWorkload).map(e => e.split('@')[0]),
      datasets: [{
        label: 'Number of Tasks Assigned',
        data: Object.values(summary.memberWorkload),
        backgroundColor: '#7E57C2',
      }]
    },
  });
}

async function exportToPDF() {
  exporting.value = true;
  const reportElement = document.getElementById('report-content');
  const canvas = await html2canvas(reportElement);
  const imgData = canvas.toDataURL('image/png');
  
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
  
  pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
  pdf.save(`${reportData.value.projectName}_Report.pdf`);
  exporting.value = false;
}
</script>

