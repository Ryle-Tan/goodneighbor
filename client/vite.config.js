import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Any request to /api/... is forwarded to the Express server.
    // So the frontend just calls "/api/events" — no CORS or URLs to manage.
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
})
