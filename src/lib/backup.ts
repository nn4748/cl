import * as DB from './db'
import { loadAll, nextNumber, updateSettings, validateDraft } from './store'
import type { Account, Entry } from './types'

export interface BackupFile {
  app: 'daftar-alhalal'
  version: 1
  exportedAt: string
  accounts: Account[]
  entries: Entry[]
}

export async function createBackup(): Promise<BackupFile> {
  return {
    app: 'daftar-alhalal',
    version: 1,
    exportedAt: new Date().toISOString(),
    accounts: await DB.getAccounts(),
    entries: (await DB.getAllEntries()).sort((a, b) => a.number - b.number),
  }
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

export async function downloadBackup() {
  const b = await createBackup()
  const stamp = b.exportedAt.slice(0, 16).replace(/[:T]/g, '-')
  const blob = new Blob([JSON.stringify(b, null, 2)], { type: 'application/json' })
  const file = new File([blob], `daftar-alhalal-backup-${stamp}.json`, { type: 'application/json' })
  // على الجوال: مشاركة الملف (حفظ في الملفات / واتساب / البريد)
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean }
  if (nav.canShare?.({ files: [file] }) && /iPhone|iPad|Android/i.test(navigator.userAgent)) {
    try {
      await navigator.share({ files: [file], title: 'نسخة احتياطية، دفتر الحلال' })
      await updateSettings({ lastBackupAt: new Date().toISOString() })
      return
    } catch (e) {
      if ((e as Error).name === 'AbortError') return
    }
  }
  downloadBlob(blob, file.name)
  await updateSettings({ lastBackupAt: new Date().toISOString() })
}

export interface RestoreReport {
  added: number
  skippedSame: number
  renumbered: number
  invalid: number
  accountsAdded: number
}

/**
 * الاسترجاع بطريقة "الدمج الآمن":
 * - لا يُكتب فوق أي قيد موجود أبداً (نفس المعرّف = يُتخطّى)
 * - إذا كان رقم القيد مستخدماً، يُعطى رقماً جديداً ويُعلَّم للمراجعة
 * - القيود غير المتوازنة تُرفض
 */
export async function restoreBackup(text: string): Promise<RestoreReport> {
  let data: BackupFile
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('الملف ليس نسخة احتياطية صالحة')
  }
  if (data?.app !== 'daftar-alhalal' || !Array.isArray(data.entries)) throw new Error('هذا الملف ليس نسخة احتياطية من دفتر الحلال')

  const report: RestoreReport = { added: 0, skippedSame: 0, renumbered: 0, invalid: 0, accountsAdded: 0 }

  const localAccounts = await DB.getAccounts()
  const accIds = new Set(localAccounts.map((a) => a.id))
  const newAccounts = (data.accounts ?? []).filter((a) => a?.id && a?.name && !accIds.has(a.id))
  if (newAccounts.length) {
    await DB.putAccounts(newAccounts)
    report.accountsAdded = newAccounts.length
  }
  const allAccounts = [...localAccounts, ...newAccounts]

  const existing = await DB.getAllEntries()
  const byId = new Set(existing.map((e) => e.id))
  const usedNumbers = new Set(existing.map((e) => e.number))
  const working = [...existing]

  for (const e of [...data.entries].sort((a, b) => a.number - b.number)) {
    if (!e?.id || byId.has(e.id)) {
      report.skippedSame++
      continue
    }
    if (validateDraft({ date: e.date, description: e.description ?? '', type: e.type, lines: e.lines ?? [] }, allAccounts).length) {
      report.invalid++
      continue
    }
    let entry: Entry = { ...e, sync: 'pending', serverUpdatedAt: null, source: 'restore' }
    if (usedNumbers.has(entry.number)) {
      const n = nextNumber(working)
      entry = { ...entry, number: n, flagged: true, flagNote: `أُعيد ترقيمه من ${e.number} إلى ${n} عند الاسترجاع` }
      report.renumbered++
    }
    await DB.putEntryWithAudit(entry, 'restore')
    working.push(entry)
    usedNumbers.add(entry.number)
    byId.add(entry.id)
    report.added++
  }
  await loadAll()
  return report
}
