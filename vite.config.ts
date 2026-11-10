import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/erp-workflow-practice/',
  plugins: [react()],
})
