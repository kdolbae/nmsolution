import { getClient } from '@/lib/clients/table'
import { getSchedule, listScheduleLog, normalizeSteps, saveSchedule, ScheduleConflict, type ScheduleStep } from '@/lib/clients/schedule'
import { checkKey, clientId, json, notifySbworks } from '@/lib/sbworks'

export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ id: string }> }

async function target(req: Request, ctx: Ctx) {
  const denied = checkKey(req)
  if (denied) return { error: denied }
  const id = clientId((await ctx.params).id)
  if (!id || !(await getClient(id))) return { error: json({ error: '업체를 찾을 수 없음.' }, 404) }
  return { id }
}

async function body(req: Request): Promise<Record<string, unknown> | null> {
  const b = await req.json().catch(() => null)
  return b && typeof b === 'object' && !Array.isArray(b) ? (b as Record<string, unknown>) : null
}

const who = (b: Record<string, unknown>) => `SBworks${b.by ? ` (${String(b.by).trim().slice(0, 60)})` : ''}`

async function save(id: number, steps: ScheduleStep[], b: Record<string, unknown>, summary: string) {
  try {
    const revision = await saveSchedule(id, steps, {
      by: who(b),
      source: 'sbworks',
      summary: String(b.summary ?? '').trim().slice(0, 300) || summary,
      expectedRevision: b.expectedRevision == null ? null : Number(b.expectedRevision),
    })
    await notifySbworks(id, 'schedule')
    return json({ ok: true, revision })
  } catch (e) {
    if (e instanceof ScheduleConflict) return json({ error: e.message, revision: e.current }, 409)
    if (e instanceof Error && !(e as { code?: string }).code) return json({ error: e.message }, 400)
    throw e
  }
}

/** 상세 공정과 고친 기록 */
export async function GET(req: Request, ctx: Ctx) {
  const t = await target(req, ctx)
  if ('error' in t) return t.error
  const [schedule, log] = await Promise.all([getSchedule(t.id), listScheduleLog(t.id)])
  return json({ ...schedule, log })
}

/** 공정 전체 바꾸기. { steps: [...], expectedRevision?, by?, summary? } */
export async function PUT(req: Request, ctx: Ctx) {
  const t = await target(req, ctx)
  if ('error' in t) return t.error
  const b = await body(req)
  if (!b) return json({ error: 'JSON 본문이 필요함.' }, 400)
  let steps: ScheduleStep[]
  try {
    steps = normalizeSteps(b.steps)
  } catch (e) {
    return json({ error: (e as Error).message }, 400)
  }
  return save(t.id, steps, b, '공정 전체 수정')
}

/** 공정 일부 고치기. { updates: [{ id, status?, progress?, start?, end?, crew?, note?, name? }], expectedRevision?, by?, summary? } */
export async function PATCH(req: Request, ctx: Ctx) {
  const t = await target(req, ctx)
  if ('error' in t) return t.error
  const b = await body(req)
  if (!b || !Array.isArray(b.updates) || !b.updates.length) return json({ error: 'updates 목록이 필요함.' }, 400)
  const cur = await getSchedule(t.id)
  const byId = new Map(cur.steps.map((s) => [s.id, s]))
  const FIELDS = ['name', 'start', 'end', 'crew', 'status', 'progress', 'note'] as const
  for (const u of b.updates as Record<string, unknown>[]) {
    const step = byId.get(String(u?.id ?? ''))
    if (!step) return json({ error: `공정 id '${String(u?.id ?? '')}' 를 찾을 수 없음.` }, 404)
    for (const k of FIELDS) if (k in u) Object.assign(step, { [k]: u[k] })
  }
  let steps: ScheduleStep[]
  try {
    steps = normalizeSteps(cur.steps)
  } catch (e) {
    return json({ error: (e as Error).message }, 400)
  }
  const names = (b.updates as Record<string, unknown>[]).map((u) => byId.get(String(u.id))?.name).filter(Boolean)
  return save(t.id, steps, b, `공정 수정: ${names.join(', ')}`)
}
