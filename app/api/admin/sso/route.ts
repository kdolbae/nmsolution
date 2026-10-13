import { HUB_COOKIE, hubCookie, ssoReady, verifySsoToken } from '@/lib/sso'

export const dynamic = 'force-dynamic'

// sbworks.bond 관리 웹에서 넘어오는 로그인 (lib/sso.ts)
//
// GET    /api/admin/sso#t=<토큰>&next=/admin/...
//        토큰은 주소의 # 뒤에 있어 서버·로그·Referer 로 가지 않는다. 작은 화면이 읽어 아래 POST 로 넘긴다.
// POST   { token, next } → 확인되면 nm_hub 쿠키를 주고 { next } 를 돌려준다.
// DELETE 로그아웃 때 nm_hub 쿠키를 지운다.

const PAGE = `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow">
<title>엔엠솔루션 관리 · 로그인 중</title>
<style>body{font-family:system-ui,sans-serif;margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;color:#334;padding:24px;text-align:center;line-height:1.7}</style>
</head><body><div id="m">관리 화면을 여는 중…</div>
<script>
(function () {
  var h = new URLSearchParams(location.hash.slice(1));
  var t = h.get('t'), next = h.get('next') || '/admin';
  history.replaceState(null, '', location.pathname);
  var m = document.getElementById('m');
  if (!t) { m.textContent = '로그인 정보가 없습니다. 관리 웹에서 다시 열어 주세요.'; return; }
  fetch(location.pathname, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: t, next: next }), credentials: 'same-origin' })
    .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
    .then(function (r) { if (r.ok) location.replace(r.j.next); else m.textContent = r.j.error || '로그인하지 못했습니다.'; })
    .catch(function () { m.textContent = '로그인하지 못했습니다. 새로고침해 주세요.'; });
})();
</script></body></html>`

const json = (o: unknown, status = 200, extra?: HeadersInit) =>
  new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extra } })

export function GET() {
  return new Response(PAGE, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Robots-Tag': 'noindex, nofollow' },
  })
}

export async function POST(req: Request) {
  if (!ssoReady()) return json({ error: '이 사이트에 관리 웹 로그인이 설정되지 않았습니다(SITE_SSO_PUBLIC_KEY).' }, 500)
  let b: { token?: string; next?: string }
  try {
    b = await req.json()
  } catch {
    return json({ error: '요청 형식 오류' }, 400)
  }
  const claims = await verifySsoToken(String(b.token || ''))
  if (!claims) return json({ error: '로그인 정보가 맞지 않거나 시간이 지났습니다. 관리 웹에서 다시 열어 주세요.' }, 401)
  const c = await hubCookie(claims)
  if (!c) return json({ error: '이 사이트에 관리 웹 로그인이 설정되지 않았습니다(BETTER_AUTH_SECRET).' }, 500)
  const next = typeof b.next === 'string' && /^\/admin(\/[\w\-./?=&%]*)?$/.test(b.next) && !b.next.includes('//') ? b.next : '/admin'
  return json({ next }, 200, { 'Set-Cookie': `${HUB_COOKIE}=${c.value}; Path=/; Max-Age=${c.maxAge}; HttpOnly; Secure; SameSite=Lax` })
}

export function DELETE() {
  return json({ ok: true }, 200, { 'Set-Cookie': `${HUB_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax` })
}
