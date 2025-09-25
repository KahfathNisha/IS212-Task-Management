import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUIStore = defineStore('ui', () => {
  // State
  const drawer = ref(false)

  // Actions
  const toggleDrawer = () => {
    drawer.value = !drawer.value
  }

  const setDrawer = (value) => {
    drawer.value = value
  }

  return {
    // State
    drawer,
    // Actions
    toggleDrawer,
    setDrawer
  }
})