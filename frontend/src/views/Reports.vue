<template>
  <v-container>
    <v-card class="mx-auto" max-width="1400">
      <v-card-title class="text-h5 d-flex align-center">
        <v-icon start>mdi-chart-bar</v-icon>
        Generate Report
      </v-card-title>
      
      <!-- Report Type Tabs for Users with Multiple Options -->
      <v-tabs v-model="activeTab" v-if="hasMultipleReportTypes" class="mb-4">
        <v-tab v-if="canViewProjectReport" value="project">Project Schedule</v-tab>
        <v-tab v-if="canViewIndividualReport" value="individual">Individual Performance</v-tab>
        <v-tab v-if="canViewDepartmentReport" value="department">Department Performance</v-tab>
        <v-tab v-if="canViewCompanyReport" value="company">Company Performance</v-tab>
      </v-tabs>

      <!-- 
        ========================================
        PROJECT REPORT (Staff/Manager/Director)
        ========================================
      -->
      <v-card-text v-if="canViewProjectReport && (!hasMultipleReportTypes || activeTab === 'project')">
        <h3 class="text-h6 mb-4">Project Schedule Overview</h3>
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
          :no-data-text="projectsLoading ? 'Loading projects...' : 'No projects available.'"
        ></v-select>

        <div v-if="reportLoading" class="text-center pa-8">
          <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
          <p class="mt-4">Generating project report...</p>
      </div>

        <div v-if="projectReportData && !reportLoading" id="proj-report-content" class="report-export-fixed-container">
          <v-row>
            <v-col cols="12" class="d-flex justify-space-between align-center mb-4">
              <div>
                <h2 class="text-h4">{{ projectReportData.projectName }}</h2>
                <p class="text-medium-emphasis">Report generated on {{ new Date(projectReportData.generatedAt).toLocaleString() }}</p>
              </div>
              <v-btn
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

          <!-- Key Metrics -->
          <v-row class="mb-4">
            <v-col cols="12" md="2">
              <v-card variant="outlined">
                <v-card-text>
                  <div class="text-h6">{{ projectReportData.summary.totalTasks }}</div>
                  <div class="text-caption text-medium-emphasis">Total Tasks</div>
                </v-card-text>
              </v-card>
            </v-col>
            <v-col cols="12" md="2">
              <v-card variant="outlined">
                <v-card-text>
                  <div class="text-h6 text-info">{{ projectReportData.summary.statusCounts?.Unassigned || 0 }}</div>
                  <div class="text-caption text-medium-emphasis">Projected</div>
                </v-card-text>
              </v-card>
            </v-col>
            <v-col cols="12" md="2">
              <v-card variant="outlined">
                <v-card-text>
                  <div class="text-h6 text-warning">{{ projectReportData.summary.statusCounts?.Ongoing || 0 }}</div>
                  <div class="text-caption text-medium-emphasis">Ongoing</div>
                </v-card-text>
              </v-card>
            </v-col>
            <v-col cols="12" md="2">
              <v-card variant="outlined">
                <v-card-text>
                  <div class="text-h6 text-purple">{{ projectReportData.summary.statusCounts?.['Pending Review'] || 0 }}</div>
                  <div class="text-caption text-medium-emphasis">Under Review</div>
                </v-card-text>
              </v-card>
            </v-col>
            <v-col cols="12" md="2">
              <v-card variant="outlined">
                <v-card-text>
                  <div class="text-h6 text-success">{{ projectReportData.summary.statusCounts?.Completed || 0 }}</div>
                  <div class="text-caption text-medium-emphasis">Completed</div>
                </v-card-text>
              </v-card>
            </v-col>
            <v-col cols="12" md="2">
              <v-card variant="outlined" :class="{ 'border-error': projectReportData.summary.overdueCount > 0 }">
                <v-card-text>
                  <div class="text-h6 text-error">{{ projectReportData.summary.overdueCount || 0 }}</div>
                  <div class="text-caption text-medium-emphasis">Overdue</div>
                  <div class="text-caption">({{ projectReportData.summary.overduePercentage || 0 }}%)</div>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
          
          <!-- Task Breakdown Summary -->
          <v-row class="mb-4">
            <v-col cols="12">
              <v-card variant="outlined">
                <v-card-title>Task Status Breakdown</v-card-title>
                <v-card-text>
                  <v-row>
                    <v-col cols="12" md="3">
                      <div class="text-center">
                        <div class="text-h5 text-info">{{ projectReportData.summary.statusCounts?.Unassigned || 0 }}</div>
                        <div class="text-caption">Projected Tasks</div>
                        <div class="text-caption text-medium-emphasis">
                          {{ projectReportData.summary.totalTasks > 0 ? 
                            ((projectReportData.summary.statusCounts?.Unassigned || 0) / projectReportData.summary.totalTasks * 100).toFixed(1) : 0 }}%
                        </div>
                      </div>
                    </v-col>
                    <v-col cols="12" md="3">
                      <div class="text-center">
                        <div class="text-h5 text-warning">{{ projectReportData.summary.statusCounts?.Ongoing || 0 }}</div>
                        <div class="text-caption">Ongoing Tasks</div>
                        <div class="text-caption text-medium-emphasis">
                          {{ projectReportData.summary.totalTasks > 0 ? 
                            ((projectReportData.summary.statusCounts?.Ongoing || 0) / projectReportData.summary.totalTasks * 100).toFixed(1) : 0 }}%
                        </div>
                      </div>
                    </v-col>
                    <v-col cols="12" md="3">
                      <div class="text-center">
                        <div class="text-h5 text-purple">{{ projectReportData.summary.statusCounts?.['Pending Review'] || 0 }}</div>
                        <div class="text-caption">Tasks Under Review</div>
                        <div class="text-caption text-medium-emphasis">
                          {{ projectReportData.summary.totalTasks > 0 ? 
                            ((projectReportData.summary.statusCounts?.['Pending Review'] || 0) / projectReportData.summary.totalTasks * 100).toFixed(1) : 0 }}%
                        </div>
                      </div>
                    </v-col>
                    <v-col cols="12" md="3">
                      <div class="text-center">
                        <div class="text-h5 text-success">{{ projectReportData.summary.statusCounts?.Completed || 0 }}</div>
                        <div class="text-caption">Completed Tasks</div>
                        <div class="text-caption text-medium-emphasis">
                          {{ projectReportData.summary.totalTasks > 0 ? 
                            ((projectReportData.summary.statusCounts?.Completed || 0) / projectReportData.summary.totalTasks * 100).toFixed(1) : 0 }}%
                        </div>
                      </div>
                    </v-col>
                  </v-row>
                </v-card-text>
              </v-card>
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
                      <v-chip v-if="task.isOverdue" color="error" size="small" variant="flat">Overdue</v-chip>
                      <v-chip v-else-if="task.isAtRisk" color="warning" size="small" variant="flat">At Risk</v-chip>
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
        INDIVIDUAL REPORT (Manager/HR)
        ========================================
      -->
      <v-card-text v-if="canViewIndividualReport && (!hasMultipleReportTypes || activeTab === 'individual')">
        <h3 class="text-h6 mb-4">Individual Performance Report</h3>
        
        <v-row class="mb-4">
          <v-col cols="12" md="6">
            <v-select
              v-model="selectedEmployee"
              :items="availableEmployees"
              item-title="label"
              item-value="value"
              :label="userRole === 'staff' ? 'Your Performance Report' : 'Select Team Member'"
              variant="outlined"
              :loading="employeesLoading"
              :disabled="userRole === 'staff'"
              @update:modelValue="fetchIndividualReport"
            ></v-select>
            <v-alert v-if="userRole === 'staff'" type="info" variant="tonal" density="compact" class="mt-2">
              You can view your own individual performance report.
            </v-alert>
          </v-col>
          <v-col cols="12" md="3">
            <v-text-field
              v-model="individualStartDate"
              type="date"
              label="Start Date"
              variant="outlined"
              @update:modelValue="fetchIndividualReport"
            ></v-text-field>
          </v-col>
          <v-col cols="12" md="3">
            <v-text-field
              v-model="individualEndDate"
              type="date"
              label="End Date"
              variant="outlined"
              @update:modelValue="fetchIndividualReport"
            ></v-text-field>
          </v-col>
        </v-row>

        <div v-if="reportLoading" class="text-center pa-8">
          <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
          <p class="mt-4">Generating individual report...</p>
        </div>

        <div v-if="individualReportData && !reportLoading" id="individual-report-content" class="report-export-fixed-container">
          <v-row>
            <v-col cols="12" class="d-flex justify-space-between align-center mb-4">
              <div>
                <h2 class="text-h4">{{ individualReportData.employee.name }}</h2>
                <p class="text-medium-emphasis">{{ individualReportData.employee.department }} • Report generated on {{ new Date(individualReportData.generatedAt).toLocaleString() }}</p>
              </div>
              <v-btn
                color="primary"
                @click="exportToPDF('individual-report-content', individualReportData.employee.name + '_Performance')"
                :loading="exporting"
              >
                <v-icon start>mdi-file-pdf-box</v-icon>
                Export to PDF
              </v-btn>
            </v-col>
          </v-row>

          <!-- Key Metrics -->
          <v-row class="mb-4">
            <v-col cols="12" md="3">
              <v-card variant="outlined">
                <v-card-text>
                  <div class="text-h6">{{ individualReportData.metrics.totalTasks }}</div>
                  <div class="text-caption text-medium-emphasis">Total Tasks</div>
                </v-card-text>
              </v-card>
            </v-col>
            <v-col cols="12" md="3">
              <v-card variant="outlined">
                <v-card-text>
                  <div class="text-h6 text-success">{{ individualReportData.metrics.completionRate }}%</div>
                  <div class="text-caption text-medium-emphasis">Completion Rate</div>
                </v-card-text>
              </v-card>
            </v-col>
            <v-col cols="12" md="3">
              <v-card variant="outlined">
                <v-card-text>
                  <div class="text-h6">{{ individualReportData.metrics.avgTimePerTask }} days</div>
                  <div class="text-caption text-medium-emphasis">Avg Time per Task</div>
                </v-card-text>
              </v-card>
            </v-col>
            <v-col cols="12" md="3">
              <v-card variant="outlined" :class="{ 'border-error': individualReportData.metrics.overdueCount > 0 }">
                <v-card-text>
                  <div class="text-h6 text-error">{{ individualReportData.metrics.overdueCount }}</div>
                  <div class="text-caption text-medium-emphasis">Overdue Tasks</div>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>

          <v-row>
            <v-col cols="12" md="6">
              <v-card variant="outlined">
                <v-card-title>Task Status Breakdown</v-card-title>
                <v-card-text>
                  <div style="min-height: 250px;">
                    <canvas v-show="individualReportData.metrics.totalTasks > 0" id="individual-status-chart"></canvas>
                    <div v-if="individualReportData.metrics.totalTasks === 0" class="d-flex flex-column align-center justify-center fill-height text-center pa-8 text-grey">
                      <v-icon size="48" class="mb-2">mdi-chart-pie</v-icon>
                      <p>No task data available.</p>
                    </div>
                  </div>
                </v-card-text>
              </v-card>
            </v-col>
            <v-col cols="12" md="6">
              <v-card variant="outlined">
                <v-card-title>Time per Task (Top 10)</v-card-title>
                <v-card-text>
                  <v-list v-if="individualReportData.timeBreakdown && individualReportData.timeBreakdown.length > 0">
                    <v-list-item
                      v-for="(item, idx) in individualReportData.timeBreakdown.slice(0, 10)"
                      :key="idx"
                      :title="item.taskTitle"
                      :subtitle="`${item.daysTaken} days`"
                    ></v-list-item>
                  </v-list>
                  <div v-else class="text-center pa-4 text-grey">No completed tasks with time data.</div>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </div>
      </v-card-text>

      <!-- 
        ========================================
        DEPARTMENT REPORT (HR/Manager/Director)
        ========================================
      -->
      <v-card-text v-if="canViewDepartmentReport && (!hasMultipleReportTypes || activeTab === 'department')">
        <h3 class="text-h6 mb-4">Department Workload Report</h3>
        <v-select
          v-model="selectedDepartment"
          :items="departments"
          label="Select a Department"
          variant="outlined"
          class="mb-6"
          @update:modelValue="fetchDepartmentReport"
        ></v-select>

        <div v-if="reportLoading" class="text-center pa-8">
          <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
          <p class="mt-4">Generating department report...</p>
        </div>

        <div v-if="deptReportData && !reportLoading" id="dept-report-content" class="report-export-fixed-container">
          <v-row>
            <v-col cols="12" class="d-flex justify-space-between align-center mb-4">
              <div>
                <h2 class="text-h4">{{ deptReportData.departmentName }} Department</h2>
                <p class="text-medium-emphasis">Report generated on {{ new Date(deptReportData.generatedAt).toLocaleString() }}</p>
              </div>
              <v-btn color="primary" @click="exportToPDF('dept-report-content', deptReportData.departmentName)">
                <v-icon start>mdi-file-pdf-box</v-icon>
                Export to PDF
              </v-btn>
            </v-col>
          </v-row>

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
        COMPANY REPORT (Director only)
        ========================================
      -->
      <v-card-text v-if="canViewCompanyReport && (!hasMultipleReportTypes || activeTab === 'company')">
        <h3 class="text-h6 mb-4">Company Performance Report</h3>
        
        <v-row class="mb-4">
          <v-col cols="12" md="4">
        <v-select
              v-model="companySelectedDepartment"
              :items="companyDepartments"
              label="Filter by Department"
          variant="outlined"
              @update:modelValue="fetchCompanyReport"
        ></v-select>
          </v-col>
          <v-col cols="12" md="4">
            <v-text-field
              v-model="companyStartDate"
              type="date"
              label="Start Date"
              variant="outlined"
              @update:modelValue="fetchCompanyReport"
            ></v-text-field>
          </v-col>
          <v-col cols="12" md="4">
            <v-text-field
              v-model="companyEndDate"
              type="date"
              label="End Date"
              variant="outlined"
              @update:modelValue="fetchCompanyReport"
            ></v-text-field>
          </v-col>
        </v-row>

        <div v-if="reportLoading" class="text-center pa-8">
          <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
          <p class="mt-4">Generating company report...</p>
        </div>

        <div v-if="companyReportData && !reportLoading" id="company-report-content" class="report-export-fixed-container">
          <v-row>
            <v-col cols="12" class="d-flex justify-space-between align-center mb-4">
              <div>
                <h2 class="text-h4">Company Performance Report</h2>
                <p class="text-medium-emphasis">Report generated on {{ new Date(companyReportData.generatedAt).toLocaleString() }}</p>
              </div>
              <v-btn
                color="primary"
                @click="exportToPDF('company-report-content', 'Company_Performance')"
                :loading="exporting"
              >
                <v-icon start>mdi-file-pdf-box</v-icon>
                Export to PDF
              </v-btn>
            </v-col>
          </v-row>

          <!-- Key Indicators -->
          <v-row class="mb-4">
            <v-col cols="12" md="3">
              <v-card variant="outlined">
                <v-card-text>
                  <div class="text-h6">{{ companyReportData.summary.totalTasks }}</div>
                  <div class="text-caption text-medium-emphasis">Total Tasks</div>
                </v-card-text>
              </v-card>
            </v-col>
            <v-col cols="12" md="3">
              <v-card variant="outlined" :class="{ 'border-error': companyReportData.summary.overduePercentage > 10 }">
                <v-card-text>
                  <div class="text-h6 text-error">{{ companyReportData.summary.overdueCount }}</div>
                  <div class="text-caption text-medium-emphasis">Overdue Tasks</div>
                  <div class="text-caption">({{ companyReportData.summary.overduePercentage }}%)</div>
                </v-card-text>
              </v-card>
            </v-col>
            <v-col cols="12" md="3">
              <v-card variant="outlined">
                <v-card-text>
                  <div class="text-h6">{{ companyReportData.summary.statusCounts?.Completed || 0 }}</div>
                  <div class="text-caption text-medium-emphasis">Completed</div>
                </v-card-text>
              </v-card>
            </v-col>
            <v-col cols="12" md="3">
              <v-card variant="outlined">
                <v-card-text>
                  <div class="text-h6">{{ Object.keys(companyReportData.summary.departmentCounts || {}).length }}</div>
                  <div class="text-caption text-medium-emphasis">Departments</div>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>

          <v-row>
            <v-col cols="12" md="6">
              <v-card variant="outlined">
                <v-card-title>Status Distribution</v-card-title>
                <v-card-text>
                  <div style="min-height: 250px;">
                    <canvas v-show="companyReportData.summary.totalTasks > 0" id="company-status-chart"></canvas>
                  </div>
                </v-card-text>
              </v-card>
            </v-col>
            <v-col cols="12" md="6">
              <v-card variant="outlined">
                <v-card-title>Tasks by Department</v-card-title>
                 <v-card-text>
                   <div style="min-height: 250px;">
                    <canvas v-show="companyReportData.summary.totalTasks > 0" id="company-dept-chart"></canvas>
                  </div>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </div>
      </v-card-text>
      
      <!-- No Permission Message -->
      <v-card-text v-if="!canViewAnyReport">
        <div class="text-center pa-8 text-grey">
          <v-icon size="48" class="mb-2">mdi-lock-outline</v-icon>
          <p>You do not have permission to generate reports.</p>
        </div>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup>
import { ref, watch, nextTick, computed, onMounted } from 'vue';
import Chart from 'chart.js/auto';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useAuthStore } from '@/stores/auth';
import SPMlogo from '@/assets/SPM.png';

const authStore = useAuthStore();
const reportLoading = ref(false);
const exporting = ref(false);
const activeTab = ref('project');

// Role-based permissions
const userRole = computed(() => authStore.userRole?.toLowerCase() || '');
const userEmail = computed(() => authStore.userEmail || '');
const userDepartment = computed(() => authStore.userDepartment || '');

const canViewProjectReport = computed(() => {
  return ['staff', 'manager', 'director'].includes(userRole.value);
});

const canViewIndividualReport = computed(() => {
  // Staff can view their own individual report, managers/HR/directors can view others
  return ['staff', 'manager', 'hr', 'director'].includes(userRole.value);
});

const canViewDepartmentReport = computed(() => {
  return ['manager', 'hr', 'director'].includes(userRole.value);
});

const canViewCompanyReport = computed(() => {
  return userRole.value === 'director';
});

const canViewAnyReport = computed(() => {
  return canViewProjectReport.value || canViewIndividualReport.value || 
         canViewDepartmentReport.value || canViewCompanyReport.value;
});

const hasMultipleReportTypes = computed(() => {
  let count = 0;
  if (canViewProjectReport.value) count++;
  if (canViewIndividualReport.value) count++;
  if (canViewDepartmentReport.value) count++;
  if (canViewCompanyReport.value) count++;
  return count > 1;
});

// State
const projects = ref([]);
const selectedProject = ref(null);
const projectsLoading = ref(false);
const projectReportData = ref(null);
let statusChart = null;
let workloadChart = null;

const departments = ref(['Company (All)', 'Engineering', 'Finance', 'HR and Admin', 'Operations']);
const selectedDepartment = ref(null);
const deptReportData = ref(null);
let deptWorkloadChart = null;

const availableEmployees = ref([]);
const selectedEmployee = ref(null);
const employeesLoading = ref(false);
const individualReportData = ref(null);
const individualStartDate = ref(null);
const individualEndDate = ref(null);
let individualStatusChart = null;

const companyReportData = ref(null);
const companySelectedDepartment = ref('ALL');
const companyDepartments = ref(['ALL', 'Engineering', 'Finance', 'HR and Admin', 'Operations']);
const companyStartDate = ref(null);
const companyEndDate = ref(null);
let companyStatusChart = null;
let companyDeptChart = null;

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

// Fetch projects
watch(() => authStore.loading, (isLoading) => {
  if (!isLoading && canViewProjectReport.value) {
    fetchProjects();
  }
  if (!isLoading && canViewIndividualReport.value) {
    fetchEmployees();
  }
}, { immediate: true });

async function fetchProjects() {
  projectsLoading.value = true;
  try {
    const token = await authStore.getToken();
    const response = await fetch(`/api/projects`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const raw = response.ok ? await response.json() : [];
    
    // Filter based on role
    if (userRole.value === 'staff') {
      // Staff only see projects they're members of
      projects.value = raw.filter(p => p.members && p.members.includes(userEmail.value));
    } else if (userRole.value === 'manager') {
      // Managers see projects in their department or where they're a member
      projects.value = raw.filter(p => 
        (p.department && p.department === userDepartment.value) || 
        (p.members && p.members.includes(userEmail.value))
      );
    } else {
      // Directors see all
      projects.value = raw;
    }
  } catch (e) {
    console.error(e);
    projects.value = [];
  } finally {
    projectsLoading.value = false;
  }
}

async function fetchEmployees() {
  employeesLoading.value = true;
  try {
    // Staff can only view their own report
    if (userRole.value === 'staff') {
      availableEmployees.value = [{
        label: `${authStore.userName || userEmail.value.split('@')[0]} (You)`,
        value: userEmail.value
      }];
      // Auto-select themselves
      selectedEmployee.value = userEmail.value;
      employeesLoading.value = false;
      return;
    }

    // Managers/HR/Directors can view other employees
    const token = await authStore.getToken();
    const response = await fetch(`/api/auth/users`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (response.ok) {
      const users = await response.json();
      // Filter employees based on role
      let filtered = users.filter(u => u.role?.toLowerCase() !== 'director');
      
      if (userRole.value === 'hr' || userRole.value === 'manager') {
        // Only show employees in the same department
        filtered = filtered.filter(u => u.department === userDepartment.value);
      }
      
      availableEmployees.value = filtered.map(u => ({
        label: `${u.name || u.email.split('@')[0]} (${u.department || 'N/A'})`,
        value: u.email
      }));
    }
  } catch (e) {
    console.error('Error fetching employees:', e);
    availableEmployees.value = [];
  } finally {
    employeesLoading.value = false;
  }
}

async function fetchProjectReport(projectId) {
  if (!projectId) return;
  reportLoading.value = true;
  projectReportData.value = null;
  destroyChart(statusChart);
  destroyChart(workloadChart);
  statusChart = null;
  workloadChart = null;

  try {
    const response = await fetch(`/api/reports/project/${projectId}?requesterId=${encodeURIComponent(userEmail.value)}`);
    if (!response.ok) {
      if (response.status === 403) {
        throw new Error('You do not have permission to view this project report.');
      }
      throw new Error('Failed to fetch project report');
    }
    const data = await response.json();
    if (data.success) {
      projectReportData.value = data.report;
      if (data.report.summary.totalTasks > 0) {
        await nextTick();
        renderProjectCharts();
      }
    }
  } catch (error) {
    console.error('Error fetching project report:', error);
    alert(error.message || 'Failed to fetch project report');
  } finally {
    reportLoading.value = false;
  }
}

async function fetchIndividualReport() {
  if (!selectedEmployee.value) return;
  reportLoading.value = true;
  individualReportData.value = null;
  destroyChart(individualStatusChart);
  individualStatusChart = null;

  try {
    let url = `/api/reports/individual?employeeEmail=${encodeURIComponent(selectedEmployee.value)}&requesterId=${encodeURIComponent(userEmail.value)}`;
    if (individualStartDate.value) url += `&startDate=${individualStartDate.value}`;
    if (individualEndDate.value) url += `&endDate=${individualEndDate.value}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      if (response.status === 403) {
        throw new Error('You do not have permission to view this individual report.');
      }
      throw new Error('Failed to fetch individual report');
    }
    const data = await response.json();
    if (data.success) {
      individualReportData.value = data.report;
      if (data.report.metrics.totalTasks > 0) {
        await nextTick();
        renderIndividualChart();
      }
    }
  } catch (error) {
    console.error('Error fetching individual report:', error);
    alert(error.message || 'Failed to fetch individual report');
  } finally {
    reportLoading.value = false;
  }
}

async function fetchDepartmentReport(departmentName) {
  if (!departmentName) return;
  reportLoading.value = true;
  deptReportData.value = null;
  destroyChart(deptWorkloadChart);
  deptWorkloadChart = null;

  const param = departmentName === 'Company (All)' ? 'ALL' : encodeURIComponent(departmentName);
  try {
    const response = await fetch(`/api/reports/department?department=${param}&requesterId=${encodeURIComponent(userEmail.value)}`);
    if (!response.ok) throw new Error('Failed to fetch department report');
    const data = await response.json();
    if (data.success) {
      deptReportData.value = data.report;
      if (data.report.totalTasks > 0) {
        await nextTick();
        setTimeout(() => renderDepartmentChart(), 80);
      }
    }
  } catch (error) {
    console.error('Error fetching dept report:', error);
    alert('Failed to fetch department report');
  } finally {
    reportLoading.value = false;
  }
}

async function fetchCompanyReport() {
  reportLoading.value = true;
  companyReportData.value = null;
  destroyChart(companyStatusChart);
  destroyChart(companyDeptChart);
  companyStatusChart = null;
  companyDeptChart = null;

  try {
    let url = `/api/reports/company?requesterId=${encodeURIComponent(userEmail.value)}`;
    if (companySelectedDepartment.value && companySelectedDepartment.value !== 'ALL') {
      url += `&department=${encodeURIComponent(companySelectedDepartment.value)}`;
    }
    if (companyStartDate.value) url += `&startDate=${companyStartDate.value}`;
    if (companyEndDate.value) url += `&endDate=${companyEndDate.value}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      if (response.status === 403) {
        throw new Error('Only directors can generate company reports.');
      }
      throw new Error('Failed to fetch company report');
    }
    const data = await response.json();
    if (data.success) {
      companyReportData.value = data.report;
      if (data.report.summary.availableDepartments) {
        companyDepartments.value = ['ALL', ...data.report.summary.availableDepartments];
      }
      if (data.report.summary.totalTasks > 0) {
        await nextTick();
        renderCompanyCharts();
      }
    }
  } catch (error) {
    console.error('Error fetching company report:', error);
    alert(error.message || 'Failed to fetch company report');
  } finally {
    reportLoading.value = false;
  }
}

function destroyChart(chart) {
  if (chart) {
    chart.destroy();
  }
}

function renderProjectCharts() {
  destroyChart(statusChart);
  destroyChart(workloadChart);
  if (!projectReportData.value || projectReportData.value.summary.totalTasks === 0) return;

  const summary = projectReportData.value.summary;
  const statusCanvas = document.getElementById('status-chart');
  if (statusCanvas) {
    const statusCtx = statusCanvas.getContext('2d');
    
    // Ensure all status types are included, even if count is 0
    const allStatuses = ['Unassigned', 'Ongoing', 'Pending Review', 'Completed', 'Cancelled'];
    const statusLabels = [];
    const statusData = [];
    const statusColors = {
      'Unassigned': '#2196F3',      // Blue/Info
      'Ongoing': '#FF9800',          // Orange/Warning
      'Pending Review': '#9C27B0',   // Purple
      'Completed': '#4CAF50',         // Green/Success
      'Cancelled': '#757575'          // Grey
    };
    
    allStatuses.forEach(status => {
      const count = summary.statusCounts?.[status] || 0;
      // Only include statuses that exist in the data or show 0
      statusLabels.push(status);
      statusData.push(count);
    });
    
    statusChart = new Chart(statusCtx, {
      type: 'pie',
      data: {
        labels: statusLabels,
        datasets: [{
          label: 'Task Status',
          data: statusData,
          backgroundColor: statusLabels.map(s => statusColors[s] || '#BDBDBD')
        }]
      },
      options: { 
        responsive: true, 
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right'
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const label = context.label || '';
                const value = context.parsed || 0;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                return `${label}: ${value} (${percentage}%)`;
              }
            }
          }
        }
      }
    });
  }
  
  const workloadCanvas = document.getElementById('workload-chart');
  if (workloadCanvas) {
    const workloadCtx = workloadCanvas.getContext('2d');
    workloadChart = new Chart(workloadCtx, {
      type: 'bar',
      data: {
        labels: Object.keys(summary.memberWorkload).map(e => e.split('@')[0]),
        datasets: [{
          label: 'Number of Tasks Assigned',
          data: Object.values(summary.memberWorkload),
          backgroundColor: '#7E57C2'
        }]
      },
       options: { responsive: true, maintainAspectRatio: false }
    });
  }
}

function renderDepartmentChart() {
  destroyChart(deptWorkloadChart);
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
    const ctx = workloadCtx.getContext('2d');
    deptWorkloadChart = new Chart(ctx, {
      type: 'bar',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { stacked: true },
          y: { stacked: true, beginAtZero: true, title: { display: true, text: 'Number of Tasks' } }
        }
      }
    });
  }
}

function renderIndividualChart() {
  destroyChart(individualStatusChart);
  if (!individualReportData.value || individualReportData.value.metrics.totalTasks === 0) return;

  const metrics = individualReportData.value.metrics;
  const statusCanvas = document.getElementById('individual-status-chart');
  if (statusCanvas) {
    const statusCtx = statusCanvas.getContext('2d');
    individualStatusChart = new Chart(statusCtx, {
      type: 'doughnut',
      data: {
        labels: Object.keys(metrics.statusCounts),
        datasets: [{
          label: 'Task Status',
          data: Object.values(metrics.statusCounts),
          backgroundColor: ['#42A5F5', '#66BB6A', '#FFA726', '#EF5350', '#BDBDBD']
        }]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
  }
}

function renderCompanyCharts() {
  destroyChart(companyStatusChart);
  destroyChart(companyDeptChart);
  if (!companyReportData.value || companyReportData.value.summary.totalTasks === 0) return;

  const summary = companyReportData.value.summary;
  
  // Status chart
  const statusCanvas = document.getElementById('company-status-chart');
  if (statusCanvas) {
    const statusCtx = statusCanvas.getContext('2d');
    companyStatusChart = new Chart(statusCtx, {
      type: 'pie',
      data: {
        labels: Object.keys(summary.statusCounts),
        datasets: [{
          label: 'Task Status',
          data: Object.values(summary.statusCounts),
          backgroundColor: ['#42A5F5', '#66BB6A', '#FFA726', '#EF5350', '#BDBDBD']
        }]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
  }
  
  // Department chart
  const deptCanvas = document.getElementById('company-dept-chart');
  if (deptCanvas) {
    const deptCtx = deptCanvas.getContext('2d');
    companyDeptChart = new Chart(deptCtx, {
      type: 'bar',
      data: {
        labels: Object.keys(summary.departmentCounts),
        datasets: [{
          label: 'Tasks by Department',
          data: Object.values(summary.departmentCounts),
          backgroundColor: '#7E57C2'
        }]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
  }
}

async function exportToPDF(elementId, reportName) {
  exporting.value = true;
  const sourceEl = document.getElementById(elementId);
  if (!sourceEl) {
    exporting.value = false;
    return;
  }

  // Step 1: Convert all Chart.js canvas elements to images
  const canvasElements = Array.from(sourceEl.querySelectorAll('canvas'));
  const canvasToImageMap = new Map();
  
  // First, assign temporary IDs to canvases if they don't have them
  canvasElements.forEach((canvas, index) => {
    if (!canvas.id) {
      canvas.setAttribute('data-pdf-export-id', `canvas-${index}`);
    }
  });
  
  // Convert each canvas to an image
  for (let i = 0; i < canvasElements.length; i++) {
    const canvas = canvasElements[i];
    try {
      // Get the Chart.js instance from the canvas
      const chart = Chart.getChart(canvas);
      if (chart) {
        // Get the base64 image of the chart with higher quality
        // Use higher pixel ratio for better quality
        const originalPixelRatio = chart.options.devicePixelRatio || window.devicePixelRatio || 1;
        chart.options.devicePixelRatio = 3; // Higher quality for PDF export
        chart.resize();
        const imageUrl = chart.toBase64Image('image/png', 1.0);
        // Restore original pixel ratio
        chart.options.devicePixelRatio = originalPixelRatio;
        chart.resize();
        
        const canvasId = canvas.id || canvas.getAttribute('data-pdf-export-id') || `canvas-${i}`;
        canvasToImageMap.set(canvasId, imageUrl);
      } else {
        // Fallback: convert canvas directly to image
        const imageUrl = canvas.toDataURL('image/png');
        const canvasId = canvas.id || canvas.getAttribute('data-pdf-export-id') || `canvas-${i}`;
        canvasToImageMap.set(canvasId, imageUrl);
      }
    } catch (error) {
      console.warn('Failed to convert canvas to image:', error, canvas);
      // Still try to convert the canvas directly
      try {
        const imageUrl = canvas.toDataURL('image/png');
        const canvasId = canvas.id || canvas.getAttribute('data-pdf-export-id') || `canvas-${i}`;
        canvasToImageMap.set(canvasId, imageUrl);
      } catch (e) {
        console.warn('Failed to convert canvas to data URL:', e);
      }
    }
  }

  const cloneWrapper = document.createElement('div');
  cloneWrapper.style.position = 'fixed';
  cloneWrapper.style.left = '-99999px';
  cloneWrapper.style.top = '0';
  cloneWrapper.style.width = '900px';
  cloneWrapper.style.background = '#ffffff';
  cloneWrapper.style.padding = '18px';
  cloneWrapper.style.borderRadius = '12px';

  const logoDiv = document.createElement('div');
  logoDiv.style.display = 'flex';
  logoDiv.style.justifyContent = 'center';
  logoDiv.style.marginBottom = '16px';
  const img = document.createElement('img');
  img.src = SPMlogo;
  img.alt = 'SPM Logo';
  img.style.maxWidth = '230px';
  img.style.maxHeight = '100px';
  img.style.objectFit = 'contain';
  logoDiv.appendChild(img);
  cloneWrapper.appendChild(logoDiv);

  // Step 2: Clone the element and replace canvas with images
  const contentClone = sourceEl.cloneNode(true);
  contentClone.style.width = '900px';
  contentClone.style.background = '#ffffff';
  
  // Replace all canvas elements with img elements
  const clonedCanvases = Array.from(contentClone.querySelectorAll('canvas'));
  clonedCanvases.forEach((clonedCanvas, index) => {
    // Get the ID or temp ID from cloned canvas
    const canvasId = clonedCanvas.id || clonedCanvas.getAttribute('data-pdf-export-id') || `canvas-${index}`;
    
    if (canvasToImageMap.has(canvasId)) {
      const img = document.createElement('img');
      img.src = canvasToImageMap.get(canvasId);
      
      // Preserve original canvas dimensions
      const originalWidth = clonedCanvas.width || clonedCanvas.offsetWidth || 400;
      const originalHeight = clonedCanvas.height || clonedCanvas.offsetHeight || 250;
      
      img.style.width = originalWidth + 'px';
      img.style.height = originalHeight + 'px';
      img.style.maxWidth = '100%';
      img.style.display = 'block';
      
      // Replace the canvas with the image
      clonedCanvas.parentNode.replaceChild(img, clonedCanvas);
    } else {
      console.warn('No image found for canvas:', canvasId);
      // Try to convert the cloned canvas directly as fallback
      try {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = clonedCanvas.width || 400;
        tempCanvas.height = clonedCanvas.height || 250;
        const ctx = tempCanvas.getContext('2d');
        ctx.drawImage(clonedCanvas, 0, 0);
        
        const img = document.createElement('img');
        img.src = tempCanvas.toDataURL('image/png');
        img.style.width = tempCanvas.width + 'px';
        img.style.height = tempCanvas.height + 'px';
        img.style.maxWidth = '100%';
        img.style.display = 'block';
        clonedCanvas.parentNode.replaceChild(img, clonedCanvas);
      } catch (e) {
        console.warn('Failed to convert cloned canvas:', e);
      }
    }
  });
  
  cloneWrapper.appendChild(contentClone);
  document.body.appendChild(cloneWrapper);

  try {
    // Wait for images to load
    await new Promise(r => setTimeout(r, 200));
    
    // Wait for all images in the clone to load
    const images = cloneWrapper.querySelectorAll('img');
    await Promise.all(Array.from(images).map(img => {
      if (img.complete) return Promise.resolve();
      return new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        setTimeout(resolve, 1000); // Timeout after 1 second
      });
    }));

    const canvas = await html2canvas(cloneWrapper, { 
      scale: 3, // Increased from 2 to 3 for better quality
      backgroundColor: '#ffffff',
      useCORS: true,
      logging: false,
      allowTaint: false,
      removeContainer: false,
      imageTimeout: 15000,
      onclone: (clonedDoc) => {
        // Ensure all images are visible in the cloned document
        const clonedImages = clonedDoc.querySelectorAll('img');
        clonedImages.forEach(img => {
          img.style.display = 'block';
          img.style.visibility = 'visible';
          img.style.opacity = '1';
        });
      }
    });
    
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const margin = 10;
    const pdfWidth = pdf.internal.pageSize.getWidth() - (margin * 2);
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, 'PNG', margin, margin, pdfWidth, pdfHeight);
    pdf.save(`${reportName}_Report.pdf`);
  } catch (e) {
    console.error('Error generating PDF:', e);
    alert('Failed to generate PDF');
  } finally {
    document.body.removeChild(cloneWrapper);
    exporting.value = false;
  }
}

// Watch for tab changes
watch(activeTab, (newTab) => {
  if (newTab === 'company') {
    fetchCompanyReport();
  }
});

// Auto-fetch company report on mount if director
onMounted(() => {
  if (canViewProjectReport.value) {
    activeTab.value = 'project';
  } else if (canViewIndividualReport.value) {
    activeTab.value = 'individual';
  } else if (canViewDepartmentReport.value) {
    activeTab.value = 'department';
  } else if (canViewCompanyReport.value) {
    activeTab.value = 'company';
    fetchCompanyReport();
  }
});
</script>

<style scoped>
.report-task-list {
  overflow: hidden;
  background-color: var(--v-theme-surface);
  border: 1px solid rgba(0, 0, 0, 0.08);
}

.report-export-fixed-container {
  width: 900px;
  max-width: 98vw;
  margin: 0 auto 24px auto;
  background: white;
  padding: 18px 18px 28px 18px;
  border-radius: 12px;
  overflow: visible !important;
}

.border-error {
  border: 2px solid rgb(var(--v-theme-error)) !important;
}

.assignee-chip {
  pointer-events: none;
  cursor: default;
}

.v-table {
  width: 100%;
  border-collapse: collapse;
}

.v-table th,
.v-table td {
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
</style>