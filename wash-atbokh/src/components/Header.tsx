import { LogoMark } from '../art/Logo'
import { RECIPE_MAP } from '../data/recipes'
import { href, type Route } from '../lib/router'
import { formatClock, remainingMs, useNow } from '../state/clock'
import { parseTimerKey, useStore } from '../state/store'
import { IconPot } from './Icons'

export function LangSwitch({ className = '' }: { className?: string }) {
  const { state, dispatch, t } = useStore()
  const next = state.lang === 'ar' ? 'en' : 'ar'
  return (
    <button
      type="button"
      className={`lang-switch ${className}`}
      onClick={() => dispatch({ type: 'lang', lang: next })}
      aria-label={t.langSwitchLabel}
      lang={next}
    >
      <span aria-hidden="true" className="lang-switch__cur">{state.lang === 'ar' ? 'ع' : 'EN'}</span>
      <span>{t.langSwitch}</span>
    </button>
  )
}

/** Small pill showing the soonest running timer, from any screen. */
function RunningPill() {
  const { state, t } = useStore()
  const now = useNow()
  const running = Object.entries(state.timers)
    .filter(([, tm]) => tm.status === 'running')
    .map(([key, tm]) => ({ key, ms: remainingMs(tm, now, 0) }))
    .sort((a, b) => a.ms - b.ms)
  if (!running.length) return null
  const { recipeId } = parseTimerKey(running[0].key)
  const recipe = RECIPE_MAP[recipeId]
  if (!recipe) return null
  return (
    <a className="running-pill" href={href.cook(recipeId)} aria-label={`${t.nav.cooking}: ${recipe.title[state.lang]}`}>
      <IconPot size={16} />
      <span className="running-pill__time" dir="ltr">{formatClock(running[0].ms, state.lang)}</span>
      {running.length > 1 && <span className="running-pill__more">+{running.length - 1}</span>}
    </a>
  )
}

export function Header({ route }: { route: Route }) {
  const { state, t } = useStore()
  const count = state.pantry.length
  const is = (n: Route['name'][]) => (n.includes(route.name) ? 'page' : undefined)
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <a href={href.home} className="brand" aria-label={t.brand}>
          <LogoMark size={38} />
          <span className="brand__text">
            <span className="brand__name">{t.brand}</span>
            <span className="brand__alt" lang={state.lang === 'ar' ? 'en' : 'ar'} aria-hidden="true">{t.brandAlt}</span>
          </span>
        </a>
        <nav aria-label={t.navAria} className="site-nav">
          <a href={href.pantry()} aria-current={is(['pantry'])}>
            {t.nav.pantry}
            {count > 0 && <span className="badge" aria-hidden="true">{new Intl.NumberFormat(state.lang === 'ar' ? 'ar-SA' : 'en-US').format(count)}</span>}
          </a>
          <a href={href.results} aria-current={is(['results', 'recipe', 'recipes'])}>{t.nav.results}</a>
        </nav>
        <div className="site-header__end">
          <RunningPill />
          <LangSwitch />
        </div>
      </div>
    </header>
  )
}
