import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: ['bgpview.renylson.com.br']
  },
  build: {
    commonjsOptions: {
      include: [/date-fns/, /node_modules/]
    }
  },
  optimizeDeps: {
    include: ['date-fns']
  },
  resolve: {
    alias: {
      'date-fns': 'date-fns'
    }
  }
})
