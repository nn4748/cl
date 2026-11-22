/// <reference lib="webworker" />
/**
 * Service Worker — دفتر الحلال
 * - يخزّن هيكل التطبيق وكل ملفاته مسبقاً (Workbox precache) ليفتح بدون إنترنت
 * - كل التنقلات تُخدم من index.html المخزّن (تطبيق صفحة واحدة)
 * - صفحة offline.html كاحتياط أخير إذا تعذر كل شيء
 * - لا يخزّن أبداً طلبات قاعدة البيانات (Supabase) — البيانات المالية تُحفظ في IndexedDB فقط
 */
import { clientsClaim } from 'workbox-core'
import { ExpirationPlugin } from 'workbox-expiration'
import { cleanupOutdatedCaches, createHandlerBoundToURL, matchPrecache, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute, setCatchHandler } from 'workbox-routing'
import { CacheFirst } from 'workbox-strategies'

declare const self: ServiceWorkerGlobalScope

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') void self.skipWaiting()
})

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()
clientsClaim()

// التنقل: أعد index.html من الكاش دائماً (يعمل بدون إنترنت)
registerRoute(
  new NavigationRoute(createHandlerBoundToURL('/index.html'), {
    denylist: [/^\/rest\//, /^\/auth\//, /\.[a-z0-9]+$/i],
  }),
)

// شاشات البداية لأجهزة iPhone/iPad: تُخزَّن عند أول طلب
registerRoute(
  ({ url }) => url.origin === self.location.origin && url.pathname.startsWith('/splash/'),
  new CacheFirst({ cacheName: 'splash-screens', plugins: [new ExpirationPlugin({ maxEntries: 40 })] }),
)

// احتياط: إن فشل طلب صفحة، اعرض صفحة "بدون اتصال"
setCatchHandler(async ({ request }) => {
  if (request.destination === 'document') {
    return (await matchPrecache('/index.html')) ?? (await matchPrecache('/offline.html')) ?? Response.error()
  }
  return Response.error()
})
