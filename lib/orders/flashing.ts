/**
 * 후레싱(절곡 철판) 발주 품목. 단면은 절곡 구간(치수·각도·방향)으로 적고, 그림은 그 값으로 자동으로 그린다.
 * - 첫 구간에서 오른쪽으로 출발해, 다음 구간마다 '각도'(두 면 사이 안쪽 각, 90 = 직각, 180 = 꺾지 않음)만큼 접는다.
 * - 방향 up = 그림에서 위로(반시계) 접음, down = 아래로(시계) 접음.
 * - 각도 0 = 헴(Hem, 현장 말로 '짬처리'·끝접기): 끝을 180° 되접어 겹침. 그림에서는 겹친 면을 조금 띄워 접힌 쪽이 보이게 그림.
 * - 전개폭 = 구간 치수의 합.
 * 브라우저(발주서 화면)와 서버(PDF)가 같이 쓴다.
 */

export type BendDir = 'up' | 'down'
export type FlSeg = { len: number; angle: number; dir: BendDir }
/** start = 그림에서 첫 구간이 향하는 각도(0 = 오른쪽, 90 = 위). 그림 모양만 바꾸고 치수에는 영향 없음 */
/** zoom = 절곡 상세도 칸 크기(1 = 보통 1칸, 2 = 가로 2칸, 3 = 반 장), font = 치수 글자 배율(1 = 보통) */
export type Flashing = { kind: string; material: string; thickness: number; color: string; segs: FlSeg[]; start?: number; zoom?: number; font?: number }

export const FL_ZOOMS: [number, string][] = [[1, '보통 (1칸)'], [2, '크게 (2칸)'], [3, '아주 크게 (반 장)']]
export const FL_FONTS: [number, string][] = [[0.8, '작게'], [1, '보통'], [1.3, '크게'], [1.6, '더 크게'], [2, '아주 크게']]
/** 상세도 칸 수(2열 × 3줄 = 장당 6칸) */
export const flSlots = (f: Flashing) => (f.zoom === 3 ? 4 : f.zoom === 2 ? 2 : 1)

export const FL_MATERIALS = ['칼라강판', '아연도강판(GI)', '갈바륨(GL)', '스테인리스(STS304)', '알루미늄']
export const FL_THICKNESS = [0.35, 0.4, 0.5, 0.6, 0.8, 1.0, 1.2, 1.6, 2.0]
export const FL_COLORS = ['청색', '아이보리', '회색', '은회색', '백색', '흑색', '무도장']

const s = (len: number, angle = 90, dir: BendDir = 'down'): FlSeg => ({ len, angle, dir })

/**
 * 판넬 공사 현장에서 자주 쓰는 후레싱. 치수는 시작값(예시)이고 발주서에서 현장에 맞게 고친다.
 * 서울 상가 처마 현장 두 가지(처마 막음 전개 500, L자 아연도 1.2t 100×50)도 넣어 둠.
 */
export const FL_PRESETS: { kind: string; hint: string; fl: Omit<Flashing, 'kind'> }[] = [
  { kind: '처마 막음 후레싱', hint: '지붕판넬 끝 마구리를 덮고 아래로 물끊기. 전개 500', fl: { material: '칼라강판', thickness: 0.5, color: '청색', segs: [s(80), s(120, 90, 'down'), s(250, 90, 'down'), s(35, 90, 'up'), s(15, 135, 'up')] } },
  { kind: 'L자 앵글 (ㄱ자)', hint: '벽 쪽 받침·마감. 세로 100 × 가로 50', fl: { material: '아연도강판(GI)', thickness: 1.2, color: '무도장', segs: [s(100), s(50, 90, 'up')] } },
  { kind: '용마루 (지붕 두겁)', hint: '양쪽 지붕판넬 꼭대기를 덮음', fl: { material: '칼라강판', thickness: 0.5, color: '청색', start: 90, segs: [s(25), s(180, 100, 'down'), s(180, 160, 'down'), s(25, 100, 'down')] } },
  { kind: '박공 후레싱 (측면 마감)', hint: '지붕 옆면(박공) 판넬 끝을 감쌈', fl: { material: '칼라강판', thickness: 0.5, color: '청색', segs: [s(100), s(150, 90, 'down'), s(30, 90, 'down')] } },
  { kind: '벽체 두겁 (ㄷ자)', hint: '벽판넬 위 끝을 덮음. 판넬 두께 100 기준', fl: { material: '칼라강판', thickness: 0.5, color: '아이보리', segs: [s(60), s(110, 90, 'down'), s(60, 90, 'down')] } },
  { kind: '외부 코너 후레싱', hint: '벽판넬 바깥 모서리', fl: { material: '칼라강판', thickness: 0.5, color: '아이보리', segs: [s(100), s(100, 90, 'down')] } },
  { kind: '내부 코너 후레싱', hint: '벽판넬 안쪽 모서리', fl: { material: '칼라강판', thickness: 0.5, color: '아이보리', segs: [s(60), s(60, 90, 'up')] } },
  { kind: '하부 물끊기 후레싱', hint: '벽판넬 아래 끝, 바닥과 만나는 곳', fl: { material: '칼라강판', thickness: 0.5, color: '아이보리', segs: [s(50), s(100, 90, 'down'), s(30, 135, 'up')] } },
  { kind: '벽-지붕 접합 후레싱', hint: '높은 벽에 낮은 지붕이 붙는 곳(옹벽 단차)', fl: { material: '칼라강판', thickness: 0.5, color: '청색', segs: [s(20), s(150, 90, 'up'), s(150, 95, 'down'), s(20, 90, 'down')] } },
  { kind: '창호·도어 후레싱', hint: '문·창 개구부 둘레', fl: { material: '칼라강판', thickness: 0.5, color: '아이보리', segs: [s(20), s(110, 90, 'down'), s(50, 90, 'up')] } },
  { kind: '부착 물받이', hint: '처마 끝에 붙이는 물받이(U형)', fl: { material: '칼라강판', thickness: 0.6, color: '청색', segs: [s(20), s(120, 90, 'down'), s(150, 90, 'up'), s(100, 90, 'up'), s(15, 90, 'up')] } },
  { kind: '평철판 (절곡 없음)', hint: '막음판·보강판', fl: { material: '칼라강판', thickness: 0.5, color: '청색', segs: [s(300)] } },
]

export function emptyFlashing(): Flashing {
  return { kind: '', material: '칼라강판', thickness: 0.5, color: '', segs: [s(100), s(100, 90, 'down')] }
}

export function normalizeFlashing(raw: unknown): Flashing | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const r = raw as Record<string, unknown>
  const n = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0)
  const segs = Array.isArray(r.segs)
    ? r.segs.slice(0, 20).map((x) => {
        const g = (x && typeof x === 'object' ? x : {}) as Record<string, unknown>
        return { len: n(g.len), angle: g.angle === undefined || g.angle === null || g.angle === '' ? 90 : Math.min(180, Math.max(0, n(g.angle))), dir: g.dir === 'up' ? 'up' : 'down' } satisfies FlSeg
      })
    : []
  return {
    kind: String(r.kind ?? '').slice(0, 100),
    material: String(r.material ?? '').slice(0, 60),
    thickness: n(r.thickness),
    color: String(r.color ?? '').slice(0, 40),
    segs,
    ...([2, 3].includes(Number(r.zoom)) ? { zoom: Number(r.zoom) } : {}),
    ...(Number.isFinite(Number(r.font)) && Number(r.font) > 0 && Number(r.font) !== 1 ? { font: Math.min(2.5, Math.max(0.6, Number(r.font))) } : {}),
    ...(r.start !== undefined && r.start !== null && r.start !== '' && Number.isFinite(Number(r.start)) ? { start: ((Math.round(Number(r.start)) % 360) + 360) % 360 } : {}),
  }
}

export function flWidth(f: Flashing) {
  return f.segs.reduce((a, g) => a + (g.len > 0 ? g.len : 0), 0)
}

export function flBends(f: Flashing) {
  return f.segs.slice(1).filter((g) => g.angle < 180).length
}

/** 표에 넣는 한 줄 규격: 아연도강판(GI) 1.2t · 무도장 · 전개 150 · 절곡 1회 */
export function flSpec(f: Flashing) {
  return [f.material, f.thickness ? `${f.thickness}t` : '', f.color, flWidth(f) ? `전개 ${flWidth(f)}` : '', f.segs.length > 1 ? `절곡 ${flBends(f)}회` : '']
    .filter(Boolean)
    .join(' · ')
}

/** 치수 순서 글: 80 ↓90° 120 ↓90° 250 … */
export function flSegText(f: Flashing) {
  return f.segs.map((g, i) => (i === 0 ? `${g.len}` : `${g.dir === 'up' ? '↑' : '↓'}${g.angle === 0 ? '헴(짬)' : `${g.angle}°`} ${g.len}`)).join(' ')
}

function walk(segs: FlSeg[], start: number) {
  let x = 0
  let y = 0
  let h = start
  const pts: [number, number][] = [[0, 0]]
  const heads: number[] = []
  segs.forEach((g, i) => {
    if (i > 0) h += (g.dir === 'up' ? 1 : -1) * (180 - g.angle)
    heads.push(h)
    const rad = (h * Math.PI) / 180
    x += Math.cos(rad) * Math.max(g.len, 0)
    y += Math.sin(rad) * Math.max(g.len, 0)
    pts.push([x, y])
  })
  return { pts, heads }
}

/** 90°가 아닌 각도가 섞여도 그림이 기울지 않게, 수평·수직에 맞는 구간 길이가 가장 길어지도록 전체를 돌림 */
export function flAutoStart(segs: FlSeg[]) {
  const { heads } = walk(segs, 0)
  const off = (d: number) => {
    const m = ((d % 90) + 90) % 90
    return Math.min(m, 90 - m)
  }
  let best = 0
  let bestLen = -1
  const cands = [0, ...heads.map((d) => -(((d % 90) + 90) % 90))]
  for (const c of cands) {
    const len = segs.reduce((a, g, i) => a + (off(heads[i] + c) < 0.5 ? Math.max(g.len, 0) : 0), 0)
    if (len > bestLen + 0.5) { bestLen = len; best = c }
  }
  // 첫 구간이 오른쪽에 가깝게(-45~45) 보이도록 90° 단위로 맞춤
  return best < -45 ? best + 90 : best
}

function points(segs: FlSeg[], start?: number) {
  return walk(segs, start ?? flAutoStart(segs)).pts
}

/** 크게(2칸)일 때 세로 2칸이 가로 2칸보다 그림이 더 크게 나오는지 */
export function flTall(f: Flashing) {
  const pts = points(f.segs, f.start)
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1])
  const w = Math.max(Math.max(...xs) - Math.min(...xs), 1), h = Math.max(Math.max(...ys) - Math.min(...ys), 1)
  return Math.min(240 / w, 340 / h) > Math.min(560 / w, 70 / h)
}

/** 점에서 i번째 구간을 뺀 나머지 구간까지의 최소 거리 */
function clearance(P: [number, number][], skip: number, x: number, y: number) {
  let m = Infinity
  for (let k = 0; k + 1 < P.length; k++) {
    if (k === skip) continue
    const [ax, ay] = P[k], [bx, by] = P[k + 1]
    const vx = bx - ax, vy = by - ay
    const t = Math.max(0, Math.min(1, ((x - ax) * vx + (y - ay) * vy) / (vx * vx + vy * vy || 1)))
    m = Math.min(m, Math.hypot(x - (ax + vx * t), y - (ay + vy * t)))
  }
  return m
}

/** 단면 그림 SVG. w·h 는 px(화면) 또는 mm(인쇄) 어느 단위든 viewBox 기준 */
export function flSvg(f: Flashing, w = 300, h = 170, opts: { font?: number } = {}): string {
  const font = (opts.font ?? 12) * (f.font ?? 1)
  const pts = points(f.segs, f.start)
  if (pts.length < 2) return `<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg"></svg>`
  const xs = pts.map((p) => p[0])
  const ys = pts.map((p) => p[1])
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys)
  const pad = font * 2.6
  const sc = Math.min((w - pad * 2) / Math.max(maxX - minX, 1), (h - pad * 2) / Math.max(maxY - minY, 1))
  const ox = (w - (maxX - minX) * sc) / 2
  const oy = (h - (maxY - minY) * sc) / 2
  const P = pts.map(([x, y]) => [ox + (x - minX) * sc, h - (oy + (y - minY) * sc)] as [number, number])
  // 헴(각도 0)은 앞 구간 위에 그대로 겹치면 안 보이므로, 접는 쪽으로 조금 띄우고 접힌 곳을 둥글게 그림
  const gap = font * 0.45
  const hemAt: { i: number; dx: number; dy: number; nx: number; ny: number }[] = []
  f.segs.forEach((g, i) => {
    if (i === 0 || g.angle !== 0) return
    const [a, b] = [P[i - 1], P[i]]
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1
    const dx = (b[0] - a[0]) / L, dy = (b[1] - a[1]) / L
    // 화면 좌표(y 아래로)에서 위로(반시계) 접으면 진행 방향 왼쪽 = (dy, -dx)
    const sgn = g.dir === 'up' ? 1 : -1
    const nx = dy * sgn, ny = -dx * sgn
    for (let k = i + 1; k < P.length; k++) P[k] = [P[k][0] + nx * gap, P[k][1] + ny * gap]
    hemAt.push({ i, dx, dy, nx, ny })
  })
  const cx = P.reduce((a, p) => a + p[0], 0) / P.length
  const cy = P.reduce((a, p) => a + p[1], 0) / P.length
  const r = (n: number) => Math.round(n * 10) / 10
  let out = `<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" font-family="Pretendard, sans-serif">`
  let path = `M${r(P[0][0])},${r(P[0][1])}`
  P.slice(1).forEach((p, k) => {
    const i = k + 1
    const hm = hemAt.find((x) => x.i === i)
    if (hm) {
      const j = P[i]
      const e: [number, number] = [j[0] + hm.nx * gap, j[1] + hm.ny * gap]
      path += ` L${r(j[0])},${r(j[1])} C${r(j[0] + hm.dx * gap)},${r(j[1] + hm.dy * gap)} ${r(e[0] + hm.dx * gap)},${r(e[1] + hm.dy * gap)} ${r(e[0])},${r(e[1])}`
    } else path += ` L${r(p[0])},${r(p[1])}`
  })
  out += `<path d="${path}" fill="none" stroke="#0F2A44" stroke-width="${font * 0.22}" stroke-linejoin="round" stroke-linecap="round"/>`
  out += `<circle cx="${r(P[0][0])}" cy="${r(P[0][1])}" r="${font * 0.28}" fill="#E8742A"/>`
  // 라벨 모으기: 치수(굵게) 먼저, 각도·헴 다음. 겹치면 바깥으로 빼고 화살표로 가리킴
  type Lb = { text: string; size: number; color: string; bold: boolean; ax: number; ay: number; ux: number; uy: number; base: number; flip: boolean }
  const labels: Lb[] = []
  const angles: Lb[] = []
  f.segs.forEach((g, i) => {
    const [a, b] = [P[i], P[i + 1]]
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2
    let nx = -(b[1] - a[1]), ny = b[0] - a[0]
    const L = Math.hypot(nx, ny) || 1
    nx /= L; ny /= L
    const d = font * 0.95
    // 라벨은 다른 구간과 더 멀리 떨어진 쪽으로(같으면 도형 바깥쪽)
    const clr = (sx: number, sy: number) => clearance(P, i, mx + sx * d * 1.3, my + sy * d * 1.3)
    const cp = clr(nx, ny), cm = clr(-nx, -ny)
    if (Math.abs(cp - cm) > font * 0.3 ? cm > cp : (mx - cx) * nx + (my - cy) * ny < 0) { nx = -nx; ny = -ny }
    labels.push({ text: String(g.len), size: font, color: '#1D2430', bold: true, ax: mx, ay: my, ux: nx, uy: ny, base: d, flip: true })
    const hm = hemAt.find((x) => x.i === i)
    if (hm) {
      const j = P[i]
      angles.push({ text: '헴(짬)', size: font * 0.8, color: '#E8742A', bold: true, ax: j[0] + hm.nx * gap * 0.5, ay: j[1] + hm.ny * gap * 0.5, ux: hm.dx, uy: hm.dy, base: font * 1.9, flip: false })
    } else if (i > 0 && g.angle < 180) {
      const j = P[i]
      let ax = j[0] - cx, ay = j[1] - cy
      const AL = Math.hypot(ax, ay) || 1
      ax /= AL; ay /= AL
      angles.push({ text: `${g.angle}°`, size: font * 0.8, color: '#E8742A', bold: false, ax: j[0], ay: j[1], ux: -ax, uy: -ay, base: font * 1.4, flip: true })
    }
  })
  const textW = (t: string, sz: number) => [...t].reduce((a, c) => a + (c.charCodeAt(0) < 128 ? (c === '°' ? 0.4 : 0.6) : 1.0) * sz, 0)
  type Box = [number, number, number, number]
  const placed: Box[] = []
  const boxAt = (lb: Lb, x: number, y: number): Box => { const hw = textW(lb.text, lb.size) / 2 + 1, hh = lb.size * 0.55; return [x - hw, y - hh, x + hw, y + hh] }
  const hitsLine = (bx: Box) => {
    for (let k = 0; k + 1 < P.length; k++) {
      const [p, q] = [P[k], P[k + 1]]
      for (let t = 0; t <= 16; t++) {
        const x = p[0] + ((q[0] - p[0]) * t) / 16, y = p[1] + ((q[1] - p[1]) * t) / 16
        if (x > bx[0] - 1 && x < bx[2] + 1 && y > bx[1] - 1 && y < bx[3] + 1) return true
      }
    }
    return false
  }
  const hitsBox = (bx: Box) => placed.some((o) => bx[0] < o[2] && bx[2] > o[0] && bx[1] < o[3] && bx[3] > o[1])
  const outside = (bx: Box) => bx[0] < 0 || bx[1] < 0 || bx[2] > w || bx[3] > h
  const place = (lb: Lb) => {
    // 기준 거리: 글자 상자가 선에 닿지 않을 만큼(방향에 따라 가로·세로 반폭 반영)
    const hw0 = textW(lb.text, lb.size) / 2 + 1, hh0 = lb.size * 0.55
    lb.base = Math.max(lb.base * 0.6, Math.abs(lb.ux) * hw0 + Math.abs(lb.uy) * hh0 + lb.size * 0.3)
    const steps = (lb.bold ? [0, 1.1, 2.2, 3.3] : [0, 0.8, 1.6]).map((k) => lb.base + k * lb.size)
    const dirs: [number, number][] = lb.flip ? [[lb.ux, lb.uy], [-lb.ux, -lb.uy]] : [[lb.ux, lb.uy]]
    let best: { x: number; y: number; dist: number; ux: number; uy: number } | null = null
    outer: for (const dist of steps) {
      for (const [ux, uy] of dirs) {
        const x = lb.ax + ux * dist, y = lb.ay + uy * dist
        const bx = boxAt(lb, x, y)
        if (!hitsBox(bx) && !hitsLine(bx) && !outside(bx)) { best = { x, y, dist, ux, uy }; break outer }
      }
    }
    // 자리가 없으면 덜 겹치는 처음 자리(선만 안 겹치면)로
    if (!best) {
      for (const dist of steps) {
        const x = lb.ax + lb.ux * dist, y = lb.ay + lb.uy * dist
        if (!hitsBox(boxAt(lb, x, y)) && !outside(boxAt(lb, x, y))) { best = { x, y, dist, ux: lb.ux, uy: lb.uy }; break }
      }
    }
    if (!best) best = { x: lb.ax + lb.ux * lb.base, y: lb.ay + lb.uy * lb.base, dist: lb.base, ux: lb.ux, uy: lb.uy }
    const bx = boxAt(lb, best.x, best.y)
    placed.push(bx)
    let s = ''
    if (best.dist > lb.base + 0.1 || (best.ux !== lb.ux && best.dist > lb.base + 0.1)) {
      // 화살표: 글자 상자 가장자리에서 기준점 쪽으로
      const vx = lb.ax - best.x, vy = lb.ay - best.y
      const VL = Math.hypot(vx, vy) || 1
      const ex = vx / VL, ey = vy / VL
      const tEdge = Math.min(Math.abs((bx[2] - bx[0]) / 2 / (ex || 1e-9)), Math.abs((bx[3] - bx[1]) / 2 / (ey || 1e-9)))
      const sx = best.x + ex * (tEdge + 1), sy = best.y + ey * (tEdge + 1)
      const tx = lb.ax - ex * font * 0.25, ty = lb.ay - ey * font * 0.25
      if (Math.hypot(tx - sx, ty - sy) > font * 0.4) {
        const hl = font * 0.45, hw = font * 0.22
        s += `<line x1="${r(sx)}" y1="${r(sy)}" x2="${r(tx)}" y2="${r(ty)}" stroke="${lb.color}" stroke-width="${font * 0.07}"/>`
        s += `<polygon points="${r(tx)},${r(ty)} ${r(tx - ex * hl - ey * hw)},${r(ty - ey * hl + ex * hw)} ${r(tx - ex * hl + ey * hw)},${r(ty - ey * hl - ex * hw)}" fill="${lb.color}"/>`
      }
    }
    return s + `<text x="${r(best.x)}" y="${r(best.y + lb.size * 0.35)}" font-size="${r(lb.size)}" text-anchor="middle" fill="${lb.color}"${lb.bold ? ' font-weight="600"' : ''}>${lb.text}</text>`
  }
  for (const lb of [...labels, ...angles]) out += place(lb)
  return out + '</svg>'
}

/** 서울 상가 처마(화곡동) 현장 후레싱 제안 9종(물받이 포함). 길이·수량은 발주 때 넣고, 총 길이는 비고에 둠 */
export const FL_SEOUL_SET: { name: string; note: string; fl: Flashing }[] = [
  { name: '처마 막음 (옹벽 쪽)', note: '총 13m', fl: { kind: '처마 막음 후레싱', material: '칼라강판', thickness: 0.5, color: '청색', segs: [s(100), s(300, 90, 'down'), s(100, 90, 'up')] } },
  { name: '건물 벽 접합 물끊기', note: '총 14m', fl: { kind: '벽-지붕 접합 후레싱', material: '칼라강판', thickness: 0.5, color: '청색', segs: [s(60), s(100, 90, 'down'), s(40, 135, 'up')] } },
  { name: '지붕 양 끝 마구리 캡', note: '2.3m × 2', fl: { kind: '박공 후레싱 (측면 마감)', material: '칼라강판', thickness: 0.5, color: '청색', segs: [s(50), s(150, 90, 'down'), s(50, 90, 'down')] } },
  { name: '건물 쪽 L자 받침', note: '총 14m, 세로면 앵커 @600', fl: { kind: 'L자 앵글 (ㄱ자)', material: '아연도강판(GI)', thickness: 1.2, color: '무도장', segs: [s(100), s(50, 90, 'up')] } },
  { name: '벽체 상부 마감', note: '총 15.1m', fl: { kind: '벽체 두겁 (ㄷ자)', material: '칼라강판', thickness: 0.5, color: '아이보리', segs: [s(50), s(100, 90, 'down')] } },
  { name: '벽체 하부 베이스 캡 (선택)', note: '총 15.1m', fl: { kind: '하부 물끊기 후레싱', material: '칼라강판', thickness: 0.5, color: '아이보리', segs: [s(50), s(100, 90, 'down'), s(50, 90, 'down')] } },
  { name: '외부 코너', note: '2.9m × 2', fl: { kind: '외부 코너 후레싱', material: '칼라강판', thickness: 0.5, color: '아이보리', segs: [s(100), s(100, 90, 'down')] } },
  { name: '부착 물받이 (옹벽 쪽 지붕 끝)', note: '총 14m · 끝막이 캡 2 · 선홈통 배수구 Ø75 1(오른쪽) · 치수 확인 필요', fl: { kind: '부착 물받이', material: '칼라강판', thickness: 0.6, color: '청색', segs: [s(50), s(110, 90, 'down'), s(150, 90, 'up'), s(130, 90, 'up'), s(20, 0, 'up')] } },
  { name: '문틀 주변 (선택)', note: '약 10m', fl: { kind: '창호·도어 후레싱', material: '칼라강판', thickness: 0.5, color: '아이보리', segs: [s(50), s(100, 90, 'down'), s(50, 90, 'down')] } },
]
