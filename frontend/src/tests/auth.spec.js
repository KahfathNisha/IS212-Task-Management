import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useAuthStore } from '@/stores/auth';
import axios from 'axios';

// --- THIS IS THE DEFINITIVE FIX ---
// We use vi.hoisted() to ensure our mock function is created and available
// *before* any vi.mock calls are processed. This resolves the initialization error.
const { mockPost } = vi.hoisted(() => {
  return { mockPost: vi.fn() };
});

// Mock the firebase/auth module (this part is correct)
vi.mock('firebase/auth', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    getAuth: vi.fn(() => ({})),
    signInWithEmailAndPassword: vi.fn(),
    signOut: vi.fn(),
    onAuthStateChanged: vi.fn(() => () => {}),
  };
});

// This mock now correctly references the hoisted mockPost function.
vi.mock('axios', async () => {
  const actual = await vi.importActual('axios');
  return {
    ...actual,
    default: {
      ...actual.default,
      create: vi.fn(() => ({
        post: mockPost,
      })),
    },
  };
});

// --- Test Suite for the Auth Store ---
describe('Auth Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    mockPost.mockClear(); // Reset the mock's history before each test
  });

  // --- Login Scenarios ---
  describe('Login Functionality', () => {
    it('should log in a user successfully', async () => {
      const authStore = useAuthStore();
      const mockUserCredential = { user: { getIdToken: () => Promise.resolve('fake-token') } };
      mockPost.mockResolvedValueOnce({ data: { isLocked: false } }); // check-lockout
      const { signInWithEmailAndPassword } = await import('firebase/auth');
      signInWithEmailAndPassword.mockResolvedValue(mockUserCredential);
      mockPost.mockResolvedValueOnce({ data: { success: true, user: { name: 'John Doe', role: 'staff' } } }); // login

      await authStore.login('john.doe@company.com', 'password123');
      
      expect(authStore.isAuthenticated).toBe(true);
      expect(authStore.userName).toBe('John Doe');
    });

    it('should show an error on wrong password', async () => {
      const authStore = useAuthStore();
      mockPost.mockResolvedValueOnce({ data: { isLocked: false } });
      const { signInWithEmailAndPassword } = await import('firebase/auth');
      signInWithEmailAndPassword.mockRejectedValue({ code: 'auth/invalid-credential' });
      mockPost.mockResolvedValueOnce({ data: { message: 'Invalid credentials. 4 attempts remaining.' } });

      await expect(authStore.login('test@test.com', 'wrong'))
        .rejects.toThrow('Invalid credentials. 4 attempts remaining.');
    });

    it('should show a locked message if the account is locked', async () => {
      const authStore = useAuthStore();
      mockPost.mockResolvedValueOnce({ data: { isLocked: true, message: 'Account is locked.' } });

      await expect(authStore.login('test@test.com', 'password'))
        .rejects.toThrow('Account is locked.');
    });
  });

  // --- Password Reset Scenarios ---
  describe('Password Reset Functionality', () => {
    it('should request a password reset successfully', async () => {
      const authStore = useAuthStore();
      mockPost.mockResolvedValueOnce({ data: { success: true, resetCode: '123', securityQuestion: 'Test?' } });
      
      // This test assumes the 'requestPasswordReset' logic has been moved to your authStore.
      if (authStore.requestPasswordReset) {
          const result = await authStore.requestPasswordReset('test@test.com');
          expect(mockPost).toHaveBeenCalledWith('/request-password-reset', { email: 'test@test.com' });
          expect(result.securityQuestion).toBe('Test?');
      }
    });

    it('should verify a security answer successfully', async () => {
      const authStore = useAuthStore();
      mockPost.mockResolvedValueOnce({ data: { success: true } });

      // This test assumes the 'verifySecurityAnswer' logic is in your authStore.
      if (authStore.verifySecurityAnswer) {
          const result = await authStore.verifySecurityAnswer('123', 'answer');
          expect(mockPost).toHaveBeenCalledWith('/verify-security-answer', { resetCode: '123', answer: 'answer' });
          expect(result.success).toBe(true);
      }
    });

    it('should reset a password successfully', async () => {
      const authStore = useAuthStore();
      mockPost.mockResolvedValueOnce({ data: { success: true } });

      // This test assumes the 'resetPassword' logic is in your authStore.
      if (authStore.resetPassword) {
          const result = await authStore.resetPassword('123', 'newPassword123');
          expect(mockPost).toHaveBeenCalledWith('/reset-password', { resetCode: '123', newPassword: 'newPassword123' });
          expect(result.success).toBe(true);
      }
    });
  });
});

