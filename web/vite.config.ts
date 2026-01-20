import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  base: '/vibe-function-collapse/',
  server: {
    fs: {
      allow: ['..'],
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@core': path.resolve(__dirname, '../core/pkg'),
    },
  },
  // Enable Wasm support
  optimizeDeps: {
    exclude: ['@core', 'wfc-core'],
  },
})
