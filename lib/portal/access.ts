import { getSession, getSessionFrom, isAdmin } from '@/lib/admin'
import { getClient, getVersion, type ClientRow } from '@/lib/clients/table'
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
 * 업체가 보는 제안서·견적서: 최종본을 확정했으면 그 버전, 아니면 지금 저장된 최신본.
 * label 은 화면·PDF 이름에 붙는 버전 표시.
 */
export async function portalDocs(clientId: number): Promise<(ClientRow & { label: string }) | null> {
  const client = await getClient(clientId)
  if (!client) return null
  if (client.finalized) {
    const v = await getVersion(client.id, client.finalized.version)
    if (v) return { ...client, proposalHtml: v.proposalHtml, quote: v.quote, label: `v${v.no} 최종본` }
  }
  return { ...client, label: '' }
}

export type { Membership }
