import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url' // Import Node.js URL helpers
import { writeFileSync } from 'fs';
import { resolve } from 'path';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');

    return {
      plugins: [vue(),
        {
        name: 'generate-firebase-sw',
        buildStart() {
          // Generate the service worker file with env variables
          const swContent = `
// firebase-messaging-sw.js - Auto-generated during build
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "${env.VITE_FIREBASE_API_KEY}",
  authDomain: "${env.VITE_FIREBASE_AUTH_DOMAIN}",
  projectId: "${env.VITE_FIREBASE_PROJECT_ID}",
  storageBucket: "${env.VITE_FIREBASE_STORAGE_BUCKET}",
  messagingSenderId: "${env.VITE_FIREBASE_MESSAGING_SENDER_ID}",
  appId: "${env.VITE_FIREBASE_APP_ID}"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('Received background message:', payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/firebase-logo.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
`;

          // Write to public directory so it's served at root
          writeFileSync(
            resolve(process.cwd(), 'public/firebase-messaging-sw.js'),
            swContent.trim()
          );
          
          console.log('✓ Generated firebase-messaging-sw.js');
        }
      }
      ],
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
      },
      test: {
      globals: true,
      environment: 'jsdom',
    }
    };
});

