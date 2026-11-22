import { useEffect, useState, type ReactNode } from 'react'
import { formatSAR } from '../lib/money'

// ───────────── التنقل (hash router) ─────────────

export type Route = { path: string; params: URLSearchParams }

function readRoute(): Route {
  const h = location.hash.replace(/^#/, '') || '/'
  const [path, q = ''] = h.split('?')
  return { path: path || '/', params: new URLSearchParams(q) }
}

export function useRoute(): Route {
  const [r, setR] = useState(readRoute)
  useEffect(() => {
    const on = () => setR(readRoute())
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return r
}

export function go(path: string, scrollTop = true) {
  if (location.hash !== '#' + path) location.hash = path
  if (scrollTop) window.scrollTo({ top: 0 })
}

// ───────────── الإشعارات ─────────────

type ToastT = { id: number; text: string; kind: 'ok' | 'err'; action?: { label: string; run: () => void } }
let toasts: ToastT[] = []
const toastSubs = new Set<(t: ToastT[]) => void>()

export function toast(text: string, kind: 'ok' | 'err' = 'ok', action?: ToastT['action']) {
  const t = { id: Date.now() + Math.random(), text, kind, action }
  toasts = [...toasts, t]
  toastSubs.forEach((s) => s(toasts))
  setTimeout(
    () => {
      toasts = toasts.filter((x) => x.id !== t.id)
      toastSubs.forEach((s) => s(toasts))
    },
    action ? 7000 : kind === 'err' ? 5000 : 2800,
  )
}

export function Toasts() {
  const [list, setList] = useState<ToastT[]>(toasts)
  useEffect(() => {
    toastSubs.add(setList)
    return () => void toastSubs.delete(setList)
  }, [])
  return (
    <div className="toast-wrap" role="status" aria-live="polite">
      {list.map((t) => (
        <div key={t.id} className={`toast ${t.kind === 'err' ? 'err' : ''}`}>
          <span>{t.kind === 'ok' ? '✓' : '!'}</span>
          <span>{t.text}</span>
          {t.action && (
            <button className="btn btn-sm" onClick={t.action.run}>
              {t.action.label}
            </button>
          )}
        </div>
      ))}
    </div>
  )
}

// ───────────── النوافذ ─────────────

export function Sheet({ open, onClose, children, title }: { open: boolean; onClose: () => void; children: ReactNode; title?: ReactNode }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grip" />
        {title && <h2 className="sheet-title">{title}</h2>}
        {children}
      </div>
    </div>
  )
}

type ConfirmReq = { title: string; body?: ReactNode; confirm: string; danger?: boolean; resolve: (v: boolean) => void }
let confirmSet: ((c: ConfirmReq | null) => void) | null = null

export function confirmDialog(opts: Omit<ConfirmReq, 'resolve'>): Promise<boolean> {
  return new Promise((resolve) => {
    if (!confirmSet) return resolve(window.confirm(opts.title))
    confirmSet({ ...opts, resolve })
  })
}

export function ConfirmHost() {
  const [req, setReq] = useState<ConfirmReq | null>(null)
  useEffect(() => {
    confirmSet = setReq
    return () => {
      confirmSet = null
    }
  }, [])
  const close = (v: boolean) => {
    req?.resolve(v)
    setReq(null)
  }
  return (
    <Sheet open={!!req} onClose={() => close(false)} title={req?.title}>
      {req?.body && <div className="muted" style={{ marginBottom: 18 }}>{req.body}</div>}
      <div className="grid grid-2" style={{ marginTop: 12 }}>
        <button className="btn btn-outline" onClick={() => close(false)}>
          إلغاء
        </button>
        <button className={`btn ${req?.danger ? 'btn-danger-solid' : 'btn-primary'}`} onClick={() => close(true)} autoFocus>
          {req?.confirm}
        </button>
      </div>
    </Sheet>
  )
}

// ───────────── عرض المبالغ ─────────────

export function Money({ v, className = '', cur = true, blankZero = false }: { v: number; className?: string; cur?: boolean; blankZero?: boolean }) {
  if (blankZero && !v) return <span className={className}>—</span>
  return (
    <span className={`money ${className}`} dir="ltr">
      {formatSAR(v)}
      {cur && <span className="muted" style={{ fontSize: '0.72em', fontWeight: 500, marginInlineStart: 4 }}>ر.س</span>}
    </span>
  )
}
