<template>
  <div class="scrollbar-container">
    <slot></slot>
  </div>
</template>

<script setup>
// No script needed for this simple component
</script>

<style scoped>
.scrollbar-container {
  overflow-y: auto;
  flex: 1;
  display: flex;
  flex-direction: column;
}

/* Custom scrollbar styles */
.scrollbar-container::-webkit-scrollbar {
  width: 8px;
}

.scrollbar-container::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.scrollbar-container::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}

.scrollbar-container::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>