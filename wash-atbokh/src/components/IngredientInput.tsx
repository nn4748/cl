import { useId, useMemo, useRef, useState } from 'react'
import { normalize, resolveIngredient, searchIngredients } from '../lib/match'
import { ingName } from '../lib/names'
import { useStore } from '../state/store'
import { IconPlus } from './Icons'

export interface AddedItem {
  id: string
  label?: string
}

/**
 * Combobox for adding ingredients. Enter adds the highlighted suggestion or
 * the typed text; commas split a pasted list ("رز، دجاج، بصل").
 */
export function IngredientInput({ exclude, onAdd, autoFocus }: { exclude: Set<string>; onAdd: (items: AddedItem[]) => void; autoFocus?: boolean }) {
  const { state, t } = useStore()
  const L = state.lang
  const [text, setText] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const uid = useId()
  const listId = `${uid}-list`

  const lastToken = text.split(/[,،\n]/).pop() ?? ''
  const suggestions = useMemo(() => searchIngredients(lastToken, exclude), [lastToken, exclude])
  const expanded = open && suggestions.length > 0 && lastToken.trim().length > 0

  const commit = (raw: string) => {
    const tokens = raw.split(/[,،\n]/).map((s) => s.trim()).filter(Boolean)
    const items: AddedItem[] = []
    for (const tok of tokens) {
      const id = resolveIngredient(tok)
      if (id) items.push({ id })
      else items.push({ id: `custom:${normalize(tok)}`, label: tok })
    }
    if (items.length) onAdd(items)
    setText('')
    setActive(-1)
  }

  const pick = (id: string) => {
    const before = text.split(/[,،\n]/).slice(0, -1).join(',')
    if (before.trim()) commit(before)
    onAdd([{ id }])
    setText('')
    setActive(-1)
    inputRef.current?.focus()
  }

  return (
    <div className="ing-input">
      <label htmlFor={`${uid}-input`} className="field-label">{t.pantry.inputLabel}</label>
      <div className="ing-input__row">
        <div className="combo">
          <input
            ref={inputRef}
            id={`${uid}-input`}
            className="text-input"
            type="text"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={expanded}
            aria-controls={listId}
            aria-activedescendant={expanded && active >= 0 ? `${uid}-opt-${active}` : undefined}
            autoComplete="off"
            autoFocus={autoFocus}
            enterKeyHint="done"
            placeholder={t.pantry.inputPlaceholder}
            value={text}
            onChange={(e) => {
              setText(e.target.value)
              setOpen(true)
              setActive(-1)
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 120)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown' && suggestions.length) {
                e.preventDefault()
                setOpen(true)
                setActive((a) => (a + 1) % suggestions.length)
              } else if (e.key === 'ArrowUp' && suggestions.length) {
                e.preventDefault()
                setActive((a) => (a <= 0 ? suggestions.length - 1 : a - 1))
              } else if (e.key === 'Enter') {
                e.preventDefault()
                if (expanded && active >= 0) pick(suggestions[active])
                else commit(text)
              } else if (e.key === 'Escape') {
                setOpen(false)
              }
            }}
          />
          {expanded && (
            <ul id={listId} role="listbox" className="combo__list" aria-label={t.pantry.suggestionsLabel}>
              {suggestions.map((id, i) => (
                <li
                  key={id}
                  id={`${uid}-opt-${i}`}
                  role="option"
                  aria-selected={i === active}
                  className="combo__opt"
                  onMouseDown={(e) => {
                    e.preventDefault()
                    pick(id)
                  }}
                  onMouseEnter={() => setActive(i)}
                >
                  <span>{ingName(id, L)}</span>
                  <span className="combo__alt" lang={L === 'ar' ? 'en' : 'ar'}>{ingName(id, L === 'ar' ? 'en' : 'ar')}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <button type="button" className="btn btn--ink btn--square" onClick={() => commit(text)} disabled={!text.trim()}>
          <IconPlus size={20} />
          <span>{t.pantry.add}</span>
        </button>
      </div>
    </div>
  )
}
