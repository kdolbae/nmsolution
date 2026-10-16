import { portalGet, portalPost } from '@/lib/clients/portal-route'

// 신일공업(주) 업체용 링크: nm-solution.co.kr/sinil (업체 관리에서 주소 'sinil'로 등록된 업체)
export const dynamic = 'force-dynamic'

export function GET(req: Request) {
  return portalGet(req, 'sinil')
}

export function POST(req: Request) {
  return portalPost(req, 'sinil')
}
