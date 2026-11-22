import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FakeServer } from './fakeSupabase'

let server: FakeServer

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => server.client(),
}))

/** يفتح "جهازاً" جديداً: قاعدة IndexedDB مستقلة ونسخة جديدة من وحدات التطبيق */
async function device() {
  vi.resetModules()
  globalThis.indexedDB = new IDBFactory()
  const store = await import('../src/lib/store')
  const sync = await import('../src/lib/sync')
  await store.loadAll()
  await store.updateSettings({ supabaseUrl: 'https://fake.supabase.co', supabaseKey: 'anon' })
  const idb = globalThis.indexedDB
  // كل استدعاء يعيد تفعيل قاعدة بيانات هذا الجهاز
  const use = () => {
    globalThis.indexedDB = idb
  }
  return { store, sync, use }
}

const feed = (riyal: number, description = 'أعلاف', date = '2026-11-20') => ({
  date,
  description,
  type: 'feed' as const,
  lines: [
    { accountId: 'feed', debit: riyal * 100, credit: 0 },
    { accountId: 'cash', debit: 0, credit: riyal * 100 },
  ],
})

function setOnline(v: boolean) {
  Object.defineProperty(navigator, 'onLine', { value: v, configurable: true })
  server.online = v
}

beforeEach(() => {
  server = new FakeServer()
  setOnline(true)
})

describe('المزامنة', () => {
  it('ترسل القيود المحفوظة بدون إنترنت عند عودة الاتصال', async () => {
    const a = await device()
    setOnline(false)
    await a.store.addEntry(feed(100))
    await a.store.addEntry(feed(200))
    await a.sync.syncNow()
    expect(server.tables.entries).toHaveLength(0)
    expect(a.store.getState().sync.pending).toBe(2)

    setOnline(true)
    await a.sync.syncNow()
    expect(server.tables.entries).toHaveLength(2)
    expect(a.store.getState().entries.every((e) => e.sync === 'synced')).toBe(true)
    expect(a.store.getState().sync.pending).toBe(0)
  })

  it('لا تكرر القيد إذا ضاع رد الخادم بعد الحفظ', async () => {
    const a = await device()
    await a.store.addEntry(feed(150))
    server.dropNextWriteResponse = true
    await a.sync.syncNow() // الخادم حفظ لكن الجهاز لم يستلم التأكيد
    expect(server.tables.entries).toHaveLength(1)
    expect(a.store.getState().entries[0].sync).toBe('pending')

    await a.sync.syncNow() // إعادة المحاولة
    expect(server.tables.entries).toHaveLength(1)
    expect(a.store.getState().entries[0].sync).toBe('synced')
  })

  it('جهازان بدون إنترنت استخدما نفس الرقم: يُعاد ترقيم الثاني ولا يُكتب فوق الأول', async () => {
    const a = await device()
    const b = await device()
    setOnline(false)
    a.use()
    await a.store.addEntry(feed(100, 'من جهاز الأب'))
    b.use()
    await b.store.addEntry(feed(999, 'من جهاز الابن'))
    expect(a.store.getState().entries[0].number).toBe(1)
    expect(b.store.getState().entries[0].number).toBe(1)

    setOnline(true)
    a.use()
    await a.sync.syncNow()
    b.use()
    await b.sync.syncNow()

    const rows = server.tables.entries as { number: number; description: string }[]
    expect(rows.map((r) => r.number).sort()).toEqual([1, 2])
    expect(rows.find((r) => r.number === 1)!.description).toBe('من جهاز الأب')
    const bEntry = b.store.getState().entries.find((e) => e.description === 'من جهاز الابن')!
    expect(bEntry.number).toBe(2)
    expect(bEntry.flagged).toBe(true)
    // الجهاز الثاني استلم قيد الجهاز الأول
    expect(b.store.getState().entries).toHaveLength(2)

    a.use()
    await a.sync.syncNow()
    expect(a.store.getState().entries.map((e) => e.number).sort()).toEqual([1, 2])
  })

  it('تعديل نفس القيد من جهازين: لا يُكتب فوق تعديل الآخر ويُعلَّم تعارضاً', async () => {
    const a = await device()
    const e = await a.store.addEntry(feed(100))
    await a.sync.syncNow()
    const b = await device()
    b.use()
    await b.sync.syncNow()
    expect(b.store.getState().entries).toHaveLength(1)

    a.use()
    await a.store.updateEntry(e.id, feed(120, 'تعديل الأب'))
    await a.sync.syncNow()

    b.use()
    await b.store.updateEntry(e.id, feed(130, 'تعديل الابن'))
    await b.sync.syncNow()

    const row = server.tables.entries[0] as { description: string }
    expect(row.description).toBe('تعديل الأب')
    expect(b.store.getState().entries[0].sync).toBe('conflict')

    await b.sync.resolveConflict(e.id, 'mine')
    await b.sync.syncNow()
    expect((server.tables.entries[0] as { description: string }).description).toBe('تعديل الابن')
    expect(server.tables.entries).toHaveLength(1)
  })

  it('الحذف ناعم ويُزامن كعلامة وليس حذفاً', async () => {
    const a = await device()
    const e = await a.store.addEntry(feed(100))
    await a.sync.syncNow()
    await a.store.setDeleted(e.id, true)
    await a.sync.syncNow()
    expect(server.tables.entries).toHaveLength(1)
    expect((server.tables.entries[0] as { deleted: boolean }).deleted).toBe(true)
  })
})

describe('التخزين المحلي', () => {
  it('الأرقام تسلسلية ولا يعاد استخدام رقم قيد ملغي', async () => {
    const a = await device()
    const e1 = await a.store.addEntry(feed(1))
    await a.store.addEntry(feed(2))
    await a.store.setDeleted(e1.id, true)
    const e3 = await a.store.addEntry(feed(3))
    expect(e3.number).toBe(3)
  })

  it('يرفض القيد غير المتوازن', async () => {
    const a = await device()
    await expect(
      a.store.addEntry({ ...feed(1), lines: [{ accountId: 'feed', debit: 100, credit: 0 }, { accountId: 'cash', debit: 0, credit: 90 }] }),
    ).rejects.toThrow(/غير متوازن/)
  })

  it('الاسترجاع من نسخة احتياطية لا يكرر ولا يستبدل', async () => {
    const a = await device()
    await a.store.addEntry(feed(10))
    const backup = await import('../src/lib/backup')
    const file = JSON.stringify(await backup.createBackup())
    const r1 = await backup.restoreBackup(file)
    expect(r1.added).toBe(0)
    expect(r1.skippedSame).toBe(1)

    // نسخة من جهاز آخر برقم مستخدم
    const b = await device()
    await b.store.addEntry(feed(77, 'من نسخة أخرى'))
    const other = JSON.stringify(await (await import('../src/lib/backup')).createBackup())
    a.use()
    const backupA = await import('../src/lib/backup')
    void backupA
    const r2 = await backup.restoreBackup(other)
    expect(r2.added).toBe(1)
    expect(r2.renumbered).toBe(1)
  })
})
