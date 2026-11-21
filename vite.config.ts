import process from 'node:process'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Relative base keeps the build portable across GitHub Pages project sites,
// Cloudflare Pages, and any static file host.
export default defineConfig({
  base: './',
  // Preview hosts are supplied per process (e.g. VITE_ALLOWED_HOSTS=a.example) so
  // no deployment-specific hostname is committed.
  server: {
    host: true,
    allowedHosts: process.env.VITE_ALLOWED_HOSTS?.split(',').filter(Boolean),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Scripture Search — World Scriptures',
        short_name: 'Scripture',
        description:
          'Read and search the scriptures of the world by keyword, emotion, or theme. Works offline.',
        theme_color: '#1c1917',
        background_color: '#faf7f2',
        display: 'standalone',
        orientation: 'portrait',
        start_url: './',
        scope: './',
        categories: ['books', 'education', 'reference'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Data files are large; cache them at runtime the first time a book is
        // read, so the app shell stays small but everything read becomes offline.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,woff}'],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /\/data\/.*\.json(\.gz)?$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'scripture-data-v1',
              expiration: { maxEntries: 400, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  build: {
    target: 'es2020',
    cssCodeSplit: true,
  },
})
