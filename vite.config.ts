import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/apple-touch-icon.png'],
      manifest: {
        name: 'QLHS - Quản lý học sinh 11C5',
        short_name: 'QLHS',
        description: 'Ứng dụng quản lý thi đua và điểm học sinh lớp 11C5',
        theme_color: '#1e40af',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/qlhs/',
        scope: '/qlhs/',
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Cache toan bo static assets (JS/CSS/HTML/hinh anh) - chien luoc cache-first mac dinh cua vite-plugin-pwa
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            // Backend la Supabase (khong con Apps Script tu C132) - network-first de uu tien du lieu moi,
            // chi cache GET (PostgREST doc du lieu), khong cache POST/PATCH/DELETE de tranh luu nham thao tac ghi.
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            method: 'GET',
            options: {
              cacheName: 'qlhs-api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24, // 24 gio
              },
              networkTimeoutSeconds: 10,
            },
          },
        ],
      },
    }),
  ],
  base: '/qlhs/',
})
