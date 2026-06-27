import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'public',
      filename: 'sw.js',
      injectRegister: false, // Kita sudah register manual di index.html
      manifest: {
        name: 'RootFacts - AI Plant/Root Recognition',
        short_name: 'RootFacts',
        description: 'Aplikasi AI untuk mengenali tanaman dan sayuran serta memberikan fakta menarik',
        theme_color: '#10b981',
        background_color: '#f9fafb',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        orientation: 'portrait',
        icons: [
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ],
        screenshots: [
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            form_factor: 'wide',
            label: 'RootFacts App'
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'RootFacts App Mobile'
          }
        ]
      },
      injectManifest: {
        globPatterns: [
          '**/*.{js,css,html,ico,png,svg,woff,woff2,wasm}',
          'model/**/*.{json,bin}'
        ],
        maximumFileSizeToCacheInBytes: 30 * 1024 * 1024 // 30 MB untuk WASM + model
      }
    })
  ],
  server: {
    port: 3001,
    host: true
  }
});
