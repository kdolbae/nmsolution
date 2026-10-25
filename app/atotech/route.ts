import { portalGet, portalPost } from '@/lib/clients/portal-route'

// 아토텍코리아 업체용 링크: nm-solution.co.kr/atotech (업체 관리에서 주소 'atotech'으로 등록된 업체)
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export function GET(req: Request) {
  return portalGet(req, 'atotech')
}

export function POST(req: Request) {
  return portalPost(req, 'atotech')
}
