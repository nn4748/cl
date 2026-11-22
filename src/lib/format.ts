export const MONTHS_AR = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
export const DAYS_AR = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']

export function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function parseISO(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function dayName(s: string): string {
  return DAYS_AR[parseISO(s).getDay()]
}

/** 2026/09/07 */
export function fmtDate(s: string): string {
  return s.replace(/-/g, '/')
}

/** 7 سبتمبر 2026 */
export function fmtDateLong(s: string): string {
  const d = parseISO(s)
  return `${d.getDate()} ${MONTHS_AR[d.getMonth()]} ${d.getFullYear()}`
}

/** "2026-09" → "سبتمبر 2026" */
export function fmtMonth(key: string): string {
  const [y, m] = key.split('-').map(Number)
  return `${MONTHS_AR[m - 1]} ${y}`
}

export function relativeTime(iso: string | null): string {
  if (!iso) return 'لم يحدث بعد'
  const diff = (Date.now() - Date.parse(iso)) / 1000
  if (diff < 60) return 'الآن'
  if (diff < 3600) return `قبل ${Math.floor(diff / 60)} دقيقة`
  if (diff < 86400) return `قبل ${Math.floor(diff / 3600)} ساعة`
  const days = Math.floor(diff / 86400)
  return days === 1 ? 'أمس' : `قبل ${days} يوم`
}
