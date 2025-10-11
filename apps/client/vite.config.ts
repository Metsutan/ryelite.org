import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file from the project root (two levels up from apps/client)
  const projectRoot = fileURLToPath(new URL('../../', import.meta.url))
  const env = loadEnv(mode, projectRoot, '')
  
  return {
    plugins: [
      vue(),
      vueDevTools(),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        '@shared': fileURLToPath(new URL('../../packages/shared/src', import.meta.url))
      },
    },
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: env.VITE_API_URL || 'http://localhost:3000',
          changeOrigin: true,
        },
      },
    },
    // Ensure environment variables are properly exposed
    define: {
      __APP_ENV__: JSON.stringify(env.NODE_ENV),
    },
  }
})
