import { describe, expect, it } from 'vitest'
import { DEFAULT_ACCOUNTS } from '../src/lib/accounts'
import { byAccount, cashSet, journalRows, totals } from '../src/lib/calc'
import { formatSAR, parseAmount } from '../src/lib/money'
import { ORIGINAL_JOURNAL, ORIGINAL_TOTAL_HALALA } from '../src/lib/seed'
import type { Entry } from '../src/lib/types'

const toEntries = (): Entry[] =>
  ORIGINAL_JOURNAL.map((d, i) => ({
    ...d,
    id: String(i),
    number: d.number ?? i + 1,
    createdAt: '',
    updatedAt: '',
    sync: 'synced',
  }))

describe('المبالغ', () => {
  it('تحلل المبالغ بدقة الهللة', () => {
    expect(parseAmount('1,250.5')).toBe(125050)
    expect(parseAmount('٣٥٠')).toBe(35000)
    expect(parseAmount('0.1')).toBe(10)
    expect(parseAmount('12.345')).toBeNull()
    expect(parseAmount('abc')).toBeNull()
    expect(formatSAR(29793800)).toBe('297,938')
    expect(formatSAR(125050)).toBe('1,250.50')
  })
  it('لا أخطاء كسور عشرية عند الجمع', () => {
    const sum = [0.1, 0.2, 0.3].map((v) => parseAmount(String(v))!).reduce((a, b) => a + b, 0)
    expect(sum).toBe(60)
  })
})

describe('دفتر مشروع الحلال الأصلي', () => {
  const cash = cashSet(DEFAULT_ACCOUNTS)
  it('كل القيود متوازنة والمجموع 249,938 بعد التصحيح', () => {
    const entries = toEntries()
    const t = totals(entries, cash)
    expect(t.debit).toBe(ORIGINAL_TOTAL_HALALA)
    expect(t.credit).toBe(0)
    expect(t.balance).toBe(ORIGINAL_TOTAL_HALALA)
    expect(t.count).toBe(20)
    expect(t.ledgerBalanced).toBe(true)
    expect(t.cashBalance).toBe(-ORIGINAL_TOTAL_HALALA)
  })
  it('ملخص الحسابات مطابق للترحيل في الدفتر', () => {
    const sums = Object.fromEntries(byAccount(toEntries(), DEFAULT_ACCOUNTS).map((a) => [a.account.id, a.balance / 100]))
    expect(sums).toMatchObject({
      livestock: 148000,
      feed: 52569,
      well: 18050,
      rent: 10000,
      equipment: 7053,
      wages: 8219,
      vet: 3315,
      transport: 2573,
      maintenance: 320,
      misc: 105,
      cash: -250204,
    })
  })
  it('الرصيد التراكمي ينتهي بالمجموع', () => {
    const rows = journalRows(toEntries(), cash)
    expect(rows.at(-1)!.balance).toBe(ORIGINAL_TOTAL_HALALA)
    expect(rows[0].balance).toBe(100000)
    expect(rows.filter((r) => r.entry.date.startsWith('2026-08')).length).toBe(3)
    expect(rows.filter((r) => r.entry.date.startsWith('2026-11') && r.entry.lines.some((l) => l.debit === 100000))).toHaveLength(0)
  })
})
