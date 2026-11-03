/**
 * 후레싱(절곡 철판) 발주 품목. 단면은 절곡 구간(치수·각도·방향)으로 적고, 그림은 그 값으로 자동으로 그린다.
 * - 첫 구간에서 오른쪽으로 출발해, 다음 구간마다 '각도'(두 면 사이 안쪽 각, 90 = 직각, 180 = 꺾지 않음)만큼 접는다.
 * - 방향 up = 그림에서 위로(반시계) 접음, down = 아래로(시계) 접음.
 * - 각도 0 = 헴(완전히 접어 겹침).
 * - 전개폭 = 구간 치수의 합.
 * 브라우저(발주서 화면)와 서버(PDF)가 같이 쓴다.
 */

export type BendDir = 'up' | 'down'
export type FlSeg = { len: number; angle: number; dir: BendDir }
/** start = 그림에서 첫 구간이 향하는 각도(0 = 오른쪽, 90 = 위). 그림 모양만 바꾸고 치수에는 영향 없음 */
export type Flashing = { kind: string; material: string; thickness: number; color: string; segs: FlSeg[]; start?: number }

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
    ...(Number.isFinite(Number(r.start)) && Number(r.start) ? { start: Number(r.start) } : {}),
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
  return f.segs.map((g, i) => (i === 0 ? `${g.len}` : `${g.dir === 'up' ? '↑' : '↓'}${g.angle === 0 ? '헴' : `${g.angle}°`} ${g.len}`)).join(' ')
}

function points(segs: FlSeg[], start = 0) {
  let x = 0
  let y = 0
  let h = (start * Math.PI) / 180
  const pts: [number, number][] = [[0, 0]]
  segs.forEach((g, i) => {
    if (i > 0) h += ((g.dir === 'up' ? 1 : -1) * (180 - g.angle) * Math.PI) / 180
    x += Math.cos(h) * Math.max(g.len, 0)
    y += Math.sin(h) * Math.max(g.len, 0)
    pts.push([x, y])
  })
  return pts
}

/** 단면 그림 SVG. w·h 는 px(화면) 또는 mm(인쇄) 어느 단위든 viewBox 기준 */
export function flSvg(f: Flashing, w = 300, h = 170, opts: { font?: number } = {}): string {
  const font = opts.font ?? 12
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
  const cx = P.reduce((a, p) => a + p[0], 0) / P.length
  const cy = P.reduce((a, p) => a + p[1], 0) / P.length
  const r = (n: number) => Math.round(n * 10) / 10
  let out = `<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" font-family="Pretendard, sans-serif">`
  out += `<polyline points="${P.map((p) => `${r(p[0])},${r(p[1])}`).join(' ')}" fill="none" stroke="#0F2A44" stroke-width="${font * 0.22}" stroke-linejoin="round" stroke-linecap="round"/>`
  out += `<circle cx="${r(P[0][0])}" cy="${r(P[0][1])}" r="${font * 0.28}" fill="#E8742A"/>`
  f.segs.forEach((g, i) => {
    const [a, b] = [P[i], P[i + 1]]
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2
    let nx = -(b[1] - a[1]), ny = b[0] - a[0]
    const L = Math.hypot(nx, ny) || 1
    nx /= L; ny /= L
    // 라벨은 도형 바깥쪽(중심 반대편)으로
    if ((mx - cx) * nx + (my - cy) * ny < 0) { nx = -nx; ny = -ny }
    const d = font * 0.95
    out += `<text x="${r(mx + nx * d)}" y="${r(my + ny * d + font * 0.35)}" font-size="${font}" text-anchor="middle" fill="#1D2430" font-weight="600">${g.len}</text>`
    if (i > 0 && g.angle < 180) {
      const j = P[i]
      let ax = j[0] - cx, ay = j[1] - cy
      const AL = Math.hypot(ax, ay) || 1
      ax /= AL; ay /= AL
      out += `<text x="${r(j[0] - ax * font * 1.4)}" y="${r(j[1] - ay * font * 1.4 + font * 0.3)}" font-size="${font * 0.8}" text-anchor="middle" fill="#E8742A">${g.angle === 0 ? '헴' : `${g.angle}°`}</text>`
    }
  })
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
