import { useCallback, useEffect, useRef, useState } from 'react'
import { DishArt } from '../art/DishArt'
import { LogoMark } from '../art/Logo'
import { LangSwitch } from '../components/Header'
import { IconArrow, IconCheck, IconChevron, IconClock, IconMute, IconPause, IconPlay, IconPlus, IconReset, IconSound, IconSun, IconX } from '../components/Icons'
import { RECIPE_MAP, type Recipe } from '../data/recipes'
import { go, href } from '../lib/router'
import { formatClock, remainingMs, unlockAudio, useNow } from '../state/clock'
import { parseTimerKey, timerKey, useStore } from '../state/store'

function useWakeLock() {
  const supported = typeof navigator !== 'undefined' && 'wakeLock' in navigator
  const [on, setOn] = useState(false)
  const sentinel = useRef<WakeLockSentinel | null>(null)

  const acquire = useCallback(async () => {
    try {
      sentinel.current = await navigator.wakeLock.request('screen')
      sentinel.current.addEventListener('release', () => {
        sentinel.current = null
      })
      return true
    } catch {
      return false
    }
  }, [])

  useEffect(() => {
    if (!on) {
      void sentinel.current?.release()
      sentinel.current = null
      return
    }
    void acquire().then((ok) => !ok && setOn(false))
    const onVis = () => document.visibilityState === 'visible' && !sentinel.current && void acquire()
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [on, acquire])

  useEffect(() => () => void sentinel.current?.release(), [])
  return { supported, on, toggle: () => setOn((v) => !v) }
}

function Dial({ fraction, done }: { fraction: number; done: boolean }) {
  const r = 104
  const c = 2 * Math.PI * r
  return (
    <svg viewBox="0 0 240 240" className={`dial ${done ? 'is-done' : ''}`} aria-hidden="true">
      <circle cx="120" cy="120" r={r} className="dial__track" />
      <circle cx="120" cy="120" r={r} className="dial__fill" strokeDasharray={c} strokeDashoffset={c * (1 - fraction)} transform="rotate(-90 120 120)" />
      {Array.from({ length: 60 }, (_, i) => {
        const a = (i / 60) * Math.PI * 2
        const long = i % 5 === 0
        const r1 = long ? 82 : 86
        return <line key={i} x1={120 + Math.cos(a) * r1} y1={120 + Math.sin(a) * r1} x2={120 + Math.cos(a) * 90} y2={120 + Math.sin(a) * 90} className="dial__tick" />
      })}
    </svg>
  )
}

function StepTimer({ recipe, step }: { recipe: Recipe; step: number }) {
  const { state, dispatch, t } = useStore()
  const L = state.lang
  const now = useNow()
  const s = recipe.steps[step]
  const key = timerKey(recipe.id, step)
  const tm = state.timers[key]

  if (!s.minutes) {
    return (
      <div className="timer timer--none">
        <IconCheck size={28} />
        <p>{t.cook.noTimer}</p>
      </div>
    )
  }

  const full = s.minutes * 60000
  const duration = tm?.durationMs ?? full
  const left = remainingMs(tm, now, full)
  const status = tm?.status ?? 'idle'
  const done = status === 'done'
  const fraction = done ? 0 : duration ? left / duration : 1

  const act = (fn: () => void) => () => {
    unlockAudio()
    fn()
  }

  return (
    <section className={`timer is-${status} ${done && !tm?.acknowledged ? 'is-alerting' : ''}`} aria-label={t.cook.timerFor(s.title[L])}>
      <div className="timer__dial">
        <Dial fraction={fraction} done={done} />
        <div className="timer__readout">
          <span className="timer__state">{done ? t.cook.done : status === 'running' ? t.cook.running : status === 'paused' ? t.cook.paused : t.recipe.stepTimer(s.minutes)}</span>
          <span className="timer__time" dir="ltr" role="timer" aria-live="off">{formatClock(left, L)}</span>
          <span className="timer__label">{s.title[L]}</span>
        </div>
      </div>

      {done && !tm?.acknowledged && (
        <p className="timer__done" role="alert">{t.cook.doneLong(s.title[L])}</p>
      )}

      <div className="timer__controls">
        {status === 'idle' && (
          <button type="button" className="btn btn--primary btn--lg" onClick={act(() => dispatch({ type: 'timerStart', key, durationMs: full, now: Date.now() }))}>
            <IconPlay size={20} /> {t.cook.start}
          </button>
        )}
        {status === 'running' && (
          <button type="button" className="btn btn--cream btn--lg" onClick={act(() => dispatch({ type: 'timerPause', key, now: Date.now() }))}>
            <IconPause size={20} /> {t.cook.pause}
          </button>
        )}
        {status === 'paused' && (
          <button type="button" className="btn btn--primary btn--lg" onClick={act(() => dispatch({ type: 'timerResume', key, now: Date.now() }))}>
            <IconPlay size={20} /> {t.cook.resume}
          </button>
        )}
        {done && !tm?.acknowledged && (
          <button type="button" className="btn btn--primary btn--lg" onClick={() => dispatch({ type: 'timerDismiss', key })}>
            <IconCheck size={20} /> {t.cook.dismiss}
          </button>
        )}
        {status !== 'idle' && (
          <>
            <button type="button" className="btn btn--outline-light" onClick={act(() => dispatch({ type: 'timerAdd', key, ms: 60000, now: Date.now() }))} aria-label={t.cook.plus1Aria}>
              <IconPlus size={18} /> <span aria-hidden="true">{t.cook.plus1}</span>
            </button>
            <button type="button" className="btn btn--outline-light" onClick={() => dispatch({ type: 'timerReset', key })}>
              <IconReset size={18} /> {t.cook.reset}
            </button>
          </>
        )}
      </div>
    </section>
  )
}

function ActiveTimers({ onJump }: { onJump: (recipeId: string, step: number) => void }) {
  const { state, t } = useStore()
  const L = state.lang
  const now = useNow()
  const items = Object.entries(state.timers)
    .filter(([, tm]) => tm.status !== 'idle')
    .map(([key, tm]) => ({ key, tm, ...parseTimerKey(key), ms: remainingMs(tm, now, 0) }))
    .filter((x) => RECIPE_MAP[x.recipeId]?.steps[x.step])
    .sort((a, b) => (a.tm.status === 'done' ? -1 : 0) - (b.tm.status === 'done' ? -1 : 0) || a.ms - b.ms)

  return (
    <aside className="active-timers" aria-labelledby="active-title">
      <h2 id="active-title"><IconClock size={16} /> {t.cook.activeTimers}</h2>
      {items.length === 0 ? (
        <p className="muted small">{t.cook.activeNone}</p>
      ) : (
        <ul>
          {items.map((x) => {
            const r = RECIPE_MAP[x.recipeId]
            const s = r.steps[x.step]
            return (
              <li key={x.key} className={`active-timer is-${x.tm.status}`}>
                <button type="button" onClick={() => onJump(x.recipeId, x.step)}>
                  <span className="active-timer__name">
                    <span className="active-timer__step">{r.title[L]}{L === 'ar' ? '، ' : ' — '}{t.cook.stepN(x.step + 1)}</span>
                    {s.title[L]}
                  </span>
                  <span className="active-timer__time" dir="ltr">{x.tm.status === 'done' ? '✓' : formatClock(x.ms, L)}</span>
                  <span className="sr-only">{x.tm.status === 'done' ? t.cook.done : x.tm.status === 'paused' ? t.cook.paused : t.cook.running}</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </aside>
  )
}

export function Cook({ id }: { id: string }) {
  const { state, dispatch, t } = useStore()
  const L = state.lang
  const recipe = RECIPE_MAP[id]
  const wake = useWakeLock()
  const headingRef = useRef<HTMLHeadingElement>(null)
  const raw = state.progress[id] ?? 0
  const total = recipe?.steps.length ?? 0
  const finished = raw >= total
  const step = Math.min(raw, total - 1)
  const fmt = new Intl.NumberFormat(L === 'ar' ? 'ar-SA' : 'en-US')

  const setStep = useCallback((n: number) => dispatch({ type: 'progress', recipeId: id, step: n }), [dispatch, id])

  // Focus the step heading on entry; later step changes are announced politely
  // so keyboard users keep their place on the Next/Previous buttons.
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true })
  }, [finished])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      if (el.closest('input, textarea, select, [role="tablist"]')) return
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
      const forward = (e.key === 'ArrowRight') === (document.documentElement.dir !== 'rtl')
      e.preventDefault()
      if (forward && raw < total) setStep(raw + 1)
      if (!forward && raw > 0) setStep(Math.min(raw, total) - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [raw, total, setStep])

  if (!recipe) {
    return (
      <div className="state-page">
        <h1>{t.recipe.notFound}</h1>
        <a href={href.recipes} className="btn btn--primary">{t.results.allRecipes}</a>
      </div>
    )
  }

  const s = recipe.steps[step]
  const jump = (recipeId: string, n: number) => {
    dispatch({ type: 'progress', recipeId, step: n })
    if (recipeId !== id) go(href.cook(recipeId))
  }

  return (
    <div className="cook">
      <header className="cook__bar">
        <a href={href.recipe(recipe.id)} className="cook__exit" aria-label={t.cook.exit}>
          <IconX size={20} />
          <span>{t.cook.exitShort}</span>
        </a>
        <div className="cook__brand">
          <LogoMark size={28} />
          <span>{recipe.title[L]}</span>
        </div>
        <div className="cook__tools">
          <button type="button" className="icon-btn icon-btn--light" aria-pressed={state.sound} aria-label={t.cook.soundToggle} title={state.sound ? t.cook.soundOn : t.cook.soundOff} onClick={() => { unlockAudio(); dispatch({ type: 'sound', on: !state.sound }) }}>
            {state.sound ? <IconSound size={20} /> : <IconMute size={20} />}
          </button>
          <button type="button" className="icon-btn icon-btn--light" aria-pressed={wake.on} aria-label={wake.supported ? t.cook.wake : t.cook.wakeUnsupported} title={wake.supported ? t.cook.wake : t.cook.wakeUnsupported} disabled={!wake.supported} onClick={wake.toggle}>
            <IconSun size={20} />
          </button>
          <LangSwitch className="lang-switch--dark" />
        </div>
      </header>

      <nav className="cook__steps" aria-label={t.cook.stepsNav}>
        <ol>
          {recipe.steps.map((st, i) => {
            const tm = state.timers[timerKey(recipe.id, i)]
            const cls = [i === step && !finished ? 'is-current' : '', i < raw ? 'is-past' : '', tm ? `t-${tm.status}` : ''].join(' ')
            return (
              <li key={i}>
                <button type="button" className={`seg ${cls}`} onClick={() => setStep(i)} aria-current={i === step && !finished ? 'step' : undefined} aria-label={t.cook.goTo(i + 1, st.title[L])}>
                  <span aria-hidden="true">{fmt.format(i + 1)}</span>
                  {tm && tm.status !== 'idle' && <i className="seg__dot" aria-hidden="true" />}
                </button>
              </li>
            )
          })}
        </ol>
      </nav>

      {finished ? (
        <main className="cook__finish" id="main">
          <div className="cook__finish-art" aria-hidden="true"><DishArt art={recipe.art} /></div>
          <h1 ref={headingRef} tabIndex={-1}>{t.cook.finishTitle}</h1>
          <p>{t.cook.finishBody}</p>
          <div className="cook__finish-actions">
            <a className="btn btn--primary btn--lg" href={href.recipe(recipe.id)}>{t.cook.backRecipe}</a>
            <a className="btn btn--outline-light" href={state.pantry.length ? href.results : href.pantry()}>{t.cook.another}</a>
            <button type="button" className="btn btn--outline-light" onClick={() => setStep(total - 1)}>
              <IconChevron size={18} className="flip" /> {t.cook.prev}
            </button>
          </div>
          <ActiveTimers onJump={jump} />
        </main>
      ) : (
        <main className="cook__main" id="main">
          <div className="cook__stage">
            <p className="cook__count">{t.cook.stepOf(step + 1, total)}</p>
            <h1 ref={headingRef} tabIndex={-1} className="cook__title">{s.title[L]}</h1>
            <p className="cook__body">{s.body[L]}</p>
            <p className="cook__hint muted small">{t.cook.keyHint}</p>
            <p className="sr-only" aria-live="polite">{`${t.cook.stepOf(step + 1, total)}: ${s.title[L]}`}</p>
          </div>
          <div className="cook__side">
            <StepTimer key={`${id}-${step}`} recipe={recipe} step={step} />
            <ActiveTimers onJump={jump} />
          </div>
        </main>
      )}

      {!finished && (
        <footer className="cook__nav">
          <button type="button" className="btn btn--outline-light btn--lg" onClick={() => setStep(step - 1)} disabled={step === 0}>
            <IconArrow size={20} className="flip" />
            {t.cook.prev}
          </button>
          <button type="button" className="btn btn--primary btn--lg" onClick={() => setStep(step + 1)}>
            {step === total - 1 ? t.cook.finish : t.cook.next}
            {step === total - 1 ? <IconCheck size={20} /> : <IconArrow size={20} />}
          </button>
        </footer>
      )}
    </div>
  )
}
