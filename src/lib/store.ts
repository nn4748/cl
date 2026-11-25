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

/** العربون 5,000 والتحويل 97,420 مسجلان كقيدين — والصحيح بند واحد 102,420 (أول صفقة) */
function findDeposit(entries: Entry[] = state.entries) {
  const dep = entries.find((e) => !e.deleted && e.date === '2026-08-12' && e.lines.some((l) => l.accountId === 'livestock' && l.debit === 5_000_00) && e.lines.filter((l) => l.debit > 0).length === 1)
  const transfer = entries.find((e) => !e.deleted && e.date === '2026-08-13' && e.lines.some((l) => l.accountId === 'livestock' && l.debit === 97_420_00))
  return dep && transfer ? { dep, transfer } : undefined
}

/** 55 و 350 يوم 11 نوفمبر — طلب الأب حذفها */
function find405(entries: Entry[] = state.entries): Entry | undefined {
  return entries.find(
    (e) =>
      !e.deleted &&
      e.date === '2026-11-11' &&
      e.lines.reduce((s, l) => s + l.debit, 0) === 405_00 &&
      e.lines.every((l) => l.debit === 0 || l.accountId === 'wages'),
  )
}

/** أكتوبر: حذف مكافأة أحمد 250 وجوال العامل الإثيوبي 115 (طلب الأب) */
function findOctRemovals(entries: Entry[] = state.entries): Entry[] {
  return entries.filter(
    (e) => !e.deleted && (e.date === '2026-10-25' || e.date === '2026-10-30') && e.lines.some((l) => /الإثيوبي|مكافأة أحمد/.test(l.note ?? '')),
  )
}

const isSalary1000 = (e: Entry, date: string) => !e.deleted && e.date === date && e.lines.some((l) => l.accountId === 'wages' && l.debit === 1_000_00)

/** الصيغ القديمة لراتبي 10/6 و 10/7 في نوفمبر: «راتبين» بسطرين، أو «حساب أحمد 1,000» */
function findNovSalaries(entries: Entry[] = state.entries): Entry | undefined {
  return entries.find(
    (e) =>
      !e.deleted &&
      e.date >= '2026-11-15' &&
      (e.description.includes('راتبين') || e.description.includes('حساب أحمد')) &&
      e.lines.some((l) => l.accountId === 'wages' && l.debit === 1_000_00),
  )
}

export function hasAhmed1000(entries: Entry[] = state.entries): boolean {
  return entries.some((e) => isSalary1000(e, '2026-06-10')) && entries.some((e) => isSalary1000(e, '2026-07-10')) && !findNovSalaries(entries)
}

/** هل أرقام القيود لا تتبع ترتيب التواريخ؟ */
export function numbersOutOfOrder(entries: Entry[] = state.entries): boolean {
  const byDate = (a: Entry, b: Entry) => a.date.localeCompare(b.date) || a.number - b.number
  const sorted = [...entries.filter((e) => !e.deleted).sort(byDate), ...entries.filter((e) => e.deleted).sort(byDate)]
  return sorted.some((e, i) => e.number !== i + 1)
}

/** إعادة ترقيم القيود 1، 2، 3… حسب التاريخ (فقط إن لم تكن مرفوعة لقاعدة بيانات سحابية) */
export async function renumberByDate(): Promise<number> {
  const all = await DB.getAllEntries()
  if (all.some((e) => e.serverUpdatedAt)) throw new Error('القيود مرفوعة للمزامنة السحابية، لا يمكن تغيير أرقامها')
  const byDate = (a: Entry, b: Entry) => a.date.localeCompare(b.date) || a.number - b.number || a.createdAt.localeCompare(b.createdAt)
  // القيود الفعّالة أولاً بالتسلسل، والملغاة بعدها حتى لا تترك فراغات في الأرقام
  const sorted = [...all.filter((e) => !e.deleted).sort(byDate), ...all.filter((e) => e.deleted).sort(byDate)]
  let changed = 0
  for (let i = 0; i < sorted.length; i++) {
    const e = sorted[i]
    if (e.number === i + 1) continue
    await DB.putEntryWithAudit({ ...e, number: i + 1, updatedAt: new Date().toISOString() }, 'update')
    changed++
  }
  await reloadEntries()
  return changed
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
    if (!d) continue
    const sameShape =
      d.lines.length === e.lines.length &&
      d.lines.every((l, i) => l.accountId === e.lines[i].accountId && l.debit === e.lines[i].debit && l.credit === e.lines[i].credit)
    const notesDiffer = sameShape && d.lines.some((l, i) => (l.note ?? '') !== (e.lines[i].note ?? ''))
    if (d.lines.length > e.lines.length || (e.source === 'import' && notesDiffer)) out.push({ entry: e, draft: d })
  }
  return out
}

export interface Correction {
  id: 'split' | 'extra50k' | 'merge' | 'ahmed' | 'drop405' | 'detail' | 'dropOct' | 'aug' | 'order'
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
  if (findDeposit(entries))
    out.push({ id: 'merge', title: 'أول صفقة حلال بند واحد 102,420', detail: 'العربون 5,000 والتحويل 97,420 يصيرون بند واحد «قيمة أول صفقة» 102,420 بتاريخ 13 أغسطس.' })
  if (!hasAhmed1000(entries) && !dismissed.includes('ahmed') && entries.length > 0)
    out.push({ id: 'ahmed', title: 'راتب العامل في شهوره', detail: 'راتب 1,000 يوم 10 يونيو وراتب 1,000 يوم 10 يوليو، وتنحذف من نوفمبر.' })
  if (find405(entries)) out.push({ id: 'drop405', title: 'حذف 55 و 350 (11 نوفمبر)', detail: 'مصروف العامل يوم 11 نوفمبر (405) ينحذف حسب طلب الأب.' })
  if (findOctRemovals(entries).length)
    out.push({ id: 'dropOct', title: 'أكتوبر: حذف مكافأة أحمد وجوال العامل الإثيوبي', detail: 'تنحذف مكافأة أحمد 250 (30 أكتوبر) وجوال العامل الإثيوبي 115 (25 أكتوبر).' })
  if (entries.length > 0 && !entries.some((e) => !e.deleted && e.date.startsWith('2026-08') && e.lines.some((l) => l.accountId === 'wages' && /راتب/.test(l.note ?? ''))))
    out.push({ id: 'aug', title: 'راتب العامل شهر 8', detail: 'إضافة راتب 1,000 بتاريخ 10 أغسطس.' })
  const willChange = out.some((c) => c.id === 'split' || c.id === 'ahmed' || c.id === 'merge' || c.id === 'drop405' || c.id === 'dropOct' || c.id === 'aug')
  if ((willChange || numbersOutOfOrder(entries)) && !entries.some((e) => e.serverUpdatedAt))
    out.push({ id: 'order', title: 'ترتيب الأرقام حسب التاريخ', detail: 'القيود تترقم 1، 2، 3… من الأقدم للأحدث.' })
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
  if (ids.includes('merge')) {
    const f = findDeposit()
    if (f) {
      const lines = f.transfer.lines.map((l) =>
        l.accountId === 'livestock' && l.debit === 97_420_00
          ? { ...l, debit: 102_420_00, note: 'قيمة أول صفقة حلال (عربون 5,000 يوم 12/8 + تحويل 97,420)' }
          : l.accountId === 'cash' && l.credit > 0
            ? { ...l, credit: l.credit + 5_000_00 }
            : l,
      )
      await updateEntry(f.transfer.id, { date: f.transfer.date, description: 'أول صفقة حلال + أعلاف وعلاج', type: f.transfer.type, lines, flagged: f.transfer.flagged, flagNote: f.transfer.flagNote })
      await setDeleted(f.dep.id, true)
      n += 1
    }
  }
  if (ids.includes('drop405')) {
    const e = find405()
    if (e) {
      await setDeleted(e.id, true)
      n += 1
    }
  }
  if (ids.includes('detail')) {
    for (const { entry, draft } of await findDetailUpgrades()) {
      await updateEntry(entry.id, { ...draft, number: undefined, flagged: entry.flagged || draft.flagged, flagNote: entry.flagNote || draft.flagNote })
      n += 1
    }
  }
  if (ids.includes('dropOct')) {
    const { ORIGINAL_JOURNAL } = await import('./seed')
    for (const e of findOctRemovals()) {
      const d = ORIGINAL_JOURNAL.find((x) => x.date === e.date)
      if (d) await updateEntry(e.id, { ...d, number: undefined, flagged: e.flagged || d.flagged, flagNote: e.flagNote || d.flagNote })
    }
    n += 1
  }
  if (ids.includes('aug') && !state.entries.some((e) => !e.deleted && e.date === '2026-08-10' && e.lines.some((l) => l.accountId === 'wages'))) {
    await addEntry({ ...seed.SALARY_AUG, number: undefined })
    n += 1
  }
  if (ids.includes('ahmed') && !hasAhmed1000()) {
    const nov = findNovSalaries()
    // نحوّل القيد الموجود في نوفمبر إلى راتب يونيو (بدل حذفه) ثم نضيف يوليو — بدون تكرار
    if (nov) await updateEntry(nov.id, { ...seed.SALARY_JUNE, number: undefined })
    else if (!state.entries.some((e) => isSalary1000(e, '2026-06-10'))) await addEntry({ ...seed.SALARY_JUNE, number: undefined })
    if (!state.entries.some((e) => isSalary1000(e, '2026-07-10'))) await addEntry({ ...seed.SALARY_JULY, number: undefined })
    n += 1
  }
  if (ids.includes('order') && numbersOutOfOrder()) {
    await renumberByDate()
    n += 1
  }
  return n
}

/** للتوافق: تطبيق تفصيل أغسطس فقط */
export async function applyAugustSplit(): Promise<number> {
  if (!findCombinedEntry1()) return 0
  await applyCorrections(['split'])
  return 3
}
