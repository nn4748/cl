import { useEffect, useMemo, useRef, useState } from 'react'
import { ACCEPTED_TYPES, MAX_BYTES, demoDetect } from '../data/demoDetection'
import { ingName } from '../lib/names'
import { useStore } from '../state/store'
import { IconCamera, IconCheck, IconImage, IconReset } from './Icons'
import { IngredientInput, type AddedItem } from './IngredientInput'

type Phase = 'pick' | 'preview' | 'detecting' | 'review'

const reduceMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

export function PhotoFlow({ onMerged }: { onMerged: (count: number) => void }) {
  const { state, dispatch, t } = useStore()
  const L = state.lang
  const [phase, setPhase] = useState<Phase>('pick')
  const [file, setFile] = useState<File | null>(null)
  const [url, setUrl] = useState<string | null>(null)
  const [previewFailed, setPreviewFailed] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [found, setFound] = useState<AddedItem[]>([])
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const galleryRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const reviewHeadRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    if (phase === 'review') reviewHeadRef.current?.focus()
  }, [phase])

  // Release the in-memory preview when it is replaced or the flow unmounts.
  useEffect(() => () => {
    if (url) URL.revokeObjectURL(url)
  }, [url])

  const accept = (f: File | undefined) => {
    setError(null)
    if (!f) return
    const typeOk = ACCEPTED_TYPES.includes(f.type) || /\.(heic|heif)$/i.test(f.name)
    if (!typeOk) return setError(t.photo.errType)
    if (f.size > MAX_BYTES) return setError(t.photo.errSize)
    if (f.size === 0) return setError(t.photo.errRead)
    setFile(f)
    setPreviewFailed(false)
    setUrl(URL.createObjectURL(f))
    setPhase('preview')
  }

  const detect = () => {
    if (!file) return
    setPhase('detecting')
    window.setTimeout(() => {
      const ids = demoDetect(file).map((id) => ({ id }))
      setFound(ids)
      setChecked(new Set(ids.map((i) => i.id)))
      setPhase('review')
    }, reduceMotion() ? 300 : 1400)
  }

  const reset = () => {
    setFile(null)
    setUrl(null)
    setFound([])
    setPhase('pick')
    setError(null)
  }

  const exclude = useMemo(() => new Set(found.map((f) => f.id)), [found])

  return (
    <div className="photo">
      <div className="demo-note" role="note">
        <span className="demo-badge">{t.photo.demoBadge}</span>
        <p>{t.photo.demoNote}</p>
      </div>

      <input ref={galleryRef} type="file" accept={ACCEPTED_TYPES.join(',')} hidden onChange={(e) => { accept(e.target.files?.[0]); e.target.value = '' }} />
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { accept(e.target.files?.[0]); e.target.value = '' }} />

      {phase === 'pick' && (
        <div className="dropzone">
          <div className="dropzone__art" aria-hidden="true"><IconImage size={40} /></div>
          <div className="dropzone__actions">
            <button type="button" className="btn btn--ink" onClick={() => galleryRef.current?.click()}>
              <IconImage size={20} /> {t.photo.choose}
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => cameraRef.current?.click()}>
              <IconCamera size={20} /> {t.photo.camera}
            </button>
          </div>
          <p className="muted small">{t.photo.requirements}</p>
        </div>
      )}

      {error && (
        <p className="form-error" role="alert">{error}</p>
      )}

      {(phase === 'preview' || phase === 'detecting') && url && (
        <div className="photo__preview">
          <div className={`photo__frame ${phase === 'detecting' ? 'is-scanning' : ''}`}>
            {previewFailed ? (
              <div className="photo__fallback"><IconImage size={36} /><p>{t.photo.noHeic}</p></div>
            ) : (
              <img src={url} alt={t.photo.previewAlt} onError={() => setPreviewFailed(true)} />
            )}
          </div>
          <div className="photo__actions">
            <button type="button" className="btn btn--primary" onClick={detect} disabled={phase === 'detecting'} aria-busy={phase === 'detecting'}>
              {phase === 'detecting' ? t.photo.detecting : t.photo.detect}
            </button>
            <button type="button" className="btn btn--ghost" onClick={reset} disabled={phase === 'detecting'}>
              <IconReset size={18} /> {t.photo.change}
            </button>
          </div>
          <p className="sr-only" aria-live="polite">{phase === 'detecting' ? t.photo.detecting : ''}</p>
        </div>
      )}

      {phase === 'review' && (
        <div className="review">
          <div className="review__head">
            {url && !previewFailed && <img src={url} alt={t.photo.previewAlt} className="review__thumb" />}
            <div>
              <h3 tabIndex={-1} ref={reviewHeadRef}>{t.photo.reviewTitle}</h3>
              <p className="muted">{t.photo.reviewBody}</p>
            </div>
          </div>
          <ul className="review__list">
            {found.map((f) => {
              const on = checked.has(f.id)
              const name = ingName(f.id, L, f.label)
              return (
                <li key={f.id}>
                  <button
                    type="button"
                    className="review__item"
                    aria-pressed={on}
                    aria-label={on ? t.photo.include(name) : t.photo.exclude(name)}
                    onClick={() => {
                      const next = new Set(checked)
                      if (on) next.delete(f.id)
                      else next.add(f.id)
                      setChecked(next)
                    }}
                  >
                    <span className="review__box" aria-hidden="true">{on && <IconCheck size={14} />}</span>
                    {name}
                  </button>
                </li>
              )
            })}
          </ul>
          <IngredientInput
            exclude={exclude}
            onAdd={(items) => {
              const fresh = items.filter((i) => !exclude.has(i.id))
              setFound([...found, ...fresh])
              setChecked(new Set([...checked, ...fresh.map((i) => i.id)]))
            }}
          />
          <div className="photo__actions">
            <button
              type="button"
              className="btn btn--primary"
              disabled={checked.size === 0}
              onClick={() => {
                const items = found.filter((f) => checked.has(f.id))
                dispatch({ type: 'addIngredients', ids: items })
                onMerged(items.length)
                reset()
              }}
            >
              <IconCheck size={18} /> {t.photo.confirm(checked.size)}
            </button>
            <button type="button" className="btn btn--ghost" onClick={reset}>
              <IconReset size={18} /> {t.photo.change}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
