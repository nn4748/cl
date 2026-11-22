/**
 * تحليل نص دفتر اليومية المستخرج من ملف PDF.
 * دالة نقية (بدون اعتماد على المتصفح) حتى يمكن اختبارها.
 */

export interface TextItem {
  str: string
  x: number
  y: number
  w: number
  page: number
}

export interface ParsedLine {
  side: 'debit' | 'credit'
  accountName: string
  amount: number // بالهللة
  note: string
}

export interface ParsedEntry {
  number: number | null
  date: string | null
  description: string
  lines: ParsedLine[]
  marked: boolean // عليه علامة * في الدفتر
  warnings: string[]
  page: number
}

export interface ParseResult {
  entries: ParsedEntry[]
  statedTotal: { debit: number; credit: number } | null
  warnings: string[]
  textFound: boolean
}

const AMOUNT_RE = /^\d{1,3}(,\d{3})+(\.\d{1,2})?$|^\d+(\.\d{1,2})?$/
const DATE_RE = /(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})|(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})/

function norm(s: string) {
  return s
    .normalize('NFKC')
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/\s+/g, ' ')
    .trim()
}

function toHalala(s: string): number {
  const [w, f = ''] = s.replace(/,/g, '').split('.')
  return Number(w) * 100 + Number((f + '00').slice(0, 2))
}

function parseDate(s: string): string | null {
  const m = s.match(DATE_RE)
  if (!m) return null
  const [y, mo, d] = m[1] ? [m[1], m[2], m[3]] : [m[6], m[5], m[4]]
  const iso = `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`
  return Number.isNaN(Date.parse(iso)) ? null : iso
}

interface Row {
  y: number
  page: number
  items: TextItem[]
}

/** يجمع العناصر في أسطر حسب الإحداثي الرأسي، ويرتبها من اليمين لليسار */
export function groupRows(items: TextItem[]): Row[] {
  const rows: Row[] = []
  const sorted = [...items].filter((i) => i.str.trim()).sort((a, b) => a.page - b.page || b.y - a.y)
  for (const it of sorted) {
    const r = rows.find((r) => r.page === it.page && Math.abs(r.y - it.y) < 3)
    if (r) r.items.push(it)
    else rows.push({ y: it.y, page: it.page, items: [it] })
  }
  for (const r of rows) r.items.sort((a, b) => b.x - a.x)
  return rows
}

const NUMERIC_TOKEN = /^[\d.,]+$|^[×xX*]$/

function joinRTL(input: TextItem[]): string {
  // المسافة قبل كل عنصر (بالترتيب البصري من اليمين لليسار)
  const sp = input.map((it, i) => i > 0 && input[i - 1].x - (it.x + it.w) > 1.5)
  // الأرقام المتتالية مثل 8×70 تُقرأ من اليسار لليمين — نعيد ترتيبها
  const toks: { s: string; space: boolean }[] = []
  for (let i = 0; i < input.length; ) {
    let j = i
    while (j < input.length && NUMERIC_TOKEN.test(input[j].str.trim())) j++
    if (j - i >= 3) {
      const run = input.slice(i, j)
      const inner = sp.slice(i + 1, j).reverse()
      run.reverse().forEach((it, k) => toks.push({ s: it.str, space: k === 0 ? sp[i] : inner[k - 1] }))
      i = j
    } else {
      toks.push({ s: input[i].str, space: sp[i] })
      i++
    }
  }
  const out = toks.map((t) => (t.space ? ' ' : '') + t.s).join('')
  // الأقواس في النص العربي مقلوبة بصرياً
  return norm(out.replace(/[()]/g, (c) => (c === '(' ? ')' : '(')))
}

export function parseJournal(items: TextItem[]): ParseResult {
  const rows = groupRows(items)
  const result: ParseResult = { entries: [], statedTotal: null, warnings: [], textFound: items.some((i) => i.str.trim()) }
  if (!result.textFound) return result

  // أعمدة المدين والدائن من رأس الجدول
  let debitX: number | null = null
  let creditX: number | null = null
  for (const r of rows) {
    for (const it of r.items) {
      const t = norm(it.str)
      if (t === 'مدين' && debitX === null) debitX = it.x + it.w / 2
      if (t === 'دائن' && creditX === null) creditX = it.x + it.w / 2
    }
    if (debitX !== null && creditX !== null) break
  }
  // في بعض الملفات تأتي الكلمة مقطّعة حروفاً
  if (debitX === null || creditX === null) {
    for (const r of rows) {
      const t = joinRTL(r.items)
      if (t.includes('مدين') && t.includes('دائن') && t.includes('البيان')) {
        const amountsCol = r.items.filter((i) => i.x < r.items[r.items.length - 1].x + 120)
        const xs = amountsCol.map((i) => i.x)
        if (xs.length) {
          const min = Math.min(...xs)
          const max = Math.max(...xs)
          creditX = min + 10
          debitX = max - 10
        }
        break
      }
    }
  }

  let dateColX = Infinity // كل ما يقع يمين هذا الإحداثي يعتبر عمود التاريخ/رقم القيد
  let cur: ParsedEntry | null = null
  const push = () => {
    if (cur) result.entries.push(cur)
    cur = null
  }

  const sideOf = (it: TextItem, rowText: string): 'debit' | 'credit' => {
    const cx = it.x + it.w / 2
    if (debitX !== null && creditX !== null) return Math.abs(cx - debitX) <= Math.abs(cx - creditX) ? 'debit' : 'credit'
    return /^(إلى|الى)\s*ح/.test(rowText) ? 'credit' : 'debit'
  }

  for (const r of rows) {
    const full = joinRTL(r.items)
    if (!full) continue
    if (/المجموع|الإجمالي|الاجمالي/.test(full) && cur) {
      const amts = r.items.filter((i) => AMOUNT_RE.test(norm(i.str)))
      if (amts.length) {
        let d = 0
        let c = 0
        for (const a of amts) {
          if (sideOf(a, full) === 'debit') d += toHalala(norm(a.str))
          else c += toHalala(norm(a.str))
        }
        result.statedTotal = { debit: d, credit: c }
      }
      push()
      break
    }
    if (full.includes('البيان') && full.includes('التاريخ')) continue

    // ابحث عن التاريخ
    const dateItem = r.items.find((i) => parseDate(norm(i.str)))
    if (dateItem) {
      push()
      dateColX = Math.min(dateColX, dateItem.x - 4)
      const right = r.items.filter((i) => i.x > dateItem.x + dateItem.w - 1)
      const rightText = joinRTL(right)
      const num = rightText.match(/\d+/)
      cur = {
        number: num ? Number(num[0]) : null,
        date: parseDate(norm(dateItem.str)),
        description: '',
        lines: [],
        marked: rightText.includes('*'),
        warnings: [],
        page: r.page,
      }
    }
    if (!cur) continue

    const body = r.items.filter((i) => i.x < dateColX)
    const amountItems = body.filter((i) => AMOUNT_RE.test(norm(i.str)) && (debitX === null || i.x + i.w < Math.max(debitX, creditX ?? 0) + 40))
    // المبالغ المعتبرة: ما يقع في أعمدة المدين/الدائن فقط (وليس الأرقام داخل البيان)
    const colAmounts =
      debitX !== null && creditX !== null
        ? amountItems.filter((i) => {
            const cx = i.x + i.w / 2
            return Math.min(Math.abs(cx - debitX!), Math.abs(cx - creditX!)) < 45
          })
        : amountItems.slice(-1)
    const textItems = body.filter((i) => !colAmounts.includes(i))
    const text = joinRTL(textItems)

    const fromM = text.match(/^من\s*ح\s*ـ?\s*\/\s*(.+)$/)
    const toM = text.match(/^(?:إلى|الى)\s*ح\s*ـ?\s*\/\s*(.+)$/)
    if ((fromM || toM) && colAmounts.length) {
      const a = colAmounts[0]
      const side = fromM ? 'debit' : 'credit'
      const detected = sideOf(a, full)
      if (detected !== side) cur.warnings.push(`المبلغ ${norm(a.str)} في عمود غير متوقع`)
      cur.lines.push({ side, accountName: (fromM ?? toM)![1].trim(), amount: toHalala(norm(a.str)), note: '' })
      continue
    }
    if (colAmounts.length && text) {
      // صيغة سطر واحد: تاريخ + بيان + مبلغ
      for (const a of colAmounts) {
        cur.lines.push({ side: sideOf(a, full), accountName: '', amount: toHalala(norm(a.str)), note: text })
      }
      if (!cur.description) cur.description = text
      continue
    }
    if (!text) continue
    const paren = text.match(/^\((.*)\)$/s)
    const hasCredit = cur.lines.some((l) => l.side === 'credit')
    if (paren && hasCredit) {
      cur.description = paren[1].trim()
      continue
    }
    const last = cur.lines[cur.lines.length - 1]
    if (last) last.note = last.note ? `${last.note} ${text}` : text
    else cur.description = cur.description ? `${cur.description} ${text}` : text
  }
  push()

  for (const e of result.entries) {
    const d = e.lines.filter((l) => l.side === 'debit').reduce((s, l) => s + l.amount, 0)
    const c = e.lines.filter((l) => l.side === 'credit').reduce((s, l) => s + l.amount, 0)
    if (!e.date) e.warnings.push('التاريخ غير مقروء')
    if (!e.lines.length) e.warnings.push('لم يُعثر على مبالغ')
    else if (d !== c && d > 0 && c > 0) e.warnings.push('المدين لا يساوي الدائن — راجع المبالغ')
    if (e.marked) e.warnings.push('عليه علامة * في الدفتر الأصلي (يحتاج تأكيد)')
  }

  if (result.statedTotal) {
    const td = result.entries.flatMap((e) => e.lines).filter((l) => l.side === 'debit').reduce((s, l) => s + l.amount, 0)
    if (td !== result.statedTotal.debit) result.warnings.push('مجموع المدين المستخرج لا يطابق «المجموع» المكتوب في الملف')
  }
  return result
}
