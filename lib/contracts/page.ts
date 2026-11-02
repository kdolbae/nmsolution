import { esc } from '@/lib/clients/proposal'
import { contractDocument } from './render'
import type { ContractRow } from './table'

/**
 * 계약서 화면 (고객 링크·어드민 미리보기·인쇄 공통).
 * - print: 인쇄·PDF용. 계약서 + 별첨 1 견적서만(작업제안서는 따로 인쇄해 붙임).
 * - 화면: 아래에 별첨 2 작업제안서를 iframe 으로 같이 보여 주고, 오른쪽 아래에 PDF·인쇄 버튼.
 */
export function contractPage(
  c: Pick<ContractRow, 'number' | 'versionNo'>,
  html: string,
  proposalHtml: string,
  opts: { print?: boolean; pdfHref?: string; banner?: string } = {},
): string {
  if (opts.print) return contractDocument(`${c.number} 공사 도급 계약서`, html, PRINT_CSS)
  const proposal = proposalHtml.trim()
    ? `<section class="nmc" style="padding-top:0"><h2>별첨 2. 작업제안서 (v${c.versionNo})</h2>
<iframe title="작업제안서" sandbox="allow-same-origin" srcdoc="${esc(proposalHtml)}" style="width:100%;height:80vh;border:1px solid #d8dde4;border-radius:6px;background:#fff"></iframe></section>`
    : ''
  const buttons = `<div class="nmc-btns">${opts.pdfHref ? `<a href="${esc(opts.pdfHref)}" download>PDF 다운로드</a>` : ''}<button type="button" onclick="window.print()">인쇄</button></div>`
  return contractDocument(`${c.number} 공사 도급 계약서`, `${opts.banner ?? ''}${html}${proposal}${buttons}`, PRINT_CSS + BTN_CSS)
}

const PRINT_CSS = `<style>@page{size:A4;margin:14mm 12mm}@media print{body{background:#fff!important}}</style>`

const BTN_CSS = `<style>
.nmc-btns{position:fixed;right:16px;bottom:16px;z-index:50;display:flex;gap:8px;font-family:Pretendard,'Noto Sans KR',sans-serif}
.nmc-btns a,.nmc-btns button{font:inherit;font-size:14px;font-weight:700;padding:12px 18px;border:0;border-radius:999px;background:#0F2A44;color:#fff;text-decoration:none;cursor:pointer;box-shadow:0 6px 18px rgba(15,42,68,.28)}
@media print{.nmc-btns,iframe,.nmc-banner{display:none!important}}
</style>`
