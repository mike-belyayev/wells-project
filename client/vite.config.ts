// client/vite.config.js
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
        secure: false
      }
    }
  },
  build: {
    outDir: '../server/public', // ← This should point to server/public
    emptyOutDir: true,
    sourcemap: false,
    // Add this to ensure all files are included:
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    }
  }
})