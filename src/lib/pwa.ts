import { useSyncExternalStore } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

interface PwaState {
  installEvent: BeforeInstallPromptEvent | null
  installed: boolean
  updateReady: boolean
  offlineReady: boolean
  applyUpdate: (() => Promise<void>) | null
}

let state: PwaState = {
  installEvent: null,
  installed: isStandalone(),
  updateReady: false,
  offlineReady: false,
  applyUpdate: null,
}
const subs = new Set<() => void>()
function set(p: Partial<PwaState>) {
  state = { ...state, ...p }
  subs.forEach((s) => s())
}

export function isStandalone(): boolean {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

export function isIOS(): boolean {
  return /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

export function initPwa() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    set({ installEvent: e as BeforeInstallPromptEvent })
  })
  window.addEventListener('appinstalled', () => set({ installed: true, installEvent: null }))
}

export function setUpdateHandlers(p: Partial<PwaState>) {
  set(p)
}

export async function promptInstall(): Promise<boolean> {
  const ev = state.installEvent
  if (!ev) return false
  await ev.prompt()
  const { outcome } = await ev.userChoice
  set({ installEvent: null })
  return outcome === 'accepted'
}

export function usePwa(): PwaState {
  return useSyncExternalStore(
    (cb) => {
      subs.add(cb)
      return () => subs.delete(cb)
    },
    () => state,
  )
}
