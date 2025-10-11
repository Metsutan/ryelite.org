<template>
  <div class="auth-callback">
    <div class="callback-container">
      <div v-if="loading" class="loading-section">
        <LoadingSpinner />
        <h2>Completing authentication...</h2>
        <p>Please wait while we log you in.</p>
      </div>
      
      <div v-else-if="error" class="error-section">
        <div class="error-icon">❌</div>
        <h2>Authentication Failed</h2>
        <p>{{ error }}</p>
        <button @click="redirectToLogin" class="retry-btn">
          Try Again
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import LoadingSpinner from '@/components/LoadingSpinner.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const loading = ref(true)
const error = ref('')

onMounted(async () => {
  try {
    const success = route.query.success as string
    const error = route.query.error as string
    
    if (error) {
      throw new Error('Authentication failed: ' + error)
    }
    
    if (success) {
      // Session is already established, just fetch user info
      await authStore.handleAuthCallback()
      // Redirect to home page after successful auth
      router.push('/')
    } else {
      throw new Error('Invalid authentication callback')
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Authentication failed'
    loading.value = false
  }
})

const redirectToLogin = () => {
  router.push('/login')
}
</script>

<style scoped>
.auth-callback {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.callback-container {
  background: white;
  border-radius: 16px;
  padding: 40px;
  text-align: center;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  max-width: 400px;
  width: 100%;
}

.loading-section h2 {
  color: #1f2937;
  margin: 20px 0 10px;
}

.loading-section p {
  color: #6b7280;
  margin: 0;
}

.error-section {
  color: #dc2626;
}

.error-icon {
  font-size: 48px;
  margin-bottom: 20px;
}

.error-section h2 {
  color: #dc2626;
  margin-bottom: 10px;
}

.error-section p {
  color: #6b7280;
  margin-bottom: 20px;
}

.retry-btn {
  background: #5865f2;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 12px 24px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease;
}

.retry-btn:hover {
  background: #4752c4;
}
</style>
