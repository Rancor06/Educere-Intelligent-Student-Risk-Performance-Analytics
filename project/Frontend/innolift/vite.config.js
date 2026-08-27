import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    proxy: {
      // React app's own API (StudentDirectory, StudentForm, PredictionForm)
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      // Session-cookie-based admin/student routes (converted from the
      // static HTML pages — login, dashboard, students roster, profile)
      '/admin': { target: 'http://localhost:5000', changeOrigin: true },
      '/student': { target: 'http://localhost:5000', changeOrigin: true },
      '/login': { target: 'http://localhost:5000', changeOrigin: true },
      '/logout': { target: 'http://localhost:5000', changeOrigin: true },
      '/profile': { target: 'http://localhost:5000', changeOrigin: true },
    },
  },
})
