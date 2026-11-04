import { portalGet, portalPost } from '@/lib/clients/portal-route'

// 가나티엠 업체용 링크: nm-solution.co.kr/ganatm (업체 관리에서 주소 'ganatm'으로 등록된 업체)
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export function GET(req: Request) {
  return portalGet(req, 'ganatm')
}

export function POST(req: Request) {
  return portalPost(req, 'ganatm')
}
