import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import pkg from './package.json' with { type: 'json' }

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      filename: 'service-worker.ts',
      manifestFilename: 'manifest.json',
      injectRegister: false,
      includeAssets: [],
      manifest: {
        id: '/',
        name: 'دفتر الحلال',
        short_name: 'دفتر الحلال',
        description: 'النظام المحاسبي لإدارة مشروع الحلال',
        lang: 'ar',
        dir: 'rtl',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        display_override: ['standalone', 'minimal-ui'],
        orientation: 'portrait',
        background_color: '#F7F3EC',
        theme_color: '#3B261C',
        categories: ['finance', 'business', 'productivity'],
        icons: [
          { src: '/icons/icon-72.png', sizes: '72x72', type: 'image/png' },
          { src: '/icons/icon-96.png', sizes: '96x96', type: 'image/png' },
          { src: '/icons/icon-128.png', sizes: '128x128', type: 'image/png' },
          { src: '/icons/icon-144.png', sizes: '144x144', type: 'image/png' },
          { src: '/icons/icon-152.png', sizes: '152x152', type: 'image/png' },
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-384.png', sizes: '384x384', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        shortcuts: [
          { name: 'إضافة قيد', short_name: 'قيد جديد', url: '/#/add', icons: [{ src: '/icons/icon-96.png', sizes: '96x96' }] },
          { name: 'دفتر اليومية', url: '/#/journal', icons: [{ src: '/icons/icon-96.png', sizes: '96x96' }] },
        ],
      },
      strategies: 'injectManifest',
      srcDir: 'src',
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,woff2,png,svg,ico,json,mjs}'],
        globIgnores: ['splash/**'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
      devOptions: { enabled: false },
    }),
  ],
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 1500,
  },
})
