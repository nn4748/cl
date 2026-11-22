import type { SVGProps } from 'react'

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.9,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

type P = SVGProps<SVGSVGElement>

export const IconHome = (p: P) => (
  <svg {...base} {...p}>
    <path d="M3 10.5 12 3l9 7.5" />
    <path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5" />
  </svg>
)
export const IconPlus = (p: P) => (
  <svg {...base} strokeWidth={2.4} {...p}>
    <path d="M12 5v14M5 12h14" />
  </svg>
)
export const IconBook = (p: P) => (
  <svg {...base} {...p}>
    <path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H19v15H5.5A1.5 1.5 0 0 0 4 19.5z" />
    <path d="M4 19.5A1.5 1.5 0 0 0 5.5 21H19v-3" />
    <path d="M8 7h7M8 10.5h7" />
  </svg>
)
export const IconChart = (p: P) => (
  <svg {...base} {...p}>
    <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
  </svg>
)
export const IconSettings = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
  </svg>
)
export const IconSearch = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
)
export const IconDownload = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />
  </svg>
)
export const IconUpload = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 21V9M7 14l5-5 5 5M5 3h14" />
  </svg>
)
export const IconPrinter = (p: P) => (
  <svg {...base} {...p}>
    <path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
    <path d="M6 14h12v7H6z" />
  </svg>
)
export const IconSheet = (p: P) => (
  <svg {...base} {...p}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M3 9h18M3 15h18M9 3v18" />
  </svg>
)
export const IconTrash = (p: P) => (
  <svg {...base} {...p}>
    <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" />
  </svg>
)
export const IconEdit = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 20h9M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4z" />
  </svg>
)
export const IconSort = (p: P) => (
  <svg {...base} {...p}>
    <path d="M7 4v16M3 16l4 4 4-4M17 20V4M13 8l4-4 4 4" />
  </svg>
)
export const IconSync = (p: P) => (
  <svg {...base} {...p}>
    <path d="M21 12a9 9 0 0 1-15 6.7L3 16M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M3 21v-5h5" />
  </svg>
)
export const IconFile = (p: P) => (
  <svg {...base} {...p}>
    <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
    <path d="M14 3v6h6M9 14h6M9 17h4" />
  </svg>
)
export const IconCheck = (p: P) => (
  <svg {...base} strokeWidth={2.6} {...p}>
    <path d="M20 6 9 17l-5-5" />
  </svg>
)
export const IconX = (p: P) => (
  <svg {...base} strokeWidth={2.2} {...p}>
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
)
export const IconCloudOff = (p: P) => (
  <svg {...base} {...p}>
    <path d="M2 2l20 20M17.5 17.5H7a5 5 0 0 1-1.5-9.8M9.5 5.4A6.5 6.5 0 0 1 18.4 10H19a3.5 3.5 0 0 1 2.2 6.2" />
  </svg>
)
export const IconShare = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 3v13M7 8l5-5 5 5M5 12v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8" />
  </svg>
)
export const IconRestore = (p: P) => (
  <svg {...base} {...p}>
    <path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5" />
  </svg>
)
