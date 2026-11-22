import type { Account, OperationType } from './types'

export const CASH_ID = 'cash'

export const DEFAULT_ACCOUNTS: Account[] = [
  { id: CASH_ID, name: 'الصندوق (نقدية)', kind: 'cash' },
  { id: 'bank', name: 'البنك', kind: 'cash' },
  { id: 'livestock', name: 'الحلال (المواشي)', kind: 'asset' },
  { id: 'feed', name: 'الأعلاف', kind: 'expense' },
  { id: 'transport', name: 'نقل وبنزين', kind: 'expense' },
  { id: 'wages', name: 'رواتب ومصاريف العمال', kind: 'expense' },
  { id: 'vet', name: 'علاج بيطري', kind: 'expense' },
  { id: 'equipment', name: 'خيام ومعدات', kind: 'asset' },
  { id: 'maintenance', name: 'صيانة', kind: 'expense' },
  { id: 'rent', name: 'الإيجار', kind: 'expense' },
  { id: 'well', name: 'حفر بئر', kind: 'asset' },
  { id: 'misc', name: 'مصاريف متنوعة', kind: 'expense' },
  { id: 'sales', name: 'مبيعات الحلال', kind: 'revenue' },
  { id: 'other_income', name: 'إيرادات أخرى', kind: 'revenue' },
  { id: 'capital', name: 'رأس المال (تمويل المالك)', kind: 'equity' },
]

export const KIND_LABEL: Record<Account['kind'], string> = {
  cash: 'نقدية',
  asset: 'أصول',
  expense: 'مصروفات',
  revenue: 'إيرادات',
  equity: 'حقوق ملكية',
  liability: 'التزامات',
}

export interface OperationDef {
  id: OperationType
  label: string
  /** اتجاه المال: out = صرف (مدين)، in = قبض (دائن) */
  direction: 'out' | 'in'
  debit: string
  credit: string
}

export const OPERATIONS: OperationDef[] = [
  { id: 'buy_livestock', label: 'شراء حلال', direction: 'out', debit: 'livestock', credit: CASH_ID },
  { id: 'feed', label: 'أعلاف', direction: 'out', debit: 'feed', credit: CASH_ID },
  { id: 'fuel', label: 'بنزين', direction: 'out', debit: 'transport', credit: CASH_ID },
  { id: 'transport', label: 'نقل', direction: 'out', debit: 'transport', credit: CASH_ID },
  { id: 'wages', label: 'رواتب وعمالة', direction: 'out', debit: 'wages', credit: CASH_ID },
  { id: 'vet', label: 'علاج بيطري', direction: 'out', debit: 'vet', credit: CASH_ID },
  { id: 'maintenance', label: 'صيانة', direction: 'out', debit: 'maintenance', credit: CASH_ID },
  { id: 'equipment', label: 'خيام ومعدات', direction: 'out', debit: 'equipment', credit: CASH_ID },
  { id: 'rent', label: 'إيجار', direction: 'out', debit: 'rent', credit: CASH_ID },
  { id: 'other_expense', label: 'مصاريف أخرى', direction: 'out', debit: 'misc', credit: CASH_ID },
  { id: 'sell_livestock', label: 'بيع حلال', direction: 'in', debit: CASH_ID, credit: 'sales' },
  { id: 'other_income', label: 'إيرادات أخرى', direction: 'in', debit: CASH_ID, credit: 'other_income' },
  { id: 'capital', label: 'تمويل من المالك', direction: 'in', debit: CASH_ID, credit: 'capital' },
]

export const OPERATION_LABEL: Record<OperationType, string> = Object.fromEntries([
  ...OPERATIONS.map((o) => [o.id, o.label]),
  ['compound', 'قيد مركب'],
]) as Record<OperationType, string>

export function opDef(id: OperationType): OperationDef | undefined {
  return OPERATIONS.find((o) => o.id === id)
}

/** يستنتج نوع العملية من الحساب المدين/الدائن (للقيود المستوردة) */
export function guessOperation(debitAccountId: string, creditAccountId: string): OperationType {
  const exact = OPERATIONS.find((o) => o.debit === debitAccountId && o.credit === creditAccountId)
  if (exact) return exact.id
  const byDebit = OPERATIONS.find((o) => o.direction === 'out' && o.debit === debitAccountId)
  if (byDebit) return byDebit.id
  const byCredit = OPERATIONS.find((o) => o.direction === 'in' && o.credit === creditAccountId)
  if (byCredit) return byCredit.id
  return 'other_expense'
}

/** تطبيع اسم الحساب للمطابقة (يزيل التشكيل والهمزات والفروق البسيطة) */
export function normalizeArabic(s: string): string {
  return s
    .normalize('NFKC')
    .replace(/[ً-ْـ]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[()\s]+/g, ' ')
    .trim()
}

/** يطابق اسماً نصياً مع حساب موجود */
export function matchAccount(name: string, accounts: Account[]): Account | undefined {
  const n = normalizeArabic(name)
  if (!n) return undefined
  const exact = accounts.find((a) => normalizeArabic(a.name) === n)
  if (exact) return exact
  const contains = accounts.find((a) => {
    const an = normalizeArabic(a.name)
    return an.includes(n) || n.includes(an)
  })
  if (contains) return contains
  // مطابقة بالكلمة الأولى المميزة
  const firstWord = n.split(' ').find((w) => w.length > 2 && w !== 'ال')
  if (firstWord) return accounts.find((a) => normalizeArabic(a.name).includes(firstWord))
  return undefined
}
