import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  optimizeDeps: {
    exclude: ['onnxruntime-web', 'onnxruntime-web/wasm'],
  },
  assetsInclude: ['**/*.wasm', '**/*.onnx'],
  build: {
    target: 'esnext',
  },
  worker: {
    format: 'es' as const,
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico'],
      manifest: {
        name: 'NDLOCR Lite Web',
        short_name: 'NDLOCR',
        description: 'ブラウザ完結型 OCR - ONNX Runtime Web で動作',
        theme_color: '#1a237e',
        background_color: '#f5f5f5',
        display: 'standalone',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
      workbox: {
        // Precache app shell only; WASM/ONNX go through runtimeCaching
        globPatterns: ['**/*.{js,css,html}'],
        // Exclude large WASM files from precache (they're runtime-cached instead)
        globIgnores: ['**/*.wasm'],
        runtimeCaching: [
          {
            urlPattern: /\.onnx$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'onnx-models',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /\.wasm$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'wasm-files',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 30 * 24 * 60 * 60,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ],
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
})
