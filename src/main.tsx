import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App.tsx'
import './index.css'
import { initPwa, setUpdateHandlers } from './lib/pwa'
import { loadAll } from './lib/store'
import { startSyncEngine } from './lib/sync'
import { toast } from './ui/kit'

initPwa()

const updateSW = registerSW({
  onNeedRefresh() {
    setUpdateHandlers({ updateReady: true, applyUpdate: () => updateSW(true) })
    toast('يوجد تحديث جديد للتطبيق', 'ok', { label: 'تحديث', run: () => void updateSW(true) })
  },
  onOfflineReady() {
    setUpdateHandlers({ offlineReady: true })
    toast('التطبيق جاهز للعمل بدون إنترنت')
  },
  onRegisteredSW(_url, reg) {
    // فحص التحديثات كل ساعة
    if (reg) setInterval(() => void reg.update(), 60 * 60 * 1000)
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

loadAll()
  .then(startSyncEngine)
  .catch((e) => {
    console.error(e)
    document.getElementById('root')!.innerHTML =
      '<div style="padding:40px 20px;text-align:center;font-family:sans-serif">تعذر فتح قاعدة البيانات على هذا المتصفح. إذا كنت في وضع التصفح الخاص، افتح التطبيق في نافذة عادية.</div>'
  })
