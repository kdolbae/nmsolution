/**
 * 고객용 출력물(견적서·내역서·산출근거). 기획서 §9.
 * lib/clients/quote.ts 의 QUOTE_CSS·글꼴·공급자·한글 금액을 그대로 씀.
 *
 * 안전 장치: 렌더 함수는 CustomerDoc(고객에게 보여도 되는 칸만 있는 모양)만 받음.
 * 실단가·원가·이익·인센티브·내부 메모·등급·규칙 코드·삭제 줄·댓글·검사 결과는 toCustomerDoc 에서 버려 여기까지 오지 않음.
 */
import { PRETENDARD_CSS, QUOTE_CSS, SUPPLIER, koreanAmount, won } from '@/lib/clients/quote'
import { logoSvg } from '@/lib/brand-logo'
import { calcEstimate, lineAmount, type CalcMode, type Kind, type RateSet, type SectionCalc } from './calc'

export type CustomerLine = {
  no: number
  name: string
  spec: string
  unit: string
  qty: number
  unitPrice: number
  amount: number
  note: string
  basisText: string
  qtyBasis: string
}

export type CustomerSection = {
  name: string
  description: string
  isOption: boolean
  lines: CustomerLine[]
  sub: { label: string; amount: number; note: string }[]
  total: number
}

export type CustomerDoc = {
  title: string
  customerNumber: string
  date: string
  validUntil: string
  validDays: number
  recipient: { name: string; bizNumber: string; siteAddress: string }
  sections: CustomerSection[]
  supply: number
  vat: number
  total: number
  options: number
  notes: string[]
  /** 승인 전 판: 워터마크 "검토용(제출 불가)" */
  draft: boolean
}

/** toCustomerDoc 입력: DB 에서 읽은 판·줄(내부 칸이 섞여 있어도 됨) */
export type SourceLine = {
  kind: Kind
  name: string
  spec: string
  unit: string
  qty: number
  unitPrice: number
  removed: boolean
  confirmNeeded: boolean
  basisText: string
  qtyRuleSnapshot?: unknown
  grade: string
  isManager?: boolean
  isAutoExpense?: boolean
  [k: string]: unknown
}
export type SourceSection = { name: string; description: string; calcMode: CalcMode; isOption: boolean; lines: SourceLine[] }

function fmtQty(n: number) {
  return Number.isInteger(n) ? won(n) : n.toLocaleString('ko-KR', { maximumFractionDigits: 3 })
}

/** 수량 산식 문구. 규칙 입력은 "현장 확인 기준" 으로만 보임 */
function qtyBasis(l: SourceLine): string {
  const t = (l.qtyRuleSnapshot as { type?: string } | null)?.type
  const q = `${fmtQty(l.qty)} ${l.unit}`
  if (t === 'visits') return `방문 ${fmtQty(l.qty)}회 기준`
  if (t === 'auto_expense') return `투입 인·일 ${fmtQty(l.qty)} 기준`
  if (t === 'fixed' || !t) return q
  return `현장 확인 기준 ${q}`
}

function subRows(c: SectionCalc, mode: CalcMode, rateSet: RateSet): CustomerSection['sub'] {
  if (mode === 'none') return c.adjust ? [{ label: '단수정리', amount: c.adjust, note: '' }] : []
  const rows: CustomerSection['sub'] = [
    { label: '재료비 계', amount: c.mat, note: '' },
    { label: '노무비 계', amount: c.lab, note: '' },
    { label: '경비 계', amount: c.exp, note: '' },
  ]
  if (rateSet.mode === 'full') {
    const r = rateSet.rates as { injury: number; employment: number; safety: number; overhead: number; profit: number }
    if (mode === 'full') {
      rows.push({ label: '산재보험료', amount: c.injury, note: `노무비 × ${r.injury}%` })
      rows.push({ label: '고용보험료', amount: c.employment, note: `노무비 × ${r.employment}%` })
      rows.push({ label: '산업안전보건관리비', amount: c.safety, note: `(재료비 + 노무비) × ${r.safety}%` })
    }
    rows.push({ label: '일반관리비', amount: c.overhead, note: `${r.overhead}%` })
    if (mode !== 'overhead') rows.push({ label: '이윤', amount: c.profit, note: `${r.profit}%` })
  } else {
    const r = rateSet.rates as { misc: number; profit: number }
    rows.push({ label: '공과잡비', amount: c.misc, note: `${r.misc}%` })
    if (mode !== 'overhead') rows.push({ label: '이윤', amount: c.profit, note: `${r.profit}%` })
  }
  if (c.adjust) rows.push({ label: '단수정리', amount: c.adjust, note: '' })
  return rows
}

export function toCustomerDoc(input: {
  title: string
  customerNumber: string
  date: string
  validUntil: string
  validDays: number
  recipient: { name: string; bizNumber?: string | null; siteAddress?: string | null }
  sections: SourceSection[]
  rateSet: RateSet
  notesCustomer: string
  confirmText: string
  approved: boolean
}): CustomerDoc {
  const calc = calcEstimate(
    input.sections.map((s, i) => ({
      id: String(i),
      calcMode: s.calcMode,
      isOption: s.isOption,
      lines: s.lines.map((l, j) => ({ id: `${i}-${j}`, kind: l.kind, qty: l.qty, unitPrice: l.unitPrice, removed: l.removed, grade: l.grade })),
    })),
    input.rateSet,
  )
  let no = 0
  let optNo = 0
  const sections: CustomerSection[] = input.sections.map((s, i) => ({
    name: s.name,
    description: s.description,
    isOption: s.isOption,
    lines: s.lines
      .filter((l) => !l.removed)
      .map((l) => ({
        no: s.isOption ? ++optNo : ++no,
        name: l.name,
        spec: l.spec,
        unit: l.unit,
        qty: l.qty,
        unitPrice: l.unitPrice,
        amount: lineAmount(l),
        note: l.confirmNeeded ? input.confirmText : '',
        basisText: l.basisText,
        qtyBasis: qtyBasis(l),
      })),
    sub: subRows(calc.sections[i], s.calcMode, input.rateSet),
    total: calc.sections[i].total,
  }))
  const notes = input.notesCustomer
    .split('\n')
    .map((l) => l.replace(/^\s*[-·•]\s*/, '').trim())
    .filter(Boolean)
  return {
    title: input.title,
    customerNumber: input.customerNumber,
    date: input.date,
    validUntil: input.validUntil,
    validDays: input.validDays,
    recipient: { name: input.recipient.name, bizNumber: input.recipient.bizNumber ?? '', siteAddress: input.recipient.siteAddress ?? '' },
    sections,
    supply: calc.supply,
    vat: calc.vat,
    total: calc.total,
    options: calc.options,
    notes,
    draft: !input.approved,
  }
}

// ---------- HTML ----------

function esc(s: unknown) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}

function fmtDate(d: string) {
  const [y, m, day] = d.split('-')
  return y && m && day ? `${y}년 ${Number(m)}월 ${Number(day)}일` : d
}

export type DocKind = 'quote' | 'detail' | 'basis'
export const DOC_LABEL: Record<DocKind, string> = { quote: '견적서', detail: '내역서', basis: '산출근거' }

const EXTRA_CSS = `
.nmq .q-wm{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:5}
.nmq .q-wm span{transform:rotate(-24deg);font-size:44pt;font-weight:800;color:rgba(232,116,42,.18);letter-spacing:.1em;white-space:nowrap}
.nmq .q-draft{border:1px solid var(--accent);color:var(--accent);padding:6px 10px;font-size:9pt;font-weight:600;margin-bottom:10px}
.nmq .q-pb{break-before:page}
.nmq td.q-basis{font-size:9pt;color:var(--ink)}
`

function head(doc: CustomerDoc, title: string) {
  return `<div class="q-head">
  <div><div class="q-logo">${logoSvg()}</div><h1 class="q-title">${esc(title)}</h1></div>
  <div class="q-meta">견적일자 <b>${esc(fmtDate(doc.date))}</b><br>견적번호 <b>${esc(doc.customerNumber)}</b></div>
</div>`
}

function linesTable(sections: CustomerSection[], withSub: boolean) {
  const rows: string[] = []
  const multi = sections.length > 1
  for (const s of sections) {
    if (multi || s.name) rows.push(`<tr class="q-sec"><td colspan="8">${esc(s.name)}${s.description ? `<small>${esc(s.description)}</small>` : ''}</td></tr>`)
    for (const l of s.lines) {
      rows.push(
        `<tr><td class="c">${l.no}</td><td>${esc(l.name)}</td><td class="q-spec">${esc(l.spec)}</td><td class="n">${fmtQty(l.qty)}</td><td class="c">${esc(l.unit)}</td><td class="n">${won(l.unitPrice)}</td><td class="n">${won(l.amount)}</td><td class="q-note">${esc(l.note)}</td></tr>`,
      )
    }
    if (withSub) for (const r of s.sub) rows.push(`<tr class="q-sub"><td></td><td colspan="5">${esc(r.label)}</td><td class="n">${won(r.amount)}</td><td class="q-note">${esc(r.note)}</td></tr>`)
    rows.push(`<tr class="q-subtotal"><td></td><td colspan="5">${esc(s.name || '공정')} 소계</td><td class="n">${won(s.total)}</td><td></td></tr>`)
  }
  return `<table class="grid"><thead><tr><th class="c">번호</th><th>품명</th><th>규격</th><th class="n">수량</th><th class="c">단위</th><th class="n">단가</th><th class="n">금액</th><th>비고</th></tr></thead><tbody>${rows.join('\n')}`
}

export function renderQuoteCover(doc: CustomerDoc): string {
  const main = doc.sections.filter((s) => !s.isOption)
  const notes = [...doc.notes, `견적 유효기간: 견적일로부터 ${doc.validDays}일 (${fmtDate(doc.validUntil)}까지)`]
  return `${head(doc, '견 적 서')}
<div class="q-parties">
  <div class="q-party"><h3>수신</h3><table class="kv"><tbody>
    <tr><th>업체명</th><td><b>${esc(doc.recipient.name)}</b> 귀중</td></tr>
    ${doc.recipient.bizNumber ? `<tr><th>사업자번호</th><td>${esc(doc.recipient.bizNumber)}</td></tr>` : ''}
    <tr><th>현장</th><td>${esc(doc.recipient.siteAddress)}</td></tr>
    <tr><th>공사명</th><td>${esc(doc.title)}</td></tr>
    <tr><th>유효기간</th><td>${esc(fmtDate(doc.validUntil))}까지</td></tr>
  </tbody></table></div>
  <div class="q-party"><h3>공급자</h3><table class="kv"><tbody>
    <tr><th>상호</th><td>${esc(SUPPLIER.name)}</td></tr>
    <tr><th>대표</th><td>${esc(SUPPLIER.ceo)}</td></tr>
    <tr><th>사업자번호</th><td>${esc(SUPPLIER.bizNumber)}</td></tr>
    <tr><th>주소</th><td>${esc(SUPPLIER.address)}</td></tr>
    <tr><th>연락처</th><td>${esc(SUPPLIER.phoneMain)} · ${esc(SUPPLIER.phoneMobile)}</td></tr>
  </tbody></table></div>
</div>
<div class="q-total"><span class="l">견적금액</span><span class="v">일금 ${koreanAmount(doc.total)}원정 (₩${won(doc.total)})<small>VAT 포함 · 공급가액 ${won(doc.supply)} + 부가세 ${won(doc.vat)}</small></span></div>
<h2 class="q-sub">견적 총괄표</h2>
<table class="grid q-summary"><thead><tr><th class="c">번호</th><th>공정</th><th>내용</th><th class="n">금액</th></tr></thead><tbody>
${main.map((s, i) => `<tr><td class="c">${i + 1}</td><td><b>${esc(s.name)}</b></td><td class="q-spec">${esc(s.description)}</td><td class="n">${won(s.total)}</td></tr>`).join('\n')}
<tr class="q-sum"><td></td><td colspan="2">공급가액</td><td class="n">${won(doc.supply)}</td></tr>
<tr class="q-sum"><td></td><td colspan="2">부가가치세 (10%)</td><td class="n">${won(doc.vat)}</td></tr>
<tr class="q-grand"><td></td><td colspan="2">합계 (부가세 포함)</td><td class="n">${won(doc.total)}</td></tr>
</tbody></table>
${doc.options ? `<p class="q-hint">선택 항목 ${won(doc.options)}원(VAT 별도)은 견적금액에 포함하지 않음. 내역서 참고.</p>` : ''}
<h2 class="q-sub">특기사항</h2>
<ol class="q-notes">${notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ol>
<div class="q-sign"><p>위와 같이 견적함.</p><p>${esc(fmtDate(doc.date))}</p><p class="who">${esc(SUPPLIER.name)} 대표 ${esc(SUPPLIER.ceo)} (인)</p></div>`
}

export function renderDetail(doc: CustomerDoc): string {
  const main = doc.sections.filter((s) => !s.isOption)
  const opts = doc.sections.filter((s) => s.isOption)
  return `${head(doc, '내 역 서')}
<p class="q-hint">공사명: ${esc(doc.title)}</p>
${linesTable(main, true)}
<tr class="q-sum"><td></td><td colspan="5">공급가액</td><td class="n">${won(doc.supply)}</td><td></td></tr>
<tr class="q-sum"><td></td><td colspan="5">부가가치세 (10%)</td><td class="n">${won(doc.vat)}</td><td></td></tr>
<tr class="q-grand"><td></td><td colspan="5">합계</td><td class="n">${won(doc.total)}</td><td></td></tr>
</tbody></table>
${
  opts.length
    ? `<h2 class="q-sub">선택 항목 (견적금액 별도)</h2>${linesTable(opts, false)}
<tr class="q-grand"><td></td><td colspan="5">선택 항목 합계 (VAT 별도)</td><td class="n">${won(doc.options)}</td><td></td></tr></tbody></table>`
    : ''
}`
}

export function renderBasis(doc: CustomerDoc): string {
  const rows: string[] = []
  for (const s of doc.sections) {
    rows.push(`<tr class="q-sec"><td colspan="4">${esc(s.name)}${s.isOption ? ' <small>선택 항목</small>' : ''}</td></tr>`)
    for (const l of s.lines) {
      rows.push(
        `<tr><td class="c">${l.no}</td><td>${esc(l.name)}${l.spec ? `<br><span class="q-spec">${esc(l.spec)}</span>` : ''}</td><td class="n">${esc(l.qtyBasis)}</td><td class="q-basis">${esc(l.basisText)}${l.note && !l.basisText.includes(l.note) ? ` <b>(${esc(l.note)})</b>` : ''}</td></tr>`,
      )
    }
  }
  return `${head(doc, '산 출 근 거')}
<p class="q-hint">공사명: ${esc(doc.title)} · 수량은 현장 확인 결과를 기준으로 산정함</p>
<table class="grid"><thead><tr><th class="c">번호</th><th>품명</th><th class="n">수량 산식</th><th>산출근거</th></tr></thead><tbody>
${rows.join('\n')}
</tbody></table>`
}

/** 인쇄용 완전한 HTML. docs 순서대로 한 문서에 쪽을 나눠 담음 */
export function customerDocument(doc: CustomerDoc, docs: DocKind[]): string {
  const parts = docs.map((k, i) => {
    const body = k === 'quote' ? renderQuoteCover(doc) : k === 'detail' ? renderDetail(doc) : renderBasis(doc)
    return `<div class="q-page${i ? ' q-pb' : ''}">${doc.draft && i === 0 ? '<div class="q-draft">검토용(제출 불가) — 승인 전 판임</div>' : ''}${body}
<div class="q-foot">${esc(SUPPLIER.name)} · ${esc(SUPPLIER.address)} · 대표전화 ${esc(SUPPLIER.phoneMain)} · ${esc(SUPPLIER.web)}</div></div>`
  })
  const title = `${doc.customerNumber} ${docs.map((k) => DOC_LABEL[k]).join('·')}`
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title><meta name="robots" content="noindex">
<link rel="stylesheet" href="${PRETENDARD_CSS}"><style>${QUOTE_CSS}${EXTRA_CSS}
@page{size:A4 portrait;margin:14mm 12mm}
html,body{margin:0;background:#e9edf2}.sheet{background:#fff;max-width:210mm;margin:16px auto;padding:16mm 14mm}
@media print{html,body{background:#fff}.sheet{margin:0;padding:0;max-width:none}}
@media(max-width:640px){.sheet{margin:0;padding:16px}}</style></head>
<body><div class="sheet"><div class="nmq">${doc.draft ? '<div class="q-wm"><span>검토용(제출 불가)</span></div>' : ''}${parts.join('\n')}</div></div></body></html>`
}
