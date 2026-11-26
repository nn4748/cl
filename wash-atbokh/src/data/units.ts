import type { Lang } from '../i18n/types'

export type UnitId = 'g' | 'kg' | 'ml' | 'cup' | 'tbsp' | 'tsp' | 'piece' | 'clove' | 'pinch' | 'pod' | 'stick' | 'loaf' | 'taste'

interface UnitForms {
  /** Arabic: singular, dual, plural (3–10). 11+ and fractions take the singular. */
  ar: [string, string, string]
  en: [string, string]
  /** Rounding step when scaling servings. */
  step: number
  /** Whether quantities are shown at all (e.g. "to taste"). */
  countable?: boolean
}

export const UNITS: Record<UnitId, UnitForms> = {
  g: { ar: ['غرام', 'غرام', 'غرام'], en: ['g', 'g'], step: 10 },
  kg: { ar: ['كيلو', 'كيلو', 'كيلو'], en: ['kg', 'kg'], step: 0.1 },
  ml: { ar: ['مل', 'مل', 'مل'], en: ['ml', 'ml'], step: 10 },
  cup: { ar: ['كوب', 'كوبين', 'أكواب'], en: ['cup', 'cups'], step: 0.25 },
  tbsp: { ar: ['ملعقة كبيرة', 'ملعقتين كبار', 'ملاعق كبيرة'], en: ['tbsp', 'tbsp'], step: 0.5 },
  tsp: { ar: ['ملعقة صغيرة', 'ملعقتين صغار', 'ملاعق صغيرة'], en: ['tsp', 'tsp'], step: 0.25 },
  piece: { ar: ['حبة', 'حبتين', 'حبات'], en: ['piece', 'pieces'], step: 0.5 },
  clove: { ar: ['فص', 'فصين', 'فصوص'], en: ['clove', 'cloves'], step: 1 },
  pinch: { ar: ['رشة', 'رشتين', 'رشات'], en: ['pinch', 'pinches'], step: 1 },
  pod: { ar: ['حبة', 'حبتين', 'حبات'], en: ['pod', 'pods'], step: 1 },
  stick: { ar: ['عود', 'عودين', 'أعواد'], en: ['stick', 'sticks'], step: 1 },
  loaf: { ar: ['رغيف', 'رغيفين', 'أرغفة'], en: ['loaf', 'loaves'], step: 1 },
  taste: { ar: ['حسب الرغبة', 'حسب الرغبة', 'حسب الرغبة'], en: ['to taste', 'to taste'], step: 1, countable: false },
}

const FRACTIONS: [number, string][] = [
  [0.25, '¼'],
  [0.5, '½'],
  [0.75, '¾'],
]

export function formatNumber(n: number, lang: Lang): string {
  return new Intl.NumberFormat(lang === 'ar' ? 'ar-SA' : 'en-US', { maximumFractionDigits: 1 }).format(n)
}

/** Formats a quantity using friendly fractions where they fit (1½, ¾…). */
export function formatQty(n: number, lang: Lang): string {
  const whole = Math.floor(n)
  const frac = n - whole
  const glyph = FRACTIONS.find(([v]) => Math.abs(v - frac) < 0.01)
  if (frac < 0.01) return formatNumber(whole, lang)
  if (glyph) {
    if (whole === 0) return glyph[1]
    const s = `${formatNumber(whole, lang)}${glyph[1]}`
    return lang === 'ar' ? `\u2066${s}\u2069` : s
  }
  return formatNumber(Math.round(n * 10) / 10, lang)
}

export function roundToStep(n: number, step: number): number {
  const r = Math.round(n / step) * step
  return Math.max(step, Number(r.toFixed(2)))
}

export function unitLabel(unit: UnitId, qty: number, lang: Lang): string {
  const forms = UNITS[unit]
  if (lang === 'en') return qty > 1 ? forms.en[1] : forms.en[0]
  const isWhole = Math.abs(qty - Math.round(qty)) < 0.01
  if (!isWhole || qty <= 1 || qty > 10) return forms.ar[0]
  if (qty === 2) return forms.ar[1]
  return forms.ar[2]
}

/** "2 cups" / "كوبين" / "٣ أكواب" / "½ كوب" */
export function formatAmount(qty: number | undefined, unit: UnitId, lang: Lang): string {
  const forms = UNITS[unit]
  if (forms.countable === false || qty === undefined) return lang === 'ar' ? forms.ar[0] : forms.en[0]
  const label = unitLabel(unit, qty, lang)
  // Arabic dual forms already carry the number ("كوبين").
  if (lang === 'ar' && qty === 2 && forms.ar[1] !== forms.ar[0]) return label
  return `${formatQty(qty, lang)} ${label}`
}
