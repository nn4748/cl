import { DishArt } from '../art/DishArt'
import { IconArrow, IconCamera, IconClock, IconLeaf } from '../components/Icons'
import { RECIPES, totalMinutes } from '../data/recipes'
import { href } from '../lib/router'
import { useStore } from '../state/store'

const HERO_STICKERS = {
  ar: [
    { t: 'رز', ok: true },
    { t: 'دجاج', ok: true },
    { t: 'بصل', ok: true },
    { t: 'لومي؟', ok: false },
  ],
  en: [
    { t: 'rice', ok: true },
    { t: 'chicken', ok: true },
    { t: 'onion', ok: true },
    { t: 'loomi?', ok: false },
  ],
}

export function Home() {
  const { state, t } = useStore()
  const L = state.lang
  const fmt = new Intl.NumberFormat(L === 'ar' ? 'ar-SA' : 'en-US')

  return (
    <>
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero__copy">
          <p className="kicker">{t.home.kicker}</p>
          <h1 id="hero-title" className="hero__title" tabIndex={-1}>
            {t.home.title}
          </h1>
          <p className="hero__lede">{t.home.lede}</p>
          <div className="hero__actions">
            <a href={href.pantry()} className="btn btn--primary btn--xl">
              {t.home.cta}
              <IconArrow size={22} />
            </a>
            <a href={href.pantry('photo')} className="btn btn--ghost">
              <IconCamera size={20} />
              {t.home.ctaPhoto}
            </a>
          </div>
          <p className="hero__note">{t.home.noAccount}</p>
        </div>
        <div className="hero__art" aria-hidden="true">
          <div className="hero__plate">
            <DishArt art="kabsa" framed={false} />
          </div>
          {HERO_STICKERS[L].map((s, i) => (
            <span key={s.t} className={`sticker sticker--${i} ${s.ok ? '' : 'sticker--q'}`}>
              {s.ok ? '✓ ' : ''}
              {s.t}
            </span>
          ))}
        </div>
      </section>

      <div className="marquee" aria-hidden="true">
        <div className="marquee__track">
          {[...t.home.marquee, ...t.home.marquee].map((w, i) => (
            <span key={i}>
              {w}
              <i>✦</i>
            </span>
          ))}
        </div>
      </div>

      <section className="how" aria-labelledby="how-title">
        <h2 id="how-title" className="section-title">{t.home.howTitle}</h2>
        <ol className="how__list">
          {t.home.how.map((s, i) => (
            <li key={i} className="how__item">
              <span className="how__num" aria-hidden="true">{fmt.format(i + 1)}</span>
              <h3>{s.t}</h3>
              <p>{s.d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="waste" aria-labelledby="waste-title">
        <div className="waste__icon" aria-hidden="true"><IconLeaf size={36} /></div>
        <div>
          <h2 id="waste-title">{t.home.wasteTitle}</h2>
          <p>{t.home.wasteBody}</p>
        </div>
        <a href={href.pantry()} className="btn btn--cream">
          {t.home.wasteCta}
          <IconArrow size={18} />
        </a>
      </section>

      <section className="shelf" aria-labelledby="shelf-title">
        <div className="shelf__head">
          <div>
            <h2 id="shelf-title" className="section-title">{t.home.shelfTitle}</h2>
            <p className="muted">{t.home.shelfBody}</p>
          </div>
          <a href={href.recipes} className="link-arrow">
            {t.results.allRecipes} <IconArrow size={16} />
          </a>
        </div>
        <ul className="shelf__list">
          {RECIPES.map((r) => (
            <li key={r.id}>
              <a href={href.recipe(r.id)} className="mini-card">
                <span className="mini-card__art"><DishArt art={r.art} /></span>
                <span className="mini-card__title">{r.title[L]}</span>
                <span className="mini-card__meta"><IconClock size={14} /> {t.results.minutes(totalMinutes(r))}</span>
              </a>
            </li>
          ))}
        </ul>
      </section>

      <aside className="soon" aria-labelledby="soon-title">
        <h2 id="soon-title">{t.home.soonTitle}</h2>
        <ul>
          {t.home.soonItems.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
        <p className="muted">{t.home.soonNote}</p>
      </aside>
    </>
  )
}
