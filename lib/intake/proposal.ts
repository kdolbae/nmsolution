import { logoSvg } from '@/lib/brand-logo'
import { PROPOSAL_CSS, esc, type SiteContent } from '@/lib/clients/proposal'
import { PRETENDARD_CSS } from '@/lib/clients/quote'
import type { IntakeDraft, IntakeFile } from './table'

/** 제안서에 넣는 사진 주소. 열쇠(key)가 맞아야 열리므로 로그인 없이 보는 업체 페이지에서도 뜬다 */
export function intakeFileUrl(f: Pick<IntakeFile, 'id' | 'key'>) {
  return `/api/intake-file/${f.id}/${f.key}`
}

function lines(text: string) {
  return esc(text)
    .split(/\n{2,}/)
    .map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`)
    .join('\n')
}

/**
 * AI 접수 초안으로 만드는 공사제안서. 기본 제안서(lib/clients/proposal.ts)와 같은 틀·스타일에
 * 현황(사진)·제안 방향·작업 범위·순서·기간·제외 사항을 채운다. 관리자가 제안서 탭에서 그대로 고칠 수 있다.
 */
export function intakeProposalHtml(
  d: IntakeDraft['proposal'],
  client: { name: string; siteAddress?: string | null },
  files: IntakeFile[],
  settings: SiteContent['settings'],
): string {
  const photos = d.photoIds.map((id) => files.find((f) => f.id === id)).filter((f): f is IntakeFile => !!f)
  const date = new Date(Date.now() + 9 * 3600 * 1000)
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
${PROPOSAL_CSS}
.photos{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:14px;margin-top:20px}
.photos figure{margin:0;border:1px solid var(--line);background:#fff}
.photos img{width:100%;aspect-ratio:4/3;object-fit:cover}
.photos figcaption{font-size:13.5px;color:#3d4756;padding:8px 10px}
ul.plain{margin:0;padding-left:1.2em}
ul.plain li{margin:4px 0}
</style>
</head>
<body>
<div class="hero">
  <div class="wrap">
    <div class="logo" style="height:40px;margin-bottom:28px">${logoSvg('horizontal', { ink: '#FFFFFF', height: '100%' })}</div>
    <div class="kicker">Proposal · 공사제안서</div>
    <h1>${esc(client.name)}<br>${esc(d.title)}</h1>
    <p>${esc(d.oneLine)}</p>
    <dl class="meta">
      <div><dt>발주처</dt><dd>${esc(client.name)}</dd></div>
      <div><dt>공사 장소</dt><dd>${esc(client.siteAddress || '협의')}</dd></div>
      <div><dt>제안사</dt><dd>${esc(settings.companyName)}</dd></div>
      <div><dt>제안일</dt><dd>${date.getFullYear()}. ${date.getMonth() + 1}. ${date.getDate()}.</dd></div>
    </dl>
  </div>
</div>

<section id="current">
  <div class="wrap">
    <div class="kicker">01 · Current</div>
    <h2>현황</h2>
    <div class="lead">${lines(d.current)}</div>
${
  photos.length
    ? `    <div class="photos">
${photos.map((f) => `      <figure><img src="${intakeFileUrl(f)}" alt="${esc(f.caption || f.name)}" loading="lazy">${f.caption ? `<figcaption>${esc(f.caption)}</figcaption>` : ''}</figure>`).join('\n')}
    </div>`
    : ''
}
  </div>
</section>

<section id="direction" class="alt">
  <div class="wrap">
    <div class="kicker">02 · Proposal</div>
    <h2>제안 방향</h2>
    <div class="lead">${lines(d.direction)}</div>
  </div>
</section>

<section id="scope">
  <div class="wrap">
    <div class="kicker">03 · Scope of Work</div>
    <h2>작업 범위와 순서</h2>
    <table>
      <tbody>
        <tr><th>공사명</th><td>${esc(d.title)}</td></tr>
        <tr><th>작업 범위</th><td><ul class="plain">${d.scope.map((s) => `<li>${esc(s)}</li>`).join('')}</ul></td></tr>
        <tr><th>공사 기간</th><td>${esc(d.period)}</td></tr>
        <tr><th>제외 사항</th><td>${d.excluded.length ? `<ul class="plain">${d.excluded.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>` : '없음'}</td></tr>
      </tbody>
    </table>
${
  d.steps.length
    ? `    <ol class="steps" style="margin-top:24px;grid-template-columns:repeat(${Math.min(5, Math.max(1, d.steps.length))},1fr)">
${d.steps.map((st, i) => `      <li><div class="t">STEP ${String(i + 1).padStart(2, '0')}</div><h3>${esc(st.title)}</h3><p>${esc(st.text)}</p></li>`).join('\n')}
    </ol>`
    : ''
}
    <p style="margin-top:16px" class="lead">공종별 내역과 금액은 함께 드리는 견적서를 참고 바랍니다.</p>
  </div>
</section>

<footer>
  <div class="wrap">
    <b>${esc(settings.companyName)}</b><br>
    ${esc(settings.address)}<br>
    <span class="phone">${esc(settings.phoneMain)}</span> · ${esc(settings.phoneMobile)}
  </div>
</footer>
</body>
</html>`
}
