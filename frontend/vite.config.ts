import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/HydroTech-AI-Flood-Detection/',
  plugins: [react()],
  server: {
    host: true,
    port: 3000,
  },
})
