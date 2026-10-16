import { calcQuote, won, type Quote } from './quote'
import { esc } from './proposal'

/** 제안서 '견적' 소제목에 들어가는 요약 카드 (합계 · 선택 항목 · 견적번호). 업체 링크 페이지와 제본용 인쇄가 같이 쓴다 */
export function quoteSummaryHtml(q: Quote): string {
  const calc = calcQuote(q)
  const optNames = q.sections.filter((s) => s.option).map((s) => s.name.replace(/\s*\(선택\)\s*$/, '') || '선택 항목')
  return `<div class="qsum">
  <div class="qcard main"><div class="l">합계 금액 (부가세 포함)</div><div class="v">₩${won(calc.grand)}</div><div class="s">공급가액 ${won(calc.supply)} + 부가세 ${won(calc.vat)}</div></div>
  ${
    calc.options > 0
      ? `<div class="qcard opt"><div class="l">${esc(q.optionLabel || '선택 항목')} · ${esc(optNames.join(', '))}</div><div class="v">+₩${won(calc.options)}</div><div class="s">부가세 별도 · 적용 시 견적금액에 더함</div></div>`
      : ''
  }
  <div class="qcard"><div class="l">견적번호 · 견적일</div><div class="v" style="font-size:20px">${esc(q.number)}</div><div class="s">${esc(q.date)} · 유효기간 ${q.validDays}일</div></div>
</div>`
}
