import { flSegText, flSpec, flSvg, flWidth, normalizeFlashing, type Flashing } from './flashing'

/**
 * 발주서 (엔엠솔루션 → 자재 공급처). 화면 미리보기·인쇄·PDF 가 같은 HTML 을 쓴다.
 * 이 파일은 DB 를 쓰지 않으므로 어드민 화면(브라우저)에서도 불러 미리보기를 그린다.
 *
 * - 쪽은 A4 한 장 단위(.sheet = 210×297mm). 품목이 많으면 장이 늘고, 각 장 머리에 발주번호·쪽수가 찍힌다.
 * - 사업자 정보(사업자번호·주소 등)는 코드에 두지 않는다(공개 저장소). 어드민 '발주서 > 사업자·발주처'에서 넣는다.
 */

export type PoParty = {
  name: string
  ceo: string
  bizNumber: string
  address: string
  phone: string
  fax: string
  email: string
  manager: string
  managerPhone: string
  /** 발주처만: 이 발주처에 쓰는 발주서 양식 */
  form?: PoForm
}

/** 발주처별 발주서 양식. panel = 판넬 공장(판넬 + 후레싱 절곡), general = 일반 자재(품목표만) */
export type PoForm = 'panel' | 'general'
export const PO_FORMS: { value: PoForm; label: string }[] = [
  { value: 'panel', label: '판넬 공장 (판넬 + 후레싱 절곡)' },
  { value: 'general', label: '일반 자재 (품목표만)' },
]

export type PoPartyRow = PoParty & { id: number; kind: 'issuer' | 'supplier'; sortOrder: number }

/** 단가 기준: m = 길이(m)×수량×단가 (판넬), ea = 수량×단가 */
export type PoItem = {
  id: string
  name: string
  spec: string
  lengthMm: number
  qty: number
  unit: string
  basis: 'm' | 'ea'
  price: number
  note: string
  /** 후레싱(절곡) 품목이면 단면 정보. 있으면 규격 칸은 이 값으로 채우고 절곡 상세도 장에 그림이 들어간다 */
  fl?: Flashing
}

export type PoStatus = '작성 중' | '발주 완료' | '취소'

export type PurchaseOrder = {
  no: string
  date: string
  status: PoStatus
  issuer: PoParty
  supplier: PoParty
  siteName: string
  siteAddress: string
  deliveryDate: string
  deliveryPlace: string
  receiver: string
  receiverPhone: string
  payment: string
  items: PoItem[]
  notes: string
  /** 금액란을 비우고 수량만 발주 (단가는 공급처 견적) */
  hidePrice: boolean
  /** 발주처 양식(발주처를 고를 때 따라옴). panel 이면 후레싱(절곡) 칸이 나온다 */
  form: PoForm
}

export const PO_STATUSES: PoStatus[] = ['작성 중', '발주 완료', '취소']

export function emptyParty(name = ''): PoParty {
  return { name, ceo: '', bizNumber: '', address: '', phone: '', fax: '', email: '', manager: '', managerPhone: '' }
}

export function poItemId() {
  return 'i' + Math.random().toString(36).slice(2, 9)
}

export function emptyPoItem(): PoItem {
  return { id: poItemId(), name: '', spec: '', lengthMm: 0, qty: 0, unit: '장', basis: 'm', price: 0, note: '' }
}

export function todayKst(): string {
  return new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10)
}

export const DEFAULT_PO_NOTES = [
  '납품 시 거래명세서 동봉 요청함.',
  '규격·색상·수량이 발주와 다르면 출고 전 연락 바람.',
  '하차·적재 위치는 현장 담당자와 협의함.',
].join('\n')

export function emptyOrder(): PurchaseOrder {
  return {
    no: '',
    date: todayKst(),
    status: '작성 중',
    issuer: emptyParty(),
    supplier: emptyParty(),
    siteName: '',
    siteAddress: '',
    deliveryDate: '',
    deliveryPlace: '',
    receiver: '',
    receiverPhone: '',
    payment: '협의',
    items: [emptyPoItem()],
    notes: DEFAULT_PO_NOTES,
    hidePrice: false,
    form: 'panel',
  }
}

const str = (v: unknown, max = 500) => String(v ?? '').slice(0, max)
const num = (v: unknown) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

export function normalizeParty(raw: unknown): PoParty {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const p = emptyParty()
  for (const k of Object.keys(p) as (keyof PoParty)[]) if (k !== 'form') (p as Record<string, string>)[k] = str(r[k], 300)
  if (r.form === 'panel' || r.form === 'general') p.form = r.form
  return p
}

export function normalizeOrder(raw: unknown): PurchaseOrder {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const base = emptyOrder()
  const items = Array.isArray(r.items)
    ? r.items.slice(0, 300).map((x) => {
        const i = (x && typeof x === 'object' ? x : {}) as Record<string, unknown>
        return {
          id: str(i.id, 20) || poItemId(),
          name: str(i.name, 200),
          spec: str(i.spec, 300),
          lengthMm: num(i.lengthMm),
          qty: num(i.qty),
          unit: str(i.unit, 20),
          basis: i.basis === 'ea' ? 'ea' : 'm',
          price: num(i.price),
          note: str(i.note, 200),
          fl: normalizeFlashing(i.fl),
        } satisfies PoItem
      })
    : base.items
  return {
    no: str(r.no, 40),
    date: str(r.date, 10) || base.date,
    status: PO_STATUSES.includes(r.status as PoStatus) ? (r.status as PoStatus) : '작성 중',
    issuer: normalizeParty(r.issuer),
    supplier: normalizeParty(r.supplier),
    siteName: str(r.siteName, 200),
    siteAddress: str(r.siteAddress, 300),
    deliveryDate: str(r.deliveryDate, 60),
    deliveryPlace: str(r.deliveryPlace, 300),
    receiver: str(r.receiver, 100),
    receiverPhone: str(r.receiverPhone, 60),
    payment: str(r.payment, 200),
    items,
    notes: str(r.notes, 3000),
    hidePrice: r.hidePrice === true,
    // 예전 발주서(양식 없음)는 판넬 양식으로 읽음
    form: r.form === 'general' ? 'general' : 'panel',
  }
}

/** 총길이(m). 길이가 없으면 0 */
export function itemMeters(i: PoItem) {
  return i.lengthMm > 0 && i.qty > 0 ? (i.lengthMm / 1000) * i.qty : 0
}

export function itemAmount(i: PoItem) {
  if (!i.price) return 0
  return Math.round(i.basis === 'm' ? itemMeters(i) * i.price : i.qty * i.price)
}

export function calcOrder(o: PurchaseOrder) {
  const supply = o.items.reduce((s, i) => s + itemAmount(i), 0)
  const vat = Math.round(supply * 0.1)
  return { supply, vat, total: supply + vat }
}

/** 표의 비고 칸: 후레싱은 첫 마디만(전체는 절곡 상세도에) */
function noteOf(i: PoItem) {
  return i.fl ? i.note.split('·')[0].trim() : i.note
}

/** 표의 규격 칸: 후레싱이면 재질·두께·색상·전개폭에 직접 적은 규격을 덧붙임 */
function specOf(i: PoItem) {
  return i.fl ? [flSpec(i.fl), i.spec].filter(Boolean).join(' · ') : i.spec
}

const won = (n: number) => Math.round(n).toLocaleString('ko-KR')
const fmtNum = (n: number, d = 2) => (n ? n.toLocaleString('ko-KR', { maximumFractionDigits: d }) : '')
function esc(s: unknown) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}
function fmtDate(d: string) {
  const [y, m, day] = d.split('-')
  return y && m && day && /^\d+$/.test(y + m + day) ? `${y}년 ${Number(m)}월 ${Number(day)}일` : d
}

export const PO_FONT_CSS = 'https://cdn.jsdelivr.net/npm/pretendard@1.3.9/dist/web/static/pretendard.min.css'

const CSS = `
.flnote{margin:3mm 0 2mm;font-size:8pt;color:#5D6878}
.flg{display:grid;grid-template-columns:1fr 1fr;gap:3.5mm}
.flc{border:1px solid #DDE3EA;height:77mm;display:flex;flex-direction:column;overflow:hidden}
.flh{flex:none;line-height:1.4;background:#F4F6F9;border-bottom:1px solid #DDE3EA;padding:1.4mm 2.5mm;font-size:9pt;font-weight:600;color:#0F2A44;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.flh span{font-weight:400;color:#5D6878;margin-left:2mm;font-size:8pt}
.fls{flex:none;height:33mm;padding:1mm 2mm}.fls svg{width:100%;height:100%}
.flc table{width:100%;border-collapse:collapse;border-top:1px solid #DDE3EA}
.flc th{width:20mm;white-space:nowrap;text-align:left;font-weight:500;color:#5D6878;font-size:8pt;padding:.5mm 2.5mm;vertical-align:top}
.flc td{font-size:8.5pt;padding:.5mm 2.5mm .5mm 0;word-break:keep-all}
*{box-sizing:border-box}
html,body{margin:0;padding:0}
body{font-family:Pretendard,'Pretendard Variable','Malgun Gothic','Apple SD Gothic Neo',sans-serif;color:#1D2430;font-size:9.5pt;line-height:1.45;-webkit-print-color-adjust:exact;print-color-adjust:exact}
@page{size:A4;margin:0}
.sheet{width:210mm;height:297mm;padding:14mm 14mm 12mm;background:#fff;position:relative;overflow:hidden;display:flex;flex-direction:column}
@media screen{body{background:#E6E9EE;padding:16px 0}.sheet{margin:0 auto 16px;box-shadow:0 1px 4px rgba(15,42,68,.18)}}
@media print{.sheet{break-after:page}.sheet:last-child{break-after:auto}}
.top{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2pt solid #0F2A44;padding-bottom:3mm}
.brand{min-width:48mm;font-size:9pt;font-weight:700;letter-spacing:.12em;color:#E8742A}
.brand.alt{color:#0F2A44;letter-spacing:0;font-size:11pt;min-width:48mm}
.brand small{display:block;color:#5D6878;font-weight:400;letter-spacing:0;font-size:8pt;margin-top:1mm}
h1{margin:0;font-size:22pt;font-weight:700;letter-spacing:.5em;color:#0F2A44;text-align:center;flex:1}
.meta{font-size:8.5pt;text-align:right;color:#5D6878;min-width:48mm}
.meta b{color:#1D2430;font-weight:600}
.cont{font-size:8pt;color:#5D6878;text-align:right;margin:0 0 2mm}
.parties{display:grid;grid-template-columns:1fr 1fr;gap:4mm;margin-top:4mm}
.party{border:1px solid #DDE3EA}
.party h3{margin:0;background:#F4F6F9;font-size:9pt;font-weight:600;padding:1.6mm 3mm;color:#0F2A44;border-bottom:1px solid #DDE3EA}
.party table{width:100%;border-collapse:collapse}
.party th{width:22mm;text-align:left;font-weight:500;color:#5D6878;padding:1.1mm 3mm;vertical-align:top;font-size:8.5pt}
.party td{padding:1.1mm 3mm 1.1mm 0;font-size:9pt;word-break:keep-all}
.party .nm{font-weight:700;font-size:10.5pt}
.seal{color:#5D6878;font-size:8.5pt;margin-left:2mm}
.info{width:100%;border-collapse:collapse;margin-top:4mm;border-top:1px solid #DDE3EA}
.info th{background:#F4F6F9;font-weight:600;width:24mm;text-align:left;padding:1.6mm 3mm;border-bottom:1px solid #DDE3EA;font-size:9pt}
.info td{padding:1.6mm 3mm;border-bottom:1px solid #DDE3EA}
.lead{margin:4mm 0 2mm;font-size:9.5pt}
.items{width:100%;border-collapse:collapse;border-top:2pt solid #0F2A44;table-layout:fixed}
.items th{background:#F4F6F9;font-weight:600;font-size:8.5pt;padding:1.6mm 1.2mm;border-bottom:1px solid #C9D1DB;text-align:center}
.items td{padding:0 1.6mm;height:7.4mm;border-bottom:1px solid #DDE3EA;font-size:9pt;vertical-align:middle;word-break:keep-all;overflow:hidden}
.items td.c{text-align:center}.items td.r{text-align:right;font-variant-numeric:tabular-nums}
.items td.sp{font-size:8.5pt}
.items tfoot td{font-weight:600;background:#fff}
.items tfoot tr.grand td{border-top:1px solid #0F2A44;border-bottom:2pt solid #0F2A44;font-weight:700;font-size:10pt;color:#0F2A44}
.notes{margin-top:4mm;border:1px solid #DDE3EA;padding:2.5mm 3mm;font-size:9pt}
.notes h4{margin:0 0 1mm;font-size:9pt;font-weight:600;color:#0F2A44}
.notes ol{margin:0;padding-left:5mm}
.sign{margin-top:auto;padding-top:5mm;display:flex;justify-content:space-between;align-items:flex-end;gap:6mm}
.sign .by{font-size:10pt}
.sign .by b{font-size:11pt}
.sign .ok{border:1px solid #DDE3EA;padding:2.5mm 3mm;font-size:8.5pt;color:#5D6878;min-width:70mm}
.sign .ok div{margin-top:4mm;color:#1D2430}
.foot{margin-top:3mm;border-top:1px solid #DDE3EA;padding-top:1.5mm;font-size:8pt;color:#5D6878;display:flex;justify-content:space-between}
`

function partyRows(p: PoParty, sealLabel: boolean) {
  const rows: [string, string][] = [
    ['상호', ''],
    ['대표자', p.ceo],
    ['사업자번호', p.bizNumber],
    ['주소', p.address],
    ['전화', [p.phone, p.fax && `FAX ${p.fax}`].filter(Boolean).join(' · ')],
    ['담당', [p.manager, p.managerPhone].filter(Boolean).join(' ')],
    ['이메일', p.email],
  ]
  return rows
    .map(([k, v]) =>
      k === '상호'
        ? `<tr><th>${k}</th><td><span class="nm">${esc(p.name)}</span>${sealLabel ? '<span class="seal">(인)</span>' : ''}</td></tr>`
        : `<tr><th>${k}</th><td>${esc(v)}</td></tr>`,
    )
    .join('')
}

/** 쪽 나누기: 첫 장은 머리·사업자 칸이 있어 적게, 마지막 장은 합계·특기사항·서명 칸을 남긴다 */
function paginate(w: number[]): number[][] {
  // 용량은 한 줄짜리 행 기준. 글이 길어 두세 줄로 접히는 행은 w(무게)를 크게 준다
  const FIRST = 17
  const FIRST_LAST = 11
  const MID = 30
  const MID_LAST = 22
  const n = w.length
  const sum = (from: number, to: number) => w.slice(from, to).reduce((a, b) => a + b, 0)
  const pages: number[][] = []
  let i = 0
  let first = true
  while (true) {
    const lastCap = first ? FIRST_LAST : MID_LAST
    const fullCap = first ? FIRST : MID
    if (sum(i, n) <= lastCap) {
      pages.push(Array.from({ length: n - i }, (_, k) => i + k))
      break
    }
    let take = 0
    while (i + take < n && sum(i, i + take + 1) <= fullCap) take++
    // 남은 품목이 이 장에 다 들어가도 합계 칸 자리가 없으면, 몇 줄은 다음(마지막) 장으로 넘긴다
    if (i + take >= n) take = Math.max(1, take - 3)
    take = Math.max(1, take)
    pages.push(Array.from({ length: take }, (_, k) => i + k))
    i += take
    first = false
  }
  return pages
}

/** 행 무게: 칸 너비에 견준 글자 수로 접힐 줄 수를 어림한다 */
function rowWeight(name: string, spec: string, note: string) {
  const lines = Math.max(1, Math.ceil(name.length / 9), Math.ceil(spec.length / 24), Math.ceil(note.length / 7))
  return lines === 1 ? 1 : 1 + (lines - 1) * 0.6
}

export function renderOrderHtml(o: PurchaseOrder): string {
  const { supply, vat, total } = calcOrder(o)
  const showPrice = !o.hidePrice
  const items = o.items.filter((i) => i.name || i.spec || i.qty || i.lengthMm || i.price || i.note || i.fl)
  const pages = paginate(items.map((i) => rowWeight(i.name || i.fl?.kind || '', specOf(i), noteOf(i))))
  // 후레싱 품목은 뒤에 '절곡 상세도' 장을 붙인다 (한 장에 6개: 2열 × 3줄)
  const flIdx = items.map((it, k) => (it.fl && it.fl.segs.length ? k : -1)).filter((k) => k >= 0)
  const detail: number[][] = []
  for (let k = 0; k < flIdx.length; k += 6) detail.push(flIdx.slice(k, k + 6))
  const N = pages.length + detail.length
  const no = o.no || '(저장 후 부여)'
  const isNm = /엔엠솔루션|NM\s*SOLUTION/i.test(o.issuer.name)
  const brand = isNm ? `<div class="brand">NM SOLUTION<small>${esc(o.issuer.name)}</small></div>` : `<div class="brand alt">${esc(o.issuer.name)}</div>`

  const cols = showPrice
    ? `<colgroup><col style="width:7mm"><col style="width:26mm"><col><col style="width:14mm"><col style="width:10mm"><col style="width:9mm"><col style="width:14mm"><col style="width:17mm"><col style="width:20mm"><col style="width:14mm"></colgroup>`
    : `<colgroup><col style="width:8mm"><col style="width:34mm"><col><col style="width:18mm"><col style="width:13mm"><col style="width:10mm"><col style="width:18mm"><col style="width:26mm"></colgroup>`
  const head = `<thead><tr><th>No</th><th>품명</th><th>규격·색상</th><th>길이<br>(mm)</th><th>수량</th><th>단위</th><th>총길이<br>(m)</th>${showPrice ? '<th>단가</th><th>금액</th>' : ''}<th>비고</th></tr></thead>`
  const colCount = showPrice ? 10 : 8

  const row = (i: PoItem, idx: number) => {
    const amt = itemAmount(i)
    return `<tr><td class="c">${idx + 1}</td><td>${esc(i.name || i.fl?.kind)}</td><td class="sp">${esc(specOf(i))}</td><td class="r">${i.lengthMm ? won(i.lengthMm) : ''}</td><td class="r">${fmtNum(i.qty)}</td><td class="c">${esc(i.unit)}</td><td class="r">${fmtNum(itemMeters(i))}</td>${
      showPrice ? `<td class="r">${i.price ? won(i.price) + (i.basis === 'm' ? '<span style="color:#5D6878;font-size:7.5pt">/m</span>' : '') : ''}</td><td class="r">${amt ? won(amt) : ''}</td>` : ''
    }<td class="sp">${esc(noteOf(i))}</td></tr>`
  }
  const blank = `<tr>${'<td></td>'.repeat(colCount)}</tr>`

  const meters = items.reduce((s, i) => s + itemMeters(i), 0)
  const foot = showPrice
    ? `<tfoot><tr><td colspan="${colCount - 4}" class="c">공급가액</td><td colspan="4" class="r">${supply ? won(supply) : ''}</td></tr>
<tr><td colspan="${colCount - 4}" class="c">부가세 (10%)</td><td colspan="4" class="r">${supply ? won(vat) : ''}</td></tr>
<tr class="grand"><td colspan="${colCount - 4}" class="c">합계 (VAT 포함)</td><td colspan="4" class="r">${supply ? '₩ ' + won(total) : ''}</td></tr></tfoot>`
    : `<tfoot><tr class="grand"><td colspan="6" class="c">합계</td><td class="r">${fmtNum(meters)}</td><td></td></tr></tfoot>`

  const notes = o.notes
    .split('\n')
    .map((l) => l.trim().replace(/^\d+[.)]\s*/, ''))
    .filter(Boolean)

  const sheets: string[] = pages.map((idxs, p) => {
    const first = p === 0
    const last = p === pages.length - 1
    // 한 장짜리 발주서는 빈 줄로 표를 채워 양식 모양을 맞춘다
    const pad = last && N === 1 ? Math.max(0, 7 - idxs.length) : 0
    const body = idxs.map((k) => row(items[k], k)).join('') + blank.repeat(pad)
    const table = idxs.length || pad || last ? `<table class="items">${cols}${head}<tbody>${body}</tbody>${last ? foot : ''}</table>` : ''
    return `<section class="sheet">
${
  first
    ? `<div class="top">${brand}<h1>발 주 서</h1><div class="meta">발주일자 <b>${esc(fmtDate(o.date))}</b><br>발주번호 <b>${esc(no)}</b></div></div>
<div class="parties"><div class="party"><h3>수신 (공급처)</h3><table>${partyRows(o.supplier, false)}</table></div><div class="party"><h3>발주자</h3><table>${partyRows(o.issuer, true)}</table></div></div>
<table class="info"><tr><th>현장명</th><td>${esc(o.siteName)}</td><th>납기</th><td>${esc(o.deliveryDate)}</td></tr>
<tr><th>납품 장소</th><td colspan="3">${esc(o.deliveryPlace || o.siteAddress)}</td></tr>
<tr><th>현장 담당</th><td>${esc([o.receiver, o.receiverPhone].filter(Boolean).join(' '))}</td><th>결제 조건</th><td>${esc(o.payment)}</td></tr></table>
<p class="lead">아래와 같이 발주함.${showPrice && supply ? ` 발주금액 <b>₩ ${won(total)}</b> (VAT 포함)` : ''}</p>`
    : `<div class="top">${brand}<h1>발 주 서</h1><div class="meta">발주번호 <b>${esc(no)}</b><br>(${p + 1}쪽 계속)</div></div><p class="cont"></p>`
}
${table}
${
  last
    ? `${notes.length ? `<div class="notes"><h4>특기사항</h4><ol>${notes.map((l) => `<li>${esc(l)}</li>`).join('')}</ol></div>` : ''}
<div class="sign"><div class="by">${esc(fmtDate(o.date))}<br>발주자 <b>${esc(o.issuer.name)}</b> 대표 ${esc(o.issuer.ceo)} <span class="seal">(인)</span></div>
<div class="ok">수주 확인 (공급처)<div>${esc(o.supplier.name)} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; (인)</div></div></div>`
    : ''
}
<div class="foot"><span>${esc(o.issuer.name)}${o.issuer.phone ? ' · ' + esc(o.issuer.phone) : ''}${o.issuer.email ? ' · ' + esc(o.issuer.email) : ''}</span><span>${esc(no)} · ${p + 1} / ${N}</span></div>
</section>`
  })

  const card = (k: number) => {
    const it = items[k]
    const f = it.fl!
    const rows: [string, string][] = [
      ['재질·두께', [f.material, f.thickness ? `${f.thickness}t` : ''].filter(Boolean).join(' ')],
      ['색상', f.color],
      ['전개폭', flWidth(f) ? `${won(flWidth(f))} mm` : ''],
      ['절곡 치수', flSegText(f)],
      ['길이 × 수량', [it.lengthMm ? `${won(it.lengthMm)} mm` : '', it.qty ? `${fmtNum(it.qty)} ${it.unit}` : ''].filter(Boolean).join(' × ')],
      ['비고', it.note],
    ]
    return `<div class="flc"><div class="flh"><b>No.${k + 1}</b> ${esc(it.name || f.kind)}${it.name && f.kind && it.name !== f.kind ? `<span>${esc(f.kind)}</span>` : ''}</div>
<div class="fls">${flSvg(f, 300, 150, { font: 12 })}</div>
<table>${rows.map(([a, b]) => `<tr><th>${a}</th><td>${esc(b)}</td></tr>`).join('')}</table></div>`
  }
  detail.forEach((ks, d) => {
    const p = pages.length + d
    sheets.push(`<section class="sheet">
<div class="top">${brand}<h1>절곡 상세도</h1><div class="meta">발주번호 <b>${esc(no)}</b><br>${esc(o.siteName)}</div></div>
<p class="flnote">단면 치수 단위 mm · 각도는 두 면 사이 안쪽 각 · <span style="color:#E8742A">●</span> 표시가 첫 구간 시작점 · 도장면(색상면)은 바깥쪽 기준</p>
<div class="flg">${ks.map(card).join('')}</div>
<div class="foot" style="margin-top:auto"><span>${esc(o.issuer.name)}${o.issuer.phone ? ' · ' + esc(o.issuer.phone) : ''}</span><span>${esc(no)} · ${p + 1} / ${N}</span></div>
</section>`)
  })

  const title = `발주서 ${o.no || ''} ${o.supplier.name}`.trim()
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="robots" content="noindex, nofollow"><title>${esc(title)}</title><link rel="stylesheet" href="${PO_FONT_CSS}"><style>${CSS}</style></head><body>${sheets.join('\n')}</body></html>`
}
