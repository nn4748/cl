import { useMemo } from 'react'
import { OPERATION_LABEL } from '../lib/accounts'
import { byAccount, byMonth, cashSet, entryDC, totals, type PeriodSum } from '../lib/calc'
import { fmtDate, fmtMonth, MONTHS_AR, todayISO } from '../lib/format'
import { formatSAR } from '../lib/money'
import { applyAugustSplit, cloudEnabled, findCombinedEntry1, useApp } from '../lib/store'
import type { Entry } from '../lib/types'
import { expenseItems, monthSums, workerMonths } from '../lib/expenses'
import { IconBook, IconFile, IconPlus, IconWallet } from '../ui/icons'
import { OpIcon } from '../ui/opIcons'
import { confirmDialog, go, Money, toast } from '../ui/kit'

export function opIcon(e: Entry) {
  return <OpIcon type={e.type} />
}

export default function Dashboard() {
  const { entries, accounts } = useApp()
  const cash = useMemo(() => cashSet(accounts), [accounts])
  const t = useMemo(() => totals(entries, cash), [entries, cash])
  const months = useMemo(() => byMonth(entries, cash), [entries, cash])
  const thisMonthKey = todayISO().slice(0, 7)
  const thisMonth = months.find((m) => m.key === thisMonthKey) ?? { key: thisMonthKey, debit: 0, credit: 0, count: 0 }
  const lastMonthWithData = months.at(-1)
  const accSums = useMemo(
    () => byAccount(entries, accounts).filter((a) => a.account.kind !== 'cash' && a.debit > 0),
    [entries, accounts],
  )
  const recent = useMemo(
    () =>
      entries
        .filter((e) => !e.deleted)
        .sort((a, b) => b.date.localeCompare(a.date) || b.number - a.number)
        .slice(0, 6),
    [entries],
  )

  const expItems = expenseItems(entries, accounts)
  const lastExpMonth = monthSums(expItems)[0]
  const lastWorker = workerMonths(expItems, accounts)[0]

  if (t.count === 0) {
    return (
      <div>
        <div className="page-head">
          <div>
            <h1 className="page-title">السلام عليكم</h1>
            <p className="page-sub">سجّل أول قيد أو استورد دفترك الحالي</p>
          </div>
        </div>
        <div className="card empty">
          <div className="empty-ico"><IconBook /></div>
          <h3>الدفتر فارغ</h3>
          <p>اكتب المبلغ، اختر نوع العملية، واضغط «حفظ القيد».</p>
          <div className="grid" style={{ maxWidth: 360, margin: '18px auto 0' }}>
            <button className="btn btn-primary btn-lg" onClick={() => go('/add')}>
              <IconPlus /> تسجيل عملية
            </button>
            <button className="btn btn-outline" onClick={() => go('/import')}>
              <IconFile /> استيراد دفتر اليومية الأصلي
            </button>
          </div>
        </div>
      </div>
    )
  }

  const maxAcc = Math.max(1, ...accSums.map((a) => a.balance))


  return (
    <div className="grid grid-main">
      <div className="stack">
        <section className="hero" aria-label="الرصيد النهائي">
          <div className="hero-label">الرصيد النهائي (المدين − الدائن)</div>
          <div className="hero-value money">
            {formatSAR(t.balance)}
            <span className="cur">ر.س</span>
          </div>
          <div className="hero-label" style={{ fontSize: 12.5, opacity: 0.85 }}>
            {t.balance >= 0 ? 'رصيد مدين' : 'رصيد دائن'}
          </div>
          <div className="hero-split">
            <div>
              <div className="k">إجمالي المدين</div>
              <div className="v money">{formatSAR(t.debit)}</div>
            </div>
            <div>
              <div className="k">إجمالي الدائن</div>
              <div className="v money">{formatSAR(t.credit)}</div>
            </div>
          </div>
        </section>

        {findCombinedEntry1(entries) && <AugustCard />}

        <div className="quick-tiles">
          <button className="quick-tile" onClick={() => go(`/expenses?m=${lastExpMonth?.key ?? thisMonthKey}`)}>
            <span className="qt-ico">
              <IconWallet />
            </span>
            <span className="qt-title">مصروفات الشهر</span>
            <span className="qt-sub">{fmtMonth(lastExpMonth?.key ?? thisMonthKey)}</span>
            <span className="qt-val">
              <Money v={lastExpMonth?.total ?? 0} />
            </span>
          </button>
          <button className="quick-tile" onClick={() => go(lastWorker ? `/expenses?tab=worker&m=${lastWorker.key}` : '/expenses?tab=worker')}>
            <span className="qt-ico">
              <OpIcon type="wages" />
            </span>
            <span className="qt-title">مصروفات العامل</span>
            <span className="qt-sub">{lastWorker ? fmtMonth(lastWorker.key) : 'لا يوجد بعد'}</span>
            <span className="qt-val">
              <Money v={lastWorker?.total ?? 0} />
            </span>
          </button>
        </div>

        <div className="grid grid-2">
          <div className="stat">
            <div className="k">عدد القيود المسجلة</div>
            <div className="v num">{t.count}</div>
          </div>
          <div className="stat">
            <div className="k">{t.cashBalance < 0 ? 'المدفوع من الصندوق' : 'رصيد الصندوق'}</div>
            <div className="v">
              <Money v={Math.abs(t.cashBalance)} />
            </div>
          </div>
          <div className="stat">
            <div className="k">
              <span className="dot" style={{ background: 'var(--coffee)' }} /> مصروف {MONTHS_AR[new Date().getMonth()]}
            </div>
            <div className="v">
              <Money v={thisMonth.debit} />
            </div>
          </div>
          <div className="stat">
            <div className="k">
              <span className="dot" style={{ background: 'var(--green)' }} /> وارد {MONTHS_AR[new Date().getMonth()]}
            </div>
            <div className="v">
              <Money v={thisMonth.credit} />
            </div>
          </div>
        </div>

        <section className="card chart">
          <h2 className="card-title">
            الملخص المالي الشهري
            <span className="legend">
              <span>
                <span className="dot" style={{ background: 'var(--coffee)' }} /> مصروفات (مدين)
              </span>
              <span>
                <span className="dot" style={{ background: 'var(--green)' }} /> إيرادات (دائن)
              </span>
            </span>
          </h2>
          <MonthlyChart months={months.slice(-6)} />
          {lastMonthWithData && (
            <table className="journal" style={{ marginTop: 10, fontSize: 14 }}>
              <thead>
                <tr>
                  <th style={{ background: 'var(--cream)', color: 'var(--ink-2)' }}>الشهر</th>
                  <th className="n" style={{ background: 'var(--cream)', color: 'var(--ink-2)' }}>
                    مدين
                  </th>
                  <th className="n" style={{ background: 'var(--cream)', color: 'var(--ink-2)' }}>
                    دائن
                  </th>
                  <th className="n" style={{ background: 'var(--cream)', color: 'var(--ink-2)' }}>
                    القيود
                  </th>
                </tr>
              </thead>
              <tbody>
                {[...months].reverse().slice(0, 6).map((m) => (
                  <tr key={m.key} onClick={() => go(`/reports?tab=monthly&month=${m.key}`)}>
                    <td>{fmtMonth(m.key)}</td>
                    <td className="n">{formatSAR(m.debit)}</td>
                    <td className="n">{formatSAR(m.credit)}</td>
                    <td className="n">{m.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>

      <div className="stack">
        <button className="btn btn-primary btn-lg only-mobile-btn" onClick={() => go('/add')}>
          <IconPlus /> تسجيل عملية
        </button>

        <section className="card">
          <h2 className="card-title">
            آخر العمليات المسجلة
            <button className="btn btn-ghost btn-sm" onClick={() => go('/journal')}>
              عرض الكل
            </button>
          </h2>
          <ul className="list">
            {recent.map((e) => {
              const dc = entryDC(e, cash)
              const isIn = dc.credit > dc.debit
              return (
                <li key={e.id} className="list-item" onClick={() => go(`/journal?open=${e.id}`)}>
                  <div className="list-ico">{opIcon(e)}</div>
                  <div className="list-main">
                    <div className="list-title">{e.description}</div>
                    <div className="list-meta">
                      قيد {e.number} · {fmtDate(e.date)} · {OPERATION_LABEL[e.type]}
                      {e.sync !== 'synced' && cloudEnabled() && ' · لم يُرسل'}
                    </div>
                  </div>
                  <div className={`amt ${isIn ? 'credit' : 'debit'}`}>
                    {isIn ? '+' : ''}
                    {formatSAR(isIn ? dc.credit : dc.debit)}
                  </div>
                </li>
              )
            })}
          </ul>
        </section>

        <section className="card">
          <h2 className="card-title">أين ذهبت المصروفات؟</h2>
          {accSums.slice(0, 8).map((a) => (
            <div className="bar-row" key={a.account.id}>
              <span>{a.account.name}</span>
              <span className="money" style={{ fontWeight: 600 }}>
                {formatSAR(a.balance)}
              </span>
              <div className="bar-track">
                <div className="bar-fill" style={{ width: `${Math.max(1.5, (a.balance / maxAcc) * 100)}%` }} />
              </div>
            </div>
          ))}
          {!t.ledgerBalanced && (
            <div className="notice" style={{ marginTop: 8 }}>
              مجموع المدين لا يساوي مجموع الدائن، راجع القيود.
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function MonthlyChart({ months }: { months: PeriodSum[] }) {
  if (!months.length) return null
  const W = 600
  const H = 220
  const padT = 16
  const padB = 34
  const padX = 8
  const max = Math.max(1, ...months.flatMap((m) => [m.debit, m.credit]))
  const nice = niceMax(max)
  const slot = (W - padX * 2) / months.length
  const bw = Math.min(30, slot / 3.2)
  const y = (v: number) => padT + (H - padT - padB) * (1 - v / nice)
  const ticks = [0, 0.5, 1].map((f) => f * nice)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} direction="ltr" role="img" aria-label="رسم بياني للمصروفات والإيرادات الشهرية">
      {ticks.map((tv) => (
        <g key={tv}>
          <line x1={padX} x2={W - padX} y1={y(tv)} y2={y(tv)} stroke="#efe7dc" strokeDasharray={tv ? '3 4' : undefined} />
          <text x={W - padX} y={y(tv) - 4} fontSize="11" fill="#8a7768" textAnchor="end" direction="ltr">
            {formatSAR(tv)}
          </text>
        </g>
      ))}
      {months.map((m, i) => {
        // من اليمين لليسار: الأقدم يميناً
        const cx = W - padX - slot * (i + 0.5)
        return (
          <g key={m.key}>
            <rect x={cx + 2} y={y(m.debit)} width={bw} height={Math.max(0, y(0) - y(m.debit))} rx="5" fill="#503626">
              <title>{`${fmtMonth(m.key)} · مدين ${formatSAR(m.debit)}`}</title>
            </rect>
            <rect x={cx - bw - 2} y={y(m.credit)} width={bw} height={Math.max(0, y(0) - y(m.credit))} rx="5" fill="#3f7a4f">
              <title>{`${fmtMonth(m.key)} · دائن ${formatSAR(m.credit)}`}</title>
            </rect>
            <text x={cx} y={H - 12} fontSize="12.5" fill="#5e4a3d" textAnchor="middle" fontWeight="600">
              {fmtMonth(m.key).split(' ')[0]}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

function niceMax(v: number) {
  const p = Math.pow(10, Math.floor(Math.log10(v)))
  const n = v / p
  const m = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10
  return m * p
}

function AugustCard() {
  const apply = async () => {
    const ok = await confirmDialog({
      title: 'تفصيل القيد 1 حسب أوراق أغسطس؟',
      body: (
        <>
          القيد 1 (276,066 ريال بتاريخ 7 سبتمبر) يتقسّم على تواريخه الحقيقية من الأوراق:
          <br />12 أغسطس عربون 5,000 · 13 أغسطس تحويل الحلال وأعلاف 140,091 · 27 أغسطس 34 رأس 46,960 · 29 أغسطس علاج وشعير وخيام 3,660 · والباقي 80,355 يبقى في 7 سبتمبر.
          <br />
          <b>المجموع نفسه بدون أي تكرار.</b>
        </>
      ),
      confirm: 'تطبيق',
    })
    if (!ok) return
    try {
      const n = await applyAugustSplit()
      toast(`تم · أُضيف ${n} قيود لشهر أغسطس`)
    } catch (e) {
      toast((e as Error).message, 'err')
    }
  }
  return (
    <section className="card" style={{ borderInlineStart: '4px solid var(--caramel)' }}>
      <h2 className="card-title" style={{ marginBottom: 6 }}>
        أوراق أغسطس جاهزة
      </h2>
      <p className="muted small" style={{ marginTop: 0 }}>
        الأوراق المكتوبة باليد هي تفاصيل القيد 1. بتطبيقها يظهر شهر أغسطس في المصروفات بتواريخه الصحيحة.
      </p>
      <button className="btn btn-primary btn-sm" onClick={apply}>
        مراجعة وتطبيق
      </button>
    </section>
  )
}
