import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { Account, AuditRecord, Entry, Settings } from './types'

interface DaftarDB extends DBSchema {
  entries: { key: string; value: Entry; indexes: { by_number: number; by_sync: string } }
  accounts: { key: string; value: Account }
  audit: { key: string; value: AuditRecord; indexes: { by_entry: string } }
  kv: { key: string; value: unknown }
}

let dbp: Promise<IDBPDatabase<DaftarDB>> | null = null

export function db() {
  if (!dbp) {
    dbp = openDB<DaftarDB>('daftar-alhalal', 1, {
      upgrade(d) {
        const entries = d.createObjectStore('entries', { keyPath: 'id' })
        entries.createIndex('by_number', 'number')
        entries.createIndex('by_sync', 'sync')
        d.createObjectStore('accounts', { keyPath: 'id' })
        const audit = d.createObjectStore('audit', { keyPath: 'id' })
        audit.createIndex('by_entry', 'entryId')
        d.createObjectStore('kv')
      },
    })
  }
  return dbp
}

export async function getAllEntries(): Promise<Entry[]> {
  return (await db()).getAll('entries')
}

export async function getEntry(id: string): Promise<Entry | undefined> {
  return (await db()).get('entries', id)
}

/** يحفظ القيد وسجل التدقيق في معاملة واحدة — إما الاثنان أو لا شيء */
export async function putEntryWithAudit(entry: Entry, action: AuditRecord['action']): Promise<void> {
  const d = await db()
  const tx = d.transaction(['entries', 'audit'], 'readwrite')
  await tx.objectStore('entries').put(entry)
  await tx.objectStore('audit').put({
    id: crypto.randomUUID(),
    entryId: entry.id,
    at: new Date().toISOString(),
    action,
    snapshot: entry,
  })
  await tx.done
}

export async function putEntries(entries: Entry[]): Promise<void> {
  const d = await db()
  const tx = d.transaction('entries', 'readwrite')
  await Promise.all(entries.map((e) => tx.store.put(e)))
  await tx.done
}

export async function getAudit(entryId?: string): Promise<AuditRecord[]> {
  const d = await db()
  const all = entryId ? await d.getAllFromIndex('audit', 'by_entry', entryId) : await d.getAll('audit')
  return all.sort((a, b) => b.at.localeCompare(a.at))
}

export async function getAccounts(): Promise<Account[]> {
  return (await db()).getAll('accounts')
}

export async function putAccounts(accounts: Account[]): Promise<void> {
  const d = await db()
  const tx = d.transaction('accounts', 'readwrite')
  await Promise.all(accounts.map((a) => tx.store.put(a)))
  await tx.done
}

export async function getKV<T>(key: string): Promise<T | undefined> {
  return (await db()).get('kv', key) as Promise<T | undefined>
}

export async function setKV(key: string, value: unknown): Promise<void> {
  await (await db()).put('kv', value, key)
}

export const DEFAULT_SETTINGS: Settings = {
  businessName: 'مشروع الحلال',
  ownerName: '',
  supabaseUrl: (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? '',
  supabaseKey: (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? '',
  lastSyncAt: null,
  lastBackupAt: null,
}

export async function getSettings(): Promise<Settings> {
  const s = await getKV<Partial<Settings>>('settings')
  const merged = { ...DEFAULT_SETTINGS, ...s }
  if (!merged.supabaseUrl) merged.supabaseUrl = DEFAULT_SETTINGS.supabaseUrl
  if (!merged.supabaseKey) merged.supabaseKey = DEFAULT_SETTINGS.supabaseKey
  return merged
}

export async function saveSettings(s: Settings): Promise<void> {
  await setKV('settings', s)
}

/** يطلب من المتصفح عدم حذف بيانات التطبيق تلقائياً */
export async function requestPersistence(): Promise<boolean> {
  try {
    if (navigator.storage?.persisted && (await navigator.storage.persisted())) return true
    if (navigator.storage?.persist) return await navigator.storage.persist()
  } catch {
    /* غير مدعوم */
  }
  return false
}
