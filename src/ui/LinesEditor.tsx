import { KIND_LABEL } from '../lib/accounts'
import { formatSAR, parseAmount, toInputValue } from '../lib/money'
import type { Account, EntryLine } from '../lib/types'
import { IconPlus, IconX } from './icons'

export interface LineRow {
  key: string
  accountId: string
  side: 'debit' | 'credit'
  amount: string
  note: string
}

export function linesToRows(lines: EntryLine[]): LineRow[] {
  return lines.map((l) => ({
    key: crypto.randomUUID(),
    accountId: l.accountId,
    side: l.credit > 0 ? 'credit' : 'debit',
    amount: toInputValue(l.credit > 0 ? l.credit : l.debit),
    note: l.note ?? '',
  }))
}

export function rowsToLines(rows: LineRow[]): EntryLine[] {
  return rows.map((r) => {
    const v = parseAmount(r.amount) ?? 0
    return { accountId: r.accountId, debit: r.side === 'debit' ? v : 0, credit: r.side === 'credit' ? v : 0, note: r.note }
  })
}

export function rowTotals(rows: LineRow[]) {
  let d = 0
  let c = 0
  let bad = false
  for (const r of rows) {
    if (!r.amount.trim()) continue
    const v = parseAmount(r.amount)
    if (v === null) {
      bad = true
      continue
    }
    if (r.side === 'debit') d += v
    else c += v
  }
  return { d, c, bad }
}

export function AccountSelect({
  accounts,
  value,
  onChange,
  className = 'select',
  allowCreate,
}: {
  accounts: Account[]
  value: string
  onChange: (id: string) => void
  className?: string
  allowCreate?: boolean
}) {
  const groups = (['cash', 'expense', 'asset', 'revenue', 'equity', 'liability'] as const)
    .map((k) => ({ k, list: accounts.filter((a) => a.kind === k && (!a.archived || a.id === value)) }))
    .filter((g) => g.list.length)
  return (
    <select className={className} value={value} onChange={(e) => onChange(e.target.value)}>
      {!value && <option value="">— اختر الحساب —</option>}
      {groups.map((g) => (
        <optgroup key={g.k} label={KIND_LABEL[g.k]}>
          {g.list.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </optgroup>
      ))}
      {allowCreate && <option value="__new__">+ حساب جديد…</option>}
    </select>
  )
}

export default function LinesEditor({
  rows,
  setRows,
  accounts,
  onNewAccount,
}: {
  rows: LineRow[]
  setRows: (r: LineRow[]) => void
  accounts: Account[]
  onNewAccount?: (rowKey: string) => void
}) {
  const { d, c } = rowTotals(rows)
  const update = (key: string, patch: Partial<LineRow>) => setRows(rows.map((r) => (r.key === key ? { ...r, ...patch } : r)))
  const diff = d - c
  return (
    <div>
      <div className="lines">
        {rows.map((r) => (
          <div className="line-card" key={r.key}>
            <AccountSelect
              accounts={accounts}
              value={r.accountId}
              className="select select-sm"
              allowCreate={!!onNewAccount}
              onChange={(id) => (id === '__new__' ? onNewAccount?.(r.key) : update(r.key, { accountId: id }))}
            />
            <input
              className="input input-sm num"
              inputMode="decimal"
              placeholder="0"
              value={r.amount}
              onChange={(e) => update(r.key, { amount: e.target.value })}
              style={{ textAlign: 'center', direction: 'ltr' }}
              aria-label="المبلغ"
            />
            <div className="side-toggle full">
              <button
                type="button"
                className={`chip chip-sm ${r.side === 'debit' ? 'on' : ''}`}
                onClick={() => update(r.key, { side: 'debit' })}
              >
                من ح/ (مدين)
              </button>
              <button
                type="button"
                className={`chip chip-sm ${r.side === 'credit' ? 'on' : ''}`}
                onClick={() => update(r.key, { side: 'credit' })}
              >
                إلى ح/ (دائن)
              </button>
              <span className="spacer" />
              {rows.length > 2 && (
                <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={() => setRows(rows.filter((x) => x.key !== r.key))} aria-label="حذف السطر">
                  <IconX width={18} />
                </button>
              )}
            </div>
            <input
              className="input input-sm full"
              placeholder="التفاصيل (اختياري)"
              value={r.note}
              onChange={(e) => update(r.key, { note: e.target.value })}
            />
          </div>
        ))}
      </div>
      <div className="row wrap" style={{ marginTop: 10 }}>
        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={() =>
            setRows([
              ...rows,
              {
                key: crypto.randomUUID(),
                accountId: '',
                side: diff > 0 ? 'credit' : 'debit',
                amount: diff ? toInputValue(Math.abs(diff)) : '',
                note: '',
              },
            ])
          }
        >
          <IconPlus /> إضافة سطر
        </button>
      </div>
      <div className={`balance-bar ${d === c && d > 0 ? 'ok' : 'bad'}`} style={{ marginTop: 12 }}>
        <span>
          مدين <span className="money">{formatSAR(d)}</span> · دائن <span className="money">{formatSAR(c)}</span>
        </span>
        <span>{d === c && d > 0 ? 'متوازن' : `الفرق ${formatSAR(Math.abs(diff))}`}</span>
      </div>
    </div>
  )
}
