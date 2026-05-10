/**
 * Tujuan: Konfigurasi Vite JS.
 * Dipakai oleh: Vite build/dev server.
 * Dependensi: vite, @vitejs/plugin-react, @tailwindcss/vite.
 * Daftar Fungsi: -
 * Side Effect: Mem-proxy /api ke localhost:3000.
 */
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react()
  ],
  server: {
    proxy: {
      '/api': 'http://localhost:3000'
    }
  }
})
