import { portalGet, portalPost } from '@/lib/clients/portal-route'

// 어드리밍 업체용 링크: nm-solution.co.kr/adreaming (업체 관리에서 주소 'adreaming'으로 등록된 업체)
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export function GET(req: Request) {
  return portalGet(req, 'adreaming')
}

export function POST(req: Request) {
  return portalPost(req, 'adreaming')
}
