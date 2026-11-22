// المبالغ تُخزَّن دائماً كأعداد صحيحة بالهللة (1 ريال = 100 هللة) لتفادي أخطاء الكسور العشرية.
export type Halala = number

export type AccountKind = 'cash' | 'asset' | 'expense' | 'revenue' | 'equity' | 'liability'

export interface Account {
  id: string
  name: string
  kind: AccountKind
  archived?: boolean
}

export interface EntryLine {
  accountId: string
  debit: Halala
  credit: Halala
  note?: string
}

export type SyncState = 'pending' | 'synced' | 'conflict'

export interface Entry {
  /** معرّف فريد يُولَّد على الجهاز — يمنع تكرار القيد عند المزامنة */
  id: string
  /** رقم القيد التسلسلي */
  number: number
  /** YYYY-MM-DD */
  date: string
  description: string
  type: OperationType
  lines: EntryLine[]
  /** قيد مستورد أو مُعلَّم يحتاج مراجعة */
  flagged?: boolean
  flagNote?: string
  deleted?: boolean
  createdAt: string
  updatedAt: string
  /** آخر نسخة معروفة على الخادم (لمنع الكتابة فوق تعديلات جهاز آخر) */
  serverUpdatedAt?: string | null
  sync: SyncState
  source?: 'manual' | 'import' | 'restore'
}

export type OperationType =
  | 'buy_livestock'
  | 'sell_livestock'
  | 'transport'
  | 'fuel'
  | 'feed'
  | 'wages'
  | 'maintenance'
  | 'vet'
  | 'equipment'
  | 'rent'
  | 'other_expense'
  | 'other_income'
  | 'capital'
  | 'compound'

export interface Settings {
  businessName: string
  ownerName: string
  supabaseUrl: string
  supabaseKey: string
  lastSyncAt: string | null
  lastBackupAt: string | null
}

export interface AuditRecord {
  id: string
  entryId: string
  at: string
  action: 'create' | 'update' | 'delete' | 'restore' | 'conflict'
  snapshot: Entry
}
