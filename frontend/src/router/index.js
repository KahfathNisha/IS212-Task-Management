// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth';
import Settings from '@/views/Settings.vue';

// Import views
const LoginView = () => import('@/views/LoginView.vue');
const PasswordResetView = () => import('@/views/PasswordResetView.vue');
const DashboardView = () => import('@/views/DashboardView.vue');

const routes = [
  {
    path: '/',
    redirect: '/login' // Always redirect to login first, let auth guard handle it
  },
  {
    path: '/login',
    name: 'Login',
    component: LoginView,
    meta: {
      requiresAuth: false,
      public: true
    }
  },
  {
    path: '/forgot-password',
    name: 'PasswordReset',
    component: PasswordResetView,
    meta: {
      requiresAuth: false,
      public: true
    }
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: DashboardView,
    meta: {
      requiresAuth: true,
      title: 'Dashboard'
    }
  },
  {
    path: '/tasks',
    name: 'Tasks',
    component: () => import('@/views/Tasks.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/reports',
    name: 'Reports',
    component: () => import('@/views/Reports.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/notifications',
    name: 'Notifications',
    component: () => import('@/views/Notifications.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('@/views/Profile.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/settings',
    name: 'Settings',
    component: Settings,
    meta: { requiresAuth: true }, // Ensures only logged-in users can see it
  },
  // Catch-all route for 404s
  {
    path: '/:pathMatch(.*)*',
    redirect: '/login'
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

// Navigation guard
router.beforeEach(async (to, from, next) => {
  console.log('Router: Navigating from', from.path, 'to', to.path);
  
  const authStore = useAuthStore();
  
  // Wait for auth initialization to complete
  if (authStore.loading) {
    console.log('Router: Waiting for auth initialization...');
    let attempts = 0;
    while (authStore.loading && attempts < 30) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
  }
  
  const isAuthenticated = authStore.isAuthenticated;
  const requiresAuth = to.meta.requiresAuth;
  const isPublicRoute = to.meta.public;
  
  console.log('Router: Auth status:', { isAuthenticated, requiresAuth, isPublicRoute });
  
  // Handle authentication requirements
  if (requiresAuth && !isAuthenticated) {
    console.log('Router: Redirecting to login - auth required but not authenticated');
    next({
      name: 'Login',
      query: { redirect: to.fullPath }
    });
  } else if (isPublicRoute && isAuthenticated && to.name !== 'Login') {
    // If user is authenticated and trying to access public routes (except login page directly)
    console.log('Router: Redirecting to dashboard - already authenticated');
    next({ name: 'Dashboard' });
  } else if (to.name === 'Login' && isAuthenticated) {
    // Special case: if already authenticated and going to login, redirect to dashboard
    console.log('Router: Already authenticated, redirecting to dashboard');
    next({ name: 'Dashboard' });
  } else {
    // Allow navigation
    console.log('Router: Navigation allowed');
    next();
  }
});

// After navigation hook - update activity
router.afterEach((to) => {
  console.log('Router: Navigation completed to', to.path);
  const authStore = useAuthStore();
  if (authStore.isAuthenticated) {
    authStore.updateLastActivity();
  }
});

export default router;