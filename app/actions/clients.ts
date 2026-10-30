'use server'

import { requireAdmin } from '@/lib/admin'
import { revalidatePath } from 'next/cache'
import { after } from 'next/server'
import { notifySbworks } from '@/lib/sbworks'
import { getContent } from '@/lib/content/get'
import { emptyQuote, normalizeQuote, type Quote } from '@/lib/clients/quote'
import { defaultProposalHtml } from '@/lib/clients/proposal'
import { hashPortalPassword } from '@/lib/clients/portal-password'
import {
  finalizeClient,
  getClient,
  insertClient,
  listQuoteSet,
  removeClient,
  updateClientInfo,
  updateProposal,
  updateQuote,
  updateQuoteLabel,
  setPortalPasswordHash,
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
    bizNumber: t(input.bizNumber, 40),
    contactPerson: t(input.contactPerson),
    phone: t(input.phone),
    email: t(input.email),
    siteAddress: t(input.siteAddress),
    memo: t(input.memo, 5000),
    portalSlug: portalSlug(input.portalSlug),
    portalLogin: t(input.portalLogin, 60).toLowerCase(),
  }
}

/** 업체용 링크 주소: 영문 소문자·숫자·하이픈만 (한글 주소는 메신저마다 깨져 쓰지 않음) */
function portalSlug(v: unknown) {
  const s = String(v ?? '').trim().toLowerCase()
  if (!s) return ''
  if (!/^[a-z0-9][a-z0-9-]{1,39}$/.test(s)) throw new Error('업체용 링크 주소는 영문 소문자·숫자·하이픈으로 2~40자로 입력해 주세요.')
  return s
}

async function savePortalPassword(id: number, password: unknown) {
  const pw = String(password ?? '')
  if (!pw) return
  if (pw.length < 4) throw new Error('업체용 링크 비밀번호는 4자 이상으로 입력해 주세요.')
  await setPortalPasswordHash(id, await hashPortalPassword(pw))
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
  after(() => notifySbworks(id, 'company'))
  revalidatePath('/admin/clients')
  return { ok: true as const, id }
}

/**
 * 같은 업체에 견적서를 하나 더 만든다 (추가 공정 등, kevin 2026-10-28).
 * 기업정보는 본 견적을 따르고, 견적서·제안서·버전 기록·최종본 확정은 견적서마다 따로다. 업체용 링크는 본 견적에만 있다.
 * copy 가 true 면 지금 견적서(공종·요율·특기사항)를 복사해 시작한다.
 */
export async function addQuote(fromId: number, label: string, copy = false) {
  const user = await requireAdmin()
  const name = String(label ?? '').trim().slice(0, 100)
  if (!name) throw new Error('견적서 이름을 입력해 주세요. (예: 추가 공정 - 배관 보온)')
  const from = await getClient(fromId)
  if (!from) throw new Error('업체를 찾을 수 없습니다.')
  const rootId = from.parentId ?? from.id
  const root = from.parentId ? await getClient(rootId) : from
  if (!root) throw new Error('업체를 찾을 수 없습니다.')
  const base = emptyQuote()
  // 견적번호는 본 견적 번호 뒤에 순번 (NM-2610-04 → NM-2610-04-2, -3 …)
  const siblings = await listQuoteSet(rootId)
  const number = `${root.quote.number}-${siblings.length + 1}`
  const quote: Quote = copy
    ? { ...from.quote, number, date: base.date, title: name }
    : { ...base, number, title: name, rates: from.quote.rates, costCalc: from.quote.costCalc, recipientFields: from.quote.recipientFields }
  const info: ClientInfo = { ...root, memo: '', portalSlug: '', portalLogin: '' }
  const id = await insertClient(info, '', quote, who(user), { parentId: rootId, quoteLabel: name })
  after(() => notifySbworks(id, 'quote'))
  revalidatePath('/admin/clients', 'layout')
  return { ok: true as const, id }
}

/** 견적서 이름 바꾸기 (본 견적도 이름을 붙일 수 있다) */
export async function renameQuote(id: number, label: string) {
  await requireAdmin()
  await updateQuoteLabel(id, String(label ?? '').trim().slice(0, 100))
  after(() => notifySbworks(id, 'quote'))
  revalidatePath('/admin/clients', 'layout')
  return { ok: true as const }
}

export async function saveClientInfo(id: number, input: ClientInfo, portalPassword?: string) {
  await requireAdmin()
  const cur = await getClient(id)
  if (cur?.parentId) {
    // 추가 견적서에서 고친 기업정보는 본 견적(업체)에 저장한다. 업체용 링크·메모는 본 견적 것을 그대로 둔다
    const root = await getClient(cur.parentId)
    if (!root) throw new Error('업체를 찾을 수 없습니다.')
    const info = cleanInfo({ ...input, portalSlug: root.portalSlug, portalLogin: root.portalLogin, memo: root.memo })
    await updateClientInfo(root.id, info)
    after(() => notifySbworks(root.id, 'company'))
    revalidatePath('/admin/clients', 'layout')
    return { ok: true as const }
  }
  await updateClientInfo(id, cleanInfo(input))
  await savePortalPassword(id, portalPassword)
  after(() => notifySbworks(id, 'company'))
  revalidatePath('/admin/clients', 'layout')
  return { ok: true as const }
}

export async function saveProposal(id: number, html: string) {
  const user = await requireAdmin()
  if (typeof html !== 'string' || !html.trim()) throw new Error('제안서 내용이 비어 있습니다.')
  if (html.length > 2_000_000) throw new Error('제안서가 너무 큽니다. 이미지는 주소로 넣어 주세요.')
  const res = await shown(async () => ({ version: await updateProposal(id, html, who(user)) }))
  if (res.ok) after(() => notifySbworks(id, 'proposal'))
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
  if (res.ok) after(() => notifySbworks(id, 'quote'))
  revalidatePath('/admin/clients', 'layout')
  return res
}

/** 지금 최신 버전을 최종본으로 확정한다. 확정 후에는 제안서·견적서를 고칠 수 없다 */
export async function finalizeClientVersion(id: number) {
  const user = await requireAdmin()
  const res = await shown(async () => ({ version: await finalizeClient(id, who(user)) }))
  if (res.ok) after(() => notifySbworks(id, 'quote'))
  revalidatePath('/admin/clients', 'layout')
  return res
}

export async function deleteClient(id: number) {
  await requireAdmin()
  await removeClient(id)
  after(() => notifySbworks(id, 'deleted'))
  revalidatePath('/admin/clients')
  return { ok: true as const }
}
