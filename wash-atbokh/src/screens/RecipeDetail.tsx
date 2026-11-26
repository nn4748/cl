import { useMemo } from 'react'
import { DishArt } from '../art/DishArt'
import { Stepper } from '../components/Controls'
import { IconArrow, IconCheck, IconClock, IconPlay, IconPlus, IconSwap, IconUsers } from '../components/Icons'
import { RECIPE_MAP, totalMinutes, type RecipeIngredient } from '../data/recipes'
import { UNITS, formatAmount, roundToStep } from '../data/units'
import { evaluate, quickRecipe, type IngredientStatus } from '../lib/match'
import { ingName } from '../lib/names'
import { go, href } from '../lib/router'
import { formatClock, remainingMs, useNow } from '../state/clock'
import { timerKey, useStore } from '../state/store'

export function scaleQty(item: RecipeIngredient, factor: number): number | undefined {
  if (item.qty === undefined) return undefined
  if (UNITS[item.unit].countable === false) return item.qty
  if (item.unit === 'pinch') return Math.max(1, Math.round(item.qty * factor))
  const raw = item.qty * factor
  // Whole eggs, onions and tomatoes once there is more than one.
  if (item.unit === 'piece' && raw >= 1.5) return Math.round(raw)
  return roundToStep(raw, UNITS[item.unit].step)
}

export function RecipeDetail({ id }: { id: string }) {
  const { state, dispatch, t } = useStore()
  const L = state.lang
  const recipe = RECIPE_MAP[id]
  const now = useNow()
  const pantry = useMemo(() => new Set(state.pantry.map((p) => p.id)), [state.pantry])
  const ev = useMemo(() => (recipe ? evaluate(recipe, pantry, state.prefs) : null), [recipe, pantry, state.prefs])

  if (!recipe || !ev) {
    return (
      <div className="state-page">
        <h1 tabIndex={-1}>{t.recipe.notFound}</h1>
        <a href={href.recipes} className="btn btn--primary">{t.results.allRecipes}</a>
      </div>
    )
  }

  const servings = state.servings[recipe.id] ?? state.prefs.servings
  const factor = servings / recipe.servings
  const progress = state.progress[recipe.id]
  const inProgress = progress !== undefined && progress > 0 && progress < recipe.steps.length
  const status = new Map<string, IngredientStatus>([...ev.have, ...ev.missing].map((s) => [s.item.id + s.item.role, s]))
  const groups = [
    { key: 'main', items: recipe.ingredients.filter((i) => i.role === 'core' || i.role === 'support') },
    { key: 'optional', items: recipe.ingredients.filter((i) => i.role === 'optional') },
    { key: 'basic', items: recipe.ingredients.filter((i) => i.role === 'basic') },
  ]
  const missingKey = ev.missing.filter((m) => m.item.role === 'core' || m.item.role === 'support')
  const tags = [...new Set([...(quickRecipe(recipe) ? (['quick'] as const) : []), ...recipe.tags])]

  const startCooking = () => {
    if (!inProgress) dispatch({ type: 'progress', recipeId: recipe.id, step: 0 })
    go(href.cook(recipe.id))
  }

  return (
    <article className="recipe">
      <a href={state.pantry.length ? href.results : href.recipes} className="back-link">
        <IconArrow size={16} className="flip" /> {t.recipe.back}
      </a>

      <header className="recipe__hero">
        <div className="recipe__art">
          <DishArt art={recipe.art} label={recipe.title[L]} />
        </div>
        <div className="recipe__intro">
          <p className="kicker">{recipe.region[L]}</p>
          <h1 tabIndex={-1}>{recipe.title[L]}</h1>
          <p className="recipe__lede">{recipe.intro[L]}</p>
          <ul className="tag-row">
            {tags.map((tag) => (
              <li key={tag} className={`tag tag--${tag}`}>{t.tags[tag]}</li>
            ))}
          </ul>
          <dl className="times">
            <div><dt>{t.recipe.prep}</dt><dd>{t.recipe.minutesLong(recipe.prepMin)}</dd></div>
            <div><dt>{t.recipe.cook}</dt><dd>{t.recipe.minutesLong(recipe.cookMin)}</dd></div>
            <div><dt>{t.recipe.total}</dt><dd>{t.recipe.minutesLong(totalMinutes(recipe))}</dd></div>
          </dl>
          <div className="recipe__servings">
            <span className="field-label"><IconUsers size={16} /> {t.recipe.servings}</span>
            <Stepper
              value={servings}
              min={1}
              max={12}
              label={t.recipe.servingsAria}
              display={t.prefs.servingsValue(servings)}
              onChange={(v) => dispatch({ type: 'servings', recipeId: recipe.id, servings: v })}
            />
          </div>
          <button type="button" className="btn btn--primary btn--xl" onClick={startCooking}>
            <IconPlay size={20} />
            {inProgress ? t.recipe.resume(progress + 1) : t.recipe.start}
          </button>
        </div>
      </header>

      <div className="recipe__body">
        <section className="recipe__ingredients card" aria-labelledby="ing-title">
          <div className="card__head">
            <h2 id="ing-title">{t.recipe.ingredients}</h2>
          </div>
          <p className="muted small">{t.recipe.scaled}</p>

          <div className={`missing-box ${missingKey.length ? '' : 'is-complete'}`}>
            <h3>{t.recipe.missingTitle}</h3>
            {missingKey.length ? (
              <ul>
                {missingKey.map((m) => (
                  <li key={m.item.id}>
                    <span>{ingName(m.item.id, L)}</span>
                    {m.usableSub?.id && <span className="pill pill--sage"><IconSwap size={12} /> {t.recipe.subYouHave}: {ingName(m.usableSub.id, L)}</span>}
                  </li>
                ))}
              </ul>
            ) : (
              <p>{t.recipe.missingNone}</p>
            )}
          </div>

          {groups.map((g) =>
            g.items.length ? (
              <div key={g.key} className="ing-group">
                {g.key !== 'main' && <h3 className="ing-group__title">{g.key === 'optional' ? t.recipe.optional : t.recipe.basics}</h3>}
                <ul className="ing-list">
                  {g.items.map((item) => {
                    const st = status.get(item.id + item.role)
                    const have = !!st?.have
                    const qty = scaleQty(item, factor)
                    return (
                      <li key={item.id + item.role} className={`ing ${have ? 'is-have' : 'is-miss'}`}>
                        <span className="ing__mark" aria-label={have ? t.recipe.have : t.recipe.missing} role="img">
                          {have ? <IconCheck size={14} /> : null}
                        </span>
                        <div className="ing__main">
                          <span className="ing__name">
                            {ingName(item.id, L)}
                            {item.note && <span className="ing__note"> · {item.note[L]}</span>}
                          </span>
                          {!have && item.subs && (
                            <ul className="ing__subs">
                              {item.subs.map((s, i) => (
                                <li key={i} className={s.id && pantry.has(s.id) ? 'is-owned' : ''}>
                                  <IconSwap size={12} />
                                  <span>
                                    <b>{s.id && pantry.has(s.id) ? t.recipe.subYouHave : t.recipe.sub}:</b> {s.note[L]}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                        <span className="ing__qty">{formatAmount(qty, item.unit, L)}</span>
                        {!have && item.role !== 'basic' && (
                          <button type="button" className="ing__add" onClick={() => dispatch({ type: 'addIngredients', ids: [{ id: item.id }] })} aria-label={`${t.recipe.addMissing}: ${ingName(item.id, L)}`}>
                            <IconPlus size={14} />
                          </button>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </div>
            ) : null,
          )}
        </section>

        <section className="recipe__steps" aria-labelledby="steps-title">
          <h2 id="steps-title" className="section-title">{t.recipe.steps}</h2>
          <ol className="step-list">
            {recipe.steps.map((s, i) => {
              const tm = state.timers[timerKey(recipe.id, i)]
              const left = s.minutes ? remainingMs(tm, now, s.minutes * 60000) : 0
              return (
                <li key={i} className={`step-item ${progress === i ? 'is-current' : ''}`}>
                  <span className="step-item__num" aria-hidden="true">{new Intl.NumberFormat(L === 'ar' ? 'ar-SA' : 'en-US').format(i + 1)}</span>
                  <div>
                    <h3>{s.title[L]}</h3>
                    <p>{s.body[L]}</p>
                    <span className={`timer-badge ${tm ? `is-${tm.status}` : ''}`}>
                      <IconClock size={14} />
                      {s.minutes ? (
                        tm && tm.status !== 'idle' ? (
                          <>
                            {tm.status === 'done' ? t.cook.done : tm.status === 'paused' ? t.cook.paused : t.cook.running}
                            {tm.status !== 'done' && <span dir="ltr"> {formatClock(left, L)}</span>}
                          </>
                        ) : (
                          t.recipe.stepTimer(s.minutes)
                        )
                      ) : (
                        t.recipe.noTimer
                      )}
                    </span>
                  </div>
                </li>
              )
            })}
          </ol>
          <button type="button" className="btn btn--primary btn--lg" onClick={startCooking}>
            <IconPlay size={18} />
            {inProgress ? t.recipe.resume(progress + 1) : t.recipe.start}
          </button>
        </section>
      </div>
    </article>
  )
}
