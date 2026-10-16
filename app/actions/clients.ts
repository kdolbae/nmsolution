'use server'

import { requireAdmin } from '@/lib/admin'
import { revalidatePath } from 'next/cache'
import { getContent } from '@/lib/content/get'
import { emptyQuote, normalizeQuote, type Quote } from '@/lib/clients/quote'
import { defaultProposalHtml } from '@/lib/clients/proposal'
import {
  finalizeClient,
  getClient,
  insertClient,
  removeClient,
  updateClientInfo,
  updateProposal,
  updateQuote,
  LOCKED_MESSAGE,
  type ClientInfo,
} from '@/lib/clients/table'


/** 운영에서는 서버 액션의 오류 문구가 가려지므로, 화면에 보여 줄 오류는 값으로 돌려준다 */
async function shown<T>(run: () => Promise<T>): Promise<({ ok: true } & T) | { ok: false; error: string }> {
  try {
    return { ok: true, ...(await run()) }
  } catch (e) {
    const error = e instanceof Error ? e.message : ''
    if (error === LOCKED_MESSAGE || error.startsWith('이미 확정')) return { ok: false, error }
    throw e
  }
}

/** 버전 기록에 남길 이름 */
function who(user: { name?: string | null; email?: string | null }) {
  return user.name?.trim() || user.email || ''
}

function cleanInfo(input: ClientInfo): ClientInfo {
  const t = (v: unknown, max = 500) => String(v ?? '').trim().slice(0, max)
  const name = t(input.name, 200)
  if (!name) throw new Error('업체명을 입력해 주세요.')
  return {
    name,
    contactPerson: t(input.contactPerson),
    phone: t(input.phone),
    email: t(input.email),
    siteAddress: t(input.siteAddress),
    memo: t(input.memo, 5000),
  }
}

/** 업체 추가. copyFrom 이 있으면 그 업체의 제안서·견적서를 복사해 시작하고, 없으면 홈페이지 내용으로 기본 제안서를 만든다 */
export async function createClient(input: ClientInfo, copyFrom?: number | null) {
  const user = await requireAdmin()
  const info = cleanInfo(input)
  let proposal: string
  let quote: Quote
  const src = copyFrom ? await getClient(copyFrom) : null
  if (src) {
    proposal = src.proposalHtml.split(src.name).join(info.name)
    quote = { ...src.quote, number: emptyQuote().number, date: emptyQuote().date }
  } else {
    const [home, services, about, settings] = await Promise.all([
      getContent('home'),
      getContent('services'),
      getContent('about'),
      getContent('settings'),
    ])
    proposal = defaultProposalHtml(info, { home, services, about, settings })
    quote = emptyQuote()
  }
  const id = await insertClient(info, proposal, quote, who(user))
  revalidatePath('/admin/clients')
  return { ok: true as const, id }
}

export async function saveClientInfo(id: number, input: ClientInfo) {
  await requireAdmin()
  await updateClientInfo(id, cleanInfo(input))
  revalidatePath('/admin/clients', 'layout')
  return { ok: true as const }
}

export async function saveProposal(id: number, html: string) {
  const user = await requireAdmin()
  if (typeof html !== 'string' || !html.trim()) throw new Error('제안서 내용이 비어 있습니다.')
  if (html.length > 2_000_000) throw new Error('제안서가 너무 큽니다. 이미지는 주소로 넣어 주세요.')
  const res = await shown(async () => ({ version: await updateProposal(id, html, who(user)) }))
  revalidatePath('/admin/clients', 'layout')
  return res
}

/** 홈페이지 내용으로 기본 제안서를 다시 만든다 */
export async function resetProposal(id: number) {
  const user = await requireAdmin()
  const client = await getClient(id)
  if (!client) throw new Error('업체를 찾을 수 없습니다.')
  const [home, services, about, settings] = await Promise.all([
    getContent('home'),
    getContent('services'),
    getContent('about'),
    getContent('settings'),
  ])
  const html = defaultProposalHtml(client, { home, services, about, settings })
  const res = await shown(async () => ({ html, version: await updateProposal(id, html, who(user), '기본 제안서로 다시 만듦') }))
  revalidatePath('/admin/clients', 'layout')
  return res
}

export async function saveQuote(id: number, quote: Quote) {
  const user = await requireAdmin()
  const res = await shown(async () => ({ version: await updateQuote(id, normalizeQuote(quote), who(user)) }))
  revalidatePath('/admin/clients', 'layout')
  return res
}

/** 지금 최신 버전을 최종본으로 확정한다. 확정 후에는 제안서·견적서를 고칠 수 없다 */
export async function finalizeClientVersion(id: number) {
  const user = await requireAdmin()
  const res = await shown(async () => ({ version: await finalizeClient(id, who(user)) }))
  revalidatePath('/admin/clients', 'layout')
  return res
}

export async function deleteClient(id: number) {
  await requireAdmin()
  await removeClient(id)
  revalidatePath('/admin/clients')
  return { ok: true as const }
}
