import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const summaryRevision = createHash('sha256')
  .update(readFileSync(new URL('./public/data/summary.json', import.meta.url)))
  .digest('hex');

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          charts: ['recharts'],
          icons: ['lucide-react'],
        },
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Análise Eleitoral 2026',
        short_name: 'Eleições 2026',
        description: 'Análise comparativa dos resultados das Eleições Presidenciais de 2026.',
        theme_color: '#805AD5',
        background_color: '#F7FAFC',
        display: 'standalone',
        start_url: '/',
        lang: 'pt-BR',
        icons: [
          {
            src: 'icons/pwa-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icons/pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        additionalManifestEntries: [{ url: 'data/summary.json', revision: summaryRevision }],
        runtimeCaching: [
          {
            urlPattern: /\/data\/states\/[A-Z]{2}\.json$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'election-state-data',
              networkTimeoutSeconds: 4,
              expiration: {
                maxEntries: 27,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
              cacheableResponse: {
                statuses: [200],
              },
            },
          },
        ],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
  },
});
