import { useMemo, useState } from 'react'
import { Stepper, ToggleChip } from '../components/Controls'
import { IconArrow, IconClock, IconPlus, IconX } from '../components/Icons'
import { IngredientInput, type AddedItem } from '../components/IngredientInput'
import { PhotoFlow } from '../components/PhotoFlow'
import { INGREDIENT_MAP, QUICK_PICKS, type IngredientGroup } from '../data/ingredients'
import { ingName } from '../lib/names'
import { go, href } from '../lib/router'
import { useStore } from '../state/store'

const TIME_OPTIONS: (number | null)[] = [null, 30, 60, 90, 120]

const groupOf = (id: string): IngredientGroup | 'custom' => INGREDIENT_MAP[id]?.group ?? 'custom'

export function Pantry({ tab }: { tab: 'type' | 'photo' }) {
  const { state, dispatch, t } = useStore()
  const L = state.lang
  const [announce, setAnnounce] = useState('')
  const pantryIds = useMemo(() => new Set(state.pantry.map((p) => p.id)), [state.pantry])

  const add = (items: AddedItem[]) => {
    const fresh = items.filter((i) => !pantryIds.has(i.id))
    const dupes = items.filter((i) => pantryIds.has(i.id))
    dispatch({ type: 'addIngredients', ids: fresh })
    const msg = fresh.length ? t.pantry.added(fresh.map((i) => ingName(i.id, L, i.label)).join(L === 'ar' ? '، ' : ', ')) : dupes[0] ? t.pantry.already(ingName(dupes[0].id, L, dupes[0].label)) : ''
    setAnnounce(msg)
  }

  const setTab = (next: 'type' | 'photo') => go(href.pantry(next))
  const onTabKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault()
      const next = tab === 'type' ? 'photo' : 'type'
      setTab(next)
      requestAnimationFrame(() => document.getElementById(`tab-${next}`)?.focus())
    }
  }

  const picks = QUICK_PICKS.filter((id) => !pantryIds.has(id))
  const p = state.prefs

  return (
    <div className="pantry">
      <header className="page-head">
        <p className="kicker">{t.pantry.kicker}</p>
        <h1 tabIndex={-1}>{t.pantry.title}</h1>
        <p className="page-head__lede">{t.pantry.lede}</p>
      </header>

      <div className="pantry__grid">
        <section className="card card--entry" aria-label={t.pantry.tabsAria}>
          <div role="tablist" aria-label={t.pantry.tabsAria} className="tabs" onKeyDown={onTabKey}>
            <button role="tab" id="tab-type" aria-selected={tab === 'type'} aria-controls="panel-type" tabIndex={tab === 'type' ? 0 : -1} className="tabs__tab" onClick={() => setTab('type')}>
              {t.pantry.tabType}
            </button>
            <button role="tab" id="tab-photo" aria-selected={tab === 'photo'} aria-controls="panel-photo" tabIndex={tab === 'photo' ? 0 : -1} className="tabs__tab" onClick={() => setTab('photo')}>
              {t.pantry.tabPhoto}
            </button>
          </div>

          {tab === 'type' ? (
            <div role="tabpanel" id="panel-type" aria-labelledby="tab-type" className="tabs__panel">
              <IngredientInput exclude={pantryIds} onAdd={add} />
              {picks.length > 0 && (
                <div className="quick">
                  <p className="field-label">{t.pantry.quickPicks}</p>
                  <ul className="quick__list">
                    {picks.map((id) => (
                      <li key={id}>
                        <button type="button" className={`quick__chip grp-${groupOf(id)}`} onClick={() => add([{ id }])}>
                          <IconPlus size={14} /> {ingName(id, L)}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div role="tabpanel" id="panel-photo" aria-labelledby="tab-photo" className="tabs__panel">
              <PhotoFlow
                onMerged={() => {
                  setAnnounce(t.photo.merged)
                }}
              />
            </div>
          )}
        </section>

        <section className="card card--list" aria-labelledby="list-title">
          <div className="card__head">
            <h2 id="list-title">{t.pantry.yourList}</h2>
            <span className="count-pill">{t.pantry.count(state.pantry.length)}</span>
          </div>

          {state.pantry.length === 0 ? (
            <div className="empty-mini">
              <p className="empty-mini__title">{t.pantry.emptyTitle}</p>
              <p className="muted">{t.pantry.emptyBody}</p>
            </div>
          ) : (
            <>
              <p className="muted small">{t.pantry.soonHint}</p>
              <ul className="chips">
                {state.pantry.map((item) => {
                  const name = ingName(item.id, L, item.label)
                  const custom = item.id.startsWith('custom:')
                  return (
                    <li key={item.id} className={`chip grp-${groupOf(item.id)} ${item.useSoon ? 'is-soon' : ''} ${custom ? 'is-custom' : ''}`}>
                      <button
                        type="button"
                        className="chip__soon"
                        aria-pressed={item.useSoon}
                        aria-label={item.useSoon ? t.pantry.soonOn(name) : t.pantry.soonOff(name)}
                        onClick={() => dispatch({ type: 'toggleSoon', id: item.id })}
                      >
                        <IconClock size={15} />
                      </button>
                      <span className="chip__name">
                        {name}
                        {item.useSoon && <span className="chip__badge">{t.pantry.soonBadge}</span>}
                        {custom && <span className="chip__custom">{t.pantry.custom}</span>}
                      </span>
                      <button
                        type="button"
                        className="chip__x"
                        aria-label={t.pantry.remove(name)}
                        onClick={() => {
                          dispatch({ type: 'removeIngredient', id: item.id })
                          setAnnounce(t.pantry.removed(name))
                        }}
                      >
                        <IconX size={14} />
                      </button>
                    </li>
                  )
                })}
              </ul>
              <button type="button" className="link-btn" onClick={() => dispatch({ type: 'clearPantry' })}>
                {t.pantry.clear}
              </button>
            </>
          )}
        </section>

        <section className="card card--prefs" aria-labelledby="prefs-title">
          <div className="card__head">
            <h2 id="prefs-title">{t.prefs.title}</h2>
          </div>
          <p className="muted small">{t.prefs.lede}</p>

          <div className="pref">
            <span className="field-label" id="pref-servings">{t.prefs.servings}</span>
            <Stepper value={p.servings} min={1} max={12} label={t.prefs.servings} display={t.prefs.servingsValue(p.servings)} onChange={(v) => dispatch({ type: 'prefs', patch: { servings: v } })} />
          </div>

          <fieldset className="pref">
            <legend className="field-label">{t.prefs.time}</legend>
            <div className="segmented">
              {TIME_OPTIONS.map((m) => (
                <label key={String(m)} className="segmented__opt">
                  <input type="radio" name="maxtime" checked={p.maxMinutes === m} onChange={() => dispatch({ type: 'prefs', patch: { maxMinutes: m } })} />
                  <span>{m === null ? t.prefs.timeAny : t.prefs.timeMax(m)}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="pref">
            <legend className="field-label">{t.prefs.mood}</legend>
            <div className="toggle-row">
              <ToggleChip pressed={p.quick} onToggle={() => dispatch({ type: 'prefs', patch: { quick: !p.quick } })}>{t.prefs.quick}</ToggleChip>
              <ToggleChip pressed={p.light} onToggle={() => dispatch({ type: 'prefs', patch: { light: !p.light } })}>{t.prefs.light}</ToggleChip>
              <ToggleChip pressed={p.kids} onToggle={() => dispatch({ type: 'prefs', patch: { kids: !p.kids } })}>{t.prefs.kids}</ToggleChip>
              <ToggleChip pressed={p.guests} onToggle={() => dispatch({ type: 'prefs', patch: { guests: !p.guests } })}>{t.prefs.guests}</ToggleChip>
            </div>
            {p.light && <p className="muted small">{t.prefs.lightNote}</p>}
          </fieldset>

          <label className="check">
            <input type="checkbox" checked={p.basics} onChange={(e) => dispatch({ type: 'prefs', patch: { basics: e.target.checked } })} />
            <span className="check__box" aria-hidden="true" />
            <span>{t.prefs.basics}</span>
          </label>
        </section>
      </div>

      <p className="sr-only" aria-live="polite">{announce}</p>

      <div className="action-bar">
        <div className="action-bar__inner">
          <span className="action-bar__count">{t.pantry.count(state.pantry.length)}</span>
          <a
            href={href.results}
            className={`btn btn--primary btn--lg ${state.pantry.length ? '' : 'is-disabled'}`}
            aria-disabled={state.pantry.length === 0}
            onClick={(e) => {
              if (!state.pantry.length) {
                e.preventDefault()
                if (tab !== 'type') setTab('type')
                requestAnimationFrame(() => document.querySelector<HTMLInputElement>('.ing-input input')?.focus())
              }
            }}
          >
            {state.pantry.length ? t.pantry.findCta : t.pantry.findCtaEmpty}
            <IconArrow size={20} />
          </a>
        </div>
      </div>
    </div>
  )
}
