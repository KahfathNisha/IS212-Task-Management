<script setup>
import { useUIStore } from './stores/useUIStore'
import { computed } from 'vue'
import NavBar from './components/NavBar.vue'

const uiStore = useUIStore()

const mainStyle = computed(() => ({
  marginLeft: uiStore.drawer ? '250px' : '0',
  transition: 'margin-left 0.3s ease',
  minHeight: '100vh',
  background: 'white'
}))
</script>

<template>
  <div class="app-container">
    <NavBar />
    <main :style="mainStyle">
      <router-view />
    </main>
  </div>
</template>

<style>
.app-container {
  min-height: 100vh;
}

@media (max-width: 768px) {
  .app-container main {
    margin-left: 0 !important;
  }
}
</style>

<style scoped>
.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}
.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}
.logo.vue:hover {
  filter: drop-shadow(0 0 2em #42b883aa);
}
</style>

<style>
.v-application {
  background: white !important;
}
</style>
