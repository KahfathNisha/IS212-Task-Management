<template>
  <section class="quick-access-section">
    <div class="quick-access-container">
      <h2 class="section-title">Quick Access</h2>
      <div class="cards-grid">
        <div 
          v-for="card in cards" 
          :key="card.id"
          class="access-card"
          @click="navigateTo(card.route)"
        >
          <div class="card-icon" :style="{ background: card.gradient }">
            <v-icon color="white" size="32">{{ card.icon }}</v-icon>
          </div>
          <h3 class="card-title">{{ card.title }}</h3>
          <p class="card-description">{{ card.description }}</p>
          <div class="card-footer">
            <span class="access-text">Access</span>
            <v-icon class="arrow-icon" size="20">mdi-arrow-right</v-icon>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { useRouter } from 'vue-router';

const router = useRouter();

const cards = [
  {
    id: 1,
    title: 'Tasks',
    description: 'Manage and track your tasks efficiently',
    icon: 'mdi-clipboard-list',
    gradient: 'linear-gradient(135deg, #7b92d1 0%, #5a7ab8 100%)',
    route: '/tasks'
  },
  {
    id: 2,
    title: 'Reports',
    description: 'View comprehensive analytics and insights',
    icon: 'mdi-file-document',
    gradient: 'linear-gradient(135deg, #8b7bd1 0%, #6a5ab8 100%)',
    route: '/reports'
  },
  {
    id: 3,
    title: 'Projects',
    description: 'Collaborate on team projects seamlessly',
    icon: 'mdi-folder-multiple',
    gradient: 'linear-gradient(135deg, #7b92d1 0%, #5a7ab8 100%)',
    route: '/projects'
  },
  {
    id: 4,
    title: 'Notifications',
    description: 'Stay updated with important alerts',
    icon: 'mdi-bell',
    gradient: 'linear-gradient(135deg, #8b7bd1 0%, #6a5ab8 100%)',
    route: '/notifications'
  }
];

const navigateTo = (route) => {
  router.push(route);
};
</script>

<style scoped>
.quick-access-section {
  padding: 80px 32px 120px 32px;
  background: var(--bg-primary);
}

.quick-access-container {
  max-width: 1400px;
  margin: 0 auto;
}

.section-title {
  text-align: center;
  font-size: 42px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 64px 0;
  letter-spacing: -0.5px;
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 40px;
  max-width: 1100px;
  margin: 0 auto;
}

.access-card {
  background: white;
  border: 2px solid #C5D4F0;
  border-radius: 20px;
  padding: 48px 40px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-height: 280px;
  position: relative;
  overflow: hidden;
}

.access-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, #7b92d1 0%, #8b7bd1 100%);
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 0.3s ease;
}

.access-card:hover::before {
  transform: scaleX(1);
}

.access-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 20px 40px rgba(123, 146, 209, 0.15);
  border-color: #7b92d1;
}

.access-card:hover .arrow-icon {
  transform: translateX(8px);
}

.access-card:hover .card-icon {
  transform: scale(1.05);
}

.card-icon {
  width: 80px;
  height: 80px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 4px;
  transition: transform 0.3s ease;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.card-title {
  margin: 0;
  font-size: 28px;
  font-weight: 700;
  color: #3d3d3d;
  letter-spacing: -0.3px;
}

.card-description {
  margin: 0;
  font-size: 17px;
  color: #7f8c8d;
  line-height: 1.6;
  flex: 1;
}

.card-footer {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 12px;
  padding-top: 20px;
  border-top: 1px solid #f0f0f0;
}

.access-text {
  font-size: 18px;
  font-weight: 700;
  color: #7b92d1;
  letter-spacing: 0.3px;
}

.arrow-icon {
  color: #7b92d1;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

@media (max-width: 968px) {
  .cards-grid {
    grid-template-columns: 1fr;
    gap: 32px;
    max-width: 600px;
  }

  .quick-access-section {
    padding: 64px 24px 96px 24px;
  }

  .section-title {
    font-size: 32px;
    margin-bottom: 48px;
  }

  .access-card {
    padding: 36px 32px;
    min-height: 240px;
  }

  .card-icon {
    width: 72px;
    height: 72px;
  }

  .card-title {
    font-size: 24px;
  }

  .card-description {
    font-size: 16px;
  }
}

[data-theme="dark"] .access-card {
  background: #2a2a2a;
  border-color: #555;
}

[data-theme="dark"] .access-card:hover {
  border-color: #c5d49a;
  box-shadow: 0 20px 40px rgba(197, 212, 154, 0.15);
}

[data-theme="dark"] .access-card::before {
  background: linear-gradient(90deg, #c5d49a 0%, #7b92d1 100%);
}

[data-theme="dark"] .card-title {
  color: #f5f4f2;
}

[data-theme="dark"] .card-description {
  color: #a0a0a0;
}

[data-theme="dark"] .card-footer {
  border-top-color: #3a3a3a;
}

[data-theme="dark"] .access-text,
[data-theme="dark"] .arrow-icon {
  color: #c5d49a;
}
</style>
