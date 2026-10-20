import { after } from 'next/server'
import { getSessionFrom, isAdmin } from '@/lib/admin'
import { getClient } from '@/lib/clients/table'
import { addCard, readCard, MAX_CARD_BYTES, MAX_CARDS_PER_UPLOAD } from '@/lib/clients/cards'
import { researchProfile, startProfile } from '@/lib/clients/profile'
import { sniffImage } from '@/lib/quote-photos'
import { notifySbworks } from '@/lib/sbworks'

export const dynamic = 'force-dynamic'
/** 명함 읽기와 업체 조사가 응답 뒤(after)에 이 시간 안에서 돈다 */
export const maxDuration = 300

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } })

/**
 * 명함 추가 (여러 장). multipart: cards(사진 여러 장), cardText(사진 대신 붙여 넣은 명함 글), research(1 이면 명함을 읽은 뒤 업체 조사), hint.
 * 사진마다 명함 한 장으로 저장하고, 응답 뒤에 한 장씩 읽어 담당자·직함을 저장한다.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFrom(req.headers)
  if (!session?.user || !isAdmin(session.user)) return json({ error: '로그인이 필요합니다.' }, 401)
  const client = await getClient(Number((await params).id))
  if (!client) return json({ error: '업체를 찾을 수 없습니다.' }, 404)

  const form = await req.formData().catch(() => null)
  if (!form) return json({ error: '명함 사진이 너무 큽니다. 한 번에 몇 장씩 나눠 올려 주세요.' }, 413)
  const files = form.getAll('cards').filter((f): f is File => f instanceof File && f.size > 0)
  if (files.length > MAX_CARDS_PER_UPLOAD) return json({ error: `명함은 한 번에 ${MAX_CARDS_PER_UPLOAD}장까지 올릴 수 있습니다.` }, 400)
  const images: { mime: string; data: Buffer }[] = []
  for (const f of files) {
    if (f.size > MAX_CARD_BYTES) return json({ error: '명함 사진 한 장이 4MB를 넘습니다.' }, 413)
    const data = Buffer.from(await f.arrayBuffer())
    const mime = sniffImage(data)
    if (!mime) return json({ error: 'JPG, PNG, WEBP 사진만 올릴 수 있습니다.' }, 415)
    images.push({ mime, data })
  }
  const cardText = String(form.get('cardText') ?? '').trim().slice(0, 4000)
  const research = form.get('research') === '1'
  const hint = String(form.get('hint') ?? '').trim().slice(0, 2000)

  const ids: number[] = []
  for (const image of images) ids.push(await addCard(client.id, { text: '', image }))
  if (cardText) ids.push(await addCard(client.id, { text: cardText, image: null }))
  if (!ids.length && !research) return json({ error: '명함 사진이나 명함 글을 넣어 주세요.' }, 400)
  if (research) await startProfile(client.id, hint)

  after(async () => {
    await Promise.all(ids.map((id) => readCard(client.id, id)))
    if (ids.length) await notifySbworks(client.id, 'contacts')
    if (research) {
      await researchProfile(client.id)
      await notifySbworks(client.id, 'profile')
    }
  })
  return json({ ok: true, cardIds: ids, research })
}
