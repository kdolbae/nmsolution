import { getSessionFrom, isAdmin } from '@/lib/admin'
import { listPartyCards, partyCardImage, removePartyCard } from '@/lib/orders/party-cards'

export const dynamic = 'force-dynamic'

type P = { params: Promise<{ id: string; card: string }> }

/** 명함 사진 */
export async function GET(req: Request, { params }: P) {
  const session = await getSessionFrom(req.headers)
  if (!session?.user || !isAdmin(session.user)) return new Response('Unauthorized', { status: 401 })
  const { id, card } = await params
  const img = await partyCardImage(Number(id), Number(card))
  if (!img) return new Response('Not found', { status: 404 })
  return new Response(new Uint8Array(img.data), { headers: { 'Content-Type': img.mime, 'Cache-Control': 'private, no-store' } })
}

/** 명함 삭제(업체 정보는 그대로) */
export async function DELETE(req: Request, { params }: P) {
  const session = await getSessionFrom(req.headers)
  if (!session?.user || !isAdmin(session.user)) return Response.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  const { id, card } = await params
  await removePartyCard(Number(id), Number(card))
  return Response.json({ cards: await listPartyCards(Number(id)) }, { headers: { 'Cache-Control': 'no-store' } })
}
