/**
 * 업체별 견적서: 데이터 모양, 금액 계산, 인쇄용 HTML.
 *
 * 관리자 화면(미리보기)과 인쇄 주소(/api/admin/clients/[id]/print)가 같은 renderQuote 를 쓴다.
 * 양식은 /mnt/project-files/brand/견적서_프롬프트.md (A4 세로, Pretendard, Navy·Orange) 를 따른다.
 * 브라우저·서버 양쪽에서 쓰므로 Node 전용 API 를 쓰지 않는다.
 */

import { logoSvg } from '@/lib/brand-logo'
import type { Takeoff } from '@/lib/clients/takeoff'

/** 구분. 재료비·노무비 외에는 모두 원가계산에서 경비로 묶인다 */
export const ITEM_KINDS = ['재료비', '노무비', '장비', '안전시설', '운반비', '경비'] as const
export type ItemKind = (typeof ITEM_KINDS)[number]

export type QuoteItem = {
  id: string
  kind: ItemKind
  name: string
  spec: string
  unit: string
  qty: number
  price: number
  note: string
  /** 감액 대상: 견적금액에 포함하되, 필요 없어지면 뺄 수 있는 줄. 견적서 끝에 감액 표로 따로 보여 준다 */
  deduct?: boolean
}

export type QuoteSection = {
  id: string
  name: string
  desc: string
  items: QuoteItem[]
  /** 원가계산 제외: 이 공종은 보험료·안전관리비·일반관리비·이윤 없이 재료·노무·경비만 더한다 */
  flat?: boolean
  /** 선택 항목: 견적금액(공급가액)에 넣지 않고 견적서 아래 '선택 항목'으로 따로 보여 준다 */
  option?: boolean
  /** 일반관리비만: 보험료·안전관리비·이윤 없이 재료·노무·경비에 일반관리비만 붙인다 (flat 이 우선) */
  overheadOnly?: boolean
  /** 일반관리비·이윤만: 보험료·안전관리비 없이 일반관리비와 이윤을 붙인다 (flat·overheadOnly 가 우선) */
  noInsurance?: boolean
}

/** 공종의 원가계산 방식. 화면의 선택 칸과 flat·overheadOnly 를 잇는다 */
export type SectionCalcMode = 'full' | 'margin' | 'overhead' | 'none'

type ModeFields = Pick<QuoteSection, 'flat' | 'overheadOnly' | 'noInsurance'>

export function sectionMode(s: ModeFields): SectionCalcMode {
  return s.flat ? 'none' : s.overheadOnly ? 'overhead' : s.noInsurance ? 'margin' : 'full'
}

export function modeFields(m: SectionCalcMode): ModeFields {
  return { flat: m === 'none', overheadOnly: m === 'overhead', noInsurance: m === 'margin' }
}

export type QuoteRates = {
  /** 산재보험료, 노무비 기준 % */
  injury: number
  /** 고용보험료, 노무비 기준 % */
  employment: number
  /** 산업안전보건관리비, (재료비 + 노무비) 기준 % */
  safety: number
  /** 일반관리비, 순공사원가 기준 % */
  overhead: number
  /** 이윤, (노무비 + 경비 + 일반관리비) 기준 % */
  profit: number
}

export type Quote = {
  number: string
  /** YYYY-MM-DD */
  date: string
  title: string
  sections: QuoteSection[]
  /** 공종마다 보험료·안전관리비·일반관리비·이윤을 붙인다 */
  costCalc: boolean
  rates: QuoteRates
  /** 공종 합계의 천원 미만 절사 */
  truncate: boolean
  /** 공정 합계에서 빼는 할인 금액 (부가세 별도). 0 이면 표시하지 않는다 */
  discount: number
  /** 할인 줄 이름 */
  discountLabel: string
  /** 특기사항. 한 줄에 한 항목 */
  notes: string
  validDays: number
  /** 견적서 수신란. biz = 업체명·사업자번호·현장, contact = 업체명·담당자·연락처·현장(예전 양식) */
  recipientFields?: 'biz' | 'contact'
  /** 수신란 대표 이름. biz 양식에서 값이 있을 때만 사업자번호 아래에 찍는다 */
  recipientCeo?: string
  /** 선택 항목 표의 이름. 없으면 '선택 항목' (예: '상황에 따라 추가되는 비용') */
  optionLabel?: string
  /** 감액 표의 이름. 없으면 '필요 없을 경우 감액' */
  deductLabel?: string
  /** 적산 입력값 (lib/clients/takeoff.ts). 인쇄에는 쓰지 않고 견적 줄을 만들 때만 쓴다 */
  takeoff?: Takeoff
}

export type QuoteRecipient = {
  name: string
  contactPerson?: string | null
  phone?: string | null
  siteAddress?: string | null
  bizNumber?: string | null
}

export const DEFAULT_DISCOUNT_LABEL = '가격 조정 (NEGO)'

export const DEFAULT_RATES: QuoteRates = { injury: 3.56, employment: 1.15, safety: 3.11, overhead: 5, profit: 15 }

export const SUPPLIER = {
  name: '엔엠솔루션 (NM SOLUTION)',
  ceo: '김성배',
  bizNumber: '736-88-01988',
  address: '경기도 평택시 고덕동 도시지원로 121 지식공장아이타워 906호',
  phoneMain: '1800-5901',
  phoneMobile: '010-2369-3691',
  web: 'nm-solution.co.kr',
}

export function newId(prefix = 'x') {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
}

export function emptyItem(kind: ItemKind = '재료비'): QuoteItem {
  return { id: newId('i'), kind, name: '', spec: '', unit: '식', qty: 1, price: 0, note: '' }
}

export function today(): string {
  const d = new Date(Date.now() + 9 * 3600 * 1000) // KST
  return d.toISOString().slice(0, 10)
}

export function emptyQuote(): Quote {
  const date = today()
  return {
    number: `NM-${date.slice(2, 4)}${date.slice(5, 7)}-01`,
    date,
    title: '',
    sections: [{ id: newId('s'), name: '공사', desc: '', items: [emptyItem()] }],
    costCalc: false,
    rates: { ...DEFAULT_RATES },
    truncate: true,
    discount: 0,
    discountLabel: DEFAULT_DISCOUNT_LABEL,
    notes: '공사 기간: 협의\n결제 조건: 협의',
    validDays: 30,
    recipientFields: 'biz',
  }
}

/** DB 에서 읽은 값이 비어 있거나 옛 모양이어도 화면이 깨지지 않게 채운다 */
export function normalizeQuote(raw: unknown): Quote {
  const base = emptyQuote()
  if (!raw || typeof raw !== 'object') return base
  const q = raw as Partial<Quote>
  return {
    ...base,
    ...q,
    rates: { ...DEFAULT_RATES, ...(q.rates ?? {}) },
    discount: Math.max(0, Math.round(Number(q.discount) || 0)),
    discountLabel: q.discountLabel?.trim() || DEFAULT_DISCOUNT_LABEL,
    // 이 칸이 없던 견적서(금강변압기 등)는 예전 양식 그대로 인쇄한다
    recipientFields: q.recipientFields === 'biz' ? 'biz' : 'contact',
    sections: Array.isArray(q.sections)
      ? q.sections.map((s) => ({
          id: s.id || newId('s'),
          name: s.name ?? '',
          desc: s.desc ?? '',
          flat: Boolean(s.flat),
          overheadOnly: Boolean(s.overheadOnly),
          noInsurance: Boolean(s.noInsurance),
          option: Boolean(s.option),
          items: Array.isArray(s.items)
            ? s.items.map((i) => ({
                ...emptyItem(),
                ...i,
                id: i.id || newId('i'),
                qty: Number(i.qty) || 0,
                price: Number(i.price) || 0,
                deduct: Boolean(i.deduct),
              }))
            : [],
        }))
      : base.sections,
  }
}

// ---------- 계산 ----------

export function itemAmount(i: QuoteItem) {
  return Math.round((Number(i.qty) || 0) * (Number(i.price) || 0))
}

function costGroup(kind: ItemKind): 'mat' | 'lab' | 'exp' {
  return kind === '재료비' ? 'mat' : kind === '노무비' ? 'lab' : 'exp'
}

export type SectionCalc = {
  mat: number
  lab: number
  exp: number
  injury: number
  employment: number
  safety: number
  net: number
  overhead: number
  profit: number
  adjust: number
  total: number
}

export function calcSection(s: QuoteSection, q: Pick<Quote, 'costCalc' | 'rates' | 'truncate'>): SectionCalc {
  const sum = { mat: 0, lab: 0, exp: 0 }
  for (const i of s.items) sum[costGroup(i.kind)] += itemAmount(i)
  const { mat, lab, exp } = sum
  const r = q.rates
  const mode = q.costCalc ? sectionMode(s) : 'none'
  const on = mode === 'full'
  const ohOn = mode !== 'none'
  const profitOn = mode === 'full' || mode === 'margin'
  const injury = on ? Math.round((lab * r.injury) / 100) : 0
  const employment = on ? Math.round((lab * r.employment) / 100) : 0
  const safety = on ? Math.round(((mat + lab) * r.safety) / 100) : 0
  const net = mat + lab + exp + injury + employment + safety
  const overhead = ohOn ? Math.round((net * r.overhead) / 100) : 0
  const profit = profitOn ? Math.round(((lab + exp + injury + employment + safety + overhead) * r.profit) / 100) : 0
  const raw = net + overhead + profit
  const total = q.truncate ? Math.floor(raw / 1000) * 1000 : raw
  return { mat, lab, exp, injury, employment, safety, net, overhead, profit, adjust: total - raw, total }
}

export function calcQuote(q: Quote) {
  const sections = q.sections.map((s) => calcSection(s, q))
  /** 공정 합계 (할인 전, 부가세 별도, 선택 항목 제외) */
  const works = sections.reduce((a, s, i) => (q.sections[i].option ? a : a + s.total), 0)
  const options = sections.reduce((a, s, i) => (q.sections[i].option ? a + s.total : a), 0)
  const discount = Math.min(Math.max(0, Math.round(Number(q.discount) || 0)), works)
  const supply = works - discount
  const vat = Math.round(supply / 10)
  // 감액: 감액 대상 줄을 뺀 견적과의 차이 (보험료·관리비·이윤·단수정리까지 함께 빠진다). 할인은 그대로 둔다
  const has = q.sections.some((s) => !s.option && s.items.some((i) => i.deduct))
  const lessWorks = has
    ? q.sections.reduce(
        (a, s) => (s.option ? a : a + calcSection({ ...s, items: s.items.filter((i) => !i.deduct) }, q).total),
        0,
      )
    : works
  const lessSupply = Math.max(0, lessWorks - discount)
  const deduct = supply - lessSupply
  const deductItems = q.sections.reduce(
    (a, s) => (s.option ? a : a + s.items.filter((i) => i.deduct).reduce((b, i) => b + itemAmount(i), 0)),
    0,
  )
  const lessVat = Math.round(lessSupply / 10)
  return {
    sections,
    works,
    discount,
    supply,
    vat,
    grand: supply + vat,
    options,
    deduct,
    deductItems,
    lessSupply,
    lessVat,
    lessGrand: lessSupply + lessVat,
  }
}

/** 부가세 포함 합계를 target 으로 맞추는 할인 금액. 맞출 수 없으면(공정 합계보다 크면) null */
export function discountForGrand(q: Quote, target: number): number | null {
  const { works } = calcQuote({ ...q, discount: 0 })
  const base = Math.floor(target / 1.1)
  for (const s of [base, base + 1, base - 1]) {
    if (s >= 0 && s <= works && s + Math.round(s / 10) === target) return works - s
  }
  const s = Math.round(target / 1.1)
  return s <= works ? works - s : null
}

// ---------- 표기 ----------

export function won(n: number) {
  return Math.round(n).toLocaleString('ko-KR')
}

const DIGITS = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구']
const SMALL = ['', '십', '백', '천']
const LARGE = ['', '만', '억', '조']

/** 78861200 → 칠천팔백팔십육만일천이백 */
export function koreanAmount(n: number): string {
  n = Math.floor(Math.abs(n))
  if (n === 0) return '영'
  let out = ''
  let li = 0
  while (n > 0) {
    const chunk = n % 10000
    if (chunk) {
      let part = ''
      const ds = String(chunk).padStart(4, '0').split('').map(Number)
      ds.forEach((d, idx) => {
        if (!d) return
        part += DIGITS[d] + SMALL[3 - idx]
      })
      out = part + LARGE[li] + out
    }
    n = Math.floor(n / 10000)
    li++
  }
  return out
}

function esc(s: unknown) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}

function fmtDate(d: string) {
  const [y, m, day] = d.split('-')
  return y && m && day ? `${y}년 ${Number(m)}월 ${Number(day)}일` : d
}

function fmtQty(n: number) {
  return Number.isInteger(n) ? won(n) : n.toLocaleString('ko-KR', { maximumFractionDigits: 3 })
}

export const PRETENDARD_CSS = 'https://cdn.jsdelivr.net/npm/pretendard@1.3.9/dist/web/static/pretendard.min.css'

/**
 * 견적서 본문 CSS. 제안서와 한 문서로 인쇄할 때 제안서 CSS(table, th, h2 등 전역 선택자)와
 * 섞이지 않도록 모든 규칙을 .nmq 아래에 둔다.
 */
export const QUOTE_CSS = `
.nmq{--navy:#0f2a44;--accent:#e8742a;--ink:#1d2430;--muted:#5d6878;--line:#dde3ea;--bg:#f4f6f9;
  font-family:Pretendard,-apple-system,"Apple SD Gothic Neo","Malgun Gothic",sans-serif;color:var(--ink);
  font-size:10pt;line-height:1.5;letter-spacing:-.01em;word-break:keep-all;background:#fff;text-align:left}
.nmq *{box-sizing:border-box;font-family:inherit}
.nmq .q-page{width:100%;max-width:178mm;margin:0 auto}
.nmq .q-head{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2pt solid var(--navy);padding-bottom:10px;margin-bottom:16px}
.nmq .q-logo{height:9mm;margin-bottom:6px}.nmq .q-logo svg{height:100%;width:auto;display:block}
.nmq .q-title{font-size:22pt;font-weight:700;letter-spacing:.5em;color:var(--navy);line-height:1.3;margin:4px 0 0}
.nmq .q-meta{text-align:right;font-size:9.5pt;color:var(--muted);line-height:1.7}
.nmq .q-meta b{color:var(--ink);font-weight:600;font-variant-numeric:tabular-nums}
.nmq .q-parties{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px}
.nmq .q-party h3{font-size:12pt;font-weight:600;color:var(--navy);margin:0 0 6px;letter-spacing:-.02em}
.nmq table{border-collapse:collapse;width:100%;font-size:10pt;margin:0;background:#fff}
.nmq th,.nmq td{border:0;border-bottom:1px solid var(--line);padding:5px 7px;text-align:left;vertical-align:top;font-weight:400;color:var(--ink);background:none;white-space:normal;min-width:0}
.nmq table.kv th{width:5.5em;color:var(--muted);font-weight:500;white-space:nowrap}
.nmq table.kv{border-top:1px solid var(--navy)}
.nmq .q-total{display:flex;justify-content:space-between;align-items:center;gap:12px;border:1px solid var(--navy);background:var(--bg);padding:10px 14px;margin:4px 0 18px}
.nmq .q-total .l{font-size:10pt;font-weight:600;color:var(--navy);white-space:nowrap}
.nmq .q-total .v{font-size:13pt;font-weight:700;color:var(--navy);text-align:right}
.nmq .q-total .v small{font-size:9.5pt;font-weight:500;color:var(--muted);margin-left:6px}
.nmq h2.q-sub{font-size:12pt;font-weight:600;color:var(--navy);margin:18px 0 6px;letter-spacing:-.02em;padding:0;border:0}
.nmq table.grid{border-top:2pt solid var(--navy)}
.nmq table.grid thead th{background:var(--bg);font-weight:600;font-size:9.5pt;white-space:nowrap;color:var(--ink)}
.nmq .n{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
.nmq .c{text-align:center;white-space:nowrap}
.nmq td.q-spec,.nmq td.q-note{color:var(--muted);font-size:9pt}
.nmq tr.q-sec td{background:var(--bg);font-weight:600;color:var(--navy)}
.nmq tr.q-sec td small{font-weight:400;color:var(--muted);margin-left:8px}
.nmq tr.q-sub td{font-size:9pt;color:var(--muted);padding-top:3px;padding-bottom:3px}
.nmq tr.q-subtotal td{font-weight:600;border-bottom:1px solid #b9c3cf}
.nmq tr.q-sum td{font-weight:600}
.nmq tr.q-grand td{font-weight:700;font-size:11pt;color:var(--navy);border-top:2pt solid var(--navy);border-bottom:2pt solid var(--navy)}
.nmq tr.q-disc td{font-weight:600;color:var(--accent)}
.nmq table.q-summary td.n,.nmq table.q-summary td:nth-child(2){white-space:nowrap}
.nmq .q-total .v small{display:block;margin:2px 0 0}
.nmq p.q-hint{font-size:8.5pt;color:var(--muted);margin:4px 0 0}
.nmq ol.q-notes{margin:0;padding-left:1.4em}
.nmq ol.q-notes li{margin:2px 0}
.nmq .q-sign{margin-top:22px;text-align:center}
.nmq .q-sign p{margin:0 0 4px}
.nmq .q-sign .who{font-size:12pt;font-weight:600;margin-top:8px}
.nmq .q-dm{color:var(--accent);font-weight:700}
.nmq .q-dnote{margin:6px 0 0;font-size:8.5pt;color:var(--muted)}
.nmq .q-chg,.nmq .q-chg td,.nmq .q-chg .l,.nmq .q-chg .v,.nmq .q-chg b,.nmq .q-chg small,.nmq tr.q-new td,.nmq tr.q-new td small,.nmq li.q-chg{color:#d0021b!important}
.nmq tr.q-del td,.nmq li.q-del{color:#d0021b!important;text-decoration:line-through}
.nmq p.q-mark{border:1px solid #d0021b;color:#d0021b;font-size:9pt;font-weight:600;padding:6px 10px;margin:0 0 12px}
.nmq .q-foot{margin-top:22px;padding-top:8px;border-top:1px solid var(--line);font-size:8pt;color:var(--muted);text-align:center;line-height:1.4}
@media print{.nmq tr,.nmq .q-total,.nmq .q-sign{break-inside:avoid}.nmq thead{display:table-header-group}}
`

/** 변경 표시: 이전 견적(base) 대비 바뀐 곳을 빨간색으로. 어드민 내부용(고객 화면에는 넘기지 않는다) */
export type QuoteMark = { base: Quote; label: string }

const MARK_FIELDS = ['spec', 'qty', 'unit', 'price', 'note'] as const

function quoteMarks(q: Quote, base: Quote) {
  const bc = calcQuote(base)
  const bSec = new Map(base.sections.map((s, i) => [s.name, { s, c: bc.sections[i] }]))
  // 이전 줄과 짝짓기. 단계마다 전체 줄을 한 번씩 돈다: 같은 공종의 똑같은 줄 → 어디든 똑같은 줄 → 같은 공종 같은 이름 → 같은 이름·규격.
  // 짝이 없으면 새 줄
  const pool = base.sections.flatMap((s) => s.items.map((i) => ({ sec: s.name, i, used: false })))
  const same = (a: QuoteItem, b: QuoteItem) => MARK_FIELDS.every((f) => a[f] === b[f])
  type P = (typeof pool)[number]
  const steps: ((p: P, sec: string, i: QuoteItem) => boolean)[] = [
    (p, sec, i) => p.sec === sec && same(p.i, i),
    (p, _, i) => same(p.i, i),
    (p, sec) => p.sec === sec,
    (p, _, i) => p.i.spec === i.spec,
  ]
  const hits = new Map<QuoteItem, P>()
  for (const step of steps)
    for (const s of q.sections)
      for (const i of s.items) {
        if (hits.has(i)) continue
        const hit = pool.find((p) => !p.used && p.i.name === i.name && step(p, s.name, i))
        if (hit) {
          hit.used = true
          hits.set(i, hit)
        }
      }
  const items = new Map<QuoteItem, Set<string> | 'new'>()
  for (const s of q.sections)
    for (const i of s.items) {
      const hit = hits.get(i)
      if (!hit) {
        items.set(i, 'new')
        continue
      }
      const ch = new Set<string>(MARK_FIELDS.filter((f) => hit.i[f] !== i[f]))
      if (itemAmount(hit.i) !== itemAmount(i)) ch.add('amount')
      if (ch.size) items.set(i, ch)
    }
  const noteLines = (t: string) =>
    t
      .split('\n')
      .map((l) => l.replace(/^\s*[-·•]\s*/, '').trim())
      .filter(Boolean)
  const baseNotes = noteLines(base.notes)
  const newNotes = new Set(noteLines(q.notes))
  const mainSum = (get: (c: SectionCalc) => number) => base.sections.reduce((a, s, i) => (s.option ? a : a + get(bc.sections[i])), 0)
  return {
    item: (i: QuoteItem) => items.get(i),
    sec: (s: QuoteSection) => {
      const b = bSec.get(s.name)
      return !b || b.s.desc !== s.desc
    },
    /** 공종 금액(이름이 같은 이전 공종과 비교) */
    val: (name: string, get: (c: SectionCalc) => number, v: number) => {
      const b = bSec.get(name)
      return !b || get(b.c) !== v
    },
    sum: (get: (c: SectionCalc) => number, v: number) => mainSum(get) !== v,
    top: (k: 'works' | 'discount' | 'supply' | 'vat' | 'grand', v: number) => bc[k] !== v,
    head: (k: 'date' | 'title' | 'number', v: string) => base[k] !== v,
    note: (t: string) => !baseNotes.includes(t),
    removed: pool.filter((p) => !p.used),
    removedDiscount: bc.discount && !calcQuote(q).discount ? bc.discount : 0,
    removedNotes: baseNotes.filter((t) => !newNotes.has(t)),
    discountLabel: base.discountLabel,
  }
}

/** class 속성. on 이면 변경 표시(q-chg)를 붙인다 */
function cls(c: string, on: boolean | undefined) {
  const v = [c, on && 'q-chg'].filter(Boolean).join(' ')
  return v ? ` class="${v}"` : ''
}

/** 견적서 본문 HTML (QUOTE_CSS 와 함께 쓴다). mark 가 있으면 이전 견적 대비 바뀐 곳을 빨간색으로 표시 */
export function renderQuote(q: Quote, to: QuoteRecipient, mark?: QuoteMark): string {
  const calc = calcQuote(q)
  const mk = mark ? quoteMarks(q, mark.base) : null
  // 할인이 있는 견적서(금강변압기)는 공정별 금액·최종 금액을 총괄표로 떼어 보인다. 할인이 없으면(신일 등) 예전 한 표 양식 그대로
  const withSummary = calc.discount > 0
  const mainIdx = q.sections.map((s, i) => (s.option ? -1 : i)).filter((i) => i >= 0)
  const optIdx = q.sections.map((s, i) => (s.option ? i : -1)).filter((i) => i >= 0)
  const multi = mainIdx.length > 1
  const rows: string[] = []
  const optRows: string[] = []
  let no = 0
  let optNo = 0
  q.sections.forEach((s, si) => {
    const c = calc.sections[si]
    const out = s.option ? optRows : rows
    if (s.option || multi || s.name) {
      out.push(`<tr class="q-sec${mk?.sec(s) ? ' q-chg' : ''}"><td colspan="8">${esc(s.name)}${s.desc ? `<small>${esc(s.desc)}</small>` : ''}</td></tr>`)
    }
    for (const i of s.items) {
      const n = s.option ? ++optNo : ++no
      const im = mk?.item(i)
      const R = (f: string) => im !== undefined && im !== 'new' && im.has(f)
      out.push(
        `<tr${im === 'new' ? ' class="q-new"' : ''}><td class="c">${n}</td><td>${esc(i.name)}${i.deduct && !s.option ? ' <span class="q-dm">※</span>' : ''}</td><td${cls('q-spec', R('spec'))}>${esc(i.spec)}</td><td${cls('n', R('qty'))}>${fmtQty(i.qty)}</td><td${cls('c', R('unit'))}>${esc(i.unit)}</td><td${cls('n', R('price'))}>${won(i.price)}</td><td${cls('n', R('amount'))}>${won(itemAmount(i))}</td><td${cls('q-note', R('note'))}>${esc(i.note)}</td></tr>`,
      )
    }
    const sub = (label: string, k: keyof SectionCalc, note = '') =>
      `<tr class="q-sub"><td></td><td colspan="5">${label}</td><td${cls('n', mk?.val(s.name, (x) => x[k], c[k]))}>${won(c[k])}</td><td class="q-note">${note}</td></tr>`
    if (q.costCalc && !s.flat) {
      const r = q.rates
      out.push(sub('재료비 계', 'mat'), sub('노무비 계', 'lab'), sub('경비 계', 'exp'))
      const m = sectionMode(s)
      if (m === 'full') {
        out.push(sub('산재보험료', 'injury', `노무비 × ${r.injury}%`))
        out.push(sub('고용보험료', 'employment', `노무비 × ${r.employment}%`))
        if (r.safety) out.push(sub('산업안전보건관리비', 'safety', `(재료비 + 노무비) × ${r.safety}%`))
      }
      out.push(sub('일반관리비', 'overhead', `${m === 'full' ? '순공사원가' : '(재료비 + 노무비 + 경비)'} × ${r.overhead}%`))
      if (m !== 'overhead') out.push(sub('이윤', 'profit', `(노무비 + 경비 + 일반관리비) × ${r.profit}%`))
    }
    if (c.adjust) out.push(sub('단수정리', 'adjust', '천원 미만 절사'))
    if (s.option ? optIdx.length > 1 : multi || q.costCalc) {
      out.push(
        `<tr class="q-subtotal"><td></td><td colspan="5">${esc(s.name || '공종')} 소계</td><td${cls('n', mk?.val(s.name, (x) => x.total, c.total))}>${won(c.total)}</td><td></td></tr>`,
      )
    }
  })

  const notes = q.notes
    .split('\n')
    .map((l) => l.replace(/^\s*[-·•]\s*/, '').trim())
    .filter(Boolean)
  notes.push(`견적 유효기간: 견적일로부터 ${q.validDays}일`)

  // 원가계산 견적은 공종이 하나여도 비목별 요약표를 위에 둔다(2026-10-27 kevin)
  const costRows = (
    [
      ['재료비', 'mat'],
      ['노무비', 'lab'],
      ['경비', 'exp'],
      ['산재·고용보험료', null],
      ['산업안전보건관리비', 'safety'],
      ['일반관리비', 'overhead'],
      ['이윤', 'profit'],
      ['단수정리', 'adjust'],
    ] as const
  )
    .map(([label, key]) => {
      const get = (c: SectionCalc) => (key ? c[key] : c.injury + c.employment)
      return { label, get, vals: mainIdx.map((i) => get(calc.sections[i])) }
    })
    .filter((r) => r.label !== '산업안전보건관리비' || r.vals.some((v) => v))
  const costTable = !q.costCalc
    ? ''
    : multi
      ? `<h2 class="q-sub">공사원가 요약</h2>
<table class="grid"><thead><tr><th>비목</th>${mainIdx.map((i) => `<th${cls('n', mk?.sec(q.sections[i]))}>${esc(q.sections[i].name)}</th>`).join('')}<th class="n">합계</th></tr></thead><tbody>
${costRows.map(({ label, get, vals }) => `<tr><td>${label}</td>${vals.map((v, k) => `<td${cls('n', mk?.val(q.sections[mainIdx[k]].name, get, v))}>${won(v)}</td>`).join('')}<td${cls('n', mk?.sum(get, vals.reduce((a, b) => a + b, 0)))}>${won(vals.reduce((a, b) => a + b, 0))}</td></tr>`).join('')}
<tr class="q-sum"><td>${withSummary ? '공정 합계' : '공급가액'}</td>${mainIdx.map((i) => `<td${cls('n', mk?.val(q.sections[i].name, (x) => x.total, calc.sections[i].total))}>${won(calc.sections[i].total)}</td>`).join('')}<td${cls('n', mk?.top('works', calc.works))}>${won(calc.works)}</td></tr>
</tbody></table>`
      : `<h2 class="q-sub">공사원가 요약</h2>
<table class="grid"><thead><tr><th>비목</th><th class="n">금액</th></tr></thead><tbody>
${costRows.map(({ label, get, vals }) => `<tr><td>${label}</td><td${cls('n', mk?.sum(get, vals.reduce((a, b) => a + b, 0)))}>${won(vals.reduce((a, b) => a + b, 0))}</td></tr>`).join('')}
<tr class="q-sum"><td>${withSummary ? '공정 합계' : '공급가액'}</td><td${cls('n', mk?.top('works', calc.works))}>${won(calc.works)}</td></tr>
</tbody></table>`

  // 공정별 금액과 최종 금액은 내역과 떼어 총괄표 한 곳에 모은다
  const summary = `<h2 class="q-sub">견적 총괄표</h2>
<table class="grid q-summary"><thead><tr><th class="c">번호</th><th>공정</th><th>내용</th><th class="n">금액</th></tr></thead><tbody>
${mainIdx
  .map(
    (i, n) =>
      `<tr><td class="c">${n + 1}</td><td${cls('', mk?.val(q.sections[i].name, () => 0, 0))}><b>${esc(q.sections[i].name || '공종')}</b></td><td${cls('q-spec', mk?.sec(q.sections[i]))}>${esc(q.sections[i].desc)}</td><td${cls('n', mk?.val(q.sections[i].name, (x) => x.total, calc.sections[i].total))}>${won(calc.sections[i].total)}</td></tr>`,
  )
  .join('\n')}
${
  calc.discount
    ? `<tr class="q-sum"><td></td><td colspan="2">공정 합계</td><td${cls('n', mk?.top('works', calc.works))}>${won(calc.works)}</td></tr>
<tr class="q-disc"><td></td><td colspan="2">${esc(q.discountLabel)}</td><td${cls('n', mk?.top('discount', calc.discount))}>-${won(calc.discount)}</td></tr>`
    : ''
}
<tr class="q-sum"><td></td><td colspan="2">공급가액</td><td${cls('n', mk?.top('supply', calc.supply))}>${won(calc.supply)}</td></tr>
<tr class="q-sum"><td></td><td colspan="2">부가가치세 (10%)</td><td${cls('n', mk?.top('vat', calc.vat))}>${won(calc.vat)}</td></tr>
<tr class="q-grand"><td></td><td colspan="2">합계 (부가세 포함)</td><td${cls('n', mk?.top('grand', calc.grand))}>${won(calc.grand)}</td></tr>
</tbody></table>`

  return `<div class="nmq"><div class="q-page">
<div class="q-head">
  <div><div class="q-logo">${logoSvg()}</div><h1 class="q-title">견 적 서</h1></div>
  <div class="q-meta">견적일자 <b${cls('', mk?.head('date', q.date))}>${esc(fmtDate(q.date))}</b><br>견적번호 <b>${esc(q.number)}</b></div>
</div>
${mark ? `<p class="q-mark">변경 표시본 (내부용): 빨간색은 ${esc(mark.label)} 대비 바뀐 부분, 취소선은 빠진 부분임.</p>` : ''}
<div class="q-parties">
  <div class="q-party"><h3>수신</h3><table class="kv"><tbody>
    <tr><th>업체명</th><td><b>${esc(to.name)}</b> 귀중</td></tr>
    ${
      q.recipientFields === 'biz'
        ? `<tr><th>사업자번호</th><td>${esc(to.bizNumber)}</td></tr>${q.recipientCeo ? `<tr><th>대표</th><td>${esc(q.recipientCeo)}</td></tr>` : ''}`
        : `<tr><th>담당자</th><td>${esc(to.contactPerson)}</td></tr>
    <tr><th>연락처</th><td>${esc(to.phone)}</td></tr>`
    }
    <tr><th>현장</th><td>${esc(to.siteAddress)}</td></tr>
    ${q.title ? `<tr><th>공사명</th><td${cls('', mk?.head('title', q.title))}>${esc(q.title)}</td></tr>` : ''}
  </tbody></table></div>
  <div class="q-party"><h3>공급자</h3><table class="kv"><tbody>
    <tr><th>상호</th><td>${SUPPLIER.name}</td></tr>
    <tr><th>대표</th><td>${SUPPLIER.ceo}</td></tr>
    <tr><th>사업자번호</th><td>${SUPPLIER.bizNumber}</td></tr>
    <tr><th>주소</th><td>${SUPPLIER.address}</td></tr>
    <tr><th>연락처</th><td>${SUPPLIER.phoneMain} · ${SUPPLIER.phoneMobile}</td></tr>
  </tbody></table></div>
</div>
${
  withSummary
    ? `<div class="q-total${mk?.top('grand', calc.grand) ? ' q-chg' : ''}"><span class="l">견적금액</span><span class="v">일금 ${koreanAmount(calc.grand)}원정 (₩${won(calc.grand)})<small>VAT 포함 · 공급가액 ${won(calc.supply)} + 부가세 ${won(calc.vat)}</small></span></div>`
    : `<div class="q-total${mk?.top('supply', calc.supply) ? ' q-chg' : ''}"><span class="l">견적금액</span><span class="v">일금 ${koreanAmount(calc.supply)}원정 (₩${won(calc.supply)})<small>VAT 별도</small></span></div>`
}
${withSummary ? summary : ''}
${costTable}
<h2 class="q-sub">${withSummary ? '공정별 세부 내역' : '견적 내역'}</h2>
<table class="grid"><thead><tr><th class="c">번호</th><th>품명</th><th>규격</th><th class="n">수량</th><th class="c">단위</th><th class="n">단가</th><th class="n">금액</th><th>비고</th></tr></thead>
<tbody>
${rows.join('\n')}
${
  withSummary
    ? ''
    : `<tr class="q-sum"><td></td><td colspan="5">공급가액</td><td${cls('n', mk?.top('supply', calc.supply))}>${won(calc.supply)}</td><td></td></tr>
<tr class="q-sum"><td></td><td colspan="5">부가가치세 (10%)</td><td${cls('n', mk?.top('vat', calc.vat))}>${won(calc.vat)}</td><td></td></tr>
<tr class="q-grand"><td></td><td colspan="5">합계</td><td${cls('n', mk?.top('grand', calc.grand))}>${won(calc.grand)}</td><td></td></tr>`
}
</tbody></table>
${calc.deduct > 0 ? `<p class="q-dnote">※ 표시 항목은 필요 없을 경우 감액함 (아래 '${esc(q.deductLabel || '필요 없을 경우 감액')}' 참고)</p>` : ''}
${withSummary ? '<p class="q-hint">공정별 금액은 부가세 별도이며, 할인과 최종 금액은 위 견적 총괄표에 있습니다.</p>' : ''}
${
  optRows.length
    ? `<h2 class="q-sub">${esc(q.optionLabel || '선택 항목')} (견적금액 별도)</h2>
<table class="grid"><thead><tr><th class="c">번호</th><th>품명</th><th>규격</th><th class="n">수량</th><th class="c">단위</th><th class="n">단가</th><th class="n">금액</th><th>비고</th></tr></thead>
<tbody>
${optRows.join('\n')}
<tr class="q-grand"><td></td><td colspan="5">${esc(q.optionLabel || '선택 항목')} 합계 (VAT 별도)</td><td class="n">${won(calc.options)}</td><td></td></tr>
</tbody></table>`
    : ''
}
${
  calc.deduct > 0
    ? `<h2 class="q-sub">${esc(q.deductLabel || '필요 없을 경우 감액')}</h2>
<table class="grid"><thead><tr><th class="c">번호</th><th>품명</th><th>규격</th><th class="n">수량</th><th class="c">단위</th><th class="n">단가</th><th class="n">금액</th><th>비고</th></tr></thead>
<tbody>
${q.sections
  .filter((s) => !s.option)
  .flatMap((s) => s.items.filter((i) => i.deduct))
  .map(
    (i, k) =>
      `<tr><td class="c">${k + 1}</td><td>${esc(i.name)}</td><td class="q-spec">${esc(i.spec)}</td><td class="n">${fmtQty(i.qty)}</td><td class="c">${esc(i.unit)}</td><td class="n">${won(i.price)}</td><td class="n">-${won(itemAmount(i))}</td><td class="q-note">${esc(i.note)}</td></tr>`,
  )
  .join('\n')}
${
  q.costCalc && calc.deduct !== calc.deductItems
    ? `<tr class="q-sub"><td></td><td colspan="5">보험료·안전관리비·일반관리비·이윤 해당분</td><td class="n">-${won(calc.deduct - calc.deductItems)}</td><td></td></tr>`
    : ''
}
<tr class="q-subtotal"><td></td><td colspan="5">감액 합계 (VAT 별도)</td><td class="n">-${won(calc.deduct)}</td><td></td></tr>
<tr class="q-sum"><td></td><td colspan="5">감액 후 공급가액</td><td class="n">${won(calc.lessSupply)}</td><td></td></tr>
<tr class="q-sum"><td></td><td colspan="5">부가가치세 (10%)</td><td class="n">${won(calc.lessVat)}</td><td></td></tr>
<tr class="q-grand"><td></td><td colspan="5">감액 후 합계</td><td class="n">${won(calc.lessGrand)}</td><td></td></tr>
</tbody></table>`
    : ''
}
${
  mk && (mk.removed.length || mk.removedDiscount)
    ? `<h2 class="q-sub">이전 견적에서 빠진 항목</h2>
<table class="grid"><thead><tr><th>공종</th><th>품명</th><th>규격</th><th class="n">수량</th><th class="c">단위</th><th class="n">단가</th><th class="n">금액</th><th>비고</th></tr></thead>
<tbody>
${mk.removed
  .map(
    (p) =>
      `<tr class="q-del"><td>${esc(p.sec)}</td><td>${esc(p.i.name)}</td><td>${esc(p.i.spec)}</td><td class="n">${fmtQty(p.i.qty)}</td><td class="c">${esc(p.i.unit)}</td><td class="n">${won(p.i.price)}</td><td class="n">${won(itemAmount(p.i))}</td><td>${esc(p.i.note)}</td></tr>`,
  )
  .join('\n')}
${mk.removedDiscount ? `<tr class="q-del"><td></td><td colspan="5">${esc(mk.discountLabel)}</td><td class="n">-${won(mk.removedDiscount)}</td><td></td></tr>` : ''}
</tbody></table>`
    : ''
}
<h2 class="q-sub">특기사항</h2>
<ol class="q-notes">${notes.map((n, k) => `<li${cls('', k < notes.length - 1 && mk?.note(n))}>${esc(n)}</li>`).join('')}${(mk?.removedNotes ?? []).map((n) => `<li class="q-del">${esc(n)}</li>`).join('')}</ol>
<div class="q-sign"><p>위와 같이 견적합니다.</p><p>${esc(fmtDate(q.date))}</p><p class="who">엔엠솔루션 대표 김성배 (인)</p></div>
<div class="q-foot">엔엠솔루션 · ${SUPPLIER.address} · 대표전화 ${SUPPLIER.phoneMain} · 직통 ${SUPPLIER.phoneMobile} · ${SUPPLIER.web}</div>
</div></div>`
}

/** 견적서만 있는 완전한 HTML 문서 (미리보기 iframe 용) */
export function quoteDocument(q: Quote, to: QuoteRecipient): string {
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="${PRETENDARD_CSS}"><style>${QUOTE_CSS}
html,body{margin:0;background:#e9edf2}.sheet{background:#fff;max-width:210mm;margin:16px auto;padding:18mm 16mm;box-shadow:0 1px 3px rgba(15,42,68,.15)}
@media(max-width:640px){.sheet{margin:0;padding:16px}}</style></head>
<body><div class="sheet">${renderQuote(q, to)}</div></body></html>`
}
