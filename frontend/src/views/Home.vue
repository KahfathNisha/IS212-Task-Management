<template>
  <div class="home-page">
    <HomeHeader />
    <HomeHero />
    <HomeStats />
    <HomeQuickAccess />
  </div>
</template>

<script setup>
import HomeHeader from '@/components/HomeHeader.vue';
import HomeHero from '@/components/HomeHero.vue';
import HomeStats from '@/components/HomeStats.vue';
import HomeQuickAccess from '@/components/HomeQuickAccess.vue';
</script>

<style scoped>
.home-page {
  min-height: 100vh;
  background: var(--bg-primary);
}
</style>