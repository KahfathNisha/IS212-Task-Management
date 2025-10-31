import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createVuetify } from 'vuetify';
import { nextTick } from 'vue';
import axios from 'axios';
import RecurringTasksSidebar from '@/components/RecurringTasksSidebar.vue';
import EditRecurrenceDialog from '@/components/EditRecurrenceDialog.vue';

// Mock Firebase
vi.mock('@/config/firebase', () => ({
  db: {},
  default: {}
}));

// Mock Firebase Firestore
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  getDocs: vi.fn(() => Promise.resolve({ 
    docs: [
      {
        id: 'user1@example.com',
        data: () => ({ name: 'Test User 1' })
      },
      {
        id: 'user2@example.com', 
        data: () => ({ name: 'Test User 2' })
      }
    ]
  }))
}));

// Mock axios
vi.mock('axios', () => ({
  default: {
    create: vi.fn()
  }
}));

// Create Vuetify instance for testing
const vuetify = createVuetify({
  display: {
    mobileBreakpoint: 'sm',
    thresholds: {
      xs: 0,
      sm: 600,
      md: 960,
      lg: 1280,
      xl: 1920
    }
  }
});

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(() => 'mock-firebase-token'),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
});

// Mock console methods
beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Recurring Tasks Integration Tests', () => {
  let mockAxiosInstance;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock axios instance
    mockAxiosInstance = {
      get: vi.fn(() => Promise.resolve({ data: [] })),
      put: vi.fn(() => Promise.resolve({ data: {} })),
      interceptors: {
        request: { use: vi.fn() }
      }
    };

    // Mock axios.create to return our mock instance
    axios.create.mockReturnValue(mockAxiosInstance);
  });

  const createWrapper = (component, props = {}) => {
    return mount(component, {
      props,
      global: { 
        plugins: [vuetify],
        mocks: {
          $vuetify: {
            display: {
              mobile: false,
              xs: false,
              sm: false,
              md: true,
              lg: false,
              xl: false,
              smAndDown: false,
              mdAndDown: true,
              lgAndDown: true,
              smAndUp: true,
              mdAndUp: true,
              lgAndUp: false
            }
          }
        },
        stubs: {
          'EditRecurrenceDialog': {
            template: '<div data-testid="edit-recurrence-dialog">Mocked EditRecurrenceDialog</div>',
            props: ['show', 'recurrence'],
            emits: ['close', 'save']
          },
          'RecurrenceOptions': {
            template: '<div data-testid="recurrence-options">Mocked RecurrenceOptions</div>'
          }
        }
      }
    });
  };

  describe('Core Integration', () => {
    it('should mount RecurringTasksSidebar successfully', async () => {
      const wrapper = createWrapper(RecurringTasksSidebar, { show: true });

      expect(wrapper.exists()).toBe(true);
      expect(axios.create).toHaveBeenCalledWith({
        baseURL: 'http://localhost:3000/api',
        headers: { 'Content-Type': 'application/json' }
      });

      // Wait for onMounted to complete
      await nextTick();
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    it('should mount EditRecurrenceDialog successfully', () => {
      const mockRecurrence = {
        type: 'weekly',
        interval: 1,
        startDate: '2025-10-01',
        enabled: true
      };

      const wrapper = createWrapper(EditRecurrenceDialog, {
        show: true,
        recurrence: mockRecurrence
      });

      expect(wrapper.exists()).toBe(true);
      expect(wrapper.props('recurrence')).toEqual(mockRecurrence);
    });

    it('should handle authentication token in requests', async () => {
      const token = 'test-firebase-token';
      mockLocalStorage.getItem.mockReturnValue(token);

      createWrapper(RecurringTasksSidebar, { show: true });

      // Wait for component to mount and setup
      await nextTick();

      // Verify axios.create was called
      expect(axios.create).toHaveBeenCalled();
      
      // Test the interceptor function
      const interceptorCall = mockAxiosInstance.interceptors.request.use.mock.calls[0];
      expect(interceptorCall).toBeDefined();
      
      const interceptorFn = interceptorCall[0];
      const mockConfig = { headers: {} };
      const result = interceptorFn(mockConfig);

      expect(result.headers.Authorization).toBe(`Bearer ${token}`);
    });

    it('should handle prop changes correctly', async () => {
      const wrapper = createWrapper(RecurringTasksSidebar, { show: false });

      expect(wrapper.props('show')).toBe(false);

      await wrapper.setProps({ show: true });
      expect(wrapper.props('show')).toBe(true);

      // Wait for watchers to trigger
      await nextTick();
    });
  });
});