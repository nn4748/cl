import { useMemo, useState } from 'react'
import { active, byAccount, byDay, byMonth, cashSet, journalRows, type PeriodSum } from '../lib/calc'
import { exportExcel } from '../lib/excel'
import { fmtDate, fmtDateLong, fmtMonth, todayISO } from '../lib/format'
import { formatSAR } from '../lib/money'
import { useApp } from '../lib/store'
import { IconPrinter, IconSheet } from '../ui/icons'
import { go, Money, toast, useRoute } from '../ui/kit'
import { JournalTable } from './Journal'

type Tab = 'daily' | 'monthly' | 'annual' | 'detailed'
const TABS: { id: Tab; label: string }[] = [
  { id: 'daily', label: 'يومي' },
  { id: 'monthly', label: 'شهري' },
  { id: 'annual', label: 'سنوي' },
  { id: 'detailed', label: 'تفصيلي' },
]

export default function Reports() {
  const { entries, accounts, settings } = useApp()
  const route = useRoute()
  const cash = useMemo(() => cashSet(accounts), [accounts])
  const accName = useMemo(() => new Map(accounts.map((a) => [a.id, a.name])), [accounts])
  const live = useMemo(() => active(entries), [entries])
  const latest = useMemo(() => live.reduce((m, e) => (e.date > m ? e.date : m), ''), [live]) || todayISO()
  const earliest = useMemo(() => live.reduce((m, e) => (!m || e.date < m ? e.date : m), ''), [live]) || todayISO()
  const years = useMemo(() => [...new Set(live.map((e) => e.date.slice(0, 4)))].sort().reverse(), [live])

  const [tab, setTab] = useState<Tab>((route.params.get('tab') as Tab) || 'monthly')
  const [day, setDay] = useState(latest)
  const [month, setMonth] = useState(route.params.get('month') || latest.slice(0, 7))
  const [year, setYear] = useState(latest.slice(0, 4))
  const [from, setFrom] = useState(earliest)
  const [to, setTo] = useState(latest)

  const range = useMemo(() => {
    switch (tab) {
      case 'daily':
        return { from: day, to: day, title: `التقرير اليومي — ${fmtDateLong(day)}`, file: `daftar-alhalal-daily-${day}` }
      case 'monthly':
        return { from: `${month}-01`, to: `${month}-31`, title: `التقرير الشهري — ${fmtMonth(month)}`, file: `daftar-alhalal-monthly-${month}` }
      case 'annual':
        return { from: `${year}-01-01`, to: `${year}-12-31`, title: `التقرير السنوي — ${year}`, file: `daftar-alhalal-annual-${year}` }
      default:
        return { from, to, title: `تقرير القيود التفصيلي — من ${fmtDate(from)} إلى ${fmtDate(to)}`, file: `daftar-alhalal-detailed-${from}_${to}` }
    }
  }, [tab, day, month, year, from, to])

  const inPeriod = useMemo(() => live.filter((e) => e.date >= range.from && e.date <= range.to), [live, range])
  // الرصيد التراكمي من بداية الدفتر (رصيد أول المدة + حركة الفترة)
  const allRows = useMemo(() => journalRows(entries, cash), [entries, cash])
  const rows = allRows.filter((r) => r.entry.date >= range.from && r.entry.date <= range.to)
  const opening = allRows.filter((r) => r.entry.date < range.from).at(-1)?.balance ?? 0
  const sum = rows.reduce((s, r) => ({ d: s.d + r.debit, c: s.c + r.credit }), { d: 0, c: 0 })
  const accSums = byAccount(inPeriod, accounts).filter((a) => a.debit || a.credit)
  const breakdown: PeriodSum[] = tab === 'annual' ? byMonth(inPeriod, cash) : tab === 'monthly' ? byDay(inPeriod, cash) : []

  const printPdf = () => {
    const prev = document.title
    document.title = range.file
    window.print()
    setTimeout(() => (document.title = prev), 500)
  }

  const excel = async () => {
    try {
      await exportExcel({ title: `${settings.businessName} — ${range.title}`, entries: inPeriod, accounts, cash, filename: `${range.file}.xlsx` })
      toast('تم تصدير ملف Excel')
    } catch (e) {
      toast('تعذر التصدير: ' + (e as Error).message, 'err')
    }
  }

  return (
    <div>
      <div className="page-head no-print">
        <div>
          <h1 className="page-title">التقارير</h1>
          <p className="page-sub">اختر الفترة، ثم صدّر التقرير PDF أو Excel</p>
        </div>
      </div>

      <div className="tabs no-print">
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="card no-print" style={{ padding: 14, marginBottom: 14 }}>
        {tab === 'daily' && (
          <label>
            <span className="label">اليوم</span>
            <input className="input" type="date" value={day} onChange={(e) => setDay(e.target.value)} />
          </label>
        )}
        {tab === 'monthly' && (
          <label>
            <span className="label">الشهر</span>
            <input className="input" type="month" value={month} onChange={(e) => setMonth(e.target.value)} style={{ direction: 'ltr', textAlign: 'right' }} />
          </label>
        )}
        {tab === 'annual' && (
          <label>
            <span className="label">السنة</span>
            <select className="select" value={year} onChange={(e) => setYear(e.target.value)}>
              {(years.length ? years : [year]).map((y) => (
                <option key={y}>{y}</option>
              ))}
            </select>
          </label>
        )}
        {tab === 'detailed' && (
          <div className="grid grid-2">
            <label>
              <span className="label">من تاريخ</span>
              <input className="input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </label>
            <label>
              <span className="label">إلى تاريخ</span>
              <input className="input" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </label>
          </div>
        )}
        <div className="grid grid-2" style={{ marginTop: 12 }}>
          <button className="btn btn-primary" onClick={printPdf} disabled={!rows.length}>
            <IconPrinter /> تصدير PDF
          </button>
          <button className="btn btn-caramel" onClick={excel} disabled={!rows.length}>
            <IconSheet /> تصدير Excel
          </button>
        </div>
      </div>

      <div className="print-only" style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '2px solid #3b261c', paddingBottom: 8 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>دفتر الحلال — {settings.businessName}</div>
            <div style={{ fontSize: 15 }}>{range.title}</div>
          </div>
          <div style={{ fontSize: 12, color: '#666' }}>تاريخ الطباعة: {fmtDate(todayISO())} · المبالغ بالريال السعودي</div>
        </div>
      </div>

      <h2 className="card-title" style={{ fontSize: 18 }}>
        {range.title}
      </h2>

      <div className="grid grid-2 grid-4" style={{ marginBottom: 14 }}>
        <div className="stat">
          <div className="k">إجمالي المدين</div>
          <div className="v">
            <Money v={sum.d} />
          </div>
        </div>
        <div className="stat">
          <div className="k">إجمالي الدائن</div>
          <div className="v">
            <Money v={sum.c} />
          </div>
        </div>
        <div className="stat">
          <div className="k">رصيد الفترة</div>
          <div className="v">
            <Money v={sum.d - sum.c} />
          </div>
        </div>
        <div className="stat">
          <div className="k">عدد القيود</div>
          <div className="v num">{rows.length}</div>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="card empty">
          <div className="big">📄</div>
          <h3>لا توجد قيود في هذه الفترة</h3>
          <button className="btn btn-outline" onClick={() => go('/add')}>
            إضافة قيد
          </button>
        </div>
      ) : (
        <>
          {opening !== 0 && (
            <p className="muted small">
              رصيد أول المدة: <Money v={opening} /> · رصيد آخر المدة: <Money v={rows.at(-1)!.balance} />
            </p>
          )}

          {breakdown.length > 1 && (
            <section className="card">
              <h3 className="card-title">{tab === 'annual' ? 'حسب الشهر' : 'حسب اليوم'}</h3>
              <table className="journal">
                <thead>
                  <tr>
                    <th>{tab === 'annual' ? 'الشهر' : 'اليوم'}</th>
                    <th className="n">مدين</th>
                    <th className="n">دائن</th>
                    <th className="n">الرصيد</th>
                    <th className="n">القيود</th>
                  </tr>
                </thead>
                <tbody>
                  {breakdown.map((b) => (
                    <tr
                      key={b.key}
                      onClick={() => {
                        if (tab === 'annual') {
                          setMonth(b.key)
                          setTab('monthly')
                        } else {
                          setDay(b.key)
                          setTab('daily')
                        }
                      }}
                    >
                      <td>{tab === 'annual' ? fmtMonth(b.key) : fmtDate(b.key)}</td>
                      <td className="n money">{formatSAR(b.debit)}</td>
                      <td className="n money">{formatSAR(b.credit)}</td>
                      <td className="n money">{formatSAR(b.debit - b.credit)}</td>
                      <td className="n">{b.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          <section className="card">
            <h3 className="card-title">ملخص الحسابات (الترحيل)</h3>
            <table className="journal">
              <thead>
                <tr>
                  <th>الحساب</th>
                  <th className="n">مدين</th>
                  <th className="n">دائن</th>
                  <th className="n">الرصيد</th>
                </tr>
              </thead>
              <tbody>
                {accSums.map((a) => (
                  <tr key={a.account.id} style={{ cursor: 'default' }}>
                    <td>{a.account.name}</td>
                    <td className="n money">{a.debit ? formatSAR(a.debit) : ''}</td>
                    <td className="n money">{a.credit ? formatSAR(a.credit) : ''}</td>
                    <td className="n money" style={{ fontWeight: 600 }}>
                      {formatSAR(Math.abs(a.balance))} {a.balance >= 0 ? 'مدين' : 'دائن'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section style={{ marginTop: 14 }}>
            <h3 className="card-title">{tab === 'detailed' || tab === 'daily' ? 'القيود التفصيلية' : 'القيود'}</h3>
            <div className="table-wrap" style={{ display: 'block' }}>
              <JournalTable rows={rows} detailed={tab === 'detailed' || tab === 'daily'} accName={accName} sum={sum} onOpen={(id) => go(`/journal?open=${id}`)} />
            </div>
          </section>
        </>
      )}
    </div>
  )
}
