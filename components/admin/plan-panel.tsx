'use client'

import { useMemo, useRef, useState } from 'react'
import { Download, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { NumInput, TextIn } from '@/components/admin/inputs'
import { cn } from '@/lib/utils'
import { won } from '@/lib/clients/quote'
import { fmt } from '@/lib/clients/takeoff'
import {
  DOOR_KINDS,
  SIDE_KINDS,
  SIDES,
  planGeometry,
  type DoorKind,
  type Plan,
  type PlanDoor,
  type PlanGeometry,
  type PlanRoom,
  type PlanWall,
  type Seg,
  type SideKind,
} from '@/lib/clients/plan'

export type PlanView = 'all' | 'panel' | 'ceiling' | 'elec' | 'door'
export const PLAN_VIEWS: [PlanView, string][] = [
  ['all', '전체'],
  ['panel', '판넬 벽'],
  ['ceiling', '천장틀·스레드로드'],
  ['elec', '조명'],
  ['door', '문'],
]

const C = {
  navy: '#0F2A44',
  red: '#E03131',
  halo: '#F8C9C9',
  frame: '#C9D3DE',
  rod: '#E8742A',
  light: '#F2D46B',
  muted: '#8A94A3',
  room: '#F3F5F8',
  faint: '#C3CAD3',
}
const S = 60 // px / m
const PAD = { l: 110, t: 110, r: 420, b: 160 }
const FONT = "Pretendard, 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif"

const mm = (m: number) => Math.round(m * 1000).toLocaleString('ko-KR')
const uniq = (xs: number[]) => [...new Set(xs.map((x) => Math.round(x * 1000) / 1000))].sort((a, b) => a - b)

/** 치수선: 가로(horizontal) 또는 세로. 끊는 점 사이마다 mm 로 적는다 */
function Dim({ at, from, to, breaks, horizontal, size = 13 }: { at: number; from: number; to: number; breaks?: number[]; horizontal: boolean; size?: number }) {
  const pts = uniq([from, ...(breaks ?? []).filter((b) => b > from + 1e-6 && b < to - 1e-6), to])
  const P = (t: number) => (horizontal ? { x: PAD.l + t * S, y: at } : { x: at, y: PAD.t + t * S })
  const a = P(from)
  const b = P(to)
  return (
    <g stroke={C.navy} strokeWidth={1} fill={C.navy}>
      <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
      {pts.map((t) => {
        const p = P(t)
        return <line key={t} x1={p.x - 5} y1={p.y + 5} x2={p.x + 5} y2={p.y - 5} />
      })}
      {pts.slice(1).map((t, i) => {
        const m = P((t + pts[i]) / 2)
        return (
          <text
            key={t}
            x={horizontal ? m.x : m.x - 8}
            y={horizontal ? m.y - 8 : m.y}
            fontSize={size}
            stroke="none"
            textAnchor="middle"
            transform={horizontal ? undefined : `rotate(-90 ${m.x - 8} ${m.y})`}
          >
            {mm(t - pts[i])}
          </text>
        )
      })}
    </g>
  )
}

const px = (m: number) => PAD.l + m * S
const py = (m: number) => PAD.t + m * S
const line = (s: Seg) => ({ x1: px(s.x1), y1: py(s.y1), x2: px(s.x2), y2: py(s.y2) })

/** 재료별 도면. view 에 따라 그 재료만 진하게 그리고 범례에 수량을 적는다 */
export function PlanDrawing({ plan: p, view, title, svgRef }: { plan: Plan; view: PlanView; title?: string; svgRef?: React.Ref<SVGSVGElement> }) {
  const g: PlanGeometry = useMemo(() => planGeometry(p), [p])
  const q = g.q
  const show = {
    panel: view === 'all' || view === 'panel' || view === 'door',
    frames: view === 'all' || view === 'ceiling',
    lights: view === 'all' || view === 'elec',
    doors: view !== 'ceiling' && view !== 'elec',
  }
  const faintWalls = view === 'ceiling' || view === 'elec'
  const w = PAD.l + p.W * S + PAD.r
  const h = PAD.t + p.D * S + PAD.b
  const lx = PAD.l + p.W * S + 60
  const xBreaks = p.walls.flatMap((x) => (Math.abs(x.x1 - x.x2) < 1e-6 ? [x.x1] : []))
  const yBreaks = p.walls.flatMap((x) => (Math.abs(x.y1 - x.y2) < 1e-6 ? [x.y1] : []))
  const viewName = PLAN_VIEWS.find(([k]) => k === view)?.[1] ?? ''

  const legend: { mark: React.ReactNode; text: string }[] = []
  if (show.panel) legend.push({ mark: <rect width={34} height={8} y={-4} fill={C.red} />, text: `신규 판넬벽 ${p.panelSpec} H${fmt(p.H)}m · 길이 ${fmt(q.wallLen)}m, 면적 ${fmt(q.wallArea)}㎡ (문 제외)` })
  legend.push({ mark: <rect width={34} height={6} y={-3} fill={C.navy} />, text: '기존 벽' })
  if (show.panel && p.ceiling) legend.push({ mark: <rect width={34} height={14} y={-7} fill={C.room} stroke={C.faint} />, text: `천장 판넬 ${fmt(q.ceilArea)}㎡` })
  if (show.frames && q.rows) {
    legend.push({ mark: <rect width={34} height={8} y={-4} fill={C.frame} stroke={C.navy} />, text: `천장틀 ${p.frameSpec} · ${q.rows}줄 × ${fmt(q.span)}m = ${fmt(q.frameLen)}m` })
    legend.push({
      mark: <circle cx={17} r={7} fill={C.rod} stroke="#fff" strokeWidth={2} />,
      text: `스레드로드 ${q.rods}개 (${q.rows}줄 × ${q.perRow}지점)${q.rodMax ? ` · 길이 ${q.rodMin === q.rodMax ? fmt(q.rodMax) : `${fmt(q.rodMin)}~${fmt(q.rodMax)}`}m` : ''}`,
    })
  }
  if (show.lights && q.lights) legend.push({ mark: <rect width={34} height={9} y={-4.5} fill={C.light} />, text: `${p.lightSpec} ${q.lights}개` })
  if (show.doors) for (const d of q.doorGroups) legend.push({ mark: <rect width={34} height={4} y={-2} fill={C.navy} />, text: `${d.kind} W${mm(d.width)} ${d.count}개${d.names.length ? ` (${d.names.join(', ')})` : ''}` })

  const rowY = legend.reduce((ys, it) => [...ys, ys[ys.length - 1] + 16 + it.text.split(' · ').length * 18], [108])
  const hh = Math.max(h, PAD.t + rowY[legend.length] + 40)

  return (
    <svg ref={svgRef} xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${w} ${hh}`} width="100%" style={{ fontFamily: FONT, background: '#fff' }}>
      <rect width={w} height={hh} fill="#fff" />

      {/* 방 */}
      {[...p.rooms]
        .sort((a, b) => b.w * b.h - a.w * a.h)
        .map((r, i) => (
          <rect key={r.id} x={px(r.x)} y={py(r.y)} width={r.w * S} height={r.h * S} fill={i === 0 ? C.room : '#E9EDF2'} />
        ))}

      {/* 천장틀·스레드로드 */}
      {show.frames &&
        g.frames.map((s, i) => {
          const a = line(s)
          const vert = Math.abs(a.x1 - a.x2) < 1
          return (
            <rect
              key={i}
              x={vert ? a.x1 - 6 : a.x1}
              y={vert ? a.y1 : a.y1 - 6}
              width={vert ? 12 : a.x2 - a.x1}
              height={vert ? a.y2 - a.y1 : 12}
              fill={C.frame}
              stroke={C.navy}
              strokeWidth={1}
            />
          )
        })}

      {/* 조명 */}
      {show.lights &&
        g.lights.map((l, i) => {
          const lw = (l.v ? 0.3 : 1.2) * S
          const lh = (l.v ? 1.2 : 0.3) * S
          return <rect key={i} x={px(l.x) - lw / 2} y={py(l.y) - lh / 2} width={lw} height={lh} fill={C.light} />
        })}

      {/* 벽 */}
      {g.existingWalls.map((s, i) => (
        <line key={`e${i}`} {...line(s)} stroke={faintWalls ? C.faint : C.navy} strokeWidth={6} strokeLinecap="square" />
      ))}
      {g.panelWalls.map((s, i) => (
        <g key={`p${i}`}>
          {show.panel && <line {...line(s)} stroke={C.halo} strokeWidth={20} />}
          <line {...line(s)} stroke={show.panel ? C.red : C.faint} strokeWidth={show.panel ? 5 : 4} strokeLinecap="square" />
        </g>
      ))}

      {/* 문 */}
      {g.doors.map((d) => {
        const a = line(d.seg)
        const len = Math.hypot(a.x2 - a.x1, a.y2 - a.y1) || 1
        const ux = (a.x2 - a.x1) / len
        const uy = (a.y2 - a.y1) / len
        const nx = -uy
        const ny = ux
        const stroke = show.doors ? C.navy : C.faint
        return (
          <g key={d.id}>
            <line {...a} stroke="#fff" strokeWidth={14} />
            {d.kind === '여닫이' ? (
              <>
                <line x1={a.x1} y1={a.y1} x2={a.x1 + nx * len} y2={a.y1 + ny * len} stroke={stroke} strokeWidth={2.5} />
                <path d={`M ${a.x1 + nx * len} ${a.y1 + ny * len} A ${len} ${len} 0 0 0 ${a.x2} ${a.y2}`} fill="none" stroke={stroke} strokeDasharray="5 4" />
              </>
            ) : (
              <>
                <line x1={a.x1 + nx * 4} y1={a.y1 + ny * 4} x2={a.x1 + (a.x2 - a.x1) * 0.6 + nx * 4} y2={a.y1 + (a.y2 - a.y1) * 0.6 + ny * 4} stroke={stroke} strokeWidth={4} />
                <line x1={a.x1 + (a.x2 - a.x1) * 0.4 - nx * 4} y1={a.y1 + (a.y2 - a.y1) * 0.4 - ny * 4} x2={a.x2 - nx * 4} y2={a.y2 - ny * 4} stroke={stroke} strokeWidth={4} />
              </>
            )}
            {show.doors && d.name && (
              <text x={(a.x1 + a.x2) / 2 - nx * 26} y={(a.y1 + a.y2) / 2 - ny * 26 + 5} fontSize={14} fontWeight={700} textAnchor="middle" fill={C.navy}>
                {d.name}
              </text>
            )}
          </g>
        )
      })}

      {/* 스레드로드 (벽 위에 보이게 마지막) */}
      {show.frames && g.rods.map((r, i) => <circle key={i} cx={px(r.x)} cy={py(r.y)} r={8} fill={C.rod} stroke="#fff" strokeWidth={2.5} />)}

      {/* 방 이름 */}
      {p.rooms.map((r) => {
        const area = r.w * r.h
        return (
          <g key={r.id} textAnchor="middle" fill={C.navy} stroke="#fff" strokeWidth={5} paintOrder="stroke" strokeLinejoin="round">
            <text x={px(r.x + r.w / 2)} y={py(r.y + r.h / 2) - 4} fontSize={20} fontWeight={700}>
              {r.name}
              {r.name ? ' · ' : ''}
              {fmt(Math.round((area / 3.3058) * 10) / 10)}평
            </text>
            <text x={px(r.x + r.w / 2)} y={py(r.y + r.h / 2) + 20} fontSize={14} fill={C.muted}>
              {fmt(r.w)} × {fmt(r.h)}m ({fmt(Math.round(area * 10) / 10)}㎡)
            </text>
          </g>
        )
      })}

      {/* 치수 */}
      <Dim at={PAD.t - 70} from={0} to={p.W} horizontal />
      {xBreaks.length > 0 && <Dim at={PAD.t - 36} from={0} to={p.W} breaks={xBreaks} horizontal />}
      <Dim at={PAD.l - 70} from={0} to={p.D} horizontal={false} />
      {yBreaks.length > 0 && <Dim at={PAD.l - 36} from={0} to={p.D} breaks={yBreaks} horizontal={false} />}
      {show.frames && g.framePos.length > 0 &&
        (p.frameDir === 'y' ? (
          <Dim at={py(p.D) + 110} from={0} to={p.W} breaks={g.framePos} horizontal size={12} />
        ) : (
          <Dim at={px(p.W) + 36} from={0} to={p.D} breaks={g.framePos} horizontal={false} size={12} />
        ))}
      {show.frames && g.rodPos.length > 0 &&
        (p.frameDir === 'y' ? (
          <Dim at={px(p.W) + 36} from={0} to={p.D} breaks={g.rodPos} horizontal={false} size={12} />
        ) : (
          <Dim at={py(p.D) + 110} from={0} to={p.W} breaks={g.rodPos} horizontal size={12} />
        ))}

      {/* 범례 */}
      <g transform={`translate(${lx + (show.frames ? 30 : 0)} ${PAD.t})`} fill={C.navy}>
        <text fontSize={14} fontWeight={700} fill="#E8742A" letterSpacing={1}>
          NM SOLUTION
        </text>
        <text y={34} fontSize={24} fontWeight={800}>
          {viewName === '전체' ? '평면도' : `${viewName} 도면`}
        </text>
        {title && (
          <text y={60} fontSize={14} fill={C.muted}>
            {title}
          </text>
        )}
        <line x1={0} x2={300} y1={78} y2={78} stroke={C.navy} strokeWidth={2} />
        {legend.map((it, i) => (
          <g key={i} transform={`translate(0 ${rowY[i]})`}>
            {it.mark}
            <text x={46} y={5} fontSize={13}>
              {it.text.split(' · ').map((t, j) => (
                <tspan key={j} x={46} dy={j ? 18 : 0}>
                  {t}
                </tspan>
              ))}
            </text>
          </g>
        ))}
        <text y={rowY[legend.length] + 4} fontSize={12} fill={C.muted}>
          단위 mm · 축척 없음 (NTS)
        </text>
      </g>
    </svg>
  )
}

function download(svg: SVGSVGElement | null, name: string, png: boolean) {
  if (!svg) return
  const src = new XMLSerializer().serializeToString(svg)
  const blob = new Blob([src], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const save = (href: string, ext: string) => {
    const a = document.createElement('a')
    a.href = href
    a.download = `${name}.${ext}`
    a.click()
  }
  if (!png) {
    save(url, 'svg')
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    return
  }
  const img = new Image()
  img.onload = () => {
    const vb = svg.viewBox.baseVal
    const c = document.createElement('canvas')
    c.width = vb.width * 2
    c.height = vb.height * 2
    const ctx = c.getContext('2d')!
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, c.width, c.height)
    ctx.drawImage(img, 0, 0, c.width, c.height)
    URL.revokeObjectURL(url)
    save(c.toDataURL('image/png'), 'png')
  }
  img.src = url
}

const sel = 'h-8 w-full border border-input bg-background px-1 text-sm'

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn('flex flex-col gap-1 text-xs text-muted-foreground', className)}>
      {label}
      {children}
    </label>
  )
}

/** 도면 작성: 치수·칸막이·문·방을 넣으면 재료별 도면과 수량이 나온다 */
export function PlanEditor({ plan: p, onChange, title, onToTakeoff }: { plan: Plan; onChange: (p: Plan) => void; title?: string; onToTakeoff: () => void }) {
  const [view, setView] = useState<PlanView>('all')
  const svgRef = useRef<SVGSVGElement>(null)
  const q = useMemo(() => planGeometry(p).q, [p])
  const set = (patch: Partial<Plan>) => onChange({ ...p, ...patch })
  const setWall = (id: string, patch: Partial<PlanWall>) => set({ walls: p.walls.map((w) => (w.id === id ? { ...w, ...patch } : w)) })
  const setDoor = (id: string, patch: Partial<PlanDoor>) => set({ doors: p.doors.map((d) => (d.id === id ? { ...d, ...patch } : d)) })
  const setRoom = (id: string, patch: Partial<PlanRoom>) => set({ rooms: p.rooms.map((r) => (r.id === id ? { ...r, ...patch } : r)) })
  const wallOptions: [string, string][] = [...SIDES.map(([s, l]): [string, string] => [s, `외곽 ${l}`]), ...p.walls.map((w, i): [string, string] => [w.id, `칸막이 ${i + 1}`])]
  const nextId = (pre: string, xs: { id: string }[]) => {
    let i = xs.length + 1
    while (xs.some((x) => x.id === `${pre}${i}`)) i++
    return `${pre}${i}`
  }
  const viewName = PLAN_VIEWS.find(([k]) => k === view)?.[1] ?? ''

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-1">
        {PLAN_VIEWS.map(([k, label]) => (
          <Button key={k} size="sm" variant={view === k ? 'default' : 'outline'} className="rounded-none" onClick={() => setView(k)}>
            {label}
          </Button>
        ))}
        <span className="ml-auto" />
        <Button size="sm" variant="ghost" className="rounded-none" onClick={() => download(svgRef.current, `${title || '도면'}_${viewName}`, true)}>
          <Download /> PNG
        </Button>
        <Button size="sm" variant="ghost" className="rounded-none" onClick={() => download(svgRef.current, `${title || '도면'}_${viewName}`, false)}>
          <Download /> SVG
        </Button>
      </div>

      <div className="overflow-x-auto ring-1 ring-border">
        <div className="min-w-[720px]">
          <PlanDrawing plan={p} view={view} title={title} svgRef={svgRef} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium">외곽·높이</p>
          <div className="grid grid-cols-3 gap-2">
            <Field label="가로 W (m)">
              <NumInput value={p.W} onChange={(W) => set({ W })} />
            </Field>
            <Field label="세로 D (m)">
              <NumInput value={p.D} onChange={(D) => set({ D })} />
            </Field>
            <Field label="벽·천장 높이 (m)">
              <NumInput value={p.H} onChange={(H) => set({ H })} />
            </Field>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {SIDES.map(([s, label]) => (
              <Field key={s} label={`${label} 변`}>
                <select value={p.sides[s]} onChange={(e) => set({ sides: { ...p.sides, [s]: e.target.value as SideKind } })} className={sel}>
                  {SIDE_KINDS.map(([k, l]) => (
                    <option key={k} value={k}>
                      {l}
                    </option>
                  ))}
                </select>
              </Field>
            ))}
          </div>

          <p className="text-sm font-medium">칸막이 (신규 판넬, 왼쪽 위 기준 m)</p>
          {p.walls.map((w, i) => (
            <div key={w.id} className="grid grid-cols-[4.5rem_repeat(4,1fr)_2rem] items-end gap-2">
              <span className="pb-2 text-xs">칸막이 {i + 1}</span>
              {(['x1', 'y1', 'x2', 'y2'] as const).map((k) => (
                <Field key={k} label={k}>
                  <NumInput zero value={w[k]} onChange={(n) => setWall(w.id, { [k]: n })} />
                </Field>
              ))}
              <Button variant="ghost" size="icon-xs" className="mb-1.5" title="칸막이 삭제" onClick={() => set({ walls: p.walls.filter((x) => x.id !== w.id), doors: p.doors.filter((d) => d.wall !== w.id) })}>
                <X />
              </Button>
            </div>
          ))}
          <div>
            <Button size="sm" variant="outline" className="rounded-none" onClick={() => set({ walls: [...p.walls, { id: nextId('w', p.walls), x1: p.W / 2, y1: 0, x2: p.W / 2, y2: p.D }] })}>
              <Plus /> 칸막이 추가
            </Button>
          </div>

          <p className="text-sm font-medium">문 (벽 시작점에서 문까지 m)</p>
          {p.doors.map((d) => (
            <div key={d.id} className="grid grid-cols-[3.5rem_1.4fr_1fr_1fr_1.2fr_1.4fr_2rem] items-end gap-2">
              <Field label="이름">
                <TextIn value={d.name} onChange={(name) => setDoor(d.id, { name })} />
              </Field>
              <Field label="벽">
                <select value={d.wall} onChange={(e) => setDoor(d.id, { wall: e.target.value })} className={sel}>
                  {wallOptions.map(([k, l]) => (
                    <option key={k} value={k}>
                      {l}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="위치">
                <NumInput zero value={d.at} onChange={(at) => setDoor(d.id, { at })} />
              </Field>
              <Field label="폭">
                <NumInput value={d.width} onChange={(width) => setDoor(d.id, { width })} />
              </Field>
              <Field label="종류">
                <select value={d.kind} onChange={(e) => setDoor(d.id, { kind: e.target.value as DoorKind })} className={sel}>
                  {DOOR_KINDS.map((k) => (
                    <option key={k}>{k}</option>
                  ))}
                </select>
              </Field>
              <Field label="단가">
                <NumInput value={d.price} onChange={(price) => setDoor(d.id, { price })} />
              </Field>
              <Button variant="ghost" size="icon-xs" className="mb-1.5" title="문 삭제" onClick={() => set({ doors: p.doors.filter((x) => x.id !== d.id) })}>
                <X />
              </Button>
            </div>
          ))}
          <div>
            <Button
              size="sm"
              variant="outline"
              className="rounded-none"
              onClick={() =>
                set({ doors: [...p.doors, { id: nextId('d', p.doors), name: `D${p.doors.length + 1}`, wall: 'bottom', at: 1, width: 0.9, kind: '여닫이', price: 180000 }] })
              }
            >
              <Plus /> 문 추가
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium">방·조명 (조명은 가로 × 세로 개수, 더 작은 방 안 조명은 빠짐)</p>
          {p.rooms.map((r) => (
            <div key={r.id} className="grid grid-cols-[1.6fr_repeat(6,1fr)_2.5rem_2rem] items-end gap-2">
              <Field label="이름">
                <TextIn value={r.name} onChange={(name) => setRoom(r.id, { name })} />
              </Field>
              {(['x', 'y', 'w', 'h', 'nx', 'ny'] as const).map((k) => (
                <Field key={k} label={{ x: 'x', y: 'y', w: '가로', h: '세로', nx: '조명 가로', ny: '조명 세로' }[k]}>
                  <NumInput zero value={r[k]} onChange={(n) => setRoom(r.id, { [k]: n })} />
                </Field>
              ))}
              <Field label="세로등">
                <input type="checkbox" checked={r.lightV} onChange={(e) => setRoom(r.id, { lightV: e.target.checked })} className="mb-2 size-4" />
              </Field>
              <Button variant="ghost" size="icon-xs" className="mb-1.5" title="방 삭제" onClick={() => set({ rooms: p.rooms.filter((x) => x.id !== r.id) })}>
                <X />
              </Button>
            </div>
          ))}
          <div>
            <Button
              size="sm"
              variant="outline"
              className="rounded-none"
              onClick={() => set({ rooms: [...p.rooms, { id: nextId('r', p.rooms), name: '', x: 0, y: 0, w: p.W, h: p.D, nx: 0, ny: 0, lightV: false }] })}
            >
              <Plus /> 방 추가
            </Button>
          </div>

          <p className="text-sm font-medium">천장</p>
          <div className="grid grid-cols-3 gap-2">
            <Field label="천장 판넬">
              <select value={p.ceiling ? '1' : '0'} onChange={(e) => set({ ceiling: e.target.value === '1' })} className={sel}>
                <option value="1">있음</option>
                <option value="0">없음</option>
              </select>
            </Field>
            <Field label="천장틀 방향">
              <select value={p.frameDir} onChange={(e) => set({ frameDir: e.target.value as 'x' | 'y' })} className={sel}>
                <option value="y">세로(D {fmt(p.D)}m)로 걸기</option>
                <option value="x">가로(W {fmt(p.W)}m)로 걸기</option>
              </select>
            </Field>
            <Field label="천장틀 간격 이내 (m)">
              <NumInput value={p.gapMax} onChange={(gapMax) => set({ gapMax })} />
            </Field>
            <Field label="스레드로드 간격 이내 (m)">
              <NumInput value={p.rodPitch} onChange={(rodPitch) => set({ rodPitch })} />
            </Field>
            <Field label="벽 쪽 끝 로드">
              <select value={p.rodEnds ? '1' : '0'} onChange={(e) => set({ rodEnds: e.target.value === '1' })} className={sel}>
                <option value="0">빼기</option>
                <option value="1">넣기</option>
              </select>
            </Field>
            <Field label="손실률 (%)">
              <NumInput value={p.loss} onChange={(loss) => set({ loss })} />
            </Field>
            <Field label="지붕 최고 (m)">
              <NumInput value={p.slabMax} onChange={(slabMax) => set({ slabMax })} />
            </Field>
            <Field label="지붕 최저 (m)">
              <NumInput value={p.slabMin} onChange={(slabMin) => set({ slabMin })} />
            </Field>
            <Field label="문 높이 (m)">
              <NumInput value={p.doorH} onChange={(doorH) => set({ doorH })} />
            </Field>
          </div>

          <p className="text-sm font-medium">자재·단가</p>
          <div className="grid grid-cols-3 gap-2">
            <Field label="판넬 규격">
              <TextIn value={p.panelSpec} onChange={(panelSpec) => set({ panelSpec })} />
            </Field>
            <Field label="천장틀 규격">
              <TextIn value={p.frameSpec} onChange={(frameSpec) => set({ frameSpec })} />
            </Field>
            <Field label="조명 규격">
              <TextIn value={p.lightSpec} onChange={(lightSpec) => set({ lightSpec })} />
            </Field>
            {(
              [
                ['panel', '벽 판넬 원/㎡'],
                ['ceil', '천장 판넬 원/㎡'],
                ['frame', '천장틀 원/m'],
                ['rod', '스레드로드 원/개'],
                ['clamp', '클램프 원/개'],
                ['light', '조명 원/개'],
              ] as const
            ).map(([k, label]) => (
              <Field key={k} label={label}>
                <NumInput value={p.price[k]} onChange={(n) => set({ price: { ...p.price, [k]: n } })} />
              </Field>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-3 text-xs tabular-nums">
        <span>
          판넬벽 <b>{fmt(q.wallLen)}m</b> ({fmt(q.wallArea)}㎡) · 천장 <b>{fmt(q.ceilArea)}㎡</b> · 천장틀 <b>{q.rows}줄 {fmt(q.frameLen)}m</b> · 스레드로드{' '}
          <b>{q.rods}개</b> · 조명 <b>{q.lights}개</b> · 문 <b>{p.doors.length}개</b>
          {p.doors.length > 0 && ` (${won(p.doors.reduce((a, d) => a + d.price, 0))}원)`}
        </span>
        <Button size="sm" className="ml-auto rounded-none" onClick={onToTakeoff}>
          도면 수량을 적산에 넣기
        </Button>
      </div>
    </div>
  )
}
