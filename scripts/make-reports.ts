/**
 * يولّد ملفي PDF للطباعة من بيانات الدفتر:
 *   reports/دفتر-اليومية.pdf  — كل يوم: ما اشتُري وسعره ومجموع اليوم، ثم تفسير المشتريات صنفاً صنفاً
 *   reports/ملف-العامل.pdf    — مصاريف العامل شهراً بشهر (راتب، سوا، مقاضي…)
 * التشغيل: npx tsx scripts/make-reports.ts
 */
import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { DEFAULT_ACCOUNTS } from '../src/lib/accounts'
import { bagsOf, expenseItems, feedType, FEED_TYPES, splitNote, WORKER_CAT_LABEL, type WorkerCat } from '../src/lib/expenses'
import { ORIGINAL_JOURNAL, ORIGINAL_TOTAL_HALALA } from '../src/lib/seed'
import type { Entry } from '../src/lib/types'

const ROOT = process.cwd()
const OUT = path.join(ROOT, 'reports')
fs.mkdirSync(OUT, { recursive: true })

const entries: Entry[] = ORIGINAL_JOURNAL.map((d, i) => ({
  ...d,
  id: String(i),
  number: d.number ?? i + 1,
  createdAt: '',
  updatedAt: '',
  sync: 'synced',
}))
const items = expenseItems(entries, DEFAULT_ACCOUNTS)
const accName = new Map(DEFAULT_ACCOUNTS.map((a) => [a.id, a.name]))
const total = items.reduce((s, i) => s + i.amount, 0)
if (total !== ORIGINAL_TOTAL_HALALA) throw new Error(`المجموع ${total} لا يطابق ${ORIGINAL_TOTAL_HALALA}`)

// ───────── تنسيق ─────────
const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
const DAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
const HIJRI_MONTHS = ['محرم', 'صفر', 'ربيع الأول', 'ربيع الآخر', 'جمادى الأولى', 'جمادى الآخرة', 'رجب', 'شعبان', 'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة']
const d = (iso: string) => {
  const [y, m, dd] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, dd, 12))
}
const money = (h: number) => (h / 100).toLocaleString('en-US', { maximumFractionDigits: 2 })
const longDate = (iso: string) => `${d(iso).getUTCDate()} ${MONTHS[d(iso).getUTCMonth()]} ${d(iso).getUTCFullYear()}`
const dayName = (iso: string) => DAYS[d(iso).getUTCDay()]
function hijri(iso: string) {
  const parts = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { day: 'numeric', month: 'numeric', year: 'numeric', timeZone: 'UTC' }).formatToParts(d(iso))
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value)
  return `${get('day')} ${HIJRI_MONTHS[get('month') - 1]} ${get('year')}هـ`
}
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')
const SHORT_ACC: Record<string, string> = {
  livestock: 'الحلال',
  feed: 'أعلاف',
  transport: 'نقل وبنزين',
  wages: 'العامل',
  vet: 'علاج',
  equipment: 'معدات',
  maintenance: 'صيانة',
  rent: 'إيجار',
  well: 'بئر',
  misc: 'متنوعة',
}
const fontDir = path.join(ROOT, 'node_modules/@fontsource/ibm-plex-sans-arabic/files')
const fontFace = [400, 600, 700]
  .flatMap((w) =>
    ['arabic', 'latin'].map(
      (sub) =>
        `@font-face{font-family:Plex;font-weight:${w};src:url(data:font/woff2;base64,${fs.readFileSync(path.join(fontDir, `ibm-plex-sans-arabic-${sub}-${w}-normal.woff2`)).toString('base64')}) format('woff2')}`,
    ),
  )
  .join('\n')

const CSS = `
${fontFace}
@page { size: A4; margin: 14mm 12mm 16mm; }
* { box-sizing: border-box; }
body { font-family: Plex, sans-serif; color: #2a1b13; font-size: 12.5pt; line-height: 1.5; margin: 0; direction: rtl; }
.num { font-variant-numeric: tabular-nums; direction: ltr; unicode-bidi: isolate; }
h1 { font-size: 24pt; margin: 0; color: #3b261c; }
h2 { font-size: 16pt; color: #3b261c; margin: 22px 0 10px; padding-bottom: 6px; border-bottom: 2px solid #a67c52; }
h3 { font-size: 13.5pt; color: #503626; margin: 16px 0 6px; }
.head { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 3px solid #3b261c; padding-bottom: 10px; margin-bottom: 14px; }
.head .sub { color: #8a7768; font-size: 11pt; }
.boxes { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 12px 0 4px; }
.box { border: 1.5px solid #e9dfd1; border-radius: 10px; padding: 8px 12px; background: #fbf8f3; }
.box .k { color: #8a7768; font-size: 10pt; }
.box .v { font-size: 17pt; font-weight: 700; color: #3b261c; }
.box.dark { background: #3b261c; border-color: #3b261c; }
.box.dark .k { color: #d8c3a5; } .box.dark .v { color: #fff; }
table { width: 100%; border-collapse: collapse; margin: 6px 0 4px; }
th { background: #3b261c; color: #f7f3ec; font-weight: 600; font-size: 11pt; padding: 6px 8px; text-align: right; }
td { padding: 5px 8px; border-bottom: 1px solid #eee5d8; vertical-align: top; }
td.n, th.n { text-align: left; white-space: nowrap; width: 90px; }
td.c, th.c { text-align: center; white-space: nowrap; width: 80px; }
td.tag { width: 90px; color: #8a7768; font-size: 10.5pt; white-space: nowrap; }
tr.total td { font-weight: 700; background: #f3ece2; border-top: 1.5px solid #a67c52; border-bottom: 0; }
tr.run td { color: #8a7768; font-size: 10pt; border-bottom: 0; padding-top: 0; }
.day { break-inside: avoid; margin-bottom: 12px; }
.dayhead { display: flex; justify-content: space-between; background: #efe3d3; border-radius: 8px 8px 0 0; padding: 6px 10px; font-weight: 700; color: #3b261c; }
.dayhead .h { font-weight: 400; color: #8a7768; font-size: 10.5pt; }
.grand { margin-top: 16px; background: #3b261c; color: #fff; border-radius: 10px; padding: 12px 16px; display: flex; justify-content: space-between; font-size: 16pt; font-weight: 700; break-inside: avoid; }
.note { background: #fbf0db; color: #6e4a0f; border-radius: 8px; padding: 8px 12px; font-size: 10.5pt; margin: 8px 0; }
.note ul { margin: 4px 0 0; padding-inline-start: 18px; }
.explain { color: #8a7768; font-size: 10.5pt; margin: -2px 0 6px; }
.pb { break-before: page; }
.muted { color: #8a7768; }
.foot { margin-top: 18px; font-size: 9.5pt; color: #8a7768; text-align: center; }
`

const page = (title: string, body: string) =>
  `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>${title}</title><style>${CSS}</style></head><body>${body}</body></html>`

const dates = [...new Set(items.map((i) => i.date))].sort()
const period = `من ${longDate(dates[0])} إلى ${longDate(dates.at(-1)!)}`

// ═════════════ 1) دفتر اليومية ═════════════
function journalHtml() {
  let html = `<div class="head"><div><h1>دفتر اليومية</h1><div class="sub">مشروع الحلال · ${period}</div></div><div class="sub">المبالغ بالريال السعودي</div></div>`

  html += `<h2>المصروفات يوم بيوم</h2>`
  let run = 0
  for (const date of dates) {
    const list = items.filter((i) => i.date === date)
    const dayTotal = list.reduce((s, i) => s + i.amount, 0)
    run += dayTotal
    html += `<div class="day"><div class="dayhead"><span>${dayName(date)} ${longDate(date)}</span><span class="h">${hijri(date)}</span></div>
      <table><tr><th>ما اشتُري / صُرف (والعامل)</th><th>الباب</th><th class="n">السعر</th></tr>`
    for (const it of list) html += `<tr><td>${esc(it.note || it.description)}</td><td class="tag">${SHORT_ACC[it.accountId] ?? ''}</td><td class="n num">${money(it.amount)}</td></tr>`
    html += `<tr class="total"><td colspan="2">مجموع اليوم</td><td class="n num">${money(dayTotal)}</td></tr>
      <tr class="run"><td colspan="2">المجموع من البداية حتى هذا اليوم</td><td class="n num">${money(run)}</td></tr></table></div>`
  }
  html += `<div class="grand"><span>المجموع الكلي</span><span class="num">${money(total)} ريال</span></div>`

  // تفسير المشتريات
  html += `<h2 class="pb">تفسير المشتريات صنفاً صنفاً</h2>`
  const feed = items.filter((i) => i.accountId === 'feed')
  const feedTotal = feed.reduce((s, i) => s + i.amount, 0)
  html += `<h3>الأعلاف · المجموع ${money(feedTotal)} ريال</h3>`
  const EXPLAIN: Partial<Record<string, string>> = {
    'أعلاف (شحنة)': 'شحنة أعلاف كبيرة اشتُريت مرة وحدة مع نقلها وتحميلها وتنزيلها.',
    'شعير وذرة (مبلغ واحد)': 'شعير وذرة مكتوبين بالدفتر بمبلغ واحد بدون فصل.',
    'أصناف مخلوطة': 'سمسم وفول صويا وذرة مكتوبين بالدفتر بمبلغ واحد بدون سعر كل صنف.',
    الطحن: 'أجرة طحن الأعلاف في الطاحونة / المطحنة.',
  }
  const summaryRows: string[] = []
  let sections = ''
  for (const type of FEED_TYPES) {
    const list = feed.filter((i) => feedType(i.note || i.description) === type)
    if (!list.length) continue
    const sum = list.reduce((s, i) => s + i.amount, 0)
    const bags = list.reduce((s, i) => s + (bagsOf(i.note) ?? 0), 0)
    summaryRows.push(`<tr><td>${type}</td><td class="c num">${bags || '—'}</td><td class="n num">${money(sum)}</td></tr>`)
    sections += `<div class="day"><div class="dayhead"><span>${type}</span><span class="num">${money(sum)}</span></div>
      ${EXPLAIN[type] ? `<div class="explain" style="margin-top:4px">${EXPLAIN[type]}</div>` : ''}
      <table><tr><th>التاريخ</th><th>التفصيل</th><th class="c">الأكياس</th><th class="c">سعر الكيس</th><th class="n">المبلغ</th></tr>`
    for (const it of list) {
      const b = bagsOf(it.note)
      sections += `<tr><td style="white-space:nowrap">${longDate(it.date)}</td><td>${esc(it.note)}</td><td class="c num">${b ?? '—'}</td><td class="c num">${b ? money(Math.round(it.amount / b)) : '—'}</td><td class="n num">${money(it.amount)}</td></tr>`
    }
    sections += `</table></div>`
  }
  html += `<table><tr><th>الصنف</th><th class="c">الأكياس</th><th class="n">المبلغ</th></tr>${summaryRows.join('')}<tr class="total"><td>مجموع الأعلاف</td><td></td><td class="n num">${money(feedTotal)}</td></tr></table>`
  html += sections

  for (const acc of ['livestock', 'vet', 'equipment', 'transport', 'rent', 'well', 'maintenance', 'misc']) {
    const list = items.filter((i) => i.accountId === acc)
    if (!list.length) continue
    const sum = list.reduce((s, i) => s + i.amount, 0)
    html += `<div class="day"><h3>${accName.get(acc)} · ${money(sum)} ريال</h3><table><tr><th>التاريخ</th><th>التفصيل</th><th class="n">المبلغ</th></tr>`
    for (const it of list) html += `<tr><td style="white-space:nowrap">${longDate(it.date)}</td><td>${esc(it.note || it.description)}</td><td class="n num">${money(it.amount)}</td></tr>`
    html += `<tr class="total"><td colspan="2">المجموع</td><td class="n num">${money(sum)}</td></tr></table></div>`
  }
  // العامل داخل دفتر اليومية أيضاً
  {
    const list = items.filter((i) => i.accountId === 'wages')
    const sum = list.reduce((s, i) => s + i.amount, 0)
    html += `<div class="day"><h3>العامل (رواتب ومصاريف) · ${money(sum)} ريال</h3><table><tr><th>التاريخ</th><th>وش عطيناه</th><th>النوع</th><th class="n">المبلغ</th></tr>`
    for (const it of list) {
      const cat = splitNote(it.note || it.description)[0]?.cat ?? 'other'
      html += `<tr><td style="white-space:nowrap">${longDate(it.date)}</td><td>${esc(it.note || it.description)}</td><td class="tag">${WORKER_CAT_LABEL[cat]}</td><td class="n num">${money(it.amount)}</td></tr>`
    }
    html += `<tr class="total"><td colspan="3">المجموع</td><td class="n num">${money(sum)}</td></tr></table></div>`
  }

  const flagged = entries.filter((e) => e.flagged && e.flagNote)
  if (flagged.length) {
    html += `<div class="note"><b>بنود تحتاج تأكيد:</b><ul>${flagged.map((e) => `<li>${longDate(e.date)}: ${esc(e.flagNote!)}</li>`).join('')}</ul></div>`
  }
  html += `<div class="foot">دفتر الحلال · أُعد بتاريخ ${longDate(new Date().toISOString().slice(0, 10))}</div>`
  return page('دفتر اليومية', html)
}

// ═════════════ 2) ملف العامل ═════════════
function workerHtml() {
  const SALARY = 1000_00
  const DUE = 1500_00
  const CATS: WorkerCat[] = ['salary', 'phone', 'food', 'bonus', 'other']
  const worker = items
    .filter((i) => i.accountId === 'wages')
    .map((i) => {
      const p = splitNote(i.note || i.description)[0]
      return { ...i, label: i.note || i.description, cat: (p?.cat ?? 'other') as WorkerCat }
    })
  const first = worker.map((w) => w.date.slice(0, 7)).sort()[0]
  const last = '2026-11'
  const months: string[] = []
  for (let [y, m] = first.split('-').map(Number); `${y}-${String(m).padStart(2, '0')}` <= last; m === 12 ? ((m = 1), y++) : m++) months.push(`${y}-${String(m).padStart(2, '0')}`)
  const sumCat = (m: string, c: WorkerCat) => worker.filter((w) => w.date.startsWith(m) && w.cat === c).reduce((s, w) => s + w.amount, 0)
  const all = worker.reduce((s, w) => s + w.amount, 0)

  let html = `<div class="head"><div><h1>ملف العامل</h1><div class="sub">مشروع الحلال · من ${MONTHS[Number(months[0].slice(5)) - 1]} إلى ${MONTHS[Number(months.at(-1)!.slice(5)) - 1]} 2026</div></div><div class="sub">المبالغ بالريال السعودي</div></div>`
  html += `<div class="boxes">
    <div class="box dark"><div class="k">الراتب المستحق شهرياً</div><div class="v"><span class="num">${money(DUE)}</span> <span style="font-size:10pt;color:#d8c3a5">(${money(SALARY)} نقداً + 500 مقاضي العثيم)</span></div></div>
    <div class="box"><div class="k">موعد استحقاق الراتب</div><div class="v">يوم 10 من كل شهر</div></div>
    <div class="box"><div class="k">مجموع ما أُعطي للعامل</div><div class="v num">${money(all)}</div></div></div>`

  html += `<h2>الراتب: المستحق والمصروف</h2><div class="explain">الراتب المستحق 1,500 ريال يوم 10 من كل شهر: 1,000 نقداً + 500 مقاضي العثيم. «المصروف كراتب» = الراتب النقدي + مقاضي العثيم في ذلك الشهر.</div>
    <table><tr><th>الشهر</th><th>تاريخ الاستحقاق</th><th class="n">المستحق</th><th class="n">راتب نقدي</th><th class="n">مقاضي العثيم</th><th class="n">المصروف كراتب</th><th class="n">الفرق</th></tr>`
  let tDue = 0
  let tPaid = 0
  for (const m of months) {
    const due = `${m}-10`
    const cash = sumCat(m, 'salary')
    const food = sumCat(m, 'food')
    const paid = cash + food
    const diff = paid - DUE
    tDue += DUE
    tPaid += paid
    html += `<tr><td>شهر ${Number(m.slice(5))}</td><td style="white-space:nowrap">${longDate(due)}</td><td class="n num">${money(DUE)}</td><td class="n num">${cash ? money(cash) : '—'}</td><td class="n num">${food ? money(food) : '—'}</td><td class="n num"><b>${paid ? money(paid) : '—'}</b></td><td class="n">${diff === 0 ? '✓' : diff > 0 ? `<span class="num">+${money(diff)}</span> زيادة` : `<span class="num">${money(-diff)}</span> باقي`}</td></tr>`
  }
  const tDiff = tPaid - tDue
  html += `<tr class="total"><td colspan="2">المجموع</td><td class="n num">${money(tDue)}</td><td></td><td></td><td class="n num">${money(tPaid)}</td><td class="n">${tDiff >= 0 ? `<span class="num">+${money(tDiff)}</span> زيادة` : `<span class="num">${money(-tDiff)}</span> باقي`}</td></tr></table>
  <div class="explain">«باقي» يعني المصروف المسجّل أقل من 1,500 في ذلك الشهر (قد تكون مقاضي غير مسجّلة)، و«زيادة» يعني أكثر.</div>`

  html += `<h2 class="pb">التفصيل شهر بشهر</h2>`
  for (const m of months) {
    const list = worker.filter((w) => w.date.startsWith(m))
    const t = list.reduce((s, w) => s + w.amount, 0)
    html += `<div class="day"><div class="dayhead"><span>شهر ${Number(m.slice(5))} · ${MONTHS[Number(m.slice(5)) - 1]} 2026</span><span class="num">${t ? money(t) : ''}</span></div>`
    if (!list.length) {
      html += `<table><tr><td class="muted">لا توجد مصاريف مسجّلة للعامل في هذا الشهر.</td></tr></table></div>`
      continue
    }
    html += `<table><tr><th>التاريخ</th><th>وش عطيناه</th><th>النوع</th><th class="n">المبلغ</th></tr>`
    for (const w of list) html += `<tr><td style="white-space:nowrap">${dayName(w.date)} ${longDate(w.date)}</td><td>${esc(w.label)}</td><td class="tag">${WORKER_CAT_LABEL[w.cat]}</td><td class="n num">${money(w.amount)}</td></tr>`
    html += `<tr class="total"><td colspan="3">مجموع الشهر</td><td class="n num">${money(t)}</td></tr></table></div>`
  }
  html += `<div class="grand"><span>مجموع ما أُعطي للعامل</span><span class="num">${money(all)} ريال</span></div>`
  html += `<div class="note"><b>للتأكيد:</b><ul>
    <li>الراتب المستحق 1,500: منها 1,000 نقداً و 500 تُصرف مقاضي من العثيم (مسجّلة تحت «المقاضي والأكل»).</li><li>راتب شهر 8 (1,000 بتاريخ 10 أغسطس) أُضيف لأنه غير مكتوب بالدفتر، ومقاضي العثيم لشهور 6 و 7 و 8 غير مسجّلة.</li>
    <li>سطر 25 أكتوبر «مقاضي أحمد 33 + سوا 115» عليه شطب بالدفتر الأصلي.</li></ul></div>`
  html += `<div class="foot">دفتر الحلال · أُعد بتاريخ ${longDate(new Date().toISOString().slice(0, 10))}</div>`
  return page('ملف العامل', html)
}

const require = createRequire(import.meta.url)
const { chromium } = require('playwright') as typeof import('playwright')
const browser = await chromium.launch()
const p = await browser.newPage()
for (const [name, html] of [
  ['دفتر-اليومية', journalHtml()],
  ['ملف-العامل', workerHtml()],
] as const) {
  fs.writeFileSync(path.join(OUT, `${name}.html`), html)
  await p.setContent(html, { waitUntil: 'load' })
  await p.evaluate(() => document.fonts.ready)
  await p.pdf({
    path: path.join(OUT, `${name}.pdf`),
    format: 'A4',
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: '<span></span>',
    footerTemplate: '<div style="width:100%;text-align:center;font-size:9px;color:#8a7768"><span class="pageNumber"></span> / <span class="totalPages"></span></div>',
    margin: { top: '14mm', bottom: '16mm', left: '12mm', right: '12mm' },
  })
  console.log('✔', name)
}
await browser.close()
