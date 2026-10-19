import type { AboutContent, HomeContent, ServicesContent, SettingsContent } from '@/lib/content/defaults'
import { PRETENDARD_CSS } from './quote'
import { logoSvg } from '@/lib/brand-logo'

/**
 * 업체별 제안서 HTML.
 *
 * 제안서는 완전한 HTML 문서 한 장으로 저장한다(영상·이미지·스크립트 포함). 관리자 화면에서는
 * iframe 으로 그대로 보여 주고, 편집 모드에서는 화면에서 바로 글을 고친다.
 * 폰트는 디자인 규격(brand/디자인규격.md)의 Pretendard 하나로 고정한다.
 */

const FONT_STACK = 'Pretendard,-apple-system,"Apple SD Gothic Neo","Malgun Gothic",sans-serif'

/** 보여 주거나 인쇄할 때 끼워 넣는 폰트 고정 규칙. 저장할 때는 data-nm-injected 로 골라 뺀다 */
export const BRAND_FONT_TAGS = `<link data-nm-injected rel="stylesheet" href="${PRETENDARD_CSS}">
<style data-nm-injected>html body,html body *:not(svg):not(svg *){font-family:${FONT_STACK}!important}
.mono,.n,td.n,th.n{font-variant-numeric:tabular-nums}</style>`

/** 예전 'NM' 네모 표시를 공식 로고로 바꾼다 (로고 적용 전에 저장된 제안서용) */
export function withBrandLogo(html: string): string {
  return html.replace(
    /<span class="mark">NM<\/span>\s*엔엠솔루션/g,
    () => `<span style="display:inline-block;height:26px">${logoSvg('horizontal', { height: '100%' })}</span>`,
  )
}

export function withBrandFont(html: string): string {
  html = withBrandLogo(html)
  if (/<\/head>/i.test(html)) return html.replace(/<\/head>/i, () => `${BRAND_FONT_TAGS}\n</head>`)
  return `${BRAND_FONT_TAGS}\n${html}`
}

/** 업체명 등을 HTML 에 넣을 때 */
export function esc(s: unknown) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}

type SiteContent = {
  home: HomeContent
  services: ServicesContent
  about: AboutContent
  settings: SettingsContent
}

function paragraphs(text: string) {
  return text
    .split(/\n{2,}/)
    .map((p) => `<p>${esc(p).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>')}</p>`)
    .join('\n')
}

/** 새 업체의 기본 제안서. 홈페이지 내용(회사소개·사업 범위·진행 절차)으로 만들고, 제안 내용 칸은 비워 둔다 */
export function defaultProposalHtml(client: { name: string; siteAddress?: string | null }, c: SiteContent): string {
  const s = c.settings
  const factory = c.services.items.find((i) => i.slug === 'factory')
  const year = new Date().getFullYear()
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow, noarchive">
<title>${esc(client.name)} 공사제안서 | 엔엠솔루션</title>
<link rel="icon" href="/icon.svg" type="image/svg+xml">
<link rel="stylesheet" href="${PRETENDARD_CSS}">
<style>
:root{--navy:#0f2a44;--accent:#e8742a;--ink:#1d2430;--muted:#5d6878;--line:#dde3ea;--bg:#f4f6f9;--max:1100px}
*{box-sizing:border-box}
body{margin:0;font-family:${FONT_STACK};color:var(--ink);font-size:16px;line-height:1.7;word-break:keep-all;letter-spacing:-.01em;background:#fff}
img,video{max-width:100%;display:block}
h1,h2,h3{letter-spacing:-.02em;color:var(--navy)}
.wrap{max-width:var(--max);margin:0 auto;padding:0 24px}
.kicker{font-size:12px;font-weight:600;letter-spacing:.2em;text-transform:uppercase;color:var(--accent)}
.hero{background:var(--navy);color:#fff;padding:72px 0 64px}
.hero h1{color:#fff;font-size:clamp(30px,5vw,52px);font-weight:800;line-height:1.2;margin:14px 0 16px}
.hero p{color:#cfd8e4;font-size:17px;margin:0;max-width:40em}
.meta{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:1px;background:rgba(255,255,255,.15);margin-top:36px}
.meta>div{background:var(--navy);padding:14px 16px}
.meta dt{font-size:12px;color:#9fb3c8}
.meta dd{margin:4px 0 0;font-weight:700}
section{padding:64px 0;border-bottom:1px solid var(--line)}
section.alt{background:var(--bg)}
h2{font-size:clamp(24px,3.4vw,34px);font-weight:700;line-height:1.3;margin:8px 0 14px}
h3{font-size:19px;font-weight:600;margin:0 0 6px}
p{margin:0 0 12px}
.lead{color:#3d4756;max-width:46em}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:24px}
.grid4{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
@media(max-width:860px){.grid2{grid-template-columns:1fr}.grid4{grid-template-columns:1fr 1fr}}
@media(max-width:560px){.grid4{grid-template-columns:1fr}}
.card{background:#fff;border:1px solid var(--line);overflow:hidden}
.card img{width:100%;aspect-ratio:16/10;object-fit:cover}
.card .body{padding:16px 18px}
.card .no{font-size:12px;font-weight:600;color:var(--accent)}
.card p{font-size:14.5px;color:#3d4756;margin:0}
.tags{display:flex;flex-wrap:wrap;gap:6px;margin-top:20px}
.tags span{font-size:13px;border:1px solid var(--line);background:#fff;padding:3px 10px}
.steps{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(5,1fr);gap:12px}
@media(max-width:860px){.steps{grid-template-columns:1fr}}
.steps li{border-top:2px solid var(--navy);padding-top:12px}
.steps .t{font-size:12px;font-weight:600;color:var(--accent)}
.steps p{font-size:14px;color:#3d4756}
.ceo{display:grid;grid-template-columns:220px 1fr;gap:32px;align-items:start}
@media(max-width:700px){.ceo{grid-template-columns:1fr}}
.ceo img{width:100%;aspect-ratio:3/4;object-fit:cover}
.box{border-left:3px solid var(--accent);background:#fff;padding:18px 22px}
table{border-collapse:collapse;width:100%;font-size:15px}
th,td{border-bottom:1px solid var(--line);padding:10px 12px;text-align:left;vertical-align:top}
th{width:9em;background:var(--bg);font-weight:600;white-space:nowrap}
footer{background:var(--navy);color:#cfd8e4;padding:40px 0;font-size:14px}
footer b{color:#fff;font-size:18px}
footer .phone{font-size:24px;font-weight:700;color:#fff}
@media print{section{padding:24px 0}.hero{padding:32px 0}.card,.steps li,.ceo{break-inside:avoid}}
</style>
</head>
<body>
<div class="hero">
  <div class="wrap">
    <div class="logo" style="height:40px;margin-bottom:28px">${logoSvg('horizontal', { ink: '#FFFFFF', height: '100%' })}</div>
    <div class="kicker">Proposal · 공사제안서</div>
    <h1>${esc(client.name)}<br>공사제안서</h1>
    <p>[제안 공사명과 한 줄 요약을 적어 주세요.]</p>
    <dl class="meta">
      <div><dt>발주처</dt><dd>${esc(client.name)}</dd></div>
      <div><dt>공사 장소</dt><dd>${esc(client.siteAddress || '[현장 주소]')}</dd></div>
      <div><dt>제안사</dt><dd>${esc(s.companyName)}</dd></div>
      <div><dt>제안일</dt><dd>${year}.</dd></div>
    </dl>
  </div>
</div>

<section id="proposal">
  <div class="wrap">
    <div class="kicker">01 · Proposal</div>
    <h2>제안 내용</h2>
    <table>
      <tbody>
        <tr><th>공사명</th><td>[공사명]</td></tr>
        <tr><th>현황</th><td>[현장 상황과 문제점]</td></tr>
        <tr><th>작업 범위</th><td>[작업 범위]</td></tr>
        <tr><th>공사 기간</th><td>[기간]</td></tr>
        <tr><th>제외 사항</th><td>[제외 사항]</td></tr>
      </tbody>
    </table>
    <p style="margin-top:16px" class="lead">공종별 내역과 금액은 함께 드리는 견적서를 참고 바랍니다.</p>
  </div>
</section>

<section id="about" class="alt">
  <div class="wrap">
    <div class="kicker">02 · About</div>
    <h2>${esc(c.about.greetingTitle)}</h2>
    <div class="ceo">
      <img src="${esc(c.about.ceoImage)}" alt="${esc(c.about.ceoTitle)} ${esc(c.about.ceoName)}">
      <div class="lead">${paragraphs(c.about.greetingBody)}
        <p><b>${esc(c.about.ceoTitle)} ${esc(c.about.ceoName)}</b></p>
      </div>
    </div>
  </div>
</section>

<section id="scope">
  <div class="wrap">
    <div class="kicker">03 · Scope of Work</div>
    <h2>${esc(c.home.scope.title).replace(/\n/g, ' ')}</h2>
    <p class="lead">${esc(c.home.scope.description)}</p>
    <div class="grid4" style="margin-top:24px">
${c.home.scope.items
  .map(
    (i) => `      <div class="card"><img src="${esc(i.image)}" alt="${esc(i.title)}"><div class="body"><div class="no">${esc(i.n)}</div><h3>${esc(i.title)}</h3><p>${esc(i.description)}</p></div></div>`,
  )
  .join('\n')}
    </div>
    <div class="tags">${c.home.scope.extras.map((e) => `<span>${esc(e)}</span>`).join('')}</div>
  </div>
</section>
${
  factory?.areasTitle
    ? `
<section id="semiconductor" class="alt">
  <div class="wrap">
    <div class="kicker">04 · Semiconductor</div>
    <div class="grid2">
      <div>
        <h2>${esc(factory.areasTitle).replace(/\n/g, ' ')}</h2>
        <p class="lead">${esc(factory.areasDescription)}</p>
      </div>
      ${factory.areasImage ? `<img src="${esc(factory.areasImage)}" alt="반도체 공장 설비">` : ''}
    </div>
  </div>
</section>`
    : ''
}

<section id="process">
  <div class="wrap">
    <div class="kicker">05 · How We Work</div>
    <h2>진행 절차</h2>
    <p class="lead">${esc(c.home.process.description)}</p>
    <ol class="steps" style="margin-top:24px">
${c.home.process.steps.map((st) => `      <li><div class="t">${esc(st.n)} · ${esc(st.time)}</div><h3>${esc(st.title)}</h3><p>${esc(st.description)}</p></li>`).join('\n')}
    </ol>
  </div>
</section>

<section id="why" class="alt">
  <div class="wrap">
    <div class="kicker">06 · Why NM Solution</div>
    <h2>${esc(c.home.why.title).replace(/\n/g, ' ')}</h2>
    <div class="grid4" style="margin-top:24px">
${c.home.why.items.map((w) => `      <div class="box"><div class="kicker">${esc(w.en)}</div><h3>${esc(w.ko)}</h3><p>${esc(w.description)}</p></div>`).join('\n')}
    </div>
  </div>
</section>

<footer>
  <div class="wrap">
    <div style="height:32px;margin-bottom:14px">${logoSvg('horizontal', { ink: '#FFFFFF', height: '100%' })}</div>
    <b>${esc(s.companyName)}</b><br>
    대표 ${esc(s.ceo)} · ${esc(s.address)}<br>
    <span class="phone">${esc(s.phoneMobile)}</span> · 대표전화 ${esc(s.phoneMain)} · nm-solution.co.kr
  </div>
</footer>
</body>
</html>`
}
