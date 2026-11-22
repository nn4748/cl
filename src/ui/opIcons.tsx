import type { SVGProps } from 'react'
import type { OperationType } from '../lib/types'

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

const PATHS: Record<OperationType, React.ReactNode> = {
  buy_livestock: (
    <>
      <path d="M8 16.5c-2.2 0-3.5-1.4-3.5-3.2 0-1.3.8-2.3 1.9-2.7.1-1.6 1.4-2.8 3-2.8.7-1 1.8-1.6 3-1.6s2.3.6 3 1.6c1.6 0 2.9 1.2 3 2.8 1.1.4 1.9 1.4 1.9 2.7 0 1.8-1.3 3.2-3.5 3.2z" />
      <path d="M8.5 16.5V20M15.5 16.5V20" />
      <path d="M4.5 11.5 2.5 10" />
    </>
  ),
  sell_livestock: (
    <>
      <rect x="2.5" y="6" width="19" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.6" />
      <path d="M6 9.5v5M18 9.5v5" />
    </>
  ),
  feed: (
    <>
      <path d="M7.5 7h9l2 12.5a1.5 1.5 0 0 1-1.5 1.5H7a1.5 1.5 0 0 1-1.5-1.5z" />
      <path d="M9 7 8.5 4.5h7L15 7" />
      <path d="M9.5 12.5h5M9.5 15.5h5" />
    </>
  ),
  fuel: (
    <>
      <path d="M4 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16" />
      <path d="M3 21h12M4 10h10" />
      <path d="M14 8h1.5a2 2 0 0 1 2 2v6a1.5 1.5 0 0 0 3 0V9l-3-3" />
    </>
  ),
  transport: (
    <>
      <path d="M2.5 6.5h11v10h-11z" />
      <path d="M13.5 10h4l3 3.5v3h-7" />
      <circle cx="6.5" cy="17.5" r="1.8" />
      <circle cx="16.5" cy="17.5" r="1.8" />
    </>
  ),
  wages: (
    <>
      <circle cx="12" cy="7.5" r="3.5" />
      <path d="M5 20.5a7 7 0 0 1 14 0" />
    </>
  ),
  vet: (
    <>
      <path d="m15 3 6 6M18 6l-9.5 9.5-3 .5.5-3L15.5 3.5" />
      <path d="m11 8 1.5 1.5M8.5 10.5 10 12M5.5 16 3 21" />
    </>
  ),
  maintenance: <path d="M14.7 6.3a4 4 0 0 0 5 5L21 13l-8 8-3-3 1.3-1.3a4 4 0 0 0-5-5L3 9l8-8 3 3z" transform="scale(.9) translate(1.3 1.3)" />,
  equipment: (
    <>
      <path d="M2.5 20 12 4l9.5 16z" />
      <path d="M12 4v16M9 20l3-5 3 5" />
    </>
  ),
  rent: (
    <>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5" />
      <path d="M10 21v-6h4v6" />
    </>
  ),
  other_expense: (
    <>
      <path d="M6 2.5h12v19l-3-2-3 2-3-2-3 2z" />
      <path d="M9 7.5h6M9 11h6M9 14.5h4" />
    </>
  ),
  other_income: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v8M8 12h8" />
    </>
  ),
  capital: (
    <>
      <path d="M3 9.5 12 4l9 5.5" />
      <path d="M5.5 10v8M9.8 10v8M14.2 10v8M18.5 10v8M3 20.5h18" />
    </>
  ),
  compound: (
    <>
      <path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H19v15H5.5A1.5 1.5 0 0 0 4 19.5z" />
      <path d="M4 19.5A1.5 1.5 0 0 0 5.5 21H19v-3M8 7h7M8 10.5h7" />
    </>
  ),
}

export function OpIcon({ type, ...p }: { type: OperationType } & SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} width={22} height={22} aria-hidden {...p}>
      {PATHS[type] ?? PATHS.compound}
    </svg>
  )
}
