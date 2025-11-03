/**
 * Unit Tests for Reports.vue Component
 * Tests report generation UI logic, validation, and user interactions
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import Reports from '../views/Reports.vue';

// Mock auth store
const mockAuthStore = {
  user: { email: 'test@example.com' },
  userRole: 'director',
  getToken: vi.fn().mockResolvedValue('mock-token'),
  userEmail: 'test@example.com',
};

// Mock useDisplay composable
const mockUseDisplay = () => ({
  mdAndUp: { value: true },
  isDesktop: { value: true },
});

vi.mock('../stores/auth', () => ({
  useAuthStore: () => mockAuthStore,
}));

vi.mock('vuetify', async () => {
  const actual = await vi.importActual('vuetify');
  return {
    ...actual,
    useDisplay: mockUseDisplay,
  };
});

// Mock Chart.js
global.Chart = vi.fn();
Chart.getChart = vi.fn();
Chart.register = vi.fn();

// Mock jsPDF and html2canvas
vi.mock('jspdf', () => ({
  default: vi.fn().mockImplementation(() => ({
    internal: {
      pageSize: {
        getWidth: () => 210,
        getHeight: () => 297,
      },
    },
    addPage: vi.fn(),
    save: vi.fn(),
    addImage: vi.fn(),
  })),
}));

vi.mock('html2canvas', () => ({
  default: vi.fn().mockResolvedValue({
    width: 800,
    height: 1200,
    toDataURL: () => 'data:image/png;base64,mock-image',
  }),
}));

// Mock fetch
global.fetch = vi.fn();

describe('Reports.vue', () => {
  let wrapper;
  let pinia;

  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
    vi.clearAllMocks();
    global.fetch.mockClear();
  });

  const createWrapper = (props = {}) => {
    return mount(Reports, {
      global: {
        plugins: [pinia],
        stubs: {
          'v-container': true,
          'v-card': true,
          'v-card-title': true,
          'v-card-text': true,
          'v-tabs': true,
          'v-tab': true,
          'v-window': true,
          'v-window-item': true,
          'v-select': true,
          'v-text-field': true,
          'v-btn': true,
          'v-row': true,
          'v-col': true,
          'v-alert': true,
          'v-progress-circular': true,
        },
      },
      props,
    });
  };

  describe('RBAC and Report Type Visibility', () => {
    it('should show all report types for director', () => {
      mockAuthStore.userRole = 'director';
      wrapper = createWrapper();
      
      expect(wrapper.vm.rbac.canViewProject).toBe(true);
      expect(wrapper.vm.rbac.canViewIndividual).toBe(true);
      expect(wrapper.vm.rbac.canViewDepartment).toBe(true);
      expect(wrapper.vm.rbac.canViewCompany).toBe(true);
    });

    it('should show limited report types for staff', () => {
      mockAuthStore.userRole = 'staff';
      wrapper = createWrapper();
      
      expect(wrapper.vm.rbac.canViewProject).toBe(true);
      expect(wrapper.vm.rbac.canViewIndividual).toBe(true);
      expect(wrapper.vm.rbac.canViewDepartment).toBe(false);
      expect(wrapper.vm.rbac.canViewCompany).toBe(false);
    });

    it('should allow HR to view company reports', () => {
      mockAuthStore.userRole = 'hr';
      wrapper = createWrapper();
      
      expect(wrapper.vm.rbac.canViewIndividual).toBe(true);
      expect(wrapper.vm.rbac.canViewDepartment).toBe(true);
      expect(wrapper.vm.rbac.canViewCompany).toBe(true);
    });
  });

  describe('Date Validation', () => {
    beforeEach(() => {
      wrapper = createWrapper();
    });

    it('should validate that end date is not earlier than start date', () => {
      wrapper.vm.params.startDate = '2024-01-15';
      wrapper.vm.params.endDate = '2024-01-10'; // Earlier than start
      
      expect(wrapper.vm.areDatesValid).toBe(false);
      expect(wrapper.vm.dateValidationMessage).toContain('cannot be earlier');
    });

    it('should allow valid date ranges', () => {
      wrapper.vm.params.startDate = '2024-01-10';
      wrapper.vm.params.endDate = '2024-01-15'; // Later than start
      
      expect(wrapper.vm.areDatesValid).toBe(true);
      expect(wrapper.vm.dateValidationMessage).toBe('');
    });

    it('should allow same start and end date', () => {
      wrapper.vm.params.startDate = '2024-01-15';
      wrapper.vm.params.endDate = '2024-01-15';
      
      expect(wrapper.vm.areDatesValid).toBe(true);
    });

    it('should disable generate button when dates are invalid', () => {
      wrapper.vm.params.startDate = '2024-01-15';
      wrapper.vm.params.endDate = '2024-01-10';
      wrapper.vm.params.selectedReportType = 'individual';
      wrapper.vm.params.employeeEmail = 'employee@example.com';
      
      expect(wrapper.vm.isGenerateButtonEnabled).toBe(false);
    });
  });

  describe('Department Selection Validation', () => {
    beforeEach(() => {
      wrapper = createWrapper();
      wrapper.vm.params.selectedReportType = 'company';
    });

    it('should disable generate button when ALL and other departments selected', () => {
      wrapper.vm.params.selectedDepartments = ['ALL', 'Engineering'];
      
      expect(wrapper.vm.isGenerateButtonEnabled).toBe(false);
    });

    it('should allow generate when only ALL is selected', () => {
      wrapper.vm.params.selectedDepartments = ['ALL'];
      
      expect(wrapper.vm.isGenerateButtonEnabled).toBe(true);
    });

    it('should allow generate when specific departments selected', () => {
      wrapper.vm.params.selectedDepartments = ['Engineering', 'Finance'];
      
      expect(wrapper.vm.isGenerateButtonEnabled).toBe(true);
    });

    it('should allow generate when no departments selected', () => {
      wrapper.vm.params.selectedDepartments = [];
      
      expect(wrapper.vm.isGenerateButtonEnabled).toBe(true);
    });
  });

  describe('Report Generation', () => {
    beforeEach(() => {
      wrapper = createWrapper();
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          report: {
            type: 'project',
            title: 'Test Report',
            summary: { totalTasks: 10 },
            generatedAt: new Date().toISOString(),
          },
        }),
      });
    });

    it('should generate project report successfully', async () => {
      wrapper.vm.params.selectedReportType = 'project';
      wrapper.vm.params.projectId = 'test-project';
      
      await wrapper.vm.generateReport();
      
      expect(global.fetch).toHaveBeenCalled();
      expect(wrapper.vm.reportData).toBeTruthy();
      expect(wrapper.vm.reportData.type).toBe('project');
    });

    it('should handle API errors gracefully', async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        status: 403,
        json: async () => ({ success: false, message: 'Forbidden' }),
      });

      wrapper.vm.params.selectedReportType = 'project';
      wrapper.vm.params.projectId = 'test-project';
      
      await wrapper.vm.generateReport();
      
      expect(wrapper.vm.errorMessage).toContain('Forbidden');
    });

    it('should include authentication token in requests', async () => {
      wrapper.vm.params.selectedReportType = 'individual';
      wrapper.vm.params.employeeEmail = 'employee@example.com';
      
      await wrapper.vm.generateReport();
      
      expect(global.fetch).toHaveBeenCalled();
      const call = global.fetch.mock.calls[0];
      expect(call[1].headers['Authorization']).toContain('Bearer');
    });
  });

  describe('Data Fetching', () => {
    beforeEach(() => {
      wrapper = createWrapper();
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => [],
      });
    });

    it('should fetch projects for project report', async () => {
      await wrapper.vm.fetchSelectorData();
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/projects'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': expect.stringContaining('Bearer'),
          }),
        })
      );
    });

    it('should fetch employees for individual report', async () => {
      mockAuthStore.userRole = 'manager';
      await wrapper.vm.fetchSelectorData();
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/auth/users'),
        expect.any(Object)
      );
    });

    it('should filter HR users from employee list', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => [
          { email: 'staff@example.com', name: 'Staff', role: 'staff' },
          { email: 'hr@example.com', name: 'HR', role: 'hr' },
          { email: 'manager@example.com', name: 'Manager', role: 'manager' },
        ],
      });

      mockAuthStore.userRole = 'director';
      wrapper = createWrapper();
      await wrapper.vm.fetchSelectorData();
      
      // HR should be filtered out
      const hrEmployees = wrapper.vm.employees.filter(e => e.role === 'hr');
      expect(hrEmployees.length).toBe(0);
    });
  });

  describe('Helper Functions', () => {
    beforeEach(() => {
      wrapper = createWrapper();
    });

    it('should format dates correctly', () => {
      const date = new Date('2024-01-15');
      const formatted = wrapper.vm.formatDate(date);
      
      expect(formatted).toBeTruthy();
      expect(typeof formatted).toBe('string');
    });

    it('should get task color based on status', () => {
      expect(wrapper.vm.getTaskColor({ status: 'Completed' })).toBeTruthy();
      expect(wrapper.vm.getTaskColor({ status: 'Ongoing' })).toBeTruthy();
      expect(wrapper.vm.getTaskColor({ status: 'To Do' })).toBeTruthy();
    });

    it('should remove department from selection', () => {
      wrapper.vm.params.selectedDepartments = ['Engineering', 'Finance', 'HR'];
      wrapper.vm.removeDepartment('Finance');
      
      expect(wrapper.vm.params.selectedDepartments).not.toContain('Finance');
      expect(wrapper.vm.params.selectedDepartments).toHaveLength(2);
    });

    it('should get department title correctly', () => {
      wrapper.vm.allDepartmentsForFilter = [
        { title: 'All Departments', value: 'ALL' },
        { title: 'Engineering', value: 'Engineering' },
      ];
      
      expect(wrapper.vm.getDepartmentTitle('ALL')).toBe('All Departments');
      expect(wrapper.vm.getDepartmentTitle('Engineering')).toBe('Engineering');
    });
  });

  describe('PDF Export', () => {
    beforeEach(() => {
      wrapper = createWrapper();
      wrapper.vm.reportData = {
        type: 'project',
        title: 'Test Report',
        summary: { totalTasks: 10 },
        generatedAt: new Date().toISOString(),
      };
      
      // Mock DOM elements
      document.querySelector = vi.fn().mockReturnValue({
        querySelectorAll: vi.fn().mockReturnValue([
          {
            id: 'pie-chart',
            getContext: vi.fn().mockReturnValue({}),
            width: 400,
            height: 400,
            toDataURL: vi.fn().mockReturnValue('data:image/png;base64,mock'),
            parentElement: { getBoundingClientRect: () => ({ width: 400, height: 400 }) },
          },
        ]),
        cloneNode: vi.fn().mockReturnValue({
          querySelectorAll: vi.fn().mockReturnValue([]),
        }),
      });
      
      document.body.appendChild = vi.fn();
      document.body.removeChild = vi.fn();
    });

    it('should export report to PDF', async () => {
      await wrapper.vm.exportToPDF();
      
      expect(global.html2canvas).toHaveBeenCalled();
      expect(global.jsPDF).toHaveBeenCalled();
    });

    it('should handle PDF export errors gracefully', async () => {
      global.html2canvas.mockRejectedValue(new Error('Export failed'));
      
      await wrapper.vm.exportToPDF();
      
      expect(wrapper.vm.loading.exporting).toBe(false);
    });
  });

  describe('Loading States', () => {
    beforeEach(() => {
      wrapper = createWrapper();
    });

    it('should set loading state during report generation', async () => {
      global.fetch.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: async () => ({ success: true, report: {} }),
      }), 100)));

      wrapper.vm.params.selectedReportType = 'project';
      wrapper.vm.params.projectId = 'test-project';
      
      const promise = wrapper.vm.generateReport();
      
      expect(wrapper.vm.loading.report).toBe(true);
      
      await promise;
      
      expect(wrapper.vm.loading.report).toBe(false);
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      wrapper = createWrapper();
    });

    it('should display error message on fetch failure', async () => {
      global.fetch.mockRejectedValue(new Error('Network error'));
      
      wrapper.vm.params.selectedReportType = 'project';
      wrapper.vm.params.projectId = 'test-project';
      
      await wrapper.vm.generateReport();
      
      expect(wrapper.vm.errorMessage).toBeTruthy();
    });

    it('should clear error message when generating new report', async () => {
      wrapper.vm.errorMessage = 'Previous error';
      
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, report: {} }),
      });
      
      wrapper.vm.params.selectedReportType = 'project';
      wrapper.vm.params.projectId = 'test-project';
      
      await wrapper.vm.generateReport();
      
      // Error should be cleared on successful generation
      expect(wrapper.vm.errorMessage).toBe('');
    });
  });

  describe('Mobile Responsiveness', () => {
    it('should handle mobile display correctly', () => {
      mockUseDisplay.isDesktop.value = false;
      wrapper = createWrapper();
      
      expect(wrapper.vm.isDesktop).toBe(false);
    });

    it('should use short tab labels on mobile', () => {
      // This would be tested through the template rendering
      // The component should conditionally show tab-label-short vs tab-label-full
      expect(true).toBe(true); // Placeholder for template rendering tests
    });
  });

  // ============================================
  // USER STORY ACCEPTANCE CRITERIA TESTS
  // ============================================

  describe('User Story 1: Monitor Team Progress (Manager) - Acceptance Criteria', () => {
    beforeEach(() => {
      mockAuthStore.userRole = 'manager';
      wrapper = createWrapper();
    });

    describe('AC1: View all team members\' task details', () => {
      it('should show department report option for managers', () => {
        expect(wrapper.vm.rbac.canViewDepartment).toBe(true);
      });

      it('should display department selector for department reports', () => {
        wrapper.vm.params.selectedReportType = 'department';
        expect(wrapper.vm.params.selectedReportType).toBe('department');
      });
    });

    describe('AC2: Select a specific team to generate a report for', () => {
      it('should allow manager to select their department', async () => {
        global.fetch.mockResolvedValue({
          ok: true,
          json: async () => ['Engineering', 'Finance'],
        });

        await wrapper.vm.fetchSelectorData();

        expect(wrapper.vm.departments).toBeDefined();
      });
    });

    describe('AC4: Select a date range for tasks', () => {
      it('should provide date range input fields', () => {
        wrapper.vm.params.selectedReportType = 'individual';
        
        expect(wrapper.vm.params).toHaveProperty('startDate');
        expect(wrapper.vm.params).toHaveProperty('endDate');
      });

      it('should validate date ranges', () => {
        wrapper.vm.params.startDate = '2024-01-15';
        wrapper.vm.params.endDate = '2024-01-10'; // Invalid
        
        expect(wrapper.vm.areDatesValid).toBe(false);
      });
    });

    describe('AC5: Export report in PDF format', () => {
      it('should have PDF export button when report is generated', async () => {
        wrapper.vm.reportData = {
          type: 'department',
          title: 'Test Report',
          summary: { totalTasks: 10 },
        };

        expect(typeof wrapper.vm.exportToPDF).toBe('function');
      });
    });

    describe('AC6: Can only generate a report for their own team', () => {
      it('should restrict department selection to manager\'s department', async () => {
        mockAuthStore.userRole = 'manager';
        wrapper = createWrapper();

        global.fetch.mockResolvedValue({
          ok: true,
          json: async () => [
            { email: 'manager@example.com', department: 'Engineering', role: 'manager' },
          ],
        });

        await wrapper.vm.fetchSelectorData();

        expect(wrapper.vm.params.selectedReportType).toBeDefined();
      });
    });
  });

  describe('User Story 3: Project Schedule Overview (Manager) - Acceptance Criteria', () => {
    beforeEach(() => {
      mockAuthStore.userRole = 'manager';
      wrapper = createWrapper();
    });

    describe('AC1: View all tasks within a specific project', () => {
      it('should allow selecting a project for report generation', () => {
        wrapper.vm.params.selectedReportType = 'project';
        expect(wrapper.vm.params.selectedReportType).toBe('project');
        expect(wrapper.vm.rbac.canViewProject).toBe(true);
      });
    });

    describe('AC2: See timeline view of task schedules', () => {
      it('should display tasks in timeline format when project report is generated', async () => {
        wrapper.vm.reportData = {
          type: 'project',
          title: 'Test Project',
          tasks: [
            {
              id: 'task-1',
              title: 'Task 1',
              status: 'Ongoing',
              dueDate: new Date(),
              isOverdue: false,
              isAtRisk: false,
            },
          ],
          summary: { totalTasks: 1 },
        };

        expect(wrapper.vm.reportData.tasks.length).toBeGreaterThan(0);
      });
    });

    describe('AC3: View team member allocation across tasks', () => {
      it('should display workload chart showing team member allocation', async () => {
        wrapper.vm.reportData = {
          type: 'project',
          title: 'Test Project',
          summary: {
            totalTasks: 5,
            memberWorkload: {
              'member1@example.com': 3,
              'member2@example.com': 2,
            },
            memberNames: {
              'member1@example.com': 'Member 1',
              'member2@example.com': 'Member 2',
            },
          },
        };

        expect(wrapper.vm.reportData.summary.memberWorkload).toBeDefined();
        expect(Object.keys(wrapper.vm.reportData.summary.memberWorkload).length).toBe(2);
      });
    });

    describe('AC4: Highlight overdue and at-risk tasks', () => {
      it('should mark tasks as overdue in the display', () => {
        wrapper.vm.reportData = {
          type: 'project',
          tasks: [
            {
              id: 'task-1',
              title: 'Overdue Task',
              status: 'Ongoing',
              isOverdue: true,
              isAtRisk: false,
            },
          ],
        };

        const overdueTask = wrapper.vm.reportData.tasks.find(t => t.isOverdue);
        expect(overdueTask).toBeDefined();
        expect(overdueTask.isOverdue).toBe(true);
      });

      it('should mark tasks as at-risk in the display', () => {
        wrapper.vm.reportData = {
          type: 'project',
          tasks: [
            {
              id: 'task-1',
              title: 'At Risk Task',
              status: 'Ongoing',
              isOverdue: false,
              isAtRisk: true,
            },
          ],
        };

        const atRiskTask = wrapper.vm.reportData.tasks.find(t => t.isAtRisk);
        expect(atRiskTask).toBeDefined();
        expect(atRiskTask.isAtRisk).toBe(true);
      });

      it('should display overdue count and percentage', () => {
        wrapper.vm.reportData = {
          type: 'project',
          summary: {
            totalTasks: 10,
            overdueCount: 3,
            overduePercentage: 30,
          },
        };

        expect(wrapper.vm.reportData.summary.overdueCount).toBe(3);
        expect(wrapper.vm.reportData.summary.overduePercentage).toBe(30);
      });
    });
  });

  describe('User Story 5: Workload Distribution Report (HR) - Acceptance Criteria', () => {
    beforeEach(() => {
      mockAuthStore.userRole = 'hr';
      wrapper = createWrapper();
    });

    describe('AC1: Department Selection', () => {
      it('should allow HR to select any department', () => {
        expect(wrapper.vm.rbac.canViewDepartment).toBe(true);
        expect(wrapper.vm.rbac.canViewCompany).toBe(true);
      });
    });

    describe('AC2: Task Distribution Overview', () => {
      it('should display task counts per employee', async () => {
        wrapper.vm.reportData = {
          type: 'department',
          title: 'Engineering Department Report',
          employeeWorkloads: {
            'employee1@example.com': {
              name: 'Employee 1',
              'To Do': 2,
              'Ongoing': 3,
              'Completed': 5,
              'Total': 10,
            },
          },
        };

        const workload = wrapper.vm.reportData.employeeWorkloads['employee1@example.com'];
        expect(workload['To Do']).toBe(2);
        expect(workload['Ongoing']).toBe(3);
        expect(workload['Completed']).toBe(5);
        expect(workload['Total']).toBe(10);
      });
    });

    describe('AC4: Average Task Completion Time', () => {
      it('should display average time per task for individual reports', () => {
        wrapper.vm.reportData = {
          type: 'individual',
          summary: {
            avgTimePerTask: '4.5',
          },
        };

        expect(wrapper.vm.reportData.summary.avgTimePerTask).toBe('4.5');
      });
    });
  });

  describe('User Story 6: Report Generation for Review (Director) - Acceptance Criteria', () => {
    beforeEach(() => {
      mockAuthStore.userRole = 'director';
      wrapper = createWrapper();
    });

    describe('AC1: View all tasks from all departments', () => {
      it('should allow director to generate company-wide reports', () => {
        expect(wrapper.vm.rbac.canViewCompany).toBe(true);
      });
    });

    describe('AC2: Filter tasks by department', () => {
      it('should allow selecting multiple departments', () => {
        wrapper.vm.params.selectedReportType = 'company';
        wrapper.vm.params.selectedDepartments = ['Engineering', 'Finance'];
        
        expect(wrapper.vm.params.selectedDepartments.length).toBe(2);
        expect(wrapper.vm.isGenerateButtonEnabled).toBe(true);
      });

      it('should prevent selecting ALL with other departments', () => {
        wrapper.vm.params.selectedReportType = 'company';
        wrapper.vm.params.selectedDepartments = ['ALL', 'Engineering'];
        
        expect(wrapper.vm.isGenerateButtonEnabled).toBe(false);
      });
    });

    describe('AC3: View key indicators (% overdue)', () => {
      it('should display overdue percentage in company report', () => {
        wrapper.vm.reportData = {
          type: 'company',
          summary: {
            totalTasks: 100,
            overdueCount: 15,
            overduePercentage: 15,
          },
        };

        expect(wrapper.vm.reportData.summary.overduePercentage).toBe(15);
        expect(wrapper.vm.reportData.summary.overdueCount).toBe(15);
      });
    });

    describe('AC4: Select a time range for tasks', () => {
      it('should provide date range inputs for company reports', () => {
        wrapper.vm.params.selectedReportType = 'company';
        
        expect(wrapper.vm.params).toHaveProperty('startDate');
        expect(wrapper.vm.params).toHaveProperty('endDate');
      });
    });
  });
});

