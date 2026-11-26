import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { useStore, type TimerState } from './store'

// ---------------------------------------------------------------------------
// Sound: browsers only allow audio after a user gesture, so we unlock an
// AudioContext the first time someone presses a timer button.

let audioCtx: AudioContext | null = null

export function unlockAudio() {
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return
    if (!audioCtx) audioCtx = new AC()
    if (audioCtx.state === 'suspended') void audioCtx.resume()
  } catch {
    audioCtx = null
  }
}

function chime() {
  const ctx = audioCtx
  if (!ctx || ctx.state !== 'running') return
  const notes = [659.25, 880, 1046.5]
  notes.forEach((freq, i) => {
    const start = ctx.currentTime + i * 0.22
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'triangle'
    osc.frequency.value = freq
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(0.25, start + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.5)
    osc.connect(gain).connect(ctx.destination)
    osc.start(start)
    osc.stop(start + 0.55)
  })
}

// ---------------------------------------------------------------------------
// Clock: a shared "now" that ticks only while a timer is running. Remaining
// time is always endAt - Date.now(), so a throttled background tab shows the
// correct time the moment it is visible again.

const ClockContext = createContext<number>(Date.now())

export function useNow() {
  return useContext(ClockContext)
}

export function remainingMs(t: TimerState | undefined, now: number, fallback: number) {
  if (!t) return fallback
  if (t.status === 'running') return Math.max(0, (t.endAt ?? now) - now)
  return t.remainingMs
}

export function ClockProvider({ children }: { children: ReactNode }) {
  const { state, dispatch } = useStore()
  const [now, setNow] = useState(() => Date.now())
  const timersRef = useRef(state.timers)
  timersRef.current = state.timers
  const soundRef = useRef(state.sound)
  soundRef.current = state.sound

  const anyRunning = Object.values(state.timers).some((t) => t.status === 'running')

  useEffect(() => {
    const tick = () => {
      const current = Date.now()
      setNow(current)
      let finished = false
      for (const [key, t] of Object.entries(timersRef.current)) {
        if (t.status === 'running' && (t.endAt ?? 0) <= current) {
          dispatch({ type: 'timerComplete', key })
          finished = true
        }
      }
      if (finished) {
        if (soundRef.current) chime()
        try {
          navigator.vibrate?.([200, 100, 200])
        } catch {
          /* not supported */
        }
      }
    }
    tick()
    if (!anyRunning) return
    const id = window.setInterval(tick, 250)
    const onVisible = () => document.visibilityState === 'visible' && tick()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [anyRunning, dispatch])

  return <ClockContext.Provider value={now}>{children}</ClockContext.Provider>
}

export function formatClock(ms: number, lang: 'ar' | 'en') {
  const total = Math.ceil(ms / 1000)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  void lang // Arabic-Indic zero (٠) reads as a dot at clock sizes, so timers use Latin digits in both languages.
  const fmt = new Intl.NumberFormat('en-US', { minimumIntegerDigits: 2, useGrouping: false })
  const parts = h > 0 ? [h, m, s] : [m, s]
  // Clock digits always read left-to-right, even in Arabic.
  return parts.map((p) => fmt.format(p)).join(':')
}
