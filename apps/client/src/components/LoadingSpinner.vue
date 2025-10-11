<template>
  <div v-if="visible" class="loading-overlay">
    <div class="loading-spinner">
      <div class="spinner"></div>
      <p>{{ message }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  visible?: boolean
  message?: string
}

withDefaults(defineProps<Props>(), {
  visible: true,
  message: 'Loading...'
})
</script>

<style scoped>
/* Loading overlay */
.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(26, 26, 26, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  backdrop-filter: blur(4px);
}

.loading-spinner {
  text-align: center;
  color: var(--theme-text-primary);
}

.spinner {
  width: 50px;
  height: 50px;
  border: 4px solid var(--theme-accent-transparent-30);
  border-top: 4px solid var(--theme-accent);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>
