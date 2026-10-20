import { getSessionFrom, isAdmin } from '@/lib/admin'
import { cardImage } from '@/lib/clients/cards'

export const dynamic = 'force-dynamic'

/** 명함 사진 (관리자만) */
export async function GET(req: Request, { params }: { params: Promise<{ id: string; card: string }> }) {
  const session = await getSessionFrom(req.headers)
  if (!session?.user || !isAdmin(session.user)) return new Response('로그인이 필요합니다.', { status: 401 })
  const p = await params
  const img = await cardImage(Number(p.id), Number(p.card))
  if (!img) return new Response('없는 명함', { status: 404 })
  return new Response(new Uint8Array(img.data), { headers: { 'Content-Type': img.mime, 'Cache-Control': 'private, max-age=3600' } })
}
