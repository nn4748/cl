import { useMemo, useState } from 'react'
import { expenseItems, monthSums, splitNote, WORKER_CAT_LABEL, workerMonths, type WorkerCat } from '../lib/expenses'
import { dayName, fmtDate, fmtMonth } from '../lib/format'
import { formatSAR } from '../lib/money'
import { useApp } from '../lib/store'
import { IconBook, IconPrinter } from '../ui/icons'
import { go, Money, useRoute } from '../ui/kit'

const CAT_COLORS: Record<WorkerCat, string> = {
  salary: '#503626',
  phone: '#A67C52',
  food: '#7a8f5a',
  bonus: '#c29a5b',
  other: '#b9a690',
}

export default function Expenses() {
  const route = useRoute()
  const tab = route.params.get('tab') === 'worker' ? 'worker' : 'month'
  const month = route.params.get('m')

  return (
    <div>
      {!month && (
        <div className="page-head no-print">
          <div>
            <h1 className="page-title">المصروفات</h1>
            <p className="page-sub">اضغط على الشهر لعرض التفاصيل</p>
          </div>
        </div>
      )}
      {!month && (
        <div className="tabs no-print">
          <button className={tab === 'month' ? 'on' : ''} onClick={() => go('/expenses', false)}>
            مصروفات الشهر
          </button>
          <button className={tab === 'worker' ? 'on' : ''} onClick={() => go('/expenses?tab=worker', false)}>
            مصروفات العامل
          </button>
        </div>
      )}
      {tab === 'month' ? month ? <MonthDetail m={month} /> : <MonthList /> : month ? <WorkerDetail m={month} /> : <WorkerList />}
    </div>
  )
}

function useItems() {
  const { entries, accounts } = useApp()
  const items = useMemo(() => expenseItems(entries, accounts), [entries, accounts])
  const accName = useMemo(() => new Map(accounts.map((a) => [a.id, a.name])), [accounts])
  return { items, accounts, accName }
}

function Empty({ text }: { text: string }) {
  return (
    <div className="card empty">
      <div className="empty-ico">
        <IconBook />
      </div>
      <h3>لا توجد مصروفات</h3>
      <p>{text}</p>
    </div>
  )
}

function MonthCard({ k, total, sub, max, onClick, prev }: { k: string; total: number; sub: string; max: number; onClick: () => void; prev?: number }) {
  const [name, year] = fmtMonth(k).split(' ')
  const change = prev ? Math.round(((total - prev) / prev) * 100) : null
  return (
    <button className="month-card" onClick={onClick}>
      <div className="month-cal">
        <span className="mn">{Number(k.slice(5))}</span>
        <span className="yr">{year}</span>
      </div>
      <div className="month-main">
        <div className="month-name">{name}</div>
        <div className="month-sub">{sub}</div>
        <div className="bar-track" style={{ marginTop: 8 }}>
          <div className="bar-fill" style={{ width: `${Math.max(2, (total / max) * 100)}%` }} />
        </div>
      </div>
      <div className="month-total">
        <Money v={total} />
        {change !== null && Number.isFinite(change) && (
          <span className={`delta ${change > 0 ? 'up' : 'down'}`}>
            {change > 0 ? '▲' : '▼'} {Math.abs(change)}٪
          </span>
        )}
      </div>
    </button>
  )
}

function MonthList() {
  const { items } = useItems()
  const months = useMemo(() => monthSums(items), [items])
  if (!months.length) return <Empty text="سجّل أول مصروف وسيظهر هنا حسب الشهر" />
  const max = Math.max(...months.map((m) => m.total))
  const all = months.reduce((s, m) => s + m.total, 0)
  return (
    <div className="stack">
      <div className="summary-strip">
        <div>
          <span>إجمالي المصروفات</span>
          <b>
            <Money v={all} />
          </b>
        </div>
        <div>
          <span>متوسط الشهر</span>
          <b>
            <Money v={Math.round(all / months.length)} />
          </b>
        </div>
      </div>
      {months.map((m, i) => (
        <MonthCard key={m.key} k={m.key} total={m.total} max={max} prev={months[i + 1]?.total} sub={`${m.count} بند · ${m.byAccount.length} أبواب`} onClick={() => go(`/expenses?m=${m.key}`)} />
      ))}
    </div>
  )
}

function DetailHead({ title, back, total, children }: { title: string; back: string; total: number; children?: React.ReactNode }) {
  return (
    <>
      <div className="row no-print" style={{ marginBottom: 10 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => go(back)}>
          → رجوع
        </button>
        <span className="spacer" />
        <button className="btn btn-outline btn-sm" onClick={() => window.print()}>
          <IconPrinter /> طباعة
        </button>
      </div>
      <section className="hero" style={{ marginBottom: 14 }}>
        <div className="hero-label">{title}</div>
        <div className="hero-value money">
          {formatSAR(total)}
          <span className="cur">ر.س</span>
        </div>
        {children}
      </section>
    </>
  )
}

function MonthDetail({ m }: { m: string }) {
  const { items, accName } = useItems()
  const monthItems = items.filter((i) => i.date.startsWith(m))
  const sum = monthSums(monthItems)[0]
  const [filter, setFilter] = useState<string | null>(null)
  if (!sum) return <Empty text={`لا توجد مصروفات في ${fmtMonth(m)}`} />
  const shown = filter ? monthItems.filter((i) => i.accountId === filter) : monthItems
  const byDate = groupByDate(shown)
  return (
    <div>
      <DetailHead title={`مصروفات ${fmtMonth(m)}`} back="/expenses" total={sum.total}>
        <div className="hero-label" style={{ fontSize: 13 }}>
          {sum.count} بند في {new Set(monthItems.map((i) => i.date)).size} يوم
        </div>
      </DetailHead>

      <section className="card">
        <h2 className="card-title">
          وين راحت الفلوس؟
          {filter && (
            <button className="btn btn-ghost btn-sm" onClick={() => setFilter(null)}>
              عرض الكل
            </button>
          )}
        </h2>
        {sum.byAccount.map((a) => (
          <button key={a.accountId} className={`cat-row ${filter === a.accountId ? 'on' : ''}`} onClick={() => setFilter(filter === a.accountId ? null : a.accountId)}>
            <span className="cat-name">{accName.get(a.accountId)}</span>
            <span className="cat-pct">{Math.round((a.total / sum.total) * 100)}٪</span>
            <span className="cat-amt money">{formatSAR(a.total)}</span>
            <span className="bar-track">
              <span className="bar-fill" style={{ display: 'block', width: `${Math.max(2, (a.total / sum.byAccount[0].total) * 100)}%` }} />
            </span>
          </button>
        ))}
      </section>

      <section className="card">
        <h2 className="card-title">{filter ? accName.get(filter) : 'كل المصروفات'}</h2>
        {byDate.map(([date, list]) => (
          <div key={date} className="day-group">
            <div className="day-head">
              <span>
                {dayName(date)} {fmtDate(date)}
              </span>
              <span className="money">{formatSAR(list.reduce((s, i) => s + i.amount, 0))}</span>
            </div>
            {list.map((it, idx) => (
              <div key={it.entryId + idx} className="exp-row" onClick={() => go(`/journal?open=${it.entryId}`)}>
                <div className="exp-main">
                  <div className="exp-title">{accName.get(it.accountId)}</div>
                  {it.note ? (
                    <div className="pieces">
                      {splitNote(it.note).map((p, j) => (
                        <span key={j} className="piece">
                          {p.label}
                          {p.amount != null && <b className="money"> {formatSAR(p.amount)}</b>}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="exp-sub">{it.description}</div>
                  )}
                </div>
                <div className="amt debit">{formatSAR(it.amount)}</div>
              </div>
            ))}
          </div>
        ))}
      </section>
    </div>
  )
}

function WorkerList() {
  const { items, accounts } = useItems()
  const months = useMemo(() => workerMonths(items, accounts), [items, accounts])
  if (!months.length) return <Empty text="سجّل راتب أو مصروف للعامل من «رواتب وعمالة» وسيظهر هنا" />
  const max = Math.max(...months.map((m) => m.total))
  const all = months.reduce((s, m) => s + m.total, 0)
  const salaries = months.reduce((s, m) => s + m.cats.salary, 0)
  return (
    <div className="stack">
      <div className="summary-strip">
        <div>
          <span>إجمالي مصروفات العامل</span>
          <b>
            <Money v={all} />
          </b>
        </div>
        <div>
          <span>منها رواتب</span>
          <b>
            <Money v={salaries} />
          </b>
        </div>
      </div>
      {months.map((m, i) => (
        <MonthCard
          key={m.key}
          k={m.key}
          total={m.total}
          max={max}
          prev={months[i + 1]?.total}
          sub={`راتب ${formatSAR(m.cats.salary)} · سوا ${formatSAR(m.cats.phone)} · مقاضي ${formatSAR(m.cats.food)}`}
          onClick={() => go(`/expenses?tab=worker&m=${m.key}`)}
        />
      ))}
    </div>
  )
}

function WorkerDetail({ m }: { m: string }) {
  const { items, accounts, accName } = useItems()
  const wm = useMemo(() => workerMonths(items, accounts).find((x) => x.key === m), [items, accounts, m])
  if (!wm) return <Empty text={`لا توجد مصروفات للعامل في ${fmtMonth(m)}`} />
  const cats = (Object.keys(WORKER_CAT_LABEL) as WorkerCat[]).filter((c) => wm.cats[c] !== 0)
  return (
    <div>
      <DetailHead title={`مصروفات العامل · ${fmtMonth(m)}`} back="/expenses?tab=worker" total={wm.total}>
        <div className="stackbar">
          {cats.map((c) => (
            <span key={c} style={{ width: `${(wm.cats[c] / wm.total) * 100}%`, background: CAT_COLORS[c] }} />
          ))}
        </div>
      </DetailHead>

      <div className="grid grid-2" style={{ marginBottom: 14 }}>
        {cats.map((c) => (
          <div className="stat" key={c}>
            <div className="k">
              <span className="dot" style={{ background: CAT_COLORS[c] }} />
              {WORKER_CAT_LABEL[c]}
            </div>
            <div className="v">
              <Money v={wm.cats[c]} />
            </div>
          </div>
        ))}
      </div>

      <section className="card">
        <h2 className="card-title">التفاصيل</h2>
        {groupByDate(wm.items).map(([date, list]) => (
          <div key={date} className="day-group">
            <div className="day-head">
              <span>
                {dayName(date)} {fmtDate(date)}
              </span>
              <span className="money">{formatSAR(list.reduce((s, i) => s + i.amount, 0))}</span>
            </div>
            {list.map((it, idx) =>
              it.pieces.length ? (
                it.pieces.map((p, j) => (
                  <div key={it.entryId + idx + '-' + j} className="exp-row" onClick={() => go(`/journal?open=${it.entryId}`)}>
                    <span className="dot" style={{ background: CAT_COLORS[p.cat], marginTop: 8 }} />
                    <div className="exp-main">
                      <div className="exp-title">{p.label || accName.get(it.accountId)}</div>
                      <div className="exp-sub">{WORKER_CAT_LABEL[p.cat]}</div>
                    </div>
                    <div className="amt debit">{p.amount != null ? formatSAR(p.amount) : '—'}</div>
                  </div>
                ))
              ) : (
                <div key={it.entryId + idx} className="exp-row" onClick={() => go(`/journal?open=${it.entryId}`)}>
                  <div className="exp-main">
                    <div className="exp-title">{it.description}</div>
                  </div>
                  <div className="amt debit">{formatSAR(it.amount)}</div>
                </div>
              ),
            )}
          </div>
        ))}
      </section>
    </div>
  )
}

function groupByDate<T extends { date: string }>(list: T[]): [string, T[]][] {
  const map = new Map<string, T[]>()
  for (const it of list) map.set(it.date, [...(map.get(it.date) ?? []), it])
  return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]))
}
