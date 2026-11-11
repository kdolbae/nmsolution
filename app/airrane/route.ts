import { portalGet, portalPost } from '@/lib/clients/portal-route'

// (주)에어레인 업체용 링크: nm-solution.co.kr/airrane (업체 관리에서 주소 'airrane'로 등록된 업체)
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export function GET(req: Request) {
  return portalGet(req, 'airrane')
}

export function POST(req: Request) {
  return portalPost(req, 'airrane')
}
