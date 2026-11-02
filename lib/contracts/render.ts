import { logoSvg } from '@/lib/brand-logo'
import { PRETENDARD_CSS, QUOTE_CSS, SUPPLIER, calcQuote, koreanAmount, renderQuote, won, type Quote } from '@/lib/clients/quote'
import { esc } from '@/lib/clients/proposal'
import type { ContractParty } from './table'


/**
 * 공사 도급 계약서 HTML (전 업체 공통).
 * 계약 조항 중 숫자(기간·지급 조건·하자 기간·지체상금률)는 어드민에서 넣은 값만 찍는다. 비어 있으면 '별도 협의'.
 * 일반 조항 문구는 kevin 검토 전 초안(2026-11-02).
 * 견적서는 계약서를 만든 버전(vN)의 것을 별첨 1 로 그대로 넣는다. 작업제안서(별첨 2)는 같은 버전을 따로 인쇄해 붙인다(고객 링크 화면에는 아래에 같이 보임).
 * 서명은 출력 후 기명날인(2026-11-02 kevin: 인증서 전자서명 업체 연동은 하지 않음).
 */

export type ContractTerms = {
  title: string
  site: string
  /** YYYY-MM-DD */
  startDate: string
  endDate: string
  /** 대금 지급 조건 (한 줄에 한 항목, 예: 계약금 30% 계약 시) */
  payment: string
  /** 하자담보책임기간 (예: 준공일로부터 1년) */
  warranty: string
  /** 지체상금률 (예: 1일 0.1%) */
  delayRate: string
  /** 특약사항 (한 줄에 한 항목) */
  special: string
  /** 계약일 YYYY-MM-DD. 비면 날짜 칸을 비워 손으로 쓴다 */
  contractDate: string
}

const lines = (s: string) =>
  s
    .split('\n')
    .map((x) => x.trim())
    .filter(Boolean)

const orAgreed = (s: string) => (s ? esc(s) : '당사자 간 별도 협의에 따름')

function partyRows(p: ContractParty): string {
  if (p.type === 'corp')
    return `<tr><th>상호</th><td>${esc(p.name)}</td></tr>
<tr><th>사업자등록번호</th><td>${esc(p.bizNumber)}</td></tr>
${p.corpNumber ? `<tr><th>법인등록번호</th><td>${esc(p.corpNumber)}</td></tr>` : ''}
<tr><th>대표자</th><td>${esc(p.ceo)}</td></tr>
<tr><th>주소</th><td>${esc(p.address)}</td></tr>
${p.phone ? `<tr><th>연락처</th><td>${esc(p.phone)}</td></tr>` : ''}`
  return `<tr><th>성명</th><td>${esc(p.name)}</td></tr>
<tr><th>주소</th><td>${esc(p.address)}</td></tr>
${p.phone ? `<tr><th>연락처</th><td>${esc(p.phone)}</td></tr>` : ''}`
}

export const CONTRACT_CSS = `
.nmc{font-family:Pretendard,'Noto Sans KR',sans-serif;color:#1b1f27;max-width:860px;margin:0 auto;padding:32px 20px 80px;line-height:1.7;font-size:15px}
.nmc .mark{height:28px}
.nmc h1{font-size:26px;font-weight:800;color:#0F2A44;text-align:center;margin:28px 0 4px;letter-spacing:-.02em}
.nmc .no{text-align:center;color:#6b7280;font-size:13px;margin:0 0 28px}
.nmc h2{font-size:17px;font-weight:800;color:#0F2A44;margin:32px 0 10px;padding-bottom:6px;border-bottom:2px solid #0F2A44}
.nmc h3{font-size:15px;font-weight:700;margin:18px 0 4px}
.nmc p{margin:0 0 6px}
.nmc table.kv{width:100%;border-collapse:collapse;font-size:14px}
.nmc table.kv th,.nmc table.kv td{border:1px solid #d8dde4;padding:8px 10px;text-align:left;vertical-align:top}
.nmc table.kv th{background:#f4f6f9;width:150px;font-weight:700;color:#0F2A44}
.nmc .parties{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.nmc .parties h3{margin-top:0}
.nmc ol.list{margin:0;padding-left:20px}
.nmc .sign{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:12px}
.nmc .sign>div{border:1px solid #d8dde4;border-radius:6px;padding:14px 16px;min-height:120px}
.nmc .sign b{display:block;color:#0F2A44;margin-bottom:6px}
.nmc .sign>div{position:relative}
.nmc .seal{position:absolute;right:20px;bottom:16px;font-size:15px;color:#6b7280}
.nmc .date{text-align:center;font-size:16px;margin:16px 0 8px}
.nmc h2.page{break-before:page}
.nmc .quote-sheet{margin-top:8px}
@media (max-width:720px){.nmc .parties,.nmc .sign{grid-template-columns:1fr}.nmc table.kv th{width:110px}}
@media print{.nmc{padding:0;font-size:12.5px;line-height:1.55;max-width:none}.nmc h1{margin:14px 0 2px;font-size:22px}.nmc .no{margin-bottom:14px}.nmc h2{font-size:14.5px;margin:16px 0 6px;break-after:avoid-page}.nmc h3{font-size:12.5px;margin:8px 0 1px}.nmc p{margin:0 0 3px}.nmc table.kv th,.nmc table.kv td{padding:5px 8px}.nmc .sign>div{min-height:90px}.nmc .sign,.nmc .date{break-inside:avoid}}
`

/** 기명날인 칸 (출력 후 도장) */
function stampBlock(party: ContractParty, date: string): string {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  const day = d ? `${d[1]}년 ${Number(d[2])}월 ${Number(d[3])}일` : '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;년 &nbsp;&nbsp;&nbsp;월 &nbsp;&nbsp;&nbsp;일'
  const who = party.type === 'corp' ? `${esc(party.name)}<br>대표 ${esc(party.ceo)}` : esc(party.name)
  return `<h2>기명날인</h2>
<p>갑과 을은 위 내용에 합의하고 아래와 같이 기명날인한다.</p>
<p class="date">${day}</p>
<div class="sign">
<div><b>도급인 (갑)</b>${who}<span class="seal">(인)</span></div>
<div><b>수급인 (을)</b>${esc(SUPPLIER.name)}<br>대표 ${esc(SUPPLIER.ceo)}<span class="seal">(인)</span></div>
</div>`
}

export function contractHtml(o: {
  number: string
  party: ContractParty
  terms: ContractTerms
  quote: Quote
  versionNo: number
  client: { name: string; siteAddress?: string | null; contactPerson?: string | null; phone?: string | null; bizNumber?: string | null }
}): string {
  const { party, terms, quote } = o
  const c = calcQuote(quote)
  const period = terms.startDate && terms.endDate ? `${esc(terms.startDate)} ~ ${esc(terms.endDate)}` : '당사자 간 별도 협의에 따름'
  const pay = lines(terms.payment)
  const special = lines(terms.special)
  const quoteSheet = renderQuote(quote, {
    name: party.name || o.client.name,
    bizNumber: party.type === 'corp' ? party.bizNumber : null,
    siteAddress: terms.site || o.client.siteAddress,
    contactPerson: o.client.contactPerson,
    phone: o.client.phone,
  })
  return `<article class="nmc">
<div class="mark">${logoSvg('horizontal', { height: '100%' })}</div>
<h1>공사 도급 계약서</h1>
<p class="no">계약번호 ${esc(o.number)} · 근거 견적 ${esc(quote.number)} (v${o.versionNo})</p>

<h2>계약 당사자</h2>
<div class="parties">
<div><h3>도급인 (이하 "갑")</h3><table class="kv">${partyRows(party)}</table></div>
<div><h3>수급인 (이하 "을")</h3><table class="kv">
<tr><th>상호</th><td>${esc(SUPPLIER.name)}</td></tr>
<tr><th>사업자등록번호</th><td>${esc(SUPPLIER.bizNumber)}</td></tr>
<tr><th>대표자</th><td>${esc(SUPPLIER.ceo)}</td></tr>
<tr><th>주소</th><td>${esc(SUPPLIER.address)}</td></tr>
<tr><th>연락처</th><td>${esc(SUPPLIER.phoneMain)}</td></tr>
</table></div>
</div>

<h2>계약 내용</h2>
<table class="kv">
<tr><th>공사명</th><td>${esc(terms.title)}</td></tr>
<tr><th>공사 장소</th><td>${esc(terms.site)}</td></tr>
<tr><th>공사 기간</th><td>${period}</td></tr>
<tr><th>계약 금액</th><td><b>일금 ${esc(koreanAmount(c.grand))}원정 (₩${won(c.grand)})</b><br>공급가액 ₩${won(c.supply)} + 부가가치세 ₩${won(c.vat)}</td></tr>
<tr><th>대금 지급</th><td>${pay.length ? `<ol class="list">${pay.map((x) => `<li>${esc(x)}</li>`).join('')}</ol>` : '당사자 간 별도 협의에 따름'}</td></tr>
<tr><th>하자담보책임기간</th><td>${orAgreed(terms.warranty)}</td></tr>
<tr><th>지체상금률</th><td>${orAgreed(terms.delayRate)}</td></tr>
</table>

<h2>계약 조항</h2>
<h3>제1조 (목적)</h3>
<p>갑은 위 공사를 을에게 도급하고, 을은 이 계약서와 별첨 견적서·작업제안서에 따라 공사를 완성하며, 갑은 그 대가를 지급한다.</p>
<h3>제2조 (계약 문서)</h3>
<p>이 계약서, 별첨 1 견적서(${esc(quote.number)}, v${o.versionNo}), 별첨 2 작업제안서(v${o.versionNo})는 이 계약의 일부를 이룬다. 내용이 서로 다르면 이 계약서, 견적서, 작업제안서 순으로 따른다.</p>
<h3>제3조 (공사 범위와 변경)</h3>
<p>공사 범위는 별첨 견적서에 적힌 항목으로 한다. 견적서에 없는 추가 공사나 설계 변경은 갑과 을이 서면으로 합의한 뒤 진행하며, 그 금액은 별도 견적으로 정한다.</p>
<h3>제4조 (대금 지급)</h3>
<p>갑은 위 대금 지급 조건에 따라 을에게 대금을 지급하고, 을은 대금을 받을 때 세금계산서를 발행한다.</p>
<h3>제5조 (공사 수행과 안전)</h3>
<p>을은 관계 법령과 안전 수칙을 지켜 공사를 수행하고, 공사 중 을의 책임으로 생긴 사고와 손해는 을이 부담한다. 갑은 공사에 필요한 현장 출입·전기·용수 사용 등에 협조한다.</p>
<h3>제6조 (준공과 검사)</h3>
<p>을은 공사를 마치면 갑에게 알리고, 갑은 지체 없이 검사한다. 검사에서 고칠 부분이 나오면 을은 이를 보수한 뒤 다시 검사를 받는다.</p>
<h3>제7조 (하자담보)</h3>
<p>을은 위 하자담보책임기간 동안 을의 시공 잘못으로 생긴 하자를 보수한다. 갑의 사용 잘못이나 천재지변으로 생긴 하자는 제외한다.</p>
<h3>제8조 (공사 지연)</h3>
<p>을의 책임으로 공사 기간 안에 공사를 마치지 못하면 위 지체상금률에 따른 지체상금을 갑에게 낸다. 갑의 사정, 천재지변, 자재 수급 등 을의 책임이 아닌 사유로 지연되면 갑과 을이 협의하여 공사 기간을 늘린다.</p>
<h3>제9조 (계약 해제)</h3>
<p>갑 또는 을이 이 계약을 지키지 않아 상대방이 기간을 정해 이행을 요구했는데도 그 기간 안에 이행하지 않으면 상대방은 계약을 해제할 수 있다. 이때 이미 시공한 부분의 대금은 정산한다.</p>
<h3>제10조 (분쟁 해결)</h3>
<p>이 계약에 관한 분쟁은 갑과 을이 협의하여 해결하고, 협의가 되지 않으면 민사소송법에 따른 관할 법원에서 해결한다.</p>
<h3>제11조 (계약서 보관)</h3>
<p>이 계약을 증명하기 위하여 계약서 2부를 작성하여 갑과 을이 기명날인한 뒤 각 1부씩 보관한다.</p>
${special.length ? `<h3>제12조 (특약사항)</h3><ol class="list">${special.map((x) => `<li>${esc(x)}</li>`).join('')}</ol>` : ''}

${stampBlock(party, terms.contractDate)}

<h2 class="page">별첨 1. 견적서 (${esc(quote.number)}, v${o.versionNo})</h2>
<div class="quote-sheet">${quoteSheet}</div>
</article>`
}

/** 계약서 단독 HTML 문서 (head 포함) */
export function contractDocument(title: string, body: string, extraHead = ''): string {
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow, noarchive"><title>${esc(title)} | 엔엠솔루션</title>
<link rel="stylesheet" href="${PRETENDARD_CSS}"><style>${QUOTE_CSS}${CONTRACT_CSS}body{margin:0;background:#f4f5f7}</style>${extraHead}</head>
<body>${body}</body></html>`
}
