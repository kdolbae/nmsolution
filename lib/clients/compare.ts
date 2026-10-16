/**
 * 버전 비교: 제안서·견적서를 소제목 단위 조각(Segment)으로 나누고, 두 버전의 같은 조각을 줄 단위로 비교한다.
 *
 * - 견적서: 개요, 금액 합계, 공종마다 한 조각, 특기사항.
 * - 제안서: h2 를 큰 제목, h3 를 소제목으로 삼는다(splitProposal 은 브라우저의 DOMParser 를 쓴다).
 * 브라우저·서버 양쪽에서 쓰므로 Node 전용 API 를 쓰지 않는다.
 */

import { calcQuote, itemAmount, won, type Quote } from './quote'

/** cells 가 있으면 표의 한 줄. item 이면 견적 내역 한 줄(구분·품명·규격·수량·단위·단가·금액·비고) */
export type Line = { text: string; cells?: string[]; item?: true }

export type Segment = {
  /** 두 버전에서 같은 조각을 찾는 열쇠 */
  key: string
  doc: '견적서' | '제안서'
  /** 목차의 큰 제목 (제안서 h2, 견적서는 '견적서') */
  group: string
  title: string
  lines: Line[]
}

function row(cells: string[]): Line {
  return { text: cells.join(' | '), cells }
}

export function quoteSegments(q: Quote): Segment[] {
  const calc = calcQuote(q)
  const seg = (key: string, title: string, lines: Line[]): Segment => ({ key: `q:${key}`, doc: '견적서', group: '견적서', title, lines })
  const r = q.rates
  const out: Segment[] = [
    seg('info', '개요', [
      { text: `견적번호 ${q.number}` },
      { text: `견적일자 ${q.date}` },
      { text: `공사명 ${q.title}` },
      { text: `유효기간 ${q.validDays}일` },
      {
        text: q.costCalc
          ? `원가계산 적용: 산재 ${r.injury}%, 고용 ${r.employment}%, 안전관리비 ${r.safety}%, 일반관리비 ${r.overhead}%, 이윤 ${r.profit}%`
          : '원가계산 미적용',
      },
      { text: q.truncate ? '공종 합계 천원 미만 절사' : '절사 안 함' },
    ]),
    seg('total', '금액 합계', [
      ...q.sections.map((s, i) => row([`${s.name || `공종 ${i + 1}`}${s.option ? ' (선택, 별도)' : ''}`, `${won(calc.sections[i].total)}원`])),
      row(['공급가액', `${won(calc.supply)}원`]),
      row(['부가세', `${won(calc.vat)}원`]),
      row(['합계', `${won(calc.grand)}원`]),
    ]),
  ]
  q.sections.forEach((s, si) => {
    const c = calc.sections[si]
    const on = q.costCalc && !s.flat
    out.push(
      seg(`s:${s.id}`, `공종: ${s.name || `공종 ${si + 1}`}${s.option ? ' (선택 항목)' : ''}`, [
        ...(s.desc ? [{ text: s.desc }] : []),
        ...s.items.map((i): Line => ({ ...row([i.kind, i.name, i.spec, i.qty.toLocaleString('ko-KR', { maximumFractionDigits: 3 }), i.unit, won(i.price), won(itemAmount(i)), i.note]), item: true })),
        { text: `재료비 ${won(c.mat)} · 노무비 ${won(c.lab)} · 경비 ${won(c.exp)}` },
        {
          text: on
            ? `보험·안전 ${won(c.injury + c.employment + c.safety)} · 일반관리비 ${won(c.overhead)} · 이윤 ${won(c.profit)}`
            : '원가계산 제외 (재료·노무·경비만)',
        },
        { text: `공종 합계 ${won(c.total)}원` },
      ]),
    )
  })
  out.push(
    seg(
      'notes',
      '특기사항',
      q.notes
        .split('\n')
        .map((t) => t.trim())
        .filter(Boolean)
        .map((text) => ({ text })),
    ),
  )
  return out
}

/** 견적서에서 바뀐 조각 이름. 버전 기록의 한 줄 요약에 쓴다 */
export function changedQuoteParts(a: Quote, b: Quote): string[] {
  const before = new Map(quoteSegments(a).map((s) => [s.key, s]))
  const after = quoteSegments(b)
  const names: string[] = []
  for (const s of after) {
    const o = before.get(s.key)
    if (!o) names.push(`${s.title} 추가`)
    else if (!sameLines(o.lines, s.lines) && s.key !== 'q:total') names.push(s.title.replace(/^공종: /, ''))
    before.delete(s.key)
  }
  for (const o of before.values()) names.push(`${o.title.replace(/^공종: /, '')} 삭제`)
  return names
}

export function sameLines(a: Line[], b: Line[]) {
  return a.length === b.length && a.every((l, i) => l.text === b[i].text)
}

// ---------- 제안서 (브라우저 전용) ----------

const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'SVG', 'HEAD', 'BUTTON', 'FORM', 'INPUT'])
const BLOCK =
  'div,p,ul,ol,li,table,thead,tbody,tr,section,article,h1,h2,h3,h4,h5,figure,img,video,iframe,dl,dt,dd,blockquote,pre,header,footer,nav,main,aside,details,summary'

function clean(t: string | null | undefined) {
  return (t ?? '').replace(/\s+/g, ' ').trim()
}

function fileName(src: string | null) {
  return clean(src).split(/[?#]/)[0].split('/').pop() || '주소 없음'
}

/** 제안서 HTML 을 h2·h3 기준 조각으로 나눈다. 같은 제목이 여러 번 나오면 #2, #3 을 붙여 구분한다 */
export function splitProposal(html: string): Segment[] {
  if (!html.trim() || typeof DOMParser === 'undefined') return []
  const d = new DOMParser().parseFromString(html, 'text/html')
  const out: Segment[] = []
  const seen = new Map<string, number>()
  let h2 = '머리말'
  let cur: Segment | null = null

  const start = (title: string) => {
    const base = `p:${h2}›${title}`
    const n = (seen.get(base) ?? 0) + 1
    seen.set(base, n)
    cur = { key: n > 1 ? `${base}#${n}` : base, doc: '제안서', group: h2, title, lines: [] }
    out.push(cur)
  }
  const push = (text: string, cells?: string[]) => {
    if (!text) return
    if (!cur) start('머리말')
    cur!.lines.push(cells ? { text, cells } : { text })
  }

  const walk = (n: Node) => {
    if (n.nodeType === 3) return push(clean(n.textContent))
    if (n.nodeType !== 1) return
    const el = n as Element
    const tag = el.tagName.toUpperCase()
    if (SKIP.has(tag) || el.hasAttribute('hidden') || el.getAttribute('aria-hidden') === 'true') return
    if (tag === 'H1' || tag === 'H2') {
      h2 = clean(el.textContent) || '제목 없음'
      return start('개요')
    }
    if (tag === 'H3' || tag === 'H4') return start(clean(el.textContent) || '소제목 없음')
    if (tag === 'IMG') return push(`[이미지] ${clean(el.getAttribute('alt')) || fileName(el.getAttribute('src'))}`)
    if (tag === 'VIDEO') return push(`[영상] ${fileName(el.getAttribute('src') ?? el.querySelector('source')?.getAttribute('src') ?? null)}`)
    if (tag === 'IFRAME') return push(`[영상] ${fileName(el.getAttribute('src'))}`)
    if (tag === 'TR') {
      const cells = [...el.children].map((c) => clean(c.textContent))
      return push(cells.join(' | '), cells)
    }
    if (!el.querySelector(BLOCK)) return push(clean(el.textContent))
    el.childNodes.forEach(walk)
  }
  walk(d.body)
  return out.filter((s) => s.lines.length > 0)
}

// ---------- 줄 비교 ----------

export type DiffRow = { a?: Line; b?: Line; kind: 'same' | 'changed' | 'removed' | 'added' }

/**
 * 두 줄 목록을 나란히 놓을 행으로 맞춘다(최장 공통 부분열).
 * 지워진 줄과 더해진 줄이 이어서 나오면 같은 행에 놓아 '바뀜'으로 보여 준다.
 */
export function diffLines(a: Line[], b: Line[]): DiffRow[] {
  const n = a.length
  const m = b.length
  const L = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0))
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--) L[i][j] = a[i].text === b[j].text ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1])

  const rows: DiffRow[] = []
  let del: Line[] = []
  let add: Line[] = []
  const flush = () => {
    const k = Math.max(del.length, add.length)
    for (let x = 0; x < k; x++) {
      const da = del[x]
      const db = add[x]
      rows.push({ a: da, b: db, kind: da && db ? 'changed' : da ? 'removed' : 'added' })
    }
    del = []
    add = []
  }
  let i = 0
  let j = 0
  while (i < n || j < m) {
    if (i < n && j < m && a[i].text === b[j].text) {
      flush()
      rows.push({ a: a[i], b: b[j], kind: 'same' })
      i++
      j++
    } else if (j < m && (i >= n || L[i][j + 1] >= L[i + 1][j])) add.push(b[j++])
    else del.push(a[i++])
  }
  flush()
  return rows
}
