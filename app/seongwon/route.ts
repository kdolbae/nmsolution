import { portalGet, portalPost } from '@/lib/clients/portal-route'

// 성원냉동기계 업체용 링크: nm-solution.co.kr/seongwon (업체 관리에서 주소 'seongwon'으로 등록된 업체)
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export function GET(req: Request) {
  return portalGet(req, 'seongwon')
}

export function POST(req: Request) {
  return portalPost(req, 'seongwon')
}
