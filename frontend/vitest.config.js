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
    
    // --- CSS FIX ---
    // Tell Vitest what to do with .css imports
    transformMode: {
      web: [/\.css$/],
    },
    // Use an inline transformer function to replace the CSS content with an empty module
    transform: {
      '^.+\\.css$': (code) => ({ code: '', map: null }),
    },
    // --- END CSS FIX ---
    
    // Explicitly tell Vitest to process Vuetify components
    deps: {
      optimizer: {
        web: {
          include: ['vuetify'],
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src')
    }
  },
});

