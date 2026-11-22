import { useEffect, useMemo, useState } from 'react'
import { normalizeArabic, OPERATION_LABEL, OPERATIONS } from '../lib/accounts'
import { cashSet, journalRows, type JournalRow } from '../lib/calc'
import { getAudit } from '../lib/db'
import { dayName, fmtDate } from '../lib/format'
import { formatSAR } from '../lib/money'
import { cloudEnabled, setDeleted, useApp } from '../lib/store'
import type { AuditRecord, Entry, OperationType } from '../lib/types'
import { IconEdit, IconRestore, IconSearch, IconSort, IconTrash } from '../ui/icons'
import { confirmDialog, go, Money, Sheet, toast, useRoute } from '../ui/kit'
import { opIcon } from './Dashboard'

export default function Journal() {
  const { entries, accounts } = useApp()
  const route = useRoute()
  const cash = useMemo(() => cashSet(accounts), [accounts])
  const accName = useMemo(() => new Map(accounts.map((a) => [a.id, a.name])), [accounts])

  const [q, setQ] = useState('')
  const [type, setType] = useState<OperationType | ''>('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [order, setOrder] = useState<'desc' | 'asc'>('desc')
  const [detailed, setDetailed] = useState(false)
  const [showDeleted, setShowDeleted] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const openId = route.params.get('open')

  // الرصيد التراكمي يُحسب على كامل الدفتر بالترتيب الزمني، ثم نصفّي العرض
  const allRows = useMemo(() => journalRows(entries, cash), [entries, cash])
  const deletedRows: JournalRow[] = useMemo(
    () => (showDeleted ? entries.filter((e) => e.deleted).map((entry) => ({ entry, debit: 0, credit: 0, balance: NaN })) : []),
    [entries, showDeleted],
  )

  const rows = useMemo(() => {
    const nq = normalizeArabic(q)
    const list = [...allRows, ...deletedRows].filter(({ entry: e }) => {
      if (type && e.type !== type) return false
      if (from && e.date < from) return false
      if (to && e.date > to) return false
      if (nq) {
        const hay = normalizeArabic(
          [e.description, String(e.number), e.date, fmtDate(e.date), ...e.lines.map((l) => `${accName.get(l.accountId) ?? ''} ${l.note ?? ''} ${l.debit / 100} ${l.credit / 100}`)].join(' '),
        )
        if (!nq.split(' ').every((w) => hay.includes(w))) return false
      }
      return true
    })
    list.sort((a, b) => a.entry.date.localeCompare(b.entry.date) || a.entry.number - b.entry.number)
    if (order === 'desc') list.reverse()
    return list
  }, [allRows, deletedRows, q, type, from, to, order, accName])

  const sum = rows.reduce((s, r) => ({ d: s.d + r.debit, c: s.c + r.credit }), { d: 0, c: 0 })
  const filtersActive = !!(type || from || to)
  const open = openId ? entries.find((e) => e.id === openId) : undefined

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">دفتر اليومية</h1>
          <p className="page-sub">
            {rows.length} قيد{filtersActive || q ? ' (بعد التصفية)' : ''}
          </p>
        </div>
        <div className="tabs no-print" style={{ margin: 0 }}>
          <button className={!detailed ? 'on' : ''} onClick={() => setDetailed(false)}>
            مختصر
          </button>
          <button className={detailed ? 'on' : ''} onClick={() => setDetailed(true)}>
            تفصيلي
          </button>
        </div>
      </div>

      <div className="toolbar no-print">
        <div className="search">
          <IconSearch />
          <input className="input" type="search" placeholder="ابحث في البيان، الحساب، رقم القيد، المبلغ…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="filters">
          <button className={`chip chip-sm ${showFilters || filtersActive ? 'on' : ''}`} onClick={() => setShowFilters(!showFilters)}>
            تصفية{filtersActive ? ' •' : ''}
          </button>
          <button className="chip chip-sm" onClick={() => setOrder(order === 'desc' ? 'asc' : 'desc')}>
            <IconSort width={16} height={16} /> {order === 'desc' ? 'الأحدث أولاً' : 'الأقدم أولاً'}
          </button>
          <button className={`chip chip-sm ${showDeleted ? 'on' : ''}`} onClick={() => setShowDeleted(!showDeleted)}>
            القيود الملغاة
          </button>
          {filtersActive && (
            <button
              className="chip chip-sm"
              onClick={() => {
                setType('')
                setFrom('')
                setTo('')
              }}
            >
              مسح التصفية ✕
            </button>
          )}
        </div>
        {showFilters && (
          <div className="card" style={{ padding: 14 }}>
            <div className="grid grid-2">
              <label>
                <span className="label">من تاريخ</span>
                <input className="input input-sm" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
              </label>
              <label>
                <span className="label">إلى تاريخ</span>
                <input className="input input-sm" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
              </label>
            </div>
            <label style={{ display: 'block', marginTop: 10 }}>
              <span className="label">نوع العملية</span>
              <select className="select select-sm" value={type} onChange={(e) => setType(e.target.value as OperationType | '')}>
                <option value="">كل الأنواع</option>
                {OPERATIONS.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
                <option value="compound">قيد مركب</option>
              </select>
            </label>
          </div>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="card empty">
          <div className="big">🔍</div>
          <h3>لا توجد قيود</h3>
          <p>{entries.length ? 'لا توجد نتائج مطابقة للبحث أو التصفية' : 'ابدأ بإضافة أول قيد'}</p>
          {!entries.length && (
            <button className="btn btn-primary" onClick={() => go('/add')}>
              إضافة قيد
            </button>
          )}
        </div>
      ) : (
        <>
          {/* جوال: بطاقات */}
          <div className="entry-cards only-mobile">
            {rows.map((r) => (
              <EntryCard key={r.entry.id} r={r} onOpen={() => go(`/journal?open=${r.entry.id}`, false)} />
            ))}
            <div className="card">
              <div className="kv">
                <dt>مجموع المدين</dt>
                <dd>
                  <Money v={sum.d} />
                </dd>
                <dt>مجموع الدائن</dt>
                <dd>
                  <Money v={sum.c} />
                </dd>
              </div>
            </div>
          </div>

          {/* شاشة كبيرة: جدول تقليدي */}
          <div className="table-wrap only-desktop">
            <JournalTable rows={rows} detailed={detailed} accName={accName} sum={sum} onOpen={(id) => go(`/journal?open=${id}`, false)} />
          </div>
        </>
      )}

      <EntrySheet entry={open} onClose={() => go('/journal', false)} accName={accName} cashBalance={allRows.find((r) => r.entry.id === openId)} />
    </div>
  )
}

function EntryCard({ r, onOpen }: { r: JournalRow; onOpen: () => void }) {
  const e = r.entry
  const isIn = r.credit > r.debit
  return (
    <div className={`entry-card ${e.deleted ? 'deleted' : ''}`} onClick={onOpen}>
      <span className="entry-num">{e.number}</span>
      <span className="desc">
        {opIcon(e)} {e.description}
      </span>
      <span className={`amt ${isIn ? 'credit' : 'debit'}`}>
        {e.deleted ? 'ملغي' : `${isIn ? '+' : ''}${formatSAR(isIn ? r.credit : r.debit)}`}
      </span>
      <span className="meta">
        <span>
          {fmtDate(e.date)} · {OPERATION_LABEL[e.type]}
          {e.flagged && ' · ⚠︎'}
          {e.sync !== 'synced' && cloudEnabled() && ' · ⏳'}
        </span>
        {!e.deleted && (
          <span>
            الرصيد <span className="money">{formatSAR(r.balance)}</span>
          </span>
        )}
      </span>
    </div>
  )
}

export function JournalTable({
  rows,
  detailed,
  accName,
  sum,
  onOpen,
}: {
  rows: JournalRow[]
  detailed: boolean
  accName: Map<string, string>
  sum: { d: number; c: number }
  onOpen?: (id: string) => void
}) {
  return (
    <table className="journal">
      <thead>
        <tr>
          <th style={{ width: 70 }}>رقم القيد</th>
          <th style={{ width: 110 }}>التاريخ</th>
          <th>البيان</th>
          <th className="n" style={{ width: 120 }}>
            مدين
          </th>
          <th className="n" style={{ width: 120 }}>
            دائن
          </th>
          <th className="n" style={{ width: 130 }}>
            الرصيد
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => {
          const e = r.entry
          if (!detailed) {
            return (
              <tr key={e.id} className={e.deleted ? 'deleted' : ''} onClick={() => onOpen?.(e.id)}>
                <td>
                  <span className="entry-num">{e.number}</span>
                  {e.flagged && <span title={e.flagNote}> ⚠︎</span>}
                </td>
                <td className="num">
                  {fmtDate(e.date)}
                  <div className="muted small">{dayName(e.date)}</div>
                </td>
                <td>
                  {e.description}
                  <div className="muted small">
                    {OPERATION_LABEL[e.type]}
                    {e.sync !== 'synced' && cloudEnabled() && ' · بانتظار المزامنة'}
                    {e.deleted && ' · ملغي'}
                  </div>
                </td>
                <td className="n money">{r.debit ? formatSAR(r.debit) : ''}</td>
                <td className="n money">{r.credit ? formatSAR(r.credit) : ''}</td>
                <td className="n money" style={{ fontWeight: 600 }}>
                  {Number.isNaN(r.balance) ? '' : formatSAR(r.balance)}
                </td>
              </tr>
            )
          }
          // عرض تفصيلي على طريقة الدفتر الورقي: من ح/ … إلى ح/ …
          const debits = e.lines.filter((l) => l.debit > 0)
          const credits = e.lines.filter((l) => l.credit > 0)
          const all = [...debits, ...credits]
          return [
            ...all.map((l, i) => (
              <tr key={e.id + i} className={`sub ${e.deleted ? 'deleted' : ''}`} onClick={() => onOpen?.(e.id)}>
                {i === 0 ? (
                  <>
                    <td rowSpan={all.length + 1}>
                      <span className="entry-num">{e.number}</span>
                      {e.flagged && <span title={e.flagNote}> ⚠︎</span>}
                    </td>
                    <td rowSpan={all.length + 1} className="num">
                      {fmtDate(e.date)}
                      <div className="muted small">{dayName(e.date)}</div>
                    </td>
                  </>
                ) : null}
                <td className={l.debit ? 'acc-from' : 'acc-to'}>
                  {l.debit ? 'من ح/ ' : 'إلى ح/ '}
                  {accName.get(l.accountId) ?? l.accountId}
                  {l.note && <span className="line-note">{l.note}</span>}
                </td>
                <td className="n money">{l.debit ? formatSAR(l.debit) : ''}</td>
                <td className="n money">{l.credit ? formatSAR(l.credit) : ''}</td>
                <td />
              </tr>
            )),
            <tr key={e.id + 'd'} className={`sub sub-last ${e.deleted ? 'deleted' : ''}`} onClick={() => onOpen?.(e.id)}>
              <td className="muted small">({e.description})</td>
              <td />
              <td />
              <td className="n money" style={{ fontWeight: 600 }}>
                {Number.isNaN(r.balance) ? '' : formatSAR(r.balance)}
              </td>
            </tr>,
          ]
        })}
      </tbody>
      <tfoot>
        <tr>
          <td colSpan={3}>المجموع</td>
          <td className="n money">{formatSAR(detailed ? rows.reduce((s, r) => s + r.entry.lines.reduce((x, l) => x + (r.entry.deleted ? 0 : l.debit), 0), 0) : sum.d)}</td>
          <td className="n money">{formatSAR(detailed ? rows.reduce((s, r) => s + r.entry.lines.reduce((x, l) => x + (r.entry.deleted ? 0 : l.credit), 0), 0) : sum.c)}</td>
          <td className="n money">{formatSAR(sum.d - sum.c)}</td>
        </tr>
      </tfoot>
    </table>
  )
}

function EntrySheet({
  entry,
  onClose,
  accName,
  cashBalance,
}: {
  entry?: Entry
  onClose: () => void
  accName: Map<string, string>
  cashBalance?: JournalRow
}) {
  const [history, setHistory] = useState<AuditRecord[] | null>(null)
  useEffect(() => setHistory(null), [entry?.id])

  if (!entry) return <Sheet open={false} onClose={onClose}>{null}</Sheet>
  const e = entry

  const del = async () => {
    const ok = await confirmDialog({
      title: `إلغاء القيد رقم ${e.number}؟`,
      body: 'سيُستبعد القيد من جميع الحسابات والتقارير. يبقى محفوظاً في السجل ويمكن استرجاعه لاحقاً، ولن يُعاد استخدام رقمه.',
      confirm: 'نعم، إلغاء القيد',
      danger: true,
    })
    if (!ok) return
    await setDeleted(e.id, true)
    toast(`تم إلغاء القيد رقم ${e.number}`, 'ok', { label: 'تراجع', run: () => void setDeleted(e.id, false) })
    onClose()
  }

  return (
    <Sheet open onClose={onClose} title={`قيد رقم ${e.number}${e.deleted ? ' — ملغي' : ''}`}>
      <p className="muted" style={{ marginTop: 0 }}>
        {dayName(e.date)} {fmtDate(e.date)} · {OPERATION_LABEL[e.type]}
      </p>
      <div className="card" style={{ padding: 14 }}>
        <div style={{ fontWeight: 700, marginBottom: 10 }}>{e.description}</div>
        {[...e.lines].sort((a, b) => b.debit - a.debit).map((l, i) => (
          <div key={i} className="row" style={{ padding: '7px 0', borderTop: i ? '1px solid var(--line-2)' : 0, alignItems: 'flex-start' }}>
            <div style={{ flex: 1, paddingInlineStart: l.credit ? 22 : 0 }}>
              <div style={{ fontWeight: 600 }}>
                {l.debit ? 'من ح/ ' : 'إلى ح/ '}
                {accName.get(l.accountId) ?? l.accountId}
              </div>
              {l.note && <div className="muted small">{l.note}</div>}
            </div>
            <div className={`amt ${l.debit ? 'debit' : 'credit'}`}>{formatSAR(l.debit || l.credit)}</div>
          </div>
        ))}
      </div>

      {e.flagged && (
        <div className="notice" style={{ marginTop: 12 }}>
          <b>يحتاج تأكيد: </b>
          {e.flagNote || 'بدون ملاحظة'}
        </div>
      )}

      <dl className="kv" style={{ margin: '14px 4px' }}>
        {cashBalance && !e.deleted && (
          <>
            <dt>الرصيد بعد القيد</dt>
            <dd>
              <Money v={cashBalance.balance} />
            </dd>
          </>
        )}
        <dt>المزامنة</dt>
        <dd>
          {e.sync === 'synced' ? (
            <span className="badge ok">متزامن</span>
          ) : e.sync === 'conflict' ? (
            <span className="badge err">تعارض — راجع الإعدادات</span>
          ) : cloudEnabled() ? (
            <span className="badge pending">محفوظ على الجهاز — بانتظار الإرسال</span>
          ) : (
            <span className="badge">محفوظ على هذا الجهاز</span>
          )}
        </dd>
        <dt>آخر تعديل</dt>
        <dd className="num">{new Date(e.updatedAt).toLocaleString('ar-SA-u-nu-latn', { dateStyle: 'medium', timeStyle: 'short' })}</dd>
        {e.source === 'import' && (
          <>
            <dt>المصدر</dt>
            <dd>مستورد من الدفتر</dd>
          </>
        )}
      </dl>

      <div className="grid grid-2">
        {e.deleted ? (
          <button
            className="btn btn-primary"
            onClick={async () => {
              await setDeleted(e.id, false)
              toast(`تم استرجاع القيد رقم ${e.number}`)
            }}
          >
            <IconRestore /> استرجاع القيد
          </button>
        ) : (
          <button className="btn btn-primary" onClick={() => go(`/add?edit=${e.id}`)}>
            <IconEdit /> تعديل
          </button>
        )}
        {!e.deleted && (
          <button className="btn btn-danger" onClick={del}>
            <IconTrash /> حذف
          </button>
        )}
      </div>
      <button className="btn btn-ghost btn-sm" style={{ width: '100%', marginTop: 8 }} onClick={async () => setHistory(await getAudit(e.id))}>
        سجل التعديلات
      </button>
      {history && (
        <ul className="list small">
          {history.map((h) => (
            <li key={h.id} className="list-item" style={{ cursor: 'default' }}>
              <div className="list-main">
                <b>{{ create: 'إنشاء', update: 'تعديل', delete: 'إلغاء', restore: 'استرجاع', conflict: 'تعارض' }[h.action]}</b> —{' '}
                {h.snapshot.description} · <span className="money">{formatSAR(h.snapshot.lines.reduce((s, l) => s + l.debit, 0))}</span>
              </div>
              <span className="muted num">{new Date(h.at).toLocaleString('ar-SA-u-nu-latn', { dateStyle: 'short', timeStyle: 'short' })}</span>
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  )
}
