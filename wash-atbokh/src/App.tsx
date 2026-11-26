import { useEffect, useRef } from 'react'
import { Header } from './components/Header'
import { TimerAlerts } from './components/TimerAlerts'
import { useRoute } from './lib/router'
import { Cook } from './screens/Cook'
import { Home } from './screens/Home'
import { Pantry } from './screens/Pantry'
import { RecipeDetail } from './screens/RecipeDetail'
import { AllRecipes, Results } from './screens/Results'
import { ClockProvider } from './state/clock'
import { StoreProvider, useStore } from './state/store'

function Shell() {
  const route = useRoute()
  const { state, t } = useStore()
  const mainRef = useRef<HTMLElement>(null)
  const first = useRef(true)

  // On navigation: scroll to top and move focus to the new page heading.
  const routeKey = JSON.stringify(route.name === 'pantry' ? { name: 'pantry' } : route)
  useEffect(() => {
    window.scrollTo({ top: 0 })
    if (first.current) {
      first.current = false
      return
    }
    requestAnimationFrame(() => mainRef.current?.querySelector<HTMLElement>('h1')?.focus({ preventScroll: true }))
  }, [routeKey])

  if (route.name === 'cook') {
    const step = state.progress[route.id] ?? 0
    return (
      <div className="app app--cook">
        <TimerAlerts currentCookId={route.id} currentStep={step} />
        <Cook id={route.id} />
      </div>
    )
  }

  return (
    <div className="app">
      <a href="#main" className="skip-link" onClick={(e) => { e.preventDefault(); mainRef.current?.focus() }}>{t.skip}</a>
      <Header route={route} />
      <TimerAlerts />
      <main id="main" ref={mainRef} tabIndex={-1} className={`page page--${route.name}`}>
        {route.name === 'home' && <Home />}
        {route.name === 'pantry' && <Pantry tab={route.tab} />}
        {route.name === 'results' && <Results />}
        {route.name === 'recipes' && <AllRecipes />}
        {route.name === 'recipe' && <RecipeDetail id={route.id} />}
      </main>
      <footer className="site-footer">
        <p>{t.footer.line}</p>
        <p className="muted small">{t.footer.privacy}</p>
      </footer>
    </div>
  )
}

export function App() {
  return (
    <StoreProvider>
      <ClockProvider>
        <Shell />
      </ClockProvider>
    </StoreProvider>
  )
}
