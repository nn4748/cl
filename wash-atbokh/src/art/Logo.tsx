/**
 * Brand mark: a cooking pot whose steam curls into a question mark.
 * The curl is drawn as the Arabic "؟" (open to the right) in both languages,
 * a small nod to where the name comes from.
 */
export function LogoMark({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-hidden="true" focusable="false">
      <rect x="3" y="5" width="58" height="56" rx="16" fill="#2A1A12" />
      <rect x="0" y="2" width="58" height="56" rx="16" fill="var(--saffron)" stroke="#2A1A12" strokeWidth="3" />
      <path d="M12 33h34v6a10 10 0 0 1-10 10H22a10 10 0 0 1-10-10z" fill="#2A1A12" />
      <rect x="8" y="29" width="42" height="6" rx="3" fill="#2A1A12" />
      <path d="M27 24c0-5.5 8-5.5 8-10.5s-6.5-6-9.5-2.5" fill="none" stroke="#2A1A12" strokeWidth="4" strokeLinecap="round" className="logo-steam" />
      <circle cx="33" cy="26.5" r="2.4" fill="#2A1A12" />
    </svg>
  )
}
