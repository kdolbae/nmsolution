import { getSession, getSessionFrom, isAdmin } from '@/lib/admin'
import { getClient, type ClientRow } from '@/lib/clients/table'
import { latestSend } from '@/lib/clients/sends'
import { emptyQuote } from '@/lib/clients/quote'
import { getMembership, type Membership } from './members'

/** 로그인한 협력업체 관계자와 그 업체. 관리자이거나 로그인 안 했으면 user/membership 이 비어 있다 */
export async function getPortalUser() {
  const session = await getSession()
  if (!session?.user) return { session: null, membership: null }
  if (isAdmin(session.user)) return { session, membership: null }
  return { session, membership: await getMembership(session.user.id) }
}

/** API 라우트용: 승인된 관계자만 업체 id 를 돌려준다 */
export async function approvedClientId(h: Headers): Promise<number | null> {
  const session = await getSessionFrom(h)
  if (!session?.user || isAdmin(session.user)) return null
  const m = await getMembership(session.user.id)
  return m?.status === 'approved' ? m.clientId : null
}

/**
 * 업체가 보는 제안서·견적서: 고객 발송본(lib/clients/sends.ts) 중 최신 것만. 내부 작업 버전은 보이지 않는다.
 * 발송본이 없으면 빈 견적과 '준비 중' 안내를 돌려준다. label 은 화면·PDF 이름에 붙는 발송 견적번호.
 */
export async function portalDocs(clientId: number): Promise<(ClientRow & { label: string }) | null> {
  const client = await getClient(clientId)
  if (!client) return null
  const send = await latestSend(client.id)
  if (!send) return { ...client, proposalHtml: '<p>견적서를 준비하고 있음. 준비가 끝나면 이 화면에서 볼 수 있음.</p>', quote: emptyQuote(), label: '' }
  return { ...client, proposalHtml: send.proposalHtml, quote: send.quote, updatedAt: send.sentAt, finalized: null, label: send.number }
}

export type { Membership }
