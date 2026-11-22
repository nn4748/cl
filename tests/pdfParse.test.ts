import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseJournal, type TextItem } from '../src/lib/pdfParse'

const PDF = path.join(__dirname, 'fixtures', 'daftar_alyawmiya.pdf')

describe.runIf(fs.existsSync(PDF))('استخراج القيود من PDF', () => {
  it('يستخرج 14 قيداً بنفس المجموع المكتوب في الملف', async () => {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
    const doc = await pdfjs.getDocument({ data: new Uint8Array(fs.readFileSync(PDF)) }).promise
    const items: TextItem[] = []
    for (let p = 1; p <= doc.numPages; p++) {
      const tc = await (await doc.getPage(p)).getTextContent()
      for (const it of tc.items) if ('str' in it) items.push({ str: it.str, x: it.transform[4], y: it.transform[5], w: it.width, page: p })
    }
    const r = parseJournal(items)
    expect(r.entries).toHaveLength(14)
    const debit = r.entries.flatMap((e) => e.lines).filter((l) => l.side === 'debit').reduce((s, l) => s + l.amount, 0)
    expect(debit).toBe(29793800)
    expect(r.statedTotal?.debit).toBe(29793800)
    expect(r.entries[0]).toMatchObject({ number: 1, date: '2026-09-07', description: 'شراء الحلال وتجهيز المشروع' })
    expect(r.entries[0].lines[0].accountName).toBe('الحلال (المواشي)')
    expect(r.entries.filter((e) => e.marked).map((e) => e.number)).toEqual([2, 7, 8, 11, 12])
    for (const e of r.entries) {
      const d = e.lines.filter((l) => l.side === 'debit').reduce((s, l) => s + l.amount, 0)
      const c = e.lines.filter((l) => l.side === 'credit').reduce((s, l) => s + l.amount, 0)
      expect(d).toBe(c)
    }
  })
})
