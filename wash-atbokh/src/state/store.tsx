import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react'
import { STRINGS, type Strings } from '../i18n/strings'
import type { Lang } from '../i18n/types'
import { DEFAULT_PREFS, type PantryItem, type Prefs } from '../lib/match'

export type TimerStatus = 'idle' | 'running' | 'paused' | 'done'

export interface TimerState {
  durationMs: number
  status: TimerStatus
  /** Absolute epoch ms when a running timer ends. Remaining time is derived from the clock, so it never drifts. */
  endAt?: number
  /** Remaining time while idle or paused. */
  remainingMs: number
  acknowledged?: boolean
}

export interface AppState {
  lang: Lang
  pantry: PantryItem[]
  prefs: Prefs
  /** Keyed by `${recipeId}#${stepIndex}` so every step owns its own timer. */
  timers: Record<string, TimerState>
  /** Current cooking step per recipe. */
  progress: Record<string, number>
  /** Servings chosen on a recipe page. */
  servings: Record<string, number>
  sound: boolean
}

export const timerKey = (recipeId: string, step: number) => `${recipeId}#${step}`
export const parseTimerKey = (key: string) => {
  const [recipeId, step] = key.split('#')
  return { recipeId, step: Number(step) }
}

type Action =
  | { type: 'lang'; lang: Lang }
  | { type: 'addIngredients'; ids: { id: string; label?: string }[] }
  | { type: 'removeIngredient'; id: string }
  | { type: 'toggleSoon'; id: string }
  | { type: 'clearPantry' }
  | { type: 'prefs'; patch: Partial<Prefs> }
  | { type: 'progress'; recipeId: string; step: number }
  | { type: 'servings'; recipeId: string; servings: number }
  | { type: 'sound'; on: boolean }
  | { type: 'timerStart'; key: string; durationMs: number; now: number }
  | { type: 'timerPause'; key: string; now: number }
  | { type: 'timerResume'; key: string; now: number }
  | { type: 'timerReset'; key: string }
  | { type: 'timerAdd'; key: string; ms: number; now: number }
  | { type: 'timerComplete'; key: string }
  | { type: 'timerDismiss'; key: string }

const STORAGE_KEY = 'wash-atbokh:session:v1'

function initialState(): AppState {
  const base: AppState = { lang: 'ar', pantry: [], prefs: DEFAULT_PREFS, timers: {}, progress: {}, servings: {}, sound: true }
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (raw) {
      const saved = JSON.parse(raw) as Partial<AppState>
      return { ...base, ...saved, prefs: { ...DEFAULT_PREFS, ...saved.prefs } }
    }
  } catch {
    /* storage unavailable: start fresh */
  }
  return base
}

function patchTimer(state: AppState, key: string, fn: (t: TimerState | undefined) => TimerState | undefined): AppState {
  const next = fn(state.timers[key])
  const timers = { ...state.timers }
  if (next) timers[key] = next
  else delete timers[key]
  return { ...state, timers }
}

function reducer(state: AppState, a: Action): AppState {
  switch (a.type) {
    case 'lang':
      return { ...state, lang: a.lang }
    case 'addIngredients': {
      const existing = new Set(state.pantry.map((p) => p.id))
      const added = a.ids.filter((i) => !existing.has(i.id)).map((i) => ({ id: i.id, label: i.label, useSoon: false }))
      return added.length ? { ...state, pantry: [...state.pantry, ...added] } : state
    }
    case 'removeIngredient':
      return { ...state, pantry: state.pantry.filter((p) => p.id !== a.id) }
    case 'toggleSoon':
      return { ...state, pantry: state.pantry.map((p) => (p.id === a.id ? { ...p, useSoon: !p.useSoon } : p)) }
    case 'clearPantry':
      return { ...state, pantry: [] }
    case 'prefs':
      return { ...state, prefs: { ...state.prefs, ...a.patch } }
    case 'progress':
      return { ...state, progress: { ...state.progress, [a.recipeId]: a.step } }
    case 'servings':
      return { ...state, servings: { ...state.servings, [a.recipeId]: a.servings } }
    case 'sound':
      return { ...state, sound: a.on }
    case 'timerStart':
      return patchTimer(state, a.key, (t) => {
        const remaining = t && t.status !== 'done' ? t.remainingMs : a.durationMs
        return { durationMs: t?.durationMs ?? a.durationMs, status: 'running', endAt: a.now + remaining, remainingMs: remaining }
      })
    case 'timerPause':
      return patchTimer(state, a.key, (t) =>
        t && t.status === 'running' ? { ...t, status: 'paused', remainingMs: Math.max(0, (t.endAt ?? a.now) - a.now), endAt: undefined } : t,
      )
    case 'timerResume':
      return patchTimer(state, a.key, (t) => (t && t.status === 'paused' ? { ...t, status: 'running', endAt: a.now + t.remainingMs } : t))
    case 'timerReset':
      return patchTimer(state, a.key, () => undefined)
    case 'timerAdd':
      return patchTimer(state, a.key, (t) => {
        if (!t) return t
        if (t.status === 'running') return { ...t, endAt: (t.endAt ?? a.now) + a.ms, durationMs: t.durationMs + a.ms }
        if (t.status === 'done') return { ...t, status: 'running', endAt: a.now + a.ms, remainingMs: a.ms, acknowledged: undefined }
        return { ...t, remainingMs: t.remainingMs + a.ms, durationMs: t.durationMs + a.ms }
      })
    case 'timerComplete':
      return patchTimer(state, a.key, (t) => (t ? { ...t, status: 'done', endAt: undefined, remainingMs: 0, acknowledged: false } : t))
    case 'timerDismiss':
      return patchTimer(state, a.key, (t) => (t ? { ...t, acknowledged: true } : t))
  }
}

interface Ctx {
  state: AppState
  dispatch: React.Dispatch<Action>
  t: Strings
}

const StoreContext = createContext<Ctx | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState)

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      /* ignore */
    }
  }, [state])

  useEffect(() => {
    const html = document.documentElement
    html.lang = state.lang
    html.dir = state.lang === 'ar' ? 'rtl' : 'ltr'
    document.title = STRINGS[state.lang].brand
  }, [state.lang])

  const value = useMemo(() => ({ state, dispatch, t: STRINGS[state.lang] }), [state])
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore outside provider')
  return ctx
}
