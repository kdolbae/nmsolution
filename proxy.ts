import { NextResponse, type NextRequest } from 'next/server'
import { KKT_COOKIE, hasKktAccess } from '@/lib/kkt-access'

// 금강변압기 제출 자료의 이미지·영상은 비밀번호를 통과한 사람에게만 내준다 (lib/kkt-access.ts)
export async function proxy(request: NextRequest) {
  if (await hasKktAccess(request.cookies.get(KKT_COOKIE)?.value)) return NextResponse.next()
  return new NextResponse('Not Found', { status: 404, headers: { 'X-Robots-Tag': 'noindex, nofollow' } })
}

export const config = {
  matcher: '/kkt-assets/:path*',
}
