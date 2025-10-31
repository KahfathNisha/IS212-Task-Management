<template>
  <section class="stats-section">
    <div class="stats-container">
      <div class="stat-item">
        <div class="stat-number">600+</div>
        <div class="stat-label">Staff Members</div>
      </div>
      <div class="stat-item">
        <div class="stat-number">7</div>
        <div class="stat-label">Departments</div>
      </div>
      <div class="stat-item">
        <div class="stat-number">900+</div>
        <div class="stat-label">Client Organisations</div>
      </div>
    </div>
  </section>
</template>

<script setup>
</script>

<style scoped>
.stats-section {
  padding: 64px 32px;
  background: var(--bg-primary);
}

.stats-container {
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 48px;
}

.stat-item {
  text-align: center;
}

.stat-number {
  font-size: 56px;
  font-weight: 700;
  color: #7b92d1;
  margin-bottom: 12px;
  line-height: 1;
}

.stat-label {
  font-size: 18px;
  color: #7f8c8d;
  font-weight: 500;
}

@media (max-width: 768px) {
  .stats-container {
    grid-template-columns: 1fr;
    gap: 32px;
  }

  .stat-number {
    font-size: 48px;
  }

  .stat-label {
    font-size: 16px;
  }
}

[data-theme="dark"] .stat-number {
  color: #c5d49a;
}

[data-theme="dark"] .stat-label {
  color: #a0a0a0;
}
</style>