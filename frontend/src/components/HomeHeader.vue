<template>
  <header class="home-header">
    <div class="header-content">
      <div class="welcome-section">
        <img src="@/assets/SPM.png" alt="Company Logo" class="logo">
        <div class="welcome-text">
          <div class="welcome-greeting">Welcome,</div>
          <h1 class="welcome-name">{{ userName }}</h1>
        </div>
      </div>
      <div class="header-actions">
        <button class="logout-btn" @click="handleLogout">
          <v-icon size="20">mdi-logout</v-icon>
          <span>Logout</span>
        </button>
      </div>
    </div>
  </header>
</template>

<script setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const authStore = useAuthStore();
const userName = computed(() => authStore.userName);

const handleLogout = async () => {
  try {
    const result = await authStore.logout();
    router.push(result.redirect);
  } catch (error) {
    console.error('Logout error:', error);
  }
};
</script>

<style scoped>
.home-header {
  background: white;
  border-bottom: 1px solid #C5D4F0;
  padding: 14px 0;
  padding-bottom: 1px;
  padding-top: 2px;
}

.header-content {
  max-width: 100%;
  padding: 0 28px;
  margin: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.welcome-section {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 4px 0;
}

.logo {
  width: 180px;
  height: 180px;
}

.welcome-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.welcome-greeting {
  font-size: 16px;
  font-weight: 500;
  color: #7f8c8d;
  text-transform: uppercase;
  letter-spacing: 1px;
  line-height: 1.4;
}

.welcome-name {
  margin: 0;
  font-size: 32px;
  font-weight: 700;
  color: #3d3d3d;
  letter-spacing: -0.5px;
  line-height: 1.3;
  padding-bottom: 2px;
  background: linear-gradient(135deg, #7b92d1 0%, #3a5998 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.header-actions {
  display: flex;
  align-items: center;
}

.logout-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: white;
  border: 2px solid #C5D4F0;
  border-radius: 12px;
  color: #7b92d1;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.logout-btn:hover {
  background: #7b92d1;
  color: white;
  border-color: #7b92d1;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(123, 146, 209, 0.3);
}

.logout-btn:active {
  transform: translateY(0);
}

@media (max-width: 768px) {
  .home-header {
    padding: 20px 0;
  }

  .header-content {
    padding: 0 24px;
  }

  .welcome-greeting {
    font-size: 12px;
  }

  .welcome-name {
    font-size: 24px;
    line-height: 1.3;
  }

  .logout-btn {
    padding: 10px 20px;
    font-size: 14px;
  }

  .logout-btn span {
    display: none;
  }
}

[data-theme="dark"] .home-header {
  background: #2a2a2a;
  border-bottom-color: #555;
}

[data-theme="dark"] .welcome-greeting {
  color: #a0a0a0;
}

[data-theme="dark"] .welcome-name {
  background: linear-gradient(135deg, #c5d49a 0%, #7b92d1 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

[data-theme="dark"] .logout-btn {
  background: #2a2a2a;
  border-color: #555;
  color: #c5d49a;
}

[data-theme="dark"] .logout-btn:hover {
  background: #c5d49a;
  color: #2a2a2a;
  border-color: #c5d49a;
  box-shadow: 0 4px 12px rgba(197, 212, 154, 0.3);
}
</style>