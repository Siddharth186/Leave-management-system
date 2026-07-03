import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  server: {
    port: 5173,
    // Proxy /api requests to the Express backend during development.
    // This avoids CORS issues in the browser — the browser thinks everything
    // is on the same origin (localhost:5173) while Vite forwards to :5000.
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
