import { calcQuote, itemAmount, won, type Quote, type QuoteSection, type SectionCalc } from './quote'

/**
 * /kkt(금강변압기) 공개 페이지의 견적 칸. 비밀번호를 넣으면 app/kkt/quote/route.ts 가 이 HTML 을 돌려준다.
 * 마크업·클래스는 app/kkt/page-html.ts 의 CSS(quote-head, qcard, trade, subtotals 등)를 그대로 쓴다.
 * 값은 seed-kkt.ts 의 KKT_QUOTE 에서 계산하므로 관리자 견적서와 금액이 같다.
 */

function esc(s: unknown) {
  return String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)
}

const pct = (v: number, total: number) => (total ? `${(Math.round((v / total) * 1000) / 10 || 0).toFixed(1)}%` : '')

function tradeHtml(s: QuoteSection, c: SectionCalc, q: Quote) {
  let prev = ''
  const items = s.items
    .map((i) => {
      const grp = i.kind === prev ? '' : i.kind
      prev = i.kind
      return `<tr><td class="grp">${esc(grp)}</td><td>${esc(i.name)}</td><td class="spec">${esc(i.spec)}</td><td class="c">${esc(i.unit)}</td><td class="n">${i.qty.toLocaleString('ko-KR')}</td><td class="n">${won(i.price)}</td><td class="n strong">${won(itemAmount(i))}</td><td class="note">${esc(i.note)}</td></tr>`
    })
    .join('')
  const r = q.rates
  const full = q.costCalc && !s.flat && !s.overheadOnly
  const oh = q.costCalc && !s.flat
  const row = (label: string, v: number, note: string, cls = '') =>
    `<tr${cls ? ` class="${cls}"` : ''}><td colspan="6">${label}</td><td class="n">${won(v)}</td><td class="note">${note}</td></tr>`
  const off = '미적용'
  const subs = [
    row('재료비 계', c.mat, ''),
    row('노무비 계', c.lab, ''),
    row('경비 계', c.exp, ''),
    row('산재보험료', c.injury, full ? `노무비 × ${r.injury}%` : off),
    row('고용보험료', c.employment, full ? `노무비 × ${r.employment}%` : off),
    row('산업안전보건관리비', c.safety, full ? `(재료비 + 노무비) × ${r.safety}%` : off),
    row('순공사원가', c.net, '', 'sum'),
    row('일반관리비', c.overhead, oh ? `순공사원가 × ${r.overhead}%` : off),
    row('이윤', c.profit, full ? `(노무비 + 경비 + 일반관리비) × ${r.profit}%` : off),
    row('단수정리', c.adjust, '천원 미만 절사'),
  ].join('')
  return `<details class="trade">
  <summary><span class="t-name">${esc(s.name)}</span><span class="t-desc">${esc(s.desc)}</span><span class="t-amt mono">${won(c.total)}원</span></summary>
  <div class="table-wrap"><table class="items">
    <thead><tr><th>구분</th><th>품명</th><th>규격</th><th>단위</th><th class="n">수량</th><th class="n">단가</th><th class="n">금액</th><th>비고</th></tr></thead>
    <tbody>${items}</tbody>
    <tbody class="subtotals">${subs}
      <tr class="grand"><td colspan="6">공정 합계 (부가세 별도)</td><td class="n">${won(c.total)}</td><td></td></tr></tbody>
  </table></div>
</details>`
}

export function publicQuoteHtml(q: Quote): string {
  const calc = calcQuote(q)
  const cs = calc.sections
  const names = q.sections.map((s) => s.name)
  const sum = (f: (c: SectionCalc) => number) => cs.reduce((a, c) => a + f(c), 0)
  const costRow = (label: string, f: (c: SectionCalc) => number, cls = '') => {
    const t = sum(f)
    return `<tr${cls ? ` class="${cls}"` : ''}><td>${label}</td>${cs.map((c) => `<td class="n">${won(f(c))}</td>`).join('')}<td class="n strong">${won(t)}</td><td class="n muted">${pct(t, calc.works)}</td></tr>`
  }
  const blank = cs.map(() => '<td></td>').join('')
  const totalRow = (label: string, v: string, cls = '') =>
    `<tr${cls ? ` class="${cls}"` : ''}><td>${label}</td>${blank}<td class="n strong">${v}</td><td></td></tr>`
  const notes = q.notes
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('공사 기간'))

  return `
    <div class="quote-head">
      <div class="qcard main"><div class="l">합계 금액 (부가세 포함)</div><div class="v">₩${won(calc.grand)}</div><div class="s">공급가액 ${won(calc.supply)} + 부가세 ${won(calc.vat)}</div></div>
      <div class="qcard"><div class="l">공정별 금액 (부가세 별도)</div><div class="s" style="color:var(--fg);font-size:14px;line-height:1.9">${q.sections
        .map((s, i) => `${i + 1}. ${esc(s.name)} <b class="mono">${won(cs[i].total)}</b>`)
        .join('<br>')}</div></div>
      ${
        calc.discount
          ? `<div class="qcard"><div class="l">${esc(q.discountLabel)}</div><div class="v">-${won(calc.discount)}</div><div class="s">공정 합계 ${won(calc.works)}에서 할인</div></div>`
          : ''
      }
    </div>

    <h3>견적 총괄표</h3>
    <div class="table-wrap">
      <table>
        <thead><tr><th>번호</th><th>공정</th><th>내용</th><th class="n">금액</th></tr></thead>
        <tbody>${q.sections
          .map((s, i) => `<tr><td>${i + 1}</td><td class="strong">${esc(s.name)}</td><td class="muted">${esc(s.desc)}</td><td class="n">${won(cs[i].total)}</td></tr>`)
          .join('')}
        <tr class="sum"><td></td><td colspan="2">공정 합계</td><td class="n strong">${won(calc.works)}</td></tr>
        ${calc.discount ? `<tr><td></td><td colspan="2">${esc(q.discountLabel)}</td><td class="n strong">-${won(calc.discount)}</td></tr>` : ''}
        <tr><td></td><td colspan="2">공급가액</td><td class="n strong">${won(calc.supply)}</td></tr>
        <tr><td></td><td colspan="2">부가가치세 (10%)</td><td class="n strong">${won(calc.vat)}</td></tr>
        <tr class="grand"><td></td><td colspan="2">합계 (부가세 포함)</td><td class="n strong">${won(calc.grand)}</td></tr></tbody>
      </table>
    </div>

    <h3>공사원가계산서</h3>
    <div class="table-wrap">
      <table>
        <thead><tr><th>비목</th>${names.map((n) => `<th class="n">${esc(n.replace(/ 작업$/, ''))}</th>`).join('')}<th class="n">합계</th><th class="n">구성비</th></tr></thead>
        <tbody>${costRow('재료비', (c) => c.mat)}${costRow('노무비', (c) => c.lab)}${costRow('경비', (c) => c.exp)}${costRow('산재보험료', (c) => c.injury)}${costRow('고용보험료', (c) => c.employment)}${costRow('산업안전보건관리비', (c) => c.safety)}${costRow('순공사원가', (c) => c.net, 'sum')}${costRow('일반관리비', (c) => c.overhead)}${costRow('이윤', (c) => c.profit)}${costRow('단수정리', (c) => c.adjust)}${costRow('공정 합계', (c) => c.total, 'grand')}${
          calc.discount ? totalRow(esc(q.discountLabel), `-${won(calc.discount)}`) : ''
        }${totalRow('공급가액', won(calc.supply))}${totalRow('부가가치세 (10%)', won(calc.vat))}${totalRow('총 공사금액', won(calc.grand), 'grand')}</tbody>
      </table>
    </div>

    <h3>공정별 내역서</h3>
    <div class="tabs" role="tablist">
      <button role="tab" aria-selected="true" data-panel="pa">공정별 내역</button>
    </div>
    <div class="panel" id="pa">
${q.sections.map((s, i) => tradeHtml(s, cs[i], q)).join('\n')}</div>

    <h3>특기사항</h3>
    <ol class="ol-notes">
${notes.map((n) => `      <li>${esc(n)}</li>`).join('\n')}
    </ol>
`
}
