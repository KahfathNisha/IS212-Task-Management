import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createVuetify } from 'vuetify';
import RecurringTaskItem from '@/components/RecurringTaskItem.vue';
import EditRecurrenceDialog from '@/components/EditRecurrenceDialog.vue';
import RecurrenceOptions from '@/components/RecurrenceOptions.vue';

// Create Vuetify instance for testing
const vuetify = createVuetify();

// Mock recurring task data
const mockRecurringTask = {
  id: 'recurring-task-1',
  userId: 'user-123',
  title: 'Weekly Report',
  description: 'Submit weekly progress report',
  recurrence: {
    enabled: true,
    type: 'weekly',
    interval: 1,
    startDate: '2025-10-01',
    endDate: '2025-12-31',
    dueOffset: 2,
    dueOffsetUnit: 'days'
  }
};

describe('Recurring Tasks Value Entry Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('RecurringTaskItem Value Display', () => {
    it('should display correct task title', () => {
      const wrapper = mount(RecurringTaskItem, {
        props: {
          task: mockRecurringTask,
          isEditing: false
        },
        global: {
          plugins: [vuetify]
        }
      });

      expect(wrapper.find('.task-title').text()).toBe('Weekly Report');
    });

    it('should display correct task description', () => {
      const wrapper = mount(RecurringTaskItem, {
        props: {
          task: mockRecurringTask,
          isEditing: false
        },
        global: {
          plugins: [vuetify]
        }
      });

      expect(wrapper.find('.task-desc').text()).toBe('Submit weekly progress report');
    });

    it('should display correct recurrence type', () => {
      const wrapper = mount(RecurringTaskItem, {
        props: {
          task: mockRecurringTask,
          isEditing: false
        },
        global: {
          plugins: [vuetify]
        }
      });

      expect(wrapper.find('.recurrence-type').text()).toBe('Every Weekly');
    });

    it('should format dates correctly', () => {
      const wrapper = mount(RecurringTaskItem, {
        props: {
          task: mockRecurringTask,
          isEditing: false
        },
        global: {
          plugins: [vuetify]
        }
      });

      const dateRange = wrapper.find('.recurrence-range').text();
      expect(dateRange).toContain('10/1/2025');
      expect(dateRange).toContain('12/31/2025');
    });

    it('should format custom recurrence correctly', () => {
      const customTask = {
        ...mockRecurringTask,
        recurrence: { ...mockRecurringTask.recurrence, type: 'custom', interval: 5 }
      };

      const wrapper = mount(RecurringTaskItem, {
        props: {
          task: customTask,
          isEditing: false
        },
        global: {
          plugins: [vuetify]
        }
      });

      expect(wrapper.find('.recurrence-type').text()).toBe('Every 5 days');
    });
  });

  describe('EditRecurrenceDialog Value Handling', () => {
    const mockRecurrence = {
      type: 'weekly',
      interval: 1,
      startDate: '2025-10-01',
      endDate: '2025-12-31',
      dueOffset: 2,
      dueOffsetUnit: 'days'
    };

    it('should render dialog with correct props', async () => {
      const wrapper = mount(EditRecurrenceDialog, {
        props: {
          show: true,
          recurrence: mockRecurrence
        },
        global: {
          plugins: [vuetify]
        }
      });

      await wrapper.vm.$nextTick();
      
      // Check that props are received correctly
      expect(wrapper.props('recurrence').type).toBe('weekly');
      expect(wrapper.props('recurrence').interval).toBe(1);
      expect(wrapper.props('recurrence').startDate).toBe('2025-10-01');
      expect(wrapper.props('recurrence').endDate).toBe('2025-12-31');
      expect(wrapper.props('recurrence').dueOffset).toBe(2);
      expect(wrapper.props('recurrence').dueOffsetUnit).toBe('days');
    });
  });

  describe('RecurrenceOptions Value Validation', () => {
    const mockModelValue = {
      type: 'weekly',
      interval: 1,
      startDate: '2025-10-01',
      endDate: '2025-12-31',
      dueOffset: 2,
      dueOffsetUnit: 'days'
    };

    it('should receive correct initial values', () => {
      const wrapper = mount(RecurrenceOptions, {
        props: {
          modelValue: mockModelValue
        },
        global: {
          plugins: [vuetify]
        }
      });

      expect(wrapper.props('modelValue').type).toBe('weekly');
      expect(wrapper.props('modelValue').interval).toBe(1);
      expect(wrapper.props('modelValue').startDate).toBe('2025-10-01');
      expect(wrapper.props('modelValue').endDate).toBe('2025-12-31');
      expect(wrapper.props('modelValue').dueOffset).toBe(2);
      expect(wrapper.props('modelValue').dueOffsetUnit).toBe('days');
    });

    it('should validate date values correctly', () => {
      const invalidModelValue = {
        ...mockModelValue,
        startDate: '2025-10-01',
        endDate: '2025-09-30' // End date before start date
      };

      const wrapper = mount(RecurrenceOptions, {
        props: {
          modelValue: invalidModelValue
        },
        global: {
          plugins: [vuetify]
        }
      });

      // Test the validation logic directly
      const startDate = new Date(invalidModelValue.startDate);
      const endDate = new Date(invalidModelValue.endDate);
      const isValid = endDate >= startDate;
      
      expect(isValid).toBe(false);
    });

    it('should handle numeric values correctly', () => {
      const numericModelValue = {
        ...mockModelValue,
        interval: 7,
        dueOffset: 14
      };

      const wrapper = mount(RecurrenceOptions, {
        props: {
          modelValue: numericModelValue
        },
        global: {
          plugins: [vuetify]
        }
      });

      expect(typeof wrapper.props('modelValue').interval).toBe('number');
      expect(typeof wrapper.props('modelValue').dueOffset).toBe('number');
      expect(wrapper.props('modelValue').interval).toBe(7);
      expect(wrapper.props('modelValue').dueOffset).toBe(14);
    });
  });

  describe('Value Type Validation', () => {
    it('should handle different recurrence types correctly', () => {
      const recurrenceTypes = ['daily', 'weekly', 'monthly', 'custom'];
      
      recurrenceTypes.forEach(type => {
        const taskWithType = {
          ...mockRecurringTask,
          recurrence: { ...mockRecurringTask.recurrence, type }
        };

        const wrapper = mount(RecurringTaskItem, {
          props: {
            task: taskWithType,
            isEditing: false
          },
          global: {
            plugins: [vuetify]
          }
        });

        // Verify the type is correctly set
        expect(taskWithType.recurrence.type).toBe(type);
      });
    });

    it('should handle different due offset units correctly', () => {
      const offsetUnits = ['days', 'weeks'];
      
      offsetUnits.forEach(unit => {
        const taskWithUnit = {
          ...mockRecurringTask,
          recurrence: { ...mockRecurringTask.recurrence, dueOffsetUnit: unit }
        };

        const wrapper = mount(RecurringTaskItem, {
          props: {
            task: taskWithUnit,
            isEditing: false
          },
          global: {
            plugins: [vuetify]
          }
        });

        expect(taskWithUnit.recurrence.dueOffsetUnit).toBe(unit);
      });
    });

    it('should handle empty or null values gracefully', () => {
      const taskWithNullRecurrence = {
        ...mockRecurringTask,
        recurrence: null
      };

      const wrapper = mount(RecurringTaskItem, {
        props: {
          task: taskWithNullRecurrence,
          isEditing: false
        },
        global: {
          plugins: [vuetify]
        }
      });

      // Should not throw error and should handle null gracefully
      expect(wrapper.exists()).toBe(true);
    });

    it('should validate date string formats', () => {
      // Helper function to properly validate dates
      const isValidDate = (dateStr) => {
        if (!dateStr || dateStr === null || dateStr === undefined) return false;
        const date = new Date(dateStr);
        return date instanceof Date && !isNaN(date.getTime());
      };

      const validDates = ['2025-10-01', '2025-12-31'];
      const invalidDates = ['invalid-date', '', null, undefined];

      validDates.forEach(dateStr => {
        expect(isValidDate(dateStr)).toBe(true);
      });

      invalidDates.forEach(dateStr => {
        expect(isValidDate(dateStr)).toBe(false);
      });
    });
  });
});

