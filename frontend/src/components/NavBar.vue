<template>
  <nav :class="{ 'nav-open': isOpen }" class="navbar">
    <div class="nav-toggle" @click="toggleNav">
      <div class="hamburger">
        <span></span>
        <span></span>
        <span></span>
      </div>
    </div>

    <div class="nav-content">
      <div class="nav-header">
        <h2>Task Management</h2>
      </div>
      
      <div class="nav-menu">
        <div v-for="item in menuItems" :key="item.path" class="nav-item">
          <router-link :to="item.path" class="nav-link" @click="closeNav">
            <FontAwesomeIcon :icon="item.icon" class="nav-icon" />
            <span>{{ item.title }}</span>
          </router-link>
        </div>
      </div>
    </div>
  </nav>
</template>

<script setup>
import { ref } from 'vue'
import { useUIStore } from '../stores/useUIStore'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import {
  faHome,
  faClipboardList,
  faFileAlt,
  faChartLine,
  faBell,
  faUser
} from '@fortawesome/free-solid-svg-icons'

const uiStore = useUIStore()
const isOpen = ref(false)

const menuItems = [
  { title: 'Home', path: '/', icon: faHome },
  { title: 'Tasks', path: '/tasks', icon: faClipboardList },
  { title: 'Reports', path: '/reports', icon: faFileAlt },
  { title: 'Dashboards', path: '/dashboards', icon: faChartLine },
  { title: 'Notifications', path: '/notifications', icon: faBell },
  { title: 'Profile', path: '/profile', icon: faUser }
]

const toggleNav = () => {
  isOpen.value = !isOpen.value
  uiStore.setDrawer(isOpen.value)
}

const closeNav = () => {
  isOpen.value = false
  uiStore.setDrawer(false)
}
</script>

<style scoped>
.navbar {
  position: fixed;
  top: 0;
  left: 0;
  height: 100vh;
  background: white;
  color: black;
  transform: translateX(-100%);
  transition: transform 0.3s ease;
  z-index: 1000;
  width: 250px;
  box-shadow: 2px 0 5px rgba(0, 0, 0, 0.1);
}

.nav-open {
  transform: translateX(0);
}

.nav-toggle {
  position: absolute;
  right: -50px;
  top: 10px;
  background: white;
  padding: 10px;
  cursor: pointer;
  border-radius: 0 5px 5px 0;
  box-shadow: 2px 0 5px rgba(0, 0, 0, 0.1);
}

.hamburger {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  width: 20px;
  height: 15px;
}

.hamburger span {
  display: block;
  height: 2px;
  width: 100%;
  background: black;
  border-radius: 2px;
}

.nav-content {
  padding: 20px;
}

.nav-header {
  margin-bottom: 30px;
  text-align: center;
}

.nav-menu {
  list-style: none;
  padding: 0;
  margin: 0;
}

.nav-item {
  margin: 5px 0;
}

.nav-link {
  color: black;
  text-decoration: none;
  font-size: 1.1em;
  display: flex;
  align-items: center;
  padding: 10px;
  border-radius: 5px;
  transition: background-color 0.2s;
}

.nav-link:hover,
.router-link-active {
  background: #f5f5f5;
}

.nav-icon {
  width: 20px;
  height: 20px;
  margin-right: 10px;
  color: currentColor;
}

@media (max-width: 768px) {
  .navbar {
    width: 200px;
  }
}
</style>