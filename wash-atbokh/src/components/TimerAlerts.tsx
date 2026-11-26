import { RECIPE_MAP } from '../data/recipes'
import { go, href } from '../lib/router'
import { parseTimerKey, useStore } from '../state/store'
import { IconBell, IconX } from './Icons'

/** Visible, persistent alerts for finished timers, wherever the user is. */
export function TimerAlerts({ currentCookId, currentStep }: { currentCookId?: string; currentStep?: number }) {
  const { state, dispatch, t } = useStore()
  const done = Object.entries(state.timers).filter(([, tm]) => tm.status === 'done' && !tm.acknowledged)

  return (
    <div className="timer-alerts" role="region" aria-live="assertive" aria-label={t.cook.activeTimers}>
      {done.map(([key]) => {
        const { recipeId, step } = parseTimerKey(key)
        const recipe = RECIPE_MAP[recipeId]
        const s = recipe?.steps[step]
        if (!recipe || !s) return null
        // The cooking screen shows its own large completion state for the visible step.
        if (recipeId === currentCookId && step === currentStep) return null
        return (
          <div key={key} className="timer-alert" role="alert">
            <span className="timer-alert__icon"><IconBell size={20} /></span>
            <p className="timer-alert__text">{t.timerAlert(recipe.title[state.lang], s.title[state.lang])}</p>
            <div className="timer-alert__actions">
              <button
                type="button"
                className="btn btn--small btn--ink"
                onClick={() => {
                  dispatch({ type: 'progress', recipeId, step })
                  go(href.cook(recipeId))
                }}
              >
                {t.cook.openStep}
              </button>
              <button type="button" className="icon-btn icon-btn--light" aria-label={t.cook.dismiss} onClick={() => dispatch({ type: 'timerDismiss', key })}>
                <IconX size={18} />
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
