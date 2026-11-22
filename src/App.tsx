import { useEffect, useState } from 'react'
import { useApp } from './lib/store'
import AddEntry from './pages/AddEntry'
import Dashboard from './pages/Dashboard'
import Expenses from './pages/Expenses'
import ImportPage from './pages/Import'
import Journal from './pages/Journal'
import Reports from './pages/Reports'
import Settings from './pages/Settings'
import { IconBook, IconChart, IconCloudOff, IconHome, IconPlus, IconSettings, IconWallet } from './ui/icons'
import { ConfirmHost, go, Toasts, useRoute } from './ui/kit'
import SyncPill from './ui/SyncPill'

const NAV = [
  { path: '/', label: 'الرئيسية', Icon: IconHome },
  { path: '/expenses', label: 'المصروفات', Icon: IconWallet },
  { path: '/add', label: 'تسجيل', Icon: IconPlus, add: true },
  { path: '/journal', label: 'الدفتر', Icon: IconBook },
  { path: '/reports', label: 'التقارير', Icon: IconChart },
  { path: '/settings', label: 'الإعدادات', Icon: IconSettings, railOnly: true },
]

export default function App() {
  const app = useApp()
  const route = useRoute()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 4)
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])

  if (!app.ready) {
    return (
      <div style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center' }}>
        <img src="/icons/icon-192.png" width={72} height={72} style={{ borderRadius: 20 }} alt="" />
      </div>
    )
  }

  let page
  switch (route.path) {
    case '/add':
      page = <AddEntry key={route.params.get('edit') ?? 'new'} editId={route.params.get('edit')} />
      break
    case '/expenses':
      page = <Expenses />
      break
    case '/journal':
      page = <Journal />
      break
    case '/reports':
      page = <Reports />
      break
    case '/settings':
      page = <Settings />
      break
    case '/import':
      page = <ImportPage />
      break
    default:
      page = <Dashboard />
  }

  const activePath = route.path === '/import' ? '/settings' : route.path

  return (
    <div className="app">
      <header className={`topbar no-print ${scrolled ? 'scrolled' : ''}`}>
        <div className="brand">
          <img src="/icons/icon-192.png" alt="" />
          <div className="brand-text">
            <div className="brand-title">دفتر الحلال</div>
            <div className="brand-sub">{app.settings.businessName || 'النظام المحاسبي لإدارة مشروع الحلال'}</div>
          </div>
        </div>
        <SyncPill />
        <button className="btn btn-ghost btn-icon top-settings" onClick={() => go('/settings')} aria-label="الإعدادات">
          <IconSettings />
        </button>
      </header>

      <main className="main">
        {!app.online && (
          <div className="offline-banner">
            <IconCloudOff width={18} height={18} />
            بدون إنترنت · القيود محفوظة على الجهاز
          </div>
        )}
        <div className="view" key={route.path + (route.params.get('edit') ?? '') + (route.params.get('m') ?? '') + (route.params.get('tab') ?? '')}>
          {page}
        </div>
      </main>

      <nav className="bottomnav no-print" aria-label="التنقل الرئيسي">
        <div className="rail-brand">
          <img src="/icons/icon-192.png" alt="" />
          <div>
            <div className="brand-title">دفتر الحلال</div>
            <div className="brand-sub">النظام المحاسبي لإدارة مشروع الحلال</div>
          </div>
        </div>
        {NAV.map(({ path, label, Icon, add, railOnly }) => (
          <button
            key={path}
            className={`navbtn ${add ? 'add' : ''} ${railOnly ? 'rail-only' : ''} ${activePath === path ? 'active' : ''}`}
            onClick={() => go(path)}
            aria-current={activePath === path ? 'page' : undefined}
          >
            {add ? (
              <span className="plus">
                <Icon />
              </span>
            ) : (
              <Icon />
            )}
            <span>{label}</span>
          </button>
        ))}
      </nav>
      <Toasts />
      <ConfirmHost />
    </div>
  )
}
