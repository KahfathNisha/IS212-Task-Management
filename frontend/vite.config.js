import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url' // Import Node.js URL helpers

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');

    return {
      plugins: [vue()],
      resolve: {
        alias: {
          // Use the modern, recommended way to create the '@' alias
          '@': fileURLToPath(new URL('./src', import.meta.url))
        },
      },
      server: {
        proxy: {
          '/api': {
            target: 'http://localhost:3000', // Your backend is confirmed to be here
            changeOrigin: true,
          },
        }
      }
    };
});

