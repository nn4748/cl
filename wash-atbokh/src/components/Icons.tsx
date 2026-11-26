import type { SVGProps } from 'react'

type P = SVGProps<SVGSVGElement> & { size?: number }

function Base({ size = 20, children, ...rest }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...rest}>
      {children}
    </svg>
  )
}

export const IconPlus = (p: P) => <Base {...p}><path d="M12 5v14M5 12h14" /></Base>
export const IconMinus = (p: P) => <Base {...p}><path d="M5 12h14" /></Base>
export const IconX = (p: P) => <Base {...p}><path d="M6 6l12 12M18 6L6 18" /></Base>
export const IconCheck = (p: P) => <Base {...p}><path d="M5 12.5l4.5 4.5L19 7.5" /></Base>
export const IconClock = (p: P) => <Base {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></Base>
export const IconCamera = (p: P) => <Base {...p}><path d="M4 8.5h3l1.6-2.5h6.8L17 8.5h3v10H4z" /><circle cx="12" cy="13" r="3.4" /></Base>
export const IconImage = (p: P) => <Base {...p}><rect x="3.5" y="5" width="17" height="14" rx="2" /><circle cx="9" cy="10" r="1.6" /><path d="M20.5 16l-5-5-8 8" /></Base>
export const IconPlay = (p: P) => <Base {...p}><path d="M8 5.5v13l10-6.5z" fill="currentColor" /></Base>
export const IconPause = (p: P) => <Base {...p}><path d="M8.5 5.5v13M15.5 5.5v13" strokeWidth="3" /></Base>
export const IconReset = (p: P) => <Base {...p}><path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3" /><path d="M4.5 4.5v4h4" /></Base>
export const IconUsers = (p: P) => <Base {...p}><circle cx="9" cy="8.5" r="3.2" /><path d="M3.5 19c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5" /><circle cx="16.5" cy="9.5" r="2.5" /><path d="M16 14c2.4 0 4 1.6 4.5 4.5" /></Base>
export const IconSound = (p: P) => <Base {...p}><path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z" /><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" /></Base>
export const IconMute = (p: P) => <Base {...p}><path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z" /><path d="M16 9.5l5 5M21 9.5l-5 5" /></Base>
export const IconSun = (p: P) => <Base {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" /></Base>
export const IconPot = (p: P) => <Base {...p}><path d="M4 11h16v4a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z" /><path d="M2.5 11h19M9 7.5c0-1.5 2-1.5 2-3M13 7.5c0-1.5 2-1.5 2-3" /></Base>
export const IconLeaf = (p: P) => <Base {...p}><path d="M5 19c0-8 5-13 14-14 0 9-5 14-13 14z" /><path d="M5 19l7-7" /></Base>
export const IconBell = (p: P) => <Base {...p}><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" /><path d="M10 20.5a2 2 0 0 0 4 0" /></Base>
export const IconList = (p: P) => <Base {...p}><path d="M9 6.5h11M9 12h11M9 17.5h11" /><circle cx="4.5" cy="6.5" r="1" fill="currentColor" /><circle cx="4.5" cy="12" r="1" fill="currentColor" /><circle cx="4.5" cy="17.5" r="1" fill="currentColor" /></Base>
export const IconSwap = (p: P) => <Base {...p}><path d="M7 7h12l-3-3M17 17H5l3 3" /></Base>

/** Points in reading direction: flips automatically in RTL via the .dir-icon class. */
export const IconArrow = (p: P) => <Base {...p} className={`dir-icon ${p.className ?? ''}`}><path d="M5 12h14M13 6l6 6-6 6" /></Base>
export const IconChevron = (p: P) => <Base {...p} className={`dir-icon ${p.className ?? ''}`}><path d="M9 5.5l6.5 6.5L9 18.5" /></Base>
