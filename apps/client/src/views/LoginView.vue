<template>
  <div class="login-view">
    <div class="login-container">
      <div class="login-card">
        <div class="logo-section">
          <img src="@/assets/logo.png" alt="Logo" class="logo" />
          <h1>Welcome Back</h1>
          <p>Sign in with your Discord account to continue</p>
        </div>

        <div v-if="errorMessage" class="error-message">
          <Icon icon="mdi:alert-circle" class="error-icon" />
          {{ errorMessage }}
        </div>

        <div v-if="configStatus && !configStatus.discord_configured" class="warning-message">
          <div class="warning-header">
            <Icon icon="mdi:alert-circle" class="warning-icon" />
            <h3>Authentication Not Configured</h3>
          </div>
          <p>Discord OAuth credentials need to be set up. Please check the setup instructions in the README.</p>
        </div>

        <button 
          @click="handleDiscordLogin" 
          class="discord-login-btn" 
          :disabled="loading || (configStatus ? !configStatus.discord_configured : false)"
        >
          <Icon v-if="loading" icon="mdi:loading" class="discord-icon loading-spinner" />
          <Icon v-else icon="mdi:discord" class="discord-icon" />
          <span v-if="!loading && configStatus && configStatus.discord_configured">Continue with Discord</span>
          <span v-else-if="loading">Connecting...</span>
          <span v-else>Authentication Unavailable</span>
        </button>

        <div class="terms">
          <p>By signing in, you agree to our terms of service and privacy policy.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { Icon } from '@iconify/vue'
import axios from 'axios'

const authStore = useAuthStore()
const route = useRoute()
const loading = ref(false)
const errorMessage = ref('')
const configStatus = ref<{ discord_configured: boolean; message: string } | null>(null)

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

onMounted(async () => {
  // Check authentication configuration status
  try {
    const response = await axios.get(`${API_BASE_URL}/api/auth/status`)
    configStatus.value = response.data
  } catch (error) {
    console.error('Failed to check auth status:', error)
  }

  // Check for error in URL params
  if (route.query.error) {
    switch (route.query.error) {
      case 'auth_failed':
        errorMessage.value = 'Authentication failed. Please try again.'
        break
      case 'not_configured':
        errorMessage.value = 'Discord authentication is not configured on the server.'
        break
      default:
        errorMessage.value = 'An error occurred during authentication.'
    }
  }
})

const handleDiscordLogin = () => {
  if (!configStatus.value?.discord_configured) {
    errorMessage.value = 'Discord authentication is not available. Please contact the administrator.'
    return
  }
  
  loading.value = true
  authStore.login()
}
</script>

<style scoped>
.login-view {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--theme-background);
  background-image: url('@/assets/homepageBackground.png');
  background-size: cover;
  background-position: center;
  background-attachment: fixed;
  padding: 20px;
  position: relative;
}

.login-view::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(26, 26, 26, 0.85);
  z-index: 1;
}

.login-container {
  width: 100%;
  max-width: 400px;
  position: relative;
  z-index: 2;
}

.login-card {
  background: var(--theme-background-soft);
  border: 1px solid var(--theme-border);
  border-radius: 16px;
  padding: 40px;
  box-shadow: 
    0 20px 25px -5px rgba(0, 0, 0, 0.3), 
    0 10px 10px -5px rgba(0, 0, 0, 0.2),
    0 0 0 1px var(--theme-border);
  text-align: center;
  backdrop-filter: blur(10px);
}

.logo-section {
  margin-bottom: 30px;
}

.logo {
  width: 80px;
  height: 80px;
  margin-bottom: 20px;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3));
}

.logo-section h1 {
  font-size: 28px;
  font-weight: 700;
  color: var(--theme-text-primary);
  margin-bottom: 8px;
  background: linear-gradient(90deg, var(--theme-accent) 0%, var(--theme-accent-light) 60%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.logo-section p {
  color: var(--theme-text-secondary);
  margin-bottom: 0;
  font-size: 16px;
}

.error-message {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid var(--theme-danger-transparent-30);
  color: var(--theme-danger-light);
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 20px;
  font-size: 14px;
  backdrop-filter: blur(5px);
  display: flex;
  align-items: center;
  gap: 8px;
}

.error-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

.warning-message {
  background: rgba(249, 244, 73, 0.1);
  border: 1px solid var(--theme-accent-transparent-30);
  color: var(--theme-accent);
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 20px;
  text-align: left;
  backdrop-filter: blur(5px);
}

.warning-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.warning-icon {
  width: 20px;
  height: 20px;
  color: var(--theme-accent);
}

.warning-message h3 {
  margin: 0;
  font-size: 16px;
  color: var(--theme-accent);
}

.warning-message p {
  margin: 0;
  font-size: 14px;
  line-height: 1.4;
  color: var(--theme-text-secondary);
}

.discord-login-btn {
  width: 100%;
  background: #5865f2;
  color: white;
  border: none;
  border-radius: 12px;
  padding: 16px 24px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.discord-login-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
  transition: left 0.5s;
}

.discord-login-btn:hover:not(:disabled)::before {
  left: 100%;
}

.discord-login-btn:hover:not(:disabled) {
  background: #4752c4;
  transform: translateY(-2px);
  box-shadow: 
    0 10px 20px rgba(88, 101, 242, 0.3),
    0 6px 6px rgba(0, 0, 0, 0.1);
}

.discord-login-btn:active:not(:disabled) {
  transform: translateY(0);
}

.discord-login-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background: var(--theme-background-light);
  color: var(--theme-text-muted);
  border: 1px solid var(--theme-border);
}

.discord-icon {
  width: 24px;
  height: 24px;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
  color: currentColor; /* Inherit the button's text color (white) */
}

.loading-spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.terms {
  margin-top: 24px;
}

.terms p {
  color: var(--theme-text-muted);
  font-size: 12px;
  line-height: 1.5;
  margin: 0;
}

/* Responsive design */
@media (max-width: 768px) {
  .login-view {
    padding: 16px;
  }
  
  .login-card {
    padding: 32px 24px;
  }
  
  .logo {
    width: 64px;
    height: 64px;
  }
  
  .logo-section h1 {
    font-size: 24px;
  }
  
  .logo-section p {
    font-size: 14px;
  }
}

@media (max-width: 480px) {
  .login-card {
    padding: 24px 20px;
  }
  
  .discord-login-btn {
    padding: 14px 20px;
    font-size: 15px;
  }
}

/* Add subtle animations */
.login-card {
  animation: fadeInUp 0.6s ease-out;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.logo {
  animation: logoFloat 3s ease-in-out infinite;
}

@keyframes logoFloat {
  0%, 100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-5px);
  }
}
</style>
