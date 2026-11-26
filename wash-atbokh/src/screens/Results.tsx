import { useMemo, useState } from 'react'
import { DishArt } from '../art/DishArt'
import { IconArrow, IconClock, IconPlus } from '../components/Icons'
import { RecipeCard } from '../components/RecipeCard'
import { RECIPES } from '../data/recipes'
import { evaluate, recommend, suggestAdditions } from '../lib/match'
import { ingName } from '../lib/names'
import { href } from '../lib/router'
import { useStore } from '../state/store'

function PantrySummary() {
  const { state, t } = useStore()
  const L = state.lang
  return (
    <div className="summary">
      <p className="field-label">{t.results.basedOn}</p>
      <ul className="summary__chips">
        {state.pantry.map((p) => (
          <li key={p.id} className={p.useSoon ? 'is-soon' : ''}>
            {p.useSoon && <IconClock size={13} />}
            {ingName(p.id, L, p.label)}
          </li>
        ))}
      </ul>
      <a href={href.pantry()} className="link-arrow">
        {t.results.edit} <IconArrow size={16} />
      </a>
    </div>
  )
}

export function Results() {
  const { state, dispatch, t } = useStore()
  const L = state.lang
  const [ignoreTime, setIgnoreTime] = useState(false)
  const rec = useMemo(() => recommend(state.pantry, state.prefs), [state.pantry, state.prefs])
  const list = ignoreTime ? rec.broadened : rec.matches

  if (state.pantry.length === 0) {
    return (
      <div className="state-page">
        <div className="state-page__art" aria-hidden="true"><DishArt art="masoob" /></div>
        <h1 tabIndex={-1}>{t.results.emptyTitle}</h1>
        <p>{t.results.emptyBody}</p>
        <div className="state-page__actions">
          <a href={href.pantry()} className="btn btn--primary btn--lg">
            {t.results.emptyCta} <IconArrow size={20} />
          </a>
          <a href={href.recipes} className="btn btn--ghost">{t.results.allRecipes}</a>
        </div>
      </div>
    )
  }

  if (list.length === 0) {
    const ideas = suggestAdditions(state.pantry)
    const timeOnly = rec.hiddenByTime > 0
    return (
      <div className="state-page">
        <div className="state-page__art" aria-hidden="true"><DishArt art="adas" /></div>
        <h1 tabIndex={-1}>{timeOnly ? t.results.noneTimeTitle : t.results.noneTitle}</h1>
        {timeOnly ? (
          <>
            <p>{t.results.hiddenByTime(rec.hiddenByTime)}</p>
            <div className="state-page__actions">
              <button type="button" className="btn btn--primary" onClick={() => setIgnoreTime(true)}>{t.results.showAnyway}</button>
            </div>
          </>
        ) : (
          <>
            <p>{t.results.noneBody}</p>
            <ul className="quick__list quick__list--center">
              {ideas.map((id) => (
                <li key={id}>
                  <button type="button" className="quick__chip" onClick={() => dispatch({ type: 'addIngredients', ids: [{ id }] })}>
                    <IconPlus size={14} /> {t.results.tryAdd(ingName(id, L))}
                  </button>
                </li>
              ))}
            </ul>
            <div className="state-page__actions">
              <a href={href.pantry()} className="btn btn--ghost">{t.results.edit}</a>
              <a href={href.recipes} className="btn btn--ghost">{t.results.allRecipes}</a>
            </div>
          </>
        )}
        <PantrySummary />
      </div>
    )
  }

  return (
    <div className="results">
      <header className="page-head page-head--split">
        <div>
          <p className="kicker">{t.results.kicker}</p>
          <h1 tabIndex={-1}>{t.results.title(list.length)}</h1>
          <p className="page-head__lede">{t.results.lede}</p>
        </div>
        <PantrySummary />
      </header>

      {rec.knownCount <= 2 && (
        <div className="banner banner--saffron" role="status">
          <strong>{t.results.fewTitle}</strong>
          <span>{t.results.fewBody}</span>
          <a href={href.pantry()} className="btn btn--small btn--ink">{t.results.edit}</a>
        </div>
      )}

      {rec.hiddenByTime > 0 && (
        <div className="banner" role="status">
          <span>{ignoreTime ? t.results.timeRestored : t.results.hiddenByTime(rec.hiddenByTime)}</span>
          <button type="button" className="btn btn--small btn--ghost" onClick={() => setIgnoreTime(!ignoreTime)}>
            {ignoreTime ? t.results.keepLimit : t.results.showAnyway}
          </button>
        </div>
      )}

      <p className="muted small sort-hint">{t.results.sortHint}</p>
      <ol className="card-grid">
        {list.map((m, i) => (
          <li key={m.recipe.id}>
            <RecipeCard match={m} rank={i + 1} servings={state.servings[m.recipe.id] ?? state.prefs.servings} />
          </li>
        ))}
      </ol>

      <p className="results__more">
        <a href={href.recipes} className="link-arrow">{t.results.allRecipes} <IconArrow size={16} /></a>
      </p>
    </div>
  )
}

export function AllRecipes() {
  const { state, t } = useStore()
  const pantry = useMemo(() => new Set(state.pantry.map((p) => p.id)), [state.pantry])
  const list = useMemo(
    () =>
      RECIPES.map((r) => ({ ...evaluate(r, pantry, state.prefs), score: 0, usesSoon: [] as string[] })).sort(
        (a, b) => b.keyHave / b.keyTotal - a.keyHave / a.keyTotal,
      ),
    [pantry, state.prefs],
  )
  return (
    <div className="results">
      <header className="page-head">
        <h1 tabIndex={-1}>{t.results.allTitle}</h1>
        <p className="page-head__lede">{t.home.shelfBody}</p>
      </header>
      <ul className="card-grid">
        {list.map((m) => (
          <li key={m.recipe.id}>
            <RecipeCard match={m} servings={state.servings[m.recipe.id] ?? state.prefs.servings} />
          </li>
        ))}
      </ul>
    </div>
  )
}
