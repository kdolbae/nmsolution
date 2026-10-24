import { esc } from '@/lib/clients/proposal'
import { portalDrawings } from './table'

/**
 * 업체 페이지에 넣는 배관 도면 칸. 어드민에서 "업체 페이지에 표시"를 켠 도면만 보기 전용 보드로 띄운다.
 * 도면을 못 읽어도 업체 페이지는 그대로 열리게 빈 문자열을 돌려준다. 인쇄·PDF에는 안 나온다.
 */
export async function portalDrawingsHtml(clientId: number, slug: string): Promise<string> {
  const list = await portalDrawings(clientId).catch(() => [])
  if (!list.length) return ''
  const items = list
    .map(
      (d) => `<figure class="nm-dwg"><figcaption>${esc(d.title)}</figcaption>
<iframe src="/drawing-board/board.html?mode=view&amp;id=${d.id}&amp;slug=${encodeURIComponent(slug)}" title="${esc(d.title)}" loading="lazy"></iframe></figure>`,
    )
    .join('')
  return `<style>.nm-dwgs{max-width:1100px;margin:32px auto;padding:0 16px;font-family:Pretendard,'Noto Sans KR',sans-serif}
.nm-dwgs h2{font-size:20px;color:#0F2A44;margin:0 0 4px}.nm-dwgs p{margin:0 0 14px;color:#6b7280;font-size:14px}
.nm-dwg{margin:0 0 20px}.nm-dwg figcaption{font-weight:700;font-size:15px;color:#0F2A44;margin:0 0 6px}
.nm-dwg iframe{display:block;width:100%;height:min(78svh,720px);border:1px solid #e2e5ea;border-radius:4px;background:#fff}
@media print{.nm-dwgs{display:none!important}}</style>
<section class="nm-dwgs" aria-label="배관 도면"><h2>배관 도면</h2><p>마우스로 돌려 보고 휠로 확대할 수 있음.</p>${items}</section>`
}
