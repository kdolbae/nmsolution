import chromium from '@sparticuz/chromium'
import puppeteer from 'puppeteer-core'

/**
 * 업체 제안서·견적서 HTML 을 서버에서 PDF 파일로 만든다 (인쇄 창 없이 바로 내려받기).
 *
 * - Vercel 에서는 @sparticuz/chromium, 로컬에서는 CHROME_PATH 의 크롬을 쓴다.
 * - 사진(/client-assets, /kkt-assets)은 proxy.ts 가 쿠키로 막으므로, 요청한 사람의 쿠키를 이 사이트 주소에만 붙여 불러온다.
 * - 쪽 크기·여백은 문서의 @page 를 따른다. 접힌 내역(details)은 펼치고, 늦게 불러오는 사진은 다 불러온 뒤 찍는다.
 */
export async function htmlToPdf(html: string, req: Request): Promise<Uint8Array> {
  const origin = new URL(req.url).origin
  const executablePath = process.env.VERCEL ? await chromium.executablePath() : process.env.CHROME_PATH
  if (!executablePath) throw new Error('CHROME_PATH 가 없음')
  const browser = await puppeteer.launch({
    executablePath,
    args: process.env.VERCEL ? chromium.args : ['--no-sandbox'],
    headless: true,
  })
  try {
    const page = await browser.newPage()
    const cookies = parseCookies(req.headers.get('cookie'))
    // __Secure- 쿠키(로그인)는 secure 표시가 있어야 받아 준다. 못 넣는 쿠키는 건너뛴다
    const { hostname, protocol } = new URL(origin)
    for (const [name, value] of cookies) {
      await browser.setCookie({ name, value, domain: hostname, path: '/', secure: protocol === 'https:' }).catch(() => {})
    }
    // 인쇄용 HTML 은 열리자마자 인쇄 창을 띄우므로 막는다
    await page.evaluateOnNewDocument(() => {
      window.print = () => {}
    })
    await page.setViewport({ width: 1200, height: 1600 })
    // 이 사이트 주소에서 연 문서여야 SameSite 쿠키가 사진 요청에 실린다
    await page.goto(`${origin}/robots.txt`, { waitUntil: 'domcontentloaded' })
    await page.setContent(withBase(html, origin), { waitUntil: 'load', timeout: 45_000 })
    await page.waitForNetworkIdle({ idleTime: 500, timeout: 20_000 }).catch(() => {})
    await page.evaluate(async () => {
      document.querySelectorAll('details').forEach((d) => (d.open = true))
      const imgs = Array.from(document.images)
      imgs.forEach((i) => (i.loading = 'eager'))
      await Promise.all(
        imgs.map((i) => (i.complete ? null : new Promise((r) => { i.addEventListener('load', r, { once: true }); i.addEventListener('error', r, { once: true }) }))),
      )
      await document.fonts.ready
    })
    return await page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true })
  } finally {
    await browser.close()
  }
}

/** 첨부 파일 응답. 한글 파일 이름은 filename* 로 보낸다 */
export function pdfResponse(pdf: Uint8Array, fileName: string): Response {
  const ascii = fileName.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_')
  return new Response(Buffer.from(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      'Cache-Control': 'private, no-store',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  })
}

function withBase(html: string, origin: string): string {
  const base = `<base href="${origin}/">`
  return /<head[^>]*>/i.test(html) ? html.replace(/<head[^>]*>/i, (m) => m + base) : base + html
}

function parseCookies(header: string | null): [string, string][] {
  if (!header) return []
  return header
    .split(';')
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => {
      const i = p.indexOf('=')
      return [p.slice(0, i), p.slice(i + 1)] as [string, string]
    })
    .filter(([n]) => n)
}
