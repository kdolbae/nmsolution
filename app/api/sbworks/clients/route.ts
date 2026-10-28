import { listClients } from '@/lib/clients/table'
import { checkKey, clientSummary, json, SOURCE_NAME } from '@/lib/sbworks'

export const dynamic = 'force-dynamic'

/** 업체 목록. ?since=ISO시각 을 주면 그 뒤에 업체 정보·견적·제안서·공정이 바뀐 업체만 */
export async function GET(req: Request) {
  const denied = checkKey(req)
  if (denied) return denied
  const since = new URL(req.url).searchParams.get('since')
  const sinceAt = since ? new Date(since) : null
  if (sinceAt && Number.isNaN(sinceAt.getTime())) return json({ error: 'since 는 ISO 시각으로 보내야 함.' }, 400)
  const all = await Promise.all((await listClients()).map(clientSummary))
  const clients = sinceAt
    ? all.filter((c) => new Date(c.updatedAt) > sinceAt || (c.schedule.updatedAt && new Date(c.schedule.updatedAt) > sinceAt))
    : all
  return json({ source: SOURCE_NAME, at: new Date().toISOString(), clients })
}
