import { portalGet, portalPost } from '@/lib/clients/portal-route'

// 금강변압기 업체용 링크: nm-solution.co.kr/kkt (업체 관리에서 주소 'kkt'로 등록된 업체). /금강변압기 도 proxy.ts 가 여기로 넘긴다
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export function GET(req: Request) {
  return portalGet(req, 'kkt')
}

export function POST(req: Request) {
  return portalPost(req, 'kkt')
}
