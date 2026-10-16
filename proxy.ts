import { NextResponse, type NextRequest } from 'next/server'
import { KKT_COOKIE, hasKktAccess } from '@/lib/kkt-access'
import { getSessionFrom, isAdmin } from '@/lib/admin'
import { getMembership } from '@/lib/portal/members'
import { KKT_CLIENT } from '@/lib/clients/seed-kkt'
import { hasPortalAccess, portalCookieName } from '@/lib/clients/portal'
import { getClientBySlug } from '@/lib/clients/table'

const KKT_KOREAN_PATH = '/금강변압기'

function decodedPath(pathname: string): string {
  try {
    return decodeURIComponent(pathname)
  } catch {
    return pathname
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 금강변압기 제출 자료의 이미지·영상은 비밀번호를 통과한 사람에게만 내준다 (lib/kkt-access.ts).
  // 관리자는 업체 관리(제안서 탭·인쇄)에서, 금강변압기 관계자는 협력업체 포털에서 같은 이미지·영상을 쓴다.
  if (pathname.startsWith('/kkt-assets/')) {
    if (await hasKktAccess(request.cookies.get(KKT_COOKIE)?.value)) return NextResponse.next()
    const session = await getSessionFrom(request.headers)
    if (session?.user && isAdmin(session.user)) return NextResponse.next()
    if (session?.user) {
      const m = await getMembership(session.user.id).catch(() => null)
      if (m?.status === 'approved' && m.clientName === KKT_CLIENT.name) return NextResponse.next()
    }
    return new NextResponse('Not Found', { status: 404, headers: { 'X-Robots-Tag': 'noindex, nofollow' } })
  }

  // 업체 사진(/client-assets/<업체 주소>/)은 그 업체 링크 쿠키가 있거나, 관리자이거나, 승인된 그 업체 관계자일 때만 내준다
  if (pathname.startsWith('/client-assets/')) {
    const slug = pathname.split('/')[2] ?? ''
    if (slug && (await hasPortalAccess(slug, request.cookies.get(portalCookieName(slug))?.value))) return NextResponse.next()
    const session = await getSessionFrom(request.headers)
    if (session?.user && isAdmin(session.user)) return NextResponse.next()
    if (session?.user && slug) {
      const m = await getMembership(session.user.id).catch(() => null)
      if (m?.status === 'approved') {
        const c = await getClientBySlug(slug).catch(() => null)
        if (c && c.id === m.clientId) return NextResponse.next()
      }
    }
    return new NextResponse('Not Found', { status: 404, headers: { 'X-Robots-Tag': 'noindex, nofollow' } })
  }

  // /금강변압기 는 앱·메신저마다 퍼센트 인코딩 대소문자나 방식이 달라 next.config rewrite 로는
  // 놓치는 경우가 있다. 디코딩한 경로로 비교해 /kkt 로 넘긴다.
  if (decodedPath(pathname).normalize('NFC') === KKT_KOREAN_PATH) {
    const url = request.nextUrl.clone()
    url.pathname = '/kkt'
    return NextResponse.rewrite(url)
  }

  return NextResponse.next()
}

export const config = {
  // 정적 파일·API 는 건너뛴다. 한글 경로는 퍼센트 인코딩되어 들어오므로 '%' 로 시작하는 경로만 본다.
  matcher: ['/kkt-assets/:path*', '/client-assets/:path*', '/(%.*)'],
}
