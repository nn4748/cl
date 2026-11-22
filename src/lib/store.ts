import { useSyncExternalStore } from 'react'
import { DEFAULT_ACCOUNTS, OPERATION_LABEL } from './accounts'
import * as DB from './db'
import type { Account, Entry, EntryLine, OperationType, Settings } from './types'

export type SyncStatus = 'local' | 'offline' | 'syncing' | 'synced' | 'error' | 'signed_out'

export interface AppState {
  ready: boolean
  entries: Entry[]
  accounts: Account[]
  settings: Settings
  online: boolean
  sync: { status: SyncStatus; message?: string; pending: number }
}

let state: AppState = {
  ready: false,
  entries: [],
  accounts: DEFAULT_ACCOUNTS,
  settings: DB.DEFAULT_SETTINGS,
  online: typeof navigator === 'undefined' ? true : navigator.onLine,
  sync: { status: 'local', pending: 0 },
}

const listeners = new Set<() => void>()

function emit() {
  for (const l of listeners) l()
}

export function setState(patch: Partial<AppState> | ((s: AppState) => Partial<AppState>)) {
  const p = typeof patch === 'function' ? patch(state) : patch
  state = { ...state, ...p }
  state.sync = { ...state.sync, pending: cloudEnabled(state.settings) ? state.entries.filter((e) => e.sync !== 'synced').length : 0 }
  emit()
}

/** هل المزامنة السحابية مفعّلة؟ (بدونها لا معنى لعلامة "بانتظار الإرسال") */
export function cloudEnabled(s: Settings = state.settings) {
  return Boolean(s.supabaseUrl && s.supabaseKey)
}

export function getState() {
  return state
}

export function useApp(): AppState {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => state,
  )
}

/** مستمعون لأي تغيير محلي يحتاج مزامنة (يُسجَّل من sync.ts) */
let onLocalChange: (() => void) | null = null
export function setLocalChangeHandler(fn: () => void) {
  onLocalChange = fn
}

export async function loadAll() {
  let accounts = await DB.getAccounts()
  if (accounts.length === 0) {
    await DB.putAccounts(DEFAULT_ACCOUNTS)
    accounts = DEFAULT_ACCOUNTS
  }
  const [entries, settings] = await Promise.all([DB.getAllEntries(), DB.getSettings()])
  setState({ ready: true, entries, accounts: sortAccounts(accounts), settings })
  void DB.requestPersistence()
}

export async function reloadEntries() {
  const entries = await DB.getAllEntries()
  setState({ entries })
}

function sortAccounts(a: Account[]): Account[] {
  const order = DEFAULT_ACCOUNTS.map((x) => x.id)
  return [...a].sort((x, y) => {
    const ix = order.indexOf(x.id)
    const iy = order.indexOf(y.id)
    if (ix === -1 && iy === -1) return x.name.localeCompare(y.name, 'ar')
    if (ix === -1) return 1
    if (iy === -1) return -1
    return ix - iy
  })
}

// ───────────────────────── القيود ─────────────────────────

export interface EntryDraft {
  date: string
  description: string
  type: OperationType
  lines: EntryLine[]
  flagged?: boolean
  flagNote?: string
  number?: number
}

/** الرقم التالي: لا يُعاد استخدام رقم أبداً (حتى لو كان القيد ملغياً) */
export function nextNumber(entries: Entry[] = state.entries): number {
  let max = 0
  for (const e of entries) if (e.number > max) max = e.number
  return max + 1
}

export function validateDraft(d: EntryDraft, accounts: Account[] = state.accounts): string[] {
  const errors: string[] = []
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.date) || Number.isNaN(Date.parse(d.date))) errors.push('التاريخ غير صحيح')
  if (d.description.length > 500) errors.push('البيان طويل جداً')
  const lines = d.lines.filter((l) => l.debit > 0 || l.credit > 0)
  if (lines.length < 2) errors.push('القيد يحتاج حساباً مديناً وحساباً دائناً على الأقل')
  let debit = 0
  let credit = 0
  const ids = new Set(accounts.map((a) => a.id))
  for (const l of lines) {
    if (!Number.isSafeInteger(l.debit) || !Number.isSafeInteger(l.credit) || l.debit < 0 || l.credit < 0) {
      errors.push('مبلغ غير صالح')
      break
    }
    if (l.debit > 0 && l.credit > 0) errors.push('السطر الواحد لا يكون مديناً ودائناً معاً')
    if (!ids.has(l.accountId)) errors.push('يوجد حساب غير معروف')
    debit += l.debit
    credit += l.credit
  }
  if (debit === 0) errors.push('أدخل المبلغ')
  else if (debit !== credit) errors.push('القيد غير متوازن: مجموع المدين لا يساوي مجموع الدائن')
  if (debit > 100_000_000_00) errors.push('المبلغ كبير بشكل غير منطقي، تأكد منه')
  return [...new Set(errors)]
}

function cleanLines(lines: EntryLine[]): EntryLine[] {
  return lines
    .filter((l) => l.debit > 0 || l.credit > 0)
    .map((l) => ({ accountId: l.accountId, debit: l.debit, credit: l.credit, ...(l.note?.trim() ? { note: l.note.trim() } : {}) }))
}

export async function addEntry(d: EntryDraft, source: Entry['source'] = 'manual'): Promise<Entry> {
  const errors = validateDraft(d)
  if (errors.length) throw new Error(errors.join('، '))
  const now = new Date().toISOString()
  // نقرأ من قاعدة البيانات مباشرة لضمان الرقم التسلسلي حتى مع أكثر من تبويب مفتوح
  const all = await DB.getAllEntries()
  const entry: Entry = {
    id: crypto.randomUUID(),
    number: nextNumber(all),
    date: d.date,
    description: d.description.trim() || OPERATION_LABEL[d.type],
    type: d.type,
    lines: cleanLines(d.lines),
    ...(d.flagged ? { flagged: true, flagNote: d.flagNote } : {}),
    createdAt: now,
    updatedAt: now,
    serverUpdatedAt: null,
    sync: 'pending',
    source,
  }
  await DB.putEntryWithAudit(entry, 'create')
  setState((s) => ({ entries: [...s.entries.filter((e) => e.id !== entry.id), entry] }))
  onLocalChange?.()
  return entry
}

export async function updateEntry(id: string, d: EntryDraft): Promise<Entry> {
  const errors = validateDraft(d)
  if (errors.length) throw new Error(errors.join('، '))
  const cur = await DB.getEntry(id)
  if (!cur) throw new Error('القيد غير موجود')
  const entry: Entry = {
    ...cur,
    date: d.date,
    description: d.description.trim() || OPERATION_LABEL[d.type],
    type: d.type,
    lines: cleanLines(d.lines),
    flagged: d.flagged ?? false,
    flagNote: d.flagged ? d.flagNote : undefined,
    updatedAt: new Date().toISOString(),
    sync: cur.sync === 'conflict' ? 'conflict' : 'pending',
  }
  await DB.putEntryWithAudit(entry, 'update')
  setState((s) => ({ entries: s.entries.map((e) => (e.id === id ? entry : e)) }))
  onLocalChange?.()
  return entry
}

/** الحذف "ناعم": القيد يُعلَّم كملغي ويبقى رقمه وسجله محفوظاً، ويمكن استرجاعه */
export async function setDeleted(id: string, deleted: boolean): Promise<void> {
  const cur = await DB.getEntry(id)
  if (!cur) return
  const entry: Entry = { ...cur, deleted, updatedAt: new Date().toISOString(), sync: 'pending' }
  await DB.putEntryWithAudit(entry, deleted ? 'delete' : 'restore')
  setState((s) => ({ entries: s.entries.map((e) => (e.id === id ? entry : e)) }))
  onLocalChange?.()
}

/** استيراد مجموعة قيود بعد المراجعة — بالترتيب الزمني وبأرقام متسلسلة */
export async function importDrafts(drafts: EntryDraft[]): Promise<number> {
  for (const d of drafts) {
    const errs = validateDraft(d)
    if (errs.length) throw new Error(`قيد بتاريخ ${d.date}: ${errs.join('، ')}`)
  }
  const sorted = [...drafts].sort((a, b) => a.date.localeCompare(b.date) || (a.number ?? 0) - (b.number ?? 0))
  for (const d of sorted) await addEntry(d, 'import')
  return sorted.length
}

// ───────────────────────── الحسابات ─────────────────────────

export async function upsertAccount(a: Account) {
  const name = a.name.trim()
  if (!name) throw new Error('اسم الحساب مطلوب')
  if (state.accounts.some((x) => x.id !== a.id && x.name.trim() === name)) throw new Error('يوجد حساب بنفس الاسم')
  const acc = { ...a, name }
  await DB.putAccounts([acc])
  setState((s) => ({ accounts: sortAccounts([...s.accounts.filter((x) => x.id !== acc.id), acc]) }))
  onLocalChange?.()
}

// ───────────────────────── الإعدادات ─────────────────────────

export async function updateSettings(patch: Partial<Settings>) {
  const settings = { ...state.settings, ...patch }
  await DB.saveSettings(settings)
  setState({ settings })
}
