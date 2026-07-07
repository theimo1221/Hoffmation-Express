import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  // Load .env / .env.local (empty prefix -> also non-VITE_ vars) so the dev-proxy target is
  // configurable per machine without committing a host. Put it in webui/.env.local (git-ignored).
  const env = loadEnv(mode, path.resolve(__dirname), '');
  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['icon.png', 'icon-192.png', 'icon-512.png'],
        injectRegister: 'auto',
        manifest: {
          name: 'Hoffmation',
          short_name: 'Hoffmation',
          description: 'Smart Home Control',
          start_url: '/ui/',
          scope: '/ui/',
          display: 'standalone',
          orientation: 'portrait-primary',
          background_color: '#000000',
          theme_color: '#3B82F6',
          categories: ['lifestyle', 'utilities'],
          icons: [
            {
              src: '/ui/icon-192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: '/ui/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
            },
          ],
          shortcuts: [
            {
              name: 'Grundriss',
              short_name: 'Grundriss',
              description: 'Öffne Grundriss-Ansicht',
              url: '/ui/floor/0',
              icons: [{ src: '/ui/icon-192.png', sizes: '192x192' }],
            },
            {
              name: 'Favoriten',
              short_name: 'Favoriten',
              description: 'Öffne Favoriten',
              url: '/ui/favorites',
              icons: [{ src: '/ui/icon-192.png', sizes: '192x192' }],
            },
            {
              name: 'Räume',
              short_name: 'Räume',
              description: 'Öffne Raumliste',
              url: '/ui/rooms',
              icons: [{ src: '/ui/icon-192.png', sizes: '192x192' }],
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
          additionalManifestEntries: [{ url: '/ui/sw-push.js', revision: null }],
          importScripts: ['/ui/sw-push.js'],
          runtimeCaching: [
            // Static assets - cache first, long duration
            {
              urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'static-assets',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
                },
              },
            },
            // API data - network first with short cache fallback
            {
              urlPattern: ({ url }) =>
                url.pathname.startsWith('/rooms') ||
                url.pathname.startsWith('/devices') ||
                url.pathname.startsWith('/groups'),
              handler: 'NetworkFirst',
              options: {
                cacheName: 'api-data',
                networkTimeoutSeconds: 5,
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 30, // Only 30 seconds!
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            // Settings - stale while revalidate
            {
              urlPattern: ({ url }) => url.pathname.includes('/webui/settings'),
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'settings-cache',
                expiration: {
                  maxAgeSeconds: 24 * 60 * 60, // 24 hours
                },
              },
            },
            // Camera images - network only (always fresh)
            {
              urlPattern: ({ url }) => url.pathname.includes('/camera/'),
              handler: 'NetworkOnly',
            },
          ],
        },
      }),
    ],
    base: '/ui/',
    build: {
      // Sourcemaps let Monocart map browser V8 coverage back to the TS sources (see playwright/MCR setup).
      sourcemap: true,
    },
    define: {
      global: 'globalThis',
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 3001,
      proxy: {
        '/api': {
          // e.g. HOFFMATION_API_PROXY_TARGET=http://your-server:3000 in webui/.env.local
          target: env.HOFFMATION_API_PROXY_TARGET || 'http://localhost:3000',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
      },
    },
  };
});
