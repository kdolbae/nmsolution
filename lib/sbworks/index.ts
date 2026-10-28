import { timingSafeEqual } from 'node:crypto'
import { calcQuote, itemAmount, type Quote } from '@/lib/clients/quote'
import { getClient, listVersions, type ClientRow, type VersionMeta } from '@/lib/clients/table'
import { listCards, contactLabel } from '@/lib/clients/cards'
import { getProfile } from '@/lib/clients/profile'
import { getSchedule, listScheduleLog } from '@/lib/clients/schedule'

/**
 * SBworks 연동. SBworks 가 엔엠솔루션 업체(기업정보·담당자·견적·공정)를 읽고, 공정을 고칠 수 있게 하는 API 의 공용 부분.
 * 인증: Authorization: Bearer <SBWORKS_API_KEY>. 키는 Vercel 환경변수에만 둔다.
 * 바뀔 때마다 SBWORKS_WEBHOOK_URL 이 있으면 그 주소로 바뀐 업체 id 를 알린다(SBworks 는 받은 뒤 상세를 다시 읽어 최신으로 맞춘다).
 */

export const SOURCE_NAME = '엔엠솔루션'

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } })

/** 키가 맞으면 null, 아니면 돌려줄 오류 응답 */
export function checkKey(req: Request): Response | null {
  const key = process.env.SBWORKS_API_KEY
  if (!key) return json({ error: 'SBWORKS_API_KEY 가 설정되지 않았음.' }, 503)
  const got = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '')
  const a = Buffer.from(got)
  const b = Buffer.from(key)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return json({ error: '인증 실패' }, 401)
  return null
}

export function clientId(raw: string): number | null {
  const id = Number(raw)
  return Number.isSafeInteger(id) && id > 0 ? id : null
}

/** 견적서를 SBworks 가 바로 보여 줄 수 있게 금액을 계산해 붙인다 */
export function quoteView(q: Quote) {
  const calc = calcQuote(q)
  return {
    number: q.number,
    date: q.date,
    title: q.title,
    validDays: q.validDays,
    notes: q.notes,
    totals: {
      works: calc.works,
      discount: calc.discount,
      supply: calc.supply,
      vat: calc.vat,
      grand: calc.grand,
      options: calc.options,
      deduct: calc.deduct,
    },
    sections: q.sections.map((s, i) => ({
      id: s.id,
      name: s.name,
      desc: s.desc,
      option: !!s.option,
      total: calc.sections[i].total,
      cost: calc.sections[i],
      items: s.items.map((it) => ({
        id: it.id,
        kind: it.kind,
        name: it.name,
        spec: it.spec,
        unit: it.unit,
        qty: it.qty,
        price: it.price,
        amount: itemAmount(it),
        note: it.note,
        deduct: !!it.deduct,
      })),
    })),
  }
}

function versionView(v: VersionMeta) {
  return { no: v.no, change: v.change, summary: v.summary, by: v.by, at: v.at.toISOString(), supply: v.supply }
}

function companyView(c: ClientRow) {
  return {
    id: c.id,
    name: c.name,
    bizNumber: c.bizNumber,
    siteAddress: c.siteAddress,
    contactPerson: c.contactPerson,
    phone: c.phone,
    email: c.email,
    portalUrl: c.portalSlug ? `https://nm-solution.co.kr/${c.portalSlug}` : '',
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  }
}

/** 목록 한 줄 */
export async function clientSummary(c: ClientRow) {
  const [versions, schedule] = await Promise.all([listVersions(c.id), getSchedule(c.id)])
  const calc = calcQuote(c.quote)
  return {
    ...companyView(c),
    source: SOURCE_NAME,
    quote: { number: c.quote.number, title: c.quote.title, supply: calc.supply, grand: calc.grand, version: versions[0]?.no ?? 0, finalizedVersion: c.finalized?.version ?? null },
    schedule: { revision: schedule.revision, updatedAt: schedule.updatedAt },
  }
}

/** 업체 상세: 기업정보·프로필·담당자·최신 견적·버전 기록·공정 */
export async function clientDetail(id: number) {
  const c = await getClient(id)
  if (!c) return null
  const [versions, cards, profile, schedule, scheduleLog] = await Promise.all([
    listVersions(id),
    listCards(id),
    getProfile(id),
    getSchedule(id),
    listScheduleLog(id),
  ])
  return {
    source: SOURCE_NAME,
    company: companyView(c),
    profile: { status: profile.status, updatedAt: profile.finishedAt, data: profile.profile },
    contacts: cards
      .filter((x) => x.contact)
      .map((x) => ({ cardId: x.id, label: contactLabel(x.contact!), ...x.contact!, addedAt: x.createdAt })),
    quote: {
      version: versions[0]?.no ?? 0,
      finalized: c.finalized && { version: c.finalized.version, at: c.finalized.at.toISOString(), by: c.finalized.by },
      latest: quoteView(c.quote),
      versions: versions.map(versionView),
    },
    schedule: { ...schedule, log: scheduleLog },
  }
}

/** SBworks 에 바뀐 업체를 알린다. 주소가 없거나 실패해도 저장은 그대로 둔다 */
export async function notifySbworks(clientId: number, event: 'quote' | 'proposal' | 'schedule' | 'profile' | 'contacts' | 'company' | 'deleted') {
  const url = process.env.SBWORKS_WEBHOOK_URL
  if (!url) return
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.SBWORKS_API_KEY ?? ''}` },
      body: JSON.stringify({ source: SOURCE_NAME, event, clientId, at: new Date().toISOString() }),
      signal: AbortSignal.timeout(5000),
    })
  } catch (e) {
    console.error('[sbworks] 알림 실패', e)
  }
}
