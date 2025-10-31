import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth';

// Import views
import LoginView from '@/views/LoginView.vue';
import RegisterView from '@/views/RegisterView.vue';
import PasswordResetView from '@/views/PasswordResetView.vue';
import Home from '@/views/Home.vue';
import TasksView from '@/views/Tasks.vue';
import ProjectsView from '@/views/Projects.vue';
import ReportsView from '@/views/Reports.vue';
import ProfileView from '@/views/Profile.vue';
import SettingsView from '@/views/Settings.vue';
import NotificationHistory from '@/views/NotificationHistory.vue';

const routes = [
  {
    path: '/',
    redirect: '/login'
  },
  {
    path: '/register',
    name: 'Register',
    component: RegisterView,
    meta: { public: true } // public: true means user doesn't need to be logged in
  },
  {
    path: '/login',
    name: 'Login',
    component: LoginView,
    meta: { public: true }
  },
  {
    path: '/forgot-password',
    name: 'PasswordReset',
    component: PasswordResetView,
    meta: { public: true }
  },
  {
    path: '/home',
    name: 'Home',
    component: Home,
    meta: { requiresAuth: true }
  },

  {
    path: '/projects',
    name: 'Projects',
    component: ProjectsView,
    meta: { requiresAuth: true }
  },
  {
    path: '/tasks',
    name: 'Tasks',
    component: TasksView,
    meta: { requiresAuth: true }
  },
  {
    path: '/reports',
    name: 'Reports',
    component: ReportsView,
    meta: { requiresAuth: true }
  },
  {
    path: '/notifications',
    name: 'NotificationHistory',
    component: NotificationHistory,
    meta: { requiresAuth: true }
  },
  {
    path: '/profile',
    name: 'Profile',
    component: ProfileView,
    meta: { requiresAuth: true }
  },
  {
    path: '/settings',
    name: 'Settings',
    component: SettingsView,
    meta: { requiresAuth: true },
  },
  // Catch-all route
  {
    path: '/:pathMatch(.*)*',
    redirect: '/login'
  }
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
});

// Navigation guard
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore();
  if (authStore.loading) {
    await new Promise(resolve => {
      const unsubscribe = authStore.$subscribe((mutation, state) => {
        if (!state.loading) {
          unsubscribe();
          resolve();
        }
      });
    });
  }
  
  const isAuthenticated = authStore.isAuthenticated;
  const requiresAuth = to.meta.requiresAuth;

  if (requiresAuth && !isAuthenticated) {
    next({ name: 'Login', query: { redirect: to.fullPath } });
  } else if (isAuthenticated && to.name === 'Login') {
    next({ name: 'Home' });
  } else {
    next();
  }
});

router.afterEach(() => {
  const authStore = useAuthStore();
  if (authStore.isAuthenticated) {
    authStore.updateLastActivity();
  }
});

export default router;