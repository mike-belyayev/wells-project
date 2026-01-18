import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        // No rewrite needed since your server routes already have /api prefix
      }
    }
  },
  build: {
    outDir: '../server/public',
    emptyOutDir: true,
    sourcemap: false
  }
})