import { resolve } from 'path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    entry: resolve(__dirname, 'src/main/index.ts'),
    plugins: [],
    build: {
      rollupOptions: {
        external: ['sqlite3', 'sqlite', 'playwright', 'playwright-core']
      }
    }
  },
  preload: {
    entry: resolve(__dirname, 'src/preload/index.ts'),
    plugins: []
  },
  renderer: {
    root: 'src/renderer',
    plugins: [react()],
    server: {
      port: 5173,
      host: 'localhost'
    }
  },
  // Add this to disable caching
  cacheDir: undefined,
}) 