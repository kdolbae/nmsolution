import { auth } from '@/lib/auth'
import { getClient, getVersion } from '@/lib/clients/table'
import { PRETENDARD_CSS, QUOTE_CSS, renderQuote } from '@/lib/clients/quote'
import { esc, withBrandFont } from '@/lib/clients/proposal'

export const dynamic = 'force-dynamic'

const HEADERS = {
  'Content-Type': 'text/html; charset=utf-8',
  'Cache-Control': 'private, no-store',
  'X-Robots-Tag': 'noindex, nofollow',
}

/** 열리면 바로 인쇄 창을 띄운다. 접힌 내역(details)은 펼친다 */
const PRINT_TAGS = `<style>@page{size:A4;margin:18mm 16mm}
@media print{html,body{-webkit-print-color-adjust:exact;print-color-adjust:exact}.nm-quote-page{break-before:page}}
.nm-quote-page{background:#fff;padding:24px 0}</style>
<script>window.addEventListener('load',function(){document.querySelectorAll('details').forEach(function(d){d.open=true});setTimeout(function(){window.print()},400)})</script>`

/**
 * 업체 제안서·견적서 인쇄. docs=both(함께) | proposal | quote. version=N 이면 그 버전을 인쇄한다(없으면 최신).
 * 제안서는 저장된 HTML 그대로(인쇄 CSS 는 제안서 자신의 것), 견적서는 A4 양식으로 뒤에 새 쪽으로 붙인다.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session?.user) return new Response('로그인이 필요합니다.', { status: 401 })

  const client = await getClient(Number((await params).id))
  if (!client) return new Response('없는 업체', { status: 404 })

  const sp = new URL(req.url).searchParams
  const docs = sp.get('docs') ?? 'both'
  let suffix = ''
  if (sp.get('version')) {
    const v = await getVersion(client.id, Number(sp.get('version')))
    if (!v) return new Response('없는 버전', { status: 404 })
    client.proposalHtml = v.proposalHtml
    client.quote = v.quote
    suffix = ` v${v.no}${client.finalized?.version === v.no ? ' 최종본' : ''}`
  }
  const quote = `<div class="nm-quote-page">${renderQuote(client.quote, client)}</div>`
  const quoteHead = `<link rel="stylesheet" href="${PRETENDARD_CSS}"><style>${QUOTE_CSS}</style>`

  let html: string
  if (docs === 'quote' || !client.proposalHtml) {
    html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>${esc(client.name)} 견적서</title>${quoteHead}${PRINT_TAGS}
<style>body{margin:0}.nm-quote-page{break-before:auto}</style></head><body>${quote}</body></html>`
  } else {
    html = withBrandFont(client.proposalHtml)
    const head = docs === 'both' ? `${quoteHead}${PRINT_TAGS}` : PRINT_TAGS
    html = /<\/head>/i.test(html) ? html.replace(/<\/head>/i, () => `${head}</head>`) : head + html
    if (docs === 'both') {
      html = /<\/body>/i.test(html) ? html.replace(/<\/body>(?![\s\S]*<\/body>)/i, () => `${quote}</body>`) : html + quote
    }
  }
  if (suffix) {
    // PDF 로 저장할 때 파일 이름이 된다
    const label = docs === 'quote' || !client.proposalHtml ? '견적서' : docs === 'proposal' ? '제안서' : '제안서·견적서'
    const title = `<title>${esc(`${client.name} ${label}${suffix}`)}</title>`
    html = /<title>[\s\S]*?<\/title>/i.test(html) ? html.replace(/<title>[\s\S]*?<\/title>/i, () => title) : title + html
  }
  return new Response(html, { headers: HEADERS })
}
