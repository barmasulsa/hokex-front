import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      external: [
        // Exclude backup folders and legacy files from build
        /backups\/.*/,
        /.*\.backup$/,
        /.*\.old$/,
        /.*\.corrupted-cache$/,
        /.*\.kiro-cache-broken$/,
        /.*\.from-git$/,
        /.*\.a4aa1a6$/,
      ]
    }
  }
})
