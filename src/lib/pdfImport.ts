import { parseJournal, type ParseResult, type TextItem } from './pdfParse'

export interface PdfExtraction extends ParseResult {
  pageImages: string[]
  pages: number
}

/** يقرأ ملف PDF في المتصفح (بدون رفعه لأي خادم) ويستخرج القيود */
export async function extractFromPdf(file: File): Promise<PdfExtraction> {
  const pdfjs = await import('pdfjs-dist')
  const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl
  const data = new Uint8Array(await file.arrayBuffer())
  const doc = await pdfjs.getDocument({ data }).promise
  const items: TextItem[] = []
  const pageImages: string[] = []
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p)
    const tc = await page.getTextContent()
    for (const it of tc.items) {
      if (!('str' in it)) continue
      items.push({ str: it.str, x: it.transform[4], y: it.transform[5], w: it.width, page: p })
    }
    // صورة مصغرة للصفحة للمراجعة البصرية
    if (p <= 20) {
      const viewport = page.getViewport({ scale: 1.4 })
      const canvas = document.createElement('canvas')
      canvas.width = viewport.width
      canvas.height = viewport.height
      await page.render({ canvas, viewport }).promise
      pageImages.push(canvas.toDataURL('image/jpeg', 0.8))
    }
  }
  const parsed = parseJournal(items)
  return { ...parsed, pageImages, pages: doc.numPages }
}
