import type { ReactNode } from 'react'
import { useStore } from '../state/store'
import { IconMinus, IconPlus } from './Icons'

export function Stepper({ value, min, max, onChange, label, display }: { value: number; min: number; max: number; onChange: (v: number) => void; label: string; display: string }) {
  const { t } = useStore()
  return (
    <div className="stepper" role="group" aria-label={label}>
      <button type="button" className="stepper__btn" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label={`${t.prefs.fewer}: ${label}`}>
        <IconMinus size={18} />
      </button>
      <output className="stepper__value" aria-live="polite">{display}</output>
      <button type="button" className="stepper__btn" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label={`${t.prefs.more}: ${label}`}>
        <IconPlus size={18} />
      </button>
    </div>
  )
}

export function ToggleChip({ pressed, onToggle, children }: { pressed: boolean; onToggle: () => void; children: ReactNode }) {
  return (
    <button type="button" className="toggle-chip" aria-pressed={pressed} onClick={onToggle}>
      <span className="toggle-chip__box" aria-hidden="true" />
      {children}
    </button>
  )
}
