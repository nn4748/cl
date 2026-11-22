/**
 * خادم Supabase وهمي في الذاكرة للاختبار — يحاكي القيود المهمة في schema.sql:
 * المعرّف فريد، رقم القيد فريد، updated_at يحدده الخادم، لا حذف نهائي.
 */
type Row = Record<string, unknown>

export class FakeServer {
  tables: Record<string, Row[]> = { entries: [], accounts: [] }
  clock = Date.parse('2026-11-01T00:00:00Z')
  online = true
  /** يُسقط الرد بعد تنفيذ الكتابة (لمحاكاة انقطاع الاتصال بعد الإرسال) */
  dropNextWriteResponse = false

  now() {
    this.clock += 1000
    return new Date(this.clock).toISOString()
  }

  client() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const server = this
    return {
      auth: {
        getSession: async () => ({ data: { session: { user: { email: 'test@example.com' } } } }),
        signOut: async () => ({}),
      },
      from(table: string) {
        return new Query(server, table)
      },
    }
  }
}

class Query {
  private filters: [string, unknown][] = []
  private op: 'select' | 'insert' | 'update' | 'upsert' = 'select'
  private payload: Row | Row[] | null = null
  private orderBy: { col: string; asc: boolean } | null = null
  private lim: number | null = null
  private rng: [number, number] | null = null
  private single = false
  private returning = false

  constructor(
    private server: FakeServer,
    private table: string,
  ) {}

  select() {
    if (this.op !== 'select') this.returning = true
    return this
  }
  insert(row: Row | Row[]) {
    this.op = 'insert'
    this.payload = row
    return this
  }
  update(row: Row) {
    this.op = 'update'
    this.payload = row
    return this
  }
  upsert(rows: Row[]) {
    this.op = 'upsert'
    this.payload = rows
    return this
  }
  eq(col: string, v: unknown) {
    this.filters.push([col, v])
    return this
  }
  order(col: string, o?: { ascending?: boolean }) {
    this.orderBy = { col, asc: o?.ascending !== false }
    return this
  }
  limit(n: number) {
    this.lim = n
    return this
  }
  range(a: number, b: number) {
    this.rng = [a, b]
    return this
  }
  maybeSingle() {
    this.single = true
    return this
  }

  private match(r: Row) {
    return this.filters.every(([c, v]) => (c === 'updated_at' ? Date.parse(String(r[c])) === Date.parse(String(v)) : r[c] === v))
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  then(resolve: (v: any) => void, reject: (e: unknown) => void) {
    try {
      resolve(this.exec())
    } catch (e) {
      reject(e)
    }
  }

  private exec() {
    const s = this.server
    if (!s.online) throw new TypeError('Failed to fetch')
    const rows = s.tables[this.table]
    const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x))

    if (this.op === 'select') {
      let out = rows.filter((r) => this.match(r))
      if (this.orderBy) {
        const { col, asc } = this.orderBy
        out = [...out].sort((a, b) => ((a[col] as number) - (b[col] as number)) * (asc ? 1 : -1))
      }
      if (this.rng) out = out.slice(this.rng[0], this.rng[1] + 1)
      if (this.lim != null) out = out.slice(0, this.lim)
      if (this.single) return { data: out[0] ? clone(out[0]) : null, error: null }
      return { data: clone(out), error: null }
    }

    if (this.op === 'insert') {
      const row = clone(this.payload as Row)
      if (rows.some((r) => r.id === row.id)) return { data: null, error: { code: '23505', message: 'duplicate key value violates unique constraint "entries_pkey"' } }
      if (this.table === 'entries' && rows.some((r) => r.number === row.number))
        return { data: null, error: { code: '23505', message: 'duplicate key value violates unique constraint "entries_number_key"' } }
      if (this.table === 'entries') {
        const lines = row.lines as { debit: number; credit: number }[]
        const d = lines.reduce((x, l) => x + l.debit, 0)
        const c = lines.reduce((x, l) => x + l.credit, 0)
        if (d !== c || d <= 0) return { data: null, error: { code: 'P0001', message: 'unbalanced' } }
      }
      row.updated_at = s.now()
      rows.push(row)
      if (s.dropNextWriteResponse) {
        s.dropNextWriteResponse = false
        throw new TypeError('Failed to fetch')
      }
      return { data: this.returning ? [clone(row)] : null, error: null }
    }

    if (this.op === 'update') {
      const patch = clone(this.payload as Row)
      delete patch.id
      delete patch.number
      delete patch.created_at
      const hit = rows.filter((r) => this.match(r))
      for (const r of hit) Object.assign(r, patch, { updated_at: s.now() })
      if (s.dropNextWriteResponse) {
        s.dropNextWriteResponse = false
        throw new TypeError('Failed to fetch')
      }
      return { data: clone(hit), error: null }
    }

    // upsert
    for (const row of this.payload as Row[]) {
      const i = rows.findIndex((r) => r.id === row.id)
      if (i >= 0) rows[i] = { ...rows[i], ...clone(row) }
      else rows.push(clone(row))
    }
    return { data: null, error: null }
  }
}
