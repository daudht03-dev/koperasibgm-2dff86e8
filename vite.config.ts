import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";
import type { VitePWAOptions } from "vite-plugin-pwa";

const pwaOptions: Partial<VitePWAOptions> = {
  registerType: 'prompt',
  includeAssets: ['favicon.ico', 'pwa-192x192.png', 'pwa-512x512.png'],
  manifest: {
    name: 'Berkah Gendis Mandiri',
    short_name: 'BGM',
    description: 'Produsen gula kelapa organik berkualitas tinggi yang bekerja sama langsung dengan petani lokal',
    theme_color: '#22c55e',
    background_color: '#ffffff',
    display: 'standalone',
    orientation: 'portrait',
    scope: '/',
    start_url: '/',
    icons: [
      {
        src: 'pwa-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any maskable'
      },
      {
        src: 'pwa-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable'
      }
    ]
  },
  workbox: {
    // Don't precache HTML - always fetch from network
    globPatterns: ['**/*.{js,css,ico,png,jpg,jpeg,svg,woff,woff2}'],
    maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
    // Skip waiting - activate new SW immediately
    skipWaiting: true,
    clientsClaim: true,
    // Cleaner cache management
    cleanupOutdatedCaches: true,
    runtimeCaching: [
      {
        // HTML pages - Network First (always try to get fresh)
        urlPattern: /\.html$/,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'html-cache',
          expiration: {
            maxEntries: 10,
            maxAgeSeconds: 60 * 60 // 1 hour only
          },
          networkTimeoutSeconds: 3
        }
      },
      {
        // API calls - Network First with short cache
        urlPattern: /^https:\/\/kreupbnakmqgfsbiijhl\.supabase\.co\/.*/i,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'supabase-cache',
          expiration: {
            maxEntries: 50,
            maxAgeSeconds: 60 * 5 // 5 minutes only
          },
          networkTimeoutSeconds: 5
        }
      },
      {
        // Static assets - Cache First (safe to cache longer)
        urlPattern: /\.(?:js|css|woff2?)$/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'static-assets',
          expiration: {
            maxEntries: 100,
            maxAgeSeconds: 60 * 60 * 24 * 7 // 7 days
          }
        }
      },
      {
        // Images - Cache First
        urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'image-cache',
          expiration: {
            maxEntries: 100,
            maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
          }
        }
      }
    ]
  },
  devOptions: {
    enabled: false
  }
};

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA(pwaOptions)
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
