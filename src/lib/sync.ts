import type { SupabaseClient } from '@supabase/supabase-js'
import * as DB from './db'
import { getState, reloadEntries, setLocalChangeHandler, setState, updateSettings } from './store'
import type { Account, Entry } from './types'

/**
 * محرك المزامنة (اختياري — يعمل فقط عند ربط Supabase من الإعدادات)
 *
 * ضمانات سلامة البيانات:
 * 1. كل قيد له معرّف UUID يُولَّد على الجهاز → إعادة الإرسال لا تُنشئ قيداً مكرراً.
 * 2. رقم القيد عليه قيد UNIQUE في الخادم → لو جهازان استخدما نفس الرقم وهما بدون إنترنت،
 *    يُعاد ترقيم القيد الأحدث إلى الرقم التالي المتاح (لا يُكتب فوق قيد موجود أبداً).
 * 3. التعديل يُرسل بشرط أن نسخة الخادم لم تتغير منذ آخر مزامنة (updated_at)،
 *    وإلا يُعلَّم القيد "تعارض" ويُحفظ كلا النسختين في سجل التدقيق لاختيار المستخدم.
 * 4. لا يُحذف شيء نهائياً: الحذف ناعم (deleted = true).
 * 5. القيود المحلية لا تُعتبر "متزامنة" إلا بعد تأكيد الخادم.
 */

let client: SupabaseClient | null = null
let clientKey = ''
let running = false
let rerun = false
let timer: ReturnType<typeof setInterval> | null = null

export function isConfigured() {
  const s = getState().settings
  return Boolean(s.supabaseUrl && s.supabaseKey)
}

export async function getClient(): Promise<SupabaseClient | null> {
  const { supabaseUrl, supabaseKey } = getState().settings
  if (!supabaseUrl || !supabaseKey) return null
  const key = supabaseUrl + '|' + supabaseKey
  if (client && clientKey === key) return client
  const { createClient } = await import('@supabase/supabase-js')
  client = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: true, autoRefreshToken: true, storageKey: 'daftar-alhalal-auth' },
  })
  clientKey = key
  return client
}

export function resetClient() {
  client = null
  clientKey = ''
}

export async function signIn(email: string, password: string) {
  const c = await getClient()
  if (!c) throw new Error('أدخل بيانات Supabase أولاً')
  const { error } = await c.auth.signInWithPassword({ email, password })
  if (error) throw new Error(translateAuthError(error.message))
  await syncNow()
}

export async function signUp(email: string, password: string) {
  const c = await getClient()
  if (!c) throw new Error('أدخل بيانات Supabase أولاً')
  const { data, error } = await c.auth.signUp({ email, password })
  if (error) throw new Error(translateAuthError(error.message))
  if (!data.session) return 'تم إنشاء الحساب، افتح بريدك لتأكيده ثم سجّل الدخول'
  await syncNow()
  return 'تم إنشاء الحساب وتسجيل الدخول'
}

export async function signOut() {
  const c = await getClient()
  await c?.auth.signOut()
  setState((s) => ({ sync: { ...s.sync, status: 'signed_out', message: undefined } }))
}

export async function currentUserEmail(): Promise<string | null> {
  const c = await getClient()
  if (!c) return null
  const { data } = await c.auth.getSession()
  return data.session?.user.email ?? null
}

function translateAuthError(m: string) {
  if (/invalid login/i.test(m)) return 'البريد أو كلمة المرور غير صحيحة'
  if (/email not confirmed/i.test(m)) return 'البريد لم يتم تأكيده بعد'
  if (/password/i.test(m) && /6/.test(m)) return 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'
  if (/fetch/i.test(m)) return 'تعذر الاتصال بالخادم'
  return m
}

// ───────────── تحويل بين شكل التطبيق وشكل الجدول ─────────────

interface Row {
  id: string
  number: number
  date: string
  description: string
  type: string
  lines: Entry['lines']
  flagged: boolean
  flag_note: string | null
  deleted: boolean
  created_at: string
  updated_at: string
  source: string | null
}

function toRow(e: Entry): Row {
  return {
    id: e.id,
    number: e.number,
    date: e.date,
    description: e.description,
    type: e.type,
    lines: e.lines,
    flagged: !!e.flagged,
    flag_note: e.flagNote ?? null,
    deleted: !!e.deleted,
    created_at: e.createdAt,
    updated_at: e.updatedAt,
    source: e.source ?? null,
  }
}

function fromRow(r: Row): Entry {
  return {
    id: r.id,
    number: r.number,
    date: r.date,
    description: r.description,
    type: r.type as Entry['type'],
    lines: r.lines,
    flagged: r.flagged || undefined,
    flagNote: r.flag_note ?? undefined,
    deleted: r.deleted || undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    serverUpdatedAt: r.updated_at,
    sync: 'synced',
    source: (r.source as Entry['source']) ?? undefined,
  }
}

const sameInstant = (a?: string | null, b?: string | null) => !!a && !!b && Date.parse(a) === Date.parse(b)

function sameContent(a: Entry, b: Entry) {
  return (
    a.date === b.date &&
    a.description === b.description &&
    a.type === b.type &&
    !!a.deleted === !!b.deleted &&
    !!a.flagged === !!b.flagged &&
    JSON.stringify(a.lines.map((l) => [l.accountId, l.debit, l.credit, l.note ?? ''])) ===
      JSON.stringify(b.lines.map((l) => [l.accountId, l.debit, l.credit, l.note ?? '']))
  )
}

// ───────────────────────── المزامنة ─────────────────────────

export async function syncNow(): Promise<void> {
  if (running) {
    rerun = true
    return
  }
  if (!isConfigured()) {
    setState((s) => ({ sync: { ...s.sync, status: 'local', message: undefined } }))
    return
  }
  if (!navigator.onLine) {
    setState((s) => ({ sync: { ...s.sync, status: 'offline', message: undefined } }))
    return
  }
  running = true
  try {
    const c = await getClient()
    if (!c) return
    const { data: sess } = await c.auth.getSession()
    if (!sess.session) {
      setState((s) => ({ sync: { ...s.sync, status: 'signed_out', message: 'سجّل الدخول لتفعيل المزامنة' } }))
      return
    }
    setState((s) => ({ sync: { ...s.sync, status: 'syncing', message: undefined } }))
    await pushAccounts(c)
    await pushEntries(c)
    await pullEntries(c)
    await pullAccounts(c)
    await reloadEntries()
    await updateSettings({ lastSyncAt: new Date().toISOString() })
    const conflicts = getState().entries.filter((e) => e.sync === 'conflict').length
    setState((s) => ({
      sync: {
        ...s.sync,
        status: conflicts ? 'error' : 'synced',
        message: conflicts ? `يوجد ${conflicts} قيد معدّل من جهاز آخر يحتاج مراجعتك` : undefined,
      },
    }))
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    setState((s) => ({
      sync: { ...s.sync, status: navigator.onLine ? 'error' : 'offline', message: friendly(msg) },
    }))
  } finally {
    running = false
    if (rerun) {
      rerun = false
      void syncNow()
    }
  }
}

function friendly(m: string) {
  if (/relation .* does not exist|schema cache/i.test(m)) return 'جداول قاعدة البيانات غير موجودة، شغّل ملف supabase/schema.sql'
  if (/fetch|network/i.test(m)) return 'تعذر الاتصال، سيعاد المحاولة تلقائياً'
  if (/JWT|auth/i.test(m)) return 'انتهت الجلسة، سجّل الدخول مجدداً'
  return m
}

async function pushAccounts(c: SupabaseClient) {
  const accounts = await DB.getAccounts()
  if (!accounts.length) return
  const { error } = await c
    .from('accounts')
    .upsert(accounts.map((a) => ({ id: a.id, name: a.name, kind: a.kind, archived: !!a.archived })), { onConflict: 'id' })
  if (error) throw new Error(error.message)
}

async function pullAccounts(c: SupabaseClient) {
  const { data, error } = await c.from('accounts').select('id,name,kind,archived')
  if (error) throw new Error(error.message)
  const local = new Map((await DB.getAccounts()).map((a) => [a.id, a]))
  const add: Account[] = []
  for (const r of data as Account[]) if (!local.has(r.id)) add.push({ ...r, archived: r.archived || undefined })
  if (add.length) {
    await DB.putAccounts(add)
    setState((s) => ({ accounts: [...s.accounts, ...add] }))
  }
}

async function maxServerNumber(c: SupabaseClient): Promise<number> {
  const { data, error } = await c.from('entries').select('number').order('number', { ascending: false }).limit(1)
  if (error) throw new Error(error.message)
  return (data?.[0]?.number as number | undefined) ?? 0
}

async function pushEntries(c: SupabaseClient) {
  const pending = (await DB.getAllEntries()).filter((e) => e.sync === 'pending').sort((a, b) => a.number - b.number)
  for (const local of pending) {
    // نقرأ النسخة الحالية من الخادم بالمعرّف
    const { data: existing, error: selErr } = await c.from('entries').select('*').eq('id', local.id).maybeSingle()
    if (selErr) throw new Error(selErr.message)

    if (!existing) {
      await insertWithNumbering(c, local)
      continue
    }

    const server = existing as Row
    // القيد موجود: هل نسخة الخادم هي نفس آخر نسخة عرفناها؟
    const serverUnchanged = sameInstant(server.updated_at, local.serverUpdatedAt)
    // (إذا وصل الإرسال السابق للخادم لكن الرد ضاع، يكون المحتوى مطابقاً)
    const alreadyIdentical = sameInstant(server.updated_at, local.updatedAt) || sameContent(fromRow(server), local)
    if (alreadyIdentical) {
      await markSynced(local, server.updated_at, server.number)
      continue
    }
    if (!serverUnchanged) {
      // تعديل من جهاز آخر — لا نكتب فوقه
      await markConflict(local, fromRow(server))
      continue
    }
    const row = toRow({ ...local, number: server.number })
    const { data: upd, error: updErr } = await c
      .from('entries')
      .update({ ...row, id: undefined, number: undefined, created_at: undefined })
      .eq('id', local.id)
      .eq('updated_at', server.updated_at)
      .select('updated_at')
    if (updErr) throw new Error(updErr.message)
    if (!upd || upd.length === 0) {
      // تغيّر في نفس اللحظة من جهاز آخر
      const { data: again } = await c.from('entries').select('*').eq('id', local.id).maybeSingle()
      if (again) await markConflict(local, fromRow(again as Row))
      continue
    }
    await markSynced({ ...local, number: server.number }, upd[0].updated_at as string, server.number)
  }
}

async function insertWithNumbering(c: SupabaseClient, local: Entry) {
  let entry = local
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await c.from('entries').insert(toRow(entry)).select('updated_at,number')
    if (!error) {
      await markSynced(entry, data[0].updated_at as string, data[0].number as number)
      return
    }
    if (error.code === '23505') {
      // تكرار: إما المعرّف (أُرسل سابقاً) أو رقم القيد (استُخدم من جهاز آخر)
      const { data: byId } = await c.from('entries').select('*').eq('id', entry.id).maybeSingle()
      if (byId) {
        const r = byId as Row
        await markSynced(entry, r.updated_at, r.number)
        return
      }
      const localMax = Math.max(0, ...(await DB.getAllEntries()).map((e) => e.number))
      const newNumber = Math.max(await maxServerNumber(c), localMax) + 1
      entry = {
        ...entry,
        number: newNumber,
        flagged: true,
        flagNote: `أُعيد ترقيم القيد من ${local.number} إلى ${newNumber} لأن الرقم استُخدم من جهاز آخر`,
      }
      await DB.putEntryWithAudit(entry, 'update')
      continue
    }
    throw new Error(error.message)
  }
  throw new Error('تعذر حجز رقم للقيد')
}

async function markSynced(entry: Entry, serverUpdatedAt: string, number: number) {
  // نتأكد أن المستخدم لم يعدّل القيد أثناء الإرسال
  const cur = await DB.getEntry(entry.id)
  if (cur && cur.updatedAt !== entry.updatedAt) {
    await DB.putEntries([{ ...cur, number, serverUpdatedAt }])
    return
  }
  await DB.putEntries([{ ...entry, number, serverUpdatedAt, updatedAt: serverUpdatedAt, sync: 'synced' }])
}

async function markConflict(local: Entry, server: Entry) {
  await DB.putEntryWithAudit({ ...local, sync: 'conflict' }, 'conflict')
  await DB.setKV(`conflict:${local.id}`, server)
}

export async function getConflictServerVersion(id: string): Promise<Entry | undefined> {
  return DB.getKV<Entry>(`conflict:${id}`)
}

/** حل التعارض: keep = 'mine' (أرسل نسختي) أو 'theirs' (اعتمد نسخة الجهاز الآخر) */
export async function resolveConflict(id: string, keep: 'mine' | 'theirs') {
  const local = await DB.getEntry(id)
  const server = await getConflictServerVersion(id)
  if (!local || !server) return
  if (keep === 'theirs') {
    await DB.putEntryWithAudit({ ...server, sync: 'synced' }, 'update')
  } else {
    await DB.putEntryWithAudit({ ...local, number: server.number, serverUpdatedAt: server.updatedAt, sync: 'pending' }, 'update')
  }
  await DB.setKV(`conflict:${id}`, undefined)
  await reloadEntries()
  await syncNow()
}

async function pullEntries(c: SupabaseClient) {
  const rows: Row[] = []
  const page = 1000
  for (let from = 0; ; from += page) {
    const { data, error } = await c.from('entries').select('*').order('number').range(from, from + page - 1)
    if (error) throw new Error(error.message)
    rows.push(...(data as Row[]))
    if (!data || data.length < page) break
  }
  const local = new Map((await DB.getAllEntries()).map((e) => [e.id, e]))
  const toPut: Entry[] = []
  for (const r of rows) {
    const l = local.get(r.id)
    if (!l) {
      toPut.push(fromRow(r))
      continue
    }
    if (l.sync === 'synced' && !sameInstant(l.updatedAt, r.updated_at)) toPut.push(fromRow(r))
    // القيود المحلية المعلّقة أو المتعارضة لا تُستبدل أبداً هنا
  }
  if (toPut.length) await DB.putEntries(toPut)
}

// ───────────────────────── التشغيل التلقائي ─────────────────────────

let debounce: ReturnType<typeof setTimeout> | null = null

export function startSyncEngine() {
  setLocalChangeHandler(() => {
    if (debounce) clearTimeout(debounce)
    debounce = setTimeout(() => void syncNow(), 800)
  })
  const onOnline = () => {
    setState({ online: true })
    void syncNow()
  }
  const onOffline = () => {
    setState((s) => ({ online: false, sync: { ...s.sync, status: isConfigured() ? 'offline' : 'local' } }))
  }
  window.addEventListener('online', onOnline)
  window.addEventListener('offline', onOffline)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void syncNow()
  })
  if (timer) clearInterval(timer)
  timer = setInterval(() => void syncNow(), 60_000)
  void syncNow()
}
