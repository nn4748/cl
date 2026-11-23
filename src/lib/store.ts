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

// ───────────── تصحيحات الأب على الدفتر ─────────────

const sumDebit = (e: Entry) => e.lines.reduce((s, l) => s + l.debit, 0)

/** القيد 1 الأصلي بصيغته المجمّعة (276,066 بتاريخ 7 سبتمبر) */
export function findCombinedEntry1(entries: Entry[] = state.entries): Entry | undefined {
  return entries.find(
    (e) => !e.deleted && e.date === '2026-09-07' && sumDebit(e) === 276_066_00 && e.lines.some((l) => l.accountId === 'livestock' && l.debit === 198_000_00),
  )
}

/** قيد «باقي التجهيز» الذي فيه 50,000 زائدة في قيمة الحلال */
export function findExtra50k(entries: Entry[] = state.entries): Entry | undefined {
  return entries.find((e) => !e.deleted && e.date === '2026-09-07' && e.lines.some((l) => l.accountId === 'livestock' && l.debit === 50_000_00))
}

export function hasAhmed1000(entries: Entry[] = state.entries): boolean {
  return entries.some((e) => !e.deleted && e.date >= '2026-11-15' && e.lines.some((l) => l.accountId === 'wages' && l.debit === 1_000_00) && e.description.includes('أحمد'))
}

/** مفتاح مقارنة: التاريخ + مجموع كل حساب — يطابق القيد نفسه مهما اختلف تفصيل أسطره */
function accountKey(date: string, lines: EntryLine[]) {
  const m = new Map<string, number>()
  for (const l of lines) m.set(l.accountId, (m.get(l.accountId) ?? 0) + l.debit - l.credit)
  return date + '|' + [...m.entries()].filter(([, v]) => v !== 0).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}:${v}`).join(',')
}

/** قيود موجودة على الجهاز بصيغة مجمّعة ولها نسخة مفصّلة (كل صنف بسطر) بنفس الأرقام */
export async function findDetailUpgrades(entries: Entry[] = state.entries): Promise<{ entry: Entry; draft: EntryDraft }[]> {
  const { ORIGINAL_JOURNAL } = await import('./seed')
  const byKey = new Map(ORIGINAL_JOURNAL.map((d) => [accountKey(d.date, d.lines), d]))
  const out: { entry: Entry; draft: EntryDraft }[] = []
  for (const e of entries) {
    if (e.deleted) continue
    const d = byKey.get(accountKey(e.date, e.lines))
    if (d && d.lines.length > e.lines.length) out.push({ entry: e, draft: d })
  }
  return out
}

export interface Correction {
  id: 'split' | 'extra50k' | 'ahmed' | 'detail'
  title: string
  detail: string
}

export function pendingCorrections(entries: Entry[] = state.entries, dismissed: string[] = []): Correction[] {
  const out: Correction[] = []
  if (findCombinedEntry1(entries))
    out.push({
      id: 'split',
      title: 'تفصيل القيد 1 على تواريخ أغسطس وتصحيح قيمة الحلال',
      detail: 'عربون 5,000 (12/8) · تحويل 97,420 (13/8) · 34 رأس 45,580 (27/8) · والباقي في 7/9. قيمة الحلال تصير 148,000 بدل 198,000.',
    })
  else if (findExtra50k(entries))
    out.push({ id: 'extra50k', title: 'تصحيح قيمة الحلال', detail: 'حذف 50,000 الزائدة: قيمة الحلال 102,420 + 45,580 = 148,000 وليست 198,000.' })
  if (!hasAhmed1000(entries) && !dismissed.includes('ahmed') && entries.length > 0)
    out.push({ id: 'ahmed', title: 'حساب أحمد 1,000 ريال', detail: 'من 10 جمادى الآخرة إلى 10 رجب 1448 (يُسجّل بتاريخ 20 نوفمبر).' })
  return out
}

/** حذف سطر الـ 50,000 من قيد مع تعديل الصندوق المقابل — القيد يبقى متوازناً */
function without50k(e: Entry): EntryDraft {
  let removed = false
  const lines = e.lines
    .filter((l) => {
      if (!removed && l.accountId === 'livestock' && l.debit === 50_000_00) {
        removed = true
        return false
      }
      return true
    })
    .map((l) => (l.accountId === 'cash' && l.credit > 0 ? { ...l, credit: l.credit - 50_000_00 } : l))
  return { date: e.date, description: e.description.replace('، باقي قيمة الحلال', '').replace('باقي تجهيز المشروع', 'تجهيز المشروع'), type: e.type, lines, flagged: e.flagged, flagNote: e.flagNote }
}

export async function applyCorrections(ids: Correction['id'][]): Promise<number> {
  const seed = await import('./seed')
  let n = 0
  if (ids.includes('split')) {
    const e1 = findCombinedEntry1()
    if (e1) {
      await updateEntry(e1.id, { ...seed.AUGUST_REMAINDER, number: undefined })
      for (const d of seed.AUGUST_SPLIT) await addEntry({ ...d, number: undefined }, 'import')
      n += 1
    }
  }
  if (ids.includes('extra50k')) {
    const e = findExtra50k()
    if (e) {
      await updateEntry(e.id, without50k(e))
      n += 1
    }
  }
  if (ids.includes('detail')) {
    for (const { entry, draft } of await findDetailUpgrades()) {
      await updateEntry(entry.id, { ...draft, number: undefined, flagged: entry.flagged || draft.flagged, flagNote: entry.flagNote || draft.flagNote })
      n += 1
    }
  }
  if (ids.includes('ahmed') && !hasAhmed1000()) {
    await addEntry({ ...seed.AHMED_1000, number: undefined })
    n += 1
  }
  return n
}

/** للتوافق: تطبيق تفصيل أغسطس فقط */
export async function applyAugustSplit(): Promise<number> {
  if (!findCombinedEntry1()) return 0
  await applyCorrections(['split'])
  return 4
}
