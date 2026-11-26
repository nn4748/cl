import { memo, useId, type ReactNode } from 'react'
import type { ArtId } from '../data/recipes'

/**
 * Hand-built, top-down illustrations of each dish. They render inline so
 * there are no image requests to break, and each one is composed from the
 * dish's real components (rice + chicken + raisins for kabsa, dough squares
 * in stew for marqooq, eggs in sauce for shakshouka…).
 */

const INK = '#2A1A12'
const C = 200 // centre

function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

type R = () => number

/** Random point in a disc, optionally keeping out of an inner radius. */
function inDisc(r: R, radius: number, inner = 0): [number, number] {
  const ang = r() * Math.PI * 2
  const dist = Math.sqrt(inner * inner + r() * (radius * radius - inner * inner))
  return [C + Math.cos(ang) * dist, C + Math.sin(ang) * dist]
}

function ring(count: number, radius: number, offset = 0): [number, number, number][] {
  return Array.from({ length: count }, (_, i) => {
    const ang = offset + (i / count) * Math.PI * 2
    return [C + Math.cos(ang) * radius, C + Math.sin(ang) * radius, (ang * 180) / Math.PI]
  })
}

// --- primitives -------------------------------------------------------------

const grains = (r: R, radius: number, colors: string[], count: number, size = 1) =>
  Array.from({ length: count }, (_, i) => {
    const [x, y] = inDisc(r, radius)
    return <ellipse key={`g${i}`} cx={x} cy={y} rx={6.2 * size} ry={2.3 * size} fill={colors[i % colors.length]} transform={`rotate(${r() * 180} ${x} ${y})`} />
  })

const dots = (r: R, radius: number, color: string, count: number, size = 1.6, inner = 0) =>
  Array.from({ length: count }, (_, i) => {
    const [x, y] = inDisc(r, radius, inner)
    return <circle key={`d${color}${i}`} cx={x} cy={y} r={size * (0.6 + r() * 0.7)} fill={color} />
  })

function Chicken({ x, y, rot, s = 1, tone = '#B5642A' }: { x: number; y: number; rot: number; s?: number; tone?: string }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
      <rect x="10" y="-5" width="30" height="10" rx="5" fill="#F6EAD2" stroke={INK} strokeWidth="2.6" />
      <circle cx="42" cy="-6" r="6" fill="#F6EAD2" stroke={INK} strokeWidth="2.6" />
      <circle cx="42" cy="6" r="6" fill="#F6EAD2" stroke={INK} strokeWidth="2.6" />
      <rect x="30" y="-5" width="12" height="10" fill="#F6EAD2" />
      <path d="M-36 0c0-17 14-26 30-25c12 1 18 9 22 17c2 5 2 11 0 16c-4 8-10 16-22 17c-16 1-30-8-30-25z" fill={tone} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      <path d="M-26-10c6-8 16-10 24-7" stroke="#E3A15A" strokeWidth="5" strokeLinecap="round" fill="none" />
      <circle cx="-12" cy="4" r="3" fill="#8A4519" />
      <circle cx="2" cy="-4" r="2.4" fill="#8A4519" />
      <circle cx="-22" cy="8" r="2" fill="#8A4519" />
    </g>
  )
}

const raisin = (x: number, y: number, k: string, rot: number) => <ellipse key={k} cx={x} cy={y} rx="5" ry="3.4" fill="#3B1F17" transform={`rotate(${rot} ${x} ${y})`} />

const almond = (x: number, y: number, k: string, rot: number) => (
  <path key={k} d="M0-8c5 2 6 10 0 14c-6-4-5-12 0-14z" transform={`translate(${x} ${y}) rotate(${rot})`} fill="#EBD3A6" stroke={INK} strokeWidth="1.4" />
)

const leaf = (x: number, y: number, k: string, rot: number, color = '#5F7A3E') => (
  <path key={k} d="M0 0c4-8 14-10 18-8c-2 8-10 12-18 8z" transform={`translate(${x} ${y}) rotate(${rot})`} fill={color} />
)

const carrot = (x: number, y: number, k: string) => (
  <g key={k}>
    <circle cx={x} cy={y} r="11" fill="#E07A2E" stroke={INK} strokeWidth="2.4" />
    <circle cx={x} cy={y} r="5" fill="none" stroke="#F4A65F" strokeWidth="2" />
  </g>
)

const zucchini = (x: number, y: number, k: string, rot: number) => (
  <g key={k} transform={`translate(${x} ${y}) rotate(${rot})`}>
    <path d="M-13 0a13 13 0 0 1 26 0z" fill="#6E8F45" stroke={INK} strokeWidth="2.4" />
    <path d="M-9 0a9 9 0 0 1 18 0z" fill="#E7EBC2" />
    <circle cx="-3" cy="-3" r="1.2" fill="#B9C27E" />
    <circle cx="3" cy="-4" r="1.2" fill="#B9C27E" />
  </g>
)

const potato = (x: number, y: number, k: string, rot: number) => (
  <rect key={k} x={x - 10} y={y - 10} width="20" height="20" rx="5" fill="#E9C77A" stroke={INK} strokeWidth="2.4" transform={`rotate(${rot} ${x} ${y})`} />
)

const loomi = (x: number, y: number, k: string) => (
  <g key={k}>
    <circle cx={x} cy={y} r="12" fill="#5A3A22" stroke={INK} strokeWidth="2.4" />
    <path d={`M${x - 7} ${y - 3}q7-5 14 0M${x - 6} ${y + 4}q6 4 12 0`} stroke="#8A5A33" strokeWidth="1.6" fill="none" />
  </g>
)

const egg = (x: number, y: number, k: string, rot: number) => (
  <g key={k} transform={`translate(${x} ${y}) rotate(${rot})`}>
    <path d="M-26 2c-2-14 10-24 24-24c16 0 28 8 26 22c-2 14-14 22-28 20c-12-1-20-8-22-18z" fill="#FFF8EC" stroke={INK} strokeWidth="3" />
    <circle cx="0" cy="0" r="11" fill="#F4A51C" stroke={INK} strokeWidth="2.4" />
    <circle cx="-3.5" cy="-3.5" r="3.4" fill="#FFD27A" />
  </g>
)

const doughSquare = (x: number, y: number, k: string, rot: number) => (
  <g key={k} transform={`translate(${x} ${y}) rotate(${rot})`}>
    <path d="M-16-14q16-4 32 0q4 14 0 28q-16 4-32 0q-4-14 0-28z" fill="#F3E0B8" stroke={INK} strokeWidth="2.4" />
    <path d="M-8-4q8 3 16 0" stroke="#D7B985" strokeWidth="2" fill="none" />
  </g>
)

const ball = (x: number, y: number, k: string, gradId: string, s = 1) => (
  <g key={k}>
    <circle cx={x} cy={y} r={19 * s} fill={`url(#${gradId})`} stroke={INK} strokeWidth="2.6" />
    <ellipse cx={x - 6 * s} cy={y - 7 * s} rx={5 * s} ry={3 * s} fill="#FBE2A6" opacity="0.8" />
  </g>
)

const banana = (x: number, y: number, k: string) => (
  <g key={k}>
    <circle cx={x} cy={y} r="14" fill="#F6E7A9" stroke={INK} strokeWidth="2.4" />
    <circle cx={x} cy={y} r="8" fill="none" stroke="#E6CF7C" strokeWidth="1.6" />
    {[0, 1, 2].map((i) => (
      <circle key={i} cx={x + Math.cos(i * 2.1) * 3} cy={y + Math.sin(i * 2.1) * 3} r="1.2" fill="#8C6A2E" />
    ))}
  </g>
)

const dollop = (x: number, y: number, k: string, s = 1) => (
  <path key={k} transform={`translate(${x} ${y}) scale(${s})`} d="M-18 4c-4-12 8-20 16-16c6-8 20-2 18 8c8 4 4 16-6 14c-6 6-18 6-22 0c-8 0-10-6-6-6z" fill="#FFFDF7" stroke={INK} strokeWidth="2.4" />
)

const tomatoChunk = (x: number, y: number, k: string, rot: number) => (
  <rect key={k} x={x - 8} y={y - 6} width="16" height="12" rx="4" fill="#A83620" transform={`rotate(${rot} ${x} ${y})`} />
)

const pepperStrip = (x: number, y: number, k: string, rot: number) => (
  <path key={k} d="M-14 0q14-8 28 0" transform={`translate(${x} ${y}) rotate(${rot})`} stroke="#5F7A3E" strokeWidth="6" strokeLinecap="round" fill="none" />
)

const chiliRing = (x: number, y: number, k: string) => (
  <g key={k}>
    <circle cx={x} cy={y} r="6" fill="none" stroke="#4E7A2E" strokeWidth="3" />
    <circle cx={x} cy={y} r="1.6" fill="#EADFA0" />
  </g>
)

// --- vessels ---------------------------------------------------------------

type Vessel = 'platter' | 'bowl' | 'skillet' | 'plate'

function VesselShape({ kind, glaze, children, food, foodR }: { kind: Vessel; glaze: string; children: ReactNode; food: ReactNode; foodR: number }) {
  return (
    <g>
      {/* hard offset shadow */}
      {kind === 'skillet' && <rect x="290" y="268" width="110" height="34" rx="17" fill={INK} transform="translate(10 12) rotate(38 290 268)" />}
      <circle cx={C + 10} cy={C + 12} r={kind === 'bowl' ? 160 : 168} fill={INK} />
      {kind === 'skillet' && (
        <g transform="rotate(38 290 268)">
          <rect x="290" y="268" width="110" height="34" rx="17" fill="#3A3330" stroke={INK} strokeWidth="4" />
          <circle cx="382" cy="285" r="7" fill="#1E1916" />
        </g>
      )}
      {kind === 'bowl' && (
        <>
          <circle cx={C} cy={C} r="160" fill={glaze} stroke={INK} strokeWidth="4" />
          <circle cx={C} cy={C} r="140" fill="#FBF3E4" stroke={INK} strokeWidth="3" />
        </>
      )}
      {(kind === 'platter' || kind === 'plate') && (
        <>
          <circle cx={C} cy={C} r="168" fill="#FBF3E4" stroke={INK} strokeWidth="4" />
          <circle cx={C} cy={C} r="150" fill="none" stroke={glaze} strokeWidth="6" strokeDasharray={kind === 'platter' ? '2 12' : undefined} strokeLinecap="round" />
        </>
      )}
      {kind === 'skillet' && (
        <>
          <circle cx={C} cy={C} r="168" fill="#3A3330" stroke={INK} strokeWidth="4" />
          <circle cx={C} cy={C} r="150" fill="#2B2522" />
        </>
      )}
      <g>{food}</g>
      <circle cx={C} cy={C} r={foodR} fill="none" stroke={INK} strokeWidth="3" />
      {children}
    </g>
  )
}

// --- dishes ------------------------------------------------------------------

interface DishDef {
  bg: string
  pattern: string
  vessel: Vessel
  glaze: string
  foodR: number
  draw: (r: R, ids: { grad: string; clip: string }) => { food: ReactNode; top?: ReactNode }
}

const DISHES: Record<ArtId, DishDef> = {
  kabsa: {
    bg: '#E59A2B',
    pattern: '#D4861C',
    vessel: 'platter',
    glaze: '#C8452B',
    foodR: 136,
    draw: (r, { clip }) => ({
      food: (
        <g clipPath={`url(#${clip})`}>
          <circle cx={C} cy={C} r="136" fill="#D99A3E" />
          {grains(r, 136, ['#E9B35A', '#D58F33', '#F2C98A', '#C77D2A', '#EFBF6C'], 360)}
          {Array.from({ length: 22 }, (_, i) => {
            const [x, y] = inDisc(r, 128)
            return <rect key={`c${i}`} x={x} y={y} width="12" height="3" rx="1.5" fill="#E26A1F" transform={`rotate(${r() * 180} ${x} ${y})`} />
          })}
        </g>
      ),
      top: (
        <>
          {ring(4, 52, 0.4).map(([x, y, a], i) => (
            <Chicken key={`ch${i}`} x={x} y={y} rot={a + 90} s={1.05} />
          ))}
          {Array.from({ length: 18 }, (_, i) => {
            const [x, y] = inDisc(r, 128, 88)
            return raisin(x, y, `r${i}`, r() * 180)
          })}
          {Array.from({ length: 14 }, (_, i) => {
            const [x, y] = inDisc(r, 125, 86)
            return almond(x, y, `a${i}`, r() * 360)
          })}
          {Array.from({ length: 5 }, (_, i) => {
            const [x, y] = inDisc(r, 30)
            return leaf(x, y, `l${i}`, r() * 360)
          })}
        </>
      ),
    }),
  },
  jareesh: {
    bg: '#5F7A3E',
    pattern: '#557036',
    vessel: 'bowl',
    glaze: '#2F4A5A',
    foodR: 128,
    draw: (r) => ({
      food: (
        <>
          <circle cx={C} cy={C} r="128" fill="#EADFC6" />
          {dots(r, 126, '#D3C29C', 200, 2.6)}
          {dots(r, 126, '#F5EEDC', 90, 2.2)}
        </>
      ),
      top: (
        <>
          <path d="M200 148c34 0 56 20 54 50c-2 30-28 50-56 48c-30-2-50-24-48-52c2-26 22-46 50-46z" fill="#F2C14E" opacity="0.9" stroke="#C79A2B" strokeWidth="2" />
          {Array.from({ length: 26 }, (_, i) => {
            const [x, y] = inDisc(r, 46)
            const a = r() * 360
            return <path key={`o${i}`} d="M-9 3q9-12 18 0" transform={`translate(${x} ${y}) rotate(${a})`} stroke="#6B3A1A" strokeWidth="3.6" strokeLinecap="round" fill="none" />
          })}
          {Array.from({ length: 6 }, (_, i) => {
            const [x, y] = inDisc(r, 115, 75)
            return chiliRing(x, y, `cr${i}`)
          })}
          {dots(r, 118, '#8A5A2B', 40, 1.2, 70)}
        </>
      ),
    }),
  },
  marqooq: {
    bg: '#C8452B',
    pattern: '#B63C24',
    vessel: 'bowl',
    glaze: '#E9C46A',
    foodR: 128,
    draw: (r) => ({
      food: (
        <>
          <circle cx={C} cy={C} r="128" fill="#C45A2B" />
          {dots(r, 124, '#D97A3E', 40, 5)}
          {dots(r, 124, '#E8A04D', 50, 1.6)}
        </>
      ),
      top: (
        <>
          {Array.from({ length: 11 }, (_, i) => {
            const [x, y] = inDisc(r, 100)
            return doughSquare(x, y, `ds${i}`, r() * 90 - 45)
          })}
          {Array.from({ length: 6 }, (_, i) => {
            const [x, y] = inDisc(r, 110, 30)
            return carrot(x, y, `ca${i}`)
          })}
          {Array.from({ length: 5 }, (_, i) => {
            const [x, y] = inDisc(r, 110, 30)
            return zucchini(x, y, `z${i}`, r() * 360)
          })}
          {Array.from({ length: 4 }, (_, i) => {
            const [x, y] = inDisc(r, 105, 40)
            return potato(x, y, `p${i}`, r() * 90)
          })}
          {loomi(158, 250, 'lm1')}
          {loomi(252, 160, 'lm2')}
        </>
      ),
    }),
  },
  saleeg: {
    bg: '#B8C79B',
    pattern: '#ABBB8C',
    vessel: 'platter',
    glaze: '#5F7A3E',
    foodR: 136,
    draw: (r, { clip }) => ({
      food: (
        <g clipPath={`url(#${clip})`}>
          <circle cx={C} cy={C} r="136" fill="#F4EAD5" />
          {grains(r, 136, ['#FFF9EC', '#EADDC2', '#F7EEDB'], 300, 1.1)}
        </g>
      ),
      top: (
        <>
          <path d="M200 160c26 0 44 16 42 40c-2 22-22 38-44 36c-22-2-38-18-36-40c2-20 16-36 38-36z" fill="#F2C14E" opacity="0.85" />
          {ring(3, 82, 1).map(([x, y, a], i) => (
            <Chicken key={`ch${i}`} x={x} y={y} rot={a + 90} s={1.1} tone="#C97B34" />
          ))}
          {dots(r, 130, INK, 40, 1.1)}
        </>
      ),
    }),
  },
  adas: {
    bg: '#3E5C49',
    pattern: '#365241',
    vessel: 'bowl',
    glaze: '#E9E1D0',
    foodR: 128,
    draw: (r) => ({
      food: (
        <>
          <circle cx={C} cy={C} r="128" fill="#E58A2E" />
          <circle cx={C} cy={C} r="100" fill="#EA963A" />
          <circle cx={C} cy={C} r="64" fill="#EFA247" />
        </>
      ),
      top: (
        <>
          <path d="M200 200m-6 0a6 6 0 1 1 12 0a14 14 0 1 1 -28 0a24 24 0 1 1 48 0a34 34 0 1 1 -68 0a44 44 0 1 1 88 0" fill="none" stroke="#C8452B" strokeWidth="4" strokeLinecap="round" opacity="0.85" />
          {dots(r, 110, '#7A4318', 70, 1.2)}
          {Array.from({ length: 7 }, (_, i) => {
            const [x, y] = inDisc(r, 70)
            return leaf(x, y, `l${i}`, r() * 360, '#4E7A2E')
          })}
          <g transform="translate(290 112) rotate(30)">
            <path d="M-34 0a34 34 0 0 1 68 0z" fill="#F2D04B" stroke={INK} strokeWidth="3" />
            <path d="M-26 0a26 26 0 0 1 52 0z" fill="#F8E47E" />
            <path d="M0 0L0-26M0 0L-18-18M0 0L18-18" stroke="#E7C23C" strokeWidth="2" />
          </g>
        </>
      ),
    }),
  },
  shakshouka: {
    bg: '#D9B48A',
    pattern: '#CFA778',
    vessel: 'skillet',
    glaze: '#3A3330',
    foodR: 146,
    draw: (r, { clip }) => ({
      food: (
        <g clipPath={`url(#${clip})`}>
          <circle cx={C} cy={C} r="146" fill="#C8452B" />
          {Array.from({ length: 40 }, (_, i) => {
            const [x, y] = inDisc(r, 140)
            return tomatoChunk(x, y, `t${i}`, r() * 90)
          })}
          {Array.from({ length: 12 }, (_, i) => {
            const [x, y] = inDisc(r, 130)
            return pepperStrip(x, y, `ps${i}`, r() * 360)
          })}
        </g>
      ),
      top: (
        <>
          {egg(200, 196, 'e0', 10)}
          {ring(4, 82, 0.8).map(([x, y], i) => egg(x, y, `e${i + 1}`, i * 70))}
          {dots(r, 140, '#4E7A2E', 50, 2)}
        </>
      ),
    }),
  },
  luqaimat: {
    bg: '#2A1A12',
    pattern: '#3A261B',
    vessel: 'plate',
    glaze: '#E59A2B',
    foodR: 0,
    draw: (r, { grad }) => {
      const positions: [number, number, number][] = [
        ...ring(8, 92, 0.2).map(([x, y]) => [x, y, 1] as [number, number, number]),
        ...ring(5, 48, 0.9).map(([x, y]) => [x, y, 1.05] as [number, number, number]),
        [200, 200, 1.1],
      ]
      return {
        food: null,
        top: (
          <>
            {positions.map(([x, y, s], i) => ball(x + (r() - 0.5) * 6, y + (r() - 0.5) * 6, `b${i}`, grad, s))}
            <path d="M110 170c20-30 40 30 60 0s40 30 60 0s40 30 60 0M120 240c20-30 40 30 60 0s40 30 60 0s30 20 46 4" stroke="#5A260E" strokeWidth="6" strokeLinecap="round" fill="none" opacity="0.92" />
            {dots(r, 120, '#FFF3D6', 40, 1.3)}
          </>
        ),
      }
    },
  },
  masoob: {
    bg: '#F2C14E',
    pattern: '#E8B53D',
    vessel: 'bowl',
    glaze: '#C8452B',
    foodR: 128,
    draw: (r) => ({
      food: (
        <>
          <circle cx={C} cy={C} r="128" fill="#B88A55" />
          {dots(r, 124, '#9C6F3E', 120, 3)}
          {dots(r, 124, '#D2A877', 80, 2.4)}
        </>
      ),
      top: (
        <>
          {ring(7, 82, 0.3).map(([x, y], i) => banana(x, y, `bn${i}`))}
          {dollop(200, 196, 'd1', 1.5)}
          {dollop(150, 140, 'd2', 0.8)}
          <path d="M120 120c30 20 50 60 80 70s50-20 80 10M130 270c20-20 40 10 70-4s40-26 66-10" stroke="#E3A72F" strokeWidth="6" strokeLinecap="round" fill="none" opacity="0.95" />
        </>
      ),
    }),
  },
  balaleet: {
    bg: '#E8A598',
    pattern: '#DE998B',
    vessel: 'plate',
    glaze: '#C8452B',
    foodR: 130,
    draw: (r, { clip }) => ({
      food: (
        <g clipPath={`url(#${clip})`}>
          <circle cx={C} cy={C} r="130" fill="#EDBE5F" />
          {Array.from({ length: 90 }, (_, i) => {
            const [x, y] = inDisc(r, 130)
            const a = r() * 360
            const col = ['#E8B04B', '#F3CD7A', '#D9952F', '#E07A2E'][i % 4]
            return <path key={`v${i}`} d="M-22 0q11-10 22 0t22 0" transform={`translate(${x} ${y}) rotate(${a})`} stroke={col} strokeWidth="2.6" fill="none" strokeLinecap="round" />
          })}
        </g>
      ),
      top: (
        <>
          <path d="M120 150c30-40 120-50 160-10c30 30 20 90-20 110c-40 20-110 10-140-30c-14-20-14-50 0-70z" fill="#F5C542" stroke={INK} strokeWidth="3" transform="translate(30 30) scale(0.85)" />
          {dots(r, 60, '#D9952F', 16, 3).map((d, i) => (
            <g key={`om${i}`} transform="translate(10 20)">
              {d}
            </g>
          ))}
          {dots(r, 128, '#5F7A3E', 14, 1.6, 90)}
        </>
      ),
    }),
  },
  salona: {
    bg: '#9C4A22',
    pattern: '#8E421E',
    vessel: 'bowl',
    glaze: '#E9E1D0',
    foodR: 128,
    draw: (r) => ({
      food: (
        <>
          <circle cx={C} cy={C} r="128" fill="#D0702A" />
          {dots(r, 124, '#E0893C', 30, 6)}
          {dots(r, 124, '#F2B25C', 50, 1.8)}
        </>
      ),
      top: (
        <>
          <Chicken x={170} y={180} rot={-20} s={1.1} />
          <Chicken x={236} y={232} rot={150} s={1.0} />
          {Array.from({ length: 5 }, (_, i) => {
            const [x, y] = inDisc(r, 112, 60)
            return carrot(x, y, `ca${i}`)
          })}
          {Array.from({ length: 4 }, (_, i) => {
            const [x, y] = inDisc(r, 112, 60)
            return zucchini(x, y, `z${i}`, r() * 360)
          })}
          {Array.from({ length: 4 }, (_, i) => {
            const [x, y] = inDisc(r, 110, 60)
            return potato(x, y, `p${i}`, r() * 90)
          })}
          {loomi(262, 150, 'lm')}
          {Array.from({ length: 9 }, (_, i) => {
            const [x, y] = inDisc(r, 115)
            return leaf(x, y, `l${i}`, r() * 360, '#4E7A2E')
          })}
        </>
      ),
    }),
  },
}

const SEEDS: Record<ArtId, number> = { kabsa: 11, jareesh: 23, marqooq: 37, saleeg: 41, adas: 53, shakshouka: 67, luqaimat: 71, masoob: 83, balaleet: 97, salona: 101 }

export const DishArt = memo(function DishArt({ art, label, className, framed = true }: { art: ArtId; label?: string; className?: string; framed?: boolean }) {
  const uid = useId().replace(/:/g, '')
  const def = DISHES[art]
  const r = rng(SEEDS[art])
  const ids = { grad: `g${uid}`, clip: `c${uid}`, pat: `p${uid}` }
  const { food, top } = def.draw(r, ids)
  return (
    <svg viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice" className={className} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true} focusable="false">
      <defs>
        <radialGradient id={ids.grad} cx="35%" cy="30%" r="75%">
          <stop offset="0" stopColor="#F7C66B" />
          <stop offset="0.6" stopColor="#D98A25" />
          <stop offset="1" stopColor="#A9601A" />
        </radialGradient>
        <clipPath id={ids.clip}>
          <circle cx={C} cy={C} r={def.foodR || 1} />
        </clipPath>
        <pattern id={ids.pat} width="28" height="28" patternUnits="userSpaceOnUse" patternTransform="rotate(-18)">
          <rect width="28" height="28" fill={def.bg} />
          <rect width="14" height="28" fill={def.pattern} />
        </pattern>
      </defs>
      {framed && (
        <>
          <rect width="400" height="400" fill={def.bg} />
          {/* folded cloth under the dish */}
          <g transform="rotate(-14 200 200)">
            <rect x="-40" y="250" width="270" height="220" rx="10" fill={`url(#${ids.pat})`} stroke={INK} strokeWidth="3" />
            <path d="M-40 274h270" stroke={INK} strokeWidth="2" strokeDasharray="6 6" />
          </g>
        </>
      )}
      <VesselShape kind={def.vessel} glaze={def.glaze} food={food} foodR={def.foodR}>
        {top}
      </VesselShape>
    </svg>
  )
})
