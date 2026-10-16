import { approvedClientId } from '@/lib/portal/access'
import { readPhoto } from '@/lib/portal/progress'

export const dynamic = 'force-dynamic'

/** 협력업체 포털: 자기 업체의 공개된 일일 보고 사진만 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const clientId = await approvedClientId(req.headers)
  if (!clientId) return new Response('로그인이 필요합니다.', { status: 401 })
  const id = Number((await params).id)
  if (!Number.isInteger(id) || id <= 0) return new Response('잘못된 요청', { status: 400 })
  const photo = await readPhoto(id, clientId)
  if (!photo) return new Response('없는 사진', { status: 404 })
  return new Response(new Uint8Array(photo.data), {
    headers: { 'Content-Type': photo.mime, 'Cache-Control': 'private, max-age=86400', 'X-Robots-Tag': 'noindex, nofollow' },
  })
}
