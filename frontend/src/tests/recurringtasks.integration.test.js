import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createVuetify } from 'vuetify';
import { nextTick } from 'vue';
import axios from 'axios';
import RecurringTasksSidebar from '@/components/RecurringTasksSidebar.vue';
import EditRecurrenceDialog from '@/components/EditRecurrenceDialog.vue';

// Mock axios
vi.mock('axios');

// Create Vuetify instance for testing
const vuetify = createVuetify();

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(() => 'mock-firebase-token'),
  setItem: vi.fn(),
  removeValue: vi.fn(),
  clear: vi.fn()
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
});

describe('Recurring Tasks Integration Tests', () => {
  let mockAxiosInstance;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock axios instance
    mockAxiosInstance = {
      get: vi.fn(),
      put: vi.fn(),
      interceptors: {
        request: { use: vi.fn() }
      }
    };

    vi.spyOn(axios, 'create').mockReturnValue(mockAxiosInstance);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Core Integration', () => {
    it('should mount RecurringTasksSidebar successfully', () => {
      const wrapper = mount(RecurringTasksSidebar, {
        props: { show: true },
        global: { plugins: [vuetify] }
      });

      expect(wrapper.exists()).toBe(true);
      expect(axios.create).toHaveBeenCalledWith({
        baseURL: 'http://localhost:3000/api',
        headers: { 'Content-Type': 'application/json' }
      });
    });

    it('should mount EditRecurrenceDialog successfully', () => {
      const mockRecurrence = {
        type: 'weekly',
        interval: 1,
        startDate: '2025-10-01',
        enabled: true
      };

      const wrapper = mount(EditRecurrenceDialog, {
        props: {
          show: true,
          recurrence: mockRecurrence
        },
        global: { plugins: [vuetify] }
      });

      expect(wrapper.exists()).toBe(true);
      expect(wrapper.props('recurrence')).toEqual(mockRecurrence);
    });

    it('should handle authentication token in requests', () => {
      const token = 'test-firebase-token';
      mockLocalStorage.getItem.mockReturnValue(token);

      mount(RecurringTasksSidebar, {
        props: { show: true },
        global: { plugins: [vuetify] }
      });

      // Test the interceptor function
      const interceptorCall = mockAxiosInstance.interceptors.request.use.mock.calls[0];
      const interceptorFn = interceptorCall[0];

      const mockConfig = { headers: {} };
      const result = interceptorFn(mockConfig);

      expect(result.headers.Authorization).toBe(`Bearer ${token}`);
    });

    it('should handle prop changes correctly', async () => {
      const wrapper = mount(RecurringTasksSidebar, {
        props: { show: false },
        global: { plugins: [vuetify] }
      });

      expect(wrapper.props('show')).toBe(false);

      await wrapper.setProps({ show: true });
      expect(wrapper.props('show')).toBe(true);
    });
  });
});