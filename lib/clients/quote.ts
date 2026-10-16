/**
 * 업체별 견적서: 데이터 모양, 금액 계산, 인쇄용 HTML.
 *
 * 관리자 화면(미리보기)과 인쇄 주소(/api/admin/clients/[id]/print)가 같은 renderQuote 를 쓴다.
 * 양식은 /mnt/project-files/brand/견적서_프롬프트.md (A4 세로, Pretendard, Navy·Orange) 를 따른다.
 * 브라우저·서버 양쪽에서 쓰므로 Node 전용 API 를 쓰지 않는다.
 */

import { logoSvg } from '@/lib/brand-logo'

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
}

export type QuoteSection = {
  id: string
  name: string
  desc: string
  items: QuoteItem[]
  /** 원가계산 제외: 이 공종은 보험료·안전관리비·일반관리비·이윤 없이 재료·노무·경비만 더한다 */
  flat?: boolean
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
  /** 특기사항. 한 줄에 한 항목 */
  notes: string
  validDays: number
  /** 견적서 수신란. biz = 업체명·사업자번호·현장, contact = 업체명·담당자·연락처·현장(예전 양식) */
  recipientFields?: 'biz' | 'contact'
}

export type QuoteRecipient = {
  name: string
  contactPerson?: string | null
  phone?: string | null
  siteAddress?: string | null
  bizNumber?: string | null
}

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
    // 이 칸이 없던 견적서(금강변압기 등)는 예전 양식 그대로 인쇄한다
    recipientFields: q.recipientFields === 'biz' ? 'biz' : 'contact',
    sections: Array.isArray(q.sections)
      ? q.sections.map((s) => ({
          id: s.id || newId('s'),
          name: s.name ?? '',
          desc: s.desc ?? '',
          flat: Boolean(s.flat),
          items: Array.isArray(s.items)
            ? s.items.map((i) => ({
                ...emptyItem(),
                ...i,
                id: i.id || newId('i'),
                qty: Number(i.qty) || 0,
                price: Number(i.price) || 0,
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
  const on = q.costCalc && !s.flat
  const injury = on ? Math.round((lab * r.injury) / 100) : 0
  const employment = on ? Math.round((lab * r.employment) / 100) : 0
  const safety = on ? Math.round(((mat + lab) * r.safety) / 100) : 0
  const net = mat + lab + exp + injury + employment + safety
  const overhead = on ? Math.round((net * r.overhead) / 100) : 0
  const profit = on ? Math.round(((lab + exp + injury + employment + safety + overhead) * r.profit) / 100) : 0
  const raw = net + overhead + profit
  const total = q.truncate ? Math.floor(raw / 1000) * 1000 : raw
  return { mat, lab, exp, injury, employment, safety, net, overhead, profit, adjust: total - raw, total }
}

export function calcQuote(q: Quote) {
  const sections = q.sections.map((s) => calcSection(s, q))
  const supply = sections.reduce((a, s) => a + s.total, 0)
  const vat = Math.round(supply / 10)
  return { sections, supply, vat, grand: supply + vat }
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
.nmq ol.q-notes{margin:0;padding-left:1.4em}
.nmq ol.q-notes li{margin:2px 0}
.nmq .q-sign{margin-top:22px;text-align:center}
.nmq .q-sign p{margin:0 0 4px}
.nmq .q-sign .who{font-size:12pt;font-weight:600;margin-top:8px}
.nmq .q-foot{margin-top:22px;padding-top:8px;border-top:1px solid var(--line);font-size:8pt;color:var(--muted);text-align:center;line-height:1.4}
@media print{.nmq tr,.nmq .q-total,.nmq .q-sign{break-inside:avoid}.nmq thead{display:table-header-group}}
`

/** 견적서 본문 HTML (QUOTE_CSS 와 함께 쓴다) */
export function renderQuote(q: Quote, to: QuoteRecipient): string {
  const calc = calcQuote(q)
  const multi = q.sections.length > 1
  const rows: string[] = []
  let no = 0
  q.sections.forEach((s, si) => {
    const c = calc.sections[si]
    if (multi || s.name) {
      rows.push(`<tr class="q-sec"><td colspan="8">${esc(s.name)}${s.desc ? `<small>${esc(s.desc)}</small>` : ''}</td></tr>`)
    }
    for (const i of s.items) {
      no++
      rows.push(
        `<tr><td class="c">${no}</td><td>${esc(i.name)}</td><td class="q-spec">${esc(i.spec)}</td><td class="n">${fmtQty(i.qty)}</td><td class="c">${esc(i.unit)}</td><td class="n">${won(i.price)}</td><td class="n">${won(itemAmount(i))}</td><td class="q-note">${esc(i.note)}</td></tr>`,
      )
    }
    const sub = (label: string, v: number, note = '') =>
      `<tr class="q-sub"><td></td><td colspan="5">${label}</td><td class="n">${won(v)}</td><td class="q-note">${note}</td></tr>`
    if (q.costCalc && !s.flat) {
      const r = q.rates
      rows.push(sub('재료비 계', c.mat), sub('노무비 계', c.lab), sub('경비 계', c.exp))
      rows.push(sub('산재보험료', c.injury, `노무비 × ${r.injury}%`))
      rows.push(sub('고용보험료', c.employment, `노무비 × ${r.employment}%`))
      rows.push(sub('산업안전보건관리비', c.safety, `(재료비 + 노무비) × ${r.safety}%`))
      rows.push(sub('일반관리비', c.overhead, `순공사원가 × ${r.overhead}%`))
      rows.push(sub('이윤', c.profit, `(노무비 + 경비 + 일반관리비) × ${r.profit}%`))
    }
    if (c.adjust) rows.push(sub('단수정리', c.adjust, '천원 미만 절사'))
    if (multi || q.costCalc) {
      rows.push(
        `<tr class="q-subtotal"><td></td><td colspan="5">${esc(s.name || '공종')} 소계</td><td class="n">${won(c.total)}</td><td></td></tr>`,
      )
    }
  })

  const notes = q.notes
    .split('\n')
    .map((l) => l.replace(/^\s*[-·•]\s*/, '').trim())
    .filter(Boolean)
  notes.push(`견적 유효기간: 견적일로부터 ${q.validDays}일`)

  const costTable =
    q.costCalc && multi
      ? `<h2 class="q-sub">공사원가 요약</h2>
<table class="grid"><thead><tr><th>비목</th>${q.sections.map((s) => `<th class="n">${esc(s.name)}</th>`).join('')}<th class="n">합계</th></tr></thead><tbody>
${(
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
    const vals = calc.sections.map((c) => (key ? c[key] : c.injury + c.employment))
    return `<tr><td>${label}</td>${vals.map((v) => `<td class="n">${won(v)}</td>`).join('')}<td class="n">${won(vals.reduce((a, b) => a + b, 0))}</td></tr>`
  })
  .join('')}
<tr class="q-sum"><td>공급가액</td>${calc.sections.map((c) => `<td class="n">${won(c.total)}</td>`).join('')}<td class="n">${won(calc.supply)}</td></tr>
</tbody></table>`
      : ''

  return `<div class="nmq"><div class="q-page">
<div class="q-head">
  <div><div class="q-logo">${logoSvg()}</div><h1 class="q-title">견 적 서</h1></div>
  <div class="q-meta">견적일자 <b>${esc(fmtDate(q.date))}</b><br>견적번호 <b>${esc(q.number)}</b></div>
</div>
<div class="q-parties">
  <div class="q-party"><h3>수신</h3><table class="kv"><tbody>
    <tr><th>업체명</th><td><b>${esc(to.name)}</b> 귀중</td></tr>
    ${
      q.recipientFields === 'biz'
        ? `<tr><th>사업자번호</th><td>${esc(to.bizNumber)}</td></tr>`
        : `<tr><th>담당자</th><td>${esc(to.contactPerson)}</td></tr>
    <tr><th>연락처</th><td>${esc(to.phone)}</td></tr>`
    }
    <tr><th>현장</th><td>${esc(to.siteAddress)}</td></tr>
    ${q.title ? `<tr><th>공사명</th><td>${esc(q.title)}</td></tr>` : ''}
  </tbody></table></div>
  <div class="q-party"><h3>공급자</h3><table class="kv"><tbody>
    <tr><th>상호</th><td>${SUPPLIER.name}</td></tr>
    <tr><th>대표</th><td>${SUPPLIER.ceo}</td></tr>
    <tr><th>사업자번호</th><td>${SUPPLIER.bizNumber}</td></tr>
    <tr><th>주소</th><td>${SUPPLIER.address}</td></tr>
    <tr><th>연락처</th><td>${SUPPLIER.phoneMain} · ${SUPPLIER.phoneMobile}</td></tr>
  </tbody></table></div>
</div>
<div class="q-total"><span class="l">견적금액</span><span class="v">일금 ${koreanAmount(calc.supply)}원정 (₩${won(calc.supply)})<small>VAT 별도</small></span></div>
${costTable}
<h2 class="q-sub">견적 내역</h2>
<table class="grid"><thead><tr><th class="c">번호</th><th>품명</th><th>규격</th><th class="n">수량</th><th class="c">단위</th><th class="n">단가</th><th class="n">금액</th><th>비고</th></tr></thead>
<tbody>
${rows.join('\n')}
<tr class="q-sum"><td></td><td colspan="5">공급가액</td><td class="n">${won(calc.supply)}</td><td></td></tr>
<tr class="q-sum"><td></td><td colspan="5">부가가치세 (10%)</td><td class="n">${won(calc.vat)}</td><td></td></tr>
<tr class="q-grand"><td></td><td colspan="5">합계</td><td class="n">${won(calc.grand)}</td><td></td></tr>
</tbody></table>
<h2 class="q-sub">특기사항</h2>
<ol class="q-notes">${notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ol>
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
