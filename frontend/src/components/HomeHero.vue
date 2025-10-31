<template>
  <section class="hero-section">
    <div class="hero-content">
      <h1 class="hero-title">All In One's Smart Task Management System</h1>
      <p class="hero-subtitle">
        Your unified platform for seamless collaboration, efficient workflows, and organizational excellence. 
        Empowering teams across all departments to work smarter and achieve more together.
      </p>
    </div>
  </section>
</template>

<script setup>
</script>

<style scoped>
.hero-section {
  background: linear-gradient(135deg, #7b92d1 0%, #3a5998 100%);
  padding: 96px 32px;
  text-align: center;
}

.hero-content {
  max-width: 900px;
  margin: 0 auto;
}

.hero-title {
  margin: 0 0 24px 0;
  font-size: 48px;
  font-weight: 700;
  color: white;
  line-height: 1.2;
}

.hero-subtitle {
  margin: 0;
  font-size: 18px;
  color: white;
  line-height: 1.6;
  opacity: 0.95;
}

@media (max-width: 768px) {
  .hero-section {
    padding: 64px 24px;
  }

  .hero-title {
    font-size: 32px;
  }

  .hero-subtitle {
    font-size: 16px;
  }
}

[data-theme="dark"] .hero-section {
  background: linear-gradient(135deg, #5a7a9b 0%, #2a4978 100%);
}
</style>