import { portalGet, portalPost } from '@/lib/clients/portal-route'

// 데코페이브 업체용 링크: nm-solution.co.kr/decopave (업체 관리에서 주소 'decopave'으로 등록된 업체)
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export function GET(req: Request) {
  return portalGet(req, 'decopave')
}

export function POST(req: Request) {
  return portalPost(req, 'decopave')
}
