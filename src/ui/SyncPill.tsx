import { useApp } from '../lib/store'
import { syncNow } from '../lib/sync'
import { go } from './kit'

export function syncLabel(status: string, pending: number): string {
  switch (status) {
    case 'synced':
      return 'تمت المزامنة'
    case 'syncing':
      return 'جارِ المزامنة…'
    case 'offline':
      return pending ? `${pending} بانتظار الإرسال` : 'بدون إنترنت'
    case 'signed_out':
      return 'سجّل الدخول للمزامنة'
    case 'error':
      return 'تحتاج مراجعة'
    default:
      return 'محفوظ على الجهاز'
  }
}

export default function SyncPill() {
  const { sync } = useApp()
  const label = sync.status === 'synced' && sync.pending ? `${sync.pending} بانتظار الإرسال` : syncLabel(sync.status, sync.pending)
  return (
    <button
      className={`sync-pill ${sync.pending && sync.status === 'synced' ? 'syncing' : sync.status}`}
      onClick={() => (sync.status === 'local' || sync.status === 'signed_out' || sync.status === 'error' ? go('/settings') : void syncNow())}
      title={sync.message ?? label}
    >
      <span className="dot" />
      {label}
    </button>
  )
}
