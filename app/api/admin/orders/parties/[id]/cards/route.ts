import { getSessionFrom, isAdmin } from '@/lib/admin'
import { MAX_CARD_BYTES, cardErrorText, readCardContent } from '@/lib/clients/cards'
import { getPartyData, listPartyCards, savePartyCard } from '@/lib/orders/party-cards'
import { sniffImage } from '@/lib/quote-photos'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } })

/** 발주 업체 명함 목록 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFrom(req.headers)
  if (!session?.user || !isAdmin(session.user)) return json({ error: '로그인이 필요합니다.' }, 401)
  return json({ cards: await listPartyCards(Number((await params).id)) })
}

/** 명함 사진 한 장(multipart card) → 읽어서 저장하고 담당자·연락처를 업체 정보에 넣음 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFrom(req.headers)
  if (!session?.user || !isAdmin(session.user)) return json({ error: '로그인이 필요합니다.' }, 401)
  const partyId = Number((await params).id)
  if (!(await getPartyData(partyId))) return json({ error: '업체를 찾을 수 없습니다.' }, 404)
  const form = await req.formData().catch(() => null)
  const f = form?.get('card')
  if (!(f instanceof File) || !f.size) return json({ error: '명함 사진을 넣어 주세요.' }, 400)
  if (f.size > MAX_CARD_BYTES) return json({ error: '명함 사진이 4MB를 넘습니다.' }, 413)
  const data = Buffer.from(await f.arrayBuffer())
  const mime = sniffImage(data)
  if (!mime) return json({ error: 'JPG, PNG, WEBP 사진만 올릴 수 있습니다.' }, 415)
  try {
    const contact = await readCardContent({ text: '', image: { mime, data } })
    const party = await savePartyCard(partyId, { mime, data }, contact)
    return json({ ok: true, contact, party, cards: await listPartyCards(partyId) })
  } catch (e) {
    console.error('[po-cards] 명함 읽기 실패', e)
    return json({ error: cardErrorText(e) }, 502)
  }
}
