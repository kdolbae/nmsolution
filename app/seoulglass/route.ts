import { portalGet, portalPost } from '@/lib/clients/portal-route'

// 서울 차량 유리 교체 상가 업체용 링크: nm-solution.co.kr/seoulglass (업체 관리에서 주소 'seoulglass'로 등록된 업체)
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export function GET(req: Request) {
  return portalGet(req, 'seoulglass')
}

export function POST(req: Request) {
  return portalPost(req, 'seoulglass')
}
