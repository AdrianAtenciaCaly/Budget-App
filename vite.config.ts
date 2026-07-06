import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'icon.png'],
      manifest: {
        name: 'Budget App — Tu presupuesto, mes a mes',
        short_name: 'Budget App',
        description: 'Presupuesto personal mes a mes, con proyección y categorías propias.',
        theme_color: '#2f5440',
        background_color: '#f6f3ec',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icon.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        // Precarga el "app shell" (HTML/JS/CSS) para que la app abra sin red.
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            // Lecturas (SELECT): si hay red, trae lo último; si no, sirve la última copia cacheada.
            urlPattern: ({ url, request }) =>
              url.href.includes('.supabase.co/rest/v1/') && request.method === 'GET',
            handler: 'NetworkFirst',
            method: 'GET',
            options: {
              cacheName: 'supabase-reads',
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Escrituras: nunca se sirven desde caché — si no hay red, fallan
            // y la maneja la cola de la app (offlineQueue.ts).
            urlPattern: ({ url, request }) =>
              url.href.includes('.supabase.co/rest/v1/') && request.method !== 'GET',
            handler: 'NetworkOnly',
            method: 'POST',
          },
          {
            urlPattern: ({ url, request }) =>
              url.href.includes('.supabase.co/rest/v1/') && request.method === 'PATCH',
            handler: 'NetworkOnly',
            method: 'PATCH',
          },
          {
            urlPattern: ({ url, request }) =>
              url.href.includes('.supabase.co/rest/v1/') && request.method === 'DELETE',
            handler: 'NetworkOnly',
            method: 'DELETE',
          },
          {
            // Fuentes de Google Fonts: cachear para que los estilos no se rompan offline.
            urlPattern: ({ url }) => url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com',
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: {
        enabled: false, // actívalo en true solo si quieres probar el SW en `npm run dev`
      },
    }),
  ],
})