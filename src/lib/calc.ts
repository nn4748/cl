import type { Account, Entry, Halala } from './types'

/**
 * منطق الحسابات:
 * كل قيد متوازن داخلياً (مجموع المدين = مجموع الدائن) — وهذا شرط للحفظ.
 * لعرض "إجمالي المدين" و"إجمالي الدائن" بشكل مفيد لصاحب المشروع (كما في الدفتر الورقي)
 * نحسبهما على حسابات المشروع غير النقدية:
 *   - المدين = ما صُرف على المشروع (مشتريات حلال، أعلاف، رواتب...)
 *   - الدائن = ما دخل للمشروع (مبيعات، إيرادات، تمويل)
 *   - الرصيد = المدين − الدائن
 * أما حركة الصندوق/البنك فتظهر منفصلة في "رصيد الصندوق".
 */

export type CashSet = Set<string>

export function cashSet(accounts: Account[]): CashSet {
  return new Set(accounts.filter((a) => a.kind === 'cash').map((a) => a.id))
}

export function lineSums(e: Entry) {
  let debit = 0
  let credit = 0
  for (const l of e.lines) {
    debit += l.debit
    credit += l.credit
  }
  return { debit, credit, balanced: debit === credit && debit > 0 }
}

/** المدين والدائن "الفعلي" للقيد (بعد استبعاد الحسابات النقدية) */
export function entryDC(e: Entry, cash: CashSet): { debit: Halala; credit: Halala } {
  // قيد بين حسابين نقديين فقط (تحويل من الصندوق للبنك) لا يؤثر على المدين/الدائن
  let debit = 0
  let credit = 0
  for (const l of e.lines) {
    if (cash.has(l.accountId)) continue
    debit += l.debit
    credit += l.credit
  }
  return { debit, credit }
}

export function active(entries: Entry[]): Entry[] {
  return entries.filter((e) => !e.deleted)
}

export function sortAsc(entries: Entry[]): Entry[] {
  return [...entries].sort((a, b) => a.date.localeCompare(b.date) || a.number - b.number)
}

export interface Totals {
  debit: Halala
  credit: Halala
  balance: Halala
  count: number
  cashBalance: Halala
  /** مجموع كل الأسطر المدينة = مجموع كل الأسطر الدائنة */
  ledgerBalanced: boolean
  allDebit: Halala
  allCredit: Halala
}

export function totals(entries: Entry[], cash: CashSet): Totals {
  let debit = 0
  let credit = 0
  let cashBalance = 0
  let allDebit = 0
  let allCredit = 0
  const list = active(entries)
  for (const e of list) {
    const dc = entryDC(e, cash)
    debit += dc.debit
    credit += dc.credit
    for (const l of e.lines) {
      allDebit += l.debit
      allCredit += l.credit
      if (cash.has(l.accountId)) cashBalance += l.debit - l.credit
    }
  }
  return {
    debit,
    credit,
    balance: debit - credit,
    count: list.length,
    cashBalance,
    ledgerBalanced: allDebit === allCredit,
    allDebit,
    allCredit,
  }
}

export interface JournalRow {
  entry: Entry
  debit: Halala
  credit: Halala
  balance: Halala
}

/** صفوف الدفتر مع الرصيد التراكمي (محسوب دائماً بالترتيب الزمني) */
export function journalRows(entries: Entry[], cash: CashSet): JournalRow[] {
  let run = 0
  return sortAsc(active(entries)).map((entry) => {
    const { debit, credit } = entryDC(entry, cash)
    run += debit - credit
    return { entry, debit, credit, balance: run }
  })
}

export interface PeriodSum {
  key: string
  debit: Halala
  credit: Halala
  count: number
}

export function groupBy(entries: Entry[], cash: CashSet, keyFn: (e: Entry) => string): PeriodSum[] {
  const map = new Map<string, PeriodSum>()
  for (const e of active(entries)) {
    const k = keyFn(e)
    const cur = map.get(k) ?? { key: k, debit: 0, credit: 0, count: 0 }
    const dc = entryDC(e, cash)
    cur.debit += dc.debit
    cur.credit += dc.credit
    cur.count += 1
    map.set(k, cur)
  }
  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key))
}

export const byMonth = (entries: Entry[], cash: CashSet) => groupBy(entries, cash, (e) => e.date.slice(0, 7))
export const byDay = (entries: Entry[], cash: CashSet) => groupBy(entries, cash, (e) => e.date)
export const byYear = (entries: Entry[], cash: CashSet) => groupBy(entries, cash, (e) => e.date.slice(0, 4))

export interface AccountSum {
  account: Account
  debit: Halala
  credit: Halala
  balance: Halala
}

/** ملخص الحسابات (الترحيل) */
export function byAccount(entries: Entry[], accounts: Account[]): AccountSum[] {
  const map = new Map<string, AccountSum>()
  const accById = new Map(accounts.map((a) => [a.id, a]))
  for (const e of active(entries)) {
    for (const l of e.lines) {
      const account = accById.get(l.accountId) ?? { id: l.accountId, name: l.accountId, kind: 'expense' as const }
      const cur = map.get(l.accountId) ?? { account, debit: 0, credit: 0, balance: 0 }
      cur.debit += l.debit
      cur.credit += l.credit
      cur.balance = cur.debit - cur.credit
      map.set(l.accountId, cur)
    }
  }
  return [...map.values()].sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance))
}

export function inRange(e: Entry, from?: string, to?: string): boolean {
  if (from && e.date < from) return false
  if (to && e.date > to) return false
  return true
}
