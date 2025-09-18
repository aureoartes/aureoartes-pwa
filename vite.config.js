import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import pkg from "./package.json"

export default defineConfig({
  plugins: [react()],
  define: {
    "import.meta.env.VITE_APP_VERSION": JSON.stringify(pkg.version),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'), // <= habilita "@/..."
    },
  },
})
