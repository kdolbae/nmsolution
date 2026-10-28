'use server'

import { requireAdmin } from '@/lib/admin'
import { revalidatePath } from 'next/cache'
import { getContent } from '@/lib/content/get'
import { emptyQuote, normalizeQuote, SUPPLIER, type Quote } from '@/lib/clients/quote'
import { defaultProposalHtml } from '@/lib/clients/proposal'
import { hashPortalPassword } from '@/lib/clients/portal-password'
import { quoteDrafts } from '@/lib/clients/send-drafts'
import { mailEnabled, sendMail } from '@/lib/mail'
import { sendSms, smsEnabled } from '@/lib/notify/sms'
import { notifyAdmin, telegramEnabled } from '@/lib/notify/telegram'
import {
  finalizeClient,
  getClient,
  insertClient,
  removeClient,
  updateClientInfo,
  updateProposal,
  updateQuote,
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
  revalidatePath('/admin/clients')
  return { ok: true as const, id }
}

export async function saveClientInfo(id: number, input: ClientInfo, portalPassword?: string) {
  await requireAdmin()
  await updateClientInfo(id, cleanInfo(input))
  await savePortalPassword(id, portalPassword)
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

/**
 * 견적 안내 문자·메일 초안을 대표에게 보낸다(2026-10-28 kevin). 문자는 ADMIN_PHONE(없으면 010-2369-3691),
 * 메일은 ADMIN_EMAIL(없으면 로그인한 관리자 메일)로. 텔레그램에도 같은 초안을 보낸다. 대표가 받은 초안을 업체에 전달한다.
 */
export async function sendQuoteDrafts(id: number, password: string) {
  const user = await requireAdmin()
  const c = await getClient(id)
  if (!c) throw new Error('업체를 찾지 못했습니다.')
  if (!c.portalSlug) throw new Error('업체용 링크 주소를 먼저 정해 주세요.')
  const d = quoteDrafts(c, normalizeQuote(c.quote), String(password ?? '').slice(0, 40))
  const phone = process.env.ADMIN_PHONE || SUPPLIER.phoneMobile
  const email = process.env.ADMIN_EMAIL || user.email || ''
  const esc = (s: string) => s.replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`)
  const [sms, mail] = await Promise.all([
    smsEnabled() ? sendSms({ to: phone, text: d.sms, subject: `${c.name} 견적 안내` }) : Promise.resolve(false),
    mailEnabled() && email
      ? sendMail({
          to: email,
          subject: `[초안] ${d.mailSubject}`,
          html: `<p style="color:#6b7785;font-size:13px">아래 내용을 업체(${esc(c.email || '메일 주소 미입력')})에 전달하세요.</p><pre style="font-family:Pretendard,'Apple SD Gothic Neo','Malgun Gothic',sans-serif;font-size:15px;line-height:1.6;white-space:pre-wrap">제목: ${esc(d.mailSubject)}\n\n${esc(d.mailText)}</pre>`,
        })
      : Promise.resolve(false),
    notifyAdmin(`[견적 발송 초안 · 문자]\n\n${d.sms}`).then(() => notifyAdmin(`[견적 발송 초안 · 메일]\n제목: ${d.mailSubject}\n\n${d.mailText}`)),
  ])
  return { sms, mail, telegram: telegramEnabled(), smsReady: smsEnabled(), mailReady: mailEnabled(), drafts: d }
}
