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
  return [rbac.value.canViewProject, rbac.value.canViewIndividual, rbac.value.canViewDepartment, rbac.value.canViewCompany].filter(Boolean).length > 1;
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
    console.error("Error generating report:", error);
    errorMessage.value = error.message;
  } finally {
    loading.value.report = false;
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
    loading.value.exporting = false; 
    return;
  }

  let cloneWrapper = null;
  try {
    // Step 1: Convert all Chart.js canvas elements to images BEFORE cloning
    // DO NOT modify original charts - just capture them as-is
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
      const canvasId = canvas.id || `canvas-${i}`;
      
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
        const imageUrl = canvas.toDataURL('image/png');
        const canvasId = canvas.id || canvas.getAttribute('data-pdf-export-id') || `canvas-${i}`;
        canvasToImageMap.set(canvasId, imageUrl);
      }
    } catch (error) {
        console.error('Failed to convert canvas to image:', error, canvas);
        // Fallback: try direct conversion
      try {
        const imageUrl = canvas.toDataURL('image/png');
        const canvasId = canvas.id || canvas.getAttribute('data-pdf-export-id') || `canvas-${i}`;
        canvasToImageMap.set(canvasId, imageUrl);
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

/* ===========================
   Responsive Design - Mobile
   =========================== */

/* Tablet and below */
@media (max-width: 960px) {
  .report-export-fixed-container {
    padding: 16px;
  }

  .report-header-content {
    flex-direction: column;
    align-items: flex-start;
  }

  .export-btn {
    width: 100%;
  }

  .chart-container {
    min-height: 300px;
  }

  .chart-canvas {
    max-height: 300px;
  }
}

/* Mobile devices */
@media (max-width: 600px) {
  .report-export-fixed-container {
    padding: 12px;
    margin: 0 auto 16px auto;
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

  .chart-canvas {
    max-height: 250px;
  }

  .chart-empty-state {
    min-height: 200px;
    padding: 24px 16px;
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
}

/* Very small mobile devices */
@media (max-width: 400px) {
  .report-export-fixed-container {
    padding: 8px;
  }

  .chart-container {
    min-height: 200px;
  }

  .chart-canvas {
    max-height: 200px;
  }
}
</style>

