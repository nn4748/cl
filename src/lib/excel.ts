import { OPERATION_LABEL } from './accounts'
import { downloadBlob } from './backup'
import { byAccount, journalRows, type CashSet } from './calc'
import { toRiyal } from './money'
import type { Account, Entry } from './types'

/** تصدير تقرير إلى ملف Excel (ثلاث أوراق: الدفتر، القيود التفصيلية، ملخص الحسابات) */
export async function exportExcel(opts: {
  title: string
  entries: Entry[]
  accounts: Account[]
  cash: CashSet
  filename: string
}) {
  const XLSX = await import('xlsx')
  const accName = new Map(opts.accounts.map((a) => [a.id, a.name]))
  const rows = journalRows(opts.entries, opts.cash)

  const summary = [
    [opts.title],
    [],
    ['رقم القيد', 'التاريخ', 'البيان', 'نوع العملية', 'مدين', 'دائن', 'الرصيد'],
    ...rows.map((r) => [
      r.entry.number,
      r.entry.date,
      r.entry.description,
      OPERATION_LABEL[r.entry.type] ?? '',
      toRiyal(r.debit) || null,
      toRiyal(r.credit) || null,
      toRiyal(r.balance),
    ]),
    [],
    [
      'المجموع',
      '',
      '',
      '',
      toRiyal(rows.reduce((s, r) => s + r.debit, 0)),
      toRiyal(rows.reduce((s, r) => s + r.credit, 0)),
      toRiyal(rows.at(-1)?.balance ?? 0),
    ],
  ]

  const detailed: (string | number | null)[][] = [['رقم القيد', 'التاريخ', 'الحساب', 'التفاصيل', 'مدين', 'دائن', 'البيان']]
  for (const r of rows) {
    for (const l of r.entry.lines) {
      detailed.push([
        r.entry.number,
        r.entry.date,
        (l.credit > 0 ? 'إلى ح/ ' : 'من ح/ ') + (accName.get(l.accountId) ?? l.accountId),
        l.note ?? '',
        toRiyal(l.debit) || null,
        toRiyal(l.credit) || null,
        r.entry.description,
      ])
    }
  }

  const accSheet = [
    ['الحساب', 'مدين', 'دائن', 'الرصيد'],
    ...byAccount(opts.entries, opts.accounts).map((a) => [a.account.name, toRiyal(a.debit), toRiyal(a.credit), toRiyal(a.balance)]),
  ]

  const wb = XLSX.utils.book_new()
  wb.Workbook = { Views: [{ RTL: true }] }
  const s1 = XLSX.utils.aoa_to_sheet(summary)
  s1['!cols'] = [{ wch: 9 }, { wch: 12 }, { wch: 45 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }]
  const s2 = XLSX.utils.aoa_to_sheet(detailed)
  s2['!cols'] = [{ wch: 9 }, { wch: 12 }, { wch: 30 }, { wch: 60 }, { wch: 14 }, { wch: 14 }, { wch: 40 }]
  const s3 = XLSX.utils.aoa_to_sheet(accSheet)
  s3['!cols'] = [{ wch: 30 }, { wch: 14 }, { wch: 14 }, { wch: 14 }]
  for (const s of [s1, s2, s3]) numFmt(XLSX, s)
  XLSX.utils.book_append_sheet(wb, s1, 'دفتر اليومية')
  XLSX.utils.book_append_sheet(wb, s2, 'القيود التفصيلية')
  XLSX.utils.book_append_sheet(wb, s3, 'ملخص الحسابات')
  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  downloadBlob(new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), opts.filename)
}

function numFmt(XLSX: typeof import('xlsx'), ws: import('xlsx').WorkSheet) {
  const range = XLSX.utils.decode_range(ws['!ref'] ?? 'A1')
  for (let r = range.s.r; r <= range.e.r; r++) {
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = ws[XLSX.utils.encode_cell({ r, c })]
      if (cell && cell.t === 'n' && c > 0) cell.z = '#,##0.00'
    }
  }
}
