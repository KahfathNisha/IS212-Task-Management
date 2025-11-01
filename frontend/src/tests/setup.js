// Vitest setup: mock firebase modules to prevent real SDK initialization and network calls.
import { config } from '@vue/test-utils';
import { vi } from 'vitest';

// --- Vuetify Global Stubs (Fixes rendering of content) ---

// List of all Vuetify components to stub
const VUETIFY_COMPONENTS = [
  'v-icon', 'v-btn', 'v-card', 'v-card-title', 'v-card-text', 'v-card-actions',
  'v-dialog', 'v-snackbar', 'v-text-field', 'v-select', 'v-switch', 'v-chip',
  'v-list', 'v-list-item', 'v-list-item-title', 'v-list-item-subtitle',
  'v-list-item-content', 'v-container', 'v-row', 'v-col', 'v-spacer',
  'v-progress-circular', 'v-alert', 'v-divider', 'v-toolbar', 'v-app-bar',
  'v-navigation-drawer', 'v-main', 'v-app', 'v-menu', 'v-tooltip', 'v-badge',
  'v-expansion-panels', 'v-expansion-panel', 'v-data-table', 'v-pagination',
  'v-tabs', 'v-tab', 'v-tab-item', 'v-window', 'v-window-item', 'v-autocomplete',
  'v-combobox', 'v-textarea', 'v-checkbox', 'v-radio', 'v-radio-group',
  'v-slider', 'v-range-slider', 'v-rating', 'v-date-picker', 'v-time-picker',
  'v-file-input', 'v-img', 'v-avatar', 'v-skeleton-loader', 'v-overlay',
  'v-sheet', 'v-navigation-drawer', 'v-footer', 'v-bottom-navigation'
];

// Stub all Vuetify components globally
// Using components that render their slots ensures text content is visible in tests
if (!config.global.stubs) {
  config.global.stubs = {};
}
VUETIFY_COMPONENTS.forEach(comp => {
  // Create a stub component that renders its default slot and props
  // This ensures text content is visible in tests
  // Special handling for v-list-item which uses :title and :subtitle props
  if (comp === 'v-list-item') {
    config.global.stubs[comp] = {
      name: comp,
      props: ['title', 'subtitle'], // Declare props so they're available
      template: `<div class="${comp}-stub"><div v-if="title">{{ title }}</div><div v-if="subtitle">{{ subtitle }}</div><slot /></div>`
    };
  } else {
    config.global.stubs[comp] = {
      name: comp,
      template: `<div class="${comp}-stub"><slot /></div>`
    };
  }
});

// Mock Vuetify plugin that provides the $vuetify global property
const mockVuetify = {
  install: (app) => {
    app.config.globalProperties.$vuetify = {
      display: { 
        mobile: false,
        xs: false,
        sm: false,
        md: false,
        lg: false,
        xl: false,
        xxl: false
      },
      theme: {
        current: { value: { dark: false } },
        name: { value: 'light' }
      }
    };
  },
};

// Globally configure Vue Test Utils to install the mock Vuetify plugin
config.global.plugins = [mockVuetify];

// Mock firebase/app (if needed for some tests)
// Note: vi.mock() calls are hoisted, so we define the mock inline
vi.mock('firebase/app', () => {
  const initializeAppMock = vi.fn(() => ({ name: 'mockApp' }));
  return {
    initializeApp: initializeAppMock,
    getApps: vi.fn(() => []),
    getApp: vi.fn(() => ({ name: 'mockApp' })),
    __mocks: { initializeAppMock } // Export for tests that need to spy on it
  };
});


// Mock 'firebase/auth'
vi.mock('firebase/auth', () => {
  return {
    getAuth: (app) => {
      return {
        app,
        signInWithEmailAndPassword: vi.fn().mockResolvedValue({ user: { uid: 'mock-uid' } }),
        onAuthStateChanged: vi.fn(),
      };
    },
  };
});

// Mock 'firebase/firestore'
vi.mock('firebase/firestore', () => {
  const mockDoc = vi.fn();
  const mockSetDoc = vi.fn().mockResolvedValue(true);
  const mockGetDoc = vi.fn().mockResolvedValue({ exists: () => true, id: 'doc', data: () => ({}) });

  return {
    getFirestore: (app) => ({ app }),
    doc: mockDoc,
    setDoc: mockSetDoc,
    getDoc: mockGetDoc,
    collection: vi.fn(),
    __mocks: { mockDoc, mockSetDoc, mockGetDoc }
  };
});

// Mock 'firebase/functions'
vi.mock('firebase/functions', () => {
  return {
    getFunctions: (app) => ({ app }),
    httpsCallable: vi.fn().mockResolvedValue({ data: {} }),
  };
});

// Mock 'firebase/storage'
vi.mock('firebase/storage', () => {
  return {
    getStorage: (app) => ({ app }),
    ref: vi.fn(),
    uploadBytes: vi.fn().mockResolvedValue(true),
    getDownloadURL: vi.fn().mockResolvedValue('https://mock-url'),
  };
});

// Mock 'firebase/messaging'
vi.mock('firebase/messaging', () => {
  return {
    getMessaging: (app) => ({ app }),
    getToken: vi.fn().mockResolvedValue('mock-token'),
    onMessage: vi.fn(),
  };
});