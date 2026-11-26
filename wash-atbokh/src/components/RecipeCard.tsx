import { DishArt } from '../art/DishArt'
import { totalMinutes } from '../data/recipes'
import type { Match } from '../lib/match'
import { quickRecipe } from '../lib/match'
import { ingName, listNames } from '../lib/names'
import { href } from '../lib/router'
import { useStore } from '../state/store'
import { IconArrow, IconCheck, IconClock, IconSwap, IconUsers } from './Icons'

export function RecipeCard({ match, rank, servings }: { match: Match; rank?: number; servings?: number }) {
  const { state, t } = useStore()
  const L = state.lang
  const { recipe } = match
  const haveKey = match.have.filter((h) => h.item.role === 'core' || h.item.role === 'support')
  const missKey = match.missing.filter((m) => m.item.role === 'core' || m.item.role === 'support')
  const missOptional = match.missing.filter((m) => m.item.role === 'optional').length
  const pct = match.keyTotal ? match.keyHave / match.keyTotal : 0
  const tags = [...new Set([...(quickRecipe(recipe) ? (['quick'] as const) : []), ...recipe.tags])].slice(0, 3)
  const titleId = `rc-${recipe.id}`

  return (
    <article className="recipe-card" aria-labelledby={titleId}>
      <a href={href.recipe(recipe.id)} className="recipe-card__art" tabIndex={-1} aria-hidden="true">
        <DishArt art={recipe.art} />
        {rank !== undefined && <span className="recipe-card__rank">{new Intl.NumberFormat(L === 'ar' ? 'ar-SA' : 'en-US').format(rank)}</span>}
      </a>
      <div className="recipe-card__body">
        <p className="recipe-card__region">{recipe.region[L]}</p>
        <h3 id={titleId} className="recipe-card__title">
          <a href={href.recipe(recipe.id)}>{recipe.title[L]}</a>
        </h3>
        <ul className="meta-row" aria-label={`${t.recipe.total}, ${t.recipe.servings}`}>
          <li><IconClock size={16} /> {t.results.minutes(totalMinutes(recipe))}</li>
          <li><IconUsers size={16} /> {t.results.serves(servings ?? recipe.servings)}</li>
        </ul>
        <ul className="tag-row">
          {tags.map((tag) => (
            <li key={tag} className={`tag tag--${tag}`}>{t.tags[tag]}</li>
          ))}
        </ul>

        <div className="match">
          <div className="match__bar" aria-hidden="true">
            <span style={{ inlineSize: `${Math.round(pct * 100)}%` }} />
          </div>
          <p className="match__label">{t.results.match(match.keyHave, match.keyTotal)}</p>
        </div>

        <dl className="have-miss">
          <div>
            <dt><IconCheck size={14} /> {t.results.have}</dt>
            <dd>{haveKey.length ? listNames(haveKey.map((h) => ingName(h.item.id, L)), L) : '—'}</dd>
          </div>
          <div className={missKey.length ? 'is-missing' : ''}>
            <dt>{t.results.missing}</dt>
            <dd>
              {missKey.length ? listNames(missKey.map((m) => ingName(m.item.id, L)), L) : t.results.nothingMissing}
              {missOptional > 0 && <span className="muted"> {t.results.optionalMissing(missOptional)}</span>}
            </dd>
          </div>
        </dl>

        {missKey.some((m) => m.usableSub) && (
          <ul className="swap-list">
            {missKey
              .filter((m) => m.usableSub?.id)
              .map((m) => (
                <li key={m.item.id}>
                  <IconSwap size={14} /> {t.results.swap(ingName(m.item.id, L), ingName(m.usableSub!.id!, L))}
                </li>
              ))}
          </ul>
        )}

        {match.usesSoon.length > 0 && <p className="soon-note">{t.results.usesSoon(listNames(match.usesSoon.map((id) => ingName(id, L)), L))}</p>}

        <a className="btn btn--ink recipe-card__cta" href={href.recipe(recipe.id)}>
          {t.results.open}
          <IconArrow size={18} />
        </a>
      </div>
    </article>
  )
}
