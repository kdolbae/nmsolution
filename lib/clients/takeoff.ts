/**
 * 적산: 측정값(길이·면적·개수)과 공종별 계산식으로 물량을 내고 견적 줄로 바꾼다.
 *
 * 적산표는 블록 여러 개로 이루어진다. 블록 하나 = 템플릿 하나를 복사한 것(판넬 벽, 천장·스레드로드, 등기구 …).
 * 블록마다 측정값(입력값·파생값)과 줄(품명·수량식·단가)이 있고, 계산식은 아래 evalExpr 로 푼다.
 * 템플릿은 기본 템플릿(BUILTIN_TEMPLATES)과 어드민에서 저장한 템플릿(site_content 'takeoff_templates')을 함께 쓴다.
 *
 * 브라우저·서버 양쪽에서 쓰므로 Node 전용 API 를 쓰지 않는다.
 */

import { ITEM_KINDS, newId, type ItemKind, type QuoteItem, type QuoteSection } from '@/lib/clients/quote'

// ---------- 계산식 ----------

/**
 * 사칙연산·거듭제곱(^)·괄호·비교(> < >= <= ==)와 함수(ceil floor round max min abs sqrt if)만 푸는 계산기.
 * eval 을 쓰지 않는다. 변수 이름은 영문·한글·숫자·_ (숫자로 시작하지 않음).
 * if(조건, 참, 거짓): 조건이 0 이 아니면 참.
 */
const FUNCS: Record<string, (...a: number[]) => number> = {
  ceil: (x) => Math.ceil(x - 1e-9),
  floor: (x) => Math.floor(x + 1e-9),
  round: (x, d = 0) => Math.round(x * 10 ** d) / 10 ** d,
  max: (...a) => Math.max(...a),
  min: (...a) => Math.min(...a),
  abs: (x) => Math.abs(x),
  sqrt: (x) => Math.sqrt(x),
  if: (c, a, b = 0) => (c ? a : b),
}

export function evalExpr(src: string, vars: Record<string, number>): number {
  const s = src.replace(/×/g, '*').replace(/÷/g, '/')
  let i = 0
  const ws = () => {
    while (i < s.length && /\s/.test(s[i])) i++
  }
  const fail = (m: string): never => {
    throw new Error(m)
  }
  const peek = (t: string) => (ws(), s.startsWith(t, i))
  const eat = (t: string) => (peek(t) ? ((i += t.length), true) : false)

  const cmp = (): number => {
    let a = add()
    for (;;) {
      if (eat('>=')) a = Number(a >= add())
      else if (eat('<=')) a = Number(a <= add())
      else if (eat('==')) a = Number(a === add())
      else if (eat('>')) a = Number(a > add())
      else if (eat('<')) a = Number(a < add())
      else return a
    }
  }
  const add = (): number => {
    let a = mul()
    for (;;) {
      if (eat('+')) a += mul()
      else if (eat('-')) a -= mul()
      else return a
    }
  }
  const mul = (): number => {
    let a = pow()
    for (;;) {
      if (eat('*')) a *= pow()
      else if (eat('/')) {
        const b = pow()
        a = b === 0 ? 0 : a / b
      } else if (eat('%')) {
        const b = pow()
        a = b === 0 ? 0 : a % b
      } else return a
    }
  }
  const pow = (): number => {
    const a = unary()
    return eat('^') ? a ** pow() : a
  }
  const unary = (): number => (eat('-') ? -unary() : eat('+') ? unary() : atom())
  const atom = (): number => {
    ws()
    if (eat('(')) {
      const v = cmp()
      if (!eat(')')) fail("')' 가 빠짐")
      return v
    }
    const num = /^\d+(\.\d+)?|^\.\d+/.exec(s.slice(i))
    if (num) {
      i += num[0].length
      return Number(num[0])
    }
    const id = /^[\p{L}_][\p{L}\p{N}_]*/u.exec(s.slice(i))
    if (!id) fail(i >= s.length ? '식이 덜 끝남' : `알 수 없는 글자 '${s[i]}'`)
    const name = id![0]
    i += name.length
    if (eat('(')) {
      const fn = FUNCS[name] ?? fail(`없는 함수 '${name}'`)
      const args: number[] = []
      if (!eat(')')) {
        do args.push(cmp())
        while (eat(','))
        if (!eat(')')) fail("')' 가 빠짐")
      }
      return fn(...args)
    }
    if (!(name in vars)) fail(`없는 측정값 '${name}'`)
    return vars[name]
  }

  if (!s.trim()) return 0
  const v = cmp()
  ws()
  if (i < s.length) fail(`알 수 없는 글자 '${s[i]}'`)
  return Number.isFinite(v) ? v : 0
}

/** 규격·비고 글에 들어간 {식} 을 값으로 바꾼다. 소수는 둘째 자리까지 */
export function fillText(text: string, vars: Record<string, number>): string {
  return text.replace(/\{([^{}]+)\}/g, (m, expr: string) => {
    try {
      return fmt(evalExpr(expr, vars))
    } catch {
      return m
    }
  })
}

export function fmt(n: number) {
  return (Math.round(n * 100) / 100).toLocaleString('ko-KR', { maximumFractionDigits: 2 })
}

// ---------- 데이터 ----------

export type TakeoffVar = {
  /** 식에서 부르는 이름 (예: L, 천정고) */
  key: string
  label: string
  unit: string
  value: number
  /** 있으면 입력값이 아니라 이 식으로 계산하는 값 */
  expr?: string
}

export type TakeoffRounding = 'ceil' | 'round' | 'none'

export type TakeoffLine = {
  id: string
  kind: ItemKind
  name: string
  /** {식} 을 쓸 수 있다 */
  spec: string
  unit: string
  /** 수량 계산식 */
  qty: string
  rounding: TakeoffRounding
  price: number
  /** 산출 근거. {식} 을 쓸 수 있다 */
  note: string
}

export type TakeoffBlock = {
  id: string
  /** 만든 템플릿 id (없으면 직접 만든 블록) */
  template?: string
  name: string
  vars: TakeoffVar[]
  lines: TakeoffLine[]
  /** 도면 읽기에서 넣은 값의 근거·확인할 점 */
  memo?: string
}

export type Takeoff = { blocks: TakeoffBlock[] }

export type TakeoffTemplate = {
  id: string
  name: string
  /** 언제 쓰는지 한 줄 (도면 읽기에도 쓴다) */
  desc: string
  vars: TakeoffVar[]
  lines: Omit<TakeoffLine, 'id'>[]
  /** 기본 템플릿은 어드민에서 지울 수 없다 */
  builtin?: boolean
}

// ---------- 기본 템플릿 ----------

const v = (key: string, label: string, unit: string, value = 0, expr?: string): TakeoffVar => ({ key, label, unit, value, ...(expr ? { expr } : {}) })
const line = (
  name: string,
  spec: string,
  unit: string,
  qty: string,
  price: number,
  note: string,
  kind: ItemKind = '재료비',
  rounding: TakeoffRounding = 'ceil',
): Omit<TakeoffLine, 'id'> => ({ kind, name, spec, unit, qty, rounding, price, note })

/**
 * 기본 템플릿. 단가는 2026-10 kevin 기준(판넬 15,000원/㎡, LED 평판등 22,000원, 전기 평당 12만원)이고, 모르는 단가는 0 으로 둔다.
 * 스레드로드 규칙: 천장틀 간격 1.5m 이내, 기본 지지 간격 1m (2026-10-19 kevin). 고양 어드리밍은 천장틀 1.5m 간격, 천장틀마다 2.2m 간격 3지점(벽 쪽 끝 제외).
 */
export const BUILTIN_TEMPLATES: TakeoffTemplate[] = [
  {
    id: 'panel-wall',
    name: '판넬 칸막이 벽',
    desc: '샌드위치 판넬 벽체. 신규 벽 길이 합계와 높이, 문 개구부로 판넬 ㎡를 낸다',
    builtin: true,
    vars: [
      v('L', '신규 벽 길이 합계', 'm'),
      v('H', '벽 높이', 'm', 3),
      v('doors', '문 개수', '개', 0),
      v('doorA', '문 1개 개구부', '㎡', 1.9),
      v('loss', '손실률', '%', 5),
      v('area', '벽 면적 (개구부 제외)', '㎡', 0, 'max(0, L*H - doors*doorA)'),
    ],
    lines: [
      line('벽체 판넬', '샌드위치 판넬 75T, H {H}m', '㎡', 'area*(1+loss/100)', 15000, '{L}m × {H}m − 문 {doors}개소, 손실 {loss}%'),
      line('바닥·상부 U바', '75T용', 'm', 'L*2*(1+loss/100)', 3600, '벽 상하 {L}m × 2'),
      line('몰딩', '코너·걸레받이', 'm', 'L*2*(1+loss/100)', 2400, '벽 양면 {L}m × 2'),
    ],
  },
  {
    id: 'panel-ceiling',
    name: '판넬 천장 · 스레드로드',
    desc: '판넬 천장과 천장 하지. 천장틀(각파이프·C형강)을 간격 이내로 걸고, 천장틀마다 지지 간격으로 스레드로드를 단다. 벽 위 끝 지점 포함 여부를 고를 수 있고, 지붕 경사면 아래면 최고·최저 높이를 넣는다',
    builtin: true,
    vars: [
      v('W', '천장틀 방향 길이 (천장틀 1줄 길이)', 'm'),
      v('D', '천장틀 간격 방향 길이', 'm'),
      v('slabMax', '기존 천장 최고 높이 (용마루 쪽)', 'm', 6),
      v('slabMin', '기존 천장 최저 높이 (처마 쪽, 평지붕이면 최고와 같게)', 'm', 6),
      v('ph', '판넬 천장 높이', 'm', 3),
      v('gapMax', '천장틀 간격 최대', 'm', 1.5),
      v('beamEnds', '양 끝 천장틀 포함 (1 포함, 0 벽이 받음)', '', 1),
      v('pitch', '천장틀당 스레드로드 지지 간격', 'm', 1),
      v('rodEnds', '천장틀 양 끝 지지점 포함 (1 포함, 0 벽이 받음)', '', 1),
      v('loss', '손실률', '%', 5),
      v('beams', '천장틀 줄 수', '줄', 0, 'if(D, max(0, ceil(D/gapMax)-1+2*beamEnds), 0)'),
      v('gap', '천장틀 실제 간격', 'm', 0, 'D/max(1, ceil(D/gapMax))'),
      v('per', '천장틀당 스레드로드', '개', 0, 'if(W, max(0, ceil(W/pitch)-1+2*rodEnds), 0)'),
      v('rodGap', '스레드로드 실제 간격', 'm', 0, 'W/max(1, ceil(W/pitch))'),
      v('rodMax', '스레드로드 최장', 'm', 0, 'max(0, slabMax-ph)'),
      v('rodMin', '스레드로드 최단', 'm', 0, 'max(0, min(slabMin, slabMax)-ph)'),
      v('rodAvg', '스레드로드 평균 길이 (경사 직선 가정)', 'm', 0, '(rodMax+rodMin)/2'),
      v('rodTotal', '스레드로드 총 길이', 'm', 0, 'beams*per*rodAvg'),
    ],
    lines: [
      line('천장 판넬', '샌드위치 판넬 75T', '㎡', 'W*D*(1+loss/100)', 15000, '{W} × {D}m = {W*D}㎡, 손실 {loss}%'),
      line('스레드로드 행거', 'W3/8", L {rodMin}~{rodMax}m, 앙카·너트·와샤 포함', '개소', 'beams*per', 9800, '천장틀 {beams}줄(간격 {gap}m) × {per}개(간격 {rodGap}m), 평균 길이 {rodAvg}m, 총 {rodTotal}m'),
      line('천장틀', '각파이프 □50×50×1.6t', 'm', 'beams*W*(1+loss/100)', 6200, '{beams}줄 × {W}m, 손실 {loss}%'),
      line('행거 클램프', '천장틀 고정용', '개', 'beams*per', 2300, '스레드로드 개소당 1개'),
    ],
  },
  {
    id: 'light-grid',
    name: '등기구 (실 치수·간격)',
    desc: '실 하나의 가로·세로를 배치 간격으로 나눠 등기구 개수를 낸다. 실마다 블록을 하나씩 둔다',
    builtin: true,
    vars: [v('W', '실 가로', 'm'), v('D', '실 세로', 'm'), v('pitch', '배치 간격', 'm', 2.5)],
    lines: [
      line(
        'LED 평판등',
        '640×640',
        '개',
        'if(W*D, max(1, round(W/pitch))*max(1, round(D/pitch)), 0)',
        22000,
        '{W} × {D}m, 간격 {pitch}m',
        '재료비',
        'none',
      ),
    ],
  },
  {
    id: 'elec-pyeong',
    name: '전기 평당 시공',
    desc: '바닥 면적을 평으로 바꿔 평당 시공비를 매긴다 (스위치·콘센트·배선 포함)',
    builtin: true,
    vars: [v('A', '바닥 면적', '㎡'), v('py', '평수', '평', 0, 'round(A/3.3058)')],
    lines: [line('전기 시공비', '배선·배관, 스위치·콘센트, 결선', '평', 'py', 120000, '{A}㎡ ≈ {py}평', '경비', 'none')],
  },
  {
    id: 'roof-overlay',
    name: '지붕 덧씌움',
    desc: '박공 지붕 판넬 덧씌움. 지붕 길이·한쪽 폭·면 수로 지붕재와 후레싱 길이를 낸다',
    builtin: true,
    vars: [
      v('L', '지붕 길이 (용마루 방향)', 'm'),
      v('W', '한쪽 지붕 폭 (물매 방향)', 'm'),
      v('sides', '지붕 면 수', '면', 2),
      v('loss', '손실률', '%', 5),
    ],
    lines: [
      line('지붕 판넬', '징크·샌드위치 판넬', '㎡', 'L*W*sides*(1+loss/100)', 0, '{L} × {W}m × {sides}면, 손실 {loss}%'),
      line('용마루 후레싱', '', 'm', 'L*(1+loss/100)', 0, '용마루 {L}m'),
      line('처마 후레싱', '', 'm', 'L*sides*(1+loss/100)', 0, '처마 {L}m × {sides}면'),
      line('박공 후레싱', '', 'm', 'W*sides*2*(1+loss/100)', 0, '박공 {W}m × {sides}면 × 양쪽'),
    ],
  },
  {
    id: 'length-stock',
    name: '길이 자재 (배관·형강·전선)',
    desc: '총 길이를 정척으로 나눠 본 수를 낸다. 배관, 각파이프, 형강, 전선 등',
    builtin: true,
    vars: [v('len', '총 길이', 'm'), v('stock', '정척 길이', 'm', 6), v('loss', '손실률', '%', 5)],
    lines: [line('자재', '', '본', 'len*(1+loss/100)/stock', 0, '{len}m ÷ 정척 {stock}m, 손실 {loss}%')],
  },
  {
    id: 'blank',
    name: '빈 적산 (직접 만들기)',
    desc: '측정값과 계산식을 직접 넣는다',
    builtin: true,
    vars: [v('Q', '수량', '')],
    lines: [line('', '', '식', 'Q', 0, '')],
  },
]

// ---------- 정리 ----------

function num(x: unknown, fallback = 0) {
  const n = Number(x)
  return Number.isFinite(n) ? n : fallback
}
const str = (x: unknown) => (typeof x === 'string' ? x : '')

function normVar(x: Partial<TakeoffVar>): TakeoffVar {
  return { key: str(x.key), label: str(x.label), unit: str(x.unit), value: num(x.value), ...(str(x.expr).trim() ? { expr: str(x.expr) } : {}) }
}

function normLine(x: Partial<TakeoffLine>): TakeoffLine {
  return {
    id: str(x.id) || newId('t'),
    kind: (ITEM_KINDS as readonly string[]).includes(x.kind as string) ? (x.kind as ItemKind) : '재료비',
    name: str(x.name),
    spec: str(x.spec),
    unit: str(x.unit),
    qty: str(x.qty),
    rounding: x.rounding === 'round' || x.rounding === 'none' ? x.rounding : 'ceil',
    price: num(x.price),
    note: str(x.note),
  }
}

/** 저장된 값이 비어 있거나 옛 모양이어도 계산이 깨지지 않게 채운다 */
export function normalizeTakeoff(raw: unknown): Takeoff {
  const t = raw as Partial<Takeoff> | null
  if (!t || !Array.isArray(t.blocks)) return { blocks: [] }
  return {
    blocks: t.blocks.map((b) => ({
      id: str(b.id) || newId('b'),
      ...(str(b.template) ? { template: str(b.template) } : {}),
      name: str(b.name),
      vars: Array.isArray(b.vars) ? b.vars.map(normVar) : [],
      lines: Array.isArray(b.lines) ? b.lines.map(normLine) : [],
      ...(str(b.memo) ? { memo: str(b.memo) } : {}),
    })),
  }
}

export function normalizeTemplate(raw: unknown): TakeoffTemplate | null {
  const t = raw as Partial<TakeoffTemplate> | null
  if (!t || !str(t.id) || !str(t.name)) return null
  return {
    id: str(t.id),
    name: str(t.name),
    desc: str(t.desc),
    vars: Array.isArray(t.vars) ? t.vars.map(normVar) : [],
    lines: Array.isArray(t.lines)
      ? t.lines.map((l) => {
          const { id: _id, ...rest } = normLine(l)
          return rest
        })
      : [],
  }
}

/** 템플릿으로 새 블록. values 가 있으면 그 측정값으로 채운다 */
export function blockFrom(t: TakeoffTemplate, values?: Record<string, number>, name?: string): TakeoffBlock {
  return {
    id: newId('b'),
    template: t.id,
    name: name || t.name,
    vars: t.vars.map((x) => ({ ...x, value: !x.expr && values && x.key in values ? num(values[x.key], x.value) : x.value })),
    lines: t.lines.map((l) => ({ ...l, id: newId('t') })),
  }
}

/** 블록을 템플릿으로 (지금 측정값이 기본값이 된다) */
export function templateFrom(b: TakeoffBlock, id = newId('tpl')): TakeoffTemplate {
  return { id, name: b.name, desc: '', vars: b.vars.map((x) => ({ ...x })), lines: b.lines.map(({ id: _id, ...l }) => l) }
}

// ---------- 계산 ----------

export type LineResult = { qty: number; spec: string; note: string; error?: string }
export type BlockResult = { values: Record<string, number>; varErrors: Record<string, string>; lines: LineResult[] }

function rounded(x: number, r: TakeoffRounding) {
  return r === 'ceil' ? Math.ceil(x - 1e-9) : r === 'round' ? Math.round(x) : Math.round(x * 100) / 100
}

export function calcBlock(b: TakeoffBlock): BlockResult {
  const values: Record<string, number> = {}
  const varErrors: Record<string, string> = {}
  // 입력값 먼저, 파생값은 적힌 순서대로
  for (const x of b.vars) if (x.key && !x.expr) values[x.key] = x.value
  for (const x of b.vars) {
    if (!x.key || !x.expr) continue
    try {
      values[x.key] = evalExpr(x.expr, values)
    } catch (e) {
      values[x.key] = 0
      varErrors[x.key] = (e as Error).message
    }
  }
  const lines = b.lines.map((l): LineResult => {
    try {
      return { qty: Math.max(0, rounded(evalExpr(l.qty, values), l.rounding)), spec: fillText(l.spec, values), note: fillText(l.note, values) }
    } catch (e) {
      return { qty: 0, spec: fillText(l.spec, values), note: fillText(l.note, values), error: (e as Error).message }
    }
  })
  return { values, varErrors, lines }
}

/** 적산표 전체를 견적 줄로. 품명·규격·단위·단가·구분이 같은 줄은 수량을 더하고 근거를 잇는다. 수량 0 은 뺀다 */
export function takeoffItems(t: Takeoff): QuoteItem[] {
  const out: QuoteItem[] = []
  for (const b of t.blocks) {
    const r = calcBlock(b)
    b.lines.forEach((l, i) => {
      const c = r.lines[i]
      if (!l.name.trim() || !c.qty || c.error) return
      const same = out.find((o) => o.name === l.name.trim() && o.spec === c.spec && o.unit === l.unit && o.price === l.price && o.kind === l.kind)
      const note = [b.name, c.note].filter(Boolean).join(': ')
      if (same) {
        same.qty = Math.round((same.qty + c.qty) * 100) / 100
        same.note = `${same.note} + ${note}`
      } else
        out.push({ id: newId('i'), kind: l.kind, name: l.name.trim(), spec: c.spec, unit: l.unit, qty: c.qty, price: l.price, note, deduct: false })
    })
  }
  return out
}

/**
 * 적산 줄을 공종에 넣는다. 품명이 같은 줄은 규격·수량·단가·단위·근거를 바꾸고(구분·감액은 그대로), 없는 줄은 끝에 붙인다.
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

// ---------- 도면 읽기 ----------

/** 도면 읽기 결과 한 블록: 템플릿 id 와 측정값 */
export type DrawingBlock = { template: string; name: string; values: { key: string; value: number }[]; basis: string }
export type DrawingResult = { blocks: DrawingBlock[]; notes: string[] }

/** 도면 읽기 결과를 블록으로. 없는 템플릿은 건너뛴다 */
export function blocksFromDrawing(r: DrawingResult, templates: TakeoffTemplate[]): TakeoffBlock[] {
  const out: TakeoffBlock[] = []
  for (const d of r.blocks) {
    const t = templates.find((x) => x.id === d.template)
    if (!t) continue
    const values = Object.fromEntries(d.values.map((x) => [x.key, x.value]))
    out.push({ ...blockFrom(t, values, d.name), memo: d.basis })
  }
  return out
}
