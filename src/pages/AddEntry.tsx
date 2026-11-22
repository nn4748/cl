import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { CASH_ID, guessOperation, OPERATIONS, opDef } from '../lib/accounts'
import { fmtDateLong, todayISO } from '../lib/format'
import { formatSAR, parseAmount, toInputValue } from '../lib/money'
import { addEntry, nextNumber, updateEntry, upsertAccount, useApp, validateDraft, type EntryDraft } from '../lib/store'
import type { AccountKind, OperationType } from '../lib/types'
import { IconCheck } from '../ui/icons'
import { OpIcon } from '../ui/opIcons'
import { go, Sheet, toast } from '../ui/kit'
import LinesEditor, { AccountSelect, linesToRows, rowsToLines, type LineRow } from '../ui/LinesEditor'

function yesterday() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function AddEntry({ editId }: { editId: string | null }) {
  const { entries, accounts } = useApp()
  const editing = editId ? entries.find((e) => e.id === editId) : undefined

  const [mode, setMode] = useState<'simple' | 'compound'>('simple')
  const [direction, setDirection] = useState<'out' | 'in'>('out')
  const [op, setOp] = useState<OperationType>('feed')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(todayISO())
  const [debitAcc, setDebitAcc] = useState('feed')
  const [creditAcc, setCreditAcc] = useState(CASH_ID)
  const [rows, setRows] = useState<LineRow[]>([])
  const [flagged, setFlagged] = useState(false)
  const [flagNote, setFlagNote] = useState('')
  const [errors, setErrors] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [newAcc, setNewAcc] = useState<{ target: 'debit' | 'credit' | string; name: string; kind: AccountKind } | null>(null)
  const amountRef = useRef<HTMLInputElement>(null)

  // تحميل القيد عند التعديل
  useEffect(() => {
    if (!editing) return
    setDate(editing.date)
    setDescription(editing.description)
    setFlagged(!!editing.flagged)
    setFlagNote(editing.flagNote ?? '')
    const simple = editing.lines.length === 2 && editing.lines.some((l) => l.debit > 0) && editing.lines.some((l) => l.credit > 0)
    if (simple) {
      const d = editing.lines.find((l) => l.debit > 0)!
      const c = editing.lines.find((l) => l.credit > 0)!
      setMode('simple')
      setDebitAcc(d.accountId)
      setCreditAcc(c.accountId)
      setAmount(toInputValue(d.debit))
      const t = editing.type === 'compound' ? guessOperation(d.accountId, c.accountId) : editing.type
      setOp(t)
      setDirection(opDef(t)?.direction ?? (accounts.find((a) => a.id === d.accountId)?.kind === 'cash' ? 'in' : 'out'))
      setRows(linesToRows(editing.lines))
    } else {
      setMode('compound')
      setOp(editing.type)
      setRows(linesToRows(editing.lines))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing?.id])

  useEffect(() => {
    if (!editId) amountRef.current?.focus({ preventScroll: true })
  }, [editId])

  const ops = OPERATIONS.filter((o) => o.direction === direction)

  const pickOp = (id: OperationType) => {
    setOp(id)
    const d = opDef(id)
    if (d) {
      setDebitAcc(d.debit)
      setCreditAcc(d.credit)
    }
    setErrors([])
    amountRef.current?.focus({ preventScroll: true })
  }

  const pickDirection = (dir: 'out' | 'in') => {
    setDirection(dir)
    const first = OPERATIONS.find((o) => o.direction === dir)!
    const keep = opDef(op)?.direction === dir
    if (!keep) pickOp(first.id)
  }

  const switchMode = (m: 'simple' | 'compound') => {
    if (m === 'compound' && mode === 'simple') {
      const v = parseAmount(amount) ?? 0
      setRows(
        linesToRows([
          { accountId: debitAcc, debit: v, credit: 0 },
          { accountId: creditAcc, debit: 0, credit: v },
        ]).map((r) => (r.amount ? r : { ...r, amount: '' })),
      )
    }
    if (m === 'simple' && mode === 'compound' && rows.length !== 2) {
      // لا نفقد بيانات القيد المركب
      if (rows.some((r) => r.amount)) return toast('القيد المركب فيه أكثر من سطرين، احذف الأسطر الزائدة أولاً', 'err')
    }
    setMode(m)
  }

  const draft = (): EntryDraft => {
    if (mode === 'simple') {
      const v = parseAmount(amount) ?? 0
      return {
        date,
        description,
        type: op,
        lines: [
          { accountId: debitAcc, debit: v, credit: 0 },
          { accountId: creditAcc, debit: 0, credit: v },
        ],
        flagged,
        flagNote,
      }
    }
    const lines = rowsToLines(rows)
    const main = [...lines].sort((a, b) => b.debit - a.debit)[0]
    const credit = lines.find((l) => l.credit > 0)
    return {
      date,
      description,
      type: editing && editing.type !== 'compound' && lines.length === 2 ? editing.type : lines.length > 2 ? 'compound' : guessOperation(main?.accountId ?? '', credit?.accountId ?? ''),
      lines,
      flagged,
      flagNote,
    }
  }

  const amountValue = parseAmount(amount)
  const amountInvalid = amount.trim() !== '' && amountValue === null

  const submit = async (e?: FormEvent) => {
    e?.preventDefault()
    if (saving) return
    const d = draft()
    const errs = mode === 'simple' && !amount.trim() ? ['أدخل المبلغ'] : amountInvalid ? ['المبلغ غير صحيح، استخدم أرقاماً فقط (مثال: 1250.50)'] : validateDraft(d)
    if (mode === 'simple' && debitAcc === creditAcc) errs.push('الحساب المدين والدائن لا يكونان نفس الحساب')
    if (errs.length) {
      setErrors(errs)
      if (navigator.vibrate) navigator.vibrate(60)
      return
    }
    setSaving(true)
    try {
      if (editing) {
        const saved = await updateEntry(editing.id, d)
        toast(`تم تعديل القيد رقم ${saved.number}`)
        go(`/journal?open=${saved.id}`)
      } else {
        const saved = await addEntry(d)
        if (navigator.vibrate) navigator.vibrate(25)
        toast(`تم الحفظ · رقم ${saved.number}`, 'ok', { label: 'عرض', run: () => go(`/journal?open=${saved.id}`) })
        setAmount('')
        setDescription('')
        setFlagged(false)
        setFlagNote('')
        setErrors([])
        if (mode === 'compound') setRows(linesToRows([{ accountId: debitAcc, debit: 0, credit: 0 }, { accountId: creditAcc, debit: 0, credit: 0 }]))
        amountRef.current?.focus({ preventScroll: true })
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    } catch (err) {
      setErrors([(err as Error).message])
    } finally {
      setSaving(false)
    }
  }

  const createAccount = async () => {
    if (!newAcc) return
    try {
      const id = 'acc_' + crypto.randomUUID().slice(0, 8)
      await upsertAccount({ id, name: newAcc.name, kind: newAcc.kind })
      if (newAcc.target === 'debit') setDebitAcc(id)
      else if (newAcc.target === 'credit') setCreditAcc(id)
      else setRows(rows.map((r) => (r.key === newAcc.target ? { ...r, accountId: id } : r)))
      setNewAcc(null)
      toast('تمت إضافة الحساب')
    } catch (e) {
      toast((e as Error).message, 'err')
    }
  }

  const number = editing ? editing.number : nextNumber(entries)
  const accName = (id: string) => accounts.find((a) => a.id === id)?.name ?? '—'
  const dateChips = useMemo(() => [{ label: 'اليوم', v: todayISO() }, { label: 'أمس', v: yesterday() }], [])

  return (
    <form onSubmit={submit} noValidate>
      <div className="page-head">
        <div>
          <h1 className="page-title">{editing ? 'تعديل العملية' : 'تسجيل عملية'}</h1>
          <p className="page-sub">
            رقم <b className="num">{number}</b> · {fmtDateLong(date)}
          </p>
        </div>
        <div className="tabs" style={{ margin: 0, flex: 'none' }}>
          <button type="button" className={mode === 'simple' ? 'on' : ''} onClick={() => switchMode('simple')}>
            سهل
          </button>
          <button type="button" className={mode === 'compound' ? 'on' : ''} onClick={() => switchMode('compound')}>
            تفصيلي
          </button>
        </div>
      </div>

      {editing?.sync === 'conflict' && (
        <div className="notice" style={{ marginBottom: 12 }}>
          هذا القيد عُدّل من جهاز آخر، راجع التعارض من الإعدادات قبل تعديله.
        </div>
      )}

      <div className="card">
        {mode === 'simple' ? (
          <>
            <div className="segmented" role="tablist" style={{ marginBottom: 14 }}>
              <button type="button" className={direction === 'out' ? 'on out' : ''} onClick={() => pickDirection('out')}>
                شريت / صرفت
                <small>فلوس طالعة</small>
              </button>
              <button type="button" className={direction === 'in' ? 'on in' : ''} onClick={() => pickDirection('in')}>
                بعت / قبضت
                <small>فلوس داخلة</small>
              </button>
            </div>

            <label className="field">
              <span className="label">كم المبلغ؟</span>
              <div className="amount-wrap">
                <input
                  ref={amountRef}
                  className={`input amount-input ${amountInvalid ? 'invalid' : ''}`}
                  inputMode="decimal"
                  enterKeyHint="done"
                  autoComplete="off"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value)
                    setErrors([])
                  }}
                  aria-invalid={amountInvalid}
                />
                <span className="amount-suffix">ر.س</span>
              </div>
            </label>

            <div className="field">
              <span className="label">{direction === 'out' ? 'وش شريت؟' : 'وش بعت؟'}</span>
              <div className="op-grid">
                {ops.map((o) => (
                  <button type="button" key={o.id} className={`op ${op === o.id ? 'on' : ''}`} onClick={() => pickOp(o.id)}>
                    <OpIcon type={o.id} className="ico" />
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="field">
            <span className="label">أسطر القيد (من ح/ … إلى ح/ …)</span>
            <LinesEditor rows={rows} setRows={setRows} accounts={accounts} onNewAccount={(key) => setNewAcc({ target: key, name: '', kind: 'expense' })} />
          </div>
        )}

        <label className="field">
          <span className="label">ملاحظة</span>
          <input
            className="input"
            placeholder={mode === 'simple' ? `مثال: ${direction === 'out' ? 'شعير 10 أكياس' : 'بيع 5 رؤوس غنم'}` : 'مثال: شراء أعلاف + بنزين'}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            enterKeyHint="done"
            maxLength={500}
          />
        </label>

        <div className="field">
          <span className="label">التاريخ</span>
          <div className="row">
            <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ flex: 1 }} required />
            {dateChips.map((c) => (
              <button type="button" key={c.label} className={`chip ${date === c.v ? 'on' : ''}`} onClick={() => setDate(c.v)}>
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {mode === 'simple' && (
          <details className="more">
            <summary>
              الحسابات: من ح/ {accName(debitAcc)} ← إلى ح/ {accName(creditAcc)}
            </summary>
            <div className="grid grid-2">
              <label className="field">
                <span className="label">الحساب المدين (من ح/)</span>
                <AccountSelect accounts={accounts} value={debitAcc} allowCreate onChange={(id) => (id === '__new__' ? setNewAcc({ target: 'debit', name: '', kind: 'expense' }) : setDebitAcc(id))} />
              </label>
              <label className="field">
                <span className="label">الحساب الدائن (إلى ح/)</span>
                <AccountSelect accounts={accounts} value={creditAcc} allowCreate onChange={(id) => (id === '__new__' ? setNewAcc({ target: 'credit', name: '', kind: 'revenue' }) : setCreditAcc(id))} />
              </label>
            </div>
          </details>
        )}

        <details className="more" open={flagged}>
          <summary>ملاحظة مراجعة {flagged && '•'}</summary>
          <label className="row" style={{ marginBottom: 10 }}>
            <input type="checkbox" className="check" checked={flagged} onChange={(e) => setFlagged(e.target.checked)} />
            <span>هذا القيد يحتاج تأكيد لاحقاً</span>
          </label>
          {flagged && <textarea className="textarea" placeholder="ما الذي يحتاج تأكيد؟" value={flagNote} onChange={(e) => setFlagNote(e.target.value)} />}
        </details>
      </div>

      <div className="save-bar">
        {errors.length > 0 && (
          <div className="errors" role="alert">
            {errors.length === 1 ? errors[0] : (
              <ul>
                {errors.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            )}
          </div>
        )}
        <button className="btn btn-primary btn-lg" type="submit" disabled={saving}>
          <IconCheck />
          {editing ? 'حفظ التعديل' : 'حفظ'}
          {mode === 'simple' && amountValue ? <span className="money" style={{ opacity: 0.8, fontWeight: 500 }}>· {formatSAR(amountValue)}</span> : null}
        </button>
        {editing && (
          <button type="button" className="btn btn-ghost" style={{ width: '100%', marginTop: 6 }} onClick={() => history.back()}>
            إلغاء
          </button>
        )}
      </div>

      <Sheet open={!!newAcc} onClose={() => setNewAcc(null)} title="حساب جديد">
        {newAcc && (
          <>
            <label className="field">
              <span className="label">اسم الحساب</span>
              <input className="input" autoFocus value={newAcc.name} onChange={(e) => setNewAcc({ ...newAcc, name: e.target.value })} placeholder="مثال: كهرباء" />
            </label>
            <label className="field">
              <span className="label">نوع الحساب</span>
              <select className="select" value={newAcc.kind} onChange={(e) => setNewAcc({ ...newAcc, kind: e.target.value as AccountKind })}>
                <option value="expense">مصروفات</option>
                <option value="asset">أصول (حلال، معدات…)</option>
                <option value="revenue">إيرادات</option>
                <option value="cash">نقدية (صندوق، بنك)</option>
                <option value="liability">التزامات (ديون)</option>
                <option value="equity">حقوق ملكية</option>
              </select>
            </label>
            <button type="button" className="btn btn-primary btn-lg" onClick={createAccount}>
              إضافة الحساب
            </button>
          </>
        )}
      </Sheet>
    </form>
  )
}
