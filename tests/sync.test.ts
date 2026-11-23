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

describe('تفصيل أوراق أغسطس', () => {
  it('يقسم القيد 1 ويصحح قيمة الحلال إلى 148,000', async () => {
    const a = await device()
    const L = (accountId: string, r: number) => ({ accountId, debit: r * 100, credit: 0 })
    const lines = [L('livestock', 198000), L('transport', 1800), L('rent', 10000), L('well', 18050), L('equipment', 3510), L('feed', 41706), L('vet', 3000)]
    await a.store.addEntry({ date: '2026-09-07', description: 'شراء الحلال وتجهيز المشروع', type: 'compound', lines: [...lines, { accountId: 'cash', debit: 0, credit: 27606600 }] }, 'import')
    const { byAccount, totals, cashSet } = await import('../src/lib/calc')
    const before = byAccount(a.store.getState().entries, a.store.getState().accounts).map((x) => [x.account.id, x.balance])
    expect(await a.store.applyAugustSplit()).toBe(4)
    const st = a.store.getState()
    expect(st.entries.filter((e) => !e.deleted)).toHaveLength(5)
    void before
    expect(totals(st.entries, cashSet(st.accounts)).debit).toBe(22606600)
    const bal = Object.fromEntries(byAccount(st.entries, st.accounts).map((x) => [x.account.id, x.balance / 100]))
    expect(bal).toMatchObject({ livestock: 148000, transport: 1800, rent: 10000, well: 18050, equipment: 3510, feed: 41706, vet: 3000, cash: -226066 })
    expect(a.store.findCombinedEntry1()).toBeUndefined()
    expect(await a.store.applyAugustSplit()).toBe(0)
  })
})

describe('تصحيح الـ 50,000 على جهاز طُبّق عليه التفصيل سابقاً', () => {
  it('يحذف السطر ويبقى القيد متوازناً، ويضيف حساب أحمد مرة واحدة', async () => {
    const a = await device()
    const L = (accountId: string, r: number) => ({ accountId, debit: r * 100, credit: 0 })
    const lines = [L('livestock', 50000), L('rent', 10000), L('well', 18050), L('equipment', 1430), L('vet', 875)]
    await a.store.addEntry({ date: '2026-09-07', description: 'باقي تجهيز المشروع (إيجار، بئر، باقي قيمة الحلال)', type: 'compound', lines: [...lines, { accountId: 'cash', debit: 0, credit: 8035500 }] }, 'import')
    const ids = a.store.pendingCorrections().map((c) => c.id)
    expect(ids).toEqual(['extra50k', 'ahmed'])
    await a.store.applyCorrections(ids)
    const st = a.store.getState()
    const e = st.entries.find((x) => x.date === '2026-09-07')!
    expect(e.lines.reduce((s, l) => s + l.debit, 0)).toBe(3035500)
    expect(e.lines.reduce((s, l) => s + l.credit, 0)).toBe(3035500)
    expect(st.entries.filter((x) => x.description.includes('أحمد'))).toHaveLength(1)
    expect(a.store.pendingCorrections()).toHaveLength(0)
  })
})

describe('جهاز الأب: الدفتر القديم (14 قيد مجمّع) ← بعد كل التصحيحات', () => {
  it('يطابق الدفتر المفصّل الجديد تماماً بدون تكرار', async () => {
    const a = await device()
    const old = await import('./fixtures/oldSeed')
    for (const d of old.ORIGINAL_JOURNAL) await a.store.addEntry({ ...d, number: undefined }, 'import')
    // تطبيق كما يفعل زر «مراجعة وتطبيق»
    await a.store.applyCorrections([...a.store.pendingCorrections().map((c) => c.id), 'detail'])
    const st = a.store.getState()
    const seed = await import('../src/lib/seed')
    const { byAccount, totals, cashSet } = await import('../src/lib/calc')
    const live = st.entries.filter((e) => !e.deleted)
    expect(live).toHaveLength(seed.ORIGINAL_JOURNAL.length)
    expect(totals(live, cashSet(st.accounts)).debit).toBe(seed.ORIGINAL_TOTAL_HALALA)
    const lineCount = (es: { lines: unknown[] }[]) => es.reduce((s, e) => s + e.lines.length, 0)
    expect(lineCount(live)).toBe(lineCount(seed.ORIGINAL_JOURNAL))
    const bal = Object.fromEntries(byAccount(live, st.accounts).map((x) => [x.account.id, x.balance / 100]))
    expect(bal).toMatchObject({ livestock: 148000, feed: 52569, wages: 6953, cash: -248938 })
    expect(await a.store.findDetailUpgrades()).toHaveLength(0)
    expect(a.store.pendingCorrections()).toHaveLength(0)
  })
})
