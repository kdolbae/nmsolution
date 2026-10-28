import { logoSvg } from '@/lib/brand-logo'
import { calcQuote, itemAmount, won, PRETENDARD_CSS, type Quote, type QuoteItem } from './quote'
import { esc } from './proposal'
import type { Send, SendMeta } from './sends'

/**
 * 업체 페이지의 '견적 이력'·'견적 비교' (고객용, 전 업체 공통).
 * 고객 발송본(client_sends)만 받는다. 내부 버전 번호·작성자·메모는 화면에 넣지 않는다.
 */

const day = (d: Date) => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' }).format(d)

const signed = (n: number) => (n === 0 ? '-' : `${n > 0 ? '+' : '−'}${won(Math.abs(n))}`)

/** 업체 페이지 맨 위 띠: 지금 보는 견적번호·발송일, 견적 이력 목록, 지난 견적이면 대표 견적으로 가는 길. base 는 업체 페이지 주소(/atotech) 또는 관리자 미리보기 주소. sends[0] 이 대표 견적 */
export function historyBar(base: string, sends: SendMeta[], current: SendMeta): string {
  const latest = sends[0]
  const old = current.no !== latest.no
  const list = sends
    .map((s) => {
      const tag = s.no === latest.no ? '<span class="nmh-tag">최신</span>' : ''
      const here = s.no === current.no ? ' aria-current="true"' : ''
      const view = s.no === latest.no ? base : `${base}?s=${s.no}`
      const cmp = s.no === latest.no ? '' : `<a class="nmh-cmp" href="${base}?cmp=${s.no}">최신과 비교</a>`
      return `<li${here}><a class="nmh-row" href="${view}"><b>${esc(s.number)}</b>${tag}<span>${day(s.sentAt)} 발송 · ${esc(s.title)}</span><span class="nmh-amt">공급가 ${won(s.supply)}원</span></a>${cmp}</li>`
    })
    .join('')
  return `<style>${BAR_CSS}</style>
<div class="nmh${old ? ' nmh-old' : ''}" data-nm-history>
  <div class="nmh-in">
    <div class="nmh-now">${old ? '<span class="nmh-tag old">지난 견적</span>' : ''}견적번호 <b>${esc(current.number)}</b> · ${day(current.sentAt)} 발송</div>
    <div class="nmh-act">
      ${old ? `<a href="${base}">최신 견적 ${esc(latest.number)} 보기</a><a href="${base}?cmp=${current.no}">최신과 비교</a>` : ''}
      ${sends.length > 1 ? `<details class="nmh-list"><summary>견적 이력 ${sends.length}건</summary><ol>${list}<li class="nmh-note">지난 견적도 효력이 있음. 최신 견적과 나란히 비교할 수 있음.</li></ol></details>` : ''}
    </div>
  </div>
</div>`
}

const BAR_CSS = `.nmh{font-family:Pretendard,-apple-system,'Apple SD Gothic Neo','Malgun Gothic',sans-serif;background:#0F2A44;color:#fff;font-size:13.5px;line-height:1.5;position:relative;z-index:60}
.nmh.nmh-old{background:#5b3a12}
.nmh-in{max-width:1080px;margin:0 auto;padding:9px 16px;display:flex;flex-wrap:wrap;gap:8px 16px;align-items:center;justify-content:space-between}
.nmh b{font-weight:700;font-variant-numeric:tabular-nums}
.nmh a{color:#fff!important;text-decoration:underline;text-underline-offset:3px}
.nmh-act{display:flex;flex-wrap:wrap;gap:6px 14px;align-items:center}
.nmh-tag{display:inline-block;font-size:11.5px;font-weight:700;padding:1px 7px;border-radius:999px;background:#E8742A;color:#fff;margin:0 6px 0 0;vertical-align:1px}
.nmh-tag.old{background:#fff;color:#5b3a12}
.nmh-list{position:relative}
.nmh-list summary{cursor:pointer;list-style:none;font-weight:700;padding:3px 10px;border:1px solid rgba(255,255,255,.55);border-radius:999px}
.nmh-list summary::-webkit-details-marker{display:none}
.nmh-list[open] summary{background:#fff;color:#0F2A44}
.nmh-list ol{position:absolute;right:0;top:calc(100% + 8px);margin:0;padding:6px;list-style:none;background:#fff;color:#1d2430;border:1px solid #dde3ea;border-radius:6px;box-shadow:0 10px 30px rgba(15,42,68,.18);width:min(420px,calc(100vw - 32px))}
.nmh-list li{display:flex;align-items:center;gap:8px;border-radius:4px;padding:8px 10px}
.nmh-list li[aria-current]{background:#f4f6f9}
.nmh-list .nmh-row{flex:1;display:flex;flex-wrap:wrap;gap:0 6px;color:#1d2430!important;text-decoration:none}
.nmh-list .nmh-row span:not(.nmh-tag){flex-basis:100%;font-size:12.5px;color:#5d6878}
.nmh-list .nmh-row .nmh-amt{color:#0F2A44;font-weight:600;font-variant-numeric:tabular-nums}
.nmh-list .nmh-cmp{white-space:nowrap;font-size:12.5px;font-weight:700;color:#0F2A44!important}
.nmh-list li.nmh-note{font-size:12px;color:#5d6878;padding:6px 10px 4px}
@media (max-width:640px){.nmh-list{position:static}.nmh-list ol{left:16px;right:16px;width:auto}}
@media print{.nmh{display:none!important}}`

/** 발송본이 아직 없을 때 업체 페이지 */
export function notReadyHtml(name: string): string {
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow, noarchive"><title>${esc(name)} 공사 자료 | 엔엠솔루션</title><link rel="stylesheet" href="${PRETENDARD_CSS}">
<style>body{margin:0;min-height:100svh;display:grid;place-items:center;background:#f4f6f9;color:#1d2430;font-family:Pretendard,'Apple SD Gothic Neo','Malgun Gothic',sans-serif;padding:20px}
main{max-width:380px;background:#fff;border:1px solid #dde3ea;border-radius:4px;padding:28px 24px}.mark{height:28px}h1{font-size:19px;color:#0F2A44;margin:16px 0 8px}p{margin:0;color:#5d6878;font-size:14px;line-height:1.7}</style></head>
<body><main><div class="mark">${logoSvg('horizontal', { height: '100%' })}</div><h1>${esc(name)} 공사 자료</h1><p>견적서를 준비하고 있음. 준비가 끝나면 이 주소에서 바로 볼 수 있음.<br>문의: 1800-5901</p></main></body></html>`
}

// ---------- 견적 비교 ----------

type Row = { key: string; item: QuoteItem }

/** 공종 안 품목을 짝짓는 열쇠: 구분·품명(같은 이름이 여럿이면 순번) */
function keyed(items: QuoteItem[]): Row[] {
  const seen = new Map<string, number>()
  return items.map((item) => {
    const k = `${item.kind}|${item.name.trim()}`
    const n = (seen.get(k) ?? 0) + 1
    seen.set(k, n)
    return { key: n > 1 ? `${k}#${n}` : k, item }
  })
}

const secKey = (name: string) => name.replace(/\s+/g, ' ').trim()

const qtyText = (i: QuoteItem) => `${i.qty.toLocaleString('ko-KR', { maximumFractionDigits: 3 })} ${esc(i.unit)}`

type Mark = 'same' | 'changed' | 'added' | 'removed'
const MARK: Record<Mark, string> = { same: '', changed: '변경', added: '추가', removed: '삭제' }

/** 두 발송본 비교 페이지 (a = 지난 견적, b = 비교 대상, 보통 최신) */
export function compareHtml(clientName: string, base: string, a: Send, b: Send, sends: SendMeta[]): string {
  const ca = calcQuote(a.quote)
  const cb = calcQuote(b.quote)
  const secsA = new Map(a.quote.sections.map((s, i) => [secKey(s.name), { s, c: ca.sections[i] }]))
  const secsB = new Map(b.quote.sections.map((s, i) => [secKey(s.name), { s, c: cb.sections[i] }]))
  // 순서: 최신 견적 순서대로, 지난 견적에만 있던 공종은 원래 자리 근처(앞 공종 다음)에 끼운다
  const order: string[] = b.quote.sections.map((s) => secKey(s.name))
  a.quote.sections.forEach((s, i) => {
    const k = secKey(s.name)
    if (order.includes(k)) return
    const prev = i > 0 ? secKey(a.quote.sections[i - 1].name) : null
    const at = prev ? order.indexOf(prev) : -1
    order.splice(at + 1, 0, k)
  })

  const amountRow = (label: string, va: number | null, vb: number | null, cls = '') =>
    `<tr${cls ? ` class="${cls}"` : ''}><td>${label}</td><td class="n">${va === null ? '<span class="na">없음</span>' : won(va)}</td><td class="n">${vb === null ? '<span class="na">없음</span>' : won(vb)}</td><td class="n d${(vb ?? 0) - (va ?? 0) > 0 ? ' up' : (vb ?? 0) - (va ?? 0) < 0 ? ' down' : ''}">${signed((vb ?? 0) - (va ?? 0))}</td></tr>`

  const summaryRows = order
    .map((k) => {
      const x = secsA.get(k)
      const y = secsB.get(k)
      const opt = (y ?? x)!.s.option
      const label = `${esc((y ?? x)!.s.name || '공종')}${opt ? ' <small>(선택 항목, 별도)</small>' : ''}${!x ? ' <em class="m added">추가</em>' : !y ? ' <em class="m removed">삭제</em>' : ''}`
      return amountRow(label, x ? x.c.total : null, y ? y.c.total : null, opt ? 'opt' : '')
    })
    .join('')
  const disc = ca.discount || cb.discount ? amountRow('가격 조정', -ca.discount, -cb.discount) : ''

  const sectionBlocks = order
    .map((k) => {
      const x = secsA.get(k)
      const y = secsB.get(k)
      const name = esc((y ?? x)!.s.name || '공종')
      const ra = keyed(x?.s.items ?? [])
      const rb = keyed(y?.s.items ?? [])
      const mapA = new Map(ra.map((r) => [r.key, r.item]))
      const mapB = new Map(rb.map((r) => [r.key, r.item]))
      const keys = rb.map((r) => r.key)
      ra.forEach((r, i) => {
        if (mapB.has(r.key)) return
        const prev = i > 0 ? ra[i - 1].key : null
        const at = prev ? keys.indexOf(prev) : -1
        keys.splice(at + 1, 0, r.key)
      })
      let changed = 0
      const rows = keys
        .map((key) => {
          const ia = mapA.get(key)
          const ib = mapB.get(key)
          const mark: Mark = !ia ? 'added' : !ib ? 'removed' : ia.spec === ib.spec && ia.qty === ib.qty && ia.price === ib.price && ia.unit === ib.unit ? 'same' : 'changed'
          if (mark !== 'same') changed++
          const i = (ib ?? ia)!
          const cell = (f: (v: QuoteItem) => string, diff: boolean) =>
            `<td class="${diff ? 'diff' : ''}">${ia ? f(ia) : '<span class="na">-</span>'}</td><td class="${diff ? 'diff' : ''}">${ib ? f(ib) : '<span class="na">-</span>'}</td>`
          const specDiff = !!(ia && ib && ia.spec !== ib.spec)
          return `<tr class="${mark}"><td><span class="kind">${esc(i.kind)}</span>${esc(i.name)}${MARK[mark] ? ` <em class="m ${mark}">${MARK[mark]}</em>` : ''}<div class="spec${specDiff ? ' diff' : ''}">${esc(i.spec)}${specDiff && ia ? `<br><s>${esc(ia.spec)}</s>` : ''}</div></td>${cell(qtyText, !!(ia && ib && (ia.qty !== ib.qty || ia.unit !== ib.unit)))}${cell((v) => won(itemAmount(v)), !!(ia && ib && itemAmount(ia) !== itemAmount(ib)))}</tr>`
        })
        .join('')
      const state = !x ? '<em class="m added">추가된 공종</em>' : !y ? '<em class="m removed">빠진 공종</em>' : changed ? `<em class="m changed">${changed}개 품목 바뀜</em>` : '<em class="m">바뀐 품목 없음</em>'
      return `<details class="sec"${(changed && y) || !x ? ' open' : ''}><summary><span class="t">${name}</span>${state}<span class="amt">${x ? won(x.c.total) : '-'} → ${y ? won(y.c.total) : '-'}</span></summary>
<div class="scroll"><table class="items"><thead><tr><th>품목</th><th>수량 (지난)</th><th>수량 (비교)</th><th class="n">금액 (지난)</th><th class="n">금액 (비교)</th></tr></thead><tbody>${rows}</tbody></table></div></details>`
    })
    .join('')

  const notes = (q: Quote) =>
    q.notes
      .split('\n')
      .map((t) => t.trim())
      .filter(Boolean)
  const na = notes(a.quote)
  const nb = notes(b.quote)
  const noteRows = [
    ...nb.map((t) => `<li class="${na.includes(t) ? '' : 'added'}">${na.includes(t) ? '' : '<em class="m added">추가</em> '}${esc(t)}</li>`),
    ...na.filter((t) => !nb.includes(t)).map((t) => `<li class="removed"><em class="m removed">삭제</em> <s>${esc(t)}</s></li>`),
  ].join('')

  const pick = sends
    .map((s) => `<option value="${s.no}"${s.no === a.no ? ' selected' : ''}>${esc(s.number)} (${day(s.sentAt)})</option>`)
    .join('')
  const pickB = sends
    .map((s) => `<option value="${s.no}"${s.no === b.no ? ' selected' : ''}>${esc(s.number)} (${day(s.sentAt)})</option>`)
    .join('')
  const head = (s: Send, label: string) =>
    `<div class="who"><div class="l">${label}</div><b>${esc(s.number)}</b><div class="s">${day(s.sentAt)} 발송 · ${esc(s.title)}</div><a href="${base}${s.no === sends[0].no ? '' : `?s=${s.no}`}">이 견적 보기</a></div>`

  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow, noarchive"><title>견적 비교 ${esc(a.number)} ↔ ${esc(b.number)} | ${esc(clientName)}</title>
<link rel="stylesheet" href="${PRETENDARD_CSS}"><style>${CMP_CSS}</style></head><body>
<header class="top"><div class="in"><span class="mark">${logoSvg('horizontal', { height: '100%' })}</span><a href="${base}">← 최신 견적으로</a></div></header>
<main>
<h1>견적 비교</h1>
<p class="lead">${esc(clientName)} 앞으로 보낸 두 견적을 나란히 놓았음. 금액은 원(부가세 별도, 합계는 부가세 포함).</p>
<form class="pick" method="get" action="${base}"><label>지난 견적 <select name="cmp">${pick}</select></label><label>비교 대상 <select name="to">${pickB}</select></label><button type="submit">비교</button></form>
<div class="heads">${head(a, '지난 견적')}${head(b, b.no === sends[0].no ? '최신 견적' : '비교 대상')}</div>
<h2>금액 비교</h2>
<div class="scroll"><table class="sum"><thead><tr><th>구분</th><th class="n">${esc(a.number)}</th><th class="n">${esc(b.number)}</th><th class="n">증감</th></tr></thead><tbody>
${summaryRows}${disc}
${amountRow('공급가액', ca.supply, cb.supply, 'tot')}${amountRow('부가세', ca.vat, cb.vat)}${amountRow('합계 (부가세 포함)', ca.grand, cb.grand, 'grand')}
${ca.options || cb.options ? amountRow('선택 항목 합계 (별도)', ca.options, cb.options, 'opt') : ''}
</tbody></table></div>
<h2>공종별 품목 비교</h2>
${sectionBlocks}
<h2>특기사항</h2>
<ol class="notes">${noteRows || '<li>없음</li>'}</ol>
<p class="foot">두 견적 모두 효력이 있으며, 어느 견적으로 진행할지는 협의로 정함. 문의 1800-5901 · nm-solution.co.kr</p>
</main></body></html>`
}

const CMP_CSS = `:root{--navy:#0F2A44;--accent:#E8742A;--ink:#1d2430;--muted:#5d6878;--line:#dde3ea;--bg:#f4f6f9;--up:#b42318;--down:#1f6f43}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font-family:Pretendard,-apple-system,'Apple SD Gothic Neo','Malgun Gothic',sans-serif;font-size:14.5px;line-height:1.6;word-break:keep-all}
.top{background:var(--navy)}.top .in{max-width:1000px;margin:0 auto;padding:10px 16px;display:flex;justify-content:space-between;align-items:center}
.top .mark{height:24px;display:block;filter:brightness(0) invert(1)}.top .mark svg{height:100%;width:auto}.top a{color:#fff;font-weight:600;text-decoration:none}
main{max-width:1000px;margin:0 auto;padding:22px 16px 60px}
h1{font-size:24px;color:var(--navy);margin:0 0 4px;letter-spacing:-.02em}h2{font-size:17px;color:var(--navy);margin:28px 0 10px;padding-bottom:6px;border-bottom:2px solid var(--navy)}
.lead{color:var(--muted);margin:0 0 14px}
.pick{display:flex;flex-wrap:wrap;gap:8px 12px;align-items:end;background:#fff;border:1px solid var(--line);padding:10px 12px;border-radius:4px}
.pick label{display:flex;flex-direction:column;font-size:12.5px;color:var(--muted);gap:2px}.pick select{font:inherit;font-size:14px;padding:6px 8px;border:1px solid var(--line);border-radius:4px;background:#fff}
.pick button{font:inherit;font-weight:700;padding:7px 16px;border:0;border-radius:4px;background:var(--navy);color:#fff;cursor:pointer}
.heads{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:14px}
.who{background:#fff;border:1px solid var(--line);border-top:3px solid var(--navy);padding:12px 14px;border-radius:4px}.who:first-child{border-top-color:#b0b8c4}
.who .l{font-size:12px;color:var(--muted);font-weight:600}.who b{font-size:18px;color:var(--navy)}.who .s{font-size:13px;color:var(--muted)}.who a{font-size:13px;font-weight:600;color:var(--navy)}
.scroll{overflow-x:auto;-webkit-overflow-scrolling:touch}
table{border-collapse:collapse;width:100%;background:#fff}th,td{border-bottom:1px solid var(--line);padding:7px 9px;text-align:left;vertical-align:top}
thead th{background:var(--bg);font-size:12.5px;color:var(--muted);font-weight:600;white-space:nowrap;border-top:2px solid var(--navy)}
.n{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
table.sum td:first-child{min-width:12em}table.sum tr.tot td{font-weight:700;border-top:1px solid #9aa6b5}table.sum tr.grand td{font-weight:800;color:var(--navy);font-size:15.5px;border-top:2px solid var(--navy);border-bottom:2px solid var(--navy)}
table.sum tr.opt td{color:var(--muted)}td.d.up{color:var(--up);font-weight:700}td.d.down{color:var(--down);font-weight:700}
small{color:var(--muted);font-weight:400}.na{color:#aab2bd}
em.m{font-style:normal;font-size:11.5px;font-weight:700;padding:1px 7px;border-radius:999px;background:#e9edf2;color:var(--muted);white-space:nowrap}
em.m.added{background:#e5f3ea;color:var(--down)}em.m.removed{background:#fbe9e7;color:var(--up)}em.m.changed{background:#fdf0e5;color:#a24e0d}
details.sec{background:#fff;border:1px solid var(--line);border-radius:4px;margin:0 0 10px}
details.sec summary{cursor:pointer;display:flex;flex-wrap:wrap;gap:4px 10px;align-items:center;padding:10px 12px}
details.sec summary .t{font-weight:700;color:var(--navy)}details.sec summary .amt{margin-left:auto;font-variant-numeric:tabular-nums;font-weight:600}
table.items{font-size:13.5px}table.items td:first-child{min-width:15em}table.items td:nth-child(n+2){white-space:nowrap}table.items td:nth-child(n+4){text-align:right;font-variant-numeric:tabular-nums}
table.items .kind{display:inline-block;font-size:11px;color:var(--muted);border:1px solid var(--line);border-radius:3px;padding:0 4px;margin-right:6px}
table.items .spec{font-size:12.5px;color:var(--muted)}table.items td.diff,table.items .spec.diff{background:#fff6e5}
tr.added td{background:#f2faf5}tr.removed td{background:#fdf4f3;color:#8a5a55}tr.removed td:first-child{text-decoration:line-through;text-decoration-color:#d9a19b}
ol.notes{background:#fff;border:1px solid var(--line);border-radius:4px;margin:0;padding:10px 12px 10px 34px}ol.notes li{margin:3px 0}ol.notes li.removed{color:#8a5a55}
.foot{margin-top:24px;color:var(--muted);font-size:13px}
@media (max-width:640px){.heads{grid-template-columns:1fr}h1{font-size:21px}}
@media print{.top,.pick{display:none}body{background:#fff}details.sec{break-inside:avoid}}`
