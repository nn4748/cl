import { useMemo, useRef, useState } from 'react'
import { CASH_ID, guessOperation, matchAccount } from '../lib/accounts'
import { fmtDate } from '../lib/format'
import { formatSAR } from '../lib/money'
import type { PdfExtraction } from '../lib/pdfImport'
import { ORIGINAL_JOURNAL, ORIGINAL_NOTES, ORIGINAL_TOTAL_HALALA } from '../lib/seed'
import { importDrafts, useApp, validateDraft, type EntryDraft } from '../lib/store'
import type { Account, Entry } from '../lib/types'
import { IconCheck, IconFile, IconUpload } from '../ui/icons'
import { confirmDialog, go, toast } from '../ui/kit'
import LinesEditor, { linesToRows, rowsToLines, rowTotals, type LineRow } from '../ui/LinesEditor'

interface ReviewItem {
  key: string
  include: boolean
  number: number | null
  date: string
  description: string
  rows: LineRow[]
  warnings: string[]
  flagged: boolean
  flagNote: string
  duplicate?: number
}

function findDuplicate(entries: Entry[], date: string, total: number): number | undefined {
  return entries.find((e) => !e.deleted && e.date === date && e.lines.reduce((s, l) => s + l.debit, 0) === total)?.number
}

function fromDrafts(drafts: EntryDraft[], existing: Entry[]): ReviewItem[] {
  return drafts.map((d) => {
    const total = d.lines.reduce((s, l) => s + l.debit, 0)
    const dup = findDuplicate(existing, d.date, total)
    return {
      key: crypto.randomUUID(),
      include: !dup,
      number: d.number ?? null,
      date: d.date,
      description: d.description,
      rows: linesToRows(d.lines),
      warnings: [...(d.flagged ? ['عليه علامة * في الدفتر الأصلي'] : []), ...(dup ? [`يبدو مكرراً مع القيد رقم ${dup} الموجود`] : [])],
      flagged: !!d.flagged,
      flagNote: d.flagNote ?? '',
      duplicate: dup,
    }
  })
}

function fromPdf(x: PdfExtraction, accounts: Account[], existing: Entry[]): ReviewItem[] {
  return x.entries.map((p) => {
    const warnings = [...p.warnings]
    const rows: LineRow[] = p.lines.map((l) => {
      const acc = l.accountName ? matchAccount(l.accountName, accounts) : undefined
      if (l.accountName && !acc) warnings.push(`الحساب «${l.accountName}» غير موجود — اختر حساباً`)
      if (!l.accountName) warnings.push('لم يُحدد اسم الحساب — اختر حساباً')
      return {
        key: crypto.randomUUID(),
        accountId: acc?.id ?? '',
        side: l.side,
        amount: String(l.amount / 100),
        note: l.note,
      }
    })
    // إن وُجد طرف واحد فقط، نقترح الصندوق كطرف مقابل
    const t = rowTotals(rows)
    if (rows.length && (t.d === 0 || t.c === 0)) {
      const amt = Math.max(t.d, t.c)
      rows.push({ key: crypto.randomUUID(), accountId: CASH_ID, side: t.d ? 'credit' : 'debit', amount: String(amt / 100), note: '' })
      warnings.push('أُضيف «الصندوق» كطرف مقابل — تأكد منه')
    }
    const dup = p.date ? findDuplicate(existing, p.date, Math.max(t.d, t.c)) : undefined
    if (dup) warnings.push(`يبدو مكرراً مع القيد رقم ${dup} الموجود`)
    return {
      key: crypto.randomUUID(),
      include: !dup,
      number: p.number,
      date: p.date ?? '',
      description: p.description,
      rows,
      warnings,
      flagged: p.marked,
      flagNote: p.marked ? 'عليه علامة * في الدفتر الأصلي — يحتاج تأكيد' : '',
      duplicate: dup,
    }
  })
}

function toDraft(it: ReviewItem): EntryDraft {
  const lines = rowsToLines(it.rows)
  const debits = lines.filter((l) => l.debit > 0)
  const credit = lines.find((l) => l.credit > 0)
  return {
    number: it.number ?? undefined,
    date: it.date,
    description: it.description,
    type: debits.length > 1 ? 'compound' : guessOperation(debits[0]?.accountId ?? '', credit?.accountId ?? ''),
    lines,
    flagged: it.flagged,
    flagNote: it.flagNote,
  }
}

export default function ImportPage() {
  const { accounts, entries } = useApp()
  const [items, setItems] = useState<ReviewItem[] | null>(null)
  const [source, setSource] = useState<{ name: string; statedTotal: number | null; notes: string[]; pages: string[] } | null>(null)
  const [busy, setBusy] = useState(false)
  const [showPages, setShowPages] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const loadBuiltin = () => {
    setItems(fromDrafts(ORIGINAL_JOURNAL, entries))
    setSource({ name: 'دفتر اليومية — مشروع الحلال (7 سبتمبر – 14 نوفمبر 2026)', statedTotal: ORIGINAL_TOTAL_HALALA, notes: ORIGINAL_NOTES, pages: [] })
  }

  const loadPdf = async (f: File) => {
    setBusy(true)
    try {
      const { extractFromPdf } = await import('../lib/pdfImport')
      const x = await extractFromPdf(f)
      if (!x.textFound) {
        toast('الملف صورة ممسوحة بدون نص — لا يمكن قراءته تلقائياً بدقة. أدخل القيود يدوياً.', 'err')
        setSource({ name: f.name, statedTotal: null, notes: ['الملف مصوّر (بخط اليد أو سكانر). القراءة الآلية للخط اليدوي غير دقيقة، لذلك لا نستورد منه تلقائياً حفاظاً على صحة الأرقام. استخدم الصور أدناه كمرجع وأضف القيود من «إضافة قيد».'], pages: x.pageImages })
        setItems([])
        setShowPages(true)
        return
      }
      const list = fromPdf(x, accounts, entries)
      if (!list.length) toast('لم يُعثر على قيود بصيغة دفتر اليومية في الملف', 'err')
      setItems(list)
      setSource({ name: f.name, statedTotal: x.statedTotal?.debit ?? null, notes: x.warnings, pages: x.pageImages })
    } catch (e) {
      toast('تعذر قراءة الملف: ' + (e as Error).message, 'err')
    } finally {
      setBusy(false)
    }
  }

  const included = items?.filter((i) => i.include) ?? []
  const validation = useMemo(() => new Map((items ?? []).map((i) => [i.key, validateDraft(toDraft(i), accounts)])), [items, accounts])
  const invalidCount = included.filter((i) => validation.get(i.key)!.length).length
  const totalAll = (items ?? []).reduce((s, i) => s + rowTotals(i.rows).d, 0)
  const totalIncluded = included.reduce((s, i) => s + rowTotals(i.rows).d, 0)

  const update = (key: string, patch: Partial<ReviewItem>) => setItems((list) => list!.map((i) => (i.key === key ? { ...i, ...patch } : i)))

  const approve = async () => {
    if (invalidCount) return toast(`يوجد ${invalidCount} قيد يحتاج تصحيح قبل الاعتماد`, 'err')
    const ok = await confirmDialog({
      title: `اعتماد واستيراد ${included.length} قيد؟`,
      body: (
        <>
          إجمالي المبالغ: <b className="money">{formatSAR(totalIncluded)}</b> ريال.
          <br />
          ستأخذ القيود أرقاماً تسلسلية جديدة تبدأ من {Math.max(0, ...entries.map((e) => e.number)) + 1} حسب التاريخ.
        </>
      ),
      confirm: 'اعتماد واستيراد',
    })
    if (!ok) return
    setBusy(true)
    try {
      const n = await importDrafts(included.map(toDraft))
      toast(`تم استيراد ${n} قيد بنجاح`)
      go('/journal')
    } catch (e) {
      toast((e as Error).message, 'err')
    } finally {
      setBusy(false)
    }
  }

  if (!items) {
    return (
      <div>
        <div className="page-head">
          <div>
            <h1 className="page-title">استيراد دفتر اليومية</h1>
            <p className="page-sub">لن يُستورد أي قيد قبل مراجعتك واعتمادك</p>
          </div>
        </div>
        <div className="grid grid-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
          <button className="card" style={{ border: 0, textAlign: 'right', cursor: 'pointer' }} onClick={() => fileRef.current?.click()} disabled={busy}>
            <div className="list-ico" style={{ marginBottom: 10 }}>
              <IconUpload width={22} />
            </div>
            <div style={{ fontWeight: 700, color: 'var(--walnut)', fontSize: 17 }}>{busy ? 'جارِ قراءة الملف…' : 'رفع ملف PDF'}</div>
            <p className="muted small" style={{ marginBottom: 0 }}>
              يُقرأ الملف على جهازك فقط. يستخرج رقم القيد، التاريخ، البيان، المدين والدائن ثم يعرضها للمراجعة.
            </p>
          </button>
          <button className="card" style={{ border: 0, textAlign: 'right', cursor: 'pointer' }} onClick={loadBuiltin}>
            <div className="list-ico" style={{ marginBottom: 10 }}>
              <IconFile width={22} />
            </div>
            <div style={{ fontWeight: 700, color: 'var(--walnut)', fontSize: 17 }}>دفتر مشروع الحلال الأصلي</div>
            <p className="muted small" style={{ marginBottom: 0 }}>
              14 قيداً من 7 سبتمبر إلى 14 نوفمبر 2026 بإجمالي {formatSAR(ORIGINAL_TOTAL_HALALA)} ريال — منقولة ومُطابقة مع الملف، مع ملاحظات البنود التي تحتاج تأكيد.
            </p>
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/pdf,.pdf"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0]
            e.target.value = ''
            if (f) void loadPdf(f)
          }}
        />
      </div>
    )
  }

  const statedMatches = source?.statedTotal != null && source.statedTotal === totalAll

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">مراجعة القيود قبل الاستيراد</h1>
          <p className="page-sub">{source?.name}</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => setItems(null)}>
          رجوع
        </button>
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="grid grid-2 grid-4">
          <div>
            <div className="muted small">القيود المستخرجة</div>
            <b className="num" style={{ fontSize: 20 }}>{items.length}</b>
          </div>
          <div>
            <div className="muted small">المحددة للاستيراد</div>
            <b className="num" style={{ fontSize: 20 }}>{included.length}</b>
          </div>
          <div>
            <div className="muted small">المجموع المستخرج</div>
            <b className="money" style={{ fontSize: 20 }}>{formatSAR(totalAll)}</b>
          </div>
          <div>
            <div className="muted small">المجموع في الملف</div>
            <b className="money" style={{ fontSize: 20 }}>{source?.statedTotal != null ? formatSAR(source.statedTotal) : '—'}</b>
          </div>
        </div>
        {source?.statedTotal != null && (
          <div className={`balance-bar ${statedMatches ? 'ok' : 'bad'}`} style={{ marginTop: 12 }}>
            {statedMatches ? 'المجموع المستخرج مطابق لمجموع الدفتر ✓' : `المجموع لا يطابق الملف — الفرق ${formatSAR(Math.abs(totalAll - source.statedTotal))}. راجع القيود قبل الاعتماد.`}
          </div>
        )}
        {source && source.notes.length > 0 && (
          <div className="notice" style={{ marginTop: 12 }}>
            <ul style={{ margin: 0, paddingInlineStart: 18 }}>
              {source.notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          </div>
        )}
        {source && source.pages.length > 0 && (
          <button className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={() => setShowPages(!showPages)}>
            {showPages ? 'إخفاء صفحات الملف' : 'عرض صفحات الملف للمقارنة'}
          </button>
        )}
        {showPages && source && (
          <div className="thumbs" style={{ marginTop: 10 }}>
            {source.pages.map((src, i) => (
              <a key={i} href={src} target="_blank" rel="noreferrer">
                <img src={src} alt={`صفحة ${i + 1}`} />
              </a>
            ))}
          </div>
        )}
      </div>

      <div className="stack">
        {items.map((it) => {
          const errs = validation.get(it.key)!
          return (
            <div key={it.key} className={`card review-entry ${it.warnings.length || errs.length ? 'has-warn' : ''} ${it.include ? '' : 'excluded'}`}>
              <div className="row" style={{ marginBottom: 10 }}>
                <input type="checkbox" className="check" checked={it.include} onChange={(e) => update(it.key, { include: e.target.checked })} aria-label="تضمين القيد" />
                <b style={{ color: 'var(--walnut)' }}>قيد {it.number ?? '؟'} في الدفتر</b>
                <span className="muted small">{it.date ? fmtDate(it.date) : 'بدون تاريخ'}</span>
                <span className="spacer" />
                <span className="money" style={{ fontWeight: 700 }}>
                  {formatSAR(rowTotals(it.rows).d)}
                </span>
              </div>
              {it.include && (
                <>
                  <div className="grid grid-2">
                    <label>
                      <span className="label">التاريخ</span>
                      <input className="input input-sm" type="date" value={it.date} onChange={(e) => update(it.key, { date: e.target.value })} />
                    </label>
                    <label>
                      <span className="label">البيان</span>
                      <input className="input input-sm" value={it.description} onChange={(e) => update(it.key, { description: e.target.value })} />
                    </label>
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <LinesEditor rows={it.rows} setRows={(rows) => update(it.key, { rows })} accounts={accounts} />
                  </div>
                  {it.flagged && (
                    <label style={{ display: 'block', marginTop: 10 }}>
                      <span className="label">ملاحظة المراجعة</span>
                      <textarea className="textarea" style={{ minHeight: 60, fontSize: 14 }} value={it.flagNote} onChange={(e) => update(it.key, { flagNote: e.target.value })} />
                    </label>
                  )}
                </>
              )}
              {(it.warnings.length > 0 || (it.include && errs.length > 0)) && (
                <div className={it.include && errs.length ? 'errors' : 'notice'} style={{ marginTop: 10, marginBottom: 0 }}>
                  {[...it.warnings, ...(it.include ? errs : [])].map((w) => (
                    <div key={w}>• {w}</div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {items.length > 0 && (
        <div className="save-bar">
          <button className="btn btn-primary btn-lg" onClick={approve} disabled={busy || !included.length}>
            <IconCheck /> اعتماد واستيراد {included.length} قيد
          </button>
        </div>
      )}
    </div>
  )
}
