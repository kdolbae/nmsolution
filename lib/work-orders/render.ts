import { logoSvg } from '@/lib/brand-logo'
import { PRETENDARD_CSS } from '@/lib/clients/quote'
import { esc } from '@/lib/clients/proposal'
import { markdownToHtml } from './markdown'
import type { WorkOrder } from './table'

/**
 * 업무 지시서 HTML (어드민 보기·PDF·현장 팀 링크 공용). A4 세로, Pretendard, Navy #0F2A44 규격(lib/clients/quote.ts 와 같은 톤).
 * 휴대폰에서는 표가 가로로 넘치지 않게 작게 줄인다. 금액은 본문에 없다(생성 규칙).
 */
export function workOrderHtml(
  wo: Pick<WorkOrder, 'number' | 'title' | 'markdown' | 'status' | 'updatedAt'>,
  client: { name: string; siteAddress?: string | null },
  opts: { pdfHref?: string; banner?: string } = {},
): string {
  const updated = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', dateStyle: 'medium', timeStyle: 'short' }).format(wo.updatedAt)
  const body = markdownToHtml(wo.markdown)
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow, noarchive"><title>${esc(wo.title || '업무 지시서')} ${esc(wo.number)} | 엔엠솔루션</title>
<link rel="stylesheet" href="${PRETENDARD_CSS}">
<style>
@page{size:A4;margin:18mm 16mm}
:root{--navy:#0F2A44;--orange:#E8742A;--ink:#1D2430;--muted:#5D6878;--line:#DDE3EA;--head:#F4F6F9}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}
body{margin:0;background:#f4f6f9;color:var(--ink);font-family:Pretendard,'Apple SD Gothic Neo','Malgun Gothic',sans-serif;font-size:14px;line-height:1.6}
.sheet{max-width:860px;margin:0 auto;background:#fff;padding:28px 24px 48px}
.top{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;border-bottom:2px solid var(--navy);padding-bottom:12px;margin-bottom:18px}
.top .mark{height:26px}.top .meta{text-align:right;font-size:12px;color:var(--muted)}.top .meta b{color:var(--navy);font-size:14px}
.status{display:inline-block;padding:2px 8px;font-size:11px;font-weight:700;color:#fff;background:var(--navy);margin-left:6px}
.status.draft{background:#b42318}
h1{font-size:22px;font-weight:800;color:var(--navy);letter-spacing:-.02em;margin:0 0 14px}
h2{font-size:16px;font-weight:700;color:var(--navy);border-left:4px solid var(--orange);padding-left:8px;margin:26px 0 8px;break-after:avoid}
h3{font-size:14px;font-weight:700;margin:16px 0 4px;break-after:avoid}h4{font-size:13px;font-weight:700;margin:12px 0 4px}
p{margin:0 0 8px}ul,ol{margin:0 0 8px;padding-left:20px}li{margin:2px 0}li ul{margin:2px 0 0}
table{width:100%;border-collapse:collapse;margin:6px 0 10px;font-size:13px;break-inside:auto}
th,td{border:1px solid var(--line);padding:5px 7px;text-align:left;vertical-align:top}th{background:var(--head);font-weight:700;white-space:nowrap}
tr{break-inside:avoid}
code{font-family:inherit;background:var(--head);padding:0 4px}
hr{border:0;border-top:1px solid var(--line);margin:16px 0}
.cb{display:inline-block;width:12px;height:12px;border:1.5px solid var(--navy);vertical-align:-1px;margin-right:2px}.cb.on{background:var(--navy)}
.foot{margin-top:28px;border-top:1px solid var(--line);padding-top:10px;font-size:11px;color:var(--muted)}
.nm-pdf{position:fixed;right:16px;bottom:16px;z-index:50;display:inline-flex;align-items:center;gap:8px;font-size:14px;font-weight:700;padding:12px 18px;border-radius:999px;background:var(--navy);color:#fff!important;text-decoration:none!important;box-shadow:0 6px 18px rgba(15,42,68,.28)}
.banner{position:sticky;top:0;z-index:100;background:var(--orange);color:#fff;font:600 13px/1.4 Pretendard,sans-serif;padding:7px 16px;text-align:center}.banner a{color:#fff;margin-left:10px}
@media (max-width:720px){body{font-size:13px}.sheet{padding:18px 14px 80px}table{font-size:11px;display:block;overflow-x:auto;white-space:nowrap}th,td{padding:4px 5px}h1{font-size:19px}}
@media print{body{background:#fff}.sheet{max-width:none;padding:0}.nm-pdf,.banner{display:none!important}table{display:table;white-space:normal;font-size:12px}h2{page-break-after:avoid}}
</style></head><body>${opts.banner ? `<div class="banner">${opts.banner}</div>` : ''}
<div class="sheet">
<div class="top"><div class="mark">${logoSvg('horizontal', { height: '100%' })}</div><div class="meta"><b>현장 업무 지시서</b><span class="status${wo.status === 'draft' ? ' draft' : ''}">${wo.status === 'issued' ? '발행' : '초안'}</span><br>번호 ${esc(wo.number)}<br>${esc(client.name)}${client.siteAddress ? ` · ${esc(client.siteAddress)}` : ''}<br>갱신 ${esc(updated)}</div></div>
${body}
<div class="foot">엔엠솔루션 · 대표전화 1800-5901 · 이 지시서는 현장 시공 팀 전용임. 금액·계약 조건은 견적서·계약서를 따름.</div>
</div>
${opts.pdfHref ? `<a class="nm-pdf" href="${esc(opts.pdfHref)}" download>PDF 다운로드</a>` : ''}
</body></html>`
}
