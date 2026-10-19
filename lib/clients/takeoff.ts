/**
 * 적산: 판넬·스레드로드·등기구 물량을 치수에서 계산하고 견적 줄로 바꾼다.
 *
 * 기준 (2026-10-19 kevin, 고양 어드리밍 판넬 사무실)
 * - 판넬 폭 1m, 단가는 ㎡ 기준 (폭 1m 판넬의 m당 단가와 같다)
 * - 스레드로드는 천장 구조물(C형강)을 1m당 1개로 잡고, 구조물 간격은 1.5m 이내
 * - 스레드로드 길이 = 천정고 - 판넬 높이
 *
 * 브라우저·서버 양쪽에서 쓰므로 Node 전용 API 를 쓰지 않는다.
 */

import { newId, type QuoteItem, type QuoteSection } from '@/lib/clients/quote'

export type TakeoffRoom = {
  id: string
  name: string
  /** 가로 m */
  w: number
  /** 세로 m */
  d: number
  /** 등기구 개수를 직접 넣을 때. 없으면 간격으로 계산 */
  lights?: number | null
}

export type Takeoff = {
  // 판넬
  /** 신규 벽 길이 합계 m */
  wallLength: number
  /** 판넬 높이 m */
  wallHeight: number
  /** 판넬 두께 표기 (예: 75T) */
  panelSpec: string
  /** 판넬 폭 m */
  panelWidth: number
  /** 문 개구부 면적 합계 ㎡ (벽 판넬에서 뺀다) */
  openings: number
  /** 판넬 천장 가로 m (구조물 방향) */
  ceilW: number
  /** 판넬 천장 세로 m (구조물 간격 방향) */
  ceilD: number
  /** 손실률 % */
  loss: number
  panelPrice: number
  // 스레드로드
  /** 바닥에서 기존 천장(구조물)까지 높이 m */
  slabHeight: number
  /** 스레드로드 간격 m (구조물 1m당 1개) */
  rodPitch: number
  /** 구조물 간격 최대 m */
  beamMax: number
  rodSpec: string
  rodPrice: number
  /** C형강 m당 단가. 0 이면 C형강 줄을 넣지 않는다 */
  beamSpec: string
  beamPrice: number
  // 등기구
  lightSpec: string
  /** 등기구 간격 m */
  lightPitch: number
  lightPrice: number
  rooms: TakeoffRoom[]
}

export const PYEONG = 3.3058

export function emptyTakeoff(): Takeoff {
  return {
    wallLength: 0,
    wallHeight: 3,
    panelSpec: '샌드위치 판넬 75T',
    panelWidth: 1,
    openings: 0,
    ceilW: 0,
    ceilD: 0,
    loss: 5,
    panelPrice: 15000,
    slabHeight: 6,
    rodPitch: 1,
    beamMax: 1.5,
    rodSpec: 'W3/8", 앙카·너트·와샤 포함',
    rodPrice: 9800,
    beamSpec: 'C형강 75×40×2.3t',
    beamPrice: 0,
    lightSpec: 'LED 평판등 640×640',
    lightPitch: 2.5,
    lightPrice: 22000,
    rooms: [],
  }
}

function num(v: unknown, fallback: number) {
  const n = Number(v)
  return Number.isFinite(n) && n >= 0 ? n : fallback
}

/** 저장된 값이 비어 있거나 옛 모양이어도 계산이 깨지지 않게 채운다 */
export function normalizeTakeoff(raw: unknown): Takeoff | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const base = emptyTakeoff()
  const t = raw as Partial<Takeoff>
  const out = { ...base } as Record<string, unknown>
  for (const [k, v] of Object.entries(base)) {
    if (typeof v === 'number') out[k] = num((t as Record<string, unknown>)[k], v)
    else if (typeof v === 'string') out[k] = typeof (t as Record<string, unknown>)[k] === 'string' ? (t as Record<string, unknown>)[k] : v
  }
  out.rooms = Array.isArray(t.rooms)
    ? t.rooms.map((r) => ({
        id: r.id || newId('r'),
        name: String(r.name ?? ''),
        w: num(r.w, 0),
        d: num(r.d, 0),
        lights: r.lights == null || (r.lights as unknown) === '' ? null : num(r.lights, 0),
      }))
    : []
  return out as Takeoff
}

/** 소수 오차로 1개 더 잡히지 않게 조금 깎고 올림 */
const up = (x: number) => Math.ceil(x - 1e-9)
const r1 = (x: number) => Math.round(x * 10) / 10

export function lightsFor(room: TakeoffRoom, pitch: number) {
  if (room.lights != null) return room.lights
  if (!room.w || !room.d || !pitch) return 0
  return Math.max(1, Math.round(room.w / pitch)) * Math.max(1, Math.round(room.d / pitch))
}

export type TakeoffResult = {
  wallArea: number
  wallQty: number
  wallSheets: number
  ceilArea: number
  ceilQty: number
  ceilSheets: number
  /** 구조물(C형강) 줄 수 */
  beams: number
  /** 실제 구조물 간격 m */
  beamGap: number
  /** 구조물 1줄당 스레드로드 */
  rodsPerBeam: number
  rods: number
  rodLength: number
  beamLength: number
  /** 구조물 방향을 바꿨을 때의 스레드로드 개수 (비교용) */
  rodsIfTurned: number
  lights: number
  floorArea: number
  pyeong: number
}

function grid(along: number, across: number, pitch: number, beamMax: number) {
  if (!along || !across || !pitch || !beamMax) return { beams: 0, gap: 0, per: 0 }
  const spans = up(across / beamMax)
  const per = up(along / pitch) + 1
  return { beams: spans + 1, gap: across / spans, per }
}

export function calcTakeoff(t: Takeoff): TakeoffResult {
  const k = 1 + t.loss / 100
  const wallArea = Math.max(0, t.wallLength * t.wallHeight - t.openings)
  const ceilArea = t.ceilW * t.ceilD
  const g = grid(t.ceilW, t.ceilD, t.rodPitch, t.beamMax)
  const turned = grid(t.ceilD, t.ceilW, t.rodPitch, t.beamMax)
  const floorArea = t.rooms.reduce((a, r) => a + r.w * r.d, 0)
  return {
    wallArea: r1(wallArea),
    wallQty: up(wallArea * k),
    wallSheets: t.panelWidth ? up((t.wallLength / t.panelWidth) * k) : 0,
    ceilArea: r1(ceilArea),
    ceilQty: up(ceilArea * k),
    // 판넬은 구조물과 직각으로 걸리므로 구조물 방향(가로)으로 장수를 센다
    ceilSheets: t.panelWidth ? up((t.ceilW / t.panelWidth) * k) : 0,
    beams: g.beams,
    beamGap: Math.round(g.gap * 100) / 100,
    rodsPerBeam: g.per,
    rods: g.beams * g.per,
    rodLength: r1(Math.max(0, t.slabHeight - t.wallHeight)),
    beamLength: up(g.beams * t.ceilW * k),
    rodsIfTurned: turned.beams * turned.per,
    lights: t.rooms.reduce((a, r) => a + lightsFor(r, t.lightPitch), 0),
    floorArea: r1(floorArea),
    pyeong: Math.round(floorArea / PYEONG),
  }
}

const f = (n: number) => String(r1(n))

/** 견적에 넣을 줄. 품명이 같은 줄이 있으면 수량·근거만 바꾼다 */
export function takeoffItems(t: Takeoff): QuoteItem[] {
  const c = calcTakeoff(t)
  const base = { kind: '재료비' as const, deduct: false }
  const items: QuoteItem[] = []
  if (c.wallQty)
    items.push({
      ...base,
      id: newId('i'),
      name: '벽체 판넬',
      spec: `${t.panelSpec}, H ${f(t.wallHeight)}m`,
      unit: '㎡',
      qty: c.wallQty,
      price: t.panelPrice,
      note: `${f(t.wallLength)}m × ${f(t.wallHeight)}m${t.openings ? ` − 문 개구부 ${f(t.openings)}㎡` : ''}, 손실 ${f(t.loss)}%`,
    })
  if (c.ceilQty)
    items.push({
      ...base,
      id: newId('i'),
      name: '천장 판넬',
      spec: t.panelSpec,
      unit: '㎡',
      qty: c.ceilQty,
      price: t.panelPrice,
      note: `${f(t.ceilW)} × ${f(t.ceilD)}m = ${f(c.ceilArea)}㎡, 손실 ${f(t.loss)}%`,
    })
  if (c.rods)
    items.push({
      ...base,
      id: newId('i'),
      name: '스레드로드 행거',
      spec: `${t.rodSpec}, L ${f(c.rodLength)}m`,
      unit: '개소',
      qty: c.rods,
      price: t.rodPrice,
      note: `구조물 ${c.beams}열(간격 ${c.beamGap}m) × ${c.rodsPerBeam}개(${f(t.rodPitch)}m당 1개)`,
    })
  if (c.rods && t.beamPrice)
    items.push({
      ...base,
      id: newId('i'),
      name: '천장 구조물',
      spec: t.beamSpec,
      unit: 'm',
      qty: c.beamLength,
      price: t.beamPrice,
      note: `${c.beams}열 × ${f(t.ceilW)}m, 손실 ${f(t.loss)}%`,
    })
  if (c.lights)
    items.push({
      ...base,
      id: newId('i'),
      name: 'LED 평판등',
      spec: t.lightSpec,
      unit: '개',
      qty: c.lights,
      price: t.lightPrice,
      note: t.rooms
        .filter((r) => lightsFor(r, t.lightPitch))
        .map((r) => `${r.name || '실'} ${lightsFor(r, t.lightPitch)}`)
        .join(' + '),
    })
  return items
}

/**
 * 적산 줄을 공종에 넣는다. 품명이 같은 줄은 규격·수량·단가·근거를 바꾸고(구분·감액은 그대로), 없는 줄은 끝에 붙인다.
 * 돌려주는 값은 바뀐 줄 수와 새로 붙인 줄 수.
 */
export function applyTakeoff(section: QuoteSection, t: Takeoff): { section: QuoteSection; updated: number; added: number } {
  let updated = 0
  const items = [...section.items]
  const fresh: QuoteItem[] = []
  for (const n of takeoffItems(t)) {
    const at = items.findIndex((i) => i.name.trim() === n.name)
    if (at >= 0) {
      items[at] = { ...items[at], spec: n.spec, qty: n.qty, price: n.price, unit: n.unit, note: n.note }
      updated++
    } else fresh.push(n)
  }
  return { section: { ...section, items: [...items, ...fresh] }, updated, added: fresh.length }
}
