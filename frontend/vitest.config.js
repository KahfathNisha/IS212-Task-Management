import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/tests/setup.js',
    globals: true,
    passWithNoTests: false,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src')
    }
  },
  css: false // Disable CSS processing to avoid .css file extension errors
});

