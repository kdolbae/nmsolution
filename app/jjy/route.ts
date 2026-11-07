import { portalGet, portalPost } from '@/lib/clients/portal-route'

// 정준영 업체용 링크: nm-solution.co.kr/jjy (업체 관리에서 주소 'jjy'로 등록된 업체)
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export function GET(req: Request) {
  return portalGet(req, 'jjy')
}

export function POST(req: Request) {
  return portalPost(req, 'jjy')
}
