import type { Halala } from './types'

const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩'
const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹'

/** يحوّل الأرقام العربية/الفارسية إلى أرقام لاتينية ويزيل الفواصل */
export function normalizeDigits(s: string): string {
  return s
    .replace(/[٠-٩]/g, (d) => String(AR_DIGITS.indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String(FA_DIGITS.indexOf(d)))
    .replace(/٫/g, '.')
    .replace(/[٬,،\s]/g, '')
}

/** يحوّل نص المبلغ إلى هللات. يعيد null إذا كان غير صالح. */
export function parseAmount(input: string | number): Halala | null {
  if (typeof input === 'number') {
    if (!Number.isFinite(input)) return null
    return Math.round(input * 100)
  }
  const s = normalizeDigits(input.trim())
  if (!s) return null
  if (!/^\d+(\.\d{0,2})?$/.test(s)) return null
  const [whole, frac = ''] = s.split('.')
  const v = Number(whole) * 100 + Number((frac + '00').slice(0, 2))
  if (!Number.isSafeInteger(v)) return null
  return v
}

const fmt = new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
const fmt2 = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** تنسيق للعرض: 1,234 أو 1,234.50 */
export function formatSAR(h: Halala, opts: { always2?: boolean } = {}): string {
  const neg = h < 0
  const abs = Math.abs(h)
  const s = opts.always2 || abs % 100 !== 0 ? fmt2.format(abs / 100) : fmt.format(abs / 100)
  return neg ? `-${s}` : s
}

/** قيمة رقمية بالريال (للتصدير إلى Excel) */
export function toRiyal(h: Halala): number {
  return Math.round(h) / 100
}

/** للحقول: 1234.5 → "1234.50" */
export function toInputValue(h: Halala): string {
  if (!h) return ''
  return h % 100 === 0 ? String(h / 100) : (h / 100).toFixed(2)
}
