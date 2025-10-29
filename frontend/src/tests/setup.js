// Vitest setup: mock firebase modules to prevent real SDK initialization and network calls.
import { vi } from 'vitest';

// Mock Vuetify globally to avoid CSS issues
vi.mock('vuetify', () => ({
  createVuetify: vi.fn(() => ({})),
  default: vi.fn(() => ({})),
}));

// Mock Vuetify components and directives
vi.mock('vuetify/components', () => ({}));
vi.mock('vuetify/directives', () => ({}));


// Spy/mock for initializeApp so we can assert it was NOT called
const initializeAppMock = vi.fn(() => ({ name: 'mockApp' }));
vi.mock('firebase/app', () => {
  return {
    initializeApp: initializeAppMock,
  };
});

// Expose the mock so tests can access it
global.__initializeAppMock = initializeAppMock;

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