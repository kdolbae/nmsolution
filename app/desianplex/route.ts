import { portalGet, portalPost } from '@/lib/clients/portal-route'

// 생각공장 데시앙플렉스 관리사무소 업체용 링크: nm-solution.co.kr/desianplex (업체 관리에서 주소 'desianplex'로 등록된 업체)
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export function GET(req: Request) {
  return portalGet(req, 'desianplex')
}

export function POST(req: Request) {
  return portalPost(req, 'desianplex')
}
