import { useEffect, useRef, useState } from 'react'
import { KIND_LABEL } from '../lib/accounts'
import { downloadBackup, restoreBackup } from '../lib/backup'
import { relativeTime } from '../lib/format'
import { formatSAR } from '../lib/money'
import { isIOS, promptInstall, usePwa } from '../lib/pwa'
import { updateSettings, upsertAccount, useApp } from '../lib/store'
import { currentUserEmail, getConflictServerVersion, isConfigured, resetClient, resolveConflict, signIn, signOut, signUp, syncNow } from '../lib/sync'
import type { Account, AccountKind, Entry } from '../lib/types'
import { IconDownload, IconEdit, IconFile, IconShare, IconSync, IconUpload } from '../ui/icons'
import { confirmDialog, go, Sheet, toast } from '../ui/kit'
import { syncLabel } from '../ui/SyncPill'

export default function Settings() {
  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">الإعدادات</h1>
          <p className="page-sub">المزامنة، النسخ الاحتياطي، الحسابات، والاستيراد</p>
        </div>
      </div>
      <div className="grid grid-main">
        <div className="stack">
          <InstallCard />
          <SyncCard />
          <BackupCard />
        </div>
        <div className="stack">
          <ImportCard />
          <AccountsCard />
          <BusinessCard />
        </div>
      </div>
    </div>
  )
}

function InstallCard() {
  const pwa = usePwa()
  const [help, setHelp] = useState(false)
  if (pwa.installed && !pwa.updateReady) return null
  return (
    <section className="card">
      {pwa.updateReady ? (
        <>
          <h2 className="card-title">تحديث جديد متوفر</h2>
          <p className="muted" style={{ marginTop: 0 }}>
            يوجد إصدار أحدث من التطبيق. بياناتك محفوظة ولن تتأثر.
          </p>
          <button className="btn btn-primary" onClick={() => pwa.applyUpdate?.()}>
            تحديث الآن
          </button>
        </>
      ) : (
        <>
          <h2 className="card-title">ثبّت التطبيق على جوالك</h2>
          <p className="muted" style={{ marginTop: 0 }}>
            يفتح من الشاشة الرئيسية مثل أي تطبيق، ويعمل بدون إنترنت.
          </p>
          {pwa.installEvent ? (
            <button className="btn btn-primary" onClick={() => promptInstall()}>
              <IconDownload /> تثبيت «دفتر الحلال»
            </button>
          ) : (
            <button className="btn btn-outline" onClick={() => setHelp(true)}>
              <IconShare /> طريقة التثبيت
            </button>
          )}
        </>
      )}
      <Sheet open={help} onClose={() => setHelp(false)} title="تثبيت التطبيق">
        {isIOS() ? (
          <ol style={{ paddingInlineStart: 20, lineHeight: 2 }}>
            <li>افتح الموقع من متصفح <b>Safari</b></li>
            <li>
              اضغط زر المشاركة <IconShare width={18} style={{ verticalAlign: 'middle' }} /> أسفل الشاشة
            </li>
            <li>
              اختر <b>«إضافة إلى الشاشة الرئيسية»</b>
            </li>
            <li>
              اضغط <b>«إضافة»</b>، سيظهر تطبيق «دفتر الحلال» بين تطبيقاتك
            </li>
          </ol>
        ) : (
          <ol style={{ paddingInlineStart: 20, lineHeight: 2 }}>
            <li>افتح الموقع من متصفح <b>Chrome</b></li>
            <li>اضغط قائمة النقاط الثلاث ⋮ أعلى الشاشة</li>
            <li>
              اختر <b>«تثبيت التطبيق»</b> أو <b>«إضافة إلى الشاشة الرئيسية»</b>
            </li>
          </ol>
        )}
        <button className="btn btn-primary btn-lg" onClick={() => setHelp(false)}>
          تم
        </button>
      </Sheet>
    </section>
  )
}

function SyncCard() {
  const { settings, sync, entries, online } = useApp()
  const [url, setUrl] = useState(settings.supabaseUrl)
  const [key, setKey] = useState(settings.supabaseKey)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [user, setUser] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [editCfg, setEditCfg] = useState(!settings.supabaseUrl)
  const conflicts = entries.filter((e) => e.sync === 'conflict')

  useEffect(() => {
    void currentUserEmail().then(setUser)
  }, [settings.supabaseUrl, settings.supabaseKey, sync.status])

  const saveCfg = async () => {
    const u = url.trim().replace(/\/+$/, '')
    if (u && !/^https:\/\/.+/.test(u)) return toast('رابط Supabase يجب أن يبدأ بـ https://', 'err')
    resetClient()
    await updateSettings({ supabaseUrl: u, supabaseKey: key.trim() })
    setEditCfg(false)
    toast(u ? 'تم حفظ إعدادات الخادم' : 'تم إيقاف المزامنة السحابية')
    void syncNow()
  }

  const auth = async (kind: 'in' | 'up') => {
    setBusy(true)
    try {
      if (kind === 'in') {
        await signIn(email.trim(), password)
        toast('تم تسجيل الدخول')
      } else {
        toast(await signUp(email.trim(), password))
      }
      setPassword('')
      setUser(await currentUserEmail())
    } catch (e) {
      toast((e as Error).message, 'err')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="card">
      <h2 className="card-title">
        المزامنة السحابية
        <span className={`badge ${sync.status === 'synced' ? 'ok' : sync.status === 'error' ? 'err' : sync.status === 'local' ? '' : 'warn'}`}>{syncLabel(sync.status, sync.pending)}</span>
      </h2>

      <dl className="kv" style={{ marginBottom: 14 }}>
        <dt>الاتصال</dt>
        <dd>{online ? 'متصل بالإنترنت' : 'بدون إنترنت'}</dd>
        <dt>قيود بانتظار الإرسال</dt>
        <dd className="num">{sync.pending}</dd>
        <dt>آخر مزامنة</dt>
        <dd>{relativeTime(settings.lastSyncAt)}</dd>
        {user && (
          <>
            <dt>الحساب</dt>
            <dd dir="ltr" style={{ textAlign: 'right' }}>
              {user}
            </dd>
          </>
        )}
      </dl>
      {sync.message && <div className="notice" style={{ marginBottom: 12 }}>{sync.message}</div>}

      {!isConfigured() && !editCfg && (
        <p className="muted small">
          البيانات محفوظة الآن على هذا الجهاز فقط (IndexedDB) ولا تضيع عند إغلاق المتصفح. لمشاركة الدفتر بين أكثر من جهاز، اربطه بقاعدة بيانات Supabase.
        </p>
      )}

      {editCfg ? (
        <div>
          <label className="field">
            <span className="label">رابط المشروع (Project URL)</span>
            <input className="input input-sm" dir="ltr" placeholder="https://xxxx.supabase.co" value={url} onChange={(e) => setUrl(e.target.value)} />
          </label>
          <label className="field">
            <span className="label">المفتاح العام (anon / publishable key)</span>
            <input className="input input-sm" dir="ltr" placeholder="eyJhbGciOi…" value={key} onChange={(e) => setKey(e.target.value)} />
          </label>
          <p className="muted small">
            أنشئ مشروعاً مجانياً على supabase.com، ثم شغّل ملف <code>supabase/schema.sql</code> من SQL Editor.
          </p>
          <div className="row">
            <button className="btn btn-primary" onClick={saveCfg}>
              حفظ
            </button>
            {settings.supabaseUrl && (
              <button className="btn btn-ghost" onClick={() => setEditCfg(false)}>
                إلغاء
              </button>
            )}
          </div>
        </div>
      ) : isConfigured() && !user ? (
        <div>
          <label className="field">
            <span className="label">البريد الإلكتروني</span>
            <input className="input input-sm" dir="ltr" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="field">
            <span className="label">كلمة المرور</span>
            <input className="input input-sm" dir="ltr" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          <div className="row wrap">
            <button className="btn btn-primary" disabled={busy || !email || !password} onClick={() => auth('in')}>
              تسجيل الدخول
            </button>
            <button className="btn btn-outline" disabled={busy || !email || password.length < 6} onClick={() => auth('up')}>
              حساب جديد
            </button>
          </div>
        </div>
      ) : null}

      {!editCfg && (
        <div className="row wrap" style={{ marginTop: 12 }}>
          {isConfigured() && user && (
            <button className="btn btn-primary btn-sm" onClick={() => syncNow()} disabled={!online || sync.status === 'syncing'}>
              <IconSync /> مزامنة الآن
            </button>
          )}
          <button className="btn btn-outline btn-sm" onClick={() => setEditCfg(true)}>
            {isConfigured() ? 'تعديل إعدادات الخادم' : 'ربط Supabase'}
          </button>
          {user && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={async () => {
                if (sync.pending && !(await confirmDialog({ title: 'يوجد قيود لم تُرسل بعد', body: 'ستبقى محفوظة على هذا الجهاز وتُرسل بعد تسجيل الدخول مجدداً.', confirm: 'تسجيل الخروج' }))) return
                await signOut()
                setUser(null)
              }}
            >
              تسجيل الخروج
            </button>
          )}
        </div>
      )}

      {conflicts.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <hr className="hr" />
          <h3 className="card-title" style={{ fontSize: 15 }}>
            قيود متعارضة ({conflicts.length})
          </h3>
          {conflicts.map((e) => (
            <ConflictRow key={e.id} entry={e} />
          ))}
        </div>
      )}
    </section>
  )
}

function ConflictRow({ entry }: { entry: Entry }) {
  const [server, setServer] = useState<Entry | undefined>()
  useEffect(() => {
    void getConflictServerVersion(entry.id).then(setServer)
  }, [entry.id])
  const total = (e?: Entry) => formatSAR(e?.lines.reduce((s, l) => s + l.debit, 0) ?? 0)
  return (
    <div className="card" style={{ padding: 12, background: 'var(--cream)', boxShadow: 'none' }}>
      <b>قيد رقم {entry.number}</b>، عُدّل على جهاز آخر أثناء تعديلك له
      <div className="grid grid-2 small" style={{ margin: '8px 0' }}>
        <div>
          <div className="muted">نسختك</div>
          {entry.description} · <span className="money">{total(entry)}</span>
        </div>
        <div>
          <div className="muted">النسخة الأخرى</div>
          {server?.description} · <span className="money">{total(server)}</span>
        </div>
      </div>
      <div className="row">
        <button className="btn btn-sm btn-primary" onClick={() => resolveConflict(entry.id, 'mine')}>
          اعتماد نسختي
        </button>
        <button className="btn btn-sm btn-outline" onClick={() => resolveConflict(entry.id, 'theirs')}>
          اعتماد النسخة الأخرى
        </button>
      </div>
    </div>
  )
}

function BackupCard() {
  const { settings, entries } = useApp()
  const fileRef = useRef<HTMLInputElement>(null)
  const [persisted, setPersisted] = useState<boolean | null>(null)
  useEffect(() => {
    void navigator.storage?.persisted?.().then(setPersisted)
  }, [])

  const restore = async (f: File) => {
    const ok = await confirmDialog({
      title: 'استرجاع من نسخة احتياطية؟',
      body: 'سيتم دمج القيود من الملف مع الدفتر الحالي. لن يُحذف أو يُستبدل أي قيد موجود، والقيود المكررة تُتجاهل تلقائياً.',
      confirm: 'استرجاع',
    })
    if (!ok) return
    try {
      const r = await restoreBackup(await f.text())
      toast(`تمت إضافة ${r.added} قيد${r.skippedSame ? ` · ${r.skippedSame} موجود مسبقاً` : ''}${r.renumbered ? ` · ${r.renumbered} أعيد ترقيمه` : ''}${r.invalid ? ` · ${r.invalid} مرفوض` : ''}`)
    } catch (e) {
      toast((e as Error).message, 'err')
    }
  }

  const stale = !settings.lastBackupAt || Date.now() - Date.parse(settings.lastBackupAt) > 7 * 86400_000
  return (
    <section className="card">
      <h2 className="card-title">النسخ الاحتياطي والاسترجاع</h2>
      <dl className="kv" style={{ marginBottom: 12 }}>
        <dt>آخر نسخة احتياطية</dt>
        <dd>{relativeTime(settings.lastBackupAt)}</dd>
        <dt>عدد القيود</dt>
        <dd className="num">{entries.length}</dd>
        <dt>حماية التخزين</dt>
        <dd>{persisted ? 'مفعّلة، المتصفح لن يحذف البيانات' : 'غير مضمونة، احتفظ بنسخة احتياطية'}</dd>
      </dl>
      {stale && entries.length > 0 && (
        <div className="notice" style={{ marginBottom: 12 }}>
          ننصح بأخذ نسخة احتياطية أسبوعياً وحفظها في الملفات أو إرسالها لنفسك.
        </div>
      )}
      <div className="grid grid-2">
        <button className="btn btn-primary" onClick={() => downloadBackup()}>
          <IconDownload /> نسخة احتياطية
        </button>
        <button className="btn btn-outline" onClick={() => fileRef.current?.click()}>
          <IconUpload /> استرجاع
        </button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0]
          e.target.value = ''
          if (f) void restore(f)
        }}
      />
    </section>
  )
}

function ImportCard() {
  return (
    <section className="card">
      <h2 className="card-title">استيراد دفتر اليومية</h2>
      <p className="muted" style={{ marginTop: 0 }}>
        استيراد القيود من ملف PDF للدفتر الأصلي، تُعرض كل القيود للمراجعة والاعتماد قبل إدخالها.
      </p>
      <button className="btn btn-outline" onClick={() => go('/import')}>
        <IconFile /> استيراد من PDF
      </button>
    </section>
  )
}

function AccountsCard() {
  const { accounts, entries } = useApp()
  const [edit, setEdit] = useState<Account | null>(null)
  const used = new Set(entries.flatMap((e) => e.lines.map((l) => l.accountId)))
  const save = async () => {
    if (!edit) return
    try {
      await upsertAccount(edit)
      setEdit(null)
      toast('تم حفظ الحساب')
    } catch (e) {
      toast((e as Error).message, 'err')
    }
  }
  return (
    <section className="card">
      <h2 className="card-title">
        دليل الحسابات
        <button className="btn btn-outline btn-sm" onClick={() => setEdit({ id: 'acc_' + crypto.randomUUID().slice(0, 8), name: '', kind: 'expense' })}>
          + حساب
        </button>
      </h2>
      <ul className="list">
        {accounts.map((a) => (
          <li key={a.id} className="list-item" onClick={() => setEdit(a)} style={{ opacity: a.archived ? 0.5 : 1, padding: '9px 0' }}>
            <div className="list-main">
              <div className="list-title" style={{ fontSize: 14.5 }}>
                {a.name}
              </div>
              <div className="list-meta">
                {KIND_LABEL[a.kind]}
                {a.archived && ' · مؤرشف'}
              </div>
            </div>
            <IconEdit width={18} className="muted" />
          </li>
        ))}
      </ul>
      <Sheet open={!!edit} onClose={() => setEdit(null)} title={edit && accounts.some((a) => a.id === edit.id) ? 'تعديل الحساب' : 'حساب جديد'}>
        {edit && (
          <>
            <label className="field">
              <span className="label">اسم الحساب</span>
              <input className="input" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} autoFocus />
            </label>
            <label className="field">
              <span className="label">النوع</span>
              <select
                className="select"
                value={edit.kind}
                disabled={used.has(edit.id)}
                onChange={(e) => setEdit({ ...edit, kind: e.target.value as AccountKind })}
              >
                {Object.entries(KIND_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
              {used.has(edit.id) && <span className="muted small">لا يمكن تغيير نوع حساب مستخدم في قيود</span>}
            </label>
            <label className="row field">
              <input type="checkbox" className="check" checked={!!edit.archived} onChange={(e) => setEdit({ ...edit, archived: e.target.checked || undefined })} />
              <span>أرشفة (إخفاء من القوائم دون حذف القيود)</span>
            </label>
            <button className="btn btn-primary btn-lg" onClick={save}>
              حفظ
            </button>
          </>
        )}
      </Sheet>
    </section>
  )
}

function BusinessCard() {
  const { settings } = useApp()
  const [name, setName] = useState(settings.businessName)
  const [owner, setOwner] = useState(settings.ownerName)
  const pwa = usePwa()
  return (
    <section className="card">
      <h2 className="card-title">بيانات المشروع</h2>
      <label className="field">
        <span className="label">اسم المشروع (يظهر في التقارير)</span>
        <input className="input input-sm" value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label className="field">
        <span className="label">اسم المالك</span>
        <input className="input input-sm" value={owner} onChange={(e) => setOwner(e.target.value)} />
      </label>
      <button
        className="btn btn-primary btn-sm"
        onClick={async () => {
          await updateSettings({ businessName: name.trim() || 'مشروع الحلال', ownerName: owner.trim() })
          toast('تم الحفظ')
        }}
      >
        حفظ
      </button>
      <p className="muted small" style={{ marginBottom: 0 }}>
        دفتر الحلال · الإصدار {__APP_VERSION__}
        {pwa.offlineReady && ' · يعمل بدون إنترنت'}
      </p>
    </section>
  )
}
