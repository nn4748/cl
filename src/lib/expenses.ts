import type { Account, Entry, Halala } from './types'
import { parseAmount } from './money'

export interface ExpenseItem {
  entryId: string
  entryNumber: number
  date: string
  description: string
  accountId: string
  note: string
  amount: Halala
}

/** كل بنود الصرف: الأسطر المدينة على حسابات غير نقدية */
export function expenseItems(entries: Entry[], accounts: Account[]): ExpenseItem[] {
  const kind = new Map(accounts.map((a) => [a.id, a.kind]))
  const out: ExpenseItem[] = []
  for (const e of entries) {
    if (e.deleted) continue
    for (const l of e.lines) {
      const k = kind.get(l.accountId)
      if (l.debit <= 0 || k === 'cash' || k === 'revenue' || k === 'equity' || k === 'liability') continue
      out.push({
        entryId: e.id,
        entryNumber: e.number,
        date: e.date,
        description: e.description,
        accountId: l.accountId,
        note: l.note ?? '',
        amount: l.debit,
      })
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || a.entryNumber - b.entryNumber)
}

export interface MonthSum {
  key: string
  total: Halala
  count: number
  byAccount: { accountId: string; total: Halala }[]
}

export function monthSums(items: ExpenseItem[]): MonthSum[] {
  const map = new Map<string, { total: number; count: number; acc: Map<string, number> }>()
  for (const it of items) {
    const k = it.date.slice(0, 7)
    const m = map.get(k) ?? { total: 0, count: 0, acc: new Map() }
    m.total += it.amount
    m.count += 1
    m.acc.set(it.accountId, (m.acc.get(it.accountId) ?? 0) + it.amount)
    map.set(k, m)
  }
  return [...map.entries()]
    .map(([key, m]) => ({
      key,
      total: m.total,
      count: m.count,
      byAccount: [...m.acc.entries()].map(([accountId, total]) => ({ accountId, total })).sort((a, b) => b.total - a.total),
    }))
    .sort((a, b) => a.key.localeCompare(b.key))
}

/** حسابات العمالة: حساب الرواتب أو أي حساب اسمه يدل على العامل */
export function isWorkerAccount(a: Account): boolean {
  return a.id === 'wages' || /عامل|عمال|راتب|رواتب/.test(a.name)
}

// ───────────── تفصيل بنود العامل ─────────────

export type WorkerCat = 'salary' | 'phone' | 'food' | 'bonus' | 'other'

export const WORKER_CAT_LABEL: Record<WorkerCat, string> = {
  salary: 'الراتب',
  phone: 'سوا والجوال',
  food: 'مقاضي العثيم والأكل',
  bonus: 'المكافآت',
  other: 'مصاريف أخرى',
}

const CAT_RULES: [WorkerCat, RegExp][] = [
  ['salary', /راتب|رواتب/],
  ['phone', /سوا|شحن|شاحن|جوال|رصيد|بطاقة/],
  ['bonus', /مكافأ|مكافا|عيدية/],
  ['food', /مقاضي|العشيم|العثيم|عشاء|غداء|فطور|اكل|أكل|غاز|خبز|بقالة/],
]

export interface WorkerPiece {
  label: string
  amount: Halala | null
  cat: WorkerCat
}

/** يفكك ملاحظة مثل «راتب عامل 1,500 + العشيم 116 + 30 + سوا 115» إلى بنود */
export function splitNote(note: string): WorkerPiece[] {
  const parts = note
    .split(/\s*[+،]\s*/)
    .map((s) => s.trim())
    .filter(Boolean)
  const out: WorkerPiece[] = []
  let lastCat: WorkerCat = 'other'
  let lastLabel = ''
  for (const p of parts) {
    const m = p.match(/^(.*?)[\s:]*([\d,]+(?:\.\d{1,2})?)$/)
    const label = (m ? m[1] : p).replace(/[:\s]+$/, '').trim()
    const amount = m ? parseAmount(m[2]) : null
    let cat: WorkerCat = 'other'
    if (label) {
      cat = CAT_RULES.find(([, re]) => re.test(label))?.[0] ?? 'other'
      lastCat = cat
      lastLabel = label
    } else {
      // رقم بدون اسم يتبع البند الذي قبله (مثل: العشيم 116 + 30)
      cat = lastCat
    }
    out.push({ label: label || lastLabel, amount, cat })
  }
  return out
}

export interface WorkerMonth {
  key: string
  total: Halala
  cats: Record<WorkerCat, Halala>
  items: (ExpenseItem & { pieces: WorkerPiece[] })[]
}

export function workerMonths(items: ExpenseItem[], accounts: Account[]): WorkerMonth[] {
  const workerIds = new Set(accounts.filter(isWorkerAccount).map((a) => a.id))
  const map = new Map<string, WorkerMonth>()
  for (const it of items) {
    if (!workerIds.has(it.accountId)) continue
    const key = it.date.slice(0, 7)
    const m = map.get(key) ?? { key, total: 0, cats: { salary: 0, phone: 0, food: 0, bonus: 0, other: 0 }, items: [] }
    let pieces = it.note ? splitNote(it.note) : []
    // سطر لبند واحد بدون رقم (مثل «سوا»): المبلغ كله لهذا البند
    if (pieces.length === 1 && pieces[0].amount == null) pieces = [{ ...pieces[0], amount: it.amount }]
    // نوزع مبلغ السطر على التصنيفات؛ أي فرق يذهب إلى «أخرى» حتى يبقى المجموع مطابقاً للقيد
    let assigned = 0
    for (const p of pieces) {
      if (p.amount == null) continue
      m.cats[p.cat] += p.amount
      assigned += p.amount
    }
    const rest = it.amount - assigned
    if (rest !== 0) {
      const fallback = pieces.length === 0 ? (CAT_RULES.find(([, re]) => re.test(it.description))?.[0] ?? 'other') : 'other'
      m.cats[fallback] += rest
    }
    m.total += it.amount
    m.items.push({ ...it, pieces })
    map.set(key, m)
  }
  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key))
}

// ───────────── تفصيل الأعلاف حسب الصنف ─────────────

export const FEED_TYPES = ['شعير', 'ذرة صفراء', 'فول صويا', 'سمسم', 'نخالة سمسم', 'الطحن', 'شعير وذرة (مبلغ واحد)', 'أصناف مخلوطة', 'أعلاف (شحنة)', 'أخرى'] as const
export type FeedType = (typeof FEED_TYPES)[number]

export function feedType(label: string): FeedType {
  const t = label.replace(/[أإآ]/g, 'ا')
  if (/نخال/.test(t)) return 'نخالة سمسم'
  if (/\+/.test(t)) return 'أصناف مخلوطة'
  if (/شعير و\s*ذر|شعير وذر/.test(t)) return 'شعير وذرة (مبلغ واحد)'
  if (/طاحون|مطحن|طحن/.test(t)) return 'الطحن'
  if (/شعير/.test(t)) return 'شعير'
  if (/ذر/.test(t)) return 'ذرة صفراء'
  if (/فول|صويا/.test(t)) return 'فول صويا'
  if (/سمسم/.test(t)) return 'سمسم'
  if (/شحن|اعلاف|علف/.test(t)) return 'أعلاف (شحنة)'
  return 'أخرى'
}

/** عدد الأكياس من نص مثل «شعير 10 أكياس» أو «سمسم 12 كيس» */
export function bagsOf(label: string): number | null {
  const m = label.match(/(\d+)\s*(?:كيس|أكياس|اكياس)/)
  return m ? Number(m[1]) : null
}

export interface FeedTypeSum {
  type: FeedType
  total: Halala
  bags: number
  items: ExpenseItem[]
}

export function feedByType(items: ExpenseItem[]): FeedTypeSum[] {
  const map = new Map<FeedType, FeedTypeSum>()
  for (const it of items) {
    if (it.accountId !== 'feed') continue
    const type = feedType(it.note || it.description)
    const cur = map.get(type) ?? { type, total: 0, bags: 0, items: [] }
    cur.total += it.amount
    cur.bags += bagsOf(it.note) ?? 0
    cur.items.push(it)
    map.set(type, cur)
  }
  return [...map.values()].sort((a, b) => b.total - a.total)
}
