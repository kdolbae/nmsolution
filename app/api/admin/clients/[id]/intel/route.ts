import { after } from 'next/server'
import { getSessionFrom, isAdmin } from '@/lib/admin'
import { getClient } from '@/lib/clients/table'
import { listCards } from '@/lib/clients/cards'
import { getProfile, researchProfile, startProfile } from '@/lib/clients/profile'
import { notifySbworks } from '@/lib/sbworks'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } })

async function admin(req: Request, params: Promise<{ id: string }>) {
  const session = await getSessionFrom(req.headers)
  if (!session?.user || !isAdmin(session.user)) return { error: json({ error: '로그인이 필요합니다.' }, 401) }
  const client = await getClient(Number((await params).id))
  if (!client) return { error: json({ error: '업체를 찾을 수 없습니다.' }, 404) }
  return { client }
}

/** 명함·업체 프로필 상태 (조사 중일 때 화면이 몇 초마다 다시 읽는다) */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const a = await admin(req, params)
  if ('error' in a) return a.error
  const [cards, profile] = await Promise.all([listCards(a.client.id), getProfile(a.client.id)])
  return json({ cards, profile, contactPerson: a.client.contactPerson, phone: a.client.phone, email: a.client.email })
}

/** 업체 다시 조사. JSON { hint } */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const a = await admin(req, params)
  if ('error' in a) return a.error
  const body = (await req.json().catch(() => ({}))) as { hint?: unknown }
  await startProfile(a.client.id, String(body.hint ?? '').trim().slice(0, 2000))
  after(async () => {
    await researchProfile(a.client.id)
    await notifySbworks(a.client.id, 'profile')
  })
  return json({ ok: true })
}
