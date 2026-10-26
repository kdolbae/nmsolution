/**
 * 도면 작성: 치수만 넣으면 재료별(판넬 벽·천장틀·스레드로드·조명·문) 도면과 수량이 같이 나온다.
 *
 * 좌표는 m 단위, 왼쪽 위가 (0,0), x 는 가로(W), y 는 세로(D).
 * 외곽 네 변은 기존 벽·신규 판넬·없음 중 하나이고, 안쪽 칸막이는 선분으로 넣는다.
 * 천장틀은 간격 이내로 고르게 걸고(양 끝 여유는 간격 이하), 천장틀마다 지지 간격으로 스레드로드를 단다.
 * 수량은 도면 그림과 같은 계산(planGeometry)에서 나오므로 도면과 견적이 어긋나지 않는다.
 *
 * 브라우저·서버 양쪽에서 쓰므로 Node 전용 API 를 쓰지 않는다.
 */

import { newId } from '@/lib/clients/quote'
import type { TakeoffBlock, TakeoffLine, TakeoffVar } from '@/lib/clients/takeoff'

export type Side = 'top' | 'right' | 'bottom' | 'left'
export type SideKind = 'existing' | 'panel' | 'open'
export const SIDES: [Side, string][] = [
  ['top', '위'],
  ['right', '오른쪽'],
  ['bottom', '아래'],
  ['left', '왼쪽'],
]
export const SIDE_KINDS: [SideKind, string][] = [
  ['existing', '기존 벽'],
  ['panel', '신규 판넬'],
  ['open', '없음'],
]

export type PlanWall = { id: string; x1: number; y1: number; x2: number; y2: number }
export const DOOR_KINDS = ['여닫이', '미닫이', '슬라이딩'] as const
export type DoorKind = (typeof DOOR_KINDS)[number]
/** wall: 외곽 변(top·right·bottom·left) 또는 칸막이 id. at: 벽 시작점에서 문 시작까지 */
export type PlanDoor = { id: string; name: string; wall: string; at: number; width: number; kind: DoorKind; price: number }
/** nx·ny: 조명 가로·세로 개수. 더 작은 방 안에 들어가는 조명은 그 방 것으로 보고 뺀다 */
export type PlanRoom = { id: string; name: string; x: number; y: number; w: number; h: number; nx: number; ny: number; lightV: boolean }

export type Plan = {
  W: number
  D: number
  /** 판넬 벽 높이 = 천장 높이 */
  H: number
  sides: Record<Side, SideKind>
  walls: PlanWall[]
  doors: PlanDoor[]
  rooms: PlanRoom[]
  ceiling: boolean
  /** 천장틀이 걸리는 방향. 'y' 면 세로(D)로 걸고 가로(W)를 따라 간격을 둔다 */
  frameDir: 'x' | 'y'
  gapMax: number
  rodPitch: number
  /** 천장틀 양 끝(벽 쪽)에도 스레드로드를 단다 */
  rodEnds: boolean
  /** 지붕(슬래브) 최고·최저 높이. 스레드로드 길이 = 높이 − H */
  slabMax: number
  slabMin: number
  doorH: number
  loss: number
  panelSpec: string
  frameSpec: string
  lightSpec: string
  price: { panel: number; ceil: number; frame: number; rod: number; clamp: number; light: number }
}

export const DEFAULT_PLAN: Plan = {
  W: 10,
  D: 6,
  H: 3,
  sides: { top: 'existing', right: 'panel', bottom: 'panel', left: 'existing' },
  walls: [],
  doors: [],
  rooms: [{ id: 'r1', name: '사무실', x: 0, y: 0, w: 10, h: 6, nx: 4, ny: 2, lightV: false }],
  ceiling: true,
  frameDir: 'y',
  gapMax: 1.5,
  rodPitch: 1,
  rodEnds: false,
  slabMax: 6,
  slabMin: 6,
  doorH: 2.1,
  loss: 5,
  panelSpec: 'EPS 75T',
  frameSpec: 'C형강 100×50×20×2.1t',
  lightSpec: 'LED 평판등 300×1200',
  // 2026-10 kevin 기준 (판넬 15,000원/㎡, C형강 4,800원/m, LED 22,000원)
  price: { panel: 15000, ceil: 15000, frame: 4800, rod: 9800, clamp: 2300, light: 22000 },
}

// ---------- 정리 ----------

const num = (x: unknown, f = 0) => (Number.isFinite(Number(x)) && x !== null && x !== '' ? Number(x) : f)
const str = (x: unknown, f = '') => (typeof x === 'string' ? x : f)

/** 저장된 값이 비거나 옛 모양이어도 그릴 수 있게 채운다 */
export function normalizePlan(raw: unknown): Plan | undefined {
  const p = raw as Partial<Plan> | null
  if (!p || typeof p !== 'object') return undefined
  const d = DEFAULT_PLAN
  const sk = (x: unknown, f: SideKind): SideKind => (x === 'existing' || x === 'panel' || x === 'open' ? x : f)
  return {
    W: num(p.W, d.W),
    D: num(p.D, d.D),
    H: num(p.H, d.H),
    sides: {
      top: sk(p.sides?.top, d.sides.top),
      right: sk(p.sides?.right, d.sides.right),
      bottom: sk(p.sides?.bottom, d.sides.bottom),
      left: sk(p.sides?.left, d.sides.left),
    },
    walls: (Array.isArray(p.walls) ? p.walls : []).map((w) => ({ id: str(w.id) || newId('w'), x1: num(w.x1), y1: num(w.y1), x2: num(w.x2), y2: num(w.y2) })),
    doors: (Array.isArray(p.doors) ? p.doors : []).map((x) => ({
      id: str(x.id) || newId('d'),
      name: str(x.name),
      wall: str(x.wall, 'bottom'),
      at: num(x.at),
      width: num(x.width, 0.9),
      kind: (DOOR_KINDS as readonly string[]).includes(x.kind) ? x.kind : '여닫이',
      price: num(x.price),
    })),
    rooms: (Array.isArray(p.rooms) ? p.rooms : []).map((r) => ({
      id: str(r.id) || newId('r'),
      name: str(r.name),
      x: num(r.x),
      y: num(r.y),
      w: num(r.w),
      h: num(r.h),
      nx: num(r.nx),
      ny: num(r.ny),
      lightV: !!r.lightV,
    })),
    ceiling: p.ceiling ?? d.ceiling,
    frameDir: p.frameDir === 'x' ? 'x' : 'y',
    gapMax: num(p.gapMax, d.gapMax),
    rodPitch: num(p.rodPitch, d.rodPitch),
    rodEnds: !!p.rodEnds,
    slabMax: num(p.slabMax, d.slabMax),
    slabMin: num(p.slabMin, d.slabMin),
    doorH: num(p.doorH, d.doorH),
    loss: num(p.loss, d.loss),
    panelSpec: str(p.panelSpec, d.panelSpec),
    frameSpec: str(p.frameSpec, d.frameSpec),
    lightSpec: str(p.lightSpec, d.lightSpec),
    price: { ...d.price, ...Object.fromEntries(Object.entries(p.price ?? {}).map(([k, x]) => [k, num(x)])) },
  }
}

// ---------- 기하 ----------

export type Seg = { x1: number; y1: number; x2: number; y2: number }
export type Pt = { x: number; y: number }
export type DoorShape = PlanDoor & { seg: Seg; onPanel: boolean }

/** 간격 이내로 고르게: 개수 n = ceil(길이/간격) − 1, 양 끝 여유는 간격 이하 */
export function spread(len: number, gap: number, ends = false): number[] {
  if (len <= 0 || gap <= 0) return []
  const n = Math.max(1, Math.ceil(len / gap - 1e-9) - 1)
  const first = (len - (n - 1) * gap) / 2
  const inner = Array.from({ length: n }, (_, i) => round3(first + i * gap))
  return ends ? [0, ...inner, round3(len)] : inner
}

const round3 = (x: number) => Math.round(x * 1000) / 1000
const segLen = (s: Seg) => Math.hypot(s.x2 - s.x1, s.y2 - s.y1)

export function sideSeg(p: Pick<Plan, 'W' | 'D'>, s: Side): Seg {
  const { W, D } = p
  return s === 'top' ? { x1: 0, y1: 0, x2: W, y2: 0 } : s === 'right' ? { x1: W, y1: 0, x2: W, y2: D } : s === 'bottom' ? { x1: 0, y1: D, x2: W, y2: D } : { x1: 0, y1: 0, x2: 0, y2: D }
}

/** 벽(외곽 변 또는 칸막이)의 선분과 신규 판넬 여부 */
export function wallSeg(p: Plan, wall: string): { seg: Seg; panel: boolean } | null {
  const side = SIDES.find(([s]) => s === wall)
  if (side) return { seg: sideSeg(p, side[0]), panel: p.sides[side[0]] === 'panel' }
  const w = p.walls.find((x) => x.id === wall)
  return w ? { seg: w, panel: true } : null
}

export type PlanGeometry = {
  panelWalls: Seg[]
  existingWalls: Seg[]
  doors: DoorShape[]
  /** 천장틀 선분 */
  frames: Seg[]
  /** 천장틀이 놓이는 위치(간격 방향 좌표)와 스레드로드 위치(천장틀 방향 좌표) */
  framePos: number[]
  rodPos: number[]
  rods: Pt[]
  lights: (Pt & { v: boolean })[]
  q: PlanQty
}

export type PlanQty = {
  /** 신규 판넬 벽 길이 합계 */
  wallLen: number
  doorOpen: number
  wallArea: number
  ceilArea: number
  rows: number
  span: number
  perRow: number
  rods: number
  frameLen: number
  rodMax: number
  rodMin: number
  lights: number
  /** 문: 종류·폭·단가별 개수 */
  doorGroups: { kind: DoorKind; width: number; price: number; count: number; names: string[] }[]
}

const inside = (pt: Pt, r: PlanRoom) => pt.x > r.x + 1e-6 && pt.x < r.x + r.w - 1e-6 && pt.y > r.y + 1e-6 && pt.y < r.y + r.h - 1e-6

export function planGeometry(p: Plan): PlanGeometry {
  const panelWalls: Seg[] = []
  const existingWalls: Seg[] = []
  for (const [s] of SIDES) {
    if (p.sides[s] === 'panel') panelWalls.push(sideSeg(p, s))
    else if (p.sides[s] === 'existing') existingWalls.push(sideSeg(p, s))
  }
  panelWalls.push(...p.walls)

  const doors: DoorShape[] = []
  for (const d of p.doors) {
    const w = wallSeg(p, d.wall)
    if (!w) continue
    const L = segLen(w.seg) || 1
    const ux = (w.seg.x2 - w.seg.x1) / L
    const uy = (w.seg.y2 - w.seg.y1) / L
    const a = Math.max(0, Math.min(L, d.at))
    const b = Math.max(a, Math.min(L, d.at + d.width))
    doors.push({ ...d, onPanel: w.panel, seg: { x1: w.seg.x1 + ux * a, y1: w.seg.y1 + uy * a, x2: w.seg.x1 + ux * b, y2: w.seg.y1 + uy * b } })
  }

  // 천장틀: frameDir 'y' 면 길이 D 로 걸고 x 방향으로 간격
  const along = p.frameDir === 'y' ? p.D : p.W
  const across = p.frameDir === 'y' ? p.W : p.D
  const framePos = p.ceiling ? spread(across, p.gapMax) : []
  const rodPos = p.ceiling ? spread(along, p.rodPitch, p.rodEnds) : []
  const frames: Seg[] = framePos.map((c) => (p.frameDir === 'y' ? { x1: c, y1: 0, x2: c, y2: p.D } : { x1: 0, y1: c, x2: p.W, y2: c }))
  const rods: Pt[] = framePos.flatMap((c) => rodPos.map((t) => (p.frameDir === 'y' ? { x: c, y: t } : { x: t, y: c })))

  const lights: (Pt & { v: boolean })[] = []
  for (const r of p.rooms) {
    if (r.nx <= 0 || r.ny <= 0) continue
    const smaller = p.rooms.filter((o) => o.id !== r.id && o.w * o.h < r.w * r.h)
    for (let i = 0; i < r.nx; i++)
      for (let j = 0; j < r.ny; j++) {
        const pt = { x: r.x + ((i + 0.5) * r.w) / r.nx, y: r.y + ((j + 0.5) * r.h) / r.ny }
        if (!smaller.some((o) => inside(pt, o))) lights.push({ ...pt, v: r.lightV })
      }
  }

  const wallLen = round3(panelWalls.reduce((a, s) => a + segLen(s), 0))
  const doorOpen = round3(doors.filter((d) => d.onPanel).reduce((a, d) => a + segLen(d.seg) * p.doorH, 0))
  const groups: PlanQty['doorGroups'] = []
  for (const d of p.doors) {
    const g = groups.find((x) => x.kind === d.kind && x.width === d.width && x.price === d.price)
    if (g) {
      g.count++
      if (d.name) g.names.push(d.name)
    } else groups.push({ kind: d.kind, width: d.width, price: d.price, count: 1, names: d.name ? [d.name] : [] })
  }
  const q: PlanQty = {
    wallLen,
    doorOpen,
    wallArea: round3(Math.max(0, wallLen * p.H - doorOpen)),
    ceilArea: p.ceiling ? round3(p.W * p.D) : 0,
    rows: framePos.length,
    span: along,
    perRow: rodPos.length,
    rods: rods.length,
    frameLen: round3(framePos.length * along),
    rodMax: round3(Math.max(0, p.slabMax - p.H)),
    rodMin: round3(Math.max(0, Math.min(p.slabMax, p.slabMin) - p.H)),
    lights: lights.length,
    doorGroups: groups,
  }
  return { panelWalls, existingWalls, doors, frames, framePos, rodPos, rods, lights, q }
}

// ---------- 적산 블록 ----------

export const PLAN_BLOCK = 'plan'

/** 도면 수량을 적산 블록 하나로. 측정값은 도면에서 나온 값이고, 블록을 다시 넣으면 새 값으로 바뀐다 */
export function planBlock(p: Plan, name = '도면 수량'): TakeoffBlock {
  const { q } = planGeometry(p)
  const v = (key: string, label: string, unit: string, value: number, expr?: string): TakeoffVar => ({ key, label, unit, value, ...(expr ? { expr } : {}) })
  const l = (name: string, spec: string, unit: string, qty: string, price: number, note: string, rounding: TakeoffLine['rounding'] = 'ceil'): TakeoffLine => ({
    id: newId('t'),
    kind: '재료비',
    name,
    spec,
    unit,
    qty,
    rounding,
    price,
    note,
  })
  const vars = [
    v('L', '신규 판넬 벽 길이', 'm', q.wallLen),
    v('H', '벽 높이', 'm', p.H),
    v('open', '문 개구부', '㎡', q.doorOpen),
    v('loss', '손실률', '%', p.loss),
    v('wallA', '벽 판넬 면적', '㎡', 0, 'max(0, L*H - open)'),
    v('ceilA', '천장 면적', '㎡', q.ceilArea),
    v('rows', '천장틀 줄 수', '줄', q.rows),
    v('span', '천장틀 1줄 길이', 'm', q.span),
    v('rods', '스레드로드', '개', q.rods),
    v('rodMax', '로드 최장', 'm', q.rodMax),
    v('rodMin', '로드 최단', 'm', q.rodMin),
    v('lights', '조명', '개', q.lights),
  ]
  const lines = [
    l('판넬 벽체', `${p.panelSpec} H{H}m`, '㎡', 'wallA*(1+loss/100)', p.price.panel, '벽 {L}m × H{H}m − 문 {open}㎡, 손실 {loss}%'),
    l('천장 판넬', p.panelSpec, '㎡', 'ceilA*(1+loss/100)', p.price.ceil, `${p.W}×${p.D}m = {ceilA}㎡, 손실 {loss}%`),
    l('천장틀', p.frameSpec, 'm', 'rows*span*(1+loss/100)', p.price.frame, `{rows}줄 × {span}m (간격 ${p.gapMax}m 이내), 손실 {loss}%`),
    l('스레드로드 행거', q.rodMin === q.rodMax ? 'L {rodMax}m' : 'L {rodMin}~{rodMax}m', '개', 'rods', p.price.rod, `천장틀 {rows}줄 × ${q.perRow}지점 (간격 ${p.rodPitch}m 이내)`),
    l('행거 클램프', '', '개', 'rods', p.price.clamp, '스레드로드마다 1개'),
    l('LED 등기구', p.lightSpec, '개', 'lights', p.price.light, '도면 배치 {lights}개'),
    ...q.doorGroups.map((g) =>
      l(`${g.kind} 도어`, `W${Math.round(g.width * 1000).toLocaleString('ko-KR')}`, '개', String(g.count), g.price, g.names.length ? g.names.join(', ') : `${g.count}개소`),
    ),
  ]
  return { id: PLAN_BLOCK, template: PLAN_BLOCK, name, vars, lines, memo: '도면 작성에서 넣은 수량. 도면을 고치고 다시 넣으면 바뀜.' }
}
