import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss()],
  base: '/',
  build: {
    outDir: '../backend/public',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    allowedHosts: ['5173-63d3819a6cd31250.monkeycode-ai.online'],
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
}))
